import {prepareTasks} from './summary-core.mjs';

// Connect the reviewed list to the existing React plan and its conflict-safe save.
// Never write the routine's localStorage record from the importer.
export function useSummaryBridge(React, context) {
  React.useEffect(() => {
    const {day, ready, editing, save} = context;
    const state = {capacity: day.capacity, count: day.tasks.length, closed: day.closed, ready};
    function snapshot(event) { event.detail.state = state; }
    function add(event) {
      const request = event.detail;
      try {
        if (!ready || editing) throw new Error('Finish editing or reload the saved daily plan before adding priorities.');
        const additions = prepareTasks(day, request.items);
        if (additions.length && !save({...day, tasks: [...day.tasks, ...additions]})) throw new Error('The plan could not be saved. Resolve the message in today’s plan and try again.');
        request.result = {ok: true, count: additions.length};
      } catch (error) { request.result = {ok: false, message: error.message}; }
    }
    window.addEventListener('launchpad:plan-state', snapshot);
    window.addEventListener('launchpad:add-reviewed', add);
    window.dispatchEvent(new CustomEvent('launchpad:plan-updated', {detail: state}));
    return () => {
      window.removeEventListener('launchpad:plan-state', snapshot);
      window.removeEventListener('launchpad:add-reviewed', add);
    };
  });
}
