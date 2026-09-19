import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackupFolder} from '../assets/js/backup-folder.mjs';
import {isBackupForArea,compatibleBackupFiles} from '../assets/js/backup-file-types.mjs';

const notFound=()=>new DOMException('No such file','NotFoundError');
function memoryStore(){
  const data=new Map();let sequence=0;
  return {data,fail:false,async get(scope){return data.get(scope)||null;},async set(scope,handle,expected){
    if(this.fail)throw Error('Storage failed');
    if((data.get(scope)?.revision??null)!==expected)throw Error('The backup folder changed. Please check the selected folder and save again.');
    const record={handle,revision:`r${++sequence}`};data.set(scope,record);return record;
  },async delete(scope,expected){return this.set(scope,null,expected);}};
}
function directory(name,{permission='granted',requested='granted',failWrite=false}={}){
  const files=new Map(),directories=new Map();const calls=[];
  return {kind:'directory',name,files,calls,async isSameEntry(other){return other===this;},
    directories,async getDirectoryHandle(name,{create}={}){if(!directories.has(name)){if(!create)throw notFound();directories.set(name,directory(name));}return directories.get(name);},
    async *values(){yield* files.values();},
    async queryPermission(){calls.push('query');return permission;},async requestPermission(){calls.push('permission');return requested;},
    async getFileHandle(filename,options){
      calls.push([filename,options]);
      if(files.has(filename))return files.get(filename);
      if(!options?.create)throw notFound();
      const file={async createWritable(){return {async write(blob){file.content=await blob.text();},async close(){if(failWrite)throw Error('Disconnected');file.closed=true;},async abort(){file.aborted=true;}};}};
      files.set(filename,file);return file;
    }};
}
function browser(){
  let counter=0;const events=new Map();
  return {events,crypto:{randomUUID:()=>`test-${++counter}`},addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name),
    showDirectoryPicker:async()=>directory('Default'),showSaveFilePicker:async()=>({})};
}
async function configured({scope='private',handle=directory('Private'),store=memoryStore(),win=browser()}={}){
  win.showDirectoryPicker=async()=>handle;const folder=createBackupFolder({scope,store,win});await folder.ready;await folder.select();return {folder,handle,store,win};
}

test('opens folder picker directly on click and remembers only its handle and revision',async()=>{
  const store=memoryStore(),win=browser(),handle=directory('Chosen');let options;
  win.showDirectoryPicker=value=>{options=value;return Promise.resolve(handle);};
  const folder=createBackupFolder({store,win});await folder.ready;
  const pending=folder.select();assert.equal(options.mode,'readwrite');assert.equal(options.id,'wwhs-private-backups');
  assert.equal(await pending,true);assert.equal(folder.state().name,'Chosen');
  assert.deepEqual(Object.keys(store.data.get('private')).sort(),['handle','revision']);assert.equal(handle.calls.length,0);
});

test('cancel and failed persistence retain the original default',async()=>{
  const {folder,store,win,handle}=await configured();
  win.showDirectoryPicker=async()=>{throw new DOMException('Cancel','AbortError');};
  assert.equal(await folder.select(),false);assert.equal(folder.state().name,handle.name);
  store.fail=true;win.showDirectoryPicker=async()=>directory('Unremembered');
  await assert.rejects(folder.select(),/previous choice has been kept/);
  assert.equal(folder.state().name,handle.name);assert.equal(store.data.get('private').handle,handle);
});

test('default is shared after reload while private and team choices stay separate',async()=>{
  const store=memoryStore(),privateDir=directory('Private'),teamDir=directory('Team');
  await configured({handle:privateDir,store});await configured({scope:'team',handle:teamDir,store});
  const privateReload=createBackupFolder({store,win:browser()}),teamReload=createBackupFolder({scope:'team',store,win:browser()});
  await Promise.all([privateReload.ready,teamReload.ready]);
  assert.equal(privateReload.state().name,'Private');assert.equal(teamReload.state().name,'Team');
  await privateReload.forget();assert.equal(privateReload.state().name,'');assert.equal(store.data.get('team').handle,teamDir);
  assert.equal(privateDir.files.size,0);assert.equal(teamDir.files.size,0);
});

test('the exact same folder cannot be used for personal and shared team backups',async()=>{
  const store=memoryStore(),handle=directory('Shared');await configured({handle,store});
  const win=browser();win.showDirectoryPicker=async()=>handle;
  const folder=createBackupFolder({scope:'team',store,win});await folder.ready;
  await assert.rejects(folder.select(),/need different folders/);assert.equal(folder.state().name,'');assert.equal(store.data.has('team'),false);
});

