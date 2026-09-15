// Local text processing only. No network requests or embedded personal records.
export const INBOX_KEY = 'morning-launchpad-summary:v1';
export const LIMIT = 1000000;

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
  action = action.replace(/^\d+[.)]\s*/, '').trim();
  const originalLinks = linksIn(source);
  // Keep the links alongside the action instead of a wall of URLs in its title.
  action = action.replace(/\[([^\]]+)\]\(https:\/\/[^\s]+\)/g, '$1').replace(/https:\/\/\S+/g, '').trim();
  const classification = classify(title, action, source, section);
  return {
    id: `candidate-${index}`, title, action: action.slice(0, 800), source: source.slice(0, 20000),
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
export const EDITABLE = ['title','source','action','url','priority','nextAction','dueDate','eventDate','followUpDate','dateNote','owner','waitingOn','instruction','group'];
export function todaySydney() { return new Intl.DateTimeFormat('en-CA', {timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
export function validDate(value) {
  if (value === null || value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value+'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
export function enrich(item) {
  return {personal:false, taskKey:'', priority:'', nextAction:'', dueDate:null, eventDate:null, followUpDate:null,
    dateNote:'', owner:'', waitingOn:'', instruction:'', help:'', relatedTitles:[], dependsOn:[], dirty:[], planAliases:[],
    reason:'Action to review', score:30, group:'ready', status:'review', selected:false, links:[], url:'', source:'', ...item};
}
export function validateInbox(raw) {
  if (raw === null) return {version:2, items:[], importedAt:null, briefing:''};
  if (typeof raw !== 'string' || raw.length > 8 * LIMIT) throw new Error('Review file is too large');
  const value = JSON.parse(raw);
  if (![1,2].includes(value?.version) || !Array.isArray(value.items) || value.items.length > 300) throw new Error('Invalid review list');
  if (value.briefing !== undefined && (typeof value.briefing !== 'string' || value.briefing.length > 150000)) throw new Error('Invalid briefing');
  if (value.reviewDate !== undefined && !validDate(value.reviewDate)) throw new Error('Invalid review date');
  const items = value.items.map(enrich);
  for (const x of items) {
    if (typeof x.id !== 'string' || !x.id.trim() || x.id.length > 150 || typeof x.title !== 'string' || !x.title.trim() || x.title.length > 300 ||
      typeof x.action !== 'string' || (!x.action.trim() && !(x.personal && x.status==='note')) || x.action.length > 800 || typeof x.source !== 'string' || x.source.length > 20000 ||
      typeof x.taskKey !== 'string' || x.taskKey.length > 150 || !Number.isFinite(x.score) ||
      !Array.isArray(x.links) || x.links.length > 30 || x.links.some(url => !safeUrl(url)) || typeof x.url !== 'string' || x.url && !safeUrl(x.url) ||
      !['ready','later','waiting'].includes(x.group) || !['review','added','done','dismissed','superseded','note'].includes(x.status) || typeof x.personal !== 'boolean' ||
      !Object.hasOwn(PRIORITIES,x.priority) || !Object.hasOwn(NEXT_ACTIONS,x.nextAction) ||
      ['dueDate','eventDate','followUpDate'].some(key => !validDate(x[key])) ||
      ['dateNote','owner','waitingOn','instruction','help','reason'].some(key => typeof x[key] !== 'string' || x[key].length > 2000) ||
      !Array.isArray(x.relatedTitles) || x.relatedTitles.length > 10 || x.relatedTitles.some(t=>typeof t !== 'string' || t.length > 300) ||
      !Array.isArray(x.dependsOn) || x.dependsOn.length > 20 || x.dependsOn.some(t=>typeof t !== 'string' || !t || t.length > 150 || t === x.taskKey) ||
      !Array.isArray(x.planAliases) || x.planAliases.length > 300 || x.planAliases.some(a=>!a || typeof a.id !== 'string' || a.id.length>160 || typeof a.title !== 'string' || a.title.length>1200) ||
      !Array.isArray(x.dirty) || x.dirty.some(key => !EDITABLE.includes(key))) throw new Error('Invalid task fields: '+ (typeof x.title === 'string' ? x.title : 'untitled'));
  }
  if (new Set(items.map(x=>x.id)).size !== items.length) throw new Error('Duplicate task IDs');
  const keys=items.map(x=>x.taskKey).filter(Boolean);
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate task keys');
  return {...value, version:2, items};
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
      const merged={...old,...next,taskKey:old.taskKey||next.taskKey,id:old.id,status:old.status,dirty,selected:false,planStamp:old.planStamp,planAliases:old.planAliases,preserveDoneOnce:old.preserveDoneOnce};
      aliases.set(next.taskKey,merged.taskKey);
      for (const key of dirty) merged[key]=old[key];
      items[index]=merged; updated++;
    } else {
      if (items.length >= 300) throw new Error('The review list is full. Export a backup before removing old entries.');
      items.push({...next,id:crypto.randomUUID(),selected:false});added++;
    }
  }
  if (rich) for (const item of items) {
    if (!item.personal && !item.taskKey && titles.has(titleIdentity(item.title)) && item.status === 'review') { item.status='superseded';archived++; }
  }
  for(const item of items) item.dependsOn=item.dependsOn.map(key=>aliases.get(key)||key);
  const consolidated=consolidateDuplicates(items);
  return {items:consolidated.items,added,updated,archived:archived+consolidated.archived};
}
export function nextDate(item) { return [item.dueDate,item.followUpDate,item.eventDate].filter(Boolean).sort()[0] || ''; }
export function bucket(item, today=todaySydney()) {
  if (item.dueDate && item.dueDate<=today) return 'ready';
  if (item.group === 'waiting') return item.followUpDate && item.followUpDate <= today ? 'ready' : 'waiting';
  if ([item.dueDate,item.followUpDate].some(date=>date && date<=today)) return 'ready';
  if (nextDate(item)) return 'upcoming';
  return item.group;
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
