import {createLocalVault} from './security/local-vault.mjs?v=workspace-backup-1';
import {installWorkspaceBackup} from '../assets/js/workspace-backup-ui.mjs?v=vet-admin-audit-20260924';
import {createPrivateStorage} from './security/private-storage.mjs?v=plain-language-1';
import {sampleDataset} from './sample.mjs';
import {FINANCE_PROMPT_TOPICS,buildFinancePrompt,buildSafeFinanceSummary} from './prompts.mjs?v=plain-language-1';
import {validateBudgetPlan} from './budget-plan.mjs?v=plain-language-1';
import {setupBudgetPlanUi} from './budget-plan-ui.mjs?v=plain-language-1';
import {createFinanceBackupReminder} from './backup-reminder.mjs';
import {downloadDestination} from '../assets/js/save-backup-file.mjs?v=backup-flow-2';
import {choosePrivateBackupDestination,getBackupFolder} from '../assets/js/backup-folder.mjs?v=plain-language-1';
import {mountBackupFolderSettings} from '../assets/js/backup-folder-ui.mjs?v=plain-language-1';
import {mountBackupFileBrowser} from '../assets/js/backup-file-browser.mjs?v=plain-language-1';
import {createWorkspaceNavigationAllowance} from '../assets/js/workspace-navigation.mjs?v=workspace-navigation-2';

if(window.self!==window.top)throw new Error('Open Finance Studio directly to use this workspace.');

const $=id=>document.getElementById(id);
const privateBackupFolder=getBackupFolder('finance');
const workspaceNavigation=createWorkspaceNavigationAllowance(window,document);
let selectedBackupFile=null;
let vault,storage,engine,budgetUi,backupReminder,sample=false,starting=false,previousSaving=false,gateState='',fatalSaveError=null,engineAttempted=false,resetting=false;
const rejectedWrites=new Map();
const planningKey='finance_studio_planning_inputs_v1';
const topicForView={overview:'spending',transactions:'categories',budget:'budget',statements:'statements',tax:'tax',planning:'savings',categories:'categories','ai-insights':'subscriptions',tools:'spending',assistant:'spending'};

