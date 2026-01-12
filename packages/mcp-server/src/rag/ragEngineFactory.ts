import type { ServerConfig } from '../config.js';
import type { GraphDatabase } from '../database.js';
import type { RagEngine } from './ragEngine.js';
import { LocalRagEngine } from './localRagEngine.js';
import { CloudRagEngine } from './cloudRagEngine.js';

type Logger = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export async function createRagEngine(
  config: ServerConfig,
  db: GraphDatabase,
  logger: Logger
): Promise<RagEngine | null> {
  if (config.rag.mode === 'none') {
    logger.info('[RAG] RAG mode set to none, ask_question tool will be disabled.');
    return null;
  }

  if (config.rag.mode === 'local') {
    const engine = new LocalRagEngine(
      db.getConnection(),
      config.workspaceRoot,
      config.rag.local,
      logger
    );
    engine.initialize();
    logger.info(`[RAG] Local mode enabled. storeId=${engine.getStoreId()}`);
    return engine;
  }

  if (config.rag.mode === 'cloud') {
    if (!config.rag.cloud.apiKey) {
      logger.warn?.('[RAG] cloud mode selected but Gemini API Key is empty, disabling ask_question.');
      return null;
    }
    try {
      const engine = new CloudRagEngine(
        db.getConnection(),
        config.workspaceRoot,
        config.rag.cloud,
        logger
      );
      engine.initialize();
      logger.info(`[RAG] Cloud mode enabled. storeId=${engine.getStoreId()}`);
      return engine;
    } catch (error) {
      logger.error('[RAG] Failed to initialize cloud RAG engine:', error);
      return null;
    }
  }

  logger.info(`[RAG] Unsupported RAG mode ${config.rag.mode}, skipping.`);
  return null;
}

