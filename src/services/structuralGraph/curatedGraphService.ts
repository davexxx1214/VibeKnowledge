import * as fs from 'fs';
import * as path from 'path';
import {
  convergeStructuralGraph,
  mergeCuratedGroup,
  serializeCuratedGraph,
  type ConvergeOptions,
  type CuratedGraphDocument,
} from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/structural-condenser.mjs';
import { parseAgentGraphDocument } from '../agentGraph/agentGraphService';
import type { StructuralGraphDocument } from './structuralGraphService';

export interface CurateGraphOptions extends ConvergeOptions {
  generatedAt?: string;
}

export interface CurateGraphResult {
  document: CuratedGraphDocument;
  group: CuratedGraphDocument['groups'][number];
  statistics: {
    structuralEntities: number;
    structuralRelations: number;
    curatedEntities: number;
    curatedRelations: number;
    collapsedRelations: number;
  };
  warnings: string[];
}

/** Condenses trusted structural facts and atomically replaces one curated group. */
export class CuratedGraphService {
  private readonly outputPath: string;

  constructor(private readonly workspaceRoot: string) {
    this.outputPath = path.join(
      workspaceRoot,
      '.vscode',
      '.knowledge',
      'agent-graph.json'
    );
  }

  public getOutputPath(): string {
    return this.outputPath;
  }

  public curate(
    structuralGraph: StructuralGraphDocument,
    options: CurateGraphOptions = {}
  ): CurateGraphResult {
    const convergence = convergeStructuralGraph(structuralGraph, options);
    const existingDocument = this.readExistingDocument();
    const document = mergeCuratedGroup(existingDocument, convergence.group, {
      generatedAt: options.generatedAt,
    });

    // Reuse the Extension's runtime parser before any filesystem mutation.
    parseAgentGraphDocument(document);
    this.writeAtomically(document);
    return {
      document,
      group: document.groups.find(
        (group) => group.key === convergence.group.key
      )!,
      statistics: convergence.statistics,
      warnings: convergence.warnings,
    };
  }

  private readExistingDocument(): unknown {
    if (!fs.existsSync(this.outputPath)) {
      return undefined;
    }
    try {
      return JSON.parse(
        fs.readFileSync(this.outputPath, 'utf8').replace(/^\uFEFF/, '')
      );
    } catch (error) {
      throw new Error(
        `Cannot refresh the curated graph because the existing agent-graph.json is invalid: ${String(error)}`,
        { cause: error }
      );
    }
  }

  private writeAtomically(document: CuratedGraphDocument): void {
    fs.mkdirSync(path.dirname(this.outputPath), { recursive: true });
    const temporaryPath = `${this.outputPath}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(temporaryPath, serializeCuratedGraph(document), 'utf8');
      fs.renameSync(temporaryPath, this.outputPath);
    } catch (error) {
      if (fs.existsSync(temporaryPath)) {
        fs.rmSync(temporaryPath, { force: true });
      }
      throw error;
    }
  }
}
