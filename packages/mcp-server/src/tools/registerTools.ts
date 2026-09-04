import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RagEngine, RagAnswer } from '../rag/ragEngine.js';
import type { Logger } from '../server.js';
import type {
  GraphDatabase,
  ObservationRecord
} from '../database.js';
import type { AgentGraphStore } from '../agentGraphStore.js';
import type {
  MergedEntityRecord,
  MergedRelationRecord
} from '../mergedGraph.js';
import {
  searchMergedEntities,
  searchMergedRelations
} from '../mergedGraph.js';
import { registerGraphQueryTools } from './registerGraphQueryTools.js';
import type { StructuralGraphStore } from '../structuralGraphStore.js';
import { registerStructuralAnalysisTools } from './registerStructuralAnalysisTools.js';

const DEFAULT_LIMIT = 20;

export function registerTools(
  server: McpServer,
  db: GraphDatabase,
  ragEngine: RagEngine | null,
  logger: Logger,
  agentGraph?: AgentGraphStore,
  structuralGraph?: StructuralGraphStore
): void {
  registerSearchEntitiesTool(server, db, logger, agentGraph);
  registerSearchObservationsTool(server, db, logger);
  registerRelationsTool(server, db, logger, agentGraph);

  if (agentGraph) {
    registerGraphQueryTools(server, db, agentGraph, logger);
  }
  if (structuralGraph) {
    registerStructuralAnalysisTools(server, structuralGraph, logger);
  }

  if (ragEngine) {
    registerAskQuestionTool(server, ragEngine, logger);
  }
}

function registerSearchEntitiesTool(
  server: McpServer,
  db: GraphDatabase,
  logger: Logger,
  agentGraph?: AgentGraphStore
): void {
  const inputSchema = z.object({
    query: z
      .string()
      .describe('用于匹配实体名称、文件路径或描述的关键字')
      .optional(),
    type: z
      .string()
      .describe('实体类型（如 service/component/function）')
      .optional(),
    filePath: z.string().describe('按文件路径过滤（支持模糊匹配）').optional(),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .describe('最多返回的实体数量，默认 20')
      .optional()
  });

  server.registerTool(
    'search_entities',
    {
      title: 'Search Entities',
      description:
        '查询统一知识图谱中的实体，支持按名称、类型、文件路径或描述模糊匹配。',
      inputSchema
    },
    async ({ query = '', type, filePath, limit = DEFAULT_LIMIT }) => {
      try {
        logger.debug?.(
          `[search_entities] query="${query}", type=${type ?? 'all'}, file=${filePath ?? 'any'}, limit=${limit}`
        );
        const params = { query, type, filePath, limit };
        const results = agentGraph
          ? searchMergedEntities(db, agentGraph, params)
          : [];
        return {
          content: [
            {
              type: 'text',
              text: formatEntityResults(results)
            }
          ]
        };
      } catch (error) {
        logger.error('[search_entities] failed:', error);
        const message =
          error instanceof Error ? error.message : '未知错误，无法搜索实体';
        return {
          content: [
            {
              type: 'text',
              text: `search_entities 执行失败：${message}`
            }
          ],
          isError: true
        };
      }
    }
  );
}

function registerSearchObservationsTool(
  server: McpServer,
  db: GraphDatabase,
  logger: Logger
): void {
  const inputSchema = z.object({
    query: z
      .string()
      .describe('匹配观察内容或实体名称的关键字')
      .optional(),
    entityId: z.string().describe('限定只搜索某个实体的观察记录').optional(),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .describe('最多返回的观察记录数量，默认 20')
      .optional()
  });

  server.registerTool(
    'search_observations',
    {
      title: 'Search Observations',
      description:
        '查询知识图谱中的观察记录，可按关键字或实体进行过滤。',
      inputSchema
    },
    async ({ query = '', entityId, limit = DEFAULT_LIMIT }) => {
      try {
        logger.debug?.(
          `[search_observations] query="${query}", entity=${entityId ?? 'all'}, limit=${limit}`
        );
        const results = db.searchObservations({
          query,
          entityId,
          limit
        });
        return {
          content: [
            {
              type: 'text',
              text: formatObservationResults(results)
            }
          ]
        };
      } catch (error) {
        logger.error('[search_observations] failed:', error);
        const message =
          error instanceof Error
            ? error.message
            : '未知错误，无法搜索观察记录';
        return {
          content: [
            {
              type: 'text',
              text: `search_observations 执行失败：${message}`
            }
          ],
          isError: true
        };
      }
    }
  );
}

