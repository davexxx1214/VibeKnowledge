export interface BriefEvidence { filePath: string; startLine: number; endLine: number }
export interface FeatureBriefDraft {
  key: string; name: string; summary: string; keywords: string[];
  entries: BriefEvidence[]; limitations: string[];
  facts: Array<{ kind: 'capability' | 'dependency' | 'framework' | 'test' | 'constraint'; text: string; certainty: 'observed' | 'inferred'; evidence: BriefEvidence[] }>;
}
export interface FeatureBrief extends FeatureBriefDraft {
  version: 1; generatedAt: string; sources: Array<{ filePath: string; contentHash: string }>;
}
export function publishFeatureBrief(workspace: string, input: unknown): FeatureBrief;
export function listFeatureBriefs(workspace: string, query?: string): Array<{ key: string; name: string; summary: string; keywords: string[]; contentHash: string }>;
export function readFeatureBrief(workspace: string, key: string): { document: FeatureBrief; stale: string[]; unavailable: string[]; checkedFiles: number };
