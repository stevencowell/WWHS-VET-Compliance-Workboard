// Local text processing only. No network requests or embedded personal records.
import {normaliseTaskHelpContext} from '../../assets/js/task-help.mjs?v=plain-language-1';
export const INBOX_KEY = 'morning-launchpad-summary:v1';
export const LEGACY_PLAN_KEY = 'morning-launchpad-routine:v1';
export const LIMIT = 1000000;
export const SOURCE_LIMIT = 200000;
export const SOURCE_SUMMARY_LIMIT = 4000;
export const WORKSTREAMS = {personal:'Head Teacher',vet:'VET',tas:'TAS'};

export function mergeWorkboardImports(current=[],incoming=[]) {
  for(const entries of [current,incoming])if(!Array.isArray(entries)||entries.length>2000||entries.some(value=>typeof value!=='string'||value.length>2004||!/^(?:vet|tas):[\s\S]+$/.test(value)||!value.slice(4).trim()))throw new Error('The history of imported workboard tasks could not be read.');
  const merged=[...new Set([...current,...incoming])];
  if(merged.length>2000)throw new Error('The history of imported workboard tasks is full. Save a backup before continuing.');
  return merged;
}

export function isUnfinishedEmailNote(item) {
  const note=enrich(item);
  // Classification and native origin both protect workboard cards, including
  // cards someone has moved into Personal. Manual/reference notes stay too.
  return note.workstream==='personal'&&!note.personal&&!note.origin&&!note.forecast&&!note.taskKey.startsWith('workboard:')&&
    ['review','added','superseded'].includes(note.status)&&!['done','notes'].includes(taskSection(note))&&
    !['done','dismissed','note'].includes(note.previousStatus);
}

export function clearEmailImports(inbox) {
  const items=inbox.items.filter(item=>!isUnfinishedEmailNote(item));
  if(items.length===inbox.items.length)return inbox;
  const next={...inbox,items,briefing:'',importedAt:null,pinWorkflowVersion:1};
  delete next.reviewDate;delete next.generatedAt;
  return next;
}

export function normaliseForecastContext(input) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('The saved schedule details could not be read.');
  const context={wing:input.wing,date:input.date,role:input.role??'',roleLabel:input.roleLabel??'',year:String(input.year??''),sourceYear:String(input.sourceYear??''),sourceAsAt:input.sourceAsAt??'',horizonDays:input.horizonDays,mode:input.mode,title:input.title??'',note:input.note??''};
  if(!['vet','tas'].includes(context.wing)||!context.date||!validDate(context.date)||!['current','reference-only','unavailable'].includes(context.mode)||!Number.isInteger(context.horizonDays)||context.horizonDays<1||context.horizonDays>366||
    !/^\d{4}$/.test(context.year)||!/^\d{4}$|^$/.test(context.sourceYear)||
    ['role','roleLabel','sourceAsAt','title','note'].some(key=>typeof context[key]!=='string'||context[key].length>(key==='note'?2000:300)))throw new Error('The saved schedule details could not be read.');
  return context;
}

function normaliseForecast(input,context,{managed=false,active=true}={}) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('The saved task schedule could not be read.');
  const result={version:1,managed,active,section:input.section,kind:input.kind??'scheduled',reason:input.reason??'Scheduled by your workboard',
    scheduledDate:input.scheduledDate??null,windowStart:input.windowStart??null,windowEnd:input.windowEnd??null,period:input.period??'',
    sourceStatus:input.sourceStatus??'review',blocked:input.blocked??false,blockerReason:input.blockerReason??'',asOf:context.date,
    role:context.role,roleLabel:context.roleLabel,year:context.year,sourceYear:context.sourceYear,horizonDays:context.horizonDays};
  if(!validForecast(result))throw new Error('The saved task schedule could not be read.');
  return result;
}

export function validForecast(value) {
  return value===null||!!(value&&typeof value==='object'&&!Array.isArray(value)&&value.version===1&&typeof value.managed==='boolean'&&typeof value.active==='boolean'&&
    ['ready','upcoming','waiting'].includes(value.section)&&typeof value.blocked==='boolean'&&value.asOf&&validDate(value.asOf)&&
    ['scheduledDate','windowStart','windowEnd'].every(key=>validDate(value[key]))&&
    (!value.windowStart||!value.windowEnd||value.windowStart<=value.windowEnd)&&
    ['kind','reason','period','sourceStatus','blockerReason','role','roleLabel','year','sourceYear'].every(key=>typeof value[key]==='string'&&value[key].length<=(['reason','blockerReason'].includes(key)?2000:300))&&
    /^\d{4}$/.test(value.year)&&/^\d{4}$|^$/.test(value.sourceYear)&&Number.isInteger(value.horizonDays)&&value.horizonDays>=1&&value.horizonDays<=366);
}

export function hasPersonalWork(item) {
  return !item.forecast?.managed||item.progressOverride||item.dirty.length>0||!!item.lastActionOn||!!item.pinnedDate;
}

