// Private budget-plan data is supplied by the user; no household defaults live here.
export const BUDGET_PLAN_LIMITS = Object.freeze({
  schedules: 1000, budgetLines: 1000, referenceBudget: 1000,
  accountMappings: 250, sources: 50, notes: 100,
  annualAmount: 100_000_000, scheduledAmount: 1_000_000,
  queryDays: 366, occurrences: 10_000,
});

const DAY_MS = 86_400_000;
const TYPES = Object.freeze(['direct-bill', 'to-holding', 'from-holding', 'to-offset', 'to-savings', 'to-car-rego']);
const FREQUENCIES = ['weekly', 'fortnightly', 'monthly'];
const ROOT_KEYS = ['type', 'version', 'title', 'financialYearStart', 'financialYearEnd', 'sourceAsOf', 'sources', 'budgetLines', 'referenceBudget', 'schedules', 'accountMappings', 'notes'];
const SCHEDULE_KEYS = ['id', 'type', 'title', 'from', 'to', 'amount', 'frequency', 'startDate', 'endDate', 'reference', 'sourceRow', 'confirmed'];
const LINE_KEYS = ['id', 'category', 'item', 'annual_budget', 'basis', 'notes'];
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export class BudgetPlanValidationError extends Error {
  constructor(path, message) {
    super(`${path}: ${message}`);
    this.name = 'BudgetPlanValidationError';
    this.path = path;
  }
}

function fail(path, message) { throw new BudgetPlanValidationError(path, message); }

function checkDataTree(value) {
  const seen = new WeakSet();
  let visited = 0;
  function visit(item, path, depth) {
    if (++visited > 100_000 || depth > 12) fail(path, 'The data structure is too large or deeply nested.');
    if (item === null || typeof item !== 'object') return;
    if (seen.has(item)) fail(path, 'Circular or shared object references are not supported.');
    seen.add(item);
    const isArray = Array.isArray(item);
    if (isArray && item.length > 1000) fail(path, 'An array exceeds the allowed size.');
    const prototype = Object.getPrototypeOf(item);
    if (prototype !== (isArray ? Array.prototype : Object.prototype) && !(prototype === null && !isArray)) {
      fail(path, 'Use plain JSON objects and arrays.');
    }
    const descriptors = Object.getOwnPropertyDescriptors(item);
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== 'string' || FORBIDDEN_KEYS.has(key)) fail(path, 'Prototype or symbol keys are not allowed.');
      if (isArray && key === 'length') continue;
      const descriptor = descriptors[key];
      if (!('value' in descriptor) || !descriptor.enumerable) fail(path, 'Accessors and hidden properties are not allowed.');
      if (isArray && !/^(?:0|[1-9]\d*)$/.test(key)) fail(path, 'Arrays cannot contain named properties.');
      visit(descriptor.value, `${path}.${key}`, depth + 1);
    }
    if (isArray) {
      for (let index = 0; index < item.length; index += 1) {
        if (!Object.hasOwn(descriptors, String(index))) fail(path, 'Sparse arrays are not allowed.');
      }
    }
  }
  visit(value, 'plan', 0);
}

function record(value, keys, path) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(path, 'Expected an object.');
  const own = Object.keys(value);
  if (own.length !== keys.length || own.some(key => !keys.includes(key))) {
    fail(path, `Expected exactly these fields: ${keys.join(', ')}.`);
  }
  return value;
}

function text(value, path, max = 200, allowEmpty = false) {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    fail(path, `Expected text of at most ${max} characters without control characters.`);
  }
  const result = value.trim();
  if (!allowEmpty && !result) fail(path, 'Text cannot be empty.');
  return result;
}

function id(value, path) {
  const result = text(value, path, 80);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(result)) fail(path, 'Use a short identifier containing letters, numbers, dots, underscores, colons or hyphens.');
  return result;
}

