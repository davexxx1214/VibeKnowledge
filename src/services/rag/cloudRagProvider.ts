import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { GeminiClient } from '../geminiClient';
import { DatabaseService } from '../database';
import { lookup as lookupMimeType } from 'mime-types';
import { IRAGProvider } from './ragProvider';
import { SearchResult, QuestionAnswerResult, StoreInfo, IndexedFile } from './types';
import { t } from '../../i18n/i18nService';

const APPLICATION_MIME_TYPES = [
  'application/dart',
  'application/ecmascript',
  'application/json',
  'application/ms-java',
  'application/msword',
  'application/pdf',
  'application/sql',
  'application/typescript',
  'application/vnd.curl',
  'application/vnd.dart',
  'application/vnd.ibm.secure-container',
  'application/vnd.jupyter',
  'application/vnd.ms-excel',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
  'application/x-csh',
  'application/x-hwp',
  'application/x-hwp-v5',
  'application/x-latex',
  'application/x-php',
  'application/x-powershell',
  'application/x-sh',
  'application/x-shellscript',
  'application/x-tex',
  'application/x-zsh',
  'application/xml',
  'application/zip',
].map(type => type.toLowerCase());

const TEXT_MIME_TYPES = [
  'text/1d-interleaved-parityfec',
  'text/red',
  'text/sgml',
  'text/cache-manifest',
  'text/calendar',
  'text/cql',
  'text/cql-extension',
  'text/cql-identifier',
  'text/css',
  'text/csv',
  'text/csv-schema',
  'text/dns',
  'text/encaprtp',
  'text/enriched',
  'text/example',
  'text/fhirpath',
  'text/flexfec',
  'text/fwdred',
  'text/gff3',
  'text/grammar-ref-list',
  'text/hl7v2',
  'text/html',
  'text/javascript',
  'text/jcr-cnd',
  'text/jsx',
  'text/markdown',
  'text/mizar',
  'text/n3',
  'text/parameters',
  'text/parityfec',
  'text/php',
  'text/plain',
  'text/provenance-notation',
  'text/prs.fallenstein.rst',
  'text/prs.lines.tag',
  'text/prs.prop.logic',
  'text/raptorfec',
  'text/rfc822-headers',
  'text/rtf',
  'text/rtp-enc-aescm128',
  'text/rtploopback',
  'text/rtx',
  'text/shaclc',
  'text/shex',
  'text/spdx',
  'text/strings',
  'text/t140',
  'text/tab-separated-values',
  'text/texmacs',
  'text/troff',
  'text/tsv',
  'text/tsx',
  'text/turtle',
  'text/ulpfec',
  'text/uri-list',
  'text/vcard',
  'text/vnd.dmclientscript',
  'text/vnd.iptc.nitf',
  'text/vnd.iptc.newsml',
  'text/vnd.a',
  'text/vnd.abc',
  'text/vnd.ascii-art',
  'text/vnd.curl',
  'text/vnd.debian.copyright',
  'text/vnd.dvb.subtitle',
  'text/vnd.esmertec.theme-descriptor',
  'text/vnd.exchangeable',
  'text/vnd.familysearch.gedcom',
  'text/vnd.ficlab.flt',
  'text/vnd.fly',
  'text/vnd.fmi.flexstor',
  'text/vnd.gml',
  'text/vnd.graphviz',
  'text/vnd.hans',
  'text/vnd.hgl',
  'text/vnd.in3d.3dml',
  'text/vnd.in3d.spot',
  'text/vnd.latex-z',
  'text/vnd.motorola.reflex',
  'text/vnd.ms-mediapackage',
  'text/vnd.net2phone.commcenter.command',
  'text/vnd.radisys.msml-basic-layout',
  'text/vnd.senx.warpscript',
  'text/vnd.sosi',
  'text/vnd.sun.j2me.app-descriptor',
  'text/vnd.trolltech.linguist',
  'text/vnd.wap.si',
  'text/vnd.wap.sl',
  'text/vnd.wap.wml',
  'text/vnd.wap.wmlscript',
  'text/vtt',
  'text/wgsl',
  'text/x-asm',
  'text/x-bibtex',
  'text/x-boo',
  'text/x-c',
  'text/x-c++hdr',
  'text/x-c++src',
  'text/x-cassandra',
  'text/x-chdr',
  'text/x-coffeescript',
  'text/x-component',
  'text/x-csh',
  'text/x-csharp',
  'text/x-csrc',
  'text/x-cuda',
  'text/x-d',
  'text/x-diff',
  'text/x-dsrc',
  'text/x-emacs-lisp',
  'text/x-erlang',
  'text/x-gff3',
  'text/x-go',
  'text/x-haskell',
  'text/x-java',
  'text/x-java-properties',
  'text/x-java-source',
  'text/x-kotlin',
  'text/x-lilypond',
  'text/x-lisp',
  'text/x-literate-haskell',
  'text/x-lua',
  'text/x-moc',
  'text/x-objcsrc',
  'text/x-pascal',
  'text/x-pcs-gcd',
  'text/x-perl',
  'text/x-perl-script',
  'text/x-python',
  'text/x-python-script',
  'text/x-r-markdown',
  'text/x-rsrc',
  'text/x-rst',
  'text/x-ruby-script',
  'text/x-rust',
  'text/x-sass',
  'text/x-scala',
  'text/x-scheme',
  'text/x-script.python',
  'text/x-scss',
  'text/x-setext',
  'text/x-sfv',
  'text/x-sh',
  'text/x-siesta',
  'text/x-sos',
  'text/x-sql',
  'text/x-swift',
  'text/x-tcl',
  'text/x-tex',
  'text/x-vbasic',
  'text/x-vcalendar',
  'text/xml',
  'text/xml-dtd',
  'text/xml-external-parsed-entity',
  'text/yaml',
].map(type => type.toLowerCase());

