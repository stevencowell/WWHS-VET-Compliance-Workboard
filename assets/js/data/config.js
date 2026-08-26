(function () {
  "use strict";
  const staffLinks = {
    "vet-schools-hub": "https://apps.powerapps.com/play/e/default-05a0e69a-418a-47c1-9c25-9387261bf991/a/7cc796b6-8091-4876-81e0-3e1382980246?tenantId=05a0e69a-418a-47c1-9c25-9387261bf991",
    "document-library": "https://apps.powerapps.com/play/e/default-05a0e69a-418a-47c1-9c25-9387261bf991/a/5c9be746-db94-402d-9a74-420b4c109498?tenantId=05a0e69a-418a-47c1-9c25-9387261bf991",
    "toolbox": "https://schoolsnsw.sharepoint.com/sites/VETforsecondarystudentsToolbox/SitePages/Home.aspx",
    "schools-online": "https://bosho.boardofstudies.nsw.edu.au/links/schoolsonline.html",
    "go2workplacement": "https://teacher.go2workplacement.com/auth/login",
    "placement-provider-portal": "https://teacher.pathways.cloud/Login",
    "lln-robot": "https://waggawaggarto90333.lln.training/login",
    "wwhs-drive": "https://drive.google.com/drive/folders/0B40F5Y8uF0rvfkl1S2FEbjRhVmJYRWYyY2dlOFVHMDdQeFNyQlRBUzBudmtHRGJKdE83VVk?resourcekey=0-fXD-BgXggkE5EyIeJJdt5g",
    "sentral": "https://waggawagga-h.sentral.com.au/dashboard/",
    "head-teacher-guide": "https://docs.google.com/document/d/1iGNJzqizAqWO0PuSRDXh0QPc0L8y_wdiyEk88O7f680/edit?tab=t.0#heading=h.ktfx3hr9fygx"
  };
  window.VET_WORKBOARD = {
    config: {
      buildId: "wwhs-vet-compliance-workboard-2026-08-26-gated-v3",
      version: "3.0.0-public-preview",
      operatingYear: 2026,
      operationalStart: "2026-08-26",
      currentTerm: "Term 3",
      currentWeek: "Week 6",
      storageKey: "wwhs-vet-compliance-workboard:v3",
      releaseState: "PUBLIC TRAINING PREVIEW — OFFICIAL SYSTEMS REMAIN THE RECORD"
    },
    staffLinks,
    systems: [
      { id: "vet-schools-hub", label: "VET Schools Hub", kind: "private", url: staffLinks["vet-schools-hub"] },
      { id: "document-library", label: "RTO Document Library", kind: "private", url: staffLinks["document-library"] },
      { id: "evidence-central", label: "Evidence Central", kind: "controlled", url: "https://evidencecentral.info/" },
      { id: "schools-online", label: "Schools Online", kind: "private", url: staffLinks["schools-online"] },
      { id: "nesa-toa", label: "NESA live dates", kind: "public", url: "https://www.nsw.gov.au/education-and-training/nesa/key-dates/timetable-of-actions" },
      { id: "wwhs-drive", label: "WWHS VET Drive", kind: "private", url: staffLinks["wwhs-drive"] }
    ],
    previewTasks: [
      {
        id: "t3-hsc-estimates",
        title: "Prepare and submit HSC VET examination estimates",
        summary: "Check optional-exam entrants, prepare defensible estimates and complete the authorised Schools Online action.",
        phase: "term_3", dueDate: "2026-09-15", timing: "Due 15 September 2026", priority: "critical", applicability: "if applicable",
        roles: ["coordinator", "assistant"], owner: "Coordinator", verifier: "Principal / authorised NESA delegate", system: "schools-online", source: "Live NESA Timetable of Actions — May 2026 revision",
        steps: ["Open the live NESA timetable and confirm the due date.", "Confirm which Year 12 students are entered for an optional VET HSC examination in the authorised system.", "Coordinate estimates using the current school and NESA process.", "Have the authorised verifier check the entries before submission.", "Record a privacy-safe reference to the official completion trail."],
        doneWhen: "The authorised system shows the correct estimates for every applicable entrant and a second person has verified the submission.",
        why: "The estimate is a formal NESA data action. A calendar reminder alone is not completion.", commonTrap: "Assuming every VET student sits the optional HSC examination, or copying learner data into an uncontrolled checklist."
      },
      {
        id: "t3-work-placement-window",
        title: "Check Year 11 work placement progress and close-out",
        summary: "The WWHS working window is 24 August–4 September. Confirm attendance, required contact and original SPR handling.",
        phase: "term_3", timing: "WWHS working window now", priority: "critical", applicability: "if applicable",
        roles: ["coordinator", "assistant", "workplace"], owner: "Workplace learning role", verifier: "Coordinator", system: "wwhs-drive", source: "WWHS 2026 working calendar + current workplace learning procedure",
        steps: ["Confirm the course-specific placement requirement and current allocation.", "Check required student/host contact has occurred through the authorised process.", "Resolve attendance, suitability or safety issues immediately.", "Reconcile completed hours and collect the original Student Placement Record.", "Store the original record in the official school student file and record only a safe completion reference here."],
        doneWhen: "Placement status, hours and required records agree in the authorised destinations; every exception has an owner and next action.",
        why: "Work placement is both a course-completion and duty-of-care process.", commonTrap: "Using one blanket hours rule for every course or storing host/student details in a shadow spreadsheet."
      },
      {
        id: "t3-meeting-actions",
        title: "Close the Term 3 coordinator meeting actions",
        summary: "Turn the 25 August meeting into named actions, team communication and tracked follow-up.",
        phase: "term_3", timing: "Action now", priority: "high", applicability: "required",
        roles: ["coordinator", "assistant"], owner: "Coordinator", verifier: "Coordinator / Principal delegate", system: "wwhs-drive", source: "WWHS 2026 working calendar + current RTO communication",
        steps: ["Open the original meeting material and RTO communication.", "Separate information, actions, deadlines, decisions and escalations.", "Assign each action to the responsible role rather than defaulting everything to the coordinator.", "Brief affected staff and confirm the official destination for each action.", "Track closure and retain the approved meeting/action record."],
        doneWhen: "Minutes/actions are stored in the approved location, affected staff have been briefed and every action has an owner and follow-up date.",
        why: "Meetings only improve compliance when instructions become owned, verifiable work.", commonTrap: "Saving meeting notes without translating them into actions or checking later RTO updates."
      },
      {
        id: "t3-reconcile-evidence",
        title: "Run the Evidence Central → reports → NESA reconciliation",
        summary: "Sample evidence and feedback first; update outcomes only when the authorised evidence supports them.",
        phase: "continuous", timing: "Term 3 control", priority: "high", applicability: "required",
        roles: ["coordinator", "assistant", "trainer"], owner: "Trainer / assessor with Coordinator assurance", verifier: "Coordinator", system: "evidence-central", source: "RTO Term 3 Coordinator Guide 2026",
        steps: ["Open the current controlled assessment and evidence sources.", "Sample evidence, task annotations and useful written feedback.", "Compare the supported assessor outcome with school reporting and NESA status.", "Classify and correct mismatches through the owner system—do not force an outcome.", "Record the official reconciliation result or an owned exception."],
        doneWhen: "Authorised systems agree with supported assessor decisions, or every unresolved mismatch is formally owned and scheduled.",
        why: "The evidence trail must drive the outcome; system agreement by itself is not evidence.", commonTrap: "Entering competency outcomes just to make reports, Evidence Central and NESA appear consistent."
      },
      {
        id: "t3-next-year-delivery",
        title: "Confirm 2027 delivery authority before promotion",
        summary: "Check proposed courses, scope, School Profile, Authority to Deliver and Application to Run requirements before advertising.",
        phase: "term_3", timing: "Prepare next year", priority: "high", applicability: "required",
        roles: ["coordinator", "principal"], owner: "Principal and Coordinator", verifier: "RTO support / authorised delegate", system: "vet-schools-hub", source: "RTO Term 3 Coordinator Guide 2026 + RTO 90333 Quality Manual",
        steps: ["Confirm the proposed 2027 course and exact training product.", "Check central RTO scope separately from WWHS delivery authority.", "Compare trainer, facilities, equipment and timetable readiness.", "Complete Authority to Deliver and, where required, Application to Run through the current controlled workflow.", "Do not advertise until the required authority and readiness state is verified."],
        doneWhen: "The current VET Schools Hub status supports the proposed delivery and every readiness gap is resolved or formally escalated.",
        why: "Central RTO scope does not automatically authorise or prove readiness at WWHS.", commonTrap: "Promoting a course because it appears on training.gov.au before the school-specific approval is complete."
      }
    ]
  };
})();
