import {validateBudgetPlan, upcomingPlan} from './budget-plan.mjs?v=plain-language-1';

const PLAN_KEY='finance_studio_budget_plan_v1';
const money=value=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(value);
const dateLabel=value=>new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z'));
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const typeLabels={'direct-bill':'Direct payment','to-holding':'To holding','from-holding':'From holding','to-offset':'To offset','to-savings':'To savings','to-car-rego':'To car / rego'};

// Imported text is always inserted as text, never as HTML.
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
function button(text,id,cls='btn btn-secondary'){const node=el('button',text,cls);node.type='button';if(id)node.id=id;return node;}
function labelled(text,input){const label=el('label');label.append(el('span',text),input);return label;}
function checkbox(text,id){const input=el('input');input.type='checkbox';if(id)input.id=id;const label=el('label',undefined,'plan-check');label.append(input,el('span',text));return {input,label};}
function table(headings,rows){const wrap=el('div',undefined,'table-wrap');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',headings.join(', '));const grid=el('table',undefined,'data-table plan-table');const head=el('tr');headings.forEach(t=>{const cell=el('th',t);cell.scope='col';head.append(cell);});const thead=el('thead');thead.append(head);const body=el('tbody');for(const cells of rows){const row=el('tr');for(const value of cells){const cell=el('td');cell.append(value instanceof Node?value:document.createTextNode(String(value)));row.append(cell);}body.append(row);}grid.append(thead,body);wrap.append(grid);return wrap;}
function details(title,body){const node=el('details',undefined,'plan-details');node.append(el('summary',title),body);return node;}

export function setupBudgetPlanUi({engine,storage,sample=false}){
  const host=document.getElementById('budgetPlanPanel');
  const header=el('div',undefined,'card-header'),heading=el('div');
  heading.append(el('p','YOUR PAYMENT PLAN','eyebrow'),el('h2','Bills and set-asides'),el('p','See regular payments and transfers between your accounts.','helper'));
  const open=button('Import budget plan','importBudgetPlan','btn btn-primary');open.disabled=sample;
  header.append(heading,open);
  const input=el('input');input.type='file';input.accept='.json,application/json';input.id='budgetPlanFile';input.hidden=true;input.disabled=sample;
  const status=el('p',undefined,'helper plan-status');status.id='budgetPlanStatus';status.setAttribute('role','status');
  const content=el('div');content.id='budgetPlanContent';host.append(header,input,status,content);
  const dialog=el('dialog',undefined,'plan-dialog');dialog.id='budgetPlanDialog';dialog.setAttribute('aria-labelledby','budgetPlanReviewTitle');document.body.append(dialog);
  let savedPlan=null,loadError='',candidate=null,selected=[],saving=false;
  let asOf=today(),days=30;

  function loadSaved(){
    savedPlan=null;loadError='';
    try{const raw=storage.getItem(PLAN_KEY);if(raw&&raw!=='null')savedPlan=validateBudgetPlan(JSON.parse(raw));}
    catch(error){loadError='The saved payment plan could not be read. Save an encrypted backup before replacing it. '+error.message;}
  }
  function refresh(){loadSaved();renderSaved();}
  function renderSaved(){
    content.replaceChildren();
    if(loadError)content.append(el('p',loadError,'plan-warning'));
    if(!savedPlan){content.append(el('p',sample?'Budget-plan imports are available in your private workspace. Leave the sample to use your own records.':'Import a budget-plan file to review annual targets and scheduled payments. Import statements separately.','helper'));return;}
    content.append(el('p',savedPlan.title,'plan-title'),el('p',`Source information: ${dateLabel(savedPlan.sourceAsOf)} · Budget year: ${dateLabel(savedPlan.financialYearStart)} to ${dateLabel(savedPlan.financialYearEnd)}`,'helper'));
    content.append(el('p','This plan is incomplete and needs checking. Scheduled payments do not show what has been paid or what money is available. Check account matches and opening amounts set aside.','plan-warning'));
    const controls=el('div',undefined,'plan-controls'),date=el('input');date.type='date';date.id='planAsOf';date.value=asOf;date.className='control';
    const windowSelect=el('select');windowSelect.id='planDays';windowSelect.className='control';for(const n of [30,60,90]){const option=el('option',`${n} days`);option.value=n;windowSelect.append(option);}windowSelect.value=String(days);
    controls.append(labelled('Starting from',date),labelled('Look ahead',windowSelect));content.append(controls);
    const forecast=el('div');forecast.id='planForecast';content.append(forecast);
    function forecastRows(){
      forecast.replaceChildren();
      try{
        const result=upcomingPlan(savedPlan,asOf,days);
        const cards=el('div',undefined,'plan-totals');
        for(const [label,amount,note] of [
          ['Direct payments',result.totals.directPayments,'Scheduled to providers'],
          ['Transfers out',result.totals.transfersOut,'Holding, offset, savings and car / rego'],
          ['Transfers back',result.totals.transfersBack,'From holding — not income'],
        ]){const card=el('div',undefined,'plan-total');card.append(el('span',label),el('strong',money(amount)),el('small',note));cards.append(card);}
        forecast.append(cards,el('p',`${dateLabel(result.asOf)} to ${dateLabel(result.throughDate)} · Transfers are separate from spending. These are register dates; bill due dates may differ.`, 'helper'));
        if(result.occurrences.length)forecast.append(table(['Scheduled date','Payment / purpose','Movement','From → to','Amount'],result.occurrences.map(row=>[dateLabel(row.date),row.title,typeLabels[row.type],`${row.from} → ${row.to}`,money(row.amount)])));
        else forecast.append(el('p','No payments or transfers are scheduled in these dates.','helper'));
        const assumptions=el('div');result.assumptions.forEach(note=>assumptions.append(el('p',note,'helper')));forecast.append(details('How these dates are calculated',assumptions));
      }catch(error){forecast.append(el('p',error.message,'plan-warning'));}
    }
    date.addEventListener('change',()=>{asOf=date.value;forecastRows();});windowSelect.addEventListener('change',()=>{days=Number(windowSelect.value);forecastRows();});forecastRows();
    const scheduleList=table(['Instruction','Movement','From → to','Amount / frequency','Starts','Ends'],savedPlan.schedules.map(row=>[row.title,typeLabels[row.type],`${row.from} → ${row.to}`,`${money(row.amount)} / ${row.frequency}`,dateLabel(row.startDate),row.endDate?dateLabel(row.endDate):'Ongoing']));
    content.append(details(`All ${savedPlan.schedules.length} scheduled payments and transfers`,scheduleList));
    const notes=el('div');notes.append(el('p',`Accounts still to match: ${savedPlan.accountMappings.map(row=>row.label).join(', ')||'None supplied'}.`,'helper'));
    savedPlan.notes.forEach(note=>notes.append(el('p',note,'helper')));savedPlan.sources.forEach(source=>notes.append(el('p',`${source.kind}: ${source.name}`,'helper')));
    content.append(details('Sources and items to review',notes));
  }
  function closeReview(){if(saving)return;dialog.close();candidate=null;selected=[];dialog.replaceChildren();}
  dialog.addEventListener('cancel',event=>{if(saving){event.preventDefault();return;}candidate=null;selected=[];dialog.replaceChildren();});
  open.addEventListener('click',()=>{input.value='';input.click();});
  input.addEventListener('change',async()=>{
    status.textContent='';const file=input.files[0];if(!file||sample)return;
    try{if(file.size>2*1024*1024)throw new Error('Choose a budget-plan file smaller than 2 MB.');candidate=validateBudgetPlan(JSON.parse(await file.text()));loadSaved();renderReview();dialog.showModal();}
    catch(error){candidate=null;status.textContent='Plan not imported. '+error.message;}
    finally{input.value='';}
  });
  function renderReview(){
    dialog.replaceChildren();selected=[];
    const reviewHeading=el('h2','Review your budget setup');reviewHeading.id='budgetPlanReviewTitle';
    const close=button('Cancel','cancelBudgetPlan');close.addEventListener('click',closeReview);
    const top=el('div',undefined,'card-header');top.append(reviewHeading,close);dialog.append(top,el('p',candidate.title,'plan-title'));
    dialog.append(el('p',`Source information: ${dateLabel(candidate.sourceAsOf)} · ${dateLabel(candidate.financialYearStart)} to ${dateLabel(candidate.financialYearEnd)}`,'helper'));
    dialog.append(el('p','Choose the annual targets to use; none are selected yet. This is a partial budget, so check income, everyday costs and other bills separately. Your statements and other saved records stay unchanged.','plan-warning'));
    const sourceNotes=el('div');candidate.notes.forEach(note=>sourceNotes.append(el('p',note,'helper')));candidate.sources.forEach(source=>sourceNotes.append(el('p',`${source.kind}: ${source.name}`,'helper')));dialog.append(details('Read source notes and assumptions',sourceNotes));
    const update=()=>{error.hidden=true;updatePreview();};
    function selectionRows(lines,isReference=false){
      return table(['Use','Budget target','Annual amount ($)','Basis and review notes'],lines.map(line=>{
        const choice=el('input');choice.type='checkbox';choice.className='plan-line-select';choice.setAttribute('aria-label',`Use ${line.category}: ${line.item}${isReference?' historical estimate':''}`);
        const amount=el('input');amount.type='number';amount.min='0';amount.max='100000000';amount.step='0.01';amount.value=String(line.annual_budget);amount.className='control plan-amount';amount.setAttribute('aria-label',`Annual amount for ${line.category}: ${line.item}${isReference?' historical estimate':''}`);
        const unsupported=line.basis==='unsupported-fallback';choice.disabled=unsupported;amount.disabled=unsupported;
        const note=el('div');note.append(el('strong',unsupported?'No supporting source · cannot import':isReference?'Older estimate · check before use':'Suggested from payment register'),el('p',line.notes,'helper'));
        selected.push({choice,amount,line});
        choice.addEventListener('change',()=>{reviewed.input.checked=false;replace.input.checked=false;update();});
        amount.addEventListener('input',()=>{reviewed.input.checked=false;update();});
        return [choice,`${line.category} / ${line.item}`,amount,note];
      }));
    }
    dialog.append(el('h3','Proposed annual targets'),selectionRows(candidate.budgetLines));
    if(candidate.referenceBudget.length){const historical=el('div');historical.append(el('p','These old-app estimates are not a confirmed current budget. Check each amount before selecting it. For each item, choose either the suggested target or the older estimate.','helper'),selectionRows(candidate.referenceBudget,true));dialog.append(details(`${candidate.referenceBudget.length} older estimates`,historical));}
    dialog.append(el('p',`${candidate.schedules.length} scheduled payments and transfers will be saved separately. Each starts on its start date and includes its end date. None is marked as paid or funded.`, 'helper'));
    const mode=el('select');mode.id='budgetPlanMode';mode.className='control';for(const [value,label] of [['merge','Keep other budget targets'],['replace','Replace the entire budget']]){const option=el('option',label);option.value=value;mode.append(option);}mode.addEventListener('change',()=>{replace.input.checked=false;updatePreview();});dialog.append(labelled('How to apply selected targets',mode));
    const reviewed=checkbox('I have checked the selected annual amounts.','budgetAmountsReviewed');reviewed.input.addEventListener('change',update);
    const replace=checkbox('Replace all existing budget targets with just my selected lines.','budgetReplaceConfirmed');replace.input.addEventListener('change',update);
    const replacesPlan=!!savedPlan||!!loadError;
    const planReplace=checkbox('Replace the saved payment schedule with this file.','budgetScheduleReplaceConfirmed');planReplace.label.hidden=!replacesPlan;planReplace.input.addEventListener('change',update);
    dialog.append(reviewed.label,replace.label,planReplace.label);
    const preview=el('p',undefined,'plan-preview');preview.id='budgetImportPreview';preview.setAttribute('role','status');dialog.append(preview);
    const submit=button('Save schedules only','saveBudgetPlan','btn btn-primary'),error=el('p',undefined,'plan-warning');error.id='budgetImportError';error.hidden=true;error.setAttribute('role','alert');
    const footer=el('div',undefined,'plan-review-footer');footer.append(submit);dialog.append(error,footer);
    const getLines=()=>selected.filter(row=>row.choice.checked&&!row.choice.disabled).map(({line,amount})=>{if(amount.value.trim()===''||!amount.checkValidity())throw new Error('Enter a valid annual amount for each selected target.');return {...line,annual_budget:Number(amount.value)};});
    function updatePreview(){
      replace.label.hidden=mode.value!=='replace';
      const count=selected.filter(row=>row.choice.checked&&!row.choice.disabled).length;reviewed.label.hidden=!count;submit.textContent=count?'Save selected targets and schedules':'Save schedules only';
      try{const result=engine.previewBudgetImport(getLines(),{mode:mode.value});
        preview.textContent=`${count} targets selected · ${result.replacedCount} existing targets ${mode.value==='replace'?'removed':'updated'} · ${result.preservedCount} kept. ${result.warnings.join(' ')}`;
        submit.disabled=saving||(count>0&&!reviewed.input.checked)||(mode.value==='replace'&&!replace.input.checked)||(replacesPlan&&!planReplace.input.checked);
      }catch(err){preview.textContent=err.message;submit.disabled=true;}
    }
    submit.addEventListener('click',async()=>{
      if(submit.disabled||saving)return;
      saving=true;submit.disabled=true;close.disabled=true;error.hidden=true;
      // Freeze the reviewed controls until the encrypted save has finished.
      const controls=[...dialog.querySelectorAll('input,select')],disabled=controls.map(node=>node.disabled);controls.forEach(node=>node.disabled=true);
      try{
        const lines=selected.filter(row=>row.choice.checked&&row.line.basis!=='unsupported-fallback').map(({line,amount})=>({...line,annual_budget:Number(amount.value)}));
        engine.importBudgetOnly(lines,{mode:mode.value,planKey:PLAN_KEY,planValue:candidate});
        engine.BudgetController.render();refresh();await storage.flush();
        status.textContent=lines.length?`Saved ${lines.length} reviewed budget targets and the payment schedule in this browser.`:'Payment schedule saved. Your budget targets are unchanged.';
        saving=false;closeReview();
      }catch(err){error.hidden=false;error.textContent='The import could not finish saving. '+err.message+' Check the save status above before trying again.';}
      finally{saving=false;close.disabled=false;controls.forEach((node,index)=>node.disabled=disabled[index]);if(dialog.open)updatePreview();}
    });
    updatePreview();
  }
  refresh();return {refresh};
}