function reportStatus(status) {
  if(fatalSaveError&&status.state==='saved')status={state:'error',error:fatalSaveError.message};
  const labels={saved:'Saved in this browser',unsaved:'Changes waiting to save…',saving:'Saving encrypted records…',error:'Not saved — save a recovery backup',conflict:'Another tab has newer records — save a recovery backup',closed:'Locked'};
  $('saveStatus').textContent=sample?'Sample only · not saved':labels[status.state]||status.state;
  $('saveStatus').dataset.error=String(['error','conflict'].includes(status.state));
  $('downloadEncryptedBackup').textContent=['error','conflict'].includes(status.state)?'Save recovery backup…':'Save backup…';
  $('saveProblem').hidden=!['error','conflict'].includes(status.state);
  if(status.error)$('saveProblemMessage').textContent=status.error;
  renderBackupReminder();
}
function renderBackupReminder() {
  const panel=$('financeBackupReminder');
  if(!panel)return;
  panel.hidden=sample||!backupReminder;
  $('financeBackupToolbar').hidden=panel.hidden;
  if(panel.hidden)return;
  const state=backupReminder.status();
  $('financeBackupAlerts').checked=state.enabled;
  $('confirmFinanceBackup').hidden=!state.canConfirm&&!state.confirming;
  $('financeBackupConfirmation').hidden=!state.canConfirm&&!state.confirming;
  $('confirmFinanceBackup').disabled=state.confirming;
  panel.dataset.state=fatalSaveError||['error','conflict'].includes(storage?.status().state)?'error':state.enabled&&state.needsBackup?'needed':'current';
  $('financeBackupToolbar').dataset.state=panel.dataset.state;
  $('financeBackupToolbarStatus').textContent=panel.dataset.state==='error'?'Save needs attention':state.canConfirm?'Check your downloaded file':state.needsBackup?'Backup recommended':state.confirmedAt?'Backup up to date':'Private encrypted backup';
  let message;
  if(state.confirming)message='Saving your backup confirmation…';
  else if(state.canConfirm)message='Check Files or Downloads for the encrypted backup, then confirm below.';
  else if(!state.enabled)message='Backup reminders are off. Save an encrypted backup occasionally. Warnings about unsaved changes stay on.';
  else if(state.needsBackup)message=fatalSaveError||storage?.status().dirty?'Your latest changes need a private encrypted backup. Check the save status above too.':'Your changes are saved in this browser. A private encrypted backup is recommended before you leave.';
  else if(state.confirmedAt)message=`You confirmed an encrypted backup on ${new Date(state.confirmedAt).toLocaleString('en-AU')}. New edits will start the reminder again.`;
  else message='Backup reminders are on for new changes. No backup has been confirmed here yet.';
  $('financeBackupReminderMessage').textContent=message;
}
function memoryStorage() {
  const values=new Map();
  return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),clear:()=>values.clear(),status:()=>({state:'saved',dirty:false}),flush:async()=>{},close:()=>values.clear()};
}
function loadScript(src) { return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('A Finance Studio file could not be loaded. Reload and try again.'));document.head.append(script);}); }
function stamp(){return new Date().toISOString().slice(0,10);}
function setStarting(value){starting=value;financeFileBrowser.setDisabled(value||resetting||previousSaving);for(const id of ['unlockFinance','trySample','restoreVault','cancelRestoreBackup','restoreVaultFile','restoreVaultPassword','gateImportBackup','gateSaveBackup','importEncryptedBackup','financeSaveBackup','lockFinance','gatePreviousBackup','savePreviousBackup'])$(id).disabled=value||resetting||previousSaving;}
async function refreshPreviousBackup(){
  let available=false;
  try{await privateBackupFolder.ready;available=!sample&&!!(await vault.getPreviousBackupInfo());}catch{}
  $('gatePreviousBackupSection').hidden=!available;$('financePreviousBackupSection').hidden=!available;
}
function showBackupImport(){
  if(starting||resetting||!$('financeWorkspace').hidden)return;
  $('restoreVaultDetails').open=true;
  $('restoreVaultDetails').scrollIntoView({block:'center'});
  $('financeBackupFiles').focus({preventScroll:true});
}

async function showGate() {
  const gate=await vault.getGate(); gateState=gate.state;
  const setup=gateState==='needs-password';
  $('gateTitle').textContent=setup?'Make this your private workspace.':'Welcome back.';
  $('gateDescription').textContent=setup?'Choose a password or passphrase of at least 12 characters. Your imported records will be encrypted in this browser.':'Enter your password to unlock the records saved in this browser.';
  $('vaultPassword').minLength=setup?12:1;
  $('vaultPassword').autocomplete=setup?'new-password':'current-password';
  $('confirmPassword').minLength=12;$('confirmPassword').required=setup;$('confirmPassword').disabled=!setup;
  $('confirmPasswordLabel').hidden=!setup;$('unlockFinance').textContent=setup?'Create private workspace':'Unlock Finance';
  $('vaultForm').hidden=false;
  await refreshPreviousBackup();
}

