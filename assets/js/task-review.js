(function (root) {
  'use strict';
  const browserStorage = () => root.WWHS_STORAGE || localStorage;
  const KEY = 'wwhs-task-register-review:v1';
  const INBOX_KEY = 'morning-launchpad-summary:v1';
  const validRequirementsKey = value => typeof value === 'string' && /^r1-[a-f0-9]{16}$/.test(value);
  const requirementKeys = new Map();
  function requirements(value) {
    const steps = value?.steps ?? value?.actionSteps;
    const finished = value?.finished ?? value?.doneWhen ?? '';
    if (!Array.isArray(steps) || steps.length > 200 || steps.some(step => typeof step !== 'string' || step.length > 20000) || typeof finished !== 'string' || finished.length > 20000) throw new Error('Invalid task requirements');
    return {steps:[...steps], finished};
  }
  function requirementsKey(value) {
    const snapshot = requirements(value);
    // Order is presentation only. The full saved snapshot maps each individual tick.
    const text = JSON.stringify({steps:[...snapshot.steps].sort(),finished:snapshot.finished});
    if (requirementKeys.has(text)) return requirementKeys.get(text);
    let a = 2166136261, b = 2246822519;
    for (let i = 0; i < text.length; i++) { a = Math.imul(a ^ text.charCodeAt(i), 16777619); b = Math.imul(b ^ text.charCodeAt(i), 3266489917); }
    const key = `r1-${(a >>> 0).toString(16).padStart(8,'0')}${(b >>> 0).toString(16).padStart(8,'0')}`;
    requirementKeys.set(text,key);
    return key;
  }
  function requirementsInfo(task) {
    const current = requirements(task), previous = task.legacyRequirements ? requirements(task.legacyRequirements) : current;
    return {key:requirementsKey(current), legacyKey:requirementsKey(previous)};
  }
  function reviewMatches(tick, info) {
    return !info || (tick?.requirementsKey ? tick.requirementsKey === info.key : info.key === info.legacyKey);
  }
  function nextReview(previous, next) {
    const history = [...(previous?.previousReviews || [])];
    if (previous?.completed && previous.requirementsKey !== next.requirementsKey) {
      const {previousReviews, ...saved} = previous;
      history.push(saved);
    }
    if (history.length > 100) throw new Error('Too many saved review revisions');
    return {...next, ...(history.length ? {previousReviews:history} : {})};
  }
  function migrateRequirements(raw, task) {
    const current = requirements(task), previous = requirements(Object.hasOwn(raw,'requirements') ? raw.requirements : task.legacyRequirements || task);
    const positions = new Map();
    previous.steps.forEach((step,index) => { const list = positions.get(step) || []; list.push(index); positions.set(step,list); });
    const stepChecks = {};
    current.steps.forEach((step,index) => { const oldIndex = positions.get(step)?.shift(); if (oldIndex !== undefined && raw.stepChecks?.[oldIndex] === true) stepChecks[index] = true; });
    const changed = requirementsKey(previous) !== requirementsKey(current);
    if (raw.requirementsHistory !== undefined && !Array.isArray(raw.requirementsHistory)) throw new Error('Invalid instruction history');
    const history = Array.isArray(raw.requirementsHistory) ? [...raw.requirementsHistory] : [];
    if (history.length > 100) throw new Error('Too many saved instruction revisions');
    for (const item of history) {
      requirements(item?.requirements);
      if (!item.stepChecks || typeof item.stepChecks !== 'object' || Array.isArray(item.stepChecks) || Object.entries(item.stepChecks).some(([key,value]) => !/^\d{1,3}$/.test(key) || typeof value !== 'boolean') || typeof item.status !== 'string') throw new Error('Invalid earlier checklist');
    }
    if (changed) {
      if (history.length === 100) throw new Error('Too many saved instruction revisions');
      history.push({requirements:previous, stepChecks:{...(raw.stepChecks || {})}, status:raw.status || 'not-started', sourceChecked:raw.sourceChecked === true, doneWhenConfirmed:raw.doneWhenConfirmed === true, independentVerifierConfirmed:raw.independentVerifierConfirmed === true});
    }
    return {...raw, requirements:current, stepChecks, requirementsHistory:history, requirementsReview:changed || raw.requirementsReview === true,
      ...(changed ? {status:['completed','verified','not-applicable'].includes(raw.status) ? 'in-progress' : raw.status, sourceChecked:false, doneWhenConfirmed:false, independentVerifierConfirmed:false} : {})};
  }
  function date(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const parsed = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : '';
  }
  function parse(raw) {
    if (raw === null || raw === undefined || raw === '') return {version:1, records:{}};
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !value.records || typeof value.records !== 'object' || Array.isArray(value.records)) throw new Error('Unrecognised review backup');
    const records = {};
    for (const [key, item] of Object.entries(value.records)) {
      if (!/^(vet|tas):\d{4}:.+$/.test(key) || typeof item?.completed !== 'boolean' || !date(item.reviewedOn)) throw new Error('Invalid review entry');
      if (item.completedEarly !== undefined && typeof item.completedEarly !== 'boolean') throw new Error('Invalid early completion');
      if (item.requirementsKey !== undefined && !validRequirementsKey(item.requirementsKey)) throw new Error('Invalid reviewed task requirements');
      let previousReviews;
      if (item.previousReviews !== undefined) {
        if (!Array.isArray(item.previousReviews) || item.previousReviews.length > 100 || item.previousReviews.some(previous => previous?.previousReviews !== undefined)) throw new Error('Invalid previous reviews');
        previousReviews = item.previousReviews.map(previous => parse(JSON.stringify({version:1,records:{[key]:previous}})).records[key]);
      }
      records[key] = {completed:item.completed, reviewedOn:item.reviewedOn, ...(item.completedEarly === true ? {completedEarly:true} : {}), ...(item.requirementsKey ? {requirementsKey:item.requirementsKey} : {}), ...(previousReviews ? {previousReviews} : {})};
    }
    return {version:1, records};
  }
  function resolve(records, wing, key, year, today, notBefore = '', info = null) {
    const tick = records[`${wing}:${year}:${encodeURIComponent(key)}`];
    if (!reviewMatches(tick, info)) return null;
    // Only an explicit sign-off may override a future date or year. Legacy ticks
    // retain their timing checks, and the key still identifies one occurrence.
    if (tick?.completedEarly === true) return tick.completed === true && date(tick.reviewedOn) && tick.reviewedOn <= today
      ? {year:Number(year), reviewedOn:tick.reviewedOn, method:'overall', completedEarly:true} : null;
    if (Number(year) > Number(today.slice(0,4)) || notBefore > today) return null;
    return tick?.completed === true && date(tick.reviewedOn) && tick.reviewedOn >= `${year}-01-01` && tick.reviewedOn <= today && (!notBefore || tick.reviewedOn >= notBefore)
      ? {year:Number(year), reviewedOn:tick.reviewedOn, method:'overall'} : null;
  }
  function read() {
    let raw;
    try { raw = browserStorage().getItem(KEY); return {raw, readable:true, ...parse(raw)}; }
    catch (_) { return {raw, readable:false, records:{}}; }
  }
  function savedCompletion(wing, key, year, today, notBefore = '', info = null) {
    if (Number(year) > Number(today.slice(0,4)) || notBefore > today) return null;
    try {
      const inbox = JSON.parse(browserStorage().getItem(INBOX_KEY) || 'null');
      const item = inbox?.items?.find(item => item.status === 'done' && item.origin?.wing === wing && item.origin.recordKey === key);
      if (!item) return null;
      if (!reviewMatches({requirementsKey:item.completedRequirementsKey}, info)) return null;
      const reviewedOn = date(item.lastActionOn) || date(item.createdOn);
      if (reviewedOn && (reviewedOn > today || reviewedOn < `${year}-01-01`)) return null;
      if (notBefore && (!reviewedOn || reviewedOn < notBefore)) return null;
      return {year:Number(year), reviewedOn, method:'task-list'};
    } catch (_) { return null; }
  }
  function note(review) {
    if (!review) return '';
    return `Reviewed complete for ${review.year}${review.reviewedOn ? ` on ${review.reviewedOn}` : ' (review date not recorded)'}. ${review.completedEarly ? 'Signed off early; the scheduled dates are unchanged. ' : ''}This task and its applicable steps were confirmed complete through ${review.method === 'task-list' ? 'the saved task list' : 'the overall sign-off'}. The date records the review, not when the work was performed.`;
  }
  function notes(existing, review) {
    const generated = note(review);
    return [existing || '', generated && !(existing || '').includes(generated) ? generated : ''].filter(Boolean).join('\n\n');
  }
  function project(record, review, steps, field, milestones = []) {
    if (!review) return record;
    return {...record, status:'completed', [field]:Object.fromEntries(steps.map((_,i)=>[i,true])),
      milestones:Object.fromEntries(milestones.map((_,i)=>[i,true])), sourceChecked:true, doneWhenConfirmed:true, doneConfirmed:true};
  }
  root.WWHS_TASK_REVIEW = Object.freeze({KEY, INBOX_KEY, date, parse, resolve, read, savedCompletion, note, notes, project,
    requirements, requirementsKey, requirementsInfo, validRequirementsKey, reviewMatches, nextReview, migrateRequirements});
})(typeof window === 'object' ? window : globalThis);
