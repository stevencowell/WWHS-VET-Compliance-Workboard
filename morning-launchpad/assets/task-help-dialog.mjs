import {getTaskHelpProfile, buildTaskHelpPrompt} from '../../assets/js/task-help.mjs?v=tas-planning-1';
import {INBOX_KEY, todaySydney} from './summary-core.mjs?v=task-help-1';

const node=(tag,text,attrs={})=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;for(const[key,value]of Object.entries(attrs))el.setAttribute(key,value);return el;};

// This interface only prepares text. It never sends a request or changes a task.
export function createTaskHelpDialog(board){
  const dialog=node('dialog',undefined,{class:'task-help-dialog','aria-labelledby':'task-help-title'});
  const heading=node('h2','Prepare with AI',{id:'task-help-title'}),taskTitle=node('p',undefined,{class:'task-help-task'});
  const close=node('button','Close',{type:'button',class:'task-help-close','aria-label':'Close AI help'});
  close.addEventListener('click',()=>dialog.close());
  const intro=node('p','Review this task-specific request, copy it, then paste it into ChatGPT. This page sends nothing.');
  const profileSummary=node('p'),deliverable=node('p'),inputs=node('ul');
  const inputDetails=node('details');inputDetails.append(node('summary','What the AI may need from you'),inputs);
  const noteChoice=node('label',undefined,{class:'task-help-note-choice'}),includeNote=node('input',undefined,{type:'checkbox'});
  noteChoice.append(includeNote,document.createTextNode('Include my working note'));
  const privacy=node('p','Keep student, health, credential and other confidential information out of the request.',{class:'import-help'});
  const state=node('p','',{class:'task-help-state',role:'status','aria-live':'polite'});
  const previewLabel=node('label','Request to copy',{for:'task-help-preview'});
  const preview=node('textarea','',{id:'task-help-preview',rows:'13',readonly:'','aria-label':'AI help request'});
  const actions=node('div',undefined,{class:'help-request-actions'}),copy=node('button','Copy help request',{type:'button',class:'import-primary'}),chat=node('button','Open ChatGPT',{type:'button'});
  actions.append(copy,chat);
  dialog.append(close,heading,taskTitle,intro,profileSummary,deliverable,inputDetails,noteChoice,privacy,state,previewLabel,preview,actions);
  board.append(dialog);
  let selectedId=null,opening=0;
  dialog.addEventListener('close',()=>{
    const item=board.inbox.items.find(entry=>entry.id===selectedId);
    const card=item&&[...board.querySelectorAll('.import-card')].find(el=>el.dataset.taskKey===(item.taskKey||item.id));
    card?.querySelector('.import-ai-help')?.focus({preventScroll:true});
  });
  function resolve(){
    if(board.blocked||localStorage.getItem(INBOX_KEY)!==board.raw)throw new Error('Your work list changed or could not be saved. Reload saved work before preparing this request.');
    const saved=board.inbox.items.find(item=>item.id===selectedId);
    if(!saved)throw new Error('This task is no longer in the saved work list.');
    let item={...saved},draft=false;
    const card=[...board.querySelectorAll('.import-card')].find(el=>el.dataset.taskKey===(item.taskKey||item.id));
    // Use visible edits in the preview without saving them or reverting them.
    for(const field of board.draftInputs.keys()){
      const key=field.dataset.helpField;
      if(!key||!card?.contains(field))continue;
      const value=field.value.trim();
      if(value!==(item[key]||'')){if(key==='action'&&!value)throw new Error('Enter a next action before preparing this request.');item[key]=value;draft=true;}
    }
    const note=card?.querySelector('.rich-note-editor');
    if(includeNote.checked&&note){if(note.innerText!==item.noteText)draft=true;item.noteText=note.innerText;}
    let availability=board.forecastAvailability?.get(item.origin?.wing)||null;
    if(item.origin){
      const adapter=window.WWHS_WORKBOARD_ADAPTER;
      if(adapter?.wing===item.origin.wing){
        const current=adapter.getHelpContext?.(item.origin.recordKey);
        if(current&&['wing','taskId','recordKey','cycle'].every(key=>current[key]===item.origin[key])){
          item.taskHelp=current;
          // A saved schedule can be older than the live task step. Keep its date label.
        }else availability={mode:'unavailable',note:'Current source progress could not be checked. This request uses the saved task snapshot; open the source task and refresh it.'};
      }else availability??={mode:'snapshot',note:`This is a saved ${item.origin.wing.toUpperCase()} task snapshot. Open its source task to check the latest progress before acting.`};
      if(!item.taskHelp)throw new Error(`Open the ${item.origin.wing.toUpperCase()} workboard and refresh its schedule to prepare help for this saved task.`);
      if(item.taskHelp.asOf!==todaySydney())availability??={mode:'snapshot',note:'This task snapshot is from an earlier day. Check the current source before acting.'};
    }
    return {item,availability,draft};
  }
  function refresh(){
    try{
      const {item,availability,draft}=resolve(),profile=getTaskHelpProfile(item);
      if(!profile)throw new Error('No preparation guidance is available for this task yet.');
      taskTitle.textContent=item.title;profileSummary.textContent=profile.summary;deliverable.textContent=`What you will get: ${profile.deliverable}`;
      inputs.replaceChildren(...profile.requiredInputs.map(text=>node('li',text)));
      preview.value=buildTaskHelpPrompt(item,{includeNotes:includeNote.checked,availability});
      copy.textContent='Copy help request';
      state.textContent=[draft?'Includes the visible edits on this page. Preparing a request does not save them.':'',availability?.note||'',item.origin?'Task progress and checklist verification stay in the source workboard.':''].filter(Boolean).join(' ');
      state.classList.remove('import-error');copy.disabled=false;chat.disabled=false;return true;
    }catch(error){preview.value='';state.textContent=error.message;state.classList.add('import-error');copy.disabled=true;chat.disabled=true;return false;}
  }
  includeNote.addEventListener('change',refresh);
  copy.addEventListener('click',async()=>{
    if(!refresh())return;
    const generation=opening,id=selectedId,text=preview.value;
    const stillShowing=()=>dialog.open&&generation===opening&&id===selectedId&&preview.value===text;
    try{await navigator.clipboard.writeText(text);if(!stillShowing())return;state.textContent='Copied. Open ChatGPT and paste the request with Ctrl + V.';copy.textContent='✓ Copied';}
    catch{if(!stillShowing())return;preview.focus();preview.select();state.textContent='Automatic copy was blocked. The request is selected; press Ctrl + C to copy it.';copy.textContent='Copy blocked — use Ctrl+C';}
  });
  chat.addEventListener('click',()=>{if(refresh())board.chatGPTChooser.showModal();});
  return {open(id){opening++;selectedId=id;includeNote.checked=false;copy.textContent='Copy help request';taskTitle.textContent='';profileSummary.textContent='';deliverable.textContent='';inputs.replaceChildren();refresh();dialog.showModal();close.focus();},dialog};
}
