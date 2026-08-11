/**
 * 验证 buildSplitState：对全部 21 个挂载左右分框的算法，
 * 确认（1）不抛异常；（2）产出 2 个方框；（3）两种主结构各落在一个框内、互不跨越中缝（无重叠）；
 * （4）整体内容在画布内不越界。
 */
const { createSandbox, loadScripts } = require('./sandbox.js');
const { sandbox, context } = createSandbox();
const base = [
    'core/store.js', 'core/renderer.js', 'core/layoutEngine.js', 'core/tracer.js',
    'core/animator.js', 'core/codeRegistry.js', 'core/algorithmLoader.js', 'core/stateBuilders.js',
    'ui/codeViewer.js', 'ui/sidebar.js', 'ui/controls.js', 'ui/themeSwitcher.js',
    'ui/toast.js', 'ui/shortcut.js',
    'algorithms/sorting.js', 'algorithms/linear.js', 'algorithms/tree.js', 'algorithms/graph.js',
    'algorithms/string_classic.js', 'algorithms/p1_algorithms.js', 'algorithms/p2_algorithms.js',
    'algorithms/p3_algorithms.js', 'algorithms/advanced_algorithms.js'
];
for (const r of base) loadScripts(context, r);
for (const r of ['algorithms/algs4_batch1.js', 'algorithms/algs4_batch2.js', 'algorithms/algs4_batch3.js', 'algorithms/algs4_batch4.js', 'algorithms/algs4_batch5.js', 'algorithms/splitOverrides.js', 'algorithms/index.js']) loadScripts(context, r);

const Animator = sandbox.Animator;
const AlgorithmLoader = sandbox.AlgorithmLoader;
const StateBuilders = sandbox.StateBuilders;

// 构造一个“宿主”对象，复用 Animator 原型上的子构建器，并提供一个最小 renderer 桩
const tokens = {
    cell: '#E4F1D4', cellBorder: '#4F7F2E', node: '#E4F1D4', nodeBorder: '#4F7F2E',
    panelBg: '#FFFFFF', auxBg: '#F3F7EB', dim: '#4C5C39', panelText: '#1C2712',
    canvasBg: '#FBFCF8', boxFill: '#F5F8EF', boxBorder: '#9DB585', boxLabelBg: '#FFFFFF',
    edge: '#8AA372', rbRed: '#E85D4C', rbBlack: '#2D3A4F',
    radiusCell: [10, 10, 10, 10], radiusRect: [12, 12, 12, 12], radiusSmall: [6, 6, 6, 6],
    font: 'sans-serif', mono: 'monospace'
};
const renderer = {
    width: 900, height: 560,
    _tokens: () => tokens,
    _dimText: () => tokens.dim,
    _panelText: () => tokens.panelText,
    _clearShadow() {},
    ctx: { font: '', measureText: (s) => ({ width: String(s).length * 7 }) }
};
const host = Object.create(Animator.prototype);
host.renderer = renderer;

const IDS = [
    'advanced.raftLog', 'graph.assignment', 'graph.bellmanFord', 'graph.bipartiteX',
    'graph.boruvka', 'graph.dfsOrder', 'graph.dijkstraAll', 'graph.dirEulerCycle',
    'graph.dirEulerPath', 'graph.eulerCycle', 'graph.bellmanFord', 'graph.maxflow',
    'graph.topoX', 'graph.transClosure', 'graph.zeroSum', 'math.fft', 'math.gaussElim',
    'math.gaussJordan', 'math.linProg', 'search.indexMaxPQ', 'search.indexMinPQ', 'string.hash'
].filter((v, i, a) => a.indexOf(v) === i);

