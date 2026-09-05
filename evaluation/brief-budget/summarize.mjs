import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const baseline = JSON.parse(fs.readFileSync(path.join(dir, 'baseline.json'), 'utf8'));
const comparison = JSON.parse(fs.readFileSync(path.join(dir, 'comparison.json'), 'utf8'));
const priority = f => ['constraint', 'test'].includes(f.kind);
const kinds = ['constraint', 'test', 'capability', 'dependency', 'framework'];
const count = facts => Object.fromEntries(kinds.map(k => [k, facts.filter(f => f.kind === k).length]));
const summary = {
  at: comparison.at, cases: comparison.comparisons.length, cards: baseline.cards.length,
  availableFacts: count(baseline.cards.flatMap(c => c.document.facts)),
  budgets: baseline.budgets.map(budget => {
    const pairs = comparison.comparisons.filter(c => c.before.budget === budget);
    const beforeTokens = pairs.reduce((n, c) => n + c.before.textTokens, 0), afterTokens = pairs.reduce((n, c) => n + c.after.textTokens, 0);
    return { budget, before: count(pairs.flatMap(c => c.before.shown)), after: count(pairs.flatMap(c => c.after.shown)),
      textTokens: { before: beforeTokens, after: afterTokens, changePercent: 100 * (afterTokens / beforeTokens - 1) },
      priorityCountImproved: pairs.filter(c => c.priorityFacts.after > c.priorityFacts.before).length,
      priorityCountRegressed: pairs.filter(c => c.priorityFacts.after < c.priorityFacts.before).length,
      gained: count(pairs.flatMap(c => c.gained)), lost: count(pairs.flatMap(c => c.lost)),
    };
  }),
  completePriorityBudget: baseline.cards.map(card => {
    const pairs = comparison.comparisons.filter(c => c.before.sample === card.sample && c.before.key === card.document.key);
    const needed = card.document.facts.filter(priority).length;
    const first = side => pairs.find(c => c[side].shown.filter(priority).length === needed)?.[side].budget ?? null;
    return { sample: card.sample, key: card.document.key, priorityFacts: needed, before: first('before'), after: first('after') };
  }),
  bounds: 'Counts describe unchanged fact/evidence blocks in reused development inputs, not semantic accuracy, end-to-end model usage or billing. No new authoring or downstream-task benefit was measured. Per-kind prioritization can displace important facts labeled capability/dependency.',
};
if (process.argv.includes('--write')) {
  const out = path.join(dir, 'summary.json'); if (fs.existsSync(out)) throw new Error('Already archived');
  fs.writeFileSync(out, JSON.stringify(summary, null, 2) + '\n');
}
console.log(JSON.stringify(summary, null, 2));
