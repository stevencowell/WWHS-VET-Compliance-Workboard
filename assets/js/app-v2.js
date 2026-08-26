(function () {
  "use strict";

  const data = window.VET_WORKBOARD;
  const register = data.taskRegister;
  const tasks = register.tasks;
  const route = document.getElementById("route-content");
  const taskDialog = document.getElementById("task-dialog");
  const taskDialogContent = document.getElementById("task-dialog-content");
  const settingsDialog = document.getElementById("settings-dialog");
  const settingsContent = document.getElementById("settings-content");
  const roleFilter = document.getElementById("role-filter");
  const toastRegion = document.getElementById("toast-region");
  const boardToday = new Date("2026-08-26T12:00:00+10:00");
  const boardTodayIso = "2026-08-26";
  let lastTaskTrigger = null;
  let lastSettingsTrigger = null;
  let titleOpen = ["", "#today"].includes(location.hash);
  let startOpen = false;

  const phaseMeta = {
    annual_setup: { short: "Set up", title: "Set up the operating year", description: "Confirm authority, roles, access, the live calendar and delivery intentions before the year gathers speed." },
    term_1: { short: "Term 1", title: "Establish delivery and learner records", description: "Get the School Profile, trainers, courses, learners, evidence systems and workplace learning ready." },
    term_2: { short: "Term 2", title: "Lock data and test delivery quality", description: "Complete core NESA data actions, sample evidence and prepare next-year delivery decisions early." },
    term_3: { short: "Term 3", title: "Reconcile, report and prepare next year", description: "Keep evidence ahead of outcomes, manage placement and HSC milestones, and confirm future delivery authority." },
    term_4: { short: "Term 4", title: "Close outcomes and carry work forward", description: "Meet final NESA milestones, close records and move unresolved actions into a verified handover." },
    continuous: { short: "Ongoing", title: "Run continuous controls", description: "Use a small weekly and termly rhythm to stop issues becoming year-end surprises." },
    event_driven: { short: "If needed", title: "Respond to events and exceptions", description: "Urgent safety, privacy, authority and continuity workflows interrupt the normal sequence when required." }
  };

  const roleMatchers = {
    coordinator: ["vet coordinator"], assistant: ["assistant"], trainer: ["trainer", "assessor"],
    principal: ["principal", "authorised delegate"], workplace: ["workplace learning", "wpsp"], nesa: ["nesa", "schools online"]
  };

  const sourceAliases = {
    "NESA-TOA": "NESA-TOA-2026-MAY", "NESA-TOA-2026": "NESA-TOA-2026-MAY",
    "NESA-CHECKS-SOP-2025": "WWHS-NESA-CHECKS-SOP-2025", "WWHS-AUDIT-CHECKLIST": "WWHS-INTERNAL-AUDIT",
    "WWHS-CROSSCHECK-TEMPLATE": "WWHS-CROSSCHECK", "WWHS-USI-PROCEDURE": "WWHS-USI-LOCAL"
  };

  const exactSystemIds = {
    "vet schools hub": "vet-schools-hub", "rto document library": "document-library", "evidence central": "evidence-central",
    "evidence central as applicable": "evidence-central", "nesa schools online": "schools-online", "nesa schools online as applicable": "schools-online",
    "my vet workplace": "my-vet-workplace", "go2workplacement": "go2workplacement", "lln robot": "lln-robot", "evet portal": "evet-portal",
    "nesa timetable of actions": "nesa-toa", "training.gov.au": "tga", "school class/pxp system": "sentral", "approved markbook": "sentral",
    "school reporting system": "sentral", "school timetable system": "sentral", "approved school timetable/records": "sentral",
    "approved school calendar": "wwhs-drive", "approved school document repository": "wwhs-drive", "approved team action record": "wwhs-drive",
    "approved team record": "wwhs-drive", "approved school records": "wwhs-drive", "approved staff handover record": "wwhs-drive"
  };

  const statusMeta = {
    "not-started": { label: "Not started", className: "status-neutral" },
    "in-progress": { label: "In progress", className: "status-progress" }, waiting: { label: "Waiting", className: "status-waiting" },
    performed: { label: "Performed", className: "status-performed" }, recorded: { label: "Recorded", className: "status-recorded" },
    verified: { label: "Verified", className: "status-verified" }, exception: { label: "Exception", className: "status-exception" },
    "not-applicable": { label: "Not applicable", className: "status-muted" }
  };

  const defaultState = {
    schemaVersion: 3, role: "all", guidance: false, experience: "", selectedPhase: "term_3", yearSearch: "",
    linkDefaultsVersion: 1, links: {}, records: {}, statuses: {}, assignments: {}, weekly: {}, gaps: {}, resetArmed: false, lastBackup: ""
  };
  let state = loadState();

  function freshState() {
    return { ...defaultState, links: {}, records: {}, statuses: {}, assignments: {}, weekly: {}, gaps: {} };
  }
  function safeObject(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
  function sanitiseRecords(value) {
    const input = safeObject(value), result = {};
    tasks.forEach(task => {
      const raw = safeObject(input[task.id]);
      if (!Object.keys(raw).length) return;
      const record = { ...raw, status: statusMeta[raw.status] ? raw.status : "not-started", stepChecks: safeObject(raw.stepChecks), history: Array.isArray(raw.history) ? raw.history.slice(-30) : [] };
      const allStepsComplete = (task.actionSteps || []).every((_, index) => record.stepChecks[index] === true || record.stepChecks[String(index)] === true);
      const hasVerifiedTrail = Boolean(String(record.evidenceRef || "").trim() && String(record.verifier || "").trim() && record.sourceChecked === true && record.doneWhenConfirmed === true && allStepsComplete);
      if (record.status === "verified" && !hasVerifiedTrail) record.status = "in-progress";
      if (["exception", "not-applicable"].includes(record.status) && !(String(record.exceptionSummary || "").trim() && String(record.verifier || "").trim())) record.status = "in-progress";
      result[task.id] = record;
    });
    let changed;
    do {
      changed = false;
      tasks.forEach(task => {
        const record = result[task.id];
        if (!record || record.status !== "verified") return;
        const hasOpenDependency = (task.dependencies || []).some(id => !["verified", "not-applicable"].includes(result[id]?.status));
        if (hasOpenDependency && !(record.dependencyExceptionConfirmed === true && String(record.exceptionSummary || "").trim())) { record.status = "in-progress"; changed = true; }
      });
    } while (changed);
    return result;
  }
  function sanitiseGaps(value) {
    const input = safeObject(value), result = {};
    data.knownGaps.forEach(gap => {
      const rawValue = input[gap.id], raw = typeof rawValue === "string" ? { status: rawValue } : safeObject(rawValue);
      if (!Object.keys(raw).length) return;
      const status = ["unconfirmed", "in-progress", "resolved"].includes(raw.status) ? raw.status : "unconfirmed";
      const gatedStatus = status === "resolved" && !(String(raw.reference || "").trim() && String(raw.verifier || "").trim() && raw.sourceChecked === true) ? "in-progress" : status;
      result[gap.id] = { ...raw, status: gatedStatus, reference: String(raw.reference || ""), verifier: String(raw.verifier || ""), sourceChecked: raw.sourceChecked === true };
    });
    return result;
  }
  function normaliseState(saved, deviceLinks) {
    const input = safeObject(saved), allowedRoles = new Set(["all", "coordinator", "assistant", "trainer", "principal", "workplace", "nesa"]);
    const savedLinks = input.linkDefaultsVersion === 1 ? input.links : {};
    return {
      ...freshState(), ...input, schemaVersion: 3, linkDefaultsVersion: 1,
      role: allowedRoles.has(input.role) ? input.role : "all",
      experience: ["", "guided", "full"].includes(input.experience) ? input.experience : "",
      links: { ...safeObject(deviceLinks === undefined ? savedLinks : deviceLinks) },
      records: sanitiseRecords(input.records), assignments: { ...safeObject(input.assignments) },
      weekly: {}, gaps: sanitiseGaps(input.gaps), resetArmed: false
    };
  }
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(data.config.storageKey) || "{}");
      if (saved.schemaVersion !== 3) return freshState();
      return normaliseState(saved);
    } catch (_) { return freshState(); }
  }

  function saveState() {
    try { localStorage.setItem(data.config.storageKey, JSON.stringify(state)); }
    catch (_) { toast("This browser could not save the latest change. Export a backup before continuing.", "error"); }
  }
  function slugStatus(label) {
    const value = String(label || "not started").toLowerCase().replace(/\s+/g, "-").replace("blocked", "waiting");
    return statusMeta[value] ? value : "not-started";
  }
  function esc(value) { return String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])); }
  function safeUrl(value) {
    const url = String(value || "").trim();
    if (/^https:\/\//i.test(url) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i.test(url)) return url;
    return "";
  }
  function longDate(value) { return value ? new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "No fixed date"; }
  function shortDate(value) { return value ? new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`)) : "Live source"; }
  function displayToday() { return new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(boardToday); }
  function daysUntil(value) { return value ? Math.round((new Date(`${value}T12:00:00`) - boardToday) / 86400000) : null; }
  function getRecord(id) { return state.records[id] || { status: "not-started", stepChecks: {}, history: [] }; }
  function getStatus(task) { return getRecord(task.id).status || "not-started"; }
  function isClosed(task) { return ["verified", "not-applicable"].includes(getStatus(task)); }
  function rolesFor(task) { return Object.values(task.roles || {}).flat().join(" ").toLowerCase(); }
  function roleMatches(task) { return state.role === "all" || (roleMatchers[state.role] || []).some(term => rolesFor(task).includes(term)); }
  function assignedRole(task) { return state.assignments[task.id] || task.roles?.doer?.[0] || "Role to confirm"; }
  function accountableRole(task) { return task.roles?.accountable?.join(" / ") || "Accountable role to confirm"; }
  function verifierRole(task) { return task.roles?.verifier?.join(" / ") || "Verifier to confirm"; }
  function sourceFor(id) { return data.sources.find(source => source.id === (sourceAliases[id] || id)) || null; }

  function taskSystems(task) {
    const ids = [];
    (task.systems || []).forEach(label => {
      const id = exactSystemIds[String(label).trim().toLowerCase()];
      if (id && !ids.includes(id)) ids.push(id);
    });
    return ids.map(id => data.systems.find(system => system.id === id)).filter(Boolean);
  }
  function effectiveLink(system) { return safeUrl(state.links[system.id]) || safeUrl(system.url); }
  function priorityTasks() { return register.currentPriorities.taskIds.map(id => tasks.find(task => task.id === id)).filter(Boolean).filter(roleMatches).filter(task => !isClosed(task)); }
  function guidedQueue() {
    const active = tasks.filter(task => roleMatches(task) && !isClosed(task) && getStatus(task) !== "not-started").sort((a, b) => Number(b.phase === "event_driven") - Number(a.phase === "event_driven") || priorityRank(a.priority) - priorityRank(b.priority));
    const current = priorityTasks();
    const dependencyIds = [];
    function addDependencies(task) {
      (task.dependencies || []).forEach(id => {
        const dependency = tasks.find(item => item.id === id);
        if (!dependency || isClosed(dependency) || dependencyIds.includes(id)) return;
        dependencyIds.push(id); addDependencies(dependency);
      });
    }
    current.forEach(addDependencies);
    const dependencies = dependencyIds.map(id => tasks.find(task => task.id === id)).filter(Boolean).filter(roleMatches);
    const phaseWork = tasks.filter(task => roleMatches(task) && !isClosed(task) && ["term_3", "continuous"].includes(task.phase)).sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
    const earlier = tasks.filter(task => roleMatches(task) && !isClosed(task) && historicalUnconfirmed(task)).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
    const remaining = tasks.filter(task => roleMatches(task) && !isClosed(task));
    const seen = new Set();
    return [...active, ...current, ...dependencies, ...phaseWork, ...earlier, ...remaining].filter(task => task && !seen.has(task.id) && seen.add(task.id));
  }
  function historicalUnconfirmed(task) { return Boolean(task.dueDate && task.dueDate < data.config.operationalStart && getStatus(task) === "not-started"); }
  function priorityRank(value) { return ({ critical: 0, high: 1, medium: 2, low: 3 })[value] ?? 4; }

  function dueBadge(task) {
    if (historicalUnconfirmed(task)) return `<span class="badge local">Confirm earlier milestone</span>`;
    if (!task.dueDate) return `<span class="badge local">${esc(task.timing)}</span>`;
    const days = daysUntil(task.dueDate);
    if (days < 0 && !isClosed(task)) return `<span class="badge overdue">Past due · ${esc(shortDate(task.dueDate))}</span>`;
    if (days === 0) return `<span class="badge overdue">Due today</span>`;
    if (days <= 21) return `<span class="badge due">Due ${esc(shortDate(task.dueDate))} · ${days} days</span>`;
    return `<span class="badge due">Due ${esc(shortDate(task.dueDate))}</span>`;
  }
  function applicabilityLabel(task) {
    const condition = task.applicability?.conditions || "Required when applicable";
    if (/optional/i.test(condition)) return "optional";
    if (/where|if |applicable|course specific|scheduled|proposed/i.test(condition)) return "if applicable";
    return "required";
  }
  function statusPill(task) { const meta = statusMeta[getStatus(task)] || statusMeta["not-started"]; return `<span class="status-pill ${meta.className}">${esc(meta.label)}</span>`; }

  function taskCard(task, options = {}) {
    const compact = options.compact ? " is-compact" : "";
    return `<article class="task-card priority-${esc(task.priority)}${compact}"><div class="priority-rail" aria-hidden="true"></div><div class="task-main"><div class="task-meta"><span class="badge">${esc(applicabilityLabel(task))}</span>${dueBadge(task)}${statusPill(task)}</div><h3>${esc(task.title)}</h3>${options.compact ? "" : `<p class="summary">${esc(task.timing)}</p>`}<p class="task-owner">${esc(assignedRole(task))}</p></div><button class="task-action" type="button" data-action="open-task" data-task-id="${esc(task.id)}">${getStatus(task) === "not-started" ? "Start task" : "Open task"}</button></article>`;
  }

  function renderTitle() {
    route.innerHTML = `<section class="title-page"><div class="title-panel"><div class="title-brand-zone"><img class="title-brand-image" src="assets/img/wwhs-vet-title-brand.png" width="209" height="63" alt="WWHS VET Compliance Workboard"></div><div class="title-copy"><p class="eyebrow">2026 coordinator platform</p><h1>VET compliance, one clear step at a time.</h1><p>A calm, guided annual workboard for new and experienced VET coordinators and assistants.</p><div class="title-actions"><button class="button title-start" type="button" data-action="enter-workboard">Start</button><button class="button quiet title-help" type="button" data-action="open-workflow" data-workflow-id="safety-incident">Urgent help</button></div><small>Official systems remain the record.</small></div></div></section>`;
  }

  function renderWelcome() {
    route.innerHTML = `<section class="page welcome-page"><div class="welcome-card"><div class="welcome-copy"><p class="eyebrow">Welcome to the 2026 workboard</p><h1>Start with one thing.</h1><p class="welcome-lead">VET is complex. Your first screen does not need to be. Choose the pace that suits you today—the same mapped annual process sits underneath both views.</p><div class="welcome-choices"><button class="choice-card is-recommended" type="button" data-action="choose-experience" data-experience="guided"><span class="choice-kicker">New or returning to the role</span><strong>Guide me one step at a time</strong><small>See one next action, a short explanation and what comes after it.</small></button><button class="choice-card" type="button" data-action="choose-experience" data-experience="full"><span class="choice-kicker">Experienced coordinator or assistant</span><strong>Open the fast workboard</strong><small>See due work, recurring controls and blockers without training clutter.</small></button></div><p class="welcome-note">Change pace at any time. The official system remains the record; this workboard tells you what to do next.</p></div><aside class="toe-dip" aria-label="How the guided start works"><p class="eyebrow">A gentle first run</p><ol><li><span>1</span><div><strong>See the next action</strong><small>Plain language, owner and timing.</small></div></li><li><span>2</span><div><strong>Follow short steps</strong><small>Open the correct authorised system.</small></div></li><li><span>3</span><div><strong>Record a safe reference</strong><small>Then the next action appears.</small></div></li></ol></aside></div></section>`;
  }

  function renderGuidedToday() {
    const ordered = guidedQueue();
    const current = ordered[0];
    const upcoming = ordered.slice(1, 3);
    const earlierCount = tasks.filter(task => roleMatches(task) && historicalUnconfirmed(task) && !isClosed(task)).length;
    route.innerHTML = `<section class="page"><header class="page-heading calm-heading"><div><p class="eyebrow">${esc(data.config.currentTerm)} · ${esc(data.config.currentWeek)}</p><h1>Your next step</h1><p>Do this one action first. The rest of the workboard will wait.</p></div><button class="button quiet compact" type="button" data-action="choose-experience" data-experience="full">Explore the full workboard</button></header><aside class="privacy-line"><strong>Keep personal information out of this workboard.</strong> Complete the real action and keep its evidence in the authorised system.</aside>${earlierCount ? `<details class="prior-status-note"><summary>Earlier-year status has not been imported</summary><p>This new workboard does not assume those actions were missed. Confirm them in the official systems as they enter the guided queue.</p></details>` : ""}${current ? focusTask(current) : `<div class="empty-state"><h2>Every applicable action in this view is closed.</h2><p>Use the full workboard to review exceptions, future work or source changes.</p><button class="button" type="button" data-action="choose-experience" data-experience="full">Explore the full workboard</button></div>`}${upcoming.length ? `<section class="coming-next"><div class="section-heading"><div><h2>Coming next</h2><p>A preview only—nothing else to act on yet.</p></div></div>${upcoming.map((task, index) => `<div class="next-row"><span>0${index + 2}</span><div><strong>${esc(task.title)}</strong><small>${esc(task.timing)}</small></div></div>`).join("")}</section>` : ""}<button class="guidance-footer" type="button" data-action="choose-experience" data-experience="full"><span>Already know the role?</span><strong>Switch to the fast workboard →</strong></button></section>`;
  }
  function focusTask(task) {
    return `<section class="focus-task"><div class="focus-top"><span class="focus-number">01</span><div><span class="badge">${esc(applicabilityLabel(task))}</span>${dueBadge(task)}</div></div><h2>${esc(task.title)}</h2><p>${esc(task.timing)}</p><div class="focus-facts"><span><small>Accountable role</small><strong>${esc(accountableRole(task))}</strong></span><span><small>Start in</small><strong>${esc(task.systems?.[0] || "Authorised owner system")}</strong></span></div><button class="button focus-button" type="button" data-action="open-task" data-task-id="${esc(task.id)}">Show me this task</button></section>`;
  }

  function renderFullToday() {
    const active = priorityTasks();
    const visible = active.slice(0, 4), more = active.slice(4);
    const dueSoon = tasks.filter(task => roleMatches(task) && task.dueDate && daysUntil(task.dueDate) >= 0 && daysUntil(task.dueDate) <= 21 && !isClosed(task)).length;
    const waiting = tasks.filter(task => roleMatches(task) && ["waiting", "exception"].includes(getStatus(task))).length;
    const unresolvedGaps = data.knownGaps.filter(gap => getGapRecord(gap.id).status !== "resolved").length;
    const configured = data.systems.filter(system => effectiveLink(system)).length;
    route.innerHTML = `<section class="page"><header class="page-heading"><div><p class="eyebrow">${esc(data.config.currentTerm)} · ${esc(data.config.currentWeek)}</p><h1>What needs doing now?</h1><p>Risk-ordered work for the current 2026 snapshot. Training stays closed unless you ask for it.</p></div><div class="date-block"><strong>${esc(displayToday())}</strong><span>2026 source snapshot</span></div></header><div class="mode-strip"><span><strong>Fast workboard</strong> · guidance is ${state.guidance ? "available" : "hidden"}</span><button type="button" class="text-button" data-action="choose-experience" data-experience="guided">Use one-step view</button></div><aside class="notice compact-notice"><span class="notice-icon" aria-hidden="true">!</span><div><strong>Official systems remain the record</strong><p>Record only a privacy-safe reference here—never learner, assessment, health, placement, incident, password or credential data.</p></div></aside><div class="stats" aria-label="Work summary"><div class="stat is-urgent"><span>Active now</span><strong>${active.length}</strong><small>risk-ordered actions</small></div><div class="stat is-next"><span>Next 21 days</span><strong>${dueSoon}</strong><small>dated milestones</small></div><div class="stat"><span>Waiting / exception</span><strong>${waiting}</strong><small>owned follow-up</small></div><div class="stat"><span>Authority gaps</span><strong>${unresolvedGaps}</strong><small>${configured}/${data.systems.length} links ready</small></div></div><div class="section-heading"><div><h2>Do now</h2><p>Current priorities for Wednesday 26 August 2026.</p></div><button class="text-button" type="button" data-action="print">Print current view</button></div><div class="task-list">${visible.map(task => taskCard(task)).join("")}</div>${more.length ? `<details class="more-tasks"><summary>${more.length} other active control${more.length === 1 ? "" : "s"}</summary><div class="task-list">${more.map(task => taskCard(task, { compact: true })).join("")}</div></details>` : ""}<div class="split-grid dashboard-lower">${weeklyPanel()}${quickSystemsPanel()}</div>${changePanel()}</section>`;
  }
  function weeklyPanel() {
    const items = [["c-01-rto-updates", "Review current RTO Updates and Hub To Do"], ["c-02-team-meetings", "Review team actions and hand-backs"], ["e-06-discrepancy-corrective-action", "Review exceptions and changed-source actions"]];
    return `<section class="panel"><div class="section-heading"><div><h2>Weekly controls</h2><p>Open the canonical action. These prompts never mark work complete.</p></div></div><div class="weekly-list">${items.map(([id, label]) => `<button class="weekly-item" type="button" data-action="open-task" data-task-id="${id}"><span>${esc(label)}</span><strong>Open</strong></button>`).join("")}</div></section>`;
  }
  function quickSystemsPanel() {
    const ids = ["vet-schools-hub", "document-library", "evidence-central", "schools-online", "nesa-toa", "wwhs-drive"];
    return `<section class="panel"><div class="section-heading"><div><h2>Quick systems</h2><p>Private routes are set once in this browser.</p></div><button class="text-button" type="button" data-action="open-settings">Set links</button></div><div class="system-grid">${ids.map(id => data.systems.find(system => system.id === id)).filter(Boolean).map(systemButton).join("")}</div></section>`;
  }
  function systemButton(system) {
    const url = effectiveLink(system);
    return url ? `<a class="system-link" href="${esc(url)}" target="_blank" rel="noopener"><span>${esc(system.label)}</span><span aria-hidden="true">↗</span></a>` : `<button class="system-link is-unset" type="button" data-action="open-settings"><span>${esc(system.label)}</span><span>Set link</span></button>`;
  }
  function changePanel() { return `<section class="change-panel"><div><p class="eyebrow">Source watch</p><h2>The workboard caught a changed date</h2><p>The current NESA workbook moved the 2026 school-delivered VET USI due date to <strong>2 April</strong>. The older WWHS copy still shows 27 February and should not control future action.</p></div><a href="#issues" class="button secondary">See changes and gaps</a></section>`; }
  function renderToday() { if (titleOpen) return renderTitle(); if (startOpen || !state.experience) return renderWelcome(); if (state.experience === "guided") return renderGuidedToday(); renderFullToday(); }

  function renderYear() {
    const selected = state.selectedPhase in phaseMeta ? state.selectedPhase : "term_3";
    const phaseTasks = tasks.filter(task => task.phase === selected && roleMatches(task)).filter(task => !state.yearSearch || taskSearchText(task).includes(state.yearSearch.toLowerCase()));
    const done = phaseTasks.filter(isClosed).length;
    route.innerHTML = `<section class="page"><header class="page-heading"><div><p class="eyebrow">One phase at a time</p><h1>Year plan</h1><p>The 57-action register stays underneath. This page opens only one part of the year so new staff can see the sequence without facing the whole minefield.</p></div><div class="date-block"><strong>${done}/${phaseTasks.length} closed</strong><span>${esc(phaseMeta[selected].short)}</span></div></header><nav class="phase-nav" aria-label="Annual workflow phases">${register.phaseOrder.map(phase => `<button type="button" class="phase-button ${phase === selected ? "is-current" : ""}" data-action="select-phase" data-phase="${phase}"><span>${esc(phaseMeta[phase].short)}</span><small>${tasks.filter(task => task.phase === phase).length}</small></button>`).join("")}</nav><section class="phase-intro"><div><p class="eyebrow">${esc(phaseMeta[selected].short)}</p><h2>${esc(phaseMeta[selected].title)}</h2><p>${esc(phaseMeta[selected].description)}</p></div><label class="search-field"><span>Find in this phase</span><input id="year-search" type="search" value="${esc(state.yearSearch)}" placeholder="e.g. USI, trainer, reports"></label></section><div class="phase-status-line"><span>${phaseTasks.length} actions in sequence</span><span>${done} verified or not applicable</span><span>${phaseTasks.filter(historicalUnconfirmed).length} earlier milestones need status confirmation</span></div><div class="task-list year-task-list">${phaseTasks.length ? phaseTasks.map(task => taskCard(task, { compact: true })).join("") : `<div class="empty-state"><h2>No matching work in this phase.</h2><p>Clear the search or choose another role.</p></div>`}</div></section>`;
  }
  function taskSearchText(task) { return [task.title, task.timing, task.trigger, task.dueAuthority, ...(task.actionSteps || []), ...(task.systems || [])].join(" ").toLowerCase(); }

  function renderWorkflows() {
    const groups = ["Most used", "Learner pathway", "Planning", "Urgent", "Continuity"];
    route.innerHTML = `<section class="page"><header class="page-heading"><div><p class="eyebrow">Start from the situation</p><h1>Workflows</h1><p>Choose what is happening. Each workflow pulls together relevant canonical actions; it does not create another checklist.</p></div></header><section class="urgent-strip"><div><strong>Something has gone wrong?</strong><span>Safety, privacy and unauthorised delivery do not wait for the annual sequence.</span></div><button type="button" class="button urgent-button" data-action="open-workflow" data-workflow-id="safety-incident">Open urgent response</button></section>${groups.map(group => { const items = data.workflows.filter(workflow => workflow.group === group); return items.length ? `<section class="workflow-group"><div class="section-heading"><div><h2>${esc(group)}</h2></div></div><div class="workflow-grid">${items.map(workflow => `<article class="workflow-card ${group === "Urgent" ? "is-urgent" : ""}"><p class="eyebrow">${esc(workflow.trigger)}</p><h3>${esc(workflow.title)}</h3><p>${esc(workflow.summary)}</p><button type="button" class="button secondary" data-action="open-workflow" data-workflow-id="${esc(workflow.id)}">Open workflow</button></article>`).join("")}</div></section>` : ""; }).join("")}</section>`;
  }
  function workflowTasks(workflow) {
    if (workflow.taskIds?.length) return workflow.taskIds.map(id => tasks.find(task => task.id === id)).filter(Boolean);
    return tasks.filter(task => roleMatches(task) && workflow.keywords.some(keyword => taskSearchText(task).includes(keyword))).sort((a, b) => Number(isClosed(a)) - Number(isClosed(b)) || priorityRank(a.priority) - priorityRank(b.priority)).slice(0, 10);
  }
  function openWorkflow(id) {
    const workflow = data.workflows.find(item => item.id === id); if (!workflow) return;
    const related = workflowTasks(workflow);
    taskDialogContent.innerHTML = `<header class="dialog-head"><div><p class="eyebrow">${esc(workflow.trigger)}</p><h2 id="task-dialog-title">${esc(workflow.title)}</h2></div><button class="dialog-close" type="button" data-action="close-dialog" aria-label="Close workflow">×</button></header><div class="dialog-body"><p class="dialog-lead">${esc(workflow.summary)}</p><section class="gate-box"><strong>Safe completion gate</strong><p>${esc(workflow.gate)}</p></section><section class="dialog-section"><h3>Actions in this workflow</h3><div class="workflow-task-list">${related.map((task, index) => `<button type="button" class="workflow-task" data-action="open-task" data-task-id="${esc(task.id)}"><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${esc(task.title)}</strong><small>${esc(statusMeta[getStatus(task)].label)} · ${esc(task.timing)}</small></div></button>`).join("") || `<p>No matching action is available for the current role filter.</p>`}</div></section></div>`;
    taskDialog.showModal();
  }

  function renderSystems() {
    const groups = [...new Set(data.systems.map(system => system.group))];
    route.innerHTML = `<section class="page"><header class="page-heading"><div><p class="eyebrow">Open the right place first</p><h1>Systems &amp; sources</h1><p>Plain-language launch points for the authorised systems that own the work. Confirmed staff front doors are built in; sign-in and permissions still apply.</p></div><button class="button" type="button" data-action="open-settings">Review staff links</button></header><aside class="notice compact-notice"><span class="notice-icon" aria-hidden="true">i</span><div><strong>Signed-in work account required</strong><p>Before acting, confirm the authorised education account and the current source version. A familiar saved link can still be stale.</p></div></aside>${groups.map(group => `<section class="system-group"><div class="section-heading"><div><h2>${esc(group)}</h2></div></div><div class="system-cards">${data.systems.filter(system => system.group === group).map(systemCard).join("")}</div></section>`).join("")}<details class="source-library"><summary>Open the authority and source register <span>${data.sources.length} mapped sources</span></summary><div class="source-list">${data.sources.map(sourceCard).join("")}</div></details></section>`;
  }
  function systemCard(system) {
    const url = effectiveLink(system);
    return `<article class="system-card"><div class="system-card-head"><span class="system-kind">${esc(system.kind)}</span><span class="link-state ${url ? "is-ready" : ""}">${url ? "Link ready" : "Needs local link"}</span></div><h3>${esc(system.label)}</h3><p>${esc(system.purpose)}</p><small>${esc(system.boundary)}</small>${url ? `<a class="button secondary" href="${esc(url)}" target="_blank" rel="noopener">Open system</a>` : `<button class="button quiet" type="button" data-action="open-settings">Set link</button>`}</article>`;
  }
  function sourceCard(source) { return `<article class="source-card"><div><span class="source-access">${esc(source.access)}</span><h3>${esc(source.title)}</h3><p>${esc(source.owner)} · checked ${esc(source.verified)}</p><small>${esc(source.note)}</small></div>${source.url ? `<a href="${esc(source.url)}" target="_blank" rel="noopener">Open approved location ↗</a>` : `<span class="controlled-label">Open through approved staff system</span>`}</article>`; }

  function getGapRecord(id) {
    const saved = state.gaps[id];
    if (typeof saved === "string") return { status: saved };
    return saved || { status: "unconfirmed", reference: "", verifier: "", sourceChecked: false };
  }
  function renderIssues() {
    const counts = data.knownGaps.reduce((result, gap) => { const value = getGapRecord(gap.id).status; result[value] = (result[value] || 0) + 1; return result; }, {});
    route.innerHTML = `<section class="page"><header class="page-heading"><div><p class="eyebrow">Keep uncertainty visible</p><h1>Issues &amp; handover</h1><p>A gap is safer when it has an owner and next action. Detailed learner, staff, incident and evidence records stay in their authorised systems.</p></div></header><div class="issue-summary"><span><strong>${counts.unconfirmed || 0}</strong> unconfirmed</span><span><strong>${counts["in-progress"] || 0}</strong> being resolved</span><span><strong>${counts.resolved || 0}</strong> resolved</span></div><section class="alerts-section"><div class="section-heading"><div><h2>Changes and conflicts to act on</h2><p>These are source-control warnings, not background reading.</p></div></div><div class="alert-list">${data.alerts.map(alert => `<article class="alert-card level-${esc(alert.level)}"><span>${alert.level === "high" ? "Act" : "Watch"}</span><div><h3>${esc(alert.title)}</h3><p>${esc(alert.detail)}</p></div></article>`).join("")}</div></section><section class="gaps-section"><div class="section-heading"><div><h2>Authority and setup gaps</h2><p>Update status here; keep the detailed action trail in the approved team system.</p></div></div><div class="gap-list">${data.knownGaps.map(gapCard).join("")}</div></section>${handoverPanel()}</section>`;
  }
  function gapCard(gap) {
    const current = getGapRecord(gap.id);
    const statusLabel = current.status === "resolved" ? "Resolved in owner system" : current.status === "in-progress" ? "In progress" : "Unconfirmed";
    return `<form class="gap-card" data-gap-form="${esc(gap.id)}"><div class="gap-risk risk-${esc(gap.risk)}">${esc(gap.risk)}</div><div><h3>${esc(gap.title)}</h3><p><strong>Owner:</strong> ${esc(gap.owner)}</p><p>${esc(gap.next)}</p><p class="print-gap-status"><strong>Status:</strong> ${esc(statusLabel)}</p></div><label><span>Status</span><select name="status"><option value="unconfirmed" ${current.status === "unconfirmed" ? "selected" : ""}>Unconfirmed</option><option value="in-progress" ${current.status === "in-progress" ? "selected" : ""}>In progress</option><option value="resolved" ${current.status === "resolved" ? "selected" : ""}>Resolved in owner system</option></select></label><details class="gap-resolution" ${current.status === "resolved" ? "open" : ""}><summary>Record the privacy-safe resolution trail</summary><div class="form-grid"><label class="span-two"><span>Owner-system reference</span><input name="reference" type="text" value="${esc(current.reference || "")}" placeholder="e.g. Principal role matrix approved 26 Aug"><small>Never paste the document, personal data or a private link.</small></label><label><span>Verifier role or initials</span><input name="verifier" type="text" value="${esc(current.verifier || "")}"></label><label class="check-line"><input name="sourceChecked" type="checkbox" ${current.sourceChecked ? "checked" : ""}><span>Current authority/source checked.</span></label></div><p class="form-error" role="alert" hidden></p></details><button class="button secondary gap-save" type="submit">Save gap status</button></form>`;
  }
  function saveGapForm(form) {
    const values = new FormData(form), status = String(values.get("status") || "unconfirmed");
    const reference = String(values.get("reference") || "").trim(), verifier = String(values.get("verifier") || "").trim(), sourceChecked = values.get("sourceChecked") === "on";
    const error = form.querySelector(".form-error");
    if (status === "resolved" && (!reference || !verifier || !sourceChecked)) {
      error.textContent = "Resolving an authority gap requires a privacy-safe owner-system reference, verifier and current-source check."; error.hidden = false; form.querySelector(".gap-resolution").open = true; return;
    }
    state.gaps[form.dataset.gapForm] = { status, reference, verifier, sourceChecked, updatedAt: new Date().toISOString() };
    saveState(); renderIssues(); toast(status === "resolved" ? "Gap resolution recorded with verification" : "Gap status saved");
  }
  function handoverPanel() {
    const closed = tasks.filter(isClosed).length, active = tasks.filter(task => !isClosed(task) && getStatus(task) !== "not-started").length;
    return `<section class="handover-panel"><div><p class="eyebrow">Continuity</p><h2>Handover and backup</h2><p>Export privacy-safe workboard metadata before changing devices or roles. This file is not a substitute for official records or a shared team database.</p><div class="handover-stats"><span>${closed} closed actions</span><span>${active} active actions</span><span>${state.lastBackup ? `Last backup ${esc(shortDate(state.lastBackup.slice(0, 10)))}` : "No backup recorded"}</span></div></div><div class="handover-actions"><button class="button" type="button" data-action="export-workspace">Export workboard</button><button class="button secondary" type="button" data-action="import-workspace">Restore backup</button><input id="workspace-import" type="file" accept="application/json" hidden><button class="button quiet" type="button" data-action="print">Print summary</button><button class="button danger-quiet" type="button" data-action="reset-workspace">${state.resetArmed ? "Confirm clear local data" : "Clear local data"}</button></div></section>`;
  }

  function openTask(id) {
    const task = tasks.find(item => item.id === id); if (!task) return;
    const record = getRecord(task.id), systems = taskSystems(task), sources = (task.sourceIds || []).map(idValue => ({ id: idValue, item: sourceFor(idValue) }));
    const dependencies = (task.dependencies || []).map(depId => tasks.find(item => item.id === depId)).filter(Boolean);
    const guidanceOpen = state.guidance || state.experience === "guided";
    taskDialogContent.innerHTML = `<header class="dialog-head"><div><p class="eyebrow">${esc(phaseMeta[task.phase]?.short || task.phase)} · ${esc(applicabilityLabel(task))}</p><h2 id="task-dialog-title">${esc(task.title)}</h2></div><button class="dialog-close" type="button" data-action="close-dialog" aria-label="Close task">×</button></header><div class="dialog-body"><div class="task-facts"><div class="fact"><span>When</span><strong>${esc(task.dueDate ? longDate(task.dueDate) : task.timing)}</strong></div><div class="fact"><span>Accountable</span><strong>${esc(accountableRole(task))}</strong></div><div class="fact"><span>Doer</span><strong>${esc(assignedRole(task))}</strong></div><div class="fact"><span>Expected verifier</span><strong>${esc(verifierRole(task))}</strong></div></div>${authorityPanel(task)}${dependencies.length ? dependencyPanel(dependencies) : ""}<section class="dialog-section"><h3>Do this</h3><ol class="step-list">${(task.actionSteps || []).map((step, index) => `<li><label><input type="checkbox" data-task-step="${index}" data-task-id="${esc(task.id)}" ${record.stepChecks?.[index] ? "checked" : ""}><span class="step-number">${index + 1}</span><span>${esc(step)}</span></label></li>`).join("")}</ol></section><section class="done-when"><span>Done when</span><p>${esc(task.doneWhen)}</p></section>${ownerSystemsPanel(task, systems)}<details class="guidance-details" ${guidanceOpen ? "open" : ""}><summary>Explain this in plain English</summary><div class="guidance-box"><p><strong>Why it matters:</strong> ${esc(task.guidance?.why || "This action supports the authorised annual VET process.")}</p><p><strong>Common trap:</strong> ${esc(task.guidance?.commonTrap || "Treating the workboard as the official record.")}</p><p><strong>Applies to:</strong> ${esc(task.applicability?.conditions || "Confirm locally")}</p></div></details><details class="source-details"><summary>Show mapped sources</summary><div class="source-mini-list">${sources.map(({ id: sourceId, item }) => item ? `<p><strong>${esc(item.title)}</strong><span>${esc(item.note)}</span>${item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noopener">Open approved location ↗</a>` : `<small>Open through the approved staff system</small>`}</p>` : `<p><strong>${esc(sourceId)}</strong><span>Controlled or local source—confirm the current authorised version.</span></p>`).join("")}</div></details>${completionForm(task, record)}${historyPanel(record)}</div>`;
    if (!taskDialog.open) taskDialog.showModal();
    else taskDialogContent.querySelector(".dialog-close")?.focus();
  }
  function authorityPanel(task) {
    const authority = task.dueAuthority || "Current task sources and authorised owner system";
    const liveCheck = task.liveVerification?.check || "Confirm the current source and owner-system state before recording completion.";
    return `<section class="authority-panel"><div><span>Authority</span><strong>${esc(authority)}</strong>${task.liveVerification?.required ? `<em>Verify live</em>` : ""}</div><p>${esc(liveCheck)}</p></section>`;
  }
  function ownerSystemsPanel(task, launchSystems) {
    return `<section class="dialog-section owner-systems"><h3>Owner systems and records</h3><ul>${(task.systems || ["Authorised owner system"]).map(label => `<li>${esc(label)}</li>`).join("")}</ul>${launchSystems.length ? `<div class="dialog-system-links">${launchSystems.map(systemButton).join("")}</div>` : `<p class="controlled-label">Open this through the approved staff route. No guessed launch link is provided.</p>`}</section>`;
  }
  function dependencyPanel(dependencies) {
    const open = dependencies.filter(task => !isClosed(task));
    return `<section class="dependency-panel ${open.length ? "has-open" : "is-clear"}"><strong>${open.length ? `${open.length} prerequisite${open.length === 1 ? "" : "s"} not yet verified` : "Prerequisites recorded as closed"}</strong><ul>${dependencies.map(task => `<li><span>${esc(task.title)}</span>${statusPill(task)}</li>`).join("")}</ul></section>`;
  }
  function completionForm(task, record) {
    const openDependencies = (task.dependencies || []).map(id => tasks.find(item => item.id === id)).filter(Boolean).filter(item => !isClosed(item));
    return `<section class="completion-panel"><div class="section-heading"><div><h3>Record progress safely</h3><p>Use a location, record ID or dated sign-off reference—never paste the evidence itself.</p></div></div><form id="task-record-form" data-task-id="${esc(task.id)}"><div class="form-grid"><label><span>Status</span><select name="status">${Object.entries(statusMeta).map(([value, meta]) => `<option value="${value}" ${record.status === value ? "selected" : ""}>${esc(meta.label)}</option>`).join("")}</select></label><label><span>Working role</span><select name="assignment"><option value="">Use source role</option>${["VET Coordinator", "VET Coordinator Assistant", "Trainer/assessor", "Principal or delegate", "Workplace learning coordinator", "Authorised NESA staff"].map(role => `<option value="${esc(role)}" ${state.assignments[task.id] === role ? "selected" : ""}>${esc(role)}</option>`).join("")}</select></label><label class="span-two"><span>Privacy-safe official-record reference</span><input name="evidenceRef" type="text" value="${esc(record.evidenceRef || "")}" placeholder="e.g. VET Hub status checked 26 Aug; team action register item 14"><small>Do not enter a learner, USI, host, incident, assessment or credential detail.</small></label><label><span>Verifier role or initials</span><input name="verifier" type="text" value="${esc(record.verifier || "")}" placeholder="Expected: ${esc(verifierRole(task))}"></label><label><span>Internal review date</span><input name="reviewDate" type="date" value="${esc(record.reviewDate || "")}"></label><label class="check-line span-two"><input name="sourceChecked" type="checkbox" ${record.sourceChecked ? "checked" : ""}><span>I checked the current live source/date before recording completion.</span></label><label class="check-line span-two"><input name="doneWhenConfirmed" type="checkbox" ${record.doneWhenConfirmed ? "checked" : ""}><span>I confirmed the stated “Done when” result in the owner system.</span></label>${openDependencies.length ? `<label class="check-line span-two"><input name="dependencyExceptionConfirmed" type="checkbox" ${record.dependencyExceptionConfirmed ? "checked" : ""}><span>An authorised verifier confirmed an owned official-system exception for the ${openDependencies.length} open prerequisite${openDependencies.length === 1 ? "" : "s"}.</span></label>` : ""}<label class="span-two"><span>Exception or not-applicable reason (if used)</span><textarea name="exceptionSummary" rows="2" placeholder="Privacy-safe summary only">${esc(record.exceptionSummary || "")}</textarea></label></div><p class="form-error" id="task-form-error" role="alert" hidden></p><div class="dialog-actions"><button class="button secondary" type="submit" name="commit" value="save">Save progress</button><button class="button" type="submit" name="commit" value="verify">Verify and close</button><button class="button quiet" type="button" data-action="close-dialog">Close</button></div></form></section>`;
  }
  function historyPanel(record) {
    const history = (record.history || []).slice(-5).reverse();
    return history.length ? `<details class="history-details"><summary>Recent local history</summary><ul>${history.map(item => `<li><span>${esc(item.when.replace("T", " ").slice(0, 16))}</span><strong>${esc(item.action)}</strong></li>`).join("")}</ul></details>` : "";
  }

  function saveTaskForm(form, commit) {
    const task = tasks.find(item => item.id === form.dataset.taskId); if (!task) return;
    const values = new FormData(form); let status = String(values.get("status") || "not-started");
    const evidenceRef = String(values.get("evidenceRef") || "").trim(), verifier = String(values.get("verifier") || "").trim();
    const sourceChecked = values.get("sourceChecked") === "on", doneWhenConfirmed = values.get("doneWhenConfirmed") === "on", dependencyExceptionConfirmed = values.get("dependencyExceptionConfirmed") === "on", exceptionSummary = String(values.get("exceptionSummary") || "").trim();
    const error = form.querySelector("#task-form-error"); if (commit === "verify") status = "verified";
    if (status === "verified" && (!evidenceRef || !verifier || !sourceChecked)) { error.textContent = "To verify this task, add a privacy-safe official-record reference, a verifier and confirm the live source check."; error.hidden = false; return; }
    const previous = getRecord(task.id), allStepsComplete = (task.actionSteps || []).every((_, index) => previous.stepChecks?.[index]);
    const openDependencies = (task.dependencies || []).map(id => tasks.find(item => item.id === id)).filter(Boolean).filter(item => !isClosed(item));
    if (status === "verified" && !allStepsComplete) { error.textContent = "Complete each action step before verifying this task."; error.hidden = false; return; }
    if (status === "verified" && !doneWhenConfirmed) { error.textContent = "Confirm the stated Done when result in the owner system before verifying."; error.hidden = false; return; }
    if (status === "verified" && openDependencies.length && (!dependencyExceptionConfirmed || !exceptionSummary)) { error.textContent = "Open prerequisites must be closed, or an authorised verifier must record a privacy-safe official-system exception."; error.hidden = false; return; }
    if (["exception", "not-applicable"].includes(status) && (!exceptionSummary || !verifier)) { error.textContent = "An exception or not-applicable decision needs a privacy-safe reason and an authorised verifier."; error.hidden = false; return; }
    state.records[task.id] = { ...previous, status, evidenceRef, verifier, sourceChecked, doneWhenConfirmed, dependencyExceptionConfirmed, sourceCheckedAt: sourceChecked ? (previous.sourceCheckedAt || new Date().toISOString()) : "", reviewDate: String(values.get("reviewDate") || ""), exceptionSummary, stepChecks: previous.stepChecks || {}, history: [...(previous.history || []), { when: new Date().toISOString(), action: `${statusMeta[status].label} saved` }].slice(-30) };
    const assignment = String(values.get("assignment") || "").trim(); if (assignment) state.assignments[task.id] = assignment; else delete state.assignments[task.id];
    saveState(); taskDialog.close(); render(); toast(status === "verified" ? "Task verified with a safe record reference" : "Task progress saved");
  }

  function openSettings() {
    settingsContent.innerHTML = `<header class="dialog-head"><div><p class="eyebrow">Local workspace setup</p><h2 id="settings-title">Pace, role and approved links</h2></div><button class="dialog-close" type="button" data-action="close-settings" aria-label="Close settings">×</button></header><div class="dialog-body"><form id="settings-form"><section class="settings-section"><h3>How this browser should open</h3><div class="form-grid"><label><span>Default pace</span><select name="experience"><option value="guided" ${state.experience === "guided" ? "selected" : ""}>One step at a time</option><option value="full" ${state.experience === "full" ? "selected" : ""}>Fast workboard</option></select></label><label><span>Default role view</span><select name="role">${roleOptions(state.role)}</select></label><label class="check-line span-two"><input name="guidance" type="checkbox" ${state.guidance ? "checked" : ""}><span>Keep plain-English guidance available inside tasks.</span></label></div></section><section class="settings-section"><h3>Current staff launch links</h3><p>Confirmed staff front doors are built into this workboard. Sign-in and permissions still apply. If an approved route changes, paste a replacement for this browser; clearing it restores the built-in route.</p><div class="link-form-list">${data.systems.filter(system => system.kind === "private").map(system => `<label><span>${esc(system.label)}</span><input name="link:${esc(system.id)}" type="url" value="${esc(state.links[system.id] || system.url || "")}" placeholder="https://…"><small>${esc(system.purpose)}</small></label>`).join("")}</div></section><aside class="settings-warning"><strong>Role assignments remain provisional</strong><p>Formal Principal delegation and the Coordinator/Assistant split have not yet been verified. Individual tasks can be assigned to roles, but this browser does not create authority.</p></aside><div class="dialog-actions"><button class="button" type="submit">Save workspace setup</button><button class="button quiet" type="button" data-action="close-settings">Cancel</button></div></form></div>`;
    settingsDialog.showModal();
  }
  function roleOptions(selected) {
    return [["all", "All work"], ["coordinator", "Coordinator"], ["assistant", "Assistant"], ["trainer", "Trainer / assessor"], ["principal", "Principal / delegate"], ["workplace", "Workplace learning"], ["nesa", "NESA / data role"]].map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${esc(label)}</option>`).join("");
  }
  function saveSettings(form) {
    const values = new FormData(form); state.experience = String(values.get("experience") || "guided"); state.role = String(values.get("role") || "all"); state.guidance = values.get("guidance") === "on";
    data.systems.filter(system => system.kind === "private").forEach(system => { const proposed = String(values.get(`link:${system.id}`) || "").trim(), builtIn = safeUrl(system.url); if (!proposed || proposed === builtIn) delete state.links[system.id]; else if (safeUrl(proposed)) state.links[system.id] = proposed; });
    saveState(); roleFilter.value = state.role; updateGuidanceToggle(); settingsDialog.close(); render(); toast("Workspace setup saved; confirmed front doors remain built in");
  }
  function updateGuidanceToggle() { const toggle = document.querySelector("[data-action='toggle-guidance']"); toggle.setAttribute("aria-pressed", String(state.guidance)); toggle.querySelector("span:last-child").textContent = state.guidance ? "Guidance on" : "Guidance off"; }
  function toast(message, kind = "info") { const element = document.createElement("div"); element.className = `toast ${kind === "error" ? "is-error" : ""}`; element.textContent = message; toastRegion.appendChild(element); setTimeout(() => element.remove(), 3200); }

  function exportWorkspace() {
    const { links: excludedLinks, ...portableState } = state;
    const payload = { kind: "WWHS-VET-COMPLIANCE-WORKBOARD-BACKUP", schemaVersion: 3, buildId: data.config.buildId, exportedAt: new Date().toISOString(), warning: "Privacy-safe task metadata only. Official evidence remains in authorised systems. Authenticated links are excluded and stay device-local.", excluded: ["authenticated links", "official evidence", "personal information"], state: { ...portableState, schemaVersion: 3, resetArmed: false } };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = `WWHS-VET-workboard-backup-${boardTodayIso}.json`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    state.lastBackup = new Date().toISOString(); saveState(); render(); toast("Privacy-safe workboard backup exported");
  }
  function importWorkspace(file) {
    if (!file) return; const reader = new FileReader();
    reader.onload = () => { try {
      const payload = JSON.parse(String(reader.result || ""));
      if (payload.kind !== "WWHS-VET-COMPLIANCE-WORKBOARD-BACKUP" || payload.schemaVersion !== 3 || payload.buildId !== data.config.buildId || !payload.state || Array.isArray(payload.state) || typeof payload.state !== "object") throw new Error("Unsupported backup");
      const localLinks = { ...state.links }, restored = payload.state;
      state = normaliseState(restored, localLinks);
      saveState(); roleFilter.value = state.role; updateGuidanceToggle(); render(); toast("Workboard backup restored; authenticated links stayed on this device");
    } catch (_) { toast("That backup is unsupported or belongs to a different workboard build", "error"); } };
    reader.readAsText(file);
  }
  function resetWorkspace() {
    if (!state.resetArmed) { state.resetArmed = true; saveState(); render(); toast("Nothing cleared yet. Use the red button again to confirm."); return; }
    localStorage.removeItem(data.config.storageKey); state = freshState(); roleFilter.value = "all"; updateGuidanceToggle(); location.hash = "#today"; render(); toast("Local workboard data cleared");
  }

  function currentView() {
    const view = (location.hash || "#today").slice(1), allowed = ["today", "year", "workflows", "systems", "issues"];
    if (!allowed.includes(view)) { history.replaceState(null, "", "#today"); return "today"; }
    return view;
  }
  function closeNavigation() {
    document.body.classList.remove("nav-open"); document.querySelector(".nav-scrim").hidden = true;
    document.querySelector("[data-action='toggle-nav']")?.setAttribute("aria-expanded", "false");
  }
  function returnDialogFocus(previous) {
    if (!previous) return;
    queueMicrotask(() => {
      if (previous?.isConnected && previous.getClientRects().length) previous.focus();
      else document.getElementById("main-content")?.focus({ preventScroll: true });
    });
  }
  function render(focusMain = false) {
    const view = currentView();
    const showingTitle = view === "today" && titleOpen;
    const showingWelcome = view === "today" && !titleOpen && (startOpen || !state.experience);
    document.body.classList.toggle("is-title", showingTitle);
    document.body.classList.toggle("is-welcome", showingWelcome);
    document.body.classList.toggle("is-guided", view === "today" && !titleOpen && !startOpen && state.experience === "guided");
    document.querySelectorAll(".nav-link, .route-link[data-view]").forEach(link => {
      const active = link.dataset.view === view;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
    if (view === "today") renderToday(); if (view === "year") renderYear(); if (view === "workflows") renderWorkflows(); if (view === "systems") renderSystems(); if (view === "issues") renderIssues();
    closeNavigation();
    if (focusMain) queueMicrotask(() => document.getElementById("main-content")?.focus({ preventScroll: true }));
  }

  document.addEventListener("click", event => {
    const navLink = event.target.closest(".nav-link, .route-link[data-view]");
    if (navLink) { closeNavigation(); if (navLink.hash === location.hash) queueMicrotask(() => document.getElementById("main-content")?.focus({ preventScroll: true })); }
    const target = event.target.closest("[data-action]"); if (!target) return; const action = target.dataset.action;
    if (action === "toggle-nav") { const open = document.body.classList.toggle("nav-open"); target.setAttribute("aria-expanded", String(open)); document.querySelector(".nav-scrim").hidden = !open; }
    if (action === "close-nav") closeNavigation();
    if (action === "toggle-guidance") { state.guidance = !state.guidance; saveState(); updateGuidanceToggle(); toast(state.guidance ? "Plain-English guidance is available inside tasks" : "Guidance hidden for a faster work view"); }
    if (action === "enter-workboard") { titleOpen = false; startOpen = true; render(true); }
    if (action === "choose-experience") { startOpen = false; state.experience = target.dataset.experience; state.guidance = state.experience === "guided"; saveState(); updateGuidanceToggle(); render(); }
    if (action === "open-task") { lastTaskTrigger = target; openTask(target.dataset.taskId); }
    if (action === "open-workflow") { lastTaskTrigger = target; openWorkflow(target.dataset.workflowId); }
    if (action === "close-dialog") taskDialog.close();
    if (action === "open-settings") { if (taskDialog.open) { lastTaskTrigger = null; taskDialog.close(); } lastSettingsTrigger = target; openSettings(); } if (action === "close-settings") settingsDialog.close();
    if (action === "select-phase") { state.selectedPhase = target.dataset.phase; state.yearSearch = ""; saveState(); renderYear(); }
    if (action === "print") window.print(); if (action === "export-workspace") exportWorkspace(); if (action === "import-workspace") document.getElementById("workspace-import")?.click(); if (action === "reset-workspace") resetWorkspace();
  });
  document.addEventListener("change", event => {
    if (event.target === roleFilter) { state.role = roleFilter.value; saveState(); render(); }
    if (event.target.matches("[data-task-step]")) { const id = event.target.dataset.taskId, record = getRecord(id); record.stepChecks = record.stepChecks || {}; record.stepChecks[event.target.dataset.taskStep] = event.target.checked; if (record.status === "not-started" && event.target.checked) record.status = "in-progress"; state.records[id] = record; saveState(); }
    if (event.target.id === "workspace-import") importWorkspace(event.target.files?.[0]);
  });
  document.addEventListener("input", event => {
    if (event.target.id === "year-search") { state.yearSearch = event.target.value; saveState(); const cursor = event.target.selectionStart; renderYear(); const replacement = document.getElementById("year-search"); replacement?.focus(); replacement?.setSelectionRange(cursor, cursor); }
  });
  document.addEventListener("submit", event => {
    if (event.target.id === "task-record-form") { event.preventDefault(); saveTaskForm(event.target, event.submitter?.value || "save"); }
    if (event.target.id === "settings-form") { event.preventDefault(); saveSettings(event.target); }
    if (event.target.matches("[data-gap-form]")) { event.preventDefault(); saveGapForm(event.target); }
  });
  taskDialog.addEventListener("close", () => { const previous = lastTaskTrigger; lastTaskTrigger = null; returnDialogFocus(previous); });
  settingsDialog.addEventListener("close", () => { const previous = lastSettingsTrigger; lastSettingsTrigger = null; returnDialogFocus(previous); });
  window.addEventListener("hashchange", () => { if (currentView() !== "today") { titleOpen = false; startOpen = false; } render(true); });
  roleFilter.innerHTML = roleOptions(state.role); roleFilter.value = state.role; updateGuidanceToggle(); render();
})();
