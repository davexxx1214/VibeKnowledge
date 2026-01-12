import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GeminiClient } from './geminiClient';
import { DatabaseService } from './database';
import { IRAGProvider } from './rag/ragProvider';
import { CloudRAGProvider } from './rag/cloudRagProvider';
import { LocalRAGProvider } from './rag/localRagProvider';
import { SearchResult, QuestionAnswerResult, StoreInfo, IndexedFile } from './rag/types';

export { SearchResult, QuestionAnswerResult, StoreInfo, IndexedFile };

/**
 * RAG Service - Facade for RAG Providers
 */
export class RAGService {
  private dbService: DatabaseService;
  private geminiClient: GeminiClient;
  private provider: IRAGProvider | null = null;
  private fileWatcher: vscode.FileSystemWatcher | null = null;
  private workspaceRoot: string = '';

  constructor(dbService: DatabaseService, geminiClient: GeminiClient) {
    this.dbService = dbService;
    this.geminiClient = geminiClient;
  }

  /**
   * 初始化 RAG 服务
   */
  public async initialize(workspaceRoot: string): Promise<void> {
    try {
      this.workspaceRoot = workspaceRoot;
      console.log('Initializing RAG Service...');

      // Check config to decide provider
      const config = vscode.workspace.getConfiguration('knowledgeGraph.rag');
      const mode = config.get<string>('mode', 'cloud');

      if (mode === 'local') {
        console.log('Using Local RAG Provider');
        this.provider = new LocalRAGProvider(this.dbService);
      } else {
        console.log('Using Cloud RAG Provider (Gemini)');
        // Check if Gemini is initialized for Cloud mode
        const client = this.geminiClient.getClient();
        if (!client) {
           console.warn('Gemini client not initialized for Cloud RAG.');
           // We might still allow initialization but methods will fail or prompt user
           // But keeping original behavior:
           throw new Error('Gemini client not initialized');
        }
        this.provider = new CloudRAGProvider(this.dbService, this.geminiClient);
      }

      await this.provider.initialize(workspaceRoot);

      // 设置文件监听器
      this.setupFileWatcher(workspaceRoot);

      // 执行初始扫描
      await this.initialScan(workspaceRoot);

      console.log('✅ RAG Service initialized successfully');
    } catch (error) {
      console.error('❌ RAG Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * 设置文件监听器
   */
  private setupFileWatcher(workspaceRoot: string): void {
    const knowledgeFolder = path.join(workspaceRoot, 'Knowledge');
    
    if (!fs.existsSync(knowledgeFolder)) {
      fs.mkdirSync(knowledgeFolder, { recursive: true });
    }

    const pattern = new vscode.RelativePattern(knowledgeFolder, '**/*');
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

    this.fileWatcher.onDidCreate(async (uri) => {
      console.log(`File created: ${uri.fsPath}`);
      try {
          if (!this.provider?.isFileSupported(uri.fsPath)) {
            console.log(`Skipping unsupported file type: ${uri.fsPath}`);
            return;
          }
          await this.provider.indexFile(uri.fsPath, workspaceRoot);
      } catch (e) {
          console.error('Error indexing created file:', e);
      }
    });

    this.fileWatcher.onDidChange(async (uri) => {
      console.log(`File changed: ${uri.fsPath}`);
      try {
          if (!this.provider?.isFileSupported(uri.fsPath)) {
            console.log(`Skipping unsupported file type: ${uri.fsPath}`);
            return;
          }
          await this.provider.indexFile(uri.fsPath, workspaceRoot);
      } catch (e) {
           console.error('Error indexing changed file:', e);
      }
    });

    this.fileWatcher.onDidDelete(async (uri) => {
      console.log(`File deleted: ${uri.fsPath}`);
      try {
          await this.provider?.removeFileFromIndex(uri.fsPath, workspaceRoot);
      } catch (e) {
          console.error('Error removing deleted file:', e);
      }
    });

    console.log('File watcher set up successfully');
  }

  /**
   * 初始扫描
   */
  private async initialScan(workspaceRoot: string): Promise<void> {
    console.log('Performing initial scan of Knowledge folder...');
    
    const knowledgeFolder = path.join(workspaceRoot, 'Knowledge');
    if (!fs.existsSync(knowledgeFolder)) {
      return;
    }

    const files = this.scanDirectory(knowledgeFolder);
    const indexedFiles = new Set(
      this.provider ? this.provider.getIndexedFiles().map(f => f.filePath) : []
    );
    
    let newFileCount = 0;
    for (const filePath of files) {
      const relativePath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
      if (!indexedFiles.has(relativePath)) {
        await this.provider?.indexFile(filePath, workspaceRoot);
        newFileCount++;
      }
    }

    if (newFileCount === 0) {
      console.log('All files are up to date');
    } else {
      console.log(`Indexed ${newFileCount} new files`);
    }
  }

  private scanDirectory(dirPath: string): string[] {
    const files: string[] = [];

    const scan = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (entry.isFile()) {
          if (!this.provider || this.provider.isFileSupported(fullPath)) {
            files.push(fullPath);
          }
        }
      }
    };

    scan(dirPath);
    return files;
  }

  // Delegates

  public async searchDocuments(query: string): Promise<SearchResult[]> {
    return this.provider ? this.provider.searchDocuments(query) : [];
  }

  public async askQuestion(question: string): Promise<QuestionAnswerResult> {
    if (!this.provider) throw new Error('RAG Service not initialized');
    return this.provider.askQuestion(question);
  }

  public getStoreInfo(): StoreInfo | null {
    return this.provider ? this.provider.getStoreInfo() : null;
  }

  public async getStoreInfoFromCloud() {
    return this.provider ? this.provider.getStoreInfoFromCloud() : null;
  }

  public getIndexedFiles(): IndexedFile[] {
    return this.provider ? this.provider.getIndexedFiles() : [];
  }

  public getMode(): 'cloud' | 'local' {
    const config = vscode.workspace.getConfiguration('knowledgeGraph.rag');
    return config.get<string>('mode', 'cloud') as 'cloud' | 'local';
  }

  public async reindexAll(): Promise<void> {
    if (!this.provider) return;
    await this.provider.reindexAll();
    await this.initialScan(this.workspaceRoot);
  }

  public async testConnection(): Promise<boolean> {
    return this.provider ? this.provider.testConnection() : false;
  }

  public dispose(): void {
    this.fileWatcher?.dispose();
    this.provider?.dispose();
  }
}
