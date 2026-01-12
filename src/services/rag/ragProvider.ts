import { SearchResult, QuestionAnswerResult, StoreInfo, IndexedFile } from './types';

export interface IRAGProvider {
    initialize(workspaceRoot: string): Promise<void>;
    isFileSupported(filePath: string): boolean;
    indexFile(filePath: string, workspaceRoot: string): Promise<void>;
    removeFileFromIndex(filePath: string, workspaceRoot: string): Promise<void>;
    searchDocuments(query: string): Promise<SearchResult[]>;
    askQuestion(question: string): Promise<QuestionAnswerResult>;
    reindexAll(): Promise<void>;
    dispose(): void;
    getStoreInfo(): StoreInfo | null;
    getIndexedFiles(): IndexedFile[];
    getStoreInfoFromCloud(): Promise<{
        storeName: string;
        displayName: string | undefined;
        activeDocumentsCount: number;
        pendingDocumentsCount: number;
        failedDocumentsCount: number;
      } | null>;
    testConnection(): Promise<boolean>;
}
