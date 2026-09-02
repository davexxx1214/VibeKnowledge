import * as path from 'path';
import { existsSync } from 'fs';
import {
  updateStructuralGraph,
  type StructuralExtractionOptions,
  type StructuralGraphDocument,
  type StructuralUpdateStatistics,
} from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/structural-extractor.mjs';

export interface GenerateStructuralGraphOptions {
  scope?: string;
  tsconfigPath?: string;
  generatedAt?: string;
  force?: boolean;
}

/** Generates the complete deterministic code-fact graph, separate from Agent views. */
export class StructuralGraphService {
  private readonly outputPath: string;
  private readonly cacheDirectory: string;
  private lastStatistics?: StructuralUpdateStatistics;

  constructor(private readonly workspaceRoot: string) {
    this.outputPath = path.join(
      workspaceRoot,
      '.vscode',
      '.knowledge',
      'structural-graph.json'
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

  public hasGraph(): boolean {
    return existsSync(this.outputPath);
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
