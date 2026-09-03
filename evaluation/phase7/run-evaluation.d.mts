export interface EvaluationTask {
  id: string;
  expectedFiles: string[];
  expectedTerms: string[];
}

export interface EvidenceScore {
  correctness: number;
  omissionRate: number;
  fileRecall: number;
  filePrecision: number;
  termRecall: number;
  matchedTerms: string[];
  missedFiles: string[];
}

export function estimateTokens(value: unknown): number;
export function tokenize(value: unknown): string[];
export function scoreEvidence(
  task: EvaluationTask,
  selectedFiles: string[],
  context: string
): EvidenceScore;
export function checkStructuralFreshness(
  graph: { files: Array<{ filePath: string; contentHash: string }> },
  workspaceRoot: string,
  overrides?: Map<string, string>
): { fresh: boolean; changedFiles: string[]; missingFiles: string[] };
export function checkCuratedFreshness(
  graph: {
    generatedAt: string;
    groups: Array<{ entities: Array<{ filePath?: string }> }>;
  },
  workspaceRoot: string
): {
  fresh: boolean;
  referencedFileCount: number;
  changedFiles: string[];
  missingFiles: string[];
};
export function recommendBudget(
  sweep: Array<{
    budget: number;
    taskCount: number;
    averageCorrectness: number;
    averageOmissionRate: number;
    truncatedTasks: number;
  }>
): number;