async function openWorkspace(isSample=false) {
  if(engineAttempted)throw new Error('Reload Finance Studio before opening another workspace.');
  sample=isSample;
  storage=sample?memoryStorage():await createPrivateStorage(vault,{onStatus:reportStatus,autoFlushMs:300});
  if(!sample){backupReminder=createFinanceBackupReminder(storage,{onChange:renderBackupReminder});storage=backupReminder.storage;}
  window.FINANCE_STORAGE={privateWorkspace:!sample,validateBudgetPlan,getItem:k=>storage.getItem(k),setItem:(k,v)=>{try{storage.setItem(k,v);rejectedWrites.delete(k);}catch(error){rejectedWrites.set(k,v);throw error;}},removeItem:k=>storage.removeItem(k),atomic:fn=>{const rejectedBefore=new Map(rejectedWrites);try{return storage.atomic?storage.atomic(fn):fn();}catch(error){rejectedWrites.clear();for(const [key,value] of rejectedBefore)rejectedWrites.set(key,value);fatalSaveError=error;reportStatus({state:'error',error:error.message});throw error;}},onError:error=>{fatalSaveError=error;reportStatus({state:'error',error:error.message});}};
  engineAttempted=true;
  await loadScript('./vendor/chart.js/chart.umd.js');
  await loadScript('./classification-config.js');
  await loadScript('./transfer-classification.js?v=plain-language-1');
  await loadScript('./main.js?v=plain-language-1');
  engine=window.FinanceEngine;
  window.addEventListener('finance-ai-help',event=>openPrompt(event.detail?.topic||'spending'));
  window.addEventListener('finance-data-changed',updateCoverage);
  const navigate=engine.App.navigate.bind(engine.App);
  engine.App.navigate=view=>{
    if(!document.getElementById(`${view}-view`))view='overview';
    navigate(view);
    const tab=['overview','transactions','budget','planning','tools'].includes(view)?view:'tools';
    document.querySelectorAll('.nav-btn').forEach(button=>{button.classList.toggle('active',button.dataset.view===tab); if(button.dataset.view===tab)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    if(location.hash!==`#${view}`)history.replaceState(null,'',`#${view}`);
    $('openAssistant').textContent=view==='assistant'?'AI help':'AI help with this view';
  };
  const renderAll=engine.App.renderAll.bind(engine.App);
  engine.App.renderAll=()=>{renderAll();updateCoverage();budgetUi?.refresh();};
  $('financeGate').hidden=true;$('financeWorkspace').hidden=false;
  $('workspaceMode').textContent=sample?'Sample workspace':'Private Finance';
  $('sampleNotice').hidden=!sample;
  $('downloadEncryptedBackup').hidden=sample;
  $('lockFinance').textContent=sample?'Leave sample workspace':'Lock Finance';
  if(sample)await engine.start({dataset:sampleDataset()});else await engine.start();
  budgetUi=setupBudgetPlanUi({engine,storage,sample});
  document.title='Finance Studio · Your private workspace';
  // Keep the approved overview hierarchy: figures first, then a useful next step.
  const cards=$('summaryCards'),brief=document.querySelector('.overview-brief-grid');
  brief.before(cards);
  const moreFigures=document.createElement('button');moreFigures.id='summaryCardToggle';moreFigures.className='btn btn-ghost';moreFigures.textContent='Show spending breakdown';moreFigures.setAttribute('aria-expanded','false');moreFigures.setAttribute('aria-controls','summaryCards');
  moreFigures.addEventListener('click',()=>{const expanded=cards.classList.toggle('show-extra');moreFigures.setAttribute('aria-expanded',String(expanded));moreFigures.textContent=expanded?'Hide spending breakdown':'Show spending breakdown';});cards.after(moreFigures);
  const parsedPlanning=JSON.parse(storage.getItem(planningKey)||'{}');
  const savedPlanning=parsedPlanning&&typeof parsedPlanning==='object'&&!Array.isArray(parsedPlanning)?parsedPlanning:{};
  for(const [id,value] of Object.entries(savedPlanning)){const field=$(id);if(field?.closest('#planning-view')&&['INPUT','SELECT'].includes(field.tagName))field.value=String(value);}
  engine.PlanningController.render();
  $('planning-view').addEventListener('input',()=>{
    const values={};document.querySelectorAll('#planning-view input[id],#planning-view select[id]').forEach(field=>{values[field.id]=field.value;});
    try{window.FINANCE_STORAGE.setItem(planningKey,JSON.stringify(values));}catch(error){fatalSaveError=error;reportStatus({state:'error',error:error.message});}
  });
  document.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>engine.App.navigate(button.dataset.go)));
  document.querySelectorAll('.view').forEach(view=>{
    if(['assistant-view','tools-view'].includes(view.id))return;
    const action=document.createElement('button');action.className='btn btn-ghost contextual-ai';action.textContent='AI help for this task';
    action.addEventListener('click',()=>openPrompt(topicForView[view.id.replace('-view','')]));
    const target=view.querySelector('.card-header');if(target)target.append(action);
  });
  // Capturing prevents the retained legacy assistant button handler from opening an online chat.
  $('openAssistant').addEventListener('click',event=>{event.stopImmediatePropagation();openPrompt(topicForView[engine.AppState.activeView]);},true);
  // Demo is deliberately isolated. Real records must go into the encrypted workspace.
  if(sample)['importCsv','importData','restoreBackup','backupApp','exportData'].forEach(id=>{$(id).disabled=true;$(id).title='Leave the sample workspace to import or save your own records.';});
  renderPrompt();engine.App.navigate(location.hash.slice(1)||'overview');
  reportStatus(storage.status());updateCoverage();
  if(!sample){backupReminder.activate();await storage.flush();navigator.storage?.persist?.().catch(()=>{});}
  await refreshPreviousBackup();
}
function updateCoverage(){
  if(!engine)return;
  const dates=engine.AppState.transactions.map(tx=>tx.date instanceof Date?tx.date.toISOString().slice(0,10):String(tx.date||'').slice(0,10)).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  $('generatedTime').textContent=dates.length?`Records: ${dates[0]} to ${dates.at(-1)} · ${dates.length} transactions`:'No statements imported yet';
  $('emptyNotice').hidden=sample||dates.length>0;
  if($('includePromptSummary').checked)renderPrompt();
}
function openPrompt(topic){$('promptTopic').value=topic||'spending';$('includePromptSummary').checked=false;renderPrompt();engine.App.navigate('assistant');$('financePrompt').focus();}
function renderPrompt(){
  $('financePrompt').value=buildFinancePrompt($('promptTopic').value,{includeSummary:$('includePromptSummary').checked,summary:engine?buildSafeFinanceSummary(engine.AppState.transactions):undefined});
  $('promptStatus').textContent='';
}
$('promptTopic').replaceChildren(...FINANCE_PROMPT_TOPICS.map(topic=>{const option=document.createElement('option');option.value=topic.id;option.textContent=topic.label;return option;}));
const summaryChoice=document.createElement('label');summaryChoice.className='summary-choice';summaryChoice.innerHTML='<input type="checkbox" id="includePromptSummary"> Include a brief totals summary (no account names or individual transactions)';
$('financePrompt').closest('label').before(summaryChoice);
$('promptTopic').addEventListener('change',renderPrompt);$('includePromptSummary').addEventListener('change',renderPrompt);
$('copyFinancePrompt').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('financePrompt').value);$('promptStatus').textContent='Copied. Review what you share with your chosen assistant.';}catch{$('financePrompt').focus();$('financePrompt').select();$('promptStatus').textContent='Press Ctrl+C to copy the selected prompt.';}});

