import {chooseBackupDestination,fileDestination} from './save-backup-file.mjs?v=backup-flow-2';

const DATABASE='wwhs-backup-folders:v1';
const CHANNEL='wwhs-backup-folders:v1';
export const BACKUP_AREAS=Object.freeze({launchpad:'Launchpad',finance:'Finance',vet:'VET',tas:'TAS'});
const SCOPES=new Set(['private','team',...Object.keys(BACKUP_AREAS)]);
const teamScope=scope=>['team','vet','tas'].includes(scope);
const legacyScope=scope=>BACKUP_AREAS[scope]?(teamScope(scope)?'team':'private'):null;
const changedMessage='The backup folder changed. Please check the selected folder and save again.';
const errorMessage=error=>error?.message||'The backup folder could not be used. Choose it again, or use Save as.';
const conflict=()=>new Error(changedMessage);
const revision=win=>win.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;

// This database contains directory handles and revision tokens only, never backups.
export function createBackupFolderStore(win=window){
  let database;
  const open=()=>database??=new Promise((resolve,reject)=>{
    let request;
    try{request=win.indexedDB.open(DATABASE,1);}catch(error){reject(error);return;}
    request.onupgradeneeded=()=>request.result.createObjectStore('folders');
    request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();database=undefined;};resolve(request.result);};
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('Browser storage is busy. Close other workboard tabs and try again.'));
  }).catch(error=>{database=undefined;throw error;});
  async function transact(scope,update){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('folders',update?'readwrite':'readonly');
      const records=tx.objectStore('folders');let result,problem;
      const request=records.get(scope);
      request.onsuccess=()=>{
        result=request.result||null;
        if(update){
          if((result?.revision??null)!==update.expected){problem=conflict();tx.abort();return;}
          result={handle:update.handle,revision:revision(win)};
          try{records.put(result,scope);}catch(error){problem=error;tx.abort();}
        }
      };
      tx.oncomplete=()=>resolve(result);
      tx.onabort=tx.onerror=()=>reject(problem||tx.error||request.error||new Error('The folder choice could not be remembered in this browser.'));
    });
  }
  return {
    get:scope=>transact(scope),
    set:(scope,handle,expected)=>transact(scope,{handle,expected}),
    // Retain a small revision token so a stale tab cannot overwrite a newer choice.
    delete:(scope,expected)=>transact(scope,{handle:null,expected}),
  };
}