const CLOUD_SUPPORTED_MIME_TYPES = new Set<string>([
  ...APPLICATION_MIME_TYPES,
  ...TEXT_MIME_TYPES,
]);

export class CloudRAGProvider implements IRAGProvider {
  private dbService: DatabaseService;
  private geminiClient: GeminiClient;
  private indexedFiles: Map<string, IndexedFile> = new Map();
  private indexingFiles: Set<string> = new Set();
  private storeId: string = '';
  private storeName: string = '';  // fileSearchStores/xxx 格式
  private projectName: string = '';
  private workspaceRoot: string = '';

  constructor(dbService: DatabaseService, geminiClient: GeminiClient) {
    this.dbService = dbService;
    this.geminiClient = geminiClient;
  }

  public async initialize(workspaceRoot: string): Promise<void> {
    this.workspaceRoot = workspaceRoot;
    this.projectName = path.basename(workspaceRoot);

    console.log('Initializing Cloud RAG Provider...');
    
    const client = this.geminiClient.getClient();
    if (!client) {
      throw new Error('Gemini client not initialized');
    }

    this.createStoreInfoTable();
    this.createIndexTable();
    
    await this.initializeStore();
    await this.loadIndexedFilesFromDB();
    
    // Note: File watching and initial scan are handled by the main RAGService or we should move it here?
    // The original RAGService handled file watching. It's better if the Provider handles the *actions* but maybe the Service handles the *watching*.
    // For now, let's assume the Service calls indexFile/removeFileFromIndex.
  }

  public isFileSupported(filePath: string): boolean {
    return this.getSupportedMimeType(filePath) !== null;
  }

  private createIndexTable(): void {
    const db = this.dbService.getDatabase();
    db.run(`
      CREATE TABLE IF NOT EXISTS indexed_files (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        indexed_at INTEGER NOT NULL,
        gemini_file_uri TEXT NOT NULL,
        store_id TEXT NOT NULL
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_file_path ON indexed_files(file_path)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_store_id ON indexed_files(store_id)`);
    this.dbService.save();
  }

  private createStoreInfoTable(): void {
    const db = this.dbService.getDatabase();
    try {
        // Check for old schema and migrate if needed (from original code)
        const tableInfo = db.exec(`PRAGMA table_info(rag_store_info)`);
        if (tableInfo.length > 0 && tableInfo[0].values.length > 0) {
            const columns = tableInfo[0].values.map(row => row[1] as string);
            if (!columns.includes('store_name')) {
                db.run(`DROP TABLE IF EXISTS rag_store_info`);
                db.run(`DROP TABLE IF EXISTS indexed_files`);
            }
        }
    } catch (e) {}

    db.run(`
      CREATE TABLE IF NOT EXISTS rag_store_info (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL UNIQUE,
        store_name TEXT NOT NULL,
        project_name TEXT NOT NULL,
        workspace_root TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_sync_at INTEGER NOT NULL,
        file_count INTEGER NOT NULL DEFAULT 0
      )
    `);
    this.dbService.save();
  }

