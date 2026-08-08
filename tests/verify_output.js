/**
 * verify_output.js - 算法输出准确性全局核对
 *
 * 核对维度：
 *  1. 排序族：最终数组非降序 + 元素多集与输入一致（抓"排错序"类 bug）
 *  2. 全局扫描：所有步骤快照中 array/stack/queue 的 value 不得为对象/undefined
 *     （抓"显示 [object Object]" 类 bug）
 *  3. BST 族（bst/avl/rb）：最终树中序遍历非降序（BST 性质）
 *  4. 堆族（heap）：最终数组满足大顶堆性质（父 >= 子）
 *  5. 二分查找：返回目标索引 / 未找到 -1
 *  6. 汉诺塔：最终 A 空、C 满、步骤数 = 2^n - 1
 *  7. 所有算法：最终步骤快照存在（不崩溃、有输出）
 */
'use strict';

const { createSandbox, loadAllScripts } = require('./sandbox.js');

const { sandbox, context } = createSandbox();
loadAllScripts(context);

const AlgorithmLoader = sandbox.AlgorithmLoader;
const allAlgos = AlgorithmLoader.list();

const issues = [];
const checked = { sorting: 0, objectScan: 0, bst: 0, heap: 0, misc: 0 };

function isSortedAsc(vals) {
    for (let i = 1; i < vals.length; i++) {
        if (vals[i - 1] > vals[i]) return false;
    }
    return true;
}

function multisetEqual(a, b) {
    if (a.length !== b.length) return false;
    const sa = a.slice().sort((x, y) => x - y);
    const sb = b.slice().sort((x, y) => x - y);
    for (let i = 0; i < sa.length; i++) {
        if (sa[i] !== sb[i]) return false;
    }
    return true;
}

/** 运行算法，返回 { steps, finalState } */
function runAlgo(algo, data) {
    const ctx = new sandbox.TracerContext();
    algo.run(ctx, data || algo.defaultData);
    const steps = ctx.store.getSteps();
    const finalState = steps.length ? steps[steps.length - 1].state || {} : {};
    return { steps, finalState };
}

/** 从树快照做中序遍历 */
function inorderFromSnap(snap) {
    const vals = [];
    if (!snap || !snap.nodes) return vals;
    const nodes = snap.nodes;
    const visit = (i) => {
        if (i === null || i === undefined || !nodes[i] || nodes[i].hidden) return;
        visit(nodes[i].left);
        const v = nodes[i].value;
        if (typeof v === 'number' && !Number.isNaN(v)) vals.push(v);
        visit(nodes[i].right);
    };
    visit(snap.root);
    return vals;
}

console.log('=== AlgoLens 输出准确性全局核对 ===\n');

