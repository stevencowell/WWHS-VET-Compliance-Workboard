// Preparation briefs only. The caller supplies current task steps, sources and occurrence metadata.
// Explicit task mappings keep new catalogue entries from receiving an unsuitable generic brief.
const profiles = {
  coordination: {
    label: 'Prepare the agenda and actions',
    summary: 'Turn the confirmed meeting or duty brief into a short running order and clear hand-backs.',
    deliverable: 'A one-page agenda or coordination brief, plus an action table: action, responsible role, confirmed date, evidence destination and next review.',
    instructions: [
      'Separate information, decisions, actions and escalations. Propose a realistic running order within the confirmed time available.',
      'Carry forward only actions confirmed as open in the supplied record. Keep proposed actions separate from agreed decisions.',
      'Draft a short staff reminder with the purpose, preparation needed and confirmed arrangements; leave it ready for review.'
    ],
    requiredInputs: ['Current approved meeting or duty brief and available time.', 'Non-confidential unresolved actions, role responsibilities and approved communication route.'],
    reviewChecks: ['The brief fits the confirmed scope and time; suggested allocations are labelled as proposals.', 'No invented attendance, decision, completed action or personal roster detail appears.']
  },
  reporting: {
    label: 'Prepare the reporting checks',
    summary: 'Organise the reporting chain, quality checks and correction hand-backs before each milestone.',
    deliverable: 'A reporting QA checklist, milestone hand-off table and short correction/reminder template using blank or aggregate status fields.',
    instructions: [
      'Separate teacher preparation, Head Teacher checking, corrections, office submission and release; use only applicable stages from the task.',
      'Turn the approved reporting guidance into checks for evidence alignment, grade process, comment style and submission state. Leave all learner-level checking in the authorised system.',
      'Show what each role must return, the source of its deadline and how an unresolved exception is handed back. Do not generate student reports, marks or judgements.'
    ],
    requiredInputs: ['Current reporting instructions, approved style/QA criteria and confirmed milestone schedule.', 'Aggregate progress by reporting stage and the roles responsible for corrections and release; no report extracts.'],
    reviewChecks: ['Internal checking, data hand-offs and final release are not mistaken for the same deadline.', 'An unchecked or unavailable report is not labelled inaccurate, missing or completed.']
  },
  'course-information': {
    label: 'Prepare the course information',
    summary: 'Check the supplied approved course information and draft a clear faculty contribution.',
    deliverable: 'A source comparison table, concise draft copy or presentation outline, and a pre-publication checklist.',
    instructions: [
      'Compare proposed course, pathway, prerequisite, fee and facility statements against the current approved masters; list differences and unverified claims.',
      'Draft concise copy for the stated audience and format using only supported claims. Mark missing facts as To confirm.',
      'Provide a correction list and review checklist for the publishing owner, including accessible links and any required consent checks; do not publish or retire content.'
    ],
    requiredInputs: ['Current approved handbook/course information and the exact draft or brief to prepare.', 'Confirmed audience, format, publishing owner and permission requirements; no identifiable work or images.'],
    reviewChecks: ['Every course, fee or pathway claim is supported by a current approved source.', 'VET claims and publication permissions remain for their authorised owners to confirm.']
  },
  'event-preparation': {
    label: 'Prepare the event brief',
    summary: 'Make the confirmed TAS contribution, checks and staff communication manageable.',
    deliverable: 'A staged preparation/run/close-out checklist, role action table and draft staff briefing.',
    instructions: [
      'Confirm that TAS is assigned a contribution, then limit the plan to that scope and the supplied live event brief.',
      'Organise preparation, setup or coverage, supervision, communication and close-out into practical steps with confirmed owners and dates or To confirm placeholders.',
      'List the approval, safety and consent checks for authorised staff to complete in their owner systems. Draft communication without participant or case information.'
    ],
    requiredInputs: ['Current event brief, confirmed TAS contribution and live calendar arrangements.', 'Approved event requirements and role responsibilities, using non-personal summaries only.'],
    reviewChecks: ['The event is confirmed and the plan does not create a commitment, booking or approval.', 'Safety, consent and staffing approval remain explicit human checks.']
  },
  'student-review': {
    label: 'Prepare the review contribution',
    summary: 'Prepare the structure for TAS’s assigned review or assembly contribution without moving protected records.',
    deliverable: 'A short contribution outline, blank preparation checklist and role-based follow-up table.',
    instructions: [
      'Confirm the assigned event, TAS role and requested contribution from the current brief; do not assume a historical review rhythm applies.',
      'Draft an agenda or contribution structure using only approved aggregate information, with placeholders for staff to complete inside the protected system.',
      'Provide a hand-back table for decisions and support actions to be recorded by authorised staff; do not infer any individual learner concern.'
    ],
    requiredInputs: ['Current event brief and confirmed TAS responsibility.', 'Approved non-identifying contribution criteria or aggregate summary; no learner, wellbeing, attendance or roster records.'],
    reviewChecks: ['No individual learner, family or staff situation can be inferred from the draft.', 'Follow-up destinations and responsible roles match the current school process.']
  },
  'authorised-handoff': {
    label: 'Prepare the authorised hand-off',
    summary: 'Clarify applicability, the correct owner and the evidence needed for a controlled hand-off.',
    deliverable: 'An applicability/authority checklist, hand-off table and concise draft request to the responsible role.',
    instructions: [
      'Identify the exact obligation or boundary in the nominated current source. Separate confirmed TAS responsibilities from work owned by another authorised role.',
      'Prepare a table of required input category, checking role, submitting/receiving role, stated deadline and approved destination; use placeholders where authority is not established.',
      'Draft the clarification or hand-off message. Do not prepare learner-level data, make a not-applicable decision, submit data or duplicate a controlled VET process.'
    ],
    requiredInputs: ['Current controlling notice/procedure and a non-personal description of the TAS contribution.', 'Confirmed submitting/receiving authority and internal hand-off requirements.'],
    reviewChecks: ['Applicability and authorisation are established by the current owner, not inferred from an old task title.', 'The draft requests or organises the hand-off without claiming that it has been completed.']
  },
  'results-improvement': {
    label: 'Prepare the improvement review',
    summary: 'Turn approved aggregate results into a small set of evidence-linked teaching questions and actions.',
    deliverable: 'A brief trend table, questions for the faculty and up to three proposed improvement actions with review measures.',
    instructions: [
      'Use only supplied approved aggregate results; show the comparison period and distinguish observation from a possible explanation.',
      'Identify a small number of patterns worth discussing and note limitations, including small cohorts or incomplete comparisons.',
      'Propose practical program or professional-learning actions linked to those patterns, with a measurable review question and a role/date to confirm. Do not claim causation or evaluate an individual teacher or learner.'
    ],
    requiredInputs: ['Approved non-identifying aggregate analysis and its comparison period; suppress small groups that could identify a person.', 'Current course/program priorities and the faculty review brief.'],
    reviewChecks: ['Each observation is traceable to supplied aggregate evidence and uncertainty is visible.', 'Proposed actions are achievable and await faculty agreement.']
  },
  'source-access': {
    label: 'Prepare the access review',
    summary: 'Organise an owner-led sharing review without collecting permission lists or changing access.',
    deliverable: 'A blank access-review matrix, proposed review sequence and signed-out/unauthorised-access test checklist.',
    instructions: [
      'Separate general reference material from confidential categories using the approved information-handling rules.',
      'Draft a review matrix for broad-link, group, legacy and external access, with owner decision and retest columns; leave account and folder details in the controlled system.',
      'Prepare an owner review request and test checklist. Do not enumerate private permissions, change sharing or claim that a test was performed.'
    ],
    requiredInputs: ['Current school access/sharing requirements and the responsible owner role.', 'Non-sensitive scope categories and approved front-door references only; no permission exports or restricted links.'],
    reviewChecks: ['The actual owner approves every access change and verifies access after any change.', 'No account names, permission lists or sensitive descendant links are reproduced.']
  },
  calendar: {
    label: 'Prepare the control calendar',
    summary: 'Reconcile confirmed dates into a usable preparation and checking sequence.',
    deliverable: 'A date reconciliation table and draft annual/term control calendar with source, owner, preparation point and checking point.',
    instructions: [
      'Extract only the current source’s stated year, date, time and applicable action; distinguish TAS-owned work, contributions and awareness-only entries.',
      'Flag missing, conflicting or superseded dates rather than rolling the previous year forward.',
      'Suggest preparation/checking points separately from official deadlines, clearly labelled as proposals for the owner to approve; do not add events to a live calendar.'
    ],
    requiredInputs: ['Current authorised calendar/action extracts for the intended year and scope.', 'Confirmed faculty responsibilities and any approved internal lead times.'],
    reviewChecks: ['Every firm date has a current source and the correct year.', 'Proposed lead times are distinguishable from official obligations.']
  },
  'faculty-plan': {
    label: 'Prepare the faculty plan review',
    summary: 'Connect approved school priorities to a small, owned faculty action plan.',
    deliverable: 'A priority-to-action matrix, a short progress discussion brief and proposed review questions.',
    instructions: [
      'Compare the supplied approved faculty and school plans by priority, intended outcome and evidence requirement; flag version differences.',
      'Map agreed priorities to practical actions, responsible roles, evidence destinations and review points, leaving unconfirmed allocations blank.',
      'Separate confirmed progress from proposed next steps and identify actions needing a decision to continue, revise or stop.'
    ],
    requiredInputs: ['Current approved school and faculty plans with version evidence.', 'Non-personal progress summaries and confirmed faculty priorities.'],
    reviewChecks: ['Actions follow the approved priorities and fit available capacity.', 'Performance/PDP details and unsupported claims of progress are absent.']
  },
  'teaching-readiness': {
    label: 'Prepare the readiness check',
    summary: 'Give staff a clear way to check programs, rotations, systems and practical readiness.',
    deliverable: 'A blank or aggregate readiness matrix, change-point checklist and short staff hand-over brief.',
    instructions: [
      'Build checks for the supplied program/rotation structure, timetable reconciliation, approved learning space and practical-area requirements.',
      'Separate readiness confirmed by an owner-system check from gaps requiring an authorised role’s action; include an evidence-reference column.',
      'Draft a hand-over brief for changes and exceptions using role/category placeholders. Do not reproduce class lists, staff allocations or support-plan contents.'
    ],
    requiredInputs: ['Approved program or rotation structure and current readiness requirements.', 'Aggregate readiness and change points, without timetable exports, class lists or protected support information.'],
    reviewChecks: ['Version, sequence and change points agree with the current approved arrangement.', 'Teacher authorisation, learner support access and room readiness are checks to perform, not assumed approvals.']
  },
  'curriculum-assessment': {
    label: 'Prepare the program and assessment review',
    summary: 'Compare approved curriculum documents and organise the corrections needed for human sign-off.',
    deliverable: 'A source/version comparison, outcome-to-program/assessment matrix and prioritised correction list.',
    instructions: [
      'Compare the supplied program or assessment schedule against the exact nominated current syllabus and school requirements; cite the relevant section for each finding.',
      'Check the documented sequence, outcomes, assessment links, registration location and change controls. Distinguish a document not supplied from a genuine gap.',
      'Prepare draft corrections or a planning outline only where supported; mark course content, timing or conditions needing teacher confirmation. Do not invent units, assessment tasks or approval.'
    ],
    requiredInputs: ['Current nominated syllabus, approved program/schedule and relevant school assessment requirements.', 'Scope of the review and version/change information, without student submissions or individual adjustments.'],
    reviewChecks: ['Every proposed correction has a source and preserves authorised course content.', 'Release dates, secure assessment material and changes await the proper approval route.']
  },
  monitoring: {
    label: 'Prepare the senior monitoring review',
    summary: 'Organise a concise evidence and sign-off check for the current senior-course monitoring cycle.',
    deliverable: 'A blank monitoring QA matrix, evidence-to-locate list and draft reminder for the responsible roles.',
    instructions: [
      'Use the current monitoring model to map required record categories to program, assessment and sign-off checkpoints.',
      'Distinguish supplied evidence references, checks still to be performed and matters requiring the authorised reviewer’s judgement.',
      'Draft a role-based request for unresolved checks before the confirmed reporting/submission point; keep student-level evidence and final sign-off inside the approved system.'
    ],
    requiredInputs: ['Current approved monitoring model, sign-off requirements and applicable period.', 'Non-identifying aggregate status and approved evidence categories; no learner monitoring exports.'],
    reviewChecks: ['The checklist uses the current school model and correct authorised sign-off roles.', 'Preparation does not declare a class, course or monitoring record compliant.']
  },
  capability: {
    label: 'Prepare the capability review',
    summary: 'Turn approved role requirements into a manageable training and support discussion.',
    deliverable: 'A blank role-requirement matrix, aggregate support priorities and proposed professional-learning review plan.',
    instructions: [
      'Map supplied current role requirements to the approved training, supervision and course-capability checks; retain verification in the owner systems.',
      'Prepare a discussion structure for capability support and a small set of proposed learning/mentoring actions.',
      'Include a later impact-review question for each proposed action. Do not create a personnel register or infer an individual’s training, accreditation or performance status.'
    ],
    requiredInputs: ['Current employer/role requirements and the approved capability/PDP process.', 'Non-identifying aggregate support priorities, with no personnel or training records.'],
    reviewChecks: ['Requirements are current and appropriate to the assigned role.', 'All individual status checks and supervisor decisions stay protected and human-led.']
  },
  resources: {
    label: 'Prepare the resource reconciliation',
    summary: 'Organise budget, purchasing or asset checks through the confirmed finance process.',
    deliverable: 'A blank reconciliation/action register and draft query for the finance or asset owner.',
    instructions: [
      'Map the task’s resource categories to the current purchasing, receipt, asset, reconciliation and disposal stages that apply.',
      'Provide columns for required check, owner role, source evidence, exception and next action; use placeholders rather than financial amounts or asset inventories.',
      'Draft questions needed to establish the correct delegation and approval trail. Do not recommend expenditure, place orders, approve claims or remove assets from a register.'
    ],
    requiredInputs: ['Current finance/asset procedure, delegation route and the review scope.', 'Non-sensitive categories of outstanding checks only; no amounts, claims, supplier details, fee status or asset inventories.'],
    reviewChecks: ['Each action follows the confirmed approval and official record route.', 'The draft does not imply financial authority or verified stock/register accuracy.']
  },
  'safety-review': {
    label: 'Prepare the safety and maintenance checks',
    summary: 'Arrange the approved checks and action hand-backs for authorised staff to carry out.',
    deliverable: 'A source-linked blank check/action register, staff briefing and next-review checklist.',
    instructions: [
      'Translate only the supplied current approved checklist or SOP into a practical review sequence; do not invent technical controls or repair instructions.',
      'Separate physical checks, defects requiring the authorised escalation route, qualified maintenance and verification of closure. Leave the actual inspection and safety decisions to authorised staff.',
      'Draft a short briefing explaining what staff must check and where to report an unresolved item. For a live hazard, use the current immediate-response process; preparation must not delay it.'
    ],
    requiredInputs: ['Current approved safety/maintenance checklist, SOP or chemical-safety process for this task.', 'Confirmed inspection or close-down scope and responsible roles; no incident, inventory or security details.'],
    reviewChecks: ['No machine, chemical, room or activity is declared safe by this draft.', 'Unknown controls remain for the WHS owner to resolve; faults are not marked repaired without authorised evidence.']
  },
  'plant-approval': {
    label: 'Prepare the machinery approval brief',
    summary: 'Organise the evidence and questions needed before a plant change can proceed.',
    deliverable: 'A staged approval/evidence checklist and draft clarification request to the authorised plant/WHS/asset role.',
    instructions: [
      'Use the current nominated application process to separate proposal, pre-commitment approval, receipt/registration, commissioning and permission to use.',
      'List the documents and qualified decisions required at each stage, including site/services, guarding, training and maintenance where the source requires them.',
      'Prepare unanswered questions and a role hand-off. Do not supply engineering instructions, authorise purchase, certify commissioning or release equipment for use.'
    ],
    requiredInputs: ['Current approved machinery-change procedure and non-sensitive description of the proposed change.', 'Required document categories and authorised decision-maker roles; no restricted plant or security details.'],
    reviewChecks: ['Approval precedes commitment and the required qualified checks remain explicit.', 'No technical specification or permission to operate has been invented.']
  },
  'farm-assurance': {
    label: 'Prepare the farm audit enquiry',
    summary: 'Establish applicability and organise the current audit requirements before using an old checklist.',
    deliverable: 'An applicability/authority enquiry, blank evidence checklist and finding-closure register.',
    instructions: [
      'First identify the current operation, accountable role and authorised audit regime from the supplied sources; leave applicability To confirm if not established.',
      'Map the current audit instrument to evidence categories, inspection responsibilities and closure checks; do not reuse a historical instrument as current authority.',
      'Draft an enquiry for missing authority, dates or requirements. A qualified person must make any animal-welfare/safety judgement and act promptly on a live concern.'
    ],
    requiredInputs: ['Confirmed current operation scope and the authorised current audit instrument or owner contact role.', 'Non-sensitive requirement categories only; no animal-incident, staffing or facility-security records.'],
    reviewChecks: ['Applicability and any not-applicable decision require the accountable verifier.', 'The draft neither certifies an audit nor offers veterinary or technical safety decisions.']
  },
  excursion: {
    label: 'Prepare the excursion planning pack',
    summary: 'Organise the current approval pathway and a clear staff planning brief.',
    deliverable: 'A staged approval/preparation/day-of/close-out checklist and draft staff planning message.',
    instructions: [
      'Confirm an actual excursion proposal and the current school workflow, lead times and approving role before planning the hand-offs.',
      'Build a blank checklist for educational purpose, approved risk process, staffing, transport, costs, consent and support checks, with each protected record left in its owner system.',
      'Draft staff communication and a close-out action table. Do not book, publish, send consent material, claim approval or complete a risk assessment from missing facts.'
    ],
    requiredInputs: ['Current approved excursion procedure and a non-identifying event proposal.', 'Confirmed planning roles and source-stated lead times; no names, health data, contacts, rolls or consent records.'],
    reviewChecks: ['Approval is required before commitments and communication that implies approval.', 'The school owner verifies all risk, consent, supervision and support arrangements.']
  },
  induction: {
    label: 'Prepare the induction pathway',
    summary: 'Give a new staff role a short, ordered route through first-duty checks and early support.',
    deliverable: 'A first-duty/first-week induction checklist, role-based welcome brief and blank acknowledgement/check-in plan.',
    instructions: [
      'Start with the confirmed role and current whole-school induction requirements, distinguishing what must be checked before any duty from later support.',
      'Prepare a short navigation guide to approved teaching, emergency, attendance and support front doors, with protected access and personnel checks left to their owners.',
      'Include faculty practical-area induction, supervision/capability checks and proposed early check-ins. For a practicum, flag the current university agreement and supervising-role requirements for confirmation.'
    ],
    requiredInputs: ['Current induction checklist, role type and confirmed first-duty requirements.', 'Approved staff front doors and supervising/induction roles; no personnel, credential, access-code or performance records.'],
    reviewChecks: ['The person is not described as authorised, trained or inducted before the owner confirms it.', 'The brief is usable before first duty and avoids a folder dump or sensitive access detail.']
  },
  cover: {
    label: 'Prepare the safe cover brief',
    summary: 'Organise a practical coverage request and approved relief-learning outline.',
    deliverable: 'A role-based cover checklist, draft coordinator request and relief-learning brief using non-identifying placeholders.',
    instructions: [
      'Use the current absence/coverage route and confirmed learning requirements; do not infer the absent person’s circumstances.',
      'Draft useful work from approved supplied resources, with clear instructions and a non-practical alternative where practical authorisation is unconfirmed.',
      'List supervision, room-access and practical restrictions for the authorised coordinator to check through the protected route. Escalate an unsafe coverage gap through that route rather than presenting it as solved.'
    ],
    requiredInputs: ['Current cover procedure and approved non-personal learning resources.', 'Confirmed supervision requirements and permitted activity type; no health, leave, contact, class-list or staff-allocation records.'],
    reviewChecks: ['The coordinator confirms actual coverage and any activity/room permission.', 'The draft does not expect an unwell staff member to resolve an emergency absence.']
  },
  'course-support': {
    label: 'Prepare the support process checklist',
    summary: 'Organise the current warning/support process without exporting a learner case or making a determination.',
    deliverable: 'A blank process checklist, generic support/recovery planning template and authorised-review questions.',
    instructions: [
      'Compare the supplied current school/NESA process with the task steps, separating early Learning and Support referral from formal warning and final determination.',
      'Prepare blank fields for evidence, support offered, achievable recovery action, required communication and review point; staff complete them only in the protected system.',
      'List questions for the authorised role about thresholds, wording, receipt and escalation. Do not draft an individual warning, infer a breach, issue a notice or decide an N-award.'
    ],
    requiredInputs: ['Current authorised generic warning/support procedure and approved blank templates.', 'The process question to resolve, without any learner, family, attendance, assessment or wellbeing record.'],
    reviewChecks: ['Current thresholds and procedural requirements are verified by the authorised role.', 'No individual decision, warning or final outcome is claimed by this preparation.']
  }
};

