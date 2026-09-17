(function () {
  "use strict";
  // Public guidance destinations are kept separate from the existing staff directory.
  const board = window.HT_TAS_WORKBOARD;
  const curriculum = board.systems.find(system => system.id === "nesa-curriculum");
  if (curriculum) curriculum.url = "https://curriculum.nsw.edu.au/learning-areas/tas";
  const guidance = [
    {
      id: "nesa-assessment-rules", label: "NESA assessment programs", group: "Curriculum and assurance", kind: "public", status: "verified",
      url: "https://curriculum.nsw.edu.au/ace-rules/ace2/assessment-programs",
      purpose: "Current ACE rules for school assessment programs.",
      note: "Read the relevant course and stage requirements alongside the current approved school assessment process."
    },
    {
      id: "nesa-course-non-completion", label: "NESA course non-completion", group: "Curriculum and assurance", kind: "public", status: "verified",
      url: "https://curriculum.nsw.edu.au/ace-rules/ace4/course-non-completions",
      purpose: "Current ACE rules for course non-completion and warnings.",
      note: "Use the current rules and protected school workflow. Student cases are not recorded in this workboard."
    },
    {
      id: "nesa-practicals", label: "NESA HSC practical exams", group: "Curriculum and assurance", kind: "public", status: "verified",
      url: "https://curriculum.nsw.edu.au/ace-rules/ace2/hsc-practicals",
      purpose: "Current ACE rules for HSC practical exams, projects and certification.",
      note: "Check the specific course instructions and dates; practical requirements are not identical across courses."
    },
    {
      id: "schools-online", label: "NESA Schools Online", group: "Curriculum and assurance", kind: "staff", status: "front-door",
      url: "https://bosho.boardofstudies.nsw.edu.au/links/schoolsonline.html",
      purpose: "Authorised school access to NESA records, memos, documents and submission processes.",
      note: "Sign in with authorised school access. For declarations and current instructions, use Memos and documents and select the relevant course."
    },
  ];
  for (const system of guidance) if (!board.systems.some(existing => existing.id === system.id)) board.systems.push(system);
})();
