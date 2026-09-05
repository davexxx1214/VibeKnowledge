const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { join, resolve } = require('node:path');
const directory = resolve(process.argv[2] ?? 'evaluation/mcp-ab');
const out = join(directory, 'summary.json');
if (existsSync(out)) throw new Error('Do not overwrite frozen results');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const canonical = map => JSON.stringify(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
const pairs = [1, 2, 3].map(pair => {
  const dir = join(directory, 'pair-' + pair), metrics = json(join(dir, 'metrics.json'));
  const grades = json(join(dir, 'grades.json')), mapping = json(join(dir, 'grade-mapping.json'));
  return { pair, metrics, manifest: json(join(dir, 'manifest.json')), delivered: json(join(dir, 'public-output-metrics-v3.json')), deliveryAudit: json(join(dir, 'delivery-audit-v2.json')),
    scores: { A: grades.candidates[mapping.A].totals, B: grades.candidates[mapping.B].totals } };
});
for (const pair of pairs) {
  if (pair.metrics.candidateSha256 !== pairs[0].metrics.candidateSha256) throw new Error('Runtime changed');
  if (canonical(pair.manifest.sourceHashes) !== canonical(pairs[0].manifest.sourceHashes) || canonical(pair.manifest.bArtifacts) !== canonical(pairs[0].manifest.bArtifacts)) throw new Error('Inputs differ');
  if (pair.delivered.version !== 3 || !pair.delivered.freshSingleTaskValidated) throw new Error('Wrong public accounting');
  for (const arm of ['A', 'B']) {
    const m = pair.metrics.arms[arm], score = pair.scores[arm], publicMetric = pair.delivered.arms[arm];
    if (m.model !== pairs[0].metrics.arms.A.model || m.effort !== pairs[0].metrics.arms.A.effort) throw new Error('Unequal model');
    if (m.sourceHashMismatches.length || m.artifactHashMismatches.length) throw new Error('Mutation');
    if (m.sessionId !== publicMetric.sessionId || m.agentPath !== publicMetric.agentPath || !Number.isFinite(publicMetric.publicToolOutputTokens)) throw new Error('Wrong session accounting');
    const audit = pair.deliveryAudit.arms[arm];
    if (pair.deliveryAudit.version !== 2 || audit.sessionId !== m.sessionId || audit.agentPath !== m.agentPath) throw new Error('Wrong delivery audit');
    if (score.critical_max !== 17 || score.supplemental_max !== 3 || !Number.isFinite(score.critical) || score.critical < 0 || score.critical > 17 || !Number.isInteger(score.major_false_claim_count) || score.major_false_claim_count < 0) throw new Error('Invalid grade');
  }
}
const medians = {};
for (const arm of ['A', 'B']) {
  const metrics = pairs.map(p => p.metrics.arms[arm]);
  medians[arm] = Object.fromEntries([
    ['observedTextTokens', m => m.observedTextTokens], ['uncachedInput', m => m.usage.uncachedInput],
    ['uncachedInputPlusOutput', m => m.usage.uncachedInputPlusOutput], ['cachedInput', m => m.usage.cached_input_tokens],
    ['totalTokens', m => m.usage.total_tokens], ['outputTokens', m => m.usage.output_tokens], ['elapsedMs', m => m.elapsedMs]
  ].map(([key, get]) => [key, median(metrics.map(get))]));
  medians[arm].publicToolOutputTokens = median(pairs.map(p => p.delivered.arms[arm].publicToolOutputTokens));
}
const savedFractions = Object.fromEntries(Object.keys(medians.A).map(key => [key, 1 - medians.B[key] / medians.A[key]]));
const noQualityLoss = pairs.every(p => p.scores.B.critical >= p.scores.A.critical);
const noExtraMajorClaims = pairs.every(p => p.scores.B.major_false_claim_count <= p.scores.A.major_false_claim_count);
const misses = arm => pairs.reduce((n, p) => n + 17 - p.scores[arm].critical, 0);
const strictImprovements = pairs.filter(p => p.scores.B.critical > p.scores.A.critical).length;
const gates = {
  efficiency: noQualityLoss && noExtraMajorClaims && savedFractions.observedTextTokens >= 0.15 && savedFractions.publicToolOutputTokens >= 0.15 && savedFractions.uncachedInputPlusOutput >= 0.10,
  quality: misses('A') > 0 && (misses('A') - misses('B')) / misses('A') >= 0.20 && strictImprovements >= 2 && noExtraMajorClaims && medians.B.uncachedInputPlusOutput <= 1.25 * medians.A.uncachedInputPlusOutput,
  noQualityLoss, noExtraMajorClaims, missedRequiredFacts: { A: misses('A'), B: misses('B') }, strictImprovements
};
const result = { createdAt: new Date().toISOString(), candidateSha256: pairs[0].metrics.candidateSha256,
  model: pairs[0].metrics.arms.A.model, effort: pairs[0].metrics.arms.A.effort,
  pairs: pairs.map(p => ({ pair: p.pair, scores: p.scores, arms: Object.fromEntries(['A', 'B'].map(arm => [arm, {
    observedTextTokens: p.metrics.arms[arm].observedTextTokens, publicToolOutputTokens: p.delivered.arms[arm].publicToolOutputTokens,
    usage: p.metrics.arms[arm].usage, queries: p.metrics.arms[arm].queries, discoveries: p.metrics.arms[arm].discoveries,
    resources: p.metrics.arms[arm].resources, elapsedMs: p.metrics.arms[arm].elapsedMs }])) })),
  medians, savedFractions, gates, deliveryAuditsPassed: pairs.every(p => p.deliveryAudit.passed),
  limitations: ['Three matched pairs/two published tasks/one selected source snapshot; no new local negative control.',
    'Actual MCP SDK stdio via observer, not native-host MCP schema discovery or persistent latency.',
    'Current MCP lacks Skill feature briefs and context; not isolated transport comparison.',
    'Generation/update and installation costs are additional; no billing or statistical significance claim.',
    'Original finite rubric is not exhaustive correctness; cached input is reported separately.'] };
writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ medians, savedFractions, gates }, null, 2));
