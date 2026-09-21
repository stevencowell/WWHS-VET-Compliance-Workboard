(function () {
  'use strict';
  // Presentation only. Source tasks, checklist indices and saved records stay intact.
  const clean = value => String(value || '').replace(/202[0-6]/g, 'the prior controlled year').replace(/\s+/g, ' ').trim();
  const strings = values => Array.isArray(values) ? values.filter(value => typeof value === 'string') : [];
  const sameSteps = (actual, source) => actual.length === source.length && actual.every((step, index) => clean(step) === clean(source[index]));
  function describe(wing, task = {}) {
    const entries = window.WWHS_TASK_COPY?.[String(wing).toLowerCase()] || {};
    const id = String(task.id || task.taskId || '');
    const steps = strings(task.actionSteps || task.steps);
    const finished = task.doneWhen || task.objective || '';
    const own = key => Object.hasOwn(entries,key) ? entries[key] : undefined;
    const template = own(`template-${task.canonicalTaskId}`);
    // Saved event help has a canonical ID but no occurrenceOf field. Use its
    // template only when the complete source checklist and outcome match.
    const matchedTemplate = template && sameSteps(steps,strings(template.sourceSteps)) && clean(finished)===clean(template.sourceFinished) ? template : undefined;
    const copy = own(id) || own(task.occurrenceOf) || matchedTemplate || own(task.canonicalTaskId) || own(id.replace(/^template-/, ''));
    const currentCopy = copy && (!copy.sourceFinished || clean(finished) === clean(copy.sourceFinished));
    return {
      title: copy?.title || task.title || '',
      purpose: copy?.purpose || task.summary || task.guidance?.why || task.why || '',
      finished: currentCopy ? copy.finished || finished : finished,
      steps: copy && sameSteps(steps, strings(copy.sourceSteps)) ? [...copy.steps] : [...steps],
      kindLabel: copy?.kindLabel || '',
    };
  }
  window.WWHS_TASK_CLARITY = Object.freeze({describe});
})();
