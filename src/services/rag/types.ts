/**
 * Store 信息
 */
export interface StoreInfo {
  id: string;
  storeId: string;  // Gemini File Search Store 的真实 ID 或 Local Store ID
  storeName: string;  // Store 的完整名称（如 fileSearchStores/xxx 或 local）
  projectName: string;
  workspaceRoot: string;
  createdAt: number;
  lastSyncAt: number;
  fileCount: number;
}

/**
 * 已索引文件的信息
 */
export interface IndexedFile {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  indexedAt: number;
  geminiFileUri: string;  // Gemini 返回的文件 URI 或 Local ID
  storeId: string;  // 所属的 Store ID
}

/**
 * 搜索结果
 */
export interface SearchResult {
  fileName: string;
  filePath: string;
  snippet: string;
  relevance: number;
}

/**
 * 问答结果
 */
export interface QuestionAnswerResult {
  answer: string;
  sources: string[];
  citations: string[];
}

