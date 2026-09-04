import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Logger } from '../server.js';
import type { StructuralGraphStore } from '../structuralGraphStore.js';
import { estimateTokenCount } from '../graphQuery.js';
import {
  analyzeStructuralImpact,
  diffStructuralGraphs,
  findStructuralCycles,
  findStructuralPath,
  reportCrossBoundaryConnections,
  reportStructuralCoupling,
  suggestStructuralCommunities
} from '../structural-analysis.mjs';

const tokenBudgetSchema = z.number().int().min(200).max(12000).optional();
const dependencyVerbs = z
  .array(z.enum(['imports', 'extends', 'implements', 'calls', 'references']))
  .max(5)
  .optional();

export function registerStructuralAnalysisTools(
  server: McpServer,
  store: StructuralGraphStore,
  logger: Logger
): void {
  server.registerTool(
    'analyze_structure',
    {
      title: 'Analyze Structural Graph',
      description:
        '诊断完整代码事实图中的循环依赖、高耦合节点、跨边界连接、结构变更或候选社区；结果带源码位置，社区仅作为分组建议。',
      inputSchema: z.object({
        analysis: z.enum([
          'cycles',
          'coupling',
          'cross_boundary',
          'diff',
          'communities'
        ]),
        limit: z.number().int().min(1).max(100).optional(),
        relationVerbs: dependencyVerbs,
        tokenBudget: tokenBudgetSchema
      })
    },
    async ({ analysis, limit = 20, relationVerbs, tokenBudget = 2000 }) => {
      try {
        const graph = store.read();
        const options = { limit, relationVerbs };
        let lines: string[];
        switch (analysis) {
          case 'cycles':
            lines = formatCycles(findStructuralCycles(graph, options), graph.generatedAt);
            break;
          case 'coupling':
            lines = formatCoupling(reportStructuralCoupling(graph, options), graph.generatedAt);
            break;
          case 'cross_boundary':
            lines = formatCrossBoundary(
              reportCrossBoundaryConnections(graph, options).slice(0, limit),
              graph.generatedAt
            );
            break;
          case 'communities':
            lines = formatCommunities(
              suggestStructuralCommunities(graph, options).slice(0, limit),
              graph.generatedAt
            );
            break;
          case 'diff':
            lines = formatDiff(diffStructuralGraphs(graph, store.readPrevious()));
            break;
        }
        return textResult(withinBudget(lines, tokenBudget));
      } catch (error) {
        return analysisError(logger, 'analyze_structure', error);
      }
    }
  );

  server.registerTool(
    'analyze_impact',
    {
      title: 'Analyze Structural Impact',
      description:
        '从代码实体向上查找直接或间接依赖它的调用方，向下查找它依赖的实现，并返回原始关系位置。',
      inputSchema: z.object({
        selector: z.string().min(1).max(500),
        direction: z.enum(['upstream', 'downstream', 'both']).optional(),
        maxDepth: z.number().int().min(1).max(8).optional(),
        relationVerbs: dependencyVerbs,
        tokenBudget: tokenBudgetSchema
      })
    },
    async ({ selector, direction, maxDepth, relationVerbs, tokenBudget = 2000 }) => {
      try {
        const result = analyzeStructuralImpact(store.read(), selector, {
          direction,
          maxDepth,
          relationVerbs
        });
        return textResult(withinBudget(formatImpact(result), tokenBudget));
      } catch (error) {
        return analysisError(logger, 'analyze_impact', error);
      }
    }
  );

  server.registerTool(
    'find_structural_path',
    {
      title: 'Find Structural Path',
      description:
        '在完整代码事实图中查找两个符号或文件之间的最短依赖路径，适合精选图之外的跨模块追踪。',
      inputSchema: z.object({
        source: z.string().min(1).max(500),
        target: z.string().min(1).max(500),
        direction: z.enum(['outgoing', 'both']).optional(),
        maxDepth: z.number().int().min(1).max(20).optional(),
        relationVerbs: dependencyVerbs,
        tokenBudget: tokenBudgetSchema
      })
    },
    async ({ source, target, direction, maxDepth, relationVerbs, tokenBudget = 2000 }) => {
      try {
        const result = findStructuralPath(store.read(), source, target, {
          direction,
          maxDepth,
          relationVerbs
        });
        return textResult(withinBudget(formatPath(result), tokenBudget));
      } catch (error) {
        return analysisError(logger, 'find_structural_path', error);
      }
    }
  );
}

export function formatCycles(cycles: ReturnType<typeof findStructuralCycles>, generatedAt: string): string[] {
  const lines = [`Structural cycles | generated ${generatedAt} | ${cycles.length} found`];
  for (const cycle of cycles) {
    lines.push(`C ${cycle.id} | ${cycle.entityKeys.join(' -> ')}`);
    for (const relation of cycle.relations) lines.push(relationLine(relation));
  }
  return lines;
}

export function formatCoupling(records: ReturnType<typeof reportStructuralCoupling>, generatedAt: string): string[] {
  return [
    `High coupling | generated ${generatedAt} | ${records.length} shown`,
    ...records.map((record) =>
      `N ${record.name} <${record.key}> | score ${record.score} | in ${record.incoming} | out ${record.outgoing} | cross ${record.crossBoundary} | ${record.filePath}:${record.startLine}`
    )
  ];
}

