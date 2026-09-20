// Keep each wing's annual sequence intact without inventing dates for duties.
const phases = {annual:0, annual_setup:0, term_1:1, term_2:2, term_3:3, term_4:4, continuous:5, ongoing:5, weekly:6, triggered:7, event_driven:7};
const wings = {VET:0, TAS:1};
export function taskGroup(row) {
  if (row.phase === 'annual' || row.phase === 'annual_setup') return 'Annual setup';
  const term = /^term_([1-4])$/.exec(row.phase || '');
  if (term) return `Term ${term[1]} · ${row.due2026 ? 'dated tasks' : 'confirm timing'}`;
  if (row.phase === 'weekly') return 'Weekly checks';
  if (row.phase === 'triggered' || row.phase === 'event_driven') return 'When an event occurs';
  return 'Ongoing duties';
}
export function orderTasks(rows) {
  return [...rows].sort((a,b) =>
    (wings[a.wing] ?? 9) - (wings[b.wing] ?? 9) ||
    (phases[a.phase] ?? 9) - (phases[b.phase] ?? 9) ||
    (a.due2026 || '9999-12-31').localeCompare(b.due2026 || '9999-12-31') ||
    (a.sequence ?? 999) - (b.sequence ?? 999) || a.id.localeCompare(b.id)
  ).map((row,index) => ({...row, order:index+1}));
}
