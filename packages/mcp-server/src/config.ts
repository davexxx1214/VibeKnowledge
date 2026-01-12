import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import stripJsonComments from 'strip-json-comments';
import packageJson from '../package.json' with { type: 'json' };

export type LogLevel = 'debug' | 'info' | 'error';
export type RagMode = 'local' | 'cloud' | 'none';

export interface LocalRagSettings {
  apiBase: string;
  apiKey: string;
  embeddingModel: string;
  inferenceModel: string;
}

export interface CloudRagSettings {
  apiKey: string;
  model: string;
}

export interface RagConfig {
  mode: RagMode;
  local: LocalRagSettings;
  cloud: CloudRagSettings;
}

export interface ServerConfig {
  /**
   * 用户的工作区根目录（即包含 .vscode/.knowledge 的项目路径）
   */
  workspaceRoot: string;
  /**
   * graph.sqlite 的绝对路径
   */
  dbPath: string;
  /**
   * 控制日志输出的级别
   */
  logLevel: LogLevel;
  /**
   * MCP Server 对外暴露的版本号
   */
  serverVersion: string;
  /**
   * RAG 相关配置
   */
  rag: RagConfig;
}

type RawArgs = {
  workspace?: string;
  dbPath?: string;
  logLevel?: LogLevel;
  ragMode?: string;
  ragApiBase?: string;
  ragApiKey?: string;
  ragEmbeddingModel?: string;
  ragInferenceModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  helpRequested?: boolean;
};

const USAGE = `
VibeKnowledge MCP Server

用法：
  vibeknowledge-mcp [选项]

选项：
  -w, --workspace <path>   指定工作区根目录（默认为当前工作目录）
  --db <path>              指定 graph.sqlite 文件路径（默认 <workspace>/.vscode/.knowledge/graph.sqlite）
  --log-level <level>      设置日志级别：debug | info | error（默认 info）
  --rag-mode <mode>        RAG 模式：local / cloud / none，默认读取 VS Code 设置（默认为 local）
  --rag-api-base <url>     本地 RAG 的 API Base（默认读取 VS Code 设置，或 http://localhost:8000/v1）
  --rag-api-key <key>      本地 RAG 的 API Key（默认读取 VS Code 设置）
  --rag-embedding-model <name>  本地 RAG 使用的 embedding 模型
  --rag-inference-model <name>  本地 RAG 使用的对话模型
  --gemini-api-key <key>   云端 RAG（Gemini）的 API Key
  --gemini-model <name>    云端 RAG 使用的模型（默认 gemini-2.5-flash）
  -h, --help               查看帮助说明
`.trim();

export function loadConfig(argv: string[] = process.argv.slice(2)): ServerConfig {
  const raw = parseArgs(argv);

  if (raw.helpRequested) {
    console.error(USAGE);
    process.exit(0);
  }

  const workspaceRoot = resolve(
    raw.workspace ??
      process.env.VIBEKNOWLEDGE_WORKSPACE ??
      process.cwd()
  );

  const dbPath = resolve(
    raw.dbPath ?? join(workspaceRoot, '.vscode', '.knowledge', 'graph.sqlite')
  );

  const settings = readVsCodeSettings(workspaceRoot);

  const ragMode = normalizeRagMode(
    raw.ragMode ??
      process.env.VIBEKNOWLEDGE_RAG_MODE ??
      (settings['knowledgeGraph.rag.mode'] as string | undefined) ??
      'local'
  );

  const rag: RagConfig = {
    mode: ragMode,
    local: {
      apiBase:
        raw.ragApiBase ??
        process.env.VIBEKNOWLEDGE_RAG_API_BASE ??
        (settings['knowledgeGraph.rag.local.apiBase'] as string | undefined) ??
        'http://localhost:8000/v1',
      apiKey:
        raw.ragApiKey ??
        process.env.VIBEKNOWLEDGE_RAG_API_KEY ??
        (settings['knowledgeGraph.rag.local.apiKey'] as string | undefined) ??
        '',
      embeddingModel:
        raw.ragEmbeddingModel ??
        process.env.VIBEKNOWLEDGE_RAG_EMBEDDING ??
        (settings['knowledgeGraph.rag.local.embeddingModel'] as string | undefined) ??
        'text-embedding-3-small',
      inferenceModel:
        raw.ragInferenceModel ??
        process.env.VIBEKNOWLEDGE_RAG_INFERENCE ??
        (settings['knowledgeGraph.rag.local.inferenceModel'] as string | undefined) ??
        'gpt-4.1'
    },
    cloud: {
      apiKey:
        raw.geminiApiKey ??
        process.env.VIBEKNOWLEDGE_GEMINI_API_KEY ??
        (settings['knowledgeGraph.gemini.apiKey'] as string | undefined) ??
        '',
      model:
        raw.geminiModel ??
        process.env.VIBEKNOWLEDGE_GEMINI_MODEL ??
        (settings['knowledgeGraph.gemini.model'] as string | undefined) ??
        'gemini-2.5-flash'
    }
  };

  return {
    workspaceRoot,
    dbPath,
    logLevel: raw.logLevel ?? 'info',
    serverVersion:
      typeof packageJson.version === 'string' ? packageJson.version : '0.0.0',
    rag
  };
}

function parseArgs(argv: string[]): RawArgs {
  const result: RawArgs = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '-w':
      case '--workspace':
        result.workspace = expectNextValue(arg, argv[++i]);
        break;
      case '--db':
      case '--db-path':
        result.dbPath = expectNextValue(arg, argv[++i]);
        break;
      case '--log-level': {
        const value = expectNextValue(arg, argv[++i]);
        if (!isLogLevel(value)) {
          throw new Error(
            `无效的日志级别：${value}，可选项为 debug | info | error`
          );
        }
        result.logLevel = value;
        break;
      }
      case '--rag-mode':
        result.ragMode = expectNextValue(arg, argv[++i]);
        break;
      case '--rag-api-base':
        result.ragApiBase = expectNextValue(arg, argv[++i]);
        break;
      case '--rag-api-key':
        result.ragApiKey = expectNextValue(arg, argv[++i]);
        break;
      case '--rag-embedding-model':
        result.ragEmbeddingModel = expectNextValue(arg, argv[++i]);
        break;
      case '--rag-inference-model':
        result.ragInferenceModel = expectNextValue(arg, argv[++i]);
        break;
      case '--gemini-api-key':
        result.geminiApiKey = expectNextValue(arg, argv[++i]);
        break;
      case '--gemini-model':
        result.geminiModel = expectNextValue(arg, argv[++i]);
        break;
      case '-h':
      case '--help':
        result.helpRequested = true;
        break;
      default:
        if (arg.startsWith('-')) {
          throw new Error(`未知参数：${arg}`);
        }
        // 允许用户只传一个路径作为 workspace
        result.workspace = arg;
        break;
    }
  }

  return result;
}

function expectNextValue(flag: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${flag} 需要一个值`);
  }
  return value;
}

function isLogLevel(value: string): value is LogLevel {
  return value === 'debug' || value === 'info' || value === 'error';
}

function normalizeRagMode(value: string): RagMode {
  if (value === 'cloud') return 'cloud';
  if (value === 'local') return 'local';
  return 'none';
}

function readVsCodeSettings(workspaceRoot: string): Record<string, unknown> {
  const settingsPath = join(workspaceRoot, '.vscode', 'settings.json');
  if (!existsSync(settingsPath)) {
    return {};
  }
  try {
    const content = readFileSync(settingsPath, 'utf-8');
    const cleaned = stripJsonComments(content);
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

