#!/usr/bin/env node
import { loadConfig, LogLevel } from './config.js';
import { GraphDatabase } from './database.js';
import { startMcpServer, type Logger } from './server.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);

  logger.info(`Workspace: ${config.workspaceRoot}`);
  logger.info(`Database: ${config.dbPath}`);

  const database = new GraphDatabase(config.dbPath);
  database.open();

  const server = await startMcpServer(config, database, logger);
  logger.info('VibeKnowledge MCP Server 已启动，等待 Cursor / Copilot 连接...');

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info(`收到 ${signal}，正在关闭 MCP Server...`);
    try {
      await server.close();
    } catch (error) {
      logger.error('关闭 MCP Server 时出错', error);
    } finally {
      database.close();
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

function createLogger(level: LogLevel): Logger {
  const levelWeight: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    error: 2
  };

  const threshold = levelWeight[level];

  const log =
    (msgLevel: LogLevel) =>
    (...args: unknown[]) => {
      if (levelWeight[msgLevel] < threshold) {
        return;
      }

      const prefix = `[${new Date().toISOString()}][${msgLevel.toUpperCase()}]`;
      console.error(prefix, ...args);
    };

  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('info'),
    error: log('error')
  };
}

main().catch((error) => {
  console.error('[ERROR] MCP Server 启动失败：', error);
  process.exit(1);
});

