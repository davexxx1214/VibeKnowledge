const { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, readdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { assertFreshComplete } = require('./session-accounting.cjs');
const [runArg, sessionArg, outArg, agentPath] = process.argv.slice(2);
if (![runArg, sessionArg, outArg, agentPath].every(Boolean)) throw new Error('Usage: GENERATION_RUN SESSION NEW_OUTPUT AGENT_PATH');
const run = resolve(runArg), out = resolve(outArg), workspace = join(run, 'workspace');
if (existsSync(join(out, 'metrics.json'))) throw new Error('Already recorded');
const events = readFileSync(sessionArg, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const meta = events.find(r => r.type === 'session_meta')?.payload;
if (meta?.source?.subagent?.thread_spawn?.agent_path !== agentPath) throw new Error('Wrong author');
const context = events.find(r => r.type === 'turn_context')?.payload;
const completion = assertFreshComplete(events);
const rows = [...new Map(events.filter(r => r.type === 'token_usage_record').map(r => [r.payload.response_id, r.payload])).values()];
const totals = rows.at(-1)?.thread_token_usage;
if (!totals) throw new Error('No usage');
for (const key of Object.keys(totals)) if (rows.reduce((n, r) => n + (r.usage[key] ?? 0), 0) !== totals[key]) throw new Error('Usage mismatch');
const manifest = JSON.parse(readFileSync(join(run, 'source-manifest.json'), 'utf8'));
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const changed = Object.entries(manifest.sourceHashes).filter(([p, expected]) => !existsSync(join(workspace, p)) || sha(join(workspace, p)) !== expected).map(([p]) => p);
if (changed.length) throw new Error(`Source changed: ${changed.join(', ')}`);
const observations = readFileSync(join(workspace, 'ab-observations.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const tokenized = spawnSync('python', ['-X', 'utf8', '-c', "import json,sys,tiktoken; e=tiktoken.get_encoding('o200k_base'); print(sum(len(e.encode(x, disallowed_special=())) for x in json.load(sys.stdin)))"], { input: JSON.stringify(observations.map(r => r.displayed)), encoding: 'utf8', timeout: 30000, windowsHide: true });
if (tokenized.status !== 0) throw new Error(tokenized.stderr);
mkdirSync(out, { recursive: true });
cpSync(join(workspace, '.vscode/.knowledge/feature-briefs'), join(out, 'feature-briefs'), { recursive: true });
const artifactHashes = Object.fromEntries(readdirSync(join(out, 'feature-briefs')).map(p => [p, sha(join(out, 'feature-briefs', p))]));
cpSync(join(workspace, 'GENERATION.md'), join(out, 'GENERATION.md'));
cpSync(join(workspace, 'ab-observations.jsonl'), join(out, 'observations.jsonl'));
cpSync(join(run, 'generation-manifest.json'), join(out, 'manifest.json'));
cpSync(join(workspace, '.brief-authoring/INSTRUCTIONS.md'), join(out, 'authoring-instructions.md'));
const result = { sessionId: meta.id, agentPath, model: context.model, effort: context.effort, elapsedMs: completion.duration_ms,
  responses: rows.length, observedTextTokens: Number(tokenized.stdout), usage: { ...totals,
    uncachedInput: totals.input_tokens - totals.cached_input_tokens,
    uncachedInputPlusOutput: totals.input_tokens - totals.cached_input_tokens + totals.output_tokens },
  artifactHashes, sourceHashMismatches: changed,
  limitations: ['Generation cost, not warm query cost.', 'Only numeric session telemetry exported; no private reasoning or system instructions.', 'Selected feature areas known to author; future task prompts/rubrics/results not provided.'] };
writeFileSync(join(out, 'metrics.json'), JSON.stringify(result, null, 2) + '\n');
writeFileSync(join(out, 'telemetry.json'), JSON.stringify({ responses: rows.map(r => ({ responseId: r.response_id, usage: r.usage })), totals }, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