const problem=document.createElement('div');problem.id='saveProblem';problem.className='local-note';problem.hidden=true;
problem.innerHTML='<strong>Your latest edits need attention.</strong> <span id="saveProblemMessage"></span><div class="inline-actions"><button class="btn btn-secondary" id="retrySave">Try saving again</button><button class="btn btn-secondary" id="reloadSaved">Reload saved records</button></div>';
document.querySelector('.workspace-status').after(problem);
$('retrySave').addEventListener('click',async()=>{try{for(const [k,v] of rejectedWrites)window.FINANCE_STORAGE.setItem(k,v);await storage.flush();await vault.exportBackup({expectedRevision:storage.status().revision});fatalSaveError=null;reportStatus(storage.status());}catch(error){reportStatus({state:error.code==='conflict'?'conflict':'error',error:error.message});}});
$('reloadSaved').addEventListener('click',()=>{if(confirm('Reload the saved records? This discards unsaved edits in this tab. Save a recovery backup first.')){resetting=true;fatalSaveError=null;$('financeWorkspace').hidden=true;storage.close({discardUnsaved:true});vault.lock();location.reload();}});

$('vaultForm').addEventListener('submit',async event=>{
  event.preventDefault();if(starting||previousSaving||resetting)return;
  if(gateState==='needs-password'&&$('vaultPassword').value!==$('confirmPassword').value){$('gateMessage').textContent='The two passwords do not match.';return;}
  setStarting(true);$('gateMessage').textContent='Unlocking your workspace…';
  try{if(gateState==='needs-password')await vault.setup($('vaultPassword').value);else await vault.unlock($('vaultPassword').value);$('vaultPassword').value='';$('confirmPassword').value='';await openWorkspace();}
  catch(error){if(engineAttempted)restartAfterFailedStart();else $('gateMessage').textContent=error.message;}
  finally{setStarting(false);}
});
$('trySample').addEventListener('click',async()=>{if(starting||previousSaving||resetting)return;setStarting(true);try{await openWorkspace(true);}catch(error){if(engineAttempted)restartAfterFailedStart();else $('gateMessage').textContent=error.message;}finally{setStarting(false);}});
async function saveFinanceBackup(downloadOnly=false){
  if(sample||starting||previousSaving||resetting||!storage||$('downloadEncryptedBackup').disabled)return;
  const button=$('downloadEncryptedBackup');button.disabled=true;$('importEncryptedBackup').disabled=true;$('lockFinance').disabled=true;$('downloadFinanceCopy').disabled=true;$('closeFinanceBackup').disabled=true;
  try{
    // Open the native picker within the original click, before any encryption awaits.
    const name=`finance-encrypted-backup-${stamp()}.json`;
    const destination=downloadOnly?downloadDestination(name):await choosePrivateBackupDestination({suggestedName:name,id:'finance-private-backup',scope:'finance'});
    if(!destination){$('backupStatus').textContent='Save cancelled. Your Finance records are unchanged.';return;}
    const capture=backupReminder.captureBackup();backupReminder.offerConfirmation(null);
    let text,recovery=false;
    try{await storage.flush();if(fatalSaveError)throw fatalSaveError;text=await vault.exportBackup({expectedRevision:storage.status().revision});}
    catch(error){recovery=true;fatalSaveError||=error;reportStatus({state:error.code==='conflict'?'conflict':'error',error:error.message});text=await vault.exportRecovery(collectRecoveryValues());}
    const result=await destination.write(text);
    const canConfirm=!recovery&&backupReminder.offerConfirmation(capture);
    if(recovery){$('backupStatus').textContent=`Encrypted recovery ${result.saved?'file saved':'download started'}. Keep its password; the local save problem still needs attention.`;}
    else if(result.saved&&canConfirm){const confirmed=await backupReminder.confirmBackup();$('backupStatus').textContent=confirmed?'Encrypted backup saved to your chosen folder. Keep its password safe. If you chose a Drive folder, its sync app handles the upload.':'Encrypted file saved, but more changes arrived. Save another backup to include the latest edits.';}
    else if(result.saved){$('backupStatus').textContent='Encrypted file saved, but more changes arrived. Save another backup to include the latest edits.';}
    else{$('backupStatus').textContent=canConfirm?'Encrypted backup download started. Saving has not been confirmed.':'Download started, but more changes arrived. Save another backup to include the latest edits.';}
  }catch(error){$('backupStatus').textContent=error.message;}finally{button.disabled=false;$('importEncryptedBackup').disabled=false;$('lockFinance').disabled=false;$('downloadFinanceCopy').disabled=false;$('closeFinanceBackup').disabled=false;}
}
$('financeSaveBackup').addEventListener('click',()=>window.WWHS_BACKUPS?.open('save'));
$('closeFinanceBackup').addEventListener('click',()=>$('financeBackupReminder').close());
$('financeBackupReminder').addEventListener('cancel',event=>{if($('downloadEncryptedBackup').disabled)event.preventDefault();});
$('downloadEncryptedBackup').addEventListener('click',()=>saveFinanceBackup());
const backupStatus=document.createElement('p');backupStatus.id='backupStatus';backupStatus.className='private-backup-status';backupStatus.setAttribute('role','status');$('financeBackupReminderMessage').after(backupStatus);
$('financeBackupAlerts').addEventListener('change',async()=>{try{backupReminder.setEnabled($('financeBackupAlerts').checked);await storage.flush();}catch(error){renderBackupReminder();reportStatus({state:error.code==='conflict'?'conflict':'error',error:error.message});}});
$('downloadFinanceCopy').addEventListener('click',()=>saveFinanceBackup(true));
async function savePreviousBackup(locked=false){
  if(sample||starting||previousSaving||resetting||!vault||$('downloadEncryptedBackup').disabled)return;
  const message=$(locked?'gatePreviousBackupMessage':'financePreviousBackupMessage');
  previousSaving=true;setStarting(starting);
  try{
    const destination=await choosePrivateBackupDestination({suggestedName:`finance-previous-encrypted-backup-${stamp()}.json`,id:'finance-private-backup',scope:'finance'});
    if(!destination){message.textContent='Save cancelled. Both Finance copies are unchanged.';return;}
    const text=await vault.exportPreviousBackup(),result=await destination.write(text);
    message.textContent=result.saved?'Previous encrypted copy saved. Use its original password. This does not back up your current records.':'Previous encrypted copy download started. Check Files or Downloads and keep its original password. Your current backup reminder is unchanged.';
  }catch(error){message.textContent=error.message;}
  finally{previousSaving=false;setStarting(starting);}
}
$('gatePreviousBackup').addEventListener('click',()=>savePreviousBackup(true));
$('savePreviousBackup').addEventListener('click',()=>savePreviousBackup());
$('confirmFinanceBackup').addEventListener('click',async()=>{try{if(fatalSaveError)throw fatalSaveError;const confirmed=await backupReminder.confirmBackup();$('backupStatus').textContent=confirmed?'Backup confirmed. Keep the file and its password somewhere safe.':'More changes arrived. Download another encrypted backup before confirming.';}catch(error){$('backupStatus').textContent='The backup confirmation could not be saved. '+error.message;reportStatus({state:error.code==='conflict'?'conflict':'error',error:error.message});}});
async function lockWorkspace(forImport=false){
  if(starting||previousSaving||resetting||!storage||$('downloadEncryptedBackup').disabled)return;
  setStarting(true);
  try{
    await storage.flush();if(fatalSaveError)throw fatalSaveError;
    const action=forImport?'Lock Finance and open backup import anyway?':'Lock Finance anyway?';
    storage.close();vault?.lock();resetting=true;$('financeWorkspace').hidden=true;
    // Reload purges the old engine and decrypted records before the restore form opens.
    history.replaceState(null,'',location.pathname+(forImport?'#import-backup':''));
    location.reload();
  }catch(error){reportStatus({state:'error',error:error.message+' Save a recovery backup before reloading.'});}
  finally{setStarting(false);}
}
$('lockFinance').addEventListener('click',()=>lockWorkspace());
$('importEncryptedBackup').addEventListener('click',()=>window.WWHS_BACKUPS?.open('open'));
$('gateImportBackup').addEventListener('click',()=>window.WWHS_BACKUPS?.open('open'));
$('gateSaveBackup').addEventListener('click',()=>window.WWHS_BACKUPS?.open('save'));
function selectBackupFile(file){
  if(starting||previousSaving||resetting||!$('financeWorkspace').hidden||!$('restoreVaultDetails').open)return;
  selectedBackupFile=file||null;$('financeSelectedBackup').textContent=file?`Selected: ${file.name}`:'';$('restoreVaultMessage').textContent='';
  if(file)$('restoreVaultPassword').focus();
}
const financeFileBrowser=mountBackupFileBrowser($('financeBackupFiles'),{scope:'finance',onFile:async file=>selectBackupFile(file),onError:error=>{selectedBackupFile=null;$('restoreVaultFile').value='';$('financeSelectedBackup').textContent='';$('restoreVaultMessage').textContent=error.message;}});
mountBackupFolderSettings($('financeGateBackupSettings'),{scope:'finance'});
$('restoreVaultFile').addEventListener('change',()=>selectBackupFile($('restoreVaultFile').files[0]));
$('cancelRestoreBackup').addEventListener('click',()=>{
  if(starting||resetting)return;
  selectedBackupFile=null;$('financeSelectedBackup').textContent='';$('restoreVaultFile').value='';$('restoreVaultPassword').value='';$('restoreVaultMessage').textContent='';$('restoreVaultDetails').open=false;
  financeFileBrowser.reset();
  if(location.hash==='#import-backup')history.replaceState(null,'',location.pathname);
  $('gateImportBackup').focus();
});
$('restoreVault').addEventListener('click',async()=>{
  if(starting||previousSaving||resetting)return;
  const file=selectedBackupFile;if(!file){$('restoreVaultMessage').textContent='Choose an encrypted Finance Studio backup first.';return;}
  const password=$('restoreVaultPassword').value;if(!password){$('restoreVaultMessage').textContent='Enter the password for this backup.';$('restoreVaultPassword').focus();return;}
  if(!vault)return;
  setStarting(true);
  try{if(file.size>48*1024*1024)throw new Error('This backup is too large.');let current;try{current=await vault.getGate();}catch{current={state:'damaged'};}let replace=false;if(current.state!=='needs-password'){replace=confirm('Replace this browser’s saved Finance records with this backup? The previous encrypted copy will be kept in this browser. You will need its original password to open it.');if(!replace)return;}
    await vault.restoreBackup(await file.text(),password,{replaceExisting:replace});$('restoreVaultPassword').value='';await openWorkspace();
  }catch(error){if(engineAttempted)restartAfterFailedStart();else $('restoreVaultMessage').textContent=error.message;}finally{setStarting(false);}
});
function collectRecoveryValues(){
  const values=JSON.parse(storage.exportRecovery()).values, backup=engine.buildBackup();
  const fields={budget_items:'budgetItems',budget_meta:'budgetMeta',subcategory_rules:'subcategoryRules',merchant_review_hidden:'merchantReviewHidden',scenarios:'scenarios',tax_settings:'taxSettings',tax_manual_expenses:'taxManualExpenses',tax_rules:'taxRules',tax_overrides:'taxOverrides',theme:'theme',assistant_mode:'assistantMode',assistant_web_lookup:'assistantWebLookup',global_account_scope:'globalAccountScope'};
  values[engine.storageKeys.datasetSnapshot]=JSON.stringify(backup.dataset);
  for(const [field,key] of Object.entries(fields))if(Object.hasOwn(backup.local_state,field))values[engine.storageKeys[key]]=JSON.stringify(backup.local_state[field]);
  for(const [key,value] of rejectedWrites)values[key]=value;
  const planning={};document.querySelectorAll('#planning-view input[id],#planning-view select[id]').forEach(field=>{planning[field.id]=field.value;});values[planningKey]=JSON.stringify(planning);
  return values;
}
function restartAfterFailedStart(){
  // A partially initialised engine cannot safely be reused across an unlock attempt.
  // Reload purges its references and plaintext DOM. The saved encrypted vault stays intact.
  resetting=true;setStarting(true);try{sessionStorage.setItem('finance_ui_start_error','1');}catch{}
  fatalSaveError=null;storage?.close({discardUnsaved:true});vault?.lock();$('financeWorkspace').hidden=true;location.replace(location.pathname);
}
window.addEventListener('hashchange',()=>{if(location.hash==='#import-backup')window.WWHS_BACKUPS?.open('open');else if(engine)engine.App.navigate(location.hash.slice(1));});
window.addEventListener('beforeunload',event=>{
  const internalNavigation=workspaceNavigation.consume();
  if(!sample&&!resetting&&(fatalSaveError||storage?.status().dirty)){event.preventDefault();event.returnValue='';}
});
// A back/forward cache entry must never restore an already-unlocked financial screen.
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
try{vault=await createLocalVault();await showGate();try{if(sessionStorage.getItem('finance_ui_start_error')){sessionStorage.removeItem('finance_ui_start_error');$('gateMessage').textContent='Finance could not open. The page has reset; your saved encrypted records are unchanged. Try again. If this keeps happening, keep a copy of your backup.';}}catch{}}catch(error){$('gateTitle').textContent='Private storage is unavailable.';$('gateDescription').textContent=error.message;$('gateMessage').textContent='You can still explore the separate sample workspace, or restore an encrypted backup below.';}
installWorkspaceBackup({flush:async()=>{
  if(starting||previousSaving||resetting)throw Error('Finance is still opening or saving. Please wait, then try again.');
  if(fatalSaveError)throw fatalSaveError;
  if(!sample&&storage)await storage.flush();
},recoverFinance:async()=>{
  if(sample||!storage)throw Error('Unlock your saved Finance workspace before rescuing unsaved Finance edits.');
  await saveFinanceBackup(true);return $('backupStatus').textContent;
}});
window.addEventListener('wwhs:workspace-restored',()=>{resetting=true;storage?.close({discardUnsaved:true});vault?.lock();});
if(location.hash==='#import-backup')window.WWHS_BACKUPS.open('open');
if(vault)await refreshPreviousBackup();
