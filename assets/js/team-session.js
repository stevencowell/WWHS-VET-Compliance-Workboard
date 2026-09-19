(function (root) {
  'use strict';
  const browserStorage = () => root.WWHS_STORAGE || localStorage;
  const KEY='wwhs-team-handover:v1', JOURNAL='wwhs-team-handover-journal:v1';
  const VET='wwhs-vet-compliance-workboard:v3', TAS='wwhs-head-teacher-tas-workboard:v2', REVIEW='wwhs-task-register-review:v1', INBOX='morning-launchpad-summary:v1';
  const fields=['taskKey','title','action','noteText','workstream','origin','forecast','taskHelp','progressOverride','sectionOverride','createdOn','lastActionOn','personal','priority','nextAction','dueDate','eventDate','followUpDate','dateNote','owner','waitingOn','instruction','reason','score','group','status','dependsOn','dirty'];
  function sort(value) {if(Array.isArray(value))return value.map(sort);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,sort(value[key])]));return value;}
  const canonical=value=>JSON.stringify(sort(value));
  function read() {
    try {const raw=browserStorage().getItem(KEY);if(!raw)return {managed:false};const state=JSON.parse(raw);if(state?.version!==1||!state.lastFile?.workspaceId||!Number.isInteger(state.lastFile.revision))throw Error();return {...state,managed:true};}
    catch{return {managed:true,blocked:true};}
  }
  const bootSession=read().active?.id||null;
  function hasJournal(){try{return browserStorage().getItem(JOURNAL)!==null||browserStorage().getItem('morning-launchpad-restore:v1')!==null;}catch{return true;}}
  function isEditing() {
    const state=read();
    if(hasJournal())return false;
    return !state.managed||!state.blocked&&state.active?.phase==='editing'&&state.active.id===bootSession;
  }
  function isTeamItem(item){return item&&['vet','tas'].includes(item.origin?.wing)&&item.workstream===item.origin.wing&&item.personal!==true&&typeof item.taskKey==='string'&&item.taskKey.startsWith(`workboard:${item.origin.wing}:`);}
  function operational(key,value) {
    const state=typeof value==='string'?JSON.parse(value):value||{};
    if(key===VET)return {records:state.records||{},assignments:state.assignments||{},gaps:state.gaps||{},eventOccurrences:state.eventOccurrences||[]};
    if(key===TAS)return {records:state.records||{},weekly:state.weekly||{},eventOccurrences:state.eventOccurrences||{},scheduleOverrides:state.scheduleOverrides||{}};
    if(key===REVIEW)return state.records||{};
    if(key===INBOX)return {items:(state.items||[]).filter(isTeamItem).map(item=>{
      const shared=Object.fromEntries(fields.map(field=>[field,item[field]]));
      shared.dependsOn=(item.dependsOn||[]).filter(key=>/^workboard:(vet|tas):.+/.test(key));
      shared.dirty=(item.dirty||[]).filter(key=>fields.includes(key));
      if(shared.taskHelp)shared.taskHelp={...shared.taskHelp,links:[]};
      return shared;
    }).sort((a,b)=>a.taskKey.localeCompare(b.taskKey)),workboardImports:state.workboardImports||[]};
    return null;
  }
  function reason() {
    const state=read();
    try{if(browserStorage().getItem('morning-launchpad-restore:v1')!==null)return 'A Launchpad backup is being opened or needs recovery. Open Launchpad before saving shared progress.';}catch{}
    if(hasJournal())return 'A handover was interrupted. Open Team handover to recover it before saving.';
    if(state.blocked)return 'The team session record could not be read. Open Team handover before saving shared progress.';
    if(state.active&&state.active.id!==bootSession)return 'The team session changed in another tab. Keep any draft text, then reload this page.';
    if(state.active?.phase==='exporting')return 'A handover file is being saved. Finish the handover or return to editing from Team handover.';
    return 'This is a view-only team snapshot. Open Team handover and import the latest shared file to start editing.';
  }
  function allowWrite(key,next) {
    // Recovery compares complete raw values, so even preference-only writes must wait.
    if(!hasJournal()){
      if(isEditing())return true;
      try{if(!read().blocked&&canonical(operational(key,browserStorage().getItem(key)))===canonical(operational(key,next)))return true;}catch{}
    }
    root.dispatchEvent(new CustomEvent('wwhs:team-write-blocked',{detail:{message:reason()}}));return false;
  }
  root.WWHS_TEAM_SESSION=Object.freeze({KEY,JOURNAL,read,isEditing,isTeamItem,allowWrite,reason});
})(typeof window==='object'?window:globalThis);
