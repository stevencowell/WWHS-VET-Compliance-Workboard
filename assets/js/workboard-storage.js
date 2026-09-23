// Explicit, lossless storage for workboard data. Does not patch browser Storage.
(function(root,factory){
  const codec=typeof module==='object'&&module.exports?require('../vendor/lz-string-1.5.0.js'):root.LZString;
  const api=factory(codec);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else {
    // Access browser storage only inside operations so blocked storage still
    // reaches each app's existing recovery/error screen.
    const native={getItem:key=>root.localStorage.getItem(key),setItem:(key,value)=>root.localStorage.setItem(key,value),removeItem:key=>root.localStorage.removeItem(key),key:index=>root.localStorage.key(index),get length(){return root.localStorage.length;}};
    root.WWHS_STORAGE=api.createStorage(native);
  }
})(typeof window==='object'?window:globalThis,function(codec){
  'use strict';
  const KEYS=Object.freeze(['morning-launchpad-summary:v1','morning-launchpad-calendar:v1','wwhs-vet-compliance-workboard:v3','wwhs-head-teacher-tas-workboard:v2','wwhs-task-register-review:v1']);
  const keys=new Set(KEYS),PREFIX='WWHS-LZ1:',THRESHOLD=32768,MAX_LENGTH=12000000;
  const compactOnQuota=new Set([...KEYS,'wwhs-team-handover:v1','wwhs-team-handover:vet:v1','wwhs-team-handover:tas:v1','wwhs-team-handover-journal:v1','morning-launchpad-backup-reminder:v1','morning-launchpad-restore:v1','wwhs-team-safety-receipt:v1','wwhs-team-safety-receipt:v1:vet','wwhs-team-safety-receipt:v1:tas']);
  const checksum=value=>{let hash=2166136261;for(let index=0;index<value.length;index++){hash^=value.charCodeAt(index);hash=Math.imul(hash,16777619);}return(hash>>>0).toString(16).padStart(8,'0');};
  function damaged(){throw new Error('Could not read your saved work. Keep your backup file and do not clear browser data.');}
  function decode(key,value){
    if(value===null||!keys.has(key)||!value.startsWith('WWHS-LZ'))return value;
    const match=/^WWHS-LZ1:(\d{1,8}):([a-f0-9]{8}):/.exec(value);
    if(!match||Number(match[1])>MAX_LENGTH)damaged();
    let plain;try{plain=codec.decompressFromUTF16(value.slice(match[0].length));}catch{damaged();}
    if(typeof plain!=='string'||plain.length!==Number(match[1])||checksum(plain)!==match[2])damaged();
    return plain;
  }
  function encode(key,value){
    if(value===null||!keys.has(key)||value.length<THRESHOLD)return value;
    if(value.length>MAX_LENGTH)throw new Error('This saved work is too large. Keep the backup file and split the import into smaller parts.');
    if(!codec)throw new Error('Saving is not ready. Reload this page before opening or saving a backup.');
    const packed=PREFIX+value.length+':'+checksum(value)+':'+codec.compressToUTF16(value);
    if(packed.length>=value.length)return value;
    // Refuse a write unless it can be read back exactly, including Unicode/HTML.
    if(decode(key,packed)!==value)damaged();
    return packed;
  }
  function createStorage(native){
    const readCache=new Map(),writeCache=new Map();
    let generation;try{generation=native.getItem('wwhs-workspace-generation:v1');}catch{/* Keep blocked storage on the existing recovery path. */}
    function assertWritable(options={}){
      const marker=native.getItem('wwhs-workspace-restore:v1');
      if(marker?JSON.parse(marker).id!==options.restoreId:native.getItem('wwhs-workspace-generation:v1')!==generation)throw new Error('A complete backup is being opened or was opened in another tab. Keep any draft text, then reload this page.');
    }
    function prepared(key,value){
      const cached=writeCache.get(key);if(cached?.plain===value)return cached.packed;
      const packed=encode(key,value);if(keys.has(key))writeCache.set(key,{plain:value,packed});return packed;
    }
    function getItem(key){
      const raw=native.getItem(key),cached=readCache.get(key);
      if(cached&&cached.raw===raw)return cached.plain;
      const plain=decode(key,raw);if(keys.has(key))readCache.set(key,{raw,plain});return plain;
    }
    function compact(){
      // Reclaim space only from our own records, and only with an exact,
      // verified smaller representation. No records or other site data removed.
      for(const key of KEYS){
        try{
          const raw=native.getItem(key);if(raw===null)continue;
          const plain=decode(key,raw),packed=prepared(key,plain);
          if(packed.length<raw.length&&native.getItem(key)===raw)native.setItem(key,packed);
        }catch{/* An unreadable or unwritable record stays untouched. */}
      }
    }
    function setItem(key,value,options){
      assertWritable(options);
      const text=String(value),packed=prepared(key,text),before=native.getItem(key);
      try{native.setItem(key,packed);}
      catch(error){
        if(error?.name!=='QuotaExceededError'||!compactOnQuota.has(key))throw error;
        compact();
        // Compaction is representation-only. Do not cover a concurrent edit.
        if(getItem(key)!==decode(key,before))throw new Error('Saved work changed in another tab. Reload saved work before saving here.');
        try{native.setItem(key,packed);}
        catch(failure){
          if(failure?.name==='QuotaExceededError'){
            const full=new Error('This browser’s website storage is full, even after compacting the saved work. Your previous records are kept. Keep your backup file and do not clear browser data.');full.name='QuotaExceededError';throw full;
          }
          throw failure;
        }
      }
    }
    return Object.freeze({getItem,setItem,removeItem:(key,options)=>{assertWritable(options);native.removeItem(key);},key:index=>native.key(index),get length(){return native.length;},
      storedSize:key=>{const value=native.getItem(key);return value===null?0:key.length+value.length;},
      encodedSize:(key,value)=>value===null?0:key.length+prepared(key,value).length});
  }
  return {KEYS,encode,decode,createStorage};
});
