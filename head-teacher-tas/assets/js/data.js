(function () {
  "use strict";

  const workDriveSearch = query => `https://drive.google.com/drive/search?q=${encodeURIComponent(query)}`;

  const systems = [
    {
      id: "staff-calendar",
      label: "Sentral staff calendar",
      group: "School operations",
      kind: "staff",
      status: "front-door",
      url: "https://waggawagga-h.sentral.com.au/dashboard/",
      purpose: "Live school dates, reporting milestones, meetings and events.",
      note: "Sign in through Sentral, then open the current Staff School Calendar. The former direct calendar route did not reliably preserve the intended calendar when signed out."
    },
    {
      id: "sentral",
      label: "Sentral",
      group: "School operations",
      kind: "staff",
      status: "verified",
      url: "https://waggawagga-h.sentral.com.au/dashboard/",
      purpose: "Timetable, attendance, wellbeing, markbooks, reports and approved school workflows.",
      note: "Protected student and staff information stays in Sentral."
    },
    {
      id: "school-website",
      label: "WWHS public website",
      group: "School operations",
      kind: "public",
      status: "verified",
      url: "https://waggawagga-h.schools.nsw.gov.au/",
      purpose: "Current public school information, events, subject-selection pages and published faculty content.",
      note: "Use the approved school publishing process for changes; this is the public front door, not the editing system."
    },
    {
      id: "nesa-actions",
      label: "NESA Timetable of Actions",
      group: "Curriculum and assurance",
      kind: "public",
      status: "verified",
      url: "https://www.nsw.gov.au/education-and-training/nesa/key-dates/timetable-of-actions",
      purpose: "Current NESA dates and actions.",
      note: "Use the live page, not the static 2024 copies in the TAS Drive."
    },
    {
      id: "nesa-curriculum",
      label: "NSW Curriculum",
      group: "Curriculum and assurance",
      kind: "public",
      status: "verified",
      url: "https://curriculum.nsw.edu.au/",
      purpose: "Current syllabuses and curriculum change information.",
      note: "Check the live course page before changing a program or assessment schedule."
    },
    {
      id: "scout",
      label: "SCOUT",
      group: "Curriculum and assurance",
      kind: "staff",
      status: "front-door",
      url: "https://education.nsw.gov.au/about-us/education-data-and-research/scout.html",
      purpose: "Department data and HSC analysis entry point.",
      note: "Use only with authorised access; do not copy student-level data into this workboard."
    },
    {
      id: "mypl",
      label: "MyPL",
      group: "People and capability",
      kind: "staff",
      status: "front-door",
      url: "https://myplsso.education.nsw.gov.au/pages/custom-pages_home?menu=home",
      purpose: "Mandatory training and professional-learning status.",
      note: "Credential and completion details remain in MyPL."
    },
    {
      id: "google-classroom",
      label: "Google Classroom",
      group: "Teaching systems",
      kind: "staff",
      status: "front-door",
      url: "https://classroom.google.com/",
      purpose: "Approved class resources and learning delivery.",
      note: "Select the education.nsw.gov.au account when Google asks; no device-specific account slot is assumed."
    },
    {
      id: "mandatory-reporting",
      label: "Mandatory Reporter Guide",
      group: "Urgent and protected",
      kind: "protected",
      status: "front-door",
      url: "https://reporter.childstory.nsw.gov.au/s/mrg",
      purpose: "Current decision support for a child-protection concern.",
      note: "Never record case details in this workboard. Follow the current Department escalation route."
    },
    {
      id: "incident-reporting",
      label: "Department incident reporting",
      group: "Urgent and protected",
      kind: "protected",
      status: "front-door",
      url: "https://doe-shield.my.site.com/dirf/s/",
      purpose: "Official accident and incident reporting front door.",
      note: "Respond to immediate danger first, then use the current school and Department process."
    },
    {
      id: "vet-workboard",
      label: "VET Compliance Workboard",
      group: "Companion workboard",
      kind: "public",
      status: "verified",
      url: "https://stevencowell.github.io/WWHS-VET-Compliance-Workboard/",
      purpose: "VET delivery, evidence, placement, credentialling and RTO workflows.",
      note: "VET-specific work is deliberately handed off here rather than duplicated."
    },
    {
      id: "head-teacher-guide",
      label: "Head Teacher TAS Reference Guide",
      group: "Work-account sources",
      kind: "local",
      status: "front-door",
      url: workDriveSearch('"Head Teacher Information For TAS Faculty Wagga Wagga High School"'),
      purpose: "The historical A–D index, local context and storage locations.",
      note: "Work-account search front door. The direct document ID is withheld from the public site until its sharing and confidential-content boundaries are corrected."
    },
    {
      id: "tas-drive",
      label: "WWHS TAS Drive",
      group: "Work-account sources",
      kind: "local",
      status: "front-door",
      url: workDriveSearch('type:folder "HEAD TEACHER TAS"'),
      purpose: "Current faculty plans, programs, schedules, meeting records and evidence pointers.",
      note: "Work-account folder search. The broad folder ID is not embedded while its sharing boundary is under review."
    },
    {
      id: "faculty-plan",
      label: "Current Faculty Management Plan",
      group: "Work-account sources",
      kind: "local",
      status: "front-door",
      url: workDriveSearch('type:folder "A2. Faculty Management Plan"'),
      purpose: "Current 2025–27 faculty plan and school-plan alignment.",
      note: "Work-account search for the current A2 plan material. Confirm the current approved version after opening it."
    },
    {
      id: "assessment-schedules",
      label: "Current TAS assessment schedules",
      group: "Work-account sources",
      kind: "local",
      status: "front-door",
      url: workDriveSearch('type:folder "Assessment Schedules - 2026"'),
      purpose: "Approved schedules, task templates and amendment trail.",
      note: "Work-account search for the 2026 assessment-schedules folder. Confirm full-faculty completeness before relying on it."
    },
    {
      id: "program-register",
      label: "Programs and registration hub",
      group: "Work-account sources",
      kind: "local",
      status: "front-door",
      url: workDriveSearch('type:folder "B3. Programs and Registration"'),
      purpose: "Current program versions, registration and monitoring locations.",
      note: "Work-account search for the B3 hub. Confirm the canonical current register before relying on legacy Program Builder material."
    },
    {
      id: "finance-system",
      label: "School finance and procurement",
      group: "Work-account sources",
      kind: "local",
      status: "front-door",
      url: "https://selfservice.det.nsw.edu.au/irj/portal",
      purpose: "Budget, purchase approval, orders, claims and acquittals.",
      note: "Department SAP front door from the current reference guide. Sign in through the staff account; keep amounts and supplier details in the owner system."
    },
    {
      id: "whs-system",
      label: "WWHS work health and safety",
      group: "Work-account sources",
      kind: "local",
      status: "front-door",
      url: workDriveSearch('type:folder "HEAD TEACHER TAS"'),
      purpose: "Current school WHS inspections, risk records and annual control folders.",
      note: "Open the signed-in HEAD TEACHER TAS folder, then choose Work Health and Safety. Protected incident and injury details stay in the authorised owner system."
    },
    {
      id: "workshop-maintenance",
      label: "Workshop maintenance",
      group: "Work-account sources",
      kind: "local",
      status: "front-door",
      url: workDriveSearch('type:folder "C12. Workshop maintenance"'),
      purpose: "Current practical-area maintenance schedules, faults and approved facilities route.",
      note: "Work-account search for the C12 workshop-maintenance material. Use the live facilities route linked there where required."
    },
    {
      id: "chemical-register",
      label: "Chemical register and SDS",
      group: "Work-account sources",
      kind: "local",
      status: "front-door",
      url: workDriveSearch('type:folder "C11. Chemical Register"'),
      purpose: "Current chemical-register proformas, SDS access and approved chemical-safety guidance.",
      note: "Work-account search for the C11 chemical-register material, including the current proforma and SDS locations."
    },
    {
      id: "onguard",
      label: "OnGuard",
      group: "Work-account sources",
      kind: "local",
      status: "front-door",
      url: "https://onguardv3.com.au/",
      purpose: "Approved equipment-safety learning and completion status.",
      note: "Current vendor login front door. Confirm the WWHS subscription and required module mapping after sign-in."
    }
  ];

  const tasks = [
    {
      id: "t1-year-opening-readiness",
      title: "Open the year with classes, programs and practical rooms ready",
      summary: "Reconcile the live timetable, current programs, staff access and practical-area controls before normal delivery gathers pace.",
      area: "calendar", phase: "term_1", historyOnly: true, priority: "critical", dueDate: "2026-02-02", timing: "Students first day · 2 February 2026",
      owner: "Head Teacher TAS with class teachers", verifier: "Executive / timetable and WHS delegates as applicable", systemIds: ["sentral", "staff-calendar", "program-register", "whs-system"],
      source: "2026 Staff School Calendar + Guide B1/B3/B9–B12/B18/B20/B30", sourceState: "calendar-current",
      steps: [
        "Confirm current classes, teachers, rooms and timetable state in Sentral.",
        "Confirm each class has an owned current program, approved learning space and assessment pathway.",
        "Check practical rooms, plant restrictions, PPE/footwear, equipment-safety learning and essential staff access.",
        "Confirm staff can use the protected route for learner support and health information without copying it.",
        "Own every exception with a role, due date and authorised evidence location."
      ],
      doneWhen: "Every TAS class and practical room is ready for the approved work, or a safe, time-bound exception is owned in the correct system.",
      why: "The first student day turns annual setup into a live delivery and safety obligation.",
      trap: "Using an old class list, room assumption or program copy as proof of readiness.",
      privacy: "Use aggregate readiness only; no learner, health, timetable or staff-access details belong here."
    },
    {
      id: "t1-student-review-cycle",
      title: "Reconcile the Term 1 review, wellbeing and assembly cycle",
      summary: "Check the live roster before each event and complete only the contribution assigned to TAS or the Head Teacher.",
      area: "calendar", phase: "term_1", historyOnly: true, priority: "routine", dueDate: "2026-02-18", timing: "18 February to 1 April 2026 · applicability must be checked",
      applicability: "Only where the current roster or executive role matrix assigns TAS or the Head Teacher a contribution.",
      milestones: [
        { date: "2026-02-18", label: "Year 8/11 review" },
        { date: "2026-02-25", label: "Year 7/10 review" },
        { date: "2026-03-04", label: "AMP" },
        { date: "2026-03-11", label: "Wellbeing" },
        { date: "2026-03-18", label: "Year 9/12 review" },
        { date: "2026-03-25", label: "Year 8/11 review" },
        { date: "2026-04-01", label: "Year 7/10 review and Excellence Assembly" }
      ],
      owner: "Head Teacher TAS where assigned", verifier: "Executive / year, wellbeing or assembly lead", systemIds: ["staff-calendar", "sentral", "tas-drive"],
      source: "2026 Staff School Calendar + Guide A7–A9", sourceState: "calendar-current",
      steps: [
        "Check each live event and current roster rather than assuming the historical pattern.",
        "Confirm the TAS role, required information and protected owner system.",
        "Complete only the assigned contribution and keep learner or roster details protected.",
        "Give any follow-up a clear owner in the authorised system."
      ],
      doneWhen: "Each applicable Term 1 contribution is complete and protected follow-up is owned; non-applicable events have been checked rather than assumed.",
      why: "The guide gives context, but the live calendar and roster establish the actual duty.",
      trap: "Treating every school review event as an automatic TAS action.",
      privacy: "No learner, wellbeing, attendance or roster details belong here."
    },
    {
      id: "t1-vet-white-card-handoff",
      title: "Check and hand off the Term 1 White Card overlap",
      summary: "Confirm whether the 10–11 March White Card activity affects TAS, then route all VET delivery and compliance work to the VET workboard.",
      area: "calendar", phase: "term_1", historyOnly: true, priority: "routine", dueDate: "2026-03-10", timing: "10–11 March 2026 · VET overlap",
      applicability: "Only where TAS rooms, staffing, students or timetable are affected.",
      milestones: [
        { date: "2026-03-10", label: "White Card activity begins" },
        { date: "2026-03-11", label: "White Card activity closes" }
      ],
      owner: "Head Teacher TAS for school impact; VET Coordinator for VET compliance", verifier: "Relevant executive / VET authority", systemIds: ["staff-calendar", "vet-workboard"],
      source: "2026 Staff School Calendar; VET compliance handed to the VET Workboard", sourceState: "mapped",
      steps: [
        "Confirm the live activity, TAS impact and accountable roles.",
        "Resolve any room, staffing or timetable impact through school systems.",
        "Open the VET Compliance Workboard for delivery authority, attendance, evidence and credentialling controls.",
        "Record only a privacy-safe TAS hand-off or not-applicable decision here."
      ],
      doneWhen: "Any TAS operational impact is controlled and the VET component has an authorised owner in the VET workflow.",
      why: "Awareness prevents clashes without duplicating controlled VET procedures.",
      trap: "Running VET compliance from a generic TAS checklist.",
      privacy: "No learner, attendance, assessment or credential data belongs here."
    },
    {
      id: "t1-parent-teacher-evening",
      title: "Prepare TAS staff for the Term 1 parent–teacher evening",
      summary: "Confirm bookings, coverage, current evidence access and safe follow-up for the 18 March evening.",
      area: "calendar", phase: "term_1", historyOnly: true, priority: "high", dueDate: "2026-03-18", timing: "18 March 2026 · 4 pm",
      owner: "Head Teacher TAS", verifier: "Executive / event lead", systemIds: ["staff-calendar", "sentral"],
      source: "2026 Staff School Calendar + Guide C7", sourceState: "calendar-current",
      steps: [
        "Confirm the live event, interview module and faculty attendance expectations.",
        "Check staff access to current assessment, progress and support information in authorised systems.",
        "Plan coverage and an escalation route for complex or sensitive conversations.",
        "After the event, ensure required follow-up is owned in the correct protected system."
      ],
      doneWhen: "Faculty staff are prepared, attendance is covered and required follow-up has an owner in the authorised system.",
      why: "A short preparation check prevents confusion and unsafe parallel note-taking.",
      trap: "Copying family or learner conversation details into a faculty checklist.",
      privacy: "All family, learner and wellbeing details remain in Sentral or the approved protected record."
    },
    {
      id: "t1-nesa-disability-provisions",
      title: "Check TAS applicability for the NESA disability-provisions deadline",
      summary: "Confirm whether TAS has an action for 2 April and who holds the authorised submission role.",
      area: "calendar", phase: "term_1", historyOnly: true, priority: "high", dueDate: "2026-04-02", timing: "2 April 2026 · applicability and owner must be checked live",
      applicability: "Only if a current NESA action and school role allocation require a TAS contribution.",
      owner: "Authorised school/NESA role; Head Teacher TAS contributes where assigned", verifier: "Principal or authorised delegate", systemIds: ["nesa-actions", "sentral"],
      source: "2026 Staff School Calendar + live NESA Timetable of Actions", sourceState: "verify-live",
      steps: [
        "Open the current NESA Timetable of Actions and confirm the exact action and scope.",
        "Confirm whether TAS must provide anything and who is authorised to submit or verify it.",
        "Complete any contribution only through the protected owner system.",
        "Record a safe completion reference or verified not-applicable decision."
      ],
      doneWhen: "The live action has been checked and the TAS contribution is verified complete or formally not applicable.",
      why: "A calendar entry establishes a date, not automatic Head Teacher ownership.",
      trap: "Assuming the Head Teacher is the submitter or copying learner support information here.",
      privacy: "All disability-provision and learner information stays in protected systems."
    },
    {
      id: "t2-year12-report-chain",
      title: "Run the Term 2 Year 12 report checking chain",
      summary: "Move the Year 12 report process through Head Teacher check, office hand-off and issue.",
      area: "teaching", phase: "term_2", historyOnly: true, priority: "high", dueDate: "2026-04-29", timing: "HT 29 Apr · office 6 May · issue 15 May",
      milestones: [
        { date: "2026-04-29", label: "Year 12 reports due to Head Teacher" },
        { date: "2026-05-06", label: "Year 12 reports due to office" },
        { date: "2026-05-15", label: "Year 12 reports issued" }
      ],
      owner: "Head Teacher TAS", verifier: "School reporting coordinator", systemIds: ["sentral", "staff-calendar"],
      source: "2026 Staff School Calendar + Guide B14–B15", sourceState: "calendar-current",
      steps: ["Confirm classes and reporting owners.", "Check evidence, results and comments in the approved process.", "Return and recheck corrections.", "Confirm office hand-off and issue in the owner system."],
      doneWhen: "Every applicable Year 12 report has completed all three authorised milestones.",
      why: "Each hand-off is separate evidence; completing the Head Teacher check does not close the chain.",
      trap: "Closing the task after the first deadline.",
      privacy: "No report, result, comment or learner detail belongs here."
    },
    {
      id: "t2-student-review-cycle",
      title: "Reconcile the Term 2 review, wellbeing and assembly cycle",
      summary: "Check each live event and complete only the TAS or Head Teacher contribution shown in the current roster.",
      area: "calendar", phase: "term_2", historyOnly: true, priority: "routine", dueDate: "2026-05-06", timing: "6 May to 1 July 2026 · applicability must be checked",
      applicability: "Only where the current roster or executive role matrix assigns TAS or the Head Teacher a contribution.",
      milestones: [
        { date: "2026-05-06", label: "Year 9/12 review" },
        { date: "2026-05-13", label: "Year 8/11 review" },
        { date: "2026-05-20", label: "Year 7/10 review" },
        { date: "2026-05-27", label: "AMP" },
        { date: "2026-06-03", label: "Wellbeing" },
        { date: "2026-06-10", label: "Year 9/12 review" },
        { date: "2026-06-17", label: "Year 8/11 review" },
        { date: "2026-06-24", label: "Year 7/10 review and Excellence Assembly" },
        { date: "2026-07-01", label: "AMP" }
      ],
      owner: "Head Teacher TAS where assigned", verifier: "Executive / year, wellbeing or assembly lead", systemIds: ["staff-calendar", "sentral", "tas-drive"],
      source: "2026 Staff School Calendar + Guide A7–A9", sourceState: "calendar-current",
      steps: ["Check each live event and current roster.", "Confirm the TAS role and protected information route.", "Complete only the assigned contribution.", "Own follow-up in the authorised system."],
      doneWhen: "Each applicable Term 2 contribution is complete and protected follow-up is owned.",
      why: "The live calendar and roster, not the historical pattern, establish the duty.",
      trap: "Treating awareness of an event as proof that TAS owns an action.",
      privacy: "No learner, wellbeing, attendance or roster details belong here."
    },
    {
      id: "t2-vet-placement-handoff",
      title: "Check and hand off the Term 2 Year 12 work-placement overlap",
      summary: "Control any TAS timetable or staffing impact, then use the VET workboard for the 18–29 May placement process.",
      area: "calendar", phase: "term_2", historyOnly: true, priority: "routine", dueDate: "2026-05-18", timing: "18–29 May 2026 · VET overlap",
      applicability: "Only where TAS classes, staffing, rooms or school operations are affected.",
      milestones: [
        { date: "2026-05-18", label: "Year 12 work-placement block begins" },
        { date: "2026-05-29", label: "Year 12 work-placement block closes" }
      ],
      owner: "Head Teacher TAS for school impact; VET/work-placement roles for compliance", verifier: "Relevant executive / VET authority", systemIds: ["staff-calendar", "vet-workboard"],
      source: "2026 Staff School Calendar; placement compliance handed to the VET Workboard", sourceState: "mapped",
      steps: ["Confirm the live placement window and TAS impact.", "Resolve timetable, room or staffing effects through school systems.", "Open the VET workboard for readiness, placement, monitoring and evidence controls.", "Record only a safe TAS hand-off or not-applicable decision."],
      doneWhen: "TAS impacts are controlled and the VET placement workflow has the correct authorised owner.",
      why: "The roles overlap operationally but use different compliance systems.",
      trap: "Duplicating learner placement or employer information in the TAS workboard.",
      privacy: "No learner, employer, placement or assessment details belong here."
    },
    {
      id: "t2-year11-report-chain",
      title: "Run the Term 2 Year 11 report checking chain",
      summary: "Move Year 11 reports through Head Teacher check, office hand-off and issue.",
      area: "teaching", phase: "term_2", historyOnly: true, priority: "high", dueDate: "2026-05-21", timing: "HT 21 May · office 29 May · issue 5 Jun",
      milestones: [
        { date: "2026-05-21", label: "Year 11 reports due to Head Teacher" },
        { date: "2026-05-29", label: "Year 11 reports due to office" },
        { date: "2026-06-05", label: "Year 11 reports issued" }
      ],
      owner: "Head Teacher TAS", verifier: "School reporting coordinator", systemIds: ["sentral", "staff-calendar"],
      source: "2026 Staff School Calendar + Guide B14–B15", sourceState: "calendar-current",
      steps: ["Confirm classes and reporting owners.", "Check evidence, results and comments.", "Return and recheck corrections.", "Confirm office hand-off and issue."],
      doneWhen: "Every applicable Year 11 report has completed all three authorised milestones.",
      why: "A staged chain protects accuracy and leaves recovery time.",
      trap: "Treating a checked draft as an issued report.",
      privacy: "No report, result, comment or learner detail belongs here."
    },
    {
      id: "t2-year8-report-chain",
      title: "Run the Term 2 Year 8 report checking chain",
      summary: "Complete Year 8 checks, office hand-off and the common Years 7–10 issue milestone.",
      area: "teaching", phase: "term_2", historyOnly: true, priority: "routine", dueDate: "2026-05-26", timing: "HT 26 May · office 2 Jun · issue 3 Jul",
      milestones: [
        { date: "2026-05-26", label: "Year 8 reports due to Head Teacher" },
        { date: "2026-06-02", label: "Year 8 reports due to office" },
        { date: "2026-07-03", label: "Years 7–10 reports issued" }
      ],
      owner: "Head Teacher TAS", verifier: "School reporting coordinator", systemIds: ["sentral", "staff-calendar"],
      source: "2026 Staff School Calendar + Guide B14–B15", sourceState: "calendar-current",
      steps: ["Confirm classes and owners.", "Check evidence, grades and comments.", "Return and recheck corrections.", "Confirm office hand-off and issue."],
      doneWhen: "Every applicable Year 8 report has completed its authorised milestones.",
      why: "The common issue date does not remove the earlier year-group checks.",
      trap: "Assuming rotation or class-list information is unchanged.",
      privacy: "No report or learner detail belongs here."
    },
    {
      id: "t2-year9-report-chain",
      title: "Run the Term 2 Year 9 report checking chain",
      summary: "Complete Year 9 checks, office hand-off and the common Years 7–10 issue milestone.",
      area: "teaching", phase: "term_2", historyOnly: true, priority: "routine", dueDate: "2026-05-29", timing: "HT 29 May · office 5 Jun · issue 3 Jul",
      milestones: [
        { date: "2026-05-29", label: "Year 9 reports due to Head Teacher" },
        { date: "2026-06-05", label: "Year 9 reports due to office" },
        { date: "2026-07-03", label: "Years 7–10 reports issued" }
      ],
      owner: "Head Teacher TAS", verifier: "School reporting coordinator", systemIds: ["sentral", "staff-calendar"],
      source: "2026 Staff School Calendar + Guide B14–B15", sourceState: "calendar-current",
      steps: ["Confirm classes and owners.", "Check evidence, grades and comments.", "Return and recheck corrections.", "Confirm office hand-off and issue."],
      doneWhen: "Every applicable Year 9 report has completed its authorised milestones.",
      why: "Each milestone provides a separate checking and hand-off point.",
      trap: "Leaving corrections until the office deadline.",
      privacy: "No report or learner detail belongs here."
    },
    {
      id: "t2-year7-report-chain",
      title: "Run the Term 2 Year 7 report checking chain",
      summary: "Complete the captured Head Teacher and issue milestones, and confirm the office hand-off live because it was not captured in the audit.",
      area: "teaching", phase: "term_2", historyOnly: true, priority: "routine", dueDate: "2026-06-02", timing: "HT 2 Jun · office date check live · issue 3 Jul",
      milestones: [
        { date: "2026-06-02", label: "Year 7 reports due to Head Teacher" },
        { date: "2026-07-03", label: "Years 7–10 reports issued" }
      ],
      owner: "Head Teacher TAS", verifier: "School reporting coordinator", systemIds: ["sentral", "staff-calendar"],
      source: "2026 Staff School Calendar + Guide B14–B15; office date not captured", sourceState: "verify-live",
      steps: ["Confirm classes and owners.", "Check evidence, grades and comments.", "Confirm the Year 7 office hand-off date in the live calendar/reporting process; do not infer it.", "Return and recheck corrections, then confirm office hand-off and issue."],
      doneWhen: "The live office date has been confirmed and every applicable Year 7 report has completed the authorised chain.",
      why: "The audit captured the Head Teacher and issue dates but not a separate office date.",
      trap: "Inventing the missing office date from another year group.",
      privacy: "No report or learner detail belongs here."
    },
    {
      id: "t2-year10-report-chain",
      title: "Run the Term 2 Year 10 report checking chain",
      summary: "Complete Year 10 checks, office hand-off and the common Years 7–10 issue milestone.",
      area: "teaching", phase: "term_2", historyOnly: true, priority: "routine", dueDate: "2026-06-05", timing: "HT 5 Jun · office 12 Jun · issue 3 Jul",
      milestones: [
        { date: "2026-06-05", label: "Year 10 reports due to Head Teacher" },
        { date: "2026-06-12", label: "Year 10 reports due to office" },
        { date: "2026-07-03", label: "Years 7–10 reports issued" }
      ],
      owner: "Head Teacher TAS", verifier: "School reporting coordinator", systemIds: ["sentral", "staff-calendar"],
      source: "2026 Staff School Calendar + Guide B14–B15", sourceState: "calendar-current",
      steps: ["Confirm classes and owners.", "Check evidence, grades and comments.", "Return and recheck corrections.", "Confirm office hand-off and issue."],
      doneWhen: "Every applicable Year 10 report has completed its authorised milestones.",
      why: "The year-group hand-offs must be complete before the common issue date.",
      trap: "Treating the report check as a substitute for any separate NESA action.",
      privacy: "No report, grade or learner detail belongs here."
    },
    {
      id: "t3-info-evening",
      title: "Confirm TAS readiness for the Year 9/8 2027 information evening",
      summary: "Check that current TAS course information, fees and contacts are ready for tonight's school event.",
      area: "calendar", phase: "term_3", priority: "critical", dueDate: "2026-08-26", timing: "26 August 2026",
      owner: "Head Teacher TAS", verifier: "Subject-selection or executive lead", systemIds: ["staff-calendar", "tas-drive"],
      source: "2026 Staff School Calendar + Head Teacher Guide B8", sourceState: "calendar-current",
      steps: [
        "Confirm the event time, audience and TAS contribution in the live Staff School Calendar.",
        "Check that 2027 course descriptions, approved offerings and fee information match the current school handbook.",
        "Remove or replace superseded links, old VET marketing material and unapproved course claims.",
        "Confirm who will answer TAS questions and route VET questions to the VET workboard/current RTO information.",
        "Record a privacy-safe event-readiness sign-off in the approved team record."
      ],
      doneWhen: "The current approved TAS information is ready, the responsible staff know their role and every VET query has a clear hand-off.",
      why: "Subject choices can be affected by one inaccurate fee, course or pathway statement.",
      trap: "Reusing last year's booklet or assuming a VET course is authorised because it ran previously.",
      privacy: "Do not place student preferences or family enquiries in this workboard."
    },
    {
      id: "t3-year12-report-chain",
      title: "Run the Year 12 report checking chain",
      summary: "Quality-check TAS reports before the Head Teacher and office milestones, then confirm issue.",
      area: "teaching", phase: "term_3", priority: "critical", dueDate: "2026-08-28", timing: "HT check 28 Aug · office 4 Sept · issue 18 Sept",
      milestones: [
        { date: "2026-08-28", label: "Year 12 reports due to Head Teacher" },
        { date: "2026-09-04", label: "Year 12 reports due to office" },
        { date: "2026-09-18", label: "Year 12 reports issued" }
      ],
      owner: "Head Teacher TAS", verifier: "School reporting coordinator / delegate", systemIds: ["sentral", "staff-calendar"],
      source: "2026 Staff School Calendar + Head Teacher Guide B14–B15", sourceState: "calendar-current",
      steps: [
        "Confirm every current Year 12 TAS class and reporting owner in Sentral.",
        "Check marks/grades against the approved assessment evidence and current schedule.",
        "Check comments against current school style, reporting guidance and faculty quality criteria.",
        "Return corrections to the teacher with enough time to meet the 4 September office deadline.",
        "Confirm submission and later issue in the owner system; record only a safe completion reference here."
      ],
      doneWhen: "Every applicable Year 12 TAS report is checked, corrected where needed, submitted by the office milestone and confirmed through the school reporting process.",
      why: "The Head Teacher due date is a quality-control deadline, not the final office deadline.",
      trap: "Treating a green Sentral submission state as proof that marks, grades and comments were checked.",
      privacy: "Never enter names, marks, grades, comments or report extracts here."
    },
    {
      id: "t3-parent-teacher",
      title: "Prepare the TAS faculty for Parent–Teacher Interviews",
      summary: "Confirm bookings, coverage and evidence-ready conversations for the 1 September evening.",
      area: "calendar", phase: "term_3", priority: "high", dueDate: "2026-09-01", timing: "1 September 2026 · 4 pm",
      owner: "Head Teacher TAS", verifier: "Executive/event lead", systemIds: ["staff-calendar", "sentral"],
      source: "2026 Staff School Calendar + Head Teacher Guide C7", sourceState: "calendar-current",
      steps: [
        "Confirm the live event details, interview module and faculty attendance expectations.",
        "Check that staff can access current assessment, progress and support information in authorised systems.",
        "Plan coverage and a clear escalation route for complex or sensitive conversations.",
        "After the event, ensure any necessary follow-up is owned and recorded in the correct protected system."
      ],
      doneWhen: "Faculty staff are prepared, bookings and attendance are covered, and required follow-up has an owner in the authorised system.",
      why: "A short preparation check prevents avoidable confusion and unsafe note-taking on the night.",
      trap: "Copying parent or student conversation details into a general faculty checklist.",
      privacy: "All family, learner and wellbeing details remain in Sentral or the approved protected record."
    },
    {
      id: "student-review-cycle",
      title: "Prepare for the assigned student-review and assembly cycle",
      summary: "Use the live calendar to confirm which review or assembly work TAS must support, then prepare only that contribution.",
      area: "calendar", phase: "term_3", priority: "routine", dueDate: "2026-09-02", timing: "Next: Year 9/12 review and Excellence Assembly on 2 September",
      applicability: "Only where the current roster or executive role matrix assigns TAS or the Head Teacher a contribution.",
      milestones: [
        { date: "2026-09-02", label: "Year 9/12 review and Excellence Assembly" },
        { date: "2026-10-21", label: "Year 9/12 review" },
        { date: "2026-10-28", label: "Year 8/11 review" },
        { date: "2026-11-04", label: "Year 7/10 review" },
        { date: "2026-11-25", label: "Year 9/12 review" },
        { date: "2026-12-02", label: "Year 8/11 review" },
        { date: "2026-12-09", label: "Year 7/10 review" }
      ],
      owner: "Head Teacher TAS where assigned", verifier: "Executive / year or assembly lead", systemIds: ["staff-calendar", "sentral", "tas-drive"],
      source: "2026 Staff School Calendar + Guide A7–A9", sourceState: "calendar-current",
      steps: [
        "Check the live event and current roster rather than assuming the historical Weeks 4/8 pattern.",
        "Confirm the TAS/Head Teacher role, required information and protected owner system.",
        "Prepare the contribution without exporting learner, wellbeing or staff-roster details.",
        "Attend or complete the assigned action and record only a safe completion pointer.",
        "Own any follow-up in the appropriate protected system."
      ],
      doneWhen: "The current event and TAS responsibility are confirmed, the assigned contribution is complete and protected follow-up has an owner.",
      why: "The old guide gives a pattern; the live calendar and roster establish the actual 2026 work.",
      trap: "Treating every review event as a TAS task or copying student-review information into a faculty checklist.",
      privacy: "No student, wellbeing, attendance or roster details belong here."
    },
    {
      id: "t3-nesa-submission-check",
      title: "Confirm TAS contributions to the 15 September NESA submission",
      summary: "Establish whether TAS has an action, who owns it and what live NESA source controls it.",
      area: "calendar", phase: "term_3", priority: "high", dueDate: "2026-09-15", timing: "15 September 2026 · applicability must be confirmed",
      applicability: "Only if the current NESA action and school role matrix assign TAS work.",
      owner: "Head Teacher TAS / authorised NESA role", verifier: "Principal or authorised delegate", systemIds: ["nesa-actions", "sentral"],
      source: "2026 Staff School Calendar + live NESA Timetable of Actions", sourceState: "verify-live",
      steps: [
        "Open the live NESA Timetable of Actions and identify the exact 15 September action.",
        "Confirm whether TAS has any applicable courses, entries or data to provide.",
        "Confirm the authorised submitting role and internal checking deadline.",
        "Supply and verify only the information required through the approved owner system.",
        "Record the authorised completion reference or a verified not-applicable decision."
      ],
      doneWhen: "The live NESA action has been checked and the TAS contribution is either verified complete or formally confirmed as not applicable.",
      why: "A calendar label does not establish scope, authority or completion.",
      trap: "Assuming the Head Teacher is the submitter or using the old 2024 timetable copy in Drive.",
      privacy: "Do not enter learner or credential data here."
    },
    {
      id: "t4-year11-report-chain",
      title: "Run the Year 11 report checking chain",
      summary: "Check Year 11 reports and grades across the Head Teacher, office and issue milestones.",
      area: "teaching", phase: "term_4", priority: "high", dueDate: "2026-10-16", timing: "HT 16 Oct · office 23 Oct · issue 6 Nov",
      milestones: [
        { date: "2026-10-16", label: "Year 11 reports due to Head Teacher; grades/Life Skills to DP" },
        { date: "2026-10-23", label: "Year 11 reports due to office" },
        { date: "2026-11-06", label: "Year 11 reports issued" }
      ],
      owner: "Head Teacher TAS", verifier: "Reporting coordinator / authorised data role", systemIds: ["sentral", "staff-calendar"],
      source: "2026 Staff School Calendar + Guide B14–B15/C21A", sourceState: "calendar-current",
      steps: [
        "Confirm the current Year 11 TAS classes, reporting owners and applicable grade requirements.",
        "Check evidence, marks/grades and comments using the approved schedule and reporting guidance.",
        "Confirm the separate 16 October grade/Life Skills hand-off with the authorised Deputy role.",
        "Close corrections before the 23 October office deadline and confirm issue on 6 November."
      ],
      doneWhen: "Reports and applicable grades are checked, submitted through the correct routes and confirmed at the release milestone.",
      why: "The reporting and grade hand-offs have different destinations even though they share a date.",
      trap: "Treating a protected grade folder or old process note as the current submission route.",
      privacy: "No student names, marks, grades or Life Skills information belongs here."
    },
    {
      id: "t4-year10-report-chain",
      title: "Run the Year 10 report and grade chain",
      summary: "Check reports, then complete the separate NESA grade hand-off and office milestone.",
      area: "teaching", phase: "term_4", priority: "high", dueDate: "2026-11-04", timing: "HT 4 Nov · grades 5 Nov · office 11 Nov",
      milestones: [
        { date: "2026-11-04", label: "Year 10 reports due to Head Teacher" },
        { date: "2026-11-05", label: "Year 10 grades for NESA due to DP" },
        { date: "2026-11-11", label: "Year 10 reports due to office" }
      ],
      owner: "Head Teacher TAS", verifier: "Reporting coordinator / authorised NESA role", systemIds: ["sentral", "staff-calendar", "nesa-actions"],
      source: "2026 Staff School Calendar + Guide B14–B15/C21", sourceState: "calendar-current",
      steps: [
        "Reconcile each current Year 10 TAS class with its reporting and grade owner.",
        "Check reports against approved assessment evidence and current grade descriptors.",
        "Verify the 5 November NESA grade hand-off with the authorised Deputy/data role.",
        "Resolve corrections and confirm the 11 November office submission."
      ],
      doneWhen: "Reports and NESA grades have passed the correct checks and reached their separate authorised destinations on time.",
      why: "The one-day gap between the Head Teacher report check and NESA grade hand-off leaves little recovery time.",
      trap: "Using an old descriptor link or assuming report grades automatically complete the NESA action.",
      privacy: "Keep student-level grades and comments in the authorised systems."
    },
    {
      id: "t4-year9-report-chain",
      title: "Run the Year 9 report checking chain",
      summary: "Complete faculty checks before the 16 November Head Teacher and 23 November office milestones.",
      area: "teaching", phase: "term_4", priority: "routine", dueDate: "2026-11-16", timing: "HT 16 Nov · office 23 Nov",
      milestones: [
        { date: "2026-11-16", label: "Year 9 reports due to Head Teacher" },
        { date: "2026-11-23", label: "Year 9 reports due to office" }
      ],
      owner: "Head Teacher TAS", verifier: "School reporting coordinator", systemIds: ["sentral", "staff-calendar"],
      source: "2026 Staff School Calendar + Guide B14–B15", sourceState: "calendar-current",
      steps: ["Confirm classes and reporting owners.", "Check evidence, grades and comments.", "Return and recheck corrections.", "Confirm office submission."],
      doneWhen: "Every applicable Year 9 TAS report is checked and submitted by the office deadline.",
      why: "A consistent faculty check protects accuracy and report quality.",
      trap: "Leaving corrections until the office deadline.",
      privacy: "No report content belongs in this workboard."
    },
    {
      id: "t4-year7-report-chain",
      title: "Run the Year 7 report checking chain",
      summary: "Complete faculty checks before the 19 November Head Teacher and 26 November office milestones.",
      area: "teaching", phase: "term_4", priority: "routine", dueDate: "2026-11-19", timing: "HT 19 Nov · office 26 Nov",
      milestones: [
        { date: "2026-11-19", label: "Year 7 reports due to Head Teacher" },
        { date: "2026-11-26", label: "Year 7 reports due to office" }
      ],
      owner: "Head Teacher TAS", verifier: "School reporting coordinator", systemIds: ["sentral", "staff-calendar"],
      source: "2026 Staff School Calendar + Guide B14–B15", sourceState: "calendar-current",
      steps: ["Confirm classes and reporting owners.", "Check evidence, grades and comments.", "Return and recheck corrections.", "Confirm office submission."],
      doneWhen: "Every applicable Year 7 TAS report is checked and submitted by the office deadline.",
      why: "The same date also carries Showcase work, so early allocation matters.",
      trap: "Letting the event workload crowd out the reporting check.",
      privacy: "No report content belongs in this workboard."
    },
    {
      id: "t4-showcase",
      title: "Prepare the TAS/VET Showcase and Open Day",
      summary: "Coordinate the TAS contribution, approvals, consent, safety and VET hand-off for 19 November.",
      area: "faculty", phase: "term_4", priority: "high", dueDate: "2026-11-19", timing: "19 November 2026",
      owner: "Head Teacher TAS / event lead", verifier: "Executive or event delegate", systemIds: ["staff-calendar", "vet-workboard", "tas-drive"],
      source: "2026 Staff School Calendar + Guide D29", sourceState: "calendar-current",
      steps: [
        "Confirm the event brief, TAS scope, rooms, staffing and live school calendar details.",
        "Approve displays and activities against current WHS, consent, privacy and communications requirements.",
        "Assign setup, supervision, pack-down and follow-up responsibilities.",
        "Route VET promotion and compliance claims to the VET Coordinator/current controlled sources.",
        "Record a short post-event review and owned actions."
      ],
      doneWhen: "The approved TAS contribution is safely staffed and delivered, VET content is verified, and follow-up actions are closed or owned.",
      why: "A public-facing event combines curriculum, safety, privacy and reputation risks.",
      trap: "Using identifiable student work or images without checking the current permission and publishing conditions.",
      privacy: "Keep student consent, attendance and incident details in authorised systems."
    },
    {
      id: "t4-year8-report-chain",
      title: "Run the Year 8 report checking chain",
      summary: "Complete faculty checks before the 24 November Head Teacher and 1 December office milestones.",
      area: "teaching", phase: "term_4", priority: "routine", dueDate: "2026-11-24", timing: "HT 24 Nov · office 1 Dec",
      milestones: [
        { date: "2026-11-24", label: "Year 8 reports due to Head Teacher" },
        { date: "2026-12-01", label: "Year 8 reports due to office" }
      ],
      owner: "Head Teacher TAS", verifier: "School reporting coordinator", systemIds: ["sentral", "staff-calendar"],
      source: "2026 Staff School Calendar + Guide B14–B15", sourceState: "calendar-current",
      steps: ["Confirm classes and reporting owners.", "Check evidence, grades and comments.", "Return and recheck corrections.", "Confirm office submission."],
      doneWhen: "Every applicable Year 8 TAS report is checked and submitted by the office deadline.",
      why: "A seven-day quality-control window is workable only if corrections are returned promptly.",
      trap: "Assuming Technology Mandatory rotations and class lists are unchanged.",
      privacy: "No report content belongs in this workboard."
    },
    {
      id: "t4-report-release",
      title: "Reconcile Years 7–10 report release",
      summary: "Confirm all TAS reporting chains are closed before the common issue date.",
      area: "teaching", phase: "term_4", priority: "high", dueDate: "2026-12-18", timing: "Years 7–10 reports issued 18 December 2026",
      owner: "Head Teacher TAS", verifier: "School reporting coordinator", systemIds: ["sentral", "staff-calendar"],
      source: "2026 Staff School Calendar", sourceState: "calendar-current",
      steps: [
        "Review the Year 7, 8, 9 and 10 reporting-chain statuses.",
        "Resolve or formally own any remaining TAS exception before release.",
        "Confirm the authorised reporting system shows the expected release state.",
        "Carry only privacy-safe improvement actions into the next annual plan."
      ],
      doneWhen: "Every TAS reporting chain is closed or has an authorised, owned exception before release.",
      why: "A final reconciliation catches gaps hidden across separate year-group deadlines.",
      trap: "Creating a parallel spreadsheet of student report status.",
      privacy: "Use aggregate status only."
    },
    {
      id: "t4-enrichment",
      title: "Confirm the TAS role in Year 10 Enrichment",
      summary: "Clarify whether TAS is contributing to the 23–27 November program and prepare only the approved work.",
      area: "calendar", phase: "term_4", priority: "routine", dueDate: "2026-11-23", timing: "23–27 November 2026",
      applicability: "Only if TAS is assigned a contribution in the current program.",
      owner: "Head Teacher TAS / program coordinator", verifier: "Executive program lead", systemIds: ["staff-calendar", "tas-drive"],
      source: "2026 Staff School Calendar + Guide D26", sourceState: "verify-live",
      steps: ["Confirm the current program, TAS role and cohort.", "Approve staffing, resources and any safety controls.", "Brief participating staff and confirm timetable impacts.", "Record completion or a verified not-applicable decision."],
      doneWhen: "The TAS contribution is approved and ready, or the executive program lead has confirmed that TAS has no action.",
      why: "The Drive source names the program but does not establish the current TAS responsibility.",
      trap: "Building an activity before the current program owner has assigned TAS a role.",
      privacy: "Keep cohort and support information in protected systems."
    },
    {
      id: "hsc-analysis-cycle",
      title: "Start the HSC RAP/SCOUT improvement cycle",
      summary: "After results release, convert protected HSC data into a small set of owned teaching actions.",
      area: "teaching", phase: "term_4", priority: "routine", dueDate: "2026-12-16", timing: "HSC results 16 December 2026; analysis continues into annual setup",
      owner: "Head Teacher TAS and HSC teachers", verifier: "Senior curriculum/data lead", systemIds: ["scout", "sentral", "tas-drive"],
      source: "2026 Staff School Calendar + Guide B2/B23/B26", sourceState: "calendar-current",
      steps: [
        "Confirm authorised access to the current RAP/SCOUT results after release.",
        "Analyse cohort and question-level patterns without exporting identifiable data to the workboard.",
        "Agree a small number of course-specific improvement actions with owners and review dates.",
        "Map the actions into current programs, professional learning and the Faculty Management Plan."
      ],
      doneWhen: "Current results have produced named, evidence-informed improvement actions in the approved faculty planning record.",
      why: "Analysis only matters when it changes a teaching, program or assessment decision.",
      trap: "Publishing result extracts or producing a long analysis with no owned action.",
      privacy: "Only aggregated insights and action references belong in this workboard."
    },
    {
      id: "source-sharing-review",
      title: "Restrict and retest the Head Teacher Drive sharing",
      summary: "Review and restrict broad link-sharing on A–D and sensitive descendants; linked staff hubs do not replace permissions.",
      area: "people", phase: "annual", priority: "critical", timing: "Immediate setup gate; review annually and after access changes",
      owner: "Head Teacher TAS / Drive owner", verifier: "Principal or authorised information owner", systemIds: ["tas-drive"],
      source: "Read-only permission audit on 26 August 2026", sourceState: "critical-gap",
      steps: [
        "Identify the approved owner for the Head Teacher document and A–D Drive branches.",
        "Remove anyone-with-the-link access and review broad group, legacy and personal-domain permissions.",
        "Separate confidential, personnel, student, leave, health, incident and security records from general reference material.",
        "Test the document and sampled sensitive branches while signed out and from an unauthorised account.",
        "Keep only approved hub or front-door links in this workboard; never add case-specific or sensitive descendant links."
      ],
      doneWhen: "Anonymous and unauthorised access fails, approved staff access still works and the review is recorded in the authorised governance location.",
      why: "The current permission audit found link-reader access on A–D and sampled sensitive branches.",
      trap: "Hiding a link from navigation and assuming that makes the underlying Drive content private.",
      privacy: "Do not paste permission lists, account names or sensitive folder links into the workboard."
    },
    {
      id: "annual-calendar-control",
      title: "Build the annual Head Teacher control calendar",
      summary: "Reconcile the live Staff Calendar, current NESA actions and faculty calendar at the start of each year.",
      area: "calendar", phase: "annual", priority: "high", timing: "Year start, then after any published change",
      owner: "Head Teacher TAS", verifier: "Executive / calendar owner", systemIds: ["staff-calendar", "nesa-actions", "sentral"],
      source: "Guide A3–A5 + current owner systems", sourceState: "mixed",
      steps: [
        "Open the new year's live Staff School Calendar and current NESA Timetable of Actions.",
        "Identify TAS-owned dates, school-wide contributions and dates that only require awareness.",
        "Add internal preparation and checking points before each external deadline.",
        "Confirm the live faculty calendar and staff access.",
        "Archive the previous baseline without mechanically rolling dates forward."
      ],
      doneWhen: "The new year's current owner-system dates, internal checks, owners and calendar access have been verified.",
      why: "The observed TAS Drive has a 2022 calendar link and no current 2026 NESA timetable copy.",
      trap: "Copying last year's dates or treating a static Drive spreadsheet as the live authority.",
      privacy: "Do not publish staff rosters or protected event details."
    },
    {
      id: "annual-plan-alignment",
      title: "Review the Faculty Management Plan and school-plan alignment",
      summary: "Keep the 2025–27 faculty plan current and turn strategic directions into owned evidence-producing work.",
      area: "faculty", phase: "annual", priority: "high", timing: "Annual setup, term review and material change",
      owner: "Head Teacher TAS", verifier: "Principal or school-improvement delegate", systemIds: ["faculty-plan", "tas-drive"],
      source: "Current 2025–27 Faculty Management Plan + 2024–27 School Plan", sourceState: "current-local",
      steps: [
        "Confirm the current approved Faculty Management Plan and School Plan versions.",
        "Check that faculty priorities, staff development and evidence align to current school directions.",
        "Assign each material action to a role, evidence destination and review point.",
        "Record term progress and close, revise or escalate stalled actions."
      ],
      doneWhen: "The current plan is approved, aligned, owned and supported by privacy-safe evidence references and review dates.",
      why: "A plan becomes useful only when it drives visible term work and evidence.",
      trap: "Maintaining multiple drafts or using a presentation as the authoritative plan.",
      privacy: "Staff PDP and performance details remain in their protected systems."
    },
    {
      id: "annual-rosters-rhythm",
      title: "Confirm rosters, meeting rhythm and faculty responsibilities",
      summary: "Reconcile Head Teacher duties, assemblies, meetings, playground/bus duties and current faculty responsibilities.",
      area: "people", phase: "annual", priority: "high", timing: "Year/term start and after staffing or timetable change",
      owner: "Head Teacher TAS", verifier: "Executive / roster owner", systemIds: ["staff-calendar", "sentral", "tas-drive"],
      source: "Guide A7–A9/C27/D6", sourceState: "verify-live",
      steps: [
        "Check the current Head Teacher, assembly, duty, sport and meeting rosters in their owner systems.",
        "Confirm faculty responsibilities and back-up arrangements without duplicating personal schedules publicly.",
        "Verify the current executive and faculty meeting days/times; do not rely on the historical wording alone.",
        "Brief changes and record acknowledgement in the approved staff route."
      ],
      doneWhen: "Current responsibilities are acknowledged, clashes are resolved and every recurring duty has an owner and back-up.",
      why: "Several source rows describe old or ambiguous roster destinations.",
      trap: "Publishing staff allocation or contact lists to make the workboard convenient.",
      privacy: "Roster, contact and staffing details remain in protected systems."
    },
    {
      id: "class-readiness",
      title: "Complete the TAS class-readiness check",
      summary: "Make sure every class has its people, systems, safety and learning foundations before practical work gathers pace.",
      area: "teaching", phase: "annual", priority: "high", timing: "Year/term start and after any class or timetable change",
      owner: "Head Teacher TAS and class teachers", verifier: "Head Teacher TAS", systemIds: ["sentral", "google-classroom", "onguard", "program-register"],
      source: "Guide B1/B4/B9–B12/B18/B20/B30", sourceState: "mixed",
      steps: [
        "Reconcile current classes and teachers against the live timetable.",
        "Confirm each class has an owned program, registration/monitoring location and approved online learning space where used.",
        "Confirm authorised staff know how to access relevant health/support plans without copying their content.",
        "Confirm PPE/footwear, equipment-safety learning, laptop/BYOD and room-readiness arrangements under current policy.",
        "Record aggregate readiness and own each exception."
      ],
      doneWhen: "Every current class is ready or has a named, time-bound exception in the correct owner system.",
      why: "Small setup gaps become assessment, safety and reporting problems later.",
      trap: "Creating a public class register or relying on 2022 setup instructions.",
      privacy: "Use aggregate status only; no class lists, health details, credentials or learner names."
    },
    {
      id: "technology-rotations",
      title: "Set and reconcile Technology Mandatory rotations",
      summary: "Keep Years 7–8 rotations, teachers, rooms and the live timetable aligned throughout the year.",
      area: "teaching", phase: "annual", priority: "high", timing: "Annual timetable setup and whenever a class, room or rotation changes",
      owner: "Head Teacher TAS", verifier: "Timetabler / executive delegate", systemIds: ["sentral", "tas-drive"],
      source: "Guide C19 + active 2026 rotation branch", sourceState: "current-local",
      steps: [
        "Confirm the approved annual rotation structure, classes, teachers, rooms and change dates.",
        "Reconcile the rotation against the live timetable and Sentral class state.",
        "Brief teachers on hand-over points, program sequence, assessment and room/PPE requirements.",
        "Resolve attendance or class-list mismatches in the protected owner systems.",
        "Record the current rotation-version sign-off and next change point."
      ],
      doneWhen: "The approved rotation, live timetable and class ownership agree, with every mismatch resolved or formally owned.",
      why: "The Drive has active annual folders, but static attendance reports cannot replace live timetable and class data.",
      trap: "Letting an old rotation sheet control classes after a timetable or staffing change.",
      privacy: "Do not publish class lists, staff allocations or attendance details."
    },
    {
      id: "program-currency",
      title: "Verify programs, registration and syllabus currency",
      summary: "Confirm every TAS class is using a current syllabus-aligned program with an active registration trail.",
      area: "teaching", phase: "annual", priority: "high", timing: "Year start, syllabus/course change and monitoring cycle",
      owner: "Class teacher; Head Teacher TAS assures", verifier: "Head Teacher TAS / curriculum delegate", systemIds: ["nesa-curriculum", "program-register"],
      source: "Guide B3/B17/B28–B29", sourceState: "mixed",
      steps: [
        "Check the live NSW Curriculum page for each delivered course and any implementation change.",
        "Confirm the current approved program version, scope/sequence and assessment links.",
        "Confirm ongoing registration/monitoring is being completed in the approved location.",
        "Resolve legacy templates, duplicated folders and missing ownership.",
        "Record the current version and review sign-off—not the program content—in this workboard."
      ],
      doneWhen: "Every current class has a syllabus-current, approved program and an active, monitored registration trail.",
      why: "The Drive contains useful resources but also draft and 2022-era syllabus material.",
      trap: "Treating Program Builder, an example Google Site or an archived program as proof of current registration.",
      privacy: "Do not expose class allocations or monitoring records."
    },
    {
      id: "assessment-governance",
      title: "Approve and control TAS assessment schedules and tasks",
      summary: "Check the annual schedule, every task issue point and any change before it reaches students.",
      area: "teaching", phase: "annual", priority: "high", timing: "Before annual publication, before each task and whenever a date changes",
      owner: "Head Teacher TAS", verifier: "Executive / assessment owner", systemIds: ["assessment-schedules", "sentral", "nesa-curriculum"],
      source: "Guide B5–B6/B12/B29/C6", sourceState: "critical-gap",
      steps: [
        "Confirm every current TAS course appears in the approved annual assessment schedule.",
        "Check task timing, outcomes, evidence, accessibility, authenticity controls and current school/NESA rules.",
        "Confirm any independent trial-paper ordering, security and procurement dates early in Term 1.",
        "Confirm the task is issued through the approved student route on the scheduled date.",
        "Route any date or condition change through the current executive approval process.",
        "Update the schedule and monitoring trail after approval."
      ],
      doneWhen: "All current courses have approved schedules, every issued task matches the controlled version and every amendment has an authorised trail.",
      why: "The observed 2026 Drive branch did not prove that the whole faculty is covered.",
      trap: "Using an old schedule or changing a due date in one place without formal approval and downstream updates.",
      privacy: "Keep student submissions and individual adjustments in authorised systems."
    },
    {
      id: "senior-monitoring",
      title: "Assure senior-course monitoring and sign-off",
      summary: "Keep Stage 6 monitoring current, controlled and ready for the required school sign-off.",
      area: "teaching", phase: "ongoing", priority: "high", timing: "Throughout delivery and before each reporting/assurance point",
      owner: "Senior course teacher; Head Teacher TAS monitors", verifier: "Principal or authorised delegate", systemIds: ["program-register", "nesa-curriculum"],
      source: "Guide B17", sourceState: "verify-live",
      steps: [
        "Confirm the current school/NESA monitoring model and required sign-off points.",
        "Check that each senior class has a current monitoring record tied to the approved program and assessment schedule.",
        "Resolve gaps before reporting or data submission deadlines.",
        "Confirm required Principal/delegate sign-off and controlled storage."
      ],
      doneWhen: "Every senior course has a current monitoring trail and the required authorised sign-off.",
      why: "The source describes hard-copy and electronic duplication that may no longer be the approved model.",
      trap: "Assuming a folder exists means the monitoring record is current and complete.",
      privacy: "No student-level monitoring data belongs here."
    },
    {
      id: "subject-selection-cycle",
      title: "Run the TAS subject-selection information cycle",
      summary: "Keep handbooks, presentations, fees and authorised offerings accurate across the selection window.",
      area: "teaching", phase: "term_3", priority: "high", timing: "Before the annual selection window and after any offering change",
      owner: "Head Teacher TAS", verifier: "Subject-selection lead / Principal delegate", systemIds: ["staff-calendar", "tas-drive", "vet-workboard"],
      source: "Guide B8 + 2026 Staff School Calendar", sourceState: "mixed",
      steps: [
        "Confirm the current selection timeline, year groups and publishing owner.",
        "Check course descriptions, prerequisites, fees and facilities against current approved information.",
        "Verify that VET claims come from the VET Coordinator/current RTO authority.",
        "Approve the TAS handbook, presentation/video and website content before release.",
        "Record corrections and a dated annual sign-off."
      ],
      doneWhen: "Every published TAS and VET pathway statement is current, approved and owned for the live selection cycle.",
      why: "The Drive contains 2027 fee information but older selection materials and legacy VET marketing sources.",
      trap: "Updating one booklet while leaving old slides, videos or web pages live.",
      privacy: "Do not expose student selection preferences."
    },
    {
      id: "faculty-publications",
      title: "Complete the annual TAS publications and school-report contribution",
      summary: "Keep public faculty information current and confirm annual magazine/report requirements with their live owners.",
      area: "faculty", phase: "term_4", priority: "routine", timing: "Annual publication cycle; exact briefs and dates must be confirmed",
      owner: "Head Teacher TAS or nominated author", verifier: "Principal / communications or school-report owner", systemIds: ["school-website", "staff-calendar", "tas-drive"],
      source: "Guide A6/C14–C15; source workflows mostly stop at 2021–22", sourceState: "critical-gap",
      steps: [
        "Confirm the current public school website/CMS, school-report and magazine owners, briefs and due dates.",
        "Check that TAS course, pathway, fee, contact and facility information is current and approved.",
        "Prepare the required faculty contribution using authorised aggregate evidence and current publishing/consent rules.",
        "Verify the rendered public output and retire or correct superseded pages and links.",
        "Record publication/submission and a dated verifier."
      ],
      doneWhen: "The required annual contributions are submitted and the approved public TAS information is current, accessible and verified.",
      why: "The source retains useful examples but no clearly current annual workflow or deadline.",
      trap: "Reusing an old article or website link without checking facts, permissions and the rendered destination.",
      privacy: "Do not publish identifiable student work, images, results or staff contact details without current authority."
    },
    {
      id: "reporting-assurance",
      title: "Set the faculty reporting and markbook assurance process",
      summary: "Give staff one current, consistent route for markbooks, grades, comments, checks and corrections.",
      area: "teaching", phase: "annual", priority: "high", timing: "Before each reporting cycle and after reporting-system change",
      owner: "Head Teacher TAS", verifier: "School reporting coordinator", systemIds: ["sentral", "tas-drive"],
      source: "Guide B7/B10/B14–B15", sourceState: "mixed",
      steps: [
        "Confirm the current school reporting timeline, style guidance and Sentral process.",
        "Publish a small approved faculty check that covers evidence, grade, comment and submission state.",
        "Brief teachers on correction and escalation steps.",
        "Sample the process early enough to fix system or quality issues before due dates.",
        "Retire superseded word banks, grade tools and copied instructions."
      ],
      doneWhen: "Staff use one current reporting process and the Head Teacher check is completed before each office milestone.",
      why: "The Drive contains many helpful aids but they span several years and do not establish a single current process.",
      trap: "Allowing a third-party grade tool or generated comment to become the authority.",
      privacy: "Keep student marks, grades and comments in Sentral."
    },
    {
      id: "capability-training",
      title: "Review mandatory training, PDPs and faculty capability",
      summary: "Check status and support needs without building a shadow personnel register.",
      area: "people", phase: "annual", priority: "high", timing: "Annual PDP cycle, term review and before an expiry or new duty",
      owner: "Individual staff member and Head Teacher supervisor", verifier: "Principal / capability owner", systemIds: ["mypl", "tas-drive"],
      source: "Guide A10/C3–C5/C24–C25", sourceState: "mixed",
      steps: [
        "Check mandatory-training status in MyPL and current employer requirements.",
        "Confirm each staff member has an approved PDP and appropriate supervisor conversations in the protected process.",
        "Identify capability needs for current courses, machinery, safety systems and emerging technology.",
        "Plan approved professional learning, observation or mentoring and later review its impact.",
        "Record only aggregate readiness or a safe owner-system reference here."
      ],
      doneWhen: "Required training is current and every material capability gap has an approved support action and review point.",
      why: "Several source files contain old accreditation rules, classroom codes and staff-specific records.",
      trap: "Copying expiry dates, credentials, PDP goals or observation notes into the workboard.",
      privacy: "All personnel, accreditation and performance details remain protected."
    },
    {
      id: "faculty-meeting-control",
      title: "Run faculty meetings and close the actions",
      summary: "Use each meeting to make decisions, assign work and verify the hand-back.",
      area: "faculty", phase: "ongoing", cycle: "week", priority: "routine", timing: "Current weekly meeting rhythm; verify the 2026 day/time",
      owner: "Head Teacher TAS", verifier: "Head Teacher TAS / executive where required", systemIds: ["staff-calendar", "tas-drive"],
      source: "Guide C27; current 2026 meeting records observed", sourceState: "current-local",
      steps: [
        "Confirm the live meeting time, agenda and staff attendance expectations.",
        "Separate information, decisions, actions, deadlines and escalations.",
        "Assign every action to a role and approved evidence destination.",
        "Begin the next meeting by closing, carrying or escalating open actions."
      ],
      doneWhen: "Minutes are stored in the approved location and every action is closed, carried with a date or formally escalated.",
      why: "Meetings only reduce risk when actions return for verification.",
      trap: "Using minutes as a record of discussion without ownership or hand-back.",
      privacy: "Confidential staffing, student and incident matters stay in restricted records."
    },
    {
      id: "budget-procurement",
      title: "Control the faculty budget, purchasing, stock and fees",
      summary: "Plan, approve and reconcile faculty resources through the current finance and asset systems.",
      area: "faculty", phase: "ongoing", priority: "high", timing: "Annual allocation, every purchase/claim and term reconciliation",
      owner: "Head Teacher TAS within delegation", verifier: "Principal / finance delegate", systemIds: ["finance-system", "tas-drive"],
      source: "Guide C1/B9/C23/C26", sourceState: "verify-live",
      steps: [
        "Confirm current cost centres, delegations and purchase/claim routes with the finance owner.",
        "Reconcile planned course needs, consumables, equipment, maintenance and approved student fee information.",
        "Approve purchasing only through the current procurement process.",
        "Register assets on receipt and reconcile stock, disposal and acquittal records.",
        "Review the budget position each term without copying finance detail into the workboard."
      ],
      doneWhen: "Purchases and claims are authorised, stock/assets are reconciled and the finance owner system reflects the current position.",
      why: "The source still refers to colour-coded paper forms and network-drive routes that may be superseded.",
      trap: "Keeping a convenient parallel budget with sensitive amounts, invoices or student balances.",
      privacy: "No amounts, personal claims, supplier data or individual fee status belongs here."
    },
    {
      id: "whs-inspection",
      title: "Complete the annual TAS workplace inspection and close hazards",
      summary: "Inspect practical areas using the current process and verify that every finding is closed or controlled.",
      area: "faculty", phase: "term_1", priority: "critical", timing: "Near the end of Term 1; confirm the live annual date",
      owner: "Head Teacher TAS", verifier: "Principal / WHS delegate", systemIds: ["whs-system"],
      source: "Guide C8 + observed WHS inspection source", sourceState: "verify-live",
      steps: [
        "Obtain the current approved inspection checklist and inspection date.",
        "Inspect each practical workspace with the appropriate staff and record findings in the authorised system.",
        "Immediately isolate or control any unsafe item or area.",
        "Assign every corrective action to an owner and due date.",
        "Recheck and record closure; escalate any unresolved risk."
      ],
      doneWhen: "The current inspection is complete and every finding is verified closed or controlled through an authorised exception.",
      why: "An inspection record without action closure does not control the hazard.",
      trap: "Using an old copied form or leaving repairs as informal verbal requests.",
      privacy: "Do not publish room security, alarm, key or incident details."
    },
    {
      id: "machinery-assets",
      title: "Control machinery approval, commissioning and asset registration",
      summary: "Do not purchase, install, move or change machinery without the current approval and safety trail.",
      area: "faculty", phase: "triggered", priority: "critical", timing: "Before purchase, installation, commissioning, relocation or changed use",
      owner: "Head Teacher TAS", verifier: "Authorised compliance / WHS / asset delegate", systemIds: ["whs-system", "finance-system"],
      source: "Guide C9/C26/C33 + active 2026 machinery branch", sourceState: "verify-live",
      steps: [
        "Identify the exact proposed machine/change and the current Department application route.",
        "Obtain approval before purchase or commitment, including site, services, guarding and training considerations.",
        "On receipt, complete asset registration, commissioning and required risk/control records.",
        "Verify authorised users, current SOPs and inspection/maintenance arrangements before use.",
        "Record the official approval and asset references only."
      ],
      doneWhen: "The machine/change is approved, registered, safely commissioned and restricted to appropriately authorised use.",
      why: "The Drive has an active machinery branch, but the Head Teacher guide does not state the current operative pathway.",
      trap: "Ordering first and trying to regularise approval, services or guarding afterwards.",
      privacy: "Do not publish detailed room security, keys or restricted plant information."
    },
    {
      id: "chemical-controls",
      title: "Maintain chemical registers, SDS access and storage controls",
      summary: "Keep each practical area aligned to the current chemical-safety process.",
      area: "faculty", phase: "ongoing", priority: "critical", timing: "On acquisition, use, movement or disposal; review in the current WHS cycle",
      owner: "Head Teacher TAS / WHS owner", verifier: "Principal / WHS delegate", systemIds: ["chemical-register", "whs-system"],
      source: "Guide C11 + active 2026 chemical/SDS branch", sourceState: "current-local",
      steps: [
        "Confirm the current Department/school chemical-safety platform and accountable roles.",
        "Reconcile products and locations against the controlled register without copying inventory into the workboard.",
        "Verify current SDS access, labelling, storage, PPE, sharps and disposal controls as applicable.",
        "Remove, isolate or escalate any unknown, unapproved or uncontrolled product.",
        "Record the dated inspection/closure reference in the authorised system."
      ],
      doneWhen: "The controlled register matches the physical areas, current SDS and controls are available, and every exception is closed or isolated.",
      why: "The Drive has current 2026 registers but also accumulated old guidance; the live owner system must control the work.",
      trap: "Treating a spreadsheet inventory as proof that storage, SDS, labelling and disposal are safe.",
      privacy: "Do not publish inventory contents or detailed storage/security information."
    },
    {
      id: "workshop-routine",
      title: "Run the practical-area safety and fault routine",
      summary: "Make the every-lesson check, fault escalation and equipment training visible and consistent.",
      area: "faculty", phase: "ongoing", priority: "critical", timing: "Every practical lesson; faults handled immediately",
      owner: "Class teacher; Head Teacher TAS assures", verifier: "Head Teacher TAS / WHS owner", systemIds: ["onguard", "workshop-maintenance", "whs-system"],
      source: "Faculty Management Plan + Guide B18/C9/C12/C24", sourceState: "mixed",
      steps: [
        "Before practical work, check the room, equipment condition, guards/controls, PPE/footwear and known hazards.",
        "Confirm required equipment-safety learning and teacher authorisation before use.",
        "Stop, isolate and report any fault or unsafe condition through the current maintenance/WHS process.",
        "Use the approved alternate learning arrangement where practical work cannot proceed safely.",
        "Track each fault to verified repair or authorised disposal."
      ],
      doneWhen: "Practical work starts only under verified controls and every fault is isolated, owned and closed through the approved route.",
      why: "A term inspection cannot replace the controls required at the point of use.",
      trap: "Allowing an informal repair or old OnGuard result to substitute for current safe condition and supervision.",
      privacy: "No learner results, incident details, keys or alarm information belongs here."
    },
    {
      id: "term-workshop-close",
      title: "Complete the end-of-term workshop close-down",
      summary: "Finish practical work early enough to inspect, maintain and reset each room for the next term.",
      area: "faculty", phase: "ongoing", priority: "high", timing: "Last week of each term; exact local timetable to confirm",
      owner: "Head Teacher TAS and assigned staff", verifier: "Head Teacher TAS / WHS delegate", systemIds: ["workshop-maintenance", "whs-system", "tas-drive"],
      source: "Guide C12; active maintenance branch with mixed legacy content", sourceState: "verify-live",
      steps: [
        "Set the practical-work cut-off and brief staff early enough to complete safe pack-down.",
        "Complete the current room, plant, tools, stock and chemical close-down checks.",
        "Isolate defects and lodge work through the authorised maintenance process.",
        "Verify only qualified/authorised work is undertaken.",
        "Record room readiness and carry owned exceptions into the next term."
      ],
      doneWhen: "Each practical area is clean, controlled and ready, with every defect isolated and formally owned.",
      why: "The historical schedule includes 2017 instructions; the cadence is useful but the actual method must be current.",
      trap: "Treating the last week as spare time or allowing unqualified staff to perform regulated maintenance.",
      privacy: "Keep security and restricted plant information out of the workboard."
    },
    {
      id: "stocktake-disposal",
      title: "Complete annual stocktake, asset reconciliation and disposal",
      summary: "Reconcile rooms and equipment to the official asset process before year close.",
      area: "faculty", phase: "term_4", priority: "high", timing: "Annual stocktake cycle; exact central date to confirm",
      owner: "Head Teacher TAS / asset custodian", verifier: "Finance or asset delegate", systemIds: ["finance-system", "tas-drive"],
      source: "Guide C23/C26 + active stocktake/asset branches", sourceState: "current-local",
      steps: [
        "Confirm the current central stocktake cycle, room owners and asset process.",
        "Reconcile each room/course list to the live asset register.",
        "Investigate missing, moved, surplus or unserviceable items through the authorised route.",
        "Complete acquisition, transfer and disposal approvals.",
        "Verify the official register and close all exceptions."
      ],
      doneWhen: "The official asset state matches the verified physical stock and every discrepancy has been resolved or formally owned.",
      why: "Historical room lists are useful clues but do not replace the central asset record.",
      trap: "Deleting an item from a local list without completing the approved disposal trail.",
      privacy: "Do not publish high-value asset detail or security information."
    },
    {
      id: "ag-farm-audit",
      title: "Confirm and complete the applicable Agriculture/farm audit",
      summary: "Establish the current animal-welfare/farm assurance requirement before treating the old Drive material as an active process.",
      area: "faculty", phase: "annual", priority: "high", timing: "Current annual or event-driven audit cycle; authority and date to confirm",
      applicability: "Only if the current Agriculture/farm operation and authorised audit regime apply to WWHS TAS.",
      owner: "Agriculture/farm lead and Head Teacher TAS", verifier: "Principal / authorised animal-welfare or audit role", systemIds: ["tas-drive", "staff-calendar"],
      source: "Guide C29; latest observed farm-audit material is 2022", sourceState: "critical-gap",
      steps: [
        "Confirm the current Agriculture/farm activities, accountable roles and applicable audit authority.",
        "Obtain the current audit instrument, evidence requirements and due date from the owner source.",
        "Complete the inspection/audit and immediately control any safety or animal-welfare issue.",
        "Assign every finding to an owner and verify closure.",
        "Record the authorised audit reference or a verified not-applicable decision."
      ],
      doneWhen: "The current authorised audit is complete with findings closed, or the accountable verifier has confirmed that the control is not applicable.",
      why: "The source names an audit but does not prove the current regime, date or method.",
      trap: "Running a 2022 checklist as if it were current authority or silently omitting the duty.",
      privacy: "Keep staff, animal-incident, facility-security and case details in controlled records."
    },
    {
      id: "excursion-workflow",
      title: "Approve and close a TAS excursion",
      summary: "Use one current route for risk, approval, consent, attendance and post-event closure.",
      area: "people", phase: "triggered", priority: "high", timing: "Before every excursion; current lead time must be checked",
      owner: "Organising teacher; Head Teacher TAS checks", verifier: "Principal or authorised delegate", systemIds: ["sentral", "tas-drive"],
      source: "Guide C18 + 2024 School Bytes-era procedure", sourceState: "verify-live",
      steps: [
        "Open the current school excursion process and confirm approval lead times.",
        "Check educational purpose, risk assessment, staffing, transport, costs, consent and student support controls.",
        "Obtain approval before commitments or publication.",
        "On the day, use the authorised roll, communication and incident arrangements.",
        "Close finance, attendance, incident and evaluation actions in their owner systems."
      ],
      doneWhen: "The excursion is approved before commitment, delivered under current controls and fully closed in the authorised systems.",
      why: "The source mixes network-drive and older School Bytes material; the current school route must be confirmed.",
      trap: "Using last year's forms or storing consent/medical information in a faculty checklist.",
      privacy: "No names, health information, contacts or consent details belong here."
    },
    {
      id: "new-staff-induction",
      title: "Induct a new, relieving or practicum TAS staff member",
      summary: "Give the person the smallest safe pathway to teach, supervise and find current information.",
      area: "people", phase: "triggered", priority: "high", timing: "Before first duty/class and during the first weeks",
      owner: "Head Teacher TAS", verifier: "Principal / induction owner", systemIds: ["sentral", "mypl", "tas-drive", "onguard"],
      source: "Guide D12/C5/C22 + 2019/2022 induction material", sourceState: "critical-gap",
      steps: [
        "Confirm employment/role, timetable, supervision and the current whole-school induction owner.",
        "For a practicum placement, confirm the current university agreement, supervising teacher and reporting requirements.",
        "Provide current emergency, wellbeing, attendance, reporting, communication and staff-support front doors.",
        "Complete faculty induction for rooms, plant, chemicals, PPE, keys/access and approved teaching systems without publishing restricted details.",
        "Confirm mandatory training, accreditation/supervision and course capability through owner systems.",
        "Schedule early check-ins and record the approved induction acknowledgement."
      ],
      doneWhen: "The staff member is authorised, inducted and supported for their assigned work, with every capability or access gap owned.",
      why: "The current Drive pathway relies partly on a 2019 handbook and scattered old documents.",
      trap: "Giving a folder dump instead of confirming what the person must know before their first class.",
      privacy: "Keep personnel, accreditation, access and performance details protected."
    },
    {
      id: "absence-cover",
      title: "Secure class coverage when a TAS staff member is absent",
      summary: "Confirm safe coverage, useful work and practical-area restrictions through the current school process.",
      area: "people", phase: "triggered", priority: "critical", timing: "As soon as an absence or coverage gap is known",
      owner: "Head Teacher TAS with absence/timetable role", verifier: "Deputy / casual coordinator as applicable", systemIds: ["sentral", "tas-drive"],
      source: "Guide D13/D18", sourceState: "verify-live",
      steps: [
        "Use the current absence notification and class-cover route; do not rely on old phone numbers or cut-off times.",
        "Confirm each affected class, room, supervision level and practical-work restriction.",
        "Provide useful approved relief work where reasonably available, with an emergency backup for unexpected absence.",
        "Brief the relieving teacher on essential safety/access information through a protected route.",
        "Confirm coverage and escalate any class that cannot operate safely."
      ],
      doneWhen: "Every class is safely covered or formally relocated/changed, with useful work and the necessary protected briefing available.",
      why: "Practical TAS classes cannot be treated as ordinary coverage when capability or room controls are missing.",
      trap: "Publishing personal contact details or expecting an unwell staff member to solve an emergency absence.",
      privacy: "No health, leave, personal phone or staffing-case details belong here."
    },
    {
      id: "n-warning-response",
      title: "Respond when a student is at risk of not meeting course requirements",
      summary: "Use the current warning, support and Principal-owned process without creating a shadow record.",
      area: "people", phase: "triggered", priority: "high", timing: "As soon as evidence shows course requirements are at risk",
      owner: "Class teacher; Head Teacher TAS monitors", verifier: "Principal / authorised delegate", systemIds: ["sentral", "nesa-actions"],
      source: "Guide B13 + current NESA/school process", sourceState: "verify-live",
      steps: [
        "Check the current school/NESA warning requirements and the exact course issue.",
        "Where the need emerges before a formal warning threshold, use the current protected Learning and Support referral route in Sentral and keep that support trail separate.",
        "Confirm the evidence, support already provided and achievable recovery action.",
        "Create and issue the approved warning through the protected Sentral/school workflow.",
        "Record receipt, follow-up and student support in the owner system.",
        "Escalate any final N-award process through the Principal/authorised role."
      ],
      doneWhen: "The current warning/support process is complete and any ongoing or final action is formally owned in the authorised system.",
      why: "Timely, accurate warnings protect procedural fairness and create a real recovery opportunity.",
      trap: "Using old thresholds/wording or placing learner details in the workboard.",
      privacy: "All learner, family, attendance and assessment details stay in protected systems."
    },
    {
      id: "mandatory-reporting-response",
      title: "Act on a child-protection or mandatory-reporting concern",
      summary: "Stop normal work and use the current protected reporting and escalation route.",
      area: "people", phase: "triggered", procedureOnly: true, priority: "critical", timing: "Immediately when a concern arises",
      owner: "Every mandatory reporter", verifier: "Principal / authorised safeguarding role as policy requires", systemIds: ["mandatory-reporting"],
      source: "Guide D2 + current Mandatory Reporter Guide", sourceState: "front-door-current",
      steps: [
        "If anyone is in immediate danger, follow emergency procedures and call 000 where required.",
        "Open the current Mandatory Reporter Guide and Department procedure; do not rely on memory or an old checklist.",
        "Follow the required protected consultation, reporting and escalation steps.",
        "Keep all case information only in the authorised record and disclose it only as required.",
        "Record no case detail in this workboard."
      ],
      doneWhen: "The current protected process has been followed and the authorised owner-system record exists where required.",
      why: "This is safety-critical and must interrupt the normal workboard sequence.",
      trap: "Discussing the case widely, investigating beyond the role or writing a summary in a general faculty record.",
      privacy: "Do not enter any case detail, name, allegation or identifying information here."
    },
    {
      id: "incident-response",
      title: "Respond to and report an accident, incident or urgent WHS event",
      summary: "Make the situation safe, escalate and complete the official reporting trail.",
      area: "people", phase: "triggered", procedureOnly: true, priority: "critical", timing: "Immediately when an accident, incident or urgent hazard occurs",
      owner: "Staff responder; Principal/WHS role accountable", verifier: "Principal / WHS delegate", systemIds: ["incident-reporting", "sentral", "whs-system"],
      source: "Guide D8/D22 + Department incident front door", sourceState: "front-door-current",
      steps: [
        "Protect people first: stop work, provide emergency assistance and call 000 where required.",
        "Notify the current school emergency/WHS roles and preserve the scene/evidence only as directed.",
        "Complete the official incident report and required notifications through the current process.",
        "Isolate plant, room or activity until authorised controls or clearance are in place.",
        "Track corrective actions to verified closure in the owner system."
      ],
      doneWhen: "People are safe, required notifications and official reports are complete, and every corrective action is verified closed or controlled.",
      why: "Immediate response, formal reporting and corrective closure are separate responsibilities.",
      trap: "Putting incident details into a general meeting minute or reopening an area before authorised clearance.",
      privacy: "No names, injuries, witness accounts or incident details belong here."
    },
    {
      id: "media-enquiry",
      title: "Handle a media enquiry or serious-incident media interest",
      summary: "Refer the enquiry through current authorised communications channels without improvising a response.",
      area: "people", phase: "triggered", procedureOnly: true, priority: "critical", timing: "Immediately when media contact occurs",
      owner: "Principal / acting Principal", verifier: "Authorised communications role", systemIds: ["sentral"],
      source: "Guide D23; source contacts are old and restricted", sourceState: "critical-gap",
      steps: [
        "Do not provide comment, personal information or incident detail unless currently authorised.",
        "Record the caller/outlet and request only in the restricted current process.",
        "Notify the Principal/acting Principal and use the current Department communications route.",
        "Follow the approved response and retain only the required protected record."
      ],
      doneWhen: "The enquiry has been transferred to the authorised role and any communication follows the current approved protocol.",
      why: "The Drive source includes older individual contacts that should not be reused or published.",
      trap: "Trying to be helpful by confirming facts or reusing an old contact list.",
      privacy: "Keep all enquiry, contact, student, staff and incident details restricted."
    },
    {
      id: "vet-handoff",
      title: "Hand VET-specific work to the VET Compliance Workboard",
      summary: "Keep TAS leadership and VET compliance connected without duplicating controlled RTO work.",
      area: "faculty", phase: "ongoing", priority: "high", timing: "Whenever a TAS action crosses into VET delivery or compliance",
      owner: "Head Teacher TAS / Head Teacher VET", verifier: "Relevant VET or school authority", systemIds: ["vet-workboard"],
      source: "Guide A–D cross-references to E–I", sourceState: "mapped",
      steps: [
        "Identify the TAS action and the specific VET boundary: delivery authority, assessment, evidence, placement, NESA/RTO data or credentialling.",
        "Open the VET Compliance Workboard and follow the current VET owner-system route.",
        "Assign the work to the authorised VET role instead of reproducing controlled instructions in the TAS site.",
        "Keep only a privacy-safe hand-off and completion reference in the appropriate workboard."
      ],
      doneWhen: "The VET component has a clear authorised owner and is tracked in the VET workboard/current RTO system without duplication.",
      why: "The Head Teacher guide deliberately crosses from A–D into E–I, but the two roles have different compliance boundaries.",
      trap: "Treating all VET tasks as generic TAS administration or maintaining two versions of a controlled RTO process.",
      privacy: "VET learner, assessment and credential data stays in authorised VET systems."
    }
  ];

  const sourceGroups = [
    {
      id: "calendar",
      title: "Current calendar authority",
      status: "current",
      body: "The 2026 Staff School Calendar was read live on 26 August 2026. Its exact 2026 dates drive this candidate. They are a pattern only for future years."
    },
    {
      id: "guide",
      title: "Head Teacher TAS Reference Guide A–D",
      status: "mixed",
      body: "The guide provides the operational index and local context. Most rows say updated 2025, but many instructions and links are older. It is a reference and discovery source, not automatic proof of current policy."
    },
    {
      id: "drive",
      title: "WWHS TAS Drive A–D",
      status: "restricted",
      body: "Current pockets exist beside legacy material. Approved staff hubs are connected at the owner's request, but their permissions remain owner-controlled. Continue the sharing audit and never add student, incident, personnel or other sensitive descendant links."
    },
    {
      id: "owner-systems",
      title: "Current owner systems",
      status: "current",
      body: "Sentral, live NESA pages, MyPL, protected reporting routes and current school systems remain the record. The workboard stores only privacy-safe task status and pointers."
    }
  ];

  window.HT_TAS_WORKBOARD = {
    config: {
      buildId: "wwhs-head-teacher-tas-2026-08-26-live-a",
      version: "0.4.0",
      operatingYear: 2026,
      calendarChecked: "2026-08-26",
      storageKey: "wwhs-head-teacher-tas-workboard:v2",
      backupKind: "WWHS-HEAD-TEACHER-TAS-WORKBOARD-BACKUP",
      releaseState: "PUBLISHED WORKBOARD — OWNER SYSTEMS REMAIN THE RECORD"
    },
    systems,
    tasks,
    sourceGroups,
    weeklyChecks: [
      "Scan the live Staff School Calendar and NESA action page for changes.",
      "Close or carry faculty/executive meeting actions with an owner and date.",
      "Confirm staffing, class coverage and practical-area restrictions.",
      "Look 30 days ahead for assessment, reporting, selection and event deadlines.",
      "Review unresolved WHS, maintenance, chemical and machinery exceptions."
    ],
    retiredItems: [
      "Triple A radio interview — source explicitly says it no longer happens.",
      "Staff Christmas drinks and farewell material — social/reference only, not an operational control.",
      "Reflection Centre and student-directed-learning proposals — inactive unless current executive approval is confirmed.",
      "Old 2017 maintenance instructions, 2019 induction handbook, 2022 calendar links and 2024 NESA copies — historical reference only."
    ]
  };
})();