export function sourceCompleted(item) {
  return !!item.forecast&&!item.progressOverride&&['done','completed','completed-externally','verified','not-applicable'].includes(item.forecast.sourceStatus);
}

// Forecasts refresh machine metadata only. Reviewed work and native checklists
// stay owned by their original records; deliberate card deletion is remembered.
export async function reconcileForecast(inbox,{entries=[],resolved=[],context:input}) {
  const context=normaliseForecastContext(input);
  if(context.mode!=='current')return {inbox,context,changed:false,skipped:true,added:0,updated:0,retired:0,suppressed:0};
  if(!Array.isArray(entries)||!Array.isArray(resolved)||entries.length>300||resolved.length>300)throw new Error('The workboard schedule has too many tasks.');
  const identity=descriptor=>`${descriptor.wing}:${descriptor.recordKey}`;
  const scheduled=new Map(),sources=new Map();
  for(const descriptor of [...resolved,...entries]){
    if(descriptor?.wing!==context.wing||!validWorkOrigin({wing:descriptor.wing,taskId:descriptor.taskId,recordKey:descriptor.recordKey,route:descriptor.route,cycle:String(descriptor.cycle??'')}))throw new Error('A scheduled task could not be identified. Open the original workboard and try again.');
    sources.set(identity(descriptor),descriptor);
  }
  for(const descriptor of entries){if(scheduled.has(identity(descriptor)))throw new Error('The same task appears twice in the workboard schedule.');scheduled.set(identity(descriptor),descriptor);}
  let added=0,updated=0,retired=0,suppressed=0;
  let imports=mergeWorkboardImports(inbox.workboardImports);
  const seen=new Set();
  const items=inbox.items.map(original=>{
    if(original.origin?.wing!==context.wing)return original;
    const key=identity(original.origin),scheduledEntry=scheduled.get(key),source=sources.get(key);seen.add(key);
    if(!scheduledEntry&&!original.forecast){
      if(source?.taskHelp&&JSON.stringify(source.taskHelp)!==JSON.stringify(original.taskHelp)){updated++;return {...original,taskHelp:normaliseTaskHelpContext(source.taskHelp)};}
      return original;
    }
    const sourceStatus=source?.forecast?.sourceStatus??source?.sourceStatus??source?.status??original.forecast?.sourceStatus??'review';
    let forecast;
    if(scheduledEntry){
      imports=mergeWorkboardImports(imports,[key]);
      forecast=normaliseForecast({...scheduledEntry.forecast,sourceStatus},context,{managed:original.forecast?.managed||false,active:true});
    }else{
      const previous=original.forecast;
      const blocked=source?.forecast?.blocked??(['waiting','blocked'].includes(sourceStatus)?true:source?false:previous.blocked);
      forecast=normaliseForecast({...previous,sourceStatus,blocked,blockerReason:source?.forecast?.blockerReason??(blocked?previous.blockerReason:''),
        reason:hasPersonalWork(original)?'Not in the current schedule. Your work and notes are kept here.':'No longer in the current schedule. Kept with your notes and history.'},context,{managed:previous.managed,active:false});
      if(previous.active)retired++;
    }
    const refreshed={...original,forecast,taskHelp:source?.taskHelp?normaliseTaskHelpContext(source.taskHelp):original.taskHelp};
    if(original.forecast?.managed&&source){
      for(const field of ['title','action','dueDate','waitingOn']){
        if(original.dirty.includes(field)||!Object.hasOwn(source,field))continue;
        const value=field==='dueDate'?(source[field]&&validDate(source[field])?source[field]:null):String(source[field]??'').trim();
        if(['title','action'].includes(field)&&!value)continue;
        refreshed[field]=value;
      }
    }
    if(JSON.stringify(refreshed)===JSON.stringify(original))return original;
    updated++;return refreshed;
  });
  for(const[key,descriptor]of scheduled){
    if(seen.has(key))continue;
    if(imports.includes(key)){suppressed++;continue;}
    const candidate=await createTrackedWork(descriptor);
    candidate.status='review';candidate.group='ready';
    candidate.forecast=normaliseForecast({...descriptor.forecast,sourceStatus:descriptor.forecast?.sourceStatus??descriptor.sourceStatus??descriptor.status??'review'},context,{managed:true,active:true});
    items.push(candidate);imports=mergeWorkboardImports(imports,[key]);added++;
  }
  const next=validateInbox(JSON.stringify({...inbox,items,workboardImports:imports,forecastContexts:{...(inbox.forecastContexts||{}),[context.wing]:context}}));
  return {inbox:next,context,changed:JSON.stringify(next)!==JSON.stringify(inbox),skipped:false,added,updated,retired,suppressed};
}

