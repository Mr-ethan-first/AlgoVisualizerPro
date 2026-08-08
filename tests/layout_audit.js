/**
 * AlgoLens 布局完整性审计 - 全局扫描
 *
 * 对 91 个算法在「宽屏 / 窄窗」两种画布尺寸下，逐步骤构建渲染状态，
 * 检查动画元素（数组/树/图/链表/DP表/棋盘/辅助面板）是否：
 *   1. 越界：超出画布边界（动画元素不允许展示不全）
 *   2. 重叠：被其他框（辅助面板/其他结构）遮住
 *
 * 运行方式：node tests/layout_audit.js
 */
const { createSandbox, loadAllScripts } = require('./sandbox.js');

const { sandbox, context } = createSandbox();
loadAllScripts(context);

const AlgorithmLoader = sandbox.AlgorithmLoader;
const allAlgos = AlgorithmLoader.list();

const WIDTHS = [1200, 700]; // 宽屏 / 窄窗
const CANVAS_H = 287;       // 紧凑模式（普通分类）实际画布高度
const TALL_H = 620;         // 高画布模式（图/树/进阶分布式）画布高度
const TALL_CATEGORIES = ['graph', 'tree', 'advanced'];

// ===== 构建渲染状态（与 animator._renderCurrent 一致） =====
function makeBuilder(canvasW, canvasH) {
    const stubRenderer = {
        width: canvasW, height: canvasH,
        _dimText: () => '#888',
        _panelText: () => '#ccc'
    };
    const proto = sandbox.Animator.prototype;
    const self = {
        renderer: stubRenderer,
        _stateColor: proto._stateColor,
        _stateBorder: proto._stateBorder,
        _arrayOptions: proto._arrayOptions,
        _layoutMultipleArrays: proto._layoutMultipleArrays,
        _buildLinkedListShapes: proto._buildLinkedListShapes,
        _buildDPTableShapes: proto._buildDPTableShapes,
        _buildChessBoardShapes: proto._buildChessBoardShapes,
        _buildTreeState: proto._buildTreeState,
        _buildGraphState: proto._buildGraphState,
        _defaultStateBuilder: proto._defaultStateBuilder
    };
    self._defaultStateBuilder = proto._defaultStateBuilder.bind(self);
    return function build(tracerStates, step) {
        return self._defaultStateBuilder(tracerStates, step, { width: canvasW, height: canvasH });
    };
}

