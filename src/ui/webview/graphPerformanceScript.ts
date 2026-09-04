/** Pure browser helpers, embedded verbatim so tests exercise the shipped script. */
export const GRAPH_PERFORMANCE_SCRIPT = String.raw`
        function normalizePerformanceMode(mode) {
            return mode === 'high' ? 'high' : 'low';
        }

        // Cache geometry only, never source/Evidence objects. Bound both group and node counts.
        function createLayoutCache(maxGroups = 8, maxNodes = 2000) {
            const entries = new Map();
            function signature(nodes, links) {
                return JSON.stringify([
                    nodes.map(n => n.id).sort(),
                    links.map(l => JSON.stringify([l.sourceId, l.targetId, l.verb])).sort()
                ]);
            }
            return {
                get(key, nodes, links) {
                    const entry = entries.get(key);
                    if (!entry || entry.signature !== signature(nodes, links)) return null;
                    entries.delete(key);
                    entries.set(key, entry);
                    return entry;
                },
                set(key, nodes, links, transform, state = { settled: true, alpha: 0, autoFit: false }) {
                    entries.delete(key);
                    if (nodes.length > maxNodes || links.length > maxNodes * 8 || !nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y))) return;
                    entries.set(key, {
                        signature: signature(nodes, links),
                        positions: new Map(nodes.map(n => [n.id, { x: n.x, y: n.y }])),
                        transform: { x: transform.x, y: transform.y, k: transform.k },
                        settled: state.settled,
                        alpha: state.alpha,
                        autoFit: state.autoFit
                    });
                    let count = [...entries.values()].reduce((sum, entry) => sum + entry.positions.size, 0);
                    while (entries.size > maxGroups || count > maxNodes) {
                        const oldest = entries.keys().next().value;
                        count -= entries.get(oldest).positions.size;
                        entries.delete(oldest);
                    }
                },
                clear() { entries.clear(); }
            };
        }

        // D3 tick() does not emit tick/end events. Explicitly render each short batch,
        // yield between batches, and stop after cooling or the tick/time budget.
        function createStaticLayout(sim, render, complete, failed) {
            let frame = 0;
            let ticks = 0;
            let elapsed = 0;
            let done = false;
            sim.stop().alphaTarget(0).alphaDecay(0.08);
            function step() {
                frame = 0;
                const start = performance.now();
                try {
                    do {
                        sim.tick();
                        ticks++;
                    } while (ticks < 120 && sim.alpha() > sim.alphaMin() && performance.now() - start < 6);
                    render();
                    elapsed += performance.now() - start;
                    if (ticks >= 120 || elapsed >= 600 || sim.alpha() <= sim.alphaMin()) {
                        done = true;
                        sim.alpha(0).stop();
                        complete();
                    } else {
                        resume();
                    }
                } catch (error) {
                    done = true;
                    sim.stop();
                    failed(error);
                }
            }
            function resume() {
                if (!done && !frame && !document.hidden) frame = requestAnimationFrame(step);
            }
            function pause() {
                if (frame) cancelAnimationFrame(frame);
                frame = 0;
            }
            return {
                resume,
                pause,
                stop() { done = true; pause(); sim.stop(); }
            };
        }

        function createGraphDragHandlers(sim, isLow, stopLayout, renderNode, saveLayout) {
            return {
                start(event) {
                    if (isLow()) {
                        stopLayout();
                        sim.alpha(0).stop();
                    } else if (!event.active) {
                        sim.alphaTarget(0.3).restart();
                    }
                    event.subject.fx = event.subject.x;
                    event.subject.fy = event.subject.y;
                },
                drag(event) {
                    event.subject.fx = event.x;
                    event.subject.fy = event.y;
                    if (isLow()) {
                        Object.assign(event.subject, { x: event.x, y: event.y, vx: 0, vy: 0 });
                        renderNode(event.subject);
                    }
                },
                end(event) {
                    if (!event.active) sim.alphaTarget(0);
                    event.subject.fx = null;
                    event.subject.fy = null;
                    saveLayout();
                }
            };
        }
`;
