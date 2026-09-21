(function () {
  "use strict";
  // Presentation copy only: IDs, workflow rules and completion records stay in their original data files.
  // sourceSteps/sourceFinished are reviewed snapshots; use an overlay only when its source still matches.
  window.WWHS_TASK_COPY = window.WWHS_TASK_COPY || {};
  window.WWHS_TASK_COPY.vet = {
  "a-01-confirm-authority-set": {
    "title": "Check the current VET guides and rules",
    "purpose": "Find the current NESA and RTO instructions so the team works from the right requirements.",
    "finished": "Current guides and their versions are identified, and someone is responsible for resolving each missing or conflicting instruction.",
    "steps": [
      "Open the current NESA Timetable of Actions.",
      "Open the current RTO term guide, Quality Manual and latest notices.",
      "Record each source’s year, version or date, and approved access link.",
      "Flag missing or conflicting instructions so they can be followed up."
    ],
    "sourceSteps": [
      "Open the current NESA Timetable of Actions.",
      "Open the current RTO term guide, Quality Manual and latest RTO notices.",
      "Record the year, version/date and approved access route for each source.",
      "Mark missing or conflicting sources as visible exceptions."
    ],
    "sourceFinished": "The workspace identifies the current controlling sources and every unresolved authority gap has an owner."
  },
  "a-02-build-live-calendar": {
    "title": "Prepare the yearly VET calendar",
    "purpose": "Bring current official deadlines and school activities together, with a person responsible for each action.",
    "finished": "The current-year calendar is approved, links to the official dates, and shows who will complete and check each action.",
    "steps": [
      "Copy dates from current NESA and RTO sources; do not assume last year’s dates still apply.",
      "Add school reporting, placement, assessment and meeting commitments.",
      "For each action, identify who will do and check it, where the record belongs and when preparation starts.",
      "Review the calendar at each team meeting."
    ],
    "sourceSteps": [
      "Transfer current NESA and RTO dates without projecting old dates forward.",
      "Add school reporting, placement, assessment and meeting constraints.",
      "Add an owner, verifier, evidence destination and lead time to each action.",
      "Review the calendar at every team meeting."
    ],
    "sourceFinished": "A versioned current-year calendar is approved, assigned and linked back to live sources."
  },
  "a-03-confirm-roles-access": {
    "title": "Confirm who does each VET job",
    "purpose": "Agree who is responsible, who checks the work, who provides cover and how each person accesses the required systems.",
    "finished": "Every critical task has approved staff responsibilities, a checker, backup cover, tested access and a contact for problems.",
    "steps": [
      "Confirm who is accountable for each required check.",
      "Record the authorised person doing the work, their checker and backup role in the approved school record.",
      "Test access to the required systems without sharing passwords.",
      "Record who to contact at school and at the RTO or VET Support Officer when help is needed."
    ],
    "sourceSteps": [
      "Confirm the accountable role for each control.",
      "Name the authorised doer, verifier and deputy by role in the local controlled record.",
      "Test access to each required system without sharing passwords.",
      "Record the current VSO/RTO and school escalation routes."
    ],
    "sourceFinished": "Every critical task has an authorised accountable role, doer, verifier, deputy and tested access path."
  },
  "a-04-update-school-profile": {
    "title": "Update the VET School Profile",
    "purpose": "Check that the profile accurately describes the courses, staff, rooms, equipment and contacts the school currently uses.",
    "finished": "The live VET School Profile matches school delivery, and each unresolved difference has someone responsible for fixing it.",
    "steps": [
      "Compare the profile with the school’s actual staff, facilities, equipment, courses and contacts.",
      "Correct outdated details using the approved process.",
      "Refer changes the school cannot make to the appropriate support person.",
      "Keep the official record of the changes and their completion status."
    ],
    "sourceSteps": [
      "Compare the current profile with real staff, facilities, equipment, courses and contacts.",
      "Correct outdated fields through the controlled workflow.",
      "Escalate anything the school cannot change directly.",
      "Retain the official completion/status trail."
    ],
    "sourceFinished": "The VET School Profile matches current school delivery and unresolved exceptions are formally owned."
  },
  "a-05-confirm-delivery": {
    "title": "Confirm courses are approved and ready to run",
    "purpose": "Check both RTO approval and school readiness before treating a timetabled course as authorised delivery.",
    "finished": "Delivery is confirmed in the official system; any unapproved or unready arrangement is stopped and referred for resolution.",
    "steps": [
      "Check RTO 90333’s current registration and approved qualifications.",
      "Check the school’s Authority to Deliver and planned courses in VET Schools Hub.",
      "Compare those approvals with the actual teachers, facilities, equipment and student groups.",
      "Resolve any differences before treating delivery as approved."
    ],
    "sourceSteps": [
      "Check RTO 90333's live registration and scope.",
      "Check the school's Authority to Deliver and intended courses in VET Schools Hub.",
      "Compare approvals with trainers, facilities, equipment and cohort reality.",
      "Resolve mismatches before treating delivery as approved."
    ],
    "sourceFinished": "Current delivery is confirmed in the authorised system and any mismatch is stopped and escalated."
  },
  "a-06-reconcile-course-codes": {
    "title": "Check course and timetable codes match",
    "purpose": "Make sure each class is linked to the approved course and qualification in all relevant systems.",
    "finished": "Approved courses, qualifications, classes and timetable codes agree, or each difference has a person responsible for resolving it.",
    "steps": [
      "Compare approved courses, qualifications, classes and timetable codes.",
      "Check that each student group is attached to the intended course delivery.",
      "Correct each difference in the system that holds the official record.",
      "Keep only a completion reference and the status of unresolved issues in this workboard."
    ],
    "sourceSteps": [
      "Compare approved course, qualification, class and timetable-code states.",
      "Confirm each cohort is attached to the intended delivery.",
      "Correct mismatches through the owner system.",
      "Record only the completion pointer and exception status in this workspace."
    ],
    "sourceFinished": "Approved delivery, course structures and timetable codes agree or a named owner is resolving the exception."
  },
  "a-07-trainer-readiness": {
    "title": "Check teachers are approved for their VET courses",
    "purpose": "Confirm that each allocated teacher has the required approval, qualifications and current industry knowledge for their course.",
    "finished": "Each trainer is currently approved and ready, or has an authorised supervision or alternative arrangement covering any gap.",
    "steps": [
      "Check the teacher’s authorisation and VET Teacher Training status for the intended course.",
      "Check qualifications, vocational skills and current industry experience in the approved records.",
      "Confirm approved supervision or an alternative arrangement where independent delivery is not yet authorised.",
      "Resolve gaps before staffing and timetable plans are treated as settled."
    ],
    "sourceSteps": [
      "Check authorisation and VET Teacher Training status for the intended course.",
      "Check credentials, vocational competence and industry currency in the authorised location.",
      "Confirm supervision or contingency where independent delivery is not yet approved.",
      "Resolve gaps before timetable assumptions harden."
    ],
    "sourceFinished": "Every allocated trainer has current approved readiness status or an authorised supervision/contingency plan."
  },
  "a-08-publish-local-handbook": {
    "title": "Update and share the School VET Handbook",
    "purpose": "Give staff and students current school guidance, with working links to the official instructions they need.",
    "finished": "The current handbook is approved and shared, and staff know which official sources take priority if instructions differ.",
    "steps": [
      "Check handbook statements and links against current approved information.",
      "Remove outdated dates, contacts and unofficial workarounds.",
      "Share the handbook through the approved school channel.",
      "Brief the VET team on changed actions and where the official documents are kept."
    ],
    "sourceSteps": [
      "Check handbook statements and links against current approved information.",
      "Remove superseded dates, contacts and local workarounds.",
      "Distribute through the approved school channel.",
      "Brief the VET team on changed actions and where authoritative documents live."
    ],
    "sourceFinished": "The current handbook is approved, distributed and the team knows which live sources override it."
  },
  "t1-01-usi-verification": {
    "title": "Check each student’s USI is verified",
    "purpose": "Use the approved process to confirm students’ Unique Student Identifiers and follow up records that do not match.",
    "finished": "Each applicable student’s USI is verified by the official deadline, or an unresolved case has an authorised person following it up.",
    "steps": [
      "Use the approved process to collect and verify Unique Student Identifiers (USIs).",
      "Investigate rejected or unmatched records through authorised channels.",
      "Confirm verified status in the approved RTO and school systems.",
      "Do not upload USIs to NESA unless current RTO instructions explicitly assign that action to the school."
    ],
    "sourceSteps": [
      "Use the approved USI collection and verification process.",
      "Investigate rejected or unmatched records through authorised channels.",
      "Confirm verified status in the authorised RTO/school systems.",
      "Do not upload USIs to NESA unless a current RTO instruction explicitly assigns that action to the school."
    ],
    "sourceFinished": "Every applicable learner has a verified USI status or a formally owned exception before the live deadline."
  },
  "t1-02-external-vet-entries": {
    "title": "Check entries for externally delivered VET",
    "purpose": "Confirm that students learning through an external provider have the correct course and provider entries in official systems.",
    "finished": "All applicable external VET entries are complete and checked against provider confirmation in the relevant official systems.",
    "steps": [
      "Confirm the provider, course, delivery method and Virtual VET or EVET status using the authorised source.",
      "Complete the current EVET and NESA entry tasks assigned to the school.",
      "Compare the entries with the provider’s confirmation.",
      "Record a completion reference and any issue still needing follow-up."
    ],
    "sourceSteps": [
      "Confirm the provider, course, delivery mode and Virtual VET/EVET status from the authorised source.",
      "Complete the current EVET/NESA workflow assigned to the school.",
      "Check entries against the provider confirmation.",
      "Record the completion pointer and any unresolved exception."
    ],
    "sourceFinished": "Applicable external VET entries are complete and verified in the owner systems."
  },
  "t1-03-onboarding-induction-support": {
    "title": "Complete student induction and support checks",
    "purpose": "Make sure students understand their course and identify the support they need to participate and complete it.",
    "finished": "Enrolment and induction, required suitability checks and approved support actions are complete and recorded in the authorised systems.",
    "steps": [
      "Use the current approved enrolment and induction materials.",
      "Explain the course, HSC, assessment and workplace-learning requirements accurately.",
      "Complete LLN Robot and Go2workplacement checks; identify support needs, including EAL/D, through authorised channels.",
      "Arrange reasonable support while keeping the required competency standard unchanged."
    ],
    "sourceSteps": [
      "Use current approved enrolment and induction materials.",
      "Explain course, HSC, assessment and workplace-learning expectations accurately.",
      "Complete LLN Robot/Go2workplacement and identify support—including EAL/D needs—through authorised channels.",
      "Plan reasonable support without weakening competency requirements."
    ],
    "sourceFinished": "Induction, required suitability/support checks and approved support actions are complete in authorised systems."
  },
  "t1-04-rpl-credit-transfer": {
    "title": "Check prior learning and course credit",
    "purpose": "Identify previous learning that may count towards the course and send each request through the authorised assessment process.",
    "finished": "Every recognition or credit request has an authorised decision, and approved results are reflected in the correct official systems.",
    "steps": [
      "Identify possible recognition of prior learning, credit transfer or course-transition issues early.",
      "Confirm the source RTO, qualification and course codes, and genuine evidence; do not assume credit transfers automatically.",
      "Use the approved application and evidence process; the authorised assessor or RTO makes competency decisions.",
      "Update the authorised systems only after approval."
    ],
    "sourceSteps": [
      "Identify possible RPL, credit transfer or transition implications early.",
      "Confirm the source RTO, qualification/course codes and authenticated evidence; never assume an automatic transfer.",
      "Use the current controlled application and evidence process and keep competency judgement with the authorised assessor/RTO role.",
      "Update only the authorised systems after approval."
    ],
    "sourceFinished": "Each request has an authorised decision and the correct official-system state."
  },
  "t1-05-tas-and-assessment-readiness": {
    "title": "Check the training plan and assessment materials",
    "purpose": "Make sure teaching and assessment use the current approved Training and Assessment Strategy and resources for the class.",
    "finished": "The active class uses the current approved Training and Assessment Strategy and the correct versions of assessment tasks.",
    "steps": [
      "Open the current contextualised Training and Assessment Strategy (TAS) from the authorised library.",
      "Check that the teaching content and sequence match the intended student group.",
      "Confirm assessment resources are the current approved versions before releasing them.",
      "Check that the correct resource is available in Evidence Central; do not copy it into this workboard."
    ],
    "sourceSteps": [
      "Open the current contextualised TAS from the authorised library.",
      "Check that delivery scope and sequence match the intended cohort.",
      "Confirm current controlled assessment resources before release.",
      "Confirm the correct resource is available in Evidence Central without republishing it here."
    ],
    "sourceFinished": "Delivery and assessment use the current controlled TAS and task versions for the active cohort."
  },
  "t1-06-work-placement-plan": {
    "title": "Plan placements and prepare students",
    "purpose": "Arrange approved workplace learning and complete the preparation, safety checks and record arrangements before students attend.",
    "finished": "Each applicable student group has an approved schedule, preparation process, safety arrangements and an official place for placement records.",
    "steps": [
      "Check the current workplace-learning requirement for the course.",
      "Confirm the current WWHS placement provider and authorised staff portal; Go2WorkPlacement is the separate student-readiness process.",
      "Work with the approved placement program to set the student-group schedule.",
      "Complete current preparation, safety, host and student processes.",
      "Arrange secure handling of original Student Placement Records and follow-up."
    ],
    "sourceSteps": [
      "Check the current course-specific workplace-learning requirement.",
      "Confirm the current WWHS work-placement provider and authorised staff portal; keep this separate from Go2WorkPlacement student readiness.",
      "Liaise with the approved placement program and establish a cohort schedule.",
      "Complete current preparation, safety, host and student processes.",
      "Set a secure process for original Student Placement Records and follow-up."
    ],
    "sourceFinished": "Each applicable cohort has an approved schedule, preparation pathway, risk controls and official record destination."
  },
  "t1-07-nesa-check-one": {
    "title": "Complete NESA data check 1",
    "purpose": "Compare early course entries and qualification details with approved delivery to catch errors before they affect later records.",
    "finished": "The first NESA check is complete under current instructions, and every unresolved issue has a responsible person and due action.",
    "steps": [
      "Download and confirm the current check schedule.",
      "Compare course entries, patterns of study, qualifications and competencies with approved delivery.",
      "Correct problems in the relevant official system.",
      "Keep the check record and a record of unresolved issues."
    ],
    "sourceSteps": [
      "Download and confirm the current check schedule.",
      "Check course entries, pattern of study, qualification and competencies against approved delivery.",
      "Correct issues through the owner system.",
      "Retain the check and exception trail."
    ],
    "sourceFinished": "Check 1 is completed against current instructions and all exceptions have owners and due actions."
  },
  "t1-08-monitor-support-funds": {
    "title": "Confirm VET funding and track spending",
    "purpose": "Check the available VET Support Funds, agree approved uses and keep track of spending and commitments.",
    "finished": "The current allocation, approvals, committed spending and review dates are recorded in the authorised school finance records.",
    "steps": [
      "Check the current SBAR or VET Support Funds allocation.",
      "Agree permitted spending priorities and who must approve them.",
      "Track commitments and spending through the approved finance process.",
      "Review whether the spending supports course readiness and student needs."
    ],
    "sourceSteps": [
      "Check the current SBAR/VET Support Funds allocation.",
      "Agree permitted priorities and approval pathways.",
      "Track commitments and expenditure in the approved finance process.",
      "Review whether spending supports delivery readiness and learner needs."
    ],
    "sourceFinished": "The current allocation, approvals, commitments and review points are visible in authorised records."
  },
  "t1-09-short-course-coassessment": {
    "title": "Arrange required short courses and assessment support",
    "purpose": "Arrange any required short course, external assessor or co-assessor before students need the resulting qualification or assessment.",
    "finished": "Required arrangements and completion are checked in the authorised records before dependent activities or entries proceed.",
    "steps": [
      "Check current approved sources for the course and student-group requirements.",
      "Arrange an authorised provider, assessor or co-assessor as required.",
      "Confirm dates, student preparation and where the official completion record belongs.",
      "Verify completion before any activity or entry that depends on it."
    ],
    "sourceSteps": [
      "Identify course/cohort requirements from current controlled sources.",
      "Arrange the authorised provider, assessor or co-assessor pathway.",
      "Confirm timing, learner preparation and official record destination.",
      "Verify completion before dependent activities or entries."
    ],
    "sourceFinished": "Required short-course/co-assessment arrangements and completion status are verified in authorised records."
  },
  "t2-01-confirm-rto-qualification": {
    "title": "Check the RTO and qualification selected in NESA",
    "purpose": "Make sure each course is recorded against the correct training organisation and approved qualification.",
    "finished": "RTO and qualification selections match approved delivery across the relevant official systems, with discrepancies resolved before submission.",
    "steps": [
      "Open the current NESA action and check the RTO’s current delivery approval.",
      "Confirm the correct RTO and qualification for each applicable course.",
      "Cross-check the Training and Assessment Strategy and VET Schools Hub.",
      "Resolve any differences before submitting."
    ],
    "sourceSteps": [
      "Open the live NESA action and current RTO delivery state.",
      "Confirm the correct RTO and qualification for each applicable course.",
      "Cross-check against TAS and VET Schools Hub.",
      "Resolve discrepancies before submitting."
    ],
    "sourceFinished": "RTO and qualification selections agree with authorised delivery in all owner systems."
  },
  "t2-02-sbat-status": {
    "title": "Update school-based apprenticeship and traineeship details",
    "purpose": "Check school-based apprenticeship and traineeship records, including the training contract details needed for NESA.",
    "finished": "Applicable apprenticeship and traineeship details, including required identifiers, are current and agree across authorised records.",
    "steps": [
      "Confirm school-based apprenticeship or traineeship (SBAT) status and training contract details using authorised sources.",
      "Enter or correct required NESA details, including the training contract identifier (TCID) where applicable.",
      "Compare the training plan with the school record.",
      "Keep identifiable student records only in approved systems."
    ],
    "sourceSteps": [
      "Confirm current SBAT status and training contract information through authorised sources.",
      "Enter or correct required NESA details, including TCID where applicable.",
      "Cross-check the training plan and school record.",
      "Keep identifiable records only in approved systems."
    ],
    "sourceFinished": "Applicable SBAT status and identifiers are current and reconciled in authorised systems."
  },
  "t2-03-enter-competencies": {
    "title": "Enter the scheduled competency results",
    "purpose": "Enter assessor-approved competency results and check that NESA, Evidence Central and the markbook agree.",
    "finished": "Required results are entered by the official deadline and records agree, or each discrepancy has someone responsible for following it up.",
    "steps": [
      "Confirm the assessor’s result is supported by evidence in Evidence Central.",
      "Check the qualification and competency codes.",
      "Enter only authorised results supported by retained evidence.",
      "Compare Evidence Central, the markbook and NESA after entry."
    ],
    "sourceSteps": [
      "Confirm the assessor's outcome is supported by evidence in Evidence Central.",
      "Check the qualification and competency codes.",
      "Enter only authorised, evidence-supported outcomes.",
      "Reconcile Evidence Central, markbook and NESA after entry."
    ],
    "sourceFinished": "Required competency data is entered by the live deadline and all systems agree or show an owned exception."
  },
  "t2-04-finalise-usi-exceptions": {
    "title": "Resolve outstanding USI checks",
    "purpose": "Follow up unverified Unique Student Identifiers so reporting and certification are not left with unresolved student records.",
    "finished": "All applicable USIs are verified, or each outstanding case has an authorised person and a documented follow-up action.",
    "steps": [
      "Review the outstanding cases in the authorised record only.",
      "Investigate rejected or mismatched details through approved channels.",
      "Confirm verified status in the official system.",
      "Refer unresolved cases for help without copying identifiers into this workboard."
    ],
    "sourceSteps": [
      "Review only the authorised exception list.",
      "Investigate rejected/mismatched details through approved channels.",
      "Confirm verified status in the owner system.",
      "Escalate unresolved cases without copying identifiers into this workspace."
    ],
    "sourceFinished": "All applicable USIs are verified or each unresolved case has a documented authorised action owner."
  },
  "t2-05-learner-questionnaire": {
    "title": "Arrange the Year 12 ASQA learner survey",
    "purpose": "Give eligible students access to the current RTO-requested survey and track overall completion without influencing their responses.",
    "finished": "Eligible students have had the authorised opportunity to complete the survey, and overall completion is recorded through the approved process.",
    "steps": [
      "Read the current RTO survey instructions and confirm which students are eligible.",
      "Arrange access without coaching students’ answers.",
      "Monitor overall completion only, without collecting individual responses.",
      "Record completion using the approved process."
    ],
    "sourceSteps": [
      "Open the current RTO survey instruction and confirm eligible learners.",
      "Schedule access without coaching responses.",
      "Monitor aggregate completion only.",
      "Record completion through the approved process."
    ],
    "sourceFinished": "The applicable cohort has been given the authorised opportunity to complete the survey and aggregate completion is recorded."
  },
  "t2-06-finalise-semester-one-reports": {
    "title": "Check and finalise Semester 1 VET reports",
    "purpose": "Make sure reports describe students’ evidenced progress accurately and include the current RTO reporting requirements.",
    "finished": "Semester 1 reports meet current requirements and agree with the authorised markbook and Evidence Central progress records.",
    "steps": [
      "Check report wording and the required RTO information.",
      "Compare reported progress with the markbook and Evidence Central.",
      "Return differences to the trainer for correction.",
      "Complete the school’s approved report-checking record."
    ],
    "sourceSteps": [
      "Check report language and required RTO elements.",
      "Compare reported progress with markbook and Evidence Central status.",
      "Return discrepancies to the trainer for correction.",
      "Complete the approved report-verification trail."
    ],
    "sourceFinished": "Reports are accurate, meet current requirements and align with authorised progress records."
  },
  "t2-07-nesa-check-two": {
    "title": "Complete NESA data check 2",
    "purpose": "Compare mid-year qualifications, competency results and progress across NESA, Evidence Central and markbooks.",
    "finished": "The second NESA check is complete under current instructions, with discrepancies resolved or assigned for follow-up.",
    "steps": [
      "Confirm what the current check covers and when it is due.",
      "Check qualifications, competencies and progressive outcomes.",
      "Compare Evidence Central, the markbook and NESA.",
      "Correct differences and keep a record of outstanding issues and their resolution."
    ],
    "sourceSteps": [
      "Confirm the current check scope and date.",
      "Check qualification, competency and progressive-outcome states.",
      "Compare Evidence Central, markbook and NESA.",
      "Correct issues and retain the exception/closure trail."
    ],
    "sourceFinished": "Check 2 is completed against current instructions and exceptions are closed or formally owned."
  },
  "t2-08-plan-next-year-delivery": {
    "title": "Plan next year’s VET courses and staffing",
    "purpose": "Identify the courses, teachers and resources needed next year and begin the required training and approval processes.",
    "finished": "Next-year plans have an approved way forward and responsible staff, with any missing approvals or training clearly identified.",
    "steps": [
      "Identify intended courses, student groups, teachers, facilities and equipment.",
      "Identify required teacher training and apply through the current process.",
      "Begin Authority to Run and Authority to Deliver applications before making commitments.",
      "Keep promotion wording provisional until the required approvals are confirmed."
    ],
    "sourceSteps": [
      "Identify intended courses, cohorts, trainers, facilities and equipment.",
      "Identify required teacher training and submit applications through the current process.",
      "Begin Authority to Run/Authority to Deliver actions before commitments are made.",
      "Keep promotion wording provisional until authority is confirmed."
    ],
    "sourceFinished": "Next-year intentions have an approved pathway, owners and visible authority/training gaps."
  },
  "t2-09-review-stage6-entry-cutoff": {
    "title": "Check the recorded 2026 Stage 6 entry review",
    "purpose": "Find the official result of the 2026 entry-deadline check and follow up any uncertainty about what was recorded.",
    "finished": "The official 2026 check and result have been reviewed, and uncertainties are assigned to authorised staff; this review does not permit late entries.",
    "steps": [
      "Check NESA ACE Rule 14.2 and the applicable 2026 Schools Online instructions for Preliminary and HSC VET entries.",
      "Find the official school record of the 30 June 2026 check. A missing workboard tick does not show that it was missed.",
      "Check the recorded review covered course exclusions and whether course changes could meet all requirements, including mandatory placement.",
      "Refer unconfirmed results or entries to the authorised NESA delegate, with a review date and approved correction route. Do not make or backdate entries here."
    ],
    "sourceSteps": [
      "Check NESA ACE Rule 14.2 and the applicable 2026 Schools Online instructions for Preliminary and HSC VET entries.",
      "Find the authorised school record of the entry cut-off check and confirm the recorded result for 30 June 2026. A missing local tick is not evidence that the action was missed.",
      "Confirm the recorded review covered course exclusions and whether any course changes could meet the new course requirements, including mandatory work placement where applicable.",
      "If the result or an entry cannot be confirmed, assign the discrepancy to the authorised NESA delegate with a review date and approved correction route; do not make or backdate an entry from this workboard."
    ],
    "sourceFinished": "The applicable official 2026 check and result have been reviewed, with any uncertainty formally owned in the authorised system. This retrospective review does not authorise a late course entry."
  },
  "t3-01-year11-work-placement": {
    "title": "Coordinate Year 11 placements and check completion",
    "purpose": "Support safe Year 11 work placement, respond to problems promptly and confirm attendance, hours and official records afterwards.",
    "finished": "The placement block is safely completed, outstanding matters are being followed up, and official placement records are current.",
    "steps": [
      "Confirm student preparation, host suitability and safety arrangements before each placement.",
      "Monitor attendance, welfare and changes through approved channels.",
      "Act immediately on safety or suitability concerns.",
      "Check completion and hours, and secure original Student Placement Records in the official files."
    ],
    "sourceSteps": [
      "Confirm preparation, host and risk controls before each placement.",
      "Monitor attendance, welfare and changes through approved channels.",
      "Act immediately on safety or suitability concerns.",
      "Reconcile completion/hours and secure original Student Placement Records in official files."
    ],
    "sourceFinished": "The scheduled block is safely completed, exceptions are followed up and authorised placement records are current."
  },
  "t3-02-meeting-follow-up": {
    "title": "Follow up Term 3 coordinator-meeting actions",
    "purpose": "Turn the official meeting information into assigned tasks, updated dates and clear messages for affected staff.",
    "finished": "Meeting actions have responsible staff, calendar dates and source links, and affected staff have been told what changed.",
    "steps": [
      "Read the official meeting materials and identify actions, dates and changes.",
      "Assign each action, its checker and where the completion record belongs.",
      "Brief affected staff on the actions they need to take.",
      "Update the annual calendar and complete required acknowledgements."
    ],
    "sourceSteps": [
      "Open the official meeting materials and identify actions, dates and changes.",
      "Assign each action to a role with a verifier and evidence destination.",
      "Brief affected staff concisely.",
      "Update the annual calendar and close acknowledgement actions."
    ],
    "sourceFinished": "All meeting actions are assigned, calendared, communicated and linked to their controlling source."
  },
  "t3-03-progressive-outcomes": {
    "title": "Check progress results have supporting evidence",
    "purpose": "Confirm each recorded assessment result is backed by retained evidence, feedback and teacher annotations before updating other systems.",
    "finished": "Each recorded progressive outcome has supporting evidence and useful feedback in the authorised assessment system.",
    "steps": [
      "Start with the current assessment task and the authorised assessor’s decision.",
      "Confirm evidence is retained in Evidence Central, including paper evidence that must be uploaded.",
      "Check written feedback and teacher annotations.",
      "Update results in other systems only after the evidence is in order."
    ],
    "sourceSteps": [
      "Start with the current assessment tool and assessor decision.",
      "Confirm the evidence is retained in Evidence Central, including any paper evidence required to be uploaded.",
      "Check written feedback and teacher annotations.",
      "Update downstream outcomes only after the evidence state is sound."
    ],
    "sourceFinished": "Each recorded progressive outcome is supported by retained evidence and usable feedback in the controlled system."
  },
  "t3-04-hsc-exam-entry": {
    "title": "Check HSC VET exam entries",
    "purpose": "Make sure eligible students have the correct HSC VET examination entry or withdrawal recorded before the official cut-off.",
    "finished": "Official exam entries are accurate, and every unresolved entry issue has someone responsible for action before the live cut-off.",
    "steps": [
      "Check eligible students and their current exam entries in the authorised system.",
      "Process additions or withdrawals through the current approved procedure.",
      "Compare exam entries with course and student-group records.",
      "Record completion and unresolved issues here without copying student data."
    ],
    "sourceSteps": [
      "Confirm eligible candidates and current exam-entry state in the authorised system.",
      "Process additions/withdrawals through the current controlled workflow.",
      "Cross-check with course and cohort records.",
      "Record completion and unresolved exceptions without copying student data here."
    ],
    "sourceFinished": "The authorised exam-entry state is accurate and every exception has an owner before the live cut-off."
  },
  "t3-05-hsc-estimates": {
    "title": "Prepare and submit HSC VET exam estimates",
    "purpose": "Prepare the required exam estimates using current NESA instructions, have them independently checked and submit them on time.",
    "finished": "All applicable estimates are submitted by the official deadline, with an independent check recorded in the authorised system.",
    "steps": [
      "Read the current NESA estimate guide and confirm the eligible students.",
      "Prepare estimates using the authorised method and current evidence.",
      "Have the values independently checked through the approved process.",
      "Submit by the official deadline and confirm the result in the official system."
    ],
    "sourceSteps": [
      "Open the current NESA estimate guide and confirm the eligible cohort.",
      "Prepare estimates using the authorised method and current evidence.",
      "Have the values independently checked in the approved process.",
      "Submit by the live deadline and verify the official system state."
    ],
    "sourceFinished": "All applicable estimates are submitted and independently verified in the owner system by the live deadline."
  },
  "t3-06-nesa-check-three": {
    "title": "Complete NESA data check 3",
    "purpose": "Check the required qualification and assessment results across official systems before the final reporting period.",
    "finished": "The third NESA check is complete under current instructions, and every discrepancy is resolved or assigned for follow-up.",
    "steps": [
      "Confirm the current check date and what must be checked.",
      "Check the qualification, competency and progressive outcomes required at this stage.",
      "Compare NESA, Evidence Central and markbooks.",
      "Correct or refer differences to the authorised person and verify their resolution."
    ],
    "sourceSteps": [
      "Confirm the current check date and scope.",
      "Check final qualification, competency and progressive-outcome states required at this point.",
      "Cross-check NESA, Evidence Central and markbooks.",
      "Correct or escalate discrepancies and verify closure."
    ],
    "sourceFinished": "Check 3 is completed under current instructions with all exceptions closed or formally owned."
  },
  "t3-07-exit-survey": {
    "title": "Arrange the RTO exit survey",
    "purpose": "Give the eligible students access to the current exit survey and direct any resulting improvement work through the approved process.",
    "finished": "Eligible students have survey access, overall completion is recorded, and any required improvement actions have responsible staff.",
    "steps": [
      "Confirm the current survey, eligible students and completion period.",
      "Provide access without coaching students’ responses.",
      "Monitor overall completion only, without collecting individual responses.",
      "Record completion and refer feedback themes through the approved improvement process."
    ],
    "sourceSteps": [
      "Confirm the current survey, eligible cohort and window.",
      "Provide access without coaching responses.",
      "Monitor aggregate completion only.",
      "Record completion and route themes through the approved improvement process."
    ],
    "sourceFinished": "Applicable learners have access, aggregate completion is recorded and improvement actions are assigned where required."
  },
  "t3-08-next-year-promotion": {
    "title": "Check course approvals before next year’s promotion",
    "purpose": "Confirm that proposed courses are authorised and ready before including them as confirmed offerings in subject information.",
    "finished": "Every promoted course has the required approval and current description; courses awaiting approval are withheld from confirmed promotion.",
    "steps": [
      "Check which courses need Authority to Run or Authority to Deliver approval.",
      "Confirm the teachers, facilities, equipment and intended qualifications are ready.",
      "Check course descriptions against current required information.",
      "Do not advertise until the required approvals are confirmed."
    ],
    "sourceSteps": [
      "Check whether each proposed course requires Authority to Run and/or Authority to Deliver action.",
      "Confirm trainer, facilities, equipment and intended qualification readiness.",
      "Check descriptors against current mandated information.",
      "Do not advertise until the required authority is confirmed."
    ],
    "sourceFinished": "Every promoted course has confirmed authority or is clearly withheld pending approval, and descriptors are current."
  },
  "t3-09-hsc-schedule-and-delivery-check": {
    "title": "Check HSC teaching and assessment are on track",
    "purpose": "Compare the assessment booklet and actual class progress with the approved training plan, then address any unfinished work.",
    "finished": "Assessment schedules are accurate, and any unfinished teaching, assessment or teacher-training requirement has an authorised recovery action.",
    "steps": [
      "Check HSC assessment schedules are correctly shown in the approved booklet.",
      "Compare taught content and assessment progress with the current Training and Assessment Strategy.",
      "Identify unfinished teaching, assessment or teacher-training actions.",
      "Assign recovery actions while keeping assessment requirements unchanged."
    ],
    "sourceSteps": [
      "Check that HSC assessment schedules are correctly represented in the approved booklet.",
      "Compare delivered content and assessment progress with the current TAS.",
      "Identify unfinished content, assessment or teacher-training actions.",
      "Assign recovery actions without weakening assessment requirements."
    ],
    "sourceFinished": "Schedules are accurate and all delivery/assessment gaps have authorised recovery actions."
  },
  "t3-10-principal-hsc-certification": {
    "title": "Hand checked VET results to the Principal",
    "purpose": "Confirm the Principal has the checked VET information needed for school-wide HSC results certification and verify the official status.",
    "finished": "The official certification status and VET handover are confirmed, or unresolved work is promptly assigned to authorised staff before the deadline.",
    "steps": [
      "Check the current NESA timetable and Principal certification action in Schools Online, including the due date and whether certification is already recorded.",
      "Confirm VET exam estimates and applicable HSC data were submitted and checked, using the existing VET estimates record.",
      "Confirm the Principal or authorised delegate has the checked VET information. This task does not authorise the VET Coordinator to certify other faculty data or act as Principal.",
      "Keep only a privacy-safe reference to the official result. Alert the authorised NESA delegate and Principal promptly about unresolved work, with a responsible person and review date."
    ],
    "sourceSteps": [
      "Open the current NESA timetable and the Principal certification of HSC results data action in Schools Online; confirm the applicable due date and whether certification is already recorded.",
      "Confirm that the VET estimated exam marks and applicable VET-related HSC data have been submitted and checked through the authorised school process, referring to the existing VET estimates record.",
      "Confirm the Principal or authorised delegate has the checked VET information needed for the school-wide certification. The VET Coordinator does not certify other faculty data or act as Principal through this task.",
      "Retain only a privacy-safe reference to the official certification or handover result. If anything is unresolved, alert the authorised NESA delegate and Principal promptly and record an owner and review date."
    ],
    "sourceFinished": "The official Principal certification state and VET handover are confirmed, or any unresolved action has been explicitly escalated to its authorised owner before the live deadline. A missing browser tick does not imply certification was missed."
  },
  "t4-01-year11-final-outcomes": {
    "title": "Finalise Year 11 results and placement hours",
    "purpose": "Check the evidence and placement records, enter the required Year 11 results and have the final records independently checked.",
    "finished": "Required Year 11 results and placement hours are accurate, submitted and matched to official records by the live deadline.",
    "steps": [
      "Confirm each assessor decision is supported by retained evidence.",
      "Compare workplace-learning hours with the official records.",
      "Enter the required results and hours in the authorised system.",
      "Arrange a final independent comparison and assign any unresolved issue."
    ],
    "sourceSteps": [
      "Confirm each assessor decision is supported by retained evidence.",
      "Reconcile workplace-learning hours with official records.",
      "Enter required outcomes/hours in the authorised system.",
      "Perform a final independent cross-check and own any exception."
    ],
    "sourceFinished": "Required Year 11 outcomes and hours are accurate, submitted and reconciled by the live deadline."
  },
  "t4-02-year11-reports": {
    "title": "Check Year 11 reports and assessment records agree",
    "purpose": "Compare Year 11 report statements with the final results recorded in markbooks, Evidence Central and NESA.",
    "finished": "Year 11 reports and assessment records agree across the required systems, or each remaining difference has an assigned follow-up.",
    "steps": [
      "Check markbook completion and Evidence Central status.",
      "Compare report statements with the final authorised results.",
      "Resolve differences in the system that holds the official record.",
      "Complete the school’s report-checking record."
    ],
    "sourceSteps": [
      "Check markbook completion and Evidence Central status.",
      "Compare report statements with the final authorised outcomes.",
      "Resolve mismatches through the owner system.",
      "Complete the school report-verification record."
    ],
    "sourceFinished": "Year 11 reports, markbooks, Evidence Central and NESA states are consistent or have a formally owned exception."
  },
  "t4-03-year12-year10-final-data": {
    "title": "Finalise Year 12 and Year 10 results",
    "purpose": "Submit final Year 12 and Year 10 results, including required Year 12 placement hours, after checking the supporting records.",
    "finished": "Required Year 12 and Year 10 results and applicable hours are submitted, independently checked and matched by the live deadline.",
    "steps": [
      "Confirm final assessor decisions are supported by retained evidence.",
      "Compare Year 12 workplace-learning hours with official records.",
      "Enter required Year 12 and Year 10 data in the authorised system.",
      "Arrange an independent final comparison and refer any late unresolved cases promptly."
    ],
    "sourceSteps": [
      "Confirm final assessor decisions are supported by retained evidence.",
      "Reconcile Year 12 workplace-learning hours with official records.",
      "Enter required Year 12 and Year 10 data in the authorised system.",
      "Independently cross-check the final states and escalate late exceptions."
    ],
    "sourceFinished": "Required Year 12 and Year 10 outcomes/hours are submitted and reconciled by the live deadline."
  },
  "t4-04-year9-short-course-entries": {
    "title": "Enter eligible Year 9 White Card and first-aid results",
    "purpose": "Complete the specific NESA entries for eligible Year 9 students doing White Card or first-aid-only courses.",
    "finished": "All applicable eligible Year 9 entries are accurate and submitted by the live deadline, with the official result checked.",
    "steps": [
      "Confirm eligibility and authorised completion records.",
      "Check the current NESA entry instructions.",
      "Enter only the eligible data required for this action.",
      "Check the official system result and retain the check record."
    ],
    "sourceSteps": [
      "Confirm eligibility and authorised completion records.",
      "Check the current NESA entry instruction.",
      "Enter only the required eligible data.",
      "Verify the official system state and retain the check trail."
    ],
    "sourceFinished": "All applicable eligible Year 9 entries are accurate and submitted by the live deadline."
  },
  "t4-05-year12-markbook-closure": {
    "title": "Finish checking Year 12 assessment records",
    "purpose": "Make sure final Year 12 results, retained evidence and feedback agree before the records are archived.",
    "finished": "Year 12 evidence, markbook and NESA records are complete and agree, with outstanding issues resolved before archiving.",
    "steps": [
      "Confirm every final assessment decision has retained evidence and feedback.",
      "Check completion in the markbook and Evidence Central.",
      "Compare these records with NESA after final entries.",
      "Record and resolve any remaining issue before archiving or rolling over."
    ],
    "sourceSteps": [
      "Confirm every final judgement has retained evidence and feedback.",
      "Check markbook and Evidence Central completion states.",
      "Reconcile against NESA after final entries.",
      "Record and resolve any exception before archive/rollover."
    ],
    "sourceFinished": "Year 12 evidence, markbook and NESA states are complete and reconciled before archive."
  },
  "t4-06-next-year-vet-hub": {
    "title": "Finish next year’s VET Schools Hub setup",
    "purpose": "Check that next year’s planned courses, staff and resources are accurately recorded and have the required school delivery approvals.",
    "finished": "VET Schools Hub reflects approved plans, each remaining gap has an authorised person and alternative arrangement, and unapproved courses remain blocked.",
    "steps": [
      "Review proposed next-year courses, teachers, facilities and equipment.",
      "Check Authority to Run and Authority to Deliver application and approval status.",
      "Update the authorised VET Schools Hub process as directed.",
      "Keep unapproved courses clearly blocked from confirmed delivery."
    ],
    "sourceSteps": [
      "Review proposed 2027 courses, trainers, facilities and equipment.",
      "Confirm ATR/ATD application and approval states.",
      "Update the authorised Hub workflow as directed.",
      "Keep unapproved courses visibly blocked from confirmed delivery."
    ],
    "sourceFinished": "The next-year Hub state reflects approved intentions and every gap has an authorised owner and contingency."
  },
  "t4-07-markbook-rollover": {
    "title": "Archive old markbooks and prepare the new year",
    "purpose": "Keep completed records safely retrievable while setting up new markbooks with the correct classes and teachers.",
    "finished": "Closed student-group records remain securely retrievable, and new-year markbooks match current classes and authorised teaching staff.",
    "steps": [
      "Complete the final comparison of records before archiving.",
      "Archive the completed Year 12 student group through the approved process.",
      "Copy and rename approved structures for the new year, then add current classes.",
      "Check class membership and allocated teachers; suspend leavers in Evidence Central through the authorised process."
    ],
    "sourceSteps": [
      "Confirm final reconciliation before archiving.",
      "Archive the completed Year 12 cohort through the approved process.",
      "Copy/rename approved structures for the new year and add current classes.",
      "Reconcile class membership and assigned teachers; suspend leavers in Evidence Central through the authorised workflow."
    ],
    "sourceFinished": "Closed cohorts remain securely retrievable and new-year structures match current classes and authorised staff."
  },
  "t4-08-year-end-assurance": {
    "title": "Review the year and assign remaining improvements",
    "purpose": "Use the annual checklist to check VET requirements, locate the official records and assign any unfinished improvement work.",
    "finished": "The annual review is complete, and every finding has a responsible person, an action and a point for checking completion.",
    "steps": [
      "Use the internal audit checklist to review management, delivery, trainers, evidence, reports, USIs, NESA, apprenticeships and short courses.",
      "Confirm original Student Placement Records and required evidence are in the official locations.",
      "Record improvement actions, responsible staff and due dates.",
      "Carry unresolved approval or date questions into the new-year setup."
    ],
    "sourceSteps": [
      "Run the internal audit checklist against management, delivery, trainer, evidence, reporting, USI, NESA, SBAT and short-course controls.",
      "Confirm original Student Placement Records and required evidence are in official locations.",
      "Record improvement actions, owners and due points.",
      "Carry unresolved authority/date gaps into the new-year setup."
    ],
    "sourceFinished": "The annual assurance review is complete and every finding has an owner, action and verification point."
  },
  "t4-09-support-fund-acquittal": {
    "title": "Reconcile VET funding and complete required returns",
    "purpose": "Check spending against the approved allocation and complete any required report or return of VET Support Funds.",
    "finished": "Funding records agree and the required acquittal or return is verified in official records, or the action is formally recorded as not applicable.",
    "steps": [
      "Open the current RTO or SBAR acquittal or return instructions and check the deadline and form.",
      "Compare the approved allocation, approvals, spending, commitments and remaining balance.",
      "Resolve unsupported or incorrectly coded items through the school finance process.",
      "Submit or record the required funding acquittal or return through the authorised route and keep the official confirmation."
    ],
    "sourceSteps": [
      "Open the current RTO/SBAR acquittal or return instruction and verify the deadline and form.",
      "Reconcile the authorised allocation, approvals, expenditure, commitments and remaining balance.",
      "Resolve unsupported or incorrectly coded items through the school finance process.",
      "Submit/record the required acquittal or return through the authorised route and retain the official confirmation."
    ],
    "sourceFinished": "The current funding cycle is reconciled and the required acquittal/return is verified in authorised finance/RTO records, or the action is formally recorded as not applicable."
  },
  "c-01-rto-updates": {
    "title": "Read RTO notices and assign the actions",
    "purpose": "Read the current notices, work out what changes for the school and assign any required follow-up.",
    "finished": "Each update has been checked and communicated, and every required action is completed or has someone responsible for following it up.",
    "steps": [
      "Open the original notice through its authorised sign-in or access route.",
      "Decide whether each item is information, an action, a deadline, a decision or something needing escalation.",
      "Assign who will act and check the result, when it is due and where the official record belongs.",
      "Update the annual calendar and brief affected staff.",
      "Confirm completion in the official system."
    ],
    "sourceSteps": [
      "Open the original authenticated communication.",
      "Classify each item as information, action, deadline, decision or escalation.",
      "Assign an owner, verifier, due point and evidence destination.",
      "Update the annual calendar and brief affected staff.",
      "Verify closure in the owner system."
    ],
    "sourceFinished": "Every current update is triaged, assigned, communicated and either closed or visibly owned."
  },
  "c-02-team-meetings": {
    "title": "Run the VET meeting and follow up actions",
    "purpose": "Use team meetings to agree the next actions and keep earlier decisions moving until their completion is checked.",
    "finished": "The approved meeting record captures decisions and assigned actions, and unfinished work remains visible for follow-up between meetings.",
    "steps": [
      "Prepare a short agenda from current updates, upcoming deadlines and unresolved issues.",
      "Record decisions, responsible roles, due dates and who will check completion.",
      "Brief affected staff who were absent through the approved channel.",
      "Review earlier actions until their completion is independently checked."
    ],
    "sourceSteps": [
      "Prepare a concise agenda from live updates, upcoming deadlines and exceptions.",
      "Record decisions, role-owned actions, due points and verifiers.",
      "Brief absent affected staff through the approved channel.",
      "Review prior actions until independently closed."
    ],
    "sourceFinished": "The meeting has an approved agenda/minute/action trail and no action disappears between meetings."
  },
  "c-03-evidence-feedback-assurance": {
    "title": "Check a sample of assessment evidence and feedback",
    "purpose": "Review selected assessment records to confirm the evidence, feedback and teacher notes support the recorded decisions.",
    "finished": "The scheduled sample is checked, and every evidence or feedback gap is corrected or formally referred for follow-up.",
    "steps": [
      "Open the current approved assessment task and benchmark.",
      "Choose a sample based on risk, without exporting student evidence.",
      "Check the evidence is present, attributable to the student and sufficient for the recorded decision.",
      "Check written feedback and teacher annotations.",
      "Verify any corrections in the authorised assessment system."
    ],
    "sourceSteps": [
      "Open the current controlled assessment tool and benchmark.",
      "Select a risk-based sample without exporting learner evidence.",
      "Check evidence presence, attribution and sufficiency for the recorded decision.",
      "Check written feedback and teacher annotations.",
      "Verify corrective action in the controlled system."
    ],
    "sourceFinished": "The scheduled sample is complete and every evidence/feedback gap is corrected or formally escalated."
  },
  "c-04-cross-system-reconciliation": {
    "title": "Check class lists and VET records agree",
    "purpose": "Compare class lists, markbooks, Evidence Central and NESA so enrolment and result differences are found and corrected.",
    "finished": "The records being checked agree across systems, or each difference has a responsible person and a deadline for follow-up.",
    "steps": [
      "Use authorised live views to compare the same class or student group in each system.",
      "Identify whether a difference concerns enrolment, evidence, entries, results, timing or a technical issue.",
      "Correct the official record; never change a result simply to make systems match.",
      "Record the check date, responsible person and verified resolution."
    ],
    "sourceSteps": [
      "Use authorised live views to compare the correct cohort/class in each system.",
      "Classify mismatches as enrolment, evidence, entry, outcome, timing or technical issues.",
      "Correct through the owner system; do not force an outcome to make systems agree.",
      "Record the check date, action owner and verified closure."
    ],
    "sourceFinished": "All in-scope systems agree or each mismatch has a formally owned, time-bound exception."
  },
  "c-05-industry-currency": {
    "title": "Check teachers’ industry currency and learning plans",
    "purpose": "Review trainers’ current industry experience and professional learning, and address gaps before they affect approved teaching.",
    "finished": "Each trainer’s required status is current, or an approved action plan is recorded and being followed up.",
    "steps": [
      "Review each trainer’s approved industry-currency and professional-learning status.",
      "Review relevant networks and learning opportunities, and plan suitable industry engagement.",
      "Record qualifying activities and evidence only in My VET Workplace or another authorised location.",
      "Refer gaps for resolution before they affect approved course delivery."
    ],
    "sourceSteps": [
      "Review each trainer's current approved currency/professional-learning status.",
      "Review current network, community-of-practice and professional-learning opportunities and plan relevant industry engagement.",
      "Record qualifying activities and evidence only in My VET Workplace or the authorised controlled location.",
      "Escalate gaps before they affect authorised delivery."
    ],
    "sourceFinished": "Every trainer's status is current or an approved action plan is in place and monitored."
  },
  "c-06-sbat-monitoring": {
    "title": "Follow up apprenticeship and traineeship progress",
    "purpose": "Check that school, training-provider and workplace arrangements remain current and respond promptly when participation or plans change.",
    "finished": "Each applicable school-based apprenticeship or traineeship has an up-to-date progress check, and every issue has an authorised person following it up.",
    "steps": [
      "Check current training-plan and contract details through approved channels.",
      "Review school, provider and workplace progress at the agreed times.",
      "Act promptly on non-participation, changes or mismatched records.",
      "Check required identifiers and results agree in the authorised systems."
    ],
    "sourceSteps": [
      "Check current training-plan and contract status through approved channels.",
      "Monitor school, provider and workplace progress at agreed points.",
      "Act on non-participation, change or mismatch promptly.",
      "Reconcile required identifiers/outcomes in authorised systems."
    ],
    "sourceFinished": "Each applicable SBAT has a current monitored status and every issue has an authorised action owner."
  },
  "c-07-workplace-learning-control": {
    "title": "Check placement safety, attendance and records",
    "purpose": "Monitor placements from preparation through completion, respond immediately to safety concerns and keep official attendance and placement records current.",
    "finished": "Preparation, monitoring, follow-up and placement records are current, and incidents have been addressed through the authorised process.",
    "steps": [
      "Before placement, confirm preparation, suitability, current forms and the approved local provider portal.",
      "Monitor attendance, welfare and changes through approved processes.",
      "Stop and escalate immediate safety risks through school incident channels.",
      "Check completed hours and secure original placement records afterwards."
    ],
    "sourceSteps": [
      "Confirm preparation, suitability, current forms and the approved local provider portal before placement.",
      "Monitor attendance, welfare and changes through approved processes.",
      "Stop/escalate immediate safety risks through school incident channels.",
      "Reconcile hours and secure original placement records after completion."
    ],
    "sourceFinished": "Each placement has current preparation, monitoring, follow-up and official record status, with incidents resolved through the authorised process."
  },
  "c-08-records-privacy-control": {
    "title": "Keep VET records secure and private",
    "purpose": "Use approved record locations and access permissions so personal information is protected when it is stored or shared.",
    "finished": "Protected information is held in authorised locations, with appropriate access, retention arrangements and the required response to any incident.",
    "steps": [
      "Use approved systems and give access only to people who need it.",
      "Keep student data, USIs, evidence, credentials and incident details out of this workboard.",
      "Store paper and digital evidence in the authorised record location.",
      "Review sharing links and access whenever roles change.",
      "Follow the approved incident process for any exposure or loss."
    ],
    "sourceSteps": [
      "Use only approved systems and least-necessary access.",
      "Keep student data, USIs, evidence, credentials and incident details out of this workspace.",
      "Store paper and digital evidence in the authorised record location.",
      "Review sharing links and access when roles change.",
      "Follow the approved incident process for any exposure or loss."
    ],
    "sourceFinished": "Controlled information is held only in authorised locations with current access, retention and incident controls."
  },
  "c-09-validation-improvement": {
    "title": "Complete validation and follow up improvements",
    "purpose": "Take part in the required assessment review or feedback activity, then make sure resulting changes are assigned and checked.",
    "finished": "The required activity is complete, with findings verified as resolved or assigned for follow-up in the approved improvement record.",
    "steps": [
      "Read the current schedule, invitation or improvement request and confirm the school’s role.",
      "Nominate authorised participants and use the current approved validation or feedback tools.",
      "Keep student samples, assessment tools, survey responses and reports in their authorised systems.",
      "Record findings as actions with responsible staff, due dates and checkers.",
      "Verify corrections and apply relevant changes to teaching, resources, trainer currency or next-year plans."
    ],
    "sourceSteps": [
      "Open the current controlled schedule, invitation or improvement request and confirm the school's role.",
      "Nominate only authorised participants and complete the current validation/feedback activity using controlled tools.",
      "Keep learner samples, assessment tools, survey responses and reports in their authorised systems.",
      "Record findings as actions with owners, due points and verifiers.",
      "Verify corrective actions and feed relevant changes into delivery, resources, trainer currency or next-year planning."
    ],
    "sourceFinished": "The required validation/feedback activity is complete and every finding is closed, verified or formally owned in the approved continuous-improvement record."
  },
  "e-01-delivery-change": {
    "title": "Check approval after a course or staffing change",
    "purpose": "Check whether changed staff, classes, rooms or equipment affect approval, and resolve the gaps before using the new arrangement.",
    "finished": "The changed arrangement has current approval and is ready, or remains clearly blocked with an authorised alternative arrangement.",
    "steps": [
      "Do not assume the previous approval still covers the changed arrangement.",
      "Check the current School Profile, Authority to Deliver, teacher readiness, facilities and equipment.",
      "If qualified cover is unavailable, stop normal delivery and use the approved supervision or approval process before continuing. Only a currently authorised assessor makes assessment judgements.",
      "Use the approved change or application process and record any required supervisor, monitoring and completion arrangements.",
      "Resume the changed arrangement only when approval and readiness are confirmed."
    ],
    "sourceSteps": [
      "Pause assumptions that the previous approval still applies.",
      "Check the current School Profile, Authority to Deliver, trainer readiness, facilities and equipment.",
      "If qualified coverage is unavailable, stop normal delivery and use the current controlled approval/supervised-delivery pathway before continuing; only a currently authorised assessor makes assessment judgements.",
      "Use the controlled correction/application process and document the supervisor, monitoring and closure requirements where applicable.",
      "Resume the changed arrangement only when authority and readiness are confirmed."
    ],
    "sourceFinished": "The changed arrangement has explicit current approval/readiness or is visibly blocked with a contingency."
  },
  "e-02-new-course-authority": {
    "title": "Get approval before offering a new VET course",
    "purpose": "Check the separate NESA, RTO and school approvals needed before advertising or committing to a new course.",
    "finished": "All applicable course endorsements, school-level RTO approvals and readiness checks are confirmed before promotion or delivery; otherwise the course stays blocked.",
    "steps": [
      "Check the RTO’s approved qualifications, NESA course endorsement and school authority separately.",
      "If the course or pattern is not endorsed, consult the Department VET Curriculum Coordinator and complete the current NESA Board Endorsed Course process before its closing date.",
      "Complete any required Authority to Run process and Authority to Deliver readiness evidence before advertising.",
      "Keep the course blocked until all applicable official approvals are confirmed."
    ],
    "sourceSteps": [
      "Check central RTO scope, NESA course endorsement and the school's current authority as three separate controls.",
      "Where the course/pattern is not already endorsed, consult the Department VET Curriculum Coordinator and complete the current NESA BEC process before the published closing date.",
      "Complete the current ATR process where required and ATD/readiness evidence before advertising.",
      "Keep the course blocked until every applicable official approval state is confirmed."
    ],
    "sourceFinished": "The new course has every applicable NESA endorsement, school-level RTO approval and readiness confirmation before promotion/delivery, or remains formally blocked."
  },
  "e-03-enrolment-change": {
    "title": "Update records when a student joins, leaves or changes class",
    "purpose": "Complete the approved enrolment or withdrawal process and check that the change reaches every affected system.",
    "finished": "Affected official records agree, and any related exam, placement or reporting action is completed or assigned for follow-up.",
    "steps": [
      "Confirm the authorised enrolment or withdrawal decision and its effective date.",
      "Complete the required induction or withdrawal actions in each official system.",
      "Compare class or PxP lists, the markbook, Evidence Central and NESA.",
      "Check any effect on HSC exam entries, work placement or reporting."
    ],
    "sourceSteps": [
      "Confirm the authorised enrolment/withdrawal decision and effective date.",
      "Complete onboarding or withdrawal actions in each owner system.",
      "Reconcile class/PxP, markbook, Evidence Central and NESA.",
      "Confirm any HSC exam, work-placement or reporting implications."
    ],
    "sourceFinished": "All affected owner systems agree and dependent actions are complete or formally owned."
  },
  "e-04-support-or-rpl-request": {
    "title": "Arrange a student support or prior-learning decision",
    "purpose": "Use the authorised confidential process for support, reasonable adjustments, recognition of prior learning or course credit.",
    "finished": "The request has a timely authorised decision and implementation plan, with the record kept only in approved systems.",
    "steps": [
      "Receive and identify the request through an authorised confidential channel.",
      "Use the current process for the relevant support, adjustment, prior-learning or credit request.",
      "Keep competency decisions with the authorised assessor and maintain the required standard.",
      "Record the approved decision and its implementation only in authorised systems."
    ],
    "sourceSteps": [
      "Identify the request through an authorised confidential channel.",
      "Use the correct current pathway for support/adjustment or RPL/credit.",
      "Keep competency judgement with the authorised assessor and do not weaken the standard.",
      "Record the approved decision and implementation only in controlled systems."
    ],
    "sourceFinished": "The request has a timely authorised decision, implementation plan and controlled record."
  },
  "e-05-incident-response": {
    "title": "Act on a safety, privacy or records incident",
    "purpose": "Protect people and contain harm immediately, then use the official school and Department incident processes.",
    "finished": "Immediate risk is controlled, and the required official reporting, notification, corrective action and follow-up are underway or complete.",
    "steps": [
      "Protect people and stop further disclosure or harm without destroying evidence.",
      "Use the current emergency, school incident or privacy procedure.",
      "Notify the correct authorised roles promptly.",
      "Record only necessary facts in the official incident process.",
      "Check containment, follow-up and any effect on VET delivery or records."
    ],
    "sourceSteps": [
      "Protect people and stop further disclosure or harm without destroying evidence.",
      "Use the current emergency/school incident/privacy route.",
      "Notify the correct authorised roles promptly.",
      "Record only necessary facts in the official process.",
      "Verify containment, follow-up and any VET implications."
    ],
    "sourceFinished": "Immediate risk is controlled and the official incident, notification, remediation and follow-up process is active or complete."
  },
  "e-06-discrepancy-corrective-action": {
    "title": "Assign and fix a VET compliance issue",
    "purpose": "Identify what is wrong, protect affected people or records and have the underlying problem corrected and independently checked.",
    "finished": "The underlying problem is corrected and independently verified, and any action needed to prevent a repeat has a responsible person.",
    "steps": [
      "Describe the discrepancy factually and identify the instruction that applies.",
      "Protect students and records, and stop any unsafe continuation.",
      "Assign an authorised person, the correction, a deadline and an independent checker.",
      "Correct the official record or process rather than hiding the symptom.",
      "Verify completion and record the process improvement."
    ],
    "sourceSteps": [
      "State the discrepancy factually and identify the controlling source.",
      "Protect learners/records and stop any unsafe continuation.",
      "Assign an authorised owner, correction, deadline and verifier.",
      "Correct through the owner system rather than masking the symptom.",
      "Verify closure and capture the process improvement."
    ],
    "sourceFinished": "The underlying discrepancy is corrected, independently verified and any recurrence control is assigned."
  },
  "e-07-coordinator-handover": {
    "title": "Hand over the VET Coordinator or Assistant role",
    "purpose": "Give the incoming staff member current tasks, official sources and tested access so work can continue safely.",
    "finished": "Incoming staff can use current sources and authorised access, and each outstanding task or access gap has someone responsible for resolving it.",
    "steps": [
      "Confirm the incoming person’s authorised role and access arrangements.",
      "Provide the current calendar, source list, system directory and unresolved issues without sharing passwords.",
      "Identify next actions, accountable roles, checkers and where official records belong.",
      "Walk through handling one update, comparing one set of records and escalating one problem.",
      "Have incoming staff test access and the Principal confirm any remaining gaps."
    ],
    "sourceSteps": [
      "Confirm the incoming person's authorised role and access route.",
      "Provide the live calendar, current source register, system directory and open exceptions without sharing passwords.",
      "Identify next actions, accountable roles, verifiers and evidence destinations.",
      "Walk through one update triage, one reconciliation and one escalation.",
      "Incoming staff verify access and the Principal confirms remaining gaps."
    ],
    "sourceFinished": "The incoming role can act safely from current sources and every access/authority/open-task gap is visible and owned."
  },
  "2027-g00-rollover": {
    "title": "Keep the 2026 record and start a clean 2027 plan",
    "purpose": "Preserve last year’s workboard and bring forward only unfinished work that still needs action in 2027.",
    "finished": "The 2026 snapshot remains readable, 2027 starts without old completion ticks, and genuine carry-overs have responsible staff and follow-up dates.",
    "steps": [
      "Export a privacy-safe 2026 workboard backup and confirm official evidence stays in its authorised systems.",
      "Review unfinished, waiting and unresolved 2026 work; identify only what genuinely needs to continue in 2027.",
      "Assign each carry-over a responsible role, checker, follow-up date and privacy-safe official-record reference.",
      "Open the clean 2027 tasks and check that no 2026 completion tick has marked a 2027 task complete.",
      "Record where the 2026 archive and carry-over list are kept, then hand over for the current-source check."
    ],
    "sourceSteps": [
      "Export a privacy-safe 2026 workboard backup and confirm official evidence remains in its authorised owner systems.",
      "Review every 2026 in-progress, waiting and exception item; identify only the work that genuinely needs a 2027 carry-over.",
      "Give each carry-over a responsible role, verifier, chase date and privacy-safe owner-system reference.",
      "Open the clean 2027 task instances and confirm no 2026 completion has closed a 2027 control.",
      "Record the 2026 archive/carry-over reference and hand the clean workspace to the current-source gate."
    ],
    "sourceFinished": "The 2026 operational snapshot remains readable, the 2027 workspace is clean, and every genuine carry-over is separately owned without copying personal information or old completion status.",
    "kindLabel": "School planning check"
  },
  "2027-g10-activate": {
    "title": "Confirm VET is ready for Term 1",
    "purpose": "Check course approvals, teachers, dates, access and assessment materials, then arrange school sign-off for the Term 1 plan.",
    "finished": "The Principal or authorised delegate has signed off, blocking issues have responsible staff, and work proceeds only with confirmed requirements and ready courses.",
    "steps": [
      "Review the checked source list and any unresolved questions about 2027 approval or instructions.",
      "Confirm the approved calendar, preparation dates and who follows up outstanding dates.",
      "Check that responsible staff, checkers and backup staff can access the official systems they need.",
      "Confirm each proposed course, teacher and approved teaching or assessment resource is ready; keep anything unready formally on hold.",
      "Obtain approval to start the privacy-safe Term 1 plan and tell staff who is taking the first actions."
    ],
    "sourceSteps": [
      "Review the verified source register and every visible 2027 authority gap.",
      "Confirm the approved calendar, internal lead points and chase owners.",
      "Confirm accountable roles, doers, verifiers and deputies can access their owner systems.",
      "Confirm each proposed course, trainer and controlled delivery/assessment resource is ready or formally withheld.",
      "Authorise the privacy-safe Term 1 workboard cycle and communicate the first hand-offs."
    ],
    "sourceFinished": "The Principal or authorised delegate has approved activation, every blocking exception has an owner, and Week 1 can open without assuming any unpublished deadline.",
    "kindLabel": "School planning check"
  },
  "2027-w10-term-assurance": {
    "title": "Finish the Term 1 review and hand over to Term 2",
    "purpose": "Check the term’s required work and pass unfinished actions to the people responsible for following them up next term.",
    "finished": "The Term 1 summary is signed off, every outstanding item has a responsible person, and first Term 2 actions have current sources and assigned staff.",
    "steps": [
      "Review the source list and record instructions or dates that changed during Term 1.",
      "Check required student, course, evidence and NESA or RTO work in the official systems; keep personal information out of this workboard.",
      "Review waiting work, unresolved issues and handovers; set follow-up and escalation points where work cannot yet be finished.",
      "Record a privacy-safe Term 1 review summary and obtain the authorised checker’s sign-off.",
      "Open the first verified Term 2 actions and brief the responsible staff."
    ],
    "sourceSteps": [
      "Review the source register and record any instruction or date that changed during Term 1.",
      "Confirm required learner, course, evidence and NESA/RTO actions in their owner systems without copying personal information here.",
      "Review every waiting, exception and hand-back item; assign a chase and escalation point where closure is not yet possible.",
      "Record a privacy-safe Term 1 assurance summary and obtain the authorised verifier's sign-off.",
      "Open the first verified Term 2 actions and brief the responsible roles."
    ],
    "sourceFinished": "Term 1 has a verified privacy-safe assurance summary, no exception is ownerless, and the first Term 2 actions have responsible roles and current source checks.",
    "kindLabel": "School planning check"
  },
  "2027-w01-close": {
    "title": "Review Term 1 Week 1 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 1 Week 1 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 1 Week 1 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every Week focus action is verified, not applicable with authority, or recorded as a formally owned exception.",
      "Review waiting items and confirm the waiting-for person or system, chase date and escalation path.",
      "Confirm hand-backs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Confirm the Week 1 closure reference and brief the next control point."
    ],
    "sourceFinished": "Week 1 is independently verified, no action is ownerless, and Week 2 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-w02-close": {
    "title": "Review Term 1 Week 2 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 1 Week 2 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 1 Week 2 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every Week focus action is verified, not applicable with authority, or recorded as a formally owned exception.",
      "Review waiting items and confirm the waiting-for person or system, chase date and escalation path.",
      "Confirm hand-backs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Confirm the Week 2 closure reference and brief the next control point."
    ],
    "sourceFinished": "Week 2 is independently verified, no action is ownerless, and Week 3 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-w03-close": {
    "title": "Review Term 1 Week 3 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 1 Week 3 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 1 Week 3 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every Week focus action is verified, not applicable with authority, or recorded as a formally owned exception.",
      "Review waiting items and confirm the waiting-for person or system, chase date and escalation path.",
      "Confirm hand-backs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Confirm the Week 3 closure reference and brief the next control point."
    ],
    "sourceFinished": "Week 3 is independently verified, no action is ownerless, and Week 4 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-w04-close": {
    "title": "Review Term 1 Week 4 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 1 Week 4 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 1 Week 4 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every Week focus action is verified, not applicable with authority, or recorded as a formally owned exception.",
      "Review waiting items and confirm the waiting-for person or system, chase date and escalation path.",
      "Confirm hand-backs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Confirm the Week 4 closure reference and brief the next control point."
    ],
    "sourceFinished": "Week 4 is independently verified, no action is ownerless, and Week 5 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-w05-close": {
    "title": "Review Term 1 Week 5 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 1 Week 5 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 1 Week 5 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every Week focus action is verified, not applicable with authority, or recorded as a formally owned exception.",
      "Review waiting items and confirm the waiting-for person or system, chase date and escalation path.",
      "Confirm hand-backs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Confirm the Week 5 closure reference and brief the next control point."
    ],
    "sourceFinished": "Week 5 is independently verified, no action is ownerless, and Week 6 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-w06-close": {
    "title": "Review Term 1 Week 6 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 1 Week 6 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 1 Week 6 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every Week focus action is verified, not applicable with authority, or recorded as a formally owned exception.",
      "Review waiting items and confirm the waiting-for person or system, chase date and escalation path.",
      "Confirm hand-backs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Confirm the Week 6 closure reference and brief the next control point."
    ],
    "sourceFinished": "Week 6 is independently verified, no action is ownerless, and Week 7 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-w07-close": {
    "title": "Review Term 1 Week 7 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 1 Week 7 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 1 Week 7 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every Week focus action is verified, not applicable with authority, or recorded as a formally owned exception.",
      "Review waiting items and confirm the waiting-for person or system, chase date and escalation path.",
      "Confirm hand-backs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Confirm the Week 7 closure reference and brief the next control point."
    ],
    "sourceFinished": "Week 7 is independently verified, no action is ownerless, and Week 8 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-w08-close": {
    "title": "Review Term 1 Week 8 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 1 Week 8 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 1 Week 8 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every Week focus action is verified, not applicable with authority, or recorded as a formally owned exception.",
      "Review waiting items and confirm the waiting-for person or system, chase date and escalation path.",
      "Confirm hand-backs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Confirm the Week 8 closure reference and brief the next control point."
    ],
    "sourceFinished": "Week 8 is independently verified, no action is ownerless, and Week 9 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-w09-close": {
    "title": "Review Term 1 Week 9 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 1 Week 9 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 1 Week 9 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every Week focus action is verified, not applicable with authority, or recorded as a formally owned exception.",
      "Review waiting items and confirm the waiting-for person or system, chase date and escalation path.",
      "Confirm hand-backs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Confirm the Week 9 closure reference and brief the next control point."
    ],
    "sourceFinished": "Week 9 is independently verified, no action is ownerless, and Week 10 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-w10-close": {
    "title": "Review Term 1 Week 10 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 1 Week 10 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 1 Week 10 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every Week focus action is verified, not applicable with authority, or recorded as a formally owned exception.",
      "Review waiting items and confirm the waiting-for person or system, chase date and escalation path.",
      "Confirm hand-backs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Confirm the Week 10 closure reference and brief the next control point."
    ],
    "sourceFinished": "Week 10 is independently verified, no action is ownerless, and Term 2 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t2-w01-close": {
    "title": "Review Term 2 Week 1 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 2 Week 1 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 2 Week 1 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 2 Week 1 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 2 Week 1 is independently verified, no action is ownerless, and Week 2 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t2-w02-close": {
    "title": "Review Term 2 Week 2 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 2 Week 2 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 2 Week 2 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 2 Week 2 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 2 Week 2 is independently verified, no action is ownerless, and Week 3 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t2-w03-close": {
    "title": "Review Term 2 Week 3 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 2 Week 3 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 2 Week 3 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 2 Week 3 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 2 Week 3 is independently verified, no action is ownerless, and Week 4 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t2-w04-close": {
    "title": "Review Term 2 Week 4 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 2 Week 4 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 2 Week 4 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 2 Week 4 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 2 Week 4 is independently verified, no action is ownerless, and Week 5 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t2-w05-close": {
    "title": "Review Term 2 Week 5 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 2 Week 5 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 2 Week 5 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 2 Week 5 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 2 Week 5 is independently verified, no action is ownerless, and Week 6 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t2-w06-close": {
    "title": "Review Term 2 Week 6 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 2 Week 6 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 2 Week 6 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 2 Week 6 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 2 Week 6 is independently verified, no action is ownerless, and Week 7 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t2-w07-close": {
    "title": "Review Term 2 Week 7 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 2 Week 7 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 2 Week 7 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 2 Week 7 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 2 Week 7 is independently verified, no action is ownerless, and Week 8 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t2-w08-close": {
    "title": "Review Term 2 Week 8 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 2 Week 8 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 2 Week 8 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 2 Week 8 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 2 Week 8 is independently verified, no action is ownerless, and Week 9 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t2-w09-close": {
    "title": "Review Term 2 Week 9 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 2 Week 9 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 2 Week 9 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 2 Week 9 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 2 Week 9 is independently verified, no action is ownerless, and Week 10 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t2-w10-close": {
    "title": "Review Term 2 Week 10 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 2 Week 10 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 2 Week 10 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 2 Week 10 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 2 Week 10 is independently verified, no action is ownerless, and Term 3 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t3-w01-close": {
    "title": "Review Term 3 Week 1 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 3 Week 1 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 3 Week 1 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 3 Week 1 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 3 Week 1 is independently verified, no action is ownerless, and Week 2 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t3-w02-close": {
    "title": "Review Term 3 Week 2 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 3 Week 2 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 3 Week 2 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 3 Week 2 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 3 Week 2 is independently verified, no action is ownerless, and Week 3 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t3-w03-close": {
    "title": "Review Term 3 Week 3 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 3 Week 3 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 3 Week 3 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 3 Week 3 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 3 Week 3 is independently verified, no action is ownerless, and Week 4 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t3-w04-close": {
    "title": "Review Term 3 Week 4 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 3 Week 4 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 3 Week 4 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 3 Week 4 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 3 Week 4 is independently verified, no action is ownerless, and Week 5 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t3-w05-close": {
    "title": "Review Term 3 Week 5 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 3 Week 5 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 3 Week 5 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 3 Week 5 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 3 Week 5 is independently verified, no action is ownerless, and Week 6 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t3-w06-close": {
    "title": "Review Term 3 Week 6 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 3 Week 6 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 3 Week 6 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 3 Week 6 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 3 Week 6 is independently verified, no action is ownerless, and Week 7 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t3-w07-close": {
    "title": "Review Term 3 Week 7 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 3 Week 7 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 3 Week 7 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 3 Week 7 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 3 Week 7 is independently verified, no action is ownerless, and Week 8 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t3-w08-close": {
    "title": "Review Term 3 Week 8 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 3 Week 8 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 3 Week 8 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 3 Week 8 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 3 Week 8 is independently verified, no action is ownerless, and Week 9 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t3-w09-close": {
    "title": "Review Term 3 Week 9 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 3 Week 9 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 3 Week 9 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 3 Week 9 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 3 Week 9 is independently verified, no action is ownerless, and Week 10 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t3-w10-close": {
    "title": "Review Term 3 Week 10 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 3 Week 10 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 3 Week 10 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 3 Week 10 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 3 Week 10 is independently verified, no action is ownerless, and Term 4 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t4-w01-close": {
    "title": "Review Term 4 Week 1 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 4 Week 1 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 4 Week 1 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 4 Week 1 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 4 Week 1 is independently verified, no action is ownerless, and Week 2 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t4-w02-close": {
    "title": "Review Term 4 Week 2 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 4 Week 2 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 4 Week 2 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 4 Week 2 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 4 Week 2 is independently verified, no action is ownerless, and Week 3 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t4-w03-close": {
    "title": "Review Term 4 Week 3 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 4 Week 3 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 4 Week 3 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 4 Week 3 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 4 Week 3 is independently verified, no action is ownerless, and Week 4 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t4-w04-close": {
    "title": "Review Term 4 Week 4 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 4 Week 4 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 4 Week 4 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 4 Week 4 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 4 Week 4 is independently verified, no action is ownerless, and Week 5 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t4-w05-close": {
    "title": "Review Term 4 Week 5 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 4 Week 5 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 4 Week 5 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 4 Week 5 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 4 Week 5 is independently verified, no action is ownerless, and Week 6 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t4-w06-close": {
    "title": "Review Term 4 Week 6 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 4 Week 6 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 4 Week 6 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 4 Week 6 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 4 Week 6 is independently verified, no action is ownerless, and Week 7 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t4-w07-close": {
    "title": "Review Term 4 Week 7 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 4 Week 7 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 4 Week 7 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 4 Week 7 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 4 Week 7 is independently verified, no action is ownerless, and Week 8 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t4-w08-close": {
    "title": "Review Term 4 Week 8 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 4 Week 8 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 4 Week 8 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 4 Week 8 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 4 Week 8 is independently verified, no action is ownerless, and Week 9 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t4-w09-close": {
    "title": "Review Term 4 Week 9 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 4 Week 9 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 4 Week 9 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 4 Week 9 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 4 Week 9 is independently verified, no action is ownerless, and Week 10 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t4-w10-close": {
    "title": "Review Term 4 Week 10 and hand over next actions",
    "purpose": "Check this week’s work, agree who will follow up unfinished items and confirm that the next person has accepted the handover.",
    "finished": "Term 4 Week 10 is independently checked, each unfinished item has a responsible person, and accepted handovers allow the next stage to start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 4 Week 10 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 4 Week 10 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 4 Week 10 is independently verified, no action is ownerless, and Week 11 can open safely.",
    "kindLabel": "School planning check"
  },
  "2027-t4-w11-close": {
    "title": "Check the final handover from 2027 to 2028",
    "purpose": "Confirm the final weekly review and preserve the year’s record before starting the separate 2028 checks.",
    "finished": "The final week is independently checked, outstanding work has responsible staff, and the 2027 record is preserved for a clean 2028 start.",
    "steps": [
      "Check each planned action is verified as complete, authorised as not applicable, or recorded as an unresolved issue with someone responsible.",
      "For each waiting item, confirm who or which system is needed, when to follow up and where to seek further help.",
      "Confirm the next responsible person has accepted each handover.",
      "Keep student, assessment, host, incident and credential details in their authorised systems.",
      "Record the reference for the Term 4 Week 11 review and brief the person responsible for the next stage."
    ],
    "sourceSteps": [
      "Check that every focus action is verified, not applicable with current authority, or recorded as a formally owned exception.",
      "Confirm each waiting/exception item has the responsible role or system, a chase date and an escalation path.",
      "Confirm hand-offs were accepted by the next responsible role.",
      "Keep learner, assessment, host, incident and credential details in the authorised owner systems.",
      "Record the Term 4 Week 11 closure reference and brief the next control point."
    ],
    "sourceFinished": "Term 4 Week 11 is independently verified, no action is ownerless, and the 2027 annual trail is preserved for a clean 2028 source gate.",
    "kindLabel": "School planning check"
  },
  "2027-t2-w01-open": {
    "title": "Check the Term 2 plan and accept the handover",
    "purpose": "Refresh official instructions, dates and staff responsibilities, then confirm who has accepted the unfinished work from last term.",
    "finished": "Term 2 has current sources and dates, accepted handovers and a responsible person for every issue; only actions with confirmed requirements proceed.",
    "steps": [
      "Open current NESA actions and Schools Online records, signed-in RTO guidance and the WWHS or Sentral calendar.",
      "Record the current source version, exact applicable action or date, and any changes without copying protected material here.",
      "Confirm who is accountable, who acts and checks, backup staff, system access and contacts for problems this term.",
      "Review the previous term’s review, waiting work and unresolved issues; have the receiving person accept each handover.",
      "Keep actions with unpublished or inaccessible instructions visibly waiting, with responsible staff, a follow-up date and an escalation contact."
    ],
    "sourceSteps": [
      "Open the current NESA Timetable of Actions/Schools Online state, authenticated RTO guidance and WWHS/Sentral calendar.",
      "Record each current publication/version, exact applicable action/date and any changed requirement without copying controlled material here.",
      "Reconfirm accountable roles, doers, deputies, access, verifiers and escalation paths for this term.",
      "Review the prior-term assurance, waiting work and exceptions; require the receiving role to accept each hand-off.",
      "Keep unpublished or inaccessible actions visibly waiting with an owner, chase date and escalation point."
    ],
    "sourceFinished": "Term 2 has a current source/date register, accepted role hand-offs and no ownerless exception; only verified term actions may proceed.",
    "kindLabel": "School planning check"
  },
  "2027-t3-w01-open": {
    "title": "Check the Term 3 plan and accept the handover",
    "purpose": "Refresh official instructions, dates and staff responsibilities, then confirm who has accepted the unfinished work from last term.",
    "finished": "Term 3 has current sources and dates, accepted handovers and a responsible person for every issue; only actions with confirmed requirements proceed.",
    "steps": [
      "Open current NESA actions and Schools Online records, signed-in RTO guidance and the WWHS or Sentral calendar.",
      "Record the current source version, exact applicable action or date, and any changes without copying protected material here.",
      "Confirm who is accountable, who acts and checks, backup staff, system access and contacts for problems this term.",
      "Review the previous term’s review, waiting work and unresolved issues; have the receiving person accept each handover.",
      "Keep actions with unpublished or inaccessible instructions visibly waiting, with responsible staff, a follow-up date and an escalation contact."
    ],
    "sourceSteps": [
      "Open the current NESA Timetable of Actions/Schools Online state, authenticated RTO guidance and WWHS/Sentral calendar.",
      "Record each current publication/version, exact applicable action/date and any changed requirement without copying controlled material here.",
      "Reconfirm accountable roles, doers, deputies, access, verifiers and escalation paths for this term.",
      "Review the prior-term assurance, waiting work and exceptions; require the receiving role to accept each hand-off.",
      "Keep unpublished or inaccessible actions visibly waiting with an owner, chase date and escalation point."
    ],
    "sourceFinished": "Term 3 has a current source/date register, accepted role hand-offs and no ownerless exception; only verified term actions may proceed.",
    "kindLabel": "School planning check"
  },
  "2027-t4-w01-open": {
    "title": "Check the Term 4 plan and accept the handover",
    "purpose": "Refresh official instructions, dates and staff responsibilities, then confirm who has accepted the unfinished work from last term.",
    "finished": "Term 4 has current sources and dates, accepted handovers and a responsible person for every issue; only actions with confirmed requirements proceed.",
    "steps": [
      "Open current NESA actions and Schools Online records, signed-in RTO guidance and the WWHS or Sentral calendar.",
      "Record the current source version, exact applicable action or date, and any changes without copying protected material here.",
      "Confirm who is accountable, who acts and checks, backup staff, system access and contacts for problems this term.",
      "Review the previous term’s review, waiting work and unresolved issues; have the receiving person accept each handover.",
      "Keep actions with unpublished or inaccessible instructions visibly waiting, with responsible staff, a follow-up date and an escalation contact."
    ],
    "sourceSteps": [
      "Open the current NESA Timetable of Actions/Schools Online state, authenticated RTO guidance and WWHS/Sentral calendar.",
      "Record each current publication/version, exact applicable action/date and any changed requirement without copying controlled material here.",
      "Reconfirm accountable roles, doers, deputies, access, verifiers and escalation paths for this term.",
      "Review the prior-term assurance, waiting work and exceptions; require the receiving role to accept each hand-off.",
      "Keep unpublished or inaccessible actions visibly waiting with an owner, chase date and escalation point."
    ],
    "sourceFinished": "Term 4 has a current source/date register, accepted role hand-offs and no ownerless exception; only verified term actions may proceed.",
    "kindLabel": "School planning check"
  },
  "2027-t2-w09-entry-audit": {
    "title": "Check all Stage 6 VET entries before 30 June",
    "purpose": "Review Preliminary and HSC VET entries early enough to correct problems before the 30 June cut-off.",
    "finished": "All applicable entries are independently checked, and each discrepancy has a responsible person, approved correction route and deadline before 30 June.",
    "steps": [
      "Open current ACE Rule 14.2 and the live 2027 Schools Online entry action.",
      "Check every applicable Preliminary and HSC VET entry, change and external-delivery record in the official system.",
      "Check course exclusions and whether proposed changes can still meet all course requirements, including mandatory work placement.",
      "Assign each discrepancy for correction before 30 June; keep student details only in authorised records.",
      "Arrange an independent overall check and keep only a privacy-safe reference in this workboard."
    ],
    "sourceSteps": [
      "Open the current ACE Rule 14.2 and the live 2027 Schools Online entry action.",
      "Audit every applicable Preliminary and HSC VET entry, change and external-delivery state in the owner system.",
      "Check course exclusions and whether each proposed change can still meet all course and mandatory work-placement requirements.",
      "Assign every discrepancy for correction before 30 June; keep learner details only in the authorised records.",
      "Obtain an independent aggregate check and record only the privacy-safe audit reference here."
    ],
    "sourceFinished": "Every applicable Stage 6 entry has been independently checked and each discrepancy has an owner, correction path and deadline before 30 June."
  },
  "2027-t2-w10-entry-cutoff": {
    "title": "Complete Stage 6 VET entries by 30 June",
    "purpose": "Finish authorised course-entry corrections and independently confirm the official record before the 30 June cut-off.",
    "finished": "Schools Online shows the correct Stage 6 VET entry position by 30 June, and every unresolved matter is formally escalated without exposing student data.",
    "steps": [
      "Review outstanding issues from the independently checked entry review and the current 2027 Schools Online action.",
      "Complete authorised entries or changes by 30 June; do not create or alter a course entry after the cut-off.",
      "Confirm course exclusions and the student’s ability to meet all course and mandatory placement requirements in the official system.",
      "Have a different authorised person check the overall Schools Online position and unresolved issues.",
      "Keep only a privacy-safe completion or escalation reference in this workboard."
    ],
    "sourceSteps": [
      "Review the independently checked entry-audit exceptions and the live 2027 Schools Online action.",
      "Complete every authorised entry or change by 30 June; do not create or alter a course entry after the cut-off.",
      "Confirm exclusions and the learner's capacity to complete all applicable course and mandatory work-placement requirements in the owner system.",
      "Have a different authorised person verify the aggregate Schools Online state and unresolved exceptions.",
      "Record only a privacy-safe completion or escalation reference here."
    ],
    "sourceFinished": "The live owner system shows the correct aggregate Stage 6 VET entry state by 30 June and every unresolved matter is formally escalated without exposing learner data."
  },
  "2027-t2-w10-term-assurance": {
    "title": "Finish the Term 2 review and hand over to Term 3",
    "purpose": "Check official results and unresolved work, obtain an independent review and hand the next term’s actions to the responsible staff.",
    "finished": "The Term 2 summary is verified, the 30 June check is complete, and outstanding issues and current-source Term 3 actions have responsible staff.",
    "steps": [
      "Review the source list and record instructions or dates that changed during the term.",
      "Check course, evidence, NESA or RTO, placement and reporting results in official systems without copying personal information here.",
      "Review waiting, unresolved and returned work; assign a responsible role or system, follow-up date and escalation point.",
      "Record a privacy-safe review summary and have a different authorised person verify it.",
      "Open the first verified Term 3 actions and have the receiving staff accept them."
    ],
    "sourceSteps": [
      "Review the source register and record every instruction/date that changed during the term.",
      "Confirm required course, evidence, NESA/RTO, workplace-learning and reporting results in their owner systems without copying personal information here.",
      "Review waiting, exception and returned work; assign a role/system owner, chase date and escalation point where closure is not yet possible.",
      "Record a privacy-safe assurance summary and obtain a different authorised person's verification.",
      "Open the first verified Term 3 actions and obtain the receiving roles' acceptance."
    ],
    "sourceFinished": "Term 2 has a verified privacy-safe assurance summary, the 30 June control is closed, no exception is ownerless, and current-source Term 3 actions have been handed over.",
    "kindLabel": "School planning check"
  },
  "2027-t3-w10-term-assurance": {
    "title": "Finish the Term 3 review and hand over to Term 4",
    "purpose": "Check official results and unresolved work, obtain an independent review and hand the next term’s actions to the responsible staff.",
    "finished": "The Term 3 summary is verified, HSC and completion issues have responsible staff, and Term 4 staff have accepted the final-results work.",
    "steps": [
      "Review the source list and record instructions or dates that changed during the term.",
      "Check course, evidence, NESA or RTO, placement and reporting results in official systems without copying personal information here.",
      "Review waiting, unresolved and returned work; assign a responsible role or system, follow-up date and escalation point.",
      "Record a privacy-safe review summary and have a different authorised person verify it.",
      "Open the first verified Term 4 actions and have the receiving staff accept them."
    ],
    "sourceSteps": [
      "Review the source register and record every instruction/date that changed during the term.",
      "Confirm required course, evidence, NESA/RTO, workplace-learning and reporting results in their owner systems without copying personal information here.",
      "Review waiting, exception and returned work; assign a role/system owner, chase date and escalation point where closure is not yet possible.",
      "Record a privacy-safe assurance summary and obtain a different authorised person's verification.",
      "Open the first verified Term 4 actions and obtain the receiving roles' acceptance."
    ],
    "sourceFinished": "Term 3 has a verified privacy-safe assurance summary, HSC and completion exceptions are owned, and the final-outcome work has been accepted by the Term 4 roles.",
    "kindLabel": "School planning check"
  },
  "2027-t4-w06-next-year-hub": {
    "title": "Finish the 2028 VET Schools Hub setup",
    "purpose": "Check that proposed 2028 courses, delivery sites and teachers are recorded correctly and have the required approvals.",
    "finished": "The Hub supports planned 2028 delivery, its overall position is independently checked, and remaining gaps have responsible staff, follow-up dates and escalation points.",
    "steps": [
      "Use the authorised work account to open VET Schools Hub and current 2028 delivery instructions.",
      "Check the School Profile, planned delivery, qualification, site and course status for every proposed 2028 course.",
      "Confirm each trainer or assessor has the required current qualifications, industry currency, evidence and approval for the proposed delivery.",
      "Resolve outstanding Hub tasks, approvals, access or readiness issues, or formally assign them for follow-up.",
      "Have a different authorised person verify the overall 2028 Hub position; keep only a privacy-safe reference here."
    ],
    "sourceSteps": [
      "Open the current VET Schools Hub and 2028 delivery instructions through the authorised work account.",
      "Confirm the School Profile, delivery intention, qualification, site and course state for every proposed 2028 delivery.",
      "Confirm every trainer/assessor has the current qualification, currency, evidence and approval state required for the proposed delivery.",
      "Resolve or formally own every Hub To Do, approval, access and readiness exception.",
      "Have a different authorised person verify the aggregate 2028 Hub state and record only the privacy-safe reference here."
    ],
    "sourceFinished": "The current VET Schools Hub supports the proposed 2028 delivery and every remaining readiness exception has an authorised owner, chase and escalation point."
  },
  "2027-t4-w11-year-close": {
    "title": "Keep the 2027 record and hand over unfinished work",
    "purpose": "Preserve the completed year’s record and assign genuine unfinished work separately so 2028 starts with a clean task list.",
    "finished": "The 2027 snapshot is preserved, carry-overs have responsible staff, checkers and follow-up dates, and 2027 completion ticks have not closed 2028 tasks.",
    "steps": [
      "Review the source list and record instructions or dates that changed during the term.",
      "Check course, evidence, NESA or RTO, placement and reporting results in official systems without copying personal information here.",
      "Review waiting, unresolved and returned work; assign a responsible role or system, follow-up date and escalation point.",
      "Record a privacy-safe review summary and have a different authorised person verify it.",
      "Preserve the annual record and create separate 2028 carry-over tasks with responsible staff."
    ],
    "sourceSteps": [
      "Review the source register and record every instruction/date that changed during the term.",
      "Confirm required course, evidence, NESA/RTO, workplace-learning and reporting results in their owner systems without copying personal information here.",
      "Review waiting, exception and returned work; assign a role/system owner, chase date and escalation point where closure is not yet possible.",
      "Record a privacy-safe assurance summary and obtain a different authorised person's verification.",
      "Preserve the annual trail and create clean, separately owned 2028 carry-overs."
    ],
    "sourceFinished": "The 2027 privacy-safe annual snapshot is preserved, every genuine carry-over has an owner/verifier/chase point, and no 2027 completion has been copied into the clean 2028 source gate.",
    "kindLabel": "School planning check"
  },
  "template-c-07-workplace-learning-control": {
    "title": "Manage this placement from preparation to follow-up",
    "purpose": "Track one placement’s preparation, early contact, safety response and final records using the current approved workplace-learning process.",
    "finished": "Preparation, Day 1 or 2 contact, incidents, attendance, hours and review are recorded in authorised systems, with any exceptions assigned for follow-up.",
    "steps": [
      "Before placement, check course requirements, approved arrangements, preparation, forms, signatures, readiness and help contacts in the authorised systems.",
      "On Day 1 or Day 2, contact the student and host through the approved process and keep the official contact record.",
      "Act immediately on safety, welfare, attendance, suitability or privacy concerns through the official process; complete formal notification within 24 hours where required.",
      "After placement, promptly compare attendance, course-specific hours, the original Student Placement Record and required official-system records.",
      "Complete the post-placement review promptly and within four weeks; independently verify or formally assign every unresolved issue."
    ],
    "sourceSteps": [
      "Before placement, verify the current course-specific requirement, approved arrangement, preparation, forms, signatures, readiness and escalation contacts in the authorised systems.",
      "On Day 1 or Day 2, contact the student and host through the approved process and retain the official contact record in the owner system.",
      "Respond to any safety, welfare, attendance, suitability or privacy concern immediately through the formal incident/escalation route; complete the required formal notification within 24 hours where the procedure requires it.",
      "After placement, reconcile attendance, course-specific hours, the original Student Placement Record and required owner-system records as soon as possible.",
      "Complete the post-placement review as soon as possible and within four weeks, then independently verify or formally own every exception."
    ],
    "sourceFinished": "Preparation, Day 1/2 contact, incidents, attendance, hours, original records and the post-placement review are complete in authorised systems, or every exception has an owner, chase and escalation point."
  }
};
})();
