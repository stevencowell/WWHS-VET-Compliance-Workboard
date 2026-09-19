import {chooseBackupDestination,fileDestination} from './save-backup-file.mjs?v=default-folder-1';

const DATABASE='wwhs-backup-folders:v1';
const CHANNEL='wwhs-backup-folders:v1';
const SCOPES=new Set(['private','team']);
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
    request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result);};
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('Browser storage is busy. Close other workboard tabs and try again.'));
  });
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
  let record=null,loading=supported,busy=false,error='',loadFailed=false,epoch=0,readEpoch=0,reloadRequested=false,disposed=false,hydration;
  const listeners=new Set();let channel;
  const state=()=>({supported,loading,busy,name:record?.handle?.name||'',error});
  const notify=()=>{if(!disposed)for(const listener of listeners)listener(state());};
  const announce=()=>{try{channel?.postMessage({scope});}catch{}};
  const configuration=action=>typeof win.navigator?.locks?.request==='function'?win.navigator.locks.request(CHANNEL,action):action();
  function hydrate(){
    if(!supported||disposed)return state();
    if(busy){reloadRequested=true;return state();}
    const read=++readEpoch;loading=true;notify();
    hydration=(async()=>{
      try{
        const next=await records.get(scope);
        if(read===readEpoch&&!disposed){if((next?.revision??null)!==(record?.revision??null))epoch++;record=next;loadFailed=false;error='';}
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
  async function select(){
    if(!supported)throw new Error('Choosing a default folder is not available in this browser. Use Save as or Download a copy.');
    available();
    const previous=record,expected=previous?.revision??null;busy=true;error='';epoch++;notify();
    try{
      // Open immediately in the click handler, before waiting for storage work.
      const handle=await win.showDirectoryPicker({id:`wwhs-${scope}-backups`,mode:'readwrite',...(previous?.handle?{startIn:previous.handle}:{})});
      if(handle?.kind!=='directory')throw new Error('Please choose a folder for your backups.');
      record=await configuration(async()=>{
        const other=await records.get(scope==='private'?'team':'private');
        if(other?.handle&&await handle.isSameEntry(other.handle))throw new Error('Personal and team backups need different folders. Please choose another folder.');
        return records.set(scope,handle,expected);
      });
      loadFailed=false;epoch++;announce();return true;
    }catch(problem){
      if(problem?.name==='AbortError')return false;
      error=problem?.message===changedMessage||problem?.message?.startsWith('Personal and team backups need')?problem.message:'The folder choice could not be remembered. Your previous choice has been kept. Please try again, or use Save as.';
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
  async function destination(suggestedName,{id}={}){
    available();
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
    if(scope==='team'){
      const destination=await chooseBackupDestination({suggestedName,id:id||'wwhs-team-handover',startIn:handle},win);
      if(!destination)return null;
      await verifyPersisted();
      return {async write(text){await verifyPersisted();return destination.write(text);}};
    }
    try{
      let permission=await handle.queryPermission({mode:'readwrite'});await checkAfterPermission();
      if(permission!=='granted'){permission=await handle.requestPermission({mode:'readwrite'});await checkAfterPermission();}
      if(permission!=='granted')throw new Error('Access to the backup folder was not granted. Choose the folder again, or use Save as.');
    }catch(problem){error=errorMessage(problem);notify();throw new Error(error,{cause:problem});}
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
        const result=await fileDestination(file).write(text);error='';notify();return result;
      }catch(problem){error=problem?.message===changedMessage?changedMessage:'The backup could not be saved in the selected folder. Your browser data is unchanged. Check that the folder is available, or use Save as.';notify();throw new Error(error,{cause:problem});}
    }};
  }
  try{if(supported&&typeof win.BroadcastChannel==='function'){channel=new win.BroadcastChannel(CHANNEL);channel.onmessage=event=>{if(event.data?.scope===scope)void hydrate();};}}catch{}
  const focus=()=>void hydrate();win.addEventListener?.('focus',focus);
  const ready=supported?hydrate():Promise.resolve(state());
  return {ready,state,select,forget,destination,
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
export function choosePrivateBackupDestination({suggestedName,saveAs=false,id='wwhs-private-backup'}){
  return saveAs?chooseBackupDestination({suggestedName,id}):getBackupFolder('private').destination(suggestedName,{id});
}