export function validWorkOrigin(origin) {
  return origin === null || !!(origin && typeof origin === 'object' && !Array.isArray(origin) &&
    ['vet','tas'].includes(origin.wing) &&
    ['taskId','recordKey','route','cycle'].every(key=>typeof origin[key] === 'string') &&
    origin.taskId.trim() && origin.taskId.length<=300 && origin.recordKey.trim() && origin.recordKey.length<=2000 &&
    /^#[^\s\u0000-\u001f]*$/.test(origin.route) && origin.route.length<=2000 && origin.cycle.length<=100);
}

export async function workboardTaskKey(wing,recordKey) {
  if(!['vet','tas'].includes(wing)||typeof recordKey!=='string'||!recordKey.trim()||recordKey.length>2000)throw new Error('This workboard task could not be identified. Open the original task and try again.');
  const prefix=`workboard:${wing}:`;
  if(prefix.length+recordKey.length<=150&&!recordKey.startsWith('sha256:'))return prefix+recordKey;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(recordKey));
  return prefix+'sha256:'+Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}

// A linked task is a personal work queue entry, never a verification record.
export async function createTrackedWork(descriptor) {
  const {wing,taskId,recordKey,route}=descriptor;
  const origin={wing,taskId,recordKey,route,cycle:String(descriptor.cycle??'')};
  if(!validWorkOrigin(origin))throw new Error('The link to the original workboard task could not be read.');
  const title=String(descriptor.title||'').trim();
  const action=String(descriptor.action||'Review the task and choose the next action.').trim();
  const noteText=String(descriptor.notes||'');
  const taskKey=await workboardTaskKey(wing,recordKey);
  const item=enrich({id:crypto.randomUUID(),taskKey,title,action,noteText,workstream:wing,origin,taskHelp:normaliseTaskHelpContext(descriptor.taskHelp??null),
    createdOn:todaySydney(),status:['done','completed','verified'].includes(descriptor.status)?'done':'review',
    group:['waiting','blocked'].includes(descriptor.status)?'waiting':'ready',
    waitingOn:String(descriptor.waitingOn||''),dueDate:descriptor.dueDate&&validDate(descriptor.dueDate)?descriptor.dueDate:null,
    reason:`From your ${WORKSTREAMS[wing]} workboard`});
  return validateInbox(JSON.stringify({version:2,items:[item]})).items[0];
}

export function safeUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? value : '';
  } catch { return ''; }
}

