import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..', '..');
const DEFAULT_BUDGETS = [400, 600, 1000, 1600];
const SOURCE_READ_LIMIT = 5;

export function estimateTokens(value) {
  const text = String(value ?? '');
  const cjk = (text.match(/[\u3400-\u9fff\uf900-\ufaff]/g) ?? []).length;
  const other = text.length - cjk;
  return Math.ceil(cjk + other / 4);
}

export function tokenize(value) {
  const expanded = String(value ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLocaleLowerCase('en-US');
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'from', 'into', 'which', 'what', 'when',
    'where', 'before', 'after', 'change', 'changes', 'update', 'relevant',
    'returned', 'returning', 'assess', 'around'
  ]);
  return [...new Set(
    (expanded.match(/[a-z0-9][a-z0-9_-]{1,}/g) ?? [])
      .flatMap((token) => [
        token,
        token.endsWith('s') && token.length > 3 ? token.slice(0, -1) : token,
        token.length >= 7 ? token.slice(0, 5) : token
      ])
      .filter((token) => !stopWords.has(token))
  )];
}

export function scoreEvidence(task, selectedFiles, context) {
  const selected = new Set(selectedFiles.map(normalizePath));
  const expectedFiles = task.expectedFiles.map(normalizePath);
  const truePositiveFiles = expectedFiles.filter((file) => selected.has(file)).length;
  const fileRecall = ratio(truePositiveFiles, expectedFiles.length);
  const filePrecision = ratio(truePositiveFiles, selected.size);
  const fileF1 = fileRecall + filePrecision === 0
    ? 0
    : (2 * fileRecall * filePrecision) / (fileRecall + filePrecision);
  const normalizedContext = normalizeText(context);
  const matchedTerms = task.expectedTerms.filter((term) =>
    normalizedContext.includes(normalizeText(term))
  );
  const termRecall = ratio(matchedTerms.length, task.expectedTerms.length);
  const correctness = round(0.5 * fileF1 + 0.5 * termRecall);
  const omissionRate = round(1 - (0.6 * fileRecall + 0.4 * termRecall));
  return {
    correctness,
    omissionRate,
    fileRecall: round(fileRecall),
    filePrecision: round(filePrecision),
    termRecall: round(termRecall),
    matchedTerms,
    missedFiles: expectedFiles.filter((file) => !selected.has(file))
  };
}

export function checkStructuralFreshness(graph, workspaceRoot, overrides = new Map()) {
  const changedFiles = [];
  const missingFiles = [];
  for (const file of graph.files) {
    const absolutePath = resolve(workspaceRoot, file.filePath);
    if (!existsSync(absolutePath) && !overrides.has(file.filePath)) {
      missingFiles.push(file.filePath);
      continue;
    }
    const content = overrides.has(file.filePath)
      ? overrides.get(file.filePath)
      : readFileSync(absolutePath, 'utf8');
    const contentHash = createHash('sha256').update(content).digest('hex');
    if (contentHash !== file.contentHash) changedFiles.push(file.filePath);
  }
  return {
    fresh: changedFiles.length === 0 && missingFiles.length === 0,
    changedFiles,
    missingFiles
  };
}

