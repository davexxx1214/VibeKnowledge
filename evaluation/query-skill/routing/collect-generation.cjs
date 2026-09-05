const { readFileSync, writeFileSync, existsSync, cpSync, mkdirSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { assertFreshComplete } = require('../context/session-accounting.cjs');
const [runArg, sessionArg, expected] = process.argv.slice(2);
if (![runArg, sessionArg, expected].every(Boolean)) throw new Error('Usage: RUN AUTHOR_SESSION AUTHOR_AGENT_PATH');
const run = resolve(runArg), out = resolve('evaluation/query-skill/routing/generation');
if (existsSync(join(out, 'metrics.json'))) throw new Error('Generation already recorded');
const parse = file => readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse);
const events = parse(sessionArg), observations = parse(join(run, 'author/ab-observations.jsonl'));
const meta = events.find(e => e.type === 'session_meta').payload;
if (meta.source?.subagent?.thread_spawn?.agent_path !== expected) throw new Error('Wrong author session');
const completion = assertFreshComplete(events);
const contexts = events.filter(e => e.type === 'turn_context').map(e => e.payload);
if (new Set(contexts.map(c => c.model + ':' + c.effort)).size !== 1) throw new Error('Model changed');
const rows = [...new Map(events.filter(e => e.type === 'token_usage_record').map(e => [e.payload.response_id, e.payload])).values()];
const totals = rows.at(-1).thread_token_usage;
for (const key of Object.keys(totals)) if (rows.reduce((n, r) => n + (r.usage[key] ?? 0), 0) !== totals[key]) throw new Error('Usage mismatch');
const manifest = JSON.parse(readFileSync(join(run, 'manifest.json'), 'utf8'));
for (const [file, hash] of Object.entries(manifest.sourceHashes)) if (createHash('sha256').update(readFileSync(join(run, 'author', file))).digest('hex') !== hash) throw new Error('Source changed');
const publicText = events.filter(e => e.type === 'response_item' && ['function_call_output', 'custom_tool_call_output'].includes(e.payload.type)).flatMap(e => {
  const output = e.payload.output;
  return typeof output === 'string' ? [output] : Array.isArray(output) ? output.map(b => b.text).filter(t => typeof t === 'string') : [];
});
const text = { observer: observations.map(o => o.displayed), publicTool: publicText };
const tokenized = spawnSync('python', ['-X', 'utf8', '-c', "import sys,json,tiktoken; d=json.load(sys.stdin); e=tiktoken.get_encoding('o200k_base'); print(json.dumps({k:sum(len(e.encode(x,disallowed_special=())) for x in v) for k,v in d.items()}))"], { input: JSON.stringify(text), encoding: 'utf8', windowsHide: true, timeout: 30000 });
if (tokenized.status !== 0) throw new Error(tokenized.stderr);
mkdirSync(out, { recursive: true });
cpSync(join(run, 'author/REPORT.md'), join(out, 'author-report.md'));
cpSync(join(run, 'author/ab-observations.jsonl'), join(out, 'observations.jsonl'));
writeFileSync(join(out, 'telemetry.json'), JSON.stringify({ sessionId: meta.id, responses: rows.map(r => ({ responseId: r.response_id, usage: r.usage })), totals }, null, 2) + '\n');
const result = { createdAt: new Date().toISOString(), sessionId: meta.id, agentPath: expected, model: contexts[0].model, effort: contexts[0].effort,
  elapsedMs: completion.duration_ms, responses: rows.length, sourceFiles: Object.keys(manifest.sourceHashes).length,
  tokenized: JSON.parse(tokenized.stdout), usage: { ...totals, uncachedInput: totals.input_tokens - totals.cached_input_tokens,
    uncachedInputPlusOutput: totals.input_tokens - totals.cached_input_tokens + totals.output_tokens },
  notes: ['Five reusable frontend briefs authored without task wording/rubric. Preparation cost is separate from warm task-query cost.', 'Excludes coordinator, task designer, graders, source fetch and future regeneration costs. Numeric token counts are not a bill.', 'Only public observations, final report and numeric telemetry are exported; no private reasoning/system messages.'] };
writeFileSync(join(out, 'metrics.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result, null, 2));
