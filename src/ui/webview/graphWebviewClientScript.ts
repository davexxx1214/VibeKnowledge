/**
 * Browser-side helpers embedded verbatim in the graph Webview.
 *
 * Keep these helpers in a pure module so tests can execute the same JavaScript
 * that VS Code receives instead of merely checking a duplicate implementation.
 */
export const GRAPH_RELATION_TOOLTIP_SCRIPT = String.raw`
        function formatRelationTooltip(relation) {
            const lines = [relation.verb];
            lines.push(i18n.tooltip.source + ': ' + (
                relation.isAgent ? i18n.tooltip.agentSource : i18n.tooltip.humanSource
            ));
            if (relation.relationOrigin) {
                lines.push(i18n.tooltip.relationOrigin + ': ' + relation.relationOrigin);
            }
            if (relation.confidence) {
                lines.push(i18n.tooltip.confidence + ': ' + relation.confidence);
            }
            if (relation.description) {
                lines.push(relation.description);
            }
            if (Array.isArray(relation.evidence) && relation.evidence.length > 0) {
                lines.push(i18n.tooltip.evidence + ':');
                relation.evidence.forEach(item => {
                    const endLine = item.endLine ? '-' + item.endLine : '';
                    const detail = item.detail ? ' — ' + item.detail : '';
                    lines.push('• ' + item.filePath + ':' + item.startLine + endLine + detail);
                });
            }
            if (Array.isArray(relation.structuralPath) && relation.structuralPath.length > 0) {
                lines.push('Raw path: double-click (' + relation.structuralPath.length + ' hop(s))');
            }
            if (relation.aggregateCount) {
                lines.push('Aggregated raw relationships: ' + relation.aggregateCount);
            }
            return lines.join('\n');
        }
`;
