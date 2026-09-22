(function () {
  'use strict';
  const browserStorage = () => window.WWHS_STORAGE || localStorage;
  const wing = document.body.dataset.workboard === 'tas' ? 'tas' : 'vet';
  const board = wing === 'tas' ? window.HT_TAS_WORKBOARD : window.VET_WORKBOARD;
  const wingName = wing === 'tas' ? 'TAS' : 'VET';
  const root = new URL('../../', document.currentScript.src);
  const host = document.getElementById('dashboard-access');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const link = path => new URL((wing === 'tas' ? 'head-teacher-tas/' : '') + path, root).href;
  const safe = value => { if (typeof value !== 'string') return ''; try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch (_) { return ''; } };
  function storedLinks(board) {
    try {
      const saved = JSON.parse(browserStorage().getItem(board.config.storageKey) || '{}');
      const schemaVersion = wing === 'vet' ? 3 : 2;
      return saved?.schemaVersion === schemaVersion && saved.linkDefaultsVersion === 2 && saved.links && typeof saved.links === 'object' && !Array.isArray(saved.links) ? saved.links : {};
    } catch (_) { return {}; }
  }
  function systemUrl(board, system) {
    const saved = safe(storedLinks(board)[system.id]);
    if (system.id === 'staff-calendar' && (!saved || /^https:\/\/waggawagga-h\.sentral\.com\.au\/(dashboard\/?)?$/.test(saved))) return safe(system.url);
    return saved || safe(system.url);
  }
  function destinationLabel(url) {
    if (/drive\.google\.com\/drive\/(search|shared-drives)/.test(url)) return /\/search/.test(url) ? 'Find in Drive' : 'Open Shared drives';
    if (/docs\.google\.com\/(document|spreadsheets|presentation)\//.test(url) || /drive\.google\.com\/file\//.test(url)) return 'Open document';
    if (/drive\.google\.com\/drive\/folders\//.test(url)) return 'Open folder';
    if (/drive\.google\.com\/open/.test(url)) return 'Open Drive location';
    return 'Open system';
  }
  function icon(name) {
    const paths = {
      'evidence-central':'<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/>',
      'schools-online':'<path d="m3 9 9-6 9 6M4 10h16M6 10v8m6-8v8m6-8v8M3 21h18M4 18h16"/>',
      'vet-schools-hub':'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 17h7m-3.5-3.5v7"/>',
      'course-library':'<path d="M12 5v16M12 5C8 2 3 4 3 4v15s5-2 9 2c4-4 9-2 9-2V4s-5-2-9 1Z"/>',
      'document-library':'<rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="m8 14 2 2 5-5M13 18h3"/>',
      sentral:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-13 5h3m3 0h2"/>',
      folder:'<path d="M3 7V5a2 2 0 0 1 2-2h5l3 4h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 9h18"/>',
      plan:'<path d="M5 4h4v4H5zM15 16h4v4h-4zM15 4h4v4h-4zM9 6h6M7 8v10h8"/>',
      today:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      workflows:'<path d="M4 6h14l-3-3m3 3-3 3M20 18H6l3 3m-3-3 3-3M4 6v7m16-2v7"/>',
      issues:'<path d="M5 21V3m0 1h14l-3 4 3 4H5"/>',
      people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-3-5"/>',
      ai:'<rect x="4" y="6" width="16" height="14" rx="3"/><path d="M12 3v3M8 11h.01M16 11h.01M8 16h8M1 11v4m22-4v4"/>',
      search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
      arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>'
    };
    const aliases = {'staff-calendar':'calendar','tas-drive':'folder','head-teacher-guide':'course-library','faculty-plan':'plan','cycle-2027':'calendar','systems':'folder','reference':'folder','teaching':'course-library','faculty':'plan','ai-admin':'ai'};
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[aliases[name] || name] || paths.folder}</svg>`;
  }
  const favourites = wing === 'vet' ? [
    {id:'evidence-central', title:'Evidence Central', detail:'Evidence and assessment', mark:'EC'},
    {id:'schools-online', title:'Schools Online', detail:'NESA entries and outcomes', mark:'SO'},
    {id:'vet-schools-hub', title:'VET Hub', detail:'Delivery, actions and updates', mark:'VH'},
    {id:'course-library', title:'Document Library — Courses', detail:'Stage 5/6 course resources', mark:'CO'},
    {id:'document-library', title:'Document Library — VET Coordinator', detail:'RTO procedures and forms', mark:'VC'},
    {id:'tas-drive', title:'TAS/VET Google Drive', detail:'Faculty documents and resources', mark:'TD'}
  ] : [
    {id:'sentral', title:'Sentral', detail:'School operations and reports', mark:'SE'},
    {id:'staff-calendar', title:'Staff calendar', detail:'Live school dates and events', mark:'CA'},
    {id:'tas-drive', title:'TAS/VET Google Drive', detail:'Faculty documents and resources', mark:'TD'},
    {id:'head-teacher-guide', title:'Head Teacher guide', detail:'Reference guide and school procedures', mark:'HT'},
    {id:'faculty-plan', title:'Faculty Management Plan', detail:'Current faculty and school priorities', mark:'FP'}
  ];
  function favouriteHtml(favourite) {
    const system = board?.systems?.find(item => item.id === favourite.id);
    if (!system) return '';
    const url = systemUrl(board, system);
    if (!url) return '';
    let detail = favourite.detail;
    if (wing === 'tas' && destinationLabel(url) === 'Find in Drive') detail = `Find in Drive · ${favourite.id === 'tas-drive' ? 'faculty folder' : favourite.id === 'faculty-plan' ? 'current plan' : 'reference guide'}`;
    if (favourite.id === 'staff-calendar' && url !== safe(system.url)) detail = 'Live school dates and events';
    const categories = {'evidence-central':'Assessment','schools-online':'NESA','vet-schools-hub':'VET operations','course-library':'Document library','document-library':'Document library',sentral:'School operations','staff-calendar':'Dates & events','tas-drive':'Faculty resources','head-teacher-guide':'Reference','faculty-plan':'Planning'};
    const displayTitle = system.id === 'course-library' ? 'Courses' : system.id === 'document-library' ? 'VET Coordinator' : favourite.title;
    return `<a class="dash-shortcut" data-dash-system="${escape(system.id)}" aria-label="${escape(favourite.title)} (opens in a new tab)" href="${escape(url)}" target="_blank" rel="noopener noreferrer"><span class="dash-shortcut-top"><span class="dash-mark">${icon(system.id)}</span><span class="dash-category">${escape(categories[system.id])}</span></span><span class="dash-shortcut-copy"><strong>${escape(displayTitle)}</strong><small>${escape(detail)}</small></span><span class="dash-shortcut-foot">${destinationLabel(url)}<span aria-hidden="true">↗</span></span></a>`;
  }
  function index() {
    const output = [];
    const add = item => output.push({...item, search: `${item.title} ${item.detail || ''} ${item.keywords || ''}`.toLowerCase()});
    for (const system of board?.systems || []) {
      const url = systemUrl(board, system);
      const favourite = favourites.find(item => item.id === system.id);
      if (url) add({title:favourite?.title || system.label, detail:`${wingName} · ${destinationLabel(url)} · ${system.purpose || ''}`, url, external:true, keywords:`${system.id} ${system.label} ${favourite?.mark || ''}`});
    }
    if (wing === 'vet') {
      for (const task of board?.taskRegister?.tasks || []) add({title:task.title, detail:'VET · 2026 reference task', keywords:[task.timing, ...(task.systems || []), ...(task.keywords || [])].join(' '), url:link('#task/'+encodeURIComponent(task.id))});
      for (const task of board?.operatingCycle2027?.tasks || []) add({title:task.title, detail:'VET · 2027 planning task', keywords:[task.timing, ...(task.systems || [])].join(' '), url:link('#task/'+encodeURIComponent(task.id))});
      for (const section of board?.coordinatorReferenceGuide?.sections || []) add({title:`${section.code}. ${section.title}`, detail:'VET guide section · related tasks', keywords:section.covered, url:link('#systems')});
    } else {
      for (const task of board?.tasks || []) add({title:task.title, detail:`TAS · ${task.area} · ${board.config.operatingYear} reference`, keywords:[task.summary,task.timing, ...(task.systems || [])].join(' '), url:link('#task/'+encodeURIComponent(task.id))});
    }
    const areas = wing === 'vet' ? [
      ['VET dashboard','#vet-home','Everyday links and VET work areas'], ['VET Today','#today','Saved follow-ups and date checks'],
      ['2027 annual cycle','#cycle-2027','Four terms and annual setup'], ['VET workflows','#workflows','Ongoing work and tasks for when needed'],
      ['VET systems','#systems','Approved systems and reference guide'], ['VET issues','#issues','Blocked work, follow-up dates and help needed']
    ] : [
      ['TAS dashboard','#home','Everyday links and Head Teacher work areas'], ['TAS Today','#today','Current reminders and saved follow-ups'],
      ['Faculty calendar','#calendar','School events and dates'], ['Teaching and reporting','#teaching','Programs, assessment and reports'],
      ['Faculty operations','#faculty','Meetings, budget, resources and maintenance'], ['People and safety','#people','Staffing, induction and safety'],
      ['TAS systems','#reference','Faculty systems and reference locations']
    ];
    areas.push([`${wingName} AI Admin`,'#ai-admin','Prepare prompts for routine administration']);
    for (const [title, path, detail] of areas) add({title, detail, url:link(path)});
    for (const job of window.WWHS_AI_ADMIN?.jobs || []) add({title:job.title, detail:`${wingName} AI Admin · prepare a job prompt`, url:link('#ai-admin')});
    return output;
  }
  function search(query) {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const seen = new Set();
    return index().filter(item => words.every(word => item.search.includes(word))).sort((a,b) => Number(b.title.toLowerCase().includes(query.toLowerCase().trim())) - Number(a.title.toLowerCase().includes(query.toLowerCase().trim())) || Number(b.external) - Number(a.external)).filter(item => { const key = item.title + item.url; if (seen.has(key)) return false; seen.add(key); return true; });
  }
  function mount() {
    host.innerHTML = `<section class="dash-access" aria-labelledby="dash-access-title"><div class="dash-top"><div><p class="dash-eyebrow">WWHS · ${wing === 'tas' ? 'HEAD TEACHER TAS' : 'VET'} WING</p><h2 id="dash-access-title">Your ${wingName} everyday links</h2></div><a class="dash-ai-link" href="#ai-admin">AI Admin <span aria-hidden="true">→</span></a></div><nav class="dash-shortcuts" aria-label="${wingName} everyday quick links">${favourites.map(favouriteHtml).join('')}</nav><form class="dash-search" role="search"><label for="dash-search-input">Find a ${wingName} system, document section or task</label><div class="dash-search-controls"><input id="dash-search-input" type="search" autocomplete="off" placeholder="${wing === 'tas' ? 'Try reports, faculty plan or safety' : 'Try courses, assessment or placement'}" aria-controls="dash-search-results"><button type="button" class="dash-clear" hidden>Clear</button></div></form><p class="dash-result-status" role="status" aria-live="polite"></p><div id="dash-search-results" class="dash-results" hidden></div></section>`;
    const input = host.querySelector('input'), results = host.querySelector('.dash-results'), status = host.querySelector('[role=status]'), clear = host.querySelector('.dash-clear');
    function update() {
      const query = input.value.trim(), found = search(query);
      clear.hidden = !query; results.hidden = !query;
      status.textContent = query ? `${found.length} result${found.length === 1 ? '' : 's'}${found.length > 24 ? ' · showing the first 24; add another word to narrow the search' : ''}` : '';
      results.innerHTML = !query ? '' : found.length ? `<ul>${found.slice(0,24).map(item => `<li><a href="${escape(item.url)}" ${item.external ? 'target="_blank" rel="noopener noreferrer"' : ''}><strong>${escape(item.title)}${item.external ? ' ↗' : ''}</strong><small>${escape(item.detail)}</small></a></li>`).join('')}</ul>` : '<p>No matches. Try a system name or a shorter phrase.</p>';
    }
    input.addEventListener('input', update);
    input.addEventListener('keydown', event => { if (event.key === 'Escape') { input.value = ''; update(); } });
    host.querySelector('form').addEventListener('submit', event => { event.preventDefault(); update(); results.querySelector('a')?.focus(); });
    clear.addEventListener('click', () => { input.value=''; update(); input.focus(); });
    host.addEventListener('click', event => {
      const shortcut = event.target.closest('[data-dash-system]');
      if (shortcut) {
        const system = board?.systems?.find(system => system.id === shortcut.dataset.dashSystem);
        const url = system && systemUrl(board, system);
        if (url) shortcut.href = url;
        else event.preventDefault();
      }
    });
    window.addEventListener('hashchange', () => { input.value=''; update(); });
  }
  window.WWHS_DASHBOARD = {destinationLabel, search, icon, root:root.href};
  if (host) mount();
})();
