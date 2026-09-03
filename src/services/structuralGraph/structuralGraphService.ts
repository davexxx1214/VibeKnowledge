import * as path from 'path';
import { existsSync, readFileSync } from 'fs';
import {
  updateStructuralGraph,
  type StructuralExtractionOptions,
  type StructuralGraphDocument,
  type StructuralUpdateStatistics,
} from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/structural-extractor.mjs';
import { assertStructuralGraphDocument } from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/structural-graph-schema.mjs';

export interface GenerateStructuralGraphOptions {
  scope?: string;
  tsconfigPath?: string;
  generatedAt?: string;
  force?: boolean;
}

/** Generates the complete deterministic code-fact graph, separate from Agent views. */
export class StructuralGraphService {
  private readonly outputPath: string;
  private readonly previousOutputPath: string;
  private readonly cacheDirectory: string;
  private lastStatistics?: StructuralUpdateStatistics;

  constructor(private readonly workspaceRoot: string) {
    this.outputPath = path.join(
      workspaceRoot,
      '.vscode',
      '.knowledge',
      'structural-graph.json'
    );
    this.previousOutputPath = path.join(
      workspaceRoot,
      '.vscode',
      '.knowledge',
      'structural-graph.previous.json'
    );
    this.cacheDirectory = path.join(
      workspaceRoot,
      '.vscode',
      '.knowledge',
      'cache',
      'structural'
    );
  }

  public getOutputPath(): string {
    return this.outputPath;
  }

  public getCacheDirectory(): string {
    return this.cacheDirectory;
  }

  public getPreviousOutputPath(): string {
    return this.previousOutputPath;
  }

  public hasGraph(): boolean {
    return existsSync(this.outputPath);
  }

  public read(): StructuralGraphDocument {
    if (!this.hasGraph()) {
      throw new Error(
        'structural-graph.json does not exist. Generate the structural graph first.'
      );
    }
    return this.readFile(this.outputPath, 'structural graph');
  }

  public readPrevious(): StructuralGraphDocument | undefined {
    return existsSync(this.previousOutputPath)
      ? this.readFile(this.previousOutputPath, 'previous structural graph')
      : undefined;
  }

  public getLastStatistics(): StructuralUpdateStatistics | undefined {
    return this.lastStatistics;
  }

  public generate(
    options: GenerateStructuralGraphOptions = {}
  ): StructuralGraphDocument {
    const extractionOptions: StructuralExtractionOptions = {
      workspaceRoot: this.workspaceRoot,
      scope: options.scope,
      tsconfigPath: options.tsconfigPath,
      generatedAt: options.generatedAt,
    };
    const result = updateStructuralGraph({
      ...extractionOptions,
      outputPath: this.outputPath,
      cacheDirectory: this.cacheDirectory,
      force: options.force,
    });
    this.lastStatistics = result.statistics;
    return result.graph;
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
    return assertStructuralGraphDocument(value) as StructuralGraphDocument;
  }
}

export type {
  StructuralGraphDiagnostic,
  StructuralGraphDocument,
  StructuralGraphEntity,
  StructuralGraphFile,
  StructuralGraphRelation,
  StructuralGraphRecoveryRequiredError,
  StructuralUpdateStatistics,
} from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/structural-extractor.mjs';
