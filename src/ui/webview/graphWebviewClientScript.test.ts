import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { GRAPH_RELATION_TOOLTIP_SCRIPT } from './graphWebviewClientScript';

describe('graph Webview client script', () => {
    it('formats a relationship tooltip without aborting graph rendering', () => {
        const context = {
            i18n: {
                tooltip: {
                    source: 'Provenance',
                    agentSource: 'Agent-generated',
                    humanSource: 'Human-authored',
                    relationOrigin: 'Relation origin',
                    confidence: 'Confidence',
                    evidence: 'Evidence',
                },
            },
            relation: {
                verb: 'depends_on',
                isAgent: true,
                relationOrigin: 'direct',
                confidence: 'high',
                description: 'Direct module dependency',
                evidence: [{ filePath: 'src/app.module.ts', startLine: 8, endLine: 10 }],
                structuralPath: [{ source: 'a', target: 'b', verb: 'imports' }],
            },
            result: '',
        };

        vm.runInNewContext(
            `${GRAPH_RELATION_TOOLTIP_SCRIPT}\nresult = formatRelationTooltip(relation);`,
            context
        );

        expect(context.result).toContain('depends_on');
        expect(context.result).toContain('Provenance: Agent-generated');
        expect(context.result).toContain('src/app.module.ts:8-10');
        expect(context.result).toContain('Raw path: double-click (1 hop(s))');
    });
});
