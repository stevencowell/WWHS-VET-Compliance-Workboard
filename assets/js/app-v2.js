(function () {
  "use strict";

  const data = window.VET_WORKBOARD;
  const register = data.taskRegister;
  const tasks = register.tasks;
  const cycle2027 = data.operatingCycle2027 || data.termOne2027 || { tasks: [], terms: [], gates: [], interruptWorkflows: [], sourceWarnings: [] };
  const cycleTasks = cycle2027.tasks || [];
  const eventTemplates = cycle2027.eventTemplates || [];
  let eventOccurrenceTasks = [];
  let allTasks = [...tasks, ...cycleTasks];
  const route = document.getElementById("route-content");
  const taskDialog = document.getElementById("task-dialog");
  const taskDialogContent = document.getElementById("task-dialog-content");
  const settingsDialog = document.getElementById("settings-dialog");
  const settingsContent = document.getElementById("settings-content");
  const roleFilter = document.getElementById("role-filter");
  const mobileRoleFilter = document.getElementById("mobile-role-filter");
  const toastRegion = document.getElementById("toast-region");
  let boardToday = new Date();
  let boardTodayIso = localIsoDate(boardToday);
  let lastTaskTrigger = null;
  let lastSettingsTrigger = null;
  const directVetEntry = new URLSearchParams(location.search).get("workboard") === "vet";
  let titleOpen = !directVetEntry && ["", "#today"].includes(location.hash);
  let startOpen = directVetEntry;

  const phaseMeta = {
    annual_setup: { short: "Set up", title: "Set up the operating year", description: "Confirm authority, roles, access, the live calendar and delivery intentions before the year gathers speed." },
    term_1: { short: "Term 1", title: "Establish delivery and learner records", description: "Get the School Profile, trainers, courses, learners, evidence systems and workplace learning ready." },
    term_2: { short: "Term 2", title: "Lock data and test delivery quality", description: "Complete core NESA data actions, sample evidence and prepare next-year delivery decisions early." },
    term_3: { short: "Term 3", title: "Reconcile, report and prepare next year", description: "Keep evidence ahead of outcomes, manage placement and HSC milestones, and confirm future delivery authority." },
    term_4: { short: "Term 4", title: "Close outcomes and carry work forward", description: "Meet final NESA milestones, close records and move unresolved actions into a verified handover." },
    continuous: { short: "Ongoing", title: "Run continuous controls", description: "Use a small weekly and termly rhythm to stop issues becoming year-end surprises." },
    event_driven: { short: "If needed", title: "Respond to events and exceptions", description: "Urgent safety, privacy, authority and continuity workflows interrupt the normal sequence when required." },
    term1_2027: { short: "2027 Term 1", title: "Run the 2027 operating cycle", description: "Clear each prerequisite gate, then work through the four terms without carrying old deadlines forward." },
    term2_2027: { short: "2027 Term 2", title: "Run the mid-year controls", description: "Reconcile data, reports and the hard 30 June Stage 6 entry control from current sources." },
    term3_2027: { short: "2027 Term 3", title: "Run HSC and progressive-outcome controls", description: "Keep evidence, outcomes, workplace learning and HSC actions in their verified sequence." },
    term4_2027: { short: "2027 Term 4", title: "Close the year safely", description: "Finalise outcomes, records, assurance and a clean 2028 handover." },
    annual_2027: { short: "2027 annual gate", title: "Activate the year", description: "Confirm sources, authority, roles and delivery before Term 1 opens." },
    continuous_2027: { short: "2027 interrupt", title: "Respond to a live event", description: "Act safely now and keep the owner-system evidence trail." }
  };

  const roleMatchers = {
    htvet: ["head teacher vet"],
    coordinator: ["vet coordinator"], assistant: ["assistant"], trainer: ["trainer", "assessor"],
    principal: ["principal", "authorised delegate"], workplace: ["workplace learning", "wpsp"], nesa: ["nesa", "schools online"]
  };
  const workRoles = ["Head Teacher VET", "VET Coordinator", "VET Coordinator Assistant", "Trainer/assessor", "Principal or delegate", "Workplace learning coordinator", "Authorised NESA staff", "RTO/VSO support"];

  const sourceAliases = {
    "NESA-TOA": "NESA-TOA-2026-MAY", "NESA-TOA-2026": "NESA-TOA-2026-MAY",
    "NESA-CHECKS-SOP-2025": "WWHS-NESA-CHECKS-SOP-2025", "WWHS-AUDIT-CHECKLIST": "WWHS-INTERNAL-AUDIT",
    "WWHS-CROSSCHECK-TEMPLATE": "WWHS-CROSSCHECK", "WWHS-USI-PROCEDURE": "WWHS-USI-LOCAL"
  };

  const exactSystemIds = {
    "vet schools hub": "vet-schools-hub", "rto document library": "document-library", "evidence central": "evidence-central",
    "evidence central as applicable": "evidence-central", "nesa schools online": "schools-online", "nesa schools online as applicable": "schools-online",
    "my vet workplace": "my-vet-workplace", "go2workplacement": "go2workplacement", "lln robot": "lln-robot", "evet portal": "evet-portal",
    "approved workplace-learning system": "placement-provider-portal", "work-placement provider portal": "placement-provider-portal",
    "nesa timetable of actions": "nesa-toa", "training.gov.au": "tga", "school class/pxp system": "sentral", "approved markbook": "sentral",
    "school reporting system": "sentral", "school timetable system": "sentral", "approved school timetable/records": "sentral",
    "approved school calendar": "wwhs-drive", "approved school document repository": "wwhs-drive", "approved team action record": "wwhs-drive",
    "approved team record": "wwhs-drive", "approved school records": "wwhs-drive", "approved staff handover record": "wwhs-drive",
    "approved school finance system": "finance-system", "sbar": "finance-system"
  };

  const taskSystemFallbacks = {
    "t3-07-exit-survey": ["vet-schools-hub", "wwhs-drive"],
    "e-06-discrepancy-corrective-action": ["document-library", "wwhs-drive"]
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
    activeCycle: "", cycle2027Mode: "guided", selected2027Term: 1, selected2027Week: 0,
    term1Mode: "guided", selectedTerm1Week: 0, eventOccurrences: [],
    linkDefaultsVersion: 2, links: {}, records: {}, statuses: {}, assignments: {}, weekly: {}, gaps: {}, resetArmed: false, lastBackup: ""
  };
  let state = loadState();

  function freshState() {
    return { ...defaultState, links: {}, records: {}, statuses: {}, assignments: {}, weekly: {}, gaps: {}, eventOccurrences: [] };
  }
  function localIsoDate(value) {
    return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, "0"), String(value.getDate()).padStart(2, "0")].join("-");
  }
  function refreshBoardDate() {
    const next = new Date(), nextIso = localIsoDate(next), changed = nextIso !== boardTodayIso;
    boardToday = next; boardTodayIso = nextIso;
    return changed;
  }
  function boundedString(value, length = 500) { return String(value || "").slice(0, length); }
  function safeIsoDate(value) { const text = boundedString(value, 10); return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(`${text}T12:00:00`)) ? text : ""; }
  function safeTimestamp(value) { const text = boundedString(value, 40); return text && !Number.isNaN(Date.parse(text)) ? text : ""; }
  function safeObject(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
  function occurrenceTask(item) {
    const template = eventTemplates.find(task => task.id === item.templateId);
    if (!template) return null;
    const started = new Date(item.createdAt);
    const startedLabel = Number.isNaN(started.getTime()) ? "time to confirm" : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(started);
    return {
      ...template,
      id: item.id,
      occurrenceTemplate: false,
      occurrenceOf: template.id,
      workflowId: item.workflowId,
      createdAt: item.createdAt,
      term: item.term,
      cycle: "2027-cycle",
      timing: `${template.timing} · occurrence started ${startedLabel}`
    };
  }
  function sanitiseEventOccurrences(value) {
    const input = Array.isArray(value) ? value.slice(-100) : [], seen = new Set(), output = [];
    input.forEach(raw => {
      const item = safeObject(raw), id = boundedString(item.id, 180), templateId = boundedString(item.templateId, 120), workflowId = boundedString(item.workflowId, 80), createdAt = boundedString(item.createdAt, 40);
      const term = Number(item.term);
      if (!/^2027-event-[a-z0-9-]+-[a-z0-9]+$/i.test(id) || seen.has(id) || !eventTemplates.some(task => task.id === templateId) || !cycle2027.interruptWorkflows.includes(workflowId) || Number.isNaN(Date.parse(createdAt))) return;
      seen.add(id); output.push({ id, templateId, workflowId, createdAt, term: Number.isInteger(term) && term >= 1 && term <= 4 ? term : 1 });
    });
    return output;
  }
  function refreshAllTasks(occurrences = []) {
    eventOccurrenceTasks = occurrences.map(occurrenceTask).filter(Boolean);
    allTasks = [...tasks, ...cycleTasks, ...eventOccurrenceTasks];
  }
  function sanitiseHistory(value) {
    return (Array.isArray(value) ? value : []).slice(-30).map(raw => ({
      when: boundedString(safeObject(raw).when, 40),
      action: boundedString(safeObject(raw).action, 240)
    })).filter(item => item.when && !Number.isNaN(Date.parse(item.when)) && item.action);
  }
  function sanitiseAssignments(value) {
    const input = safeObject(value), known = new Set(allTasks.map(task => task.id));
    return Object.fromEntries(Object.entries(input).filter(([id]) => known.has(id)).map(([id, role]) => [id, boundedString(role, 100)]).filter(([, role]) => workRoles.includes(role)));
  }
  function sanitiseRecords(value) {
    const input = safeObject(value), result = {};
    allTasks.forEach(task => {
      const raw = safeObject(input[task.id]);
      if (!Object.keys(raw).length) return;
      const record = {
        status: statusMeta[raw.status] ? raw.status : "not-started",
        evidenceRef: boundedString(raw.evidenceRef), verifier: boundedString(raw.verifier, 120),
        sourceChecked: raw.sourceChecked === true, doneWhenConfirmed: raw.doneWhenConfirmed === true,
        independentVerifierConfirmed: raw.independentVerifierConfirmed === true,
        dependencyExceptionConfirmed: raw.dependencyExceptionConfirmed === true,
        sourceCheckedAt: safeTimestamp(raw.sourceCheckedAt), reviewDate: safeIsoDate(raw.reviewDate),
        escalationDate: safeIsoDate(raw.escalationDate), waitingForRole: workRoles.includes(raw.waitingForRole) ? raw.waitingForRole : "",
        handoffTo: workRoles.includes(raw.handoffTo) ? raw.handoffTo : "", handoffState: ["none", "sent", "accepted", "returned", "verified"].includes(raw.handoffState) ? raw.handoffState : "none",
        exceptionSummary: boundedString(raw.exceptionSummary), stepChecks: {}, history: sanitiseHistory(raw.history)
      };
      (task.actionSteps || []).forEach((_, index) => { if (safeObject(raw.stepChecks)[index] === true || safeObject(raw.stepChecks)[String(index)] === true) record.stepChecks[index] = true; });
      const allStepsComplete = (task.actionSteps || []).every((_, index) => record.stepChecks[index] === true || record.stepChecks[String(index)] === true);
      const independentVerified = !task.independentVerificationRequired || record.independentVerifierConfirmed === true;
      const hasVerifiedTrail = Boolean(String(record.evidenceRef || "").trim() && String(record.verifier || "").trim() && record.sourceChecked === true && record.doneWhenConfirmed === true && allStepsComplete && independentVerified);
      if (record.status === "verified" && !hasVerifiedTrail) record.status = "in-progress";
      if (record.status === "exception" && !(record.exceptionSummary && record.verifier && record.waitingForRole && record.reviewDate && (task.priority !== "critical" || record.escalationDate))) record.status = "in-progress";
      if (record.status === "waiting" && !(record.waitingForRole && record.reviewDate && (task.priority !== "critical" || record.escalationDate))) record.status = "in-progress";
      if (record.status === "not-applicable" && !(String(record.exceptionSummary || "").trim() && String(record.evidenceRef || "").trim() && String(record.verifier || "").trim() && record.sourceChecked === true && independentVerified)) record.status = "in-progress";
      if (["verified", "not-applicable"].includes(record.status) && is2027Task(task) && task.windowStart && boardTodayIso < task.windowStart) record.status = "in-progress";
      if (["verified", "not-applicable"].includes(record.status) && task.lateMode === "exception-only" && task.windowEnd && boardTodayIso > task.windowEnd && (!record.sourceCheckedAt || record.sourceCheckedAt.slice(0, 10) > task.windowEnd)) record.status = "in-progress";
      result[task.id] = record;
    });
    let changed;
    do {
      changed = false;
      allTasks.forEach(task => {
        const record = result[task.id];
        if (!record || !["verified", "not-applicable"].includes(record.status)) return;
        const unresolved = (task.dependencies || []).filter(id => !taskById(id) || !["verified", "not-applicable"].includes(result[id]?.status));
        const missing = (task.dependencies || []).some(id => !taskById(id)) || (task.hardDependencies || []).some(id => !taskById(id));
        const hardOpen = (task.hardDependencies || []).some(id => !taskById(id) || !["verified", "not-applicable"].includes(result[id]?.status));
        const hasOpenDependency = task.dependencyMode !== "follow-up" && unresolved.length > 0;
        const authorisedVerifiedBypass = record.status === "verified" && record.dependencyExceptionConfirmed === true && record.exceptionSummary;
        if ((hardOpen || hasOpenDependency) && (missing || hardOpen || !authorisedVerifiedBypass)) { record.status = "in-progress"; changed = true; }
        const earlierGateOpen = is2027Task(task) && task.gate && task.lane !== "interrupt" && cycleTasks.some(item => item.gate && item.gate < task.gate && !["verified", "not-applicable"].includes(result[item.id]?.status));
        if (earlierGateOpen) { record.status = "in-progress"; changed = true; }
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
      result[gap.id] = { status: gatedStatus, reference: boundedString(raw.reference), verifier: boundedString(raw.verifier, 120), sourceChecked: raw.sourceChecked === true, updatedAt: safeTimestamp(raw.updatedAt) };
    });
    return result;
  }
  function normaliseState(saved, deviceLinks) {
    const input = safeObject(saved), allowedRoles = new Set(["all", "htvet", "coordinator", "assistant", "trainer", "principal", "workplace", "nesa"]);
    const savedLinks = input.linkDefaultsVersion === 2 ? safeObject(input.links) : {};
    const eventOccurrences = sanitiseEventOccurrences(input.eventOccurrences);
    refreshAllTasks(eventOccurrences);
    return {
      ...freshState(), schemaVersion: 3, linkDefaultsVersion: 2,
      role: allowedRoles.has(input.role) ? input.role : "all",
      guidance: input.guidance === true,
      experience: ["", "guided", "full"].includes(input.experience) ? input.experience : "",
      selectedPhase: input.selectedPhase in phaseMeta ? input.selectedPhase : "term_3",
      yearSearch: boundedString(input.yearSearch, 120),
      activeCycle: ["", "2026", "2027"].includes(input.activeCycle) ? input.activeCycle : "",
      cycle2027Mode: ["guided", "full"].includes(input.cycle2027Mode) ? input.cycle2027Mode : (["guided", "full"].includes(input.term1Mode) ? input.term1Mode : "guided"),
      selected2027Term: [1, 2, 3, 4].includes(Number(input.selected2027Term)) ? Number(input.selected2027Term) : 1,
      selected2027Week: Number.isInteger(Number(input.selected2027Week ?? input.selectedTerm1Week)) && Number(input.selected2027Week ?? input.selectedTerm1Week) >= 0 && Number(input.selected2027Week ?? input.selectedTerm1Week) <= 11 ? Number(input.selected2027Week ?? input.selectedTerm1Week) : 0,
      term1Mode: ["guided", "full"].includes(input.term1Mode) ? input.term1Mode : "guided",
      selectedTerm1Week: Number.isInteger(Number(input.selectedTerm1Week)) && Number(input.selectedTerm1Week) >= 0 && Number(input.selectedTerm1Week) <= 10 ? Number(input.selectedTerm1Week) : 0,
      links: Object.fromEntries(Object.entries(safeObject(deviceLinks === undefined ? savedLinks : deviceLinks)).map(([id, url]) => [boundedString(id, 80), safeUrl(url)]).filter(([id, url]) => url && data.systems.some(system => system.id === id))),
      eventOccurrences, records: sanitiseRecords(input.records), assignments: sanitiseAssignments(input.assignments),
      weekly: {}, gaps: sanitiseGaps(input.gaps), resetArmed: false,
      lastBackup: safeTimestamp(input.lastBackup)
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
  function is2027Task(task) { return Boolean(task && (task.operatingYear === 2027 || /^2027-/.test(task.id || ""))); }
  function sourceFor(id, task) {
    if (is2027Task(task) && cycle2027.sourceFamilies?.[id]) return cycle2027.sourceFamilies[id];
    return data.sources.find(source => source.id === (sourceAliases[id] || id)) || null;
  }
  function taskById(id) { return allTasks.find(task => task.id === id) || null; }
  function dependencyState(task) {
    if (task.dependencyMode === "follow-up") return { open: [], hardOpen: [], missing: [] };
    const hard = new Set(task.hardDependencies || []), open = [], hardOpen = [], missing = [];
    (task.dependencies || []).forEach(id => {
      const dependency = taskById(id);
      if (!dependency) { missing.push(id); if (hard.has(id)) hardOpen.push({ id, title: `Missing prerequisite: ${id}`, missing: true }); return; }
      if (!isClosed(dependency)) (hard.has(id) ? hardOpen : open).push(dependency);
    });
    (task.hardDependencies || []).filter(id => !(task.dependencies || []).includes(id)).forEach(id => {
      const dependency = taskById(id);
      if (!dependency) { missing.push(id); hardOpen.push({ id, title: `Missing prerequisite: ${id}`, missing: true }); }
      else if (!isClosed(dependency)) hardOpen.push(dependency);
    });
    return { open, hardOpen, missing };
  }
  function openDependencies(task) { const result = dependencyState(task); return [...result.hardOpen, ...result.open]; }
  function openDependenciesForCompletion(task) { return dependencyState(task); }
  function isTaskReady(task) { const result = dependencyState(task); return result.open.length === 0 && result.hardOpen.length === 0 && result.missing.length === 0; }
  function cycleDateState(task) {
    if (!is2027Task(task) || !task.windowStart) return "available";
    if (boardTodayIso < task.windowStart) return "future";
    if (task.windowEnd && boardTodayIso > task.windowEnd && !isClosed(task)) return "overdue";
    return "current";
  }
  function earlier2027GatesComplete(task) {
    if (!task.gate || task.lane === "interrupt") return true;
    return cycleTasks.filter(item => item.gate && item.gate < task.gate).every(isClosed);
  }
  function isCycleTaskReady(task) {
    return isTaskReady(task) && earlier2027GatesComplete(task) && cycleDateState(task) !== "future";
  }
  function isChaseDue(task) {
    const record = getRecord(task.id);
    return Boolean(record.reviewDate && record.reviewDate <= boardTodayIso && ["waiting", "exception", "in-progress"].includes(record.status));
  }
  function isEscalationDue(task) {
    const record = getRecord(task.id);
    return Boolean(record.escalationDate && record.escalationDate <= boardTodayIso && !isClosed(task));
  }
  function isWaitingParked(task) {
    const record = getRecord(task.id);
    return record.status === "waiting" && record.reviewDate && record.reviewDate > boardTodayIso;
  }

  function taskSystems(task) {
    const ids = [];
    (task.systems || []).forEach(label => {
      const id = exactSystemIds[String(label).trim().toLowerCase()];
      if (id && !ids.includes(id)) ids.push(id);
    });
    (taskSystemFallbacks[task.id] || taskSystemFallbacks[task.canonicalTaskId] || []).forEach(id => { if (!ids.includes(id)) ids.push(id); });
    return ids.map(id => data.systems.find(system => system.id === id)).filter(Boolean);
  }
  function effectiveLink(system) { return safeUrl(state.links[system.id]) || safeUrl(system.url); }
  function openSystem(id, trigger) {
    const system = data.systems.find(item => item.id === id);
    if (!system) return;
    const url = effectiveLink(system);
    if (url) { window.open(url, "_blank", "noopener,noreferrer"); return; }
    lastSettingsTrigger = trigger || null;
    openSettings();
    toast(`Add the approved ${system.label} link for this browser`);
  }
  function priorityTasks() { return register.currentPriorities.taskIds.map(taskById).filter(Boolean).filter(roleMatches).filter(task => !isClosed(task)); }
  function guidedQueue() {
    const current = priorityTasks(), targetIds = new Set();
    function addTarget(task) {
      if (!task || targetIds.has(task.id)) return;
      targetIds.add(task.id);
      (task.dependencies || []).forEach(id => addTarget(taskById(id)));
    }
    current.forEach(addTarget);
    const ready = tasks.filter(task => roleMatches(task) && !isClosed(task) && isTaskReady(task) && !isWaitingParked(task));
    const ranked = [...ready].sort((a, b) =>
      Number(getStatus(b) !== "not-started" && b.phase === "event_driven") - Number(getStatus(a) !== "not-started" && a.phase === "event_driven") ||
      Number(isEscalationDue(b)) - Number(isEscalationDue(a)) ||
      Number(isChaseDue(b)) - Number(isChaseDue(a)) ||
      Number(getStatus(b) !== "not-started") - Number(getStatus(a) !== "not-started") ||
      Number(targetIds.has(b.id)) - Number(targetIds.has(a.id)) ||
      Number(["term_3", "continuous"].includes(b.phase)) - Number(["term_3", "continuous"].includes(a.phase)) ||
      priorityRank(a.priority) - priorityRank(b.priority) ||
      String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999"))
    );
    const seen = new Set();
    return ranked.filter(task => task && !seen.has(task.id) && seen.add(task.id));
  }
  function historicalUnconfirmed(task) { return Boolean(task.dueDate && task.dueDate < data.config.operationalStart && getStatus(task) === "not-started"); }
  function priorityRank(value) { return ({ critical: 0, high: 1, medium: 2, low: 3 })[value] ?? 4; }

  function dueBadge(task) {
    if (isEscalationDue(task)) return `<span class="badge overdue">Escalation due</span>`;
    if (isChaseDue(task)) return `<span class="badge overdue">Chase / review due</span>`;
    if (is2027Task(task)) {
      if (task.lane === "interrupt") return `<span class="badge overdue">Active interrupt</span>`;
      if (!task.week) return `<span class="badge local">2027 annual gate</span>`;
      const dateState = cycleDateState(task);
      if (dateState === "future") return `<span class="badge local">Opens ${esc(shortDate(task.windowStart))}</span>`;
      if (dateState === "overdue") return `<span class="badge overdue">T${esc(task.term)} W${esc(task.week)} overdue</span>`;
      return `<span class="badge due">T${esc(task.term)} W${esc(task.week)} current</span>`;
    }
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
    const depState = dependencyState(task), dependencies = [...depState.hardOpen, ...depState.open], future = cycleDateState(task) === "future", earlierGate = is2027Task(task) && !earlier2027GatesComplete(task);
    const blocked = dependencies.length > 0 || future || earlierGate;
    const blockedLabel = depState.missing.length ? "Blocked · prerequisite configuration error" : dependencies.length ? `Blocked · ${dependencies.length} open` : earlierGate ? "Earlier gate open" : future ? `Opens ${shortDate(task.windowStart)}` : "";
    return `<article class="task-card priority-${esc(task.priority)}${compact}${blocked ? " is-blocked" : ""}"><div class="priority-rail" aria-hidden="true"></div><div class="task-main"><div class="task-meta"><span class="badge">${esc(applicabilityLabel(task))}</span>${dueBadge(task)}${blocked ? `<span class="badge blocked">${esc(blockedLabel)}</span>` : ""}${statusPill(task)}</div><h3>${esc(task.title)}</h3>${options.compact ? "" : `<p class="summary">${esc(task.timing)}</p>`}<p class="task-owner">${esc(assignedRole(task))}</p></div><button class="task-action" type="button" data-action="open-task" data-task-id="${esc(task.id)}">${blocked ? future ? "View timing" : "View blockers" : getStatus(task) === "not-started" ? "Start task" : "Open task"}</button></article>`;
  }

  function renderTitle() {
    route.innerHTML = `<section class="title-page operations-gateway"><div class="gateway-panel"><header class="gateway-head"><div class="gateway-emblem" aria-hidden="true">W</div><div><p class="eyebrow">WAGGA WAGGA HIGH SCHOOL</p><h1>Operations workboards</h1><p>One formal front door to two connected areas of responsibility.</p></div></header><div class="gateway-grid" aria-label="Choose a workboard"><article class="gateway-wing gateway-vet"><div class="gateway-wing-top"><span class="gateway-symbol" aria-hidden="true">V</span><p class="eyebrow">VET COMPLIANCE</p></div><h2>VET Compliance Workboard</h2><p>Annual compliance, RTO delivery, evidence, workplace learning and NESA/RTO actions.</p><div class="gateway-actions"><a class="button gateway-action" href="#cycle-2027">Run the full 2027 cycle</a><button class="button secondary gateway-action" type="button" data-action="enter-workboard">Open 2026 reference</button></div></article><article class="gateway-wing gateway-tas"><div class="gateway-wing-top"><span class="gateway-symbol" aria-hidden="true">T</span><p class="eyebrow">HEAD TEACHER TAS</p></div><h2>Head Teacher TAS Workboard</h2><p>Faculty calendar, teaching and reporting, operations, people and safety.</p><a class="button gateway-action" href="head-teacher-tas/">Open Head Teacher TAS</a></article></div><footer class="gateway-foot"><strong>Choose the role you are working in.</strong><span>Each workboard leads to the authorised school systems; neither replaces the official record.</span></footer></div></section>`;
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
    const unresolvedGaps = data.knownGaps.filter(gap => (!gap.operatingYear || gap.operatingYear === 2026) && getGapRecord(gap.id).status !== "resolved").length;
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
  function renderToday() { if (titleOpen) return renderTitle(); if (state.activeCycle === "2027") return renderCycle2027(); if (startOpen || !state.experience) return renderWelcome(); if (state.experience === "guided") return renderGuidedToday(); renderFullToday(); }

  function cycleReadyQueue() {
    return [...eventOccurrenceTasks, ...cycleTasks]
      .filter(task => roleMatches(task) && !isClosed(task) && isCycleTaskReady(task) && !isWaitingParked(task))
      .sort((a, b) =>
        Number(b.lane === "interrupt") - Number(a.lane === "interrupt") ||
        Number(isEscalationDue(b)) - Number(isEscalationDue(a)) ||
        Number(isChaseDue(b)) - Number(isChaseDue(a)) ||
        Number(getStatus(b) !== "not-started") - Number(getStatus(a) !== "not-started") ||
        Number(a.order || 9999) - Number(b.order || 9999)
      );
  }
  function cycleGateState(gate) {
    const gateTasks = cycleTasks.filter(task => task.gate === gate);
    const closed = gateTasks.filter(isClosed).length;
    const ready = gateTasks.some(task => !isClosed(task) && isCycleTaskReady(task) && !isWaitingParked(task));
    return { total: gateTasks.length, closed, complete: gateTasks.length > 0 && closed === gateTasks.length, ready };
  }
  function currentCycleGate(term = null) {
    const gates = cycle2027.gates.filter(item => !term || item.term === term);
    for (const gate of gates) if (!cycleGateState(gate.number).complete) return gate.number;
    return gates.at(-1)?.number || 1;
  }
  function selectedTerm() { return cycle2027.terms.find(term => term.number === state.selected2027Term) || cycle2027.terms[0]; }
  function cycleWeekState(termNumber, number) {
    const weekTasks = cycleTasks.filter(task => task.term === termNumber && task.week === number);
    const closed = weekTasks.filter(isClosed).length;
    if (weekTasks.length && closed === weekTasks.length) return { key: "complete", label: "complete", closed, total: weekTasks.length };
    const week = cycle2027.terms.find(term => term.number === termNumber)?.weeks[number - 1];
    if (week && boardTodayIso < week.start) return { key: "upcoming", label: `opens ${shortDate(week.start)}`, closed, total: weekTasks.length };
    if (week && boardTodayIso > week.end) return { key: "overdue", label: "overdue", closed, total: weekTasks.length };
    if (weekTasks.some(task => !isClosed(task) && isCycleTaskReady(task) && !isWaitingParked(task))) return { key: "ready", label: "current", closed, total: weekTasks.length };
    return { key: "locked", label: "locked", closed, total: weekTasks.length };
  }
  function weekRange(week) { return `${shortDate(week.start)}–${shortDate(week.end)}`; }
  function cycleTermStrip() {
    return `<nav class="cycle-term-strip" aria-label="2027 school terms">${cycle2027.terms.map(term => { const scoped = cycleTasks.filter(task => task.term === term.number || (term.number === 1 && !task.term)), closed = scoped.filter(isClosed).length, selected = state.selected2027Term === term.number; return `<button type="button" class="cycle-term ${selected ? "is-selected" : ""}" data-action="select-cycle-term" data-term="${term.number}" aria-pressed="${selected}"><strong>${esc(term.label)}</strong><small>${closed}/${scoped.length} closed · ${esc(weekRange({ start: term.studentStart, end: term.end }))}</small></button>`; }).join("")}</nav>`;
  }
  function cycleWeekStrip() {
    const term = selectedTerm(), setup = term.number === 1 ? `<button type="button" class="term-week setup-week ${state.selected2027Week === 0 ? "is-selected" : ""}" data-action="select-cycle-week" data-week="0" aria-pressed="${state.selected2027Week === 0}"><strong>Setup</strong><small>Gates 1–2</small></button>` : "";
    return `<nav class="term-week-strip" aria-label="2027 ${esc(term.label)} weeks">${setup}${term.weeks.map(week => { const result = cycleWeekState(term.number, week.number), selected = state.selected2027Week === week.number; return `<button type="button" class="term-week state-${result.key} ${selected ? "is-selected" : ""}" data-action="select-cycle-week" data-week="${week.number}" aria-pressed="${selected}" aria-label="${esc(term.label)} Week ${week.number}, ${result.label}, ${result.closed} of ${result.total} controls verified"><strong>W${week.number}</strong><small>${esc(result.label)}</small></button>`; }).join("")}</nav>`;
  }
  function cycleGateStrip() {
    const gates = cycle2027.gates.filter(item => item.term === state.selected2027Term);
    return `<div class="term-gates" aria-label="2027 ${esc(selectedTerm().label)} gates">${gates.map(gate => { const result = cycleGateState(gate.number), stateLabel = result.complete ? "complete" : result.ready ? "open" : "locked"; return `<div class="term-gate state-${stateLabel}"><span>${gate.number}</span><div><strong>${esc(gate.label)}</strong><small>${result.closed}/${result.total} · ${stateLabel}</small></div></div>`; }).join("")}</div>`;
  }
  function cycleFocusTask(task) {
    if (!task) {
      const nextOpening = cycleTasks.filter(item => roleMatches(item) && !isClosed(item) && isTaskReady(item) && earlier2027GatesComplete(item) && cycleDateState(item) === "future").sort((a, b) => String(a.windowStart).localeCompare(String(b.windowStart)))[0];
      return `<div class="empty-state"><h2>No action is open for this role right now.</h2><p>${nextOpening ? `The next dependency-cleared control opens ${esc(shortDate(nextOpening.windowStart))}.` : "Review the blockers below or switch to All work."} A blocked or future action will not be presented as your next step.</p></div>`;
    }
    const positionLabel = task.lane === "interrupt" ? "Interrupt" : task.week ? `Term ${esc(task.term)} · Week ${esc(task.week)}` : `Annual gate ${esc(task.gate)}`;
    return `<section class="focus-task term-focus"><div class="focus-top"><span class="focus-number">01</span><div><span class="badge">${positionLabel}</span>${isEscalationDue(task) ? `<span class="badge overdue">Escalation due</span>` : isChaseDue(task) ? `<span class="badge overdue">Chase due</span>` : task.lane === "interrupt" ? `<span class="badge overdue">Respond now</span>` : `<span class="badge due">Ready now</span>`}</div></div><h2>${esc(task.title)}</h2><p>${esc(task.timing)}</p><div class="focus-facts term-focus-facts"><span><small>Responsible</small><strong>${esc(assignedRole(task))}</strong></span><span><small>Accountable</small><strong>${esc(accountableRole(task))}</strong></span><span><small>Verifier</small><strong>${esc(verifierRole(task))}</strong></span><span><small>Start in</small><strong>${esc(task.systems?.[0] || "Authorised owner system")}</strong></span></div><div class="term-done-preview"><small>Done when</small><p>${esc(task.doneWhen)}</p></div><button class="button focus-button" type="button" data-action="open-task" data-task-id="${esc(task.id)}">Open this task</button></section>`;
  }
  function cycleBlockers() {
    const gate = currentCycleGate();
    const blocked = cycleTasks.filter(task => task.gate === gate && !isClosed(task) && (!isCycleTaskReady(task) || isWaitingParked(task))).sort((a, b) => a.order - b.order).slice(0, 4);
    if (!blocked.length) return "";
    return `<section class="term-blockers"><div class="section-heading"><div><h2>Blocking this gate</h2><p>Visible for planning—these are not ready to act on yet.</p></div></div>${blocked.map(task => { const dependencies = openDependencies(task), record = getRecord(task.id); const reason = isWaitingParked(task) ? `Waiting for ${record.waitingForRole || "the recorded role/system"}; chase ${shortDate(record.reviewDate)}` : dependencies.length ? `Waiting for ${dependencies.map(item => item.title).join(" · ")}` : cycleDateState(task) === "future" ? `Opens ${shortDate(task.windowStart)}` : "An earlier gate must close first"; return `<article><div><strong>${esc(task.title)}</strong><small>${esc(reason)}</small></div><button class="text-button" type="button" data-action="open-task" data-task-id="${esc(task.id)}">View chain</button></article>`; }).join("")}</section>`;
  }
  function cycleBoundaryNotice() {
    return `<aside class="term-boundary"><div><strong>${esc(cycle2027.state)}</strong><p>${esc(cycle2027.sharedState.message)}</p></div><span>Official evidence stays in owner systems</span></aside>`;
  }
  function cycleSourcePanel() {
    return `<details class="term-source-status"><summary>2027 source status · verification required before activation</summary><div><p>${esc(cycle2027.calendar.basis)}</p><ul>${cycle2027.sourceWarnings.map(warning => `<li>${esc(warning)}</li>`).join("")}</ul><a href="${esc(cycle2027.calendar.sourceUrl)}" target="_blank" rel="noopener">Open published NSW 2027 term dates ↗</a></div></details>`;
  }
  function cycleInterruptPanel() {
    const workflows = cycle2027.interruptWorkflows.map(id => data.workflows.find(item => item.id === id)).filter(Boolean);
    return `<section class="term-interrupt"><div><p class="eyebrow">Interrupt lane</p><h2>Something changed?</h2><p>Safety, privacy, staffing, delivery, enrolment and handover changes do not wait for the normal sequence.</p></div><div>${workflows.map(workflow => `<button type="button" class="button secondary" data-action="open-workflow" data-workflow-id="${esc(workflow.id)}" data-cycle-context="2027-cycle">${esc(workflow.title)}</button>`).join("")}</div></section>`;
  }
  function renderCycleGuided() {
    const ready = cycleReadyQueue(), current = ready[0], upcoming = ready.slice(1, 3), gate = currentCycleGate(), gateState = cycleGateState(gate);
    const focusTerm = current?.term || cycle2027.gates.find(item => item.number === gate)?.term || 1;
    if (state.selected2027Term !== focusTerm) { state.selected2027Term = focusTerm; state.selected2027Week = focusTerm === 1 ? 0 : 1; saveState(); }
    route.innerHTML = `<section class="page term-one-page cycle-2027-page"><header class="page-heading calm-heading"><div><p class="eyebrow">RUN 2027 · FOUR CONTROLLED TERMS</p><h1>Your one safe next action</h1><p>Gate ${gate} of ${cycle2027.gates.length} · ${gateState.closed} of ${gateState.total} controls verified in this gate.</p></div><button class="button quiet compact" type="button" data-action="set-cycle-mode" data-mode="full">Switch to fast term view</button></header>${cycleBoundaryNotice()}${cycleSourcePanel()}${cycleTermStrip()}${cycleFocusTask(current)}${cycleBlockers()}${upcoming.length ? `<section class="coming-next"><div class="section-heading"><div><h2>Also ready</h2><p>These are previews, not permission to skip the first action.</p></div></div>${upcoming.map((task, index) => `<div class="next-row"><span>0${index + 2}</span><div><strong>${esc(task.title)}</strong><small>${esc(task.timing)}</small></div></div>`).join("")}</section>` : ""}${cycleInterruptPanel()}</section>`;
  }
  function renderCycleFull() {
    const term = selectedTerm(), termTasks = cycleTasks.filter(task => task.term === term.number || (term.number === 1 && !task.term));
    const ready = cycleReadyQueue(), waiting = termTasks.filter(task => ["waiting", "exception"].includes(getStatus(task))).length, closed = termTasks.filter(isClosed).length;
    const selectedTasks = termTasks.filter(task => state.selected2027Week === 0 ? !task.week : task.week === state.selected2027Week).filter(roleMatches).sort((a, b) => a.order - b.order);
    const week = term.weeks[state.selected2027Week - 1], selectedLabel = state.selected2027Week === 0 ? "2027 setup and activation" : `${term.label} Week ${state.selected2027Week} · ${week?.theme || "current control point"}`;
    const selectedReady = ready.find(task => (task.term === term.number || (term.number === 1 && !task.term)) && (state.selected2027Week === 0 ? !task.week : task.week === state.selected2027Week));
    route.innerHTML = `<section class="page term-one-page cycle-2027-page"><header class="page-heading"><div><p class="eyebrow">RUN 2027 · ${esc(term.label.toUpperCase())} · ${term.weeks.length} CONTROL POINTS</p><h1>2027 full-year operating cycle</h1><p>One dependency-gated sequence across four terms, separately tracked weekly controls and a visible interrupt lane.</p></div><button class="button quiet compact" type="button" data-action="set-cycle-mode" data-mode="guided">Use one-step view</button></header>${cycleBoundaryNotice()}${cycleTermStrip()}<div class="stats term-stats" aria-label="2027 ${esc(term.label)} summary"><div class="stat is-urgent"><span>Ready now</span><strong>${ready.filter(task => task.term === term.number || (term.number === 1 && !task.term)).length}</strong><small>time and dependency cleared</small></div><div class="stat"><span>Verified / N/A</span><strong>${closed}/${termTasks.length}</strong><small>independent instances</small></div><div class="stat"><span>Waiting / exception</span><strong>${waiting}</strong><small>requires chase owner</small></div><div class="stat is-next"><span>Current gate</span><strong>${currentCycleGate(term.number)}/${cycle2027.gates.length}</strong><small>source-controlled</small></div></div>${cycleSourcePanel()}${cycleGateStrip()}${cycleWeekStrip()}<section class="phase-intro term-selection"><div><p class="eyebrow">Selected control point</p><h2>${esc(selectedLabel)}</h2><p>${state.selected2027Week === 0 ? "Clear the source, people, delivery and activation gates before Week 1 opens." : "Tasks retain their own prerequisites and opening window. Future work stays visible but cannot close early."}</p></div>${selectedReady ? `<button class="button" type="button" data-action="open-task" data-task-id="${esc(selectedReady.id)}">Open ready action in this control point</button>` : ""}</section><div class="task-list term-task-list">${selectedTasks.length ? selectedTasks.map(task => taskCard(task)).join("") : `<div class="empty-state"><h2>No work for this role in the selected control point.</h2><p>Switch role or choose another week.</p></div>`}</div>${cycleInterruptPanel()}</section>`;
  }
  function renderCycle2027() { state.activeCycle = "2027"; if (state.cycle2027Mode === "full") renderCycleFull(); else renderCycleGuided(); }

  function renderYear() {
    if (state.activeCycle === "2027") { renderCycleFull(); return; }
    const selected = state.selectedPhase in phaseMeta ? state.selectedPhase : "term_3";
    const phaseTasks = tasks.filter(task => task.phase === selected && roleMatches(task)).filter(task => !state.yearSearch || taskSearchText(task).includes(state.yearSearch.toLowerCase()));
    const done = phaseTasks.filter(isClosed).length;
    route.innerHTML = `<section class="page"><header class="page-heading"><div><p class="eyebrow">One phase at a time</p><h1>Year plan</h1><p>The ${tasks.length}-action register stays underneath. This page opens only one part of the year so new staff can see the sequence without facing the whole minefield.</p></div><div class="date-block"><strong>${done}/${phaseTasks.length} closed</strong><span>${esc(phaseMeta[selected].short)}</span></div></header><nav class="phase-nav" aria-label="Annual workflow phases">${register.phaseOrder.map(phase => `<button type="button" class="phase-button ${phase === selected ? "is-current" : ""}" data-action="select-phase" data-phase="${phase}"><span>${esc(phaseMeta[phase].short)}</span><small>${tasks.filter(task => task.phase === phase).length}</small></button>`).join("")}</nav><section class="phase-intro"><div><p class="eyebrow">${esc(phaseMeta[selected].short)}</p><h2>${esc(phaseMeta[selected].title)}</h2><p>${esc(phaseMeta[selected].description)}</p></div><label class="search-field"><span>Find in this phase</span><input id="year-search" type="search" value="${esc(state.yearSearch)}" placeholder="e.g. USI, trainer, reports"></label></section><div class="phase-status-line"><span>${phaseTasks.length} actions in sequence</span><span>${done} verified or not applicable</span><span>${phaseTasks.filter(historicalUnconfirmed).length} earlier milestones need status confirmation</span></div><div class="task-list year-task-list">${phaseTasks.length ? phaseTasks.map(task => taskCard(task, { compact: true })).join("") : `<div class="empty-state"><h2>No matching work in this phase.</h2><p>Clear the search or choose another role.</p></div>`}</div></section>`;
  }
  function taskSearchText(task) { return [task.title, task.timing, task.trigger, task.dueAuthority, ...(task.actionSteps || []), ...(task.systems || [])].join(" ").toLowerCase(); }

  function renderWorkflows() {
    const groups = ["Most used", "Learner pathway", "Planning", "Urgent", "Continuity"];
    const context = state.activeCycle === "2027" ? "2027-cycle" : "";
    route.innerHTML = `<section class="page"><header class="page-heading"><div><p class="eyebrow">Start from the situation · ${context ? "2027 cycle" : "2026 reference"}</p><h1>Workflows</h1><p>Choose what is happening. Each workflow pulls together relevant ${context ? "2027 instances" : "canonical reference actions"}; it does not create another checklist.</p></div></header><section class="urgent-strip"><div><strong>Something has gone wrong?</strong><span>Safety, privacy and unauthorised delivery do not wait for the annual sequence.</span></div><button type="button" class="button urgent-button" data-action="open-workflow" data-workflow-id="safety-incident" data-cycle-context="${context}">Open urgent response</button></section>${groups.map(group => { const items = data.workflows.filter(workflow => workflow.group === group); return items.length ? `<section class="workflow-group"><div class="section-heading"><div><h2>${esc(group)}</h2></div></div><div class="workflow-grid">${items.map(workflow => `<article class="workflow-card ${group === "Urgent" ? "is-urgent" : ""}"><p class="eyebrow">${esc(workflow.trigger)}</p><h3>${esc(workflow.title)}</h3><p>${esc(workflow.summary)}</p><button type="button" class="button secondary" data-action="open-workflow" data-workflow-id="${esc(workflow.id)}" data-cycle-context="${context}">Open workflow</button></article>`).join("")}</div></section>` : ""; }).join("")}</section>`;
  }
  function workflowTasks(workflow) {
    if (workflow.taskIds?.length) return workflow.taskIds.map(taskById).filter(Boolean);
    return tasks.filter(task => roleMatches(task) && workflow.keywords.some(keyword => taskSearchText(task).includes(keyword))).sort((a, b) => Number(isClosed(a)) - Number(isClosed(b)) || priorityRank(a.priority) - priorityRank(b.priority)).slice(0, 10);
  }
  function cycleWorkflowParts(workflow) {
    const canonicalIds = new Set(workflow.taskIds || []), mapped = [];
    canonicalIds.forEach(canonicalId => {
      cycleTasks.filter(task => task.canonicalTaskId === canonicalId).forEach(task => { if (!mapped.some(item => item.id === task.id)) mapped.push(task); });
    });
    const templates = eventTemplates.filter(template => canonicalIds.has(template.canonicalTaskId));
    const occurrences = eventOccurrenceTasks.filter(task => task.workflowId === workflow.id);
    const termScoped = mapped.filter(task => !task.term || task.term === state.selected2027Term);
    const selectedWeek = state.selected2027Week || 1;
    const scopedMapped = workflow.id === "weekly-control" ? termScoped.filter(task => !task.week || task.week === selectedWeek) : termScoped;
    return {
      mapped: scopedMapped.filter(roleMatches).sort((a, b) => Number(isClosed(a)) - Number(isClosed(b)) || a.order - b.order).slice(0, 24),
      templates: templates.filter(roleMatches),
      occurrences: occurrences.filter(task => task.term === state.selected2027Term).filter(roleMatches).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    };
  }
  function workflowTaskButtons(related) {
    return related.map((task, index) => `<button type="button" class="workflow-task" data-action="open-task" data-task-id="${esc(task.id)}"><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${esc(task.title)}</strong><small>${esc(statusMeta[getStatus(task)].label)} · ${esc(task.timing)}</small></div></button>`).join("");
  }
  function openWorkflow(id, cycleContext = "") {
    const workflow = data.workflows.find(item => item.id === id); if (!workflow) return;
    if (cycleContext === "2027-cycle") {
      const parts = cycleWorkflowParts(workflow);
      taskDialogContent.innerHTML = `<header class="dialog-head"><div><p class="eyebrow">2027 INTERRUPT · TERM ${state.selected2027Term} · ${esc(workflow.trigger)}</p><h2 id="task-dialog-title">${esc(workflow.title)}</h2></div><button class="dialog-close" type="button" data-action="close-dialog" aria-label="Close workflow">×</button></header><div class="dialog-body"><p class="dialog-lead">${esc(workflow.summary)}</p><section class="gate-box"><strong>Safe completion gate</strong><p>${esc(workflow.gate)}</p></section>${parts.templates.length ? `<section class="dialog-section"><h3>Start a separate occurrence</h3><p>Use a fresh record every time this happens. Personal, learner and incident details stay in the authorised owner system.</p><div class="workflow-task-list">${parts.templates.map((template, index) => `<button type="button" class="workflow-task" data-action="start-event-occurrence" data-template-id="${esc(template.id)}" data-workflow-id="${esc(workflow.id)}"><span>+${index + 1}</span><div><strong>${esc(template.title)}</strong><small>Creates a new privacy-safe 2027 occurrence in Term ${state.selected2027Term}</small></div></button>`).join("")}</div></section>` : ""}${parts.occurrences.length ? `<section class="dialog-section"><h3>Open 2027 occurrences</h3><div class="workflow-task-list">${workflowTaskButtons(parts.occurrences)}</div></section>` : ""}${parts.mapped.length ? `<section class="dialog-section"><h3>Current-cycle controls to re-open</h3><p>These are the 2027 instances—not the old 2026 records.</p><div class="workflow-task-list">${workflowTaskButtons(parts.mapped)}</div></section>` : ""}</div>`;
      taskDialog.showModal();
      return;
    }
    const related = workflowTasks(workflow);
    taskDialogContent.innerHTML = `<header class="dialog-head"><div><p class="eyebrow">${esc(workflow.trigger)}</p><h2 id="task-dialog-title">${esc(workflow.title)}</h2></div><button class="dialog-close" type="button" data-action="close-dialog" aria-label="Close workflow">×</button></header><div class="dialog-body"><p class="dialog-lead">${esc(workflow.summary)}</p><section class="gate-box"><strong>Safe completion gate</strong><p>${esc(workflow.gate)}</p></section><section class="dialog-section"><h3>Actions in this workflow</h3><div class="workflow-task-list">${related.map((task, index) => `<button type="button" class="workflow-task" data-action="open-task" data-task-id="${esc(task.id)}"><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${esc(task.title)}</strong><small>${esc(statusMeta[getStatus(task)].label)} · ${esc(task.timing)}</small></div></button>`).join("") || `<p>No matching action is available for the current role filter.</p>`}</div></section></div>`;
    taskDialog.showModal();
  }
  function createEventOccurrence(templateId, workflowId) {
    const template = eventTemplates.find(task => task.id === templateId);
    if (!template || !cycle2027.interruptWorkflows.includes(workflowId)) return;
    const createdAt = new Date().toISOString();
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const item = { id: `2027-event-${template.canonicalTaskId}-${suffix}`, templateId, workflowId, createdAt, term: state.selected2027Term };
    state.eventOccurrences = [...(state.eventOccurrences || []), item].slice(-100);
    refreshAllTasks(state.eventOccurrences);
    saveState(); render();
    openTask(item.id);
    toast("A fresh 2027 event occurrence is ready; keep protected details in the owner system");
  }

  function renderSystems() {
    const groups = [...new Set(data.systems.map(system => system.group))];
    const sources = sourceLibraryItems();
    route.innerHTML = `<section class="page"><header class="page-heading"><div><p class="eyebrow">Open the right place first · ${state.activeCycle === "2027" ? "2027 cycle" : "2026 reference"}</p><h1>Systems &amp; sources</h1><p>Plain-language launch points for the authorised systems that own the work. Verified front doors are built in; local-only routes stay on this browser and sign-in still applies.</p></div><button class="button" type="button" data-action="open-settings">Review staff links</button></header><aside class="notice compact-notice"><span class="notice-icon" aria-hidden="true">i</span><div><strong>Signed-in work account required</strong><p>Before acting, confirm the authorised education account and the current source version. A familiar saved link can still be stale.</p></div></aside>${headTeacherGuidePanel()}${groups.map(group => { const items = data.systems.filter(system => system.group === group && !system.hideCard && (!system.showWhenReady || effectiveLink(system))); return items.length ? `<section class="system-group"><div class="section-heading"><div><h2>${esc(group)}</h2></div></div><div class="system-cards">${items.map(systemCard).join("")}</div></section>` : ""; }).join("")}<details class="source-library"><summary>Open the ${state.activeCycle === "2027" ? "current-cycle" : "reference"} authority and source register <span>${sources.length} mapped sources</span></summary><div class="source-list">${sources.map(sourceCard).join("")}</div></details></section>`;
  }
  function sourceLibraryItems() {
    if (state.activeCycle !== "2027") return data.sources;
    const ids = [...new Set([...cycleTasks, ...eventTemplates].flatMap(task => task.sourceIds || []))], seen = new Set(), output = [];
    ids.forEach(id => {
      const item = sourceFor(id, { operatingYear: 2027 });
      if (!item) return;
      const key = item.url || item.title;
      if (seen.has(key)) return;
      seen.add(key);
      output.push({ id, owner: item.owner || "Current authoritative owner", access: item.access || (item.url ? "current launch point" : "controlled"), verified: item.verified || "verify live for 2027", ...item });
    });
    return output;
  }
  function headTeacherGuidePanel() {
    const guide = data.coordinatorReferenceGuide;
    if (!guide?.sections?.length) return "";
    const system = data.systems.find(item => item.id === "head-teacher-guide");
    const ready = system && Boolean(effectiveLink(system));
    return `<details class="reference-map"><summary><span>${esc(guide.title)}</span><small>${guide.sections.length} sections mapped · opens only when needed</small></summary><div class="reference-map-body"><div class="reference-map-intro"><div><p>${esc(guide.description)}</p><small><strong>Direct staff reference:</strong> opens the guide at the requested heading. Access follows the current Google sharing settings; the sharing review remains open.</small></div><button class="button ${ready ? "secondary" : "quiet"}" type="button" data-action="open-system" data-system-id="head-teacher-guide">${ready ? "Open reference guide ↗" : "Set private staff link"}</button></div><div class="reference-section-list">${guide.sections.map(section => `<article class="reference-section-row"><span class="reference-section-code">${esc(section.code)}</span><div><h3>${esc(section.title)}</h3><p>${esc(section.covered)}</p><small><strong>Keep in the reference guide:</strong> ${esc(section.keep)}</small><nav aria-label="${esc(section.title)} workboard destinations">${section.links.map(([label, href]) => `<a href="${esc(href)}">${esc(label)}</a>`).join("")}</nav></div></article>`).join("")}</div></div></details>`;
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
    const operatingYear = state.activeCycle === "2027" ? 2027 : 2026;
    const visibleGaps = data.knownGaps.filter(gap => !gap.operatingYear || gap.operatingYear === operatingYear), visibleAlerts = data.alerts.filter(alert => !alert.operatingYear || alert.operatingYear === operatingYear);
    const counts = visibleGaps.reduce((result, gap) => { const value = getGapRecord(gap.id).status; result[value] = (result[value] || 0) + 1; return result; }, {});
    route.innerHTML = `<section class="page"><header class="page-heading"><div><p class="eyebrow">Keep uncertainty visible · ${operatingYear}</p><h1>Issues &amp; handover</h1><p>A gap is safer when it has an owner and next action. Detailed learner, staff, incident and evidence records stay in their authorised systems.</p></div></header><div class="issue-summary"><span><strong>${counts.unconfirmed || 0}</strong> unconfirmed</span><span><strong>${counts["in-progress"] || 0}</strong> being resolved</span><span><strong>${counts.resolved || 0}</strong> resolved</span></div><section class="alerts-section"><div class="section-heading"><div><h2>Changes and conflicts to act on</h2><p>These are source-control warnings, not background reading.</p></div></div><div class="alert-list">${visibleAlerts.map(alert => `<article class="alert-card level-${esc(alert.level)}"><span>${alert.level === "high" ? "Act" : "Watch"}</span><div><h3>${esc(alert.title)}</h3><p>${esc(alert.detail)}</p></div></article>`).join("")}</div></section><section class="gaps-section"><div class="section-heading"><div><h2>Authority and setup gaps</h2><p>Update status here; keep the detailed action trail in the approved team system.</p></div></div><div class="gap-list">${visibleGaps.map(gapCard).join("")}</div></section>${handoverPanel()}</section>`;
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
    const scopedTasks = state.activeCycle === "2027" ? cycleTasks : tasks;
    const closed = scopedTasks.filter(isClosed).length, active = scopedTasks.filter(task => !isClosed(task) && getStatus(task) !== "not-started").length;
    return `<section class="handover-panel"><div><p class="eyebrow">Continuity</p><h2>Handover and backup</h2><p>Export privacy-safe workboard metadata before changing devices or roles. This file is not a substitute for official records or a shared team database.</p><div class="handover-stats"><span>${closed} closed actions</span><span>${active} active actions</span><span>${state.lastBackup ? `Last backup ${esc(shortDate(state.lastBackup.slice(0, 10)))}` : "No backup recorded"}</span></div></div><div class="handover-actions"><button class="button" type="button" data-action="export-workspace">Export workboard</button><button class="button secondary" type="button" data-action="import-workspace">Restore backup</button><input id="workspace-import" type="file" accept="application/json" hidden><button class="button quiet" type="button" data-action="print">Print summary</button><button class="button danger-quiet" type="button" data-action="reset-workspace">${state.resetArmed ? "Confirm clear local data" : "Clear local data"}</button></div></section>`;
  }

  function openTask(id) {
    const task = taskById(id); if (!task) return;
    const record = getRecord(task.id), systems = taskSystems(task), sources = (task.sourceIds || []).map(idValue => ({ id: idValue, item: sourceFor(idValue, task) }));
    const dependencies = (task.dependencies || []).map(dependencyId => taskById(dependencyId) || { id: dependencyId, title: `Missing prerequisite configuration: ${dependencyId}`, missing: true });
    const guidanceOpen = state.guidance || state.experience === "guided";
    taskDialogContent.innerHTML = `<header class="dialog-head"><div><p class="eyebrow">${esc(phaseMeta[task.phase]?.short || task.phase)} · ${esc(applicabilityLabel(task))}</p><h2 id="task-dialog-title">${esc(task.title)}</h2></div><button class="dialog-close" type="button" data-action="close-dialog" aria-label="Close task">×</button></header><div class="dialog-body"><div class="task-facts"><div class="fact"><span>When</span><strong>${esc(task.dueDate ? longDate(task.dueDate) : task.timing)}</strong></div><div class="fact"><span>Accountable</span><strong>${esc(accountableRole(task))}</strong></div><div class="fact"><span>Doer</span><strong>${esc(assignedRole(task))}</strong></div><div class="fact"><span>Expected verifier</span><strong>${esc(verifierRole(task))}</strong></div></div>${authorityPanel(task)}${dependencies.length ? dependencyPanel(dependencies, task.dependencyMode) : ""}<section class="dialog-section"><h3>Do this</h3><ol class="step-list">${(task.actionSteps || []).map((step, index) => `<li><label><input type="checkbox" data-task-step="${index}" data-task-id="${esc(task.id)}" ${record.stepChecks?.[index] ? "checked" : ""}><span class="step-number">${index + 1}</span><span>${esc(step)}</span></label></li>`).join("")}</ol></section><section class="done-when"><span>Done when</span><p>${esc(task.doneWhen)}</p></section>${ownerSystemsPanel(task, systems)}<details class="guidance-details" ${guidanceOpen ? "open" : ""}><summary>Explain this in plain English</summary><div class="guidance-box"><p><strong>Why it matters:</strong> ${esc(task.guidance?.why || "This action supports the authorised annual VET process.")}</p><p><strong>Common trap:</strong> ${esc(task.guidance?.commonTrap || "Treating the workboard as the official record.")}</p><p><strong>Applies to:</strong> ${esc(task.applicability?.conditions || "Confirm locally")}</p></div></details><details class="source-details"><summary>Show mapped sources</summary><div class="source-mini-list">${sources.map(({ id: sourceId, item }) => item ? `<p><strong>${esc(item.title)}</strong><span>${esc(item.note)}</span>${item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noopener">Open approved location ↗</a>` : `<small>Open through the approved staff system</small>`}</p>` : `<p><strong>${esc(sourceId)}</strong><span>Controlled or local source—confirm the current authorised version.</span></p>`).join("")}</div></details>${completionForm(task, record)}${historyPanel(record)}</div>`;
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
  function dependencyPanel(dependencies, mode) {
    const open = dependencies.filter(task => task.missing || !isClosed(task));
    const followUp = mode === "follow-up";
    const missing = dependencies.filter(task => task.missing).length;
    return `<section class="dependency-panel ${open.length && !followUp ? "has-open" : "is-clear"}"><strong>${missing ? "Configuration error — this task is locked" : followUp ? "Respond now — these controls are concurrent follow-ups" : open.length ? `${open.length} prerequisite${open.length === 1 ? "" : "s"} not yet verified` : "Prerequisites recorded as closed"}</strong><ul>${dependencies.map(task => `<li><span>${esc(task.title)}</span><span>${task.missing ? `<span class="status-pill status-exception">Missing</span>` : statusPill(task)}${task.missing ? "" : `<button class="text-button" type="button" data-action="open-task" data-task-id="${esc(task.id)}">Open</button>`}</span></li>`).join("")}</ul></section>`;
  }
  function allowedHandoffStates(current) {
    const transitions = {
      none: [["none", "None"], ["sent", "Send to receiving role"]],
      sent: [["sent", "Sent — awaiting response"], ["accepted", "Accepted by receiving role"], ["returned", "Returned for action"]],
      accepted: [["accepted", "Accepted by receiving role"], ["verified", "Returned and verified"]],
      returned: [["returned", "Returned for action"], ["sent", "Resent after action"]],
      verified: [["verified", "Returned and verified"]]
    };
    return transitions[current] || transitions.none;
  }
  function completionForm(task, record) {
    const dependency = openDependenciesForCompletion(task), ordinaryOpen = dependency.open;
    const roleOptionList = (selected, emptyLabel) => `<option value="">${esc(emptyLabel)}</option>${workRoles.map(role => `<option value="${esc(role)}" ${selected === role ? "selected" : ""}>${esc(role)}</option>`).join("")}`;
    const currentHandoffState = record.handoffState || "none";
    return `<section class="completion-panel"><div class="section-heading"><div><h3>Record progress safely</h3><p>Use a location, record ID or dated sign-off reference—never paste the evidence itself.</p></div></div><form id="task-record-form" data-task-id="${esc(task.id)}"><div class="form-grid"><label><span>Status</span><select name="status">${Object.entries(statusMeta).map(([value, meta]) => `<option value="${value}" ${record.status === value ? "selected" : ""}>${esc(meta.label)}</option>`).join("")}</select></label><label><span>Working role</span><select name="assignment">${roleOptionList(state.assignments[task.id], "Use source role")}</select></label><label class="span-two"><span>Privacy-safe official-record reference</span><input name="evidenceRef" type="text" value="${esc(record.evidenceRef || "")}" placeholder="e.g. VET Hub status checked; team action register item 14"><small>Do not enter a learner, USI, host, incident, assessment or credential detail.</small></label><label><span>Verifier role or initials</span><input name="verifier" type="text" value="${esc(record.verifier || "")}" placeholder="Expected: ${esc(verifierRole(task))}"></label><label><span>Waiting for role/system</span><select name="waitingForRole">${roleOptionList(record.waitingForRole || "", "Not waiting")}</select></label><label><span>Chase / review date</span><input name="reviewDate" type="date" value="${esc(record.reviewDate || "")}"><small>A waiting or exception task resurfaces on this date.</small></label><label><span>Escalation date${task.priority === "critical" ? " (required for critical waiting/exception work)" : ""}</span><input name="escalationDate" type="date" value="${esc(record.escalationDate || "")}"></label><label><span>Hand-off to</span><select name="handoffTo">${roleOptionList(record.handoffTo || "", "No hand-off")}</select></label><label><span>Browser-local hand-off state</span><select name="handoffState">${allowedHandoffStates(currentHandoffState).map(([value, label]) => `<option value="${value}" ${currentHandoffState === value ? "selected" : ""}>${esc(label)}</option>`).join("")}</select><small>Save each hand-off stage before moving to the next.</small></label><label class="check-line span-two"><input name="sourceChecked" type="checkbox" ${record.sourceChecked ? "checked" : ""}><span>I checked the current live source/date before recording completion.</span></label><label class="check-line span-two"><input name="doneWhenConfirmed" type="checkbox" ${record.doneWhenConfirmed ? "checked" : ""}><span>I confirmed the stated “Done when” result in the owner system.</span></label>${task.independentVerificationRequired ? `<label class="check-line span-two"><input name="independentVerifierConfirmed" type="checkbox" ${record.independentVerifierConfirmed ? "checked" : ""}><span>A different authorised person independently checked this closure.</span></label>` : ""}${ordinaryOpen.length ? `<label class="check-line span-two"><input name="dependencyExceptionConfirmed" type="checkbox" ${record.dependencyExceptionConfirmed ? "checked" : ""}><span>An authorised verifier confirmed an owned official-system exception for the ${ordinaryOpen.length} open prerequisite${ordinaryOpen.length === 1 ? "" : "s"}. Hard sequence gates cannot be bypassed.</span></label>` : ""}<label class="span-two"><span>Exception or not-applicable reason (if used)</span><textarea name="exceptionSummary" rows="2" placeholder="Privacy-safe summary only">${esc(record.exceptionSummary || "")}</textarea></label></div><p class="form-error" id="task-form-error" role="alert" hidden></p><div class="dialog-actions"><button class="button secondary" type="submit" name="commit" value="save">Save progress</button><button class="button" type="submit" name="commit" value="verify">Verify and close</button><button class="button quiet" type="button" data-action="close-dialog">Close</button></div></form></section>`;
  }
  function historyPanel(record) {
    const history = (record.history || []).slice(-5).reverse();
    return history.length ? `<details class="history-details"><summary>Recent local history</summary><ul>${history.map(item => `<li><span>${esc(item.when.replace("T", " ").slice(0, 16))}</span><strong>${esc(item.action)}</strong></li>`).join("")}</ul></details>` : "";
  }

  function saveTaskForm(form, commit) {
    const task = taskById(form.dataset.taskId); if (!task) return;
    const values = new FormData(form); let status = String(values.get("status") || "not-started");
    const evidenceRef = boundedString(values.get("evidenceRef")).trim(), verifier = boundedString(values.get("verifier"), 120).trim();
    const sourceChecked = values.get("sourceChecked") === "on", doneWhenConfirmed = values.get("doneWhenConfirmed") === "on", independentVerifierConfirmed = values.get("independentVerifierConfirmed") === "on", dependencyExceptionConfirmed = values.get("dependencyExceptionConfirmed") === "on", exceptionSummary = String(values.get("exceptionSummary") || "").trim();
    const waitingForRole = boundedString(values.get("waitingForRole"), 120).trim(), reviewDate = safeIsoDate(values.get("reviewDate")), escalationDate = safeIsoDate(values.get("escalationDate")), handoffTo = boundedString(values.get("handoffTo"), 120).trim(), handoffState = String(values.get("handoffState") || "none");
    const error = form.querySelector("#task-form-error"); if (commit === "verify") status = "verified";
    if (status === "verified" && (!evidenceRef || !verifier || !sourceChecked)) { error.textContent = "To verify this task, add a privacy-safe official-record reference, a verifier and confirm the live source check."; error.hidden = false; return; }
    const previous = getRecord(task.id), allStepsComplete = (task.actionSteps || []).every((_, index) => previous.stepChecks?.[index]);
    const dependencies = openDependenciesForCompletion(task), anyOpenDependencies = [...dependencies.hardOpen, ...dependencies.open];
    if (status === "verified" && !allStepsComplete) { error.textContent = "Complete each action step before verifying this task."; error.hidden = false; return; }
    if (status === "verified" && !doneWhenConfirmed) { error.textContent = "Confirm the stated Done when result in the owner system before verifying."; error.hidden = false; return; }
    if (status === "not-applicable" && (!evidenceRef || !verifier || !sourceChecked || !exceptionSummary)) { error.textContent = "A not-applicable closure needs the current-source check, an authority reference, a reason and an authorised verifier."; error.hidden = false; return; }
    if (["verified", "not-applicable"].includes(status) && task.independentVerificationRequired && !independentVerifierConfirmed) { error.textContent = "This closure needs confirmation that a different authorised person independently checked it."; error.hidden = false; return; }
    if (["verified", "not-applicable"].includes(status) && cycleDateState(task) === "future") { error.textContent = `This control opens ${shortDate(task.windowStart)}. It cannot be closed before its operating window.`; error.hidden = false; return; }
    if (["verified", "not-applicable"].includes(status) && task.lateMode === "exception-only" && task.windowEnd && boardTodayIso > task.windowEnd) { error.textContent = `The authorised ${shortDate(task.windowEnd)} deadline has passed. Record an owned exception with chase and escalation dates; do not create a normal green closure.`; error.hidden = false; return; }
    if (["verified", "not-applicable"].includes(status) && !earlier2027GatesComplete(task)) { error.textContent = "An earlier 2027 gate is still open. Close that gate before this control can be closed."; error.hidden = false; return; }
    if (["verified", "not-applicable"].includes(status) && (dependencies.missing.length || dependencies.hardOpen.length)) { error.textContent = dependencies.missing.length ? "This task has a missing prerequisite configuration and is locked until the workboard is corrected." : "A hard sequence prerequisite is still open. It cannot be bypassed; close or formally own that prerequisite first."; error.hidden = false; return; }
    if (status === "not-applicable" && dependencies.open.length) { error.textContent = "Not-applicable cannot bypass an open prerequisite. Close the prerequisite first."; error.hidden = false; return; }
    if (status === "verified" && dependencies.open.length && (!dependencyExceptionConfirmed || !exceptionSummary)) { error.textContent = "Open prerequisites must be closed, or an authorised verifier must record a privacy-safe official-system exception."; error.hidden = false; return; }
    if (["exception", "not-applicable"].includes(status) && (!exceptionSummary || !verifier)) { error.textContent = "An exception or not-applicable decision needs a privacy-safe reason and an authorised verifier."; error.hidden = false; return; }
    if (["waiting", "exception"].includes(status) && (!waitingForRole || !reviewDate)) { error.textContent = "Waiting and exception work needs a role/system owner and a chase date so it cannot disappear."; error.hidden = false; return; }
    if (["waiting", "exception"].includes(status) && task.priority === "critical" && !escalationDate) { error.textContent = "Critical waiting or exception work also needs an escalation date."; error.hidden = false; return; }
    if (handoffState !== "none" && !handoffTo) { error.textContent = "Choose the role receiving this hand-off."; error.hidden = false; return; }
    const previousHandoffState = previous.handoffState || "none";
    if (!allowedHandoffStates(previousHandoffState).some(([value]) => value === handoffState)) { error.textContent = "Save each hand-off stage in order: sent, accepted or returned, then verified."; error.hidden = false; return; }
    if (status === "verified" && handoffTo && !["accepted", "verified"].includes(handoffState)) { error.textContent = "A handed-off task cannot close until the receiving role has accepted it or returned it verified."; error.hidden = false; return; }
    state.records[task.id] = { status, evidenceRef, verifier, sourceChecked, doneWhenConfirmed, independentVerifierConfirmed, dependencyExceptionConfirmed, sourceCheckedAt: sourceChecked ? (previous.sourceCheckedAt || new Date().toISOString()) : "", reviewDate, escalationDate, waitingForRole, handoffTo, handoffState, exceptionSummary: boundedString(exceptionSummary), stepChecks: previous.stepChecks || {}, history: [...(previous.history || []), { when: new Date().toISOString(), action: `${statusMeta[status].label} saved${handoffState !== "none" ? ` · hand-off ${handoffState}` : ""}` }].slice(-30) };
    const assignment = boundedString(values.get("assignment"), 120).trim(); if (assignment) state.assignments[task.id] = assignment; else delete state.assignments[task.id];
    saveState(); taskDialog.close(); render(); toast(status === "verified" ? "Task verified with a safe record reference" : "Task progress saved");
  }

  function openSettings() {
    settingsContent.innerHTML = `<header class="dialog-head"><div><p class="eyebrow">Local workspace setup</p><h2 id="settings-title">Pace, role and approved links</h2></div><button class="dialog-close" type="button" data-action="close-settings" aria-label="Close settings">×</button></header><div class="dialog-body"><form id="settings-form"><section class="settings-section"><h3>How this browser should open</h3><div class="form-grid"><label><span>Default pace</span><select name="experience"><option value="guided" ${state.experience === "guided" ? "selected" : ""}>One step at a time</option><option value="full" ${state.experience === "full" ? "selected" : ""}>Fast workboard</option></select></label><label><span>Default role view</span><select name="role">${roleOptions(state.role)}</select></label><label class="check-line span-two"><input name="guidance" type="checkbox" ${state.guidance ? "checked" : ""}><span>Keep plain-English guidance available inside tasks.</span></label></div></section><section class="settings-section"><h3>Current staff launch links</h3><p>Verified front doors are built into this workboard. Any approved replacement is saved only in this browser and is excluded from exports.</p><div class="link-form-list">${data.systems.filter(system => system.kind === "private").map(system => `<label><span>${esc(system.label)}</span><input name="link:${esc(system.id)}" type="url" value="${esc(state.links[system.id] || system.url || "")}"><small>${esc(system.purpose)}</small></label>`).join("")}</div></section><aside class="settings-warning"><strong>Role assignments remain provisional</strong><p>Formal Principal delegation and the Coordinator/Assistant split have not yet been verified. Individual tasks can be assigned to roles, but this browser does not create authority.</p></aside><div class="dialog-actions"><button class="button" type="submit">Save workspace setup</button><button class="button quiet" type="button" data-action="close-settings">Cancel</button></div></form></div>`;
    settingsDialog.showModal();
  }
  function roleOptions(selected) {
    return [["all", "All work"], ["htvet", "Head Teacher VET"], ["coordinator", "Coordinator"], ["assistant", "Assistant"], ["trainer", "Trainer / assessor"], ["principal", "Principal / delegate"], ["workplace", "Workplace learning"], ["nesa", "NESA / data role"]].map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${esc(label)}</option>`).join("");
  }
  function syncRoleFilters() {
    const options = roleOptions(state.role);
    roleFilter.innerHTML = options; roleFilter.value = state.role;
    if (mobileRoleFilter) { mobileRoleFilter.innerHTML = options; mobileRoleFilter.value = state.role; }
  }
  function saveSettings(form) {
    const values = new FormData(form); state.experience = String(values.get("experience") || "guided"); state.role = String(values.get("role") || "all"); state.guidance = values.get("guidance") === "on";
    data.systems.filter(system => system.kind === "private").forEach(system => { const proposed = String(values.get(`link:${system.id}`) || "").trim(), builtIn = safeUrl(system.url); if (!proposed || proposed === builtIn) delete state.links[system.id]; else if (safeUrl(proposed)) state.links[system.id] = proposed; });
    saveState(); syncRoleFilters(); updateGuidanceToggle(); settingsDialog.close(); render(); toast("Workspace setup saved; confirmed front doors remain built in");
  }
  function updateGuidanceToggle() { const toggle = document.querySelector("[data-action='toggle-guidance']"); toggle.setAttribute("aria-pressed", String(state.guidance)); toggle.querySelector("span:last-child").textContent = state.guidance ? "Guidance on" : "Guidance off"; }
  function toast(message, kind = "info") { const element = document.createElement("div"); element.className = `toast ${kind === "error" ? "is-error" : ""}`; element.textContent = message; toastRegion.appendChild(element); setTimeout(() => element.remove(), 3200); }

  function exportWorkspace() {
    const clean = normaliseState(state, {});
    const portableState = {
      schemaVersion: 3, role: clean.role, guidance: clean.guidance, experience: clean.experience,
      selectedPhase: clean.selectedPhase, yearSearch: clean.yearSearch, activeCycle: clean.activeCycle,
      cycle2027Mode: clean.cycle2027Mode, selected2027Term: clean.selected2027Term, selected2027Week: clean.selected2027Week,
      term1Mode: clean.term1Mode, selectedTerm1Week: clean.selectedTerm1Week,
      eventOccurrences: clean.eventOccurrences, records: clean.records, assignments: clean.assignments,
      gaps: clean.gaps, lastBackup: clean.lastBackup, linkDefaultsVersion: 2
    };
    const payload = { kind: "WWHS-VET-COMPLIANCE-WORKBOARD-BACKUP", productId: data.config.productId, schemaVersion: 3, buildId: data.config.buildId, exportedAt: new Date().toISOString(), warning: "Privacy-safe task metadata only. Official evidence remains in authorised systems. Authenticated links are excluded and stay device-local.", excluded: ["authenticated links", "official evidence", "personal information"], state: portableState };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = `WWHS-VET-workboard-backup-${boardTodayIso}.json`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    state.lastBackup = new Date().toISOString(); saveState(); render(); toast("Privacy-safe workboard backup exported");
  }
  function importWorkspace(file) {
    if (!file) return; const reader = new FileReader();
    reader.onload = () => { try {
      const payload = JSON.parse(String(reader.result || ""));
      const compatibleBuildIds = new Set([data.config.buildId, ...(data.config.compatibleBuildIds || [])]);
      if (payload.kind !== "WWHS-VET-COMPLIANCE-WORKBOARD-BACKUP" || (payload.productId && payload.productId !== data.config.productId) || payload.schemaVersion !== 3 || !compatibleBuildIds.has(payload.buildId) || !payload.state || Array.isArray(payload.state) || typeof payload.state !== "object") throw new Error("Unsupported backup");
      const localLinks = { ...state.links }, restored = payload.state;
      if (payload.buildId === data.config.buildId) {
        state = normaliseState(restored, localLinks);
      } else {
        const isTermOnePrototype = /2027-term1-prototype/i.test(payload.buildId);
        const restoredOccurrences = isTermOnePrototype ? sanitiseEventOccurrences(restored.eventOccurrences) : [];
        const compatibleIds = new Set((isTermOnePrototype ? [...cycleTasks.filter(task => !task.term || task.term === 1), ...restoredOccurrences.map(occurrenceTask).filter(Boolean)] : tasks).map(task => task.id));
        const compatibleOnly = value => Object.fromEntries(Object.entries(safeObject(value)).filter(([id]) => compatibleIds.has(id)));
        const occurrenceMap = new Map([...restoredOccurrences, ...(state.eventOccurrences || [])].map(item => [item.id, item]));
        const merged = {
          ...state,
          records: { ...compatibleOnly(restored.records), ...state.records },
          assignments: { ...compatibleOnly(restored.assignments), ...state.assignments },
          gaps: { ...safeObject(restored.gaps), ...state.gaps },
          lastBackup: state.lastBackup || boundedString(restored.lastBackup, 40),
          eventOccurrences: [...occurrenceMap.values()]
        };
        state = normaliseState(merged, localLinks);
      }
      saveState(); syncRoleFilters(); updateGuidanceToggle(); render(); toast(payload.buildId === data.config.buildId ? "Workboard backup restored; authenticated links stayed on this device" : /2027-term1-prototype/i.test(payload.buildId) ? "Term 1 backup merged; newer full-year work and device links were preserved" : "2026 backup merged; existing 2027 work and authenticated links were preserved");
    } catch (_) { toast("That backup is unsupported or belongs to a different workboard build", "error"); } };
    reader.readAsText(file);
  }
  function resetWorkspace() {
    if (!state.resetArmed) { state.resetArmed = true; saveState(); render(); toast("Nothing cleared yet. Use the red button again to confirm."); return; }
    localStorage.removeItem(data.config.storageKey); state = freshState(); refreshAllTasks([]); syncRoleFilters(); updateGuidanceToggle(); location.hash = "#today"; render(); toast("Local workboard data cleared");
  }

  function currentView() {
    const view = (location.hash || "#today").slice(1), allowed = ["today", "cycle-2027", "term1-2027", "term2-2027", "term3-2027", "term4-2027", "year", "workflows", "systems", "issues"];
    if (!allowed.includes(view)) { history.replaceState(null, "", "#today"); return "today"; }
    return view;
  }
  function isCycleView(view) { return ["cycle-2027", "term1-2027", "term2-2027", "term3-2027", "term4-2027"].includes(view); }
  function syncCycleRoute(view) {
    if (!isCycleView(view)) return;
    const routeTerm = ({ "term1-2027": 1, "term2-2027": 2, "term3-2027": 3, "term4-2027": 4 })[view];
    let changed = state.activeCycle !== "2027";
    state.activeCycle = "2027";
    if (routeTerm && state.selected2027Term !== routeTerm) { state.selected2027Term = routeTerm; state.selected2027Week = routeTerm === 1 ? 0 : 1; changed = true; }
    if (routeTerm && routeTerm > 1 && state.cycle2027Mode !== "full") { state.cycle2027Mode = "full"; changed = true; }
    const maxWeek = selectedTerm()?.weeks?.length || 10;
    if (state.selected2027Week > maxWeek || (state.selected2027Term !== 1 && state.selected2027Week === 0)) { state.selected2027Week = state.selected2027Term === 1 ? 0 : 1; changed = true; }
    if (changed) saveState();
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
    syncCycleRoute(view);
    const showingTitle = view === "today" && titleOpen;
    const showingWelcome = view === "today" && !titleOpen && state.activeCycle !== "2027" && (startOpen || !state.experience);
    const showingCycle = isCycleView(view) || (view === "today" && state.activeCycle === "2027" && !showingTitle) || (view === "year" && state.activeCycle === "2027");
    document.title = showingTitle ? "WWHS Operations Workboards" : showingCycle ? "Run 2027 · WWHS VET Compliance Workboard" : "WWHS VET Compliance Workboard";
    document.body.classList.toggle("is-title", showingTitle);
    document.body.classList.toggle("is-welcome", showingWelcome);
    document.body.classList.toggle("is-guided", view === "today" && !titleOpen && !startOpen && state.experience === "guided");
    document.body.classList.toggle("is-cycle-2027", showingCycle);
    document.body.classList.toggle("is-term1", showingCycle);
    document.body.classList.toggle("is-term1-guided", showingCycle && state.cycle2027Mode === "guided");
    document.querySelectorAll(".nav-link, .route-link").forEach(link => {
      const active = link.classList.contains("route-home") ? showingTitle : !showingTitle && (link.dataset.cycleLink === "2027" ? isCycleView(view) : link.dataset.view === view);
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
    if (view === "today") renderToday(); if (isCycleView(view)) renderCycle2027(); if (view === "year") renderYear(); if (view === "workflows") renderWorkflows(); if (view === "systems") renderSystems(); if (view === "issues") renderIssues();
    closeNavigation();
    if (focusMain) queueMicrotask(() => document.getElementById("main-content")?.focus({ preventScroll: true }));
  }

  document.addEventListener("click", event => {
    const skipLink = event.target.closest(".skip-link");
    if (skipLink) {
      event.preventDefault();
      closeNavigation();
      document.getElementById("main-content")?.focus();
      return;
    }
    const navLink = event.target.closest(".nav-link, .route-link[data-view]");
    if (navLink) { closeNavigation(); if (navLink.hash === location.hash) queueMicrotask(() => document.getElementById("main-content")?.focus({ preventScroll: true })); }
    const target = event.target.closest("[data-action]"); if (!target) return; const action = target.dataset.action;
    if (action === "toggle-nav") { const open = document.body.classList.toggle("nav-open"); target.setAttribute("aria-expanded", String(open)); document.querySelector(".nav-scrim").hidden = !open; }
    if (action === "close-nav") closeNavigation();
    if (action === "toggle-guidance") { state.guidance = !state.guidance; saveState(); updateGuidanceToggle(); toast(state.guidance ? "Plain-English guidance is available inside tasks" : "Guidance hidden for a faster work view"); }
    if (action === "enter-workboard") { titleOpen = false; startOpen = true; state.activeCycle = "2026"; saveState(); render(true); }
    if (action === "choose-experience") { startOpen = false; state.experience = target.dataset.experience; state.guidance = state.experience === "guided"; saveState(); updateGuidanceToggle(); render(); }
    if (action === "set-cycle-mode") { state.cycle2027Mode = target.dataset.mode === "full" ? "full" : "guided"; state.guidance = state.cycle2027Mode === "guided"; saveState(); updateGuidanceToggle(); if (state.cycle2027Mode === "guided" && ["year", "term2-2027", "term3-2027", "term4-2027"].includes(currentView())) location.hash = "#cycle-2027"; else render(true); }
    if (action === "select-cycle-term") { const term = Math.max(1, Math.min(4, Number(target.dataset.term) || 1)); state.selected2027Term = term; state.selected2027Week = term === 1 ? 0 : 1; state.cycle2027Mode = "full"; state.activeCycle = "2027"; saveState(); location.hash = `#term${term}-2027`; }
    if (action === "select-cycle-week") { const maxWeek = selectedTerm()?.weeks?.length || 10; state.selected2027Week = Math.max(state.selected2027Term === 1 ? 0 : 1, Math.min(maxWeek, Number(target.dataset.week) || 0)); state.cycle2027Mode = "full"; saveState(); render(true); }
    if (action === "open-task") { lastTaskTrigger = target; openTask(target.dataset.taskId); }
    if (action === "open-workflow") { lastTaskTrigger = target; openWorkflow(target.dataset.workflowId, target.dataset.cycleContext || (state.activeCycle === "2027" ? "2027-cycle" : "")); }
    if (action === "start-event-occurrence") createEventOccurrence(target.dataset.templateId, target.dataset.workflowId);
    if (action === "open-system") openSystem(target.dataset.systemId, target);
    if (action === "close-dialog") taskDialog.close();
    if (action === "open-settings") { if (taskDialog.open) { lastTaskTrigger = null; taskDialog.close(); } lastSettingsTrigger = target; openSettings(); } if (action === "close-settings") settingsDialog.close();
    if (action === "select-phase") { state.selectedPhase = target.dataset.phase; state.yearSearch = ""; saveState(); renderYear(); }
    if (action === "print") window.print(); if (action === "export-workspace") exportWorkspace(); if (action === "import-workspace") document.getElementById("workspace-import")?.click(); if (action === "reset-workspace") resetWorkspace();
  });
  document.addEventListener("change", event => {
    if (event.target === roleFilter || event.target === mobileRoleFilter) { state.role = event.target.value; syncRoleFilters(); saveState(); render(); }
    if (event.target.matches("[data-task-step]")) { const id = event.target.dataset.taskId, record = getRecord(id); record.stepChecks = record.stepChecks || {}; record.stepChecks[event.target.dataset.taskStep] = event.target.checked; if (record.status === "not-started" && event.target.checked) record.status = "in-progress"; state.records[id] = record; saveState(); }
    if (event.target.id === "workspace-import") importWorkspace(event.target.files?.[0]);
  });
  document.addEventListener("input", event => {
    if (event.target.id === "year-search") { state.yearSearch = event.target.value; saveState(); const cursor = event.target.selectionStart; renderYear(); const replacement = document.getElementById("year-search"); replacement?.focus(); replacement?.setSelectionRange(cursor, cursor); }
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !document.body.classList.contains("nav-open")) return;
    const toggle = document.querySelector("[data-action='toggle-nav']");
    closeNavigation();
    toggle?.focus();
  });
  document.addEventListener("submit", event => {
    if (event.target.id === "task-record-form") { event.preventDefault(); saveTaskForm(event.target, event.submitter?.value || "save"); }
    if (event.target.id === "settings-form") { event.preventDefault(); saveSettings(event.target); }
    if (event.target.matches("[data-gap-form]")) { event.preventDefault(); saveGapForm(event.target); }
  });
  taskDialog.addEventListener("close", () => { const previous = lastTaskTrigger; lastTaskTrigger = null; returnDialogFocus(previous); });
  settingsDialog.addEventListener("close", () => { const previous = lastSettingsTrigger; lastSettingsTrigger = null; returnDialogFocus(previous); });
  window.addEventListener("hashchange", () => { if (currentView() !== "today") { titleOpen = false; startOpen = false; } render(true); });
  window.addEventListener("focus", () => { if (refreshBoardDate()) render(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && refreshBoardDate()) render(); });
  window.setInterval(() => { if (refreshBoardDate()) render(); }, 60000);
  syncRoleFilters(); updateGuidanceToggle(); render();
})();
