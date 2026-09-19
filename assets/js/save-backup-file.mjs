// Start the picker directly from a button click, before preparing large backups.
export async function chooseBackupDestination({suggestedName,id,startIn},win=window){
  if(typeof win.showSaveFilePicker==='function'){
    let handle;
    try{handle=await win.showSaveFilePicker({suggestedName,id,...(startIn?{startIn}:{}),types:[{description:'JSON backup',accept:{'application/json':['.json']}}]});}
    catch(error){
      if(error.name==='AbortError')return null;
      // A browser without usable Save as still has the ordinary download path.
      // Its caller must show the download receipt, never a confirmed file save.
      return downloadDestination(suggestedName,win);
    }
    return fileDestination(handle);
  }
  return downloadDestination(suggestedName,win);
}
export function fileDestination(handle){
  const read=async()=>typeof handle.getFile==='function'?(await handle.getFile()).text():null;
  return {read,async write(text,{expectedText,verify}={}){
    const save=async()=>{
      let writer;
      const check=async()=>{await verify?.();if(expectedText!==undefined&&expectedText!==null&&await read()!==expectedText)throw new Error('The file changed while saving. Nothing has been overwritten.');};
      try{await check();writer=await handle.createWritable();await check();await writer.write(new Blob([text],{type:'application/json'}));await check();await writer.close();return {saved:true,method:'file'};}
      catch(error){try{await writer?.abort();}catch{}throw new Error('The backup could not be saved to that folder. Your browser data is unchanged. Try another location.',{cause:error});}
    };
    return expectedText!==undefined&&globalThis.navigator?.locks?.request?globalThis.navigator.locks.request('wwhs-shared-file-save',save):save();
    }};
}
export function downloadDestination(name,win=window){
  return {async write(text){
    const url=win.URL.createObjectURL(new Blob([text],{type:'application/json'}));
    const link=win.document.createElement('a');link.href=url;link.download=name;win.document.body.append(link);link.click();link.remove();win.setTimeout(()=>win.URL.revokeObjectURL(url),15000);
    return {saved:false,method:'download'};
  }};
}