function uniqueName(suggestedName,win){
  const stem=String(suggestedName||'backup.json').split(/[\\/]/).pop().replace(/\.json$/i,'').replace(/[<>:"|?*\u0000-\u001f]/g,'-').slice(0,100)||'backup';
  const timestamp=new Date().toISOString().replace(/[:.]/g,'-');
  let random=win.crypto?.randomUUID?.();
  if(!random&&win.crypto?.getRandomValues){const bytes=new Uint8Array(16);win.crypto.getRandomValues(bytes);random=Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');}
  if(!random)throw new Error('A safe backup filename could not be created. Use Save as instead.');
  return `${stem}-${timestamp}-${random}.json`;
}

/** A shared browser preference. Only select() and destination() may ask for access. */
export function createBackupFolder({scope='private',win=window,store}={}){
  if(!SCOPES.has(scope))throw new Error('Unknown backup folder area.');
  const supported=typeof win.showDirectoryPicker==='function'&&Boolean(store||win.indexedDB);
  const records=store||(supported?createBackupFolderStore(win):null);
  let record=null,legacy=null,loading=supported,busy=false,error='',loadFailed=false,epoch=0,readEpoch=0,reloadRequested=false,disposed=false,hydration;
  const listeners=new Set();let channel;
  const state=()=>({supported,loading,busy,name:record?.handle?.name||'',parentName:record===null?legacy?.handle?.name||'':'',error});
  const notify=()=>{if(!disposed)for(const listener of listeners)listener(state());};
  const announce=()=>{try{channel?.postMessage({scope});}catch{}};
  const configuration=action=>typeof win.navigator?.locks?.request==='function'?win.navigator.locks.request(CHANNEL,action):action();
  function hydrate(){
    if(!supported||disposed)return state();
    if(busy){reloadRequested=true;return state();}
    const read=++readEpoch;loading=true;notify();
    hydration=(async()=>{
      try{
        const next=await records.get(scope),previous=legacyScope(scope)?await records.get(legacyScope(scope)):null;
        if(read===readEpoch&&!disposed){if((next?.revision??null)!==(record?.revision??null)||(previous?.revision??null)!==(legacy?.revision??null))epoch++;record=next;legacy=previous;loadFailed=false;error='';}
      }catch(problem){if(read===readEpoch&&!disposed){loadFailed=true;error='The saved folder choice could not be read. Try again or use Save as.';}}
      finally{if(read===readEpoch&&!disposed){loading=false;notify();}}
      return state();
    })();
    return hydration;
  }
  function available(){
    if(loading)throw new Error('The backup folder is still loading. Please try again in a moment.');
    if(busy)throw new Error('The backup folder is being changed. Please try again in a moment.');
    if(loadFailed)throw new Error(error);
  }
  async function settled(){busy=false;notify();if(reloadRequested){reloadRequested=false;await hydrate();}}
  async function checkSeparateFolder(handle){
    const other=await records.get(teamScope(scope)?'private':'team');
    if(other?.handle&&await handle.isSameEntry(other.handle))throw new Error('Personal and team backups need different folders. Please choose another folder.');
    for(const area of Object.keys(BACKUP_AREAS))if(area!==scope){const saved=await records.get(area);if(saved?.handle&&await handle.isSameEntry(saved.handle))throw new Error('Each area needs its own backup folder. Please choose another folder.');}
  }
  async function select(){
    if(!supported)throw new Error('This browser cannot remember a folder. Use Save as or Download a copy.');
    available();
    const previous=record,expected=previous?.revision??null;busy=true;error='';epoch++;notify();
    try{
      // Open immediately in the click handler, before waiting for storage work.
      const startIn=previous?.handle||legacy?.handle;
      const handle=await win.showDirectoryPicker({id:`wwhs-${scope}-backups`,mode:'readwrite',...(startIn?{startIn}:{})});
      if(handle?.kind!=='directory')throw new Error('Please choose a folder for your backups.');
      record=await configuration(async()=>{
        await checkSeparateFolder(handle);
        return records.set(scope,handle,expected);
      });
      loadFailed=false;epoch++;announce();return true;
    }catch(problem){
      if(problem?.name==='AbortError')return false;
      error=problem?.message===changedMessage||/^(Personal and team backups need|Each area needs)/.test(problem?.message)?problem.message:'The folder choice could not be remembered. Your previous choice has been kept. Please try again, or use Save as.';
      if(problem?.message===changedMessage)reloadRequested=true;
      throw new Error(error,{cause:problem});
    }finally{await settled();}
  }
  async function forget(){
    available();if(!supported)return;
    busy=true;error='';epoch++;notify();
    try{record=await configuration(()=>records.delete(scope,record?.revision??null));epoch++;announce();return true;}
    catch(problem){error='The folder choice could not be removed. Please try again.';if(problem?.message===changedMessage)reloadRequested=true;throw new Error(error,{cause:problem});}
    finally{await settled();}
  }
  async function ensureAreaFolder(){
    available();
    if(record!==null||!legacy?.handle||!BACKUP_AREAS[scope])return;
    const parent=legacy,currentEpoch=epoch;busy=true;notify();
    try{
      let permission=await parent.handle.queryPermission({mode:'readwrite'});
      if(permission!=='granted')permission=await parent.handle.requestPermission({mode:'readwrite'});
      if(permission!=='granted')throw new Error('Allow access to your backup folder, or choose a different folder.');
      record=await configuration(async()=>{
        if(epoch!==currentEpoch||(await records.get(legacyScope(scope)))?.revision!==parent.revision)throw conflict();
        const existing=await records.get(scope);if(existing)return existing;
        const handle=await parent.handle.getDirectoryHandle(BACKUP_AREAS[scope],{create:true});
        await checkSeparateFolder(handle);
        return records.set(scope,handle,null);
      });
      epoch++;announce();
    }finally{await settled();}
  }
  async function openFile(){
    available();
    if(typeof win.showOpenFilePicker!=='function')return undefined;
    const startIn=record?.handle||legacy?.handle;
    try{
      const [handle]=await win.showOpenFilePicker({id:`wwhs-${scope}-backups`,multiple:false,excludeAcceptAllOption:true,types:[{description:`${BACKUP_AREAS[scope]||'JSON'} backup`,accept:{'application/json':['.json']}}],...(startIn?{startIn}:{})});
      return handle?await handle.getFile():null;
    }catch(problem){if(problem?.name==='AbortError')return null;throw problem;}
  }
  async function files(){
    available();if(!supported)return [];
    await ensureAreaFolder();
    if(!record?.handle){if(!await select())return [];}
    const selected=record,currentEpoch=epoch,handle=selected.handle;
    let permission=await handle.queryPermission({mode:'read'});
    if(permission!=='granted')permission=await handle.requestPermission({mode:'read'});
    if(permission!=='granted')throw new Error('Allow access to show backups in this folder.');
    const check=async()=>{if(loading&&hydration)await hydration;if(epoch!==currentEpoch||record?.revision!==selected.revision||(await records.get(scope))?.revision!==selected.revision)throw conflict();};
    await check();
    const result=[];
    for await(const entry of handle.values()){
      if(entry.kind!=='file'||!entry.name.toLowerCase().endsWith('.json'))continue;
      result.push({handle:entry,folder:handle.name});
    }
    // Older combined-folder backups remain available without moving any files.
    if(legacy?.handle&&!(await handle.isSameEntry(legacy.handle))&&await legacy.handle.queryPermission({mode:'read'})==='granted'){
      for await(const entry of legacy.handle.values())if(entry.kind==='file'&&entry.name.toLowerCase().endsWith('.json'))result.push({handle:entry,folder:legacy.handle.name,legacy:true});
    }
    await check();return result;
  }
  async function destination(suggestedName,{id,direct=false,saveAs=false}={}){
    id??=BACKUP_AREAS[scope]?`wwhs-${scope}-backups`:(scope==='team'?'wwhs-team-handover':'wwhs-private-backup');
    // A damaged preference must not prevent a user from saving their work.
    // Ask for a destination explicitly; never guess an old folder.
    if(loadFailed)return chooseBackupDestination({suggestedName,id:id||(scope==='team'?'wwhs-team-handover':'wwhs-private-backup')},win);
    available();
    if(record===null&&legacy?.handle)await ensureAreaFolder();
    const chosen=record,handle=chosen?.handle,currentEpoch=epoch;
    if(!handle)return chooseBackupDestination({suggestedName,id:id||(scope==='team'?'wwhs-team-handover':'wwhs-private-backup')},win);
    const ensureCurrent=()=>{if(loading||busy||loadFailed||epoch!==currentEpoch||record?.revision!==chosen.revision)throw conflict();};
    const checkAfterPermission=async()=>{if(loading&&hydration)await hydration;ensureCurrent();};
    const verifyPersisted=async()=>{
      await checkAfterPermission();
      const persisted=await records.get(scope);await checkAfterPermission();
      if(persisted?.revision!==chosen.revision){void hydrate();throw conflict();}
    };
    // Shared handovers keep the native confirmation before replacing the current file.
    if(saveAs||teamScope(scope)&&!direct){
      const destination=await chooseBackupDestination({suggestedName,id:id||'wwhs-team-handover',startIn:handle},win);
      if(!destination)return null;
      await verifyPersisted();
      return {async read(){await verifyPersisted();return destination.read?destination.read():null;},async write(text,options={}){await verifyPersisted();return destination.write(text,{...options,verify:async()=>{await verifyPersisted();await options.verify?.();}});}};
    }
    try{
      let permission=await handle.queryPermission({mode:'readwrite'});await checkAfterPermission();
      if(permission!=='granted'){permission=await handle.requestPermission({mode:'readwrite'});await checkAfterPermission();}
      if(permission!=='granted')throw new Error('Access to the backup folder was not granted. Choose the folder again, or use Save as.');
    }catch(problem){error=errorMessage(problem);notify();throw new Error(error,{cause:problem});}
    // Shared callers can save directly to the remembered folder after checking
    // the existing file's identity. Recheck its bytes immediately before writing.
    if(teamScope(scope)){
      let checkedText;
      const read=async()=>{
        await verifyPersisted();
        try{const file=await handle.getFileHandle(suggestedName);return await (await file.getFile()).text();}
        catch(problem){if(problem?.name==='NotFoundError')return '';throw problem;}
      };
      return {async read(){checkedText=await read();return checkedText;},async write(text,options={}){
        await verifyPersisted();
        if(checkedText===undefined)throw new Error('The existing shared file must be checked before saving.');
        if(await read()!==checkedText)throw new Error('The shared file changed while saving. Nothing has been overwritten. Open the latest backup first.');
        const file=await handle.getFileHandle(suggestedName,{create:true});await verifyPersisted();
        return fileDestination(file).write(text,{expectedText:checkedText,verify:async()=>{await verifyPersisted();await options.verify?.();}});
      }};
    }
    return {async write(text){
      try{
        await verifyPersisted();
        let file;
        for(let attempt=0;attempt<3;attempt++){
          const name=uniqueName(suggestedName,win);
          try{await handle.getFileHandle(name);await checkAfterPermission();continue;}
          catch(problem){if(problem?.name!=='NotFoundError')throw problem;}
          await checkAfterPermission();file=await handle.getFileHandle(name,{create:true});await checkAfterPermission();break;
        }
        if(!file)throw new Error('A new backup filename could not be created. Use Save as instead.');
        const result=await fileDestination(file).write(text,{verify:verifyPersisted});error='';notify();return result;
      }catch(problem){error=problem?.message===changedMessage?changedMessage:'Could not save to that folder. Your saved work is unchanged. Check the folder is available, or use Save as.';notify();throw new Error(error,{cause:problem});}
    }};
  }
  try{if(supported&&typeof win.BroadcastChannel==='function'){channel=new win.BroadcastChannel(CHANNEL);channel.onmessage=event=>{if(event.data?.scope===scope)void hydrate();};}}catch{}
  const focus=()=>void hydrate();win.addEventListener?.('focus',focus);
  const ready=supported?hydrate():Promise.resolve(state());
  return {ready,state,select,forget,destination,openFile,files,
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
    refresh:hydrate,
    dispose(){disposed=true;listeners.clear();channel?.close();win.removeEventListener?.('focus',focus);},
  };
}

const singletons=new Map();
export function getBackupFolder(scope='private'){
  if(!singletons.has(scope))singletons.set(scope,createBackupFolder({scope}));
  return singletons.get(scope);
}
export function choosePrivateBackupDestination({suggestedName,saveAs=false,scope='launchpad',id}){
  return getBackupFolder(scope).destination(suggestedName,{id,saveAs});
}
