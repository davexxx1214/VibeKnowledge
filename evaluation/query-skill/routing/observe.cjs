// Read-only task evidence observer; stage task text, count exactly displayed text.
const { readFileSync, appendFileSync, existsSync, realpathSync } = require('node:fs');
const { resolve, relative, join, isAbsolute } = require('node:path');
const { spawnSync } = require('node:child_process');
const workspace = realpathSync(process.cwd());
const argv = process.argv.slice(2);
if (argv.shift() !== '--phase') throw new Error('Use --phase discovery|followup|control');
const phase = argv.shift(), [operation, ...args] = argv;
const phases = ['discovery', 'followup', 'control'];
if (!phases.includes(phase)) throw new Error('Invalid phase');
let output = '', exitCode = 0, metadata = {};
const started = Date.now();
function local(file) {
  const absolute = realpathSync(resolve(workspace, file)), rel = relative(workspace, absolute);
  if (rel === '..' || rel.startsWith('..\\') || rel.startsWith('../') || isAbsolute(rel)) throw new Error('Path must stay in trial');
  return absolute;
}
function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: workspace, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
  exitCode = result.status ?? 1; output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (result.error) output += result.error.message;
}
try {
  if (operation === 'task') {
    if (args.length) throw new Error('task takes no arguments');
    const report = existsSync(join(workspace, 'REPORT.md')) ? readFileSync(join(workspace, 'REPORT.md'), 'utf8') : '';
    const preceding = phases.slice(0, phases.indexOf(phase));
    if (preceding.some(p => !report.includes('## ' + p))) throw new Error('Write preceding REPORT sections before advancing');
    output = readFileSync(local(`.evaluation/${phase}.md`), 'utf8');
  } else if (operation === 'read') {
    const [file, first = '1', last] = args;
    const rel = file?.replaceAll('\\', '/');
    if (!rel?.startsWith('web/') && rel !== '.agents/skills/vibeknowledge-query/SKILL.md' && !rel?.startsWith('.agents/skills/vibeknowledge-query/references/')) throw new Error('Read source or Skill instructions only');
    const lines = readFileSync(local(file), 'utf8').split(/\r?\n/), start = Number(first), end = last ? Number(last) : lines.length;
    if (!Number.isInteger(start) || start < 1 || !Number.isInteger(end) || end < start) throw new Error('Invalid range');
    output = lines.slice(start - 1, end).map((s, i) => `${start + i}: ${s}`).join('\n');
    metadata = { file, start, end: Math.min(end, lines.length) };
  } else if (operation === 'rg') {
    // The agent supplies query/options, and source scope is always web/.
    if (args.some(a => a.includes('..') || isAbsolute(a) || /^[a-z]:/i.test(a) || a.includes('.agents') || a.includes('.evaluation') || a.includes('.knowledge'))) throw new Error('rg scope is web/ only');
    run('rg', [...args, 'web']);
  } else if (operation === 'query') {
    const script = '.agents/skills/vibeknowledge-query/scripts/query.cjs';
    if (!existsSync(join(workspace, script))) throw new Error('Skill not installed in this arm');
    if (args.includes('--workspace')) throw new Error('Workspace fixed');
    run(process.execPath, [local(script), ...args, '--workspace', workspace]);
  } else throw new Error('Operations: task; read PATH [START END]; rg OPTIONS PATTERN (web scope appended); query COMMAND OPTIONS');
} catch (e) { exitCode = 1; output = e.message; }
const truncated = output.length > 18000;
if (truncated) output = output.slice(0, 18000) + '\n[Observation output truncated at 18000 characters; narrow the next query.]';
const displayed = output.trimEnd() + `\n[exit ${exitCode}]\n`;
appendFileSync(join(workspace, 'ab-observations.jsonl'), JSON.stringify({ at: new Date().toISOString(), elapsedMs: Date.now() - started, phase, operation, args, metadata, exitCode, truncated, displayed }) + '\n');
process.stdout.write(displayed); process.exitCode = exitCode;
