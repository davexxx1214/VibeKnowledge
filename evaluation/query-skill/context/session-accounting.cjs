// Fresh one-turn experiments only. Never silently include a follow-up run in
// whole-session usage, or accept an old completion while a newer task is active.
function assertFreshComplete(events) {
  const starts = [], completions = [];
  events.forEach((event, index) => {
    if (event.type !== 'event_msg') return;
    if (event.payload?.type === 'task_started') starts.push({ index, payload: event.payload });
    if (event.payload?.type === 'task_complete') completions.push({ index, payload: event.payload });
  });
  if (starts.length !== 1 || completions.length !== 1 || completions[0].index <= starts[0].index) {
    throw new Error('Accounting requires exactly one fresh, completed task');
  }
  const start = starts[0], completion = completions[0];
  if (!start.payload.turn_id || start.payload.turn_id !== completion.payload.turn_id) {
    throw new Error('Task start/completion identity mismatch');
  }
  if (events.some(e => e.type === 'event_msg' && e.payload?.type === 'turn_aborted')) {
    throw new Error('Aborted task is not a completed experiment');
  }
  return completion.payload;
}
module.exports = { assertFreshComplete };
