import { listFeatureBriefs, readFeatureBrief } from './feature-brief.mjs';
import { estimateTokenCount } from './graphQuery.js';

function clipped(text: string, tokens: number): string {
  if (estimateTokenCount(text) <= tokens) return text;
  const chars = Array.from(text);
  let low = 0, high = chars.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (estimateTokenCount(chars.slice(0, mid).join('') + '…') <= tokens) low = mid;
    else high = mid - 1;
  }
  return chars.slice(0, low).join('') + '…';
}

export function featureIndex(workspace: string, query: string, budget: number): string {
  const matches = listFeatureBriefs(workspace, query);
  if (!matches.length) return 'No matching feature cards. Use a targeted source search or graph context; no whole-repository scan is required by this command.';
  const lines: string[] = [];
  const footer = (count: number) => `Shown ${count}/${matches.length} cards (routing only, freshness unchecked). Use brief --feature KEY; narrow query if truncated.`;
  for (const f of matches) {
    const prefix = `${f.key} | ${clipped(f.name, 45)} | `;
    const allowance = Math.max(1, Math.min(80, budget - estimateTokenCount(prefix + footer(1)) - 10));
    const line = `${prefix}${clipped(f.summary, allowance)}`;
    if (estimateTokenCount([...lines, line, footer(lines.length + 1)].join('\n')) > budget) break;
    lines.push(line);
  }
  return [...lines, footer(lines.length)].join('\n');
}

export function featureBrief(workspace: string, key: string, budget: number): string {
  const { document: d, stale, unavailable, checkedFiles } = readFeatureBrief(workspace, key);
  if (stale.length || unavailable.length) {
    const header = `Feature ${key}: NOT CURRENT. ${stale.length} cited files changed; ${unavailable.length} unavailable. Semantic facts withheld. Check source/graph or request a refresh.`;
    return `${header}\n${clipped([...stale, ...unavailable].join('\n'), Math.max(1, budget - estimateTokenCount(header) - 10))}`;
  }
  const header = [
    `Feature ${d.key} | ${clipped(d.name, 50)}`,
    clipped(d.summary, Math.min(200, Math.floor(budget / 4))),
    `Scope: ${checkedFiles} cited source hashes match. New callers/unlisted files and runtime state not certified. Notes are source-backed synthesis, not proof of behavior.`,
  ];
  const limits = d.limitations.map(text => ({ text: `LIMIT ${text}`, kind: '' }));
  const entries = d.entries.map(e => ({ text: `ENTRY ${e.filePath}:${e.startLine}-${e.endLine}`, kind: '' }));
  const kinds = ['capability', 'dependency', 'framework', 'test', 'constraint'] as const;
  const facts = kinds.map(kind => d.facts.filter(f => f.kind === kind).map(f => ({ kind,
    text: `${f.kind.toUpperCase()} [${f.certainty}] ${f.text}\n  ${f.evidence.map(e => `${e.filePath}:${e.startLine}-${e.endLine}`).join('; ')}`,
  })));
  // Preserve the feature's facets before spending the budget on repeated
  // dependencies/entries. In particular, late test/constraint blocks must not
  // disappear just because the author placed them after the implementation.
  const blocks = [
    ...limits.slice(0, 1), ...entries.slice(0, 1),
    ...facts.flatMap(group => group.slice(0, 1)),
    ...limits.slice(1), ...entries.slice(1),
    ...Array.from({ length: Math.max(...facts.map(group => group.length)) }, (_, i) => facts.flatMap(group => group.slice(i + 1, i + 2))).flat(),
  ];
  const selected: string[] = [];
  const selectedKinds = new Set<string>();
  const footer = () => {
    const missingKinds = kinds.filter(kind => d.facts.some(f => f.kind === kind) && !selectedKinds.has(kind));
    return `${blocks.length - selected.length} blocks omitted.${missingKinds.length ? ` Unshown fact kinds: ${missingKinds.join(', ')}.` : ''} ${blocks.length > selected.length ? 'Expand budget for missing detail.' : 'Verify relevant behavior before editing; broader impact may require graph lookup.'}`;
  };
  for (const block of blocks) {
    const alreadySelected = selectedKinds.has(block.kind);
    selected.push(block.text); selectedKinds.add(block.kind);
    if (estimateTokenCount([...header, ...selected, footer()].join('\n')) > budget) {
      selected.pop();
      if (!alreadySelected) selectedKinds.delete(block.kind);
    }
  }
  return [...header, ...selected, footer()].join('\n');
}
