/**
 * P1 算法集合 - 递归/非递归细分版本
 *
 * 设计文档要求的 P1 算法（重点选取有教学意义的细分版本）：
 *   - 排序：快速排序(非递归)、归并排序(自底向上)、希尔排序、计数排序
 *   - 线性：双向链表、循环队列、LRU 缓存
 *   - 树：二叉树前序/中序(非递归)、BST 插入/删除(非递归)、AVL 删除、并查集 Find(非递归)
 *   - 图：DFS 非递归、拓扑排序(DFS 逆后序)、Dijkstra 朴素版、Bellman-Ford
 *   - 字符串：最长公共子串
 *   - 经典：二分搜索(递归)、完全背包、汉诺塔
 */
(function () {
    'use strict';

    const NUM_DATA = (s) => s.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n));
    const DEFAULT_ARR = [5, 3, 8, 1, 2, 7, 4, 6];

    // ====================================================================
    // 排序算法 P1
    // ====================================================================

    // ===== 快速排序（非递归，显式栈） =====
    const quickIterCode = `function quickSort(arr) {
  const stack = [[0, arr.length - 1]];
  while (stack.length > 0) {
    const [lo, hi] = stack.pop();
    if (lo >= hi) continue;
    const p = partition(arr, lo, hi);
    stack.push([lo, p - 1]);
    stack.push([p + 1, hi]);
  }
}
function partition(arr, lo, hi) {
  const pivot = arr[hi];
  let i = lo - 1;
  for (let j = lo; j < hi; j++) {
    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  [arr[i+1], arr[hi]] = [arr[hi], arr[i+1]];
  return i + 1;
}`;
    function quickIterRun(ctx, data) {
        const arr = ctx.add(new ArrayTracer('arr', data.slice()));
        const stack = ctx.add(new StackTracer('stack'));
        const log = ctx.add(new LogTracer('log'));
        const n = data.length;

        function partition(lo, hi) {
            ctx.line(10);
            const pivot = arr.items[hi].value;
            arr.highlight(hi, 'pivot', `pivot = ${pivot}`);
            log.printInfo(`分区 [${lo}..${hi}]，pivot = ${pivot}`);
            let i = lo - 1;
            ctx.line(11);
            for (let j = lo; j < hi; j++) {
                ctx.line(12);
                arr.setPointers([
                    { index: j, label: 'j', color: '#58a6ff' },
                    { index: i + 1, label: 'i+1', color: '#bc8cff' }
                ]);
                if (arr.compare(j, hi) <= 0) {
                    ctx.line(13);
                    i++;
                    if (i !== j) arr.swap(i, j);
                }
            }
            ctx.line(15);
            if (i + 1 !== hi) arr.swap(i + 1, hi);
            log.printSuccess(`pivot 就位于 arr[${i + 1}]`);
            arr.highlight(hi, 'default');
            arr.markSorted(i + 1);
            return i + 1;
        }

        const stk = [[0, n - 1]];
        stack.push(`[${0},${n - 1}]`);
        ctx.line(3);
        while (stk.length > 0) {
            ctx.line(4);
            const [lo, hi] = stk.pop();
            stack.pop();
            log.printInfo(`处理区间 [${lo}..${hi}]`);
            ctx.line(5);
            if (lo >= hi) {
                if (lo === hi && lo >= 0 && lo < n) arr.markSorted(lo);
                continue;
            }
            const p = partition(lo, hi);
            ctx.line(6);
            stk.push([lo, p - 1]);
            stack.push(`[${lo},${p - 1}]`);
            ctx.line(7);
            stk.push([p + 1, hi]);
            stack.push(`[${p + 1},${hi}]`);
        }
        arr.done();
        log.printSuccess('排序完成');
    }

    // ===== 归并排序（自底向上，迭代） =====
    const mergeBottomUpCode = `function mergeSort(arr) {
  const n = arr.length;
  for (let size = 1; size < n; size *= 2) {
    for (let lo = 0; lo < n - size; lo += 2 * size) {
      const mid = lo + size - 1;
      const hi = Math.min(lo + 2 * size - 1, n - 1);
      merge(arr, lo, mid, hi);
    }
  }
}`;
    function mergeBottomUpRun(ctx, data) {
        const arr = ctx.add(new ArrayTracer('arr', data.slice()));
        const log = ctx.add(new LogTracer('log'));
        const n = data.length;

        function merge(lo, mid, hi) {
            log.printInfo(`合并 [${lo}..${mid}] 与 [${mid + 1}..${hi}]`);
            arr.highlightRange(lo, hi, '#58a6ff');
            const tmp = [];
            let i = lo, j = mid + 1;
            while (i <= mid && j <= hi) {
                arr.setPointers([
                    { index: i, label: 'i', color: '#58a6ff' },
                    { index: j, label: 'j', color: '#bc8cff' }
                ]);
                if (arr.compare(i, j) <= 0) {
                    tmp.push(arr.items[i].value);
                    arr.highlight(i, 'current');
                    i++;
                } else {
                    tmp.push(arr.items[j].value);
                    arr.highlight(j, 'current');
                    j++;
                }
            }
            while (i <= mid) { tmp.push(arr.items[i].value); arr.highlight(i, 'visited'); i++; }
            while (j <= hi) { tmp.push(arr.items[j].value); arr.highlight(j, 'visited'); j++; }
            for (let k = 0; k < tmp.length; k++) {
                arr.items[lo + k] = { value: tmp[k], state: 'current' };
                arr._commit({
                    type: 'set',
                    payload: { index: lo + k, value: tmp[k] },
                    description: `arr[${lo + k}] = ${tmp[k]}（回填）`
                });
                arr.items[lo + k].state = 'default';
            }
            log.printSuccess(`区间 [${lo}..${hi}] 已有序`);
        }

        ctx.line(2);
        for (let size = 1; size < n; size *= 2) {
            ctx.line(3);
            log.printInfo(`size = ${size}`);
            for (let lo = 0; lo < n - size; lo += 2 * size) {
                ctx.line(4);
                const mid = lo + size - 1;
                const hi = Math.min(lo + 2 * size - 1, n - 1);
                ctx.line(5);
                merge(lo, mid, hi);
            }
        }
        arr.done();
        log.printSuccess('排序完成');
    }

    // ===== 希尔排序 =====
    const shellSortCode = `function shellSort(arr) {
  const n = arr.length;
  for (let gap = n >> 1; gap > 0; gap >>= 1) {
    for (let i = gap; i < n; i++) {
      const temp = arr[i];
      let j = i;
      while (j >= gap && arr[j - gap] > temp) {
        arr[j] = arr[j - gap];
        j -= gap;
      }
      arr[j] = temp;
    }
  }
}`;
    function shellSortRun(ctx, data) {
        const arr = ctx.add(new ArrayTracer('arr', data.slice()));
        const log = ctx.add(new LogTracer('log'));
        const n = data.length;
        ctx.line(2);
        for (let gap = n >> 1; gap > 0; gap >>= 1) {
            ctx.line(3);
            log.printInfo(`gap = ${gap}`);
            arr.highlightRange(0, n - 1, '#bc8cff', `当前步长 gap = ${gap}`);
            for (let i = gap; i < n; i++) {
                ctx.line(4);
                const temp = arr.items[i].value;
                arr.highlight(i, 'current', `temp = arr[${i}] = ${temp}`);
                let j = i;
                ctx.line(6);
                while (j >= gap) {
                    arr.setPointers([
                        { index: j, label: 'j', color: '#58a6ff' },
                        { index: j - gap, label: 'j-gap', color: '#bc8cff' }
                    ]);
                    if (arr.compare(j - gap, i) > 0) {
                        ctx.line(7);
                        arr.items[j].value = arr.items[j - gap].value;
                        arr.items[j].state = 'swap';
                        arr._commit({
                            type: 'set',
                            payload: { index: j, value: arr.items[j - gap].value },
                            description: `arr[${j}] = arr[${j - gap}] = ${arr.items[j - gap].value}`
                        });
                        arr.items[j].state = 'default';
                        j -= gap;
                    } else break;
                }
                ctx.line(9);
                arr.items[j].value = temp;
                arr.items[j].state = 'current';
                arr._commit({
                    type: 'set',
                    payload: { index: j, value: temp },
                    description: `arr[${j}] = ${temp}（插入）`
                });
                arr.items[j].state = 'default';
            }
        }
        arr.done();
        log.printSuccess('排序完成');
    }

    // ===== 计数排序 =====
    const countingSortCode = `function countingSort(arr) {
  const max = Math.max(...arr);
  const count = new Array(max + 1).fill(0);
  for (const x of arr) count[x]++;
  let idx = 0;
  for (let v = 0; v <= max; v++) {
    while (count[v]-- > 0) arr[idx++] = v;
  }
}`;
    function countingSortRun(ctx, data) {
        const arr = ctx.add(new ArrayTracer('arr', data.slice()));
        const log = ctx.add(new LogTracer('log'));
        const n = data.length;
        const max = Math.max(...data);
        ctx.line(2);
        log.printInfo(`最大值 = ${max}，构建 count[0..${max}]`);
        // 用 DP 表展示计数数组
        const dp = ctx.add(new DPTableTracer('count', 1, max + 1));
        for (let v = 0; v <= max; v++) dp.cells[0][v] = { value: 0, state: 'default' };
        dp._commit({ type: 'init', payload: {}, description: '初始化 count 数组' });

        ctx.line(3);
        for (const x of data) {
            ctx.line(4);
            dp.cells[0][x].value++;
            dp.cells[0][x].state = 'current';
            arr.highlight(arr.items.findIndex(it => it.value === x && it.state !== 'visited'), 'visited');
            dp._commit({ type: 'visit', payload: { col: x }, description: `count[${x}]++ → ${dp.cells[0][x].value}` });
            dp.cells[0][x].state = 'default';
        }
        arr.items.forEach(it => it.state = 'default');

        let idx = 0;
        ctx.line(5);
        for (let v = 0; v <= max; v++) {
            ctx.line(6);
            while (dp.cells[0][v].value > 0) {
                ctx.line(7);
                arr.items[idx].value = v;
                arr.items[idx].state = 'current';
                dp.cells[0][v].state = 'visited';
                arr._commit({
                    type: 'set',
                    payload: { index: idx, value: v },
                    description: `arr[${idx}] = ${v}`
                });
                arr.items[idx].state = 'sorted';
                dp.cells[0][v].value--;
                dp._commit({ type: 'visit', payload: { col: v }, description: `count[${v}]-- → ${dp.cells[0][v].value}` });
                dp.cells[0][v].state = 'default';
                idx++;
            }
        }
        arr.done();
        log.printSuccess('排序完成');
    }

    // ====================================================================
    // 线性结构 P1
    // ====================================================================

    // ===== 双向链表 - 插入/删除 =====
    const doublyListCode = `class Node {
  constructor(v) { this.val = v; this.prev = null; this.next = null; }
}
class DoublyLinkedList {
  insertAt(node, pos) { /* ... */ }
  deleteAt(pos) { /* ... */ }
}`;
    function doublyListRun(ctx) {
        const ll = ctx.add(new LinkedListTracer('list'));
        const log = ctx.add(new LogTracer('log'));
        // 构造初始双向链表 10 <-> 20 <-> 30
        [10, 20, 30].forEach(v => ll.push(v));
        ll._commit({ type: 'snapshot', payload: {}, description: '初始双向链表 10 ↔ 20 ↔ 30' });
        log.printInfo('初始：10 ↔ 20 ↔ 30');

        // 头部插入 5
        ctx.line(5);
        log.printInfo('头部插入 5');
        ll.unshift(5);
        ll._commit({ type: 'snapshot', payload: {}, description: '头部插入 5 → 5 ↔ 10 ↔ 20 ↔ 30' });

        // 中间插入 15（在 10 之后）
        ctx.line(5);
        log.printInfo('在 10 之后插入 15');
        ll.insert(1, 15);
        ll._commit({ type: 'snapshot', payload: {}, description: '中间插入 15 → 5 ↔ 10 ↔ 15 ↔ 20 ↔ 30' });

        // 删除 20
        ctx.line(6);
        log.printInfo('删除节点 20');
        ll.remove(3);
        ll._commit({ type: 'snapshot', payload: {}, description: '删除 20 → 5 ↔ 10 ↔ 15 ↔ 30' });
        log.printSuccess('双向链表操作完成');
    }

    // ===== 循环队列 =====
    const circularQueueCode = `class CircularQueue {
  constructor(k) {
    this.data = new Array(k);
    this.head = 0; this.size = 0; this.cap = k;
  }
  enqueue(x) {
    if (this.size === this.cap) return false;
    const tail = (this.head + this.size) % this.cap;
    this.data[tail] = x;
    this.size++;
    return true;
  }
  dequeue() {
    if (this.size === 0) return null;
    const x = this.data[this.head];
    this.head = (this.head + 1) % this.cap;
    this.size--;
    return x;
  }
}`;
    function circularQueueRun(ctx) {
        const arr = ctx.add(new ArrayTracer('array', ['', '', '', '']));
        const log = ctx.add(new LogTracer('log'));
        const cap = 4;
        let head = 0, size = 0;
        arr.items.forEach(it => it.value = '_');
        arr._commit({ type: 'init', payload: { cap }, description: '初始化循环队列 cap=4' });
        log.printInfo('循环队列 cap=4');

        function enqueue(x) {
            ctx.line(7);
            if (size === cap) {
                log.printWarning('队列已满');
                return;
            }
            const tail = (head + size) % cap;
            arr.items[tail] = { value: x, state: 'current' };
            size++;
            arr._commit({
                type: 'set',
                payload: { index: tail, value: x },
                description: `enqueue(${x}) → 写入 arr[${tail}]（head=${head}, size=${size}）`
            });
            arr.items[tail].state = 'default';
            arr.setPointers([
                { index: head, label: 'head', color: '#58a6ff' },
                { index: (head + size - 1) % cap, label: 'tail', color: '#bc8cff' }
            ]);
        }
        function dequeue() {
            ctx.line(13);
            if (size === 0) {
                log.printWarning('队列为空');
                return;
            }
            const x = arr.items[head].value;
            arr.items[head] = { value: '_', state: 'visited' };
            arr._commit({
                type: 'set',
                payload: { index: head, value: '_' },
                description: `dequeue() → 读出 arr[${head}]=${x}，head=(head+1)%cap`
            });
            arr.items[head].state = 'default';
            head = (head + 1) % cap;
            size--;
            arr.setPointers([
                { index: head, label: 'head', color: '#58a6ff' },
                { index: size ? (head + size - 1) % cap : head, label: 'tail', color: '#bc8cff' }
            ]);
        }

        enqueue(10); enqueue(20); enqueue(30); enqueue(40);
        log.printWarning('触发队满');
        dequeue(); dequeue();
        enqueue(50); enqueue(60);
        log.printInfo('观察 head/tail 取模回绕');
        log.printSuccess('循环队列演示完成');
    }

    // ===== LRU 缓存 =====
    const lruCode = `class LRUCache {
  constructor(cap) { this.cap = cap; this.map = new Map(); }
  get(key) {
    if (!this.map.has(key)) return -1;
    const val = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }
  put(key, val) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, val);
    if (this.map.size > this.cap) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }
}`;
    function lruRun(ctx) {
        const ll = ctx.add(new LinkedListTracer('list'));
        const log = ctx.add(new LogTracer('log'));
        const cap = 3;
        const map = new Map();
        log.printInfo(`LRU 缓存 cap=${cap}`);

        function refresh() {
            const keys = Array.from(map.keys());
            ll.setItems(keys.map(k => ({ value: k, state: 'default' })));
            ll._commit({ type: 'snapshot', payload: {}, description: `缓存: ${keys.join(' → ')}` });
        }
        function put(k, v) {
            ctx.line(8);
            log.printInfo(`put(${k}, ${v})`);
            if (map.has(k)) {
                ctx.line(9);
                map.delete(k);
            }
            map.set(k, v);
            if (map.size > cap) {
                ctx.line(11);
                const oldest = map.keys().next().value;
                map.delete(oldest);
                log.printWarning(`缓存已满，淘汰 LRU = ${oldest}`);
            }
            refresh();
        }
        function get(k) {
            ctx.line(4);
            log.printInfo(`get(${k})`);
            if (!map.has(k)) {
                log.printError(`未命中`);
                return -1;
            }
            const v = map.get(k);
            map.delete(k);
            map.set(k, v);
            refresh();
            return v;
        }
        put(1, 'a'); put(2, 'b'); put(3, 'c');
        get(1); // 命中 1，移到头部
        put(4, 'd'); // 淘汰 2
        get(2); // 未命中
        get(3); // 命中 3
        put(5, 'e'); // 淘汰 1
        log.printSuccess('LRU 演示完成');
    }

    // ====================================================================
    // 树结构 P1
    // ====================================================================

    // 复用 P0 的二叉树辅助函数（重新声明一份以保持模块独立）
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

    // ===== 二叉树前序遍历（非递归） =====
    const preorderIterCode = `function preorder(root) {
  if (!root) return;
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    visit(node);
    if (node.right) stack.push(node.right);
    if (node.left) stack.push(node.left);
  }
}`;
    function preorderIterRun(ctx) {
        const nodes = buildSampleTree();
        const tree = ctx.add(new TreeTracer('tree', nodes));
        const stack = ctx.add(new StackTracer('stack'));
        const log = ctx.add(new LogTracer('log'));
        const visited = [];
        ctx.line(2);
        const stk = [tree.root];
        stack.push(tree.nodes[tree.root].value);
        tree.highlight(tree.root, 'instack', `根节点 ${tree.nodes[tree.root].value} 入栈`);
        ctx.line(3);
        while (stk.length > 0) {
            ctx.line(4);
            const idx = stk.pop();
            stack.pop();
            ctx.line(5);
            tree.visit(idx);
            visited.push(tree.nodes[idx].value);
            log.printInfo(`访问 ${tree.nodes[idx].value} → 序列: [${visited.join(', ')}]`);
            ctx.line(6);
            if (tree.nodes[idx].right !== null && tree.nodes[idx].right !== undefined) {
                stk.push(tree.nodes[idx].right);
                stack.push(tree.nodes[tree.nodes[idx].right].value);
                tree.highlight(tree.nodes[idx].right, 'instack', `右子 ${tree.nodes[tree.nodes[idx].right].value} 入栈`);
            }
            ctx.line(7);
            if (tree.nodes[idx].left !== null && tree.nodes[idx].left !== undefined) {
                stk.push(tree.nodes[idx].left);
                stack.push(tree.nodes[tree.nodes[idx].left].value);
                tree.highlight(tree.nodes[idx].left, 'instack', `左子 ${tree.nodes[tree.nodes[idx].left].value} 入栈`);
            }
        }
        log.printSuccess(`前序遍历（非递归）完成: [${visited.join(', ')}]`);
    }

    // ===== 二叉树中序遍历（非递归） =====
    const inorderIterCode = `function inorder(root) {
  const stack = [];
  let cur = root;
  while (cur || stack.length > 0) {
    while (cur) {
      stack.push(cur);
      cur = cur.left;
    }
    cur = stack.pop();
    visit(cur);
    cur = cur.right;
  }
}`;
    function inorderIterRun(ctx) {
        const nodes = buildSampleTree();
        const tree = ctx.add(new TreeTracer('tree', nodes));
        const stack = ctx.add(new StackTracer('stack'));
        const log = ctx.add(new LogTracer('log'));
        const visited = [];
        const stk = [];
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
            ctx.line(7);
            cur = stk.pop();
            stack.pop();
            ctx.line(8);
            tree.visit(cur);
            visited.push(tree.nodes[cur].value);
            log.printInfo(`访问 ${tree.nodes[cur].value} → 序列: [${visited.join(', ')}]`);
            ctx.line(9);
            cur = tree.nodes[cur].right;
        }
        log.printSuccess(`中序遍历（非递归）完成: [${visited.join(', ')}]`);
    }

    // ===== BST 插入（非递归） =====
    const bstInsertIterCode = `function insert(root, val) {
  if (!root) return new Node(val);
  let cur = root;
  while (true) {
    if (val < cur.val) {
      if (!cur.left) { cur.left = new Node(val); break; }
      cur = cur.left;
    } else if (val > cur.val) {
      if (!cur.right) { cur.right = new Node(val); break; }
      cur = cur.right;
    } else break;
  }
  return root;
}`;
    function bstInsertIterRun(ctx, data) {
        const values = (data && data.length) ? data : [50, 30, 70, 20, 40, 60, 80, 35, 45];
        const tree = ctx.add(new TreeTracer('tree', []));
        const log = ctx.add(new LogTracer('log'));
        tree.root = null;

        for (const v of values) {
            ctx.line(1);
            log.printInfo(`插入 ${v}`);
            if (tree.root === null) {
                tree.nodes[0] = { value: v, left: null, right: null, parent: null, state: 'current', tag: '', hidden: false };
                tree.root = 0;
                tree._commit({ type: 'visit', payload: { node: 0 }, description: `创建根节点 ${v}` });
                tree.nodes[0].state = 'default';
                continue;
            }
            ctx.line(3);
            let cur = tree.root;
            while (true) {
                tree.highlight(cur, 'current', `${v} vs ${tree.nodes[cur].value}`);
                ctx.line(4);
                if (v < tree.nodes[cur].value) {
                    ctx.line(5);
                    if (tree.nodes[cur].left === null) {
                        ctx.line(5);
                        const newIdx = tree.nodes.length;
                        tree.nodes[newIdx] = { value: v, left: null, right: null, parent: cur, state: 'current', tag: '', hidden: false };
                        tree.nodes[cur].left = newIdx;
                        tree._commit({ type: 'visit', payload: { node: newIdx }, description: `插入 ${v} 作为 ${tree.nodes[cur].value} 的左子节点` });
                        tree.nodes[newIdx].state = 'default';
                        tree.nodes[cur].state = 'default';
                        break;
                    }
                    cur = tree.nodes[cur].left;
                } else if (v > tree.nodes[cur].value) {
                    ctx.line(7);
                    if (tree.nodes[cur].right === null) {
                        ctx.line(7);
                        const newIdx = tree.nodes.length;
                        tree.nodes[newIdx] = { value: v, left: null, right: null, parent: cur, state: 'current', tag: '', hidden: false };
                        tree.nodes[cur].right = newIdx;
                        tree._commit({ type: 'visit', payload: { node: newIdx }, description: `插入 ${v} 作为 ${tree.nodes[cur].value} 的右子节点` });
                        tree.nodes[newIdx].state = 'default';
                        tree.nodes[cur].state = 'default';
                        break;
                    }
                    cur = tree.nodes[cur].right;
                } else {
                    log.printWarning(`${v} 已存在，跳过`);
                    tree.nodes[cur].state = 'default';
                    break;
                }
            }
        }
        tree.done();
        log.printSuccess(`BST 构建完成（非递归），共 ${values.length} 个节点`);
    }

    // ===== 并查集 Find（非递归，迭代 + 路径压缩） =====
    const ufFindIterCode = `function find(parent, x) {
  let root = x;
  while (parent[root] !== root) root = parent[root];
  // 第二次遍历，路径压缩
  while (parent[x] !== root) {
    const next = parent[x];
    parent[x] = root;
    x = next;
  }
  return root;
}`;
    function ufFindIterRun(ctx) {
        const N = 6;
        // 构造链：1→2→3→4→5
        const vertices = Array.from({ length: N }, (_, i) => ({ label: String(i), state: 'default' }));
        const edges = [];
        const parent = Array.from({ length: N }, (_, i) => i);
        // 0 是根；1→2→3→4→5
        for (let i = 1; i < N; i++) {
            parent[i] = i === 1 ? 0 : i - 1;
        }
        for (let i = 0; i < N; i++) {
            if (parent[i] !== i) edges.push({ u: i, v: parent[i], directed: true });
        }
        const g = ctx.add(new GraphTracer('graph', vertices, edges));
        const log = ctx.add(new LogTracer('log'));
        log.printInfo('查找节点 5 的根（链：5→4→3→2→1→0）');

        ctx.line(2);
        let root = 5;
        g.vertices[root].state = 'current';
        ctx.line(3);
        while (parent[root] !== root) {
            log.printInfo(`${root} → parent = ${parent[root]}`);
            g.highlightEdge(root, parent[root], '#58a6ff', `${root} → ${parent[root]}`);
            root = parent[root];
            g.vertices[root].state = 'visited';
            g._commit({ type: 'visit', payload: { vertex: root }, description: `向上走到 ${root}` });
        }
        log.printSuccess(`根节点 = ${root}`);
        g.vertices[root].state = 'sorted';

        ctx.line(5);
        log.printInfo('第二次遍历，路径压缩');
        let x = 5;
        while (parent[x] !== root) {
            ctx.line(6);
            const next = parent[x];
            parent[x] = root;
            log.printInfo(`parent[${x}] = ${root}（直接挂到根）`);
            // 更新图的边
            g._commit({ type: 'snapshot', payload: {}, description: `parent[${x}] = ${root}` });
            x = next;
        }
        log.printSuccess('路径压缩完成');
    }
    function buildUFState(tracerStates, _step, ctxInfo) {
        const snap = tracerStates.graph;
        if (!snap) return null;
        // 画布自适应：圆形布局半径/圆心随画布尺寸收缩，防止节点超出画布（动画元素不允许展示不全）
        const W = (ctxInfo && ctxInfo.width) || (window.app?.renderer?.width || 800);
        const H = (ctxInfo && ctxInfo.height) || (window.app?.renderer?.height || 400);
        const r = Math.max(40, Math.min(130, Math.min(W, H) / 2 - 50));
        const cx = W / 2;
        const cy = H / 2;
        const positions = LayoutEngine.layoutGraphCircle(snap.vertices, { cx, cy, r });
        const vertices = snap.vertices.map((v, i) => ({ ...positions[i], ...v }));
        return { graph: { vertices, edges: snap.edges, options: { radius: 22, fontSize: 13, directed: true } } };
    }

    // ====================================================================
    // 图算法 P1
    // ====================================================================

    const SAMPLE_GRAPH = {
        vertices: [0, 1, 2, 3, 4, 5, 6, 7],
        edges: [
            { u: 0, v: 1 }, { u: 0, v: 2 }, { u: 1, v: 3 }, { u: 1, v: 4 },
            { u: 2, v: 5 }, { u: 2, v: 6 }, { u: 3, v: 7 }, { u: 4, v: 5 }
        ]
    };
    // 图状态构建器：统一使用公共实现（js/core/stateBuilders.js）
    const buildGraphState = StateBuilders.buildGraphState;

    // ===== DFS 非递归 =====
    const dfsIterCode = `function dfs(graph, start) {
  const visited = new Set();
  const stack = [start];
  while (stack.length > 0) {
    const u = stack.pop();
    if (visited.has(u)) continue;
    visited.add(u);
    for (const v of graph.adj[u]) {
      if (!visited.has(v)) stack.push(v);
    }
  }
}`;
    function dfsIterRun(ctx) {
        const vertices = SAMPLE_GRAPH.vertices.map((v, i) => ({ label: String(i), state: 'default' }));
        const edges = SAMPLE_GRAPH.edges.map(e => ({ ...e, directed: false }));
        const g = ctx.add(new GraphTracer('graph', vertices, edges));
        const stack = ctx.add(new StackTracer('stack'));
        const log = ctx.add(new LogTracer('log'));
        const adj = Array.from({ length: vertices.length }, () => []);
        edges.forEach(e => { adj[e.u].push(e.v); adj[e.v].push(e.u); });

        const visited = new Set();
        const order = [];
        const stk = [0];
        stack.push('0');
        ctx.line(3);
        while (stk.length > 0) {
            ctx.line(4);
            const u = stk.pop();
            stack.pop();
            ctx.line(5);
            if (visited.has(u)) {
                log.printInfo(`${u} 已访问，跳过`);
                continue;
            }
            ctx.line(6);
            visited.add(u);
            g.visit(u);
            order.push(u);
            log.printInfo(`访问 ${u} → 顺序: [${order.join(', ')}]`);
            ctx.line(7);
            // 逆序压栈，保证左子先处理
            for (let i = adj[u].length - 1; i >= 0; i--) {
                const v = adj[u][i];
                ctx.line(8);
                if (!visited.has(v)) {
                    g.highlightEdge(u, v, '#58a6ff', `${u} → ${v}`);
                    stk.push(v);
                    stack.push(String(v));
                }
            }
        }
        log.printSuccess(`DFS（非递归）完成，访问顺序: [${order.join(', ')}]`);
    }

    // ===== 拓扑排序 - DFS 逆后序 =====
    const topoDfsCode = `function topoSort(graph) {
  const visited = new Set();
  const result = [];
  function dfs(u) {
    visited.add(u);
    for (const v of graph.adj[u]) {
      if (!visited.has(v)) dfs(v);
    }
    result.unshift(u); // 逆后序
  }
  for (const u of graph.vertices) {
    if (!visited.has(u)) dfs(u);
  }
  return result;
}`;
    function topoDfsRun(ctx) {
        const DAG = {
            vertices: ['A', 'B', 'C', 'D', 'E', 'F'],
            edges: [
                { u: 0, v: 1 }, { u: 0, v: 2 }, { u: 1, v: 3 },
                { u: 2, v: 3 }, { u: 2, v: 4 }, { u: 3, v: 5 }, { u: 4, v: 5 }
            ]
        };
        const vertices = DAG.vertices.map(v => ({ label: v, state: 'default' }));
        const edges = DAG.edges.map(e => ({ ...e, directed: true }));
        const g = ctx.add(new GraphTracer('graph', vertices, edges));
        const stack = ctx.add(new StackTracer('stack'));
        const log = ctx.add(new LogTracer('log'));
        const adj = Array.from({ length: vertices.length }, () => []);
        edges.forEach(e => adj[e.u].push(e.v));

        const visited = new Set();
        const result = [];
        ctx.line(3);
        function dfs(u) {
            ctx.line(4);
            visited.add(u);
            g.visit(u);
            log.printInfo(`进入 ${vertices[u].label}`);
            ctx.line(5);
            for (const v of adj[u]) {
                ctx.line(6);
                if (!visited.has(v)) {
                    g.highlightEdge(u, v, '#58a6ff', `${vertices[u].label} → ${vertices[v].label}`);
                    dfs(v);
                }
            }
            ctx.line(8);
            result.unshift(u);
            stack.push(vertices[u].label);
            log.printSuccess(`${vertices[u].label} 完成，加入结果头部`);
        }
        for (let u = 0; u < vertices.length; u++) {
            ctx.line(10);
            if (!visited.has(u)) dfs(u);
        }
        log.printSuccess(`拓扑序: ${result.map(u => vertices[u].label).join(' → ')}`);
    }
    function buildDAGState(tracerStates, _step, ctxInfo) {
        const snap = tracerStates.graph;
        if (!snap) return null;
        const w = (ctxInfo && ctxInfo.width) || window.app?.renderer?.width || 800;
        const h = (ctxInfo && ctxInfo.height) || window.app?.renderer?.height || 400;
        // 辅助面板（栈/队列）：布局使用收缩后的主区宽度
        const aux = (typeof Animator !== 'undefined' && Animator.computeAuxLayout)
            ? Animator.computeAuxLayout(tracerStates, w, h)
            : { mainW: w, overlays: [] };
        const mainW = Math.max(120, aux.mainW || w);
        const padX = 36, padY = 36, hGap = 26, vGap = 34;
        // 计算层数 & 最宽一层节点数，反推一个「放得下、不重叠」的半径
        const n = snap.vertices.length;
        const indeg = new Array(n).fill(0);
        const adj = Array.from({ length: n }, () => []);
        snap.edges.forEach(e => { adj[e.u].push(e.v); indeg[e.v]++; });
        const layer = new Array(n).fill(-1);
        const q = [];
        for (let i = 0; i < n; i++) if (indeg[i] === 0) { layer[i] = 0; q.push(i); }
        while (q.length) {
            const u = q.shift();
            for (const v of adj[u]) {
                layer[v] = Math.max(layer[v], layer[u] + 1);
                indeg[v]--;
                if (indeg[v] === 0) q.push(v);
            }
        }
        for (let i = 0; i < n; i++) if (layer[i] === -1) layer[i] = 0;
        const maxLayer = Math.max(0, ...layer);
        const counts = new Array(maxLayer + 1).fill(0);
        layer.forEach(l => counts[l]++);
        const maxCount = Math.max(1, ...counts);
        const L = maxLayer + 1;
        const usableW = Math.max(1, mainW - 2 * padX);
        const usableH = Math.max(1, h - 2 * padY);
        // 横向：maxCount 个节点（直径 2r + 间隙 hGap）要放进 usableW
        const rByW = (usableW - (maxCount - 1) * hGap) / (2 * maxCount);
        // 纵向：L 层（直径 2r + 间隙 vGap）要放进 usableH
        const rByH = (usableH - (L - 1) * vGap) / (2 * L);
        const radius = Math.max(7, Math.min(22, rByW, rByH));

        const positions = LayoutEngine.layoutGraphHierarchical(snap.vertices, snap.edges, {
            width: mainW, height: h, nodeR: radius, padX, padY, hGap, vGap
        });
        const vertices = snap.vertices.map((v, i) => ({ ...positions[i], ...v }));
        const result2 = { graph: { vertices, edges: snap.edges, options: { radius, fontSize: 13, directed: true } } };
        if (aux.overlays.length) {
            result2.overlays = aux.overlays;
        }
        return result2;
    }

    // ===== Dijkstra 朴素版（数组实现） =====
    const dijkstraNaiveCode = `function dijkstra(n, edges, src) {
  const dist = new Array(n).fill(Infinity);
  const visited = new Array(n).fill(false);
  dist[src] = 0;
  for (let i = 0; i < n; i++) {
    let u = -1, min = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited[j] && dist[j] < min) { min = dist[j]; u = j; }
    }
    if (u === -1) break;
    visited[u] = true;
    for (const [v, w] of adj[u]) {
      if (!visited[v] && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
      }
    }
  }
}`;
    function dijkstraNaiveRun(ctx) {
        const WG = {
            vertices: ['A', 'B', 'C', 'D', 'E', 'F'],
            edges: [
                { u: 0, v: 1, weight: 4 }, { u: 0, v: 2, weight: 2 },
                { u: 1, v: 2, weight: 1 }, { u: 1, v: 3, weight: 5 },
                { u: 2, v: 3, weight: 8 }, { u: 2, v: 4, weight: 10 },
                { u: 3, v: 4, weight: 2 }, { u: 3, v: 5, weight: 6 },
                { u: 4, v: 5, weight: 3 }
            ]
        };
        const vertices = WG.vertices.map(v => ({ label: v, state: 'default' }));
        const edges = WG.edges.map(e => ({ ...e, directed: true }));
        const g = ctx.add(new GraphTracer('graph', vertices, edges));
        const log = ctx.add(new LogTracer('log'));
        const n = vertices.length;
        const adj = Array.from({ length: n }, () => []);
        edges.forEach(e => adj[e.u].push([e.v, e.weight]));

        const dist = new Array(n).fill(Infinity);
        const visited = new Array(n).fill(false);
        const src = 0;
        ctx.line(3);
        dist[src] = 0;
        g.vertices[src].tag = '0';
        g._commit({ type: 'snapshot', payload: {}, description: `dist[${vertices[src].label}] = 0` });
        log.printInfo(`从 ${vertices[src].label} 开始`);

        ctx.line(4);
        for (let i = 0; i < n; i++) {
            ctx.line(5);
            let u = -1, min = Infinity;
            ctx.line(6);
            for (let j = 0; j < n; j++) {
                if (!visited[j] && dist[j] < min) {
                    ctx.line(7);
                    min = dist[j]; u = j;
                }
            }
            ctx.line(9);
            if (u === -1) break;
            ctx.line(10);
            visited[u] = true;
            g.vertices[u].state = 'tree';
            g.vertices[u].tag = String(dist[u]);
            g._commit({ type: 'visit', payload: { vertex: u }, description: `选中 ${vertices[u].label} (dist=${dist[u]})` });
            log.printSuccess(`确定 ${vertices[u].label}，dist = ${dist[u]}`);
            ctx.line(11);
            for (const [v, w] of adj[u]) {
                ctx.line(12);
                if (!visited[v] && dist[u] + w < dist[v]) {
                    ctx.line(13);
                    dist[v] = dist[u] + w;
                    g.setDist(v, dist[v]);
                    g.highlightEdge(u, v, '#58a6ff', `松弛: ${dist[u]}+${w}=${dist[v]}`);
                    log.printInfo(`松弛 ${vertices[u].label} → ${vertices[v].label}，dist = ${dist[v]}`);
                }
            }
        }
        log.printSuccess('Dijkstra 完成');
    }

    // ====================================================================
    // 字符串 P1
    // ====================================================================

    // ===== 最长公共子串 =====
    const lcsSubstrCode = `function longestCommonSubstring(s1, s2) {
  const m = s1.length, n = s2.length;
  const dp = Array.from({length: m+1}, () => new Array(n+1).fill(0));
  let maxLen = 0, endIdx = 0;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i-1] === s2[j-1]) {
        dp[i][j] = dp[i-1][j-1] + 1;
        if (dp[i][j] > maxLen) {
          maxLen = dp[i][j];
          endIdx = i;
        }
      }
    }
  }
  return s1.substring(endIdx - maxLen, endIdx);
}`;
    function lcsSubstrRun(ctx) {
        const s1 = 'ABABC', s2 = 'BABCAD';
        const m = s1.length, n = s2.length;
        const dp = ctx.add(new DPTableTracer('dp', m + 1, n + 1));
        // 行列标签
        dp.rowLabels = ['∅', ...s1.split('')];
        dp.colLabels = ['∅', ...s2.split('')];
        const log = ctx.add(new LogTracer('log'));
        log.printInfo(`s1 = "${s1}", s2 = "${s2}"`);

        let maxLen = 0, endI = 0, endJ = 0;
        ctx.line(2);
        for (let i = 1; i <= m; i++) {
            ctx.line(3);
            for (let j = 1; j <= n; j++) {
                ctx.line(4);
                if (s1[i - 1] === s2[j - 1]) {
                    ctx.line(5);
                    dp.cells[i][j].value = dp.cells[i - 1][j - 1].value + 1;
                    dp.cells[i][j].state = 'current';
                    dp._commit({
                        type: 'visit',
                        payload: { row: i, col: j },
                        description: `s1[${i - 1}]=${s1[i - 1]} = s2[${j - 1}]=${s2[j - 1]}，dp[${i}][${j}] = ${dp.cells[i][j].value}`
                    });
                    if (dp.cells[i][j].value > maxLen) {
                        ctx.line(6);
                        maxLen = dp.cells[i][j].value;
                        endI = i; endJ = j;
                        dp.cells[i][j].state = 'sorted';
                        dp._commit({ type: 'mark', payload: { row: i, col: j }, description: `更新最大值 ${maxLen}` });
                        log.printSuccess(`更新最大长度 = ${maxLen}`);
                    }
                    dp.cells[i][j].state = 'default';
                } else {
                    dp.cells[i][j].value = 0;
                    dp.cells[i][j].state = 'visited';
                    dp._commit({
                        type: 'visit',
                        payload: { row: i, col: j },
                        description: `s1[${i - 1}]=${s1[i - 1]} ≠ s2[${j - 1}]=${s2[j - 1]}，dp[${i}][${j}] = 0`
                    });
                    dp.cells[i][j].state = 'default';
                }
            }
        }
        // 高亮最大值位置
        dp.cells[endI][endJ].state = 'sorted';
        dp._commit({ type: 'snapshot', payload: {}, description: `最长公共子串长度 = ${maxLen}` });
        log.printSuccess(`最长公共子串: "${s1.substring(endI - maxLen, endI)}"，长度 ${maxLen}`);
    }

    // ====================================================================
    // 经典问题 P1
    // ====================================================================

    // ===== 二分搜索（递归） =====
    const binarySearchRecCode = `function binarySearch(arr, target, lo, hi) {
  if (lo > hi) return -1;
  const mid = (lo + hi) >> 1;
  if (arr[mid] === target) return mid;
  if (arr[mid] > target) return binarySearch(arr, target, lo, mid - 1);
  return binarySearch(arr, target, mid + 1, hi);
}`;
    function binarySearchRecRun(ctx, data) {
        const sorted = (data && data.length) ? data.slice().sort((a, b) => a - b) : [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
        const arr = ctx.add(new ArrayTracer('arr', sorted));
        const log = ctx.add(new LogTracer('log'));
        const target = sorted[Math.floor(sorted.length / 2)];
        log.printInfo(`查找 target = ${target}`);

        function search(lo, hi, depth) {
            ctx.line(1);
            if (lo > hi) {
                ctx.line(2);
                log.printError(`未找到（区间空）`);
                return -1;
            }
            ctx.line(3);
            const mid = (lo + hi) >> 1;
            arr.setPointers([
                { index: lo, label: 'lo', color: '#58a6ff' },
                { index: mid, label: 'mid', color: '#bc8cff' },
                { index: hi, label: 'hi', color: '#d29922' }
            ]);
            arr.highlightRange(lo, hi, '#f78166');
            log.printInfo(`[深度${depth}] lo=${lo}, hi=${hi}, mid=${mid}, arr[${mid}]=${arr.items[mid].value}`);
            ctx.line(4);
            if (arr.items[mid].value === target) {
                ctx.line(5);
                arr.highlight(mid, 'sorted', `找到 target=${target}`);
                log.printSuccess(`命中 arr[${mid}] = ${target}`);
                return mid;
            }
            ctx.line(6);
            if (arr.items[mid].value > target) {
                log.printInfo(`${arr.items[mid].value} > ${target}，递归左半 [${lo}..${mid - 1}]`);
                return search(lo, mid - 1, depth + 1);
            }
            ctx.line(7);
            log.printInfo(`${arr.items[mid].value} < ${target}，递归右半 [${mid + 1}..${hi}]`);
            return search(mid + 1, hi, depth + 1);
        }
        search(0, sorted.length - 1, 0);
    }

    // ===== 完全背包 =====
    const completeKnapsackCode = `function completeKnapsack(W, weights, values) {
  const n = weights.length;
  const dp = new Array(W + 1).fill(0);
  for (let i = 0; i < n; i++) {
    for (let w = weights[i]; w <= W; w++) {
      // 正序遍历：每个物品可重复使用
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }
  return dp[W];
}`;
    function completeKnapsackRun(ctx) {
        const weights = [2, 3, 4, 5];
        const values = [3, 4, 5, 6];
        const W = 8;
        const n = weights.length;
        const dp = ctx.add(new DPTableTracer('dp', 1, W + 1));
        dp.rowLabels = ['dp'];
        dp.colLabels = Array.from({ length: W + 1 }, (_, i) => i);
        const log = ctx.add(new LogTracer('log'));
        log.printInfo(`完全背包：W=${W}, weights=${weights.join(',')}, values=${values.join(',')}`);

        const dpArr = new Array(W + 1).fill(0);
        for (let i = 0; i < n; i++) {
            ctx.line(3);
            log.printInfo(`考虑物品 ${i} (w=${weights[i]}, v=${values[i]})`);
            ctx.line(4);
            for (let w = weights[i]; w <= W; w++) {
                ctx.line(5);
                dp.cells[0][w].state = 'current';
                ctx.line(6);
                if (dpArr[w - weights[i]] + values[i] > dpArr[w]) {
                    dpArr[w] = dpArr[w - weights[i]] + values[i];
                    dp.cells[0][w].value = dpArr[w];
                    dp.cells[0][w].state = 'sorted';
                    dp._commit({
                        type: 'visit',
                        payload: { col: w },
                        description: `dp[${w}] = max(dp[${w}], dp[${w - weights[i]}]+${values[i]}) = ${dpArr[w]}`
                    });
                    log.printSuccess(`更新 dp[${w}] = ${dpArr[w]}`);
                } else {
                    dp._commit({
                        type: 'visit',
                        payload: { col: w },
                        description: `dp[${w}] 保持 ${dpArr[w]}`
                    });
                }
                dp.cells[0][w].state = 'default';
            }
        }
        log.printSuccess(`完全背包最大价值 = ${dpArr[W]}`);
    }

    // ===== 汉诺塔 =====
    const hanoiCode = `function hanoi(n, from, to, via) {
  if (n === 0) return;
  hanoi(n - 1, from, via, to);
  console.log(\`Move disk \${n}: \${from} → \${to}\`);
  hanoi(n - 1, via, to, from);
}`;
    function hanoiRun(ctx, data) {
        const n = (data && data[0]) || 3;
        const rods = [[], [], []];
        for (let i = n; i >= 1; i--) rods[0].push(i);
        // 使用 3 个数组表示 3 根柱子
        const rodA = ctx.add(new ArrayTracer('A', rods[0].slice()));
        const rodB = ctx.add(new ArrayTracer('B', []));
        const rodC = ctx.add(new ArrayTracer('C', []));
        const log = ctx.add(new LogTracer('log'));
        const labels = ['A', 'B', 'C'];
        const rodsArr = [rodA, rodB, rodC];
        rodA._commit({ type: 'init', payload: {}, description: `初始：${n} 个盘子在 A` });
        log.printInfo(`n = ${n}，从 A 移到 C，借助 B`);

        let stepCount = 0;
        function move(from, to) {
            const disk = rods[from].pop();
            rods[to].push(disk);
            // 同步到 Tracer
            rodsArr[from].items.pop();
            rodsArr[to].items.push({ value: disk, state: 'current' });
            stepCount++;
            rodsArr[to]._commit({
                type: 'set',
                payload: { from, to, disk },
                description: `第 ${stepCount} 步：移动盘子 ${disk} ${labels[from]} → ${labels[to]}`
            });
            rodsArr[to].items[rodsArr[to].items.length - 1].state = 'default';
            log.printInfo(`第 ${stepCount} 步：${disk}号盘 ${labels[from]} → ${labels[to]}`);
        }
        function hanoi(m, from, to, via) {
            ctx.line(1);
            if (m === 0) {
                ctx.line(2);
                return;
            }
            ctx.line(3);
            hanoi(m - 1, from, via, to);
            ctx.line(4);
            move(from, to);
            ctx.line(5);
            hanoi(m - 1, via, to, from);
        }
        hanoi(n, 0, 2, 1);
        log.printSuccess(`汉诺塔完成，共 ${stepCount} 步（2^n - 1 = ${Math.pow(2, n) - 1}）`);
    }
    function buildHanoiState(tracerStates) {
        // 三个数组横向排列；铺满动画区高度，避免被底部代码/日志区遮挡
        const state = { shapes: [] };
        const names = ['A', 'B', 'C'];
        const colors = ['#58a6ff', '#bc8cff', '#3fb950'];
        const cw = window.app?.renderer?.width || 800;
        const ch = window.app?.renderer?.height || 400;
        // 三列自适应：画布窄时压缩列宽，保证三根柱子及盘子不被裁出画布
        const colW = Math.min(240, (cw - 48) / 3);
        const startX = (cw - 3 * colW) / 2;
        // 垂直方向：标签贴近内容，底座贴近动画区底部但留边距
        const bottomMargin = 16;
        const baseY = ch - bottomMargin - 8;
        const labelY = 42;
        const poleTop = labelY + 16;
        const usableH = Math.max(120, baseY - poleTop);
        const baseW = Math.max(40, colW - 36);
        const maxDiskW = baseW - 8;
        const minDiskW = Math.max(28, Math.round(maxDiskW * 0.28));
        // 根据盘子数量计算单个盘子高度，确保在可用高度内完整堆叠
        const allValues = [];
        for (let r = 0; r < 3; r++) {
            const snap = tracerStates[names[r]];
            if (!snap) continue;
            snap.items.forEach(it => { if (it.value !== undefined && it.value !== null) allValues.push(Number(it.value)); });
        }
        const maxVal = Math.max(1, ...allValues);
        // 盘子高度按可用高度铺满整列（避免顶部 ABC 与下方盘子之间留白过大）
        const diskGapEst = 3;
        const diskH = Math.max(18, Math.min(42, Math.floor((usableH - maxVal * diskGapEst) / maxVal)));
        const diskGap = Math.max(2, Math.floor(diskH / 10));

        for (let r = 0; r < 3; r++) {
            const name = names[r];
            const snap = tracerStates[name];
            if (!snap) continue;
            const colX = startX + r * colW;
            const items = snap.items;
            // 柱子标签（靠近柱子顶端，不再远离动画主体）
            state.shapes.push({
                kind: 'text',
                x: colX + colW / 2, y: labelY,
                text: name, color: colors[r], fontSize: 16, align: 'center', opts: { bold: true }
            });
            // 柱子竖杆：把 ABC 标签与下方盘子视觉上连接起来
            state.shapes.push({
                kind: 'line',
                x1: colX + colW / 2, y1: poleTop,
                x2: colX + colW / 2, y2: baseY,
                color: '#6e7681', width: 3
            });
            // 底座
            state.shapes.push({
                kind: 'rect',
                x: colX + (colW - baseW) / 2, y: baseY, w: baseW, h: 8,
                color: '#484f58', radius: 2, label: '', opts: {}
            });
            // 盘子从底向上
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                if (it.value === undefined || it.value === null || it.value === '') continue;
                const v = Number(it.value);
                const ratio = Math.min(1, (v + 1) / (maxVal + 1));
                const diskW = Math.max(minDiskW, Math.round(maxDiskW * (0.32 + 0.68 * ratio)));
                const x = colX + colW / 2 - diskW / 2;
                const y = baseY - 8 - (i + 1) * (diskH + diskGap) + diskGap;
                state.shapes.push({
                    kind: 'rect',
                    x, y, w: diskW, h: diskH,
                    color: it.state === 'current' ? '#d29922' : colors[r],
                    radius: 4,
                    label: String(it.value),
                    opts: { stroke: '#1c2128', strokeWidth: 1.5, fontSize: Math.max(11, Math.floor(diskH * 0.45)) }
                });
            }
        }
        return state;
    }

    // ====================================================================
    // 注册
    // ====================================================================
    const algos = [
        // 排序 P1
        {
            id: 'sorting.quickIter',
            name: '快速排序（非递归）', category: 'sorting', level: 'P1',
            complexity: { time: 'O(n log n)', space: 'O(log n)' },
            keywords: ['quick', 'iterative', 'stack', 'kuai su'],
            mnemonic: '显式栈模拟递归，区间入栈再分区',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>使用显式栈模拟递归调用，避免递归栈溢出。每次取出区间→分区→把左右子区间压栈。</p>
                <h3>对比</h3><p>与递归版逻辑等价，但空间由手动栈控制。</p>
            </div>`,
            code: quickIterCode,
            defaultData: DEFAULT_ARR,
            dataParser: NUM_DATA,
            run: quickIterRun
        },
        {
            id: 'sorting.mergeBottomUp',
            name: '归并排序（自底向上）', category: 'sorting', level: 'P1',
            complexity: { time: 'O(n log n)', space: 'O(n)' },
            keywords: ['merge', 'bottom up', 'iterative', 'gui bing'],
            mnemonic: '从一倍增两两合，无需递归自底起',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>从 size=1 开始，两两合并相邻子数组，size 倍增直到覆盖整个数组。无需递归。</p>
            </div>`,
            code: mergeBottomUpCode,
            defaultData: DEFAULT_ARR,
            dataParser: NUM_DATA,
            run: mergeBottomUpRun
        },
        {
            id: 'sorting.shell',
            name: '希尔排序', category: 'sorting', level: 'P1',
            complexity: { time: 'O(n^1.3)', space: 'O(1)' },
            keywords: ['shell', 'gap', 'xi er'],
            mnemonic: '分组插入缩步长，gap递减终为一',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>分组插入排序：以 gap 为步长分组，gap 递减直至 1。提前让元素大体有序，减少插入排序的移动次数。</p>
            </div>`,
            code: shellSortCode,
            defaultData: DEFAULT_ARR,
            dataParser: NUM_DATA,
            run: shellSortRun
        },
        {
            id: 'sorting.counting',
            name: '计数排序', category: 'sorting', level: 'P1',
            complexity: { time: 'O(n+k)', space: 'O(k)' },
            keywords: ['counting', 'ji shu'],
            mnemonic: '统计次数按值填，非比排序整数限',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>统计每个值出现次数，再按值顺序回填。非比较排序，时间 O(n+k)。</p>
                <h3>限制</h3><p>仅适用于值域较小的整数。</p>
            </div>`,
            code: countingSortCode,
            defaultData: [3, 1, 4, 1, 5, 9, 2, 6, 5, 3],
            dataParser: NUM_DATA,
            run: countingSortRun
        },

        // 线性 P1
        {
            id: 'linear.doublyList',
            name: '双向链表 - 插入/删除', category: 'linear', level: 'P1',
            complexity: { time: 'O(n)', space: 'O(1)' },
            keywords: ['doubly', 'linked list', 'shuang xiang'],
            mnemonic: '前后双指互链接，反向遍历删除易',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>每个节点维护 prev 和 next 两个指针。插入/删除时双向修改前后节点的指针。</p>
                <h3>优势</h3><p>支持 O(1) 反向遍历，删除节点仅需给定节点本身（无需前驱）。</p>
            </div>`,
            code: doublyListCode,
            run: doublyListRun
        },
        {
            id: 'linear.circularQueue',
            name: '循环队列', category: 'linear', level: 'P1',
            complexity: { time: 'O(1)', space: 'O(k)' },
            keywords: ['circular', 'queue', 'xun huan'],
            mnemonic: '数组取模首尾连，入出均一免搬移',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>用数组 + 取模索引实现队列，避免普通数组队列 dequeue 时 O(n) 的元素搬移。</p>
                <h3>关键</h3><p>tail = (head + size) % cap，head = (head + 1) % cap。</p>
            </div>`,
            code: circularQueueCode,
            run: circularQueueRun
        },
        {
            id: 'linear.lru',
            name: 'LRU 缓存', category: 'linear', level: 'P1',
            complexity: { time: 'O(1)', space: 'O(cap)' },
            keywords: ['lru', 'cache', '淘汰'],
            mnemonic: '哈希双向链表配，访问移头满删尾',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>使用哈希表 + 双向链表。访问/插入时把节点移到头部；满时淘汰尾部节点。</p>
                <h3>典型应用</h3><p>Redis 缓存淘汰、操作系统页面置换。</p>
            </div>`,
            code: lruCode,
            run: lruRun
        },

        // 树 P1
        {
            id: 'tree.preorderIter',
            name: '二叉树 - 前序遍历（非递归）', category: 'tree', level: 'P1',
            complexity: { time: 'O(n)', space: 'O(h)' },
            keywords: ['preorder', 'iterative', 'qian xu'],
            mnemonic: '显式栈压右再左，弹出即访序不乱',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>使用显式栈模拟递归：先压右子，再压左子，弹出时访问。</p>
            </div>`,
            code: preorderIterCode,
            run: preorderIterRun,
            buildState: buildBinaryTreeState
        },
        {
            id: 'tree.inorderIter',
            name: '二叉树 - 中序遍历（非递归）', category: 'tree', level: 'P1',
            complexity: { time: 'O(n)', space: 'O(h)' },
            keywords: ['inorder', 'iterative', 'zhong xu'],
            mnemonic: '左链下钻一路压，弹访转右循环走',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>沿左子链一路下钻并压栈，到尽头后弹出访问，再转向右子。</p>
            </div>`,
            code: inorderIterCode,
            run: inorderIterRun,
            buildState: buildBinaryTreeState
        },
        {
            id: 'tree.bstInsertIter',
            name: 'BST - 插入（非递归）', category: 'tree', level: 'P1',
            complexity: { time: 'O(log n)', space: 'O(1)' },
            keywords: ['bst', 'insert', 'iterative'],
            mnemonic: '迭代下降比大小，遇空即插无栈耗',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>迭代下降：比较当前节点，决定走向左/右子树；遇到空位即插入新节点。空间 O(1)（无需递归栈）。</p>
            </div>`,
            code: bstInsertIterCode,
            defaultData: [50, 30, 70, 20, 40, 60, 80, 35, 45],
            dataParser: (s) => s.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n)),
            run: bstInsertIterRun,
            buildState: buildBinaryTreeState
        },
        {
            id: 'tree.ufFindIter',
            name: '并查集 - Find（非递归）', category: 'tree', level: 'P1',
            complexity: { time: 'α(n)', space: 'O(1)' },
            keywords: ['union find', 'find', 'iterative', 'path compression'],
            mnemonic: '两遍迭代找根挂，路径压缩同样行',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>两遍迭代：第一遍循环找到根；第二遍把路径上所有节点直接挂到根下，完成路径压缩。</p>
            </div>`,
            code: ufFindIterCode,
            run: ufFindIterRun,
            buildState: buildUFState
        },

        // 图 P1
        {
            id: 'graph.dfsIter',
            name: 'DFS - 非递归', category: 'graph', level: 'P1',
            complexity: { time: 'O(V+E)', space: 'O(V)' },
            keywords: ['dfs', 'iterative', 'stack'],
            mnemonic: '显式栈替代递归，弹出查重防重复',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>使用显式栈替代递归。注意：弹出后需检查是否已访问，避免重复处理。</p>
            </div>`,
            code: dfsIterCode,
            run: dfsIterRun,
            buildState: buildGraphState
        },
        {
            id: 'graph.topoDfs',
            name: '拓扑排序 - DFS 逆后序', category: 'graph', level: 'P1',
            complexity: { time: 'O(V+E)', space: 'O(V)' },
            keywords: ['topological', 'dfs', 'ni hou xu'],
            mnemonic: '深度搜索记完成，逆后序即拓扑序',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>对 DAG 做 DFS，节点完成时加入结果头部。逆后序即为拓扑序。</p>
            </div>`,
            code: topoDfsCode,
            run: topoDfsRun,
            buildState: buildDAGState
        },
        {
            id: 'graph.dijkstraNaive',
            name: 'Dijkstra（朴素版）', category: 'graph', level: 'P1',
            complexity: { time: 'O(V²)', space: 'O(V)' },
            keywords: ['dijkstra', 'naive', 'array'],
            mnemonic: '数组线性扫最小，稠密图上更占优',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>数组实现：每轮线性扫描找最小 dist 节点。无优先队列，时间 O(V²)，稠密图上反而更优。</p>
            </div>`,
            code: dijkstraNaiveCode,
            run: dijkstraNaiveRun,
            buildState: buildGraphState
        },

        // 字符串 P1
        {
            id: 'string.lcsSubstr',
            name: '最长公共子串', category: 'string', level: 'P1',
            complexity: { time: 'O(m·n)', space: 'O(m·n)' },
            keywords: ['lcs', 'substring', 'zui chang gong gong zi chuan'],
            mnemonic: '相等斜加一，不等归零重开始',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>dp[i][j] = 以 s1[i-1]、s2[j-1] 结尾的最长公共子串长度。</p>
                <h3>状态转移</h3>
                <ul>
                    <li>s1[i-1] = s2[j-1]: dp[i][j] = dp[i-1][j-1] + 1</li>
                    <li>否则: dp[i][j] = 0（重新开始）</li>
                </ul>
                <p>与 LCS 不同：子串必须连续，故不等时直接归零。</p>
            </div>`,
            code: lcsSubstrCode,
            run: lcsSubstrRun
        },

        // 经典 P1
        {
            id: 'classic.binarySearchRec',
            name: '二分搜索（递归）', category: 'classic', level: 'P1',
            complexity: { time: 'O(log n)', space: 'O(log n)' },
            keywords: ['binary', 'recursive', 'er fen'],
            mnemonic: '递归折半查中点，左右择一深入找',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>递归二分：每次比较中点，根据大小递归左半或右半。空间 O(log n)（递归栈）。</p>
            </div>`,
            code: binarySearchRecCode,
            defaultData: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19],
            dataParser: (s) => s.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n)).sort((a, b) => a - b),
            run: binarySearchRecRun
        },
        {
            id: 'classic.completeKnapsack',
            name: '完全背包 (DP)', category: 'classic', level: 'P1',
            complexity: { time: 'O(nW)', space: 'O(W)' },
            keywords: ['knapsack', 'complete', 'wan quan bei bao'],
            mnemonic: '物品无限正序遍，可重复用取最大',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>每个物品可使用无限次。与 0-1 背包对比：内层 w 正序遍历（允许重复使用同一物品）。</p>
                <h3>状态转移</h3><p>dp[w] = max(dp[w], dp[w - weights[i]] + values[i])</p>
            </div>`,
            code: completeKnapsackCode,
            run: completeKnapsackRun
        },
        {
            id: 'classic.hanoi',
            name: '汉诺塔', category: 'classic', level: 'P1',
            complexity: { time: 'O(2ⁿ)', space: 'O(n)' },
            keywords: ['hanoi', 'tower', 'han nuo ta'],
            mnemonic: 'n减一借柱先移走，最大落座再回归',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>递归：把 n-1 个盘子从 A 移到 B（借助 C），再把第 n 个盘子从 A 移到 C，最后把 n-1 个盘子从 B 移到 C。</p>
                <h3>复杂度</h3><p>时间 O(2ⁿ)，移动次数 2ⁿ - 1。</p>
            </div>`,
            code: hanoiCode,
            defaultData: [3],
            dataParser: (s) => [Math.min(6, Math.max(1, parseInt(s.split(',')[0], 10) || 3))],
            run: hanoiRun,
            buildState: buildHanoiState
        }
    ];

    algos.forEach(a => AlgorithmLoader.register(a.id, a));
})();
