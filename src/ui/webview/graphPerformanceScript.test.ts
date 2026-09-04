import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { GRAPH_PERFORMANCE_SCRIPT } from './graphPerformanceScript';

function harness() {
    const frames = new Map<number, () => void>();
    let id = 0;
    let time = 0;
    const context = vm.createContext({
        document: { hidden: false },
        performance: { now: () => time },
        requestAnimationFrame: (callback: () => void) => { frames.set(++id, callback); return id; },
        cancelAnimationFrame: (key: number) => frames.delete(key),
    });
    vm.runInContext(GRAPH_PERFORMANCE_SCRIPT, context);
    const simulation = {
        stop: vi.fn().mockReturnThis(),
        restart: vi.fn().mockReturnThis(),
        alphaTarget: vi.fn().mockReturnThis(),
        alphaDecay: vi.fn().mockReturnThis(),
        alphaMin: () => 0.001,
        alpha: vi.fn((value?: number) => value === undefined ? 1 : simulation),
        tick: vi.fn(() => { time += 2; }),
    };
    const render = vi.fn();
    const complete = vi.fn();
    const failed = vi.fn();
    Object.assign(context, { simulation, render, complete, failed });
    return {
        context, frames, simulation, render, complete, failed,
        run: (code: string) => vm.runInContext(code, context),
        advance(ms: number) { time += ms; },
        frame() {
            const callbacks = [...frames.values()];
            frames.clear();
            callbacks.forEach(callback => callback());
        },
    };
}

