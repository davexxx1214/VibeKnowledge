import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Logger } from '../server.js';
import { runQuery } from '../queryCli.js';

const text = z.string().trim().min(1).max(500);
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

/** Reuse CLI validation, selection, freshness and rendering; no second query engine. */
export function registerFeatureBriefTools(server: McpServer, workspace: string, logger: Logger): void {
  const execute = async (tool: string, command: string, options: Record<string, unknown>) => {
    try {
      return { content: [{ type: 'text' as const, text: await runQuery(command, { ...options, workspace }) }] };
    } catch (error) {
      logger.error(`[${tool}] failed:`, error);
      return { content: [{ type: 'text' as const, text: `${tool} failed: ${error instanceof Error ? error.message : 'Unknown error'}` }], isError: true };
    }
  };
  server.registerTool('find_features', {
    title: 'Find Page or Feature',
    description: 'Find existing page/feature briefs by name, key, keywords or summary. Routing only; use a concise feature name, not a full question. Read one relevant key with get_feature_brief. Skip discovery for a known key, and skip graph queries for small known-file edits.',
    inputSchema: z.object({ query: text.optional(), tokenBudget: z.number().int().min(200).max(12000).optional() }).strict(),
    annotations,
  }, async ({ query, tokenBudget }) => execute('find_features', 'features', { query, budget: tokenBudget }));

  server.registerTool('get_feature_brief', {
    title: 'Read Feature Brief',
    description: 'Read one feature brief: capabilities, entries, dependency roles, frameworks, tests and source-backed constraints. Checks only cited files and withholds stale facts. Check omitted sections; verify affected source/tests before edits. Use get_task_context only for missing cross-file impact. No completeness or runtime guarantee.',
    inputSchema: z.object({
      feature: text,
      tokenBudget: z.number().int().min(600).max(12000).optional(),
    }).strict(),
    annotations,
  }, async ({ feature, tokenBudget }) => execute('get_feature_brief', 'brief', { feature, budget: tokenBudget }));

  server.registerTool('get_task_context', {
    title: 'Read Task Dependency Context',
    description: 'For missing briefs or unresolved impact, use an exact method/symbol for its relationships (including same-file helpers), or a file path for the full file neighborhood. Container/type/file endpoints are terminal hints; review owner initialization and runtime wiring separately. Returns bounded dependencies, source locations, test candidates and limitations. Skip if source or one brief is sufficient. Paths are not execution traces; tests are not coverage. Checks structural-graph.json and indexed source hashes.',
    inputSchema: z.object({
      selector: text,
      mode: z.enum(['change', 'understand']).optional().describe('Default change; understand prioritizes dependencies.'),
      depth: z.number().int().min(1).max(6).optional(),
      snippets: z.boolean().optional().describe('Include bounded source excerpts only where indexed hashes still match.'),
      tokenBudget: z.number().int().min(400).max(12000).optional(),
    }).strict(),
    annotations,
  }, async ({ selector, mode, depth, snippets, tokenBudget }) => execute('get_task_context', 'context', {
    selector, mode, depth, snippets, budget: tokenBudget,
  }));
}
