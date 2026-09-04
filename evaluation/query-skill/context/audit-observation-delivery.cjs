const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { assertFreshComplete } = require('./session-accounting.cjs');
const [runArg, sessionA, sessionB, outArg] = process.argv.slice(2);
if (![runArg, sessionA, sessionB, outArg].every(Boolean)) throw new Error('Usage: RUN SESSION_A SESSION_B NEW_AUDIT_JSON');
const out = resolve(outArg);
if (existsSync(out)) throw new Error('Audit already recorded');
const parseLines = file => readFileSync(file, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const arms = {};
const outputTypes = new Set(['function_call_output', 'custom_tool_call_output']);
for (const [arm, session] of [['A', sessionA], ['B', sessionB]]) {
  // Only public tool outputs are inspected. No reasoning/system messages exported.
  const events = parseLines(session);
  assertFreshComplete(events);
  const meta = events.find(e => e.type === 'session_meta')?.payload;
  const outputs = events.filter(e => e.type === 'response_item' && outputTypes.has(e.payload?.type)).flatMap(e => {
    const output = e.payload.output;
    return typeof output === 'string' ? [output] : Array.isArray(output) ? output.map(b => b.text).filter(t => typeof t === 'string') : [];
  });
  const decoded = outputs.map(text => {
    try { const value = JSON.parse(text); return typeof value?.output === 'string' ? value.output : text; }
    catch { return text; }
  });
  const observations = parseLines(join(resolve(runArg), arm, 'ab-observations.jsonl'));
  const missing = [];
  observations.forEach((o, i) => {
    const text = o.displayed.trimEnd();
    const block = text.length ? decoded.findIndex(t => t.includes(text)) : -1;
    if (block < 0) { missing.push(i); return; }
    const start = decoded[block].indexOf(text);
    // Consume this occurrence, so duplicate observations cannot reuse one
    // delivery or a raw/decoded alias of the same public output.
    decoded[block] = decoded[block].slice(0, start) + '\0'.repeat(text.length) + decoded[block].slice(start + text.length);
  });
  arms[arm] = { sessionId: meta.id, agentPath: meta.source?.subagent?.thread_spawn?.agent_path,
    observations: observations.length, matchedPublicToolOutput: observations.length - missing.length,
    unmatchedObservationIndexes: missing, toolOutputTruncationMarkers: outputs.filter(t => /Warning: truncated output|[0-9]+ tokens truncated/.test(t)).length };
}
const result = { version: 2, createdAt: new Date().toISOString(), arms, passed: Object.values(arms).every(a => a.unmatchedObservationIndexes.length === 0),
  note: 'Multiplicity-aware public-tool substring matching, not call-identity proof. Supports function/custom tool outputs. Numerical model usage separately includes actual model input/output.' };
writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;
