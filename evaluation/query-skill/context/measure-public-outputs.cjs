const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const { assertFreshComplete } = require('./session-accounting.cjs');
const [sessionA, sessionB, outArg] = process.argv.slice(2);
if (![sessionA, sessionB, outArg].every(Boolean)) throw new Error('Usage: SESSION_A SESSION_B NEW_OUTPUT_JSON');
const out = resolve(outArg);
if (existsSync(out)) throw new Error('Measurement already recorded');
const texts = {}, metadata = {};
const outputTypes = new Set(['function_call_output', 'custom_tool_call_output']);
for (const [arm, path] of [['A', sessionA], ['B', sessionB]]) {
  const events = readFileSync(path, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const meta = events.find(e => e.type === 'session_meta')?.payload;
  assertFreshComplete(events);
  // Count only the actual public text returned by tools, including formatting,
  // failure messages and outer truncation. Never inspect/export private reasoning.
  const calls = events.filter(e => e.type === 'response_item' && outputTypes.has(e.payload?.type));
  const blocks = calls.flatMap(e => {
    const value = e.payload.output;
    return typeof value === 'string' ? [value] : Array.isArray(value) ? value.map(b => b.text).filter(v => typeof v === 'string') : [];
  });
  blocks.forEach((text, i) => { texts[`${arm}:${i}`] = text; });
  metadata[arm] = { sessionId: meta.id, agentPath: meta.source?.subagent?.thread_spawn?.agent_path,
    toolOutputItems: calls.length, textBlocks: blocks.length,
    truncationMarkers: blocks.filter(t => /Warning: truncated output|[0-9]+ tokens truncated/.test(t)).length };
}
const result = spawnSync('python', ['-X', 'utf8', '-c', "import json,sys,tiktoken; d=json.load(sys.stdin); e=tiktoken.get_encoding('o200k_base'); print(json.dumps({k:len(e.encode(v, disallowed_special=())) for k,v in d.items()}))"], { input: JSON.stringify(texts), encoding: 'utf8', timeout: 30000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
if (result.status !== 0) throw new Error(result.stderr);
const counts = JSON.parse(result.stdout);
for (const arm of ['A', 'B']) metadata[arm].publicToolOutputTokens = Object.entries(counts).filter(([k]) => k.startsWith(`${arm}:`)).reduce((n, [, count]) => n + count, 0);
const document = { version: 3, createdAt: new Date().toISOString(), tokenizer: 'o200k_base', freshSingleTaskValidated: true, arms: metadata,
  note: 'Actual public tool-text blocks, after any tool-layer truncation, including wrapper formatting/errors; not observer stdout before delivery. No private content exported. Model token telemetry is a separate measure.' };
writeFileSync(out, JSON.stringify(document, null, 2) + '\n');
console.log(JSON.stringify(document, null, 2));
