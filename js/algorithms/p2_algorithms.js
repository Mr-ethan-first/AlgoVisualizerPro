/**
 * P2 算法集合 - 进阶算法
 *
 * 包含：
 *   - 排序：三路快速排序、桶排序
 *   - 线性：双端队列
 *   - 树：后序遍历（非递归）、线段树（单点更新+区间查询）、树状数组（BIT）
 *   - 图：Floyd-Warshall 多源最短路径
 *   - 字符串：Rabin-Karp
 *   - 经典：骑士巡游（回溯）
 */
(function () {
    'use strict';

    const NUM_DATA = (s) => s.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n));
    const DEFAULT_ARR = [5, 3, 8, 1, 2, 7, 4, 6];

    // ====================================================================
    // 排序 P2
    // ====================================================================

    // ===== 三路快速排序（Dijkstra 三路划分） =====
    const quick3WayCode = `function quickSort3Way(arr, lo, hi) {
  if (lo >= hi) return;
  const pivot = arr[lo];
  let lt = lo, gt = hi, i = lo + 1;
  while (i <= gt) {
    if (arr[i] < pivot) { swap(arr, lt++, i++); }
    else if (arr[i] > pivot) { swap(arr, i, gt--); }
    else i++;
  }
  quickSort3Way(arr, lo, lt - 1);
  quickSort3Way(arr, gt + 1, hi);
}`;
    function quick3WayRun(ctx, data) {
        const arr = ctx.add(new ArrayTracer('arr', data.slice()));
        const stack = ctx.add(new StackTracer('递归栈'));
        const log = ctx.add(new LogTracer('log'));
        const n = data.length;

        function swap(i, j) {
            if (i === j) return;
            arr.swap(i, j);
        }

        function sort(lo, hi, depth) {
            // 栈操作辅助动画：进入递归帧压入当前待处理子区间 [lo,hi]，退出时弹出，
            // 直观展示三路快排的隐式调用栈（分治子问题边界）。
            stack.push(`[${lo},${hi}]`);
            ctx.line(1);
            if (lo >= hi) {
                if (lo === hi && lo >= 0 && lo < n) arr.markSorted(lo);
                stack.pop();
                return;
            }
            ctx.line(2);
            const pivot = arr.items[lo].value;
            arr.highlight(lo, 'pivot', `pivot = ${pivot}`);
            log.printInfo(`[深度${depth}] 区间 [${lo}..${hi}]，pivot = ${pivot}`);
            let lt = lo, gt = hi, i = lo + 1;
            ctx.line(3);
            while (i <= gt) {
                ctx.line(4);
                arr.setPointers([
                    { index: lt, label: 'lt', color: '#3fb950' },
                    { index: i, label: 'i', color: '#58a6ff' },
                    { index: gt, label: 'gt', color: '#d29922' }
                ]);
                // 注意：必须与循环前保存的 pivot 值比较，不能比较 arr[lo]——
                // 首次 <pivot 交换会把 pivot 值从 arr[lo] 换走，基准漂移导致划分错误
                const iv = arr.items[i].value;
                arr.items[i].state = 'compare';
                arr._commit({
                    type: 'compare',
                    payload: { indices: [i], pivot },
                    description: `比较 arr[${i}]=${iv} 与 pivot=${pivot}`
                });
                if (iv < pivot) {
                    ctx.line(5);
                    arr.items[i].state = 'default';
                    swap(lt++, i++);
                } else if (iv > pivot) {
                    ctx.line(6);
                    arr.items[i].state = 'default';
                    swap(i, gt--);
                } else {
                    ctx.line(7);
                    arr.highlight(i, 'visited', `= pivot`);
                    i++;
                }
            }
            // 标记等于 pivot 的区间 [lt, gt] 已就位
            for (let k = lt; k <= gt; k++) arr.markSorted(k);
            arr.highlight(lo, 'default');
            log.printSuccess(`pivot=${pivot} 区间 [${lt}..${gt}] 已就位`);
            ctx.line(9);
            sort(lo, lt - 1, depth + 1);
            ctx.line(10);
            sort(gt + 1, hi, depth + 1);
            stack.pop();
        }
        sort(0, n - 1, 0);
        arr.done();
        log.printSuccess('三路快排完成');
    }

    // ===== 桶排序 =====
    const bucketSortCode = `function bucketSort(arr, bucketSize) {
  const max = Math.max(...arr);
  const min = Math.min(...arr);
  const bucketCount = Math.floor((max - min) / bucketSize) + 1;
  const buckets = Array.from({length: bucketCount}, () => []);
  for (const x of arr) buckets[Math.floor((x - min) / bucketSize)].push(x);
  let idx = 0;
  for (const b of buckets) {
    b.sort((a, b) => a - b);
    for (const x of b) arr[idx++] = x;
  }
}`;
    function bucketSortRun(ctx, data) {
        const arr = ctx.add(new ArrayTracer('arr', data.slice()));
        const log = ctx.add(new LogTracer('log'));
        const n = data.length;
        const max = Math.max(...data);
        const min = Math.min(...data);
        const bucketSize = Math.max(1, Math.ceil((max - min) / 4));
        const bucketCount = Math.floor((max - min) / bucketSize) + 1;
        ctx.line(3);
        log.printInfo(`范围 [${min}..${max}]，bucketSize=${bucketSize}，桶数=${bucketCount}`);

        // 用 DP 表展示桶
        const dp = ctx.add(new DPTableTracer('buckets', bucketCount, Math.max(2, n)));
        dp.rowLabels = Array.from({ length: bucketCount }, (_, i) =>
            `[${min + i * bucketSize},${min + (i + 1) * bucketSize - 1}]`
        );
        const buckets = Array.from({ length: bucketCount }, () => []);
        for (let r = 0; r < bucketCount; r++)
            for (let c = 0; c < dp.cols; c++) dp.cells[r][c] = { value: '', state: 'default' };
        dp._commit({ type: 'init', payload: {}, description: '初始化空桶' });

        ctx.line(4);
        for (const x of data) {
            ctx.line(5);
            const bIdx = Math.floor((x - min) / bucketSize);
            buckets[bIdx].push(x);
            const cIdx = buckets[bIdx].length - 1;
            dp.cells[bIdx][cIdx] = { value: x, state: 'current' };
            arr.highlight(arr.items.findIndex(it => it.value === x && it.state !== 'visited'), 'visited');
            dp._commit({
                type: 'visit',
                payload: { row: bIdx, col: cIdx },
                description: `${x} 入桶 ${bIdx}`
            });
            dp.cells[bIdx][cIdx].state = 'default';
        }
        arr.items.forEach(it => it.state = 'default');

        let idx = 0;
        ctx.line(6);
        for (let b = 0; b < bucketCount; b++) {
            ctx.line(7);
            buckets[b].sort((a, b) => a - b);
            log.printInfo(`桶 ${b} 内排序: [${buckets[b].join(', ')}]`);
            for (let c = 0; c < dp.cols; c++) {
                if (dp.cells[b][c].value !== '') dp.cells[b][c].state = 'sorted';
            }
            dp._commit({ type: 'mark', payload: { row: b }, description: `桶 ${b} 排序完成` });
            ctx.line(8);
            for (const x of buckets[b]) {
                arr.items[idx] = { value: x, state: 'current' };
                arr._commit({
                    type: 'set',
                    payload: { index: idx, value: x },
                    description: `arr[${idx}] = ${x}（回填）`
                });
                arr.items[idx].state = 'sorted';
                idx++;
            }
        }
        arr.done();
        log.printSuccess('桶排序完成');
    }

    // ====================================================================
    // 线性结构 P2
    // ====================================================================

    // ===== 双端队列 =====
    const dequeCode = `class Deque {
  constructor() { this.data = []; }
  pushFront(x) { this.data.unshift(x); }
  pushBack(x) { this.data.push(x); }
  popFront() { return this.data.shift(); }
  popBack() { return this.data.pop(); }
  front() { return this.data[0]; }
  back() { return this.data[this.data.length - 1]; }
}`;
    function dequeRun(ctx) {
        const arr = ctx.add(new ArrayTracer('array', ['', '', '', '', '', '']));
        const log = ctx.add(new LogTracer('log'));
        const data = [];
        arr.items.forEach(it => it.value = '_');
        arr._commit({ type: 'init', payload: {}, description: '初始化空双端队列' });
        log.printInfo('双端队列演示');

        function refreshPointers() {
            const ptrs = [];
            if (data.length > 0) {
                ptrs.push({ index: 0, label: 'front', color: '#58a6ff' });
                ptrs.push({ index: data.length - 1, label: 'back', color: '#bc8cff' });
            }
            arr.setPointers(ptrs);
        }
        function syncArray() {
            for (let i = 0; i < arr.items.length; i++) {
                arr.items[i] = { value: i < data.length ? data[i] : '_', state: 'default' };
            }
        }
        function pushFront(x) {
            ctx.line(3);
            data.unshift(x);
            syncArray();
            arr.items[0].state = 'current';
            arr._commit({
                type: 'set',
                payload: { op: 'pushFront', value: x },
                description: `pushFront(${x}) → ${data.join(', ')}`
            });
            arr.items[0].state = 'default';
            refreshPointers();
        }
        function pushBack(x) {
            ctx.line(4);
            data.push(x);
            syncArray();
            arr.items[data.length - 1].state = 'current';
            arr._commit({
                type: 'set',
                payload: { op: 'pushBack', value: x },
                description: `pushBack(${x}) → ${data.join(', ')}`
            });
            arr.items[data.length - 1].state = 'default';
            refreshPointers();
        }
        function popFront() {
            ctx.line(5);
            const x = data.shift();
            log.printInfo(`popFront() → ${x}`);
            syncArray();
            arr.items[0].state = 'visited';
            arr._commit({
                type: 'set',
                payload: { op: 'popFront', value: x },
                description: `popFront() → ${x}，剩余: ${data.join(', ')}`
            });
            syncArray();
            refreshPointers();
        }
        function popBack() {
            ctx.line(6);
            const x = data.pop();
            log.printInfo(`popBack() → ${x}`);
            syncArray();
            if (data.length > 0) arr.items[data.length - 1].state = 'visited';
            arr._commit({
                type: 'set',
                payload: { op: 'popBack', value: x },
                description: `popBack() → ${x}，剩余: ${data.join(', ')}`
            });
            syncArray();
            refreshPointers();
        }
        pushBack(10); pushBack(20); pushFront(5); pushBack(30);
        popFront(); popBack(); pushFront(99);
        log.printSuccess('双端队列演示完成');
    }

    // ====================================================================
    // 树结构 P2
    // ====================================================================

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
    // 树状态构建器：统一使用公共实现（js/core/stateBuilders.js）
    const buildBinaryTreeState = StateBuilders.buildBinaryTreeState;

    // ===== 后序遍历（非递归，单栈法） =====
    const postorderIterCode = `function postorder(root) {
  const stack = [];
  let prev = null;
  let cur = root;
  while (cur || stack.length > 0) {
    while (cur) {
      stack.push(cur);
      cur = cur.left;
    }
    cur = stack[stack.length - 1];
    if (cur.right && cur.right !== prev) {
      cur = cur.right;
    } else {
      visit(cur);
      prev = stack.pop();
      cur = null;
    }
  }
}`;

    // ===== 后序遍历（非递归，双栈法） =====
    const postorderTwoStackCode = `function postorderTwo(root) {
  const s1 = [root], s2 = [];
  while (s1.length > 0) {
    const node = s1.pop();
    s2.push(node);          // s1 弹出即压入 s2
    if (node.left) s1.push(node.left);   // 左子先入 s1
    if (node.right) s1.push(node.right); // 右子后入 s1（先弹出）
  }
  while (s2.length > 0) {
    visit(s2.pop());        // s2 弹出 = 左→右→根
  }
}`;
    function postorderTwoStackRun(ctx) {
        const nodes = buildSampleTree();
        const tree = ctx.add(new TreeTracer('tree', nodes));
        const st1 = ctx.add(new StackTracer('s1（遍历栈）'));
        const st2 = ctx.add(new StackTracer('s2（结果栈）'));
        const log = ctx.add(new LogTracer('log'));
        const visited = [];
        ctx.line(2);
        const stk1 = [tree.root];
        const stk2 = [];
        st1.push(tree.nodes[tree.root].value);
        tree.highlight(tree.root, 'instack', `根节点 ${tree.nodes[tree.root].value} 入 s1`);
        log.printInfo(`后序 = 反转「根→右→左」：s1 遍历，s2 反转输出`);
        ctx.line(3);
        while (stk1.length > 0) {
            ctx.line(4);
            const idx = stk1.pop();
            st1.pop();
            ctx.line(5);
            stk2.push(idx);
            st2.push(tree.nodes[idx].value);
            tree.highlight(idx, 'instack', `${tree.nodes[idx].value} 从 s1 弹出，压入 s2`);
            ctx.line(6);
            if (tree.nodes[idx].left !== null && tree.nodes[idx].left !== undefined) {
                stk1.push(tree.nodes[idx].left);
                st1.push(tree.nodes[tree.nodes[idx].left].value);
                tree.highlight(tree.nodes[idx].left, 'instack', `左子 ${tree.nodes[tree.nodes[idx].left].value} 入 s1`);
            }
            ctx.line(7);
            if (tree.nodes[idx].right !== null && tree.nodes[idx].right !== undefined) {
                stk1.push(tree.nodes[idx].right);
                st1.push(tree.nodes[tree.nodes[idx].right].value);
                tree.highlight(tree.nodes[idx].right, 'instack', `右子 ${tree.nodes[tree.nodes[idx].right].value} 入 s1（先于左子弹出）`);
            }
        }
        ctx.line(9);
        while (stk2.length > 0) {
            ctx.line(10);
            const idx = stk2.pop();
            st2.pop();
            tree.visit(idx);
            visited.push(tree.nodes[idx].value);
            log.printInfo(`s2 弹出 → 访问 ${tree.nodes[idx].value}；序列: [${visited.join(', ')}]`);
        }
        log.printSuccess(`后序遍历（双栈法）完成: [${visited.join(', ')}]`);
    }
    function postorderIterRun(ctx) {
        const nodes = buildSampleTree();
        const tree = ctx.add(new TreeTracer('tree', nodes));
        const stack = ctx.add(new StackTracer('stack'));
        const log = ctx.add(new LogTracer('log'));
        const visited = [];
        const stk = [];
        let prev = -1;
        let cur = tree.root;
        ctx.line(3);
        while (cur !== null && cur !== undefined || stk.length > 0) {
            ctx.line(4);
            while (cur !== null && cur !== undefined) {
                ctx.line(5);
                stk.push(cur);
                stack.push(tree.nodes[cur].value);
                tree.highlight(cur, 'instack', `${tree.nodes[cur].value} 入栈，继续下钻左子树`);
                cur = tree.nodes[cur].left;
            }
            ctx.line(8);
            cur = stk[stk.length - 1];
            tree.highlight(cur, 'instack', `栈顶 ${tree.nodes[cur].value}（仍在栈中，检查右子树）`);
            const right = tree.nodes[cur].right;
            ctx.line(9);
            if (right !== null && right !== undefined && right !== prev) {
                ctx.line(10);
                cur = right;
            } else {
                ctx.line(12);
                tree.visit(cur);
                visited.push(tree.nodes[cur].value);
                log.printInfo(`访问 ${tree.nodes[cur].value} → 序列: [${visited.join(', ')}]`);
                prev = stk.pop();
                stack.pop();
                cur = null; // null marker，等待外层取栈顶
                ctx.line(13);
            }
        }
        log.printSuccess(`后序遍历（非递归）完成: [${visited.join(', ')}]`);
    }

    // ===== 线段树（单点更新 + 区间查询） =====
    const segmentTreeCode = `function build(node, lo, hi) {
  if (lo === hi) { tree[node] = arr[lo]; return; }
  const mid = (lo + hi) >> 1;
  build(node*2, lo, mid);
  build(node*2+1, mid+1, hi);
  tree[node] = tree[node*2] + tree[node*2+1];
}
function update(node, lo, hi, idx, val) {
  if (lo === hi) { tree[node] = val; return; }
  const mid = (lo + hi) >> 1;
  if (idx <= mid) update(node*2, lo, mid, idx, val);
  else update(node*2+1, mid+1, hi, idx, val);
  tree[node] = tree[node*2] + tree[node*2+1];
}
function query(node, lo, hi, L, R) {
  if (R < lo || hi < L) return 0;
  if (L <= lo && hi <= R) return tree[node];
  const mid = (lo + hi) >> 1;
  return query(node*2, lo, mid, L, R) + query(node*2+1, mid+1, hi, L, R);
}`;
    function segmentTreeRun(ctx, data) {
        const arr = (data && data.length >= 2) ? data.slice() : [1, 3, 5, 7, 9, 11];
        const n = arr.length;
        const arrTracer = ctx.add(new ArrayTracer('arr', arr.slice()));
        const log = ctx.add(new LogTracer('log'));
        // 用一维数组表示线段树，下标从 1 开始
        const treeArr = new Array(4 * n).fill(0);
        const tree = ctx.add(new ArrayTracer('tree', treeArr.slice()));
        log.printInfo(`原数组: [${arr.join(', ')}]`);

        function build(node, lo, hi) {
            ctx.line(1);
            if (lo === hi) {
                ctx.line(2);
                treeArr[node] = arr[lo];
                tree.items[node] = { value: arr[lo], state: 'current' };
                arrTracer.highlight(lo, 'visited', `叶子 tree[${node}]=${arr[lo]}`);
                tree._commit({
                    type: 'set',
                    payload: { node, lo, hi },
                    description: `叶子 tree[${node}] = arr[${lo}] = ${arr[lo]}`
                });
                tree.items[node].state = 'default';
                return;
            }
            ctx.line(3);
            const mid = (lo + hi) >> 1;
            ctx.line(4);
            build(node * 2, lo, mid);
            ctx.line(5);
            build(node * 2 + 1, mid + 1, hi);
            ctx.line(6);
            treeArr[node] = treeArr[node * 2] + treeArr[node * 2 + 1];
            tree.items[node] = { value: treeArr[node], state: 'current' };
            tree._commit({
                type: 'set',
                payload: { node, lo, hi },
                description: `tree[${node}] = tree[${node * 2}] + tree[${node * 2 + 1}] = ${treeArr[node]} (区间 [${lo}..${hi}])`
            });
            tree.items[node].state = 'default';
        }
        ctx.line(2);
        build(1, 0, n - 1);
        log.printSuccess(`线段树构建完成`);

        // 演示一次更新：把 arr[2] 改成 10
        const updIdx = 2, updVal = 10;
        ctx.line(7);
        log.printInfo(`更新 arr[${updIdx}] = ${updVal}`);
        arr[updIdx] = updVal;
        arrTracer.items[updIdx] = { value: updVal, state: 'current' };
        arrTracer._commit({
            type: 'set',
            payload: { index: updIdx, value: updVal },
            description: `arr[${updIdx}] = ${updVal}`
        });
        arrTracer.items[updIdx].state = 'default';

        function update(node, lo, hi, idx, val) {
            ctx.line(8);
            tree.items[node].state = 'current';
            if (lo === hi) {
                ctx.line(9);
                treeArr[node] = val;
                tree.items[node] = { value: val, state: 'sorted' };
                tree._commit({
                    type: 'set',
                    payload: { node, idx, val },
                    description: `更新叶子 tree[${node}] = ${val}`
                });
                tree.items[node].state = 'default';
                return;
            }
            ctx.line(10);
            const mid = (lo + hi) >> 1;
            ctx.line(11);
            if (idx <= mid) update(node * 2, lo, mid, idx, val);
            else update(node * 2 + 1, mid + 1, hi, idx, val);
            ctx.line(12);
            treeArr[node] = treeArr[node * 2] + treeArr[node * 2 + 1];
            tree.items[node] = { value: treeArr[node], state: 'current' };
            tree._commit({
                type: 'set',
                payload: { node, idx, val },
                description: `回溯更新 tree[${node}] = ${treeArr[node]}`
            });
            tree.items[node].state = 'default';
        }
        update(1, 0, n - 1, updIdx, updVal);

        // 演示一次区间查询
        const L = 1, R = 3;
        ctx.line(13);
        log.printInfo(`查询区间 [${L}..${R}] 的和`);
        function query(node, lo, hi, ql, qr) {
            ctx.line(14);
            if (qr < lo || hi < ql) {
                ctx.line(15);
                return 0;
            }
            if (ql <= lo && hi <= qr) {
                ctx.line(16);
                tree.items[node].state = 'sorted';
                arrTracer.highlightRange(lo, hi, '#3fb950');
                tree._commit({
                    type: 'highlight',
                    payload: { node, lo, hi },
                    description: `完全覆盖: tree[${node}] = ${treeArr[node]} (区间 [${lo}..${hi}])`
                });
                tree.items[node].state = 'default';
                return treeArr[node];
            }
            ctx.line(17);
            const mid = (lo + hi) >> 1;
            const s = query(node * 2, lo, mid, ql, qr) + query(node * 2 + 1, mid + 1, hi, ql, qr);
            return s;
        }
        const sum = query(1, 0, n - 1, L, R);
        log.printSuccess(`区间 [${L}..${R}] 的和 = ${sum}`);
    }

    // ===== 树状数组（BIT / Fenwick Tree） =====
    const bitCode = `function lowbit(x) { return x & -x; }
function update(bit, i, delta) {
  while (i < bit.length) {
    bit[i] += delta;
    i += lowbit(i);
  }
}
function query(bit, i) {
  let sum = 0;
  while (i > 0) {
    sum += bit[i];
    i -= lowbit(i);
  }
  return sum;
}`;
    function bitRun(ctx, data) {
        const arr = (data && data.length >= 4) ? data.slice() : [1, 3, 5, 7, 9, 11];
        const n = arr.length;
        const arrTracer = ctx.add(new ArrayTracer('arr', arr.slice()));
        const log = ctx.add(new LogTracer('log'));
        const bitArr = new Array(n + 1).fill(0);
        const bit = ctx.add(new ArrayTracer('bit', bitArr.slice()));
        log.printInfo(`原数组: [${arr.join(', ')}]（BIT 下标从 1 开始）`);

        function lowbit(x) { return x & -x; }

        ctx.line(2);
        for (let i = 0; i < n; i++) {
            ctx.line(3);
            const delta = arr[i];
            let idx = i + 1;
            arrTracer.highlight(i, 'current', `arr[${i}] = ${delta}`);
            while (idx < bitArr.length) {
                ctx.line(4);
                bitArr[idx] += delta;
                bit.items[idx] = { value: bitArr[idx], state: 'current' };
                bit._commit({
                    type: 'set',
                    payload: { idx, delta },
                    description: `bit[${idx}] += ${delta} → ${bitArr[idx]}`
                });
                bit.items[idx].state = 'default';
                idx += lowbit(idx);
            }
            arrTracer.items[i].state = 'default';
        }
        log.printSuccess('树状数组构建完成');

        // 前缀查询演示
        const qIdx = 4;
        ctx.line(7);
        log.printInfo(`查询前缀和 prefixSum(${qIdx})`);
        let sum = 0, idx = qIdx;
        while (idx > 0) {
            ctx.line(8);
            bit.items[idx].state = 'visited';
            sum += bitArr[idx];
            bit._commit({
                type: 'highlight',
                payload: { idx, sum },
                description: `bit[${idx}] = ${bitArr[idx]}，累加 → sum = ${sum}`
            });
            bit.items[idx].state = 'default';
            idx -= lowbit(idx);
        }
        log.printSuccess(`prefixSum(${qIdx}) = ${sum}`);
    }

    // ====================================================================
    // 图算法 P2
    // ====================================================================

    // ===== Floyd-Warshall 多源最短路径 =====
    const floydCode = `function floyd(dist, n) {
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
        }
      }
    }
  }
}`;
    function floydRun(ctx) {
        const N = 4;
        const INF = 99999;
        const labels = ['A', 'B', 'C', 'D'];
        const dist = [
            [0, 5, INF, 10],
            [INF, 0, 3, INF],
            [INF, INF, 0, 1],
            [INF, INF, INF, 0]
        ];
        const dp = ctx.add(new DPTableTracer('dist', N, N));
        dp.rowLabels = labels.slice();
        dp.colLabels = labels.slice();
        const log = ctx.add(new LogTracer('log'));
        log.printInfo(`初始邻接矩阵（INF = 不可达）`);
        for (let i = 0; i < N; i++)
            for (let j = 0; j < N; j++)
                dp.cells[i][j] = { value: dist[i][j] === INF ? '∞' : dist[i][j], state: 'default' };
        dp._commit({ type: 'init', payload: {}, description: '初始化邻接矩阵' });

        ctx.line(2);
        for (let k = 0; k < N; k++) {
            ctx.line(3);
            log.printInfo(`以 ${labels[k]} 为中转`);
            // 高亮 k 行 k 列
            for (let i = 0; i < N; i++) dp.cells[i][k].state = 'visited';
            for (let j = 0; j < N; j++) dp.cells[k][j].state = 'visited';
            dp._commit({ type: 'highlight', payload: { k }, description: `中转节点 ${labels[k]}` });
            for (let i = 0; i < N; i++) {
                for (let j = 0; j < N; j++) dp.cells[i][j].state = 'default';
            }
            for (let i = 0; i < N; i++) {
                ctx.line(4);
                for (let j = 0; j < N; j++) {
                    ctx.line(5);
                    if (dist[i][k] !== INF && dist[k][j] !== INF) {
                        dp.cells[i][k].state = 'compare';
                        dp.cells[k][j].state = 'compare';
                        dp.cells[i][j].state = 'current';
                        if (dist[i][k] + dist[k][j] < dist[i][j]) {
                            ctx.line(6);
                            dist[i][j] = dist[i][k] + dist[k][j];
                            dp.cells[i][j] = { value: dist[i][j], state: 'sorted' };
                            dp._commit({
                                type: 'set',
                                payload: { i, j, k },
                                description: `dist[${labels[i]}][${labels[j]}] = dist[${labels[i]}][${labels[k]}] + dist[${labels[k]}][${labels[j]}] = ${dist[i][j]}`
                            });
                            log.printSuccess(`松弛 ${labels[i]} → ${labels[j]} = ${dist[i][j]}（经 ${labels[k]}）`);
                        } else {
                            dp._commit({
                                type: 'visit',
                                payload: { i, j, k },
                                description: `dist[${labels[i]}][${labels[j]}] 保持 ${dist[i][j]}`
                            });
                        }
                        dp.cells[i][k].state = 'default';
                        dp.cells[k][j].state = 'default';
                        dp.cells[i][j].state = 'default';
                    }
                }
            }
        }
        log.printSuccess('Floyd-Warshall 完成，得到所有点对最短路径');
    }

    // ====================================================================
    // 字符串 P2
    // ====================================================================

    // ===== Rabin-Karp 字符串匹配 =====
    const rabinKarpCode = `function rabinKarp(text, pattern) {
  const n = text.length, m = pattern.length;
  const base = 256, mod = 101;
  let pHash = 0, tHash = 0, h = 1;
  for (let i = 0; i < m - 1; i++) h = (h * base) % mod;
  for (let i = 0; i < m; i++) {
    pHash = (pHash * base + pattern.charCodeAt(i)) % mod;
    tHash = (tHash * base + text.charCodeAt(i)) % mod;
  }
  for (let i = 0; i <= n - m; i++) {
    if (pHash === tHash) {
      let match = true;
      for (let j = 0; j < m; j++) {
        if (text[i + j] !== pattern[j]) { match = false; break; }
      }
      if (match) return i;
    }
    if (i < n - m) {
      tHash = ((tHash - text.charCodeAt(i) * h) * base + text.charCodeAt(i + m)) % mod;
      if (tHash < 0) tHash += mod;
    }
  }
  return -1;
}`;
    function rabinKarpRun(ctx) {
        const text = 'ABABDABACDABABCABAB';
        const pattern = 'ABABCABAB';
        const n = text.length, m = pattern.length;
        const textArr = ctx.add(new ArrayTracer('text', text.split('')));
        const pattArr = ctx.add(new ArrayTracer('pattern', pattern.split('')));
        const log = ctx.add(new LogTracer('log'));
        log.printInfo(`text="${text}"，pattern="${pattern}"`);

        const base = 256, mod = 101;
        let pHash = 0, tHash = 0, h = 1;
        ctx.line(4);
        for (let i = 0; i < m - 1; i++) h = (h * base) % mod;
        ctx.line(5);
        for (let i = 0; i < m; i++) {
            pHash = (pHash * base + pattern.charCodeAt(i)) % mod;
            tHash = (tHash * base + text.charCodeAt(i)) % mod;
        }
        log.printInfo(`pHash = ${pHash}, tHash = ${tHash}`);

        ctx.line(6);
        for (let i = 0; i <= n - m; i++) {
            ctx.line(7);
            textArr.setPointers([{ index: i, label: 'i', color: '#58a6ff' }]);
            if (pHash === tHash) {
                ctx.line(8);
                log.printSuccess(`哈希匹配于 i=${i}，开始逐字符比对`);
                let match = true;
                for (let j = 0; j < m; j++) {
                    ctx.line(10);
                    pattArr.highlight(j, 'current');
                    textArr.highlight(i + j, 'compare');
                    if (text[i + j] !== pattern[j]) {
                        ctx.line(11);
                        match = false;
                        log.printWarning(`字符不匹配: text[${i + j}]=${text[i + j]} ≠ pattern[${j}]=${pattern[j]}`);
                        pattArr.highlight(j, 'default');
                        textArr.highlight(i + j, 'default');
                        break;
                    }
                    pattArr.highlight(j, 'visited');
                    textArr.highlight(i + j, 'visited');
                }
                if (match) {
                    ctx.line(13);
                    for (let j = 0; j < m; j++) {
                        textArr.items[i + j].state = 'sorted';
                        pattArr.items[j].state = 'sorted';
                    }
                    textArr._commit({
                        type: 'mark',
                        payload: { i, m },
                        description: `找到匹配于位置 ${i}`
                    });
                    log.printSuccess(`找到匹配，位置 = ${i}`);
                    return;
                }
            } else {
                log.printInfo(`i=${i} 哈希不匹配 (pHash=${pHash}, tHash=${tHash})`);
            }
            if (i < n - m) {
                ctx.line(15);
                tHash = ((tHash - text.charCodeAt(i) * h) * base + text.charCodeAt(i + m)) % mod;
                if (tHash < 0) tHash += mod;
                log.printInfo(`滑动窗口，新 tHash = ${tHash}`);
            }
        }
        log.printError('未找到匹配');
    }
    function buildStringMatchState(tracerStates, _step, ctxInfo) {
        const textSnap = tracerStates.text;
        const pattSnap = tracerStates.pattern;
        if (!textSnap) return null;
        const state = { shapes: [] };
        const renderer = (typeof window !== 'undefined' && window.app && window.app.renderer) || null;
        const tk = (renderer && typeof renderer._tokens === 'function') ? renderer._tokens() : {
            cell: '#21262d', cellBorder: '#1c2128', dim: '#8b949e', radiusSmall: [4, 4, 4, 4]
        };
        let cellW = 28, cellH = 32, gap = 2;
        const startY = 70, rowGap = 60;
        const labels = ['text', 'pattern'];
        // 宽度自适应：文本较长时压缩方块，保证尾部字符不被裁出画布（动画元素不允许展示不全）
        const canvasW = (ctxInfo && ctxInfo.width) || (window.app?.renderer?.width || 800);
        const maxLen = Math.max(textSnap.items.length, pattSnap ? pattSnap.items.length : 0, 0);
        if (canvasW > 0 && maxLen > 1 && maxLen * (cellW + gap) - gap > canvasW - 80) {
            gap = 2;
            cellW = Math.max(8, Math.floor((canvasW - 80 + gap) / maxLen) - gap);
        }
        [textSnap, pattSnap].forEach((snap, idx) => {
            if (!snap) return;
            const y = startY + idx * rowGap;
            const total = snap.items.length * (cellW + gap) - gap;
            const cw = canvasW;
            const x0 = Math.max(40, (cw - total) / 2);
            snap.items.forEach((it, i) => {
                const st = it.state || 'default';
                const colorMap = {
                    default: tk.cell, current: '#bc8cff', compare: '#f78166',
                    visited: '#58a6ff', sorted: '#3fb950'
                };
                state.shapes.push({
                    kind: 'rect',
                    x: x0 + i * (cellW + gap), y, w: cellW, h: cellH,
                    color: colorMap[st] || tk.cell, radius: tk.radiusSmall,
                    label: String(it.value ?? ''),
                    opts: { stroke: tk.cellBorder, strokeWidth: 1, fontSize: 14 }
                });
            });
            state.shapes.push({
                kind: 'text',
                x: x0 - 8, y: y + cellH / 2,
                text: labels[idx], color: tk.dim, fontSize: 11, align: 'right', opts: { bold: true }
            });
            if (snap.pointers && snap.pointers.length) {
                snap.pointers.forEach(p => {
                    if (p.index < snap.items.length) {
                        state.shapes.push({
                            kind: 'text',
                            x: x0 + p.index * (cellW + gap) + cellW / 2, y: y - 8,
                            text: p.label || '↓', color: p.color || '#d29922',
                            fontSize: 12, align: 'center', opts: { bold: true }
                        });
                    }
                });
            }
        });
        return state;
    }

    // ====================================================================
    // 经典 P2
    // ====================================================================

    // ===== 骑士巡游（回溯） =====
    const knightTourCode = `function solveKnightTour(board, n, r, c, step) {
  if (step === n * n) return true;
  const moves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr, dc] of moves) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < n && nc >= 0 && nc < n && board[nr][nc] === 0) {
      board[nr][nc] = step + 1;
      if (solveKnightTour(board, n, nr, nc, step + 1)) return true;
      board[nr][nc] = 0; // 回溯
    }
  }
  return false;
}`;
    function knightTourRun(ctx, data) {
        const N = (data && data[0]) || 5;
        const size = Math.min(6, Math.max(4, N));
        const board = ctx.add(new ChessBoardTracer('board', size));
        const log = ctx.add(new LogTracer('log'));
        const b = Array.from({ length: size }, () => new Array(size).fill(0));
        log.printInfo(`骑士巡游 ${size}×${size}，从 (0,0) 出发`);

        const moves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        b[0][0] = 1;
        board.place(0, 0, 1, `起点 (0,0) = 1`);
        let stepCount = 0;

        function solve(r, c, step) {
            ctx.line(1);
            if (step === size * size) {
                ctx.line(2);
                log.printSuccess(`完成骑士巡游！共 ${step} 步`);
                return true;
            }
            ctx.line(3);
            for (const [dr, dc] of moves) {
                ctx.line(4);
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && b[nr][nc] === 0) {
                    ctx.line(5);
                    b[nr][nc] = step + 1;
                    board.place(nr, nc, step + 1, `第 ${step + 1} 步: → (${nr},${nc})`);
                    stepCount++;
                    if (stepCount % 8 === 0) log.printInfo(`已尝试 ${stepCount} 步`);
                    if (solve(nr, nc, step + 1)) {
                        return true;
                    }
                    ctx.line(7);
                    b[nr][nc] = 0;
                    board.remove(nr, nc, `回溯: 撤销 (${nr},${nc})`);
                }
            }
            ctx.line(9);
            return false;
        }
        const ok = solve(0, 0, 1);
        if (ok) {
            // 标记完整路径
            for (let r = 0; r < size; r++)
                for (let c = 0; c < size; c++)
                    board.board[r][c] = { value: b[r][c], state: 'sorted' };
            board._commit({ type: 'mark', payload: {}, description: '完整骑士巡游路径' });
            log.printSuccess('骑士巡游成功');
        } else {
            log.printError('未找到解');
        }
    }

    // ====================================================================
    // 注册
    // ====================================================================
    const algos = [
        {
            id: 'sorting.quick3way',
            name: '三路快速排序', category: 'sorting', level: 'P2',
            complexity: { time: 'O(n log n)', space: 'O(log n)' },
            keywords: ['3-way', 'quick', 'dijkstra', 'san lu'],
            mnemonic: '三段划分小等大，重复元素免递归',
            description: `<div class="desc-section"><h3>核心思想</h3><p>选一个基准值，把数组分成“小于基准”和“大于基准”两部分，然后递归排序两部分。</p></div><div class="desc-section"><h3>推导过程</h3><p>关键在于 partition：用两个指针从两端向中间扫描，把小于 pivot 的放左边，大于的放右边。pivot 的最终位置就是它在有序数组中的位置。然后对左右子数组递归。</p></div><div class="desc-section"><h3>适用场景</h3><p>通用排序、数据量大、平均性能要求高的场景。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 数据库查询结果排序。② 大数据集内存排序。③ 快速求 Top-K（只递归一侧）。</p></div>`,
            code: quick3WayCode,
            defaultData: [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5],
            dataParser: NUM_DATA,
            run: quick3WayRun
        },
        {
            id: 'sorting.bucket',
            name: '桶排序', category: 'sorting', level: 'P2',
            complexity: { time: 'O(n+k)', space: 'O(n+k)' },
            keywords: ['bucket', 'tong'],
            mnemonic: '按值分桶内排序，顺序合并即成',
            description: `<div class="desc-section"><h3>核心思想</h3><p>把数据分到若干个桶里，每个桶内部单独排序，最后按桶顺序收集结果。</p></div><div class="desc-section"><h3>推导过程</h3><p>假设数据均匀分布。把区间 [min, max] 分成 k 个桶，每个元素放入对应桶。桶内元素少，用插入排序即可。理想情况下总时间接近 O(n)。</p></div><div class="desc-section"><h3>适用场景</h3><p>数据分布均匀、浮点数排序、需要并行化的场景。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 高考成绩按分数段分班。② 分布式排序（每个节点处理一个桶）。</p></div>`,
            code: bucketSortCode,
            defaultData: [29, 10, 14, 37, 13, 25, 41, 22, 31, 8],
            dataParser: NUM_DATA,
            run: bucketSortRun
        },

        {
            id: 'linear.deque',
            name: '双端队列', category: 'linear', level: 'P2',
            complexity: { time: 'O(1)', space: 'O(n)' },
            keywords: ['deque', 'double ended queue', 'shuang duan'],
            mnemonic: '两端均可入与出，均摊常数应用广',
            description: `<div class="desc-section"><h3>核心思想</h3><p>队列是“先进先出”的结构，队尾入队、队首出队；双端队列两端都可操作。</p></div><div class="desc-section"><h3>推导过程</h3><p>用数组循环队列或双向链表维护 head 和 tail。入队移动 tail，出队移动 head。循环队列用取模复用被释放的空间。</p></div><div class="desc-section"><h3>适用场景</h3><p>任务调度、BFS、缓存、流水线缓冲。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 打印机任务队列。② BFS 图遍历。③ 消息队列。</p></div>`,
            code: dequeCode,
            run: dequeRun
        },

        {
            id: 'tree.postorderIter',
            name: '二叉树 - 后序遍历（非递归）', category: 'tree', level: 'P2',
            complexity: { time: 'O(n)', space: 'O(h)' },
            keywords: ['postorder', 'iterative', 'hou xu'],
            mnemonic: '左链压栈判右子，记prev防重复访',
            description: `<div class="desc-section"><h3>核心思想</h3><p>按特定顺序访问二叉树的每个节点：前序根-左-右，中序左-根-右，后序左-右-根，层序一层一层访问。</p></div><div class="desc-section"><h3>推导过程</h3><p>递归写法直接按定义访问。非递归写法用栈模拟递归过程：中序一路向左压栈，到底后弹出访问，再转向右子树；层序用队列按层扩展。</p></div><div class="desc-section"><h3>适用场景</h3><p>表达式求值、序列化树、按层次展示、BST 有序输出。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 文件系统目录树打印。② 表达式树求值。③ BST 中序输出有序序列。</p></div>`,
            code: postorderIterCode,
            run: postorderIterRun,
            buildState: buildBinaryTreeState
        },
        {
            id: 'tree.postorderTwoStack',
            name: '二叉树 - 后序遍历（双栈法）', category: 'tree', level: 'P2',
            complexity: { time: 'O(n)', space: 'O(n)' },
            keywords: ['postorder', 'two stack', 'shuang zhan'],
            mnemonic: 's1按根右左收集，s2反转即后序',
            description: `<div class="desc-section"><h3>核心思想</h3><p>按特定顺序访问二叉树的每个节点：前序根-左-右，中序左-根-右，后序左-右-根，层序一层一层访问。</p></div><div class="desc-section"><h3>推导过程</h3><p>递归写法直接按定义访问。非递归写法用栈模拟递归过程：中序一路向左压栈，到底后弹出访问，再转向右子树；层序用队列按层扩展。</p></div><div class="desc-section"><h3>适用场景</h3><p>表达式求值、序列化树、按层次展示、BST 有序输出。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 文件系统目录树打印。② 表达式树求值。③ BST 中序输出有序序列。</p></div>`,
            code: postorderTwoStackCode,
            run: postorderTwoStackRun,
            buildState: buildBinaryTreeState
        },
        {
            id: 'tree.segmentTree',
            name: '线段树（单点更新+区间查询）', category: 'tree', level: 'P2',
            complexity: { time: 'O(log n)', space: 'O(n)' },
            keywords: ['segment tree', 'xian duan shu', 'range query'],
            mnemonic: '节点管区间聚合，单点更新区间查',
            description: `<div class="desc-section"><h3>核心思想</h3><p>线段树把区间二分建造成树，每个节点维护一个子区间的聚合信息，支持区间查询和单点更新。</p></div><div class="desc-section"><h3>推导过程</h3><p>区间 [l,r] 对应节点，若长度大于 1 则分成 [l,mid] 和 [mid+1,r] 两个孩子。查询时把目标区间拆成若干已覆盖的子区间合并结果；更新时自底向上重新聚合。</p></div><div class="desc-section"><h3>适用场景</h3><p>区间最值/求和/修改、RMQ、动态区间统计。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 区间最大值查询。② 数组区间加减。③ 扫描线算法。</p></div>`,
            code: segmentTreeCode,
            defaultData: [1, 3, 5, 7, 9, 11],
            dataParser: NUM_DATA,
            run: segmentTreeRun
        },
        {
            id: 'tree.bit',
            name: '树状数组（BIT）', category: 'tree', level: 'P2',
            complexity: { time: 'O(log n)', space: 'O(n)' },
            keywords: ['fenwick', 'bit', 'shu zhuang shu zu'],
            mnemonic: '位运算巧拆下标，前缀查询更新快',
            description: `<div class="desc-section"><h3>核心思想</h3><p>树状数组用 lowbit 维护前缀信息，以 O(log n) 支持单点修改和前缀查询。</p></div><div class="desc-section"><h3>推导过程</h3><p>每个节点 c[i] 负责一段长度为 lowbit(i) 的区间。更新 a[x] 时，沿 x += lowbit(x) 更新所有相关节点；查询前缀和时，沿 x -= lowbit(x) 累加。</p></div><div class="desc-section"><h3>适用场景</h3><p>前缀和/频次统计、逆序对、动态区间和。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 动态求前缀和。② 统计逆序对数量。③ 实时频次统计。</p></div>`,
            code: bitCode,
            defaultData: [1, 3, 5, 7, 9, 11],
            dataParser: NUM_DATA,
            run: bitRun
        },

        {
            id: 'graph.floyd',
            name: 'Floyd-Warshall 多源最短路径', category: 'graph', level: 'P2',
            complexity: { time: 'O(n³)', space: 'O(n²)' },
            keywords: ['floyd', 'warshall', 'all pairs', 'duo yuan'],
            mnemonic: '依次中转松所有，多源最短动态规',
            description: `<div class="desc-section"><h3>核心思想</h3><p>Floyd-Warshall 求任意两点间的最短路径，基于动态规划。</p></div><div class="desc-section"><h3>推导过程</h3><p>设 dist[i][j] 表示 i 到 j 的最短距离。枚举中间点 k，若 dist[i][k]+dist[k][j] < dist[i][j] 则更新。三重循环后得到全源最短路。</p></div><div class="desc-section"><h3>适用场景</h3><p>全源最短路径、节点数较少的稠密图、传递闭包。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 全国城市间最短距离表。② 网络中任意两节点延迟。③ 判断任意两点是否可达。</p></div>`,
            code: floydCode,
            run: floydRun
        },

        {
            id: 'string.rabinKarp',
            name: 'Rabin-Karp 字符串匹配', category: 'string', level: 'P2',
            complexity: { time: 'O(n+m)~', space: 'O(1)' },
            keywords: ['rabin', 'karp', 'hash', 'string match'],
            mnemonic: '滚动哈希滑窗口，命中再比字符详',
            description: `<div class="desc-section"><h3>核心思想</h3><p>用滚动哈希把子串转成数值，先比哈希再逐字符确认，实现多模式匹配。</p></div><div class="desc-section"><h3>推导过程</h3><p>选一个基数和模数，把长度为 m 的子串看作 m 位“数”。利用前一个子串的哈希在 O(1) 内推出下一个子串的哈希。哈希相等时再逐字符验证，避免冲突误判。</p></div><div class="desc-section"><h3>适用场景</h3><p>多模式匹配、抄袭检测、DNA 重复片段查找。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 论文查重。② 病毒库多特征匹配。③ 字符串中出现次数统计。</p></div>`,
            code: rabinKarpCode,
            run: rabinKarpRun,
            buildState: buildStringMatchState
        },

        {
            id: 'classic.knightTour',
            name: '骑士巡游（回溯）', category: 'classic', level: 'P2',
            complexity: { time: 'O(8^(n²))', space: 'O(n²)' },
            keywords: ['knight', 'tour', 'backtrack', 'qi shi'],
            mnemonic: '八方试向递归深，无解回溯撤一步',
            description: `<div class="desc-section"><h3>核心思想</h3><p>通过递归尝试所有可能，遇到不满足条件就回退，直到找到可行解。</p></div><div class="desc-section"><h3>推导过程</h3><p>每步选择一个候选填入当前位置，检查约束是否满足。满足则继续下一层；不满足则撤销该选择并试下一个候选。剪枝可大幅缩小搜索空间。</p></div><div class="desc-section"><h3>适用场景</h3><p>组合优化、约束满足、棋类游戏、调度排班。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 数独求解。② N 皇后。③ 旅行商问题。</p></div>`,
            code: knightTourCode,
            defaultData: [5],
            dataParser: (s) => [Math.min(6, Math.max(4, parseInt(s.split(',')[0], 10) || 5))],
            run: knightTourRun
        }
    ];

    algos.forEach(a => AlgorithmLoader.register(a.id, a));
})();
