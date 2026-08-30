(function () {
  "use strict";

  const workboard = window.VET_WORKBOARD = window.VET_WORKBOARD || {};
  const canonicalTasks = new Map((workboard.taskRegister?.tasks || []).map(task => [task.id, task]));
  const SOURCE_REPLACEMENTS = {
    "NESA-TOA-2026": "NESA-TOA",
    "NESA-TOA-2026-MAY": "NESA-TOA",
    "RTO-TERM1-GUIDE-2026": "RTO-DOCUMENT-LIBRARY",
    "RTO-TERM2-GUIDE-2026": "RTO-DOCUMENT-LIBRARY",
    "RTO-TERM3-GUIDE-2026": "RTO-DOCUMENT-LIBRARY",
    "RTO-T2-MEETING-2026": "RTO-DOCUMENT-LIBRARY",
    "RTO-NOTICE-T3W5-2026": "VET-SCHOOLS-HUB",
    "WWHS-CALENDAR-2026": "WWHS-VET-SHARED",
    "DOE-RTO-QM-2025-26": "RTO-DOCUMENT-LIBRARY",
    "NESA-CHECKS-SOP-2025": "NESA-TOA",
    "WWHS-VET-MGMT-2026-27": "WWHS-VET-SHARED",
    "WWHS-USI-PROCEDURE": "WWHS-VET-SHARED",
    "WWHS-AUDIT-CHECKLIST": "WWHS-VET-SHARED",
    "WWHS-CROSSCHECK-TEMPLATE": "WWHS-VET-SHARED",
    "RTO-OUTCOME-2025": "RTO-DOCUMENT-LIBRARY"
  };

  const weeks = [
    { number: 1, start: "2027-02-03", end: "2027-02-05", theme: "Start delivery safely" },
    { number: 2, start: "2027-02-08", end: "2027-02-12", theme: "Confirm learner and provider records" },
    { number: 3, start: "2027-02-15", end: "2027-02-19", theme: "Resolve pathways and plan placements" },
    { number: 4, start: "2027-02-22", end: "2027-02-26", theme: "Run the first full reconciliation" },
    { number: 5, start: "2027-03-01", end: "2027-03-05", theme: "Complete the first formal data-control point" },
    { number: 6, start: "2027-03-08", end: "2027-03-12", theme: "Test assessment and evidence readiness" },
    { number: 7, start: "2027-03-15", end: "2027-03-19", theme: "Check trainer and placement controls" },
    { number: 8, start: "2027-03-22", end: "2027-03-26", theme: "Reconcile progress before term close" },
    { number: 9, start: "2027-03-29", end: "2027-04-02", theme: "Close exceptions and prepare assurance" },
    { number: 10, start: "2027-04-05", end: "2027-04-09", theme: "Assure, hand over and open Term 2" }
  ];

  const termTwoWeeks = [
    { number: 1, start: "2027-04-29", end: "2027-04-30", theme: "Accept the handover and refresh current sources" },
    { number: 2, start: "2027-05-03", end: "2027-05-07", theme: "Confirm qualification, RTO and SBAT states" },
    { number: 3, start: "2027-05-10", end: "2027-05-14", theme: "Close USI exceptions and reconcile active records" },
    { number: 4, start: "2027-05-17", end: "2027-05-21", theme: "Enter only authorised competency data" },
    { number: 5, start: "2027-05-24", end: "2027-05-28", theme: "Run learner feedback and team-action controls" },
    { number: 6, start: "2027-05-31", end: "2027-06-04", theme: "Assure evidence before Semester 1 reports" },
    { number: 7, start: "2027-06-07", end: "2027-06-11", theme: "Start next-year delivery and staffing planning" },
    { number: 8, start: "2027-06-14", end: "2027-06-18", theme: "Run the current second data-control point" },
    { number: 9, start: "2027-06-21", end: "2027-06-25", theme: "Audit Stage 6 entries before the hard cut-off" },
    { number: 10, start: "2027-06-28", end: "2027-07-02", theme: "Meet the 30 June control and close Term 2" }
  ];

  const termThreeWeeks = [
    { number: 1, start: "2027-07-20", end: "2027-07-23", theme: "Refresh HSC, RTO and local dates" },
    { number: 2, start: "2027-07-26", end: "2027-07-30", theme: "Reconcile progressive outcomes and evidence" },
    { number: 3, start: "2027-08-02", end: "2027-08-06", theme: "Confirm next-year promotion authority" },
    { number: 4, start: "2027-08-09", end: "2027-08-13", theme: "Prepare workplace-learning and completion controls" },
    { number: 5, start: "2027-08-16", end: "2027-08-20", theme: "Open the verified workplace-learning window" },
    { number: 6, start: "2027-08-23", end: "2027-08-27", theme: "Convert coordinator updates into owned action" },
    { number: 7, start: "2027-08-30", end: "2027-09-03", theme: "Prepare HSC estimates from the authorised cohort" },
    { number: 8, start: "2027-09-06", end: "2027-09-10", theme: "Run the current third data-control point" },
    { number: 9, start: "2027-09-13", end: "2027-09-17", theme: "Close HSC delivery and exit-survey controls" },
    { number: 10, start: "2027-09-20", end: "2027-09-24", theme: "Assure Term 3 and hand over to final outcomes" }
  ];

  const termFourWeeks = [
    { number: 1, start: "2027-10-12", end: "2027-10-15", theme: "Refresh final-outcome and reporting dates" },
    { number: 2, start: "2027-10-18", end: "2027-10-22", theme: "Finalise Year 11 outcomes and reports" },
    { number: 3, start: "2027-10-25", end: "2027-10-29", theme: "Finalise Year 12 and Year 10 data" },
    { number: 4, start: "2027-11-01", end: "2027-11-05", theme: "Close applicable Year 9 short-course entries" },
    { number: 5, start: "2027-11-08", end: "2027-11-12", theme: "Close Year 12 markbook and evidence states" },
    { number: 6, start: "2027-11-15", end: "2027-11-19", theme: "Confirm the 2028 Hub and trainer-readiness plan" },
    { number: 7, start: "2027-11-22", end: "2027-11-26", theme: "Close support-fund and outstanding finance controls" },
    { number: 8, start: "2027-11-29", end: "2027-12-03", theme: "Archive and roll over controlled markbooks" },
    { number: 9, start: "2027-12-06", end: "2027-12-10", theme: "Test records, privacy and improvement actions" },
    { number: 10, start: "2027-12-13", end: "2027-12-17", theme: "Complete year-end assurance" },
    { number: 11, start: "2027-12-20", end: "2027-12-20", theme: "Final-day closure and 2028 handover" }
  ];

  function displayRange(week) {
    const start = new Date(`${week.start}T12:00:00`), end = new Date(`${week.end}T12:00:00`);
    const month = date => new Intl.DateTimeFormat("en-AU", { month: "long" }).format(date);
    return start.getMonth() === end.getMonth()
      ? `${start.getDate()}–${end.getDate()} ${month(end)} 2027`
      : `${start.getDate()} ${month(start)}–${end.getDate()} ${month(end)} 2027`;
  }

  function currentSourceIds(sourceIds) {
    return [...new Set((sourceIds || []).map(id => SOURCE_REPLACEMENTS[id] || id))];
  }

  function cleanInherited(value) {
    if (typeof value === "string") return value.replace(/\b202[0-6]\b/g, "the prior controlled year");
    if (Array.isArray(value)) return value.map(cleanInherited);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cleanInherited(item)]));
    return value;
  }

  function sourceTask(id, canonicalId, options) {
    const original = canonicalTasks.get(canonicalId);
    if (!original) throw new Error(`Missing canonical task: ${canonicalId}`);
    const term = Number(options.term || (options.week ? 1 : 0));
    const derived = {
      ...original,
      id,
      title: options.title || original.title,
      canonicalTaskId: canonicalId,
      phase: term ? `term${term}_2027` : "annual_2027",
      cycle: term ? `2027-term-${term}` : "2027-annual",
      operatingYear: 2027,
      term,
      lane: options.lane || "core",
      gate: options.gate || null,
      week: options.week || null,
      order: options.order,
      timing: options.timing || original.timing,
      trigger: options.trigger || cleanInherited(original.trigger),
      dueDate: options.dueDate || null,
      dueAuthority: options.dueAuthority || "Current 2027 NESA, RTO and WWHS instruction; confirm the exact requirement before acting.",
      dependencies: options.dependencies || [],
      hardDependencies: options.hardDependencies || [],
      roles: options.roles || original.roles,
      systems: options.systems || original.systems,
      sourceIds: currentSourceIds(options.sourceIds || original.sourceIds),
      liveVerification: {
        required: true,
        check: options.liveCheck || "Confirm the current 2027 source, date and owner-system state. Do not carry a 2026 date forward."
      },
      independentVerificationRequired: options.independentVerificationRequired === true,
      deadlineState: options.deadlineState || "confirm-current",
      lateMode: options.lateMode || null,
      windowStart: options.windowStart || null,
      windowEnd: options.windowEnd || null,
      actionSteps: options.actionSteps || cleanInherited(original.actionSteps),
      doneWhen: options.doneWhen || cleanInherited(original.doneWhen),
      applicability: options.applicability || cleanInherited(original.applicability),
      guidance: options.guidance || cleanInherited(original.guidance)
    };
    Object.keys(derived).filter(key => /2026/.test(key)).forEach(key => delete derived[key]);
    return derived;
  }

  function customTask(options) {
    const term = Number(options.term || (options.week ? 1 : 0));
    return {
      id: options.id,
      title: options.title,
      phase: term ? `term${term}_2027` : "annual_2027",
      cycle: term ? `2027-term-${term}` : "2027-annual",
      operatingYear: 2027,
      term,
      lane: options.lane || "assurance",
      gate: options.gate || null,
      week: options.week || null,
      order: options.order,
      timing: options.timing,
      trigger: options.trigger,
      dueDate: options.dueDate || null,
      dueAuthority: options.dueAuthority || "Current 2027 controlled sources and authorised WWHS owner systems",
      roles: options.roles,
      priority: options.priority || "high",
      dependencies: options.dependencies || [],
      hardDependencies: options.hardDependencies || [],
      actionSteps: options.actionSteps,
      doneWhen: options.doneWhen,
      evidencePointerType: options.evidencePointerType || "privacy-safe-owner-system-reference",
      systems: options.systems || ["Approved team action record"],
      sourceIds: currentSourceIds(options.sourceIds || ["VET-SCHOOLS-HUB", "RTO-DOCUMENT-LIBRARY"]),
      liveVerification: {
        required: true,
        check: options.liveCheck || "Confirm the current 2027 source and owner-system result before verification."
      },
      independentVerificationRequired: options.independentVerificationRequired === true,
      deadlineState: options.deadlineState || "term-window",
      lateMode: options.lateMode || null,
      windowStart: options.windowStart || null,
      windowEnd: options.windowEnd || null,
      guidance: options.guidance,
      applicability: options.applicability || { cohorts: ["all"], conditions: "Every active WWHS VET operating cycle" }
    };
  }

  function eventTemplate(canonicalId, options = {}) {
    const original = canonicalTasks.get(canonicalId);
    if (!original) throw new Error(`Missing event task: ${canonicalId}`);
    return {
      ...original,
      id: `template-${canonicalId}`,
      title: options.title || cleanInherited(original.title),
      canonicalTaskId: canonicalId,
      occurrenceTemplate: true,
      phase: "continuous_2027",
      cycle: "2027-cycle",
      operatingYear: 2027,
      term: null,
      lane: "interrupt",
      gate: null,
      week: null,
      order: 9000 + Number(options.order || 0),
      timing: options.timing || original.timing,
      dueDate: null,
      dueAuthority: options.dueAuthority || "Current 2027 authority and owner-system instructions for the specific event",
      dependencies: options.dependencies || [],
      hardDependencies: options.hardDependencies || [],
      dependencyMode: "follow-up",
      independentVerificationRequired: options.independentVerificationRequired === true,
      sourceIds: currentSourceIds(options.sourceIds || original.sourceIds),
      actionSteps: options.actionSteps || cleanInherited(original.actionSteps),
      doneWhen: options.doneWhen || cleanInherited(original.doneWhen),
      applicability: options.applicability || cleanInherited(original.applicability),
      guidance: options.guidance || cleanInherited(original.guidance),
      liveVerification: {
        required: true,
        check: options.liveCheck || "Respond safely now, then re-open and verify the current 2027 controls listed as concurrent follow-ups."
      }
    };
  }

  const leadershipRoles = {
    accountable: ["Head Teacher VET", "VET Coordinator"],
    doer: ["VET Coordinator", "VET Coordinator Assistant"],
    verifier: ["Head Teacher VET or Principal/authorised delegate"]
  };
  const principalGateRoles = {
    accountable: ["Principal or authorised delegate"],
    doer: ["Head Teacher VET", "VET Coordinator", "VET Coordinator Assistant"],
    verifier: ["Principal or authorised delegate"]
  };

  const eventTemplates = [
    eventTemplate("c-07-workplace-learning-control", {
      order: 5,
      title: "Run a separate workplace-learning occurrence",
      independentVerificationRequired: true,
      sourceIds: ["DOE-WPL-PROCEDURE", "DOE-WPL-FORMS", "RTO-DOCUMENT-LIBRARY", "WWHS-VET-SHARED"],
      liveCheck: "Confirm the actual placement dates, course-specific requirement, approved provider/host route and current Department procedure before starting this occurrence.",
      actionSteps: [
        "Before placement, verify the current course-specific requirement, approved arrangement, preparation, forms, signatures, readiness and escalation contacts in the authorised systems.",
        "On Day 1 or Day 2, contact the student and host through the approved process and retain the official contact record in the owner system.",
        "Respond to any safety, welfare, attendance, suitability or privacy concern immediately through the formal incident/escalation route; complete the required formal notification within 24 hours where the procedure requires it.",
        "After placement, reconcile attendance, course-specific hours, the original Student Placement Record and required owner-system records as soon as possible.",
        "Complete the post-placement review as soon as possible and within four weeks, then independently verify or formally own every exception."
      ],
      doneWhen: "Preparation, Day 1/2 contact, incidents, attendance, hours, original records and the post-placement review are complete in authorised systems, or every exception has an owner, chase and escalation point.",
      applicability: { cohorts: ["each verified workplace-learning occurrence"], conditions: "Create a fresh occurrence for each distinct placement block or individual placement process" },
      guidance: { why: "Workplace learning combines course completion, records and duty-of-care controls that occur at different times.", commonTrap: "Using one annual checkbox, one blanket hours rule or this workboard instead of the approved placement and incident systems." }
    }),
    eventTemplate("e-01-delivery-change", {
      order: 10,
      dependencies: ["2027-g01-authority", "2027-g03-roles", "2027-g04-profile", "2027-g05-trainers", "2027-g06-delivery"],
      liveCheck: "Act on the delivery change now. Re-open the current 2027 profile, trainer-readiness and delivery-authority controls before the changed arrangement resumes."
    }),
    eventTemplate("e-02-new-course-authority", {
      order: 20,
      dependencies: ["2027-g01-authority", "2027-g05-trainers", "2027-g06-delivery"],
      liveCheck: "Start the current approval check now and keep the proposed course blocked until every applicable 2027 endorsement, authority and readiness state is verified."
    }),
    eventTemplate("e-03-enrolment-change", {
      order: 30,
      dependencies: ["2027-g07-codes", "2027-w01-onboarding"],
      liveCheck: "Process the change promptly, then reconcile it against the current 2027 course-code and onboarding controls."
    }),
    eventTemplate("e-04-support-or-rpl-request", {
      order: 40,
      dependencies: ["2027-w01-onboarding", "2027-w03-rpl-credit"],
      liveCheck: "Protect confidentiality and begin the authorised support or recognition route now; use the current 2027 learner-readiness controls as concurrent follow-ups."
    }),
    eventTemplate("e-05-incident-response", {
      order: 50,
      dependencies: ["2027-w01-privacy", "2027-w07-placement-control"],
      liveCheck: "Protect people and contain harm immediately. Use current emergency, incident, privacy and workplace-learning routes; this workboard is never the incident record."
    }),
    eventTemplate("e-07-coordinator-handover", {
      order: 60,
      dependencies: ["2027-g01-authority", "2027-g02-calendar", "2027-g03-roles"],
      liveCheck: "Begin the continuity response now, then re-open the current 2027 source, calendar, delegation and access controls with the incoming role."
    }),
    eventTemplate("e-06-discrepancy-corrective-action", {
      order: 70,
      dependencies: ["2027-g01-authority"],
      independentVerificationRequired: true,
      liveCheck: "Own and contain the discrepancy as soon as it is found, then verify the current 2027 authority and affected control as concurrent follow-ups."
    }),
    eventTemplate("c-09-validation-improvement", {
      order: 80,
      dependencies: ["2027-g01-authority", "2027-g08-assessment"],
      independentVerificationRequired: true,
      liveCheck: "Start the validation, audit or improvement response when requested; confirm the current 2027 controlled tools and affected delivery controls as concurrent follow-ups."
    })
  ];

  const setupTasks = [
    customTask({
      id: "2027-g00-rollover", title: "Preserve 2026 and open the 2027 workspace", gate: 1, order: 0,
      timing: "Term 4 2026 or before the first 2027 VET action",
      trigger: "Annual rollover or incoming role handover", priority: "critical", dependencies: [], roles: principalGateRoles,
      independentVerificationRequired: true,
      actionSteps: [
        "Export a privacy-safe 2026 workboard backup and confirm official evidence remains in its authorised owner systems.",
        "Review every 2026 in-progress, waiting and exception item; identify only the work that genuinely needs a 2027 carry-over.",
        "Give each carry-over a responsible role, verifier, chase date and privacy-safe owner-system reference.",
        "Open the clean 2027 task instances and confirm no 2026 completion has closed a 2027 control.",
        "Record the 2026 archive/carry-over reference and hand the clean workspace to the current-source gate."
      ],
      doneWhen: "The 2026 operational snapshot remains readable, the 2027 workspace is clean, and every genuine carry-over is separately owned without copying personal information or old completion status.",
      systems: ["Approved team action record", "Approved school records"],
      sourceIds: ["WWHS-VET-SHARED", "VET-SCHOOLS-HUB"],
      guidance: {
        why: "A controlled rollover prevents last year's green ticks and unresolved exceptions from silently contaminating the new operating year.",
        commonTrap: "Resetting everything without preserving the audit trail, or copying every 2026 completion into 2027."
      }
    }),
    sourceTask("2027-g01-authority", "a-01-confirm-authority-set", {
      gate: 1, order: 10, timing: "Term 4 2026 to the first 2027 VET action", dependencies: ["2027-g00-rollover"], roles: leadershipRoles,
      dueAuthority: "2027 source-verification gate — NESA, RTO 90333 and WWHS sources must be current before the year is activated.",
      liveCheck: "Record the current 2027 publication/version or a visible owner and chase date for every source that is not yet available."
    }),
    sourceTask("2027-g02-calendar", "a-02-build-live-calendar", {
      gate: 1, order: 20, timing: "Build during Term 4 2026; approve before staff delegate 2027 work", dependencies: ["2027-g01-authority"], roles: leadershipRoles,
      dueAuthority: "Published 2027 NSW term dates plus the current NESA, RTO and WWHS staff calendars. School/RTO deadlines remain unconfirmed until their live sources are checked.",
      liveCheck: "Confirm the WWHS staff calendar and every 2027 VET milestone. Do not treat these week windows as NESA or RTO deadlines."
    }),
    sourceTask("2027-g03-roles", "a-03-confirm-roles-access", {
      gate: 1, order: 30, timing: "Before 2027 work is delegated", dependencies: ["2027-g01-authority"], roles: principalGateRoles,
      dueAuthority: "Formal 2027 Principal delegation, staffing decisions and approved system access.",
      liveCheck: "Confirm Head Teacher VET, Coordinator, Assistant, trainer/assessor, workplace-learning, data and deputy arrangements separately."
    }),
    sourceTask("2027-g04-profile", "a-04-update-school-profile", {
      gate: 2, order: 40, timing: "Before confirming each 2027 delivery", dependencies: ["2027-g03-roles"], roles: leadershipRoles
    }),
    sourceTask("2027-g05-trainers", "a-07-trainer-readiness", {
      gate: 2, order: 50, timing: "Before 2027 classes are allocated or commence", dependencies: ["2027-g03-roles"], roles: leadershipRoles
    }),
    sourceTask("2027-g06-delivery", "a-05-confirm-delivery", {
      gate: 2, order: 60, timing: "Before a 2027 course is promoted or delivered", dependencies: ["2027-g04-profile", "2027-g05-trainers"], roles: principalGateRoles,
      liveCheck: "Check current RTO registration/scope and the separate WWHS authority/readiness state. One does not prove the other."
    }),
    sourceTask("2027-g07-codes", "a-06-reconcile-course-codes", {
      gate: 2, order: 70, timing: "Before 2027 learner entries and timetable reliance", dependencies: ["2027-g06-delivery"], roles: leadershipRoles
    }),
    sourceTask("2027-g08-assessment", "t1-05-tas-and-assessment-readiness", {
      gate: 2, order: 80, timing: "Before delivery and before any assessment resource is released", dependencies: ["2027-g05-trainers", "2027-g06-delivery"], roles: leadershipRoles,
      liveCheck: "Confirm the 2027 controlled TAS, delivery plan and assessment versions in their authorised locations; never republish them here."
    }),
    sourceTask("2027-g09-startup-brief", "a-08-publish-local-handbook", {
      gate: 2, order: 90, timing: "Before staff and learner induction", dependencies: ["2027-g01-authority", "2027-g06-delivery"], roles: leadershipRoles
    }),
    customTask({
      id: "2027-g10-activate", title: "Authorise the 2027 Term 1 operating cycle", gate: 2, order: 100,
      timing: "After the source, calendar, role, delivery and controlled-resource gates are closed",
      trigger: "All essential pre-year readiness controls are ready for independent verification",
      priority: "critical", dependencies: ["2027-g02-calendar", "2027-g03-roles", "2027-g07-codes", "2027-g08-assessment", "2027-g09-startup-brief"],
      roles: principalGateRoles,
      independentVerificationRequired: true,
      actionSteps: [
        "Review the verified source register and every visible 2027 authority gap.",
        "Confirm the approved calendar, internal lead points and chase owners.",
        "Confirm accountable roles, doers, verifiers and deputies can access their owner systems.",
        "Confirm each proposed course, trainer and controlled delivery/assessment resource is ready or formally withheld.",
        "Authorise the privacy-safe Term 1 workboard cycle and communicate the first hand-offs."
      ],
      doneWhen: "The Principal or authorised delegate has approved activation, every blocking exception has an owner, and Week 1 can open without assuming any unpublished deadline.",
      systems: ["VET Schools Hub", "Approved team action record", "Approved school calendar"],
      sourceIds: ["VET-SCHOOLS-HUB", "RTO-DOCUMENT-LIBRARY", "NESA-TOA", "WWHS-VET-SHARED"],
      guidance: {
        why: "Activation is the control point that turns preparation into authorised work rather than a collection of hopeful checklists.",
        commonTrap: "Opening the year because classes have started while authority, access or source gaps are still invisible."
      }
    })
  ];

  const weekDefinitions = [
    {
      week: 1,
      focus: [
        ["onboarding", "t1-03-onboarding-induction-support", "Complete commencement, induction and learner-support controls", ["2027-g10-activate"]],
        ["privacy", "c-08-records-privacy-control", "Confirm privacy-safe records and access at commencement", ["2027-g10-activate"]]
      ]
    },
    {
      week: 2,
      focus: [
        ["usi", "t1-01-usi-verification", "Progress and verify learner USI controls", ["2027-g07-codes"]],
        ["external", "t1-02-external-vet-entries", "Confirm externally delivered VET entries", ["2027-g03-roles"]],
        ["sbat", "c-06-sbat-monitoring", "Confirm applicable SBAT records and monitoring", ["2027-g03-roles", "2027-g07-codes"]]
      ]
    },
    {
      week: 3,
      focus: [
        ["rpl-credit", "t1-04-rpl-credit-transfer", "Resolve RPL, credit-transfer and course-credit pathways", ["2027-w01-onboarding"]],
        ["placement-plan", "t1-06-work-placement-plan", "Establish the workplace-learning plan and preparation pathway", ["2027-w01-onboarding", "2027-g08-assessment"]]
      ]
    },
    {
      week: 4,
      focus: [
        ["reconcile", "c-04-cross-system-reconciliation", "Run the first full class and VET systems reconciliation", ["2027-g07-codes", "2027-w02-usi"]],
        ["funds", "t1-08-monitor-support-funds", "Confirm support funds and approved expenditure tracking", ["2027-g03-roles"]]
      ]
    },
    {
      week: 5,
      focus: [
        ["nesa-check", "t1-07-nesa-check-one", "Complete the first current-year NESA data control", ["2027-g07-codes", "2027-w02-usi"]],
        ["team-meeting", "c-02-team-meetings", "Run the Term 1 VET team action meeting", ["2027-g03-roles"]]
      ]
    },
    {
      week: 6,
      focus: [
        ["evidence", "c-03-evidence-feedback-assurance", "Sample controlled assessment evidence and feedback", ["2027-g08-assessment"]],
        ["short-course", "t1-09-short-course-coassessment", "Confirm short-course and co-assessment arrangements", ["2027-g08-assessment"]]
      ]
    },
    {
      week: 7,
      focus: [
        ["trainer-currency", "c-05-industry-currency", "Review trainer currency and professional-learning actions", ["2027-g05-trainers"]],
        ["placement-control", "c-07-workplace-learning-control", "Check placement readiness, safety and record controls", ["2027-w03-placement-plan"]]
      ]
    },
    {
      week: 8,
      focus: [
        ["reconcile", "c-04-cross-system-reconciliation", "Reconcile enrolment, evidence and entry changes before term close", ["2027-w04-reconcile"]],
        ["evidence", "c-03-evidence-feedback-assurance", "Recheck evidence and feedback before reporting decisions", ["2027-w06-evidence"]]
      ]
    },
    {
      week: 9,
      focus: [
        ["exceptions", "e-06-discrepancy-corrective-action", "Close or formally own every Term 1 compliance discrepancy", ["2027-w08-reconcile"]],
        ["assessment", "t1-05-tas-and-assessment-readiness", "Confirm controlled resources remain current for the next delivery point", ["2027-g08-assessment"]]
      ]
    },
    {
      week: 10,
      focus: [
        ["team-actions", "c-02-team-meetings", "Close Term 1 team actions and hand-backs", ["2027-w05-team-meeting"]]
      ]
    }
  ];

  const weekTasks = [];
  weekDefinitions.forEach(definition => {
    const week = weeks[definition.week - 1];
    const prefix = `2027-w${String(definition.week).padStart(2, "0")}`;
    const previousClose = definition.week === 1 ? "2027-g10-activate" : `2027-w${String(definition.week - 1).padStart(2, "0")}-close`;
    const updateId = `${prefix}-updates`;
    const baseOrder = 100 + definition.week * 100;
    const gate = definition.week <= 3 ? 3 : definition.week <= 5 ? 4 : definition.week <= 9 ? 5 : 6;

    weekTasks.push(sourceTask(updateId, "c-01-rto-updates", {
      lane: "weekly", gate, week: definition.week, order: baseOrder + 10,
      timing: `Week ${definition.week}, ${displayRange(week)}: triage authenticated RTO updates and changed dates`,
      dependencies: [previousClose], hardDependencies: [previousClose], roles: leadershipRoles, windowStart: week.start, windowEnd: week.end,
      liveCheck: "Open the current authenticated notice stream for this week. Create owner, verifier, due and chase actions for every change."
    }));

    const focusIds = [];
    definition.focus.forEach((entry, index) => {
      const [suffix, canonicalId, title, dependencies] = entry;
      const id = `${prefix}-${suffix}`;
      focusIds.push(id);
      weekTasks.push(sourceTask(id, canonicalId, {
        lane: "core", gate, week: definition.week, order: baseOrder + 20 + index,
        timing: `Week ${definition.week}, ${displayRange(week)}: ${week.theme}`,
        dependencies: [updateId, ...dependencies], title, windowStart: week.start, windowEnd: week.end,
        independentVerificationRequired: id === "2027-w09-exceptions",
        liveCheck: canonicalId === "t1-07-nesa-check-one"
          ? "The old local Week 5 pattern is not authority. Confirm the current 2027 NESA/RTO check schedule before completing or marking this not applicable."
          : "Confirm the current 2027 instruction and live owner-system state before recording completion."
      }));
      weekTasks[weekTasks.length - 1].title = title;
    });

    if (definition.week === 10) {
      const assuranceId = `${prefix}-term-assurance`;
      focusIds.push(assuranceId);
      weekTasks.push(customTask({
        id: assuranceId, title: "Complete the Term 1 assurance and Term 2 handover", lane: "assurance", gate, week: 10, order: baseOrder + 40,
        timing: `Week 10, ${displayRange(week)}: complete after current term-close instructions are checked`,
        trigger: "End of Term 1 assurance point", priority: "critical",
        dependencies: [updateId, "2027-w08-reconcile", "2027-w08-evidence", "2027-w09-exceptions", "2027-w09-assessment", "2027-w10-team-actions"],
        hardDependencies: [updateId, "2027-w08-reconcile", "2027-w08-evidence", "2027-w09-exceptions", "2027-w09-assessment", "2027-w10-team-actions"],
        roles: leadershipRoles,
        windowStart: week.start, windowEnd: week.end,
        independentVerificationRequired: true,
        actionSteps: [
          "Review the source register and record any instruction or date that changed during Term 1.",
          "Confirm required learner, course, evidence and NESA/RTO actions in their owner systems without copying personal information here.",
          "Review every waiting, exception and hand-back item; assign a chase and escalation point where closure is not yet possible.",
          "Record a privacy-safe Term 1 assurance summary and obtain the authorised verifier's sign-off.",
          "Open the first verified Term 2 actions and brief the responsible roles."
        ],
        doneWhen: "Term 1 has a verified privacy-safe assurance summary, no exception is ownerless, and the first Term 2 actions have responsible roles and current source checks.",
        systems: ["VET Schools Hub", "Evidence Central", "NESA Schools Online", "Approved team action record"],
        sourceIds: ["VET-SCHOOLS-HUB", "RTO-DOCUMENT-LIBRARY", "NESA-TOA", "EVIDENCE-CENTRAL"],
        guidance: {
          why: "A deliberate term close prevents unresolved work from vanishing into the holiday break.",
          commonTrap: "Calling the term complete because classes finished while data, evidence or hand-back exceptions remain open."
        }
      }));
    }

    const closeId = `${prefix}-close`;
    weekTasks.push(customTask({
      id: closeId, title: `Verify Week ${definition.week} closure and open the next control point`, lane: "weekly", gate, week: definition.week, order: baseOrder + 90,
      timing: `By the end of Week ${definition.week}: verify completed, waiting and handed-back work`,
      trigger: `Week ${definition.week} control close`, dependencies: [updateId, ...focusIds], hardDependencies: [updateId, ...focusIds], roles: leadershipRoles,
      independentVerificationRequired: true,
      actionSteps: [
        "Check that every Week focus action is verified, not applicable with authority, or recorded as a formally owned exception.",
        "Review waiting items and confirm the waiting-for person or system, chase date and escalation path.",
        "Confirm hand-backs were accepted by the next responsible role.",
        "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
        `Confirm the Week ${definition.week} closure reference and brief the next control point.`
      ],
      doneWhen: `Week ${definition.week} is independently verified, no action is ownerless, and ${definition.week === 10 ? "Term 2 can open" : `Week ${definition.week + 1} can open`} safely.`,
      systems: ["Approved team action record", "VET Schools Hub"],
      sourceIds: ["VET-SCHOOLS-HUB", "RTO-DOCUMENT-LIBRARY"],
      windowStart: week.start, windowEnd: week.end,
      guidance: {
        why: "A short weekly close gives the Coordinator and Assistant a shared hand-back rhythm and makes waiting work visible.",
        commonTrap: "Moving to the next week while unresolved actions exist only in email, memory or somebody else's browser."
      }
    }));
  });

  const laterTermDefinitions = [
    {
      term: 2,
      staffStart: "2027-04-27",
      weeks: termTwoWeeks,
      previousClose: "2027-w10-close",
      gateForWeek: week => week <= 7 ? 7 : 8,
      focus: {
        1: [
          { suffix: "team-actions", canonicalId: "c-02-team-meetings", title: "Accept the Term 1 handover and open Term 2 team actions", dependencies: ["2027-w10-term-assurance"] }
        ],
        2: [
          { suffix: "qualification", canonicalId: "t2-01-confirm-rto-qualification", title: "Confirm the current RTO and qualification state", dependencies: ["2027-g06-delivery", "2027-g07-codes"] },
          { suffix: "sbat", canonicalId: "t2-02-sbat-status", title: "Confirm current apprenticeship and traineeship states", dependencies: ["2027-g03-roles", "2027-g07-codes"] }
        ],
        3: [
          { suffix: "usi-exceptions", canonicalId: "t2-04-finalise-usi-exceptions", title: "Close or formally own every unresolved USI exception", dependencies: ["2027-w02-usi"] },
          { suffix: "reconcile", canonicalId: "c-04-cross-system-reconciliation", title: "Reconcile active learner, qualification and provider records", dependencies: ["2027-t2-w02-qualification", "2027-t2-w03-usi-exceptions"] }
        ],
        4: [
          { suffix: "competencies", canonicalId: "t2-03-enter-competencies", title: "Enter only current, assessor-authorised competency data", trigger: "The current 2027 assessor-authorised competency and NESA/RTO data-control point", dependencies: ["2027-g08-assessment", "2027-w06-evidence", "2027-t2-w03-reconcile"], independentVerificationRequired: true, sourceIds: ["NESA-TOA", "RTO-DOCUMENT-LIBRARY", "NESA-VET-UNITS", "NESA-VET-ASSESSMENT", "EVIDENCE-CENTRAL"] },
          { suffix: "evidence", canonicalId: "c-03-evidence-feedback-assurance", title: "Sample the evidence and feedback trail before data entry", dependencies: ["2027-g08-assessment"] }
        ],
        5: [
          { suffix: "questionnaire", canonicalId: "t2-05-learner-questionnaire", title: "Run the current applicable learner-questionnaire process", dependencies: ["2027-w01-onboarding"] },
          { suffix: "team-meeting", canonicalId: "c-02-team-meetings", title: "Run the Term 2 VET team action meeting", dependencies: ["2027-t2-w01-team-actions"] }
        ],
        6: [
          { suffix: "reports", canonicalId: "t2-06-finalise-semester-one-reports", title: "Finalise Semester 1 VET reports from supported evidence", dependencies: ["2027-t2-w04-competencies", "2027-t2-w04-evidence", "2027-t2-w03-reconcile"] },
          { suffix: "report-reconcile", canonicalId: "c-04-cross-system-reconciliation", title: "Reconcile reports, markbook, evidence and NESA states", dependencies: ["2027-t2-w06-reports"] }
        ],
        7: [
          { suffix: "next-year-plan", canonicalId: "t2-08-plan-next-year-delivery", title: "Start 2028 delivery, authority and staffing planning", dependencies: ["2027-g04-profile", "2027-g05-trainers", "2027-g06-delivery"] },
          { suffix: "trainer-currency", canonicalId: "c-05-industry-currency", title: "Review trainer currency and professional-learning actions", dependencies: ["2027-g05-trainers"] }
        ],
        8: [
          { suffix: "nesa-check", canonicalId: "t2-07-nesa-check-two", title: "Complete the current second NESA/RTO data control", dependencies: ["2027-t2-w02-qualification", "2027-t2-w04-competencies", "2027-t2-w06-report-reconcile"], independentVerificationRequired: true },
          { suffix: "sbat-monitor", canonicalId: "c-06-sbat-monitoring", title: "Reconcile applicable SBAT monitoring and reporting", dependencies: ["2027-t2-w02-sbat"] }
        ],
        9: [
          {
            suffix: "entry-audit",
            custom: true,
            title: "Audit every Stage 6 VET entry before the 30 June cut-off",
            dependencies: ["2027-t2-w03-reconcile", "2027-t2-w08-nesa-check"],
            independentVerificationRequired: true,
            sourceIds: ["NESA-VET-ENTRIES", "NESA-TOA"],
            systems: ["NESA Schools Online", "VET Schools Hub", "Approved team action record"],
            timing: "21–25 June 2027: audit entries, exclusions and ability to complete course requirements",
            dueAuthority: "NESA ACE Rule 14.2 sets the 30 June Stage 6 entry cut-off; the live 2027 NESA action controls the authorised entry process.",
            liveCheck: "Check the current ACE rule, 2027 Schools Online action, exclusions and course/work-placement completion feasibility before any remediation.",
            actionSteps: [
              "Open the current ACE Rule 14.2 and the live 2027 Schools Online entry action.",
              "Audit every applicable Preliminary and HSC VET entry, change and external-delivery state in the owner system.",
              "Check course exclusions and whether each proposed change can still meet all course and mandatory work-placement requirements.",
              "Assign every discrepancy for correction before 30 June; keep learner details only in the authorised records.",
              "Obtain an independent aggregate check and record only the privacy-safe audit reference here."
            ],
            doneWhen: "Every applicable Stage 6 entry has been independently checked and each discrepancy has an owner, correction path and deadline before 30 June."
          },
          { suffix: "placement-control", canonicalId: "c-07-workplace-learning-control", title: "Recheck workplace-learning readiness and completion risks", dependencies: ["2027-w03-placement-plan"] }
        ],
        10: [
          {
            suffix: "entry-cutoff",
            custom: true,
            title: "Meet the 30 June Stage 6 VET entry cut-off",
            dependencies: ["2027-t2-w09-entry-audit"],
            hardDependencies: ["2027-t2-w10-updates", "2027-t2-w09-entry-audit"],
            independentVerificationRequired: true,
            priority: "critical",
            dueDate: "2027-06-30",
            windowStart: "2027-06-28",
            windowEnd: "2027-06-30",
            deadlineState: "fixed-authority",
            lateMode: "exception-only",
            sourceIds: ["NESA-VET-ENTRIES", "NESA-TOA"],
            systems: ["NESA Schools Online", "Approved team action record"],
            timing: "28–30 June 2027: complete and independently verify all authorised Stage 6 entry corrections",
            dueAuthority: "NESA ACE Rule 14.2: schools must not enter students into Stage 6 VET courses after 30 June; applies to Preliminary and HSC entries.",
            liveCheck: "Confirm the current ACE rule and live Schools Online state. Do not infer that a local list or prior export proves the entry is complete.",
            actionSteps: [
              "Review the independently checked entry-audit exceptions and the live 2027 Schools Online action.",
              "Complete every authorised entry or change by 30 June; do not create or alter a course entry after the cut-off.",
              "Confirm exclusions and the learner's capacity to complete all applicable course and mandatory work-placement requirements in the owner system.",
              "Have a different authorised person verify the aggregate Schools Online state and unresolved exceptions.",
              "Record only a privacy-safe completion or escalation reference here."
            ],
            doneWhen: "The live owner system shows the correct aggregate Stage 6 VET entry state by 30 June and every unresolved matter is formally escalated without exposing learner data."
          },
          { suffix: "term-reconcile", canonicalId: "c-04-cross-system-reconciliation", title: "Complete the Term 2 data and reporting reconciliation", dependencies: ["2027-t2-w06-report-reconcile", "2027-t2-w08-nesa-check", "2027-t2-w10-entry-cutoff"] }
        ]
      },
      assurance: {
        suffix: "term-assurance",
        title: "Complete the Term 2 assurance and Term 3 handover",
        trigger: "End of Term 2 assurance point",
        dependencies: ["2027-t2-w06-reports", "2027-t2-w07-next-year-plan", "2027-t2-w08-nesa-check", "2027-t2-w10-entry-cutoff", "2027-t2-w10-term-reconcile"],
        doneWhen: "Term 2 has a verified privacy-safe assurance summary, the 30 June control is closed, no exception is ownerless, and current-source Term 3 actions have been handed over."
      }
    },
    {
      term: 3,
      staffStart: "2027-07-19",
      weeks: termThreeWeeks,
      previousClose: "2027-t2-w10-close",
      gateForWeek: week => week <= 8 ? 9 : 10,
      focus: {
        1: [
          { suffix: "progressive", canonicalId: "t3-03-progressive-outcomes", title: "Check progressive outcomes against retained evidence", dependencies: ["2027-t2-w04-competencies", "2027-t2-w06-report-reconcile"] },
          { suffix: "exam-entry", canonicalId: "t3-04-hsc-exam-entry", title: "Verify the live HSC VET examination-entry state", dependencies: ["2027-g07-codes", "2027-t2-w10-term-assurance"], independentVerificationRequired: true }
        ],
        2: [
          { suffix: "evidence", canonicalId: "c-03-evidence-feedback-assurance", title: "Sample current evidence and feedback before outcome work", dependencies: ["2027-g08-assessment", "2027-t3-w01-progressive"] },
          { suffix: "reconcile", canonicalId: "c-04-cross-system-reconciliation", title: "Reconcile progressive outcomes, exam entries and evidence", dependencies: ["2027-t3-w01-progressive", "2027-t3-w01-exam-entry", "2027-t3-w02-evidence"] }
        ],
        3: [
          { suffix: "promotion", canonicalId: "t3-08-next-year-promotion", title: "Approve 2028 promotion only after delivery authority checks", dependencies: ["2027-t2-w07-next-year-plan"], sourceIds: ["VET-SCHOOLS-HUB", "RTO-DOCUMENT-LIBRARY", "WWHS-VET-SHARED"], applicability: { cohorts: ["proposed 2028 cohorts"], conditions: "Only proposed 2028 delivery with verified school-specific authority and readiness" } },
          { suffix: "trainer-currency", canonicalId: "c-05-industry-currency", title: "Review trainer readiness for current and proposed delivery", dependencies: ["2027-g05-trainers"] }
        ],
        4: [
          { suffix: "placement-ready", canonicalId: "c-07-workplace-learning-control", title: "Confirm the current workplace-learning block and preparation controls", dependencies: ["2027-w03-placement-plan"] },
          { suffix: "completion-risk", canonicalId: "t3-09-hsc-schedule-and-delivery-check", title: "Identify HSC delivery and completion risks early enough to act", dependencies: ["2027-g08-assessment", "2027-t3-w01-progressive"] }
        ],
        5: [
          { suffix: "work-placement", canonicalId: "t3-01-year11-work-placement", title: "Verify the current Year 11 workplace-learning occurrence and controls", dependencies: ["2027-t3-w04-placement-ready"], applicability: { cohorts: ["learners with a verified 2027 workplace-learning occurrence"], conditions: "Only when the actual WWHS/provider dates, course requirement and learner readiness are confirmed in authorised systems" }, liveCheck: "Confirm the actual 2027 WWHS placement dates, provider arrangement, course-specific hours and current Department procedure. This Week 5 scaffold is a verification gate, not authority for the placement date." }
        ],
        6: [
          { suffix: "meeting-follow-up", canonicalId: "t3-02-meeting-follow-up", title: "Convert current coordinator updates into owned action", dependencies: ["2027-t3-w01-open"], applicability: { cohorts: ["current VET team"], conditions: "Whenever a current 2027 RTO, NESA, WWHS or coordinator instruction creates action" } },
          { suffix: "team-meeting", canonicalId: "c-02-team-meetings", title: "Run the Term 3 team meeting and verify hand-backs", dependencies: ["2027-t3-w06-meeting-follow-up"] }
        ],
        7: [
          { suffix: "hsc-estimates", canonicalId: "t3-05-hsc-estimates", title: "Prepare and submit current HSC VET examination estimates", trigger: "The live 2027 NESA Timetable of Actions opens the applicable estimate action", dependencies: ["2027-t3-w01-exam-entry", "2027-t3-w02-reconcile"], independentVerificationRequired: true, sourceIds: ["NESA-TOA", "NESA-VET-ASSESSMENT", "RTO-DOCUMENT-LIBRARY"], applicability: { cohorts: ["applicable 2027 HSC VET examination entrants"], conditions: "Only where the live NESA action and authorised entrant state require an estimate" } },
          { suffix: "evidence-recheck", canonicalId: "c-03-evidence-feedback-assurance", title: "Recheck the evidence trail before HSC estimate and outcome closure", dependencies: ["2027-t3-w02-evidence"] }
        ],
        8: [
          { suffix: "nesa-check", canonicalId: "t3-06-nesa-check-three", title: "Complete the current third NESA/RTO data control", dependencies: ["2027-t3-w01-progressive", "2027-t3-w07-hsc-estimates", "2027-t3-w02-reconcile"], independentVerificationRequired: true },
          { suffix: "reconcile", canonicalId: "c-04-cross-system-reconciliation", title: "Reconcile the third data-control result across owner systems", dependencies: ["2027-t3-w08-nesa-check"] }
        ],
        9: [
          { suffix: "exit-survey", canonicalId: "t3-07-exit-survey", title: "Run the current applicable RTO exit-survey process", dependencies: ["2027-w01-onboarding"] },
          { suffix: "hsc-delivery", canonicalId: "t3-09-hsc-schedule-and-delivery-check", title: "Close HSC assessment-schedule and delivery exceptions", dependencies: ["2027-t3-w04-completion-risk", "2027-t3-w08-reconcile"] }
        ],
        10: [
          { suffix: "term-reconcile", canonicalId: "c-04-cross-system-reconciliation", title: "Complete the Term 3 outcomes and completion reconciliation", dependencies: ["2027-t3-w05-work-placement", "2027-t3-w08-reconcile", "2027-t3-w09-hsc-delivery"] },
          { suffix: "improvement", canonicalId: "c-09-validation-improvement", title: "Own validation, audit and improvement actions before Term 4", dependencies: ["2027-g08-assessment", "2027-t3-w10-term-reconcile"], independentVerificationRequired: true }
        ]
      },
      assurance: {
        suffix: "term-assurance",
        title: "Complete the Term 3 assurance and Term 4 handover",
        trigger: "End of Term 3 assurance point",
        dependencies: ["2027-t3-w05-work-placement", "2027-t3-w07-hsc-estimates", "2027-t3-w08-nesa-check", "2027-t3-w09-hsc-delivery", "2027-t3-w10-term-reconcile", "2027-t3-w10-improvement"],
        doneWhen: "Term 3 has a verified privacy-safe assurance summary, HSC and completion exceptions are owned, and the final-outcome work has been accepted by the Term 4 roles."
      }
    },
    {
      term: 4,
      staffStart: "2027-10-11",
      weeks: termFourWeeks,
      previousClose: "2027-t3-w10-close",
      gateForWeek: week => week <= 8 ? 11 : 12,
      focus: {
        1: [
          { suffix: "year11-outcomes", canonicalId: "t4-01-year11-final-outcomes", title: "Finalise Year 11 outcomes and placement hours against current dates", dependencies: ["2027-t3-w05-work-placement", "2027-t3-w10-term-reconcile", "2027-t3-w02-evidence"] }
        ],
        2: [
          { suffix: "year11-reports", canonicalId: "t4-02-year11-reports", title: "Complete the current Year 11 markbook and report reconciliation", dependencies: ["2027-t4-w01-year11-outcomes"], applicability: { cohorts: ["current Year 11 VET learners"], conditions: "Complete to the verified 2027 WWHS reporting calendar and supported assessor evidence" } },
          { suffix: "evidence", canonicalId: "c-03-evidence-feedback-assurance", title: "Verify evidence and feedback supporting final report states", dependencies: ["2027-t3-w02-evidence"] }
        ],
        3: [
          { suffix: "final-data", canonicalId: "t4-03-year12-year10-final-data", title: "Finalise current Year 12 and Year 10 VET data", dependencies: ["2027-t3-w10-term-reconcile", "2027-t4-w02-evidence"], independentVerificationRequired: true, guidance: { why: "Final data must match supported assessor evidence and the current NESA/RTO action state.", commonTrap: "Using a prior-year calendar date or forcing system agreement where evidence does not support the outcome." } },
          { suffix: "reconcile", canonicalId: "c-04-cross-system-reconciliation", title: "Reconcile final data across authorised owner systems", dependencies: ["2027-t4-w03-final-data"] }
        ],
        4: [
          { suffix: "year9-entries", canonicalId: "t4-04-year9-short-course-entries", title: "Complete applicable Year 9 short-course entries", dependencies: ["2027-w06-short-course"] },
          { suffix: "sbat-monitor", canonicalId: "c-06-sbat-monitoring", title: "Close current-year SBAT monitoring exceptions", dependencies: ["2027-t2-w08-sbat-monitor"] }
        ],
        5: [
          { suffix: "year12-markbook", canonicalId: "t4-05-year12-markbook-closure", title: "Close Year 12 markbook and Evidence Central states", dependencies: ["2027-t4-w03-final-data", "2027-t4-w03-reconcile"], applicability: { cohorts: ["current Year 12 VET learners"], conditions: "Close only after the current owner-system outcomes, retained evidence and RTO/NESA requirements agree" } },
          { suffix: "privacy", canonicalId: "c-08-records-privacy-control", title: "Check final-record access and privacy before closure", dependencies: ["2027-g03-roles"] }
        ],
        6: [
          { suffix: "next-year-hub", canonicalId: "t4-06-next-year-vet-hub", title: "Finalise the verified 2028 VET Schools Hub setup", dependencies: ["2027-t3-w03-promotion"], applicability: { cohorts: ["proposed 2028 VET delivery"], conditions: "Every proposed 2028 course, trainer and delivery site that requires current school-specific authority" }, actionSteps: ["Open the current VET Schools Hub and 2028 delivery instructions through the authorised work account.", "Confirm the School Profile, delivery intention, qualification, site and course state for every proposed 2028 delivery.", "Confirm every trainer/assessor has the current qualification, currency, evidence and approval state required for the proposed delivery.", "Resolve or formally own every Hub To Do, approval, access and readiness exception.", "Have a different authorised person verify the aggregate 2028 Hub state and record only the privacy-safe reference here."], doneWhen: "The current VET Schools Hub supports the proposed 2028 delivery and every remaining readiness exception has an authorised owner, chase and escalation point." },
          { suffix: "trainer-ready", canonicalId: "c-05-industry-currency", title: "Confirm trainer-readiness actions for the 2028 plan", dependencies: ["2027-g05-trainers", "2027-t3-w03-trainer-currency"] }
        ],
        7: [
          { suffix: "fund-acquittal", canonicalId: "t4-09-support-fund-acquittal", title: "Close and acquit current VET Support Funds", dependencies: ["2027-w04-funds"] },
          { suffix: "team-meeting", canonicalId: "c-02-team-meetings", title: "Run the final VET team action meeting", dependencies: ["2027-t3-w06-team-meeting"] }
        ],
        8: [
          { suffix: "markbook-rollover", canonicalId: "t4-07-markbook-rollover", title: "Archive and roll over VET markbooks safely", dependencies: ["2027-t4-w01-year11-outcomes", "2027-t4-w05-year12-markbook"] },
          { suffix: "reconcile", canonicalId: "c-04-cross-system-reconciliation", title: "Complete the pre-assurance annual reconciliation", dependencies: ["2027-t4-w04-year9-entries", "2027-t4-w05-year12-markbook", "2027-t4-w08-markbook-rollover"] }
        ],
        9: [
          { suffix: "records-privacy", canonicalId: "c-08-records-privacy-control", title: "Test annual records, privacy, retention and access controls", dependencies: ["2027-t4-w05-privacy", "2027-t4-w08-markbook-rollover"] },
          { suffix: "validation", canonicalId: "c-09-validation-improvement", title: "Close or own validation and improvement findings", dependencies: ["2027-g08-assessment", "2027-t3-w10-improvement"], independentVerificationRequired: true }
        ],
        10: [
          { suffix: "year-assurance", canonicalId: "t4-08-year-end-assurance", title: "Complete the current year-end assurance and improvement review", dependencies: ["2027-t4-w03-final-data", "2027-t4-w08-markbook-rollover", "2027-t4-w09-records-privacy", "2027-t4-w09-validation"], independentVerificationRequired: true, sourceIds: ["WWHS-VET-SHARED", "RTO-DOCUMENT-LIBRARY", "ASQA-PRACTICE", "DOE-WPL-PROCEDURE"] }
        ],
        11: []
      },
      assurance: {
        suffix: "year-close",
        title: "Close 2027 and hand verified carry-overs to the 2028 source gate",
        trigger: "Final student day and annual handover",
        dependencies: ["2027-t4-w06-next-year-hub", "2027-t4-w06-trainer-ready", "2027-t4-w07-fund-acquittal", "2027-t4-w10-year-assurance"],
        doneWhen: "The 2027 privacy-safe annual snapshot is preserved, every genuine carry-over has an owner/verifier/chase point, and no 2027 completion has been copied into the clean 2028 source gate."
      }
    }
  ];

  function termOpeningTask(definition, week, updateId, gate, order) {
    return customTask({
      id: `2027-t${definition.term}-w01-open`,
      title: `Open Term ${definition.term} from current sources and accept the handover`,
      term: definition.term,
      week: 1,
      lane: "assurance",
      gate,
      order,
      timing: `Staff opening window ${displayRange({ start: definition.staffStart, end: week.end })}: refresh before term-specific work`,
      trigger: `Term ${definition.term} source refresh and incoming handover`,
      priority: "critical",
      dependencies: [updateId],
      hardDependencies: [updateId],
      roles: principalGateRoles,
      independentVerificationRequired: true,
      windowStart: definition.staffStart,
      windowEnd: week.end,
      actionSteps: [
        "Open the current NESA Timetable of Actions/Schools Online state, authenticated RTO guidance and WWHS/Sentral calendar.",
        "Record each current publication/version, exact applicable action/date and any changed requirement without copying controlled material here.",
        "Reconfirm accountable roles, doers, deputies, access, verifiers and escalation paths for this term.",
        "Review the prior-term assurance, waiting work and exceptions; require the receiving role to accept each hand-off.",
        "Keep unpublished or inaccessible actions visibly waiting with an owner, chase date and escalation point."
      ],
      doneWhen: `Term ${definition.term} has a current source/date register, accepted role hand-offs and no ownerless exception; only verified term actions may proceed.`,
      systems: ["NESA Schools Online", "VET Schools Hub", "RTO Document Library", "Approved school calendar", "Approved team action record"],
      sourceIds: ["NESA-TOA", "VET-SCHOOLS-HUB", "RTO-DOCUMENT-LIBRARY", "WWHS-VET-SHARED"],
      liveCheck: `The public NESA page exposed only 2026 dates at build time. Record the live 2027 source/version or keep the affected Term ${definition.term} action waiting.`,
      guidance: {
        why: "A verified term opening prevents an old date, role or unresolved handover from silently controlling new work.",
        commonTrap: "Treating the previous term close or a familiar calendar entry as current authority."
      }
    });
  }

  function buildLaterTerm(definition) {
    const built = [];
    let previousClose = definition.previousClose;
    definition.weeks.forEach(week => {
      const prefix = `2027-t${definition.term}-w${String(week.number).padStart(2, "0")}`;
      const gate = definition.gateForWeek(week.number);
      const baseOrder = definition.term * 10000 + week.number * 100;
      const updateId = `${prefix}-updates`;
      const updateStart = week.number === 1 ? definition.staffStart : week.start;
      built.push(sourceTask(updateId, "c-01-rto-updates", {
        term: definition.term,
        lane: "weekly",
        gate,
        week: week.number,
        order: baseOrder + 10,
        timing: `Term ${definition.term} Week ${week.number}, ${displayRange(week)}: triage current authenticated RTO/NESA/WWHS changes`,
        dependencies: [previousClose],
        hardDependencies: [previousClose],
        roles: leadershipRoles,
        windowStart: updateStart,
        windowEnd: week.end,
        liveCheck: "Open the current authenticated notice/action streams. Create an owner, verifier, due point, chase and escalation for every change; never inherit a 2026 date."
      }));

      const focusIds = [];
      let entryDependency = updateId;
      if (week.number === 1) {
        const opening = termOpeningTask(definition, week, updateId, gate, baseOrder + 20);
        built.push(opening);
        focusIds.push(opening.id);
        entryDependency = opening.id;
      }

      (definition.focus[week.number] || []).forEach((entry, index) => {
        const id = `${prefix}-${entry.suffix}`;
        const shared = {
          id,
          title: entry.title,
          term: definition.term,
          lane: entry.lane || "core",
          gate,
          week: week.number,
          order: baseOrder + 30 + index,
          timing: entry.timing || `Term ${definition.term} Week ${week.number}, ${displayRange(week)}: ${week.theme}`,
          trigger: entry.trigger,
          dependencies: [entryDependency, ...(entry.dependencies || [])],
          hardDependencies: entry.hardDependencies || [],
          roles: entry.roles || leadershipRoles,
          priority: entry.priority,
          independentVerificationRequired: entry.independentVerificationRequired === true,
          windowStart: entry.windowStart || week.start,
          windowEnd: entry.windowEnd || week.end,
          dueDate: entry.dueDate || null,
          dueAuthority: entry.dueAuthority,
          deadlineState: entry.deadlineState,
          lateMode: entry.lateMode,
          sourceIds: entry.sourceIds,
          systems: entry.systems,
          actionSteps: entry.actionSteps,
          doneWhen: entry.doneWhen,
          applicability: entry.applicability,
          guidance: entry.guidance,
          liveCheck: entry.liveCheck || "Confirm the current 2027 NESA, RTO and WWHS instruction and owner-system state before recording completion."
        };
        const task = entry.custom ? customTask({
          ...shared,
          trigger: entry.trigger || week.theme,
          actionSteps: entry.actionSteps,
          doneWhen: entry.doneWhen,
          guidance: entry.guidance || {
            why: "This is a controlled annual checkpoint with a current-source and independent record trail.",
            commonTrap: "Treating the week scaffold as the authority or copying protected details into this workboard."
          }
        }) : sourceTask(id, entry.canonicalId, shared);
        built.push(task);
        focusIds.push(id);
      });

      if (week.number === definition.weeks.length) {
        const assuranceId = `${prefix}-${definition.assurance.suffix}`;
        built.push(customTask({
          id: assuranceId,
          title: definition.assurance.title,
          term: definition.term,
          lane: "assurance",
          gate,
          week: week.number,
          order: baseOrder + 70,
          timing: `Term ${definition.term} final control point, ${displayRange(week)}: close only after current instructions are checked`,
          trigger: definition.assurance.trigger,
          priority: "critical",
          dependencies: [...new Set([updateId, ...focusIds, ...definition.assurance.dependencies])],
          hardDependencies: [...new Set([updateId, ...focusIds, ...definition.assurance.dependencies])],
          roles: principalGateRoles,
          independentVerificationRequired: true,
          windowStart: week.start,
          windowEnd: week.end,
          actionSteps: [
            "Review the source register and record every instruction/date that changed during the term.",
            "Confirm required course, evidence, NESA/RTO, workplace-learning and reporting results in their owner systems without copying personal information here.",
            "Review waiting, exception and returned work; assign a role/system owner, chase date and escalation point where closure is not yet possible.",
            "Record a privacy-safe assurance summary and obtain a different authorised person's verification.",
            definition.term === 4 ? "Preserve the annual trail and create clean, separately owned 2028 carry-overs." : `Open the first verified Term ${definition.term + 1} actions and obtain the receiving roles' acceptance.`
          ],
          doneWhen: definition.assurance.doneWhen,
          systems: ["VET Schools Hub", "Evidence Central", "NESA Schools Online", "Approved team action record"],
          sourceIds: ["VET-SCHOOLS-HUB", "RTO-DOCUMENT-LIBRARY", "NESA-TOA", "EVIDENCE-CENTRAL", "WWHS-VET-SHARED"],
          guidance: {
            why: definition.term === 4 ? "A controlled annual close preserves the audit trail and stops old completion states contaminating the next year." : "A deliberate term close makes unresolved work visible before staff and dates change.",
            commonTrap: "Calling the term complete because classes stopped while source, data, evidence or hand-back exceptions remain open."
          }
        }));
        focusIds.push(assuranceId);
      }

      const closeId = `${prefix}-close`;
      built.push(customTask({
        id: closeId,
        title: week.number === definition.weeks.length && definition.term === 4 ? "Verify the final 2027 closure and release the clean 2028 source gate" : `Verify Term ${definition.term} Week ${week.number} closure and open the next control point`,
        term: definition.term,
        lane: "weekly",
        gate,
        week: week.number,
        order: baseOrder + 90,
        timing: `By the end of Term ${definition.term} Week ${week.number}: verify completed, waiting and handed-back work`,
        trigger: `Term ${definition.term} Week ${week.number} control close`,
        dependencies: [updateId, ...focusIds],
        hardDependencies: [updateId, ...focusIds],
        roles: leadershipRoles,
        independentVerificationRequired: true,
        windowStart: week.start,
        windowEnd: week.end,
        actionSteps: [
          "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
          "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
          "Confirm hand-offs were accepted by the next responsible role.",
          "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
          `Record the Term ${definition.term} Week ${week.number} closure reference and brief the next control point.`
        ],
        doneWhen: `Term ${definition.term} Week ${week.number} is independently verified, no action is ownerless, and ${week.number === definition.weeks.length ? (definition.term === 4 ? "the 2027 annual trail is preserved for a clean 2028 source gate" : `Term ${definition.term + 1} can open safely`) : `Week ${week.number + 1} can open safely`}.`,
        systems: ["Approved team action record", "VET Schools Hub"],
        sourceIds: ["VET-SCHOOLS-HUB", "RTO-DOCUMENT-LIBRARY", "WWHS-VET-SHARED"],
        guidance: {
          why: "A short weekly close gives the Coordinator and Assistant a shared hand-back rhythm and keeps delayed work visible.",
          commonTrap: "Moving on while unresolved actions exist only in email, memory or somebody else's browser."
        }
      }));
      previousClose = closeId;
    });
    return built;
  }

  const laterTermTasks = laterTermDefinitions.flatMap(buildLaterTerm);

  const gates = [
    { number: 1, term: 1, label: "Sources & roles" },
    { number: 2, term: 1, label: "Delivery ready" },
    { number: 3, term: 1, label: "Learners ready" },
    { number: 4, term: 1, label: "First assurance" },
    { number: 5, term: 1, label: "Delivery assurance" },
    { number: 6, term: 1, label: "Term 1 close" },
    { number: 7, term: 2, label: "Mid-year data & reports" },
    { number: 8, term: 2, label: "30 June & Term 2 close" },
    { number: 9, term: 3, label: "HSC & progressive outcomes" },
    { number: 10, term: 3, label: "Term 3 close" },
    { number: 11, term: 4, label: "Final outcomes & records" },
    { number: 12, term: 4, label: "Annual assurance & handover" }
  ];

  const terms = [
    { number: 1, label: "Term 1", staffStart: "2027-01-28", studentStart: "2027-02-03", end: "2027-04-09", weeks },
    { number: 2, label: "Term 2", staffStart: "2027-04-27", studentStart: "2027-04-29", end: "2027-07-02", weeks: termTwoWeeks },
    { number: 3, label: "Term 3", staffStart: "2027-07-19", studentStart: "2027-07-20", end: "2027-09-24", weeks: termThreeWeeks },
    { number: 4, label: "Term 4", staffStart: "2027-10-11", studentStart: "2027-10-12", end: "2027-12-20", weeks: termFourWeeks }
  ];

  const operatingCycle2027 = {
    id: "wwhs-vet-2027-full-year-cycle",
    title: "Run 2027 · full-year operating cycle",
    operatingYear: 2027,
    state: "2027 OPERATING CYCLE — CURRENT NESA/RTO/WWHS SOURCES AND SHARED TEAM STATE REQUIRE ACTIVATION",
    calendar: {
      basis: "NSW Department of Education 2027 Eastern division dates; WWHS is not listed as a late-start Western division school. Confirm against the WWHS staff calendar before activation.",
      sourceUrl: "https://education.nsw.gov.au/schooling/calendars/2027",
      lateStartListUrl: "https://education.nsw.gov.au/schooling/calendars/late-start-schools",
      staffSetupStart: "2027-01-28",
      studentStart: "2027-02-03",
      termEnd: "2027-12-20",
      terms: terms.map(term => ({ number: term.number, staffStart: term.staffStart, studentStart: term.studentStart, end: term.end })),
      status: "published-full-year-term-windows-school-calendar-to-confirm"
    },
    sequenceRule: "Only tasks whose prerequisites are verified or authorised as not applicable may appear as the next action. Urgent workflows may interrupt this sequence.",
    sourceFamilies: {
      "NESA-TOA": {
        title: "Current NESA Timetable of Actions",
        note: "The 2027 edition must be verified when published. The live NESA page controls; no 2026 date is inherited.",
        url: "https://www.nsw.gov.au/education-and-training/nesa/key-dates/timetable-of-actions"
      },
      "RTO-DOCUMENT-LIBRARY": {
        title: "Current RTO 90333 controlled guidance",
        note: "Open the authenticated RTO Document Library and record the current 2027 guide/version or a waiting owner and chase date.",
        url: workboard.staffLinks?.["document-library"] || ""
      },
      "VET-SCHOOLS-HUB": {
        title: "Current VET Schools Hub actions and notices",
        note: "Use the authenticated Hub state for current approvals, To Do items, notices and school delivery status.",
        url: workboard.staffLinks?.["vet-schools-hub"] || ""
      },
      "WWHS-VET-SHARED": {
        title: "Current WWHS VET calendar and approved local controls",
        note: "Confirm the 2027 WWHS/Sentral calendar and current approved local locations before activation.",
        url: workboard.staffLinks?.["wwhs-drive"] || ""
      }
    },
    sharedState: {
      status: "not-connected",
      message: "This prototype saves only on this device. Connect a school-approved authenticated task register before operational team use."
    },
    terms,
    weeks,
    gates,
    tasks: [...setupTasks, ...weekTasks, ...laterTermTasks],
    eventTemplates,
    interruptWorkflows: ["safety-incident", "placement", "confirm-delivery", "onboard-learners", "corrective-action", "handover"],
    sourceWarnings: [
      "At 30 August 2026 the public NESA page still exposed only the 2026 Timetable of Actions; each affected 2027 action remains source-gated.",
      "Current 2027 RTO coordinator term guides and the WWHS staff calendar must be verified before activation.",
      "The Principal or authorised delegate must confirm the local Head Teacher VET, Coordinator, Assistant, deputy and verifier split.",
      "No 2026 VET deadline has been copied into 2027.",
      "The 30 June Stage 6 VET entry cut-off comes from current NESA ACE Rule 14.2; all cohort details and corrections stay in Schools Online.",
      "Official evidence and personal information remain in authorised owner systems."
    ]
  };
  workboard.operatingCycle2027 = operatingCycle2027;
  workboard.termOne2027 = operatingCycle2027;
})();