function array(value, path, max, mapper) {
  if (!Array.isArray(value) || value.length > max) fail(path, `Expected an array with at most ${max} entries.`);
  return value.map((item, index) => mapper(item, `${path}[${index}]`));
}

function choice(value, allowed, path) {
  if (!allowed.includes(value)) fail(path, `Expected one of: ${allowed.join(', ')}.`);
  return value;
}

function money(value, path, max, allowZero = true) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (!allowZero && value === 0) || value > max) {
    fail(path, `Expected a finite ${allowZero ? 'non-negative' : 'positive'} amount no greater than ${max}.`);
  }
  const rounded = Math.round(value * 100) / 100;
  if ((rounded === 0 && value !== 0) || Math.abs(value - rounded) > Number.EPSILON * Math.max(1, Math.abs(value)) * 4) fail(path, 'Amounts may have at most two decimal places.');
  return rounded === 0 ? 0 : rounded;
}

function calendarDate(value, path) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(path, 'Expected a calendar date in YYYY-MM-DD format.');
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    fail(path, 'Expected a real calendar date between 1900 and 2200.');
  }
  return { value, year, month, day, timestamp: Date.UTC(year, month - 1, day) };
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isoDate(timestamp) { return new Date(timestamp).toISOString().slice(0, 10); }

function unique(values, path, key) {
  const used = new Set();
  for (const value of values) {
    const token = key(value);
    if (used.has(token)) fail(path, 'Duplicate identifiers or labels are not allowed.');
    used.add(token);
  }
}

function validateLine(value, path, reference = false) {
  record(value, LINE_KEYS, path);
  if (!reference && value.basis !== 'register') {
    fail(`${path}.basis`, 'Proposed targets must use register basis from direct-provider schedules. Keep historical estimates and unsupported fallbacks in referenceBudget; needs-review rows must be resolved before becoming proposed targets.');
  }
  if (!reference && typeof value.category === 'string' && ['income', 'transfer', 'transfers', 'savings', 'investments', 'offset', 'holding'].includes(value.category.trim().toLowerCase())) {
    fail(`${path}.category`, 'Proposed expense targets cannot use an income, transfer or saving category.');
  }
  return {
    id: id(value.id, `${path}.id`), category: text(value.category, `${path}.category`, 120),
    item: text(value.item, `${path}.item`, 160),
    annual_budget: money(value.annual_budget, `${path}.annual_budget`, BUDGET_PLAN_LIMITS.annualAmount),
    basis: reference ? choice(value.basis, ['historical-estimate', 'unsupported-fallback'], `${path}.basis`) : 'register',
    notes: text(value.notes, `${path}.notes`, 4000, true),
  };
}

function validateSchedule(value, path) {
  record(value, SCHEDULE_KEYS, path);
  const start = calendarDate(value.startDate, `${path}.startDate`);
  const end = value.endDate === null ? null : calendarDate(value.endDate, `${path}.endDate`);
  if (end && end.timestamp < start.timestamp) fail(`${path}.endDate`, 'End cannot precede Start.');
  if (value.confirmed !== false) fail(`${path}.confirmed`, 'Imported schedules must remain unconfirmed.');
  if (!Number.isInteger(value.sourceRow) || value.sourceRow < 1 || value.sourceRow > 1_000_000) fail(`${path}.sourceRow`, 'Expected a positive bounded source row number.');
  return {
    id: id(value.id, `${path}.id`), type: choice(value.type, TYPES, `${path}.type`),
    title: text(value.title, `${path}.title`, 240), from: text(value.from, `${path}.from`, 200), to: text(value.to, `${path}.to`, 200),
    amount: money(value.amount, `${path}.amount`, BUDGET_PLAN_LIMITS.scheduledAmount, false),
    frequency: choice(value.frequency, FREQUENCIES, `${path}.frequency`),
    startDate: start.value, endDate: end?.value ?? null,
    reference: text(value.reference, `${path}.reference`, 500, true), sourceRow: value.sourceRow, confirmed: false,
  };
}