function registerRelationsTool(
  server: McpServer,
  db: GraphDatabase,
  logger: Logger,
  agentGraph?: AgentGraphStore
): void {
  const inputSchema = z.object({
    verb: z.string().describe('关系动词（如 calls/depends_on）').optional(),
    source: z.string().describe('源实体名称关键字').optional(),
    target: z.string().describe('目标实体名称关键字').optional(),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .describe('最多返回的关系数量，默认 20')
      .optional()
  });

  server.registerTool(
    'list_relations',
    {
      title: 'List Relations',
      description:
        '列出统一知识图谱中的关系，可按动词、源实体、目标实体筛选。',
      inputSchema
    },
    async ({ verb, source, target, limit = DEFAULT_LIMIT }) => {
      try {
        logger.debug?.(
          `[list_relations] verb=${verb ?? 'all'}, source=${source ?? 'any'}, target=${target ?? 'any'}, limit=${limit}`
        );
        const params = { verb, source, target, limit };
        const results = agentGraph
          ? searchMergedRelations(db, agentGraph, params)
          : [];
        return {
          content: [
            {
              type: 'text',
              text: formatRelationResults(results)
            }
          ]
        };
      } catch (error) {
        logger.error('[list_relations] failed:', error);
        const message =
          error instanceof Error
            ? error.message
            : '未知错误，无法获取关系记录';
        return {
          content: [
            {
              type: 'text',
              text: `list_relations 执行失败：${message}`
            }
          ],
          isError: true
        };
      }
    }
  );
}

function registerAskQuestionTool(
  server: McpServer,
  ragEngine: RagEngine,
  logger: Logger
): void {
  const inputSchema = z.object({
    question: z
      .string()
      .min(1, 'question 不能为空')
      .describe('需要回答的问题')
  });

  server.registerTool(
    'ask_question',
    {
      title: 'Ask Question',
      description:
        '基于 VibeKnowledge RAG 文档回答问题，并返回相关引用文件。',
      inputSchema
    },
    async ({ question }) => {
      try {
        logger.info(
          `[ask_question] executing, mode=${ragEngine.getMode()}, storeId=${ragEngine.getStoreId()}`
        );
        const result = await ragEngine.ask(question);
        logger.info(
          `[ask_question] success. sources=${result.sources.length}`
        );
        return {
          content: [
            {
              type: 'text',
              text: formatAnswer(result)
            }
          ]
        };
      } catch (error) {
        logger.error('[ask_question] failed:', error);
        const message =
          error instanceof Error ? error.message : '未知错误，无法完成问答';
        return {
          content: [
            {
              type: 'text',
              text: `ask_question 执行失败：${message}`
            }
          ],
          isError: true
        };
      }
    }
  );
}

export function formatEntityResults(results: MergedEntityRecord[]): string {
  if (results.length === 0) {
    return '未找到匹配的实体。';
  }

  return results
    .map((entity, index) => {
      const location = `${entity.filePath}:${entity.startLine}-${entity.endLine}`;
      const updatedAt = new Date(entity.updatedAt).toISOString();
      const description = entity.description
        ? `\n    描述：${entity.description}`
        : '';
      const source = 'agent (.vscode/.knowledge/agent-graph.json)';
      const group = `\n    分组：${entity.groupName} (${entity.groupKind}, ${entity.groupKey})`;
      return `${index + 1}. [${entity.type}] ${entity.name}\n    位置：${location}\n    来源：${source}${group}\n    更新时间：${updatedAt}${description}`;
    })
    .join('\n\n');
}

function formatObservationResults(results: ObservationRecord[]): string {
  if (results.length === 0) {
    return '未找到匹配的观察记录。';
  }

  return results
    .map((item, index) => {
      const updatedAt = new Date(item.updatedAt).toISOString();
      return `${index + 1}. ${item.content}\n    实体：${item.entityName} [${item.entityType}]\n    路径：${item.filePath}\n    更新时间：${updatedAt}`;
    })
    .join('\n\n');
}

export function formatRelationResults(results: MergedRelationRecord[]): string {
  if (results.length === 0) {
    return '未找到匹配的关系记录。';
  }

  return results
    .map((relation, index) => {
      const createdAt = new Date(relation.createdAt).toISOString();
      const source = 'agent (.vscode/.knowledge/agent-graph.json)';
      const description =
        relation.description
          ? `\n    Description: ${relation.description}`
          : '';
      const evidence =
        relation.evidence.length > 0
          ? `\n    Evidence: ${relation.evidence
              .map(formatEvidence)
              .join('; ')}`
          : '';
      const provenance =
        `\n    Relation Origin: ${relation.origin}\n    Confidence: ${relation.confidence}`;
      const group = `\n    Group: ${relation.groupName} (${relation.groupKind}, ${relation.groupKey})`;
      return `${index + 1}. ${relation.sourceName} [${relation.sourceType}] --${relation.verb}--> ${relation.targetName} [${relation.targetType}]\n    Source: ${relation.sourceFilePath}\n    Target: ${relation.targetFilePath}\n    Data Source: ${source}${group}${provenance}\n    Created At: ${createdAt}${description}${evidence}`;
    })
    .join('\n\n');
}

function formatEvidence(
  evidence: Extract<MergedRelationRecord, { source: 'agent' }>['evidence'][number]
): string {
  const endLine = evidence.endLine ?? evidence.startLine;
  const detail = evidence.detail ? ` (${evidence.detail})` : '';
  return `${evidence.filePath}:${evidence.startLine}-${endLine}${detail}`;
}

function formatAnswer(result: RagAnswer): string {
  const sources =
    result.sources.length === 0
      ? '（无引用）'
      : result.sources
          .map(
            (source, index) =>
              `${index + 1}. ${source.relativePath} (relevance: ${
                source.relevance
              })`
          )
          .join('\n');

  return `${result.answer.trim()}\n\n来源：\n${sources}`;
}