test('asks for write permission only after the backup click; refusal never falls back silently',async()=>{
  const handle=directory('Private',{permission:'prompt',requested:'denied'});const {folder,win}=await configured({handle});let picker=0;
  win.showSaveFilePicker=()=>{picker++;};assert.deepEqual(handle.calls,[]);
  await assert.rejects(folder.destination('notes.json'),/not granted/);assert.deepEqual(handle.calls,['query','permission']);assert.equal(picker,0);assert.equal(handle.files.size,0);
});

test('each direct private backup creates a new timestamped file and keeps older backups',async()=>{
  const {folder,handle}=await configured();
  for(const content of ['first','second'])assert.deepEqual(await(await folder.destination('launchpad-task-backup.json')).write(content),{saved:true,method:'file'});
  assert.equal(handle.files.size,2);const entries=[...handle.files];
  assert.match(entries[0][0],/^launchpad-task-backup-\d{4}-\d{2}-\d{2}T.*\.json$/);
  assert.notEqual(entries[0][0],entries[1][0]);assert.deepEqual(entries.map(([,file])=>file.content),['first','second']);assert.ok(entries.every(([,file])=>file.closed));
});

test('failed file close never reports a saved backup',async()=>{
  const {folder,handle}=await configured({handle:directory('Private',{failWrite:true})});
  await assert.rejects((await folder.destination('finance.json')).write('encrypted'),/could not be saved/);
  const file=[...handle.files.values()][0];assert.equal(file.closed,undefined);assert.equal(file.aborted,true);assert.match(folder.state().error,/could not be saved/);
});

test('shared backups open native Save as immediately in the configured directory',async()=>{
  const {folder,handle,win}=await configured({scope:'team',handle:directory('Team')});let options;
  win.showSaveFilePicker=value=>{options=value;return Promise.resolve({});};
  const pending=folder.destination('WWHS-team-handover.json');
  assert.equal(options.startIn,handle);assert.equal(options.suggestedName,'WWHS-team-handover.json');assert.equal(options.id,'wwhs-team-handover');await pending;
  assert.equal(handle.files.size,0);assert.deepEqual(handle.calls,[]);
});

test('no default keeps Save as; an unreadable preference permits an explicit new save location',async()=>{
  let resolve;const store=memoryStore(),win=browser();store.get=()=>new Promise(done=>{resolve=done;});
  const folder=createBackupFolder({store,win});await assert.rejects(folder.destination('notes.json'),/still loading/);resolve(null);await folder.ready;
  let opened=0;win.showSaveFilePicker=async()=>{opened++;return {};};await folder.destination('notes.json');assert.equal(opened,1);
  store.get=async()=>{throw Error('Broken database');};await folder.refresh();await folder.destination('notes.json');assert.equal(opened,2);
});

test('another tab changing the folder invalidates a backup prepared for the old folder',async()=>{
  const {folder,handle,store}=await configured();const destination=await folder.destination('notes.json');
  const replacement=directory('New');await store.set('private',replacement,store.data.get('private').revision);
  await assert.rejects(destination.write('data'),/folder changed/);assert.equal(handle.files.size,0);assert.equal(replacement.files.size,0);
  await folder.refresh();assert.equal(folder.state().name,'New');
});

test('stale simultaneous folder selection does not overwrite the newer selection',async()=>{
  const {folder:earlier,store}=await configured();const win=browser();let pick;
  win.showDirectoryPicker=()=>new Promise(resolve=>{pick=resolve;});const later=createBackupFolder({store,win});await later.ready;
  const pending=later.select();await earlier.forget();pick(directory('Stale'));
  await assert.rejects(pending,/folder changed/);assert.equal(store.data.get('private').handle,null);assert.equal(later.state().name,'');
});

test('refocusing after permission and during backup preparation keeps an unchanged folder usable',async()=>{
  const {folder,handle,win}=await configured({handle:directory('Private',{permission:'prompt'})});
  handle.requestPermission=async()=>{win.events.get('focus')();return 'granted';};
  const destination=await folder.destination('notes.json');
  win.events.get('focus')();
  assert.deepEqual(await destination.write('current'),{saved:true,method:'file'});assert.equal(handle.files.size,1);
});

test('refocusing with a different folder still invalidates the in-flight backup',async()=>{
  const {folder,handle,win,store}=await configured({handle:directory('Private',{permission:'prompt'})});
  handle.requestPermission=async()=>{
    await store.set('private',directory('Changed'),store.data.get('private').revision);win.events.get('focus')();return 'granted';
  };
  await assert.rejects(folder.destination('notes.json'),/folder changed/);assert.equal(handle.files.size,0);
});

test('team folder changes while Save as is open abort before a backup can be written',async()=>{
  const {folder,win,store}=await configured({scope:'team',handle:directory('Team')});let finishPicker,writes=0;
  win.showSaveFilePicker=()=>new Promise(resolve=>{finishPicker=resolve;});
  const pending=folder.destination('WWHS-team-handover.json');
  await store.set('team',directory('Other'),store.data.get('team').revision);
  finishPicker({createWritable:async()=>({write:async()=>{writes++;},close:async()=>{}})});
  await assert.rejects(pending,/folder changed/);assert.equal(writes,0);
});

