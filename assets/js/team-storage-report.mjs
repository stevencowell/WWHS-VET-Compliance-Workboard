// Counts only: this report never retains note text, file contents or other key names.
const groups=[
  ['morning-launchpad-summary:v1','Launchpad notes and working cards'],
  ['wwhs-vet-compliance-workboard:v3','VET progress'],
  ['wwhs-head-teacher-tas-workboard:v2','TAS progress'],
  ['wwhs-task-register-review:v1','Review ticks'],
  ['wwhs-team-handover:v1','Team session'],
  ['wwhs-team-handover:vet:v1','VET session'],
  ['wwhs-team-handover:tas:v1','TAS session'],
  ['wwhs-team-handover-journal:v1','Temporary recovery marker']
];
const size=value=>typeof value==='string'?value.length:0;
export function storageSizes(storage,before={},after={}){
  const savedSize=key=>typeof storage.storedSize==='function'?storage.storedSize(key):size(storage.getItem(key));
  const proposedSize=(key,value)=>value===storage.getItem(key)?savedSize(key):typeof storage.encodedSize==='function'?storage.encodedSize(key,value):size(value);
  const known=new Set(groups.map(([key])=>key));let other=0;
  for(let index=0;index<storage.length;index++){
    const key=storage.key(index);if(!known.has(key))other+=savedSize(key);
  }
  const rows=groups.map(([key,label])=>{
    const saved=savedSize(key);
    return {label,saved,before:Object.hasOwn(before,key)?proposedSize(key,before[key]):saved,after:Object.hasOwn(after,key)?proposedSize(key,after[key]):saved};
  });
  rows.push({label:'Other saved website data',saved:other,before:other,after:other});
  return {rows,total:rows.reduce((sum,row)=>sum+row.saved,0),proposed:rows.reduce((sum,row)=>sum+row.after,0)};
}
export function installStorageReport(document,window,storage){
  const panel=document.getElementById('handover-storage-details'),message=document.getElementById('handover-message');
  if(!panel||!message)return;
  let plan=null;
  window.WWHS_TEAM_STORAGE_REPORT=Object.freeze({recordPlan(before,after){try{plan=storageSizes(storage,before,after);}catch{plan=null;}}});
  const number=value=>value.toLocaleString('en-AU');
  function update(){
    const relevant=message.classList.contains('is-error')&&/storage|quota/i.test(message.textContent);
    panel.hidden=!relevant;if(!relevant)return;
    const list=document.getElementById('handover-storage-sizes');list.replaceChildren();
    try{
      const current=storageSizes(storage),report=plan||current;
      document.getElementById('handover-storage-total').textContent=`Saved browser storage: ${number(current.total)} characters. ${plan?`Attempted total: ${number(report.proposed)} characters.`:''}`;
      for(const row of report.rows){
        if(!row.before&&!row.after)continue;
        const item=document.createElement('li');item.textContent=`${row.label}: ${number(row.before)}${row.before!==row.after?` → ${number(row.after)}`:''} characters`;list.append(item);
      }
    }catch{document.getElementById('handover-storage-total').textContent='This browser could not read its storage sizes. Saved data has not been changed.';}
    panel.open=true;
  }
  new window.MutationObserver(update).observe(message,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class']});
  update();
}
if(typeof document!=='undefined'&&typeof window!=='undefined'&&document.getElementById?.('handover-storage-details'))installStorageReport(document,window,window.WWHS_STORAGE||window.localStorage);
