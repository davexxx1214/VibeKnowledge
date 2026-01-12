import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import { GoogleGenAI } from '@google/genai';
import type { CloudRagSettings } from '../config.js';
import type { RagAnswer, RagEngine, RagSource } from './ragEngine.js';

type IndexedFileRow = {
  file_path: string;
  file_name: string;
  gemini_file_uri: string;
};

type Logger = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export class CloudRagEngine implements RagEngine {
  private readonly storeId: string;
  private storeName: string | null = null;
  private readonly indexedByTitle = new Map<string, IndexedFileRow>();
  private readonly indexedByUri = new Map<string, IndexedFileRow>();
  private readonly client: GoogleGenAI;

  constructor(
    private readonly db: Database.Database,
    private readonly workspaceRoot: string,
    private readonly settings: CloudRagSettings,
    private readonly logger: Logger
  ) {
    this.storeId = createStoreId(normalizeWorkspaceRootForHash(workspaceRoot));
    this.client = new GoogleGenAI({
      apiKey: this.settings.apiKey
    });
  }

  public initialize(): void {
    if (!this.settings.apiKey) {
      throw new Error('未提供 Gemini API Key，无法使用云端 RAG。');
    }

    this.loadStoreInfo();
    this.loadIndexedFiles();

    if (!this.storeName) {
      throw new Error(
        '未找到云端 RAG Store 信息。请先在 VS Code 内完成 RAG 初始化。'
      );
    }

    this.logger.info(
      `[CloudRagEngine] Store ${this.storeName} loaded with ${this.indexedByTitle.size} indexed files.`
    );
  }

  public getStoreId(): string {
    return this.storeId;
  }

  public getMode(): 'local' | 'cloud' {
    return 'cloud';
  }

  public async ask(question: string): Promise<RagAnswer> {
    if (!this.storeName) {
      throw new Error('云端 RAG Store 未初始化。');
    }

    this.logger.info(
      `[CloudRagEngine] ask() called. storeName=${this.storeName}, model=${this.settings.model || 'gemini-2.5-flash'}`
    );
    this.logger.debug?.(
      `[CloudRagEngine] Environment: HTTP_PROXY=${process.env.HTTP_PROXY ?? 'unset'}, HTTPS_PROXY=${process.env.HTTPS_PROXY ?? 'unset'}`
    );

    try {
      const response = await this.client.models.generateContent({
        model: this.settings.model || 'gemini-2.5-flash',
        contents: question,
        config: {
          tools: [{ fileSearch: { fileSearchStoreNames: [this.storeName] } }]
        }
      } as any);

      this.logger.debug?.(
        '[CloudRagEngine] raw response snippet:',
        safelyStringify(response)
      );

      const answer =
        (response as any).candidates?.[0]?.content?.parts?.[0]?.text ??
        (response as any).text ??
        '未能从云端知识库中获取答案。';
      const sources = this.extractSources(response);

      const answerWithStore =
        `${answer.trim()}\n\n(storeId: ${this.storeId})`;

      return {
        answer: answerWithStore,
        sources
      };
    } catch (error) {
      const normalized = toError(error);
      this.logger.error(
        '[CloudRagEngine] Gemini request failed:',
        normalized.message,
        normalized.stack
      );
      // 返回友好提示而非抛出异常，避免 MCP 工具层再次 catch
      return {
        answer: `无法连接到云端 RAG（${normalized.message}）。\n\n可能原因：\n1. MCP Server 进程未配置代理（HTTP_PROXY/HTTPS_PROXY）\n2. Gemini API Key 无效或过期\n3. 网络防火墙阻止了请求\n\n请在 mcp.json 的 env 字段中配置代理，或检查 API Key。`,
        sources: []
      };
    }
  }

  private loadStoreInfo(): void {
    const row = this.db
      .prepare(
        `SELECT store_name FROM rag_store_info WHERE store_id = ? LIMIT 1`
      )
      .get(this.storeId) as { store_name: string } | undefined;

    if (row && row.store_name) {
      this.storeName = row.store_name;
    }
  }

  private loadIndexedFiles(): void {
    const rows = this.db
      .prepare(
        `SELECT file_path, file_name, gemini_file_uri
         FROM indexed_files
         WHERE store_id = ?`
      )
      .all(this.storeId) as IndexedFileRow[];

    rows.forEach((row) => {
      this.indexedByTitle.set(row.file_name, row);
      if (row.gemini_file_uri) {
        this.indexedByUri.set(row.gemini_file_uri, row);
      }
    });
  }

  private extractSources(response: unknown): RagSource[] {
    const groundingMetadata = (response as any)?.candidates?.[0]?.groundingMetadata;
    
    // Debug: log the full grounding metadata structure
    this.logger.debug?.(
      '[CloudRagEngine] groundingMetadata:',
      safelyStringify(groundingMetadata)
    );
    
    const grounding = groundingMetadata?.groundingChunks;
    if (!Array.isArray(grounding)) {
      this.logger.debug?.('[CloudRagEngine] No groundingChunks found');
      return [];
    }
    
    this.logger.debug?.(`[CloudRagEngine] Found ${grounding.length} groundingChunks`);

    // Extract confidence scores from groundingSupports (available in Google Search grounding)
    // Each support may reference multiple chunk indices with corresponding scores
    const chunkScores = new Map<number, number>();
    const groundingSupports = groundingMetadata?.groundingSupports;
    
    if (Array.isArray(groundingSupports)) {
      for (const support of groundingSupports) {
        const indices: number[] = support?.groundingChunkIndices ?? [];
        const scores: number[] = support?.confidenceScores ?? [];
        for (let i = 0; i < indices.length; i++) {
          const chunkIndex = indices[i];
          const score = scores[i] ?? 0;
          // Keep the highest score if a chunk is referenced multiple times
          if (!chunkScores.has(chunkIndex) || chunkScores.get(chunkIndex)! < score) {
            chunkScores.set(chunkIndex, score);
          }
        }
      }
    }

    // Check if we have any scores from groundingSupports
    const hasExplicitScores = chunkScores.size > 0;
    
    this.logger.debug?.(
      `[CloudRagEngine] hasExplicitScores: ${hasExplicitScores}, chunkScores: ${JSON.stringify(Array.from(chunkScores.entries()))}`
    );

    const sources: RagSource[] = [];

    for (let chunkIndex = 0; chunkIndex < grounding.length; chunkIndex++) {
      const chunk = grounding[chunkIndex];
      
      const uri: string | undefined = chunk?.retrievedContext?.uri;
      const title: string | undefined = chunk?.retrievedContext?.title;
      const contentParts: Array<{ text?: string }> =
        chunk?.retrievedContext?.content?.parts ?? [];
      const snippet = contentParts
        .map((part) => part.text || '')
        .join('\n')
        .trim();

      // Get relevance score from multiple possible locations:
      // 1. Direct score on chunk (chunk.score, chunk.relevanceScore, chunk.confidence)
      // 2. From groundingSupports (Google Search grounding)
      // 3. Fallback: use position-based implicit relevance (1.0, 0.9, 0.8, ...)
      //    since Gemini returns results ordered by relevance
      const chunkScore = chunk?.score ?? chunk?.relevanceScore ?? chunk?.confidence;
      const supportScore = chunkScores.get(chunkIndex);
      
      let relevance: number;
      // Only use explicit scores if they are actually meaningful (> 0)
      // Otherwise fall back to position-based implicit relevance
      if (typeof chunkScore === 'number' && chunkScore > 0) {
        relevance = chunkScore;
      } else if (typeof supportScore === 'number' && supportScore > 0) {
        relevance = supportScore;
      } else {
        // Use position-based implicit relevance: first chunk gets highest score
        // This assumes Gemini returns chunks ordered by relevance
        relevance = Math.max(0.5, 1.0 - chunkIndex * 0.1);
      }

      const matched =
        (uri && this.indexedByUri.get(uri)) ||
        (title && this.indexedByTitle.get(title));

      if (matched) {
        sources.push({
          filePath: matched.file_path,
          relativePath: matched.file_path,
          snippet: snippet || '(来自云端文档)',
          relevance: Number(relevance.toFixed(3))
        });
      } else if (title) {
        sources.push({
          filePath: title,
          relativePath: title,
          snippet: snippet || '(来自云端文档)',
          relevance: Number(relevance.toFixed(3))
        });
      }
    }

    return dedupeSources(sources);
  }
}

function createStoreId(workspaceRoot: string): string {
  return createHash('md5').update(workspaceRoot).digest('hex').substring(0, 8);
}

function normalizeWorkspaceRootForHash(input: string): string {
  if (process.platform === 'win32') {
    return input.replace(/^[A-Z]:/, (drive) => drive.toLowerCase());
  }
  return input;
}

function dedupeSources(sources: RagSource[]): RagSource[] {
  const seen = new Map<string, RagSource>();
  for (const source of sources) {
    const existing = seen.get(source.relativePath);
    // Keep the source with the highest relevance score
    if (!existing || source.relevance > existing.relevance) {
      seen.set(source.relativePath, source);
    }
  }
  return Array.from(seen.values());
}

function safelyStringify(value: unknown, maxLength = 5000): string {
  try {
    const text = JSON.stringify(value, null, 2);
    if (!text) {
      return '[empty json]';
    }
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  } catch (error) {
    return `[unserializable: ${error}]`;
  }
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error('unknown error');
  }
}

