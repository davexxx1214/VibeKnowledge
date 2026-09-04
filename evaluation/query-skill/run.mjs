import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { buildQuerySkill } = createRequire(import.meta.url)('../../scripts/build-query-skill.cjs');
const source = resolve(process.argv[2] ?? 'D:/workspace/nestjs-realworld-example-app');
const budget = 1200;
const outputDirectory = join(root, 'evaluation/query-skill');

function execute(command, args, cwd, timeout = 60000) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${command} ${args[0]} failed: ${result.error ?? result.stderr ?? result.stdout}`);
  return result.stdout.trimEnd();
}

export function toCli(task) {
  const commands = { query_graph: 'query', get_entity: 'entity', get_neighbors: 'neighbors', shortest_path: 'path', analyze_impact: 'impact', analyze_structure: 'structure', find_structural_path: 'structural-path' };
  const flags = { groupKey: 'group', filePath: 'file', tokenBudget: 'budget', relationVerbs: 'verbs', maxDepth: 'depth', includeEvidence: 'evidence' };
  const args = [commands[task.mcp.tool]];
  if (!args[0]) throw new Error(`No CLI mapping: ${task.mcp.tool}`);
  for (const [key, value] of Object.entries(task.mcp.arguments)) {
    if (value === false || value === undefined) continue;
    args.push(`--${flags[key] ?? key}`);
    if (value !== true) args.push(Array.isArray(value) ? value.join(',') : String(value));
  }
  return args;
}

async function main() {
  const require = createRequire(join(root, 'packages/mcp-server/package.json'));
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
  mkdirSync(join(root, '.vscode-test'), { recursive: true });
  const workspace = mkdtempSync(join(root, '.vscode-test/query-skill-evaluation-'));
  for (const entry of ['src', 'test', 'package.json', 'tsconfig.json', 'tsconfig.build.json', 'index.js', 'ormconfig.json', 'nest-cli.json']) {
    if (existsSync(join(source, entry))) cpSync(join(source, entry), join(workspace, entry), { recursive: true });
  }
  const skill = join(workspace, '.agents/skills/vibeknowledge-query');
  await buildQuerySkill(root, skill);
  const generator = join(root, 'resources/skills/vibeknowledge-dependency-graph/scripts');
  console.log('Generating shared benchmark graph in', workspace);
  execute(process.execPath, [join(generator, 'extract-structural-graph.mjs'), '--workspace', workspace, '--scope', '.'], root);
  for (const group of [
    ['--kind', 'framework', '--name', '框架层'],
    ['--kind', 'feature', '--scope', 'src/user', '--key', 'user-management', '--name', '用户管理'],
    ['--kind', 'feature', '--scope', 'src/article', '--key', 'article-management', '--name', '文章管理'],
    ['--kind', 'feature', '--scope', 'src/tag', '--key', 'tag-management', '--name', '标签管理']
  ]) execute(process.execPath, [join(generator, 'curate-structural-graph.mjs'), '--workspace', workspace, ...group], root);
  const knowledge = join(workspace, '.vscode/.knowledge');
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(join(knowledge, 'graph.sqlite'));
  db.exec('CREATE TABLE agent_entity_overrides(agent_key TEXT PRIMARY KEY, description TEXT, updated_at INTEGER)');
  db.close();
  const tasks = JSON.parse(readFileSync(join(root, 'evaluation/phase7/tasks.json'), 'utf8'));
  tasks.push(
    { id: 'entity-user-service', query: 'Locate UserService.', mcp: { tool: 'get_entity', arguments: { selector: 'src/user/user.service.ts#UserService', groupKey: 'user-management' } } },
    { id: 'neighbors-tag', query: 'Which dependencies does TagService use?', mcp: { tool: 'get_neighbors', arguments: { selector: 'src/tag/tag.service.ts#TagService', groupKey: 'tag-management', direction: 'outgoing', depth: 1 } } },
    { id: 'path-tag-controller', query: 'Trace the tag controller to tag service.', mcp: { tool: 'shortest_path', arguments: { source: 'src/tag/tag.controller.ts#TagController', target: 'src/tag/tag.service.ts#TagService', groupKey: 'tag-management', direction: 'outgoing' } } },
    { id: 'raw-path-tag', query: 'Verify the raw tag controller dependency on tag service.', mcp: { tool: 'find_structural_path', arguments: { source: 'src/tag/tag.controller.ts#TagController', target: 'src/tag/tag.service.ts#TagService', direction: 'outgoing' } } }
  );
  const client = new Client({ name: 'query-skill-evaluation', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(root, 'packages/mcp-server/dist/index.js'), '--workspace', workspace, '--rag-mode', 'none', '--log-level', 'error'], stderr: 'pipe'
  });
  let stderr = ''; transport.stderr?.on('data', chunk => { stderr += String(chunk); });
  const rows = [];
  const texts = {};
  const remember = (key, value) => { texts[key] = value; };
  const start = performance.now();
  await client.connect(transport);
  const mcpStartupMs = performance.now() - start;
  try {
    const tools = (await client.listTools()).tools;
    remember('mcp_all_definitions', JSON.stringify(tools));
    remember('mcp_dependency_definitions', JSON.stringify(tools.filter(t => t.name !== 'search_observations')));
    remember('skill_entry', readFileSync(join(skill, 'SKILL.md'), 'utf8'));
    remember('skill_advanced', readFileSync(join(skill, 'references/queries.md'), 'utf8'));
    remember('whole_curated_graph', readFileSync(join(knowledge, 'agent-graph.json'), 'utf8'));
    remember('whole_structural_graph', readFileSync(join(knowledge, 'structural-graph.json'), 'utf8'));
    const script = join(skill, 'scripts/query.cjs');
    const overview = execute(process.execPath, [script, 'overview', '--workspace', workspace], root);
    remember('skill_overview', overview);
    for (const task of tasks) {
      task.mcp.arguments.tokenBudget = budget;
      const call = { name: task.mcp.tool, arguments: task.mcp.arguments };
      const before = performance.now();
      const result = await client.callTool(call);
      const mcpMs = performance.now() - before;
      if (result.isError) throw new Error(`MCP ${task.id} failed: ${JSON.stringify(result)} ${stderr}`);
      const mcpText = result.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
      const args = toCli(task);
      const cliBefore = performance.now();
      const cliText = execute(process.execPath, [script, ...args, '--workspace', workspace], root);
      const cliMs = performance.now() - cliBefore;
      if (mcpText !== cliText) throw new Error(`Parity failed: ${task.id}`);
      if (!mcpText.trim()) throw new Error(`Empty answer: ${task.id}`);
      remember(`${task.id}:result`, mcpText);
      remember(`${task.id}:question`, task.query);
      remember(`${task.id}:mcp_call`, JSON.stringify(call));
      // Example shell-tool arguments, not the client-specific tool envelope.
      // Use a portable installed path, not the random test directory.
      remember(`${task.id}:cli_call`, JSON.stringify({ command: `node .agents/skills/vibeknowledge-query/scripts/query.cjs ${args.map(a => /[\s"&|<>]/.test(a) ? JSON.stringify(a) : a).join(' ')}`, cwd: source }));
      remember(`${task.id}:mcp_selected_definition`, JSON.stringify(tools.find(t => t.name === task.mcp.tool)));
      const paths = [...new Set([...mcpText.matchAll(/\bsrc\/[\w./-]+\.ts\b/g)].map(m => m[0]))];
      const expected = task.expectedFiles ?? [];
      rows.push({ id: task.id, tool: task.mcp.tool, equal: true, mcpMs: Math.round(mcpMs), cliMs: Math.round(cliMs), files: paths, expectedFiles: expected, missedExpectedFiles: expected.filter(p => !paths.includes(p)), truncated: /已截断|truncated/.test(mcpText), cliArguments: args });
    }
  } finally { await client.close(); }
  const tokenizer = spawnSync('python', ['-X', 'utf8', '-c', "import sys,json,tiktoken; data=json.load(sys.stdin); e=tiktoken.get_encoding('o200k_base'); print(json.dumps({'version':tiktoken.__version__,'counts':{k:len(e.encode(v)) for k,v in data.items()}}))"], { input: JSON.stringify(texts), encoding: 'utf8', timeout: 60000, windowsHide: true, maxBuffer: 1024 * 1024 });
  if (tokenizer.status !== 0) throw new Error(`Install/locate a Python environment with tiktoken for this developer-only benchmark: ${tokenizer.stderr}`);
  const measured = JSON.parse(tokenizer.stdout);
  const counts = measured.counts;
  const n = rows.length;
  for (const row of rows) {
    row.resultTokens = counts[`${row.id}:result`];
    row.mcpCallTokens = counts[`${row.id}:mcp_call`];
    row.cliCallTokens = counts[`${row.id}:cli_call`];
    row.singleToolSchemaTokens = counts[`${row.id}:mcp_selected_definition`];
  }
  const sum = key => rows.reduce((total, row) => total + row[key], 0);
  const commonTokens = rows.reduce((total, row) => total + counts[`${row.id}:question`] + row.resultTokens, 0);
  const skillOnce = counts.skill_entry + counts.skill_advanced;
  const totals = {
    skillLoadedOnce: commonTokens + skillOnce + sum('cliCallTokens'),
    mcpAllDefinitionsOnce: commonTokens + counts.mcp_all_definitions + sum('mcpCallTokens'),
    mcpDependencyDefinitionsOnce: commonTokens + counts.mcp_dependency_definitions + sum('mcpCallTokens'),
    mcpUsedDefinitionsOnce: commonTokens + sum('mcpCallTokens') + [...new Set(rows.map(r => r.tool))].reduce((v, tool) => v + rows.find(r => r.tool === tool).singleToolSchemaTokens, 0),
    warmSkill: commonTokens + sum('cliCallTokens'),
    warmMcp: commonTokens + sum('mcpCallTokens')
  };
  const report = {
    generatedAt: new Date().toISOString(), source, workspace, node: process.version, budget,
    tokenizer: { encoding: 'o200k_base', tiktokenVersion: measured.version, billingTelemetry: false },
    graphHashes: Object.fromEntries(['agent-graph.json', 'structural-graph.json'].map(file => [file, createHash('sha256').update(readFileSync(join(knowledge, file))).digest('hex')])),
    graphCounts: { curated: JSON.parse(texts.whole_curated_graph).groups.map(g => ({ key: g.key, entities: g.entities.length, relations: g.relations.length })), structuralEntities: JSON.parse(texts.whole_structural_graph).entities.length },
    setup: { mcpStartupMs: Math.round(mcpStartupMs), notes: 'Fresh CLI process per call; one warm MCP session. Construction/generation/install costs excluded from query token totals.' },
    rows, tokenCounts: counts, totals,
    limitations: [
      'Tokenizer counts of explicit text, not provider billing or an end-to-end LLM coding evaluation.',
      'Result payloads must be byte-identical; reduced payload is not attributed to the transport.',
      'MCP discovery is client-dependent. Compare all/used definitions and warm/no-discovery cases separately.',
      'CLI counts example shell arguments; hidden shell tool schema/wrappers, MCP wrappers, caching, reasoning and source reads are not measured.',
      'Skill entry and advanced reference each counted once per nine-query session. Optional overview adds its call/result tokens.',
      'Curated graphs exclude tests. Missed expected test files require targeted source search, in both modes.',
      'The budget uses the existing approximate estimator; actual tokenizer counts can exceed that number.',
      'Input project is copied and graphs regenerated in an isolated workspace. Original project remains untouched.'
    ]
  };
  writeFileSync(join(outputDirectory, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(join(workspace, 'query-transcripts.json'), JSON.stringify(texts, null, 2));
  const reduction = (base, value) => `${((base - value) / base * 100).toFixed(1)}%`;
  const table = rows.map(r => `| ${r.id} | ${r.resultTokens} | ${r.mcpCallTokens} | ${r.cliCallTokens} | ${r.mcpMs} | ${r.cliMs} | ${r.truncated ? 'yes' : 'no'} |`).join('\n');
  const markdown = `# Skill vs MCP dependency query evaluation\n\nGenerated: ${report.generatedAt}\n\nSample: ${source}; Node ${report.node}; ${n} queries; approximate budget ${budget}.\n\n` +
    `Both modes use the same generated graph and query algorithms. **${n}/${n} result payloads are byte-identical: retrieval-payload token saving is 0%.**\n\n` +
    `## Controlled text-token accounting\n\nCounts use tiktoken ${measured.version}, o200k_base, not billing telemetry. Questions + results + call argument text are included.\n\n` +
    `| Nine-query session | Tokens |\n| --- | ---: |\n| Skill entry + advanced reference once | ${totals.skillLoadedOnce} |\n| MCP all 10 tool definitions once | ${totals.mcpAllDefinitionsOnce} |\n| MCP dependency-only definitions once | ${totals.mcpDependencyDefinitionsOnce} |\n| MCP used definitions once (selective discovery example) | ${totals.mcpUsedDefinitionsOnce} |\n| Warm Skill, no instruction reload | ${totals.warmSkill} |\n| Warm MCP, no schema reload | ${totals.warmMcp} |\n\n` +
    `Skill change versus all-definition MCP: ${reduction(totals.mcpAllDefinitionsOnce, totals.skillLoadedOnce)} fewer tokens; versus dependency-only MCP: ${reduction(totals.mcpDependencyDefinitionsOnce, totals.skillLoadedOnce)} fewer. Negative values mean Skill costs more.\n\n` +
    `Skill instructions: ${counts.skill_entry}; advanced reference: ${counts.skill_advanced}; MCP all schemas: ${counts.mcp_all_definitions}. Optional overview payload: ${counts.skill_overview}, not charged above because group keys are supplied in these paired queries.\n\n` +
    `## Per-query payload and invocation\n\n| Task | Shared result tokens | MCP call tokens | CLI call tokens | MCP ms (warm) | CLI ms (cold) | Truncated |\n| --- | ---: | ---: | ---: | ---: | ---: | --- |\n${table}\n\n` +
    `## Limitations\n\n${report.limitations.map(note => `- ${note}`).join('\n')}\n\n` +
    `## Reproduce\n\nRun from repository root after installing developer dependencies:\n\n\`\`\`sh\nnpm --prefix packages/mcp-server run build\nnode evaluation/query-skill/run.mjs <sample-workspace>\n\`\`\`\n\nPython with tiktoken is required only for this evaluation, not the Skill. Raw transcripts are retained in the reported isolated workspace.\n`;
  writeFileSync(join(outputDirectory, 'results.md'), markdown);
  console.log(JSON.stringify({ workspace, equal: `${n}/${n}`, totals, savedVsAllSchemas: reduction(totals.mcpAllDefinitionsOnce, totals.skillLoadedOnce) }, null, 2));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
