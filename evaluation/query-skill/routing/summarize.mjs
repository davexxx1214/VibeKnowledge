import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve('evaluation/query-skill/routing');
const read = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
if (existsSync(join(root, 'summary-v2.json'))) throw new Error('Do not overwrite recorded summary');
const rubric = read('rubric.json'), max = rubric.criticalMax;
const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const delta = (a, b) => (b - a) / a * 100;
const pairs = [1, 2, 3].map(pair => {
  const prefix = 'pair-' + pair + '/', metrics = read(prefix + 'metrics.json'), pub = read(prefix + 'public-output.json');
  const mapping = read(prefix + 'grade-mapping.json'), grades = read(prefix + 'grade.json');
  const delivery = read(prefix + 'delivery-audit.json'), stage = read(prefix + 'stage-audit.json');
  if (!delivery.passed || !stage.passed) throw new Error('Audit failure');
  const arms = Object.fromEntries(['A', 'B'].map(arm => {
    const grade = grades[mapping[arm]], entries = Object.entries(grade.scores);
    if (entries.length !== rubric.items.length || entries.some(([id, score]) => !rubric.items.some(i => i.id === id) || ![0, 0.5, 1].includes(score))) throw new Error('Invalid grading');
    const score = entries.reduce((sum, [, n]) => sum + n, 0), m = metrics.arms[arm];
    const perPhase = Object.fromEntries(['discovery', 'followup', 'control'].map(phase => [phase, {
      ...m.phases[phase], score: entries.filter(([id]) => rubric.items.find(i => i.id === id).phase === phase).reduce((sum, [, n]) => sum + n, 0),
    }]));
    return [arm, { score, missed: max - score, majorFalseClaims: grade.majorFalseClaims.length,
      observedTextTokens: m.observedTextTokens, publicToolOutputTokens: pub.arms[arm].publicToolOutputTokens,
      usage: m.usage, elapsedMs: m.elapsedMs, queries: m.queries, phases: perPhase }];
  }));
  const { A, B } = arms;
  return { pair, arms, changePercent: { observed: delta(A.observedTextTokens, B.observedTextTokens),
    publicTool: delta(A.publicToolOutputTokens, B.publicToolOutputTokens),
    uncachedInputPlusOutput: delta(A.usage.uncachedInputPlusOutput, B.usage.uncachedInputPlusOutput) } };
});
const pairedMedianChangePercent = Object.fromEntries(['observed', 'publicTool', 'uncachedInputPlusOutput'].map(k => [k, median(pairs.map(p => p.changePercent[k]))]));
// Match the preceding r3 protocol: compare the two arm medians, not the median
// of pairwise percentage changes. Preserve both, including the preliminary summary.
const medians = Object.fromEntries(['A', 'B'].map(arm => [arm, {
  observed: median(pairs.map(p => p.arms[arm].observedTextTokens)),
  publicTool: median(pairs.map(p => p.arms[arm].publicToolOutputTokens)),
  uncachedInputPlusOutput: median(pairs.map(p => p.arms[arm].usage.uncachedInputPlusOutput)),
  cachedInput: median(pairs.map(p => p.arms[arm].usage.cached_input_tokens)),
  totalTokens: median(pairs.map(p => p.arms[arm].usage.total_tokens)),
  phases: Object.fromEntries(['discovery', 'followup', 'control'].map(phase => [phase, median(pairs.map(p => p.arms[arm].phases[phase].observedTextTokens))])),
}]));
const medianChangePercent = Object.fromEntries(['observed', 'publicTool', 'uncachedInputPlusOutput'].map(k => [k, delta(medians.A[k], medians.B[k])]));
const noLoss = pairs.every(p => p.arms.B.score >= p.arms.A.score), noExtraMajor = pairs.every(p => p.arms.B.majorFalseClaims <= p.arms.A.majorFalseClaims);
const missed = Object.fromEntries(['A', 'B'].map(a => [a, pairs.reduce((sum, p) => sum + p.arms[a].missed, 0)]));
const strictGains = pairs.filter(p => p.arms.B.score > p.arms.A.score).length;
const gates = {
  efficiency: noLoss && noExtraMajor && medianChangePercent.observed <= -15 && medianChangePercent.publicTool <= -15 && medianChangePercent.uncachedInputPlusOutput <= -10,
  quality: missed.A > 0 && missed.B <= missed.A * .8 && strictGains >= 2 && noExtraMajor && medianChangePercent.uncachedInputPlusOutput <= 25,
};
const result = { version: 2, createdAt: new Date().toISOString(), maxScore: max, pairs, medians, medianChangePercent, pairedMedianChangePercent, missed, strictGains, noLoss, noExtraMajor, gates,
  accountingCorrection: 'summary.json preserves the preliminary median of pairwise percentage changes. This v2 uses change of arm medians, consistent with the preceding r3 evaluation. Both interpretations fail both gates; no raw measurements/grades changed.',
  generation: read('generation/metrics.json'),
  limitations: ['Three repeated pairs on one independently designed three-stage frontend task, not three different tasks or statistical significance.',
    'B uses five warm reusable briefs. Authoring, refresh, coordinator, grading and evaluation preparation costs are separate.',
    'Observed text uses o200k_base, while uncached input plus output uses numeric model telemetry; neither is a monetary bill.',
    'Per-stage visible text can be attributed; full-session uncached/cache telemetry cannot be precisely attributed to each phase.',
    'Comparison is source-only versus candidate Skill, not candidate versus old Skill; does not isolate which new feature causes differences.',
    'No backend/runtime assertions, no RAG, no native-host MCP token-saving claim.'] };
writeFileSync(join(root, 'summary-v2.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ medianChangePercent, missed, strictGains, gates, pairs: pairs.map(p => ({ pair: p.pair, scores: [p.arms.A.score, p.arms.B.score], changePercent: p.changePercent })) }, null, 2));
