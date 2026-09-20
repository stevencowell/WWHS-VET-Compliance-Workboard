(function () {
  "use strict";

  const isTas = document.body.dataset.workboard === "tas";
  const wing = isTas ? "TAS" : "VET";
  const role = isTas ? "Head Teacher TAS" : "Head Teacher VET / VET Coordinator";
  const roleContext = `You are helping me in my ${role} role. Keep this job within my ${wing} responsibilities and the sources nominated below. If a matter belongs to another role, flag it for me to direct to the right person.`;
  const sourceRules = "Use only the current authorised sources I provide or explicitly nominate for this job. First confirm which sources you can actually read and their dates or versions. If a needed source is missing, ask for that source; do not fill gaps from memory. Separate confirmed facts from matters I need to check, and link each action or finding to its source. Keep personal information to the minimum needed. Prepare a draft for my review: do not send messages, upload files, change official records or make commitments on my behalf. Use plain Australian English.";

  const allJobs = [
    {
      id: "meeting", title: "Prepare a meeting", category: "Meetings",
      summary: "Turn notes and outstanding actions into a focused agenda.",
      output: "A short agenda, decisions needed and a draft action table.",
      sources: ["Current meeting notes and previous actions", "Meeting date, purpose and intended participants"],
      brief: "Help me prepare a practical meeting for my responsibilities in this role.\n\nThe current notes and previous actions are: [paste the notes or name/link the authorised documents].\nThe meeting is: [date, purpose, participants and available time].\n\nDraft a concise agenda with a sensible running order, proposed time allocations, decisions needed and the source material to have open. Carry forward only actions confirmed as unresolved in the supplied records. Keep suggested new agenda items separate. Finish with a draft action table: action, confirmed owner, confirmed due date and source. Mark missing owners or dates as 'To confirm'; do not invent decisions or completion status."
    },
    {
      id: "notices", title: "Turn notices into actions", category: "Triage",
      summary: "Pull out what matters, who needs to act and the actual deadline.",
      output: "A prioritised action list with source links and questions to resolve.",
      sources: ["The exact notices, emails or bulletin sections to review", "The responsibilities and period you want covered"],
      brief: "Help me turn the following notices into a manageable action list for my responsibilities in this role.\n\nThe current notices to review are: [paste the notices or name/link the authorised sources].\nThe responsibilities and period to cover are: [responsibilities within this role and dates].\n\nIdentify actions that actually apply to this role. For each action, give the required next step, exact stated deadline, stated owner and source link or section. Group these into action needed, information only and needs clarification. Preserve the year and distinguish a firm deadline from a suggested date. Flag conflicting or apparently outdated instructions. Do not treat an old notice as current or assume that an action is still outstanding. End with the three most useful next steps supported by the sources."
    },
    {
      id: "message", title: "Draft a reminder or email", category: "Communication",
      summary: "Prepare a clear message that is ready for you to review.",
      output: "A complete draft with a subject, clear request and supported deadline.",
      sources: ["The source notice or confirmed request", "Audience, tone and the action you need"],
      brief: "Draft a clear, courteous reminder or email for me to review.\n\nThe audience is: [staff group or role; include addresses only if needed].\nThe action I need is: [describe the request].\nThe current source and confirmed deadline are: [paste the notice or name/link the authorised source].\nThe tone and useful context are: [brief context].\n\nWrite a suitable subject and a complete, concise message. Make the requested action and confirmed deadline easy to find. Include the relevant source link where available. If the source does not establish the deadline, recipient or obligation, flag that for me before making a claim. Do not invent prior reminders, non-compliance, approvals or commitments. Return the draft here for review and do not create or send an external email or message."
    },
    {
      id: "documents", title: "Check documents are current", category: "Documents",
      summary: "Compare selected documents with the current nominated master.",
      output: "A comparison table showing version evidence and checks still needed.",
      sources: ["The exact documents or links you want checked", "The current approved master or official document library"],
      brief: "Help me check whether the selected working documents match their current authorised masters.\n\nThe documents to check are: [name/link the selected documents].\nThe authorised master or owner library is: [name/link the current source].\nThe scope of the check is: [documents, course or procedure and relevant year].\n\nCompare the available title, version, issue or review date, document owner and content against the nominated master. Report each document as 'Matches the nominated master', 'Difference found' or 'Unable to verify', with evidence and source links. A recent file modification date alone is not proof of currency. Identify broken or inaccessible links and differences that need the document owner's decision. Recommend the next check without declaring compliance. Do not replace, delete or update any document."
    },
    {
      id: "handover", title: "Prepare a handover", category: "Continuity",
      summary: "Bring scattered notes together into a usable handover brief.",
      output: "A short handover with current work, known deadlines and open questions.",
      sources: ["Current notes, action records and relevant calendar entries", "The handover period and recipient's role"],
      brief: "Prepare a concise handover for my responsibilities in this role.\n\nThe current authorised notes and action records are: [paste the material or name/link the sources].\nThe handover covers: [dates and responsibilities].\nThe recipient's role is: [role].\n\nOrganise the brief into immediate actions, work in progress, confirmed upcoming deadlines, key documents and unresolved questions. Give each action its source, recorded status, confirmed owner and next step. Keep suggested owners or next steps clearly labelled as suggestions. Do not infer that unrecorded work is incomplete, or turn an old deadline into a current obligation. Keep the main brief to a useful one-page length, with supporting links after it. Return a draft for my review."
    },
    {
      id: "evidence", title: "Prepare an evidence review", category: "VET preparation",
      summary: "Organise the checklist and materials for an authorised human reviewer.",
      output: "A source-linked review checklist and a list of evidence to locate.",
      sources: ["Current authorised review criteria or checklist", "The selected evidence index and review scope"],
      brief: "Help me prepare the administration for an evidence review; the authorised reviewer will make the decisions.\n\nThe current authorised checklist or criteria are: [name/link the current source].\nThe evidence index or selected materials are: [provide the authorised materials, using identifiers where possible].\nThe review scope is: [course, unit, period and purpose].\n\nBuild a source-linked checklist and map the supplied evidence references against it. Distinguish 'Located in supplied material', 'Not located in supplied material' and 'Needs reviewer judgement'. List the documents or access still needed. Do not treat evidence you cannot see as absent, or declare a learner competent, an assessment sufficient or a course compliant. Do not enter marks, competency outcomes or changes into Evidence Central or any official record. Return preparation notes for the authorised human reviewer."
    }
  ];
  const jobs = allJobs.filter(job => !isTas || job.id !== "evidence");

  const boundContainers = new WeakSet();
  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  const getJob = id => jobs.find(job => job.id === id);
  const promptFor = job => `${roleContext}\n\n${job.brief}\n\n${sourceRules}`;

  function connectionNote() {
    return `<div class="ai-connection"><span class="ai-connection-dot" aria-hidden="true"></span><div><strong>Start with a copied prompt</strong><p>These buttons prepare a prompt. To start the work, paste it into Codex or ChatGPT and provide the current sources.</p></div></div>`;
  }

  function menu() {
    return `<header class="ai-heading"><p class="ai-eyebrow">${wing} wing · A little less administration</p><h1 tabindex="-1" data-ai-heading>AI Admin · ${wing}</h1><p>Choose a job, copy its prompt and add your sources in Codex or ChatGPT.</p></header>
      ${connectionNote()}
      <div class="ai-grid">${jobs.map(job => `<article class="ai-card"><div class="ai-card-meta"><span>${escapeHtml(job.category)}</span><span class="ai-ready">Prompt ready</span></div><h2>${escapeHtml(job.title)}</h2><p>${escapeHtml(job.summary)}</p><p class="ai-card-output"><strong>You get</strong> ${escapeHtml(job.output)}</p><div class="ai-actions"><button class="ai-button" type="button" data-ai-action="prepare" data-ai-job="${job.id}" aria-label="Prepare job: ${escapeHtml(job.title)}">Prepare job <span aria-hidden="true">→</span></button><button class="ai-button ai-button-secondary" type="button" data-ai-action="copy" data-ai-job="${job.id}" aria-label="Copy prompt: ${escapeHtml(job.title)}">Copy prompt</button></div></article>`).join("")}</div>
      <aside class="ai-next"><h2>Check the draft before using it</h2><p>AI prepares a draft. Check it against your current sources before sharing it or updating official records.</p></aside>`;
  }

  function detail(job) {
    return `<nav class="ai-back-nav" aria-label="AI Admin jobs"><button class="ai-back" type="button" data-ai-action="back" data-ai-job="${job.id}"><span aria-hidden="true">←</span> Back to jobs</button></nav>
      <header class="ai-heading"><p class="ai-eyebrow">${wing} wing · ${escapeHtml(job.category)} · Prompt ready</p><h1 tabindex="-1" data-ai-heading>${escapeHtml(job.title)}</h1><p>${escapeHtml(job.output)}</p></header>
      ${connectionNote()}
      <div class="ai-job-layout"><section class="ai-source-panel"><h2>Have these ready</h2><ul>${job.sources.map(source => `<li>${escapeHtml(source)}</li>`).join("")}</ul><h2>Start the job</h2><ol><li>Copy the prompt.</li><li>Paste it into Codex or ChatGPT.</li><li>Replace the bracketed guidance with your sources and context, then send it there.</li></ol><p class="ai-source-note">Only share sources the AI service is authorised to use. This page does not collect or store your documents.</p></section>
      <section class="ai-prompt-panel"><label class="ai-prompt-label"><span>Starter prompt</span><textarea class="ai-prompt" readonly spellcheck="false" rows="18" data-ai-prompt>${escapeHtml(promptFor(job))}</textarea></label><div class="ai-actions"><button class="ai-button" type="button" data-ai-action="copy" data-ai-job="${job.id}">Copy prompt</button><button class="ai-button ai-button-secondary" type="button" data-ai-action="select" data-ai-job="${job.id}">Select text</button></div><p class="ai-feedback" role="status" aria-live="polite" aria-atomic="true" data-ai-feedback>Ready to copy. You can also select and copy the text manually.</p></section></div>`;
  }

  function render() {
    return `<div class="page ai-portal" data-ai-portal>${menu()}</div>`;
  }

  function focusHeading(portal) {
    const heading = portal.querySelector("[data-ai-heading]");
    if (heading) heading.focus({ preventScroll: true });
    portal.scrollIntoView({ block: "start", behavior: "auto" });
  }

  function selectPrompt(portal) {
    const field = portal.querySelector("[data-ai-prompt]");
    if (!field) return null;
    field.focus();
    field.select();
    field.setSelectionRange(0, field.value.length);
    return field;
  }

  async function copyPrompt(portal, job, button) {
    const feedback = portal.querySelector("[data-ai-feedback]");
    button.disabled = true;
    let copied = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(promptFor(job));
        copied = true;
      }
    } catch (_) {
      // A browser may deny clipboard permission; visible text remains available.
    }
    if (!portal.isConnected || portal.dataset.aiSelected !== job.id) return;
    if (!copied) {
      selectPrompt(portal);
      try {
        copied = typeof document.execCommand === "function" && document.execCommand("copy");
      } catch (_) {
        copied = false;
      }
    }
    button.disabled = false;
    if (copied) {
      feedback.textContent = "Prompt copied. Paste it into Codex or ChatGPT, add your current sources and send it there to start.";
      button.focus({ preventScroll: true });
    } else {
      feedback.textContent = "Automatic copying is unavailable. The prompt is selected: press Ctrl+C (or Command+C), or use your device’s Copy option.";
    }
  }

  function bind(container) {
    if (!container || boundContainers.has(container)) return;
    boundContainers.add(container);
    container.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-ai-action]");
      if (!button || !container.contains(button)) return;
      const portal = button.closest("[data-ai-portal]");
      if (!portal) return;
      const action = button.dataset.aiAction;
      const job = getJob(button.dataset.aiJob);
      if (!job) return;
      if (action === "back") {
        portal.innerHTML = menu();
        delete portal.dataset.aiSelected;
        const previous = portal.querySelector(`[data-ai-action="prepare"][data-ai-job="${job.id}"]`);
        if (previous) previous.focus();
        return;
      }
      if (action === "select") {
        selectPrompt(portal);
        portal.querySelector("[data-ai-feedback]").textContent = "Prompt selected. Press Ctrl+C (or Command+C), or use your device’s Copy option.";
        return;
      }
      if (action !== "prepare" && action !== "copy") return;
      if (portal.dataset.aiSelected !== job.id) {
        portal.innerHTML = detail(job);
        portal.dataset.aiSelected = job.id;
        focusHeading(portal);
      }
      if (action === "copy") {
        const copyButton = portal.querySelector('[data-ai-action="copy"]');
        void copyPrompt(portal, job, copyButton);
      }
    });
  }

  window.WWHS_AI_ADMIN = Object.freeze({ render, bind, jobs: Object.freeze(jobs.map(job => Object.freeze({ id: job.id, title: job.title }))) });
})();