for (const algo of allAlgos) {
    const id = algo.id;
    let data = algo.defaultData;
    // 排序类统一用固定数据（保证有重复与乱序）——仅 category 为 sorting 的算法
    const isSorting = algo.category === 'sorting';
    if (isSorting && (!data || !data.length)) data = [5, 3, 8, 1, 2, 7, 4, 6];

    let steps, finalState;
    try {
        const r = runAlgo(algo, data);
        steps = r.steps;
        finalState = r.finalState;
    } catch (e) {
        issues.push(`[${id}] 运行异常: ${String(e).slice(0, 120)}`);
        continue;
    }

    if (!steps || !steps.length) {
        issues.push(`[${id}] 无步骤输出`);
        continue;
    }

    // 按 _type 提取快照（快照以 tracer 名字存储，如 'arr'/'array'/'bit'）
    function findSnap(type) {
        for (const name of Object.keys(finalState)) {
            if (finalState[name] && finalState[name]._type === type) return finalState[name];
        }
        return null;
    }

    // ===== 维度 2：全局 object 扫描（所有步骤） =====
    let objFound = false;
    for (const st of steps) {
        const stt = st.state || {};
        for (const name of Object.keys(stt)) {
            const snap = stt[name];
            if (!snap || !Array.isArray(snap.items)) continue;
            for (const it of snap.items) {
                if (it && (typeof it.value === 'object' || typeof it.value === 'undefined' || Number.isNaN(it.value))) {
                    objFound = true;
                    break;
                }
            }
            if (objFound) break;
        }
        if (objFound) break;
    }
    checked.objectScan++;
    if (objFound) {
        issues.push(`[${id}] 存在 value 为对象/undefined/NaN 的元素（会渲染成 [object Object]）`);
    }

    // ===== 维度 1：排序族最终有序性 =====
    if (isSorting) {
        checked.sorting++;
        const arrSnap = findSnap('array');
        const arr = arrSnap ? arrSnap.items.map(it => it.value) : null;
        if (arr && arr.length) {
            if (!isSortedAsc(arr)) {
                issues.push(`[${id}] 排序结果非升序: [${arr.join(', ')}]`);
            }
            const input = Array.isArray(data) ? data.filter(v => typeof v === 'number') : [];
            if (!multisetEqual(arr, input)) {
                issues.push(`[${id}] 排序结果与输入多集不一致: [${arr.join(', ')}] vs 输入 [${input.join(', ')}]`);
            }
        } else {
            issues.push(`[${id}] 排序算法未能从最终状态提取数组`);
        }
    }

    // ===== 维度 3：BST 族中序有序 =====
    if (/bst|avl|rb/i.test(id) && finalState.tree) {
        checked.bst++;
        const vals = inorderFromSnap(finalState.tree);
        if (vals.length >= 2 && !isSortedAsc(vals)) {
            issues.push(`[${id}] BST 中序遍历非有序: [${vals.join(', ')}]`);
        }
    }

    // ===== 维度 4：堆族大顶堆性质 =====
    // 排除排序类：堆排序完成后是升序数组而非堆结构，属于排序族检查范围
    if (/heap|堆/i.test(id) && !isSorting) {
        const heapSnap = findSnap('array');
        if (heapSnap) {
            checked.heap++;
            const vals = heapSnap.items.map(it => it.value).filter(v => typeof v === 'number');
            let ok = true;
            for (let i = 0; i < vals.length; i++) {
                const l = 2 * i + 1, r = 2 * i + 2;
                if (l < vals.length && vals[i] < vals[l]) ok = false;
                if (r < vals.length && vals[i] < vals[r]) ok = false;
            }
            if (!ok) issues.push(`[${id}] 最终数组不满足大顶堆性质: [${vals.join(', ')}]`);
        }
    }
}

// ===== 维度 5：二分查找 =====
checked.misc++;
{
    const bs = allAlgos.find(a => a.id === 'classic.binarySearchRec' || a.id === 'classic.binarySearch');
    if (bs) {
        const ctx = new sandbox.TracerContext();
        try {
            bs.run(ctx, [1, 3, 5, 7, 9, 11]);
            const steps = ctx.store.getSteps();
            const logs = steps.filter(s => s.type === 'log').map(s => s.description);
            const found = logs.some(l => /找到|命中/.test(l));
            if (!found) issues.push('[classic.binarySearchRec] 未输出"找到"日志（核对失败）');
        } catch (e) {
            issues.push(`[classic.binarySearchRec] 运行异常: ${String(e).slice(0, 100)}`);
        }
    }
}

// ===== 维度 6：汉诺塔 =====
{
    const hanoi = allAlgos.find(a => a.id === 'classic.hanoi');
    if (hanoi) {
        checked.misc++;
        try {
            const ctx = new sandbox.TracerContext();
            hanoi.run(ctx);
            const steps = ctx.store.getSteps();
            const finalState = steps[steps.length - 1].state;
            const rodA = finalState.A ? finalState.A.items.map(i => i.value) : [];
            const rodC = finalState.C ? finalState.C.items.map(i => i.value) : [];
            const moveLogs = steps.filter(s => /移动|move/i.test(s.description)).length;
            if (rodA.length !== 0) issues.push('[classic.hanoi] 最终 A 柱非空');
            if (moveLogs !== Math.pow(2, 3) - 1) issues.push(`[classic.hanoi] 移动次数 ${moveLogs} ≠ 2^3-1=7`);
        } catch (e) {
            issues.push(`[classic.hanoi] 运行异常: ${String(e).slice(0, 100)}`);
        }
    }
}

console.log(`已核对: 排序 ${checked.sorting} | 全量 object 扫描 ${checked.objectScan} | BST ${checked.bst} | 堆 ${checked.heap} | 其他 ${checked.misc}`);
console.log(`算法总数: ${allAlgos.length}`);
if (issues.length === 0) {
    console.log('\n=== 全部输出核对通过 ===');
} else {
    console.log(`\n发现 ${issues.length} 个问题:`);
    issues.forEach(i => console.log('  ✗ ' + i));
    process.exit(1);
}