// ===== 检查单个渲染状态 =====
function auditState(state, W, H, id, stepIdx, issues) {
    const where = `[${id}] W=${W} step#${stepIdx + 1}`;
    const pad = 2; // 允许 2px 误差

    // 1. 数组（计算实际绘制坐标）
    if (state.array) {
        const o = state.array.options || {};
        const x0 = o.x || 60, y0 = o.y || 80;
        const cw = o.cellW || 48, ch = o.cellH || 48, gap = o.gap || 6;
        state.array.items.forEach((it, i) => {
            const ix = x0 + i * (cw + gap);
            const iy = y0;
            if (ix < -pad || ix + cw > W + pad) issues.push(`${where}: 数组元素[${i}]=${it.value} 越界 x=[${ix},${ix + cw}] (画布宽 ${W})`);
            if (iy < -pad || iy + ch + 24 > H + pad) issues.push(`${where}: 数组元素[${i}] 越界 y=[${iy},${iy + ch}] (画布高 ${H})`);
        });
    }
    // 2. 树节点
    if (state.tree) {
        const r = (state.tree.options && state.tree.options.radius) || 18;
        (state.tree.nodes || []).forEach((n, i) => {
            if (!n || n.hidden) return;
            if (n.x - r < -pad || n.x + r > W + pad || n.y - r < -pad || n.y + r > H + pad) {
                issues.push(`${where}: 树节点[${i}] label=${n.label} 越界 (${n.x.toFixed(0)},${n.y.toFixed(0)}) r=${r} W=${W} H=${H}`);
            }
        });
    }
    // 3. 图节点
    if (state.graph) {
        const r = (state.graph.options && state.graph.options.radius) || 20;
        (state.graph.vertices || []).forEach((v, i) => {
            if (!v) return;
            if (v.x - r < -pad || v.x + r > W + pad || v.y - r < -pad || v.y + r > H + pad) {
                issues.push(`${where}: 图节点[${i}] label=${v.label} 越界 (${v.x.toFixed(0)},${v.y.toFixed(0)})`);
            }
        });
    }
    // 4. shapes（链表/DP表/棋盘/多数组/哈希环）
    (state.shapes || []).forEach((s, i) => {
        if (s.kind === 'rect') {
            if (s.x < -pad || s.x + s.w > W + pad || s.y < -pad || s.y + s.h > H + pad) {
                issues.push(`${where}: shape rect[${i}] ${s.label} 越界 (${s.x.toFixed(0)},${s.y.toFixed(0)},${s.w},${s.h})`);
            }
        } else if (s.kind === 'circle') {
            if (s.x - s.r < -pad || s.x + s.r > W + pad || s.y - s.r < -pad || s.y + s.r > H + pad) {
                issues.push(`${where}: shape circle[${i}] ${s.label} 越界 (${s.x.toFixed(0)},${s.y.toFixed(0)},r=${s.r})`);
            }
        } else if (s.kind === 'line') {
            if (s.x1 < -pad || s.x1 > W + pad || s.y1 < -pad || s.y1 > H + pad ||
                s.x2 < -pad || s.x2 > W + pad || s.y2 < -pad || s.y2 > H + pad) {
                issues.push(`${where}: shape line[${i}] 越界 (${s.x1.toFixed(0)},${s.y1.toFixed(0)})→(${s.x2.toFixed(0)},${s.y2.toFixed(0)})`);
            }
        } else if (s.kind === 'text') {
            if (s.x < -pad || s.x > W + pad || s.y < -pad || s.y > H + pad) {
                issues.push(`${where}: shape text[${i}] "${s.text}" 越界 (${s.x.toFixed(0)},${s.y.toFixed(0)})`);
            }
        }
    });
    // 5. 辅助面板（栈/队列）——越界 + 与主结构重叠（遮盖）
    const panels = (state.overlays || []).map(o => o.panel).filter(Boolean);
    panels.forEach((p, pi) => {
        if (p.x < -pad || p.x + p.w > W + pad || p.y < -pad || p.y + p.h > H + pad) {
            issues.push(`${where}: 辅助面板[${pi}] 越界 (${p.x},${p.y},${p.w},${p.h})`);
        }
    });
    // 面板与主结构重叠检测（数组矩形区域）
    if (panels.length && state.array) {
        const o = state.array.options || {};
        const x0 = o.x || 60, y0 = o.y || 80;
        const cw = o.cellW || 48, ch = o.cellH || 48, gap = o.gap || 6;
        const arrW = (state.array.items.length) * (cw + gap) - gap;
        const arrRect = { x: x0, y: y0, w: Math.max(0, arrW), h: ch + 24 };
        panels.forEach((p, pi) => {
            const ox = Math.max(arrRect.x, p.x), oy = Math.max(arrRect.y, p.y);
            const o2x = Math.min(arrRect.x + arrRect.w, p.x + p.w);
            const o2y = Math.min(arrRect.y + arrRect.h, p.y + p.h);
            if (ox < o2x && oy < o2y) {
                issues.push(`${where}: 辅助面板[${pi}] 与数组重叠 (${ox.toFixed(0)},${oy.toFixed(0)})`);
            }
        });
    }
}

// ===== 主流程 =====
console.log('=== AlgoLens 布局完整性全局审计 ===\n');
let allIssues = 0;
let checkedAlgos = 0;

for (const algo of allAlgos) {
    let out;
    try {
        out = AlgorithmLoader.runAlgorithm(algo.id, algo.defaultData);
    } catch (e) {
        console.log(`  ✗ ${algo.id}: 运行失败 ${e.message}`);
        allIssues++;
        continue;
    }
    checkedAlgos++;
    const steps = out.steps || [];
    const issues = [];
    const buildState = algo.buildState;
    // 高画布模式分类额外覆盖高画布尺寸（紧凑模式其余分类只审计真实高度）
    const heights = TALL_CATEGORIES.includes(algo.category) ? [CANVAS_H, TALL_H] : [CANVAS_H];

    for (const W of WIDTHS) {
        for (const H of heights) {
            const build = makeBuilder(W, H);
            const tracerStates = {};
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                if (step && step.state) Object.assign(tracerStates, step.state);
                let rs = null;
                try {
                    if (buildState) {
                        // 自定义构建器：多数为 buildBinaryTreeState 风格 (tracerStates, step, ctxInfo)
                        rs = buildState(tracerStates, step, { width: W, height: H });
                    } else {
                        rs = build(tracerStates, step);
                    }
                } catch (e) { /* 忽略构建异常（其他测试覆盖） */ }
                if (rs) auditState(rs, W, H, algo.id, i, issues);
            }
        }
    }

    if (issues.length) {
        allIssues += issues.length;
        console.log(`  ✗ ${algo.id}: ${issues.length} 个问题`);
        const seen = new Set();
        issues.slice(0, 12).forEach(m => { if (!seen.has(m)) { seen.add(m); console.log(`      ${m}`); } });
        if (issues.length > 12) console.log(`      ... 其余 ${issues.length - 12} 条`);
    } else {
        console.log(`  ✓ ${algo.id}`);
    }
}

console.log(`\n=== 审计完成：${checkedAlgos} 个算法，共 ${allIssues} 个布局问题 ===`);
process.exit(allIssues ? 1 : 0);
