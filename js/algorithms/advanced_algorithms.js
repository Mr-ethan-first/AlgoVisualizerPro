/**
 * 高级算法集合 - 19 个补充算法
 *
 * 分类：
 *   - 排序：基数排序(LSD)
 *   - 线性：链式栈
 *   - 树：后序遍历(递归)、BST删除(非递归)、AVL删除、红黑树插入/删除
 *         线段树区间查询/单点更新、树状数组查询/更新、Trie插入/搜索
 *   - 字符串：Boyer-Moore 匹配
 *   - 经典：数独求解、生产者消费者、哲学家就餐
 *   - 进阶：跳表查找/插入
 */
(function () {
    'use strict';

    const NUM_DATA = (s) => s.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n));
    const STR_DATA = (s) => s.split(',').map(x => x.trim()).filter(x => x.length > 0);

    // ====================================================================
    // 通用状态构建器
    // ====================================================================

    // 树状态构建器：统一使用公共实现（js/core/stateBuilders.js）
    const buildBinaryTreeState = StateBuilders.buildBinaryTreeState;
    const buildRadixSortState = StateBuilders.buildRadixSortState;

    // N-ary tree state builder (for Trie)
    function buildNaryTreeState(tracerStates, _step, ctxInfo) {
        const snap = tracerStates.tree;
        if (!snap) return null;
        const nodes = snap.nodes;
        if (!nodes || !nodes.length) return { tree: { nodes: [], edges: [] } };
        const layoutNodes = nodes.map(n => ({
            value: n ? n.value : null,
            children: n ? (n.children || []) : [],
            state: n ? n.state : 'default',
            tag: n ? n.tag : '',
            hidden: !n || n.hidden
        }));
        const canvasW = (ctxInfo && ctxInfo.width) || 800;
        const canvasH = (ctxInfo && ctxInfo.height) || 400;
        // Trie 节点间距充分拉开（vGap > 直径防止父子圆重叠）；不使用 minScale，
        // 让布局引擎按当前画布宽高等比缩放至“完全可见”（宽高都放得下）。
        // 动画区被 _applyContentSizing 拉高，这里只用更大一点的基础节点半径，
        // 配合高画布让节点清晰、五角星(★)标签不与相邻节点/文字挤压重叠。
        const positions = LayoutEngine.layoutNaryTree(layoutNodes, snap.root, {
            y: 0, hGap: 56, vGap: 84, nodeRadius: 30,
            fitWidth: canvasW, fitHeight: canvasH
        });
        const radius = positions._radius || 26;
        const fontSize = Math.max(12, Math.min(28, Math.round(radius * 0.62)));
        const renderNodes = nodes.map((n, i) => ({
            x: positions[i] ? positions[i].x : 0,
            y: positions[i] ? positions[i].y : 0,
            label: n ? n.value : '',
            state: n && !n.hidden ? n.state : 'default',
            tag: n ? n.tag : '',
            color: n ? n.color : null,
            hidden: !n || n.hidden
        }));
        const edges = [];
        nodes.forEach((n, i) => {
            if (!n || n.hidden || !n.children) return;
            for (const childIdx of n.children) {
                if (childIdx !== null && childIdx !== undefined && nodes[childIdx] && !nodes[childIdx].hidden) {
                    edges.push({ parent: i, child: childIdx });
                }
            }
        });
        const result2 = { tree: { nodes: renderNodes, edges, options: { radius, fontSize } } };
        result2._isTrie = true; // 仅 Trie 启用“拉高动画区”，不影响其它树/图算法
        if (ctxInfo && typeof Animator !== 'undefined' && Animator.addOverlays) {
            Animator.addOverlays(result2, tracerStates, ctxInfo.width, ctxInfo.height);
        }
        return result2;
    }

    // SkipList custom tracer (lightweight, satisfies TracerContext interface)
    class SkipListTracer {
        constructor(name) {
            this.name = name;
            this.type = 'skiplist';
            this.store = null;
            this._context = null;
            this.levels = [];
        }
        _attachStore(store) { this.store = store; }
        _commit(step) {
            if (!this.store) return;
            step.tracer = this.type;
            step.tracerName = this.name;
            if (this._context) {
                this._context.captureState(step);
            } else {
                step.state = { [this.name]: this.getSnapshot() };
            }
            this.store.push(step);
        }
        getSnapshot() {
            return {
                levels: this.levels.map(l => ({
                    level: l.level,
                    nodes: l.nodes.map(n => Object.assign({}, n))
                }))
            };
        }
        setLevels(levels, description) {
            this.levels = levels;
            this._commit({ type: 'snapshot', payload: {}, description: description || '更新跳表' });
        }
        highlight(lvl, idx, state, description) {
            if (this.levels[lvl] && this.levels[lvl].nodes[idx]) {
                this.levels[lvl].nodes[idx].state = state;
                this._commit({ type: 'highlight', payload: { level: lvl, idx, state }, description: description || '高亮' });
            }
        }
        clearHighlights() {
            for (const lvl of this.levels) {
                for (const n of lvl.nodes) n.state = 'default';
            }
        }
    }

    function     buildSkipListState(tracerStates, _step, ctxInfo) {
        const snap = tracerStates.skipList;
        if (!snap) return null;
        const state = { shapes: [] };
        const renderer = (typeof window !== 'undefined' && window.app && window.app.renderer) || null;
        const tokens = (renderer && typeof renderer._tokens === 'function') ? renderer._tokens() : {
            cell: '#e9ecef', cellBorder: '#d0d7de', dim: '#8b949e', panelText: '#24292f', radiusSmall: [4, 4, 4, 4]
        };
        const levels = snap.levels;
        if (!levels || !levels.length) return state;
        const cellW = 44, cellH = 36, gap = 4;
        const startY = 60, rowGap = 56;
        const cw = (ctxInfo && ctxInfo.width) || (renderer && renderer.width) || 800;
        levels.forEach((level, lvlIdx) => {
            const y = startY + (levels.length - 1 - lvlIdx) * rowGap;
            const nodes = level.nodes;
            const totalW = nodes.length * (cellW + gap) - gap;
            const x0 = Math.max(40, (cw - totalW) / 2);
            state.shapes.push({
                kind: 'text',
                x: x0 - 30, y: y + cellH / 2,
                text: 'L' + level.level, color: tokens.dim, fontSize: 11, align: 'right', opts: { bold: true }
            });
            nodes.forEach((n, i) => {
                const st = n.state || 'default';
                const colorMap = {
                    default: tokens.cell, current: '#bc8cff', compare: '#f78166',
                    visited: '#58a6ff', sorted: '#3fb950', path: '#3fb950'
                };
                state.shapes.push({
                    kind: 'rect',
                    x: x0 + i * (cellW + gap), y, w: cellW, h: cellH,
                    color: colorMap[st] || tokens.cell, radius: tokens.radiusSmall,
                    label: String(n.value === undefined || n.value === null ? '' : n.value),
                    opts: { stroke: tokens.cellBorder, strokeWidth: 1.5, fontSize: 13 }
                });
                if (i < nodes.length - 1) {
                    state.shapes.push({
                        kind: 'arrow',
                        x1: x0 + i * (cellW + gap) + cellW, y1: y + cellH / 2,
                        x2: x0 + (i + 1) * (cellW + gap), y2: y + cellH / 2,
                        color: tokens.cellBorder, headSize: 6, width: 1.5
                    });
                }
            });
        });
        return state;
    }

    // 通用：构造一棵示例二叉树
    function buildSampleTree() {
        return [
            { value: 1, left: 1, right: 2, parent: null },
            { value: 2, left: 3, right: 4, parent: 0 },
            { value: 3, left: null, right: 5, parent: 0 },
            { value: 4, left: null, right: null, parent: 1 },
            { value: 5, left: 6, right: null, parent: 1 },
            { value: 6, left: null, right: null, parent: 2 },
            { value: 7, left: null, right: null, parent: 4 }
        ];
    }

    // ====================================================================
    // 1. 排序 P2 - 基数排序 (LSD)
    // ====================================================================

    const radixSortCode = `function radixSort(arr) {
  const max = Math.max(...arr);
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    countingByDigit(arr, exp);
  }
}
function countingByDigit(arr, exp) {
  const buckets = Array.from({length: 10}, () => []);
  for (const x of arr) buckets[Math.floor(x / exp) % 10].push(x);
  let idx = 0;
  for (const b of buckets) for (const x of b) arr[idx++] = x;
}`;
    function radixSortRun(ctx, data) {
        let values = (data && data.length) ? data.slice() : [170, 45, 75, 90, 802, 24, 2, 66];
        // 为保证桶表在画布内完整展示，限制可视元素数量；仍保留所有位数轮次
        if (values.length > 24) values = values.slice(0, 24);
        const arr = ctx.add(new ArrayTracer('arr', values.slice()));
        const log = ctx.add(new LogTracer('log'));
        const n = values.length;
        const max = Math.max(...values);

        // 每个桶最多容纳 n 个元素，因此桶表列数必须至少为 n，避免满桶时元素丢失
        const maxCols = Math.max(4, n);
        const dp = ctx.add(new DPTableTracer('buckets', 10, maxCols));
        dp.rowLabels = Array.from({ length: 10 }, (_, i) => String(i));

        log.printInfo('基数排序 (LSD)，max=' + max + '，n=' + n);

        let exp = 1;
        while (Math.floor(max / exp) > 0) {
            const digitName = exp === 1 ? '个位' : (exp === 10 ? '十位' : (exp === 100 ? '百位' : '第' + exp + '位'));
            log.printInfo('=== 按' + digitName + '排序 (exp=' + exp + ') ===');

            for (let r = 0; r < 10; r++)
                for (let c = 0; c < maxCols; c++) dp.cells[r][c] = { value: '', state: 'default' };
            dp._commit({ type: 'snapshot', payload: { exp }, description: '清空桶，准备按' + digitName + '分配' });

            const buckets = Array.from({ length: 10 }, () => []);
            for (let i = 0; i < n; i++) {
                const x = values[i];
                const d = Math.floor(x / exp) % 10;
                buckets[d].push(x);
                const cIdx = buckets[d].length - 1;
                dp.cells[d][cIdx] = { value: x, state: 'current' };
                arr.highlight(i, 'visited', x + ' → 桶' + d);
                dp._commit({
                    type: 'visit',
                    payload: { row: d, col: cIdx },
                    description: x + ' 的' + digitName + '=' + d + '，入桶' + d
                });
                dp.cells[d][cIdx].state = 'default';
            }

            let idx = 0;
            for (let d = 0; d < 10; d++) {
                for (const x of buckets[d]) {
                    values[idx] = x;
                    arr.items[idx] = { value: x, state: 'current' };
                    arr._commit({
                        type: 'set',
                        payload: { index: idx, value: x },
                        description: '从桶' + d + '取回 ' + x + ' → arr[' + idx + ']'
                    });
                    arr.items[idx].state = 'default';
                    idx++;
                }
            }
            log.printSuccess('按' + digitName + '排序后: [' + values.join(', ') + ']');
            exp *= 10;
        }
        arr.done();
        log.printSuccess('基数排序完成');
    }

    // ====================================================================
    // 2. 线性结构 P1 - 链式栈
    // ====================================================================

    const linkedStackCode = `class StackNode {
  constructor(val) { this.val = val; this.next = null; }
}
class LinkedStack {
  constructor() { this.top = null; this.size = 0; }
  push(x) {
    const node = new StackNode(x);
    node.next = this.top;
    this.top = node;
    this.size++;
  }
  pop() {
    if (!this.top) return null;
    const val = this.top.val;
    this.top = this.top.next;
    this.size--;
    return val;
  }
}`;
    function linkedStackRun(ctx) {
        const ll = ctx.add(new LinkedListTracer('stack'));
        const log = ctx.add(new LogTracer('log'));
        log.printInfo('链式栈：使用单链表头插法实现（LIFO）');

        const pushVals = [10, 20, 30, 40];
        for (const v of pushVals) {
            ctx.line(8);
            log.printInfo('push(' + v + ')：创建新节点，插入链表头部');
            ll.unshift(v, 'push(' + v + ') → 新栈顶');
        }

        ctx.line(12);
        if (ll.nodes.length > 0) {
            ll.nodes[0].state = 'current';
            ll._commit({ type: 'highlight', payload: { node: 0 }, description: 'peek() → 栈顶 = ' + ll.nodes[0].value });
            ll.nodes[0].state = 'default';
            log.printInfo('peek() → ' + ll.nodes[0].value);
        }

        for (let i = 0; i < 3; i++) {
            ctx.line(14);
            const topVal = ll.nodes[0] ? ll.nodes[0].value : null;
            log.printInfo('pop() → ' + topVal + '，删除栈顶节点');
            ll.remove(0, 'pop() → ' + topVal + '，栈顶变为 ' + (ll.nodes[1] ? ll.nodes[1].value : 'null'));
        }

        log.printSuccess('链式栈演示完成');
    }

    // ====================================================================
    // 3. 树 P1 - 后序遍历（递归）
    // ====================================================================

    const postorderRecCode = `function postorder(node) {
  if (node === null) return;
  postorder(node.left);
  postorder(node.right);
  visit(node);
}`;
    function postorderRecRun(ctx) {
        const nodes = buildSampleTree();
        const tree = ctx.add(new TreeTracer('tree', nodes));
        const stack = ctx.add(new StackTracer('stack'));
        const log = ctx.add(new LogTracer('log'));
        const visited = [];
        function dfs(idx) {
            ctx.line(1);
            if (idx === null || idx === undefined) {
                ctx.line(2);
                return;
            }
            ctx.line(3);
            stack.push(tree.nodes[idx].value, '调用 postorder(' + tree.nodes[idx].value + ')');
            dfs(tree.nodes[idx].left);
            ctx.line(4);
            dfs(tree.nodes[idx].right);
            ctx.line(5);
            tree.visit(idx);
            visited.push(tree.nodes[idx].value);
            log.printInfo('访问 ' + tree.nodes[idx].value + ' → 序列: [' + visited.join(', ') + ']');
            stack.pop('返回 from ' + tree.nodes[idx].value);
        }
        dfs(tree.root);
        ctx.line(2);
        log.printSuccess('后序遍历完成: [' + visited.join(', ') + ']');
    }

    // ====================================================================
    // 4. 树 P1 - BST 删除（非递归）
    // ====================================================================

    const bstDeleteIterCode = `function deleteIter(root, key) {
  let parent = null, cur = root;
  while (cur && cur.val !== key) {
    parent = cur;
    cur = key < cur.val ? cur.left : cur.right;
  }
  if (!cur) return root;
  if (cur.left && cur.right) {
    let succParent = cur, succ = cur.right;
    while (succ.left) { succParent = succ; succ = succ.left; }
    cur.val = succ.val;
    cur = succ; parent = succParent;
  }
  const child = cur.left ? cur.left : cur.right;
  if (!parent) return child;
  if (parent.left === cur) parent.left = child;
  else parent.right = child;
}`;
    function bstDeleteIterRun(ctx, data) {
        const values = (data && data.length) ? data : [50, 30, 70, 20, 40, 60, 80];
        const tree = ctx.add(new TreeTracer('tree', []));
        const log = ctx.add(new LogTracer('log'));

        // 用对象引用建 BST，然后 flatten
        class N { constructor(v) { this.val = v; this.left = null; this.right = null; } }
        function flatten(root) {
            const ns = [];
            function visit(n) {
                if (!n) return null;
                const idx = ns.length;
                ns.push({ value: n.val, left: null, right: null, parent: null, state: 'default', tag: '', hidden: false });
                ns[idx].left = visit(n.left);
                if (ns[idx].left !== null) ns[ns[idx].left].parent = idx;
                ns[idx].right = visit(n.right);
                if (ns[idx].right !== null) ns[ns[idx].right].parent = idx;
                return idx;
            }
            visit(root);
            return ns;
        }
        let root = null;
        for (const v of values) {
            if (!root) { root = new N(v); continue; }
            let cur = root;
            while (true) {
                if (v < cur.val) { if (!cur.left) { cur.left = new N(v); break; } cur = cur.left; }
                else if (v > cur.val) { if (!cur.right) { cur.right = new N(v); break; } cur = cur.right; }
                else break;
            }
        }
        tree.nodes = flatten(root);
        tree._commit({ type: 'snapshot', payload: {}, description: '初始 BST' });
        log.printInfo('构建 BST: [' + values.join(', ') + ']');

        const key = values[Math.floor(values.length / 2)];
        log.printWarning('删除节点 ' + key + '（非递归）');

        // 非递归查找
        ctx.line(2);
        let parent = null, cur = root;
        while (cur && cur.val !== key) {
            ctx.line(3);
            parent = cur;
            cur = key < cur.val ? cur.left : cur.right;
            tree.nodes = flatten(root);
            tree._commit({ type: 'visit', payload: {}, description: '比较 ' + key + ' 与 ' + (parent ? parent.val : 'null') + '，走向 ' + (cur ? cur.val : 'null') });
        }
        ctx.line(5);
        if (!cur) { log.printWarning('未找到 ' + key); return; }
        log.printInfo('找到节点 ' + key);

        // 双子节点：找后继
        ctx.line(6);
        if (cur.left && cur.right) {
            log.printInfo('节点 ' + key + ' 有双子，找右子树最小值（后继）');
            ctx.line(7);
            let succParent = cur, succ = cur.right;
            while (succ.left) {
                ctx.line(8);
                succParent = succ;
                succ = succ.left;
                tree.nodes = flatten(root);
                tree._commit({ type: 'visit', payload: {}, description: '向左找后继 → ' + succ.val });
            }
            ctx.line(9);
            cur.val = succ.val;
            tree.nodes = flatten(root);
            tree._commit({ type: 'set', payload: {}, description: '用后继 ' + succ.val + ' 替换 ' + key });
            log.printSuccess('用后继 ' + succ.val + ' 替换 ' + key);
            cur = succ; parent = succParent;
        }

        ctx.line(12);
        const child = cur.left ? cur.left : cur.right;
        ctx.line(13);
        if (!parent) { root = child; }
        else {
            ctx.line(14);
            if (parent.left === cur) parent.left = child;
            else parent.right = child;
        }
        tree.nodes = flatten(root);
        tree._commit({ type: 'snapshot', payload: {}, description: '删除节点，重新链接子树' });
        log.printSuccess('删除完成');
        tree.done();
    }

    // ====================================================================
    // 5. 树 P2 - AVL 删除
    // ====================================================================

    const avlDeleteCode = `function avlDelete(node, key) {
  if (!node) return null;
  if (key < node.val) node.left = avlDelete(node.left, key);
  else if (key > node.val) node.right = avlDelete(node.right, key);
  else {
    if (!node.left) return node.right;
    if (!node.right) return node.left;
    let succ = node.right;
    while (succ.left) succ = succ.left;
    node.val = succ.val;
    node.right = avlDelete(node.right, succ.val);
  }
  updateHeight(node);
  return rebalance(node);
}`;
    function avlDeleteRun(ctx, data) {
        const values = (data && data.length) ? data : [30, 20, 40, 10, 25, 35, 50, 5];
        const tree = ctx.add(new TreeTracer('tree', []));
        const log = ctx.add(new LogTracer('log'));

        class N { constructor(v) { this.val = v; this.left = null; this.right = null; this.height = 1; } }
        function height(n) { return n ? n.height : 0; }
        function updateH(n) { n.height = 1 + Math.max(height(n.left), height(n.right)); }
        function bf(n) { return n ? height(n.left) - height(n.right) : 0; }
        function rotR(y) { const x = y.left, T = x.right; x.right = y; y.left = T; updateH(y); updateH(x); return x; }
        function rotL(x) { const y = x.right, T = y.left; y.left = x; x.right = T; updateH(x); updateH(y); return y; }
        function rebalance(n) {
            updateH(n);
            const b = bf(n);
            if (b > 1 && bf(n.left) >= 0) return rotR(n);
            if (b > 1 && bf(n.left) < 0) { n.left = rotL(n.left); return rotR(n); }
            if (b < -1 && bf(n.right) <= 0) return rotL(n);
            if (b < -1 && bf(n.right) > 0) { n.right = rotR(n.right); return rotL(n); }
            return n;
        }
        function flatten(root) {
            const ns = [];
            function visit(n) {
                if (!n) return null;
                const idx = ns.length;
                ns.push({ value: n.val, left: null, right: null, parent: null, state: 'default', tag: 'h=' + n.height, hidden: false });
                ns[idx].left = visit(n.left);
                if (ns[idx].left !== null) ns[ns[idx].left].parent = idx;
                ns[idx].right = visit(n.right);
                if (ns[idx].right !== null) ns[ns[idx].right].parent = idx;
                return idx;
            }
            visit(root);
            return ns;
        }
        function insert(n, v) {
            if (!n) return new N(v);
            if (v < n.val) n.left = insert(n.left, v);
            else if (v > n.val) n.right = insert(n.right, v);
            else return n;
            return rebalance(n);
        }
        let root = null;
        for (const v of values) root = insert(root, v);
        tree.nodes = flatten(root);
        tree._commit({ type: 'snapshot', payload: {}, description: '初始 AVL 树' });
        log.printInfo('构建 AVL: [' + values.join(', ') + ']');

        const key = values[2];
        log.printWarning('删除节点 ' + key);

        function del(node, k) {
            ctx.line(1);
            if (!node) { ctx.line(2); return null; }
            if (k < node.val) { ctx.line(3); node.left = del(node.left, k); }
            else if (k > node.val) { ctx.line(4); node.right = del(node.right, k); }
            else {
                ctx.line(5);
                if (!node.left) { ctx.line(6); return node.right; }
                if (!node.right) { ctx.line(7); return node.left; }
                ctx.line(8);
                let succ = node.right;
                while (succ.left) succ = succ.left;
                ctx.line(9);
                node.val = succ.val;
                tree.nodes = flatten(root);
                tree._commit({ type: 'set', payload: {}, description: '用后继 ' + succ.val + ' 替换 ' + k });
                ctx.line(10);
                node.right = del(node.right, succ.val);
            }
            ctx.line(11);
            updateH(node);
            tree.nodes = flatten(root);
            tree._commit({ type: 'snapshot', payload: {}, description: '更新高度，节点 ' + node.val + ' 平衡因子 = ' + bf(node) });
            ctx.line(12);
            const before = JSON.stringify(flatten(root).map(n => n.value));
            node = rebalance(node);
            const after = flatten(root);
            if (JSON.stringify(after.map(n => n.value)) !== before) {
                tree.nodes = after;
                tree._commit({ type: 'rotate', payload: {}, description: '旋转重平衡' });
                log.printWarning('旋转重平衡');
            }
            return node;
        }
        root = del(root, key);
        tree.nodes = flatten(root);
        tree.done();
        log.printSuccess('AVL 删除完成');
    }

    // ====================================================================
    // 6. 树 P3 - 红黑树插入
    // ====================================================================

    const rbInsertCode = `function rbInsert(root, val) {
  const node = new RBNode(val);
  root = bstInsert(root, node);
  fixup(root, node);
  return root;
}
function fixup(root, node) {
  while (node.parent && node.parent.isRed) {
    const uncle = getUncle(node);
    if (uncle && uncle.isRed) {
      // Case 1: 叔叔红 → 变色
      node.parent.isRed = false;
      uncle.isRed = false;
      node.parent.parent.isRed = true;
      node = node.parent.parent;
    } else {
      // Case 2/3: 旋转
      ...
    }
  }
  root.isRed = false;
}`;
    function rbInsertRun(ctx, data) {
        const values = (data && data.length) ? data : [10, 20, 30, 15, 25, 5, 1];
        const tree = ctx.add(new TreeTracer('tree', []));
        const log = ctx.add(new LogTracer('log'));

        class N {
            constructor(v) { this.val = v; this.left = null; this.right = null; this.parent = null; this.red = true; }
        }
        function flatten(root) {
            const ns = [];
            function visit(n) {
                if (!n) return null;
                const idx = ns.length;
                ns.push({ value: n.val, left: null, right: null, parent: null, state: 'default', tag: n.red ? 'R' : 'B', color: n.red ? 'red' : 'black', hidden: false });
                ns[idx].left = visit(n.left);
                if (ns[idx].left !== null) ns[ns[idx].left].parent = idx;
                ns[idx].right = visit(n.right);
                if (ns[idx].right !== null) ns[ns[idx].right].parent = idx;
                return idx;
            }
            visit(root);
            return ns;
        }
        function rotL(n) {
            const r = n.right; n.right = r.left;
            if (r.left) r.left.parent = n;
            r.parent = n.parent;
            if (!n.parent) root = r;
            else if (n === n.parent.left) n.parent.left = r;
            else n.parent.right = r;
            r.left = n; n.parent = r;
        }
        function rotR(n) {
            const l = n.left; n.left = l.right;
            if (l.right) l.right.parent = n;
            l.parent = n.parent;
            if (!n.parent) root = l;
            else if (n === n.parent.right) n.parent.right = l;
            else n.parent.left = l;
            l.right = n; n.parent = l;
        }

        let root = null;
        for (const v of values) {
            log.printInfo('插入 ' + v + ' (红色)');
            const node = new N(v);
            let parent = null, cur = root;
            while (cur) {
                parent = cur;
                cur = v < cur.val ? cur.left : cur.right;
            }
            node.parent = parent;
            if (!parent) root = node;
            else if (v < parent.val) parent.left = node;
            else parent.right = node;

            tree.nodes = flatten(root);
            tree._commit({ type: 'snapshot', payload: {}, description: '插入 ' + v + ' (红)' });

            // fixup
            let n = node;
            while (n.parent && n.parent.red) {
                const gp = n.parent.parent;
                if (!gp) break;
                if (n.parent === gp.left) {
                    const uncle = gp.right;
                    if (uncle && uncle.red) {
                        log.printInfo('Case1: 叔叔红 → 变色');
                        n.parent.red = false; gp.right.red = false; gp.red = true;
                        tree.nodes = flatten(root);
                        tree._commit({ type: 'snapshot', payload: {}, description: '变色：父黑叔黑祖父红' });
                        n = gp;
                    } else {
                        if (n === n.parent.right) {
                            log.printInfo('Case2: LR → 左旋父');
                            n = n.parent; rotL(n);
                            tree.nodes = flatten(root);
                            tree._commit({ type: 'rotate', payload: {}, description: 'LR 左旋' });
                        }
                        log.printInfo('Case3: 右旋祖父');
                        n.parent.red = false; n.parent.parent.red = true;
                        rotR(n.parent.parent);
                        tree.nodes = flatten(root);
                        tree._commit({ type: 'rotate', payload: {}, description: 'LL 右旋 + 变色' });
                    }
                } else {
                    const uncle = gp.left;
                    if (uncle && uncle.red) {
                        log.printInfo('Case1: 叔叔红 → 变色');
                        n.parent.red = false; gp.left.red = false; gp.red = true;
                        tree.nodes = flatten(root);
                        tree._commit({ type: 'snapshot', payload: {}, description: '变色：父黑叔黑祖父红' });
                        n = gp;
                    } else {
                        if (n === n.parent.left) {
                            log.printInfo('Case2: RL → 右旋父');
                            n = n.parent; rotR(n);
                            tree.nodes = flatten(root);
                            tree._commit({ type: 'rotate', payload: {}, description: 'RL 右旋' });
                        }
                        log.printInfo('Case3: 左旋祖父');
                        n.parent.red = false; n.parent.parent.red = true;
                        rotL(n.parent.parent);
                        tree.nodes = flatten(root);
                        tree._commit({ type: 'rotate', payload: {}, description: 'RR 左旋 + 变色' });
                    }
                }
            }
            root.red = false;
            tree.nodes = flatten(root);
            tree._commit({ type: 'snapshot', payload: {}, description: '根节点变黑' });
        }
        tree.done();
        log.printSuccess('红黑树构建完成');
    }

    // ====================================================================
    // 7. 树 P3 - 红黑树删除
    // ====================================================================

    const rbDeleteCode = `function rbDelete(root, key) {
  let node = find(root, key);
  if (!node) return root;
  if (node.left && node.right) {
    let succ = node.right;
    while (succ.left) succ = succ.left;
    node.val = succ.val;
    node = succ;
  }
  const child = node.left ? node.left : node.right;
  transplant(node, child);
  if (!node.isRed) fixup(child);
}`;
    function rbDeleteRun(ctx, data) {
        const values = (data && data.length) ? data : [10, 20, 30, 15, 25, 5, 1];
        const tree = ctx.add(new TreeTracer('tree', []));
        const log = ctx.add(new LogTracer('log'));

        class N {
            constructor(v) { this.val = v; this.left = null; this.right = null; this.parent = null; this.red = true; }
        }
        function flatten(rt) {
            const ns = [];
            function visit(n) {
                if (!n) return null;
                const idx = ns.length;
                ns.push({ value: n.val, left: null, right: null, parent: null, state: 'default', tag: n.red ? 'R' : 'B', color: n.red ? 'red' : 'black', hidden: false });
                ns[idx].left = visit(n.left);
                if (ns[idx].left !== null) ns[ns[idx].left].parent = idx;
                ns[idx].right = visit(n.right);
                if (ns[idx].right !== null) ns[ns[idx].right].parent = idx;
                return idx;
            }
            visit(rt);
            return ns;
        }
        function rotL(n) {
            const r = n.right; n.right = r.left;
            if (r.left) r.left.parent = n;
            r.parent = n.parent;
            if (!n.parent) root = r;
            else if (n === n.parent.left) n.parent.left = r;
            else n.parent.right = r;
            r.left = n; n.parent = r;
        }
        function rotR(n) {
            const l = n.left; n.left = l.right;
            if (l.right) l.right.parent = n;
            l.parent = n.parent;
            if (!n.parent) root = l;
            else if (n === n.parent.right) n.parent.right = l;
            else n.parent.left = l;
            l.right = n; n.parent = l;
        }
        function bstInsert(rt, v) {
            const node = new N(v);
            let p = null, c = rt;
            while (c) { p = c; c = v < c.val ? c.left : c.right; }
            node.parent = p;
            if (!p) root = node;
            else if (v < p.val) p.left = node;
            else p.right = node;
            // fixup
            let n = node;
            while (n.parent && n.parent.red) {
                const gp = n.parent.parent;
                if (!gp) break;
                if (n.parent === gp.left) {
                    const u = gp.right;
                    if (u && u.red) { n.parent.red = false; u.red = false; gp.red = true; n = gp; }
                    else {
                        if (n === n.parent.right) { n = n.parent; rotL(n); }
                        n.parent.red = false; n.parent.parent.red = true; rotR(n.parent.parent);
                    }
                } else {
                    const u = gp.left;
                    if (u && u.red) { n.parent.red = false; u.red = false; gp.red = true; n = gp; }
                    else {
                        if (n === n.parent.left) { n = n.parent; rotR(n); }
                        n.parent.red = false; n.parent.parent.red = true; rotL(n.parent.parent);
                    }
                }
            }
            root.red = false;
        }

        let root = null;
        for (const v of values) bstInsert(root, v);
        tree.nodes = flatten(root);
        tree._commit({ type: 'snapshot', payload: {}, description: '初始红黑树' });
        log.printInfo('构建红黑树: [' + values.join(', ') + ']');

        const key = values[1];
        log.printWarning('删除节点 ' + key);

        // 简化删除：找到节点，若双子则用后继替换，然后删除单子/叶子节点
        function findNode(rt, k) {
            let c = rt;
            while (c && c.val !== k) c = k < c.val ? c.left : c.right;
            return c;
        }
        function transplant(u, v) {
            if (!u.parent) root = v;
            else if (u === u.parent.left) u.parent.left = v;
            else u.parent.right = v;
            if (v) v.parent = u.parent;
        }
        function minimum(n) { while (n.left) n = n.left; return n; }

        ctx.line(2);
        let node = findNode(root, key);
        if (!node) { log.printWarning('未找到 ' + key); return; }
        tree.nodes = flatten(root);
        tree._commit({ type: 'visit', payload: {}, description: '找到节点 ' + key });

        ctx.line(5);
        if (node.left && node.right) {
            ctx.line(6);
            let succ = minimum(node.right);
            log.printInfo('双子节点，用后继 ' + succ.val + ' 替换');
            ctx.line(7);
            node.val = succ.val;
            tree.nodes = flatten(root);
            tree._commit({ type: 'set', payload: {}, description: '用后继 ' + succ.val + ' 替换 ' + key });
            node = succ;
        }

        ctx.line(10);
        const child = node.left ? node.left : node.right;
        ctx.line(11);
        transplant(node, child);
        tree.nodes = flatten(root);
        tree._commit({ type: 'snapshot', payload: {}, description: '移除节点 ' + key + (node.red ? '(红)' : '(黑)') });

        if (!node.red) {
            ctx.line(12);
            log.printWarning('删除的是黑节点，需要修复双重黑');
            // 简化修复：展示旋转+变色步骤
            if (child && child.red) {
                child.red = false;
                tree.nodes = flatten(root);
                tree._commit({ type: 'snapshot', payload: {}, description: '子节点为红 → 变黑修复' });
                log.printSuccess('红色子节点变黑，修复完成');
            } else {
                tree.nodes = flatten(root);
                tree._commit({ type: 'snapshot', payload: {}, description: '需要兄弟节点旋转/变色修复（简化展示）' });
                log.printInfo('执行旋转+变色修复');
            }
        } else {
            log.printSuccess('删除红节点，无需修复');
        }
        tree.done();
        log.printSuccess('红黑树删除完成');
    }

    // ====================================================================
    // 8. 树 P2 - 线段树区间查询
    // ====================================================================

    const segQueryCode = `function query(node, lo, hi, ql, qr) {
  if (qr < lo || hi < ql) return 0;
  if (ql <= lo && hi <= qr) return tree[node];
  const mid = (lo + hi) >> 1;
  return query(node*2, lo, mid, ql, qr)
       + query(node*2+1, mid+1, hi, ql, qr);
}`;
    function segQueryRun(ctx, data) {
        const arr = (data && data.length) ? data : [3, 1, 4, 1, 5, 9, 2, 6];
        const n = arr.length;
        const arrT = ctx.add(new ArrayTracer('arr', arr.slice()));
        const log = ctx.add(new LogTracer('log'));
        const treeArr = new Array(4 * n).fill(0);
        const treeT = ctx.add(new ArrayTracer('tree', treeArr.slice()));

        // 建树
        function build(node, lo, hi) {
            if (lo === hi) { treeArr[node] = arr[lo]; treeT.items[node] = { value: arr[lo], state: 'sorted' }; treeT._commit({ type: 'set', payload: { node }, description: '叶子 tree[' + node + '] = arr[' + lo + '] = ' + arr[lo] }); treeT.items[node].state = 'default'; return; }
            const mid = (lo + hi) >> 1;
            build(node * 2, lo, mid);
            build(node * 2 + 1, mid + 1, hi);
            treeArr[node] = treeArr[node * 2] + treeArr[node * 2 + 1];
            treeT.items[node] = { value: treeArr[node], state: 'current' };
            treeT._commit({ type: 'set', payload: { node }, description: 'tree[' + node + '] = ' + treeArr[node] });
            treeT.items[node].state = 'default';
        }
        log.printInfo('建线段树（求和）');
        build(1, 0, n - 1);

        const L = 2, R = 5;
        log.printWarning('查询区间 [' + L + ', ' + R + '] 的和');

        function query(node, lo, hi, ql, qr) {
            ctx.line(1);
            treeT.highlight(node, 'current', '查询 tree[' + node + ']，区间 [' + lo + ',' + hi + ']');
            ctx.line(2);
            if (qr < lo || hi < ql) {
                ctx.line(3);
                treeT.highlight(node, 'visited', '不相交，返回 0');
                return 0;
            }
            ctx.line(4);
            if (ql <= lo && hi <= qr) {
                treeT.items[node].state = 'sorted';
                arrT.highlightRange(Math.max(lo, ql), Math.min(hi, qr), '#3fb950');
                treeT._commit({ type: 'highlight', payload: { node }, description: '完全覆盖 tree[' + node + '] = ' + treeArr[node] + '（区间 [' + lo + ',' + hi + ']）' });
                treeT.items[node].state = 'default';
                log.printSuccess('完全覆盖: tree[' + node + '] = ' + treeArr[node]);
                return treeArr[node];
            }
            ctx.line(5);
            const mid = (lo + hi) >> 1;
            ctx.line(6);
            const s = query(node * 2, lo, mid, ql, qr) + query(node * 2 + 1, mid + 1, hi, ql, qr);
            return s;
        }
        const sum = query(1, 0, n - 1, L, R);
        log.printSuccess('区间 [' + L + ', ' + R + '] 的和 = ' + sum);
        treeT.done();
    }

    // ====================================================================
    // 9. 树 P2 - 线段树单点更新
    // ====================================================================

    const segUpdateCode = `function update(node, lo, hi, idx, val) {
  if (lo === hi) { tree[node] = val; return; }
  const mid = (lo + hi) >> 1;
  if (idx <= mid) update(node*2, lo, mid, idx, val);
  else update(node*2+1, mid+1, hi, idx, val);
  tree[node] = tree[node*2] + tree[node*2+1];
}`;
    function segUpdateRun(ctx, data) {
        const arr = (data && data.length) ? data : [3, 1, 4, 1, 5, 9, 2, 6];
        const n = arr.length;
        const arrT = ctx.add(new ArrayTracer('arr', arr.slice()));
        const log = ctx.add(new LogTracer('log'));
        const treeArr = new Array(4 * n).fill(0);
        const treeT = ctx.add(new ArrayTracer('tree', treeArr.slice()));

        function build(node, lo, hi) {
            if (lo === hi) { treeArr[node] = arr[lo]; return; }
            const mid = (lo + hi) >> 1;
            build(node * 2, lo, mid); build(node * 2 + 1, mid + 1, hi);
            treeArr[node] = treeArr[node * 2] + treeArr[node * 2 + 1];
        }
        build(1, 0, n - 1);
        for (let i = 0; i < treeArr.length; i++) if (treeArr[i] !== 0) treeT.items[i] = { value: treeArr[i], state: 'default' };
        treeT._commit({ type: 'snapshot', payload: {}, description: '初始线段树' });
        log.printInfo('建线段树完成');

        const idx = 3, val = 8;
        log.printWarning('更新 arr[' + idx + '] = ' + val);
        arrT.items[idx] = { value: val, state: 'current' };
        arrT._commit({ type: 'set', payload: { index: idx, value: val }, description: 'arr[' + idx + '] = ' + val });
        arrT.items[idx].state = 'default';
        arr[idx] = val;

        function update(node, lo, hi, i, v) {
            ctx.line(1);
            treeT.highlight(node, 'current', '访问 tree[' + node + ']，区间 [' + lo + ',' + hi + ']');
            ctx.line(2);
            if (lo === hi) {
                ctx.line(3);
                treeArr[node] = v;
                treeT.items[node] = { value: v, state: 'sorted' };
                treeT._commit({ type: 'set', payload: { node }, description: '叶子 tree[' + node + '] = ' + v });
                treeT.items[node].state = 'default';
                return;
            }
            ctx.line(4);
            const mid = (lo + hi) >> 1;
            ctx.line(5);
            if (i <= mid) update(node * 2, lo, mid, i, v);
            else update(node * 2 + 1, mid + 1, hi, i, v);
            ctx.line(6);
            treeArr[node] = treeArr[node * 2] + treeArr[node * 2 + 1];
            treeT.items[node] = { value: treeArr[node], state: 'current' };
            treeT._commit({ type: 'set', payload: { node }, description: '回溯 tree[' + node + '] = ' + treeArr[node] });
            treeT.items[node].state = 'default';
        }
        update(1, 0, n - 1, idx, val);
        log.printSuccess('更新完成');
        treeT.done();
    }

    // ====================================================================
    // 10. 树 P2 - 树状数组查询
    // ====================================================================

    const bitQueryCode = `function query(bit, i) {
  let sum = 0;
  while (i > 0) {
    sum += bit[i];
    i -= lowbit(i);
  }
  return sum;
}
function lowbit(x) { return x & -x; }`;
    function bitQueryRun(ctx, data) {
        const arr = (data && data.length) ? data : [3, 1, 4, 1, 5, 9, 2, 6];
        const n = arr.length;
        const arrT = ctx.add(new ArrayTracer('arr', arr.slice()));
        const log = ctx.add(new LogTracer('log'));
        const bitArr = new Array(n + 1).fill(0);
        const bitT = ctx.add(new ArrayTracer('bit', bitArr.slice()));
        function lowbit(x) { return x & -x; }

        // 构建
        for (let i = 0; i < n; i++) {
            let idx = i + 1;
            while (idx <= n) { bitArr[idx] += arr[i]; idx += lowbit(idx); }
        }
        for (let i = 0; i <= n; i++) bitT.items[i] = { value: bitArr[i], state: 'default' };
        bitT._commit({ type: 'snapshot', payload: {}, description: '初始树状数组' });
        log.printInfo('原数组: [' + arr.join(', ') + ']');

        // 多次前缀查询
        const queries = [3, 5, n];
        for (const qi of queries) {
            log.printWarning('查询 prefixSum(' + qi + ')');
            let sum = 0, idx = qi;
            ctx.line(2);
            while (idx > 0) {
                ctx.line(3);
                bitT.highlight(idx, 'current', 'bit[' + idx + '] = ' + bitArr[idx]);
                ctx.line(4);
                sum += bitArr[idx];
                log.printInfo('sum += bit[' + idx + '] = ' + bitArr[idx] + ' → sum = ' + sum);
                ctx.line(5);
                idx -= lowbit(idx);
            }
            bitT.highlight(qi, 'sorted', 'prefixSum(' + qi + ') = ' + sum);
            log.printSuccess('prefixSum(' + qi + ') = ' + sum);
        }
        bitT.done();
    }

    // ====================================================================
    // 11. 树 P2 - 树状数组更新
    // ====================================================================

    const bitUpdateCode = `function update(bit, i, delta, n) {
  while (i <= n) {
    bit[i] += delta;
    i += lowbit(i);
  }
}
function lowbit(x) { return x & -x; }`;
    function bitUpdateRun(ctx, data) {
        const arr = (data && data.length) ? data : [3, 1, 4, 1, 5, 9, 2, 6];
        const n = arr.length;
        const arrT = ctx.add(new ArrayTracer('arr', arr.slice()));
        const log = ctx.add(new LogTracer('log'));
        const bitArr = new Array(n + 1).fill(0);
        const bitT = ctx.add(new ArrayTracer('bit', bitArr.slice()));
        function lowbit(x) { return x & -x; }

        for (let i = 0; i < n; i++) {
            let idx = i + 1;
            while (idx <= n) { bitArr[idx] += arr[i]; idx += lowbit(idx); }
        }
        for (let i = 0; i <= n; i++) bitT.items[i] = { value: bitArr[i], state: 'default' };
        bitT._commit({ type: 'snapshot', payload: {}, description: '初始树状数组' });
        log.printInfo('原数组: [' + arr.join(', ') + ']');

        // 多次更新
        const updates = [[2, 5], [5, -3]];
        for (const [ui, delta] of updates) {
            log.printWarning('更新: arr[' + (ui - 1) + '] += ' + delta + ' (BIT 下标 ' + ui + ')');
            arrT.items[ui - 1] = { value: arr[ui - 1] + delta, state: 'current' };
            arrT._commit({ type: 'set', payload: { index: ui - 1 }, description: 'arr[' + (ui - 1) + '] += ' + delta });
            arrT.items[ui - 1].state = 'default';
            arr[ui - 1] += delta;

            let idx = ui;
            ctx.line(2);
            while (idx <= n) {
                ctx.line(3);
                bitArr[idx] += delta;
                bitT.items[idx] = { value: bitArr[idx], state: 'current' };
                ctx.line(4);
                bitT._commit({ type: 'set', payload: { idx, delta }, description: 'bit[' + idx + '] += ' + delta + ' → ' + bitArr[idx] });
                bitT.items[idx].state = 'default';
                log.printInfo('bit[' + idx + '] += ' + delta + ' → ' + bitArr[idx]);
                ctx.line(5);
                idx += lowbit(idx);
            }
            log.printSuccess('更新完成');
        }
        bitT.done();
    }

    // ====================================================================
    // 12. 树 P2 - Trie 插入
    // ====================================================================

    const trieInsertCode = `function insert(root, word) {
  let node = root;
  for (const ch of word) {
    if (!node.children[ch]) {
      node.children[ch] = new TrieNode(ch);
    }
    node = node.children[ch];
  }
  node.isEnd = true;
}`;
    function trieInsertRun(ctx, data) {
        const rawWords = (data && data.length) ? data.filter(w => typeof w === 'string') : [];
        const words = rawWords.length ? rawWords : ['cat', 'car', 'card', 'care', 'dog'];
        const tree = ctx.add(new TreeTracer('tree', []));
        const log = ctx.add(new LogTracer('log'));

        // 根节点
        tree.nodes = [{ value: 'root', left: null, right: null, parent: null, state: 'default', tag: '', hidden: false, children: [] }];
        tree.root = 0; // nodes 直接赋值不会同步 root，必须显式设置（布局引擎依赖）
        tree._commit({ type: 'init', payload: {}, description: '初始化 Trie（根节点）' });

        for (const word of words) {
            log.printInfo('插入单词 "' + word + '"');
            let curIdx = 0; // root
            tree.nodes[curIdx].state = 'current';
            for (const ch of word) {
                tree.nodes[curIdx].state = 'current';
                // 查找是否已有该字符的子节点
                let childIdx = -1;
                const children = tree.nodes[curIdx].children || [];
                for (const ci of children) {
                    if (tree.nodes[ci].value === ch) { childIdx = ci; break; }
                }
                if (childIdx === -1) {
                    // 创建新节点
                    const newIdx = tree.nodes.length;
                    tree.nodes.push({ value: ch, left: null, right: null, parent: curIdx, state: 'current', tag: '', hidden: false, children: [] });
                    tree.nodes[curIdx].children = [...(tree.nodes[curIdx].children || []), newIdx];
                    tree._commit({ type: 'set', payload: { op: 'insert' }, description: '创建新节点 "' + ch + '"' });
                    childIdx = newIdx;
                } else {
                    tree.nodes[childIdx].state = 'visited';
                    tree._commit({ type: 'visit', payload: {}, description: '已有节点 "' + ch + '"' });
                }
                tree.nodes[curIdx].state = 'default';
                curIdx = childIdx;
            }
            // 标记单词结束
            tree.nodes[curIdx].tag = '★';
            tree.nodes[curIdx].state = 'sorted';
            tree._commit({ type: 'mark', payload: {}, description: '标记单词 "' + word + '" 结束' });
            tree.nodes[curIdx].state = 'default';
        }
        tree.done();
        log.printSuccess('Trie 构建完成');
    }

    // ====================================================================
    // 13. 树 P2 - Trie 搜索
    // ====================================================================

    const trieSearchCode = `function search(root, word) {
  let node = root;
  for (const ch of word) {
    if (!node.children[ch]) return false;
    node = node.children[ch];
  }
  return node.isEnd;
}`;
    function trieSearchRun(ctx, data) {
        const words = ['cat', 'car', 'card', 'care', 'dog'];
        const tree = ctx.add(new TreeTracer('tree', []));
        const log = ctx.add(new LogTracer('log'));

        // 先构建 Trie
        tree.nodes = [{ value: 'root', left: null, right: null, parent: null, state: 'default', tag: '', hidden: false, children: [] }];
        tree.root = 0; // nodes 直接赋值不会同步 root，必须显式设置（布局引擎依赖）
        for (const word of words) {
            let curIdx = 0;
            for (const ch of word) {
                let childIdx = -1;
                const children = tree.nodes[curIdx].children || [];
                for (const ci of children) {
                    if (tree.nodes[ci].value === ch) { childIdx = ci; break; }
                }
                if (childIdx === -1) {
                    const newIdx = tree.nodes.length;
                    tree.nodes.push({ value: ch, left: null, right: null, parent: curIdx, state: 'default', tag: '', hidden: false, children: [] });
                    tree.nodes[curIdx].children = [...(tree.nodes[curIdx].children || []), newIdx];
                    childIdx = newIdx;
                }
                curIdx = childIdx;
            }
            tree.nodes[curIdx].tag = '★';
        }
        tree._commit({ type: 'snapshot', payload: {}, description: '初始 Trie' });
        log.printInfo('构建 Trie: [' + words.join(', ') + ']');

        // 搜索单词
        const searchWords = ['car', 'cart', 'care', 'do'];
        for (const sw of searchWords) {
            log.printWarning('搜索 "' + sw + '"');
            let curIdx = 0;
            let found = true;
            ctx.line(2);
            for (const ch of sw) {
                ctx.line(3);
                let childIdx = -1;
                const children = tree.nodes[curIdx].children || [];
                for (const ci of children) {
                    if (tree.nodes[ci].value === ch) { childIdx = ci; break; }
                }
                if (childIdx === -1) {
                    ctx.line(4);
                    tree.nodes[curIdx].state = 'compare';
                    tree._commit({ type: 'highlight', payload: {}, description: '未找到字符 "' + ch + '"' });
                    tree.nodes[curIdx].state = 'default';
                    found = false;
                    break;
                }
                tree.nodes[childIdx].state = 'visited';
                tree._commit({ type: 'visit', payload: {}, description: '匹配字符 "' + ch + '"' });
                curIdx = childIdx;
            }
            if (found) {
                ctx.line(5);
                const isEnd = tree.nodes[curIdx].tag === '★';
                tree.nodes[curIdx].state = isEnd ? 'sorted' : 'compare';
                tree._commit({ type: 'mark', payload: {}, description: isEnd ? '找到完整单词 "' + sw + '"' : '前缀存在但非完整单词' });
                tree.nodes[curIdx].state = 'default';
                log.printSuccess(isEnd ? '搜索成功: "' + sw + '" 是完整单词' : '"' + sw + '" 只是前缀');
            } else {
                log.printError('搜索失败: "' + sw + '" 不存在');
            }
        }
        tree.done();
    }

    // ====================================================================
    // 14. 字符串 P2 - Boyer-Moore 匹配
    // ====================================================================

    const boyerMooreCode = `function boyerMoore(text, pattern) {
  const badChar = buildBadChar(pattern);
  let i = 0;
  while (i <= text.length - pattern.length) {
    let j = pattern.length - 1;
    while (j >= 0 && text[i+j] === pattern[j]) j--;
    if (j < 0) return i;
    i += Math.max(1, j - (badChar[text[i+j]] ?? -1));
  }
  return -1;
}`;
    function boyerMooreRun(ctx, data) {
        const text = 'HERE IS A SIMPLE EXAMPLE';
        const pattern = 'EXAMPLE';
        const arrT = ctx.add(new ArrayTracer('text', text.split('')));
        const pattT = ctx.add(new ArrayTracer('pattern', pattern.split('')));
        const log = ctx.add(new LogTracer('log'));
        log.printInfo('Boyer-Moore 匹配: "' + pattern + '" in "' + text + '"');

        // 坏字符表
        const badChar = {};
        for (let i = 0; i < pattern.length; i++) badChar[pattern[i]] = i;
        log.printInfo('坏字符表: ' + JSON.stringify(badChar));

        const n = text.length, m = pattern.length;
        let i = 0;
        ctx.line(3);
        while (i <= n - m) {
            ctx.line(4);
            log.printInfo('对齐位置 i=' + i);
            // 高亮当前对齐区域
            for (let k = 0; k < m; k++) arrT.items[i + k].state = 'visited';
            arrT._commit({ type: 'highlight', payload: { i }, description: '模式对齐到位置 ' + i });

            let j = m - 1;
            ctx.line(5);
            while (j >= 0 && text[i + j] === pattern[j]) {
                ctx.line(5);
                arrT.items[i + j].state = 'sorted';
                pattT.items[j].state = 'sorted';
                arrT._commit({ type: 'compare', payload: { i: i + j, j }, description: '匹配 text[' + (i + j) + ']=' + text[i + j] + ' = pattern[' + j + ']' });
                j--;
            }
            if (j < 0) {
                ctx.line(6);
                log.printSuccess('找到匹配！位置 = ' + i);
                for (let k = 0; k < m; k++) { arrT.items[i + k].state = 'sorted'; pattT.items[k].state = 'sorted'; }
                arrT._commit({ type: 'mark', payload: { pos: i }, description: '完整匹配于位置 ' + i });
                arrT.done();
                return;
            }
            ctx.line(7);
            const bc = badChar[text[i + j]] !== undefined ? badChar[text[i + j]] : -1;
            const shift = Math.max(1, j - bc);
            arrT.items[i + j].state = 'compare';
            pattT.items[j].state = 'compare';
            arrT._commit({ type: 'compare', payload: { i: i + j, j }, description: '失配 text[' + (i + j) + ']=' + text[i + j] + ' ≠ pattern[' + j + ']=' + pattern[j] + '，右移 ' + shift });
            log.printWarning('失配: text[' + (i + j) + ']=' + text[i + j] + '，坏字符右移 ' + shift);
            // 恢复状态
            for (let k = 0; k < m; k++) { if (arrT.items[i + k]) arrT.items[i + k].state = 'default'; pattT.items[k].state = 'default'; }
            i += shift;
        }
        log.printError('未找到匹配');
        arrT.done();
    }

    // ====================================================================
    // 15. 经典 P2 - 数独求解
    // ====================================================================

    const sudokuCode = `function solve(board) {
  const empty = findEmpty(board);
  if (!empty) return true;
  const [r, c] = empty;
  for (let num = 1; num <= 9; num++) {
    if (isValid(board, r, c, num)) {
      board[r][c] = num;
      if (solve(board)) return true;
      board[r][c] = 0;
    }
  }
  return false;
}`;
    function sudokuRun(ctx) {
        const board = ctx.add(new ChessBoardTracer('board', 9));
        const log = ctx.add(new LogTracer('log'));
        // 简单数独
        const puzzle = [
            [5,3,0,0,7,0,0,0,0],
            [6,0,0,1,9,5,0,0,0],
            [0,9,8,0,0,0,0,6,0],
            [8,0,0,0,6,0,0,0,3],
            [4,0,0,8,0,3,0,0,1],
            [7,0,0,0,2,0,0,0,6],
            [0,6,0,0,0,0,2,8,0],
            [0,0,0,4,1,9,0,0,5],
            [0,0,0,0,8,0,0,7,9]
        ];
        for (let r = 0; r < 9; r++)
            for (let c = 0; c < 9; c++)
                board.board[r][c] = { value: puzzle[r][c], state: puzzle[r][c] ? 'sorted' : 'default' };
        board._commit({ type: 'snapshot', payload: {}, description: '初始数独' });
        log.printInfo('开始求解数独');

        function isValid(r, c, num) {
            for (let i = 0; i < 9; i++) {
                if (puzzle[r][i] === num || puzzle[i][c] === num) return false;
            }
            const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
            for (let i = 0; i < 3; i++)
                for (let j = 0; j < 3; j++)
                    if (puzzle[br + i][bc + j] === num) return false;
            return true;
        }

        let stepCount = 0;
        function solve() {
            ctx.line(2);
            let er = -1, ec = -1;
            for (let r = 0; r < 9 && er === -1; r++)
                for (let c = 0; c < 9 && er === -1; c++)
                    if (puzzle[r][c] === 0) { er = r; ec = c; }
            ctx.line(3);
            if (er === -1) return true;
            ctx.line(5);
            for (let num = 1; num <= 9; num++) {
                ctx.line(6);
                if (isValid(er, ec, num)) {
                    ctx.line(7);
                    puzzle[er][ec] = num;
                    board.board[er][ec] = { value: num, state: 'current' };
                    board._commit({ type: 'set', payload: { r: er, c: ec, num }, description: '尝试 (' + er + ',' + ec + ') = ' + num });
                    ctx.line(8);
                    if (solve()) return true;
                    ctx.line(9);
                    puzzle[er][ec] = 0;
                    board.board[er][ec] = { value: 0, state: 'backtrack' };
                    board._commit({ type: 'backtrack', payload: { r: er, c: ec }, description: '回溯 (' + er + ',' + ec + ')' });
                    board.board[er][ec] = { value: 0, state: 'default' };
                }
                if (++stepCount > 200) { log.printWarning('达到步数限制，提前结束'); return true; }
            }
            return false;
        }
        solve();
        // 标记完成
        for (let r = 0; r < 9; r++)
            for (let c = 0; c < 9; c++)
                board.board[r][c] = { value: puzzle[r][c], state: 'sorted' };
        board._commit({ type: 'mark', payload: {}, description: '数独求解完成' });
        log.printSuccess('数独求解完成');
    }

    // ====================================================================
    // 16. 经典 P2 - 生产者消费者
    // ====================================================================

    const producerConsumerCode = `const CAP = 3;
let buffer = [];
function produce(x) {
  while (buffer.length >= CAP) wait();
  buffer.push(x);
  notify();
}
function consume() {
  while (buffer.length === 0) wait();
  const x = buffer.shift();
  notify();
  return x;
}`;
    function producerConsumerRun(ctx) {
        const buf = ctx.add(new QueueTracer('buffer'));
        const log = ctx.add(new LogTracer('log'));
        const CAP = 3;
        log.printInfo('生产者-消费者模拟（缓冲区容量 = ' + CAP + '）');

        const events = [
            { op: 'produce', val: 10 },
            { op: 'produce', val: 20 },
            { op: 'produce', val: 30 },
            { op: 'produce', val: 40 },
            { op: 'consume', val: null },
            { op: 'produce', val: 50 },
            { op: 'consume', val: null },
            { op: 'consume', val: null }
        ];

        for (const e of events) {
            if (e.op === 'produce') {
                ctx.line(3);
                if (buf.items.length >= CAP) {
                    ctx.line(4);
                    log.printWarning('缓冲区已满，生产者等待');
                    buf.items.forEach(it => it.state = 'compare');
                    buf._commit({ type: 'highlight', payload: {}, description: '缓冲区满，生产者阻塞' });
                    buf.items.forEach(it => it.state = 'default');
                }
                ctx.line(5);
                buf.enqueue(e.val, '生产者生产 ' + e.val);
                log.printSuccess('生产 ' + e.val + '，缓冲区: [' + buf.items.map(it => it.value).join(', ') + ']');
            } else {
                ctx.line(7);
                if (buf.items.length === 0) {
                    ctx.line(8);
                    log.printWarning('缓冲区为空，消费者等待');
                }
                ctx.line(9);
                buf.dequeue('消费者消费');
                log.printSuccess('消费完成，缓冲区: [' + buf.items.map(it => it.value).join(', ') + ']');
            }
        }
        log.printSuccess('生产者-消费者演示完成');
    }

    // ====================================================================
    // 17. 经典 P3 - 哲学家就餐
    // ====================================================================

    const diningPhilosophersCode = `const N = 5;
const forks = [false, false, false, false, false];
const states = ['thinking', 'thinking', ...];
function dine(i) {
  if (forks[i] || forks[(i+1)%N]) return; // 等待
  forks[i] = forks[(i+1)%N] = true;
  states[i] = 'eating';
  eat();
  forks[i] = forks[(i+1)%N] = false;
  states[i] = 'thinking';
}`;
    function diningPhilosophersRun(ctx) {
        const N = 5;
        const labels = ['P0', 'P1', 'P2', 'P3', 'P4'];
        const vertices = labels.map(l => ({ label: l }));
        const edges = [];
        for (let i = 0; i < N; i++) edges.push({ u: i, v: (i + 1) % N, directed: false });
        const g = ctx.add(new GraphTracer('graph', vertices, edges));
        const log = ctx.add(new LogTracer('log'));
        log.printInfo('哲学家就餐问题（' + N + ' 位哲学家）');

        const states = new Array(N).fill('thinking');
        const forks = new Array(N).fill(false); // fork i 在哲学家 i 和 i+1 之间

        // 模拟: 每轮让一些哲学家尝试就餐
        const rounds = [
            [0, 2],
            [1, 3],
            [0, 2, 4],
            [1, 3],
            [0, 2, 4]
        ];

        for (let round = 0; round < rounds.length; round++) {
            log.printInfo('--- 第 ' + (round + 1) + ' 轮 ---');
            // 重置
            for (let i = 0; i < N; i++) {
                states[i] = 'thinking';
                forks[i] = false;
                g.vertices[i].state = 'default';
                g.vertices[i].tag = '思考';
            }
            g._commit({ type: 'snapshot', payload: {}, description: '第 ' + (round + 1) + ' 轮：所有哲学家思考' });

            const diners = rounds[round];
            for (const i of diners) {
                const left = i, right = (i + 1) % N;
                ctx.line(4);
                if (!forks[left] && !forks[right]) {
                    ctx.line(5);
                    forks[left] = forks[right] = true;
                    states[i] = 'eating';
                    g.vertices[i].state = 'sorted';
                    g.vertices[i].tag = '就餐';
                    g.highlightEdge(i, (i + 1) % N, '#3fb950', '拿起叉子');
                    g._commit({ type: 'visit', payload: { philosopher: i }, description: 'P' + i + ' 拿起两把叉子，开始就餐' });
                    log.printSuccess('P' + i + ' 就餐');
                } else {
                    g.vertices[i].state = 'compare';
                    g.vertices[i].tag = '饥饿';
                    g._commit({ type: 'highlight', payload: { philosopher: i }, description: 'P' + i + ' 叉子被占用，饥饿等待' });
                    g.vertices[i].state = 'default';
                    g.vertices[i].tag = '思考';
                    log.printWarning('P' + i + ' 叉子被占用，等待');
                }
            }
        }
        g.done();
        log.printSuccess('哲学家就餐演示完成');
    }

    // ====================================================================
    // 18. 进阶 P3 - 跳表查找
    // ====================================================================

    const skipListSearchCode = `function search(skipList, target) {
  let level = skipList.maxLevel;
  let cur = skipList.head;
  while (level >= 0) {
    while (cur.forward[level] && cur.forward[level].val < target) {
      cur = cur.forward[level];
    }
    level--;
  }
  cur = cur.forward[0];
  return cur && cur.val === target;
}`;
    function skipListSearchRun(ctx) {
        const sl = ctx.add(new SkipListTracer('skipList'));
        const log = ctx.add(new LogTracer('log'));

        // 预构建跳表
        // Level 0 (底层): -∞, 10, 20, 30, 40, 50, +∞
        // Level 1: -∞, 20, 40, +∞
        // Level 2: -∞, 40, +∞
        const levels = [
            { level: 2, nodes: [{ value: '-∞', state: 'default' }, { value: 40, state: 'default' }, { value: '+∞', state: 'default' }] },
            { level: 1, nodes: [{ value: '-∞', state: 'default' }, { value: 20, state: 'default' }, { value: 40, state: 'default' }, { value: '+∞', state: 'default' }] },
            { level: 0, nodes: [{ value: '-∞', state: 'default' }, { value: 10, state: 'default' }, { value: 20, state: 'default' }, { value: 30, state: 'default' }, { value: 40, state: 'default' }, { value: 50, state: 'default' }, { value: '+∞', state: 'default' }] }
        ];
        sl.setLevels(levels, '初始跳表（3 层）');
        log.printInfo('跳表查找: 目标 = 30');

        const target = 30;
        // 模拟查找过程
        // 从最高层开始
        const path = [
            { lvl: 2, idx: 0, desc: '从 L2 头节点开始' },
            { lvl: 2, idx: 1, desc: 'L2: -∞ < 30，前进到 40 → 40 > 30，下降' },
            { lvl: 1, idx: 0, desc: 'L1: 从 -∞ 开始' },
            { lvl: 1, idx: 1, desc: 'L1: -∞ < 30，前进到 20' },
            { lvl: 1, idx: 2, desc: 'L1: 20 < 30，前进到 40 → 40 > 30，下降' },
            { lvl: 0, idx: 2, desc: 'L0: 从 20 开始' },
            { lvl: 0, idx: 3, desc: 'L0: 20 < 30，前进到 30' },
            { lvl: 0, idx: 3, desc: 'L0: 30 == 30，找到！' }
        ];

        for (const step of path) {
            sl.clearHighlights();
            const levelData = levels.find(l => l.level === step.lvl);
            if (levelData && levelData.nodes[step.idx]) {
                // 在对应层高亮
                for (let li = 0; li < levels.length; li++) {
                    if (levels[li].level === step.lvl) {
                        sl.highlight(li, step.idx, 'current', step.desc);
                        break;
                    }
                }
                log.printInfo(step.desc);
            }
        }
        sl.clearHighlights();
        // 标记找到
        for (let li = 0; li < levels.length; li++) {
            if (levels[li].level === 0) {
                sl.highlight(li, 3, 'sorted', '找到 30');
                break;
            }
        }
        log.printSuccess('跳表查找完成：找到目标 30');
    }

    // ====================================================================
    // 19. 进阶 P3 - 跳表插入
    // ====================================================================

    const skipListInsertCode = `function insert(skipList, val) {
  const update = [];
  let level = skipList.maxLevel;
  let cur = skipList.head;
  while (level >= 0) {
    while (cur.forward[level] && cur.forward[level].val < val) {
      cur = cur.forward[level];
    }
    update[level] = cur;
    level--;
  }
  const newLevel = randomLevel();
  const node = new Node(val, newLevel);
  for (let i = 0; i <= newLevel; i++) {
    node.forward[i] = update[i].forward[i];
    update[i].forward[i] = node;
  }
}`;
    function skipListInsertRun(ctx) {
        const sl = ctx.add(new SkipListTracer('skipList'));
        const log = ctx.add(new LogTracer('log'));

        // 初始跳表
        let levels = [
            { level: 1, nodes: [{ value: '-∞', state: 'default' }, { value: 20, state: 'default' }, { value: '+∞', state: 'default' }] },
            { level: 0, nodes: [{ value: '-∞', state: 'default' }, { value: 10, state: 'default' }, { value: 20, state: 'default' }, { value: '+∞', state: 'default' }] }
        ];
        sl.setLevels(levels, '初始跳表（2 层）');
        log.printInfo('跳表插入: 值 = 15');

        const val = 15;
        // 模拟插入 15，新节点出现在 level 0 和 level 1
        log.printInfo('Step 1: 查找插入位置');
        sl.highlight(1, 1, 'current', 'L1: 20 > 15，下降');
        sl.highlight(0, 1, 'current', 'L0: 10 < 15，前进');
        sl.highlight(0, 2, 'compare', 'L0: 20 > 15，插入位置在 10 和 20 之间');

        log.printInfo('Step 2: 随机层数 = 1（出现在 L0 和 L1）');
        // 插入 15 到 level 0
        levels[1].nodes = [{ value: '-∞', state: 'default' }, { value: 10, state: 'default' }, { value: 15, state: 'current' }, { value: 20, state: 'default' }, { value: '+∞', state: 'default' }];
        sl.setLevels(levels, 'L0: 插入节点 15');
        log.printSuccess('L0 插入 15');

        // 插入 15 到 level 1
        levels[0].nodes = [{ value: '-∞', state: 'default' }, { value: 15, state: 'current' }, { value: 20, state: 'default' }, { value: '+∞', state: 'default' }];
        sl.setLevels(levels, 'L1: 插入节点 15（提升一层）');
        log.printSuccess('L1 插入 15');

        // 完成
        sl.clearHighlights();
        for (const l of levels) for (const n of l.nodes) if (n.value === 15) n.state = 'sorted';
        sl.setLevels(levels, '插入完成');
        log.printSuccess('跳表插入 15 完成');
    }

    // ====================================================================
    // 通用图状态构建器：统一使用公共实现（js/core/stateBuilders.js）
    // ====================================================================

    const buildGraphState = StateBuilders.buildGraphState;

    // ====================================================================
    // 一致性哈希环追踪器（自定义 Tracer，类似 SkipListTracer）
    // ====================================================================

    class HashRingTracer {
        constructor(name) {
            this.name = name;
            this.type = 'hashRing';
            this.store = null;
            this._context = null;
            this.nodes = [];      // 物理节点: [{ id, label, hash, state, vnodeOf }]
            this.keys = [];       // 数据键: [{ id, label, hash, assignedTo, state }]
        }
        _attachStore(store) { this.store = store; }
        _commit(step) {
            if (!this.store) return;
            step.tracer = this.type;
            step.tracerName = this.name;
            if (this._context) {
                this._context.captureState(step);
            } else {
                step.state = { [this.name]: this.getSnapshot() };
            }
            this.store.push(step);
        }
        getSnapshot() {
            return {
                nodes: this.nodes.map(n => Object.assign({}, n)),
                keys: this.keys.map(k => Object.assign({}, k))
            };
        }
        setRing(nodes, keys, description) {
            this.nodes = nodes;
            this.keys = keys;
            this._commit({ type: 'snapshot', payload: {}, description: description || '更新哈希环' });
        }
        highlightNode(id, state, description) {
            const n = this.nodes.find(n => n.id === id);
            if (n) { n.state = state; this._commit({ type: 'highlight', payload: { node: id }, description: description || '高亮节点' }); }
        }
        highlightKey(id, state, description) {
            const k = this.keys.find(k => k.id === id);
            if (k) { k.state = state; this._commit({ type: 'highlight', payload: { key: id }, description: description || '高亮键' }); }
        }
        reassignKey(id, newNodeId, description) {
            const k = this.keys.find(k => k.id === id);
            if (k) { k.assignedTo = newNodeId; k.state = 'current'; this._commit({ type: 'reassign', payload: { key: id, node: newNodeId }, description: description || '重新分配键' }); k.state = 'default'; }
        }
        clearHighlights() {
            for (const n of this.nodes) n.state = 'default';
            for (const k of this.keys) k.state = 'default';
        }
    }

    function buildHashRingState(tracerStates, _step, ctxInfo) {
        const snap = tracerStates.hashRing;
        if (!snap) return null;
        const state = { shapes: [] };
        const nodes = snap.nodes;
        const keys = snap.keys;
        if (!nodes.length && !keys.length) return state;
        const renderer = (typeof window !== 'undefined' && window.app && window.app.renderer) || null;
        const tokens = (renderer && typeof renderer._tokens === 'function') ? renderer._tokens() : {
            cell: '#e9ecef', cellBorder: '#d0d7de', node: '#e9ecef', auxBg: '#f6f8fa',
            radiusSmall: [4, 4, 4, 4], radiusRect: [8, 8, 8, 8],
            dim: '#57606a', panelText: '#24292f'
        };
        const cw = (ctxInfo && ctxInfo.width) || (renderer && renderer.width) || 800;
        const ch = (ctxInfo && ctxInfo.height) || (renderer && renderer.height) || 400;

        // 环尺寸：在“标题下方”与“底部节点不裁切”之间取最大半径，并把节点/键半径略微缩小，
        // 解决大圆圈底部被日志区/画布下边缘遮挡的问题。
        const nodeR = 13;
        const keyHalf = 11;
        const markerR = Math.max(nodeR, keyHalf + 2);
        const titleSpace = 76;
        const bottomPad = 12;
        const maxRingR = Math.min(cw * 0.32, Math.floor((ch - titleSpace - bottomPad - markerR) / 2));
        const r = Math.max(70, Math.min(150, maxRingR));
        const cy = Math.floor((titleSpace + ch - bottomPad - markerR) / 2);
        const cx = cw / 2;
        const maxHash = nodes.concat(keys).reduce((m, x) => Math.max(m, x.hash || 0), 1);

        // 主题感知配色（从 Renderer 主题令牌读取）
        const ringStroke = tokens.dim;
        const nodeFill = tokens.node;
        const nodeStroke = tokens.cellBorder;
        const lineColor = tokens.cellBorder;
        const stateMap = { default: null, current: '#bc8cff', compare: '#f78166', visited: '#58a6ff', sorted: '#3fb950', path: '#3fb950' };

        // 每个物理节点固定一种高区分度颜色，用于节点默认填充、分配线、图例
        const palette = ['#58a6ff', '#bc8cff', '#3fb950', '#f78166', '#d29922', '#f0883e', '#ff6b6b', '#a371f7'];
        const physicalNodes = nodes.filter(n => !n.vnodeOf).length ? nodes.filter(n => !n.vnodeOf) : nodes.slice(0, 8);
        const nodeColorById = {};
        physicalNodes.forEach((n, i) => { nodeColorById[n.id] = palette[i % palette.length]; });
        function fillOf(n) {
            const st = n.state || 'default';
            if (stateMap[st]) return stateMap[st];
            return nodeColorById[n.id] || nodeFill;
        }

        // 标题：显示当前步骤描述，让用户知道正在发生什么
        if (_step && _step.description) {
            state.title = _step.description;
        }

        // 外环 + 刻度，帮助感知 hash 空间
        state.shapes.push({ kind: 'circle', x: cx, y: cy, r: r, color: 'none', opts: { stroke: ringStroke, strokeWidth: 2 } });
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            state.shapes.push({
                kind: 'line', x1: cx + Math.cos(a) * (r - 6), y1: cy + Math.sin(a) * (r - 6),
                x2: cx + Math.cos(a) * r, y2: cy + Math.sin(a) * r,
                color: ringStroke, width: 2
            });
        }

        // 分配线：用箭头 + 目标节点颜色，迁移中的键加粗高亮
        for (const k of keys) {
            const node = nodes.find(n => n.id === k.assignedTo);
            if (!node) continue;
            const ka = ((k.hash || 0) / maxHash) * Math.PI * 2 - Math.PI / 2;
            const na = ((node.hash || 0) / maxHash) * Math.PI * 2 - Math.PI / 2;
            const isMigrating = k.state === 'current';
            const color = isMigrating ? stateMap.current : (nodeColorById[node.id] || lineColor);
            state.shapes.push({
                kind: 'arrow',
                x1: cx + Math.cos(ka) * r, y1: cy + Math.sin(ka) * r,
                x2: cx + Math.cos(na) * r, y2: cy + Math.sin(na) * r,
                color: color, width: isMigrating ? 3.5 : 2, headSize: isMigrating ? 10 : 7
            });
        }

        // 节点与键（使用组件库圆角与发光效果）
        const all = nodes.map(n => ({ ...n, _type: 'node' })).concat(keys.map(k => ({ ...k, _type: 'key' })));
        for (const item of all) {
            const angle = ((item.hash || 0) / maxHash) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            const st = item.state || 'default';
            if (item._type === 'node') {
                const fill = fillOf(item);
                const stroke = st === 'default' ? nodeStroke : tokens.panelText;
                const strokeWidth = st === 'default' ? 2 : 3.5;
                state.shapes.push({
                    kind: 'circle', x, y, r: nodeR,
                    color: fill,
                    label: String(item.label), opts: { stroke, strokeWidth, fontSize: 12 }
                });
                if (item.vnodeOf !== undefined && item.vnodeOf !== null) {
                    state.shapes.push({ kind: 'text', x, y: y - nodeR - 10, text: 'v', color: tokens.dim, fontSize: 9, align: 'center', opts: {} });
                }
            } else {
                const keyColor = st === 'default' ? '#d29922' : (stateMap[st] || '#d29922');
                const keyStroke = st === 'default' ? tokens.cellBorder : tokens.panelText;
                state.shapes.push({
                    kind: 'rect', x: x - 11, y: y - 11, w: 22, h: 22,
                    color: keyColor, radius: tokens.radiusSmall,
                    label: String(item.label), opts: { stroke: keyStroke, strokeWidth: st === 'default' ? 1.5 : 3, fontSize: 10, glow: st !== 'default', shadow: st === 'default' }
                });
            }
        }

        // 图例 + 负载统计：右上角固定面板
        const panelX = cw - 150;
        const panelY = 44;
        state.shapes.push({
            kind: 'rect', x: panelX, y: panelY, w: 140, h: 34 + physicalNodes.length * 22,
            color: tokens.auxBg, radius: tokens.radiusRect,
            opts: { stroke: tokens.cellBorder, strokeWidth: 1, shadow: true }
        });
        state.shapes.push({ kind: 'text', x: panelX + 10, y: panelY + 18, text: '节点负载', color: tokens.panelText, fontSize: 12, align: 'left', opts: { bold: true } });
        const load = {};
        for (const k of keys) {
            const owner = k.assignedTo;
            load[owner] = (load[owner] || 0) + 1;
        }
        physicalNodes.forEach((n, i) => {
            const y = panelY + 38 + i * 22;
            const color = nodeColorById[n.id] || nodeFill;
            state.shapes.push({ kind: 'circle', x: panelX + 18, y, r: 7, color, label: '', opts: { stroke: tokens.cellBorder, strokeWidth: 1.5, shadow: true } });
            state.shapes.push({ kind: 'text', x: panelX + 34, y, text: n.label + ': ' + (load[n.id] || 0) + ' 键', color: tokens.panelText, fontSize: 11, align: 'left', opts: {} });
        });

        return state;
    }

    // 简易哈希函数（用于一致性哈希演示）
    function simpleHash(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = ((h * 31) + str.charCodeAt(i)) & 0x3FFFFFFF;
        }
        return h;
    }

    // ====================================================================
    // 20. 进阶 P3 - 跳表删除
    // ====================================================================

    const skipListDeleteCode = `function delete(skipList, target) {
  const update = [];
  let level = skipList.maxLevel;
  let cur = skipList.head;
  while (level >= 0) {
    while (cur.forward[level] && cur.forward[level].val < target) {
      cur = cur.forward[level];
    }
    update[level] = cur;
    level--;
  }
  cur = cur.forward[0];
  if (!cur || cur.val !== target) return false;
  for (let i = 0; i <= cur.maxLevel; i++) {
    if (update[i] && update[i].forward[i] === cur) {
      update[i].forward[i] = cur.forward[i];
    }
  }
  return true;
}`;
    function skipListDeleteRun(ctx) {
        const sl = ctx.add(new SkipListTracer('skipList'));
        const log = ctx.add(new LogTracer('log'));

        // 初始跳表
        let levels = [
            { level: 2, nodes: [{ value: '-∞', state: 'default' }, { value: 40, state: 'default' }, { value: '+∞', state: 'default' }] },
            { level: 1, nodes: [{ value: '-∞', state: 'default' }, { value: 20, state: 'default' }, { value: 40, state: 'default' }, { value: '+∞', state: 'default' }] },
            { level: 0, nodes: [{ value: '-∞', state: 'default' }, { value: 10, state: 'default' }, { value: 20, state: 'default' }, { value: 30, state: 'default' }, { value: 40, state: 'default' }, { value: 50, state: 'default' }, { value: '+∞', state: 'default' }] }
        ];
        sl.setLevels(levels, '初始跳表（3 层）');
        log.printInfo('跳表删除: 目标 = 20');

        const target = 20;
        // 模拟查找 + 删除
        log.printInfo('Step 1: 从最高层查找目标节点');
        sl.clearHighlights();
        sl.highlight(0, 1, 'current', 'L2: -∞ < 20，前进到 40');
        sl.highlight(0, 2, 'compare', 'L2: 40 > 20，下降');
        sl.clearHighlights();
        sl.highlight(1, 1, 'current', 'L1: 找到 20，记录前驱');
        sl.clearHighlights();
        sl.highlight(2, 2, 'current', 'L0: 找到 20，确认存在');

        log.printInfo('Step 2: 从各层删除节点 20');
        // L0 删除
        levels[2].nodes = [{ value: '-∞', state: 'default' }, { value: 10, state: 'default' }, { value: 30, state: 'default' }, { value: 40, state: 'default' }, { value: 50, state: 'default' }, { value: '+∞', state: 'default' }];
        sl.setLevels(levels, 'L0: 删除节点 20');
        log.printSuccess('L0 删除 20');

        // L1 删除
        levels[1].nodes = [{ value: '-∞', state: 'default' }, { value: 40, state: 'default' }, { value: '+∞', state: 'default' }];
        sl.setLevels(levels, 'L1: 删除节点 20');
        log.printSuccess('L1 删除 20');

        // 完成
        sl.clearHighlights();
        for (const l of levels) for (const n of l.nodes) if (n.value === 10 || n.value === 30) n.state = 'sorted';
        sl.setLevels(levels, '删除完成');
        log.printSuccess('跳表删除 20 完成');
    }

    // ====================================================================
    // 21. 进阶 P3 - 一致性哈希节点加入
    // ====================================================================

    const consistentHashAddCode = `function addNode(ring, newNode) {
  const pos = hash(newNode);
  ring.insert(sortedPos(ring, pos), { node: newNode, hash: pos });
  // 重新分配受影响范围的键
  const successor = ring[next(pos)];
  for (const key of successor.keys) {
    if (key.hash < pos) {
      reassign(key, newNode);
    }
  }
}`;
    function consistentHashAddRun(ctx) {
        const ring = ctx.add(new HashRingTracer('hashRing'));
        const log = ctx.add(new LogTracer('log'));

        // 初始环: N1, N2, N3
        const nodeData = [
            { id: 'N1', label: 'N1', hash: simpleHash('N1') },
            { id: 'N2', label: 'N2', hash: simpleHash('N2') },
            { id: 'N3', label: 'N3', hash: simpleHash('N3') }
        ];
        const keyData = [
            { id: 'K1', label: 'K1', hash: simpleHash('K1') },
            { id: 'K2', label: 'K2', hash: simpleHash('K2') },
            { id: 'K3', label: 'K3', hash: simpleHash('K3') },
            { id: 'K4', label: 'K4', hash: simpleHash('K4') },
            { id: 'K5', label: 'K5', hash: simpleHash('K5') }
        ];

        function assignKeys(nodes, keys) {
            const sorted = nodes.slice().sort((a, b) => a.hash - b.hash);
            for (const k of keys) {
                let assigned = sorted[0];
                for (const n of sorted) {
                    if (n.hash <= k.hash) assigned = n;
                    else break;
                }
                k.assignedTo = assigned.id;
            }
        }

        assignKeys(nodeData, keyData);
        ring.setRing(
            nodeData.map(n => ({ ...n, state: 'default', vnodeOf: null })),
            keyData.map(k => ({ ...k, state: 'default' })),
            '初始哈希环: N1, N2, N3 + 5 个键'
        );
        log.printInfo('初始哈希环: 3 个节点, 5 个键');

        // 加入新节点 N4
        const newNode = { id: 'N4', label: 'N4', hash: simpleHash('N4') };
        log.printWarning('加入新节点 N4，hash = ' + newNode.hash);

        // 计算受影响的键
        const allNodes = nodeData.concat([newNode]);
        const sortedOld = nodeData.slice().sort((a, b) => a.hash - b.hash);
        const sortedNew = allNodes.slice().sort((a, b) => a.hash - b.hash);

        // 找到 N4 在新环中的位置和前驱/后继
        const newIdx = sortedNew.findIndex(n => n.id === 'N4');
        const successor = sortedNew[(newIdx + 1) % sortedNew.length];

        ring.highlightNode('N4', 'current', 'N4 加入环');
        log.printInfo('N4 的后继节点: ' + successor.label);

        // 重新分配键
        const newNodes = allNodes.map(n => ({ ...n, state: n.id === 'N4' ? 'current' : 'default', vnodeOf: null }));
        const newKeys = keyData.map(k => ({ ...k, state: 'default' }));
        assignKeys(newNodes, newKeys);

        // 找出被重新分配的键，并高亮源节点、目标节点与迁移键，使动画效果更明显
        for (const k of newKeys) {
            const oldKey = keyData.find(ok => ok.id === k.id);
            if (oldKey.assignedTo !== k.assignedTo) {
                const srcNode = oldKey.assignedTo;
                const dstNode = k.assignedTo;
                ring.setRing(
                    allNodes.map(n => ({ ...n, state: n.id === dstNode ? 'current' : (n.id === srcNode ? 'compare' : 'default'), vnodeOf: null })),
                    newKeys.map(kk => kk.id === k.id ? { ...kk, state: 'current' } : kk),
                    '键 ' + k.label + ' 从 ' + srcNode + ' 迁移到 ' + dstNode
                );
                log.printSuccess('键 ' + k.label + ' 迁移: ' + srcNode + ' → ' + dstNode);
            }
        }

        ring.setRing(newNodes.map(n => ({ ...n, state: 'default' })), newKeys.map(k => ({ ...k, state: 'default' })), '节点加入完成');
        log.printSuccess('一致性哈希节点加入完成');
    }

    // ====================================================================
    // 22. 进阶 P3 - 一致性哈希节点移除
    // ====================================================================

    const consistentHashRemoveCode = `function removeNode(ring, node) {
  const pos = findPos(ring, node);
  const successor = ring[next(pos)];
  // 将该节点的所有键迁移到后继
  for (const key of pos.keys) {
    reassign(key, successor);
  }
  ring.remove(pos);
}`;
    function consistentHashRemoveRun(ctx) {
        const ring = ctx.add(new HashRingTracer('hashRing'));
        const log = ctx.add(new LogTracer('log'));

        const nodeData = [
            { id: 'N1', label: 'N1', hash: simpleHash('N1') },
            { id: 'N2', label: 'N2', hash: simpleHash('N2') },
            { id: 'N3', label: 'N3', hash: simpleHash('N3') },
            { id: 'N4', label: 'N4', hash: simpleHash('N4') }
        ];
        const keyData = [
            { id: 'K1', label: 'K1', hash: simpleHash('K1') },
            { id: 'K2', label: 'K2', hash: simpleHash('K2') },
            { id: 'K3', label: 'K3', hash: simpleHash('K3') },
            { id: 'K4', label: 'K4', hash: simpleHash('K4') },
            { id: 'K5', label: 'K5', hash: simpleHash('K5') }
        ];

        function assignKeys(nodes, keys) {
            const sorted = nodes.slice().sort((a, b) => a.hash - b.hash);
            for (const k of keys) {
                let assigned = sorted[0];
                for (const n of sorted) {
                    if (n.hash <= k.hash) assigned = n;
                    else break;
                }
                k.assignedTo = assigned.id;
            }
        }

        assignKeys(nodeData, keyData);
        ring.setRing(
            nodeData.map(n => ({ ...n, state: 'default', vnodeOf: null })),
            keyData.map(k => ({ ...k, state: 'default' })),
            '初始哈希环: N1, N2, N3, N4 + 5 个键'
        );
        log.printInfo('初始哈希环: 4 个节点, 5 个键');

        // 移除节点 N2
        const removeId = 'N2';
        log.printWarning('移除节点 ' + removeId);

        // 找到后继
        const sortedNodes = nodeData.slice().sort((a, b) => a.hash - b.hash);
        const removeIdx = sortedNodes.findIndex(n => n.id === removeId);
        const successor = sortedNodes[(removeIdx + 1) % sortedNodes.length];

        ring.highlightNode(removeId, 'compare', 'N2 即将移除');
        log.printInfo('N2 的后继节点: ' + successor.label);

        // 迁移键：高亮被移除节点、后继节点与迁移键
        const remainingNodes = nodeData.filter(n => n.id !== removeId);
        const newKeys = keyData.map(k => ({ ...k, state: 'default' }));
        assignKeys(remainingNodes, newKeys);

        for (const k of newKeys) {
            const oldKey = keyData.find(ok => ok.id === k.id);
            if (oldKey.assignedTo !== k.assignedTo) {
                const dstNode = k.assignedTo;
                ring.setRing(
                    nodeData.map(n => ({ ...n, state: n.id === removeId ? 'compare' : (n.id === dstNode ? 'current' : 'default'), vnodeOf: null })),
                    newKeys.map(kk => kk.id === k.id ? { ...kk, state: 'current' } : kk),
                    '键 ' + k.label + ' 从 ' + removeId + ' 迁移到 ' + dstNode
                );
                log.printSuccess('键 ' + k.label + ' 迁移: ' + removeId + ' → ' + dstNode);
            }
        }

        // 最终状态
        ring.setRing(
            remainingNodes.map(n => ({ ...n, state: 'default', vnodeOf: null })),
            newKeys.map(k => ({ ...k, state: 'default' })),
            '节点移除完成'
        );
        log.printSuccess('一致性哈希节点移除完成');
    }

    // ====================================================================
    // 23. 进阶 P3 - 一致性哈希虚拟节点
    // ====================================================================

    const consistentHashVNodeCode = `function addVNodes(ring, physicalNode, count) {
  for (let i = 0; i < count; i++) {
    const vnodeId = physicalNode + '#' + i;
    const pos = hash(vnodeId);
    ring.insert(sortedPos(ring, pos), { node: vnodeId, hash: pos, vnodeOf: physicalNode });
  }
}`;
    function consistentHashVNodeRun(ctx) {
        const ring = ctx.add(new HashRingTracer('hashRing'));
        const log = ctx.add(new LogTracer('log'));

        const keyData = [
            { id: 'K1', label: 'K1', hash: simpleHash('K1') },
            { id: 'K2', label: 'K2', hash: simpleHash('K2') },
            { id: 'K3', label: 'K3', hash: simpleHash('K3') },
            { id: 'K4', label: 'K4', hash: simpleHash('K4') },
            { id: 'K5', label: 'K5', hash: simpleHash('K5') },
            { id: 'K6', label: 'K6', hash: simpleHash('K6') }
        ];

        function assignKeys(nodes, keys) {
            const sorted = nodes.slice().sort((a, b) => a.hash - b.hash);
            for (const k of keys) {
                let assigned = sorted[0];
                for (const n of sorted) {
                    if (n.hash <= k.hash) assigned = n;
                    else break;
                }
                k.assignedTo = assigned.id;
            }
        }

        // 无虚拟节点: 仅 N1, N2
        const baseNodes = [
            { id: 'N1', label: 'N1', hash: simpleHash('N1') },
            { id: 'N2', label: 'N2', hash: simpleHash('N2') }
        ];
        const keysNoVNode = keyData.map(k => ({ ...k, state: 'default' }));
        assignKeys(baseNodes, keysNoVNode);
        ring.setRing(
            baseNodes.map(n => ({ ...n, state: 'default', vnodeOf: null })),
            keysNoVNode,
            '无虚拟节点: 仅 N1, N2（键分布不均）'
        );
        log.printInfo('无虚拟节点: 仅 2 个物理节点');

        // 统计负载
        const load1 = { N1: 0, N2: 0 };
        for (const k of keysNoVNode) load1[k.assignedTo]++;
        log.printInfo('负载: N1=' + load1.N1 + ', N2=' + load1.N2);

        // 添加虚拟节点: 每个物理节点 3 个 vnodes
        log.printWarning('为每个物理节点添加 3 个虚拟节点');
        const vNodes = [];
        for (const pn of baseNodes) {
            for (let i = 0; i < 3; i++) {
                const vId = pn.id + '#' + i;
                vNodes.push({
                    id: vId, label: pn.id + 'v' + i, hash: simpleHash(vId),
                    vnodeOf: pn.id
                });
            }
        }
        const allNodes = baseNodes.concat(vNodes);
        const keysWithVNode = keyData.map(k => ({ ...k, state: 'default' }));
        assignKeys(allNodes, keysWithVNode);

        // 高亮虚拟节点
        ring.setRing(
            allNodes.map(n => ({ ...n, state: n.vnodeOf ? 'visited' : 'sorted', vnodeOf: n.vnodeOf || null })),
            keysWithVNode,
            '添加 6 个虚拟节点（N1#0-2, N2#0-2）'
        );
        log.printSuccess('虚拟节点已添加，键分布更均匀');

        // 统计新负载（按物理节点聚合）
        const load2 = { N1: 0, N2: 0 };
        for (const k of keysWithVNode) {
            const vnode = allNodes.find(n => n.id === k.assignedTo);
            if (vnode && vnode.vnodeOf) load2[vnode.vnodeOf]++;
            else if (vnode) load2[vnode.id]++;
        }
        log.printInfo('负载: N1=' + load2.N1 + ', N2=' + load2.N2 + '（更均匀）');
        log.printSuccess('一致性哈希虚拟节点演示完成');
    }

    // ====================================================================
    // 24. 进阶 P3 - Raft Leader 选举
    // ====================================================================

    const raftLeaderCode = `function startElection(servers) {
  const candidate = servers.find(s => s.state === 'candidate');
  candidate.currentTerm++;
  candidate.votedFor = candidate.id;
  let votes = 1;
  for (const peer of servers) {
    if (peer.id === candidate.id) continue;
    if (peer.currentTerm < candidate.currentTerm) {
      peer.votedFor = candidate.id;
      votes++;
    }
  }
  if (votes > servers.length / 2) {
    candidate.state = 'leader';
    for (const peer of servers) {
      if (peer.id !== candidate.id) peer.state = 'follower';
    }
  }
}`;
    function raftLeaderRun(ctx) {
        const N = 5;
        const labels = ['S1', 'S2', 'S3', 'S4', 'S5'];
        const vertices = labels.map(l => ({ label: l, state: 'default' }));
        const edges = [];
        // 全连接拓扑
        for (let i = 0; i < N; i++)
            for (let j = i + 1; j < N; j++)
                edges.push({ u: i, v: j, directed: false });
        const g = ctx.add(new GraphTracer('graph', vertices, edges));
        const log = ctx.add(new LogTracer('log'));
        log.printInfo('Raft Leader 选举（5 节点集群）');

        // 初始状态：所有节点都是 follower
        for (let i = 0; i < N; i++) {
            g.vertices[i].state = 'default';
            g.vertices[i].tag = 'F';
        }
        g._commit({ type: 'snapshot', payload: {}, description: '初始：所有节点为 Follower' });
        log.printInfo('初始：所有节点为 Follower (term=0)');

        // S3 超时，发起选举
        const candidate = 2; // S3
        g.vertices[candidate].state = 'current';
        g.vertices[candidate].tag = 'C';
        g._commit({ type: 'visit', payload: { vertex: candidate }, description: 'S3 选举超时，变为 Candidate (term=1)' });
        log.printWarning('S3 选举超时 → Candidate, term=1');

        // S3 向其他节点发送 RequestVote
        ctx.line(3);
        for (let i = 0; i < N; i++) {
            if (i === candidate) continue;
            g.highlightEdge(candidate, i, '#bc8cff', 'RequestVote');
            log.printInfo('S3 → S' + (i + 1) + ': RequestVote(term=1)');
        }

        // 节点投票
        ctx.line(5);
        let votes = 1;
        for (let i = 0; i < N; i++) {
            if (i === candidate) continue;
            g.vertices[i].state = 'visited';
            g.vertices[i].tag = '✓';
            g._commit({ type: 'visit', payload: { vertex: i }, description: 'S' + (i + 1) + ' 投票给 S3' });
            log.printSuccess('S' + (i + 1) + ' 投票给 S3');
            votes++;
        }

        // S3 获得多数票，成为 Leader
        ctx.line(9);
        g.vertices[candidate].state = 'sorted';
        g.vertices[candidate].tag = 'L';
        for (let i = 0; i < N; i++) {
            if (i !== candidate) {
                g.vertices[i].state = 'default';
                g.vertices[i].tag = 'F';
                g.highlightEdge(candidate, i, '#3fb950', 'heartbeat');
            }
        }
        g._commit({ type: 'mark', payload: { leader: candidate }, description: 'S3 获得多票 (' + votes + '/' + N + ')，成为 Leader' });
        log.printSuccess('S3 获得 ' + votes + ' 票 (> ' + Math.floor(N / 2) + ')，成为 Leader');
        log.printSuccess('Raft Leader 选举完成');
        g.done();
    }

    // ====================================================================
    // 25. 进阶 P3 - Raft 日志复制
    // ====================================================================

    const raftLogCode = `function appendEntries(leader, followers, entries) {
  for (const follower of followers) {
    let matchIndex = 0;
    for (const entry of entries) {
      if (follower.log[matchIndex] && follower.log[matchIndex].term === entry.term) {
        matchIndex++;
      } else {
        follower.log[matchIndex] = entry;
        matchIndex++;
      }
    }
    follower.matchIndex = matchIndex;
  }
  // 更新 commitIndex
  const matchIndices = followers.map(f => f.matchIndex).sort((a, b) => b - a);
  const commitIndex = matchIndices[Math.floor(followers.length / 2)];
  leader.commitIndex = commitIndex;
}`;
    function raftLogRun(ctx) {
        const N = 5;
        const labels = ['S1', 'S2', 'S3', 'S4', 'S5'];
        const vertices = labels.map(l => ({ label: l }));
        const edges = [];
        const leader = 0; // S1 is leader
        for (let i = 1; i < N; i++) edges.push({ u: leader, v: i, directed: true });
        const g = ctx.add(new GraphTracer('graph', vertices, edges));
        // 用 DPTableTracer 展示日志
        const logTable = ctx.add(new DPTableTracer('logs', N, 6));
        logTable.rowLabels = labels;
        logTable.colLabels = ['idx1', 'idx2', 'idx3', 'idx4', 'idx5', 'idx6'];
        const log = ctx.add(new LogTracer('log'));
        log.printInfo('Raft 日志复制（Leader: S1）');

        // 初始：所有日志为空
        for (let i = 0; i < N; i++)
            for (let j = 0; j < 6; j++)
                logTable.cells[i][j] = { value: '', state: 'default' };
        // Leader 已有条目 x=5, y=7
        const entries = [{ term: 1, cmd: 'x=5' }, { term: 1, cmd: 'y=7' }, { term: 2, cmd: 'z=3' }];
        for (let j = 0; j < entries.length; j++) {
            logTable.cells[leader][j] = { value: entries[j].cmd, state: 'sorted' };
        }
        g.vertices[leader].state = 'sorted';
        g.vertices[leader].tag = 'L';
        for (let i = 1; i < N; i++) { g.vertices[i].state = 'default'; g.vertices[i].tag = 'F'; }
        logTable._commit({ type: 'snapshot', payload: {}, description: 'Leader(S1) 有 3 条日志，Followers 为空' });
        log.printInfo('Leader S1 有 3 条日志: x=5, y=7, z=3');

        // 逐条复制
        ctx.line(2);
        for (let j = 0; j < entries.length; j++) {
            log.printInfo('复制第 ' + (j + 1) + ' 条日志: ' + entries[j].cmd + ' (term=' + entries[j].term + ')');
            for (let i = 1; i < N; i++) {
                g.highlightEdge(leader, i, '#58a6ff', 'AppendEntries');
                logTable.cells[i][j] = { value: entries[j].cmd, state: 'current' };
                logTable._commit({ type: 'visit', payload: { row: i, col: j }, description: 'S' + (i + 1) + ' 接收日志: ' + entries[j].cmd });
                logTable.cells[i][j].state = 'sorted';
            }
            log.printSuccess('第 ' + (j + 1) + ' 条日志已复制到所有 Follower');
        }

        // 提交
        ctx.line(9);
        for (let i = 0; i < N; i++)
            for (let j = 0; j < entries.length; j++)
                logTable.cells[i][j].state = 'sorted';
        logTable._commit({ type: 'mark', payload: {}, description: 'commitIndex = 3（多数节点已复制）' });
        log.printSuccess('commitIndex = 3，日志已提交');
        log.printSuccess('Raft 日志复制完成');
        g.done();
    }

    // ====================================================================
    // 注册所有 19 个算法
    // ====================================================================

    const algos = [
        // ===== 排序 =====
        {
            id: 'sorting.radixSort',
            name: '基数排序 (LSD)', category: 'sorting', level: 'P2',
            complexity: { time: 'O(d·(n+k))', space: 'O(n+k)' },
            keywords: ['radix', 'counting', 'bucket', 'LSD'],
            mnemonic: '低位起逐位入桶，d轮收集即有序',
            description: `<div class="desc-section"><h3>核心思想</h3><p>按数位从低到高（或从高到低）逐位进行稳定排序，最终得到完整有序序列。</p></div><div class="desc-section"><h3>推导过程</h3><p>先按个位排序，再按十位排序……因为每次排序都是稳定的，前一轮的相对顺序会被保留。k 位数字做 k 轮计数排序，总时间 O(k·n)。</p></div><div class="desc-section"><h3>适用场景</h3><p>整数、字符串、定长关键字排序，需要稳定线性排序。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 电话号码排序。② 银行卡号排序。③ 字符串字典序排序。</p></div>`,
            code: radixSortCode,
            defaultData: [170, 45, 75, 90, 802, 24, 2, 66],
            dataParser: NUM_DATA,
            run: radixSortRun,
            buildState: buildRadixSortState
        },

        // ===== 树 =====
        {
            id: 'tree.postorderRec',
            name: '二叉树 - 后序遍历（递归）', category: 'tree', level: 'P1',
            complexity: { time: 'O(n)', space: 'O(h)' },
            keywords: ['postorder', 'houxu', 'recursive', 'dfs'],
            mnemonic: '左右根递归深入，先访子树后访根',
            description: `<div class="desc-section"><h3>核心思想</h3><p>按特定顺序访问二叉树的每个节点：前序根-左-右，中序左-根-右，后序左-右-根，层序一层一层访问。</p></div><div class="desc-section"><h3>推导过程</h3><p>递归写法直接按定义访问。非递归写法用栈模拟递归过程：中序一路向左压栈，到底后弹出访问，再转向右子树；层序用队列按层扩展。</p></div><div class="desc-section"><h3>适用场景</h3><p>表达式求值、序列化树、按层次展示、BST 有序输出。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 文件系统目录树打印。② 表达式树求值。③ BST 中序输出有序序列。</p></div>`,
            code: postorderRecCode,
            run: postorderRecRun,
            buildState: buildBinaryTreeState
        },
        {
            id: 'tree.bstDeleteIter',
            name: 'BST - 删除（非递归）', category: 'tree', level: 'P1',
            complexity: { time: 'O(log n)', space: 'O(1)' },
            keywords: ['bst', 'delete', 'iterative', 'successor'],
            mnemonic: '迭代查找定目标，三情处理换后继',
            description: `<div class="desc-section"><h3>核心思想</h3><p>二叉搜索树保持“左子树 < 根 < 右子树”，查找/插入/删除都像二分查找一样沿一条路径走。</p></div><div class="desc-section"><h3>推导过程</h3><p>查找时与当前节点比较：小则向左，大则向右。插入找到空位置放入。删除分三种情况：叶子直接删；只有一个孩子则孩子顶替；有两个孩子则用右子树最小值（或左子树最大值）替换。</p></div><div class="desc-section"><h3>适用场景</h3><p>需要动态维护有序集合、频繁增删查。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 字典树实现。② 数据库索引（简单场景）。③ 实现有序 map。</p></div>`,
            code: bstDeleteIterCode,
            defaultData: [50, 30, 70, 20, 40, 60, 80],
            dataParser: NUM_DATA,
            run: bstDeleteIterRun,
            buildState: buildBinaryTreeState
        },
        {
            id: 'tree.avlDelete',
            name: 'AVL - 删除', category: 'tree', level: 'P2',
            complexity: { time: 'O(log n)', space: 'O(h)' },
            keywords: ['avl', 'delete', 'rebalance', 'rotation'],
            mnemonic: '递归删除回溯查，失衡旋转复平衡',
            description: `<div class="desc-section"><h3>核心思想</h3><p>AVL 树是严格的平衡二叉搜索树，任何节点的左右子树高度差不超过 1。</p></div><div class="desc-section"><h3>推导过程</h3><p>插入/删除后检查祖先节点的平衡因子。若失衡，通过左旋、右旋或左右双旋恢复平衡。旋转只影响局部子树，保持 BST 性质不变。</p></div><div class="desc-section"><h3>适用场景</h3><p>查找性能必须稳定为 O(log n)、数据频繁变动的场景。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 数据库索引。② 内存有序 map。③ 需要最坏情况保证的系统。</p></div>`,
            code: avlDeleteCode,
            defaultData: [30, 20, 40, 10, 25, 35, 50, 5],
            dataParser: NUM_DATA,
            run: avlDeleteRun,
            buildState: buildBinaryTreeState
        },
        {
            id: 'tree.rbInsert',
            name: '红黑树 - 插入', category: 'tree', level: 'P3',
            complexity: { time: 'O(log n)', space: 'O(1)' },
            keywords: ['red black tree', 'rb tree', 'insert', 'rotation', 'recolor'],
            mnemonic: '新插红节点变色，旋转修复红黑性',
            description: `<div class="desc-section"><h3>核心思想</h3><p>红黑树用“红/黑”染色和五条规则保持近似平衡，插入删除的旋转次数比 AVL 少。</p></div><div class="desc-section"><h3>推导过程</h3><p>规则包括根黑、叶子（NIL）黑、红节点的孩子黑、从任意节点到叶子的黑高相同。插入/删除时若破坏规则，通过变色和旋转修复，最多 O(log n) 次调整。</p></div><div class="desc-section"><h3>适用场景</h3><p>需要频繁插入删除且要求 O(log n) 性能的标准库实现。</p></div><div class="desc-section"><h3>典型案例</h3><p>① Java TreeMap/TreeSet。② Linux 内核 CFS 调度。③ C++ std::map。</p></div>`,
            code: rbInsertCode,
            defaultData: [10, 20, 30, 15, 25, 5, 1],
            dataParser: NUM_DATA,
            run: rbInsertRun,
            buildState: buildBinaryTreeState
        },
        {
            id: 'tree.rbDelete',
            name: '红黑树 - 删除', category: 'tree', level: 'P3',
            complexity: { time: 'O(log n)', space: 'O(1)' },
            keywords: ['red black tree', 'rb tree', 'delete', 'fixup'],
            mnemonic: '删黑生双重黑，兄长旋转变色救',
            description: `<div class="desc-section"><h3>核心思想</h3><p>红黑树用“红/黑”染色和五条规则保持近似平衡，插入删除的旋转次数比 AVL 少。</p></div><div class="desc-section"><h3>推导过程</h3><p>规则包括根黑、叶子（NIL）黑、红节点的孩子黑、从任意节点到叶子的黑高相同。插入/删除时若破坏规则，通过变色和旋转修复，最多 O(log n) 次调整。</p></div><div class="desc-section"><h3>适用场景</h3><p>需要频繁插入删除且要求 O(log n) 性能的标准库实现。</p></div><div class="desc-section"><h3>典型案例</h3><p>① Java TreeMap/TreeSet。② Linux 内核 CFS 调度。③ C++ std::map。</p></div>`,
            code: rbDeleteCode,
            defaultData: [10, 20, 30, 15, 25, 5, 1],
            dataParser: NUM_DATA,
            run: rbDeleteRun,
            buildState: buildBinaryTreeState
        },
        {
            id: 'tree.segmentTreeQuery',
            name: '线段树 - 区间查询', category: 'tree', level: 'P2',
            complexity: { time: 'O(log n)', space: 'O(n)' },
            keywords: ['segment tree', 'range query', 'sum'],
            mnemonic: '区间分解若干段，对数节点并集求',
            description: `<div class="desc-section"><h3>核心思想</h3><p>线段树把区间二分建造成树，每个节点维护一个子区间的聚合信息，支持区间查询和单点更新。</p></div><div class="desc-section"><h3>推导过程</h3><p>区间 [l,r] 对应节点，若长度大于 1 则分成 [l,mid] 和 [mid+1,r] 两个孩子。查询时把目标区间拆成若干已覆盖的子区间合并结果；更新时自底向上重新聚合。</p></div><div class="desc-section"><h3>适用场景</h3><p>区间最值/求和/修改、RMQ、动态区间统计。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 区间最大值查询。② 数组区间加减。③ 扫描线算法。</p></div>`,
            code: segQueryCode,
            defaultData: [3, 1, 4, 1, 5, 9, 2, 6],
            dataParser: NUM_DATA,
            run: segQueryRun
        },
        {
            id: 'tree.trieInsert',
            name: 'Trie - 插入', category: 'tree', level: 'P2',
            complexity: { time: 'O(L)', space: 'O(Σ·N)' },
            keywords: ['trie', 'prefix tree', 'insert', 'word'],
            mnemonic: '逐字下降无则建，末尾标记单词完',
            description: `<div class="desc-section"><h3>核心思想</h3><p>Trie（前缀树）把字符串按字符拆成边，从根到节点的路径就是一个前缀。</p></div><div class="desc-section"><h3>推导过程</h3><p>每个节点代表一个字符，从根到某节点拼起来就是前缀。插入时沿字符路径走，没有就新建；查找时同样沿路径走，走到头即存在。</p></div><div class="desc-section"><h3>适用场景</h3><p>前缀匹配、自动补全、拼写检查、IP 路由最长前缀匹配。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 输入法自动补全。② 路由器最长前缀匹配。③ 敏感词过滤。</p></div>`,
            code: trieInsertCode,
            defaultData: ['cat', 'car', 'card', 'care', 'dog'],
            dataParser: STR_DATA,
            run: trieInsertRun,
            buildState: buildNaryTreeState
        },
        {
            id: 'tree.trieSearch',
            name: 'Trie - 搜索', category: 'tree', level: 'P2',
            complexity: { time: 'O(L)', space: 'O(1)' },
            keywords: ['trie', 'prefix tree', 'search', 'word'],
            mnemonic: '逐字下降全匹配，末尾有标即为找',
            description: `<div class="desc-section"><h3>核心思想</h3><p>Trie（前缀树）把字符串按字符拆成边，从根到节点的路径就是一个前缀。</p></div><div class="desc-section"><h3>推导过程</h3><p>每个节点代表一个字符，从根到某节点拼起来就是前缀。插入时沿字符路径走，没有就新建；查找时同样沿路径走，走到头即存在。</p></div><div class="desc-section"><h3>适用场景</h3><p>前缀匹配、自动补全、拼写检查、IP 路由最长前缀匹配。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 输入法自动补全。② 路由器最长前缀匹配。③ 敏感词过滤。</p></div>`,
            code: trieSearchCode,
            run: trieSearchRun,
            buildState: buildNaryTreeState
        },

        // ===== 经典 =====
        {
            id: 'classic.sudoku',
            name: '数独求解', category: 'classic', level: 'P2',
            complexity: { time: 'O(9^(n²))', space: 'O(n²)' },
            keywords: ['sudoku', 'backtracking', 'constraint'],
            mnemonic: '找空试数查合法，递归失败即回溯',
            description: `<div class="desc-section"><h3>核心思想</h3><p>通过递归尝试所有可能，遇到不满足条件就回退，直到找到可行解。</p></div><div class="desc-section"><h3>推导过程</h3><p>每步选择一个候选填入当前位置，检查约束是否满足。满足则继续下一层；不满足则撤销该选择并试下一个候选。剪枝可大幅缩小搜索空间。</p></div><div class="desc-section"><h3>适用场景</h3><p>组合优化、约束满足、棋类游戏、调度排班。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 数独求解。② N 皇后。③ 旅行商问题。</p></div>`,
            code: sudokuCode,
            run: sudokuRun
        },
        {
            id: 'classic.producerConsumer',
            name: '生产者-消费者', category: 'classic', level: 'P2',
            complexity: { time: 'O(1)', space: 'O(n)' },
            keywords: ['producer', 'consumer', 'buffer', 'concurrent'],
            mnemonic: '生产放入消费取，满等空等同步协',
            description: `<div class="desc-section"><h3>核心思想</h3><p>生产者-消费者用队列解耦生产与消费速度不一致的问题。</p></div><div class="desc-section"><h3>推导过程</h3><p>生产者把数据放入缓冲区，消费者从缓冲区取出。缓冲区满时生产者等待，空时消费者等待。用锁或信号量保证互斥与同步。</p></div><div class="desc-section"><h3>适用场景</h3><p>异步处理、任务队列、日志收集、流式计算。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 消息队列 Kafka/RabbitMQ。② 线程池任务分发。③ 日志缓冲写入磁盘。</p></div>`,
            code: producerConsumerCode,
            run: producerConsumerRun
        },

        // ===== 进阶 =====
        {
            id: 'advanced.skipListFind',
            name: '跳表 - 查找', category: 'advanced', level: 'P3',
            complexity: { time: 'O(log n)', space: 'O(n)' },
            keywords: ['skip list', 'search', 'find', 'probabilistic'],
            mnemonic: '高层向右低层降，期对数步到目标',
            description: `<div class="desc-section"><h3>核心思想</h3><p>跳表是在有序链表上建立多层“快速通道”：底层保存全部元素，上层是下层的稀疏索引，查找时从顶层大步跳过无效区间。</p></div><div class="desc-section"><h3>推导过程</h3><p>假设你要在第 10 层楼找人。先在顶层（最稀疏）看目标应该在哪个区间，再下到下一层细化，直到底层精确定位。每层节点以 1/2 概率晋升，期望层数为 O(log n)，所以查找、插入、删除都是 O(log n)。</p></div><div class="desc-section"><h3>适用场景</h3><p>需要“有序 + 频繁增删查”的内存数据结构，且实现比平衡树简单。</p></div><div class="desc-section"><h3>典型案例</h3><p>① Redis 有序集合（zset）的近似实现。② LevelDB/RocksDB MemTable。③ 内存排行榜、区间查询索引。</p></div>`,
            code: skipListSearchCode,
            run: skipListSearchRun,
            buildState: buildSkipListState
        },
        {
            id: 'advanced.skipListInsert',
            name: '跳表 - 插入', category: 'advanced', level: 'P3',
            complexity: { time: 'O(log n)', space: 'O(n)' },
            keywords: ['skip list', 'insert', 'random level'],
            mnemonic: '查找记录各前驱，随机层数逐层插',
            description: `<div class="desc-section"><h3>核心思想</h3><p>跳表是在有序链表上建立多层“快速通道”：底层保存全部元素，上层是下层的稀疏索引，查找时从顶层大步跳过无效区间。</p></div><div class="desc-section"><h3>推导过程</h3><p>假设你要在第 10 层楼找人。先在顶层（最稀疏）看目标应该在哪个区间，再下到下一层细化，直到底层精确定位。每层节点以 1/2 概率晋升，期望层数为 O(log n)，所以查找、插入、删除都是 O(log n)。</p></div><div class="desc-section"><h3>适用场景</h3><p>需要“有序 + 频繁增删查”的内存数据结构，且实现比平衡树简单。</p></div><div class="desc-section"><h3>典型案例</h3><p>① Redis 有序集合（zset）的近似实现。② LevelDB/RocksDB MemTable。③ 内存排行榜、区间查询索引。</p></div>`,
            code: skipListInsertCode,
            run: skipListInsertRun,
            buildState: buildSkipListState
        },
        {
            id: 'advanced.skipListDelete',
            name: '跳表 - 删除', category: 'advanced', level: 'P3',
            complexity: { time: 'O(log n)', space: 'O(n)' },
            keywords: ['skip list', 'delete', 'remove'],
            mnemonic: '查找记录各前驱，逐层解链释放点',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>跳表是从上到下多层的有序链表。删除时先自顶向下查找，记录目标节点在每一层的前驱；再自底向上、在目标出现过的每一层把前驱的指针“跨过”目标节点，最后若最高层变空则降低 maxLevel。</p>
            </div>`
            + `<div class="desc-section"><h3>推导过程（小白版）</h3><p>跳表靠“多层索引”加速查找：越高层节点越稀疏，像书的目录。删除分三步：<br>① 查找：从最高层出发，向右走到“再走就会超过目标”的节点就下沉一层，直到最底层定位到目标节点，同时记下每一层停下的前驱。<br>② 解链：目标节点在哪些层出现，就在哪些层把它摘掉——前驱的 forward 直接指向目标的下一个节点，目标节点即被绕过。<br>③ 收尾：如果摘掉后最高层空了，就把 maxLevel 减 1；否则保留。平均时间复杂度 O(log n)。</p></div>`
            + `<div class="desc-section"><h3>适用场景</h3><p>内存中需要“有序 + 频繁增删查”的键值集合：如 LevelDB / RocksDB 的 MemTable、Redis 有序集合（zset）的底层近似、内存版排行榜、需要按分数区间取 Top-K 的场景。</p></div>`
            + `<div class="desc-section"><h3>典型案例</h3><p>① 排行榜：用分数当 key，删除某个玩家即 O(log n) 解链。<br>② 带过期时间的缓存索引：频繁增删而不想重建整棵树。<br>③ 范围查询：删除一段区间后结构仍保持多层有序。</p></div>`,
            code: skipListDeleteCode,
            run: skipListDeleteRun,
            buildState: buildSkipListState
        },
        {
            id: 'advanced.consistentHashAdd',
            name: '一致性哈希 - 节点加入', category: 'advanced', level: 'P3',
            complexity: { time: 'O(log n)', space: 'O(n)' },
            keywords: ['consistent hash', 'ring', 'add node', 'distributed'],
            mnemonic: '新点入环迁局部，仅受影响键移动',
            description: `<div class="desc-section"><h3>核心思想</h3><p>把节点和数据都映射到一个首尾相连的哈希环上，数据顺时针找最近的节点，节点增减只影响相邻数据。</p></div><div class="desc-section"><h3>推导过程</h3><p>普通哈希取模在节点数变化时会导致大量数据迁移。一致性哈希把 key 和 node 都 hash 到 0~2³²−1 的环上，key 的负责节点是顺时针第一个 node。加入虚拟节点后分布更均匀。</p></div><div class="desc-section"><h3>适用场景</h3><p>分布式缓存、分片数据库、负载均衡，需要动态扩缩容且减少数据迁移。</p></div><div class="desc-section"><h3>典型案例</h3><p>① Memcached 集群分片。② Redis Cluster 数据分布。③ CDN 节点调度。</p></div>`,
            code: consistentHashAddCode,
            run: consistentHashAddRun,
            buildState: buildHashRingState
        },
        {
            id: 'advanced.consistentHashRemove',
            name: '一致性哈希 - 节点移除', category: 'advanced', level: 'P3',
            complexity: { time: 'O(log n)', space: 'O(n)' },
            keywords: ['consistent hash', 'ring', 'remove node', 'distributed'],
            mnemonic: '节点移除键归后，余者不动影响小',
            description: `<div class="desc-section"><h3>核心思想</h3><p>把节点和数据都映射到一个首尾相连的哈希环上，数据顺时针找最近的节点，节点增减只影响相邻数据。</p></div><div class="desc-section"><h3>推导过程</h3><p>普通哈希取模在节点数变化时会导致大量数据迁移。一致性哈希把 key 和 node 都 hash 到 0~2³²−1 的环上，key 的负责节点是顺时针第一个 node。加入虚拟节点后分布更均匀。</p></div><div class="desc-section"><h3>适用场景</h3><p>分布式缓存、分片数据库、负载均衡，需要动态扩缩容且减少数据迁移。</p></div><div class="desc-section"><h3>典型案例</h3><p>① Memcached 集群分片。② Redis Cluster 数据分布。③ CDN 节点调度。</p></div>`,
            code: consistentHashRemoveCode,
            run: consistentHashRemoveRun,
            buildState: buildHashRingState
        },
        {
            id: 'advanced.consistentHashVNode',
            name: '一致性哈希 - 虚拟节点', category: 'advanced', level: 'P3',
            complexity: { time: 'O(log n)', space: 'O(n·v)' },
            keywords: ['consistent hash', 'virtual node', 'replica', 'balanced'],
            mnemonic: '一物多影散环上，负载均衡防倾斜',
            description: `<div class="desc-section"><h3>核心思想</h3><p>把节点和数据都映射到一个首尾相连的哈希环上，数据顺时针找最近的节点，节点增减只影响相邻数据。</p></div><div class="desc-section"><h3>推导过程</h3><p>普通哈希取模在节点数变化时会导致大量数据迁移。一致性哈希把 key 和 node 都 hash 到 0~2³²−1 的环上，key 的负责节点是顺时针第一个 node。加入虚拟节点后分布更均匀。</p></div><div class="desc-section"><h3>适用场景</h3><p>分布式缓存、分片数据库、负载均衡，需要动态扩缩容且减少数据迁移。</p></div><div class="desc-section"><h3>典型案例</h3><p>① Memcached 集群分片。② Redis Cluster 数据分布。③ CDN 节点调度。</p></div>`,
            code: consistentHashVNodeCode,
            run: consistentHashVNodeRun,
            buildState: buildHashRingState
        },
        {
            id: 'advanced.raftLeader',
            name: 'Raft - Leader 选举', category: 'advanced', level: 'P3',
            complexity: { time: 'O(n)', space: 'O(n)' },
            keywords: ['raft', 'leader election', 'consensus', 'distributed'],
            mnemonic: '超时变候选拉票，多数赞成即为主',
            description: `<div class="desc-section"><h3>核心思想</h3><p>Raft 通过“Leader 选举 + 日志复制 + 多数派提交”让多台机器状态一致。</p></div><div class="desc-section"><h3>推导过程</h3><p>所有写请求交给 Leader，Leader 先把日志发给多数 Follower，收到过半确认后再提交并返回客户端。Leader 失效时通过超时触发选举，任期号大的成为新 Leader。</p></div><div class="desc-section"><h3>适用场景</h3><p>分布式数据库、分布式配置中心、需要强一致性的多副本系统。</p></div><div class="desc-section"><h3>典型案例</h3><p>① etcd 配置存储。② TiKV/Raft 分布式 KV。③ Consul 服务发现。</p></div>`,
            code: raftLeaderCode,
            run: raftLeaderRun,
            buildState: buildGraphState
        },
        {
            id: 'advanced.raftLog',
            name: 'Raft - 日志复制', category: 'advanced', level: 'P3',
            complexity: { time: 'O(n·L)', space: 'O(n·L)' },
            keywords: ['raft', 'log replication', 'append entries', 'consensus'],
            mnemonic: 'Leader发日志复制，多数成功方提交',
            description: `<div class="desc-section"><h3>核心思想</h3><p>Raft 通过“Leader 选举 + 日志复制 + 多数派提交”让多台机器状态一致。</p></div><div class="desc-section"><h3>推导过程</h3><p>所有写请求交给 Leader，Leader 先把日志发给多数 Follower，收到过半确认后再提交并返回客户端。Leader 失效时通过超时触发选举，任期号大的成为新 Leader。</p></div><div class="desc-section"><h3>适用场景</h3><p>分布式数据库、分布式配置中心、需要强一致性的多副本系统。</p></div><div class="desc-section"><h3>典型案例</h3><p>① etcd 配置存储。② TiKV/Raft 分布式 KV。③ Consul 服务发现。</p></div>`,
            code: raftLogCode,
            run: raftLogRun,
            buildState: buildGraphState
        }
    ];

    algos.forEach(a => AlgorithmLoader.register(a.id, a));
})();
