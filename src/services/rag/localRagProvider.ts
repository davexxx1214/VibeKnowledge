import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
import { t } from '../../i18n/i18nService';
import { DatabaseService } from '../database';
import { IRAGProvider } from './ragProvider';
import { SearchResult, QuestionAnswerResult, StoreInfo, IndexedFile } from './types';

interface Chunk {
    id: string;
    text: string;
    vector: number[];
    chunkIndex: number;
}

export class LocalRAGProvider implements IRAGProvider {
    private static readonly SUPPORTED_TEXT_EXTENSIONS = new Set<string>([
        '.md', '.markdown', '.txt', '.json', '.ts', '.tsx', '.js', '.jsx',
        '.py', '.java', '.kt', '.kts', '.go', '.rs', '.rb', '.php', '.swift',
        '.scala', '.c', '.h', '.hpp', '.hh', '.cpp', '.cc', '.cxx', '.cs',
        '.m', '.mm', '.sh', '.bash', '.zsh', '.ps1', '.psm1', '.csh', '.sql',
        '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.log'
    ]);
    private static readonly SUPPORTED_BINARY_EXTENSIONS = new Set<string>([
        '.pdf', '.doc', '.docx'
    ]);
    private dbService: DatabaseService;
    private workspaceRoot: string = '';
    private projectName: string = '';
    private storeId: string = ''; // Used to identify the local store context
    private apiBase: string = '';
    private apiKey: string = '';
    private embeddingModel: string = '';
    private inferenceModel: string = '';
    
    // Cache for vectors to avoid DB reads on every search
    private vectorCache: Map<string, Chunk[]> = new Map(); // filePath -> Chunks
    private readonly wordExtractor = new WordExtractor();

    constructor(dbService: DatabaseService) {
        this.dbService = dbService;
        this.loadConfig();
    }

    private loadConfig() {
        const config = vscode.workspace.getConfiguration('knowledgeGraph.rag.local');
        this.apiBase = config.get<string>('apiBase', 'http://localhost:8000/v1');
        this.apiKey = config.get<string>('apiKey', '');
        this.embeddingModel = config.get<string>('embeddingModel', 'text-embedding-3-small');
        this.inferenceModel = config.get<string>('inferenceModel', 'gpt-4.1');
        
        // Remove trailing slash from apiBase
        if (this.apiBase.endsWith('/')) {
            this.apiBase = this.apiBase.slice(0, -1);
        }
    }

    public async initialize(workspaceRoot: string): Promise<void> {
        this.workspaceRoot = workspaceRoot;
        this.projectName = path.basename(workspaceRoot);
        this.storeId = 'local_' + this.generateProjectHash(workspaceRoot);

        console.log('Initializing Local RAG Provider...');
        this.loadConfig();

        this.createTables();
        this.loadVectorsToCache();
    }

    private createTables() {
        const db = this.dbService.getDatabase();
        
        // Store Info (reuse rag_store_info but with local specific prefix/type if needed, or just use it as is)
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

        // Indexed Files (reuse indexed_files)
        db.run(`
            CREATE TABLE IF NOT EXISTS indexed_files (
                id TEXT PRIMARY KEY,
                file_path TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                mime_type TEXT NOT NULL,
                indexed_at INTEGER NOT NULL,
                gemini_file_uri TEXT NOT NULL, -- In local mode, we can store 'local' or file hash
                store_id TEXT NOT NULL
            )
        `);

        // Local Vectors Table
        db.run(`
            CREATE TABLE IF NOT EXISTS local_rag_vectors (
                id TEXT PRIMARY KEY,
                file_path TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                chunk_text TEXT NOT NULL,
                vector_json TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                store_id TEXT NOT NULL
            )
        `);

        db.run(`CREATE INDEX IF NOT EXISTS idx_local_vectors_file ON local_rag_vectors(file_path)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_local_vectors_store ON local_rag_vectors(store_id)`);
        
        this.dbService.save();
        this.updateStoreRecord();
    }

