// Selection hints only. Each importer still validates/authenticates the full file.
export function isBackupForArea(value,scope){
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  if(scope==='finance')return value.format==='finance-studio-encrypted-vault'&&value.version===1&&typeof value.ciphertext==='string';
  if(scope==='launchpad')return value.format==='wwhs-launchpad-backup'&&value.version===1&&!!value.records||[1,2].includes(value.version)&&Array.isArray(value.items)||value.version===1&&Array.isArray(value.events);
  if(scope==='vet'||scope==='tas')return ['WWHS-TEAM-HANDOVER','WWHS-TEAM-SAFETY-BACKUP'].includes(value.kind)&&value.schemaVersion===1&&(!value.scope||value.scope===scope)&&!!value.data;
  return false;
}
export async function compatibleBackupFiles(entries,scope){
  const result=[];
  for(const entry of entries){
    try{
      const file=await entry.handle.getFile();
      if(file.size>240000000)continue;
      const value=JSON.parse(await file.text());
      if(isBackupForArea(value,scope))result.push({...entry,file});
    }catch{/* Unreadable or unrelated files are never offered as a usable backup. */}
  }
  return result.sort((a,b)=>b.file.lastModified-a.file.lastModified||a.file.name.localeCompare(b.file.name));
}