export function checkCuratedFreshness(graph, workspaceRoot) {
  const generatedAtMs = Date.parse(graph.generatedAt);
  const changedFiles = [];
  const missingFiles = [];
  const referencedFiles = stableUnique(
    (graph.groups ?? [])
      .flatMap((group) => group.entities ?? [])
      .map((entity) => normalizePath(entity.filePath ?? ''))
      .filter((filePath) => filePath && !filePath.startsWith('external/'))
  );
  for (const filePath of referencedFiles) {
    const absolutePath = resolve(workspaceRoot, filePath);
    if (!existsSync(absolutePath)) {
      missingFiles.push(filePath);
      continue;
    }
    if (!Number.isFinite(generatedAtMs) || statSync(absolutePath).mtimeMs > generatedAtMs + 1000) {
      changedFiles.push(filePath);
    }
  }
  return {
    fresh: Number.isFinite(generatedAtMs) && changedFiles.length === 0 && missingFiles.length === 0,
    referencedFileCount: referencedFiles.length,
    changedFiles,
    missingFiles
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (!options.workspace) {
    throw new Error('Usage: node run-evaluation.mjs --workspace <project> [--budgets 400,600,1000,1600]');
  }
  const workspaceRoot = resolve(options.workspace);
  const tasks = JSON.parse(readFileSync(join(scriptDirectory, 'tasks.json'), 'utf8'));
  const runtime = await createMcpRuntime(workspaceRoot);
  const sourceFiles = listSourceFiles(workspaceRoot);
  const structuralGraph = JSON.parse(readFileSync(
    join(workspaceRoot, '.vscode', '.knowledge', 'structural-graph.json'),
    'utf8'
  ));
  const agentGraph = JSON.parse(readFileSync(
    join(workspaceRoot, '.vscode', '.knowledge', 'agent-graph.json'),
    'utf8'
  ));
  const structuralFreshness = checkStructuralFreshness(structuralGraph, workspaceRoot);
  const curatedFreshness = checkCuratedFreshness(agentGraph, workspaceRoot);
  const completeMarkdownPath = join(
    workspaceRoot,
    '.vscode',
    '.knowledge',
    'knowledge-graph.md'
  );
  const completeMarkdownTokens = existsSync(completeMarkdownPath)
    ? estimateTokens(readFileSync(completeMarkdownPath, 'utf8'))
    : undefined;
  const budgets = options.budgets ?? DEFAULT_BUDGETS;
  const noGraph = [];
  const compact = [];
  const mcpByBudget = Object.fromEntries(budgets.map((budget) => [budget, []]));

  try {
    for (const task of tasks) {
      noGraph.push(await benchmark(
        () => retrieveWithoutGraph(task, workspaceRoot, sourceFiles),
        task,
        options.repeats
      ));
      compact.push(await benchmark(
        () => retrieveCompactGroup(task, workspaceRoot),
        task,
        options.repeats
      ));
      for (const budget of budgets) {
        mcpByBudget[budget].push(await benchmark(
          () => retrieveWithMcp(task, workspaceRoot, runtime.client, budget),
          task,
          options.repeats
        ));
      }
    }
  } finally {
    await runtime.close();
  }

  const budgetSweep = budgets.map((budget) => ({
    budget,
    ...summarizeMode(mcpByBudget[budget])
  }));
  const recommendedBudget = recommendBudget(budgetSweep);
  const staleScenario = evaluateStaleScenario(
    structuralGraph,
    workspaceRoot,
    sourceFiles,
    tasks[0]
  );
  const summary = {
    noGraph: summarizeMode(noGraph),
    compact: summarizeMode(compact),
    mcp: summarizeMode(mcpByBudget[recommendedBudget])
  };
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    workspace: normalizePath(workspaceRoot),
    methodology: {
      repeats: options.repeats,
      sourceReadLimit: SOURCE_READ_LIMIT,
      tokenMetric: 'conservative mixed CJK/ASCII estimate; not provider billing tokens',
      correctnessMetric: 'evidence coverage proxy: 50% expected-file F1 + 50% expected-term recall',
      modes: {
        noGraph: 'lexical source search plus at most five source reads',
        compact: 'routing index plus one compact group and at most five source reads',
        mcp: 'real in-memory MCP protocol call plus at most five source reads'
      }
    },
    graphState: {
      structuralGeneratedAt: structuralGraph.generatedAt,
      curatedGeneratedAt: agentGraph.generatedAt,
      structuralFreshness,
      curatedFreshness,
      structuralNewerThanCurated:
        Date.parse(agentGraph.generatedAt) < Date.parse(structuralGraph.generatedAt),
      completeMarkdownTokens
    },
    tasks,
    recommendedBudget,
    summary,
    comparison: {
      mcpVsNoGraph: compareSummaries(summary.noGraph, summary.mcp),
      mcpVsCompact: compareSummaries(summary.compact, summary.mcp),
      mcpRetrievalVsCompleteMarkdown: completeMarkdownTokens === undefined
        ? undefined
        : {
            tokenReduction: completeMarkdownTokens - summary.mcp.averageRetrievalTokens,
            tokenReductionRate: round(
              (completeMarkdownTokens - summary.mcp.averageRetrievalTokens) /
              completeMarkdownTokens
            )
          }
    },
    budgetSweep,
    results: {
      noGraph,
      compact,
      mcp: mcpByBudget[recommendedBudget]
    },
    staleScenario
  };
  const outputPath = resolve(options.output ?? join(scriptDirectory, 'results.json'));
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const markdownPath = outputPath.replace(/\.json$/i, '.md');
  writeFileSync(markdownPath, renderMarkdown(report), 'utf8');
  console.log(`Phase 7 evaluation complete: ${outputPath}`);
  console.log(JSON.stringify(report.summary));
  console.log(`Recommended MCP token budget: ${recommendedBudget}`);
}

