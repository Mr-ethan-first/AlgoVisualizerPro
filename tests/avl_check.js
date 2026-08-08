/**
 * AVL 旋转 relink 修复验证脚本
 * 校验点：
 * 1. 每个 rotate commit 快照包含"截至该步已插入"的全部节点（不残缺、无自环）
 * 2. 快照树结构合法（BST 序：left < val < right）
 * 3. 旋转参与节点 >= 2 个红色标记
 */
const { createSandbox, loadScripts, SCRIPTS } = require('./sandbox.js');

const { sandbox, context } = createSandbox();
for (const s of SCRIPTS) loadScripts(context, s);

const AlgorithmLoader = sandbox.AlgorithmLoader;
const avl = AlgorithmLoader.list().find(a => /avl/i.test(a.id));
const out = AlgorithmLoader.runAlgorithm(avl.id, avl.defaultData);
const steps = out.steps;
const order = avl.defaultData.slice(); // 插入顺序 [10,20,30,40,50,25]

const rotates = [];
for (let i = 0; i < steps.length; i++) {
    const treeSnap = steps[i].state && steps[i].state.tree;
    if (!treeSnap || !treeSnap.nodes) continue;
    const desc = String(steps[i].description || '');
    if (/红=参与/.test(desc)) rotates.push({ i, desc, nodes: treeSnap.nodes, root: treeSnap.root });
}

console.log(`AVL ${avl.id}  total steps: ${steps.length}, rotate commits: ${rotates.length}`);
let pass = true;

for (const r of rotates) {
    const nodes = r.nodes;
    const present = nodes.filter(n => n && n.value !== null && n.value !== undefined).map(n => n.value);
    const count = present.length;
    // 截至该步已插入的值 = 插入顺序前 count 个（rotate 发生在第 count 次插入的平衡检查中）
    const expected = order.slice(0, count).map(String).sort();
    const actual = present.map(String).sort();
    const okValues = expected.length === actual.length && expected.every((v, idx) => v === actual[idx]);

    // BST 结构合法性（用 snapshot 的 left/right 下标）
    let bstOk = true;
    const checkBST = (idx, lo, hi) => {
        if (idx === null || idx === undefined) return true;
        const n = nodes[idx];
        if (!n) return true;
        if (n.value <= lo || n.value >= hi) { bstOk = false; return false; }
        return checkBST(n.left, lo, n.value) && checkBST(n.right, n.value, hi);
    };
    checkBST(0, -Infinity, Infinity);

    const reds = present.filter(v => nodes.find(n => n.value === v) && nodes.find(n => n.value === v).state === 'rotate');
    const redOk = reds.length >= 2;
    const rootOk = r.root === 0; // 布局引擎依赖 root 遍历
    const status = okValues && bstOk && redOk && rootOk ? 'PASS' : 'FAIL';
    if (!okValues || !bstOk || !redOk || !rootOk) pass = false;
    console.log(`  [${status}] step ${r.i}: [${present.join(',')}] red=[${reds.join(',')}] bst=${bstOk} root=${r.root} ${r.desc}`);
}

console.log(pass ? '\nPASS: 所有 rotate commit 树完整且合法' : '\nFAIL');
process.exit(pass ? 0 : 1);