    private updateStoreRecord() {
        const db = this.dbService.getDatabase();
        const now = Date.now();
        
        // Check if store exists
        const res = db.exec(`SELECT id FROM rag_store_info WHERE store_id = ?`, [this.storeId]);
        if (res.length === 0 || res[0].values.length === 0) {
            db.run(
                `INSERT INTO rag_store_info (id, store_id, store_name, project_name, workspace_root, created_at, last_sync_at, file_count)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [`store_${this.storeId}`, this.storeId, 'Local Store', this.projectName, this.workspaceRoot, now, now, 0]
            );
        }
        this.dbService.save();
    }

    private loadVectorsToCache() {
        const db = this.dbService.getDatabase();
        const result = db.exec(`SELECT id, file_path, chunk_index, chunk_text, vector_json FROM local_rag_vectors WHERE store_id = ?`, [this.storeId]);
        
        this.vectorCache.clear();
        
        if (result.length > 0 && result[0].values.length > 0) {
            for (const row of result[0].values) {
                try {
                    const filePath = row[1] as string;
                    const vectorJson = row[4] as string;
                    
                    // 防御性检查：确保数据不为空且不是非法字符串
                    if (!vectorJson || vectorJson === 'undefined' || vectorJson === 'null' || vectorJson.trim() === '') {
                        continue;
                    }

                    // 安全解析 JSON，如果解析失败则跳过该条记录
                    let vector: number[];
                    try {
                        // 尝试解析，如果字符串过长导致栈溢出等问题，这里会捕获
                        vector = JSON.parse(vectorJson);
                        
                        // 检查是否为数组
                        if (!Array.isArray(vector)) {
                             console.warn(`Vector for ${row[0]} is not an array, skipping.`);
                             continue;
                        }
                    } catch (e) {
                        console.warn(`Failed to parse vector JSON for ${row[0]} (length: ${vectorJson.length}), skipping.`, e);
                        continue;
                    }

                    const chunk: Chunk = {
                        id: row[0] as string,
                        text: row[3] as string,
                        vector: vector,
                        chunkIndex: row[2] as number
                    };
                    
                    if (!this.vectorCache.has(filePath)) {
                        this.vectorCache.set(filePath, []);
                    }
                    // 检查数组长度，防止单文件 chunk 过多导致 push 失败 (虽然 V8 限制很大，但防御性加上)
                    const chunks = this.vectorCache.get(filePath);
                    if (chunks && chunks.length < 100000) {
                        chunks.push(chunk);
                    } else {
                        console.warn(`Too many chunks for file ${filePath}, skipping chunk ${chunk.chunkIndex}`);
                    }
                } catch (e) {
                    console.error(`Error loading vector row:`, e);
                }
            }
        }
        console.log(`Loaded vectors into cache.`);
    }

    private generateProjectHash(workspaceRoot: string): string {
        return crypto.createHash('md5').update(workspaceRoot).digest('hex').substring(0, 8);
    }

    public isFileSupported(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return LocalRAGProvider.SUPPORTED_TEXT_EXTENSIONS.has(ext)
            || LocalRAGProvider.SUPPORTED_BINARY_EXTENSIONS.has(ext);
    }

    public async indexFile(filePath: string, workspaceRoot: string): Promise<void> {
        if (!this.isFileSupported(filePath)) {
            console.log(`[LocalRAG] Unsupported file type, skipping: ${filePath}`);
            return;
        }
        if (!fs.existsSync(filePath)) return;
        const fileName = path.basename(filePath);
        const ext = path.extname(filePath).toLowerCase();
        let rawContent: string;
        try {
            rawContent = await this.extractTextFromFile(filePath, ext);
        } catch (error) {
            console.error(`[LocalRAG] Failed to extract text from ${filePath}:`, error);
            vscode.window.showErrorMessage(t().extension.rag.indexFile.parseFailed(fileName));
            return;
        }
        const content = rawContent.replace(/\r\n/g, '\n').trim();
        if (!content) {
            console.warn(`[LocalRAG] Extracted content is empty, skip indexing: ${fileName}`);
            return;
        }
        const relativePath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
        const stats = fs.statSync(filePath);
        const mimeType = this.getMimeTypeForExtension(ext);

        // 1. Chunking
        const chunks = this.chunkText(content, 1000, 100); // 1000 chars, 100 overlap
        console.log(`Split ${fileName} into ${chunks.length} chunks.`);

        // 2. Embedding
        const vectors: number[][] = [];
        for (const chunk of chunks) {
            try {
                const vector = await this.getEmbedding(chunk);
                vectors.push(vector);
            } catch (error) {
                console.error(`Failed to embed chunk for ${fileName}:`, error);
                vscode.window.showErrorMessage(t().extension.rag.indexFile.embeddingFailed(fileName));
                return;
            }
        }

        // 3. Save to DB
        const db = this.dbService.getDatabase();
        const now = Date.now();
        
        // Clear existing vectors for this file
        db.run(`DELETE FROM local_rag_vectors WHERE file_path = ? AND store_id = ?`, [relativePath, this.storeId]);

        const dbChunks: Chunk[] = [];

        db.run("BEGIN TRANSACTION");
        for (let i = 0; i < chunks.length; i++) {
            const chunkId = `chunk_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`;
            db.run(
                `INSERT INTO local_rag_vectors (id, file_path, chunk_index, chunk_text, vector_json, created_at, store_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [chunkId, relativePath, i, chunks[i], JSON.stringify(vectors[i]), now, this.storeId]
            );
            
            dbChunks.push({
                id: chunkId,
                text: chunks[i],
                vector: vectors[i],
                chunkIndex: i
            });
        }
        
        // Update indexed_files table
        const fileId = `file_${Date.now()}_${relativePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
        db.run(
            `INSERT OR REPLACE INTO indexed_files (id, file_path, file_name, file_size, mime_type, indexed_at, gemini_file_uri, store_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [fileId, relativePath, fileName, stats.size, mimeType, now, 'local', this.storeId]
        );
        
        db.run("COMMIT");
        this.dbService.save();

        // Update Cache
        this.vectorCache.set(relativePath, dbChunks);
        await this.updateStoreFileCount();
        
        vscode.window.showInformationMessage(t().extension.rag.indexFile.successLocal(fileName));
    }

    private chunkText(text: string, chunkSize: number, overlap: number): string[] {
        const chunks: string[] = [];
        let start = 0;
        while (start < text.length) {
            let end = start + chunkSize;
            if (end > text.length) {
                end = text.length;
            } else {
                // Try to break at newline or space
                const lastNewLine = text.lastIndexOf('\n', end);
                if (lastNewLine > start) {
                    end = lastNewLine;
                } else {
                    const lastSpace = text.lastIndexOf(' ', end);
                    if (lastSpace > start) {
                        end = lastSpace;
                    }
                }
            }
            
            const chunk = text.substring(start, end).trim();
            if (chunk.length > 0) {
                chunks.push(chunk);
            }

            // 如果已经处理到文本末尾，直接结束循环，防止因 overlap 导致死循环
            if (end >= text.length) {
                break;
            }

            start = end - overlap;
            
            // 防御性编程：如果 overlap 设置不当导致 start 没有前进，强制前进以避免死循环
            if (start <= (end - chunkSize)) {
                 start = end; 
            }
        }
        return chunks;
    }

    private async extractTextFromFile(filePath: string, ext: string): Promise<string> {
        if (LocalRAGProvider.SUPPORTED_TEXT_EXTENSIONS.has(ext)) {
            return fs.promises.readFile(filePath, 'utf-8');
        }

        if (ext === '.pdf') {
            const buffer = await fs.promises.readFile(filePath);
            const parsed = await pdfParse(buffer);
            return parsed.text ?? '';
        }

        if (ext === '.docx') {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value ?? '';
        }

        if (ext === '.doc') {
            const document = await this.wordExtractor.extract(filePath);
            return document.getBody() ?? '';
        }

        throw new Error(`Unsupported file extension: ${ext}`);
    }

    private getMimeTypeForExtension(ext: string): string {
        switch (ext) {
            case '.pdf':
                return 'application/pdf';
            case '.doc':
                return 'application/msword';
            case '.docx':
                return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            default:
                return 'text/plain';
        }
    }

    private async getEmbedding(text: string): Promise<number[]> {
        const response = await fetch(`${this.apiBase}/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                input: text,
                model: this.embeddingModel
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Embedding API error: ${response.status} - ${error}`);
        }

        const data = await response.json() as any;
        return data.data[0].embedding;
    }