function structureBounds(state) {
    // 返回 {graph,tree,array,dptable} 各自的 x 范围（用于检测是否跨越中缝）
    const res = [];
    if (state.graph && state.graph.vertices) {
        let mn = Infinity, mx = -Infinity;
        state.graph.vertices.forEach(v => {
            if (v.hidden) return;
            const r = v.radius || state.graph.options && state.graph.options.radius || 20;
            mn = Math.min(mn, v.x - r); mx = Math.max(mx, v.x + r);
        });
        if (mn < Infinity) res.push({ kind: 'graph', mn, mx });
    }
    if (state.tree && state.tree.nodes) {
        let mn = Infinity, mx = -Infinity;
        state.tree.nodes.forEach(n => {
            if (n.hidden) return;
            const r = state.tree.options && state.tree.options.radius || 20;
            mn = Math.min(mn, n.x - r); mx = Math.max(mx, n.x + r);
        });
        if (mn < Infinity) res.push({ kind: 'tree', mn, mx });
    }
    if (state.array && state.array.options) {
        const o = state.array.options;
        const totalW = (state.array.items ? state.array.items.length : 0) * ((o.cellW || 48) + (o.gap || 6)) - (o.gap || 6);
        res.push({ kind: 'array', mn: o.x, mx: o.x + totalW });
    }
    if (state.shapes && state.shapes.length) {
        let mn = Infinity, mx = -Infinity;
        state.shapes.forEach(s => {
            if (s.kind === 'rect') { mn = Math.min(mn, s.x); mx = Math.max(mx, s.x + s.w); }
        });
        if (mn < Infinity) res.push({ kind: 'dptable', mn, mx });
    }
    return res;
}

let pass = 0, fail = 0;
const failures = [];
for (const id of IDS) {
    try {
        const run = AlgorithmLoader.runAlgorithm(id);
        if (!run.steps.length) { failures.push(id + ' : 无步骤'); fail++; continue; }
        // 合并 tracerStates（同 _buildStateForStep）
        const ts = {};
        for (let k = 0; k < run.steps.length; k++) {
            if (run.steps[k] && run.steps[k].state) Object.assign(ts, run.steps[k].state);
        }
        const last = run.steps[run.steps.length - 1];
        const state = StateBuilders.buildSplitState.call(host, ts, last, { width: 900, height: 560 });
        if (!state || !state.boxes || state.boxes.length !== 2) {
            failures.push(id + ' : 未生成 2 个方框 (boxes=' + (state && state.boxes ? state.boxes.length : 'null') + ')');
            fail++; continue;
        }
        const [bL, bR] = state.boxes;
        const gapStart = bL.x + bL.w, gapEnd = bR.x;
        // 检查每个主结构都完整落在左框或右框内，不跨越中缝
        const bounds = structureBounds(state);
        let straddle = null;
        for (const b of bounds) {
            const inL = b.mx <= gapStart + 1 && b.mn >= bL.x - 1;
            const inR = b.mn >= gapEnd - 1 && b.mx <= bR.x + bR.w + 1;
            if (!inL && !inR) { straddle = b; break; }
        }
        // 检查整体不越界画布
        const allMn = Math.min(...bounds.map(b => b.mn));
        const allMx = Math.max(...bounds.map(b => b.mx));
        const overflow = allMn < -2 || allMx > 902;
        if (straddle) {
            failures.push(id + ' : 结构 ' + straddle.kind + ' 跨越中缝 [' + straddle.mn.toFixed(0) + ',' + straddle.mx.toFixed(0) + '] gap=[' + gapStart.toFixed(0) + ',' + gapEnd.toFixed(0) + ']');
            fail++; continue;
        }
        if (overflow) {
            failures.push(id + ' : 内容越界 [' + allMn.toFixed(0) + ',' + allMx.toFixed(0) + ']');
            fail++; continue;
        }
        pass++;
    } catch (e) {
        failures.push(id + ' : 异常 ' + (e && e.message));
        fail++;
    }
}
console.log('PASS=' + pass + ' FAIL=' + fail);
if (failures.length) { console.log('--- FAILURES ---'); failures.forEach(f => console.log('  ' + f)); }
process.exit(fail ? 1 : 0);