function compareSummaries(reference, candidate) {
  return {
    correctnessDelta: round(candidate.averageCorrectness - reference.averageCorrectness),
    omissionDelta: round(candidate.averageOmissionRate - reference.averageOmissionRate),
    inputTokenReduction: reference.averageInputTokens - candidate.averageInputTokens,
    inputTokenReductionRate: round(
      (reference.averageInputTokens - candidate.averageInputTokens) /
      reference.averageInputTokens
    ),
    filesReadReduction: round(reference.averageFilesRead - candidate.averageFilesRead),
    toolCallReduction: round(reference.averageToolCalls - candidate.averageToolCalls)
  };
}

async function createMcpRuntime(workspaceRoot) {
  const [
    { Client },
    { McpServer },
    { InMemoryTransport },
    { AgentGraphStore },
    { StructuralGraphStore },
    { registerGraphQueryTools },
    { registerStructuralAnalysisTools }
  ] = await Promise.all([
    import(sdkRuntimeUrl('client/index.js')),
    import(sdkRuntimeUrl('server/mcp.js')),
    import(sdkRuntimeUrl('inMemory.js')),
    import(runtimeUrl('agentGraphStore.js')),
    import(runtimeUrl('structuralGraphStore.js')),
    import(runtimeUrl('tools/registerGraphQueryTools.js')),
    import(runtimeUrl('tools/registerStructuralAnalysisTools.js'))
  ]);
  const server = new McpServer({ name: 'phase7-evaluation', version: '1.0.0' });
  const logger = { debug() {}, info() {}, warn() {}, error() {} };
  const database = {
    getAgentEntityDescriptionOverrides: () => new Map(),
    listAllEntities: () => []
  };
  registerGraphQueryTools(
    server,
    database,
    new AgentGraphStore(workspaceRoot),
    logger
  );
  registerStructuralAnalysisTools(
    server,
    new StructuralGraphStore(workspaceRoot),
    logger
  );
  const client = new Client({ name: 'phase7-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return {
    client,
    close: () => Promise.allSettled([client.close(), server.close()])
  };
}

function runtimeUrl(relativePath) {
  return pathToFileURL(join(repositoryRoot, 'packages', 'mcp-server', 'dist', relativePath)).href;
}

function sdkRuntimeUrl(relativePath) {
  return pathToFileURL(join(
    repositoryRoot,
    'packages',
    'mcp-server',
    'node_modules',
    '@modelcontextprotocol',
    'sdk',
    'dist',
    'esm',
    relativePath
  )).href;
}

async function benchmark(retrieve, task, repeats) {
  const timings = [];
  let retrieval;
  for (let index = 0; index < repeats; index += 1) {
    const started = performance.now();
    retrieval = await retrieve();
    timings.push(performance.now() - started);
  }
  const sourceContext = retrieval.selectedFiles
    .map((filePath) => safeReadSource(retrieval.workspaceRoot, filePath))
    .join('\n');
  const fullContext = `${retrieval.output}\n${sourceContext}`;
  return {
    taskId: task.id,
    mode: retrieval.mode,
    tool: retrieval.tool,
    medianElapsedMs: round(median(timings), 3),
    retrievalTokens: estimateTokens(retrieval.output),
    sourceTokens: estimateTokens(sourceContext),
    totalInputTokens: estimateTokens(fullContext),
    filesRead: retrieval.selectedFiles.length,
    selectedFiles: retrieval.selectedFiles,
    toolCalls: retrieval.toolCalls,
    truncated: retrieval.output.includes('已截断') || retrieval.output.includes('truncated'),
    ...scoreEvidence(task, retrieval.selectedFiles, fullContext)
  };
}

function retrieveWithoutGraph(task, workspaceRoot, sourceFiles) {
  const tokens = tokenize(task.query);
  const ranked = sourceFiles
    .map((filePath) => {
      const content = safeReadSource(workspaceRoot, filePath);
      const normalizedPath = normalizeText(filePath);
      const normalizedContent = normalizeText(content);
      const score = tokens.reduce((total, token) =>
        total + (normalizedPath.includes(token) ? 8 : 0) +
        Math.min(countOccurrences(normalizedContent, token), 5), 0
      );
      return { filePath, score, preview: firstMatchingLine(content, tokens) };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.filePath.localeCompare(right.filePath))
    .slice(0, SOURCE_READ_LIMIT);
  return {
    mode: 'no-graph',
    tool: 'lexical-source-search',
    workspaceRoot,
    selectedFiles: ranked.map((entry) => entry.filePath),
    toolCalls: 1 + ranked.length,
    output: ranked.map((entry) => `${entry.filePath} | score ${entry.score} | ${entry.preview}`).join('\n')
  };
}

function retrieveCompactGroup(task, workspaceRoot) {
  const contextDirectory = join(workspaceRoot, '.vscode', '.knowledge', 'agent-context');
  const index = readFileSync(join(contextDirectory, 'index.md'), 'utf8');
  const group = readFileSync(join(contextDirectory, `${task.groupKey}.md`), 'utf8');
  const tokens = tokenize(task.query);
  const lines = group.split(/\r?\n/);
  const entities = lines
    .map(parseMarkdownEntityRow)
    .filter(Boolean)
    .map((entry) => ({
      ...entry,
      score: tokens.reduce((total, token) =>
        total + (normalizeText(entry.line).includes(token) ? 1 : 0), 0
      )
    }));
  const entityByName = new Map(entities.map((entry) => [entry.name, entry]));
  const relations = lines.map(parseMarkdownRelationRow).filter(Boolean);
  const seeds = entities
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, 3);
  const neighborNames = new Set();
  for (const seed of seeds) {
    for (const relation of relations) {
      if (relation.source === seed.name) neighborNames.add(relation.target);
      if (relation.target === seed.name) neighborNames.add(relation.source);
    }
  }
  const neighbors = [...neighborNames]
    .map((name) => entityByName.get(name))
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
  const fallback = [...entities]
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
  const selectedFiles = stableUnique([...seeds, ...neighbors, ...fallback].map((entry) => entry.filePath))
    .filter((filePath) => existsSync(resolve(workspaceRoot, filePath)))
    .slice(0, SOURCE_READ_LIMIT);
  return {
    mode: 'compact-markdown',
    tool: 'read-index-and-group',
    workspaceRoot,
    selectedFiles,
    toolCalls: 2 + selectedFiles.length,
    output: `${index}\n${group}`
  };
}

function parseMarkdownEntityRow(line) {
  const cells = markdownCells(line);
  if (cells.length !== 3 || !extractFirstSourcePath(cells[2])) return undefined;
  if (cells[0] === 'Entity' || cells[0].startsWith('---')) return undefined;
  return {
    name: cells[0],
    filePath: extractFirstSourcePath(cells[2]),
    line
  };
}

function parseMarkdownRelationRow(line) {
  const cells = markdownCells(line);
  const verbs = new Set([
    'calls', 'extends', 'implements', 'depends_on',
    'contains', 'references', 'imports', 'exports'
  ]);
  if (cells.length !== 3 || !verbs.has(cells[1])) return undefined;
  return { source: cells[0], verb: cells[1], target: cells[2] };
}

function markdownCells(line) {
  if (!line.trim().startsWith('|')) return [];
  return line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
}

async function retrieveWithMcp(task, workspaceRoot, client, tokenBudget) {
  const result = await client.callTool({
    name: task.mcp.tool,
    arguments: { ...task.mcp.arguments, tokenBudget }
  });
  const output = extractMcpText(result.content);
  const selectedFiles = stableUnique(extractSourcePaths(output))
    .filter((filePath) => existsSync(resolve(workspaceRoot, filePath)))
    .slice(0, SOURCE_READ_LIMIT);
  return {
    mode: `mcp-${tokenBudget}`,
    tool: task.mcp.tool,
    workspaceRoot,
    selectedFiles,
    toolCalls: 1 + selectedFiles.length,
    output
  };
}

function summarizeMode(results) {
  const sum = (key) => results.reduce((total, result) => total + result[key], 0);
  return {
    taskCount: results.length,
    averageCorrectness: round(sum('correctness') / results.length),
    averageOmissionRate: round(sum('omissionRate') / results.length),
    averageInputTokens: Math.round(sum('totalInputTokens') / results.length),
    averageRetrievalTokens: Math.round(sum('retrievalTokens') / results.length),
    averageFilesRead: round(sum('filesRead') / results.length),
    averageToolCalls: round(sum('toolCalls') / results.length),
    medianElapsedMs: round(median(results.map((result) => result.medianElapsedMs)), 3),
    truncatedTasks: results.filter((result) => result.truncated).length
  };
}

export function recommendBudget(sweep) {
  const bestCorrectness = Math.max(...sweep.map((entry) => entry.averageCorrectness));
  return sweep.find((entry) =>
    entry.averageCorrectness >= bestCorrectness - 0.03 &&
    entry.averageOmissionRate <= 0.1 &&
    entry.truncatedTasks / entry.taskCount <= 0.6
  )?.budget ?? sweep[sweep.length - 1].budget;
}

function evaluateStaleScenario(graph, workspaceRoot, sourceFiles, task) {
  const probePath = 'src/tag/tag.service.ts';
  const original = safeReadSource(workspaceRoot, probePath);
  const overrides = new Map([[
    probePath,
    `${original}\nexport const phase7StaleProbe = 'source-newer-than-graph';\n`
  ]]);
  const detection = checkStructuralFreshness(graph, workspaceRoot, overrides);
  const fallback = retrieveWithoutGraph(task, workspaceRoot, sourceFiles);
  const fallbackContext = `${fallback.output}\n${fallback.selectedFiles.map((filePath) =>
    safeReadSource(workspaceRoot, filePath)
  ).join('\n')}`;
  return {
    simulatedChangedFile: probePath,
    detected: !detection.fresh && detection.changedFiles.includes(probePath),
    fallbackMode: fallback.mode,
    fallbackTriggered: !detection.fresh,
    fallbackEvidence: scoreEvidence(task, fallback.selectedFiles, fallbackContext)
  };
}

function renderMarkdown(report) {
  const modeRows = Object.entries(report.summary).map(([mode, summary]) =>
    `| ${mode} | ${percent(summary.averageCorrectness)} | ${percent(summary.averageOmissionRate)} | ${summary.averageInputTokens} | ${summary.averageRetrievalTokens} | ${summary.averageFilesRead} | ${summary.averageToolCalls} | ${summary.medianElapsedMs} | ${summary.truncatedTasks} |`
  );
  const sweepRows = report.budgetSweep.map((entry) =>
    `| ${entry.budget} | ${percent(entry.averageCorrectness)} | ${percent(entry.averageOmissionRate)} | ${entry.averageInputTokens} | ${entry.averageRetrievalTokens} | ${entry.truncatedTasks} |`
  );
  const taskRows = report.tasks.flatMap((task) => [
    report.results.noGraph.find((result) => result.taskId === task.id),
    report.results.compact.find((result) => result.taskId === task.id),
    report.results.mcp.find((result) => result.taskId === task.id)
  ].map((result) =>
    `| ${task.id} | ${result.mode} | ${percent(result.correctness)} | ${percent(result.omissionRate)} | ${result.totalInputTokens} | ${result.filesRead} | ${result.toolCalls} | ${result.missedFiles.join('<br>') || '—'} |`
  ));
  const noGraphComparison = report.comparison.mcpVsNoGraph;
  const compactComparison = report.comparison.mcpVsCompact;
  const completeMarkdownComparison = report.comparison.mcpRetrievalVsCompleteMarkdown;
  return `# Phase 7 retrieval evaluation\n\n` +
    `- Generated: ${report.generatedAt}\n` +
    `- Sample: \`${report.workspace}\`\n` +
    `- Tasks: ${report.tasks.length}\n` +
    `- Recommended MCP budget: **${report.recommendedBudget} tokens**\n` +
    `- Structural graph fresh: **${report.graphState.structuralFreshness.fresh}**\n` +
    `- Curated graph source-fresh: **${report.graphState.curatedFreshness.fresh}**\n` +
    `- Structural graph generated after curated graph: **${report.graphState.structuralNewerThanCurated}** (informational, not a stale verdict)\n` +
    `- Complete audit Markdown: **${report.graphState.completeMarkdownTokens ?? 'unavailable'} estimated tokens**\n\n` +
    `> Token counts are conservative estimates, not provider billing telemetry. Correctness is an evidence-coverage proxy, not an LLM answer score.\n\n` +
    `## Key comparison\n\n` +
    `At the recommended budget, MCP used **${percent(noGraphComparison.inputTokenReductionRate)} fewer estimated input tokens** than source-only retrieval ` +
    `(${noGraphComparison.inputTokenReduction} tokens/task), while the correctness proxy changed by **${signedPoints(noGraphComparison.correctnessDelta)} percentage points**. ` +
    `Against compact Markdown, MCP used **${percent(compactComparison.inputTokenReductionRate)} fewer input tokens** and changed correctness by **${signedPoints(compactComparison.correctnessDelta)} percentage points**.\n\n` +
    (completeMarkdownComparison
      ? `The average MCP retrieval payload was **${percent(completeMarkdownComparison.tokenReductionRate)} smaller** than injecting the complete audit Markdown (${completeMarkdownComparison.tokenReduction} estimated tokens saved before source reads).\n\n`
      : '') +
    `## Mode summary\n\n` +
    `| Mode | Correctness proxy | Omission | Input tokens | Retrieval tokens | Files read | Tool calls | Median ms | Truncated tasks |\n` +
    `| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n` +
    `${modeRows.join('\n')}\n\n` +
    `## MCP budget sweep\n\n` +
    `| Budget | Correctness proxy | Omission | Input tokens | Retrieval tokens | Truncated tasks |\n` +
    `| ---: | ---: | ---: | ---: | ---: | ---: |\n` +
    `${sweepRows.join('\n')}\n\n` +
    `## Per-task results\n\n` +
    `| Task | Mode | Correctness proxy | Omission | Input tokens | Files | Calls | Missed files |\n` +
    `| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |\n` +
    `${taskRows.join('\n')}\n\n` +
    `## Stale graph scenario\n\n` +
    `A source-only mutation was simulated for \`${report.staleScenario.simulatedChangedFile}\`. ` +
    `Hash validation detected it: **${report.staleScenario.detected}**; source-search fallback triggered: **${report.staleScenario.fallbackTriggered}**.\n`;
}

function listSourceFiles(workspaceRoot) {
  const roots = ['src', 'test'];
  const files = [];
  for (const root of roots) {
    const absoluteRoot = join(workspaceRoot, root);
    if (!existsSync(absoluteRoot)) continue;
    walk(absoluteRoot, (filePath) => {
      if (['.ts', '.tsx', '.js', '.jsx'].includes(extname(filePath).toLowerCase())) {
        files.push(normalizePath(relative(workspaceRoot, filePath)));
      }
    });
  }
  for (const rootFile of ['index.js', 'package.json']) {
    if (existsSync(join(workspaceRoot, rootFile))) files.push(rootFile);
  }
  return files.sort();
}

function walk(directory, onFile) {
  for (const entry of readdirSync(directory)) {
    const filePath = join(directory, entry);
    if (statSync(filePath).isDirectory()) walk(filePath, onFile);
    else onFile(filePath);
  }
}

function extractMcpText(content) {
  return Array.isArray(content)
    ? content
        .filter((item) => item?.type === 'text' && typeof item.text === 'string')
        .map((item) => item.text)
        .join('\n')
    : '';
}

function extractSourcePaths(value) {
  return [...String(value).matchAll(/\b(?:src|test)\/[A-Za-z0-9_.\/-]+\.(?:ts|tsx|js|jsx)\b/g)]
    .map((match) => normalizePath(match[0]));
}

function extractFirstSourcePath(value) {
  return extractSourcePaths(value)[0];
}

function firstMatchingLine(content, tokens) {
  return content.split(/\r?\n/).find((line) =>
    tokens.some((token) => normalizeText(line).includes(token))
  )?.trim().slice(0, 180) ?? '';
}

function safeReadSource(workspaceRoot, filePath) {
  const absolutePath = resolve(workspaceRoot, filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
}

function parseArguments(argv) {
  const result = { repeats: 5 };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--workspace') result.workspace = argv[++index];
    else if (argv[index] === '--output') result.output = argv[++index];
    else if (argv[index] === '--repeats') result.repeats = Number(argv[++index]);
    else if (argv[index] === '--budgets') {
      result.budgets = argv[++index].split(',').map(Number).filter(Number.isFinite);
    }
  }
  return result;
}

function countOccurrences(value, token) {
  if (!token) return 0;
  return value.split(token).length - 1;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function ratio(numerator, denominator) {
  return denominator === 0 ? 1 : numerator / denominator;
}

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percent(value) {
  return `${Math.round(value * 1000) / 10}%`;
}

function signedPoints(value) {
  return `${value >= 0 ? '+' : ''}${Math.round(value * 1000) / 10}`;
}

function stableUnique(values) {
  return [...new Set(values)];
}

function normalizePath(value) {
  return String(value).replace(/\\/g, '/');
}

function normalizeText(value) {
  return String(value ?? '').toLocaleLowerCase('en-US').replace(/\\/g, '/');
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