    public async removeFileFromIndex(filePath: string, workspaceRoot: string): Promise<void> {
        const relativePath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
        const db = this.dbService.getDatabase();
        
        db.run(`DELETE FROM local_rag_vectors WHERE file_path = ? AND store_id = ?`, [relativePath, this.storeId]);
        db.run(`DELETE FROM indexed_files WHERE file_path = ? AND store_id = ?`, [relativePath, this.storeId]);
        
        this.dbService.save();
        this.vectorCache.delete(relativePath);
        await this.updateStoreFileCount();
        console.log(`Removed ${relativePath} from local index.`);
    }

    private async updateStoreFileCount(): Promise<void> {
        const fileCount = this.vectorCache.size;
        const now = Date.now();
        const db = this.dbService.getDatabase();
        db.run(`UPDATE rag_store_info SET file_count = ?, last_sync_at = ? WHERE store_id = ?`, [fileCount, now, this.storeId]);
        this.dbService.save();
    }

    public async searchDocuments(query: string): Promise<SearchResult[]> {
        // 1. Embed Query
        const queryVector = await this.getEmbedding(query);

        // 2. Cosine Similarity
        const results: { chunk: Chunk, score: number, filePath: string }[] = [];
        
        for (const [filePath, chunks] of this.vectorCache.entries()) {
            for (const chunk of chunks) {
                const score = this.cosineSimilarity(queryVector, chunk.vector);
                if (score > 0.3) { // Threshold
                    results.push({ chunk, score, filePath });
                }
            }
        }

        // 3. Sort and Return Top K
        results.sort((a, b) => b.score - a.score);
        const topResults = results.slice(0, 10);

        return topResults.map(r => ({
            fileName: path.basename(r.filePath),
            filePath: r.filePath,
            snippet: r.chunk.text,
            relevance: r.score * 100
        }));
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    public async askQuestion(question: string): Promise<QuestionAnswerResult> {
        // 1. Search
        const results = await this.searchDocuments(question);
        
        if (results.length === 0) {
            return {
                answer: t().extension.rag.askQuestion.noRelevantDocuments,
                sources: [],
                citations: []
            };
        }

        // 2. Construct Prompt
        const context = results.map(r => `[${r.fileName}]: ${r.snippet}`).join('\n\n');
        const systemPrompt = "You are a helpful assistant. Answer the question based on the context provided below. If the answer is not in the context, say you don't know.";
        const userPrompt = `Context:\n${context}\n\nQuestion: ${question}`;

        // 3. Generate Answer
        const response = await fetch(`${this.apiBase}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.inferenceModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Chat API error: ${response.status}`);
        }

        const data = await response.json() as any;
        const answer = data.choices[0].message.content;

        const sources = Array.from(new Set(results.map(r => r.fileName)));
        const citations = sources.map(s => t().extension.rag.askQuestion.citationSource(s));

        return {
            answer,
            sources,
            citations
        };
    }

