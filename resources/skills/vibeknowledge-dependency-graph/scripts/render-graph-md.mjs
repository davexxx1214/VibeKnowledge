#!/usr/bin/env node

import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const inputPath = resolve(
  process.argv[2] || '.vscode/.knowledge/agent-graph.json'
);
const outputPath = resolve(
  process.argv[3] || '.vscode/.knowledge/knowledge-graph.md'
);
const agentContextDirectory = resolve(
  process.argv[4] || join(dirname(outputPath), 'agent-context')
);

let graph;
try {
  graph = JSON.parse(readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, ''));
} catch (error) {
  console.error(`Cannot read valid JSON from ${inputPath}: ${error.message}`);
  process.exit(1);
}

if (graph?.version !== 1 || !Array.isArray(graph.groups) || graph.groups.length === 0) {
  console.error('Cannot render Markdown: expected a version-1 grouped graph with non-empty groups');
  process.exit(1);
}

const groups = [...graph.groups].sort(
  (left, right) => left.order - right.order || left.name.localeCompare(right.name)
);
const entityCount = groups.reduce((sum, group) => sum + group.entities.length, 0);
const relationCount = groups.reduce((sum, group) => sum + group.relations.length, 0);
const uniqueEntityCount = new Set(
  groups.flatMap((group) => group.entities.map((entity) => entity.key))
).size;
const lines = [
  '# Knowledge Graph',
  '',
  '> Generated from `.vscode/.knowledge/agent-graph.json`. Human description overrides are stored separately by VibeKnowledge.',
  '',
  `- Generated at: ${cell(graph.generatedAt)}`,
  `- Scope: ${cell(graph.scope || '.')}`,
  `- Groups: ${groups.length}`,
  `- Entity occurrences: ${entityCount} (${uniqueEntityCount} unique keys)`,
  `- Relations: ${relationCount}`,
  '',
  '## Groups',
  '',
  '| Order | Group | Kind | Scope | Entities | Relations |',
  '| ---: | --- | --- | --- | ---: | ---: |'
];

for (const group of groups) {
  lines.push(
    `| ${group.order} | [${cell(group.name)}](#group-${group.key}) | ${cell(group.kind)} | ${cell(group.scope || graph.scope || '.')} | ${group.entities.length} | ${group.relations.length} |`
  );
}

for (const group of groups) {
  lines.push(
    '',
    `<a id="group-${group.key}"></a>`,
    `## ${group.order + 1}. ${cell(group.name)}`,
    '',
    `- Kind: ${cell(group.kind)}`,
    `- Scope: ${cell(group.scope || graph.scope || '.')}`,
    `- Entity occurrences: ${group.entities.length}`,
    `- Relations: ${group.relations.length}`
  );
  if (group.description) {
    lines.push('', cell(group.description));
  }

  lines.push(
    '',
    '### Entities',
    '',
    '| Entity | Key | Type | Location | Description |',
    '| --- | --- | --- | --- | --- |'
  );
  if (group.entities.length === 0) {
    lines.push('| _None_ | — | — | — | — |');
  } else {
    for (const entity of group.entities) {
      const location = `${entity.filePath}:${entity.startLine}-${entity.endLine}`;
      lines.push(
        `| ${cell(entity.name)} | ${cell(entity.key)} | ${cell(entity.type)} | ${cell(location)} | ${cell(entity.description || '—')} |`
      );
    }
  }

  lines.push(
    '',
    '### Relations',
    '',
    '| Source | Verb | Target | Origin | Confidence | Description | Evidence | Structural path |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |'
  );
  if (group.relations.length === 0) {
    lines.push('| _None_ | — | — | — | — | — | — | — |');
  } else {
    const entityNames = new Map(
      group.entities.map((entity) => [entity.key, entity.name])
    );
    for (const relation of group.relations) {
      const evidence = relation.evidence
        .map((item) => {
          const endLine = item.endLine ? `-${item.endLine}` : '';
          const detail = item.detail ? ` — ${item.detail}` : '';
          return `${item.filePath}:${item.startLine}${endLine}${detail}`;
        })
        .join('<br>');
      const structuralPath = (relation.structuralPath || [])
        .map((hop) => {
          const path =
            hop.traversal === 'reverse'
              ? `${hop.target} <--${hop.verb}-- ${hop.source}`
              : `${hop.source} --${hop.verb}--> ${hop.target}`;
          return `${path} @ ${hop.filePath}:${hop.startLine}-${hop.endLine}`;
        })
        .join('<br>');
      lines.push(
        `| ${cell(entityNames.get(relation.source) || relation.source)} | ${cell(relation.verb)} | ${cell(entityNames.get(relation.target) || relation.target)} | ${cell(relation.origin)} | ${cell(relation.confidence)} | ${cell(relation.description || '—')} | ${cell(evidence)} | ${cell(structuralPath || '—')} |`
      );
    }
  }
}