export function validateBudgetPlan(value) {
  checkDataTree(value);
  record(value, ROOT_KEYS, 'plan');
  if (value.type !== 'finance-studio-budget-plan' || value.version !== 1) fail('plan', 'Expected a Finance Studio budget plan version 1, not a transaction dataset or backup.');
  const start = calendarDate(value.financialYearStart, 'plan.financialYearStart');
  const end = calendarDate(value.financialYearEnd, 'plan.financialYearEnd');
  const span = (end.timestamp - start.timestamp) / DAY_MS + 1;
  if (span < 1 || span > 366) fail('plan.financialYearEnd', 'The financial-year window must be ordered and no longer than 366 days.');
  const result = {
    type: 'finance-studio-budget-plan', version: 1, title: text(value.title, 'plan.title', 240),
    financialYearStart: start.value, financialYearEnd: end.value, sourceAsOf: calendarDate(value.sourceAsOf, 'plan.sourceAsOf').value,
    sources: array(value.sources, 'plan.sources', BUDGET_PLAN_LIMITS.sources, (item, path) => {
      record(item, ['name', 'kind'], path);
      return { name: text(item.name, `${path}.name`, 240), kind: text(item.kind, `${path}.kind`, 80) };
    }),
    budgetLines: array(value.budgetLines, 'plan.budgetLines', BUDGET_PLAN_LIMITS.budgetLines, (item, path) => validateLine(item, path)),
    referenceBudget: array(value.referenceBudget, 'plan.referenceBudget', BUDGET_PLAN_LIMITS.referenceBudget, (item, path) => validateLine(item, path, true)),
    schedules: array(value.schedules, 'plan.schedules', BUDGET_PLAN_LIMITS.schedules, validateSchedule),
    accountMappings: array(value.accountMappings, 'plan.accountMappings', BUDGET_PLAN_LIMITS.accountMappings, (item, path) => {
      record(item, ['label', 'accountId', 'confirmed'], path);
      if (item.accountId !== null || item.confirmed !== false) fail(path, 'Imported account mappings must have accountId null and confirmed false.');
      return { label: text(item.label, `${path}.label`, 200), accountId: null, confirmed: false };
    }),
    notes: array(value.notes, 'plan.notes', BUDGET_PLAN_LIMITS.notes, (item, path) => text(item, path, 4000)),
  };
  for (const key of ['budgetLines', 'referenceBudget', 'schedules']) unique(result[key], `plan.${key}`, item => item.id);
  for (const key of ['budgetLines', 'referenceBudget']) unique(result[key], `plan.${key}`, item => JSON.stringify([item.category.toLowerCase(), item.item.toLowerCase()]));
  unique(result.accountMappings, 'plan.accountMappings', item => item.label.toLowerCase());
  if (result.budgetLines.length) {
    const range = queryRange(result.financialYearStart, result.financialYearEnd);
    const directCents = result.schedules.filter(schedule => schedule.type === 'direct-bill').reduce((total, schedule) =>
      total + occurrencesFor(schedule, range).length * Math.round(schedule.amount * 100), 0);
    const proposedCents = result.budgetLines.reduce((total, line) => total + Math.round(line.annual_budget * 100), 0);
    if (proposedCents > directCents) fail('plan.budgetLines', 'Combined proposed targets exceed the direct-provider schedule total for this financial year. Keep transfers and historical estimates separate.');
  }
  return result;
}

function queryRange(fromDate, toDate) {
  const from = calendarDate(fromDate, 'fromDate');
  const to = calendarDate(toDate, 'toDate');
  const days = (to.timestamp - from.timestamp) / DAY_MS + 1;
  if (days < 1 || days > BUDGET_PLAN_LIMITS.queryDays) fail('toDate', `Use an inclusive window of 1 to ${BUDGET_PLAN_LIMITS.queryDays} days.`);
  return { from, to };
}

