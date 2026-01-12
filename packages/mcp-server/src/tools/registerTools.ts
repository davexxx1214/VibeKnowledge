import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RagEngine, RagAnswer } from '../rag/ragEngine.js';
import type { Logger } from '../server.js';
import type {
  GraphDatabase,
  EntityRecord,
  ObservationRecord,
  RelationRecord
} from '../database.js';

const DEFAULT_LIMIT = 20;

export function registerTools(
  server: McpServer,
  db: GraphDatabase,
  ragEngine: RagEngine | null,
  logger: Logger
): void {
  registerSearchEntitiesTool(server, db, logger);
  registerSearchObservationsTool(server, db, logger);
  registerRelationsTool(server, db, logger);

  if (ragEngine) {
    registerAskQuestionTool(server, ragEngine, logger);
  }
}

function registerSearchEntitiesTool(
  server: McpServer,
  db: GraphDatabase,
  logger: Logger
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
        '基于 knowledge graph 查询实体，支持按名称、类型、文件路径模糊匹配。',
      inputSchema
    },
    async ({ query = '', type, filePath, limit = DEFAULT_LIMIT }) => {
      try {
        logger.debug?.(
          `[search_entities] query="${query}", type=${type ?? 'all'}, file=${filePath ?? 'any'}, limit=${limit}`
        );
        const results = db.searchEntities({
          query,
          type,
          filePath,
          limit
        });
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
  logger: Logger
): void {
  const inputSchema = z.object({
    verb: z.string().describe('关系动词（如 uses/depends_on）').optional(),
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
    'knowledge://relations',
    {
      title: 'List Relations',
      description:
        '列出知识图谱中的关系记录，可按动词、源实体、目标实体筛选。',
      inputSchema
    },
    async ({ verb, source, target, limit = DEFAULT_LIMIT }) => {
      try {
        logger.debug?.(
          `[knowledge://relations] verb=${verb ?? 'all'}, source=${source ?? 'any'}, target=${target ?? 'any'}, limit=${limit}`
        );
        const results = db.searchRelations({
          verb,
          source,
          target,
          limit
        });
        return {
          content: [
            {
              type: 'text',
              text: formatRelationResults(results)
            }
          ]
        };
      } catch (error) {
        logger.error('[knowledge://relations] failed:', error);
        const message =
          error instanceof Error
            ? error.message
            : '未知错误，无法获取关系记录';
        return {
          content: [
            {
              type: 'text',
              text: `knowledge://relations 执行失败：${message}`
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

function formatEntityResults(results: EntityRecord[]): string {
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
      return `${index + 1}. [${entity.type}] ${entity.name}\n    位置：${location}\n    更新时间：${updatedAt}${description}`;
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

function formatRelationResults(results: RelationRecord[]): string {
  if (results.length === 0) {
    return '未找到匹配的关系记录。';
  }

  return results
    .map((relation, index) => {
      const createdAt = new Date(relation.createdAt).toISOString();
      return `${index + 1}. ${relation.sourceName} [${relation.sourceType}] --${relation.verb}--> ${relation.targetName} [${relation.targetType}]\n    Source: ${relation.sourceFilePath}\n    Target: ${relation.targetFilePath}\n    Created At: ${createdAt}`;
    })
    .join('\n\n');
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

