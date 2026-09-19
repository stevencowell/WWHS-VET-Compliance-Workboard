(function (root) {
  'use strict';
  const browserStorage = () => root.WWHS_STORAGE || localStorage;
  const KEY = 'wwhs-task-register-review:v1';
  const INBOX_KEY = 'morning-launchpad-summary:v1';
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
      records[key] = {completed:item.completed, reviewedOn:item.reviewedOn};
    }
    return {version:1, records};
  }
  function resolve(records, wing, key, year, today, notBefore = '') {
    if (Number(year) > Number(today.slice(0,4)) || notBefore > today) return null;
    const tick = records[`${wing}:${year}:${encodeURIComponent(key)}`];
    return tick?.completed === true && date(tick.reviewedOn) && tick.reviewedOn >= `${year}-01-01` && tick.reviewedOn <= today && (!notBefore || tick.reviewedOn >= notBefore)
      ? {year:Number(year), reviewedOn:tick.reviewedOn, method:'overall'} : null;
  }
  function read() {
    let raw;
    try { raw = browserStorage().getItem(KEY); return {raw, readable:true, ...parse(raw)}; }
    catch (_) { return {raw, readable:false, records:{}}; }
  }
  function savedCompletion(wing, key, year, today, notBefore = '') {
    if (Number(year) > Number(today.slice(0,4)) || notBefore > today) return null;
    try {
      const inbox = JSON.parse(browserStorage().getItem(INBOX_KEY) || 'null');
      const item = inbox?.items?.find(item => item.status === 'done' && item.origin?.wing === wing && item.origin.recordKey === key);
      if (!item) return null;
      const reviewedOn = date(item.lastActionOn) || date(item.createdOn);
      if (reviewedOn && (reviewedOn > today || reviewedOn < `${year}-01-01`)) return null;
      if (notBefore && (!reviewedOn || reviewedOn < notBefore)) return null;
      return {year:Number(year), reviewedOn, method:'task-list'};
    } catch (_) { return null; }
  }
  function note(review) {
    if (!review) return '';
    return `Reviewed complete for ${review.year}${review.reviewedOn ? ` on ${review.reviewedOn}` : ' (review date not recorded)'}. This task and its applicable steps were confirmed complete through ${review.method === 'task-list' ? 'the saved task list' : 'the overall sign-off'}. The date records the review, not when the work was performed.`;
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
  root.WWHS_TASK_REVIEW = Object.freeze({KEY, INBOX_KEY, date, parse, resolve, read, savedCompletion, note, notes, project});
})(typeof window === 'object' ? window : globalThis);