const content = `${lines.join('\n')}\n`;
writeAtomically(outputPath, content);
renderAgentContext();
console.log(
  `Rendered grouped Knowledge Graph Markdown: ${groups.length} groups, ${entityCount} entity occurrences, ${relationCount} relations -> ${outputPath}; compact Agent views -> ${agentContextDirectory}`
);

function renderAgentContext() {
  mkdirSync(agentContextDirectory, { recursive: true });
  const expectedFiles = new Set([
    'index.md',
    ...groups.map((group) => `${group.key}.md`)
  ]);

  for (const entry of readdirSync(agentContextDirectory, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      entry.name.endsWith('.md') &&
      !expectedFiles.has(entry.name)
    ) {
      unlinkSync(join(agentContextDirectory, entry.name));
    }
  }

  for (const group of groups) {
    const entityNames = new Map(
      group.entities.map((entity) => [entity.key, entity.name])
    );
    const groupLines = [
      `# ${cell(group.name)}`,
      '',
      '> Compact Agent navigation view. Open the referenced source files before changing or testing code.',
      '',
      `- Key: ${cell(group.key)}`,
      `- Kind: ${cell(group.kind)}`,
      `- Scope: ${cell(group.scope || graph.scope || '.')}`,
      '',
      '## Entities',
      '',
      '| Entity | Type | Path |',
      '| --- | --- | --- |'
    ];

    if (group.entities.length === 0) {
      groupLines.push('| _None_ | — | — |');
    } else {
      for (const entity of group.entities) {
        groupLines.push(
          `| ${cell(entity.name)} | ${cell(entity.type)} | ${cell(`${entity.filePath}:${entity.startLine}-${entity.endLine}`)} |`
        );
      }
    }

    groupLines.push(
      '',
      '## Relations',
      '',
      '| Source | Verb | Target | Origin | Confidence |',
      '| --- | --- | --- | --- | --- |'
    );

    if (group.relations.length === 0) {
      groupLines.push('| _None_ | — | — | — | — |');
    } else {
      for (const relation of group.relations) {
        groupLines.push(
          `| ${cell(entityNames.get(relation.source) || relation.source)} | ${cell(relation.verb)} | ${cell(entityNames.get(relation.target) || relation.target)} | ${cell(relation.origin)} | ${cell(relation.confidence)} |`
        );
      }
    }

    writeAtomically(
      join(agentContextDirectory, `${group.key}.md`),
      `${groupLines.join('\n')}\n`
    );
  }

  const indexLines = [
    '# Agent Knowledge Graph Index',
    '',
    '> This index is the file-based fallback for on-demand code navigation. The full `../knowledge-graph.md` is a human audit report and should not be loaded by default.',
    '',
    '- Skip the Knowledge Graph for a small task whose target files are already known.',
    '- When VibeKnowledge MCP is available, use `query_graph` first and expand with `get_entity`, `get_neighbors`, or `shortest_path`.',
    '- If MCP is unavailable or returns no useful result, open only the best-matching group below.',
    '- Request relation Evidence through MCP only when auditing; compact files intentionally omit Evidence prose.',
    '- Treat every compact view as a navigation hint and verify behavior in current source code.',
    '',
    '| Order | Group | Kind | Scope | View |',
    '| ---: | --- | --- | --- | --- |'
  ];

  for (const group of groups) {
    indexLines.push(
      `| ${group.order} | ${cell(group.name)} | ${cell(group.kind)} | ${cell(group.scope || graph.scope || '.')} | [${cell(group.key)}](./${group.key}.md) |`
    );
  }

  writeAtomically(
    join(agentContextDirectory, 'index.md'),
    `${indexLines.join('\n')}\n`
  );
}

function writeAtomically(filePath, contentToWrite) {
  mkdirSync(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  writeFileSync(temporaryPath, contentToWrite, 'utf8');
  renameSync(temporaryPath, filePath);
}

function cell(value) {
  return String(value)
    .replace(/\r?\n/g, '<br>')
    .replace(/\|/g, '\\|');
}
