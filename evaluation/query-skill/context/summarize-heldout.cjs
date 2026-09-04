const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { join, resolve } = require('node:path');
const directory = resolve(process.argv[2] ?? 'evaluation/query-skill/context');
const out = join(directory, 'heldout-summary.json');
if (existsSync(out)) throw new Error('Summary already exists; audit it rather than silently replacing it.');
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const pairs = [1, 2, 3].map(n => {
  const folder = join(directory, `heldout-r${n}`);
  const metrics = JSON.parse(readFileSync(join(folder, 'metrics.json'), 'utf8'));
  const grades = JSON.parse(readFileSync(join(folder, 'grades.json'), 'utf8'));
  const delivered = JSON.parse(readFileSync(join(folder, 'public-output-metrics-v3.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(join(folder, 'manifest.json'), 'utf8'));
  // Anonymous report mapping is frozen when the reports are copied for grading.
  const mapping = JSON.parse(readFileSync(join(folder, 'grade-mapping.json'), 'utf8'));
  const score = arm => grades.candidates[mapping[arm]].totals;
  return { pair: n, metrics, delivered, manifest, scores: { A: score('A'), B: score('B') } };
});
const bundle = pairs[0].metrics.bundleSha256;
const first = pairs[0].metrics.arms.A;
const canonical = map => JSON.stringify(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
for (const pair of pairs) {
  if (pair.metrics.bundleSha256 !== bundle) throw new Error('Candidate changed between runs');
  if (pair.delivered.version !== 3 || !pair.delivered.freshSingleTaskValidated) throw new Error('Public output measurement must validate fresh tasks and both tool output types');
  if (pair.scores.A.critical_max !== pair.scores.B.critical_max || pair.scores.A.critical_max !== pairs[0].scores.A.critical_max) throw new Error('Grading denominators differ');
  if (!Object.keys(pair.manifest.sourceHashes).length || !Object.keys(pair.manifest.bArtifacts).length) throw new Error('Empty snapshot manifest');
  if (canonical(pair.manifest.sourceHashes) !== canonical(pairs[0].manifest.sourceHashes) || canonical(pair.manifest.bArtifacts) !== canonical(pairs[0].manifest.bArtifacts)) throw new Error('Source or feature artifacts differ across pairs');
  for (const arm of ['A', 'B']) {
    const m = pair.metrics.arms[arm], s = pair.scores[arm];
    if (m.model !== first.model || m.effort !== first.effort) throw new Error('Model/effort mismatch');
    if (m.sourceHashMismatches.length || m.artifactHashMismatches.length) throw new Error('Snapshot changed');
    if (pair.delivered.arms[arm].sessionId !== m.sessionId || pair.delivered.arms[arm].agentPath !== m.agentPath || !Number.isFinite(pair.delivered.arms[arm].publicToolOutputTokens)) throw new Error('Wrong or absent public-output measurement');
    if (!Number.isFinite(s.critical) || !Number.isFinite(s.critical_max) || !Number.isFinite(s.major_false_claim_count)) throw new Error('Missing score');
    if (s.critical > s.critical_max || s.critical < 0 || s.critical_max <= 0 || !Number.isInteger(s.major_false_claim_count) || s.major_false_claim_count < 0) throw new Error('Invalid score');
  }
}
const medians = {};
for (const arm of ['A', 'B']) {
  medians[arm] = Object.fromEntries([
    ['observedTextTokens', r => r.observedTextTokens],
    ['uncachedInputPlusOutput', r => r.usage.uncachedInputPlusOutput],
    ['cachedInput', r => r.usage.cached_input_tokens],
    ['totalTokens', r => r.usage.total_tokens],
    ['outputTokens', r => r.usage.output_tokens],
    ['elapsedMs', r => r.elapsedMs]
  ].map(([key, get]) => [key, median(pairs.map(p => get(p.metrics.arms[arm])))]));
  medians[arm].publicToolOutputTokens = median(pairs.map(p => p.delivered.arms[arm].publicToolOutputTokens));
}
const saved = Object.fromEntries(Object.keys(medians.A).map(k => [k, 1 - medians.B[k] / medians.A[k]]));
const noQualityLoss = pairs.every(p => p.scores.A.critical_max === p.scores.B.critical_max && p.scores.B.critical >= p.scores.A.critical);
const noExtraMajorClaims = pairs.every(p => p.scores.B.major_false_claim_count <= p.scores.A.major_false_claim_count);
const misses = arm => pairs.reduce((n, p) => n + p.scores[arm].critical_max - p.scores[arm].critical, 0);
const strictImprovements = pairs.filter(p => p.scores.B.critical > p.scores.A.critical).length;
const gates = {
  // Retain the original observer-payload threshold AND require the corrected,
  // actual public-tool-text threshold. Never promote a failed old gate using
  // a post-hoc accounting correction alone.
  efficiency: noQualityLoss && noExtraMajorClaims && saved.observedTextTokens >= 0.15 && saved.publicToolOutputTokens >= 0.15 && saved.uncachedInputPlusOutput >= 0.10,
  quality: misses('A') > 0 && (misses('A') - misses('B')) / misses('A') >= 0.20 && strictImprovements >= 2 && noExtraMajorClaims && medians.B.uncachedInputPlusOutput <= 1.25 * medians.A.uncachedInputPlusOutput,
  noQualityLoss, noExtraMajorClaims, missedRequiredFacts: { A: misses('A'), B: misses('B') }, strictImprovements
};
const result = { createdAt: new Date().toISOString(), bundleSha256: bundle, model: first.model, effort: first.effort,
  pairs: pairs.map(p => ({ pair: p.pair, scores: p.scores, arms: Object.fromEntries(['A', 'B'].map(a => [a, {
    observedTextTokens: p.metrics.arms[a].observedTextTokens, publicToolOutputTokens: p.delivered.arms[a].publicToolOutputTokens, usage: p.metrics.arms[a].usage,
    elapsedMs: p.metrics.arms[a].elapsedMs, queries: p.metrics.arms[a].queries
  }])) })), medians, savedFractions: saved, gates,
  limitations: ['Three pairs on two prompts in one repository, not independent repositories or a statistical guarantee.',
    'Warm artifact reuse; generation/update cost is additional.', 'Pilot-r2 had a development-task coverage loss and remains part of the evidence.',
    'Observer-emitted text can be truncated by the outer tool layer; actual public tool-text counts are also reported and gated.',
    'Uncached input plus output is an explicit token metric, not a monetary bill.', 'Finite rubric coverage is not complete factual correctness.'] };
writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ medians, savedFractions: saved, gates }, null, 2));
