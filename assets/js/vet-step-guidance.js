(function () {
  "use strict";

  // Navigation only. The existing system/source directory owns URLs and private
  // overrides; these prompts never claim that opening a link completes a control.
  const system = (systemId, label, hint) => ({ systemId, label, hint });
  const source = (sourceId, label, hint) => ({ sourceId, label, hint });
  const route = (path, label, hint) => ({ route: path, label, hint });
  const local = (item, hint = "") => system("wwhs-drive", `Search WWHS VET Drive — ${item}`, hint || `Use your work account to find the approved ${item}; this opens a search, not the document itself.`);
  const library = (item = "current RTO guidance") => system("document-library", "Open RTO Document Library", `After staff sign-in, find ${item} for the task year and check its version.`);
  const hub = (item = "current school actions and notices") => system("vet-schools-hub", "Open VET Schools Hub", `After staff sign-in, open ${item}.`);
  const evidence = (item = "the relevant course and retained assessment record") => system("evidence-central", "Open Evidence Central", `After staff sign-in, open ${item}; keep learner evidence in that system.`);
  const nesa = (item = "the relevant course or data action") => system("schools-online", "Open Schools Online", `An authorised user can open ${item} after sign-in. Check the task year before acting.`);
  const sentral = (item = "the relevant timetable, markbook or report") => system("sentral", "Open Sentral", `After staff sign-in, open ${item} in the approved school workflow.`);
  const dates = system("nesa-toa", "Check NESA live dates", "Select the task year and check the latest revision. A previous year's date does not establish the new deadline.");
  const staff = (item = "the trainer's authorisation and currency record") => system("my-vet-workplace", "Open My VET Workplace", `After staff sign-in, open ${item}. Credential files stay in the authorised location.`);
  const placement = (item = "the relevant approved placement and administration record") => system("placement-provider-portal", "Open COMPACT Pathways staff portal", `After staff sign-in, find ${item}. This is separate from student work-readiness learning.`);
  const finance = (item = "the approved allocation, commitments and expenditure records") => system("finance-system", "Open school finance", `Use the Department sign-in and finance permissions to find ${item}; confirm the current SBAR location with the finance owner.`);
  const calendar = local("approved VET calendar", "Find the calendar for the task year. Check school reporting, placement and meeting dates with their owners.");
  const schoolCalendar = system("staff-calendar", "Open the school staff calendar", "Check current reporting, assessment and meeting constraints; confirm placement dates with the placement owner.");
  const actions = local("team action register", "Find the approved team action record and the relevant item; record role, verifier, due point and follow-up there.");
  const roles = local("approved roles and delegations", "Find the current approved management/delegation record; confirm responsibilities with the Principal or authorised delegate.");
  const sources = route("./task-sources/?wing=vet", "Open VET task sources", "Find the relevant task's authority and source access route; check the actual current source before acting.");
  const issues = route("#issues", "Review authority gaps", "Review the visible source and authority gaps; keep unresolved matters owned.");
  const systems = route("#systems", "Open system and source directory", "Use the approved links for each system you are authorised to access.");
  const work = route("#vet-home", "Open VET task list and full register", "Review waiting work and hand-offs; record only privacy-safe references here.");
  const cycle = route("#cycle-2027", "Open the 2027 operating cycle", "Review the separately tracked control points and their prerequisite states.");
  const wpl = source("DOE-WPL-PROCEDURE", "Read workplace-learning procedure", "Check the current preparation, contact, safety, escalation and record requirements for this placement.");
  const forms = source("DOE-WPL-FORMS", "Open workplace-learning guides and forms", "Choose the current form and check the course and placement requirements before using it.");
  const privacy = source("DOE-PRIVACY", "Read Department privacy requirements", "Use the current approved privacy and incident process; do not paste confidential records into this workboard.");
  const retention = source("DOE-FA387", "Open education records retention authority", "Locate the relevant record category and confirm the approved school retention process before archiving or disposal.");
  const usi = source("USI-PROVIDERS", "Open USI provider guidance", "Check the authorised verification and reporting process. Follow current RTO instructions about who updates each system.");
  const entries = source("NESA-VET-ENTRIES", "Read NESA VET entry rules", "Check the applicable entry, course-change and qualification requirements against the live Schools Online instructions.");
  const rpl = source("NESA-RPL-CT", "Read NESA credit transfer and RPL guidance", "Keep credit transfer, RPL and course credit distinct; use the authorised decision and application process.");
  const scope = system("tga", "Check RTO 90333 registration and scope", "Check the exact training product; central RTO scope is separate from the school's delivery authority.");
  const mapped = Object.create(null);
  function define(ids, steps) {
    for (const id of Array.isArray(ids) ? ids : [ids]) {
      if (mapped[id]) throw new Error(`Duplicate VET step guidance: ${id}`);
      mapped[id] = steps;
    }
  }

  define("a-01-confirm-authority-set", [
    [dates], [library("the current term guide and Quality Manual"), hub("latest RTO notices")],
    [sources, local("source/version register")], [issues, actions]
  ]);
  define("a-02-build-live-calendar", [
    [dates, library("the current term guides and changed-date notices")],
    [schoolCalendar, placement("confirmed placement windows"), evidence("the approved assessment schedule")],
    [local("approved VET calendar and action register", "Find the current working calendar; record each action's owner, verifier, evidence destination and lead time in the approved record.")],
    [local("VET calendar and team meeting record", "Find the current calendar alongside the approved meeting agenda/minutes and carry any changed dates into the working record.")]
  ]);
  define("a-03-confirm-roles-access", [
    [roles], [roles], [systems], [hub("current VSO/RTO contact and support route"), roles]
  ]);
  define("a-04-update-school-profile", [
    [hub("School Profile"), local("current staffing, facilities and delivery records")],
    [hub("School Profile correction workflow")], [hub("current support/escalation route")], [hub("School Profile completion/status trail")]
  ]);
  define("a-05-confirm-delivery", [
    [scope], [hub("Authority to Deliver and intended course delivery")],
    [hub("school delivery approvals"), staff(), local("facilities and equipment readiness")], [hub("Confirmation of Delivery and support route")]
  ]);
  define("a-06-reconcile-course-codes", [
    [hub("approved course and qualification"), sentral("class and timetable codes"), nesa("VET course entries")],
    [sentral("the intended cohort and class"), hub("approved delivery")], [nesa("the entry requiring correction"), sentral("the class/timetable record requiring correction"), hub("the school delivery record")], [actions]
  ]);
  define("a-07-trainer-readiness", [
    [staff("course authorisation and VET Teacher Training status"), hub("trainer/course approval")], [staff()],
    [library("the current trainer supervision and contingency requirements"), hub("school-specific approval")], [staff(), hub("outstanding delivery readiness actions")]
  ]);
  define("a-08-publish-local-handbook", [
    [local("staff VET handbook"), library()], [local("staff VET handbook")],
    [local("approved staff briefing and distribution arrangements", "Find the approved staff channel and document location in the local procedure; this search does not send a message.")], [local("VET team briefing record"), systems]
  ]);
  define("t1-01-usi-verification", [
    [usi, source("USI-PERMISSION", "Check permission to access a student USI", "Follow the current permission requirements within the authorised collection and verification process."), library("the current RTO USI collection and verification procedure")], [usi, local("approved USI procedure")],
    [evidence("the authorised USI verification status"), library("the current RTO USI workflow")], [library("current instructions assigning USI upload responsibility")]
  ]);
  define("t1-02-external-vet-entries", [
    [system("evet-portal", "Open EVET staff portal", "After staff sign-in, check the provider, course, delivery mode and application status."), source("DOE-EVET", "Read Department External VET guidance", "Use the current school/provider responsibilities and application instructions.")],
    [system("evet-portal", "Open EVET staff portal", "Open the current school-assigned application/entry action."), nesa("the applicable external VET entry")],
    [system("evet-portal", "Check provider confirmation in EVET", "Compare the authorised provider confirmation with the school entry."), nesa("external VET course entry")], [actions]
  ]);
  define("t1-03-onboarding-induction-support", [
    [library("current enrolment and induction materials"), evidence("course induction")],
    [source("NESA-VET", "Read NESA VET course guidance", "Check current HSC, course and assessment expectations."), library("the current course induction and workplace-learning information")],
    [system("lln-robot", "Open LLN Robot", "Use the approved staff workflow for the relevant cohort; learner support results remain in the owner system."), system("go2workplacement", "Open Go2WorkPlacement readiness learning", "Use the authorised teacher workflow for student work-readiness learning; this is not the placement-provider portal.")],
    [library("current learner support and reasonable-adjustment procedure"), local("approved confidential learner-support process")]
  ]);
  define("t1-04-rpl-credit-transfer", [
    [rpl], [rpl, evidence("authorised prior-learning evidence references")], [library("the current RPL or credit-transfer application and evidence procedure")], [evidence("the approved decision"), nesa("any approved course-credit or entry consequence")]
  ]);
  define("t1-05-tas-and-assessment-readiness", [
    [system("course-library", "Open current course library", "Select the stage and exact course, then locate the current contextualised training and assessment strategy.")],
    [system("course-library", "Check course scope and sequence", "Compare the current approved training and assessment strategy with the intended cohort and delivery sequence.")],
    [system("course-library", "Open controlled course assessment resources", "Select the course and verify the approved resource version before release.")], [evidence("the intended course's current controlled resource")]
  ]);
  define("t1-06-work-placement-plan", [
    [wpl, system("course-library", "Check course placement requirements", "Select the intended course and check its current workplace-learning requirement.")],
    [source("COMPACT-WPL", "Check COMPACT placement-provider information", "Confirm the current provider and staff access route; the staff placement portal and student readiness learning have different purposes."), placement()],
    [placement(), calendar], [wpl, forms, system("go2workplacement", "Open Go2WorkPlacement readiness learning", "Use the authorised readiness-learning workflow alongside the required placement approvals.")], [forms, local("official Student Placement Record handling procedure")]
  ]);
  define("t1-07-nesa-check-one", [
    [dates, local("NESA check schedule and SOP")], [nesa("course entries and pattern of study"), hub("approved delivery"), entries],
    [nesa("the entry requiring correction"), hub("the delivery record requiring correction")], [local("NESA check and exception record")]
  ]);
  define("t1-08-monitor-support-funds", [
    [finance("the current SBAR/VET Support Funds allocation")], [library("current VET Support Funds conditions"), finance("approved purchasing and delegation requirements")],
    [finance()], [finance(), hub("delivery readiness needs")]
  ]);
  define("t1-09-short-course-coassessment", [
    [library("the current short-course/co-assessment requirements"), source("SAFEWORK-WHITE-CARD", "Check White Card requirements if applicable", "Use this only where the specific course or activity requires a White Card.")],
    [library("the approved provider, assessor or co-assessor process")], [calendar, evidence("the intended short-course evidence destination")], [evidence("the authorised short-course completion evidence")]
  ]);
  define("t2-01-confirm-rto-qualification", [
    [dates, nesa("the current RTO/qualification confirmation action"), hub("current delivery state")], [nesa("the course's RTO and qualification fields")],
    [hub("approved delivery"), system("course-library", "Open the current course strategy", "Select the course and compare the qualification and delivery requirements.")], [nesa("the corrected confirmation action"), actions]
  ]);
  define("t2-02-sbat-status", [
    [local("approved SBAT contract and status process"), library("current SBAT instructions")], [nesa("the applicable SBAT and TCID fields")],
    [local("approved SBAT training-plan record"), sentral("the authorised school pathway record")], [local("approved SBAT record location")]
  ]);
  define("t2-03-enter-competencies", [
    [evidence("the assessor decision and supporting evidence")], [source("NESA-VET-UNITS", "Read NESA unit and outcome guidance", "Check the exact qualification and competency codes."), nesa("the applicable qualification/unit fields")],
    [nesa("the authorised competency outcome entry")], [evidence(), sentral("the relevant VET markbook"), nesa("the entered outcomes")]
  ]);
  define("t2-04-finalise-usi-exceptions", [
    [local("approved USI exception-list location")], [usi, library("current USI correction and verification procedure")],
    [evidence("the authorised USI verification state"), library("the current owner-system USI workflow")], [hub("current RTO support route"), local("approved USI exception-list location")]
  ]);
  define("t2-05-learner-questionnaire", [
    [library("the current learner questionnaire notice and eligible cohort"), hub("the current survey instruction/link")],
    [calendar, hub("the approved questionnaire access link")], [hub("the current questionnaire completion workflow")], [actions]
  ]);
  define("t2-06-finalise-semester-one-reports", [
    [library("current VET reporting requirements"), local("internal audit checklist")], [sentral("the semester report and markbook"), evidence()],
    [sentral("the report or markbook requiring correction"), evidence("any evidence discrepancy")], [sentral("the report-verification workflow")]
  ]);
  define(["t2-07-nesa-check-two", "t3-06-nesa-check-three"], [
    [dates, library("the current term's NESA check requirements"), local("NESA check SOP")], [nesa("the applicable qualification, competency and outcome fields")],
    [evidence(), sentral("the relevant VET markbook"), nesa("the relevant VET entries/outcomes")], [nesa("the checked entry/correction state"), local("NESA check and exception record")]
  ]);
  define("t2-08-plan-next-year-delivery", [
    [hub("proposed delivery"), local("next-year course, staffing and facilities plan")], [staff("current training and approval requirements")],
    [hub("the current Authority to Run / Authority to Deliver workflow")], [hub("the official approval state"), local("draft subject-selection information")]
  ]);
  define("t2-09-review-stage6-entry-cutoff", [
    [entries, nesa("the applicable year's VET entry instructions")], [local("2026 entry cut-off check record", "Find the authorised check result for 30 June 2026. A missing workboard tick does not show the check was missed.")],
    [entries, local("2026 entry review record")], [nesa("the authorised correction/support route"), actions]
  ]);
  define("t3-01-year11-work-placement", [
    [wpl, forms, placement()], [placement("attendance, contact and welfare follow-up")], [wpl],
    [placement("completed attendance and hours"), nesa("applicable placement-hour records"), local("original Student Placement Record filing procedure")]
  ]);
  define("t3-02-meeting-follow-up", [
    [hub("the official coordinator meeting material and RTO notices")], [actions], [local("VET team briefing and acknowledgement record")], [local("VET calendar and meeting-action record")]
  ]);
  define("t3-03-progressive-outcomes", [
    [system("course-library", "Open the controlled assessment tool", "Select the exact course/unit and current approved assessment tool."), evidence("the assessor decision")],
    [evidence("the retained assessment evidence")], [evidence("feedback and teacher annotations")], [sentral("the applicable markbook outcome"), nesa("the applicable progressive outcome")]
  ]);
  define("t3-04-hsc-exam-entry", [
    [nesa("the current optional VET HSC examination entrants"), dates], [nesa("the authorised examination addition/withdrawal workflow")],
    [nesa("course and examination entries"), sentral("the relevant cohort record")], [actions]
  ]);
  define("t3-05-hsc-estimates", [
    [nesa("the current HSC VET estimates guide and eligible exam cohort"), dates], [local("approved HSC estimate working record"), nesa("the current estimates instructions")],
    [local("approved HSC estimate verification record")], [nesa("the HSC estimate submission and confirmation state"), dates]
  ]);
  define("t3-07-exit-survey", [
    [hub("the current exit-survey notice, link and collection window")], [hub("the approved exit-survey access link")],
    [hub("the approved aggregate survey completion workflow")], [local("continuous-improvement action record")]
  ]);
  define("t3-08-next-year-promotion", [
    [hub("Authority to Run / Authority to Deliver requirements")], [hub("the proposed course's readiness state"), staff(), local("facilities and equipment readiness")],
    [library("current mandated course descriptors and promotion information")], [hub("the official approval state"), local("approved subject-selection publication process")]
  ]);
  define("t3-09-hsc-schedule-and-delivery-check", [
    [local("approved HSC assessment booklet")], [system("course-library", "Open the current training and assessment strategy", "Compare the course delivery sequence and assessment plan."), evidence("assessment progress")],
    [evidence("unfinished assessment actions"), staff("outstanding teacher-training actions")], [actions, system("course-library", "Check controlled assessment requirements", "Recovery planning must retain the approved assessment requirements.")]
  ]);
  define("t3-10-principal-hsc-certification", [
    [dates, nesa("Principal certification of HSC results data")], [nesa("submitted VET estimates and applicable HSC data"), local("verified VET estimate record")],
    [local("Principal / authorised delegate HSC certification handover")], [nesa("official certification confirmation"), actions]
  ]);
  define(["t4-01-year11-final-outcomes", "t4-03-year12-year10-final-data"], [
    [evidence("final assessor decisions and retained evidence")], [placement("completed placement hours"), local("original Student Placement Record filing procedure")],
    [nesa("the applicable cohort's final outcomes and placement hours")], [nesa("the final entered state"), evidence(), sentral("the final VET markbook")]
  ]);
  define("t4-02-year11-reports", [
    [sentral("the Year 11 VET markbook"), evidence()], [sentral("Year 11 report statements"), nesa("the final authorised outcomes")],
    [sentral("the report/markbook requiring correction"), evidence("the relevant evidence record"), nesa("any incorrect official entry")], [sentral("the report-verification record")]
  ]);
  define("t4-04-year9-short-course-entries", [
    [local("authorised short-course completion record"), evidence("the relevant short-course evidence where used")], [entries, nesa("the current short-course entry instructions")],
    [nesa("the required eligible short-course entry")], [nesa("the completed entry state"), local("NESA check record")]
  ]);
  define("t4-05-year12-markbook-closure", [
    [evidence("final assessment decisions, retained evidence and feedback")], [sentral("the Year 12 VET markbook"), evidence("course completion states")],
    [nesa("the final entered outcomes"), sentral("the reconciled markbook")], [local("markbook closure exceptions and rollover procedure")]
  ]);
  define("t4-06-next-year-vet-hub", [
    [hub("proposed next-year courses"), staff(), local("facilities and equipment readiness")], [hub("ATR/ATD application and approval states")],
    [hub("the current next-year delivery workflow")], [hub("unresolved approval and delivery-readiness actions")]
  ]);
  define("t4-07-markbook-rollover", [
    [sentral("the final reconciled markbook"), evidence(), nesa("final outcomes")], [local("markbook archive and rollover procedure"), retention],
    [sentral("approved new-year markbook structures"), local("markbook rollover procedure")], [sentral("current classes and assigned teachers"), evidence("authorised cohort and leaver-management workflow")]
  ]);
  define("t4-08-year-end-assurance", [
    [local("internal audit checklist"), systems], [evidence("retained assessment evidence"), local("official Student Placement Record filing procedure")],
    [local("continuous-improvement action record")], [sources, issues, calendar]
  ]);
  define("t4-09-support-fund-acquittal", [
    [hub("current VET Support Funds acquittal/return notice"), library("the current acquittal form and deadline")], [finance()],
    [finance("the approved expenditure correction process")], [finance("the authorised acquittal/return and confirmation route"), hub("any RTO acquittal action")]
  ]);
  define("c-01-rto-updates", [
    [hub("the original RTO communication and To Do items")], [hub("the notice being triaged"), actions], [actions], [local("VET calendar and team briefing record")], [systems, actions]
  ]);
  define("c-02-team-meetings", [
    [hub("latest RTO updates"), local("VET calendar and open meeting actions")], [local("VET team meeting minutes and action register")],
    [local("approved staff briefing and acknowledgement record")], [actions]
  ]);
  define("c-03-evidence-feedback-assurance", [
    [system("course-library", "Open controlled assessment tool and benchmark", "Select the intended course/unit and current approved version.")], [evidence("the authorised risk-based sample")],
    [evidence("the retained evidence supporting each sampled decision")], [evidence("written feedback and assessor annotations")], [evidence("the corrected evidence/feedback record"), local("evidence-monitoring action record")]
  ]);
  define("c-04-cross-system-reconciliation", [
    [sentral("the relevant class and VET markbook"), evidence("the matching course/cohort"), nesa("the matching course/qualification")],
    [local("Markbook / PxP / NESA cross-check template")], [sentral("the school-owned discrepancy"), evidence("the evidence-owned discrepancy"), nesa("the NESA-owned discrepancy")], [local("approved cross-check and closure record")]
  ]);
  define("c-05-industry-currency", [
    [staff()], [staff("professional-learning and industry-currency opportunities"), hub("current network and community-of-practice notices")],
    [staff("the authorised activity and evidence record")], [staff("unresolved readiness actions"), hub("current VSO/RTO support route")]
  ]);
  define("c-06-sbat-monitoring", [
    [local("approved SBAT training-plan and contract record"), library("current SBAT monitoring requirements")], [local("approved SBAT progress and provider-contact record")],
    [local("approved SBAT escalation and change process")], [nesa("applicable SBAT identifiers and outcomes"), evidence("applicable authorised training outcomes")]
  ]);
  define("c-07-workplace-learning-control", [
    [wpl, forms, placement()], [placement("attendance, contact and welfare follow-up"), wpl], [wpl, privacy],
    [placement("completed attendance and hours"), local("original Student Placement Record filing procedure")]
  ]);
  define("c-08-records-privacy-control", [
    [privacy, systems], [privacy], [retention, local("approved paper and digital records procedure")], [privacy, local("approved access and sharing register")], [privacy]
  ]);
  define("c-09-validation-improvement", [
    [hub("current validation invitation or improvement request"), library("current validation schedule and tools")], [library("the authorised validation/feedback activity")],
    [evidence("approved learner samples where applicable"), library("the controlled assessment tools and validation records procedure")], [local("continuous-improvement action record")], [local("continuous-improvement action record"), hub("any delivery or resource change requiring RTO action")]
  ]);
  define("e-01-delivery-change", [
    [hub("the existing delivery approval and current change requirements")], [hub("School Profile and Authority to Deliver"), staff(), local("facilities and equipment readiness")],
    [library("the current supervised-delivery and approval pathway"), hub("required delivery authorisation")], [hub("the controlled correction/application workflow"), library("required supervision and monitoring records")], [hub("verified approval and readiness state")]
  ]);
  define("e-02-new-course-authority", [
    [scope, source("NESA-VET", "Check NESA course requirements", "Check the intended course's endorsement separately from RTO scope."), hub("school-specific delivery authority")],
    [source("NESA-BEC-APPLICATION", "Open new VET Board Endorsed course process", "Check the current application process and closing date; follow the required Department consultation route."), dates],
    [hub("current ATR / ATD application workflow"), library("required course readiness evidence")], [hub("all applicable official approval states")]
  ]);
  define("e-03-enrolment-change", [
    [sentral("the authorised enrolment/withdrawal decision"), entries], [sentral("the approved class/markbook change"), evidence("course onboarding or withdrawal"), nesa("the authorised VET entry change")],
    [sentral("class/PxP and markbook"), evidence(), nesa("the course entry")], [nesa("HSC examination and course-entry implications"), placement("any changed placement arrangement"), sentral("reporting implications")]
  ]);
  define("e-04-support-or-rpl-request", [
    [local("approved confidential support/referral route")], [rpl, library("current learner support, reasonable-adjustment and RPL procedures")],
    [library("the applicable assessor and adjustment requirements")], [evidence("the authorised decision and implementation record"), nesa("approved course-credit consequences where applicable")]
  ]);
  define("e-05-incident-response", [
    [{hint: "Protect people and use the school's immediate emergency response first. Do not delay urgent action to open a link; preserve evidence and prevent further disclosure or harm."}],
    [system("incident-reporting", "Open Department incident reporting", "After staff sign-in, follow the applicable school/Department incident-reporting route. Use the privacy procedure separately for the required privacy response."), privacy],
    [wpl, local("school incident escalation contacts", "Use the school's current incident/emergency contacts immediately; searching must not delay an urgent response.")],
    [system("incident-reporting", "Open Department incident reporting", "Record necessary incident facts in the authorised reporting process; do not copy them into this workboard."), privacy], [wpl, local("approved incident follow-up process")]
  ]);
  define("e-06-discrepancy-corrective-action", [
    [sources, library("the procedure controlling the specific discrepancy")], [library("the applicable correction and escalation procedure")], [local("corrective-action register")],
    [systems, local("corrective-action register")], [local("corrective-action and improvement record")]
  ]);
  define("e-07-coordinator-handover", [
    [roles, systems], [calendar, sources, systems, issues], [actions],
    [hub("a current update to triage"), local("cross-system reconciliation and escalation procedures")], [systems, roles]
  ]);

  // Independent 2027 controls do not inherit a superficially similar 2026 task.
  define("2027-g00-rollover", [
    [route("#issues", "Open handover and backup", "In Handover and backup, use Export workboard for privacy-safe metadata; official evidence stays in its owner system.")],
    [route("#year?year=2026", "Review the 2026 reference register", "Review unfinished 2026 work and identify genuine carry-overs.")], [actions], [cycle], [local("2026 archive and 2027 handover record"), sources]
  ]);
  define("2027-g10-activate", [
    [sources, issues], [local("approved calendar and action owners")], [roles, systems],
    [hub("approved courses and delivery readiness"), staff(), system("course-library", "Check controlled course resources", "Verify the current training and assessment strategy and approved resources.")], [cycle, local("Term 1 activation and handover record")]
  ]);
  define("2027-t2-w09-entry-audit", [
    [entries, nesa("the live entry-check instructions"), dates], [nesa("current Preliminary and HSC VET entries"), hub("approved delivery")],
    [entries, nesa("course exclusions and course-change requirements")], [nesa("the authorised entry-audit correction process"), actions], [nesa("the checked aggregate entry state"), local("independent entry-audit check record")]
  ]);
  define("2027-t2-w10-entry-cutoff", [
    [nesa("the live entry action"), local("independently checked entry-audit exceptions")], [nesa("the authorised course-entry or change action"), entries],
    [entries, nesa("the applicable course and mandatory placement requirements")], [nesa("the independently checked aggregate entry state")], [actions]
  ]);
  define("2027-t4-w06-next-year-hub", [
    [hub("current 2028 delivery instructions")], [hub("proposed 2028 School Profile, delivery intention, course, qualification and site")],
    [staff("each proposed trainer/assessor's current authorisation and currency")], [hub("open To Do, access, approval and readiness items")], [hub("the verified aggregate 2028 delivery state"), local("2028 delivery-readiness verification record")]
  ]);

  const weeklyClose = [
    [cycle], [work, actions], [actions], [privacy, systems], [local("weekly closure and handover record"), cycle]
  ];
  const termOpen = [
    [dates, nesa("the current term's data actions"), library("the current term guide and changed instructions"), schoolCalendar],
    [sources, local("source/version register")], [roles, systems], [actions, work], [issues, actions]
  ];
  const termAssurance = [
    [sources, hub("changed instructions and notices")], [hub("required delivery and RTO results"), evidence(), nesa("required term data results"), systems],
    [work, actions], [local("term assurance and independent sign-off record")], [cycle, actions]
  ];
  const placementOccurrence = [
    [wpl, forms, placement()], [wpl, placement("the required Day 1/Day 2 contact and attendance record")],
    [wpl, privacy], [placement("attendance and course-specific placement hours"), local("original Student Placement Record filing procedure")],
    [wpl, placement("post-placement review and outstanding exceptions")]
  ];

  function normalise(value) { return String(value || "").trim().replace(/\s+/g, " "); }
  function mappingFor(task, step, index) {
    const id = task?.id || "", key = task?.canonicalTaskId || id;
    if (/^2027-(?:t[234]-)?w\d{2}-close$/.test(id)) return weeklyClose[index];
    if (/^2027-t[234]-w01-open$/.test(id)) return termOpen[index];
    if (/^2027-(?:t[23]-)?w10-term-assurance$/.test(id)) return termAssurance[index];
    if (id === "2027-t4-w11-year-close") {
      return index === 4 ? [local("2027 annual archive and 2028 carry-over record", "Find the approved annual archive and assign clean 2028 carry-overs; this app currently supplies the 2027 cycle only.")] : termAssurance[index];
    }
    if (key === "c-07-workplace-learning-control" && task.actionSteps?.length === 5 && /Day 1 or Day 2/.test(task.actionSteps[1] || "")) return placementOccurrence[index];
    if (mapped[id]) return mapped[id][index];
    const original = window.VET_WORKBOARD?.taskRegister?.tasks?.find(item => item.id === key);
    if (!original || !mapped[key]) return [];
    // Match the actual canonical wording, not the ordinal: a reordered or newly
    // inserted step must never receive an unrelated neighbouring destination.
    const originalIndex = original.actionSteps.findIndex(text => normalise(text) === normalise(step));
    return originalIndex < 0 ? [] : mapped[key][originalIndex];
  }

  function forStep(task, step, index) {
    if (!task || !Number.isInteger(index) || index < 0 || index >= (task.actionSteps || []).length || normalise(task.actionSteps[index]) !== normalise(step)) return [];
    return (mappingFor(task, step, index) || []).map(item => ({ ...item }));
  }
  function forTask(task) {
    const seen = new Set();
    return (task?.actionSteps || []).flatMap((step, index) => forStep(task, step, index)).filter(item => {
      if (!item.systemId && !item.sourceId && !item.route) return false;
      const key = item.systemId ? `system:${item.systemId}` : item.sourceId ? `source:${item.sourceId}` : `route:${item.route}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }
  window.VET_STEP_GUIDANCE = Object.freeze({ forStep, forTask });
})();
