export interface RagSource {
  filePath: string;
  relativePath: string;
  snippet: string;
  relevance: number;
}

export interface RagAnswer {
  answer: string;
  sources: RagSource[];
}

export interface RagEngine {
  ask(question: string): Promise<RagAnswer>;
  getStoreId(): string;
  getMode(): 'local' | 'cloud';
}