test('unconfigured private backups preserve the existing caller picker id',async()=>{
  const win=browser();let options;win.showSaveFilePicker=async value=>{options=value;return {};};
  const folder=createBackupFolder({store:memoryStore(),win});await folder.ready;
  await folder.destination('notes.json',{id:'launchpad-task-backup'});assert.equal(options.id,'launchpad-task-backup');
});

test('each area remembers a separate folder and Open starts there with its own picker ID',async()=>{
  const store=memoryStore();
  for(const scope of ['vet','tas','launchpad','finance']){
    const handle=directory(scope),win=browser();await configured({scope,handle,win,store});
    let options;const file={name:'backup.json'};win.showOpenFilePicker=async value=>{options=value;return[{getFile:async()=>file}];};
    const folder=createBackupFolder({scope,store,win});await folder.ready;
    assert.equal(await folder.openFile(),file);assert.equal(options.startIn,handle);assert.equal(options.id,`wwhs-${scope}-backups`);assert.equal(options.excludeAcceptAllOption,true);
  }
  assert.equal(store.data.size,4);
});

test('existing parent preference creates separate area subfolders only after a user action',async()=>{
  const store=memoryStore(),parent=directory('Private'),win=browser();await configured({handle:parent,store,win});
  const launchpad=createBackupFolder({scope:'launchpad',store,win}),finance=createBackupFolder({scope:'finance',store,win});await Promise.all([launchpad.ready,finance.ready]);
  assert.equal(parent.directories.size,0);assert.equal(launchpad.state().parentName,'Private');
  await(await launchpad.destination('launchpad-backup.json')).write('notes');await(await finance.destination('finance-backup.json')).write('encrypted');
  assert.deepEqual([...parent.directories.keys()],['Launchpad','Finance']);assert.equal(parent.files.size,0);
  assert.equal(parent.directories.get('Launchpad').files.size,1);assert.equal(parent.directories.get('Finance').files.size,1);
  await launchpad.forget();assert.equal(launchpad.state().parentName,'');assert.equal(store.data.get('finance').handle.name,'Finance');
});

test('folder listing offers compatible backups only, including older files without moving them',async()=>{
  const store=memoryStore(),parent=directory('Private');await configured({handle:parent,store});
  const add=(handle,name,value)=>{const file={name,size:100,lastModified:1,text:async()=>JSON.stringify(value)};handle.files.set(name,{kind:'file',name,getFile:async()=>file});};
  const notes={format:'wwhs-launchpad-backup',version:1,records:{}},finance={format:'finance-studio-encrypted-vault',version:1,ciphertext:'encrypted'};
  add(parent,'old-notes.json',notes);add(parent,'finance.json',finance);add(parent,'unrelated.json',{name:'unrelated'});
  const folder=createBackupFolder({scope:'launchpad',store,win:browser()});await folder.ready;
  const entries=await folder.files(),compatible=await compatibleBackupFiles(entries,'launchpad');
  assert.deepEqual(compatible.map(entry=>entry.file.name),['old-notes.json']);assert.equal(compatible[0].legacy,true);assert.equal(parent.files.size,3);
  assert.equal((await compatibleBackupFiles(entries,'finance')).length,1);
  assert.equal(isBackupForArea({kind:'WWHS-TEAM-HANDOVER',schemaVersion:1,data:{},scope:'vet'},'tas'),false);
  assert.equal(isBackupForArea({kind:'WWHS-TEAM-HANDOVER',schemaVersion:1,data:{},scope:'vet'},'vet'),true);
  assert.equal(isBackupForArea({kind:'WWHS-TEAM-HANDOVER',schemaVersion:1,data:{}},'tas'),true);
  assert.equal(isBackupForArea({kind:'WWHS-TEAM-SAFETY-BACKUP',schemaVersion:1,data:{},scope:'vet'},'vet'),true);
  assert.equal(isBackupForArea({kind:'WWHS-TEAM-SAFETY-BACKUP',schemaVersion:1,data:{},scope:'vet'},'tas'),false);
});

test('two areas cannot select the same exact folder and cancelled Open changes no preference',async()=>{
  const store=memoryStore(),handle=directory('Area'),win=browser();await configured({scope:'vet',store,handle,win});
  win.showDirectoryPicker=async()=>handle;const tas=createBackupFolder({scope:'tas',store,win});await tas.ready;
  await assert.rejects(tas.select(),/Each area needs its own/);assert.equal(store.data.has('tas'),false);
  win.showOpenFilePicker=async()=>{throw new DOMException('Cancelled','AbortError');};assert.equal(await tas.openFile(),null);assert.equal(store.data.size,1);
});