describe('graph performance helpers', () => {
    it('defaults to low mode, only accepts high explicitly', () => {
        const h = harness();
        expect(h.run('[undefined, null, "low", "invalid"].map(normalizePerformanceMode)'))
            .toEqual(['low', 'low', 'low', 'low']);
        expect(h.run('normalizePerformanceMode("high")')).toBe('high');
    });

    it('yields between static layout batches and has no animation work after the tick budget', () => {
        const h = harness();
        h.run('var layout = createStaticLayout(simulation, render, complete, failed); layout.resume();');
        h.frame();
        expect(h.simulation.tick).toHaveBeenCalledTimes(3);
        expect(h.render).toHaveBeenCalledTimes(1);
        for (let i = 0; i < 60; i++) { h.frame(); }
        expect(h.simulation.tick).toHaveBeenCalledTimes(120);
        expect(h.complete).toHaveBeenCalledTimes(1);
        expect(h.frames.size).toBe(0);
        expect(h.simulation.restart).not.toHaveBeenCalled();
        expect(h.failed).not.toHaveBeenCalled();
        h.run('layout.resume();');
        expect(h.frames.size).toBe(0);
    });

    it('also stops on cooling or the compute-time budget', () => {
        for (const cooled of [false, true]) {
            const h = harness();
            if (cooled) {
                h.simulation.alpha.mockImplementation(value => value === undefined ? 0 : h.simulation);
            } else {
                h.simulation.tick.mockImplementation(() => h.advance(100));
            }
            h.run('createStaticLayout(simulation, render, complete, failed).resume();');
            for (let i = 0; i < 20; i++) { h.frame(); }
            expect(h.simulation.tick).toHaveBeenCalledTimes(cooled ? 1 : 6);
            expect(h.complete).toHaveBeenCalledTimes(1);
            expect(h.frames.size).toBe(0);
        }
    });

    it('pauses while hidden, resumes once, and cancels replaced layouts', () => {
        const h = harness();
        h.run('var layout = createStaticLayout(simulation, render, complete, failed); layout.resume(); layout.resume();');
        expect(h.frames.size).toBe(1);
        h.run('document.hidden = true; layout.pause(); layout.resume();');
        expect(h.frames.size).toBe(0);
        h.run('document.hidden = false; layout.resume();');
        expect(h.frames.size).toBe(1);
        h.run('layout.stop(); layout.resume();');
        h.frame();
        expect(h.simulation.tick).not.toHaveBeenCalled();
        expect(h.frames.size).toBe(0);
    });

    it('reports layout failures and does not leave a frame scheduled', () => {
        const h = harness();
        h.render.mockImplementation(() => { throw new Error('render failed'); });
        h.run('createStaticLayout(simulation, render, complete, failed).resume();');
        h.frame();
        expect(h.failed).toHaveBeenCalledOnce();
        expect(h.complete).not.toHaveBeenCalled();
        expect(h.frames.size).toBe(0);
    });

    it('caches geometry across prose changes but invalidates changed topology', () => {
        const h = harness();
        h.run(`var cache = createLayoutCache();
            var nodes = [{id:'a', x:10, y:20, evidence:['secret']}, {id:'b', x:30, y:40}];
            var links = [{sourceId:'a', targetId:'b', verb:'calls'}];
            cache.set('one', nodes, links, {x:1, y:2, k:0.5});
            nodes[0].x = 99;
            nodes[0].description = 'edited prose';`);
        expect(h.run('cache.get("one", nodes, links).positions.get("a")')).toEqual({ x: 10, y: 20 });
        expect(h.run('cache.get("one", [...nodes].reverse(), links).transform')).toEqual({ x: 1, y: 2, k: 0.5 });
        expect(h.run('cache.get("one", nodes, [{...links[0], verb:"imports"}])')).toBeNull();
        expect(h.run('cache.get("one", nodes.slice(1), links)')).toBeNull();
    });

    it('bounds cached group/node counts and uses least recently used eviction', () => {
        const h = harness();
        h.run(`var cache = createLayoutCache(2, 3);
            var nodes = [{id:'a', x:1, y:2}]; var view = {x:0,y:0,k:1};
            cache.set('one', nodes, [], view); cache.set('two', nodes, [], view);
            cache.get('one', nodes, []); cache.set('three', nodes, [], view);`);
        expect(h.run('cache.get("two", nodes, [])')).toBeNull();
        expect(h.run('cache.get("one", nodes, [])')).not.toBeNull();
        h.run("cache.set('large', [...nodes, {id:'b',x:1,y:2}, {id:'c',x:1,y:2}], [], view);");
        expect(h.run('cache.get("one", nodes, [])')).toBeNull();
        h.run('cache.clear();');
        expect(h.run('cache.get("three", nodes, [])')).toBeNull();
    });

    it('preserves unfinished layout state so quick group switches do not freeze an initial layout', () => {
        const h = harness();
        h.run(`var cache = createLayoutCache(); var nodes = [{id:'a', x:0, y:0}];
            cache.set('pending', nodes, [], {x:0,y:0,k:1}, {settled:false,alpha:0.8,autoFit:true});`);
        expect(h.run('cache.get("pending", nodes, [])')).toMatchObject({
            settled: false, alpha: 0.8, autoFit: true,
        });
    });

    it('moves only the dragged node in low mode and retains high-mode physics', () => {
        for (const low of [true, false]) {
            const h = harness();
            h.context.low = low;
            h.run(`var subject = {id:'a', x:0, y:0};
                var handlers = createGraphDragHandlers(simulation, () => low, complete, render, failed);
                handlers.start({active: false, subject});
                handlers.drag({subject, x:30, y:40});
                handlers.end({active: false, subject});`);
            expect(h.run('subject.fx')).toBeNull();
            expect(h.run('subject.fy')).toBeNull();
            expect(h.failed).toHaveBeenCalledOnce(); // save callback
            if (low) {
                expect(h.simulation.restart).not.toHaveBeenCalled();
                expect(h.complete).toHaveBeenCalledOnce(); // stop layout callback
                expect(h.render).toHaveBeenCalledOnce();
                expect(h.run('[subject.x, subject.y]')).toEqual([30, 40]);
            } else {
                expect(h.simulation.restart).toHaveBeenCalledOnce();
                expect(h.render).not.toHaveBeenCalled();
                expect(h.run('[subject.x, subject.y]')).toEqual([0, 0]);
            }
        }
    });
});