  private async initializeStore(): Promise<void> {
    const client = this.geminiClient.getClient();
    if (!client) return;

    this.storeId = this.generateProjectHash(this.workspaceRoot);
    const db = this.dbService.getDatabase();
    
    const result = db.exec(`SELECT * FROM rag_store_info WHERE store_id = ?`, [this.storeId]);

    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0];
      this.storeName = row[2] as string;
    } else {
      const fileSearchStore = await client.fileSearchStores.create({
        config: { displayName: `vibecoding_${this.projectName}_${this.storeId}` }
      });

      this.storeName = fileSearchStore.name || '';
      if (!this.storeName) throw new Error('Store name is empty');

      const now = Date.now();
      db.run(
        `INSERT INTO rag_store_info (id, store_id, store_name, project_name, workspace_root, created_at, last_sync_at, file_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [`store_${this.storeId}`, this.storeId, this.storeName, this.projectName, this.workspaceRoot, now, now, 0]
      );
      this.dbService.save();
    }
  }

  private generateProjectHash(workspaceRoot: string): string {
    return crypto.createHash('md5').update(workspaceRoot).digest('hex').substring(0, 8);
  }

  private async loadIndexedFilesFromDB(): Promise<void> {
    const db = this.dbService.getDatabase();
    const result = db.exec(`SELECT * FROM indexed_files WHERE store_id = ?`, [this.storeId]);

    if (result.length > 0 && result[0].values.length > 0) {
      for (const row of result[0].values) {
        const file: IndexedFile = {
          id: row[0] as string,
          filePath: row[1] as string,
          fileName: row[2] as string,
          fileSize: row[3] as number,
          mimeType: row[4] as string,
          indexedAt: row[5] as number,
          geminiFileUri: row[6] as string,
          storeId: row[7] as string,
        };
        this.indexedFiles.set(file.filePath, file);
      }
    }
  }

  public async indexFile(filePath: string, workspaceRoot: string): Promise<void> {
    const client = this.geminiClient.getClient();
    if (!client) return;

    if (!fs.existsSync(filePath)) return;
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) return;

    const relativePath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
    const fileName = path.basename(filePath);
    const mimeType = this.getSupportedMimeType(filePath);
    if (!mimeType) {
      console.warn(`[CloudRAG] Unsupported file type, skipping: ${fileName}`);
      return;
    }

    if (this.indexingFiles.has(relativePath)) {
      console.log(`[CloudRAG] Skip duplicate indexing request: ${relativePath}`);
      return;
    }
    this.indexingFiles.add(relativePath);

    try {
      const existingFile = this.indexedFiles.get(relativePath);
      if (existingFile) {
        await this.deleteCloudFile(existingFile.geminiFileUri, relativePath, fileName);
      }

      // Upload to Gemini
      let operation = await client.fileSearchStores.uploadToFileSearchStore({
        file: filePath,
        fileSearchStoreName: this.storeName,
        config: {
          displayName: fileName,
          mimeType,
          customMetadata: [
            {
              key: 'relativePath',
              stringValue: relativePath,
            }
          ],
        }
      });

      let attempts = 0;
      while (!operation.done && attempts < 60) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await client.operations.get({ operation });
        attempts++;
      }

      if (!operation.done) {
        throw new Error(t().extension.rag.indexFile.uploadTimeout(fileName));
      }

      const geminiFileUri =
        operation.response?.documentName ||
        operation.result?.name ||
        operation.result?.documentName ||
        null;

      if (!geminiFileUri) {
        console.error('[CloudRAG] Failed to obtain Gemini file URI after upload, aborting index.');
        return;
      }
      const now = Date.now();
      const fileId = this.generateDeterministicFileId(relativePath);

      const indexedFile: IndexedFile = {
        id: fileId,
        filePath: relativePath,
        fileName,
        fileSize: stats.size,
        mimeType,
        indexedAt: now,
        geminiFileUri,
        storeId: this.storeId,
      };

      const db = this.dbService.getDatabase();
      db.run(
        `INSERT OR REPLACE INTO indexed_files (id, file_path, file_name, file_size, mime_type, indexed_at, gemini_file_uri, store_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [fileId, relativePath, fileName, stats.size, mimeType, now, geminiFileUri, this.storeId]
      );
      this.dbService.save();

      this.indexedFiles.set(relativePath, indexedFile);
      await this.updateStoreFileCount();
      vscode.window.showInformationMessage(t().extension.rag.indexFile.success(fileName));
    } finally {
      this.indexingFiles.delete(relativePath);
    }
  }

  public async removeFileFromIndex(filePath: string, workspaceRoot: string): Promise<void> {
    const relativePath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
    const fileName = path.basename(filePath);
    
    console.log(`[CloudRAG] Removing file from index: ${relativePath}`);

    // 1. Try to get Gemini File URI from memory cache or DB
    let geminiFileUri: string | undefined;
    const cachedFile = this.indexedFiles.get(relativePath);
    
    if (cachedFile) {
      geminiFileUri = cachedFile.geminiFileUri;
    } else {
      const db = this.dbService.getDatabase();
      const result = db.exec(
        `SELECT gemini_file_uri FROM indexed_files WHERE file_path = ? AND store_id = ?`,
        [relativePath, this.storeId]
      );
      if (result.length > 0 && result[0].values.length > 0) {
        geminiFileUri = result[0].values[0][0] as string;
      }
    }

    if (!geminiFileUri) {
        console.log(`[CloudRAG] File not found in index: ${relativePath}`);
        return;
    }

    // 2. Delete from Cloud (if we have the URI)
    await this.deleteCloudFile(geminiFileUri, relativePath, fileName);

    // 3. Delete from Local DB and Cache
    const db = this.dbService.getDatabase();
    db.run(`DELETE FROM indexed_files WHERE file_path = ? AND store_id = ?`, [relativePath, this.storeId]);
    this.dbService.save();
    this.indexedFiles.delete(relativePath);
    await this.updateStoreFileCount();
    
    vscode.window.showInformationMessage(t().extension.rag.removeFile.success(fileName));
  }

  private async updateStoreFileCount(): Promise<void> {
    const fileCount = this.indexedFiles.size;
    const now = Date.now();
    const db = this.dbService.getDatabase();
    db.run(`UPDATE rag_store_info SET file_count = ?, last_sync_at = ? WHERE store_id = ?`, [fileCount, now, this.storeId]);
    this.dbService.save();
  }

  private generateDeterministicFileId(relativePath: string): string {
    return `file_${this.storeId}_${relativePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  private async deleteCloudFile(geminiFileUri?: string, relativePath?: string, fileName?: string): Promise<void> {
    const client = this.geminiClient.getClient();
    if (!client || !this.storeName) return;

    let targetDocumentName = geminiFileUri;

    if (!targetDocumentName || !targetDocumentName.startsWith('fileSearchStores/')) {
      targetDocumentName = await this.findDocumentName(relativePath, fileName);
      if (!targetDocumentName) {
        console.warn(`[CloudRAG] Unable to resolve cloud document for ${relativePath || fileName || 'unknown file'}, skip deletion.`);
        return;
      }
    }

    try {
      const deleteParams: any = {
        name: targetDocumentName,
        config: { force: true },
      };
      await client.fileSearchStores.documents.delete(deleteParams);
      console.log(`[CloudRAG] Deleted cloud document: ${targetDocumentName}`);
    } catch (error: any) {
      if (error.status === 404) {
        console.warn(`[CloudRAG] Cloud document already removed: ${targetDocumentName}`);
      } else {
        console.error(`[CloudRAG] Failed to delete cloud document ${targetDocumentName}:`, error);
      }
    }
  }

  private async findDocumentName(relativePath?: string, fileName?: string): Promise<string | null> {
    const client = this.geminiClient.getClient();
    if (!client || !this.storeName) return null;

    try {
      const pager = await client.fileSearchStores.documents.list({ parent: this.storeName });
      for await (const document of pager) {
        if (!document?.name) continue;

        const metadataMatch = relativePath && document.customMetadata?.some(
          meta => meta.key === 'relativePath' && meta.stringValue === relativePath
        );

        if (metadataMatch) {
          return document.name;
        }

        if (!document.customMetadata?.length && fileName && document.displayName === fileName) {
          return document.name;
        }
      }
    } catch (error) {
      console.error('[CloudRAG] Failed to list documents when resolving cloud file:', error);
    }

    return null;
  }

  private getSupportedMimeType(filePath: string): string | null {
    const mime = lookupMimeType(filePath);
    if (!mime) return null;
    const normalized = mime.toLowerCase();
    return CLOUD_SUPPORTED_MIME_TYPES.has(normalized) ? normalized : null;
  }

  public async searchDocuments(query: string): Promise<SearchResult[]> {
    const client = this.geminiClient.getClient();
    if (!client || !this.storeName) throw new Error('Not initialized');

    const response = await client.models.generateContent({
      model: this.geminiClient.getConfiguredModel(),
      contents: query,
      config: { tools: [{ fileSearch: { fileSearchStoreNames: [this.storeName] } }] }
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const resultsMap = new Map<string, SearchResult>();

    if (groundingMetadata && groundingMetadata.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        const title = chunk.retrievedContext?.title;
        const uri = chunk.retrievedContext?.uri;
        
        let matchedFile: IndexedFile | null = null;
        for (const file of this.indexedFiles.values()) {
          if (file.fileName === title || file.geminiFileUri === uri) {
            matchedFile = file;
            break;
          }
        }

        if (matchedFile && !resultsMap.has(matchedFile.filePath)) {
          resultsMap.set(matchedFile.filePath, {
            fileName: matchedFile.fileName,
            filePath: matchedFile.filePath,
            snippet: response.text || '',
            relevance: 90
          });
        }
      }
    }
    return Array.from(resultsMap.values());
  }

  public async askQuestion(question: string): Promise<QuestionAnswerResult> {
    const client = this.geminiClient.getClient();
    if (!client || !this.storeName) throw new Error('Not initialized');

    const response = await client.models.generateContent({
      model: this.geminiClient.getConfiguredModel(),
      contents: question,
      config: { tools: [{ fileSearch: { fileSearchStoreNames: [this.storeName] } }] }
    });

    const answer = response.text || t().extension.rag.askQuestion.fallbackAnswer;
    const sources: string[] = [];
    const citations: string[] = [];

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata && groundingMetadata.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        const title = chunk.retrievedContext?.title;
        if (title) {
          sources.push(title);
          citations.push(t().extension.rag.askQuestion.citationSource(title));
        }
      }
    }

    return {
      answer,
      sources: Array.from(new Set(sources)),
      citations: Array.from(new Set(citations))
    };
  }

  public async reindexAll(): Promise<void> {
     const client = this.geminiClient.getClient();
     if (!client) return;
     
     if (this.storeName) {
         try { await client.fileSearchStores.delete({ name: this.storeName }); } catch(e) {}
     }
     
     const db = this.dbService.getDatabase();
     db.run(`DELETE FROM indexed_files WHERE store_id = ?`, [this.storeId]);
     db.run(`DELETE FROM rag_store_info WHERE store_id = ?`, [this.storeId]);
     this.dbService.save();
     this.indexedFiles.clear();
     this.storeName = '';
     
     await this.initializeStore();
     // Re-scan is initiated by service
  }

  public getStoreInfo(): StoreInfo | null {
    const db = this.dbService.getDatabase();
    const result = db.exec(`SELECT * FROM rag_store_info WHERE store_id = ?`, [this.storeId]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const row = result[0].values[0];
    return {
      id: row[0] as string,
      storeId: row[1] as string,
      storeName: row[2] as string,
      projectName: row[3] as string,
      workspaceRoot: row[4] as string,
      createdAt: row[5] as number,
      lastSyncAt: row[6] as number,
      fileCount: row[7] as number,
    };
  }
  
  public getIndexedFiles(): IndexedFile[] {
      return Array.from(this.indexedFiles.values());
  }
  
  public async getStoreInfoFromCloud(): Promise<{ storeName: string; displayName: string | undefined; activeDocumentsCount: number; pendingDocumentsCount: number; failedDocumentsCount: number; } | null> {
      const client = this.geminiClient.getClient();
      if (!client || !this.storeName) return null;
      try {
        // 1. Get Cloud Store Info
        const store = await client.fileSearchStores.get({ name: this.storeName });
        
        // 2. Sync local store info with cloud status (optional but good for consistency)
        // If cloud count differs significantly, maybe we should warn or re-sync?
        // For now, just return the real cloud data.
        
        return {
          storeName: store.name || this.storeName,
          displayName: store.displayName,
          // Ensure we parse the string counts correctly, default to 0
          activeDocumentsCount: typeof store.activeDocumentsCount === 'number' ? store.activeDocumentsCount : parseInt(store.activeDocumentsCount || '0'),
          pendingDocumentsCount: typeof store.pendingDocumentsCount === 'number' ? store.pendingDocumentsCount : parseInt(store.pendingDocumentsCount || '0'),
          failedDocumentsCount: typeof store.failedDocumentsCount === 'number' ? store.failedDocumentsCount : parseInt(store.failedDocumentsCount || '0'),
        };
      } catch (e) { 
          console.error('[CloudRAG] Failed to get store info from cloud:', e);
          return null; 
      }
  }

  public async testConnection(): Promise<boolean> {
    try {
        return await this.geminiClient.testConnection();
    } catch (e) {
        return false;
    }
  }

  public dispose(): void {}
}

