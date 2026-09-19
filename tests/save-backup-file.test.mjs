import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseBackupDestination,downloadDestination} from '../assets/js/save-backup-file.mjs';

const options={suggestedName:'WWHS-team-handover.json',id:'wwhs-team-handover'};
test('Save as opens immediately with the requested name and JSON type',async()=>{
  let requested;
  const promise=chooseBackupDestination(options,{showSaveFilePicker(value){requested=value;return Promise.resolve({});}});
  assert.equal(requested.suggestedName,options.suggestedName);assert.equal(requested.id,options.id);
  assert.deepEqual(requested.types,[{description:'JSON backup',accept:{'application/json':['.json']}}]);
  assert.equal(typeof(await promise).write,'function');
});
test('cancelling the picker returns no destination',async()=>{
  const result=await chooseBackupDestination(options,{showSaveFilePicker(){throw new DOMException('Cancelled','AbortError');}});
  assert.equal(result,null);
});
test('a blocked picker gives the explicit download fallback',async()=>{
  const destination=await chooseBackupDestination(options,{showSaveFilePicker(){throw new DOMException('Blocked','SecurityError');}});
  assert.equal(typeof destination.write,'function');
});
test('a file counts as saved only after its writable stream closes',async()=>{
  let written,close,settled=false;
  const destination=await chooseBackupDestination(options,{showSaveFilePicker:async()=>({createWritable:async()=>({
    async write(blob){written=await blob.text();},close(){return new Promise(resolve=>{close=resolve;});}
  })})});
  const pending=destination.write('{"test":true}').then(value=>{settled=true;return value;});
  while(!close)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(written,'{"test":true}');assert.equal(settled,false);close();
  assert.deepEqual(await pending,{saved:true,method:'file'});
});
test('write and close failures abort and never report success',async()=>{
  for(const stage of ['write','close']){
    let aborted=0;
    const destination=await chooseBackupDestination(options,{showSaveFilePicker:async()=>({createWritable:async()=>({
      async write(){if(stage==='write')throw Error('Synthetic write failure');},
      async close(){if(stage==='close')throw Error('Synthetic close failure');},async abort(){aborted++;}
    })})});
    await assert.rejects(destination.write('{}'),/could not be saved/);assert.equal(aborted,1);
  }
});
test('unsupported Save as and explicit fallback request a download without claiming a confirmed save',async()=>{
  for(const explicit of [false,true]){
    const events=[];let link;
    const win={URL:{createObjectURL:()=>{events.push('url');return 'blob:synthetic';},revokeObjectURL:()=>events.push('revoke')},
      document:{createElement:()=>link={click:()=>events.push('click'),remove:()=>events.push('remove')},body:{append:()=>events.push('append')}},
      setTimeout(callback){callback();}};
    const destination=explicit?downloadDestination(options.suggestedName,win):await chooseBackupDestination(options,win);
    assert.deepEqual(await destination.write('{}'),{saved:false,method:'download'});
    assert.equal(link.download,options.suggestedName);assert.deepEqual(events,['url','append','click','remove','revoke']);
  }
});

test('guarded file saves abort when the destination changes during create or write',async()=>{
  for(const stage of ['create','write']){
    let existing='original',aborted=0,closed=0;
    const destination=await chooseBackupDestination(options,{showSaveFilePicker:async()=>({
      getFile:async()=>({text:async()=>existing}),
      createWritable:async()=>{if(stage==='create')existing='newer';return {
        async write(){if(stage==='write')existing='newer';},async close(){closed++;},async abort(){aborted++;}
      };}
    })});
    const expectedText=await destination.read();
    await assert.rejects(destination.write('candidate',{expectedText}),/could not be saved/);
    assert.equal(existing,'newer');assert.equal(closed,0);assert.equal(aborted,1);
  }
});

test('guarded file saves recheck application state before committing',async()=>{
  let current=true,aborted=0,closed=0;
  const destination=await chooseBackupDestination(options,{showSaveFilePicker:async()=>({
    getFile:async()=>({text:async()=>''}),createWritable:async()=>({async write(){current=false;},async close(){closed++;},async abort(){aborted++;}})
  })});
  await assert.rejects(destination.write('candidate',{expectedText:'',verify(){if(!current)throw Error('Newer task edit');}}),/could not be saved/);
  assert.equal(closed,0);assert.equal(aborted,1);
});
