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
    search: "",
    lastBackup: ""
  };

  let state = loadState();

  function safeObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function freshState() {
    return { ...defaultState, links: {}, records: {}, weekly: {} };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(data.config.storageKey) || "null");
      if (!parsed || parsed.schemaVersion !== 2) return freshState();
      return {
        ...defaultState,
        ...parsed,
        mode: ["guided", "fast"].includes(parsed.mode) ? parsed.mode : "guided",
        guidance: parsed.guidance !== false,
        linkDefaultsVersion: 2,
        links: parsed.linkDefaultsVersion === 2 ? safeObject(parsed.links) : {},
        records: sanitiseRecords(parsed.records),
        weekly: safeObject(parsed.weekly)
      };
    } catch (_) {
      return freshState();
    }
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

  function saveState() {
    try {
      localStorage.setItem(data.config.storageKey, JSON.stringify(state));
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
    return `${task.id}::current-event`;
  }

  function recordFor(task) {
    return state.records[recordKey(task)] || { status: "not-started", steps: {}, milestones: {} };
  }

  function hasReviewedRecord(task) {
    return Object.prototype.hasOwnProperty.call(state.records, recordKey(task));
  }

  function statusFor(task) {
    return recordFor(task).status || "not-started";
  }

  function isClosed(task) {
    return ["completed", "verified", "not-applicable"].includes(statusFor(task));
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
    const allowed = ["home", "today", "calendar", "teaching", "faculty", "people", "reference", "ai-admin"];
    return allowed.includes(value) ? value : "home";
  }

  function taskFromRoute() {
    if (!location.hash.startsWith("#task/")) return null;
    try {
      const id = decodeURIComponent(location.hash.slice(6));
      return data.tasks.find(task => task.id === id) || null;
    } catch (_) {
      return null;
    }
  }

  function renderRoute() {
    const task = taskFromRoute();
    if (taskDialog.open) taskDialog.close();
    if (task) history.replaceState(null, "", `#${areaMeta[task.area]?.route || "today"}`);
    render();
    if (task) openTask(task.id);
    else document.getElementById("main-content")?.focus({ preventScroll: true });
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
    const checks = safeObject(state.weekly[week]);
    const completedChecks = data.weeklyChecks.filter((_, index) => checks[index] === true).length;
    const actions = `<a class="button secondary compact" href="#calendar">Open full calendar</a>`;

    routeContent.innerHTML = `<div class="page-wrap">
      ${pageHeader(currentTermLabel(), "Today", "Upcoming dates and the follow-ups you have recorded in this browser.", actions)}
      ${yearBanner()}
      <section class="coming-section"><div class="section-heading"><div><h2>Recorded follow-ups</h2><p>${followUps.length ? `${followUps.length} open item${followUps.length === 1 ? "" : "s"} you have recorded here.` : "No follow-ups recorded in this browser. Your school systems remain the record."}</p></div></div>${followUps.length ? `<div class="coming-list">${followUps.map((task, index) => comingRow(task, index + 1)).join("")}</div>` : ""}</section>
      ${justCompleted.length ? `<section class="coming-section"><div class="section-heading"><h2>Just completed</h2></div><div class="coming-list">${justCompleted.map((task, index) => comingRow(task, index + 1, "All checklist boxes ticked")).join("")}</div></section>` : ""}
      <section class="coming-section"><div class="section-heading"><div><h2>Upcoming dates to check</h2><p>Next listed dates from the calendar checked on 26 August 2026. Confirm them in the live staff calendar.</p></div></div>${upcoming.length ? `<div class="coming-list">${upcoming.map((task, index) => comingRow(task, index + 1, `Listed ${shortDate(reminderDate(task))} · check live calendar`)).join("")}</div>` : `<p class="empty-line">${operatingYearIsCurrent ? "No later dates are listed in this calendar snapshot." : "Refresh the school calendar before using dates for this year."}</p>`}</section>
      ${unreviewedPast.length ? `<details class="standing-panel"><summary>Review past dates (${unreviewedPast.length} not reviewed here)</summary><p>These dates have passed, but this browser has no recorded status. They are not assumed to be missed work. Check the school record before adding a status.</p><div class="coming-list">${unreviewedPast.map((task, index) => comingRow(task, index + 1)).join("")}</div></details>` : ""}
      <details class="standing-panel"><summary>Five-minute weekly scan · ${completedChecks} checks recorded</summary><p>Week beginning ${shortDate(week)}. These ticks are local reminders.</p>
        <div class="weekly-checks">${data.weeklyChecks.map((label, index) => `<label><input type="checkbox" data-weekly-check="${index}" ${checks[index] ? "checked" : ""}><span>${esc(label)}</span></label>`).join("")}</div>
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
    return `${!isClosed(task) ? `<button class="button primary compact" type="button" data-action="complete-task" data-task-id="${esc(task.id)}" aria-label="Task Complete: ${esc(task.title)}" title="Tick all steps, milestones and completion checks">Task Complete</button>` : ""}
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
    const completed = trackableTasks.filter(isClosed).length;

    routeContent.innerHTML = `<div class="page-wrap">
      ${pageHeader(meta.label.toUpperCase(), meta.label, meta.intro, `<label class="search-box"><span class="sr-only">Search ${esc(meta.label)}</span><input type="search" value="${esc(state.search)}" placeholder="Search this area" data-area-search></label>`)}
      ${area === "people" ? privacyBanner() : ""}
      <div class="area-summary"><span><strong>${completed}</strong> recorded closed</span><span><strong>${trackableTasks.filter(task => hasReviewedRecord(task) && task.priority === "critical" && !isClosed(task)).length}</strong> recorded critical follow-ups</span><span><strong>${trackableTasks.filter(task => !hasReviewedRecord(task)).length}</strong> not reviewed here</span><span><strong>${triggered.length}</strong> event-driven workflows</span></div>
      <section class="task-section"><div class="section-heading"><div><h2>${area === "teaching" ? "Core teaching controls" : area === "faculty" ? "Operating controls" : "Planned people controls"}</h2><p>${state.mode === "guided" ? "Open one task and follow it step by step." : "Fast view—open only the detail you need."}</p></div></div><div class="card-grid">${core.map(taskCard).join("") || emptySearch()}</div></section>
      ${earlier.length ? `<details class="elapsed"><summary>Earlier 2026 controls (${earlier.length})</summary><div class="card-grid compact-card-grid">${earlier.map(taskCard).join("")}</div></details>` : ""}
      ${historyFiltered.length ? `<details class="elapsed history-panel"><summary>Term 1–2 2026 baseline and annual pattern (${historyFiltered.length})</summary><p>Read-only history for handover and future-year planning. It is not retrospective non-compliance.</p><div class="card-grid compact-card-grid">${historyFiltered.map(taskCard).join("")}</div></details>` : ""}
      ${triggered.length ? `<section class="task-section triggered-section"><div class="section-heading"><div><h2>Use only when triggered</h2><p>These interrupt normal work when the event occurs.</p></div></div><div class="card-grid">${triggered.map(taskCard).join("")}</div></section>` : ""}
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
    return `<article class="source-card"><span class="pill source ${item.status === "current" ? "good" : item.status === "restricted" ? "alert" : "warn"}">${esc(label)}</span><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p></article>`;
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
    return safeUrl(state.links[system.id]) || safeUrl(system.url);
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
    const record = recordFor(task);
    const guidanceOpen = state.guidance || state.mode === "guided";
    lastTaskTrigger = document.activeElement;

    taskDialogContent.innerHTML = `<header class="dialog-head"><div><p class="eyebrow">${esc(areaMeta[task.area]?.label || "Core work")} · ${esc(phaseLabels[task.phase] || "Action")}</p><h2 id="task-dialog-title">${esc(task.title)}</h2></div><button class="dialog-close" type="button" data-action="close-task" aria-label="Close task">×</button></header>
      <div class="dialog-body">
        <div class="dialog-badges">${priorityPill(task)}${statusPill(task)}${sourcePill(task)}${task.dueDate ? `<span class="pill due">${esc(dueLabel(task))}</span>` : ""}</div>
        <p class="dialog-summary">${esc(task.summary)}</p>
        ${task.applicability ? `<aside class="applicability"><strong>Applies when</strong><span>${esc(task.applicability)}</span></aside>` : ""}
        <div class="fact-grid"><div><span>Timing</span><strong>${esc(task.timing)}</strong></div><div><span>Current cycle</span><strong>${esc(cycleLabel(task))}</strong></div><div><span>Accountable</span><strong>${esc(task.owner)}</strong></div><div><span>Expected verifier</span><strong>${esc(task.verifier)}</strong></div><div><span>Primary start</span><strong>${esc(primarySystemLabel(task))}</strong></div></div>
        ${task.milestones ? `<section class="dialog-section"><h3>Milestones</h3><p class="section-help">${task.historyOnly ? "Captured 2026 sequence for handover and planning. Rebuild it from the live calendar each year." : "Tick each dated hand-off only after it is complete in the owner system."}</p><ol class="milestone-list">${task.milestones.map((item, index) => task.historyOnly ? `<li><time datetime="${esc(item.date)}">${esc(longDate(item.date))}</time><span>${esc(item.label)}</span></li>` : `<li class="${record.milestones?.[index] ? "is-done" : ""}"><label><input type="checkbox" data-task-milestone="${index}" data-task-id="${esc(task.id)}" ${record.milestones?.[index] ? "checked" : ""}><time datetime="${esc(item.date)}">${esc(longDate(item.date))}</time><span>${esc(item.label)}</span></label></li>`).join("")}</ol></section>` : ""}
        <section class="dialog-section"><h3>${task.historyOnly ? "Captured process" : task.procedureOnly ? "Follow this procedure" : "Do this"}</h3><ol class="action-list">${task.steps.map((step, index) => task.historyOnly || task.procedureOnly ? `<li><div class="history-step"><span class="step-number">${index + 1}</span><span>${esc(step)}</span></div></li>` : `<li><label><input type="checkbox" data-task-step="${index}" data-task-id="${esc(task.id)}" ${record.steps?.[index] ? "checked" : ""}><span class="step-number">${index + 1}</span><span>${esc(step)}</span></label></li>`).join("")}</ol></section>
        <section class="done-when"><span>Done when</span><p>${esc(task.doneWhen)}</p></section>
        <section class="owner-systems"><h3>Open the owner system</h3><div class="system-buttons">${systemButtons(task)}</div><p>${esc(task.privacy)}</p></section>
        <details class="guidance-details" ${guidanceOpen ? "open" : ""}><summary>Explain this in plain English</summary><div><p><strong>Why it matters:</strong> ${esc(task.why)}</p><p><strong>Common trap:</strong> ${esc(task.trap)}</p></div></details>
        <details class="source-details"><summary>Source and currency</summary><div><p><strong>${esc(task.source)}</strong></p><p>${sourcePill(task)} Current owner-system information overrides an old copied document or folder.</p></div></details>
        ${completionForm(task, record)}
      </div>`;

    taskDialog.showModal();
  }

  function completionForm(task, record) {
    if (task.historyOnly) {
      return `<section class="completion-panel procedure-only"><div><h3>Read-only 2026 baseline</h3><p>This past sequence is retained for handover and future-year planning. Do not mark it retrospectively; use the annual calendar refresh to create the next live sequence.</p></div></section>`;
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
    if (!task || task.historyOnly || task.procedureOnly) return;
    const values = new FormData(form);
    const previous = recordFor(task);
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

    state.records[recordKey(task)] = {
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
    saveState();
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
    const values = new FormData(form);
    state.mode = String(values.get("mode")) === "fast" ? "fast" : "guided";
    state.guidance = values.get("guidance") === "on";
    data.systems.filter(system => system.kind === "local").forEach(system => {
      const value = safeUrl(values.get(`link:${system.id}`));
      const builtIn = safeUrl(system.url);
      if (value && value !== builtIn) state.links[system.id] = value;
      else delete state.links[system.id];
    });
    saveState();
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
        const localLinks = { ...state.links };
        state = {
          ...defaultState,
          ...payload.state,
          links: localLinks,
          records: sanitiseRecords(payload.state.records),
          weekly: safeObject(payload.state.weekly)
        };
        saveState();
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
    localStorage.removeItem(data.config.storageKey);
    state = freshState();
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
      state.mode = "guided";
      state.guidance = true;
      saveState();
      location.hash = "#today";
    } else if (action === "start-fast") {
      state.mode = "fast";
      state.guidance = false;
      saveState();
      location.hash = "#calendar";
    } else if (action === "open-task") {
      if (taskDialog.open) taskDialog.close();
      openTask(actionTarget.dataset.taskId);
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
      saveState();
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
      if (!task || taskCycle(task) !== "event") return;
      delete state.records[recordKey(task)];
      taskStateDirty = true;
      saveState();
      taskDialog.close();
      toast("Next occurrence is ready to begin");
    }
  });

  document.addEventListener("change", event => {
    if (event.target.matches("[data-task-step]")) {
      const task = data.tasks.find(item => item.id === event.target.dataset.taskId);
      if (!task || task.historyOnly || task.procedureOnly) return;
      const previous = recordFor(task);
      state.records[recordKey(task)] = {
        ...previous,
        status: ["not-started", "completed", "verified"].includes(previous.status) ? "in-progress" : previous.status,
        steps: { ...safeObject(previous.steps), [event.target.dataset.taskStep]: event.target.checked },
        doneConfirmed: ["completed", "verified"].includes(previous.status) ? false : previous.doneConfirmed,
        updatedAt: new Date().toISOString()
      };
      taskStateDirty = true;
      saveState();
    }

    if (event.target.matches("[data-task-milestone]")) {
      const task = data.tasks.find(item => item.id === event.target.dataset.taskId);
      if (!task || task.historyOnly || task.procedureOnly) return;
      const previous = recordFor(task);
      state.records[recordKey(task)] = {
        ...previous,
        status: ["not-started", "completed", "verified"].includes(previous.status) ? "in-progress" : previous.status,
        milestones: { ...safeObject(previous.milestones), [event.target.dataset.taskMilestone]: event.target.checked },
        doneConfirmed: ["completed", "verified"].includes(previous.status) ? false : previous.doneConfirmed,
        updatedAt: new Date().toISOString()
      };
      taskStateDirty = true;
      saveState();
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
      state.weekly[week] = { ...safeObject(state.weekly[week]), [index]: event.target.checked };
      saveState();
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
  window.addEventListener("focus", () => { if (currentIso !== isoDate(startOfDay(new Date())) && !taskDialog.open && !settingsDialog.open) render(); });
  renderRoute();
})();