function occurrencesFor(schedule, range) {
  const start = calendarDate(schedule.startDate, 'schedule.startDate');
  const end = schedule.endDate === null ? range.to.timestamp : calendarDate(schedule.endDate, 'schedule.endDate').timestamp;
  const lower = Math.max(start.timestamp, range.from.timestamp);
  const upper = Math.min(end, range.to.timestamp);
  if (lower > upper) return [];
  const result = [];
  const append = timestamp => {
    if (timestamp < lower || timestamp > upper) return;
    result.push({ scheduleId: schedule.id, date: isoDate(timestamp), amount: schedule.amount,
      type: schedule.type, title: schedule.title, from: schedule.from, to: schedule.to });
  };
  if (schedule.frequency !== 'monthly') {
    const step = (schedule.frequency === 'weekly' ? 7 : 14) * DAY_MS;
    const first = start.timestamp + Math.ceil((lower - start.timestamp) / step) * step;
    for (let current = first; current <= upper; current += step) append(current);
  } else {
    const firstMonth = start.year * 12 + start.month - 1;
    const lowerDate = new Date(lower);
    let monthIndex = Math.max(firstMonth, lowerDate.getUTCFullYear() * 12 + lowerDate.getUTCMonth());
    while (true) {
      const year = Math.floor(monthIndex / 12);
      const month = monthIndex % 12 + 1;
      if (Date.UTC(year, month - 1, 1) > upper) break;
      // Use the original day every month; February's clamp never changes March.
      append(Date.UTC(year, month - 1, Math.min(start.day, daysInMonth(year, month))));
      monthIndex += 1;
    }
  }
  return result;
}

export function scheduleOccurrences(schedule, fromDate, toDate) {
  checkDataTree(schedule);
  const validated = validateSchedule(schedule, 'schedule');
  return occurrencesFor(validated, queryRange(fromDate, toDate));
}

export function upcomingPlan(plan, asOf, days = 30) {
  const validated = validateBudgetPlan(plan);
  const start = calendarDate(asOf, 'asOf');
  if (!Number.isInteger(days) || days < 1 || days > BUDGET_PLAN_LIMITS.queryDays) fail('days', `Expected a whole number from 1 to ${BUDGET_PLAN_LIMITS.queryDays}.`);
  const throughDate = isoDate(start.timestamp + (days - 1) * DAY_MS);
  const range = queryRange(start.value, throughDate);
  const occurrences = [];
  // Each source row is independent. Explicit end/start dates govern successor
  // plans; similarly named rows are never silently merged or truncated.
  for (const schedule of validated.schedules) {
    occurrences.push(...occurrencesFor(schedule, range));
    if (occurrences.length > BUDGET_PLAN_LIMITS.occurrences) fail('plan.schedules', 'Too many occurrences in this window; choose a shorter date window.');
  }
  occurrences.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.scheduleId < b.scheduleId ? -1 : a.scheduleId > b.scheduleId ? 1 : 0);
  const centsByType = Object.fromEntries(TYPES.map(type => [type, 0]));
  for (const occurrence of occurrences) centsByType[occurrence.type] += Math.round(occurrence.amount * 100);
  const byType = Object.fromEntries(TYPES.map(type => [type, centsByType[type] / 100]));
  const outCents = ['to-holding', 'to-offset', 'to-savings', 'to-car-rego'].reduce((total, type) => total + centsByType[type], 0);
  return {
    asOf: start.value, throughDate, days, occurrences,
    totals: { byType, directPayments: byType['direct-bill'], transfersOut: outCents / 100,
      transfersBack: byType['from-holding'], grossMovements: Object.values(centsByType).reduce((a, b) => a + b, 0) / 100 },
    assumptions: [
      'Planned occurrences only. These are not observed transactions or evidence of paid or funded amounts.',
      'Start is the first occurrence; End and the displayed query boundaries are inclusive.',
      'Monthly dates use the original day, clamped to the last day of shorter months. No bank holiday adjustment is inferred.',
      'Transfer totals describe internal movements and must not be added to expenses or treated as income.',
    ],
  };
}
