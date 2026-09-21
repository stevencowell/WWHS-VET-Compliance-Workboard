(function () {
  "use strict";

  // Presentation copy only. Stable task IDs and step positions preserve saved progress.
  // Match sourceSteps before using a rewritten checklist after future source updates.
  window.WWHS_TASK_COPY = window.WWHS_TASK_COPY || {};
  window.WWHS_TASK_COPY.tas = {
    "t1-year-opening-readiness": {
      "title": "Get TAS classes and practical rooms ready for Term 1",
      "purpose": "Check that teachers, programs, rooms and access are ready before students begin the year.",
      "finished": "Every class and practical room is ready for its approved work, or a safe alternative has a responsible person and deadline in the school system.",
      "sourceFinished": "Every TAS class and practical room is ready for the approved work, or a safe, time-bound exception is owned in the correct system.",
      "steps": [
        "Check current classes, teachers, rooms and timetables in Sentral.",
        "Check that each class has a current program, a responsible teacher, an approved learning space and an assessment plan.",
        "Check practical rooms, machinery restrictions, protective equipment and footwear, equipment-safety learning and essential staff access.",
        "Check that staff can find student support and health information through the protected school system without copying it.",
        "Give each outstanding issue a responsible person, a due date and an approved place for its supporting records."
      ],
      "sourceSteps": [
        "Confirm current classes, teachers, rooms and timetable state in Sentral.",
        "Confirm each class has an owned current program, approved learning space and assessment pathway.",
        "Check practical rooms, plant restrictions, PPE/footwear, equipment-safety learning and essential staff access.",
        "Confirm staff can use the protected route for learner support and health information without copying it.",
        "Own every exception with a role, due date and authorised evidence location."
      ]
    },
    "t1-student-review-cycle": {
      "title": "Prepare for assigned Term 1 reviews and assemblies",
      "purpose": "Check the current roster and complete the review, wellbeing or assembly work actually assigned to TAS.",
      "finished": "Each assigned Term 1 contribution is complete, with follow-up allocated in the protected system. Events requiring no TAS action have been checked.",
      "sourceFinished": "Each applicable Term 1 contribution is complete and protected follow-up is owned; non-applicable events have been checked rather than assumed.",
      "steps": [
        "Check each event in the live calendar and current roster; do not assume last year's pattern still applies.",
        "Confirm what TAS must do, what information is needed and which protected system to use.",
        "Complete only the assigned work, keeping student and roster details in the protected system.",
        "Give any follow-up a responsible person in the approved system."
      ],
      "sourceSteps": [
        "Check each live event and current roster rather than assuming the historical pattern.",
        "Confirm the TAS role, required information and protected owner system.",
        "Complete only the assigned contribution and keep learner or roster details protected.",
        "Give any follow-up a clear owner in the authorised system."
      ]
    },
    "t1-vet-white-card-handoff": {
      "title": "Arrange any TAS support for White Card training",
      "purpose": "Check whether White Card training affects TAS rooms, staff or timetables, then pass VET requirements to the responsible VET staff.",
      "finished": "Any effects on TAS have been addressed and the VET work has an authorised person responsible for it.",
      "sourceFinished": "Any TAS operational impact is controlled and the VET component has an authorised owner in the VET workflow.",
      "steps": [
        "Confirm the current activity, its effect on TAS and who is responsible.",
        "Resolve room, staffing or timetable changes through the school systems.",
        "Use the VET workboard for delivery approval, attendance, evidence and qualification or statement requirements.",
        "Record only a handover reference without personal details, or a checked decision that TAS has no action."
      ],
      "sourceSteps": [
        "Confirm the live activity, TAS impact and accountable roles.",
        "Resolve any room, staffing or timetable impact through school systems.",
        "Open the VET Compliance Workboard for delivery authority, attendance, evidence and credentialling controls.",
        "Record only a privacy-safe TAS hand-off or not-applicable decision here."
      ]
    },
    "t1-parent-teacher-evening": {
      "title": "Prepare TAS staff for Term 1 parent–teacher interviews",
      "purpose": "Arrange attendance, access to current student information and a clear way to follow up after interviews.",
      "finished": "Staff are prepared, attendance is covered and each necessary follow-up has a responsible person in the approved protected system.",
      "sourceFinished": "Faculty staff are prepared, attendance is covered and required follow-up has an owner in the authorised system.",
      "steps": [
        "Confirm the current event details, interview booking system and staff attendance expectations.",
        "Check that staff can access current assessment, progress and support information in the approved systems.",
        "Arrange coverage and who staff should contact about complex or sensitive conversations.",
        "After interviews, allocate any required follow-up in the appropriate protected system."
      ],
      "sourceSteps": [
        "Confirm the live event, interview module and faculty attendance expectations.",
        "Check staff access to current assessment, progress and support information in authorised systems.",
        "Plan coverage and an escalation route for complex or sensitive conversations.",
        "After the event, ensure required follow-up is owned in the correct protected system."
      ]
    },
    "t1-nesa-disability-provisions": {
      "title": "Check TAS duties for NESA disability provisions",
      "purpose": "Find out whether TAS must contribute to the current disability-provisions action and who is authorised to submit it.",
      "finished": "The current NESA action has been checked and the TAS contribution is confirmed complete, or formally confirmed as not required.",
      "sourceFinished": "The live action has been checked and the TAS contribution is verified complete or formally not applicable.",
      "steps": [
        "Open the current NESA Timetable of Actions and check exactly what the action covers.",
        "Confirm whether TAS must provide anything and who may submit or verify it.",
        "Complete any required contribution through the approved protected system.",
        "Record a completion reference without personal details, or a verified decision that TAS has no action."
      ],
      "sourceSteps": [
        "Open the current NESA Timetable of Actions and confirm the exact action and scope.",
        "Confirm whether TAS must provide anything and who is authorised to submit or verify it.",
        "Complete any contribution only through the protected owner system.",
        "Record a safe completion reference or verified not-applicable decision."
      ]
    },
    "t2-year12-report-chain": {
      "title": "Check and submit Term 2 Year 12 reports",
      "purpose": "Check Year 12 reports, return corrections and follow them through office submission and release.",
      "finished": "Every applicable Year 12 TAS report has been checked, corrected where needed, submitted to the office and confirmed issued.",
      "sourceFinished": "Every applicable Year 12 report has completed all three authorised milestones.",
      "steps": [
        "Confirm the current Year 12 classes and who is responsible for each report.",
        "Check assessment evidence, results and comments using the approved reporting process.",
        "Return any corrections to the teacher and check the revised reports.",
        "Confirm office submission and report issue through the school reporting system."
      ],
      "sourceSteps": [
        "Confirm classes and reporting owners.",
        "Check evidence, results and comments in the approved process.",
        "Return and recheck corrections.",
        "Confirm office hand-off and issue in the owner system."
      ]
    },
    "t2-year11-report-chain": {
      "title": "Check and submit Term 2 Year 11 reports",
      "purpose": "Check Year 11 reports, return corrections and follow them through office submission and release.",
      "finished": "Every applicable Year 11 TAS report has been checked, corrected where needed, submitted to the office and confirmed issued.",
      "sourceFinished": "Every applicable Year 11 report has completed all three authorised milestones.",
      "steps": [
        "Confirm the current Year 11 classes and who is responsible for each report.",
        "Check assessment evidence, results and comments using the approved reporting process.",
        "Return any corrections to the teacher and check the revised reports.",
        "Confirm office submission and report issue through the school reporting system."
      ],
      "sourceSteps": [
        "Confirm classes and reporting owners.",
        "Check evidence, results and comments.",
        "Return and recheck corrections.",
        "Confirm office hand-off and issue."
      ]
    },
    "t2-year8-report-chain": {
      "title": "Check and submit Term 2 Year 8 reports",
      "purpose": "Check Year 8 reports, return corrections and follow them through office submission and release.",
      "finished": "Every applicable Year 8 TAS report has been checked, corrected where needed, submitted to the office and confirmed issued.",
      "sourceFinished": "Every applicable Year 8 report has completed its authorised milestones.",
      "steps": [
        "Confirm the current Year 8 classes and who is responsible for each report.",
        "Check assessment evidence, grades and comments using the approved reporting process.",
        "Return any corrections to the teacher and check the revised reports.",
        "Confirm office submission and report issue through the school reporting system."
      ],
      "sourceSteps": [
        "Confirm classes and owners.",
        "Check evidence, grades and comments.",
        "Return and recheck corrections.",
        "Confirm office hand-off and issue."
      ]
    },
    "t2-year9-report-chain": {
      "title": "Check and submit Term 2 Year 9 reports",
      "purpose": "Check Year 9 reports, return corrections and follow them through office submission and release.",
      "finished": "Every applicable Year 9 TAS report has been checked, corrected where needed, submitted to the office and confirmed issued.",
      "sourceFinished": "Every applicable Year 9 report has completed its authorised milestones.",
      "steps": [
        "Confirm the current Year 9 classes and who is responsible for each report.",
        "Check assessment evidence, grades and comments using the approved reporting process.",
        "Return any corrections to the teacher and check the revised reports.",
        "Confirm office submission and report issue through the school reporting system."
      ],
      "sourceSteps": [
        "Confirm classes and owners.",
        "Check evidence, grades and comments.",
        "Return and recheck corrections.",
        "Confirm office hand-off and issue."
      ]
    },
    "t2-year10-report-chain": {
      "title": "Check and submit Term 2 Year 10 reports",
      "purpose": "Check Year 10 reports, return corrections and follow them through office submission and release.",
      "finished": "Every applicable Year 10 TAS report has been checked, corrected where needed, submitted to the office and confirmed issued.",
      "sourceFinished": "Every applicable Year 10 report has completed its authorised milestones.",
      "steps": [
        "Confirm the current Year 10 classes and who is responsible for each report.",
        "Check assessment evidence, grades and comments using the approved reporting process.",
        "Return any corrections to the teacher and check the revised reports.",
        "Confirm office submission and report issue through the school reporting system."
      ],
      "sourceSteps": [
        "Confirm classes and owners.",
        "Check evidence, grades and comments.",
        "Return and recheck corrections.",
        "Confirm office hand-off and issue."
      ]
    },
    "t4-year9-report-chain": {
      "title": "Check and submit Term 4 Year 9 reports",
      "purpose": "Check Year 9 reports and return corrections in time for the confirmed office deadline.",
      "finished": "Every applicable Year 9 TAS report has been checked, corrected where needed and submitted by the office deadline.",
      "sourceFinished": "Every applicable Year 9 TAS report is checked and submitted by the office deadline.",
      "steps": [
        "Confirm the current Year 9 classes and who is responsible for each report.",
        "Check assessment evidence, grades and comments using the approved reporting process.",
        "Return any corrections to the teacher and check the revised reports.",
        "Confirm submission to the office through the school reporting system."
      ],
      "sourceSteps": [
        "Confirm classes and reporting owners.",
        "Check evidence, grades and comments.",
        "Return and recheck corrections.",
        "Confirm office submission."
      ]
    },
    "t4-year7-report-chain": {
      "title": "Check and submit Term 4 Year 7 reports",
      "purpose": "Check Year 7 reports and return corrections in time for the confirmed office deadline.",
      "finished": "Every applicable Year 7 TAS report has been checked, corrected where needed and submitted by the office deadline.",
      "sourceFinished": "Every applicable Year 7 TAS report is checked and submitted by the office deadline.",
      "steps": [
        "Confirm the current Year 7 classes and who is responsible for each report.",
        "Check assessment evidence, grades and comments using the approved reporting process.",
        "Return any corrections to the teacher and check the revised reports.",
        "Confirm submission to the office through the school reporting system."
      ],
      "sourceSteps": [
        "Confirm classes and reporting owners.",
        "Check evidence, grades and comments.",
        "Return and recheck corrections.",
        "Confirm office submission."
      ]
    },
    "t4-year8-report-chain": {
      "title": "Check and submit Term 4 Year 8 reports",
      "purpose": "Check Year 8 reports and return corrections in time for the confirmed office deadline.",
      "finished": "Every applicable Year 8 TAS report has been checked, corrected where needed and submitted by the office deadline.",
      "sourceFinished": "Every applicable Year 8 TAS report is checked and submitted by the office deadline.",
      "steps": [
        "Confirm the current Year 8 classes and who is responsible for each report.",
        "Check assessment evidence, grades and comments using the approved reporting process.",
        "Return any corrections to the teacher and check the revised reports.",
        "Confirm submission to the office through the school reporting system."
      ],
      "sourceSteps": [
        "Confirm classes and reporting owners.",
        "Check evidence, grades and comments.",
        "Return and recheck corrections.",
        "Confirm office submission."
      ]
    },
    "t2-student-review-cycle": {
      "title": "Prepare for assigned Term 2 reviews and assemblies",
      "purpose": "Check the current roster and complete the review, wellbeing or assembly work actually assigned to TAS.",
      "finished": "Each assigned Term 2 contribution is complete and any follow-up has a responsible person in the approved protected system.",
      "sourceFinished": "Each applicable Term 2 contribution is complete and protected follow-up is owned.",
      "steps": [
        "Check each event in the live calendar and current roster.",
        "Confirm the TAS role and where protected information must be handled.",
        "Complete only the contribution assigned to TAS or the Head Teacher.",
        "Allocate follow-up to a responsible person in the approved system."
      ],
      "sourceSteps": [
        "Check each live event and current roster.",
        "Confirm the TAS role and protected information route.",
        "Complete only the assigned contribution.",
        "Own follow-up in the authorised system."
      ]
    },
    "t2-vet-placement-handoff": {
      "title": "Arrange TAS support for Year 12 work placement",
      "purpose": "Resolve any TAS timetable, room or staffing changes, while the authorised VET staff manage placement requirements.",
      "finished": "Any effects on TAS have been addressed and an authorised VET staff member is responsible for the placement work.",
      "sourceFinished": "TAS impacts are controlled and the VET placement workflow has the correct authorised owner.",
      "steps": [
        "Confirm the current placement dates and how TAS is affected.",
        "Resolve timetable, room or staffing changes through the school systems.",
        "Use the VET workboard for placement readiness, arrangements, monitoring and evidence requirements.",
        "Record only a handover reference without personal details, or a checked decision that TAS has no action."
      ],
      "sourceSteps": [
        "Confirm the live placement window and TAS impact.",
        "Resolve timetable, room or staffing effects through school systems.",
        "Open the VET workboard for readiness, placement, monitoring and evidence controls.",
        "Record only a safe TAS hand-off or not-applicable decision."
      ]
    },
    "t2-year7-report-chain": {
      "title": "Check and submit Term 2 Year 7 reports",
      "purpose": "Check Year 7 reports and confirm the office deadline from the live calendar before arranging submission and release.",
      "finished": "The office deadline is confirmed and every applicable Year 7 report has been checked, corrected, submitted and confirmed issued.",
      "sourceFinished": "The live office date has been confirmed and every applicable Year 7 report has completed the authorised chain.",
      "steps": [
        "Confirm current Year 7 classes and who is responsible for each report.",
        "Check assessment evidence, grades and comments.",
        "Confirm the Year 7 office deadline in the live calendar or reporting system; do not guess it.",
        "Return and recheck corrections, then confirm office submission and report issue."
      ],
      "sourceSteps": [
        "Confirm classes and owners.",
        "Check evidence, grades and comments.",
        "Confirm the Year 7 office hand-off date in the live calendar/reporting process; do not infer it.",
        "Return and recheck corrections, then confirm office hand-off and issue."
      ]
    },
    "t3-info-evening": {
      "title": "Prepare TAS information for the Year 9/8 subject evening",
      "purpose": "Have current course information, fees and staff contacts ready for families choosing next year's subjects.",
      "finished": "Approved TAS information is ready, staff know their roles and VET questions have a clear route to the responsible VET staff.",
      "sourceFinished": "The current approved TAS information is ready, the responsible staff know their role and every VET query has a clear hand-off.",
      "steps": [
        "Check the event time, audience and TAS contribution in the live staff calendar.",
        "Check that next year's course descriptions, approved offerings and fees match the current school handbook.",
        "Remove or replace old links, out-of-date VET promotional material and unapproved course claims.",
        "Confirm who will answer TAS questions and direct VET questions to the VET workboard or current RTO information.",
        "Record the event-readiness sign-off in the approved team record without personal details."
      ],
      "sourceSteps": [
        "Confirm the event time, audience and TAS contribution in the live Staff School Calendar.",
        "Check that 2027 course descriptions, approved offerings and fee information match the current school handbook.",
        "Remove or replace superseded links, old VET marketing material and unapproved course claims.",
        "Confirm who will answer TAS questions and route VET questions to the VET workboard/current RTO information.",
        "Record a privacy-safe event-readiness sign-off in the approved team record."
      ]
    },
    "t3-year12-report-chain": {
      "title": "Check and submit Term 3 Year 12 reports",
      "purpose": "Check Year 12 marks, grades and comments, return corrections, then confirm office submission and report issue.",
      "finished": "Every applicable Year 12 TAS report has been checked, corrected where needed, submitted by the office deadline and confirmed issued.",
      "sourceFinished": "Every applicable Year 12 TAS report is checked, corrected where needed, submitted by the office milestone and confirmed through the school reporting process.",
      "steps": [
        "Confirm all current Year 12 TAS classes and the teacher responsible for each report in Sentral.",
        "Check marks and grades against approved assessment evidence and the current schedule.",
        "Check comments against current school reporting guidance, style and faculty quality expectations.",
        "Return corrections early enough for the teacher to meet the confirmed office deadline.",
        "Confirm submission and later issue in the reporting system; keep only a completion reference here."
      ],
      "sourceSteps": [
        "Confirm every current Year 12 TAS class and reporting owner in Sentral.",
        "Check marks/grades against the approved assessment evidence and current schedule.",
        "Check comments against current school style, reporting guidance and faculty quality criteria.",
        "Return corrections to the teacher with enough time to meet the 4 September office deadline.",
        "Confirm submission and later issue in the owner system; record only a safe completion reference here."
      ]
    },
    "t3-parent-teacher": {
      "title": "Prepare TAS staff for Term 3 parent–teacher interviews",
      "purpose": "Arrange bookings, attendance and access to current evidence so staff can hold useful conversations and follow up safely.",
      "finished": "Staff are prepared, bookings and attendance are covered, and each necessary follow-up has a responsible person in the protected system.",
      "sourceFinished": "Faculty staff are prepared, bookings and attendance are covered, and required follow-up has an owner in the authorised system.",
      "steps": [
        "Confirm the current event details, interview booking system and staff attendance expectations.",
        "Check that staff can access current assessment, progress and support information in the approved systems.",
        "Arrange coverage and who staff should contact about complex or sensitive conversations.",
        "After interviews, allocate and record any necessary follow-up in the appropriate protected system."
      ],
      "sourceSteps": [
        "Confirm the live event details, interview module and faculty attendance expectations.",
        "Check that staff can access current assessment, progress and support information in authorised systems.",
        "Plan coverage and a clear escalation route for complex or sensitive conversations.",
        "After the event, ensure any necessary follow-up is owned and recorded in the correct protected system."
      ]
    },
    "student-review-cycle": {
      "title": "Prepare for assigned student reviews and assemblies",
      "purpose": "Use the current calendar and roster to identify TAS responsibilities, then prepare only the work assigned.",
      "finished": "The event and TAS role are confirmed, the assigned contribution is complete and follow-up has a responsible person in the protected system.",
      "sourceFinished": "The current event and TAS responsibility are confirmed, the assigned contribution is complete and protected follow-up has an owner.",
      "steps": [
        "Check the live event and current roster; do not assume the old Weeks 4/8 pattern still applies.",
        "Confirm what TAS or the Head Teacher must do, what information is needed and which protected system to use.",
        "Prepare the contribution without exporting student, wellbeing or staff-roster details.",
        "Attend or complete the assigned action and record only a completion reference without personal details.",
        "Allocate any follow-up in the appropriate protected system."
      ],
      "sourceSteps": [
        "Check the live event and current roster rather than assuming the historical Weeks 4/8 pattern.",
        "Confirm the TAS/Head Teacher role, required information and protected owner system.",
        "Prepare the contribution without exporting learner, wellbeing or staff-roster details.",
        "Attend or complete the assigned action and record only a safe completion pointer.",
        "Own any follow-up in the appropriate protected system."
      ]
    },
    "t3-nesa-submission-check": {
      "title": "Check and complete TAS duties for the Term 3 NESA submission",
      "purpose": "Identify the current NESA submission, check whether TAS must contribute and get required information to the authorised submitter.",
      "finished": "The current NESA action has been checked and the TAS contribution is confirmed complete, or formally confirmed as not required.",
      "sourceFinished": "The live NESA action has been checked and the TAS contribution is either verified complete or formally confirmed as not applicable.",
      "steps": [
        "Open the current NESA Timetable of Actions and confirm the relevant submission, what it covers and its deadline.",
        "Check whether TAS has any applicable courses, entries or information to provide.",
        "Confirm who is authorised to submit and when the school needs its internal checks finished.",
        "Supply and check only the required information through the approved system.",
        "Record the authorised completion reference or a verified decision that TAS has no action."
      ],
      "sourceSteps": [
        "Open the live NESA Timetable of Actions and identify the exact 15 September action.",
        "Confirm whether TAS has any applicable courses, entries or data to provide.",
        "Confirm the authorised submitting role and internal checking deadline.",
        "Supply and verify only the information required through the approved owner system.",
        "Record the authorised completion reference or a verified not-applicable decision."
      ]
    },
    "t4-year11-report-chain": {
      "title": "Check and submit Year 11 reports and required grades",
      "purpose": "Complete the report checks and the separate grade or Life Skills handover, using each process's current deadline.",
      "finished": "Reports and applicable grades are checked, submitted through the correct school and NESA routes, and report issue is confirmed.",
      "sourceFinished": "Reports and applicable grades are checked, submitted through the correct routes and confirmed at the release milestone.",
      "steps": [
        "Confirm current Year 11 TAS classes, reporting teachers and applicable grade requirements.",
        "Check evidence, marks or grades and comments against the approved schedule and reporting guidance.",
        "Confirm the separate grade or Life Skills handover with the authorised Deputy, then confirm required data reaches the authorised NESA submitter by the current deadline. Do not assume the Head Teacher is the submitter.",
        "Finish corrections before the confirmed office deadline and confirm the authorised report issue date."
      ],
      "sourceSteps": [
        "Confirm the current Year 11 TAS classes, reporting owners and applicable grade requirements.",
        "Check evidence, marks/grades and comments using the approved schedule and reporting guidance.",
        "Confirm the separate 16 October grade/Life Skills hand-off with the authorised Deputy role, then confirm applicable Year 11 data reaches the authorised NESA submitter for the 21 October deadline. The Head Teacher is not assumed to be that submitter.",
        "Close corrections before the 23 October office deadline and confirm issue on 6 November."
      ]
    },
    "t4-year10-report-chain": {
      "title": "Check and submit Year 10 reports and NESA grades",
      "purpose": "Check reports, then send the required grades and reports through their separate approved school routes.",
      "finished": "Reports and NESA grades have passed the required checks and reached their separate authorised destinations by their confirmed deadlines.",
      "sourceFinished": "Reports and NESA grades have passed the correct checks and reached their separate authorised destinations on time.",
      "steps": [
        "Match each current Year 10 TAS class to the teachers responsible for reports and grades.",
        "Check reports against approved assessment evidence and current grade descriptors.",
        "Confirm the current NESA grade handover date and route with the authorised Deputy or data staff member.",
        "Resolve corrections and confirm office submission by the current deadline."
      ],
      "sourceSteps": [
        "Reconcile each current Year 10 TAS class with its reporting and grade owner.",
        "Check reports against approved assessment evidence and current grade descriptors.",
        "Verify the 5 November NESA grade hand-off with the authorised Deputy/data role.",
        "Resolve corrections and confirm the 11 November office submission."
      ]
    },
    "t4-showcase": {
      "title": "Prepare and run the TAS/VET Showcase and Open Day",
      "purpose": "Arrange approved displays, activities, staffing and safety, with VET promotional information checked by the responsible VET staff.",
      "finished": "The approved TAS contribution has been delivered safely, VET content is verified and follow-up is complete or allocated to a responsible person.",
      "sourceFinished": "The approved TAS contribution is safely staffed and delivered, VET content is verified, and follow-up actions are closed or owned.",
      "steps": [
        "Confirm the event brief, TAS contribution, rooms, staffing and details in the live school calendar.",
        "Check displays and activities meet current safety, consent, privacy and communications requirements before approval.",
        "Assign setup, supervision, pack-down and follow-up responsibilities.",
        "Have the VET Coordinator check VET promotion and compliance claims against current approved sources.",
        "Record a short post-event review and who will complete any follow-up."
      ],
      "sourceSteps": [
        "Confirm the event brief, TAS scope, rooms, staffing and live school calendar details.",
        "Approve displays and activities against current WHS, consent, privacy and communications requirements.",
        "Assign setup, supervision, pack-down and follow-up responsibilities.",
        "Route VET promotion and compliance claims to the VET Coordinator/current controlled sources.",
        "Record a short post-event review and owned actions."
      ]
    },
    "t4-report-release": {
      "title": "Confirm Years 7–10 reports are ready to issue",
      "purpose": "Bring together the separate year-group report checks and deal with any remaining TAS issues before release.",
      "finished": "Every TAS reporting process is complete before release, or an outstanding issue has an authorised decision and a responsible person.",
      "sourceFinished": "Every TAS reporting chain is closed or has an authorised, owned exception before release.",
      "steps": [
        "Check progress on the Year 7, 8, 9 and 10 reporting processes.",
        "Resolve remaining TAS issues before release, or obtain an authorised decision and allocate responsibility.",
        "Confirm the school reporting system shows the expected release status.",
        "Carry improvement actions into next year's plan without student or report details."
      ],
      "sourceSteps": [
        "Review the Year 7, 8, 9 and 10 reporting-chain statuses.",
        "Resolve or formally own any remaining TAS exception before release.",
        "Confirm the authorised reporting system shows the expected release state.",
        "Carry only privacy-safe improvement actions into the next annual plan."
      ]
    },
    "t4-enrichment": {
      "title": "Prepare any assigned TAS contribution to Year 10 Enrichment",
      "purpose": "Confirm whether the current program needs TAS support before preparing staff, resources or activities for it.",
      "finished": "The assigned TAS contribution is approved and ready, or the executive program lead has confirmed that TAS has no action.",
      "sourceFinished": "The TAS contribution is approved and ready, or the executive program lead has confirmed that TAS has no action.",
      "steps": [
        "Confirm the current program, the TAS role and the participating year group or students in the protected system.",
        "Approve staffing, resources and any required safety measures.",
        "Brief participating staff and check the effect on timetables.",
        "Record completion or a verified decision that TAS has no action."
      ],
      "sourceSteps": [
        "Confirm the current program, TAS role and cohort.",
        "Approve staffing, resources and any safety controls.",
        "Brief participating staff and confirm timetable impacts.",
        "Record completion or a verified not-applicable decision."
      ]
    },
    "hsc-analysis-cycle": {
      "title": "Use HSC results to choose teaching improvements",
      "purpose": "Review current RAP/SCOUT results securely and agree a few practical changes to teaching, programs or staff development.",
      "finished": "Results have informed clear improvement actions, with responsible staff and review dates recorded in the approved faculty plan.",
      "sourceFinished": "Current results have produced named, evidence-informed improvement actions in the approved faculty planning record.",
      "steps": [
        "Confirm authorised access to current RAP/SCOUT results after they are released.",
        "Look for cohort and question-level patterns without exporting identifiable data into the workboard.",
        "Agree a small number of course-specific improvements, with responsible staff and review dates.",
        "Include the agreed actions in current programs, professional learning and the Faculty Management Plan."
      ],
      "sourceSteps": [
        "Confirm authorised access to the current RAP/SCOUT results after release.",
        "Analyse cohort and question-level patterns without exporting identifiable data to the workboard.",
        "Agree a small number of course-specific improvement actions with owners and review dates.",
        "Map the actions into current programs, professional learning and the Faculty Management Plan."
      ]
    },
    "t2-hsc-practical-options-handoff": {
      "title": "Confirm TAS HSC practical exam options reached the submitter",
      "purpose": "Check which practical courses need an options entry and confirm the authorised school role received and handled the TAS information.",
      "finished": "The authorised school role has confirmed the relevant TAS handover and submission status, or confirmed that TAS did not need to contribute.",
      "sourceFinished": "The authorised school role has confirmed the applicable faculty hand-off and submission position, or confirmed that no TAS contribution was required.",
      "steps": [
        "Check which delivered HSC practical courses require an options entry in the relevant NESA timetable.",
        "Check the protected school record and confirm the course teacher's information reached the authorised submitter.",
        "Confirm the actual submission or an authorised decision that it was not required; a passed date does not prove completion.",
        "Refer unresolved issues to the authorised school or NESA role and record only a reference without personal details."
      ],
      "sourceSteps": [
        "Confirm which delivered HSC practical courses required an options entry in the 2026 timetable.",
        "Check the protected owner-system record and confirm the course-teacher information reached the authorised submitter.",
        "Confirm the actual submission or an authorised not-applicable decision; do not infer completion from the date passing.",
        "Carry any unresolved issue to the authorised school/NESA role and record only an appropriate safe reference."
      ]
    },
    "t3-hsc-results-certification-handoff": {
      "title": "Confirm TAS information is ready for HSC results certification",
      "purpose": "Get any required TAS data or corrections to the authorised school role before the Principal's certification deadline.",
      "finished": "The authorised certifying role has accepted the TAS contribution and each discrepancy is resolved or assigned for formal follow-up.",
      "sourceFinished": "The authorised certifying role has accepted the applicable TAS contribution and every identified discrepancy is resolved or formally owned.",
      "steps": [
        "Confirm the applicable TAS HSC courses and who is authorised to certify the school's results.",
        "Check required faculty data and corrections have reached that person. Keep VET-specific data within the VET process.",
        "Confirm the handover is accepted and responsibility for discrepancies is assigned before the current NESA certification deadline.",
        "Record a confirmation reference or authorised decision that no action applies. Ticking this workboard does not let the Head Teacher certify for the Principal."
      ],
      "sourceSteps": [
        "Confirm applicable TAS HSC courses and the authorised role responsible for school results certification.",
        "Check that required faculty data and corrections from the relevant submission process have reached that role; keep VET-specific data with the VET workflow.",
        "Confirm the hand-off is accepted and any discrepancies are owned before the 18 September NESA certification deadline.",
        "Record a safe confirmation reference or an authorised not-applicable decision; the Head Teacher does not certify on the Principal's behalf through this workboard."
      ]
    },
    "hsc-practical-certification-handoff": {
      "title": "Check HSC practical declarations and certification handovers",
      "purpose": "Use each practical course's current NESA instructions to arrange declarations and get certification matters to the authorised school role.",
      "finished": "Current course requirements and dates are confirmed, and the authorised school role has accepted the declarations and certification handover or is managing any exception.",
      "sourceFinished": "The current course-specific requirements and dates are confirmed and the authorised school role has accepted the applicable declaration/certification hand-off or is managing the relevant exception.",
      "steps": [
        "Identify relevant practical courses and check each submission and certification date in current NESA course instructions.",
        "Get the current course-specific declaration and certification instructions through the authorised Schools Online route.",
        "Check required teacher and student declarations have been handed over, and raise any inability to certify with the authorised school role.",
        "If required, follow the current NESA non-certification process and timing. Do not assume all practical courses share one deadline.",
        "Confirm the authorised school role has accepted the handover and record only a status reference without personal details."
      ],
      "sourceSteps": [
        "Identify delivered practical courses and confirm each current submission and certification date in the live NESA course instructions.",
        "Obtain the current course-specific declaration and practical certification instructions through the authorised Schools Online route.",
        "Confirm the required course-teacher and student declaration hand-offs and raise any inability to certify with the authorised school role.",
        "Use the current NESA non-certification route and timing if applicable; do not invent a common deadline for all practical courses.",
        "Confirm the authorised school role has accepted the hand-off and record only a safe status reference."
      ]
    },
    "source-sharing-review": {
      "title": "Check that confidential Head Teacher files are private",
      "purpose": "Review access to Head Teacher Drive folders and test that confidential material cannot be opened by unauthorised people.",
      "finished": "Signed-out and unauthorised users cannot open restricted material, approved staff can still access it and the review is recorded in the approved place.",
      "sourceFinished": "Anonymous and unauthorised access fails, approved staff access still works and the review is recorded in the authorised governance location.",
      "steps": [
        "Confirm who is approved to manage the Head Teacher document and A–D Drive folders.",
        "Remove anyone-with-the-link access and review broad groups, old access and personal-account permissions.",
        "Separate confidential staff, student, leave, health, incident and security records from general reference material.",
        "Test the document and a sample of sensitive folders while signed out and using an unauthorised account.",
        "Keep only approved starting-page links here; do not add links to sensitive files or individual cases."
      ],
      "sourceSteps": [
        "Identify the approved owner for the Head Teacher document and A–D Drive branches.",
        "Remove anyone-with-the-link access and review broad group, legacy and personal-domain permissions.",
        "Separate confidential, personnel, student, leave, health, incident and security records from general reference material.",
        "Test the document and sampled sensitive branches while signed out and from an unauthorised account.",
        "Keep only approved hub or front-door links in this workboard; never add case-specific or sensitive descendant links."
      ],
      "kindLabel": "School planning check"
    },
    "annual-calendar-control": {
      "title": "Prepare the TAS calendar for the year",
      "purpose": "Bring together current school and NESA dates, identify TAS responsibilities and allow time for preparation and checking.",
      "finished": "Current dates, internal preparation points, responsible staff and access to the faculty calendar have all been checked.",
      "sourceFinished": "The new year's current owner-system dates, internal checks, owners and calendar access have been verified.",
      "steps": [
        "Open the new year's live staff calendar and current NESA Timetable of Actions.",
        "Separate dates TAS owns, school events requiring a TAS contribution and dates staff only need to know about.",
        "Add preparation and checking points before each external deadline.",
        "Check the live faculty calendar and that staff can access it.",
        "Archive last year's calendar baseline; do not assume its dates apply this year."
      ],
      "sourceSteps": [
        "Open the new year's live Staff School Calendar and current NESA Timetable of Actions.",
        "Identify TAS-owned dates, school-wide contributions and dates that only require awareness.",
        "Add internal preparation and checking points before each external deadline.",
        "Confirm the live faculty calendar and staff access.",
        "Archive the previous baseline without mechanically rolling dates forward."
      ],
      "kindLabel": "School planning check"
    },
    "annual-plan-alignment": {
      "title": "Turn faculty and school priorities into agreed actions",
      "purpose": "Check the approved faculty plan against school priorities and make clear who will act and when progress will be reviewed.",
      "finished": "The current faculty plan is approved and aligned with school priorities, with responsible staff, review dates and appropriate evidence references.",
      "sourceFinished": "The current plan is approved, aligned, owned and supported by privacy-safe evidence references and review dates.",
      "steps": [
        "Confirm the current approved versions of the Faculty Management Plan and School Plan.",
        "Check that faculty priorities, staff development and evidence support the current school directions.",
        "Assign each significant action to a role, an approved place for evidence and a review date.",
        "Review progress each term, then complete, revise or escalate stalled actions."
      ],
      "sourceSteps": [
        "Confirm the current approved Faculty Management Plan and School Plan versions.",
        "Check that faculty priorities, staff development and evidence align to current school directions.",
        "Assign each material action to a role, evidence destination and review point.",
        "Record term progress and close, revise or escalate stalled actions."
      ],
      "kindLabel": "School planning check"
    },
    "annual-rosters-rhythm": {
      "title": "Confirm faculty duties, rosters and meeting times",
      "purpose": "Check current responsibilities and meeting times so staff know their duties, backup arrangements and any changes.",
      "finished": "Staff have acknowledged current responsibilities, clashes are resolved and each recurring duty has a responsible person and backup.",
      "sourceFinished": "Current responsibilities are acknowledged, clashes are resolved and every recurring duty has an owner and back-up.",
      "steps": [
        "Check current Head Teacher, assembly, duty, sport and meeting rosters in the approved school systems.",
        "Confirm faculty responsibilities and backup arrangements without publishing personal schedules.",
        "Verify current executive and faculty meeting days and times; do not rely on old instructions.",
        "Brief staff on changes and record acknowledgement through the approved staff process."
      ],
      "sourceSteps": [
        "Check the current Head Teacher, assembly, duty, sport and meeting rosters in their owner systems.",
        "Confirm faculty responsibilities and back-up arrangements without duplicating personal schedules publicly.",
        "Verify the current executive and faculty meeting days/times; do not rely on the historical wording alone.",
        "Brief changes and record acknowledgement in the approved staff route."
      ],
      "kindLabel": "School planning check"
    },
    "class-readiness": {
      "title": "Check every TAS class is ready to teach",
      "purpose": "Check current class allocations, teaching materials, access and practical safety arrangements before teaching or after changes.",
      "finished": "Every current class is ready, or an outstanding issue has a responsible person and deadline recorded in the correct school system.",
      "sourceFinished": "Every current class is ready or has a named, time-bound exception in the correct owner system.",
      "steps": [
        "Check current classes and teachers against the live timetable.",
        "Check each class has a program, a responsible teacher, teaching-record location and approved online learning space where used.",
        "Check authorised staff know how to access relevant health and support plans without copying them.",
        "Check protective equipment and footwear, equipment-safety learning, laptop or BYOD arrangements and room readiness against current policy.",
        "Record overall readiness without personal details and allocate each outstanding issue."
      ],
      "sourceSteps": [
        "Reconcile current classes and teachers against the live timetable.",
        "Confirm each class has an owned program, registration/monitoring location and approved online learning space where used.",
        "Confirm authorised staff know how to access relevant health/support plans without copying their content.",
        "Confirm PPE/footwear, equipment-safety learning, laptop/BYOD and room-readiness arrangements under current policy.",
        "Record aggregate readiness and own each exception."
      ],
      "kindLabel": "School planning check"
    },
    "technology-rotations": {
      "title": "Check Years 7–8 Technology rotations match the timetable",
      "purpose": "Keep class rotations, teachers, rooms and changeover arrangements consistent with the current timetable throughout the year.",
      "finished": "The approved rotation plan, live timetable and teacher responsibilities match, with discrepancies resolved or assigned for formal follow-up.",
      "sourceFinished": "The approved rotation, live timetable and class ownership agree, with every mismatch resolved or formally owned.",
      "steps": [
        "Confirm the approved rotation plan, classes, teachers, rooms and changeover dates.",
        "Compare the rotation plan with the live timetable and Sentral classes.",
        "Brief teachers on handovers, program sequence, assessment, rooms and protective equipment requirements.",
        "Resolve attendance or class-list mismatches in the protected school systems.",
        "Record sign-off for the current rotation plan and the next changeover date."
      ],
      "sourceSteps": [
        "Confirm the approved annual rotation structure, classes, teachers, rooms and change dates.",
        "Reconcile the rotation against the live timetable and Sentral class state.",
        "Brief teachers on hand-over points, program sequence, assessment and room/PPE requirements.",
        "Resolve attendance or class-list mismatches in the protected owner systems.",
        "Record the current rotation-version sign-off and next change point."
      ],
      "kindLabel": "School planning check"
    },
    "program-currency": {
      "title": "Check programs and teaching records are up to date",
      "purpose": "Make sure every TAS class has an approved program matching the current syllabus and a current record of teaching.",
      "finished": "Every current class has an approved program matching the current syllabus, and its teaching record is being maintained and checked.",
      "sourceFinished": "Every current class has a syllabus-current, approved program and an active, monitored registration trail.",
      "steps": [
        "Check the live NSW Curriculum page for every course taught and any implementation changes.",
        "Confirm the current approved program, scope and sequence, and assessment links.",
        "Check that teaching registration and monitoring records are kept up to date in the approved location.",
        "Sort out old templates, duplicate folders and unclear responsibility for programs.",
        "Record only the current version and review sign-off here, not the program content."
      ],
      "sourceSteps": [
        "Check the live NSW Curriculum page for each delivered course and any implementation change.",
        "Confirm the current approved program version, scope/sequence and assessment links.",
        "Confirm ongoing registration/monitoring is being completed in the approved location.",
        "Resolve legacy templates, duplicated folders and missing ownership.",
        "Record the current version and review sign-off—not the program content—in this workboard."
      ]
    },
    "assessment-governance": {
      "title": "Check assessment schedules, tasks and any changes",
      "purpose": "Check each course's assessment arrangements before publication, before tasks are issued and whenever approved dates or conditions change.",
      "finished": "All current courses have approved schedules, issued tasks match the approved version and every change has its required approval recorded.",
      "sourceFinished": "All current courses have approved schedules, every issued task matches the controlled version and every amendment has an authorised trail.",
      "steps": [
        "Check that every current TAS course appears in the approved annual assessment schedule.",
        "Check timing, outcomes, evidence, accessibility, checks for students' own work and current school and NESA rules.",
        "Early in Term 1, confirm any independent trial-paper ordering, security and purchasing deadlines.",
        "Check that each task is issued through the approved student channel on its scheduled date.",
        "Get any change to dates or conditions approved through the current executive process.",
        "After approval, update the schedule and monitoring records."
      ],
      "sourceSteps": [
        "Confirm every current TAS course appears in the approved annual assessment schedule.",
        "Check task timing, outcomes, evidence, accessibility, authenticity controls and current school/NESA rules.",
        "Confirm any independent trial-paper ordering, security and procurement dates early in Term 1.",
        "Confirm the task is issued through the approved student route on the scheduled date.",
        "Route any date or condition change through the current executive approval process.",
        "Update the schedule and monitoring trail after approval."
      ]
    },
    "senior-monitoring": {
      "title": "Check senior-course records and required sign-off",
      "purpose": "Keep Stage 6 teaching and assessment monitoring current, and arrange the school sign-off required at each checking point.",
      "finished": "Every senior course has an up-to-date monitoring record and the required authorised sign-off, stored in the approved location.",
      "sourceFinished": "Every senior course has a current monitoring trail and the required authorised sign-off.",
      "steps": [
        "Confirm the current school and NESA monitoring process and required sign-off points.",
        "Check each senior class has a current monitoring record linked to its approved program and assessment schedule.",
        "Resolve gaps before reporting or data-submission deadlines.",
        "Confirm the required Principal or delegate sign-off and approved storage."
      ],
      "sourceSteps": [
        "Confirm the current school/NESA monitoring model and required sign-off points.",
        "Check that each senior class has a current monitoring record tied to the approved program and assessment schedule.",
        "Resolve gaps before reporting or data submission deadlines.",
        "Confirm required Principal/delegate sign-off and controlled storage."
      ]
    },
    "subject-selection-cycle": {
      "title": "Prepare accurate TAS subject-selection information",
      "purpose": "Check course descriptions, fees and approved offerings across handbooks, presentations and websites before families make their choices.",
      "finished": "Published TAS and VET pathway information is current and approved, with a responsible person identified for the selection cycle.",
      "sourceFinished": "Every published TAS and VET pathway statement is current, approved and owned for the live selection cycle.",
      "steps": [
        "Confirm current selection dates, year groups and who is responsible for publishing.",
        "Check course descriptions, prerequisites, fees and facilities against current approved information.",
        "Have VET claims verified by the VET Coordinator using current RTO authority.",
        "Approve the TAS handbook, presentation or video, and website content before release.",
        "Record corrections and a dated annual sign-off."
      ],
      "sourceSteps": [
        "Confirm the current selection timeline, year groups and publishing owner.",
        "Check course descriptions, prerequisites, fees and facilities against current approved information.",
        "Verify that VET claims come from the VET Coordinator/current RTO authority.",
        "Approve the TAS handbook, presentation/video and website content before release.",
        "Record corrections and a dated annual sign-off."
      ],
      "kindLabel": "School planning check"
    },
    "faculty-publications": {
      "title": "Prepare TAS publications and the annual school-report contribution",
      "purpose": "Confirm current briefs and deadlines, submit approved faculty content and check public TAS information is accurate.",
      "finished": "Required annual contributions are submitted and approved public TAS information has been checked for accuracy, accessibility and current links.",
      "sourceFinished": "The required annual contributions are submitted and the approved public TAS information is current, accessible and verified.",
      "steps": [
        "Confirm who manages the website, school report and magazine, and check their current briefs and deadlines.",
        "Check that TAS course, pathway, fee, contact and facility information is current and approved.",
        "Prepare the requested contribution using approved aggregate evidence and current publishing and consent rules.",
        "Check the published result and correct or retire out-of-date pages and links.",
        "Record publication or submission, who checked it and when."
      ],
      "sourceSteps": [
        "Confirm the current public school website/CMS, school-report and magazine owners, briefs and due dates.",
        "Check that TAS course, pathway, fee, contact and facility information is current and approved.",
        "Prepare the required faculty contribution using authorised aggregate evidence and current publishing/consent rules.",
        "Verify the rendered public output and retire or correct superseded pages and links.",
        "Record publication/submission and a dated verifier."
      ],
      "kindLabel": "School planning check"
    },
    "reporting-assurance": {
      "title": "Agree how staff will check reports and markbooks",
      "purpose": "Give staff one current process for checking evidence, grades, comments and submissions, with enough time to correct issues.",
      "finished": "Staff are using the current reporting process and the Head Teacher check is completed before each office deadline.",
      "sourceFinished": "Staff use one current reporting process and the Head Teacher check is completed before each office milestone.",
      "steps": [
        "Confirm the current reporting timetable, school style guidance and Sentral process.",
        "Provide a short approved faculty checklist covering evidence, grades, comments and submission status.",
        "Explain how teachers should correct issues and when to seek further help.",
        "Check a sample early enough to fix system or quality problems before deadlines.",
        "Retire old word banks, grade tools and copied instructions."
      ],
      "sourceSteps": [
        "Confirm the current school reporting timeline, style guidance and Sentral process.",
        "Publish a small approved faculty check that covers evidence, grade, comment and submission state.",
        "Brief teachers on correction and escalation steps.",
        "Sample the process early enough to fix system or quality issues before due dates.",
        "Retire superseded word banks, grade tools and copied instructions."
      ],
      "kindLabel": "School planning check"
    },
    "capability-training": {
      "title": "Check staff training, PDPs and development needs",
      "purpose": "Review required training and staff development needs, then arrange practical support while keeping personnel information protected.",
      "finished": "Required training is current and each significant skill or capability gap has approved support arranged and a review date.",
      "sourceFinished": "Required training is current and every material capability gap has an approved support action and review point.",
      "steps": [
        "Check mandatory-training status in MyPL against current employer requirements.",
        "Confirm each staff member has an approved PDP and appropriate supervisor conversations in the protected process.",
        "Identify development needs for current courses, machinery, safety systems and emerging technology.",
        "Arrange approved professional learning, observation or mentoring, then review its effect.",
        "Keep only overall readiness or a reference to the protected system here."
      ],
      "sourceSteps": [
        "Check mandatory-training status in MyPL and current employer requirements.",
        "Confirm each staff member has an approved PDP and appropriate supervisor conversations in the protected process.",
        "Identify capability needs for current courses, machinery, safety systems and emerging technology.",
        "Plan approved professional learning, observation or mentoring and later review its impact.",
        "Record only aggregate readiness or a safe owner-system reference here."
      ]
    },
    "faculty-meeting-control": {
      "title": "Run faculty meetings and follow through on actions",
      "purpose": "Use meetings to make decisions, assign tasks and check that actions are completed or followed up.",
      "finished": "Minutes are stored in the approved location, and every action is complete, carried forward with a date or formally escalated.",
      "sourceFinished": "Minutes are stored in the approved location and every action is closed, carried with a date or formally escalated.",
      "steps": [
        "Confirm the current meeting time, agenda and staff attendance expectations.",
        "Make clear which items are information, decisions, actions, deadlines or matters needing escalation.",
        "Give each action a responsible role and an approved place for its supporting records.",
        "Begin the next meeting by closing completed actions, setting new dates or escalating unresolved work."
      ],
      "sourceSteps": [
        "Confirm the live meeting time, agenda and staff attendance expectations.",
        "Separate information, decisions, actions, deadlines and escalations.",
        "Assign every action to a role and approved evidence destination.",
        "Begin the next meeting by closing, carrying or escalating open actions."
      ],
      "kindLabel": "School planning check"
    },
    "budget-procurement": {
      "title": "Manage the TAS budget, purchases, stock and fees",
      "purpose": "Plan faculty resources and keep approvals, spending, stock and assets up to date through the school finance process.",
      "finished": "Purchases and claims are authorised, stock and assets are reconciled and the school finance system shows the current position.",
      "sourceFinished": "Purchases and claims are authorised, stock/assets are reconciled and the finance owner system reflects the current position.",
      "steps": [
        "Confirm current cost centres, spending authority and purchase or claim procedures with the finance staff.",
        "Check planned course needs, consumables, equipment, maintenance and approved student fee information.",
        "Approve purchases only through the current procurement process.",
        "Register new assets and reconcile stock, disposal and records showing how funds were used.",
        "Review the budget each term; keep financial details in the finance system, not this workboard."
      ],
      "sourceSteps": [
        "Confirm current cost centres, delegations and purchase/claim routes with the finance owner.",
        "Reconcile planned course needs, consumables, equipment, maintenance and approved student fee information.",
        "Approve purchasing only through the current procurement process.",
        "Register assets on receipt and reconcile stock, disposal and acquittal records.",
        "Review the budget position each term without copying finance detail into the workboard."
      ]
    },
    "whs-inspection": {
      "title": "Inspect TAS workspaces and follow up hazards",
      "purpose": "Use the current inspection process, make unsafe areas safe immediately and check that each finding is resolved.",
      "finished": "The inspection is complete and every finding is verified resolved or has an authorised arrangement controlling the remaining risk.",
      "sourceFinished": "The current inspection is complete and every finding is verified closed or controlled through an authorised exception.",
      "steps": [
        "Get the current approved inspection checklist and confirm the inspection date.",
        "Inspect every practical workspace with the appropriate staff and record findings in the approved system.",
        "Immediately isolate or make safe any unsafe item or area.",
        "Give each corrective action a responsible person and due date.",
        "Recheck and record completed repairs or actions; escalate any unresolved risk."
      ],
      "sourceSteps": [
        "Obtain the current approved inspection checklist and inspection date.",
        "Inspect each practical workspace with the appropriate staff and record findings in the authorised system.",
        "Immediately isolate or control any unsafe item or area.",
        "Assign every corrective action to an owner and due date.",
        "Recheck and record closure; escalate any unresolved risk."
      ]
    },
    "machinery-assets": {
      "title": "Get machinery approved and ready before use",
      "purpose": "Follow current approval and safety requirements before buying, installing, moving or changing machinery, then verify it is safe to use.",
      "finished": "The machine or change is approved, registered, safely installed and checked, with use restricted to appropriately authorised people.",
      "sourceFinished": "The machine/change is approved, registered, safely commissioned and restricted to appropriately authorised use.",
      "steps": [
        "Identify the exact machine or change and check the current Department application process.",
        "Obtain approval before purchase or commitment, including checks of the site, services, guarding and training needs.",
        "On receipt, register the asset and complete commissioning and required risk and safety records.",
        "Before use, confirm authorised users, current safe operating procedures and inspection and maintenance arrangements.",
        "Keep only official approval and asset references here."
      ],
      "sourceSteps": [
        "Identify the exact proposed machine/change and the current Department application route.",
        "Obtain approval before purchase or commitment, including site, services, guarding and training considerations.",
        "On receipt, complete asset registration, commissioning and required risk/control records.",
        "Verify authorised users, current SOPs and inspection/maintenance arrangements before use.",
        "Record the official approval and asset references only."
      ]
    },
    "chemical-controls": {
      "title": "Check chemical records, safety information and storage",
      "purpose": "Match chemicals to the current register and check that safety data sheets, labels, storage and disposal arrangements are current.",
      "finished": "The official register matches the practical areas, current safety information and measures are in place, and outstanding issues are resolved or isolated.",
      "sourceFinished": "The controlled register matches the physical areas, current SDS and controls are available, and every exception is closed or isolated.",
      "steps": [
        "Confirm the current Department or school chemical-safety system and who is responsible.",
        "Check products and locations against the official register without copying the inventory into this workboard.",
        "Check current safety data sheets, labelling, storage, protective equipment, sharps and disposal requirements where applicable.",
        "Remove, isolate or escalate unknown or unapproved products, or products without the required safety measures.",
        "Record the dated inspection or completed-action reference in the approved system."
      ],
      "sourceSteps": [
        "Confirm the current Department/school chemical-safety platform and accountable roles.",
        "Reconcile products and locations against the controlled register without copying inventory into the workboard.",
        "Verify current SDS access, labelling, storage, PPE, sharps and disposal controls as applicable.",
        "Remove, isolate or escalate any unknown, unapproved or uncontrolled product.",
        "Record the dated inspection/closure reference in the authorised system."
      ]
    },
    "workshop-routine": {
      "title": "Check safety before practical work and report faults",
      "purpose": "Check the room, equipment and required training before each lesson. Stop and isolate anything unsafe immediately.",
      "finished": "Practical work begins only with safety requirements checked, and every fault is isolated, allocated and resolved through the approved process.",
      "sourceFinished": "Practical work starts only under verified controls and every fault is isolated, owned and closed through the approved route.",
      "steps": [
        "Before practical work, check the room, equipment, guards and controls, protective equipment and footwear, and known hazards.",
        "Confirm required equipment-safety learning and teacher authorisation before equipment is used.",
        "Stop, isolate and report any fault or unsafe condition through the current maintenance or WHS process.",
        "Use the approved alternative learning arrangement if practical work cannot proceed safely.",
        "Follow each fault through to a verified repair or authorised disposal."
      ],
      "sourceSteps": [
        "Before practical work, check the room, equipment condition, guards/controls, PPE/footwear and known hazards.",
        "Confirm required equipment-safety learning and teacher authorisation before use.",
        "Stop, isolate and report any fault or unsafe condition through the current maintenance/WHS process.",
        "Use the approved alternate learning arrangement where practical work cannot proceed safely.",
        "Track each fault to verified repair or authorised disposal."
      ]
    },
    "term-workshop-close": {
      "title": "Close down and prepare workshops for the next term",
      "purpose": "Allow time to inspect, maintain and reset practical rooms, with defects isolated and authorised staff handling maintenance.",
      "finished": "Each practical area is clean, safe and ready, with any defect isolated and assigned for formal follow-up.",
      "sourceFinished": "Each practical area is clean, controlled and ready, with every defect isolated and formally owned.",
      "steps": [
        "Set the last practical-work date and brief staff early enough for safe pack-down.",
        "Complete the current close-down checks for rooms, machinery, tools, stock and chemicals.",
        "Isolate defects and submit maintenance requests through the approved process.",
        "Check that only qualified and authorised people carry out the work.",
        "Record room readiness and carry outstanding issues with responsible staff into next term."
      ],
      "sourceSteps": [
        "Set the practical-work cut-off and brief staff early enough to complete safe pack-down.",
        "Complete the current room, plant, tools, stock and chemical close-down checks.",
        "Isolate defects and lodge work through the authorised maintenance process.",
        "Verify only qualified/authorised work is undertaken.",
        "Record room readiness and carry owned exceptions into the next term."
      ]
    },
    "stocktake-disposal": {
      "title": "Complete the stocktake and approved asset changes",
      "purpose": "Compare equipment and stock with the official register, then resolve missing items and complete approved transfers or disposal.",
      "finished": "The official register matches the checked physical stock, and every discrepancy is resolved or assigned for formal follow-up.",
      "sourceFinished": "The official asset state matches the verified physical stock and every discrepancy has been resolved or formally owned.",
      "steps": [
        "Confirm the current central stocktake dates, room responsibilities and asset process.",
        "Compare each room or course list with the current asset register.",
        "Investigate missing, moved, surplus or unusable items through the approved process.",
        "Complete the required approvals for purchases, transfers and disposal.",
        "Check the official register is correct and resolve outstanding discrepancies."
      ],
      "sourceSteps": [
        "Confirm the current central stocktake cycle, room owners and asset process.",
        "Reconcile each room/course list to the live asset register.",
        "Investigate missing, moved, surplus or unserviceable items through the authorised route.",
        "Complete acquisition, transfer and disposal approvals.",
        "Verify the official register and close all exceptions."
      ]
    },
    "ag-farm-audit": {
      "title": "Confirm and complete any required Agriculture or farm audit",
      "purpose": "Check which current farm or animal-welfare audit applies before using a checklist, then address findings through the authorised process.",
      "finished": "The current authorised audit is complete and findings are resolved, or the accountable verifier has confirmed that no audit applies.",
      "sourceFinished": "The current authorised audit is complete with findings closed, or the accountable verifier has confirmed that the control is not applicable.",
      "steps": [
        "Confirm current Agriculture or farm activities, responsible roles and which audit authority applies.",
        "Get the current checklist, evidence requirements and due date from the responsible authority.",
        "Complete the inspection or audit and act immediately to control safety or animal-welfare issues.",
        "Give each finding a responsible person and check that it is resolved.",
        "Record the authorised audit reference or a verified decision that the audit does not apply."
      ],
      "sourceSteps": [
        "Confirm the current Agriculture/farm activities, accountable roles and applicable audit authority.",
        "Obtain the current audit instrument, evidence requirements and due date from the owner source.",
        "Complete the inspection/audit and immediately control any safety or animal-welfare issue.",
        "Assign every finding to an owner and verify closure.",
        "Record the authorised audit reference or a verified not-applicable decision."
      ]
    },
    "excursion-workflow": {
      "title": "Approve, run and finish a TAS excursion",
      "purpose": "Use the current school process for approval, safety, consent and attendance, then complete the required follow-up.",
      "finished": "The excursion was approved before commitments were made, ran under current safety arrangements and has been closed in the required school systems.",
      "sourceFinished": "The excursion is approved before commitment, delivered under current controls and fully closed in the authorised systems.",
      "steps": [
        "Open the current school excursion procedure and check how early approval is needed.",
        "Check the learning purpose, risks, staffing, transport, costs, consent and student support arrangements.",
        "Get approval before making commitments or publishing the excursion.",
        "On the day, follow the approved attendance, communication and incident arrangements.",
        "Finish finance, attendance, incident and evaluation actions in their approved systems."
      ],
      "sourceSteps": [
        "Open the current school excursion process and confirm approval lead times.",
        "Check educational purpose, risk assessment, staffing, transport, costs, consent and student support controls.",
        "Obtain approval before commitments or publication.",
        "On the day, use the authorised roll, communication and incident arrangements.",
        "Close finance, attendance, incident and evaluation actions in their owner systems."
      ]
    },
    "new-staff-induction": {
      "title": "Prepare new, relieving or practicum staff for TAS duties",
      "purpose": "Make sure staff have the information, access, training and supervision they need before taking on their assigned duties.",
      "finished": "The staff member is authorised, inducted and supported for the assigned work, with any skill or access gap allocated for follow-up.",
      "sourceFinished": "The staff member is authorised, inducted and supported for their assigned work, with every capability or access gap owned.",
      "steps": [
        "Confirm the person's employment or role, timetable, supervision and who manages their whole-school induction.",
        "For practicum staff, confirm the current university agreement, supervising teacher and reporting requirements.",
        "Show staff current routes for emergencies, wellbeing, attendance, reporting, communication and staff support.",
        "Complete faculty induction for rooms, machinery, chemicals, protective equipment, keys and access, and approved teaching systems. Keep restricted details protected.",
        "Check required training, accreditation or supervision and course capability through the approved systems.",
        "Arrange early check-ins and record the approved induction acknowledgement."
      ],
      "sourceSteps": [
        "Confirm employment/role, timetable, supervision and the current whole-school induction owner.",
        "For a practicum placement, confirm the current university agreement, supervising teacher and reporting requirements.",
        "Provide current emergency, wellbeing, attendance, reporting, communication and staff-support front doors.",
        "Complete faculty induction for rooms, plant, chemicals, PPE, keys/access and approved teaching systems without publishing restricted details.",
        "Confirm mandatory training, accreditation/supervision and course capability through owner systems.",
        "Schedule early check-ins and record the approved induction acknowledgement."
      ]
    },
    "absence-cover": {
      "title": "Arrange safe cover for an absent TAS teacher",
      "purpose": "Secure suitable supervision and useful work, while making practical-room restrictions clear through the current school cover process.",
      "finished": "Every class is safely covered or formally changed or relocated, with useful work and the necessary protected briefing available.",
      "sourceFinished": "Every class is safely covered or formally relocated/changed, with useful work and the necessary protected briefing available.",
      "steps": [
        "Use the current absence-notification and cover procedure; do not rely on old phone numbers or cut-off times.",
        "Check each affected class, room, supervision need and practical-work restriction.",
        "Provide suitable approved relief work where reasonably available, with backup work for an unexpected absence.",
        "Brief the relieving teacher on essential safety and access matters through a protected route.",
        "Confirm cover and escalate any class that cannot operate safely."
      ],
      "sourceSteps": [
        "Use the current absence notification and class-cover route; do not rely on old phone numbers or cut-off times.",
        "Confirm each affected class, room, supervision level and practical-work restriction.",
        "Provide useful approved relief work where reasonably available, with an emergency backup for unexpected absence.",
        "Brief the relieving teacher on essential safety/access information through a protected route.",
        "Confirm coverage and escalate any class that cannot operate safely."
      ]
    },
    "n-warning-response": {
      "title": "Support students at risk of not meeting course requirements",
      "purpose": "Check current warning and support requirements, arrange achievable recovery work and use the protected school process.",
      "finished": "The required warning and support process is complete, with ongoing support or final action assigned in the approved protected system.",
      "sourceFinished": "The current warning/support process is complete and any ongoing or final action is formally owned in the authorised system.",
      "steps": [
        "Check current school and NESA warning requirements and the specific course requirement at risk.",
        "Before a formal warning is needed, use the current protected Learning and Support referral process in Sentral and keep that support record separate.",
        "Confirm the evidence, support already provided and achievable action the student can take to recover.",
        "Create and issue any required approved warning through the protected Sentral or school process.",
        "Record receipt, follow-up and student support in the approved system.",
        "Refer any final N-award process to the Principal or authorised role."
      ],
      "sourceSteps": [
        "Check the current school/NESA warning requirements and the exact course issue.",
        "Where the need emerges before a formal warning threshold, use the current protected Learning and Support referral route in Sentral and keep that support trail separate.",
        "Confirm the evidence, support already provided and achievable recovery action.",
        "Create and issue the approved warning through the protected Sentral/school workflow.",
        "Record receipt, follow-up and student support in the owner system.",
        "Escalate any final N-award process through the Principal/authorised role."
      ]
    },
    "mandatory-reporting-response": {
      "title": "Act immediately on a child-protection concern",
      "purpose": "Pause ordinary work and follow the current protected reporting process. Use emergency procedures if anyone is in immediate danger.",
      "finished": "The current protected reporting process has been followed and any required record exists in the authorised system.",
      "sourceFinished": "The current protected process has been followed and the authorised owner-system record exists where required.",
      "steps": [
        "If anyone is in immediate danger, follow emergency procedures and call 000 where required.",
        "Open the current Mandatory Reporter Guide and Department procedure; do not rely on memory or an old checklist.",
        "Follow the required protected consultation, reporting and escalation steps.",
        "Keep all case information in the authorised record and disclose it only as required.",
        "Do not record case details in this workboard."
      ],
      "sourceSteps": [
        "If anyone is in immediate danger, follow emergency procedures and call 000 where required.",
        "Open the current Mandatory Reporter Guide and Department procedure; do not rely on memory or an old checklist.",
        "Follow the required protected consultation, reporting and escalation steps.",
        "Keep all case information only in the authorised record and disclose it only as required.",
        "Record no case detail in this workboard."
      ]
    },
    "incident-response": {
      "title": "Make an incident safe and complete official reporting",
      "purpose": "Protect people first, contact the responsible school roles and follow the current incident-reporting and follow-up process.",
      "finished": "People are safe, required reports and notifications are complete, and corrective actions are verified resolved or the remaining risk is controlled.",
      "sourceFinished": "People are safe, required notifications and official reports are complete, and every corrective action is verified closed or controlled.",
      "steps": [
        "Protect people first: stop work, provide emergency assistance and call 000 where required.",
        "Notify the current school emergency or WHS roles. Preserve the scene and evidence only as directed.",
        "Complete the official incident report and required notifications through the current process.",
        "Keep the equipment, room or activity isolated until authorised safety measures or clearance are in place.",
        "Follow corrective actions through to verified completion in the approved system."
      ],
      "sourceSteps": [
        "Protect people first: stop work, provide emergency assistance and call 000 where required.",
        "Notify the current school emergency/WHS roles and preserve the scene/evidence only as directed.",
        "Complete the official incident report and required notifications through the current process.",
        "Isolate plant, room or activity until authorised controls or clearance are in place.",
        "Track corrective actions to verified closure in the owner system."
      ]
    },
    "media-enquiry": {
      "title": "Refer media enquiries to the authorised school role",
      "purpose": "Send media requests through current school and Department communications channels without giving an unauthorised response.",
      "finished": "The authorised role has received the enquiry and any response follows the current approved communications process.",
      "sourceFinished": "The enquiry has been transferred to the authorised role and any communication follows the current approved protocol.",
      "steps": [
        "Do not give comment, personal information or incident details unless currently authorised.",
        "Record the caller, outlet and request only through the current restricted process.",
        "Notify the Principal or acting Principal and use the current Department communications route.",
        "Follow the approved response and retain only the required protected record."
      ],
      "sourceSteps": [
        "Do not provide comment, personal information or incident detail unless currently authorised.",
        "Record the caller/outlet and request only in the restricted current process.",
        "Notify the Principal/acting Principal and use the current Department communications route.",
        "Follow the approved response and retain only the required protected record."
      ]
    },
    "vet-handoff": {
      "title": "Pass VET-specific work to the responsible VET staff",
      "purpose": "Use the VET workboard and current RTO process whenever a TAS task involves VET delivery, assessment, placement or official data.",
      "finished": "An authorised VET role is responsible for the work, tracked through the VET workboard and current RTO system without duplicate records.",
      "sourceFinished": "The VET component has a clear authorised owner and is tracked in the VET workboard/current RTO system without duplication.",
      "steps": [
        "Identify which part of the TAS task involves VET approval, assessment, evidence, placement, NESA or RTO data, or credentials.",
        "Open the VET workboard and follow the current route to the approved VET system.",
        "Assign the work to the authorised VET role instead of copying official procedures into the TAS site.",
        "Keep only a handover and completion reference without personal details in the appropriate workboard."
      ],
      "sourceSteps": [
        "Identify the TAS action and the specific VET boundary: delivery authority, assessment, evidence, placement, NESA/RTO data or credentialling.",
        "Open the VET Compliance Workboard and follow the current VET owner-system route.",
        "Assign the work to the authorised VET role instead of reproducing controlled instructions in the TAS site.",
        "Keep only a privacy-safe hand-off and completion reference in the appropriate workboard."
      ]
    },
    "2027-t1-year-opening-readiness": {
      "title": "Get TAS classes and practical rooms ready for Term 1",
      "purpose": "Check that teachers, programs, rooms and access are ready before students begin the year.",
      "finished": "Every class and practical room is ready for its approved work, or a safe alternative has a responsible person and deadline in the school system.",
      "sourceFinished": "Every TAS class and practical room is ready for the approved work, or a safe, time-bound exception is owned in the correct system.",
      "steps": [
        "Check current classes, teachers, rooms and timetables in Sentral.",
        "Check that each class has a current program, a responsible teacher, an approved learning space and an assessment plan.",
        "Check practical rooms, machinery restrictions, protective equipment and footwear, equipment-safety learning and essential staff access.",
        "Check that staff can find student support and health information through the protected school system without copying it.",
        "Give each outstanding issue a responsible person, a due date and an approved place for its supporting records."
      ],
      "sourceSteps": [
        "Confirm current classes, teachers, rooms and timetable state in Sentral.",
        "Confirm each class has an owned current program, approved learning space and assessment pathway.",
        "Check practical rooms, plant restrictions, PPE/footwear, equipment-safety learning and essential staff access.",
        "Confirm staff can use the protected route for learner support and health information without copying it.",
        "Own every exception with a role, due date and authorised evidence location."
      ]
    },
    "2027-t1-student-review-cycle": {
      "title": "Prepare for assigned Term 1 reviews and assemblies",
      "purpose": "Check the current roster and complete the review, wellbeing or assembly work actually assigned to TAS.",
      "finished": "Each assigned Term 1 contribution is complete, with follow-up allocated in the protected system. Events requiring no TAS action have been checked.",
      "sourceFinished": "Each applicable Term 1 contribution is complete and protected follow-up is owned; non-applicable events have been checked rather than assumed.",
      "steps": [
        "Check each event in the live calendar and current roster; do not assume last year's pattern still applies.",
        "Confirm what TAS must do, what information is needed and which protected system to use.",
        "Complete only the assigned work, keeping student and roster details in the protected system.",
        "Give any follow-up a responsible person in the approved system."
      ],
      "sourceSteps": [
        "Check each live event and current roster rather than assuming the historical pattern.",
        "Confirm the TAS role, required information and protected owner system.",
        "Complete only the assigned contribution and keep learner or roster details protected.",
        "Give any follow-up a clear owner in the authorised system."
      ]
    },
    "2027-t1-vet-white-card-handoff": {
      "title": "Arrange any TAS support for White Card training",
      "purpose": "Check whether White Card training affects TAS rooms, staff or timetables, then pass VET requirements to the responsible VET staff.",
      "finished": "Any effects on TAS have been addressed and the VET work has an authorised person responsible for it.",
      "sourceFinished": "Any TAS operational impact is controlled and the VET component has an authorised owner in the VET workflow.",
      "steps": [
        "Confirm the current activity, its effect on TAS and who is responsible.",
        "Resolve room, staffing or timetable changes through the school systems.",
        "Use the VET workboard for delivery approval, attendance, evidence and qualification or statement requirements.",
        "Record only a handover reference without personal details, or a checked decision that TAS has no action."
      ],
      "sourceSteps": [
        "Confirm the live activity, TAS impact and accountable roles.",
        "Resolve any room, staffing or timetable impact through school systems.",
        "Open the VET Compliance Workboard for delivery authority, attendance, evidence and credentialling controls.",
        "Record only a privacy-safe TAS hand-off or not-applicable decision here."
      ]
    },
    "2027-t1-parent-teacher-evening": {
      "title": "Prepare TAS staff for Term 1 parent–teacher interviews",
      "purpose": "Arrange attendance, access to current student information and a clear way to follow up after interviews.",
      "finished": "Staff are prepared, attendance is covered and each necessary follow-up has a responsible person in the approved protected system.",
      "sourceFinished": "Faculty staff are prepared, attendance is covered and required follow-up has an owner in the authorised system.",
      "steps": [
        "Confirm the current event details, interview booking system and staff attendance expectations.",
        "Check that staff can access current assessment, progress and support information in the approved systems.",
        "Arrange coverage and who staff should contact about complex or sensitive conversations.",
        "After interviews, allocate any required follow-up in the appropriate protected system."
      ],
      "sourceSteps": [
        "Confirm the live event, interview module and faculty attendance expectations.",
        "Check staff access to current assessment, progress and support information in authorised systems.",
        "Plan coverage and an escalation route for complex or sensitive conversations.",
        "After the event, ensure required follow-up is owned in the correct protected system."
      ]
    },
    "2027-t1-nesa-disability-provisions": {
      "title": "Check TAS duties for NESA disability provisions",
      "purpose": "Find out whether TAS must contribute to the current disability-provisions action and who is authorised to submit it.",
      "finished": "The current NESA action has been checked and the TAS contribution is confirmed complete, or formally confirmed as not required.",
      "sourceFinished": "The live action has been checked and the TAS contribution is verified complete or formally not applicable.",
      "steps": [
        "Open the current NESA Timetable of Actions and check exactly what the action covers.",
        "Confirm whether TAS must provide anything and who may submit or verify it.",
        "Complete any required contribution through the approved protected system.",
        "Record a completion reference without personal details, or a verified decision that TAS has no action."
      ],
      "sourceSteps": [
        "Open the current NESA Timetable of Actions and confirm the exact action and scope.",
        "Confirm whether TAS must provide anything and who is authorised to submit or verify it.",
        "Complete any contribution only through the protected owner system.",
        "Record a safe completion reference or verified not-applicable decision."
      ]
    },
    "2027-t2-year12-report-chain": {
      "title": "Check and submit Term 2 Year 12 reports",
      "purpose": "Check Year 12 reports, return corrections and follow them through office submission and release.",
      "finished": "Every applicable Year 12 TAS report has been checked, corrected where needed, submitted to the office and confirmed issued.",
      "sourceFinished": "Every applicable Year 12 report has completed all three authorised milestones.",
      "steps": [
        "Confirm the current Year 12 classes and who is responsible for each report.",
        "Check assessment evidence, results and comments using the approved reporting process.",
        "Return any corrections to the teacher and check the revised reports.",
        "Confirm office submission and report issue through the school reporting system."
      ],
      "sourceSteps": [
        "Confirm classes and reporting owners.",
        "Check evidence, results and comments in the approved process.",
        "Return and recheck corrections.",
        "Confirm office hand-off and issue in the owner system."
      ]
    },
    "2027-t2-student-review-cycle": {
      "title": "Prepare for assigned Term 2 reviews and assemblies",
      "purpose": "Check the current roster and complete the review, wellbeing or assembly work actually assigned to TAS.",
      "finished": "Each assigned Term 2 contribution is complete and any follow-up has a responsible person in the approved protected system.",
      "sourceFinished": "Each applicable Term 2 contribution is complete and protected follow-up is owned.",
      "steps": [
        "Check each event in the live calendar and current roster.",
        "Confirm the TAS role and where protected information must be handled.",
        "Complete only the contribution assigned to TAS or the Head Teacher.",
        "Allocate follow-up to a responsible person in the approved system."
      ],
      "sourceSteps": [
        "Check each live event and current roster.",
        "Confirm the TAS role and protected information route.",
        "Complete only the assigned contribution.",
        "Own follow-up in the authorised system."
      ]
    },
    "2027-t2-vet-placement-handoff": {
      "title": "Arrange TAS support for Year 12 work placement",
      "purpose": "Resolve any TAS timetable, room or staffing changes, while the authorised VET staff manage placement requirements.",
      "finished": "Any effects on TAS have been addressed and an authorised VET staff member is responsible for the placement work.",
      "sourceFinished": "TAS impacts are controlled and the VET placement workflow has the correct authorised owner.",
      "steps": [
        "Confirm the current placement dates and how TAS is affected.",
        "Resolve timetable, room or staffing changes through the school systems.",
        "Use the VET workboard for placement readiness, arrangements, monitoring and evidence requirements.",
        "Record only a handover reference without personal details, or a checked decision that TAS has no action."
      ],
      "sourceSteps": [
        "Confirm the live placement window and TAS impact.",
        "Resolve timetable, room or staffing effects through school systems.",
        "Open the VET workboard for readiness, placement, monitoring and evidence controls.",
        "Record only a safe TAS hand-off or not-applicable decision."
      ]
    },
    "2027-t2-year11-report-chain": {
      "title": "Check and submit Term 2 Year 11 reports",
      "purpose": "Check Year 11 reports, return corrections and follow them through office submission and release.",
      "finished": "Every applicable Year 11 TAS report has been checked, corrected where needed, submitted to the office and confirmed issued.",
      "sourceFinished": "Every applicable Year 11 report has completed all three authorised milestones.",
      "steps": [
        "Confirm the current Year 11 classes and who is responsible for each report.",
        "Check assessment evidence, results and comments using the approved reporting process.",
        "Return any corrections to the teacher and check the revised reports.",
        "Confirm office submission and report issue through the school reporting system."
      ],
      "sourceSteps": [
        "Confirm classes and reporting owners.",
        "Check evidence, results and comments.",
        "Return and recheck corrections.",
        "Confirm office hand-off and issue."
      ]
    },
    "2027-t2-year8-report-chain": {
      "title": "Check and submit Term 2 Year 8 reports",
      "purpose": "Check Year 8 reports, return corrections and follow them through office submission and release.",
      "finished": "Every applicable Year 8 TAS report has been checked, corrected where needed, submitted to the office and confirmed issued.",
      "sourceFinished": "Every applicable Year 8 report has completed its authorised milestones.",
      "steps": [
        "Confirm the current Year 8 classes and who is responsible for each report.",
        "Check assessment evidence, grades and comments using the approved reporting process.",
        "Return any corrections to the teacher and check the revised reports.",
        "Confirm office submission and report issue through the school reporting system."
      ],
      "sourceSteps": [
        "Confirm classes and owners.",
        "Check evidence, grades and comments.",
        "Return and recheck corrections.",
        "Confirm office hand-off and issue."
      ]
    },
    "2027-t2-year9-report-chain": {
      "title": "Check and submit Term 2 Year 9 reports",
      "purpose": "Check Year 9 reports, return corrections and follow them through office submission and release.",
      "finished": "Every applicable Year 9 TAS report has been checked, corrected where needed, submitted to the office and confirmed issued.",
      "sourceFinished": "Every applicable Year 9 report has completed its authorised milestones.",
      "steps": [
        "Confirm the current Year 9 classes and who is responsible for each report.",
        "Check assessment evidence, grades and comments using the approved reporting process.",
        "Return any corrections to the teacher and check the revised reports.",
        "Confirm office submission and report issue through the school reporting system."
      ],
      "sourceSteps": [
        "Confirm classes and owners.",
        "Check evidence, grades and comments.",
        "Return and recheck corrections.",
        "Confirm office hand-off and issue."
      ]
    },
    "2027-t2-year7-report-chain": {
      "title": "Check and submit Term 2 Year 7 reports",
      "purpose": "Check Year 7 reports and confirm the office deadline from the live calendar before arranging submission and release.",
      "finished": "The office deadline is confirmed and every applicable Year 7 report has been checked, corrected, submitted and confirmed issued.",
      "sourceFinished": "The live office date has been confirmed and every applicable Year 7 report has completed the authorised chain.",
      "steps": [
        "Confirm current Year 7 classes and who is responsible for each report.",
        "Check assessment evidence, grades and comments.",
        "Confirm the Year 7 office deadline in the live calendar or reporting system; do not guess it.",
        "Return and recheck corrections, then confirm office submission and report issue."
      ],
      "sourceSteps": [
        "Confirm classes and owners.",
        "Check evidence, grades and comments.",
        "Confirm the Year 7 office hand-off date in the live calendar/reporting process; do not infer it.",
        "Return and recheck corrections, then confirm office hand-off and issue."
      ]
    },
    "2027-t2-year10-report-chain": {
      "title": "Check and submit Term 2 Year 10 reports",
      "purpose": "Check Year 10 reports, return corrections and follow them through office submission and release.",
      "finished": "Every applicable Year 10 TAS report has been checked, corrected where needed, submitted to the office and confirmed issued.",
      "sourceFinished": "Every applicable Year 10 report has completed its authorised milestones.",
      "steps": [
        "Confirm the current Year 10 classes and who is responsible for each report.",
        "Check assessment evidence, grades and comments using the approved reporting process.",
        "Return any corrections to the teacher and check the revised reports.",
        "Confirm office submission and report issue through the school reporting system."
      ],
      "sourceSteps": [
        "Confirm classes and owners.",
        "Check evidence, grades and comments.",
        "Return and recheck corrections.",
        "Confirm office hand-off and issue."
      ]
    },
    "2027-t3-info-evening": {
      "title": "Prepare TAS information for the Year 9/8 subject evening",
      "purpose": "Have current course information, fees and staff contacts ready for families choosing next year's subjects.",
      "finished": "Approved TAS information is ready, staff know their roles and VET questions have a clear route to the responsible VET staff.",
      "sourceFinished": "The current approved TAS information is ready, the responsible staff know their role and every VET query has a clear hand-off.",
      "steps": [
        "Check the event time, audience and TAS contribution in the live staff calendar.",
        "Check that next year's course descriptions, approved offerings and fees match the current school handbook.",
        "Remove or replace old links, out-of-date VET promotional material and unapproved course claims.",
        "Confirm who will answer TAS questions and direct VET questions to the VET workboard or current RTO information.",
        "Record the event-readiness sign-off in the approved team record without personal details."
      ],
      "sourceSteps": [
        "Confirm the event time, audience and TAS contribution in the live Staff School Calendar.",
        "Check that next year's course descriptions, approved offerings and fee information match the current school handbook.",
        "Remove or replace superseded links, old VET marketing material and unapproved course claims.",
        "Confirm who will answer TAS questions and route VET questions to the VET workboard/current RTO information.",
        "Record a privacy-safe event-readiness sign-off in the approved team record."
      ]
    },
    "2027-t3-year12-report-chain": {
      "title": "Check and submit Term 3 Year 12 reports",
      "purpose": "Check Year 12 marks, grades and comments, return corrections, then confirm office submission and report issue.",
      "finished": "Every applicable Year 12 TAS report has been checked, corrected where needed, submitted by the office deadline and confirmed issued.",
      "sourceFinished": "Every applicable Year 12 TAS report is checked, corrected where needed, submitted by the office milestone and confirmed through the school reporting process.",
      "steps": [
        "Confirm all current Year 12 TAS classes and the teacher responsible for each report in Sentral.",
        "Check marks and grades against approved assessment evidence and the current schedule.",
        "Check comments against current school reporting guidance, style and faculty quality expectations.",
        "Return corrections early enough for the teacher to meet the confirmed office deadline.",
        "Confirm submission and later issue in the reporting system; keep only a completion reference here."
      ],
      "sourceSteps": [
        "Confirm every current Year 12 TAS class and reporting owner in Sentral.",
        "Check marks/grades against the approved assessment evidence and current schedule.",
        "Check comments against current school style, reporting guidance and faculty quality criteria.",
        "Return corrections to the teacher with enough time to meet the confirmed office deadline.",
        "Confirm submission and later issue in the owner system; record only a safe completion reference here."
      ]
    },
    "2027-t3-parent-teacher": {
      "title": "Prepare TAS staff for Term 3 parent–teacher interviews",
      "purpose": "Arrange bookings, attendance and access to current evidence so staff can hold useful conversations and follow up safely.",
      "finished": "Staff are prepared, bookings and attendance are covered, and each necessary follow-up has a responsible person in the protected system.",
      "sourceFinished": "Faculty staff are prepared, bookings and attendance are covered, and required follow-up has an owner in the authorised system.",
      "steps": [
        "Confirm the current event details, interview booking system and staff attendance expectations.",
        "Check that staff can access current assessment, progress and support information in the approved systems.",
        "Arrange coverage and who staff should contact about complex or sensitive conversations.",
        "After interviews, allocate and record any necessary follow-up in the appropriate protected system."
      ],
      "sourceSteps": [
        "Confirm the live event details, interview module and faculty attendance expectations.",
        "Check that staff can access current assessment, progress and support information in authorised systems.",
        "Plan coverage and a clear escalation route for complex or sensitive conversations.",
        "After the event, ensure any necessary follow-up is owned and recorded in the correct protected system."
      ]
    },
    "2027-student-review-cycle": {
      "title": "Prepare for assigned student reviews and assemblies",
      "purpose": "Use the current calendar and roster to identify TAS responsibilities, then prepare only the work assigned.",
      "finished": "The event and TAS role are confirmed, the assigned contribution is complete and follow-up has a responsible person in the protected system.",
      "sourceFinished": "The current event and TAS responsibility are confirmed, the assigned contribution is complete and protected follow-up has an owner.",
      "steps": [
        "Check the live event and current roster; do not assume the old Weeks 4/8 pattern still applies.",
        "Confirm what TAS or the Head Teacher must do, what information is needed and which protected system to use.",
        "Prepare the contribution without exporting student, wellbeing or staff-roster details.",
        "Attend or complete the assigned action and record only a completion reference without personal details.",
        "Allocate any follow-up in the appropriate protected system."
      ],
      "sourceSteps": [
        "Check the live event and current roster rather than assuming the historical Weeks 4/8 pattern.",
        "Confirm the TAS/Head Teacher role, required information and protected owner system.",
        "Prepare the contribution without exporting learner, wellbeing or staff-roster details.",
        "Attend or complete the assigned action and record only a safe completion pointer.",
        "Own any follow-up in the appropriate protected system."
      ]
    },
    "2027-t3-nesa-submission-check": {
      "title": "Check and complete TAS duties for the Term 3 NESA submission",
      "purpose": "Identify the current NESA submission, check whether TAS must contribute and get required information to the authorised submitter.",
      "finished": "The current NESA action has been checked and the TAS contribution is confirmed complete, or formally confirmed as not required.",
      "sourceFinished": "The live NESA action has been checked and the TAS contribution is either verified complete or formally confirmed as not applicable.",
      "steps": [
        "Open the current NESA Timetable of Actions and confirm the relevant submission, what it covers and its deadline.",
        "Check whether TAS has any applicable courses, entries or information to provide.",
        "Confirm who is authorised to submit and when the school needs its internal checks finished.",
        "Supply and check only the required information through the approved system.",
        "Record the authorised completion reference or a verified decision that TAS has no action."
      ],
      "sourceSteps": [
        "Open the current NESA Timetable of Actions and confirm the applicable submission, scope and deadline.",
        "Confirm whether TAS has any applicable courses, entries or data to provide.",
        "Confirm the authorised submitting role and internal checking deadline.",
        "Supply and verify only the information required through the approved owner system.",
        "Record the authorised completion reference or a verified not-applicable decision."
      ]
    },
    "2027-t4-year11-report-chain": {
      "title": "Check and submit Year 11 reports and required grades",
      "purpose": "Complete the report checks and the separate grade or Life Skills handover, using each process's current deadline.",
      "finished": "Reports and applicable grades are checked, submitted through the correct school and NESA routes, and report issue is confirmed.",
      "sourceFinished": "Reports and applicable grades are checked, submitted through the correct routes and confirmed at the release milestone.",
      "steps": [
        "Confirm current Year 11 TAS classes, reporting teachers and applicable grade requirements.",
        "Check evidence, marks or grades and comments against the approved schedule and reporting guidance.",
        "Confirm the separate grade or Life Skills handover with the authorised Deputy, then confirm required data reaches the authorised NESA submitter by the current deadline. Do not assume the Head Teacher is the submitter.",
        "Finish corrections before the confirmed office deadline and confirm the authorised report issue date."
      ],
      "sourceSteps": [
        "Confirm the current Year 11 TAS classes, reporting owners and applicable grade requirements.",
        "Check evidence, marks/grades and comments using the approved schedule and reporting guidance.",
        "Confirm the separate grade/Life Skills hand-off with the authorised Deputy role, then confirm applicable Year 11 data reaches the authorised NESA submitter by the current NESA deadline. The Head Teacher is not assumed to be that submitter.",
        "Close corrections before the confirmed office deadline and confirm the authorised report issue date."
      ]
    },
    "2027-t4-year10-report-chain": {
      "title": "Check and submit Year 10 reports and NESA grades",
      "purpose": "Check reports, then send the required grades and reports through their separate approved school routes.",
      "finished": "Reports and NESA grades have passed the required checks and reached their separate authorised destinations by their confirmed deadlines.",
      "sourceFinished": "Reports and NESA grades have passed the correct checks and reached their separate authorised destinations on time.",
      "steps": [
        "Match each current Year 10 TAS class to the teachers responsible for reports and grades.",
        "Check reports against approved assessment evidence and current grade descriptors.",
        "Confirm the current NESA grade handover date and route with the authorised Deputy or data staff member.",
        "Resolve corrections and confirm office submission by the current deadline."
      ],
      "sourceSteps": [
        "Reconcile each current Year 10 TAS class with its reporting and grade owner.",
        "Check reports against approved assessment evidence and current grade descriptors.",
        "Verify the current NESA grade hand-off date and route with the authorised Deputy/data role.",
        "Resolve corrections and confirm the office submission by its current deadline."
      ]
    },
    "2027-t4-year9-report-chain": {
      "title": "Check and submit Term 4 Year 9 reports",
      "purpose": "Check Year 9 reports and return corrections in time for the confirmed office deadline.",
      "finished": "Every applicable Year 9 TAS report has been checked, corrected where needed and submitted by the office deadline.",
      "sourceFinished": "Every applicable Year 9 TAS report is checked and submitted by the office deadline.",
      "steps": [
        "Confirm the current Year 9 classes and who is responsible for each report.",
        "Check assessment evidence, grades and comments using the approved reporting process.",
        "Return any corrections to the teacher and check the revised reports.",
        "Confirm submission to the office through the school reporting system."
      ],
      "sourceSteps": [
        "Confirm classes and reporting owners.",
        "Check evidence, grades and comments.",
        "Return and recheck corrections.",
        "Confirm office submission."
      ]
    },
    "2027-t4-year7-report-chain": {
      "title": "Check and submit Term 4 Year 7 reports",
      "purpose": "Check Year 7 reports and return corrections in time for the confirmed office deadline.",
      "finished": "Every applicable Year 7 TAS report has been checked, corrected where needed and submitted by the office deadline.",
      "sourceFinished": "Every applicable Year 7 TAS report is checked and submitted by the office deadline.",
      "steps": [
        "Confirm the current Year 7 classes and who is responsible for each report.",
        "Check assessment evidence, grades and comments using the approved reporting process.",
        "Return any corrections to the teacher and check the revised reports.",
        "Confirm submission to the office through the school reporting system."
      ],
      "sourceSteps": [
        "Confirm classes and reporting owners.",
        "Check evidence, grades and comments.",
        "Return and recheck corrections.",
        "Confirm office submission."
      ]
    },
    "2027-t4-showcase": {
      "title": "Prepare and run the TAS/VET Showcase and Open Day",
      "purpose": "Arrange approved displays, activities, staffing and safety, with VET promotional information checked by the responsible VET staff.",
      "finished": "The approved TAS contribution has been delivered safely, VET content is verified and follow-up is complete or allocated to a responsible person.",
      "sourceFinished": "The approved TAS contribution is safely staffed and delivered, VET content is verified, and follow-up actions are closed or owned.",
      "steps": [
        "Confirm the event brief, TAS contribution, rooms, staffing and details in the live school calendar.",
        "Check displays and activities meet current safety, consent, privacy and communications requirements before approval.",
        "Assign setup, supervision, pack-down and follow-up responsibilities.",
        "Have the VET Coordinator check VET promotion and compliance claims against current approved sources.",
        "Record a short post-event review and who will complete any follow-up."
      ],
      "sourceSteps": [
        "Confirm the event brief, TAS scope, rooms, staffing and live school calendar details.",
        "Approve displays and activities against current WHS, consent, privacy and communications requirements.",
        "Assign setup, supervision, pack-down and follow-up responsibilities.",
        "Route VET promotion and compliance claims to the VET Coordinator/current controlled sources.",
        "Record a short post-event review and owned actions."
      ]
    },
    "2027-t4-year8-report-chain": {
      "title": "Check and submit Term 4 Year 8 reports",
      "purpose": "Check Year 8 reports and return corrections in time for the confirmed office deadline.",
      "finished": "Every applicable Year 8 TAS report has been checked, corrected where needed and submitted by the office deadline.",
      "sourceFinished": "Every applicable Year 8 TAS report is checked and submitted by the office deadline.",
      "steps": [
        "Confirm the current Year 8 classes and who is responsible for each report.",
        "Check assessment evidence, grades and comments using the approved reporting process.",
        "Return any corrections to the teacher and check the revised reports.",
        "Confirm submission to the office through the school reporting system."
      ],
      "sourceSteps": [
        "Confirm classes and reporting owners.",
        "Check evidence, grades and comments.",
        "Return and recheck corrections.",
        "Confirm office submission."
      ]
    },
    "2027-t4-report-release": {
      "title": "Confirm Years 7–10 reports are ready to issue",
      "purpose": "Bring together the separate year-group report checks and deal with any remaining TAS issues before release.",
      "finished": "Every TAS reporting process is complete before release, or an outstanding issue has an authorised decision and a responsible person.",
      "sourceFinished": "Every TAS reporting chain is closed or has an authorised, owned exception before release.",
      "steps": [
        "Check progress on the Year 7, 8, 9 and 10 reporting processes.",
        "Resolve remaining TAS issues before release, or obtain an authorised decision and allocate responsibility.",
        "Confirm the school reporting system shows the expected release status.",
        "Carry improvement actions into next year's plan without student or report details."
      ],
      "sourceSteps": [
        "Review the Year 7, 8, 9 and 10 reporting-chain statuses.",
        "Resolve or formally own any remaining TAS exception before release.",
        "Confirm the authorised reporting system shows the expected release state.",
        "Carry only privacy-safe improvement actions into the next annual plan."
      ]
    },
    "2027-t4-enrichment": {
      "title": "Prepare any assigned TAS contribution to Year 10 Enrichment",
      "purpose": "Confirm whether the current program needs TAS support before preparing staff, resources or activities for it.",
      "finished": "The assigned TAS contribution is approved and ready, or the executive program lead has confirmed that TAS has no action.",
      "sourceFinished": "The TAS contribution is approved and ready, or the executive program lead has confirmed that TAS has no action.",
      "steps": [
        "Confirm the current program, the TAS role and the participating year group or students in the protected system.",
        "Approve staffing, resources and any required safety measures.",
        "Brief participating staff and check the effect on timetables.",
        "Record completion or a verified decision that TAS has no action."
      ],
      "sourceSteps": [
        "Confirm the current program, TAS role and cohort.",
        "Approve staffing, resources and any safety controls.",
        "Brief participating staff and confirm timetable impacts.",
        "Record completion or a verified not-applicable decision."
      ]
    },
    "2027-hsc-analysis-cycle": {
      "title": "Use HSC results to choose teaching improvements",
      "purpose": "Review current RAP/SCOUT results securely and agree a few practical changes to teaching, programs or staff development.",
      "finished": "Results have informed clear improvement actions, with responsible staff and review dates recorded in the approved faculty plan.",
      "sourceFinished": "Current results have produced named, evidence-informed improvement actions in the approved faculty planning record.",
      "steps": [
        "Confirm authorised access to current RAP/SCOUT results after they are released.",
        "Look for cohort and question-level patterns without exporting identifiable data into the workboard.",
        "Agree a small number of course-specific improvements, with responsible staff and review dates.",
        "Include the agreed actions in current programs, professional learning and the Faculty Management Plan."
      ],
      "sourceSteps": [
        "Confirm authorised access to the current RAP/SCOUT results after release.",
        "Analyse cohort and question-level patterns without exporting identifiable data to the workboard.",
        "Agree a small number of course-specific improvement actions with owners and review dates.",
        "Map the actions into current programs, professional learning and the Faculty Management Plan."
      ]
    },
    "2027-t2-hsc-practical-options-handoff": {
      "title": "Confirm TAS HSC practical exam options reached the submitter",
      "purpose": "Check which practical courses need an options entry and confirm the authorised school role received and handled the TAS information.",
      "finished": "The authorised school role has confirmed the relevant TAS handover and submission status, or confirmed that TAS did not need to contribute.",
      "sourceFinished": "The authorised school role has confirmed the applicable faculty hand-off and submission position, or confirmed that no TAS contribution was required.",
      "steps": [
        "Check which delivered HSC practical courses require an options entry in the relevant NESA timetable.",
        "Check the protected school record and confirm the course teacher's information reached the authorised submitter.",
        "Confirm the actual submission or an authorised decision that it was not required; a passed date does not prove completion.",
        "Refer unresolved issues to the authorised school or NESA role and record only a reference without personal details."
      ],
      "sourceSteps": [
        "Confirm which delivered HSC practical courses require an options entry in the current NESA timetable.",
        "Check the protected owner-system record and confirm the course-teacher information reached the authorised submitter.",
        "Confirm the actual submission or an authorised not-applicable decision; do not infer completion from the date passing.",
        "Carry any unresolved issue to the authorised school/NESA role and record only an appropriate safe reference."
      ]
    },
    "2027-t3-hsc-results-certification-handoff": {
      "title": "Confirm TAS information is ready for HSC results certification",
      "purpose": "Get any required TAS data or corrections to the authorised school role before the Principal's certification deadline.",
      "finished": "The authorised certifying role has accepted the TAS contribution and each discrepancy is resolved or assigned for formal follow-up.",
      "sourceFinished": "The authorised certifying role has accepted the applicable TAS contribution and every identified discrepancy is resolved or formally owned.",
      "steps": [
        "Confirm the applicable TAS HSC courses and who is authorised to certify the school's results.",
        "Check required faculty data and corrections have reached that person. Keep VET-specific data within the VET process.",
        "Confirm the handover is accepted and responsibility for discrepancies is assigned before the current NESA certification deadline.",
        "Record a confirmation reference or authorised decision that no action applies. Ticking this workboard does not let the Head Teacher certify for the Principal."
      ],
      "sourceSteps": [
        "Confirm applicable TAS HSC courses and the authorised role responsible for school results certification.",
        "Check that required faculty data and corrections from the relevant submission process have reached that role; keep VET-specific data with the VET workflow.",
        "Confirm the hand-off is accepted and any discrepancies are owned before the current NESA certification deadline.",
        "Record a safe confirmation reference or an authorised not-applicable decision; the Head Teacher does not certify on the Principal's behalf through this workboard."
      ]
    }
  };
})();
