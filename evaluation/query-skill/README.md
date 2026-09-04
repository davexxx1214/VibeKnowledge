# Skill evaluation index — 0.5.0

The current release uses **feature-first briefs with selective source/graph
expansion**. The latest result is [candidate r3](context/r3/results.md): three
independent matched pairs on two feature-analysis tasks in a frozen VibeKnowledge
source snapshot. Both arms received 17/17 critical and 3/3 supplemental points
with no major false claims in all pairs.

| Median metric | No Skill | Feature-first Skill | Reduction |
| --- | ---: | ---: | ---: |
| Actual public tool text | 74,789 | 56,572 | 24.4% |
| Uncached input + output | 104,756 | 81,771 | 21.9% |
| Total input + output including cached replay | 1,158,068 | 1,025,622 | 11.4% |

This passes the [predefined efficiency gate](context/protocol.md), not a
quality-improvement gate. These are warm-reuse results, not universal, billing,
first-use or statistical-significance claims. Creating the two briefs added
90,480 uncached-input-plus-output tokens and 328.1 seconds. B used briefs rather
than graph traversal; the test does not isolate the Skill transport, graph
algorithms, or the effect of facet ordering. New frontends and equivalent
curated documentation were not tested. Full source scope, truncation accounting,
per-task reads, cache metrics and rubric caveats are in the report.

## All trials, including negative results

| Trial | What it measures | Outcome |
| --- | --- | --- |
| [Skill / MCP parity](results.md) | Nine paired query payloads and instruction/argument text | Payloads identical; transport/context-loading costs vary. Not an agent-task saving. |
| [Initial independent A/B](ab/results.md) | Tag implementation and ORM analysis | Skill used 19.8% more observed text. |
| [Selective routing A/B](ab/selective-results.md) | Same task family, graph calls optional | B made no graph calls but used 39.2% more observed text. |
| [Task-context pilot r1](context/pilot-r1/summary.md) | Three development analysis tasks | Less observed text, more uncached input + output; no win. |
| [Feature-first pilot r2](context/pilot-r2/summary.md) | Briefs on development tasks | Less text, but critical coverage loss. |
| [Feature-first held-out r2](context/heldout-results.md) | Three pairs, descriptions and MCP setup | Neither predefined gate passed. |
| [Facet-balanced held-out r3](context/r3/results.md) | Three new pairs, visualization and Copilot generation | Efficiency gate passed; no demonstrated accuracy gain. |

## Inspect or reproduce

- The [protocol](context/protocol.md) defines isolation, frozen inputs and gates.
- Each run keeps source/artifact hash manifests, task reports, independent grades,
  numeric model telemetry and observer logs. No private reasoning or system
  instructions are published. Absolute local paths in archived records describe
  the original run, not paths required on another machine.
- [Accounting checks](context/accounting-audit.md) distinguish observer-emitted
  text from actual delivered tool text and cached model usage.
- The [r3 summary JSON](context/r3/heldout-summary.json) is computed from its
  three pairs. `node evaluation/query-skill/context/accounting.test.cjs` checks
  the developer-only accounting helpers; Python with tiktoken is needed for
  those measurements, not for the distributed query Skill.
- Prepare a fresh source snapshot and new isolated runs when repeating the
  experiment. Archived manifests refer to the pre-release source state; do not
  silently refresh them to 0.5.0 or overwrite their numeric results. The current
  checkout alone is not a byte-identical copy of the archived source snapshot.

Evaluation files stay in Git for auditing but are excluded from the VSIX.
