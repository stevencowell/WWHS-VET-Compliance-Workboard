// Start the picker directly from a button click, before preparing large backups.
export async function chooseBackupDestination({suggestedName,id,startIn},win=window){
  if(typeof win.showSaveFilePicker==='function'){
    let handle;
    try{handle=await win.showSaveFilePicker({suggestedName,id,...(startIn?{startIn}:{}),types:[{description:'JSON backup',accept:{'application/json':['.json']}}]});}
    catch(error){if(error.name==='AbortError')return null;throw new Error('The Save as window could not open. Use Download a copy, or try this page in Chrome.',{cause:error});}
    return fileDestination(handle);
  }
  return downloadDestination(suggestedName,win);
}
export function fileDestination(handle){
  return {async write(text){
      let writer;
      try{writer=await handle.createWritable();await writer.write(new Blob([text],{type:'application/json'}));await writer.close();return {saved:true,method:'file'};}
      catch(error){try{await writer?.abort();}catch{}throw new Error('The backup could not be saved to that folder. Your browser data is unchanged. Try another location.',{cause:error});}
    }};
}
export function downloadDestination(name,win=window){
  return {async write(text){
    const url=win.URL.createObjectURL(new Blob([text],{type:'application/json'}));
    const link=win.document.createElement('a');link.href=url;link.download=name;win.document.body.append(link);link.click();link.remove();win.setTimeout(()=>win.URL.revokeObjectURL(url),15000);
    return {saved:false,method:'download'};
  }};
}