export function linksIn(text) {
  const links = [];
  for (const match of text.matchAll(/https:\/\/[^\s<>"\]]+/g)) {
    let url = match[0].replace(/[.,;]+$/, '');
    while (url.endsWith(')') && (url.match(/\)/g) || []).length > (url.match(/\(/g) || []).length) url = url.slice(0, -1);
    if (safeUrl(url) && !links.includes(url)) links.push(url);
  }
  return links.slice(0, 20);
}

export function workingNoteLinks(text) {
  const labels=new Map();
  for(const match of text.matchAll(/\[([^\]\n]+)\]\s*\((https:\/\/[^\s]+?)\)/g)) {
    const url=safeUrl(match[2]);if(url)labels.set(url,match[1]);
  }
  return linksIn(text).map(url=>({url,label:labels.get(url)||url}));
}

const cleanLine = line => line.trim().replace(/^#{1,6}\s+/, '').replace(/^\*\*(.*?)\*\*$/, '$1');
const isTitle = line => /^(?:Note\s*:\s*\S|Note Fw\S*\s*:|Fw(?:d)?\s*:)/i.test(line) && line.length < 300;
const sections = /^(?:[\p{Extended_Pictographic}\uFE0F\s]*)(?:Today[’']s Priority Actions|Time-Sensitive Items|Important but Not Urgent|Waiting On|Email Summaries|Follow-Up Tasks and Priorities|Attachments and Links|Items That Can Be Ignored|Assistant Notes|Note Cleanup Suggestions|Tasks ChatGPT Can Help With Now)/u;

function classify(title, action, context, section = '') {
  if (/waiting on/i.test(section) || /^(?:await|waiting\b)/i.test(action)) return {group: 'waiting', score: -10, reason: 'Waiting on someone else'};
  if (/ignore|cleanup/i.test(section)) return {group: 'later', score: -20, reason: 'Reference or cleanup'};
  if (/today.*priority/i.test(section)) return {group: 'ready', score: 100, reason: 'Listed in your summary’s priorities'};
  if (/important but not urgent/i.test(section)) return {group: 'later', score: 10, reason: 'Listed for later in your summary'};
  if (/\basap\b|\boverdue\b|\burgent\b|\btoday\b|N Warning|assessment schedule/i.test(action + ' ' + title)) return {group: 'ready', score: 70, reason: 'Time-sensitive wording — confirm it is still outstanding'};
  if (/outgoing.*student|transcript|certificate/i.test(action + ' ' + title)) return {group: 'ready', score: 60, reason: 'Student follow-up'};
  if (/mandatory|timesheet|casual.*schedule/i.test(title + ' ' + action)) return {group: 'ready', score: 45, reason: 'Check completion status before acting'};
  return {group: 'ready', score: 30, reason: 'Action to review'};
}

function makeCandidate(title, action, source, section, index) {
  if (source.length > SOURCE_LIMIT) throw new Error('This source is too long (maximum 200,000 characters). Import it separately; no text has been cut off.');
  action = action.replace(/^\d+[.)]\s*/, '').trim();
  const originalLinks = linksIn(source);
  // Keep the links alongside the action instead of a wall of URLs in its title.
  action = action.replace(/\[([^\]]+)\]\(https:\/\/[^\s]+\)/g, '$1').replace(/https:\/\/\S+/g, '').trim();
  const classification = classify(title, action, source, section);
  return {
    id: `candidate-${index}`, title, action: action.slice(0, 800), source,
    links: originalLinks, url: originalLinks[0] || '', ...classification,
    selected: false, status: 'review',
  };
}

export function parseSummary(input) {
  if (typeof input !== 'string' || !input.trim()) throw new Error('Paste a summary or choose a notes file first.');
  if (input.length > LIMIT) throw new Error('That summary is too large. Import a smaller notebook or summary.');
  const lines = input.replace(/\r\n?/g, '\n').split('\n').map(cleanLine);
  const candidates = [];
  let section = '', index = 0;
  // Ignore an embedded master prompt, including its example actions.
  const lastRules = lines.findIndex(line => /^Final rules$/i.test(line));
  const start = lastRules >= 0 ? lastRules + 1 : 0;
  let firstRaw = -1;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (sections.test(line)) section = line;
    if (isTitle(line)) { if (firstRaw < 0) firstRaw = i; continue; }
    const match = line.match(/(?:^|\s)\d+[.)]\s*\[([^\]]+)\]\s*[—–-]\s*(.+)$/);
    if (match && !/cleanup|ChatGPT Can Help|ignore/i.test(section)) candidates.push(makeCandidate(match[1], match[2], line, section, index++));
    else if (/waiting on/i.test(section)) {
      const waiting = line.match(/^(?:[-*]\s*)?\[([^\]]+)\]\s*[—–-]\s*(Waiting on .+)$/i);
      if (waiting) candidates.push(makeCandidate(waiting[1], waiting[2], line, section, index++));
    }
  }
  // Raw Evernote exports: preserve the title and first personal instruction.
  // Forwarded messages without an explicit action are review items, not invented tasks.
  if (!candidates.length && firstRaw >= 0) {
    const heads = [];
    for (let i = firstRaw; i < lines.length; i++) if (isTitle(lines[i])) heads.push(i);
    heads.forEach((head, pos) => {
      const title = lines[head];
      const body = lines.slice(head + 1, heads[pos + 1] ?? lines.length).join('\n').trim();
      const meaningful = body.split('\n').filter(line => line && !/^(?:&#|Regards|Sent from|From:|To:|Subject:|Date:|_{3,}|\\_|\*{3})/i.test(line));
      let action = 'Review this note and decide the next action';
      const first = meaningful[0] || '';
      if (/^Note\s*:/i.test(title) && first && !/^(?:Steve Cowell|Head Teacher|Scannable Document|Dear |Hi |\[External|You don't often)/i.test(first)) action = first;
      else {
        const request = body.split('\n').find(line => /^(?:Please (?:ask|ensure|review|check|give|read|confirm)|Could you please|Can we )/i.test(line));
        if (request) action = request;
      }
      const candidate = makeCandidate(title, action, body, '', index++);
      if (action.startsWith('Review this note')) { candidate.group = 'later'; candidate.reason = 'No clear next action found'; }
      if (/prices? for|quote/i.test(title) && /(?:To:.*@|Sent:)/i.test(body) && !/\bFrom: (?!Steve Cowell)/i.test(body)) {
        candidate.action = 'Confirm whether a reply has arrived before following up';
        candidate.group = 'waiting'; candidate.reason = 'Outgoing request — reply status unknown'; candidate.score = -10;
      }
      candidates.push(candidate);
    });
  }
  if (!candidates.length) throw new Error('No task titles found. Use “Note : Title”, “Fw: Title”, or “1. [Exact note title] — Action”.');
  const unique = new Map();
  for (const item of candidates) {
    const key = `${item.title}\n${item.action}`;
    const old = unique.get(key);
    if (!old || old.score < item.score) unique.set(key, item);
  }
  return [...unique.values()].sort((a, b) => b.score - a.score).slice(0, 150);
}

export function prepareTasks(day, candidates, createId = () => crypto.randomUUID()) {
  if (day.closed) throw new Error('Reopen today’s plan before adding priorities.');
  if (!Array.isArray(candidates) || !candidates.length || candidates.length > 3) throw new Error('Choose one to three priorities.');
  const additions = [];
  for (const item of candidates) {
    if (typeof item.title !== 'string' || typeof item.action !== 'string' || !item.title.trim() || !item.action.trim()) throw new Error('Each priority needs a note title and action.');
    const title = `[${item.title}] — ${item.action.trim()}`;
    if (title.length > 1200) throw new Error('Shorten the action before adding it to your plan.');
    if (item.url && !safeUrl(item.url)) throw new Error('Use a full https:// link.');
    if (day.tasks.some(task => matchesPlanTask(item,task)) || additions.some(task => task.title === title)) continue;
    additions.push({id: item.id ? `summary:${item.id}` : createId(), title, state: 'todo', ...(item.url ? {url: item.url} : {})});
  }
  const limit = day.capacity === 'small' ? 1 : 3;
  if (day.tasks.length + additions.length > limit) throw new Error(`There is room for ${Math.max(0, limit - day.tasks.length)} more ${limit === 1 ? 'priority on a small day' : 'priorities today'}. Keep the rest for later.`);
  return additions;
}

export const PRIORITIES = {
  '': 'Priority needs review', red: '🔴 Urgent / Important to me', blue: '🔵 Urgent / Important to others',
  green: '🟢 Not Urgent / Important to me', yellow: '🟡 Not Urgent / Important to others',
  orange: '🟠 Urgent / Not Important', purple: '🟣 Not Urgent / Not Important',
};
export const NEXT_ACTIONS = {'': 'Choose next step', do: '✅ Do Now', date: '⏰ Date', delegate: '👥 Delegate', delay: '⏸ Delay', delete: '🗑 Delete'};
export const EDITABLE = ['title','source','sourceSummary','noteHtml','noteText','action','url','originalEmailUrl','priority','nextAction','dueDate','eventDate','followUpDate','dateNote','owner','waitingOn','instruction','group','pinnedDate','sectionOverride','workstream'];
export function todaySydney() { return new Intl.DateTimeFormat('en-CA', {timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
export function validDate(value) {
  if (value === null || value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value+'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
export function enrich(item) {
  return {workstream:'personal',origin:null,forecast:null,taskHelp:null,progressOverride:false,sectionOverride:'',createdOn:null, lastActionOn:null, pinnedDate:null, personal:false, taskKey:'', priority:'', nextAction:'', dueDate:null, eventDate:null, followUpDate:null,
    noteHtml:'', noteText:'', dateNote:'', owner:'', waitingOn:'', instruction:'', help:'', relatedTitles:[], dependsOn:[], dirty:[], planAliases:[],
    reason:'Action to review', score:30, group:'ready', status:'review', selected:false, links:[], url:'', originalEmailUrl:'', source:'', sourceSummary:'', ...item};
}
export function validateInbox(raw) {
  if (raw === null) return {version:2, items:[], importedAt:null, briefing:'',workboardImports:[],forecastContexts:{}};
  if (typeof raw !== 'string' || raw.length > 8 * LIMIT) throw new Error('This task file is too large.');
  const value = JSON.parse(raw);
  if (![1,2].includes(value?.version) || !Array.isArray(value.items) || value.items.length > 300) throw new Error('This task list could not be read.');
  if (value.briefing !== undefined && (typeof value.briefing !== 'string' || value.briefing.length > 150000)) throw new Error('The email summary could not be read.');
  if (value.reviewDate !== undefined && !validDate(value.reviewDate)) throw new Error('The summary date could not be read.');
  const workboardImports=mergeWorkboardImports(value.workboardImports);
  if(value.forecastContexts!==undefined&&(!value.forecastContexts||typeof value.forecastContexts!=='object'||Array.isArray(value.forecastContexts)))throw new Error('The saved schedule details could not be read.');
  const forecastContexts={};
  for(const[wing,context]of Object.entries(value.forecastContexts||{})){if(!['vet','tas'].includes(wing)||context?.wing!==wing)throw new Error('The saved schedule details could not be read.');forecastContexts[wing]=normaliseForecastContext(context);}
  const items = value.items.map(enrich);
  for (const x of items) {
    x.taskHelp=normaliseTaskHelpContext(x.taskHelp);
    if(x.taskHelp&&(!x.origin||['wing','taskId','recordKey','cycle'].some(key=>x.taskHelp[key]!==x.origin[key])))throw new Error('AI help does not match its source task.');
    if (typeof x.id !== 'string' || !x.id.trim() || x.id.length > 150 || typeof x.title !== 'string' || !x.title.trim() || x.title.length > 300 ||
      typeof x.action !== 'string' || (!x.action.trim() && !(x.personal && ['note','done','dismissed'].includes(x.status))) || x.action.length > 800 || typeof x.source !== 'string' || x.source.length > SOURCE_LIMIT || typeof x.sourceSummary !== 'string' || x.sourceSummary.length > SOURCE_SUMMARY_LIMIT || typeof x.noteText !== 'string' || x.noteText.length > 200000 || typeof x.noteHtml !== 'string' || x.noteHtml.length > 1000000 ||
      typeof x.taskKey !== 'string' || x.taskKey.length > 150 || !Number.isFinite(x.score) || !Object.hasOwn(WORKSTREAMS,x.workstream) || !validWorkOrigin(x.origin) || !validForecast(x.forecast) || (x.forecast&&!x.origin) || typeof x.progressOverride!=='boolean' ||
      !Array.isArray(x.links) || x.links.length > 30 || x.links.some(url => !safeUrl(url)) || typeof x.url !== 'string' || x.url && !safeUrl(x.url) ||
      typeof x.originalEmailUrl !== 'string' || x.originalEmailUrl && !safeUrl(x.originalEmailUrl) ||
      !['','ready','upcoming','waiting','later','notes'].includes(x.sectionOverride) || !['ready','later','waiting'].includes(x.group) || !['review','added','done','dismissed','superseded','note'].includes(x.status) || typeof x.personal !== 'boolean' ||
      !Object.hasOwn(PRIORITIES,x.priority) || !Object.hasOwn(NEXT_ACTIONS,x.nextAction) ||
      ['createdOn','lastActionOn','dueDate','eventDate','followUpDate','pinnedDate'].some(key => !validDate(x[key])) ||
      ['dateNote','owner','waitingOn','instruction','help','reason'].some(key => typeof x[key] !== 'string' || x[key].length > 2000) ||
      !Array.isArray(x.relatedTitles) || x.relatedTitles.length > 10 || x.relatedTitles.some(t=>typeof t !== 'string' || t.length > 300) ||
      !Array.isArray(x.dependsOn) || x.dependsOn.length > 20 || x.dependsOn.some(t=>typeof t !== 'string' || !t || t.length > 150 || t === x.taskKey) ||
      !Array.isArray(x.planAliases) || x.planAliases.length > 300 || x.planAliases.some(a=>!a || typeof a.id !== 'string' || a.id.length>160 || typeof a.title !== 'string' || a.title.length>1200) ||
      !Array.isArray(x.dirty) || x.dirty.some(key => !EDITABLE.includes(key))) throw new Error('Check the details for this task: '+ (typeof x.title === 'string' ? x.title : 'untitled'));
  }
  if (new Set(items.map(x=>x.id)).size !== items.length) throw new Error('Two tasks use the same reference. Keep the file so it can be checked.');
  const keys=items.map(x=>x.taskKey).filter(Boolean);
  if (new Set(keys).size !== keys.length) throw new Error('Two tasks use the same matching reference. Keep the file so it can be checked.');
  return {...value, version:2, items,workboardImports,forecastContexts};
}
export function mergeInbox(existing, incoming) {
  const items = existing.map(x=>enrich({...x}));
  let added=0, updated=0, archived=0; const aliases=new Map();
  const rich = incoming.some(x=>x.taskKey);
  const titleIdentity=title=>title.normalize('NFC').replace(/\s+/g,' ').trim();
  const titles = new Set(incoming.flatMap(x=>[x.title,...(x.relatedTitles||[])]).map(titleIdentity));
  for (const input of incoming) {
    const next=enrich(input);
    const index=items.findIndex(old => old.personal===next.personal && (next.taskKey && old.taskKey === next.taskKey || sameSourceAction(old,next) || old.title === next.title && (!next.taskKey || !old.taskKey) && old.source === next.source));
    if (index >= 0) {
      const old=items[index];
      // Legacy imports retain their existing behaviour. Rich imports update only
      // fields the user has not edited, and never reset progress or local IDs.
      if (!next.taskKey) continue;
      const dirty=old.dirty.length ? old.dirty : !old.taskKey ? ['action','url','group'] : [];
      // Classification and source identity belong to the saved card. Older
      // exports and AI refreshes must never detach work from its native task.
      const merged={...old,...next,workstream:old.workstream,origin:old.origin||next.origin,forecast:old.forecast||next.forecast,taskHelp:old.taskHelp||(old.origin&&JSON.stringify(old.origin)!==JSON.stringify(next.origin)?null:next.taskHelp),progressOverride:old.progressOverride,taskKey:old.taskKey||next.taskKey,id:old.id,createdOn:old.createdOn||next.createdOn,lastActionOn:old.lastActionOn||next.lastActionOn,status:old.status,pinnedDate:old.pinnedDate,dirty,selected:false,planStamp:old.planStamp,planAliases:old.planAliases,preserveDoneOnce:old.preserveDoneOnce};
      // An older import may omit the summary or supply only an extract of the
      // saved email. Keep the fuller source and summary in that case.
      if (!next.sourceSummary.trim()) merged.sourceSummary=old.sourceSummary;
      if (!next.source.trim() || old.source.includes(next.source.trim())) merged.source=old.source;
      aliases.set(next.taskKey,merged.taskKey);
      for (const key of dirty) merged[key]=old[key];
      items[index]=merged; updated++;
    } else {
      if (items.length >= 300) throw new Error('The task list is full. Save a backup before removing old items.');
      items.push({...next,createdOn:next.createdOn||todaySydney(),id:crypto.randomUUID(),selected:false});added++;
    }
  }
  if (rich) for (const item of items) {
    if (!item.personal && !item.taskKey && titles.has(titleIdentity(item.title)) && item.status === 'review') { item.status='superseded';archived++; }
  }
  for(const item of items) item.dependsOn=item.dependsOn.map(key=>aliases.get(key)||key);
  const consolidated=consolidateDuplicates(items);
  return {items:consolidated.items,added,updated,archived:archived+consolidated.archived};
}
export function nextDate(item) { return [item.dueDate,item.followUpDate,item.eventDate,...(item.forecast?.active?[item.forecast.scheduledDate,item.forecast.windowStart]:[])].filter(Boolean).sort()[0] || ''; }
export function bucket(item, today=todaySydney()) {
  if(item.sectionOverride)return item.sectionOverride;
  if (item.dueDate && item.dueDate<=today) return 'ready';
  if (item.group === 'waiting') return item.followUpDate && item.followUpDate <= today ? 'ready' : 'waiting';
  if ([item.dueDate,item.followUpDate].some(date=>date && date<=today)) return 'ready';
  if (nextDate(item)) return 'upcoming';
  return item.group;
}
// One home per item; calendar dates remain independent of task sections.
export function taskSection(item,today=todaySydney()) {
  if (['done','superseded'].includes(item.status)) return item.status;
  if (item.status==='dismissed') return 'notes';
  if(sourceCompleted(item))return 'done';
  const forecast=item.forecast;
  const current=forecast?.asOf===today;
  if(item.sectionOverride==='notes'||item.status==='note')return 'notes';
  if(current&&(forecast.blocked||(forecast.active&&forecast.section==='waiting')))return 'waiting';
  if (item.sectionOverride) return item.sectionOverride==='later'?'upcoming':item.sectionOverride;
  if (item.status==='note' || (item.personal && !item.action)) return 'notes';
  if (isPinned(item,today)) return 'ready';
  if(current&&forecast.active)return forecast.section;
  if(forecast?.managed&&!hasPersonalWork(item))return 'notes';
  const section=bucket(item,today);
  return section==='later'?'upcoming':section;
}
export function rank(item,today=todaySydney()) {
  return item.score + (item.dueDate && item.dueDate<=today ? 1000 : 0) + (item.followUpDate && item.followUpDate<=today ? 500 : 0);
}
export function reconcilePlans(existing, days, today) {
  let changed=false;
  const entries=Object.entries(days || {}).sort(([a],[b])=>b.localeCompare(a));
  const items=existing.map(input=>{
    const item=enrich(input);
    if (['superseded','dismissed'].includes(item.status)) return item;
    let match;
    for (const [date,day] of entries) {
      const task=day.tasks.filter(t=>matchesPlanTask(item,t)).sort((a,b)=>(b.state==='done')-(a.state==='done'))[0];
      if(task) {match={date,task};break;}
    }
    if (!match) {
      if(item.status==='added') {changed=true;return {...item,status:'review',planStamp:''};}
      return item;
    }
    const {date,task}=match; const stamp=`${today}|${date}|${task.id}|${task.state}|${task.title}`;
    if (item.planStamp===stamp) return item;
    if(item.preserveDoneOnce&&item.status==='done'){changed=true;return {...item,planStamp:stamp,preserveDoneOnce:false};}
    const next={...item,planStamp:stamp,status:task.state==='done'?'done':date===today && task.state==='todo'?'added':'review'};
    if(task.state==='deferred') {next.group='later';next.dirty=[...new Set([...item.dirty,'group'])];}
    const prefix=`[${item.title}] — `;
    if(task.title.startsWith(prefix) && task.title.slice(prefix.length)!==item.action) {next.action=task.title.slice(prefix.length);next.dirty=[...new Set([...next.dirty,'action'])];}
    changed=true;return next;
  });
  return {items,changed};
}

const normalTitle = title => title.normalize('NFC').replace(/\s+/g,' ').trim();
const normalAction = action => action.replace(/\s+Link:\s*$/i,'').replace(/\s+/g,' ').trim();
function sourceTitles(item) {
  return [...new Set([item.title,...(item.relatedTitles||[])].flatMap(title=>title.split(/\s+\+\s+(?=(?:Note\s*:|Fw(?:d)?:|Note Fw))/i)).map(normalTitle))].sort();
}
export function sameSourceAction(a,b) {
  if(a.origin||b.origin)return !!(a.origin&&b.origin&&a.origin.wing===b.origin.wing&&a.origin.recordKey===b.origin.recordKey);
  if(normalAction(a.action)!==normalAction(b.action))return false;
  const aa=sourceTitles(a),bb=sourceTitles(b);
  return JSON.stringify(aa)===JSON.stringify(bb) || aa.length===1&&aa[0]===normalTitle(b.title) || bb.length===1&&bb[0]===normalTitle(a.title);
}
export function matchesPlanTask(item,task) {
  return task.id===`summary:${item.id}` || task.title===`[${item.title}] — ${item.action}` ||
    (item.planAliases||[]).some(alias=>task.id===alias.id||task.title===alias.title);
}
// Only combine a basic entry with one unambiguous structured task, using the
// same action and source titles. Different actions from one note stay separate.
export function consolidateDuplicates(existing) {
  const items=existing.map(x=>enrich({...x}));let archived=0;
  for(const plain of items){
    if(plain.personal||plain.taskKey||plain.status==='superseded')continue;
    const matches=items.filter(x=>!x.personal&&x.taskKey&&x.status!=='superseded'&&sameSourceAction(x,plain));
    if(matches.length!==1)continue;
    const target=matches[0];
    target.createdOn=[target.createdOn,plain.createdOn].filter(Boolean).sort()[0]||null;
    target.lastActionOn=[target.lastActionOn,plain.lastActionOn].filter(Boolean).sort().at(-1)||null;
    const mergedAliases=[...(target.planAliases||[]),...(plain.planAliases||[]),{id:`summary:${plain.id}`,title:`[${plain.title}] — ${plain.action}`}];
    target.planAliases=[...new Map(mergedAliases.map(x=>[x.id+'\n'+x.title,x])).values()];
    for(const key of plain.dirty)if(!target.dirty.includes(key)){target[key]=plain[key];target.dirty=[...target.dirty,key];}
    target.links=[...new Set([...target.links,...plain.links])].slice(0,30);
    if(plain.status==='done'){target.status='done';target.preserveDoneOnce=true;}
    else if(target.status==='review'&&['added','dismissed'].includes(plain.status))target.status=plain.status;
    plain.previousStatus=plain.status;plain.status='superseded';plain.duplicateOf=target.id;archived++;
  }
  return {items,archived,changed:archived>0};
}


export function isPinned(item,today=todaySydney()) {
  return ['review','added'].includes(item.status) && item.pinnedDate===today;
}
// The retired daily planner is read once. Its original storage is never changed.
export function migrateToPins(inbox,rawPlan,today=todaySydney()) {
  if(inbox.pinWorkflowVersion===1)return {inbox,changed:false,warning:''};
  let days={},warning='';
  try {
    if(rawPlan){
      const plan=JSON.parse(rawPlan);
      if(plan?.version!==1||!plan.days||typeof plan.days!=='object'||Array.isArray(plan.days))throw new Error();
      for(const[date,day]of Object.entries(plan.days)){
        if(!date||!validDate(date)||!day||!Array.isArray(day.tasks)||day.tasks.some(t=>!t||typeof t.id!=='string'||!t.id||typeof t.title!=='string'||!t.title.trim()||!['todo','done','deferred'].includes(t.state)))throw new Error();
      }
      days=plan.days;
    }
  }catch {warning='Older daily plans could not be read. Use Save older daily plans to keep a copy.';}
  const progress=reconcilePlans(inbox.items,days,today);
  const items=progress.items.map((item,i)=>{
    // A task marked done directly in the review list must remain done.
    if(inbox.items[i].status==='done'&&item.status!=='done')item=enrich(inbox.items[i]);
    return {...item,status:item.status==='added'?'review':item.status,pinnedDate:item.status==='added'?today:item.pinnedDate};
  });
  const seen=new Set();let skipped=0;
  for(const[date,day]of Object.entries(days).sort(([a],[b])=>b.localeCompare(a))){
    for(const task of day.tasks){
      const key=task.title.trim();if(seen.has(task.id)||seen.has('title:'+key))continue;seen.add(task.id);seen.add('title:'+key);
      if(items.some(item=>matchesPlanTask(item,task)))continue;
      if(items.length>=300){skipped++;continue;}
      const split=key.match(/^\[([^\]]+)\]\s*[—–-]\s*(.+)$/s);
      const id=crypto.randomUUID();
      items.push(enrich({id,taskKey:`personal:${id}`,personal:true,title:(split?.[1]||'My saved task').slice(0,300),action:(split?.[2]||key).slice(0,800),source:`Saved daily plan — ${date}\n${key}`,reason:'From your saved daily plan',url:safeUrl(task.url),links:safeUrl(task.url)?[task.url]:[],status:task.state==='done'?'done':'review',group:task.state==='deferred'?'later':'ready',pinnedDate:date===today&&task.state==='todo'?today:null,planAliases:[{id:task.id,title:task.title.slice(0,1200)}]}));
    }
  }
  if(skipped)warning=`${skipped} older tasks are still in your earlier plans because the task list is full. Use Save older daily plans to keep a copy.`;
  const consolidated=consolidateDuplicates(items);
  return {inbox:{...inbox,items:consolidated.items,pinWorkflowVersion:1},changed:true,warning};
}

// Reading a card and importing a refreshed summary are not user actions.
export function recordNoteAction(item, changes, day=todaySydney()) {
 const changed=Object.entries(changes).some(([key,value])=>item[key]!==value);
 return changed ? {...item,...changes,lastActionOn:day} : item;
}

// Search user-facing card content, never internal IDs or migration metadata.
export function matchesNoteSearch(item,query){
 const normal=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const terms=normal(query).trim().split(/\s+/).filter(Boolean);
 const fields=['title','action','noteText','source','sourceSummary','instruction','help','reason','owner','waitingOn','dateNote','dueDate','eventDate','followUpDate','url','originalEmailUrl'];
 const text=normal([...fields.map(key=>item[key]),...(item.links||[]),...(item.relatedTitles||[]),PRIORITIES[item.priority],NEXT_ACTIONS[item.nextAction],...(item.noteHtml||'').matchAll(/href=["']([^"']+)["']/g)].map(value=>Array.isArray(value)?value[1]:value).join(' '));
 return terms.every(term=>text.includes(term));
}
