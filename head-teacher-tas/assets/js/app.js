(function () {
  "use strict";

  const data = window.HT_TAS_WORKBOARD;
  const routeContent = document.getElementById("route-content");
  const taskDialog = document.getElementById("task-dialog");
  const taskDialogContent = document.getElementById("task-dialog-content");
  const settingsDialog = document.getElementById("settings-dialog");
  const settingsContent = document.getElementById("settings-content");
  const toastRegion = document.getElementById("toast-region");
  const currentDate = startOfDay(new Date());
  const currentIso = isoDate(currentDate);
  const operatingYearIsCurrent = currentDate.getFullYear() === data.config.operatingYear;
  let lastTaskTrigger = null;
  let lastSettingsTrigger = null;
  let taskStateDirty = false;
  let settingsStateDirty = false;

  const statusMeta = {
    "not-started": { label: "Not started", className: "neutral" },
    "in-progress": { label: "In progress", className: "progress" },
    waiting: { label: "Waiting", className: "waiting" },
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
        doneConfirmed: status === "verified" ? doneConfirmed : false,
        exceptionReason,
        updatedAt: String(raw.updatedAt || "")
      };
    });
    return output;
  }

  function saveState() {
    try {
      localStorage.setItem(data.config.storageKey, JSON.stringify(state));
    } catch (_) {
      toast("This browser could not save the workboard", "error");
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
    if (!dueDate) return "Milestones complete · verify closure";
    if (!operatingYearIsCurrent) return `${shortDate(dueDate)} · 2026 baseline`;
    const days = daysUntil(dueDate);
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

  function statusFor(task) {
    return recordFor(task).status || "not-started";
  }

  function isClosed(task) {
    return ["verified", "not-applicable"].includes(statusFor(task));
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
    const value = (location.hash || "#home").slice(1).split("?")[0];
    const allowed = ["home", "today", "calendar", "teaching", "faculty", "people", "reference"];
    return allowed.includes(value) ? value : "home";
  }

  function render() {
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
    return `<aside class="alert-banner danger"><strong>Drive sharing still needs attention.</strong><span>Approved staff hubs are connected, but sign-in and restrictive permissions remain essential. Never add case-specific or sensitive descendant links.</span><button type="button" data-action="open-task" data-task-id="source-sharing-review">Show the safe fix</button></aside>`;
  }

  function renderHome() {
    routeContent.innerHTML = `
      <section class="landing">
        <div class="landing-inner">
          <p class="eyebrow">WWHS OPERATIONS WORKBOARDS</p>
          <h1>Head Teacher TAS</h1>
          <p class="landing-lead">Start with the next real action. Open the broader controls only when you need them.</p>
          <div class="landing-actions">
            <button class="button primary large" type="button" data-action="start-guided">Show me the next action</button>
            <button class="button secondary large" type="button" data-action="start-fast">Open calendar &amp; work areas</button>
          </div>
          <p class="landing-note">No student, staff, health, incident, report or finance details belong in this workboard.</p>
        </div>
      </section>

      <section class="wing-grid" aria-label="WWHS workboard wings">
        <article class="wing-card active-wing">
          <div class="wing-icon" aria-hidden="true">T</div>
          <div><p class="eyebrow">THIS WING</p><h2>Head Teacher TAS</h2><p>Calendar, teaching and reporting, faculty operations, people and safety.</p></div>
          <button class="text-link" type="button" data-action="start-guided">Start Head Teacher work →</button>
        </article>
        <article class="wing-card companion-wing">
          <div class="wing-icon vet" aria-hidden="true">V</div>
          <div><p class="eyebrow">COMPANION WING</p><h2>VET Compliance</h2><p>Delivery authority, RTO evidence, placement, NESA/VET data and annual VET controls.</p></div>
          <a class="text-link" href="../?workboard=vet#today">Open VET workboard ↗</a>
        </article>
      </section>

      <section class="calm-start">
        <div><p class="eyebrow">HOW THIS WORKS</p><h2>One operational spine</h2><p>Today → Calendar → Teaching &amp; reporting → Faculty operations → People &amp; safety → Reference library.</p></div>
        <ol class="start-steps">
          <li><span>1</span><strong>Do the action</strong><small>Work in the authorised school system.</small></li>
          <li><span>2</span><strong>Check the result</strong><small>Use the stated “Done when” test.</small></li>
          <li><span>3</span><strong>Record a safe pointer</strong><small>Never copy the actual evidence here.</small></li>
        </ol>
      </section>
      ${privacyBanner()}
      ${yearBanner()}`;
  }

  function activeDueTasks() {
    return data.tasks
      .filter(task => task.dueDate && !task.historyOnly && !isClosed(task))
      .sort((a, b) => queueDueDate(a).localeCompare(queueDueDate(b)));
  }

  function nextTaskList() {
    const dated = activeDueTasks();
    if (!operatingYearIsCurrent) {
      const annual = data.tasks.find(task => task.id === "annual-calendar-control");
      return [annual, ...dated].filter(Boolean);
    }
    const actionable = dated.filter(task => daysUntil(queueDueDate(task)) >= -21);
    return actionable.length ? actionable : dated;
  }

  function renderToday() {
    const queue = nextTaskList();
    const fallback = data.tasks
      .filter(task => !task.historyOnly && !task.procedureOnly && task.phase !== "triggered" && !isClosed(task))
      .sort((a, b) => ({ critical: 0, high: 1, routine: 2 }[a.priority] ?? 3) - ({ critical: 0, high: 1, routine: 2 }[b.priority] ?? 3))[0];
    const next = queue[0] || fallback;
    const coming = queue.slice(1, 5);
    const olderOverdue = activeDueTasks().filter(task => daysUntil(queueDueDate(task)) < -21);
    const week = weekKey();
    const checks = safeObject(state.weekly[week]);
    const completedChecks = data.weeklyChecks.filter((_, index) => checks[index] === true).length;
    const openExceptions = data.tasks.filter(task => statusFor(task) === "exception").length;
    const standing = data.tasks
      .filter(task => !task.dueDate && task.phase !== "triggered" && !isClosed(task) && ["critical", "high"].includes(task.priority))
      .sort((a, b) => (a.priority === "critical" ? -1 : 0) - (b.priority === "critical" ? -1 : 0));
    const actions = `<a class="button secondary compact" href="#calendar">Open full calendar</a>`;

    routeContent.innerHTML = `<div class="page-wrap">
      ${pageHeader(currentTermLabel(), "Your next step", "Do the nearest action first. The rest of the workboard will wait.", actions)}
      ${yearBanner()}
      ${privacyBanner()}
      <aside class="privacy-strip"><strong>Keep personal information out of this workboard.</strong><span>Complete the real action and retain its evidence in the authorised system.</span></aside>
      ${next ? nextActionCard(next) : `<section class="empty-state"><h2>No open dated action</h2><p>Check the weekly rhythm and calendar for the next scheduled control.</p></section>`}
      ${coming.length ? `<section class="coming-section"><div class="section-heading"><div><h2>Coming next</h2><p>A preview only—nothing else to action yet.</p></div></div><div class="coming-list">${coming.map((task, index) => comingRow(task, index + 2)).join("")}</div></section>` : ""}
      ${olderOverdue.length ? `<details class="standing-panel overdue-panel"><summary>${olderOverdue.length} older open control${olderOverdue.length === 1 ? "" : "s"} need reconciliation</summary><p>These are not allowed to block Today, but each needs verification, a not-applicable decision or an owned exception.</p><div class="coming-list">${olderOverdue.map((task, index) => comingRow(task, index + 1)).join("")}</div></details>` : ""}
      <section class="weekly-panel">
        <div class="section-heading"><div><p class="eyebrow">WEEKLY CONTROL</p><h2>Five-minute scan</h2><p>${completedChecks} of ${data.weeklyChecks.length} checks recorded for the week beginning ${shortDate(week)}.</p></div><span class="progress-number">${completedChecks}/${data.weeklyChecks.length}</span></div>
        <div class="weekly-checks">${data.weeklyChecks.map((label, index) => `<label><input type="checkbox" data-weekly-check="${index}" ${checks[index] ? "checked" : ""}><span>${esc(label)}</span></label>`).join("")}</div>
      </section>
      ${standing.length ? `<details class="standing-panel"><summary>${standing.length} standing assurance control${standing.length === 1 ? "" : "s"}</summary><p>These matter, but they do not replace the dated action above.</p><div class="coming-list">${standing.slice(0, 6).map((task, index) => comingRow(task, index + 1)).join("")}</div><a class="text-link" href="#${esc(areaMeta[standing[0].area]?.route || "calendar")}">Open the full work areas →</a></details>` : ""}
      ${openExceptions ? `<aside class="alert-banner warning"><strong>${openExceptions} owned exception${openExceptions === 1 ? "" : "s"} remain open.</strong><span>Review these in the relevant work area.</span></aside>` : ""}
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

  function comingRow(task, number) {
    return `<button class="coming-row" type="button" data-action="open-task" data-task-id="${esc(task.id)}"><span class="row-number">${String(number).padStart(2, "0")}</span><span><strong>${esc(task.title)}</strong><small>${esc(dueLabel(task))}</small></span>${statusPill(task)}</button>`;
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
      <section class="timeline-section"><div class="section-heading"><div><h2>${operatingYearIsCurrent ? "Current and coming" : "2026 dated baseline"}</h2><p>${upcoming.length} dated control${upcoming.length === 1 ? "" : "s"}, including recent overdue work.</p></div></div><div class="timeline">${upcoming.map(calendarItem).join("") || `<p class="empty-line">No later 2026 dates remain.</p>`}</div></section>
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
      <button class="button quiet compact" type="button" data-action="open-task" data-task-id="${esc(task.id)}">Open</button>
    </article>`;
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
      <div class="area-summary"><span><strong>${completed}</strong> of ${trackableTasks.length} trackable controls closed</span><span><strong>${trackableTasks.filter(task => task.priority === "critical" && !isClosed(task)).length}</strong> open critical controls</span><span><strong>${triggered.length}</strong> event-driven workflows</span></div>
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
      <div class="task-card-foot"><span>${esc(task.dueDate ? dueLabel(task) : task.timing)}<small>${esc(task.historyOnly ? "Read-only annual pattern" : cycleLabel(task))}</small></span><button class="button quiet compact" type="button" data-action="open-task" data-task-id="${esc(task.id)}">${task.historyOnly ? "View baseline" : "Open task"}</button></div>
    </article>`;
  }

  function renderReference() {
    const groups = [...new Set(data.systems.map(system => system.group))];
    const currentCount = data.systems.filter(system => system.url).length;
    const localCount = data.systems.filter(system => system.kind === "local" && !currentSystemUrl(system)).length;
    routeContent.innerHTML = `<div class="page-wrap">
      ${pageHeader("REFERENCE LIBRARY", "Current systems and reference points", "Public and approved staff launchers are built in. Sign-in and owner-system permissions still apply.", `<button class="button primary compact" type="button" data-action="open-settings">Review staff links</button>`)}
      ${privacyBanner()}
      <section class="source-boundary"><div><strong>${currentCount}</strong><span>built-in front doors</span></div><div><strong>${localCount}</strong><span>unconnected staff links</span></div><p>“Updated 2025” in the old guide does not prove that a procedure or link is current. Use the source status shown in each task.</p></section>
      ${groups.map(group => systemGroup(group)).join("")}
      <section class="source-audit"><div class="section-heading"><div><h2>What controls this workboard</h2><p>Four source layers, with a clear authority boundary.</p></div></div><div class="source-grid">${data.sourceGroups.map(sourceCard).join("")}</div></section>
      <details class="retired-panel"><summary>Retired or reference-only items</summary><ul>${data.retiredItems.map(item => `<li>${esc(item)}</li>`).join("")}</ul></details>
      ${handoverPanel()}
    </div>`;
  }

  function systemGroup(group) {
    const systems = data.systems.filter(system => system.group === group);
    return `<section class="systems-section"><div class="section-heading"><div><h2>${esc(group)}</h2><p>${group === "Controlled staff sources" ? "Approved staff locations are built in. Sign-in and existing permissions still apply." : "Open the owner system and complete the action there."}</p></div></div><div class="system-grid">${systems.map(systemCard).join("")}</div></section>`;
  }

  function systemCard(system) {
    const url = currentSystemUrl(system);
    const status = system.kind === "local" ? (url ? "Approved front door" : "Setup required") : system.status === "verified" ? "Verified front door" : "Staff front door";
    return `<article class="system-card ${url ? "has-link" : "needs-link"}">
      <div class="system-top"><span class="system-kind">${esc(system.kind === "public" ? "PUBLIC" : system.kind === "local" ? "CONTROLLED" : "STAFF")}</span><span class="pill source ${url ? "good" : "warn"}">${esc(status)}</span></div>
      <h3>${esc(system.label)}</h3><p>${esc(system.purpose)}</p><small>${esc(system.note)}</small>
      ${url ? `<button class="button quiet compact" type="button" data-action="launch-system" data-system-id="${esc(system.id)}">Open ${system.kind === "local" ? "approved location" : "system"} ↗</button>` : `<button class="button quiet compact" type="button" data-action="open-settings">Add approved link</button>`}
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
        ? `<button class="button secondary compact" type="button" data-action="launch-system" data-system-id="${esc(id)}">${esc(system.label)} ↗</button>`
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
        <label><span>Status</span><select name="status">${Object.entries(statusMeta).map(([value, meta]) => `<option value="${value}" ${record.status === value ? "selected" : ""}>${esc(meta.label)}</option>`).join("")}</select></label>
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
        status: previous.status === "not-started" || previous.status === "verified" ? "in-progress" : previous.status,
        steps: { ...safeObject(previous.steps), [event.target.dataset.taskStep]: event.target.checked },
        doneConfirmed: previous.status === "verified" ? false : previous.doneConfirmed,
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
        status: previous.status === "not-started" || previous.status === "verified" ? "in-progress" : previous.status,
        milestones: { ...safeObject(previous.milestones), [event.target.dataset.taskMilestone]: event.target.checked },
        doneConfirmed: previous.status === "verified" ? false : previous.doneConfirmed,
        updatedAt: new Date().toISOString()
      };
      taskStateDirty = true;
      saveState();
      const item = event.target.closest("li");
      item?.classList.toggle("is-done", event.target.checked);
      const due = taskDialogContent.querySelector(".pill.due");
      if (due) due.textContent = dueLabel(task);
      const status = taskDialogContent.querySelector(".pill.status");
      const meta = statusMeta[statusFor(task)];
      if (status && meta) {
        status.className = `pill status ${meta.className}`;
        status.textContent = meta.label;
      }
    }

    if (event.target.matches("[data-weekly-check]")) {
      const week = weekKey();
      const index = event.target.dataset.weeklyCheck;
      state.weekly[week] = { ...safeObject(state.weekly[week]), [index]: event.target.checked };
      saveState();
      renderToday();
      document.querySelector(`[data-weekly-check="${CSS.escape(index)}"]`)?.focus();
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
    render();
    document.getElementById("main-content")?.focus({ preventScroll: true });
  });
  render();
})();
