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

export function validateInbox(raw) {
  if (raw === null) return {version: 1, items: [], importedAt: null};
  const value = JSON.parse(raw);
  if (value?.version !== 1 || !Array.isArray(value.items) || value.items.length > 150) throw new Error('Invalid review list');
  for (const item of value.items) {
    if (!item || typeof item.id !== 'string' || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 300 ||
      typeof item.action !== 'string' || !item.action.trim() || item.action.length > 800 || typeof item.source !== 'string' || item.source.length > 20000 ||
      !Array.isArray(item.links) || item.links.length > 20 || item.links.some(url => !safeUrl(url)) ||
      typeof item.url !== 'string' || item.url && !safeUrl(item.url) ||
      !['ready', 'later', 'waiting'].includes(item.group) || !['review', 'added', 'dismissed'].includes(item.status)) throw new Error('Invalid review item');
  }
  if (new Set(value.items.map(item => item.id)).size !== value.items.length) throw new Error('Duplicate review IDs');
  return value;
}

export function mergeInbox(existing, incoming) {
  const items = existing.map(item => ({...item}));
  let added = 0;
  for (const next of incoming) {
    const previous = items.find(item => item.title === next.title && (item.source === next.source || item.action === next.action));
    if (previous) continue; // Keep edits, review choices and already-added status on reimport.
    if (items.length >= 150) throw new Error('The review list is full. Export it and remove resolved items before importing more.');
    items.push({...next, id: crypto.randomUUID(), selected: false}); added++;
  }
  return {items, added};
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
    if (day.tasks.some(task => task.title === title) || additions.some(task => task.title === title)) continue;
    additions.push({id: createId(), title, state: 'todo', ...(item.url ? {url: item.url} : {})});
  }
  const limit = day.capacity === 'small' ? 1 : 3;
  if (day.tasks.length + additions.length > limit) throw new Error(`There is room for ${Math.max(0, limit - day.tasks.length)} more ${limit === 1 ? 'priority on a small day' : 'priorities today'}. Keep the rest for later.`);
  return additions;
}