const taskProfiles = Object.freeze({
  't3-info-evening': ['course-information', 'Focus on the approved course information, fee statements and question hand-offs needed for the confirmed information evening.'],
  't3-year12-report-chain': ['reporting', 'Keep Head Teacher checks, office submission and final issue as separate hand-offs in this Year 12 chain.'],
  't3-parent-teacher': ['event-preparation', 'Focus on interview readiness, protected access to evidence, coverage and role-based follow-up; do not draft individual family conversations.'],
  'student-review-cycle': ['student-review', 'Prepare only the review or assembly contribution assigned in the current brief.'],
  't3-nesa-submission-check': ['authorised-handoff', 'Confirm the exact current NESA action and whether TAS supplies a contribution; keep data checking separate from the authorised submission.'],
  't3-hsc-results-certification-handoff': ['authorised-handoff', 'Separate faculty data hand-off, authorised school submission and Principal certification. Confirm current course applicability and the current NESA certification deadline without assuming the Head Teacher is the certifying role.'],
  'hsc-practical-certification-handoff': ['authorised-handoff', 'Prepare a blank course-specific declaration and certification hand-off matrix using current NESA practical-course instructions. Confirm each applicable course and its own submission and non-certification timing; do not invent a common deadline, declare a project authentic or certify for the Principal.'],
  't4-year11-report-chain': ['reporting', 'Include the separate grade/Life Skills hand-off to the authorised Deputy role and confirmation of onward submission by the current NESA deadline, without collecting learner-level information.'],
  't4-year10-report-chain': ['reporting', 'Distinguish the NESA grade hand-off from the report-checking and office-submission milestones.'],
  't4-year9-report-chain': ['reporting', 'Prepare the Year 9 teacher correction, recheck and office hand-back sequence.'],
  't4-year7-report-chain': ['reporting', 'Prepare the Year 7 teacher correction, recheck and office hand-back sequence.'],
  't4-showcase': ['event-preparation', 'Cover display/activity approval, setup, supervision, pack-down and VET promotion hand-off for the confirmed showcase.'],
  't4-year8-report-chain': ['reporting', 'Prepare the Year 8 teacher correction, recheck and office hand-back sequence.'],
  't4-report-release': ['reporting', 'Use aggregate reporting-chain status to prepare the release exception check and next-cycle improvement hand-back.'],
  't4-enrichment': ['event-preparation', 'Establish the approved TAS contribution first; then prepare only its staffing, resources, timetable-impact and safety checks.'],
  'hsc-analysis-cycle': ['results-improvement', 'Link proposed HSC improvement actions to program changes, professional learning and the approved faculty plan.'],
  'source-sharing-review': ['source-access', 'Prioritise broad-link sharing and confidential descendants in the owner-led review, with a retest after each authorised change.'],
  'annual-calendar-control': ['calendar', 'Reconcile the current Staff Calendar, NESA actions and faculty control points; keep the previous baseline distinct.'],
  'annual-plan-alignment': ['faculty-plan', 'Show how each agreed faculty action supports a current school priority and how progress can be reviewed.'],
  'annual-rosters-rhythm': ['coordination', 'Prepare a role-based reconciliation of duty/meeting responsibilities and backup arrangements; no personal roster details.'],
  'class-readiness': ['teaching-readiness', 'Cover owned programs, registration, approved learning spaces, protected support access and practical readiness using aggregate checks.'],
  'technology-rotations': ['teaching-readiness', 'Focus on rotation-version reconciliation, program/assessment sequence and teacher hand-over at confirmed change points.'],
  'program-currency': ['curriculum-assessment', 'Prioritise current syllabus implementation, approved program version and registration/monitoring location; identify obsolete or duplicate references.'],
  'assessment-governance': ['curriculum-assessment', 'Focus on approved schedule coverage, outcomes/evidence, accessibility, authenticity and issue/change approval; secure trial-paper arrangements remain protected.'],
  'senior-monitoring': ['monitoring', 'Prepare the current Stage 6 monitoring checks and Principal/delegate sign-off hand-back without making the sign-off.'],
  'subject-selection-cycle': ['course-information', 'Reconcile handbook, presentation/video and website statements across the confirmed selection window; VET claims require the VET owner.'],
  'faculty-publications': ['course-information', 'Shape the contribution to the confirmed website, magazine or school-report brief; include a rendered-output review checklist for later human checking.'],
  'reporting-assurance': ['reporting', 'Prepare a reusable faculty check, correction workflow and early sampling plan from the current approved guidance.'],
  'capability-training': ['capability', 'Keep mandatory training verification, PDP conversations and course/equipment capability support connected without a shadow personnel register.'],
  'faculty-meeting-control': ['coordination', 'Begin the weekly agenda by proposing which confirmed open actions need closure, carry-forward or escalation; keep those decisions for the meeting.'],
  'budget-procurement': ['resources', 'Focus on term resource needs, approval routes, receipt/acquittal and unresolved reconciliation checks; exclude financial amounts and supplier/claim records.'],
  'whs-inspection': ['safety-review', 'Prepare the current inspection checklist and owner/date/recheck fields; the inspection and verification must be performed by authorised staff.'],
  'machinery-assets': ['plant-approval', 'Keep pre-purchase/change approval, registration, commissioning and authorised use as separate gates.'],
  'chemical-controls': ['safety-review', 'Organise source-required register, SDS, labelling, storage and disposal checks without copying an inventory or inferring chemical-handling instructions.'],
  'workshop-routine': ['safety-review', 'Focus on the every-lesson check, current user authorisation, fault escalation and approved alternate learning; an old training result is not proof of current safe condition.'],
  'term-workshop-close': ['safety-review', 'Prepare the practical-work cut-off proposal, close-down checks and next-term exception handover; any cut-off date needs local confirmation.'],
  'stocktake-disposal': ['resources', 'Focus on physical/register reconciliation, movement/disposal approvals and discrepancy closure, using blank fields rather than asset lists.'],
  'ag-farm-audit': ['farm-assurance', 'Do not assume a current Agriculture/farm operation or audit regime exists; establish applicability and the authorised instrument first.'],
  'excursion-workflow': ['excursion', 'Prepare only the confirmed excursion occurrence and keep pre-commitment approval separate from day-of and post-event closure.'],
  'new-staff-induction': ['induction', 'Tailor the draft pathway to the confirmed new, relieving or practicum role without including personal information.'],
  'absence-cover': ['cover', 'Prioritise a usable approved relief-learning plan and unresolved supervision restrictions; actual coverage remains a coordinator decision.'],
  'n-warning-response': ['course-support', 'Keep early support, formal warning and any final Principal-owned process distinct; all case details stay in the protected system.'],
  'vet-handoff': ['authorised-handoff', 'Identify the VET boundary and prepare a concise hand-off to the VET workboard/current RTO owner rather than reproducing controlled instructions in TAS.']
});

const sourceInstruction = 'Use the current task details and only the authorised sources supplied or explicitly nominated. State what you can actually read and its version/date. If material is unavailable, prepare the useful blank structure and list the exact missing inputs; label unsupported dates, owners, authority and status To confirm.';
const preparationInstruction = 'Return a practical draft in plain Australian English for the teacher to review. Do not send, publish, purchase, change access or official records, mark the task complete, or claim that an inspection, approval or verification occurred.';
const privacyCheck = 'No personal, learner, family, personnel, incident, financial or security records are copied into the prompt or output; use blank structures or approved non-identifying aggregates.';

export function getTasTaskHelp(task) {
  if (!task || typeof task.id !== 'string' || task.historyOnly || task.procedureOnly || !Object.hasOwn(taskProfiles, task.id)) return null;
  const [profileId, focus] = taskProfiles[task.id];
  const profile = profiles[profileId];
  return {
    profileId: `tas-${profileId}`,
    label: profile.label,
    summary: profile.summary,
    deliverable: profile.deliverable,
    instructions: [sourceInstruction, focus, ...profile.instructions, preparationInstruction],
    requiredInputs: [...profile.requiredInputs],
    reviewChecks: [...profile.reviewChecks, privacyCheck]
  };
}
