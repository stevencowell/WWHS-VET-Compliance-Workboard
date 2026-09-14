(function () {
  'use strict';
  const vet = window.VET_WORKBOARD;
  const ht = window.HT_TAS_WORKBOARD;
  const root = new URL('../../', document.currentScript.src);
  const host = document.getElementById('dashboard-access');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const link = path => new URL(path, root).href;
  const safe = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch (_) { return ''; } };
  function storedLinks(board) {
    try {
      const saved = JSON.parse(localStorage.getItem(board.config.storageKey) || '{}');
      const schemaVersion = board === vet ? 3 : 2;
      return saved?.schemaVersion === schemaVersion && saved.linkDefaultsVersion === 2 && saved.links && typeof saved.links === 'object' && !Array.isArray(saved.links) ? saved.links : {};
    } catch (_) { return {}; }
  }
  function systemUrl(board, system) { return safe(storedLinks(board)[system.id]) || safe(system.url); }
  function destinationLabel(url) {
    if (/drive\.google\.com\/drive\/(search|shared-drives)/.test(url)) return /\/search/.test(url) ? 'Find in Drive' : 'Open Shared drives';
    if (/docs\.google\.com\/(document|spreadsheets|presentation)\//.test(url) || /drive\.google\.com\/file\//.test(url)) return 'Open document';
    if (/drive\.google\.com\/(drive\/folders|open)/.test(url)) return 'Open Drive location';
    return 'Open system';
  }
  const favourites = [
    {id:'evidence-central', title:'Evidence Central', detail:'Evidence and assessment', mark:'EC'},
    {id:'schools-online', title:'Schools Online', detail:'NESA entries and outcomes', mark:'SO'},
    {id:'vet-schools-hub', title:'VET Hub', detail:'Delivery, actions and updates', mark:'VH'},
    {id:'course-library', title:'Document Library — Courses', detail:'Stage 5/6 course resources', mark:'CO'},
    {id:'document-library', title:'Document Library — VET Coordinator', detail:'RTO procedures and forms', mark:'VC'}
  ];
  function favouriteHtml(favourite) {
    const system = vet.systems.find(item => item.id === favourite.id);
    return `<a class="dash-shortcut" data-dash-system="${escape(system.id)}" href="${escape(systemUrl(vet, system))}" target="_blank" rel="noopener noreferrer"><span class="dash-mark" aria-hidden="true">${favourite.mark}</span><span><strong>${escape(favourite.title)}</strong><small>${escape(favourite.detail)}</small></span><span class="dash-arrow" aria-hidden="true">↗</span></a>`;
  }
  function index() {
    const output = [];
    const add = item => output.push({...item, search: `${item.title} ${item.detail || ''} ${item.keywords || ''}`.toLowerCase()});
    for (const [board, wing] of [[vet,'VET'], [ht,'Head Teacher']]) {
      for (const system of board.systems) {
        const url = systemUrl(board, system);
        const favourite = favourites.find(item => item.id === system.id);
        if (url) add({title:favourite?.title || system.label, detail:`${wing} · ${destinationLabel(url)} · ${system.purpose || ''}`, url, external:true, keywords:`${system.id} ${system.label} ${favourite?.mark || ''}`});
      }
    }
    for (const task of vet.taskRegister.tasks) add({title:task.title, detail:'VET · 2026 reference task', keywords:[task.timing, ...(task.systems || []), ...(task.keywords || [])].join(' '), url:link('#task/'+encodeURIComponent(task.id))});
    for (const task of vet.operatingCycle2027.tasks) add({title:task.title, detail:'VET · 2027 planning task', keywords:[task.timing, ...(task.systems || [])].join(' '), url:link('#task/'+encodeURIComponent(task.id))});
    for (const task of ht.tasks) add({title:task.title, detail:`Head Teacher · ${task.area} · ${ht.config.operatingYear} reference`, keywords:[task.summary,task.timing, ...(task.systems || [])].join(' '), url:link('head-teacher-tas/#task/'+encodeURIComponent(task.id))});
    for (const section of vet.coordinatorReferenceGuide.sections) add({title:`${section.code}. ${section.title}`, detail:'VET guide section · mapped work areas', keywords:section.covered, url:link('#systems')});
    for (const [title, path, detail] of [
      ['VET Today','#today','Saved follow-ups and date checks'], ['2027 annual cycle','#cycle-2027','Four terms and annual gates'],
      ['Head Teacher Today','head-teacher-tas/#today','Current reminders and saved follow-ups'], ['Faculty calendar','head-teacher-tas/#calendar','School events and dates'],
      ['Teaching and reporting','head-teacher-tas/#teaching','Programs, assessment and reports'], ['Faculty operations','head-teacher-tas/#faculty','Meetings, budget, resources and maintenance'],
      ['People and safety','head-teacher-tas/#people','Staffing, induction and safety'], ['AI Admin','#ai-admin','Prepare prompts for routine administration']
    ]) add({title, detail, url:link(path)});
    for (const job of window.WWHS_AI_ADMIN?.jobs || []) add({title:job.title, detail:'AI Admin · prepare a job prompt', url:link('#ai-admin')});
    return output;
  }
  function search(query) {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const seen = new Set();
    return index().filter(item => words.every(word => item.search.includes(word))).sort((a,b) => Number(b.title.toLowerCase().includes(query.toLowerCase().trim())) - Number(a.title.toLowerCase().includes(query.toLowerCase().trim())) || Number(b.external) - Number(a.external)).filter(item => { const key = item.title + item.url; if (seen.has(key)) return false; seen.add(key); return true; });
  }
  function mount() {
    host.innerHTML = `<section class="dash-access" aria-labelledby="dash-access-title"><div class="dash-top"><div><p class="dash-eyebrow">WWHS · VET &amp; HEAD TEACHER</p><h2 id="dash-access-title">Your everyday links</h2></div><a class="dash-ai-link" href="#ai-admin">AI Admin <span aria-hidden="true">→</span></a></div><nav class="dash-shortcuts" aria-label="Everyday quick links">${favourites.map(favouriteHtml).join('')}</nav><form class="dash-search" role="search"><label for="dash-search-input">Find a system, document section or task</label><div class="dash-search-controls"><input id="dash-search-input" type="search" autocomplete="off" placeholder="Try courses, reports or placement" aria-controls="dash-search-results"><button type="button" class="dash-clear" hidden>Clear</button></div></form><p class="dash-result-status" role="status" aria-live="polite"></p><div id="dash-search-results" class="dash-results" hidden></div></section>`;
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
      if (shortcut) shortcut.href = systemUrl(vet, vet.systems.find(system => system.id === shortcut.dataset.dashSystem));
    });
    window.addEventListener('hashchange', () => { input.value=''; update(); });
  }
  window.WWHS_DASHBOARD = {destinationLabel, search, root:root.href};
  if (host) mount();
})();
