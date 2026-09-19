import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackupFolder} from '../assets/js/backup-folder.mjs';

function directory(name){
  const directories=new Map();
  return {kind:'directory',name,directories,
    async isSameEntry(other){return this===other;},
    async queryPermission(){return 'granted';},async requestPermission(){return 'granted';},
    async getDirectoryHandle(child,{create=false}={}){if(!directories.has(child)){if(!create)throw new DOMException('Missing','NotFoundError');directories.set(child,directory(child));}return directories.get(child);},
    async *values(){},
  };
}
function store(){
  const data=new Map();let version=0;
  return {data,async get(scope){return data.get(scope)||null;},async set(scope,handle,expected){assert.equal(data.get(scope)?.revision??null,expected);const record={handle,revision:`v${++version}`};data.set(scope,record);return record;},async delete(scope,expected){return this.set(scope,null,expected);}};
}
const win={crypto:{randomUUID:()=> 'synthetic-copy'},showDirectoryPicker:async()=>{throw Error('No picker expected');},showSaveFilePicker:async()=>{throw Error('No picker expected');},addEventListener(){},removeEventListener(){}};

test('legacy area migration cannot reuse a child already selected by a different area',async()=>{
  const records=store(),parent=directory('Private'),alreadyFinance=await parent.getDirectoryHandle('Launchpad',{create:true});
  await records.set('private',parent,null);await records.set('finance',alreadyFinance,null);
  const launchpad=createBackupFolder({scope:'launchpad',store:records,win});await launchpad.ready;
  await assert.rejects(launchpad.destination('launchpad-backup.json'),/different|own backup folder/i);
  assert.equal(await records.get('launchpad'),null);assert.equal((await records.get('finance')).handle,alreadyFinance);
});

test('legacy area migration cannot reuse the other private/team parent as its child',async()=>{
  const records=store(),parent=directory('Private'),teamParent=await parent.getDirectoryHandle('Finance',{create:true});
  await records.set('private',parent,null);await records.set('team',teamParent,null);
  const finance=createBackupFolder({scope:'finance',store:records,win});await finance.ready;
  await assert.rejects(finance.destination('finance-backup.json'),/different|own backup folder/i);
  assert.equal(await records.get('finance'),null);assert.equal((await records.get('team')).handle,teamParent);
});

test('a private folder change while opening its writer prevents writing and confirming the stale destination',async()=>{
  const records=store(),original=directory('Finance original'),replacement=directory('Finance replacement');let written=false,closed=false,aborted=false;
  await records.set('finance',original,null);
  original.getFileHandle=async(name,{create=false}={})=>{
    if(!create)throw new DOMException('Missing','NotFoundError');
    return {async createWritable(){await records.set('finance',replacement,(await records.get('finance')).revision);return {async write(){written=true;},async close(){closed=true;},async abort(){aborted=true;}};}};
  };
  const finance=createBackupFolder({scope:'finance',store:records,win});await finance.ready;
  const destination=await finance.destination('finance-backup.json');await assert.rejects(destination.write('synthetic encrypted data'),/changed|could not be saved/i);
  assert.equal(written,false);assert.equal(closed,false);assert.equal(aborted,true);assert.equal((await records.get('finance')).handle,replacement);
});
