// Inspect public tool-call code only; never export private reasoning or prompts.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const [runArg, sessionA, sessionB, outArg] = process.argv.slice(2);
if (![runArg, sessionA, sessionB, outArg].every(Boolean)) throw new Error('Usage: RUN SESSION_A SESSION_B NEW_AUDIT');
const run = path.resolve(runArg), out = path.resolve(outArg);
if (fs.existsSync(out)) throw new Error('Audit already recorded');
const parse = file => fs.readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse);
const arms = {};
for (const [arm, session] of [['A', sessionA], ['B', sessionB]]) {
  const workspace = path.join(run, arm), calls = [], review = [];
  const publicCalls = parse(session).filter(e => e.type === 'response_item' && ['function_call', 'custom_tool_call'].includes(e.payload.type)).map(e => e.payload);
  for (const p of publicCalls) {
    if (!['exec', 'functions.exec'].includes(p.name)) { review.push('Unparsed public tool: ' + p.name); continue; }
    const script = p.arguments ?? p.input ?? '';
    const tree = ts.createSourceFile('public.js', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const bindings = new Map();
    const value = node => ts.isStringLiteralLike(node) ? node.text : ts.isIdentifier(node) ? bindings.get(node.text) : undefined;
    let toolCount = 0;
    const visit = node => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) bindings.set(node.name.text, value(node.initializer));
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText(tree) === 'tools') {
        toolCount++;
        const method = node.expression.name.text;
        if (method === 'exec_command' && node.arguments[0] && ts.isObjectLiteralExpression(node.arguments[0])) {
          const props = Object.fromEntries(node.arguments[0].properties.filter(ts.isPropertyAssignment).map(p => [p.name.getText(tree).replaceAll('"', '').replaceAll("'", ''), value(p.initializer)]));
          const record = { method, command: props.cmd ?? null, workspace: props.workdir ?? null }; calls.push(record);
          if (!props.cmd?.startsWith('node observe.cjs --phase ') || /[;\r\n]/.test(props.cmd) || !props.workdir || path.resolve(props.workdir).toLowerCase() !== workspace.toLowerCase()) review.push('Command needs manual scope review: ' + (props.cmd ?? '<nonliteral>'));
        } else if (method === 'apply_patch') {
          const patch = value(node.arguments[0]);
          const targets = patch?.match(/^\*\*\* (?:Add|Update|Delete|Move to) File: .+$/gm) ?? [];
          const valid = patch && targets.length > 0 && !/^\*\*\* (Delete File|Move to):/m.test(patch) && targets.every(t => path.resolve(t.replace(/^\*\*\* (?:Add|Update) File: /, '')).toLowerCase() === path.join(workspace, 'REPORT.md').toLowerCase());
          calls.push({ method, targets }); if (!valid) review.push('Patch requires manual target review');
        } else {
          calls.push({ method }); review.push('Unparsed tool call: ' + method);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
    if (!toolCount) review.push('Public script without parsed tool calls');
  }
  const count = parse(path.join(workspace, 'ab-observations.jsonl')).length;
  if (calls.filter(c => c.method === 'exec_command').length !== count) review.push('Command/observation count mismatch');
  arms[arm] = { calls, observations: count, requiresManualReview: review };
}
const result = { version: 1, createdAt: new Date().toISOString(), arms, passed: Object.values(arms).every(a => !a.requiresManualReview.length),
  limits: ['Checks literal tool targets and observer command prefixes, not a security sandbox or shell parser. Public commands additionally require human/agent review.', 'No private reasoning/system prompts exported.'] };
fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passed: result.passed, arms: Object.fromEntries(Object.entries(arms).map(([a, v]) => [a, { calls: v.calls.length, requiresManualReview: v.requiresManualReview }])) }, null, 2));