    public async reindexAll(): Promise<void> {
        const db = this.dbService.getDatabase();
        db.run(`DELETE FROM local_rag_vectors WHERE store_id = ?`, [this.storeId]);
        db.run(`DELETE FROM indexed_files WHERE store_id = ?`, [this.storeId]);
        this.dbService.save();
        this.vectorCache.clear();
        this.updateStoreRecord();
        // Service will trigger rescan
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
        const files: IndexedFile[] = [];
        const db = this.dbService.getDatabase();
        const result = db.exec(`SELECT * FROM indexed_files WHERE store_id = ?`, [this.storeId]);
        
        if (result.length > 0 && result[0].values.length > 0) {
             for (const row of result[0].values) {
                files.push({
                    id: row[0] as string,
                    filePath: row[1] as string,
                    fileName: row[2] as string,
                    fileSize: row[3] as number,
                    mimeType: row[4] as string,
                    indexedAt: row[5] as number,
                    geminiFileUri: row[6] as string,
                    storeId: row[7] as string,
                });
             }
        }
        return files;
    }

    public async getStoreInfoFromCloud(): Promise<any> {
        return null; // Local store doesn't have cloud info
    }

    public async testConnection(): Promise<boolean> {
        try {
            // Try to list models to check connection
            const response = await fetch(`${this.apiBase}/models`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            return response.ok;
        } catch (e) {
            console.error('Local RAG connection test failed:', e);
            return false;
        }
    }

    public dispose(): void {
        this.vectorCache.clear();
    }
}

