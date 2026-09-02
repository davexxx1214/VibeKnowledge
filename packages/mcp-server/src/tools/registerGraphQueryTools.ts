import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AgentGraphStore } from '../agentGraphStore.js';
import type { GraphDatabase } from '../database.js';
import {
  AgentGraphQueryEngine,
  GRAPH_RELATION_VERBS,
  formatGraphSlice,
  formatShortestPath
} from '../graphQuery.js';
import { getAgentDescriptionOverrides } from '../mergedGraph.js';
import type { Logger } from '../server.js';

const relationVerbsSchema = z
  .array(z.enum(GRAPH_RELATION_VERBS))
  .max(GRAPH_RELATION_VERBS.length)
  .describe('只遍历这些关系类型；省略时允许全部关系')
  .optional();
const groupKeySchema = z
  .string()
  .min(1)
  .max(120)
  .describe('限定 framework/module/feature 分组 key')
  .optional();
const tokenBudgetSchema = z
  .number()
  .int()
  .min(200)
  .max(12000)
  .describe('返回文本的近似 token 上限，默认 2000')
  .optional();
const includeEvidenceSchema = z
  .boolean()
  .describe('是否返回关系 Evidence；默认 false')
  .optional();

export function registerGraphQueryTools(
  server: McpServer,
  db: GraphDatabase,
  agentGraph: AgentGraphStore,
  logger: Logger
): void {
  server.registerTool(
    'query_graph',
    {
      title: 'Query Knowledge Graph',
      description:
        '针对代码或架构问题返回受 token budget 限制的局部子图。进行跨文件理解、依赖或影响分析时优先使用。',
      inputSchema: z.object({
        query: z
          .string()
          .min(1)
          .max(500)
          .describe('自然语言问题、实体名、文件路径或代码概念'),
        groupKey: groupKeySchema,
        filePath: z
          .string()
          .min(1)
          .max(500)
          .describe('只从匹配该路径的实体中选择查询种子')
          .optional(),
        relationVerbs: relationVerbsSchema,
        depth: z
          .number()
          .int()
          .min(0)
          .max(5)
          .describe('从种子节点向外遍历的深度，默认 2')
          .optional(),
        tokenBudget: tokenBudgetSchema,
        includeEvidence: includeEvidenceSchema
      })
    },
    async ({
      query,
      groupKey,
      filePath,
      relationVerbs,
      depth,
      tokenBudget,
      includeEvidence = false
    }) => {
      try {
        logger.debug?.(
          `[query_graph] query="${query}", group=${groupKey ?? 'all'}, depth=${depth ?? 2}, budget=${tokenBudget ?? 2000}, evidence=${includeEvidence}`
        );
        const slice = createEngine(db, agentGraph).queryGraph({
          query,
          groupKey,
          filePath,
          relationVerbs,
          depth
        });
        return textResult(
          formatGraphSlice(slice, { tokenBudget, includeEvidence }).text
        );
      } catch (error) {
        return graphQueryError(logger, 'query_graph', error);
      }
    }
  );

  server.registerTool(
    'get_entity',
    {
      title: 'Get Knowledge Graph Entity',
      description:
        '按 stable key、实体名或内部 ID 获取实体；同一 stable key 出现在多个分组时会返回各分组 occurrence。',
      inputSchema: z.object({
        selector: z
          .string()
          .min(1)
          .max(500)
          .describe('stable key、实体名或 MCP 返回的实体 ID'),
        groupKey: groupKeySchema,
        tokenBudget: tokenBudgetSchema
      })
    },
    async ({ selector, groupKey, tokenBudget }) => {
      try {
        logger.debug?.(
          `[get_entity] selector="${selector}", group=${groupKey ?? 'all'}`
        );
        const slice = createEngine(db, agentGraph).getEntities(
          selector,
          groupKey
        );
        return textResult(formatGraphSlice(slice, { tokenBudget }).text);
      } catch (error) {
        return graphQueryError(logger, 'get_entity', error);
      }
    }
  );

  server.registerTool(
    'get_neighbors',
    {
      title: 'Get Knowledge Graph Neighbors',
      description:
        '按方向和深度获取实体邻居。默认省略 Evidence，并抑制非种子高连接节点继续扩散。',
      inputSchema: z.object({
        selector: z
          .string()
          .min(1)
          .max(500)
          .describe('stable key、实体名或 MCP 返回的实体 ID'),
        groupKey: groupKeySchema,
        direction: z
          .enum(['incoming', 'outgoing', 'both'])
          .describe('关系方向，默认 both')
          .optional(),
        relationVerbs: relationVerbsSchema,
        depth: z
          .number()
          .int()
          .min(1)
          .max(5)
          .describe('邻居遍历深度，默认 1')
          .optional(),
        tokenBudget: tokenBudgetSchema,
        includeEvidence: includeEvidenceSchema
      })
    },
    async ({
      selector,
      groupKey,
      direction,
      relationVerbs,
      depth,
      tokenBudget,
      includeEvidence = false
    }) => {
      try {
        logger.debug?.(
          `[get_neighbors] selector="${selector}", group=${groupKey ?? 'all'}, direction=${direction ?? 'both'}, depth=${depth ?? 1}`
        );
        const slice = createEngine(db, agentGraph).getNeighbors({
          selector,
          groupKey,
          direction,
          relationVerbs,
          depth
        });
        return textResult(
          formatGraphSlice(slice, { tokenBudget, includeEvidence }).text
        );
      } catch (error) {
        return graphQueryError(logger, 'get_neighbors', error);
      }
    }
  );

  server.registerTool(
    'shortest_path',
    {
      title: 'Find Knowledge Graph Shortest Path',
      description:
        '查找两个实体之间的最短关系路径。默认允许沿关系双向寻找，但输出保留原始关系方向。',
      inputSchema: z.object({
        source: z.string().min(1).max(500).describe('起点 stable key 或实体名'),
        target: z.string().min(1).max(500).describe('终点 stable key 或实体名'),
        groupKey: groupKeySchema,
        direction: z
          .enum(['outgoing', 'both'])
          .describe('只沿出边或允许双向寻找，默认 both')
          .optional(),
        relationVerbs: relationVerbsSchema,
        maxDepth: z
          .number()
          .int()
          .min(1)
          .max(12)
          .describe('最大路径跳数，默认 8')
          .optional(),
        tokenBudget: tokenBudgetSchema,
        includeEvidence: includeEvidenceSchema
      })
    },
    async ({
      source,
      target,
      groupKey,
      direction,
      relationVerbs,
      maxDepth,
      tokenBudget,
      includeEvidence = false
    }) => {
      try {
        logger.debug?.(
          `[shortest_path] source="${source}", target="${target}", group=${groupKey ?? 'all'}, direction=${direction ?? 'both'}`
        );
        const path = createEngine(db, agentGraph).shortestPath({
          source,
          target,
          groupKey,
          direction,
          relationVerbs,
          maxDepth
        });
        return textResult(
          formatShortestPath(path, { tokenBudget, includeEvidence }).text
        );
      } catch (error) {
        return graphQueryError(logger, 'shortest_path', error);
      }
    }
  );
}

function createEngine(
  db: GraphDatabase,
  agentGraph: AgentGraphStore
): AgentGraphQueryEngine {
  const overrides = getAgentDescriptionOverrides(db, agentGraph);
  return new AgentGraphQueryEngine(
    agentGraph.listAllEntities(overrides),
    agentGraph.listAllRelations()
  );
}

function textResult(text: string) {
  return {
    content: [
      {
        type: 'text' as const,
        text
      }
    ]
  };
}

function graphQueryError(logger: Logger, tool: string, error: unknown) {
  logger.error(`[${tool}] failed:`, error);
  const message = error instanceof Error ? error.message : '未知错误';
  return {
    content: [
      {
        type: 'text' as const,
        text: `${tool} 执行失败：${message}`
      }
    ],
    isError: true
  };
}
