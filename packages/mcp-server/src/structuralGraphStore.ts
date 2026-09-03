import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const locationSchema = z.object({
  filePath: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive()
});

const entitySchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum([
    'file',
    'class',
    'interface',
    'function',
    'method',
    'variable',
    'external'
  ]),
  filePath: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  exported: z.boolean().optional(),
  containerKey: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

const relationSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  verb: z.enum([
    'imports',
    'exports',
    'contains',
    'extends',
    'implements',
    'calls',
    'references'
  ]),
  origin: z.enum(['ast', 'resolver']),
  confidence: z.enum(['extracted', 'inferred', 'review_required']),
  location: locationSchema,
  detail: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

const structuralGraphSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string().min(1),
  scope: z.string(),
  extractor: z.object({
    name: z.string().min(1),
    version: z.number().int().positive(),
    typescriptVersion: z.string().min(1)
  }),
  files: z.array(z.object({
    filePath: z.string().min(1),
    language: z.enum([
      'typescript',
      'typescriptreact',
      'javascript',
      'javascriptreact'
    ]),
    contentHash: z.string().min(1)
  })),
  entities: z.array(entitySchema),
  relations: z.array(relationSchema),
  diagnostics: z.array(z.object({
    filePath: z.string().optional(),
    code: z.string().min(1),
    category: z.enum(['warning', 'error']),
    message: z.string(),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional()
  }))
});

export type StructuralGraphDocument = z.infer<typeof structuralGraphSchema>;

/** Read-only access to deterministic code facts and their previous snapshot. */
export class StructuralGraphStore {
  public readonly filePath: string;
  public readonly previousFilePath: string;

  constructor(workspaceRoot: string) {
    const knowledgeDirectory = join(workspaceRoot, '.vscode', '.knowledge');
    this.filePath = join(knowledgeDirectory, 'structural-graph.json');
    this.previousFilePath = join(
      knowledgeDirectory,
      'structural-graph.previous.json'
    );
  }

  public hasGraph(): boolean {
    return existsSync(this.filePath);
  }

  public read(): StructuralGraphDocument {
    if (!this.hasGraph()) {
      throw new Error(
        'structural-graph.json 不存在；请先运行 Knowledge: Generate Structural Graph'
      );
    }
    return this.readFile(this.filePath, 'structural graph');
  }

  public readPrevious(): StructuralGraphDocument | undefined {
    return existsSync(this.previousFilePath)
      ? this.readFile(this.previousFilePath, 'previous structural graph')
      : undefined;
  }

  private readFile(filePath: string, label: string): StructuralGraphDocument {
    let value: unknown;
    try {
      value = JSON.parse(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
    } catch (error) {
      throw new Error(
        `Cannot read ${label}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    const parsed = structuralGraphSchema.safeParse(value);
    if (!parsed.success) {
      throw new Error(
        `Invalid ${label}: ${parsed.error.issues[0]?.message ?? 'schema validation failed'}`
      );
    }
    return parsed.data;
  }
}
