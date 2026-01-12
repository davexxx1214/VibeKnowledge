import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { ServerConfig } from './config.js';
import type { GraphDatabase } from './database.js';
import { registerTools } from './tools/registerTools.js';
import { registerPrompts } from './prompts/registerPrompts.js';
import { createRagEngine } from './rag/ragEngineFactory.js';
import type { RagEngine } from './rag/ragEngine.js';
import { registerBaseResources } from './resources/registerResources.js';

export type Logger = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export async function startMcpServer(
  config: ServerConfig,
  db: GraphDatabase,
  logger: Logger
): Promise<McpServer> {
  const server = new McpServer({
    name: 'VibeKnowledge MCP',
    version: config.serverVersion
  });

  registerBaseResources(server, db);

  const ragEngine: RagEngine | null = await createRagEngine(
    config,
    db,
    logger
  );
  registerTools(server, db, ragEngine, logger);
  registerPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}

