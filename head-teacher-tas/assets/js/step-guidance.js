(function () {
  "use strict";

  // Destinations resolve through the workboard's saved system links at render time.
  // These are routes to the work, never a substitute for the current controlled source.
  const destinations = {
    calendar: ["staff-calendar", "Open staff calendar", "Check the event and year in the live school calendar; staff sign-in may be needed."],
    sentral: ["sentral", "Open Sentral", "Sign in, then select the relevant timetable, reporting or protected school workflow."],
    nesa: ["nesa-actions", "Open NESA dates and actions", "Choose the relevant year and action, then follow its current instructions."],
    curriculum: ["nesa-curriculum", "Open NSW Curriculum", "Choose the delivered course and check its syllabus, implementation dates and assessment requirements."],
    assessmentRules: ["nesa-assessment-rules", "Open NESA assessment rules", "Read the current assessment-program requirements for the relevant stage and course."],
    nonCompletion: ["nesa-course-non-completion", "Open NESA non-completion rules", "Check current warning and course-completion rules alongside the approved protected school process."],
    practicals: ["nesa-practicals", "Open NESA practical exam rules", "Check certification requirements and follow the specific course instructions and dates."],
    schoolsOnline: ["schools-online", "Open Schools Online sign-in", "Authorised staff: sign in, then open Memos and documents for the current course declaration and instructions."],
    guide: ["head-teacher-guide", "Open Head Teacher guide", "Use the referenced section to locate the current owner and process; older instructions need checking."],
    drive: ["tas-drive", "Open TAS faculty folder", "Choose the current year and relevant A–D branch. Confirm the approved current document."],
    plan: ["faculty-plan", "Open Faculty Management Plan folder", "Open the current working plan and confirm its endorsement and review dates."],
    programs: ["program-register", "Find programs hub in Drive", "Drive search for B3. Programs and Registration. Choose the current approved register or program."],
    assessment: ["assessment-schedules", "Find assessment schedules in Drive", "Drive search for Assessment Schedules - 2026. Check the year and approved version before use."],
    classroom: ["google-classroom", "Open Google Classroom", "Choose the work account and relevant class; this opens the class list."],
    scout: ["scout", "Open SCOUT access page", "Use authorised staff access to find the relevant cohort and results report."],
    mypl: ["mypl", "Open MyPL", "Sign in with the staff account to check training or professional learning."],
    finance: ["finance-system", "Open school finance portal", "Sign in to SAP and confirm the current delegated finance or procurement process."],
    whs: ["whs-system", "Open WHS shared drives", "In Shared drives choose WWHS Staff → Work Health and Safety, then the current control folder."],
    maintenance: ["workshop-maintenance", "Find workshop maintenance in Drive", "Drive search for C12. Workshop maintenance. Open the current fault or maintenance route linked there."],
    chemicals: ["chemical-register", "Find chemical register in Drive", "Drive search for C11. Chemical Register. Confirm the current register and SDS platform."],
    onguard: ["onguard", "Open OnGuard sign-in", "Sign in to the WWHS service and select the required equipment-safety module or record."],
    vet: ["vet-workboard", "Open VET workboard", "Use the relevant VET task and its controlled owner-system links."],
    website: ["school-website", "Open school website", "Check the public output here; changes use the school's approved publishing process."],
    mrg: ["mandatory-reporting", "Open Mandatory Reporter Guide", "Use the current guide and authorised Department process. Keep case information in the protected system."],
    incident: ["incident-reporting", "Open incident reporting", "Use the official Department reporting process after attending to immediate safety."],
  };

  // Each entry follows the existing step order. Grouped tasks share the same process,
  // but steps keep their own destination choices rather than repeating every task link.
  const plans = {
    "t1-year-opening-readiness": ["sentral calendar", "programs assessment", "whs onguard", "sentral", "guide"],
    "t1-student-review-cycle": ["calendar", "sentral guide", "sentral", "sentral"],
    "t2-student-review-cycle": ["calendar", "sentral guide", "sentral", "sentral"],
    "student-review-cycle": ["calendar", "sentral guide", "sentral", "sentral", "sentral"],
    "t1-vet-white-card-handoff": ["calendar vet", "sentral", "vet", "vet"],
    "t2-vet-placement-handoff": ["calendar vet", "sentral", "vet", "vet"],
    "t1-parent-teacher-evening": ["calendar sentral", "sentral", "guide", "sentral"],
    "t3-parent-teacher": ["calendar sentral", "sentral", "guide", "sentral"],
    "t1-nesa-disability-provisions": ["nesa", "guide sentral", "sentral", "sentral"],
    "t3-info-evening": ["calendar", "drive guide", "drive website", "vet", "drive"],
    "t3-year12-report-chain": ["sentral", "assessment sentral", "guide sentral", "calendar sentral", "sentral"],
    "t3-nesa-submission-check": ["nesa", "sentral", "guide calendar", "sentral", "sentral"],
    "t4-year11-report-chain": ["sentral", "assessment sentral", "nesa calendar", "calendar sentral"],
    "t4-year10-report-chain": ["sentral", "assessment curriculum", "nesa guide", "calendar sentral"],
    "t4-showcase": ["calendar", "whs guide", "drive", "vet", "drive"],
    "t4-report-release": ["sentral calendar", "sentral", "sentral", "plan"],
    "t4-enrichment": ["calendar guide", "whs drive", "sentral", "drive"],
    "hsc-analysis-cycle": ["scout", "scout", "plan", "programs plan"],
    "t2-hsc-practical-options-handoff": ["nesa", "sentral programs", "sentral", "nesa guide"],
    "t3-hsc-results-certification-handoff": ["nesa sentral", "sentral vet", "nesa sentral", "sentral"],
    "hsc-practical-certification-handoff": ["nesa practicals", "schoolsOnline practicals", "schoolsOnline programs", "practicals schoolsOnline", "sentral"],
    "source-sharing-review": ["guide drive", "drive", "drive", "guide drive", "guide"],
    "annual-calendar-control": ["calendar nesa", "calendar nesa", "calendar", "calendar sentral", "drive"],
    "annual-plan-alignment": ["plan guide", "plan", "plan", "plan"],
    "annual-rosters-rhythm": ["sentral calendar", "guide", "calendar", "drive"],
    "class-readiness": ["sentral", "programs classroom", "sentral", "onguard whs", "guide"],
    "technology-rotations": ["guide drive", "sentral", "programs assessment", "sentral", "drive"],
    "program-currency": ["curriculum", "programs", "programs", "programs", "programs"],
    "assessment-governance": ["assessment", "assessmentRules curriculum", "guide finance", "classroom sentral", "guide", "assessment"],
    "senior-monitoring": ["guide assessmentRules", "programs assessment", "calendar programs", "programs guide"],
    "subject-selection-cycle": ["calendar", "drive guide", "vet", "drive website", "drive"],
    "faculty-publications": ["website calendar", "drive", "guide drive", "website", "drive"],
    "reporting-assurance": ["calendar guide", "drive sentral", "guide", "sentral", "drive"],
    "capability-training": ["mypl", "guide", "mypl onguard", "mypl", "mypl"],
    "faculty-meeting-control": ["calendar drive", "drive", "drive", "drive"],
    "budget-procurement": ["finance", "plan finance", "finance", "finance", "finance"],
    "whs-inspection": ["whs", "whs", "whs", "whs", "whs"],
    "machinery-assets": ["guide whs", "finance whs", "finance whs", "onguard maintenance", "finance"],
    "chemical-controls": ["chemicals", "chemicals", "chemicals", "whs", "chemicals whs"],
    "workshop-routine": ["whs maintenance", "onguard", "maintenance whs", "programs classroom", "maintenance"],
    "term-workshop-close": ["calendar guide", "maintenance chemicals", "maintenance", "whs", "drive maintenance"],
    "stocktake-disposal": ["finance guide", "finance", "finance", "finance", "finance"],
    "ag-farm-audit": ["guide", "guide calendar", "whs guide", "whs", "guide"],
    "excursion-workflow": ["guide", "guide whs", "guide", "sentral incident", "finance sentral"],
    "new-staff-induction": ["sentral guide", "guide", "guide sentral", "whs onguard", "mypl", "guide"],
    "absence-cover": ["guide sentral", "sentral", "classroom programs", "guide whs", "sentral"],
    "n-warning-response": ["nonCompletion guide", "sentral", "sentral", "sentral", "sentral", "nonCompletion guide"],
    "mandatory-reporting-response": ["!emergency", "mrg guide", "mrg", "mrg", "!protected"],
    "incident-response": ["!emergency", "guide", "incident", "whs", "whs incident"],
    "media-enquiry": ["!media", "guide", "guide", "guide"],
    "vet-handoff": ["vet", "vet", "vet", "vet"],
  };
  ["t2-year12-report-chain", "t2-year11-report-chain", "t2-year8-report-chain", "t2-year9-report-chain", "t2-year10-report-chain", "t4-year9-report-chain", "t4-year7-report-chain", "t4-year8-report-chain"].forEach(id => {
    plans[id] = ["sentral", "assessment sentral", "sentral", "calendar sentral"];
  });
  plans["t2-year7-report-chain"] = ["sentral", "assessment sentral", "calendar sentral", "sentral"];

  const weekly = ["calendar nesa", "drive", "sentral whs", "calendar nesa assessment", "whs maintenance chemicals"];
  const hints = {
    "!emergency": "Act on immediate safety first. Do not wait for a website or sign-in; follow the school emergency procedure and call 000 where required.",
    "!protected": "No entry is needed here. Keep the case record in the authorised protected process.",
    "!media": "Refer the enquiry through the currently authorised school role before giving any response."
  };

  function guideHint(task) {
    const section = String(task?.source || "").match(/(?:Head Teacher )?Guide\s+([A-D][0-9A-Z\u2013\u2014/\-]*)/i)?.[1];
    return section ? `In the guide, find ${section}. Confirm the current owner and instructions before relying on older material.` : destinations.guide[2];
  }

  function destinationHint(key, task) {
    if (key === "guide") return guideHint(task);
    if (key === "drive") {
      const section = String(task?.source || "").match(/(?:Head Teacher )?Guide\s+([A-D][0-9A-Z\u2013\u2014/\-]*)/i)?.[1];
      if (section) return `In the TAS folder, use the current material for ${section}. Check the year and approved version.`;
    }
    return destinations[key][2];
  }

  function describe(keys, task) {
    return String(keys || "").split(/\s+/).filter(Boolean).map(key => {
      if (hints[key]) return { hint: hints[key] };
      const route = destinations[key];
      if (!route) return null;
      return { systemId: route[0], label: route[1], hint: destinationHint(key, task) };
    }).filter(Boolean);
  }

  function forStep(task, index) {
    if (!task || !Number.isInteger(index) || index < 0 || index >= (task.steps || []).length) return [];
    return describe(plans[task.id]?.[index] || "guide", task);
  }

  function forSource(task) {
    if (!task) return [];
    const text = String(task.source || "");
    const keys = [];
    if (/Staff School Calendar/.test(text)) keys.push("calendar");
    if (/NESA/.test(text)) keys.push("nesa");
    if (/Faculty Management Plan/.test(text)) keys.push("plan");
    if (/Guide/.test(text)) keys.push("guide");
    if (!keys.length) keys.push(...(task.id === "source-sharing-review" ? ["guide", "drive"] : ["guide"]));
    return describe(keys.join(" "), task);
  }

  window.TAS_STEP_GUIDANCE = Object.freeze({
    forStep,
    forSource,
    forWeekly: index => describe(weekly[index], index === 1 ? { source: "Guide C27" } : null),
    forMilestone: task => describe(/NESA|grade|HSC/.test(task?.source || "") ? "calendar nesa" : "calendar", task),
    hasPlan: (taskId, index) => Object.prototype.hasOwnProperty.call(plans, taskId) && (index === undefined || typeof plans[taskId][index] === "string")
  });
})();
