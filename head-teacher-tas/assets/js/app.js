(function () {
  "use strict";

  const data = window.HT_TAS_WORKBOARD;
  const routeContent = document.getElementById("route-content");
  const taskDialog = document.getElementById("task-dialog");
  const taskDialogContent = document.getElementById("task-dialog-content");
  const settingsDialog = document.getElementById("settings-dialog");
  const settingsContent = document.getElementById("settings-content");
  const toastRegion = document.getElementById("toast-region");
  let currentDate = startOfDay(new Date());
  let currentIso = isoDate(currentDate);
  let operatingYearIsCurrent = currentDate.getFullYear() === data.config.operatingYear;
  let lastTaskTrigger = null;
  let lastSettingsTrigger = null;
  let taskStateDirty = false;
  let settingsStateDirty = false;
  const completionUndo = new Map();
  let taskReviewSnapshot = null;

  const statusMeta = {
    "not-started": { label: "Not started", className: "neutral" },
    "in-progress": { label: "In progress", className: "progress" },
    waiting: { label: "Waiting", className: "waiting" },
    completed: { label: "Task complete", className: "completed" },
    verified: { label: "Verified", className: "verified" },
    exception: { label: "Exception", className: "exception" },
    "not-applicable": { label: "Not applicable", className: "muted" }
  };

  const areaMeta = {
    calendar: { label: "Calendar", route: "calendar", intro: "Exact 2026 dates first, then the recurring controls that keep them current." },
    teaching: { label: "Teaching & reporting", route: "teaching", intro: "Curriculum, programs, assessment, reporting and course-quality controls." },
    faculty: { label: "Faculty operations", route: "faculty", intro: "Meetings, planning, budget, facilities, plant, chemicals and resources." },
    people: { label: "People & safety", route: "people", intro: "Staff readiness, student support and urgent or event-driven workflows." }
  };

  const phaseLabels = {
    annual: "Annual setup", term_1: "Term 1", term_2: "Term 2", term_3: "Term 3", term_4: "Term 4", ongoing: "Ongoing", triggered: "When triggered"
  };

  const defaultState = {
    schemaVersion: 2,
    linkDefaultsVersion: 2,
    mode: "guided",
    guidance: true,
    links: {},
    records: {},
    weekly: {},
    eventOccurrences: {},
    search: "",
    lastBackup: ""
  };

  let savedStateRaw = null;
  let stateStorageBlocked = false;
  let state = loadState();

  function safeObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function freshState() {
    return { ...defaultState, links: {}, records: {}, weekly: {}, eventOccurrences: {} };
  }

  function loadState() {
    try {
      savedStateRaw = localStorage.getItem(data.config.storageKey);
      if (savedStateRaw === null) return freshState();
      const parsed = JSON.parse(savedStateRaw);
      if (!parsed || parsed.schemaVersion !== 2) {
        stateStorageBlocked = true;
        return freshState();
      }
      return {
        ...defaultState,
        ...parsed,
        mode: ["guided", "fast"].includes(parsed.mode) ? parsed.mode : "guided",
        guidance: parsed.guidance !== false,
        linkDefaultsVersion: 2,
        links: parsed.linkDefaultsVersion === 2 ? safeObject(parsed.links) : {},
        records: sanitiseRecords(parsed.records),
        weekly: safeObject(parsed.weekly),
        eventOccurrences: sanitiseEventOccurrences(parsed.eventOccurrences)
      };
    } catch (_) {
      stateStorageBlocked = true;
      return freshState();
    }
  }

  function sanitiseEventOccurrences(value) {
    return Object.fromEntries(Object.entries(safeObject(value)).filter(([id, token]) => {
      const task = data.tasks.find(item => item.id === id);
      return task && taskCycle(task) === "event" && typeof token === "string" && /^event-[a-z0-9-]{1,100}$/i.test(token);
    }));
  }

  function sanitiseRecords(value) {
    const input = safeObject(value);
    const output = {};
    Object.entries(input).forEach(([key, value]) => {
      const taskId = key.split("::")[0];
      const task = data.tasks.find(item => item.id === taskId);
      if (!task || task.historyOnly || task.procedureOnly) return;
      const raw = safeObject(value);
      if (!Object.keys(raw).length) return;
      const steps = safeObject(raw.steps);
      const milestones = safeObject(raw.milestones);
      const evidenceRef = String(raw.evidenceRef || "").slice(0, 240);
      const verifier = String(raw.verifier || "").slice(0, 100);
      const sourceChecked = raw.sourceChecked === true;
      const doneConfirmed = raw.doneConfirmed === true;
      const exceptionReason = String(raw.exceptionReason || "").slice(0, 300);
      const allSteps = task.steps.every((_, index) => steps[index] === true || steps[String(index)] === true);
      const allMilestones = !task.milestones?.length || task.milestones.every((_, index) => milestones[index] === true || milestones[String(index)] === true);
      const hasProgress = Object.values(steps).some(Boolean) || Object.values(milestones).some(Boolean) || Boolean(evidenceRef || verifier || exceptionReason);
      let status = statusMeta[raw.status] ? raw.status : "not-started";

      if (status === "verified" && (!allSteps || !allMilestones || !evidenceRef || !verifier || !sourceChecked || !doneConfirmed)) {
        status = hasProgress ? "in-progress" : "not-started";
      }
      if (status === "completed" && (!allSteps || !allMilestones || !sourceChecked || !doneConfirmed)) {
        status = hasProgress ? "in-progress" : "not-started";
      }
      if (["exception", "not-applicable"].includes(status) && (!exceptionReason || !verifier)) {
        status = hasProgress ? "in-progress" : "not-started";
      }

      output[key] = {
        status,
        steps,
        milestones,
        evidenceRef,
        verifier,
        sourceChecked,
        doneConfirmed: ["completed", "verified"].includes(status) ? doneConfirmed : false,
        exceptionReason,
        updatedAt: String(raw.updatedAt || "")
      };
    });
    return output;
  }

  function storageIsCurrent() {
    if (stateStorageBlocked) {
      toast("Saved TAS progress could not be read safely. It has been kept unchanged. Recover the original browser data before saving.", "error");
      return false;
    }
    if (localStorage.getItem(data.config.storageKey) !== savedStateRaw) {
      toast("TAS progress changed in another tab. Nothing was overwritten. Copy any unsaved text, then reload before saving.", "error");
      return false;
    }
    return true;
  }

  function recordsUpdated() {
    window.dispatchEvent(new CustomEvent("wwhs:records-updated", { detail: { wing: "tas" } }));
    forecastUpdated();
  }

  function forecastUpdated() {
    window.dispatchEvent(new CustomEvent("wwhs:forecast-updated", { detail: { wing: "tas" } }));
  }

  function saveState() {
    try {
      if (!storageIsCurrent()) return false;
      const raw = JSON.stringify(state);
      localStorage.setItem(data.config.storageKey, raw);
      savedStateRaw = raw;
      recordsUpdated();
      return true;
    } catch (_) {
      toast("This browser could not save the workboard", "error");
      return false;
    }
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[character]));
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  function startOfDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function refreshDate() {
    currentDate = startOfDay(new Date());
    currentIso = isoDate(currentDate);
    operatingYearIsCurrent = currentDate.getFullYear() === data.config.operatingYear;
  }

  function isoDate(date) {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
  }

  function parseDate(value) {
    return startOfDay(new Date(`${value}T12:00:00`));
  }

  function shortDate(value) {
    return parseDate(value).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  }

  function longDate(value) {
    return parseDate(value).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  }

  function daysUntil(value) {
    return Math.round((parseDate(value).getTime() - currentDate.getTime()) / 86400000);
  }

  function pendingMilestone(task) {
    if (!task.milestones?.length) return null;
    const record = recordFor(task);
    return task.milestones.find((_, index) => record.milestones?.[index] !== true && record.milestones?.[String(index)] !== true) || null;
  }

  function activeDueDate(task) {
    if (task.milestones?.length) return pendingMilestone(task)?.date || "";
    return task.dueDate || "";
  }

  function queueDueDate(task) {
    const active = activeDueDate(task);
    if (active) return active;
    if (task.milestones?.length) return task.milestones[task.milestones.length - 1].date;
    return task.dueDate || "";
  }

  function dueLabel(task) {
    if (!task.dueDate) return task.timing;
    if (task.historyOnly) return `${shortDate(task.dueDate)} · 2026 baseline`;
    const dueDate = activeDueDate(task);
    if (!dueDate) return isClosed(task) ? "Milestones complete · closed here" : "Milestones complete · verify closure";
    if (!operatingYearIsCurrent) return `${shortDate(dueDate)} · 2026 baseline`;
    if (isClosed(task)) return `${shortDate(dueDate)} · closed here`;
    const days = daysUntil(dueDate);
    if (days < 0 && !hasReviewedRecord(task)) return "Date passed · status not confirmed";
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `Due ${shortDate(dueDate)} · ${days} days`;
  }

  function weekKey() {
    const date = new Date(currentDate);
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day);
    return isoDate(date);
  }

  function termKey() {
    const year = currentDate.getFullYear();
    const value = isoDate(currentDate);
    if (year === 2026) {
      if (value <= "2026-04-17") return "2026-t1";
      if (value <= "2026-07-19") return "2026-t2";
      if (value <= "2026-10-11") return "2026-t3";
      return "2026-t4";
    }
    const month = currentDate.getMonth() + 1;
    return `${year}-t${month <= 4 ? 1 : month <= 7 ? 2 : month <= 10 ? 3 : 4}`;
  }

  function taskCycle(task) {
    if (task.cycle) return task.cycle;
    if (task.phase === "ongoing") return "term";
    if (task.phase === "triggered") return "event";
    return "year";
  }

  function cycleLabel(task) {
    const cycle = taskCycle(task);
    if (cycle === "week") return `Week beginning ${shortDate(weekKey())}`;
    if (cycle === "term") return termKey().toUpperCase().replace("-", " · ");
    if (cycle === "event") return "Current occurrence";
    return `${currentDate.getFullYear()} operating cycle`;
  }

  function currentTermLabel() {
    if (!operatingYearIsCurrent) return `${data.config.operatingYear} BASELINE`;
    const term = termKey().split("-t")[1];
    const asAt = currentDate.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
    return `TERM ${term} · AS AT ${asAt.toUpperCase()}`;
  }

  function recordKey(task) {
    const cycle = taskCycle(task);
    if (cycle === "week") return `${task.id}::${weekKey()}`;
    if (cycle === "term") return `${task.id}::${termKey()}`;
    if (cycle === "year") return `${task.id}::${currentDate.getFullYear()}`;
    return `${task.id}::${state.eventOccurrences[task.id] || "current-event"}`;
  }

  function recordFor(task) {
    return state.records[recordKey(task)] || { status: "not-started", steps: {}, milestones: {} };
  }

  function overallReview(task, key = recordKey(task)) {
    if (task.procedureOnly || ['completed','verified','not-applicable'].includes(state.records[key]?.status)) return null;
    const year = Number(key.split('::')[1]?.match(/^\d{4}/)?.[0] || currentIso.slice(0,4));
    const dates = [task.dueDate, ...(task.milestones || []).map(item=>item.date), key.split('::')[1]]
      .filter(value=>window.WWHS_TASK_REVIEW.date(value) && value.startsWith(`${year}-`)).sort();
    const notBefore = dates.at(-1) || '';
    if (notBefore > currentIso) return null;
    // Historical baseline reviews used the task id before occurrence records
    // were available. Keep that identity so existing ticks can be reopened.
    return window.WWHS_TASK_REVIEW.resolve(window.WWHS_TASK_REVIEW.read().records, 'tas', task.historyOnly ? task.id : key, year, currentIso, notBefore)
      || window.WWHS_TASK_REVIEW.savedCompletion('tas', key, year, currentIso, notBefore);
  }

  function reviewedKeys() {
    return Object.keys(window.WWHS_TASK_REVIEW.read().records).filter(key=>key.startsWith('tas:')).flatMap(key=>{
      try { return [decodeURIComponent(key.split(':').slice(2).join(':'))]; } catch (_) { return []; }
    });
  }

  function weeklyReview(index, week = weekKey()) {
    if (safeObject(state.weekly[week])[index] === true) return null;
    return window.WWHS_TASK_REVIEW.resolve(window.WWHS_TASK_REVIEW.read().records, 'tas', `weekly-scan-${index}::${week}`, week.slice(0,4), currentIso, week);
  }

  function reviewedRecord(task, key = recordKey(task)) {
    return window.WWHS_TASK_REVIEW.project(state.records[key] || {status:'not-started',steps:{},milestones:{}}, overallReview(task,key), task.steps, 'steps', task.milestones || []);
  }

  function reviewIsCurrent(form) {
    const task = data.tasks.find(item=>item.id===form.dataset.taskId), current = window.WWHS_TASK_REVIEW.read();
    if (taskReviewSnapshot?.key === recordKey(task) && taskReviewSnapshot.raw === current.raw && current.readable && taskReviewSnapshot.note === window.WWHS_TASK_REVIEW.note(overallReview(task))) return true;
    formError(form.querySelector('.form-error'), 'The sign-off or task cycle changed. Your draft is still here. Copy unsaved notes, then close and reopen this task before saving.');
    return false;
  }

  function hasReviewedRecord(task) {
    return Object.prototype.hasOwnProperty.call(state.records, recordKey(task));
  }

  function statusFor(task) {
    return overallReview(task) ? 'completed' : recordFor(task).status || "not-started";
  }

  function isClosed(task) {
    return ["completed", "verified", "not-applicable"].includes(statusFor(task));
  }

  function describeTask(id, key) {
    const task = data.tasks.find(item => item.id === id);
    if (!task || task.historyOnly || task.procedureOnly) return null;
    refreshDate();
    const sourceKey = key || recordKey(task);
    const record = reviewedRecord(task, sourceKey), review = overallReview(task, sourceKey);
    const closed = ["completed", "verified", "not-applicable"].includes(record.status);
    const nextStep = task.steps.find((_, index) => record.steps?.[index] !== true);
    const milestone = task.milestones?.find((_, index) => record.milestones?.[index] !== true);
    return {
      wing: "tas", taskId: task.id, recordKey: sourceKey,
      title: task.title, action: closed ? task.doneWhen : nextStep || task.doneWhen,
      notes: window.WWHS_TASK_REVIEW.notes(record.exceptionReason, review),
      dueDate: task.milestones?.length ? milestone?.date || "" : task.dueDate || "",
      waitingOn: ["waiting", "exception"].includes(record.status) ? record.exceptionReason || task.owner || "" : "",
      status: closed ? "done" : ["waiting", "exception"].includes(record.status) ? "waiting" : "review",
      sourceStatus: review ? 'completed-externally' : record.status, cycle: sourceKey.split("::").slice(1).join("::"),
      taskHelp: {
        version: 1, wing: "tas", taskId: task.id, canonicalTaskId: task.id,
        title: task.title, recordKey: sourceKey, cycle: sourceKey.split("::").slice(1).join("::"),
        asOf: currentIso, sourceAsAt: data.config.calendarChecked,
        sourceStatus: review ? 'completed-externally' : record.status, nextStep: closed ? task.doneWhen : nextStep || task.doneWhen,
        objective: task.doneWhen, steps: task.steps || [],
        roles: [`Owner: ${task.owner || "To confirm"}`, `Verifier: ${task.verifier || "To confirm"}`],
        sources: [task.source, task.privacy].filter(Boolean),
        // Use the catalogue's approved routes, never a locally overridden URL.
        links: [...(window.WWHS_TASK_SOURCES?.publicLinks('tas',task) || []),
          ...(task.systemIds || []).map(id => data.systems.find(system => system.id === id)).filter(Boolean).map(system => ({ label: system.label, url: system.url }))]
          .filter((link,index,links) => /^https:\/\//.test(link.url || "") && links.findIndex(other => other.url === link.url) === index).slice(0,20)
      },
      route: `#task/${encodeURIComponent(task.id)}`
    };
  }

  function forecastStorageAvailable() {
    try {
      return !stateStorageBlocked && localStorage.getItem(data.config.storageKey) === savedStateRaw;
    } catch (_) {
      return false;
    }
  }

  function describeRecord(key) {
    if (typeof key !== "string" || !forecastStorageAvailable() || !Object.prototype.hasOwnProperty.call(state.records, key)) return null;
    return describeTask(key.split("::")[0], key);
  }

  function getForecast() {
    refreshDate();
    const horizonDays = 21;
    const term = termKey();
    const termNumber = Number(term.split("-t")[1]);
    const available = forecastStorageAvailable();
    const context = {
      wing: "tas", date: currentIso, role: "ht-tas", roleLabel: "Head Teacher TAS",
      year: currentDate.getFullYear(), sourceYear: data.config.operatingYear,
      sourceAsAt: data.config.calendarChecked, calendarChecked: data.config.calendarChecked,
      sourceStateKey: data.config.storageKey, horizonDays,
      termKey: term, weekBeginning: weekKey(), schoolWeek: null,
      mode: !available ? "unavailable" : operatingYearIsCurrent ? "current" : "reference-only",
      title: "Head Teacher TAS forecast",
      note: !available
        ? "Saved TAS progress is unavailable or changed in another tab. Copy any unsaved work, then reload before using the forecast."
        : !operatingYearIsCurrent
          ? `The dated calendar is a ${data.config.operatingYear} reference. Refresh it before forecasting ${currentDate.getFullYear()} work.`
          : `Calendar checked ${data.config.calendarChecked}; confirm listed dates in the live staff calendar. Term ${termNumber} uses the workboard's existing calendar grouping. School week and exact dates for recurring controls are not configured. Past dates without a recorded status need confirmation; they are not assumed to be missed work.`
    };
    if (context.mode !== "current") return { entries: [], context };

    const entries = new Map();
    const add = (task, key, options) => {
      const descriptor = describeTask(task.id, key);
      if (!descriptor || descriptor.status === "done") return;
      const waiting = descriptor.status === "waiting";
      entries.set(key, {
        ...descriptor,
        dueDate: options.scheduledDate || "",
        forecast: {
          section: waiting ? "waiting" : options.section,
          kind: options.kind, reason: options.reason,
          scheduledDate: options.scheduledDate || "", windowStart: options.windowStart || "", windowEnd: options.windowEnd || "",
          period: descriptor.cycle, sourceStatus: descriptor.sourceStatus,
          blocked: waiting, blockerReason: waiting ? descriptor.waitingOn : "",
          dateConfidence: options.scheduledDate ? "listed" : "undated",
          requiresConfirmation: options.requiresConfirmation === true
        }
      });
    };

    // Existing open occurrences remain actionable, including an older week, term or event.
    // A saved occurrence never creates a new due date or implies a fresh event happened.
    Object.keys(state.records).forEach(key => {
      const task = data.tasks.find(item => item.id === key.split("::")[0]);
      if (!task || task.historyOnly || task.procedureOnly) return;
      add(task, key, {
        section: "ready", kind: "recorded-follow-up",
        reason: "Open follow-up recorded in this browser; check the owner system for its current position.",
        requiresConfirmation: true
      });
    });

    data.tasks.forEach(task => {
      if (task.historyOnly || task.procedureOnly || isClosed(task)) return;
      const key = recordKey(task);
      const reviewed = hasReviewedRecord(task);
      const cycle = taskCycle(task);
      if (task.dueDate) {
        if (reviewed && task.milestones?.length && !pendingMilestone(task)) return;
        // Untouched milestone chains use the next listed reminder, as native Today does.
        // They must not turn an earlier unchecked milestone into an assertion of missed work.
        const date = reminderDate(task);
        if (!date || Number(date.slice(0, 4)) !== data.config.operatingYear || daysUntil(date) > horizonDays) return;
        const past = date < currentIso;
        add(task, key, {
          section: date <= currentIso ? "ready" : "upcoming",
          kind: past ? reviewed ? "overdue" : "past-date-review" : "dated",
          reason: past
            ? reviewed ? "A listed date has passed for this recorded open task; check the current school record." : "Listed date passed — status not confirmed in this browser."
            : "A listed calendar milestone is within the next 21 days; confirm it in the live staff calendar.",
          scheduledDate: date, requiresConfirmation: true
        });
        return;
      }
      if (cycle === "event" || task.id === "vet-handoff") return;
      const currentPhase = task.phase === `term_${termNumber}` || (task.phase === "annual" && termNumber === 1);
      if (cycle !== "week" && cycle !== "term" && !currentPhase) return;
      const endOfTerm = task.id === "term-workshop-close";
      const weekly = cycle === "week";
      const weekEnd = parseDate(weekKey());
      weekEnd.setDate(weekEnd.getDate() + 6);
      add(task, key, {
        section: endOfTerm ? "upcoming" : "ready",
        kind: weekly ? "weekly" : cycle === "term" ? "term-control" : "phase-control",
        reason: endOfTerm
          ? "End-of-term routine for this term; the exact local close-down date is not configured."
          : `${weekly ? "Current weekly routine" : cycle === "term" ? "Current term control" : "Current phase control"}. ${task.timing} No exact due date is configured.`,
        windowStart: weekly ? weekKey() : "", windowEnd: weekly ? isoDate(weekEnd) : "",
        requiresConfirmation: true
      });
    });
    return { entries: [...entries.values()], context };
  }

  // A catalogue view, not another forecast: future dates, event procedures and
  // saved older occurrences must remain discoverable without creating records.
  function getTaskRegister() {
    refreshDate();
    const available = forecastStorageAvailable();
    const focus = new Map(getForecast().entries.map(entry => [entry.recordKey, entry.forecast.reason]));
    const items = [];
    const sourceGaps = {
      "critical-gap": "The current source or local process still needs confirmation.",
      "verify-live": "Confirm the current owner-system instruction and applicability.",
      mixed: "Confirm the controlling version where current and legacy sources are mixed."
    };
    const repeatGaps = new Set(["annual-plan-alignment", "annual-rosters-rhythm", "class-readiness", "technology-rotations", "program-currency", "assessment-governance", "reporting-assurance", "capability-training"]);
    const dateGaps = new Set(["faculty-publications", "whs-inspection", "stocktake-disposal", "ag-farm-audit", "term-workshop-close"]);
    const occurrenceYear = key => key.split("::")[1]?.match(/^\d{4}(?=$|[-])/i)?.[0] || "ongoing";
    const scheduleFor = task => {
      const dates = [task.dueDate, ...(task.milestones || []).map(item => item.date)].filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date || "")).sort();
      if (dates.length) return { kind: dates[0] === dates.at(-1) ? "date" : "window", label: task.timing, startDate: dates[0], endDate: dates.at(-1) };
      return { kind: taskCycle(task) === "event" || task.id === "vet-handoff" ? "trigger" : task.timing ? "recurring" : "undated", label: task.timing || "No date or review rule recorded" };
    };
    const addTask = (task, key, olderOccurrence = false) => {
      const record = available ? state.records[key] : null;
      const review = available ? overallReview(task,key) : null;
      const reference = task.historyOnly || task.procedureOnly;
      const status = review ? 'completed' : reference ? task.historyOnly ? "reference" : "procedure" : !available ? "unavailable" : record?.status || "not-reviewed";
      const period = key.split("::").slice(1).join("::");
      const schedule = scheduleFor(task);
      if (olderOccurrence) schedule.label = `Recorded occurrence: ${period}. ${task.timing || "No separate due date recorded."}`;
      if (olderOccurrence && task.dueDate && occurrenceYear(key) !== task.dueDate.slice(0, 4)) {
        delete schedule.startDate;
        delete schedule.endDate;
        schedule.kind = "undated";
        schedule.label = `Recorded occurrence: ${period}. The captured calendar dates belong to ${task.dueDate.slice(0, 4)}; no separate date is confirmed for this occurrence.`;
      }
      const gaps = [];
      if (!task.historyOnly && sourceGaps[task.sourceState]) gaps.push(sourceGaps[task.sourceState]);
      if (!reference && dateGaps.has(task.id)) gaps.push("The timing rule is recorded; the exact local date still needs confirmation.");
      if (!reference && repeatGaps.has(task.id)) gaps.push("Additional term or change-trigger reviews are described but are not separately scheduled.");
      if (!reference && !task.timing && !task.dueDate) gaps.push("No date or review rule recorded.");
      if (!reference && !available) gaps.push("Saved progress is unavailable or changed in another tab; reload before relying on its status.");
      if (task.id === "t2-year7-report-chain") gaps.push("The captured report chain has no confirmed office hand-off date.");
      if (task.id === "t4-year11-report-chain") gaps.push("Confirm the local 16 October hand-off reaches the authorised NESA submitter for 21 October; check faculty applicability.");
      items.push({
        id: olderOccurrence ? key : task.id,
        title: olderOccurrence ? `${task.title} — ${period}` : task.title,
        year: olderOccurrence ? occurrenceYear(key) : task.dueDate ? task.dueDate.slice(0, 4) : "ongoing",
        recordKey: reference ? "" : key,
        route: `#task/${encodeURIComponent(task.id)}${olderOccurrence || key !== recordKey(task) ? `?record=${encodeURIComponent(key)}` : ""}`,
        area: areaMeta[task.area]?.label || "Core work", owner: task.owner || "Owner to confirm",
        status, complete: Boolean(review) || !reference && ["completed", "verified", "not-applicable"].includes(status), externallyReviewed:Boolean(review), reviewedOn:review?.reviewedOn || '',
        historyOnly: task.historyOnly === true, procedureOnly: task.procedureOnly === true,
        entryKind: task.procedureOnly ? "procedure" : olderOccurrence ? taskCycle(task) === "event" ? "event" : "scheduled" : "core",
        schedule, inFocus: focus.has(key), focusReason: focus.get(key) || "",
        sourceIds: [...(task.systemIds || [])], gaps
      });
    };
    data.tasks.forEach(task => {
      // A dated 2026 row must never inherit a new year's native record.
      const key = task.dueDate ? `${task.id}::${task.dueDate.slice(0, 4)}` : recordKey(task);
      addTask(task, key);
      if (!available || task.historyOnly || task.procedureOnly) return;
      [...new Set([...Object.keys(state.records), ...reviewedKeys()])].filter(savedKey => savedKey.split("::")[0] === task.id && savedKey !== key)
        .sort().forEach(savedKey => addTask(task, savedKey, true));
    });
    const currentWeek = weekKey();
    const addWeekly = (label, index, week, olderOccurrence = false) => {
      const review = available && weeklyReview(index,week);
      const checked = available && (safeObject(state.weekly[week])[index] === true || Boolean(review));
      items.push({
        id: `weekly-scan-${index}${olderOccurrence ? `::${week}` : ""}`,
        recordKey: `weekly-scan-${index}::${week}`,
        title: `${label}${olderOccurrence ? ` — week beginning ${week}` : ""}`,
        year: olderOccurrence ? week.slice(0, 4) : "ongoing", route: `#today?weekly=${index}&week=${encodeURIComponent(week)}`,
        area: "Weekly review", owner: "Head Teacher TAS", status: !available ? "unavailable" : checked ? "completed" : "not-reviewed",
        complete: checked, externallyReviewed:Boolean(review), reviewedOn:review?.reviewedOn || '', historyOnly: false, procedureOnly: false,
        entryKind: olderOccurrence ? "scheduled" : "core",
        schedule: { kind: "recurring", label: `Weekly scan · week beginning ${week}`, startDate: week },
        inFocus: false, focusReason: "", sourceIds: ["staff-calendar", "nesa-actions", "tas-drive"],
        gaps: !available ? ["Saved weekly progress is unavailable; reload before relying on its status."] : []
      });
    };
    data.weeklyChecks.forEach((label, index) => {
      addWeekly(label, index, currentWeek);
      const reviewWeeks = reviewedKeys().filter(key=>key.startsWith(`weekly-scan-${index}::`)).map(key=>key.split('::')[1]);
      if (available) [...new Set([...Object.keys(state.weekly).filter(week=>Object.prototype.hasOwnProperty.call(safeObject(state.weekly[week]), index)), ...reviewWeeks])].filter(week => week !== currentWeek && /^\d{4}-\d{2}-\d{2}$/.test(week))
        .sort().forEach(week => addWeekly(label, index, week, true));
    });
    return {
      wing: "tas", currentYear: currentDate.getFullYear(), roleLabel: "Head Teacher TAS — all defined duties",
      sourceNote: `School calendar: ${data.config.operatingYear}, last checked ${data.config.calendarChecked}. NESA hand-off checks added from the May 2026 timetable on 17 September 2026. Ongoing rules are shown across years; future dates have not been invented.`,
      items,
      coverageNotes: [
        "This register includes every task defined in the workboard, its saved occurrences and the five weekly scan controls. It is not proof that every school obligation has been captured.",
        "The live staff calendar, Head Teacher guide and current local procedures still need reconciliation with this saved catalogue. Confirm each duty's owner and applicability.",
        "Event procedures rely on staff recognising the event. A described trigger is not an automatic notification from a school system.",
        "Some annual records also describe term reviews or change triggers. Closing that record does not schedule each later review.",
        "NESA dates are school deadlines. Confirm applicable courses and each faculty hand-off with the authorised submitting or certifying role; this catalogue does not give the Head Teacher that authority.",
        "The five weekly scans are available on Today; they are not generated by the 21-day forecast.",
        "Historical calendar rows and protected procedures are retained as reference; protected cases stay in their authorised systems.",
        `No new ${data.config.operatingYear + 1} school calendar has been verified or rolled forward. There is no TAS role filter hiding catalogue duties.`
      ]
    };
  }

  function planTaskButton(task) {
    if (task.historyOnly || task.procedureOnly) return "";
    return `<button class="button secondary compact" type="button" data-action="track-task" data-task-id="${esc(task.id)}">Add to my work</button>`;
  }

  function sourcePill(task) {
    const labels = {
      "calendar-current": ["Current date", "good"],
      "current-local": ["Recent local artefact · confirm owner", "warn"],
      "front-door-current": ["Current front door", "good"],
      mapped: ["Mapped hand-off", "good"],
      mixed: ["Check current method", "warn"],
      "verify-live": ["Verify live", "warn"],
      "critical-gap": ["Setup gap", "alert"]
    };
    const [label, className] = labels[task.sourceState] || ["Source mapped", "neutral"];
    return `<span class="pill source ${className}">${esc(label)}</span>`;
  }

  function statusPill(task) {
    if (overallReview(task)) return `<span class="pill status completed">Task complete · overall sign-off</span>`;
    if (task.historyOnly) return `<span class="pill status muted">2026 baseline</span>`;
    if (task.procedureOnly) return `<span class="pill status muted">Procedure only</span>`;
    if (!hasReviewedRecord(task)) return `<span class="pill status muted">Not reviewed here</span>`;
    const status = statusFor(task);
    const meta = statusMeta[status];
    return `<span class="pill status ${meta.className}">${esc(meta.label)}</span>`;
  }

  function priorityPill(task) {
    if (task.priority === "critical") return `<span class="pill priority critical">Critical</span>`;
    if (task.priority === "high") return `<span class="pill priority high">High</span>`;
    return "";
  }

  function currentRoute() {
    const task = taskFromRoute();
    if (task) return areaMeta[task.area]?.route || "today";
    const value = (location.hash || "#home").slice(1).split("?")[0];
    const allowed = ["home", "today", "my-work", "calendar", "teaching", "faculty", "people", "reference", "ai-admin"];
    return allowed.includes(value) ? value : "home";
  }

  function taskFromRoute() {
    if (!location.hash.startsWith("#task/")) return null;
    try {
      const id = decodeURIComponent(location.hash.slice(6).split("?")[0]);
      return data.tasks.find(task => task.id === id) || null;
    } catch (_) {
      return null;
    }
  }

  function renderRoute() {
    const task = taskFromRoute();
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    const savedKey = params.get("record");
    if (taskDialog.open) taskDialog.close();
    if (task) history.replaceState(null, "", `#${areaMeta[task.area]?.route || "today"}`);
    render();
    if (task && savedKey) openSavedTask(task, savedKey);
    else if (task) openTask(task.id);
    else if (currentRoute() === "today" && params.has("weekly")) revealWeeklyScan(params);
    else document.getElementById("main-content")?.focus({ preventScroll: true });
  }

  function openSavedTask(task, key) {
    const validKey = key.split("::")[0] === task.id;
    const available = validKey && forecastStorageAvailable();
    const record = available ? reviewedRecord(task,key) : null, review = available ? overallReview(task,key) : null;
    lastTaskTrigger = document.activeElement;
    taskDialogContent.innerHTML = `<header class="dialog-head"><div><p class="eyebrow">Recorded occurrence · read only</p><h2 id="task-dialog-title">${esc(task.title)}</h2></div><button class="dialog-close" type="button" data-action="close-task" aria-label="Close task">×</button></header>
      <div class="dialog-body"><p><strong>Occurrence:</strong> ${esc(validKey ? key.split("::").slice(1).join("::") : "Unavailable")}</p><p><strong>Saved status:</strong> ${esc(!available ? "Unavailable — reload to check saved progress" : record ? statusMeta[record.status]?.label || record.status : "Not reviewed here")}</p>
      <p>This is the saved occurrence, separate from the current cycle. It does not alter the official school record.</p>${review ? `<p>${esc(window.WWHS_TASK_REVIEW.note(review))}</p>` : ""}${record?.exceptionReason ? `<p>${esc(record.exceptionReason)}</p>` : ""}
      ${taskSourcePanel(task,key.split("::")[1]?.slice(0,4))}<section class="dialog-section"><h3>Actions</h3><p class="section-help">Source links open current destinations; they do not reconstruct the source as it was at the time.</p><ol class="action-list">${task.steps.map((step, index) => `<li><div class="history-step"><span class="step-number">${record?.steps?.[index] ? "✓" : index + 1}</span><span>${esc(step)}</span></div>${stepGuidance(task, index)}</li>`).join("")}</ol></section>
      ${task.milestones?.length ? `<section class="dialog-section"><h3>Captured calendar milestones</h3>${guidanceLinks(window.TAS_STEP_GUIDANCE?.forMilestone(task))}<ul>${task.milestones.map((item, index) => `<li>${record?.milestones?.[index] ? "✓ " : ""}${esc(item.date)} · ${esc(item.label)}</li>`).join("")}</ul></section>` : ""}
      <section class="owner-systems"><h3>Open the owner system</h3><div class="system-buttons">${systemButtons(task)}</div><p>${esc(task.privacy)}</p></section>
      <div class="dialog-actions"><button class="button quiet" type="button" data-action="close-task">Close occurrence</button></div></div>`;
    taskDialog.showModal();
  }

  function revealWeeklyScan(params) {
    const index = Number(params.get("weekly"));
    const week = params.get("week") || weekKey();
    if (!Number.isInteger(index) || index < 0 || index >= data.weeklyChecks.length || !/^\d{4}-\d{2}-\d{2}$/.test(week)) return;
    if (week === weekKey()) {
      const check = document.querySelector(`[data-weekly-check="${index}"]`);
      const panel = check?.closest("details");
      if (panel) panel.open = true;
      check?.scrollIntoView({ block: "center" });
      check?.focus({ preventScroll: true });
      return;
    }
    const available = forecastStorageAvailable();
    const checked = available && (safeObject(state.weekly[week])[index] === true || Boolean(weeklyReview(index,week)));
    lastTaskTrigger = document.activeElement;
    taskDialogContent.innerHTML = `<header class="dialog-head"><div><p class="eyebrow">Saved weekly scan · read only</p><h2 id="task-dialog-title">${esc(data.weeklyChecks[index])}</h2></div><button class="dialog-close" type="button" data-action="close-task" aria-label="Close task">×</button></header><div class="dialog-body"><p>Week beginning ${esc(week)}.</p><p>${!available ? "Saved progress is unavailable; reload to check it." : checked ? "Ticked in this browser." : "Not ticked in this browser."}</p><p>This is a local review reminder, separate from this week's scan and official school records. Links open the current source, not a historical copy.</p>${taskSourcePanel({id:`weekly-scan-${index}`},week.slice(0,4))}${guidanceLinks(window.TAS_STEP_GUIDANCE?.forWeekly(index))}<button class="button quiet" type="button" data-action="close-task">Close occurrence</button></div>`;
    taskDialog.showModal();
  }

  function render() {
    refreshDate();
    const route = currentRoute();
    document.body.dataset.route = route;
    document.querySelectorAll(".route-nav [data-route]").forEach(link => {
      const active = link.dataset.route === route;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.querySelector("[data-action='toggle-guidance']").textContent = state.guidance ? "Guidance on" : "Guidance off";
    document.querySelector("[data-action='toggle-guidance']").setAttribute("aria-pressed", String(state.guidance));

    if (route === "home") renderHome();
    else if (route === "today") renderToday();
    else if (route === "my-work") routeContent.innerHTML = "";
    else if (route === "calendar") renderCalendar();
    else if (["teaching", "faculty", "people"].includes(route)) renderArea(route);
    else if (route === "ai-admin") {
      routeContent.innerHTML = window.WWHS_AI_ADMIN?.render() || `<div class="page-wrap"><h1>AI Admin</h1><p>This section is unavailable. Reload the page to try again.</p></div>`;
      window.WWHS_AI_ADMIN?.bind(routeContent);
    }
    else renderReference();

    closeNavigation();
  }

  function pageHeader(kicker, title, intro, actions = "") {
    return `<header class="page-head"><div><p class="eyebrow">${esc(kicker)}</p><h1>${esc(title)}</h1><p>${esc(intro)}</p></div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</header>`;
  }

  function yearBanner() {
    if (operatingYearIsCurrent) return "";
    return `<aside class="alert-banner warning"><strong>The dated calendar is a 2026 baseline.</strong><span>Refresh the live Staff Calendar and NESA dates before using this workboard in ${currentDate.getFullYear()}.</span><button type="button" data-action="open-task" data-task-id="annual-calendar-control">Open annual refresh</button></aside>`;
  }

  function privacyBanner() {
    const task = data.tasks.find(item => item.id === "source-sharing-review");
    if (!task || isClosed(task)) return "";
    return `<details class="standing-panel"><summary>Staff-source access and sharing</summary><p>Some saved routes open a Drive search or portal. Use the school account and check the current document and its access settings before relying on it.</p><button class="button quiet compact" type="button" data-action="open-task" data-task-id="source-sharing-review">Review source access</button></details>`;
  }

  function renderHome() {
    const areas = [
      ["today", "Today", "Upcoming dates and follow-ups you have recorded here."],
      ["calendar", "Calendar", "School dates, reporting milestones and annual planning."],
      ["teaching", "Teaching & reporting", "Programs, assessment, reporting and course quality."],
      ["faculty", "Faculty operations", "Meetings, budget, equipment and workshop resources."],
      ["people", "People & safety", "Staff support, safety and event-driven procedures."],
      ["reference", "Systems & documents", "School portals, staff sources and reference material."]
    ];
    routeContent.innerHTML = `<div class="page-wrap dash-tas-home">
      ${pageHeader("YOUR WORK PATHWAYS", "Head Teacher TAS", "Move straight into the part of the job you need.")}
      <nav class="dash-workareas" aria-label="Head Teacher work areas">${areas.map(([href, label, description]) => `<a class="dash-workarea" data-area="${esc(href)}" href="#${href}"><span class="dash-workarea-icon">${window.WWHS_DASHBOARD?.icon?.(href) || ""}</span><span class="dash-workarea-copy"><strong>${esc(label)}</strong><span>${esc(description)}</span></span><span class="dash-workarea-arrow" aria-hidden="true">→</span></a>`).join("")}</nav>
      ${yearBanner()}
      <details class="standing-panel"><summary>Using this workboard</summary><p>Use Today for date reminders and local follow-ups. Detailed guidance is available when you open a task. “Not reviewed here” means no progress has been recorded in this browser; it does not mean the work was missed.</p><p>Official records stay in the school systems. This browser saves only your local workboard progress.</p><a class="text-link" href="../#home">Choose another wing →</a></details>
    </div>`;
  }

  function activeDueTasks() {
    return data.tasks
      .filter(task => task.dueDate && !task.historyOnly && !task.procedureOnly && !isClosed(task))
      .sort((a, b) => queueDueDate(a).localeCompare(queueDueDate(b)));
  }

  function reminderDate(task) {
    if (!hasReviewedRecord(task) && task.milestones?.length) {
      return task.milestones.find(item => item.date >= currentIso)?.date || queueDueDate(task);
    }
    return queueDueDate(task);
  }

  function recordedFollowUps() {
    const rank = { exception: 0, waiting: 1, "in-progress": 2, "not-started": 3 };
    return data.tasks.filter(task => !task.historyOnly && !task.procedureOnly && hasReviewedRecord(task) && !isClosed(task))
      .sort((a, b) => (rank[statusFor(a)] ?? 4) - (rank[statusFor(b)] ?? 4) || (queueDueDate(a) || "9999").localeCompare(queueDueDate(b) || "9999"));
  }

  function renderToday() {
    const followUps = recordedFollowUps();
    const justCompleted = data.tasks.filter(task => statusFor(task) === "completed" && completionUndo.get(recordKey(task))?.after === recordFor(task));
    const upcoming = operatingYearIsCurrent ? activeDueTasks().filter(task => reminderDate(task) >= currentIso)
      .sort((a, b) => reminderDate(a).localeCompare(reminderDate(b))).slice(0, 6) : [];
    const unreviewedPast = activeDueTasks().filter(task => !hasReviewedRecord(task) && queueDueDate(task) < currentIso);
    const week = weekKey();
    const checks = Object.fromEntries(data.weeklyChecks.map((_,index)=>[index,safeObject(state.weekly[week])[index] === true || Boolean(weeklyReview(index,week))]));
    const completedChecks = data.weeklyChecks.filter((_, index) => checks[index] === true).length;
    const actions = `<a class="button secondary compact" href="#calendar">Workboard dates</a>`;

    routeContent.innerHTML = `<div class="page-wrap">
      ${pageHeader(currentTermLabel(), "Today", "Upcoming dates and the follow-ups you have recorded in this browser.", actions)}
      ${yearBanner()}
      <section class="coming-section"><div class="section-heading"><div><h2>Recorded follow-ups</h2><p>${followUps.length ? `${followUps.length} open item${followUps.length === 1 ? "" : "s"} you have recorded here.` : "No follow-ups recorded in this browser. Your school systems remain the record."}</p></div></div>${followUps.length ? `<div class="coming-list">${followUps.map((task, index) => comingRow(task, index + 1)).join("")}</div>` : ""}</section>
      ${justCompleted.length ? `<section class="coming-section"><div class="section-heading"><h2>Just completed</h2></div><div class="coming-list">${justCompleted.map((task, index) => comingRow(task, index + 1, "All checklist boxes ticked")).join("")}</div></section>` : ""}
      <section class="coming-section"><div class="section-heading"><div><h2>Upcoming dates to check</h2><p>Next listed dates from the calendar checked on 26 August 2026. Confirm them in the live staff calendar.</p></div></div>${upcoming.length ? `<div class="coming-list">${upcoming.map((task, index) => comingRow(task, index + 1, `Listed ${shortDate(reminderDate(task))} · check live calendar`)).join("")}</div>` : `<p class="empty-line">${operatingYearIsCurrent ? "No later dates are listed in this calendar snapshot." : "Refresh the school calendar before using dates for this year."}</p>`}</section>
      ${unreviewedPast.length ? `<details class="standing-panel"><summary>Review past dates (${unreviewedPast.length} not reviewed here)</summary><p>These dates have passed, but this browser has no recorded status. They are not assumed to be missed work. Check the school record before adding a status.</p><div class="coming-list">${unreviewedPast.map((task, index) => comingRow(task, index + 1)).join("")}</div></details>` : ""}
      <details class="standing-panel"><summary>Five-minute weekly scan · ${completedChecks} checks recorded</summary><p>Week beginning ${shortDate(week)}. These ticks are local reminders. A tick covered by an overall sign-off can be reopened from the full task register.</p>
        <div class="weekly-checks">${data.weeklyChecks.map((label, index) => `<div class="weekly-check"><label><input type="checkbox" data-weekly-check="${index}" ${checks[index] ? "checked" : ""} ${weeklyReview(index,week) ? "disabled" : ""}><span>${esc(label)}</span></label>${guidanceLinks(window.TAS_STEP_GUIDANCE?.forWeekly(index))}<details class="weekly-source-details"><summary>Sources for this weekly check</summary>${taskSourcePanel({id:`weekly-scan-${index}`})}</details></div>`).join("")}</div>
      </details>
    </div>`;
  }

  function nextActionCard(task) {
    return `<article class="next-card">
      <div class="next-number" aria-hidden="true">01</div>
      <div class="next-badges">${priorityPill(task)}${statusPill(task)}<span class="pill due">${esc(dueLabel(task))}</span></div>
      <p class="eyebrow">${esc(areaMeta[task.area]?.label || "Core work")}</p>
      <h2>${esc(task.title)}</h2>
      <p class="next-summary">${esc(task.summary)}</p>
      <div class="next-facts"><div><span>Accountable</span><strong>${esc(task.owner)}</strong></div><div><span>Start in</span><strong>${esc(primarySystemLabel(task))}</strong></div></div>
      <button class="button primary" type="button" data-action="open-task" data-task-id="${esc(task.id)}">Show me this task</button>
    </article>`;
  }

  function comingRow(task, number, timing = dueLabel(task)) {
    return `<article class="coming-row"><button class="coming-task-open" type="button" data-action="open-task" data-task-id="${esc(task.id)}"><span class="row-number">${String(number).padStart(2, "0")}</span><span><strong>${esc(task.title)}</strong><small>${esc(timing)}</small></span>${statusPill(task)}</button><div class="coming-actions">${taskCompletionActions(task)}</div></article>`;
  }

  function taskCompletionActions(task) {
    if (task.historyOnly || task.procedureOnly) return "";
    const record = recordFor(task);
    return `${planTaskButton(task)}${!isClosed(task) ? `<button class="button primary compact" type="button" data-action="complete-task" data-task-id="${esc(task.id)}" aria-label="Task Complete: ${esc(task.title)}" title="Tick all steps, milestones and completion checks">Task Complete</button>` : ""}
      ${record.status === "completed" ? `<span class="task-complete-label">✓ Task Complete</span>` : ""}
      ${record.status === "completed" && completionUndo.get(recordKey(task))?.after === record ? `<button class="button secondary compact" type="button" data-action="undo-complete-task" data-task-id="${esc(task.id)}" aria-label="Undo completion: ${esc(task.title)}">Undo</button>` : ""}`;
  }

  function renderCalendar() {
    const dated = data.tasks.filter(task => task.dueDate).sort((a, b) => queueDueDate(a).localeCompare(queueDueDate(b)));
    const upcoming = operatingYearIsCurrent ? dated.filter(task => daysUntil(queueDueDate(task)) >= -21) : dated;
    const elapsed = operatingYearIsCurrent ? dated.filter(task => daysUntil(queueDueDate(task)) < -21).reverse() : [];
    const controls = data.tasks.filter(task => task.area === "calendar" && !task.dueDate);

    routeContent.innerHTML = `<div class="page-wrap">
      ${pageHeader("2026 CONTROL CALENDAR", "Dates, milestones and lead time", "Exact 2026 dates come from the live Staff School Calendar. Future years require a fresh calendar audit.", `<button class="button secondary compact" type="button" data-action="launch-system" data-system-id="staff-calendar">Open live calendar ↗</button>`)}
      ${yearBanner()}
      <section class="calendar-callout"><div><span>Calendar checked</span><strong>26 August 2026</strong></div><p>The school year pattern is useful for planning, but the dates below must not be rolled into another year without verification.</p><button type="button" data-action="open-task" data-task-id="annual-calendar-control">Annual refresh process</button></section>
      <section class="timeline-section"><div class="section-heading"><div><h2>${operatingYearIsCurrent ? "Current and coming" : "2026 dated baseline"}</h2><p>${upcoming.length} listed date${upcoming.length === 1 ? "" : "s"}. Dates alone do not confirm whether work is complete.</p></div></div><div class="timeline">${upcoming.map(calendarItem).join("") || `<p class="empty-line">No later 2026 dates remain.</p>`}</div></section>
      ${elapsed.length ? `<details class="elapsed"><summary>Earlier 2026 dates (${elapsed.length})</summary><div class="timeline compact-timeline">${elapsed.map(calendarItem).join("")}</div></details>` : ""}
      <section class="timeline-section"><div class="section-heading"><div><h2>Calendar controls</h2><p>These keep the dates current rather than adding more dates.</p></div></div><div class="card-grid">${controls.map(taskCard).join("")}</div></section>
    </div>`;
  }

  function calendarItem(task) {
    const date = parseDate(queueDueDate(task));
    const month = date.toLocaleDateString("en-AU", { month: "short" }).toUpperCase();
    const day = date.getDate();
    const record = recordFor(task);
    return `<article class="timeline-item ${isClosed(task) ? "is-closed" : ""}">
      <div class="date-tile"><span>${esc(month)}</span><strong>${day}</strong></div>
      <div class="timeline-body"><div class="card-badges">${priorityPill(task)}${statusPill(task)}${sourcePill(task)}</div><h3>${esc(task.title)}</h3><p>${esc(task.timing)}</p>${task.milestones ? `<ul class="milestone-mini">${task.milestones.map((item, index) => `<li class="${record.milestones?.[index] ? "is-done" : ""}"><span>${record.milestones?.[index] ? "✓ " : ""}${esc(shortDate(item.date))}</span>${esc(item.label)}</li>`).join("")}</ul>` : ""}</div>
      <div class="timeline-actions">
        ${taskCompletionActions(task)}
        <button class="button quiet compact" type="button" data-action="open-task" data-task-id="${esc(task.id)}">Open</button>
      </div>
    </article>`;
  }

  function refreshCalendarTask(task) {
    const elapsedOpen = document.querySelector(".elapsed")?.open;
    const expandedPanels = [...document.querySelectorAll(".standing-panel[open]")].map(panel => panel.querySelector("summary")?.textContent.split("·")[0].split("(")[0].trim());
    render();
    document.querySelectorAll(".standing-panel").forEach(panel => {
      const label = panel.querySelector("summary")?.textContent.split("·")[0].split("(")[0].trim();
      if (expandedPanels.includes(label)) panel.open = true;
    });
    const elapsed = document.querySelector(".elapsed");
    if (elapsed) elapsed.open = Boolean(elapsedOpen);
    const id = CSS.escape(task.id);
    const replacement = document.querySelector(`[data-action="undo-complete-task"][data-task-id="${id}"]`)
      || document.querySelector(`[data-action="complete-task"][data-task-id="${id}"]`)
      || document.querySelector(`[data-action="open-task"][data-task-id="${id}"]`);
    replacement?.focus({ preventScroll: currentRoute() !== "today" });
  }

  function completeCalendarTask(id) {
    const task = data.tasks.find(item => item.id === id);
    if (!task || task.historyOnly || task.procedureOnly || isClosed(task)) return;
    const key = recordKey(task);
    const before = state.records[key];
    const after = {
      ...recordFor(task),
      status: "completed",
      steps: Object.fromEntries(task.steps.map((_, index) => [index, true])),
      milestones: Object.fromEntries((task.milestones || []).map((_, index) => [index, true])),
      sourceChecked: true,
      doneConfirmed: true,
      updatedAt: new Date().toISOString()
    };
    state.records[key] = after;
    if (!saveState()) {
      if (before) state.records[key] = before;
      else delete state.records[key];
      return;
    }
    completionUndo.set(key, { before, after });
    refreshCalendarTask(task);
    toast("Task complete — all checklist boxes ticked");
  }

  function undoCalendarCompletion(id) {
    const task = data.tasks.find(item => item.id === id);
    if (!task || task.historyOnly || task.procedureOnly) return;
    const key = recordKey(task);
    const undo = completionUndo.get(key);
    if (!undo || state.records[key] !== undo.after) return;
    if (undo.before) state.records[key] = undo.before;
    else delete state.records[key];
    if (!saveState()) {
      state.records[key] = undo.after;
      return;
    }
    completionUndo.delete(key);
    refreshCalendarTask(task);
    toast("Completion undone — previous progress restored");
  }

  function renderArea(area) {
    const meta = areaMeta[area];
    const query = state.search.trim().toLowerCase();
    const areaTasks = data.tasks.filter(task => task.area === area);
    const allTasks = areaTasks.filter(task => !task.historyOnly);
    const historyTasks = areaTasks.filter(task => task.historyOnly);
    const filtered = query ? allTasks.filter(task => [task.title, task.summary, task.source, task.timing].join(" ").toLowerCase().includes(query)) : allTasks;
    const historyFiltered = query ? historyTasks.filter(task => [task.title, task.summary, task.source, task.timing].join(" ").toLowerCase().includes(query)) : historyTasks;
    const trackableTasks = allTasks.filter(task => !task.procedureOnly);
    const coreAll = filtered.filter(task => task.phase !== "triggered");
    const earlier = coreAll.filter(task => task.dueDate && daysUntil(queueDueDate(task)) < -21);
    const core = coreAll.filter(task => !earlier.includes(task));
    const triggered = filtered.filter(task => task.phase === "triggered");
    const groups = {
      closed: { label: "recorded closed", title: "Recorded closed tasks", tasks: trackableTasks.filter(isClosed) },
      critical: { label: "recorded critical follow-ups", title: "Recorded critical follow-ups", tasks: trackableTasks.filter(task => hasReviewedRecord(task) && task.priority === "critical" && !isClosed(task)) },
      unreviewed: { label: "not reviewed here", title: "Tasks not reviewed here", tasks: trackableTasks.filter(task => !hasReviewedRecord(task)) },
      triggered: { label: "event-driven workflows", title: "Event-driven workflows", tasks: allTasks.filter(task => task.phase === "triggered") }
    };
    const filter = new URLSearchParams(location.hash.split("?")[1] || "").get("filter");
    const selected = Object.prototype.hasOwnProperty.call(groups, filter) ? groups[filter] : null;
    const selectedTasks = selected ? selected.tasks.filter(task => !query || [task.title, task.summary, task.source, task.timing].join(" ").toLowerCase().includes(query)) : [];


    routeContent.innerHTML = `<div class="page-wrap">
      ${pageHeader(meta.label.toUpperCase(), meta.label, meta.intro, `<label class="search-box"><span class="sr-only">Search ${esc(meta.label)}</span><input type="search" value="${esc(state.search)}" placeholder="Search this area" data-area-search></label>`)}
      ${area === "people" ? privacyBanner() : ""}
      <nav class="area-summary" aria-label="Filter tasks by status">${Object.entries(groups).map(([key, group]) => `<a href="#${esc(area)}?filter=${key}" ${filter === key ? 'aria-current="true"' : ""}><strong>${group.tasks.length}</strong> ${esc(group.label)}</a>`).join("")}</nav>
      ${selected ? `<section class="task-section"><div class="section-heading"><div><h2>${esc(selected.title)}</h2><p>${selectedTasks.length} matching task${selectedTasks.length === 1 ? "" : "s"}.</p></div><a class="button secondary compact" href="#${esc(area)}">Show all</a></div><div class="card-grid">${selectedTasks.map(taskCard).join("") || `<div class="empty-state"><h3>No matching tasks</h3><p>${query ? "Clear the search or choose Show all." : "There are no tasks in this category."}</p></div>`}</div></section>` : `
      <section class="task-section"><div class="section-heading"><div><h2>${area === "teaching" ? "Core teaching controls" : area === "faculty" ? "Operating controls" : "Planned people controls"}</h2><p>${state.mode === "guided" ? "Open one task and follow it step by step." : "Fast view—open only the detail you need."}</p></div></div><div class="card-grid">${core.map(taskCard).join("") || emptySearch()}</div></section>
      ${earlier.length ? `<details class="elapsed"><summary>Earlier 2026 controls (${earlier.length})</summary><div class="card-grid compact-card-grid">${earlier.map(taskCard).join("")}</div></details>` : ""}
      ${historyFiltered.length ? `<details class="elapsed history-panel"><summary>Term 1–2 2026 baseline and annual pattern (${historyFiltered.length})</summary><p>Read-only history for handover and future-year planning. It is not retrospective non-compliance.</p><div class="card-grid compact-card-grid">${historyFiltered.map(taskCard).join("")}</div></details>` : ""}
      ${triggered.length ? `<section class="task-section triggered-section"><div class="section-heading"><div><h2>Use only when triggered</h2><p>These interrupt normal work when the event occurs.</p></div></div><div class="card-grid">${triggered.map(taskCard).join("")}</div></section>` : ""}
      `}
    </div>`;
  }

  function emptySearch() {
    return `<div class="empty-state"><h3>No matching tasks</h3><p>Clear the search to see the full area.</p></div>`;
  }

  function taskCard(task) {
    return `<article class="task-card ${isClosed(task) ? "is-closed" : ""} ${task.historyOnly ? "is-history" : ""}">
      <div class="card-badges">${priorityPill(task)}${statusPill(task)}${sourcePill(task)}</div>
      <p class="eyebrow">${esc(phaseLabels[task.phase] || task.timing)}</p>
      <h3>${esc(task.title)}</h3>
      <p>${esc(task.summary)}</p>
      <div class="task-card-foot"><span>${esc(task.dueDate ? dueLabel(task) : task.timing)}<small>${esc(task.historyOnly ? "Read-only annual pattern" : cycleLabel(task))}</small></span><div class="task-card-actions">${taskCompletionActions(task)}<button class="button quiet compact" type="button" data-action="open-task" data-task-id="${esc(task.id)}">${task.historyOnly ? "View baseline" : "Open task"}</button></div></div>
    </article>`;
  }

  function renderReference() {
    const groups = [...new Set(data.systems.map(system => system.group))];
    const currentCount = data.systems.filter(currentSystemUrl).length;
    const localCount = data.systems.filter(system => !currentSystemUrl(system)).length;
    routeContent.innerHTML = `<div class="page-wrap">
      ${pageHeader("REFERENCE LIBRARY", "Systems and documents", "Open a system, find a staff source or review your saved links.", `<button class="button primary compact" type="button" data-action="open-settings">Review staff links</button>`)}
      ${privacyBanner()}
      <section class="source-boundary"><div><strong>${currentCount}</strong><span>links available</span></div><div><strong>${localCount}</strong><span>need a link</span></div><p>A saved link may open a search or portal. It does not verify the destination, access or current document version.</p></section>
      ${groups.map(group => systemGroup(group)).join("")}
      <section class="source-audit"><div class="section-heading"><div><h2>What controls this workboard</h2><p>Four source layers, with a clear authority boundary.</p></div></div><div class="source-grid">${data.sourceGroups.map(sourceCard).join("")}</div></section>
      <details class="retired-panel"><summary>Retired or reference-only items</summary><ul>${data.retiredItems.map(item => `<li>${esc(item)}</li>`).join("")}</ul></details>
      ${handoverPanel()}
    </div>`;
  }

  function systemGroup(group) {
    const systems = data.systems.filter(system => system.group === group);
    return `<section class="systems-section"><div class="section-heading"><div><h2>${esc(group)}</h2><p>Use the saved route and confirm the destination after opening it.</p></div></div><div class="system-grid">${systems.map(systemCard).join("")}</div></section>`;
  }

  function destinationLabel(url) {
    if (window.WWHS_DASHBOARD?.destinationLabel) return window.WWHS_DASHBOARD.destinationLabel(url);
    if (/drive\.google\.com\/drive\/search/i.test(url)) return "Find in Drive";
    if (/drive\.google\.com\/drive\/(shared-drives|folders)/i.test(url)) return "Open Drive";
    if (/docs\.google\.com\/document|drive\.google\.com\/file/i.test(url)) return "Open document";
    return "Open system";
  }

  function systemCard(system) {
    const url = currentSystemUrl(system);
    const status = url ? "Link available" : "Setup required";
    return `<article class="system-card ${url ? "has-link" : "needs-link"}">
      <div class="system-top"><span class="system-kind">${esc(system.kind === "public" ? "PUBLIC" : system.kind === "local" ? "CONTROLLED" : "STAFF")}</span><span class="pill source ${url ? "good" : "warn"}">${esc(status)}</span></div>
      <h3>${esc(system.label)}</h3><p>${esc(system.purpose)}</p><small>${esc(system.note)}</small>
      ${url ? `<button class="button quiet compact" type="button" data-action="launch-system" data-system-id="${esc(system.id)}">${esc(destinationLabel(url))} ↗</button>` : `<button class="button quiet compact" type="button" data-action="open-settings">Add approved link</button>`}
    </article>`;
  }

  function sourceCard(item) {
    const label = item.status === "current" ? "Current" : item.status === "restricted" ? "Restricted" : "Mixed currency";
    const mapped={calendar:['WWHS-STAFF-CALENDAR','NESA-TOA-2026-MAY'],guide:['WWHS-HT-DOC','TAS-FACULTY-PLAN'],drive:[], 'owner-systems':[]};
    const systems=item.id==='drive'?['tas-drive']:item.id==='owner-systems'?['sentral','nesa-actions','mypl']:[];
    const links=(window.WWHS_TASK_SOURCES?.directory(mapped[item.id]||[])||'')+guidanceLinks(systems.map(id=>({systemId:id,label:`Open ${data.systems.find(system=>system.id===id)?.label || id}`,hint:'Use the authorised account to open the current record.'})));
    return `<article class="source-card"><span class="pill source ${item.status === "current" ? "good" : item.status === "restricted" ? "alert" : "warn"}">${esc(label)}</span><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p>${links}</article>`;
  }

  function taskSourcePanel(task, year) {
    return window.WWHS_TASK_SOURCES?.panel('tas',{...task,operatingYear:Number(year || (task.dueDate || currentIso).slice(0,4))}) || '';
  }

  function handoverPanel() {
    const completed = data.tasks.filter(isClosed).length;
    const active = data.tasks.filter(task => !isClosed(task) && statusFor(task) !== "not-started").length;
    return `<section class="handover-panel"><div><p class="eyebrow">CONTINUITY</p><h2>Handover and browser backup</h2><p>Export privacy-safe task status before changing devices or roles. Authenticated links and official evidence are excluded.</p><div class="handover-stats"><span>${completed} closed</span><span>${active} active</span><span>${state.lastBackup ? `Last backup ${esc(shortDate(state.lastBackup.slice(0, 10)))}` : "No backup yet"}</span></div></div><div class="handover-actions"><button class="button primary" type="button" data-action="export-workspace">Export backup</button><button class="button secondary" type="button" data-action="restore-workspace">Restore backup</button><input id="backup-file" type="file" accept="application/json" hidden><button class="button danger-quiet" type="button" data-action="clear-workspace">Clear local progress</button></div></section>`;
  }

  function primarySystemLabel(task) {
    const system = data.systems.find(item => item.id === (task.systemIds || [])[0]);
    return system ? system.label : "Authorised owner system";
  }

  function currentSystemUrl(system) {
    const saved = safeUrl(state.links[system.id]);
    if (system.id === "staff-calendar" && (!saved || /^https:\/\/waggawagga-h\.sentral\.com\.au\/(dashboard\/?)?$/.test(saved))) return safeUrl(system.url);
    return saved || safeUrl(system.url);
  }

  function guidanceLinks(descriptors) {
    const links = (descriptors || []).map(item => {
      if (!item.systemId) return item.hint ? `<p class="step-guidance-note">${esc(item.hint)}</p>` : "";
      const system = data.systems.find(candidate => candidate.id === item.systemId);
      if (!system) return "";
      const url = currentSystemUrl(system);
      if (!url) return `<div class="step-guide"><button class="button quiet compact" type="button" data-action="open-settings">Set ${esc(system.label)} link</button><small>Add the approved destination in Settings.</small></div>`;
      // A replacement may be a direct document instead of the default search/portal.
      // Describe that saved route honestly instead of retaining a misleading default hint.
      const replaced = url !== safeUrl(system.url);
      const label = replaced ? `${system.label} · ${destinationLabel(url)}` : item.label;
      const hint = replaced ? "Uses your saved link from Settings. Confirm the current year and approved version after opening it." : item.hint;
      return `<div class="step-guide"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a>${hint ? `<small>${esc(hint)}</small>` : ""}</div>`;
    }).join("");
    return links ? `<div class="step-guidance" aria-label="Helpful sources">${links}</div>` : "";
  }

  function stepGuidance(task, index) {
    return guidanceLinks(window.TAS_STEP_GUIDANCE?.forStep(task, index));
  }

  function systemButtons(task) {
    return (task.systemIds || []).map(id => {
      const system = data.systems.find(item => item.id === id);
      if (!system) return "";
      const url = currentSystemUrl(system);
      return url
        ? `<button class="button secondary compact" type="button" data-action="launch-system" data-system-id="${esc(id)}">${esc(system.label)} · ${esc(destinationLabel(url))} ↗</button>`
        : `<button class="button quiet compact" type="button" data-action="open-settings">Set ${esc(system.label)} link</button>`;
    }).join("");
  }

  function openTask(id) {
    const task = data.tasks.find(item => item.id === id);
    if (!task) return;
    const record = reviewedRecord(task), review = overallReview(task);
    const guidanceOpen = state.guidance || state.mode === "guided";
    lastTaskTrigger = document.activeElement;
    taskReviewSnapshot = {key:recordKey(task), raw:window.WWHS_TASK_REVIEW.read().raw, note:window.WWHS_TASK_REVIEW.note(review)};

    taskDialogContent.innerHTML = `<header class="dialog-head"><div><p class="eyebrow">${esc(areaMeta[task.area]?.label || "Core work")} · ${esc(phaseLabels[task.phase] || "Action")}</p><h2 id="task-dialog-title">${esc(task.title)}</h2></div><button class="dialog-close" type="button" data-action="close-task" aria-label="Close task">×</button></header>
      <div class="dialog-body">
        <div class="dialog-badges">${priorityPill(task)}${statusPill(task)}${sourcePill(task)}${task.dueDate ? `<span class="pill due">${esc(dueLabel(task))}</span>` : ""}</div>
        <p class="dialog-summary">${esc(task.summary)}</p>
        ${planTaskButton(task)}
        ${task.applicability ? `<aside class="applicability"><strong>Applies when</strong><span>${esc(task.applicability)}</span></aside>` : ""}
        <div class="fact-grid"><div><span>Timing</span><strong>${esc(task.timing)}</strong></div><div><span>Current cycle</span><strong>${esc(cycleLabel(task))}</strong></div><div><span>Accountable</span><strong>${esc(task.owner)}</strong></div><div><span>Expected verifier</span><strong>${esc(task.verifier)}</strong></div><div><span>Primary start</span><strong>${esc(primarySystemLabel(task))}</strong></div></div>
        ${task.milestones ? `<section class="dialog-section"><h3>Milestones</h3><p class="section-help">${task.historyOnly ? "Captured 2026 sequence for handover and planning. Rebuild it from the live calendar each year." : "Tick each dated hand-off only after it is complete in the owner system."}</p>${guidanceLinks(window.TAS_STEP_GUIDANCE?.forMilestone(task))}<ol class="milestone-list">${task.milestones.map((item, index) => task.historyOnly ? `<li>${record.milestones?.[index] ? "✓ " : ""}<time datetime="${esc(item.date)}">${esc(longDate(item.date))}</time><span>${esc(item.label)}</span></li>` : `<li class="${record.milestones?.[index] ? "is-done" : ""}"><label><input type="checkbox" data-task-milestone="${index}" data-task-id="${esc(task.id)}" ${record.milestones?.[index] ? "checked" : ""} ${review ? "disabled" : ""}><time datetime="${esc(item.date)}">${esc(longDate(item.date))}</time><span>${esc(item.label)}</span></label></li>`).join("")}</ol></section>` : ""}
        ${taskSourcePanel(task)}<section class="dialog-section"><h3>${task.historyOnly ? "Captured process" : task.procedureOnly ? "Procedure steps" : "Suggested steps"}</h3><p class="section-help">Open the source beside the step. Staff destinations may require sign-in; Drive searches are labelled. ${task.historyOnly ? "Links open current sources, not historical copies." : "Opening a link does not tick the step."}</p><ol class="action-list">${task.steps.map((step, index) => task.historyOnly || task.procedureOnly ? `<li><div class="history-step"><span class="step-number">${review ? "✓" : index + 1}</span><span>${esc(step)}</span></div>${stepGuidance(task, index)}</li>` : `<li><label><input type="checkbox" data-task-step="${index}" data-task-id="${esc(task.id)}" ${record.steps?.[index] ? "checked" : ""} ${review ? "disabled" : ""}><span class="step-number">${index + 1}</span><span>${esc(step)}</span></label>${stepGuidance(task, index)}</li>`).join("")}</ol></section>
        <section class="done-when"><span>Done when</span><p>${esc(task.doneWhen)}</p></section>
        <section class="owner-systems"><h3>Open the owner system</h3><div class="system-buttons">${systemButtons(task)}</div><p>${esc(task.privacy)}</p></section>
        <details class="guidance-details" ${guidanceOpen ? "open" : ""}><summary>Explain this in plain English</summary><div><p><strong>Why it matters:</strong> ${esc(task.why)}</p><p><strong>Common trap:</strong> ${esc(task.trap)}</p></div></details>
        <details class="source-details"><summary>Source and currency</summary><div><p><strong>${esc(task.source)}</strong></p>${guidanceLinks(window.TAS_STEP_GUIDANCE?.forSource(task))}<p>${sourcePill(task)} Current owner-system information overrides an old copied document or folder.</p></div></details>
        ${completionForm(task, record)}
      </div>`;

    taskDialog.showModal();
  }

  function completionForm(task, record) {
    const review = overallReview(task);
    if (review) return `<section class="completion-panel"><h3>Task complete · overall sign-off</h3><p>All applicable steps are covered by this sign-off. Untick Reviewed complete in the full register to restore the earlier checklist. A completion recorded in your task list is reopened there.</p><form id="task-record-form" data-task-id="${esc(task.id)}"><div class="form-grid"><label class="check-line"><input type="checkbox" checked disabled><span>Applicable source checks covered by the overall sign-off.</span></label><label class="check-line"><input type="checkbox" checked disabled><span>Done when result confirmed through the overall sign-off.</span></label><label class="span-two"><span>Existing notes and completion record</span><textarea name="exceptionReason" rows="5">${esc(window.WWHS_TASK_REVIEW.notes(record.exceptionReason,review))}</textarea></label></div><p>Existing evidence references and verifier details are retained. None are invented by this sign-off.</p><p class="form-error" role="alert" hidden></p><div class="dialog-actions"><button class="button secondary" type="submit" name="commit" value="save">Save notes</button><button class="button quiet" type="button" data-action="close-task">Close</button></div></form></section>`;
    if (task.historyOnly) {
      return `<section class="completion-panel procedure-only"><div><h3>Read-only 2026 baseline</h3><p>This past sequence is retained for handover and future-year planning. Use Reviewed complete in the full task register to record a retrospective sign-off. Refresh the annual calendar before creating the next live sequence.</p></div></section>`;
    }
    if (task.procedureOnly) {
      return `<section class="completion-panel procedure-only"><div><h3>Procedure only — no case tracking here</h3><p>Complete the protected record in the authorised system. This workboard deliberately saves no status, initials, reference or case note for this workflow.</p></div><div class="dialog-actions"><button class="button quiet" type="button" data-action="close-task">Close procedure</button></div></section>`;
    }
    return `<section class="completion-panel"><div><h3>Record progress safely</h3><p>Use a record number, location or dated sign-off—not the evidence itself.</p></div><form id="task-record-form" data-task-id="${esc(task.id)}">
      <div class="form-grid">
        <label><span>Status</span><select name="status">${Object.entries(statusMeta).map(([value, meta]) => `<option value="${value}" ${record.status === value ? "selected" : ""}>${esc(value === "not-started" && !hasReviewedRecord(task) ? "Not reviewed here" : meta.label)}</option>`).join("")}</select></label>
        <label><span>Verifier role or initials</span><input type="text" name="verifier" maxlength="100" value="${esc(record.verifier || "")}" placeholder="Expected: ${esc(task.verifier)}"></label>
        <label class="span-two"><span>Privacy-safe owner-system reference</span><input type="text" name="evidenceRef" maxlength="240" value="${esc(record.evidenceRef || "")}" placeholder="e.g. Sentral reporting check signed off 28 Aug"><small>Never paste a name, mark, report, incident, health, leave, credential or financial detail.</small></label>
        <label class="check-line span-two"><input type="checkbox" name="sourceChecked" ${record.sourceChecked ? "checked" : ""}><span>I checked the current live source or owner-system state.</span></label>
        <label class="check-line span-two"><input type="checkbox" name="doneConfirmed" ${record.doneConfirmed ? "checked" : ""}><span>I confirmed the stated “Done when” result.</span></label>
        <label class="span-two"><span>Exception or not-applicable reason (if used)</span><textarea name="exceptionReason" maxlength="300" rows="2" placeholder="Privacy-safe summary only">${esc(record.exceptionReason || "")}</textarea></label>
      </div>
      <p class="form-error" role="alert" hidden></p>
      <div class="dialog-actions"><button class="button secondary" type="submit" name="commit" value="save">Save progress</button><button class="button primary" type="submit" name="commit" value="verify">Verify and close</button>${taskCycle(task) === "event" && isClosed(task) ? `<button class="button secondary" type="button" data-action="reset-occurrence" data-task-id="${esc(task.id)}">Start next occurrence</button>` : ""}<button class="button quiet" type="button" data-action="close-task">Close</button></div>
    </form></section>`;
  }

  function saveTask(form, commit) {
    const task = data.tasks.find(item => item.id === form.dataset.taskId);
    if (!task || task.procedureOnly || task.historyOnly && !overallReview(task)) return;
    if (!reviewIsCurrent(form)) return;
    const values = new FormData(form);
    const key = recordKey(task);
    const savedRecord = state.records[key];
    const previous = recordFor(task);
    if (overallReview(task)) {
      if (commit === 'verify') return;
      let text = String(values.get('exceptionReason') || '').trim(), note = taskReviewSnapshot.note;
      if (note && text.endsWith(note)) text = text.slice(0,-note.length).trimEnd();
      state.records[key] = {...previous, exceptionReason:text, updatedAt:new Date().toISOString()};
      if (!saveState()) { if (savedRecord) state.records[key]=savedRecord; else delete state.records[key]; return; }
      taskStateDirty=true; taskDialog.close(); toast('Notes saved. Overall sign-off is unchanged.'); return;
    }
    let status = String(values.get("status") || "not-started");
    if (commit === "verify") status = "verified";
    const evidenceRef = String(values.get("evidenceRef") || "").trim();
    const verifier = String(values.get("verifier") || "").trim();
    const sourceChecked = values.get("sourceChecked") === "on";
    const doneConfirmed = values.get("doneConfirmed") === "on";
    const exceptionReason = String(values.get("exceptionReason") || "").trim();
    const allSteps = task.steps.every((_, index) => previous.steps?.[index] === true || previous.steps?.[String(index)] === true);
    const allMilestones = !task.milestones?.length || task.milestones.every((_, index) => previous.milestones?.[index] === true || previous.milestones?.[String(index)] === true);
    const error = form.querySelector(".form-error");

    if (status === "completed" && (!allSteps || !allMilestones || !sourceChecked || !doneConfirmed)) return formError(error, "Task completion needs every action, milestone and completion check ticked.");
    if (status === "verified" && !allSteps) return formError(error, "Complete each action step before verifying this task.");
    if (status === "verified" && !allMilestones) return formError(error, "Complete each dated milestone before verifying this task.");
    if (status === "verified" && (!evidenceRef || !verifier || !sourceChecked || !doneConfirmed)) return formError(error, "Verification needs a safe owner-system reference, verifier, live-source check and Done when confirmation.");
    if (["exception", "not-applicable"].includes(status) && (!exceptionReason || !verifier)) return formError(error, "An exception or not-applicable decision needs a privacy-safe reason and verifier.");

    state.records[key] = {
      ...previous,
      status,
      evidenceRef,
      verifier,
      sourceChecked,
      doneConfirmed,
      exceptionReason,
      updatedAt: new Date().toISOString()
    };
    taskStateDirty = true;
    if (!saveState()) {
      if (savedRecord) state.records[key] = savedRecord;
      else delete state.records[key];
      return;
    }
    taskDialog.close();
    toast(status === "verified" ? "Task verified with a safe record reference" : "Progress saved");
  }

  function formError(node, message) {
    node.textContent = message;
    node.hidden = false;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function openSettings() {
    lastSettingsTrigger = document.activeElement;
    const localSystems = data.systems.filter(system => system.kind === "local");
    settingsContent.innerHTML = `<header class="dialog-head"><div><p class="eyebrow">LOCAL WORKSPACE SETUP</p><h2 id="settings-title">Pace and approved staff links</h2></div><button class="dialog-close" type="button" data-action="close-settings" aria-label="Close settings">×</button></header>
      <div class="dialog-body"><form id="settings-form">
        <section class="settings-section"><h3>How this browser should open</h3><div class="form-grid"><label><span>Default pace</span><select name="mode"><option value="guided" ${state.mode === "guided" ? "selected" : ""}>One step at a time</option><option value="fast" ${state.mode === "fast" ? "selected" : ""}>Full workboard</option></select></label><label class="check-line"><input type="checkbox" name="guidance" ${state.guidance ? "checked" : ""}><span>Keep plain-English guidance available in tasks.</span></label></div></section>
        <section class="settings-section"><h3>Approved staff links</h3><p>Every public or work-account front door is already connected. Sensitive Google locations use signed-in search routes until their sharing is restricted. Any approved replacement stays on this browser and is excluded from backups.</p><div class="local-link-list">${localSystems.map(system => `<label><span>${esc(system.label)}</span><input type="url" name="link:${esc(system.id)}" value="${esc(state.links[system.id] || system.url || "")}"><small>${esc(system.purpose)}</small></label>`).join("")}</div></section>
        <aside class="settings-warning"><strong>Do not paste sensitive deep links</strong><p>Use approved staff front doors or controlled hubs. Student, health, incident, personnel, leave, finance, key and confidential locations stay out of this browser.</p></aside>
        <div class="dialog-actions"><button class="button primary" type="submit">Save workspace setup</button><button class="button quiet" type="button" data-action="close-settings">Cancel</button></div>
      </form></div>`;
    settingsDialog.showModal();
  }

  function saveSettings(form) {
    const previous = { mode: state.mode, guidance: state.guidance, links: { ...state.links } };
    const values = new FormData(form);
    state.mode = String(values.get("mode")) === "fast" ? "fast" : "guided";
    state.guidance = values.get("guidance") === "on";
    data.systems.filter(system => system.kind === "local").forEach(system => {
      const value = safeUrl(values.get(`link:${system.id}`));
      const builtIn = safeUrl(system.url);
      if (value && value !== builtIn) state.links[system.id] = value;
      else delete state.links[system.id];
    });
    if (!saveState()) {
      Object.assign(state, previous);
      return;
    }
    settingsStateDirty = true;
    settingsDialog.close();
    toast("Workspace setup saved on this browser");
  }

  function openUrgentWorkflow() {
    lastTaskTrigger = document.activeElement;
    taskDialogContent.innerHTML = `<header class="dialog-head urgent-head"><div><p class="eyebrow">URGENT HELP</p><h2 id="task-dialog-title">Protect people first</h2></div><button class="dialog-close" type="button" data-action="close-task" aria-label="Close urgent help">×</button></header>
      <div class="dialog-body urgent-body"><aside class="emergency-callout"><strong>Immediate danger or life-threatening emergency?</strong><span>Follow the school emergency procedure and call 000 where required.</span></aside>
      <div class="urgent-grid">
        <button type="button" data-action="open-task" data-task-id="mandatory-reporting-response"><strong>Child-protection concern</strong><span>Mandatory reporting and protected escalation</span></button>
        <button type="button" data-action="open-task" data-task-id="incident-response"><strong>Accident, incident or urgent hazard</strong><span>Make safe, notify and report</span></button>
        <button type="button" data-action="open-task" data-task-id="absence-cover"><strong>Staff absence or unsafe class coverage</strong><span>Secure safe supervision and useful work</span></button>
        <button type="button" data-action="open-task" data-task-id="media-enquiry"><strong>Media enquiry</strong><span>Refer through authorised communications</span></button>
      </div><p class="urgent-privacy">Do not type any case details into this workboard.</p></div>`;
    taskDialog.showModal();
  }

  function launchSystem(id) {
    const system = data.systems.find(item => item.id === id);
    if (!system) return;
    const url = currentSystemUrl(system);
    if (!url) {
      toast(`${system.label} needs an approved local link`, "error");
      openSettings();
      return;
    }
    window.open(url, "_blank", "noopener");
  }

  function exportWorkspace() {
    const { links: excludedLinks, ...portable } = state;
    const payload = {
      kind: data.config.backupKind,
      schemaVersion: 2,
      buildId: data.config.buildId,
      exportedAt: new Date().toISOString(),
      warning: "Privacy-safe workboard metadata only. Official evidence remains in authorised systems. Local authenticated links are excluded.",
      state: portable
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `WWHS-HT-TAS-workboard-${currentIso}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    state.lastBackup = new Date().toISOString();
    saveState();
    render();
    toast("Privacy-safe backup exported");
  }

  function restoreWorkspace(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || ""));
        if (payload.kind !== data.config.backupKind || payload.schemaVersion !== 2 || !payload.state) throw new Error("Unsupported backup");
        const previous = state;
        const localLinks = { ...state.links };
        state = {
          ...defaultState,
          ...payload.state,
          links: localLinks,
          records: sanitiseRecords(payload.state.records),
          weekly: safeObject(payload.state.weekly),
          eventOccurrences: sanitiseEventOccurrences(payload.state.eventOccurrences)
        };
        if (!saveState()) {
          state = previous;
          return;
        }
        render();
        toast("Backup restored; local staff links stayed on this browser");
      } catch (_) {
        toast("That backup is unsupported or belongs to another build", "error");
      }
    };
    reader.readAsText(file);
  }

  function clearWorkspace() {
    const confirmed = window.confirm("Clear task progress and weekly checks from this browser? Any browser-only link replacements will also be removed.");
    if (!confirmed) return;
    try {
      if (!storageIsCurrent()) return;
      localStorage.removeItem(data.config.storageKey);
      savedStateRaw = null;
    } catch (_) {
      toast("This browser could not clear the workboard", "error");
      return;
    }
    state = freshState();
    recordsUpdated();
    render();
    toast("Local workboard progress cleared");
  }

  function toast(message, kind = "info") {
    const element = document.createElement("div");
    element.className = `toast ${kind === "error" ? "error" : ""}`;
    element.textContent = message;
    toastRegion.appendChild(element);
    window.setTimeout(() => element.remove(), 3200);
  }

  function closeNavigation() {
    document.querySelector(".route-bar").classList.remove("is-open");
    document.querySelector(".mobile-scrim").hidden = true;
    document.querySelector(".menu-button").setAttribute("aria-expanded", "false");
  }

  document.addEventListener("click", event => {
    if (window.WWHS_TASK_NAVIGATION?.handleClick(event, ({ taskId, params, link }) => {
      const task = data.tasks.find(item => item.id === taskId);
      if (task) {
        const savedKey = params.get("record");
        if (savedKey) openSavedTask(task, savedKey);
        else openTask(task.id);
      } else return false;
      lastTaskTrigger = link;
      return true;
    })) return;
    const skipLink = event.target.closest(".skip-link");
    if (skipLink) {
      event.preventDefault();
      closeNavigation();
      document.getElementById("main-content")?.focus();
      return;
    }
    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) return;
    const action = actionTarget.dataset.action;

    if (action === "start-guided") {
      const previous = { mode: state.mode, guidance: state.guidance };
      state.mode = "guided";
      state.guidance = true;
      if (!saveState()) { Object.assign(state, previous); return; }
      location.hash = "#today";
    } else if (action === "start-fast") {
      const previous = { mode: state.mode, guidance: state.guidance };
      state.mode = "fast";
      state.guidance = false;
      if (!saveState()) { Object.assign(state, previous); return; }
      location.hash = "#calendar";
    } else if (action === "open-task") {
      if (taskDialog.open) taskDialog.close();
      openTask(actionTarget.dataset.taskId);
    } else if (action === "track-task") {
      const descriptor = describeTask(actionTarget.dataset.taskId);
      if (descriptor) window.dispatchEvent(new CustomEvent("wwhs:track-task", { detail: descriptor }));
    } else if (action === "complete-task") {
      completeCalendarTask(actionTarget.dataset.taskId);
    } else if (action === "undo-complete-task") {
      undoCalendarCompletion(actionTarget.dataset.taskId);
    } else if (action === "close-task") {
      taskDialog.close();
    } else if (action === "open-settings") {
      if (taskDialog.open) taskDialog.close();
      openSettings();
    } else if (action === "close-settings") {
      settingsDialog.close();
    } else if (action === "toggle-guidance") {
      state.guidance = !state.guidance;
      if (!saveState()) { state.guidance = !state.guidance; return; }
      render();
    } else if (action === "toggle-nav") {
      const bar = document.querySelector(".route-bar");
      const open = !bar.classList.contains("is-open");
      bar.classList.toggle("is-open", open);
      document.querySelector(".mobile-scrim").hidden = !open;
      actionTarget.setAttribute("aria-expanded", String(open));
    } else if (action === "close-nav") {
      closeNavigation();
    } else if (action === "launch-system") {
      launchSystem(actionTarget.dataset.systemId);
    } else if (action === "open-workflow") {
      openUrgentWorkflow();
    } else if (action === "export-workspace") {
      exportWorkspace();
    } else if (action === "restore-workspace") {
      document.getElementById("backup-file")?.click();
    } else if (action === "clear-workspace") {
      clearWorkspace();
    } else if (action === "reset-occurrence") {
      const task = data.tasks.find(item => item.id === actionTarget.dataset.taskId);
      if (!task || task.historyOnly || task.procedureOnly || taskCycle(task) !== "event" || !isClosed(task)) return;
      const previousToken = state.eventOccurrences[task.id];
      let token;
      do {
        token = `event-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
      } while (state.records[`${task.id}::${token}`]);
      state.eventOccurrences[task.id] = token;
      const key = recordKey(task);
      state.records[key] = { status: "not-started", steps: {}, milestones: {}, updatedAt: new Date().toISOString() };
      if (!saveState()) {
        delete state.records[key];
        if (previousToken) state.eventOccurrences[task.id] = previousToken;
        else delete state.eventOccurrences[task.id];
        return;
      }
      taskStateDirty = true;
      taskDialog.close();
      toast("Next occurrence is ready to begin");
    }
  });

  document.addEventListener("change", event => {
    if (event.target.matches("[data-task-step]")) {
      const task = data.tasks.find(item => item.id === event.target.dataset.taskId);
      if (!task || task.historyOnly || task.procedureOnly) return;
      if (overallReview(task)) { event.target.checked=true; return; }
      const key = recordKey(task);
      const savedRecord = state.records[key];
      const previous = recordFor(task);
      state.records[key] = {
        ...previous,
        status: ["not-started", "completed", "verified"].includes(previous.status) ? "in-progress" : previous.status,
        steps: { ...safeObject(previous.steps), [event.target.dataset.taskStep]: event.target.checked },
        doneConfirmed: ["completed", "verified"].includes(previous.status) ? false : previous.doneConfirmed,
        updatedAt: new Date().toISOString()
      };
      taskStateDirty = true;
      if (!saveState()) {
        if (savedRecord) state.records[key] = savedRecord;
        else delete state.records[key];
        event.target.checked = previous.steps?.[event.target.dataset.taskStep] === true;
        return;
      }
    }

    if (event.target.matches("[data-task-milestone]")) {
      const task = data.tasks.find(item => item.id === event.target.dataset.taskId);
      if (!task || task.historyOnly || task.procedureOnly) return;
      if (overallReview(task)) { event.target.checked=true; return; }
      const key = recordKey(task);
      const savedRecord = state.records[key];
      const previous = recordFor(task);
      state.records[key] = {
        ...previous,
        status: ["not-started", "completed", "verified"].includes(previous.status) ? "in-progress" : previous.status,
        milestones: { ...safeObject(previous.milestones), [event.target.dataset.taskMilestone]: event.target.checked },
        doneConfirmed: ["completed", "verified"].includes(previous.status) ? false : previous.doneConfirmed,
        updatedAt: new Date().toISOString()
      };
      taskStateDirty = true;
      if (!saveState()) {
        if (savedRecord) state.records[key] = savedRecord;
        else delete state.records[key];
        event.target.checked = previous.milestones?.[event.target.dataset.taskMilestone] === true;
        return;
      }
      const item = event.target.closest("li");
      item?.classList.toggle("is-done", event.target.checked);
    }

    if (event.target.matches("[data-task-step], [data-task-milestone]")) {
      const task = data.tasks.find(item => item.id === event.target.dataset.taskId);
      if (task && !task.historyOnly && !task.procedureOnly) {
        const record = recordFor(task);
        const form = document.getElementById("task-record-form");
        if (form) {
          form.elements.status.value = record.status;
          if (!record.doneConfirmed) form.elements.doneConfirmed.checked = false;
        }
        const due = taskDialogContent.querySelector(".pill.due");
        if (due) due.textContent = dueLabel(task);
        const badge = taskDialogContent.querySelector(".pill.status");
        const meta = statusMeta[record.status];
        if (badge && meta) {
          badge.className = `pill status ${meta.className}`;
          badge.textContent = meta.label;
        }
      }
    }

    if (event.target.matches("[data-weekly-check]")) {
      const week = weekKey();
      const index = event.target.dataset.weeklyCheck;
      if (weeklyReview(index,week)) { event.target.checked=true; toast('This scan is covered by the overall sign-off. Untick Reviewed complete in the full register to reopen it.'); return; }
      const previous = state.weekly[week];
      state.weekly[week] = { ...safeObject(state.weekly[week]), [index]: event.target.checked };
      if (!saveState()) {
        if (previous) state.weekly[week] = previous;
        else delete state.weekly[week];
        event.target.checked = previous?.[index] === true;
        return;
      }
      renderToday();
      const replacement = document.querySelector(`[data-weekly-check="${CSS.escape(index)}"]`);
      const scan = replacement?.closest("details");
      if (scan) scan.open = true;
      replacement?.focus();
    }

    if (event.target.id === "backup-file") restoreWorkspace(event.target.files?.[0]);
  });

  document.addEventListener("submit", event => {
    if (event.target.id === "task-record-form") {
      event.preventDefault();
      saveTask(event.target, event.submitter?.value || "save");
    }
    if (event.target.id === "settings-form") {
      event.preventDefault();
      saveSettings(event.target);
    }
  });

  document.addEventListener("input", event => {
    if (event.target.matches("[data-area-search]")) {
      state.search = event.target.value;
      const position = event.target.selectionStart;
      renderArea(currentRoute());
      const input = document.querySelector("[data-area-search]");
      input?.focus();
      input?.setSelectionRange(position, position);
    }
  });

  taskDialog.addEventListener("close", () => {
    const taskId = lastTaskTrigger?.dataset?.taskId;
    if (taskStateDirty) {
      taskStateDirty = false;
      render();
    }
    const replacement = taskId ? document.querySelector(`[data-action="open-task"][data-task-id="${CSS.escape(taskId)}"]`) : null;
    (replacement || lastTaskTrigger)?.focus();
  });
  settingsDialog.addEventListener("close", () => {
    if (settingsStateDirty) {
      settingsStateDirty = false;
      render();
    }
    const replacement = [...document.querySelectorAll("[data-action='open-settings']")].find(element => element.offsetParent !== null);
    (replacement || lastSettingsTrigger)?.focus();
  });
  [taskDialog, settingsDialog].forEach(dialog => dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  }));
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !document.querySelector(".route-bar")?.classList.contains("is-open")) return;
    const toggle = document.querySelector("[data-action='toggle-nav']");
    closeNavigation();
    toggle?.focus();
  });

  window.addEventListener("hashchange", () => {
    state.search = "";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    renderRoute();
  });
  window.addEventListener("focus", () => {
    if (currentIso === isoDate(startOfDay(new Date()))) return;
    if (!taskDialog.open && !settingsDialog.open) render();
    else refreshDate();
    forecastUpdated();
  });
  window.addEventListener("storage", event => {
    if (event.key === data.config.storageKey || event.key === null) forecastUpdated();
    if ([window.WWHS_TASK_REVIEW.KEY, window.WWHS_TASK_REVIEW.INBOX_KEY, null].includes(event.key)) refreshReviewViews();
  });
  function refreshReviewViews() {
    if (!taskDialog.open) render();
    else { const form=document.getElementById('task-record-form'); if (form) reviewIsCurrent(form); }
    window.dispatchEvent(new CustomEvent('wwhs:records-updated',{detail:{wing:'tas'}}));
    forecastUpdated();
  }
  window.addEventListener('wwhs:review-updated',refreshReviewViews);
  window.WWHS_WORKBOARD_ADAPTER = Object.freeze({
    wing: "tas",
    getEntries: () => Object.keys(state.records).map(key => describeTask(key.split("::")[0], key)).filter(Boolean),
    getForecast,
    getTaskRegister,
    describeRecord,
    describeTask: id => describeTask(id),
    getHelpContext: key => {
      if (typeof key !== "string" || !forecastStorageAvailable()) return null;
      refreshDate();
      const task = data.tasks.find(item => item.id === key.split("::")[0]);
      if (!task || (!Object.prototype.hasOwnProperty.call(state.records, key) && recordKey(task) !== key)) return null;
      return describeTask(task.id, key)?.taskHelp || null;
    },
    openTask: id => openTask(id)
  });
  renderRoute();
})();