export function formatCrossBoundary(records: ReturnType<typeof reportCrossBoundaryConnections>, generatedAt: string): string[] {
  const lines = [`Cross-boundary connections | generated ${generatedAt} | ${records.length} shown`];
  for (const record of records) {
    lines.push(`B ${record.sourceBoundary} -> ${record.targetBoundary} | ${record.count} edges | ${JSON.stringify(record.verbs)}`);
    for (const relation of record.relations.slice(0, 3)) lines.push(relationLine(relation));
  }
  return lines;
}

export function formatCommunities(records: ReturnType<typeof suggestStructuralCommunities>, generatedAt: string): string[] {
  const lines = [`Community suggestions | generated ${generatedAt} | suggestions only; curated groups unchanged`];
  for (const record of records) {
    lines.push(`G ${record.suggestedKey} | scope ${record.scope} | ${record.files.length} files | ${record.relationCount} internal edges`);
    lines.push(`  files: ${record.files.join(', ')}`);
  }
  return lines;
}

export function formatDiff(diff: ReturnType<typeof diffStructuralGraphs>): string[] {
  if (!diff.available) {
    return ['Structural diff unavailable: no previous structurally different valid snapshot exists.'];
  }
  const lines = [
    `Structural diff | ${diff.baselineGeneratedAt} -> ${diff.currentGeneratedAt}`,
    `Summary | entities +${diff.addedEntities.length} -${diff.removedEntities.length} ~${diff.changedEntities.length} | relations +${diff.addedRelations.length} -${diff.removedRelations.length} ~${diff.changedRelations.length}`
  ];
  for (const entity of diff.addedEntities) lines.push(`+N ${entity.name} <${entity.key}> | ${entity.filePath}:${entity.startLine}`);
  for (const entity of diff.removedEntities) lines.push(`-N ${entity.name} <${entity.key}> | ${entity.filePath}:${entity.startLine}`);
  for (const change of diff.changedEntities) lines.push(`~N ${change.after.name} <${change.after.key}> | ${change.after.filePath}:${change.after.startLine}`);
  for (const relation of diff.addedRelations) lines.push(`+${relationLine(relation)}`);
  for (const relation of diff.removedRelations) lines.push(`-${relationLine(relation)}`);
  for (const change of diff.changedRelations) lines.push(`~R ${change.after[0]?.source ?? change.before[0]?.source} --${change.after[0]?.verb ?? change.before[0]?.verb}--> ${change.after[0]?.target ?? change.before[0]?.target}`);
  return lines;
}

export function formatImpact(result: ReturnType<typeof analyzeStructuralImpact>): string[] {
  const lines = [`Impact | ${result.seed.name} <${result.seed.key}> | depth ${result.maxDepth}`];
  for (const direction of ['upstream', 'downstream'] as const) {
    const slice = result[direction];
    lines.push(`${direction} | ${slice.entities.length} entities | ${slice.relations.length} relations`);
    for (const entity of slice.entities) lines.push(`N d${entity.depth} ${entity.name} <${entity.key}> | ${entity.filePath}:${entity.startLine}`);
    for (const relation of slice.relations) lines.push(relationLine(relation));
  }
  return lines;
}

export function formatPath(result: ReturnType<typeof findStructuralPath>): string[] {
  const lines = [`Structural path | ${result.source.name} <${result.source.key}> -> ${result.target.name} <${result.target.key}>`];
  if (!result.found) return [...lines, 'No path found within the requested depth.'];
  result.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step.from} ${step.traversal === 'reverse' ? '<--' : '--'}${step.relation.verb}${step.traversal === 'reverse' ? '--' : '-->'} ${step.to} | ${location(step.relation)}`);
  });
  return lines;
}

function relationLine(relation: ReturnType<typeof findStructuralCycles>[number]['relations'][number]): string {
  return `R ${relation.source} --${relation.verb}--> ${relation.target} | ${location(relation)} | ${relation.confidence}`;
}

function location(relation: ReturnType<typeof findStructuralCycles>[number]['relations'][number]): string {
  return `${relation.location.filePath}:${relation.location.startLine}-${relation.location.endLine}`;
}

export function withinBudget(lines: string[], tokenBudget: number): string {
  if (estimateTokenCount(lines.join('\n')) <= tokenBudget) return lines.join('\n');
  const selected: string[] = [];
  const marker = `… truncated to approximately ${tokenBudget} tokens`;
  for (const line of lines) {
    const candidate = [...selected, line, marker].join('\n');
    if (estimateTokenCount(candidate) > tokenBudget) {
      break;
    }
    selected.push(line);
  }
  return [...selected, marker].join('\n');
}

function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function analysisError(logger: Logger, tool: string, error: unknown) {
  logger.error(`[${tool}] failed:`, error);
  return {
    content: [{
      type: 'text' as const,
      text: `${tool} 执行失败：${error instanceof Error ? error.message : '未知错误'}`
    }],
    isError: true
  };
}
