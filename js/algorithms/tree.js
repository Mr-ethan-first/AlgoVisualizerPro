/**
 * 树结构与堆 P0 算法
 * 包含：二叉树前序/中序/层序遍历、BST 插入/查找/删除、AVL 插入、堆 插入/删除堆顶/建堆、并查集 Find/Union
 */
(function () {
    'use strict';

    // 树状态构建器：统一使用公共实现（js/core/stateBuilders.js）
    const buildBinaryTreeState = StateBuilders.buildBinaryTreeState;
    // 堆状态构建器：数组 + 树 双视图（堆数组即完全二叉树）
    const buildHeapState = StateBuilders.buildHeapState;

    // 通用：构造一棵示例二叉树
    function buildSampleTree() {
        //       1
        //      / \
        //     2   3
        //    / \   \
        //   4   5   6
        //      /
        //     7
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

    // ===== 前序遍历（递归） =====
    const preorderCode = `function preorder(node) {
  if (node === null) return;
  visit(node);
  preorder(node.left);
  preorder(node.right);
}`;
    function preorderRun(ctx) {
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
            tree.visit(idx);
            stack.push(tree.nodes[idx].value, `调用 preorder(${tree.nodes[idx].value})`);
            visited.push(tree.nodes[idx].value);
            log.printInfo(`访问 ${tree.nodes[idx].value} → 序列: [${visited.join(', ')}]`);
            ctx.line(4);
            dfs(tree.nodes[idx].left);
            ctx.line(5);
            dfs(tree.nodes[idx].right);
            stack.pop(`返回 from ${tree.nodes[idx].value}`);
        }
        dfs(tree.root);
        ctx.line(2);
        log.printSuccess(`前序遍历完成: [${visited.join(', ')}]`);
    }

    // ===== 中序遍历（递归） =====
    const inorderCode = `function inorder(node) {
  if (node === null) return;
  inorder(node.left);
  visit(node);
  inorder(node.right);
}`;
    function inorderRun(ctx) {
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
            stack.push(tree.nodes[idx].value, `调用 inorder(${tree.nodes[idx].value})`);
            dfs(tree.nodes[idx].left);
            ctx.line(4);
            tree.visit(idx);
            visited.push(tree.nodes[idx].value);
            log.printInfo(`访问 ${tree.nodes[idx].value} → 序列: [${visited.join(', ')}]`);
            ctx.line(5);
            dfs(tree.nodes[idx].right);
            stack.pop(`返回 from ${tree.nodes[idx].value}`);
        }
        dfs(tree.root);
        ctx.line(2);
        log.printSuccess(`中序遍历完成: [${visited.join(', ')}]`);
    }

    // ===== 层序遍历（队列） =====
    const levelorderCode = `function levelorder(root) {
  if (root === null) return;
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    visit(node);
    if (node.left) queue.push(node.left);
    if (node.right) queue.push(node.right);
  }
}`;
    function levelorderRun(ctx) {
        const nodes = buildSampleTree();
        const tree = ctx.add(new TreeTracer('tree', nodes));
        const q = ctx.add(new QueueTracer('queue'));
        const log = ctx.add(new LogTracer('log'));
        const visited = [];
        ctx.line(2);
        const queue = [tree.root];
        q.enqueue(tree.root);
        while (queue.length > 0) {
            ctx.line(4);
            const idx = queue.shift();
            q.dequeue();
            ctx.line(5);
            tree.visit(idx);
            visited.push(tree.nodes[idx].value);
            log.printInfo(`访问 ${tree.nodes[idx].value} → 序列: [${visited.join(', ')}]`);
            ctx.line(6);
            if (tree.nodes[idx].left !== null && tree.nodes[idx].left !== undefined) {
                queue.push(tree.nodes[idx].left);
                q.enqueue(tree.nodes[idx].left);
            }
            ctx.line(7);
            if (tree.nodes[idx].right !== null && tree.nodes[idx].right !== undefined) {
                queue.push(tree.nodes[idx].right);
                q.enqueue(tree.nodes[idx].right);
            }
        }
        ctx.line(4);
        log.printSuccess(`层序遍历完成: [${visited.join(', ')}]`);
    }

    // ===== BST 插入 =====
    const bstInsertCode = `function insert(root, val) {
  if (root === null) return new Node(val);
  if (val < root.val) {
    root.left = insert(root.left, val);
  } else if (val > root.val) {
    root.right = insert(root.right, val);
  }
  return root;
}`;
    function bstInsertRun(ctx, data) {
        const values = (data && data.length) ? data : [50, 30, 70, 20, 40, 60, 80, 35, 45];
        const tree = ctx.add(new TreeTracer('tree', []));
        const log = ctx.add(new LogTracer('log'));
        tree.root = null;

        function insertAt(idx, value) {
            ctx.line(1);
            if (idx === null) {
                // 在数组末尾添加新节点
                const newIdx = tree.nodes.length;
                tree.nodes[newIdx] = {
                    value, left: null, right: null, parent: null, state: 'default', tag: '', hidden: false
                };
                tree.nodes[newIdx].state = 'current';
                tree._commit({
                    type: 'visit',
                    payload: { node: newIdx },
                    description: `创建节点 ${value}`
                });
                tree.nodes[newIdx].state = 'default';
                return newIdx;
            }
            ctx.line(2);
            if (value < tree.nodes[idx].value) {
                ctx.line(3);
                tree.highlight(idx, 'current', `${value} < ${tree.nodes[idx].value}`);
                tree._commit({ type: 'snapshot', payload: {}, description: `${value} < ${tree.nodes[idx].value}，递归左子树` });
                tree.nodes[idx].state = 'default';
                const left = insertAt(tree.nodes[idx].left, value);
                tree.nodes[idx].left = left;
                tree.nodes[left].parent = idx;
                tree.highlightEdge(idx, left, '#3fb950');
            } else if (value > tree.nodes[idx].value) {
                ctx.line(4);
                tree.highlight(idx, 'current', `${value} > ${tree.nodes[idx].value}`);
                tree._commit({ type: 'snapshot', payload: {}, description: `${value} > ${tree.nodes[idx].value}，递归右子树` });
                tree.nodes[idx].state = 'default';
                const right = insertAt(tree.nodes[idx].right, value);
                tree.nodes[idx].right = right;
                tree.nodes[right].parent = idx;
                tree.highlightEdge(idx, right, '#3fb950');
            }
            ctx.line(6);
            return idx;
        }

        for (const v of values) {
            ctx.line(1);
            log.printInfo(`插入 ${v}`);
            tree.root = insertAt(tree.root, v);
        }
        tree.done();
        log.printSuccess(`BST 构建完成，共 ${values.length} 个节点`);
    }

    // ===== BST 查找 =====
    const bstSearchCode = `function search(root, target) {
  if (root === null) return null;
  if (target === root.val) return root;
  if (target < root.val) return search(root.left, target);
  return search(root.right, target);
}`;
    function bstSearchRun(ctx) {
        const tree = ctx.add(new TreeTracer('tree', [
            { value: 50, left: 1, right: 2, parent: null },
            { value: 30, left: 3, right: 4, parent: 0 },
            { value: 70, left: 5, right: 6, parent: 0 },
            { value: 20, left: null, right: null, parent: 1 },
            { value: 40, left: null, right: null, parent: 1 },
            { value: 60, left: null, right: null, parent: 2 },
            { value: 80, left: null, right: null, parent: 2 }
        ]));
        const log = ctx.add(new LogTracer('log'));
        const target = 60;
        log.printInfo(`查找目标值 ${target}`);
        let cur = tree.root;
        function dfs(idx) {
            ctx.line(1);
            if (idx === null) {
                ctx.line(2);
                log.printError('未找到');
                return;
            }
            ctx.line(3);
            tree.highlight(idx, 'current', `${tree.nodes[idx].value}`);
            if (target === tree.nodes[idx].value) {
                ctx.line(3);
                tree.highlight(idx, 'sorted', `找到 ${target}`);
                log.printSuccess(`找到 ${target}！`);
                return;
            }
            if (target < tree.nodes[idx].value) {
                ctx.line(4);
                log.printInfo(`${target} < ${tree.nodes[idx].value}，进入左子树`);
                dfs(tree.nodes[idx].left);
            } else {
                ctx.line(5);
                log.printInfo(`${target} > ${tree.nodes[idx].value}，进入右子树`);
                dfs(tree.nodes[idx].right);
            }
        }
        dfs(tree.root);
    }

    // ===== BST 删除 =====
    const bstDeleteCode = `function remove(root, val) {
  if (root === null) return null;
  if (val < root.val) root.left = remove(root.left, val);
  else if (val > root.val) root.right = remove(root.right, val);
  else {
    // 三种情况
    if (root.left === null) return root.right;
    if (root.right === null) return root.left;
    const succ = findMin(root.right);
    root.val = succ.val;
    root.right = remove(root.right, succ.val);
  }
  return root;
}`;
    function bstDeleteRun(ctx) {
        const tree = ctx.add(new TreeTracer('tree', [
            { value: 50, left: 1, right: 2, parent: null },
            { value: 30, left: 3, right: 4, parent: 0 },
            { value: 70, left: 5, right: 6, parent: 0 },
            { value: 20, left: null, right: null, parent: 1 },
            { value: 40, left: null, right: null, parent: 1 },
            { value: 60, left: null, right: null, parent: 2 },
            { value: 80, left: null, right: null, parent: 2 }
        ]));
        const log = ctx.add(new LogTracer('log'));
        const target = 50;
        log.printInfo(`删除节点 ${target}（双子情况）`);

        // 找到目标节点
        let cur = tree.root, parent = null;
        while (cur !== null && tree.nodes[cur].value !== target) {
            tree.highlight(cur, 'current', tree.nodes[cur].value);
            if (target < tree.nodes[cur].value) cur = tree.nodes[cur].left;
            else cur = tree.nodes[cur].right;
        }
        ctx.line(2);
        tree.highlight(cur, 'pivot', `删除目标 ${target}`);
        log.printInfo(`找到节点 ${target}，存在左右子树`);

        // 找右子树最小值（后继）
        ctx.line(8);
        let succ = tree.nodes[cur].right;
        let succParent = cur;
        while (tree.nodes[succ].left !== null) {
            tree.highlight(succ, 'visited', `后继候选 ${tree.nodes[succ].value}`);
            succParent = succ;
            succ = tree.nodes[succ].left;
        }
        tree.highlight(succ, 'sorted', `后继 ${tree.nodes[succ].value}`);
        log.printInfo(`后继节点 = ${tree.nodes[succ].value}`);

        // 用后继值替换目标值
        ctx.line(9);
        tree.nodes[cur].value = tree.nodes[succ].value;
        tree._commit({
            type: 'set',
            payload: { node: cur, value: tree.nodes[succ].value },
            description: `用后继值 ${tree.nodes[succ].value} 替换 ${target}`
        });

        // 删除后继节点
        ctx.line(10);
        if (succParent === cur) {
            tree.nodes[cur].right = tree.nodes[succ].right;
        } else {
            tree.nodes[succParent].left = tree.nodes[succ].right;
        }
        tree.nodes[succ].hidden = true;
        tree._commit({ type: 'snapshot', payload: {}, description: '删除原后继节点位置' });
        log.printSuccess(`删除完成，节点 ${target} 已被 ${tree.nodes[cur].value} 替换`);
        tree.done();
    }

    // ===== AVL 插入 =====
    const avlInsertCode = `function insert(node, val) {
  if (node === null) return new Node(val);
  if (val < node.val) node.left = insert(node.left, val);
  else if (val > node.val) node.right = insert(node.right, val);
  updateHeight(node);
  const bf = balanceFactor(node);
  // LL
  if (bf > 1 && val < node.left.val) return rotateRight(node);
  // RR
  if (bf < -1 && val > node.right.val) return rotateLeft(node);
  // LR
  if (bf > 1 && val > node.left.val) {
    node.left = rotateLeft(node.left);
    return rotateRight(node);
  }
  // RL
  if (bf < -1 && val < node.right.val) {
    node.right = rotateRight(node.right);
    return rotateLeft(node);
  }
  return node;
}`;
    function avlInsertRun(ctx, data) {
        const values = (data && data.length) ? data : [10, 20, 30, 40, 50, 25];
        const tree = ctx.add(new TreeTracer('tree', []));
        const log = ctx.add(new LogTracer('log'));
        tree.root = null;

        // AVL 树实现：使用对象引用而非数组下标（简化）
        // 转换：每次操作后把树展平回 nodes 数组
        // highlights：旋转等操作的参与节点值集合，展平时标记为 rotate（红色）状态，突出动画效果
        function flatten(root, highlights) {
            const hl = new Set(highlights || []);
            const nodes = [];
            const idxMap = new Map();
            function visit(n) {
                if (!n) return null;
                const idx = nodes.length;
                nodes.push({
                    value: n.val, left: null, right: null, parent: null,
                    state: hl.has(n.val) ? 'rotate' : 'default', tag: '', hidden: false
                });
                idxMap.set(n, idx);
                nodes[idx].left = visit(n.left);
                if (nodes[idx].left !== null) nodes[nodes[idx].left].parent = idx;
                nodes[idx].right = visit(n.right);
                if (nodes[idx].right !== null) nodes[nodes[idx].right].parent = idx;
                return idx;
            }
            visit(root);
            return nodes;
        }

        // flatten 展平后根恒在 index 0；tree.nodes 是普通属性赋值，不会同步 tree.root，
        // 必须显式置 root=0，否则布局引擎拿不到根、无法遍历整棵树（节点全堆在画布中心）
        function applyTree(nodes) {
            tree.nodes = nodes;
            tree.root = nodes.length ? 0 : null;
            return tree;
        }

        // 简单的 AVL 节点（含 parent 指针：旋转后需上溯更新全局根，保证可视化展平完整树）
        class AVLNode {
            constructor(v) { this.val = v; this.left = null; this.right = null; this.parent = null; this.height = 1; }
        }
        function height(n) { return n ? n.height : 0; }
        function updateHeight(n) { n.height = 1 + Math.max(height(n.left), height(n.right)); }
        function bf(n) { return n ? height(n.left) - height(n.right) : 0; }
        // 沿 parent 上溯找到当前真正的树根（旋转可能改变根节点，而 avlRoot 变量来不及更新）
        function topRoot(n) { while (n && n.parent) n = n.parent; return n; }
        function rotateRight(y) {
            const x = y.left;
            const T = x.right;
            x.right = y;
            y.left = T;
            if (T) T.parent = y;
            x.parent = y.parent;
            y.parent = x;
            updateHeight(y);
            updateHeight(x);
            return x;
        }
        function rotateLeft(x) {
            const y = x.right;
            const T = y.left;
            y.left = x;
            x.right = T;
            if (T) T.parent = x;
            y.parent = x.parent;
            x.parent = y;
            updateHeight(x);
            updateHeight(y);
            return y;
        }
        // 旋转 + 重连：旋转发生在子树时，父节点 child 指针仍指向旧根（如 20.right 仍指向 30），
        // 不重连则 flatten 展平会丢失整棵旋转子树；根节点旋转时 p 为 null 直接跳过。
        // 注意：必须旋转前保存原父节点——rotateLeft/rotateRight 内部已把 oldNode.parent 改为新根
        function rotateAt(node, dir) {
            const oldNode = node;
            const p = oldNode.parent; // 旋转前保存原父节点
            const newRoot = dir === 'left' ? rotateLeft(node) : rotateRight(node);
            if (p) {
                if (p.left === oldNode) p.left = newRoot;
                else p.right = newRoot;
            }
            return newRoot;
        }

        function insert(node, val) {
            ctx.line(1);
            if (!node) {
                ctx.line(2);
                log.printInfo(`创建节点 ${val}`);
                return new AVLNode(val);
            }
            if (val < node.val) {
                ctx.line(3);
                node.left = insert(node.left, val);
                if (node.left) node.left.parent = node;
            } else if (val > node.val) {
                ctx.line(4);
                node.right = insert(node.right, val);
                if (node.right) node.right.parent = node;
            } else return node;
            ctx.line(5);
            updateHeight(node);
            const balance = bf(node);
            ctx.line(6);
            // 展平并提交当前状态用于可视化
            applyTree(flatten(avlRoot));
            tree._commit({ type: 'snapshot', payload: {}, description: `更新高度，节点 ${node.val} 平衡因子 = ${balance}` });

            // LL
            if (balance > 1 && val < node.left.val) {
                ctx.line(7);
                log.printWarning(`LL 失衡，对 ${node.val} 右旋`);
                node = rotateAt(node, 'right');
                avlRoot = topRoot(node); // 旋转可能换根，上溯更新全局根
                applyTree(flatten(avlRoot, [node.val, node.right.val]));
                tree._commit({ type: 'rotate', payload: { node: node.val }, description: `LL → 右旋 ${node.val}（红=参与旋转）` });
            }
            // RR
            else if (balance < -1 && val > node.right.val) {
                ctx.line(9);
                log.printWarning(`RR 失衡，对 ${node.val} 左旋`);
                node = rotateAt(node, 'left');
                avlRoot = topRoot(node);
                applyTree(flatten(avlRoot, [node.val, node.left.val]));
                tree._commit({ type: 'rotate', payload: { node: node.val }, description: `RR → 左旋 ${node.val}（红=参与旋转）` });
            }
            // LR
            else if (balance > 1 && val > node.left.val) {
                ctx.line(11);
                log.printWarning(`LR 失衡：先左旋 ${node.left.val}，再右旋 ${node.val}`);
                const oldLeftVal = node.left.val;
                node.left = rotateAt(node.left, 'left');
                avlRoot = topRoot(node);
                applyTree(flatten(avlRoot, [node.left.val, oldLeftVal]));
                tree._commit({ type: 'rotate', payload: {}, description: `LR → 左旋 ${oldLeftVal}（红=参与旋转）` });
                node = rotateAt(node, 'right');
                avlRoot = topRoot(node);
                applyTree(flatten(avlRoot, [node.val, node.right.val]));
                tree._commit({ type: 'rotate', payload: { node: node.val }, description: `LR → 右旋 ${node.val}（红=参与旋转）` });
            }
            // RL
            else if (balance < -1 && val < node.right.val) {
                ctx.line(15);
                log.printWarning(`RL 失衡：先右旋 ${node.right.val}，再左旋 ${node.val}`);
                const oldRightVal = node.right.val;
                node.right = rotateAt(node.right, 'right');
                avlRoot = topRoot(node);
                applyTree(flatten(avlRoot, [node.right.val, oldRightVal]));
                tree._commit({ type: 'rotate', payload: {}, description: `RL → 右旋 ${oldRightVal}（红=参与旋转）` });
                node = rotateAt(node, 'left');
                avlRoot = topRoot(node);
                applyTree(flatten(avlRoot, [node.val, node.left.val]));
                tree._commit({ type: 'rotate', payload: { node: node.val }, description: `RL → 左旋 ${node.val}（红=参与旋转）` });
            }
            ctx.line(18);
            return node;
        }

        let avlRoot = null;
        for (const v of values) {
            log.printInfo(`插入 ${v}`);
            avlRoot = insert(avlRoot, v);
            applyTree(flatten(avlRoot));
            tree._commit({ type: 'snapshot', payload: {}, description: `插入 ${v} 后的 AVL 树` });
        }
        tree.done();
        log.printSuccess(`AVL 树构建完成（${values.length} 节点）`);
    }

    // ===== 堆 - 插入（上浮） =====
    const heapInsertCode = `function heapInsert(heap, x) {
  heap.push(x);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (heap[i] > heap[parent]) {
      [heap[i], heap[parent]] = [heap[parent], heap[i]];
      i = parent;
    } else break;
  }
}`;
    function heapInsertRun(ctx, data) {
        const values = data.length ? data : [50, 30, 70, 20, 60, 90];
        const arr = ctx.add(new ArrayTracer('array', []));
        const log = ctx.add(new LogTracer('log'));
        log.printInfo('构建最大堆（逐个插入）');

        for (const x of values) {
            ctx.line(1);
            arr.items.push({ value: x, state: 'current' });
            arr._commit({ type: 'push', payload: { value: x }, description: `push(${x})` });
            let i = arr.items.length - 1;
            ctx.line(2);
            while (i > 0) {
                ctx.line(3);
                const parent = (i - 1) >> 1;
                arr.setPointers([
                    { index: i, label: 'i', color: '#58a6ff' },
                    { index: parent, label: 'p', color: '#bc8cff' }
                ]);
                ctx.line(4);
                if (arr.compare(i, parent) > 0) {
                    ctx.line(5);
                    arr.swap(i, parent);
                    i = parent;
                    ctx.line(2);
                } else {
                    arr.items[i].state = 'sorted';
                    ctx.line(7);
                    break;
                }
            }
            arr.items.forEach(it => it.state = 'default');
        }
        arr.done();
        log.printSuccess('堆插入完成');
    }

    // ===== 堆 - 删除堆顶（下沉） =====
    const heapDeleteCode = `function heapPop(heap) {
  const top = heap[0];
  heap[0] = heap.pop();
  let i = 0, n = heap.length;
  while (true) {
    let max = i;
    const l = 2*i+1, r = 2*i+2;
    if (l < n && heap[l] > heap[max]) max = l;
    if (r < n && heap[r] > heap[max]) max = r;
    if (max === i) break;
    [heap[i], heap[max]] = [heap[max], heap[i]];
    i = max;
  }
  return top;
}`;
    function heapDeleteRun(ctx) {
        // 先建立最大堆 [90, 60, 70, 20, 30, 50]
        const init = [90, 60, 70, 20, 30, 50];
        const arr = ctx.add(new ArrayTracer('array', init.slice()));
        const log = ctx.add(new LogTracer('log'));
        const n = init.length;

        ctx.line(1);
        log.printInfo(`堆顶 = ${arr.items[0].value}，准备删除`);
        arr.highlight(0, 'pivot', 'top');

        ctx.line(2);
        const last = arr.items.pop();
        arr.items[0] = { value: last.value, state: 'current' };
        arr._commit({
            type: 'pop',
            payload: { value: last.value },
            description: `heap[0] = heap.pop() = ${last.value}`
        });

        let i = 0;
        ctx.line(3);
        while (true) {
            ctx.line(4);
            let max = i;
            const l = 2 * i + 1, r = 2 * i + 2;
            arr.setPointer(i, 'i');
            if (l < arr.items.length) {
                ctx.line(5);
                if (arr.compare(l, max) > 0) max = l;
            }
            if (r < arr.items.length) {
                ctx.line(6);
                if (arr.compare(r, max) > 0) max = r;
            }
            ctx.line(7);
            if (max === i) break;
            ctx.line(8);
            arr.swap(i, max);
            i = max;
            ctx.line(3);
        }
        arr.done();
        log.printSuccess(`删除完成，返回 ${last.value}`);
    }

    // ===== 建堆（Heapify） =====
    const heapifyCode = `function buildHeap(arr) {
  const n = arr.length;
  for (let i = (n >> 1) - 1; i >= 0; i--) {
    siftDown(arr, i, n);
  }
}
function siftDown(arr, i, n) {
  while (true) {
    let max = i;
    const l = 2*i+1, r = 2*i+2;
    if (l < n && arr[l] > arr[max]) max = l;
    if (r < n && arr[r] > arr[max]) max = r;
    if (max === i) break;
    [arr[i], arr[max]] = [arr[max], arr[i]];
    i = max;
  }
}`;
    function heapifyRun(ctx, data) {
        const init = data.length ? data : [4, 10, 3, 5, 1, 8, 2, 7, 6, 9];
        const arr = ctx.add(new ArrayTracer('array', init.slice()));
        const log = ctx.add(new LogTracer('log'));
        const n = init.length;

        function siftDown(i, size) {
            ctx.line(8);
            while (true) {
                ctx.line(9);
                let max = i;
                const l = 2 * i + 1, r = 2 * i + 2;
                arr.setPointer(i, 'i');
                if (l < size) {
                    ctx.line(10);
                    if (arr.compare(l, max) > 0) max = l;
                }
                if (r < size) {
                    ctx.line(11);
                    if (arr.compare(r, max) > 0) max = r;
                }
                ctx.line(12);
                if (max === i) break;
                ctx.line(13);
                arr.swap(i, max);
                i = max;
                ctx.line(8);
            }
        }
        ctx.line(2);
        log.printInfo('从最后一个非叶节点开始，逐个下沉');
        for (let i = (n >> 1) - 1; i >= 0; i--) {
            ctx.line(3);
            log.printInfo(`siftDown(${i})`);
            siftDown(i, n);
        }
        arr.done();
        log.printSuccess(`建堆完成，时间复杂度 O(n)`);
    }

    // ===== 并查集 Find =====
    const ufFindCode = `function find(parent, x) {
  if (parent[x] !== x) {
    parent[x] = find(parent, parent[x]);
  }
  return parent[x];
}`;
    function ufFindRun(ctx) {
        // 8 个节点，初始各自为根
        // 构造链：1 -> 2 -> 3 -> 4 -> 5
        const N = 6;
        const parent = [];
        for (let i = 0; i < N; i++) parent[i] = i;
        // 制造一条链 0<-1<-2<-3<-4<-5
        parent[1] = 0;
        parent[2] = 1;
        parent[3] = 2;
        parent[4] = 3;
        parent[5] = 4;

        // 用图可视化
        const vertices = [];
        for (let i = 0; i < N; i++) vertices.push({ label: i, state: 'default' });
        const edges = [];
        for (let i = 1; i < N; i++) edges.push({ u: i, v: parent[i], directed: true });
        const g = ctx.add(new GraphTracer('graph', vertices, edges));
        const log = ctx.add(new LogTracer('log'));

        ctx.line(1);
        const target = 5;
        log.printInfo(`find(${target})，路径压缩前`);

        // 递归 find，可视化路径
        const path = [];
        function find(x) {
            ctx.line(1);
            ctx.line(2);
            if (parent[x] !== x) {
                g.visit(x);
                path.push(x);
                log.printInfo(`find(${x}): parent=${parent[x]}，继续递归`);
                const root = find(parent[x]);
                ctx.line(3);
                parent[x] = root;
                g.highlightEdge(x, root, '#3fb950', `压缩 ${x} → ${root}`);
                log.printSuccess(`路径压缩: parent[${x}] = ${root}`);
                return root;
            }
            ctx.line(5);
            g.highlight(x, 'sorted', `根 = ${x}`);
            log.printSuccess(`找到根 = ${x}`);
            return x;
        }
        const root = find(target);
        ctx.line(2);
        log.printSuccess(`find(${target}) = ${root}，路径压缩完成`);
    }

    // ===== 并查集 Union =====
    const ufUnionCode = `function union(parent, rank, x, y) {
  const rx = find(parent, x);
  const ry = find(parent, y);
  if (rx === ry) return;
  if (rank[rx] < rank[ry]) {
    parent[rx] = ry;
  } else if (rank[rx] > rank[ry]) {
    parent[ry] = rx;
  } else {
    parent[ry] = rx;
    rank[rx]++;
  }
}`;
    function ufUnionRun(ctx) {
        const N = 6;
        const parent = [];
        const rank = [];
        for (let i = 0; i < N; i++) { parent[i] = i; rank[i] = 0; }

        const vertices = [];
        for (let i = 0; i < N; i++) vertices.push({ label: i, state: 'default', tag: `r=${rank[i]}` });
        const g = ctx.add(new GraphTracer('graph', vertices, []));
        const log = ctx.add(new LogTracer('log'));

        function find(x) {
            while (parent[x] !== x) x = parent[x];
            return x;
        }

        const ops = [[0, 1], [2, 3], [1, 2], [4, 5], [3, 4]];
        for (const [x, y] of ops) {
            ctx.line(2);
            const rx = find(x);
            const ry = find(y);
            g.highlight(x, 'current', `find(${x})=${rx}`);
            g.highlight(y, 'current', `find(${y})=${ry}`);
            log.printInfo(`union(${x}, ${y}): root(${x})=${rx}, root(${y})=${ry}`);
            ctx.line(3);
            if (rx === ry) {
                log.printWarning('同根，跳过');
                g.highlight(x, 'default');
                g.highlight(y, 'default');
                continue;
            }
            ctx.line(4);
            if (rank[rx] < rank[ry]) {
                ctx.line(5);
                parent[rx] = ry;
                g.edges.push({ u: rx, v: ry, directed: true });
                g.highlightEdge(rx, ry, '#3fb950', `${rx} → ${ry}`);
                log.printSuccess(`${rx} 挂到 ${ry} 下（按秩合并）`);
            } else if (rank[rx] > rank[ry]) {
                ctx.line(6);
                parent[ry] = rx;
                g.edges.push({ u: ry, v: rx, directed: true });
                g.highlightEdge(ry, rx, '#3fb950', `${ry} → ${rx}`);
                log.printSuccess(`${ry} 挂到 ${rx} 下（按秩合并）`);
            } else {
                ctx.line(7);
                ctx.line(8);
                parent[ry] = rx;
                rank[rx]++;
                g.edges.push({ u: ry, v: rx, directed: true });
                g.highlightEdge(ry, rx, '#3fb950', `${ry} → ${rx}`);
                g.vertices[rx].tag = `r=${rank[rx]}`;
                log.printSuccess(`${ry} 挂到 ${rx} 下，rank[${rx}]++`);
            }
            g.highlight(x, 'default');
            g.highlight(y, 'default');
        }
        g.done();
        log.printSuccess('Union 操作完成');
    }

    // ===== 注册 =====
    const algos = [
        {
            id: 'tree.preorder',
            name: '二叉树 - 前序遍历', category: 'tree', level: 'P0',
            complexity: { time: 'O(n)', space: 'O(h)' },
            keywords: ['preorder', 'qianxu', 'dfs'],
            mnemonic: '根左右先访问，递归回溯一路行',
            description: `<div class="desc-section"><h3>核心思想</h3><p>按特定顺序访问二叉树的每个节点：前序根-左-右，中序左-根-右，后序左-右-根，层序一层一层访问。</p></div><div class="desc-section"><h3>推导过程</h3><p>递归写法直接按定义访问。非递归写法用栈模拟递归过程：中序一路向左压栈，到底后弹出访问，再转向右子树；层序用队列按层扩展。</p></div><div class="desc-section"><h3>适用场景</h3><p>表达式求值、序列化树、按层次展示、BST 有序输出。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 文件系统目录树打印。② 表达式树求值。③ BST 中序输出有序序列。</p></div>`,
            code: preorderCode,
            run: preorderRun,
            buildState: buildBinaryTreeState
        },
        {
            id: 'tree.inorder',
            name: '二叉树 - 中序遍历', category: 'tree', level: 'P0',
            complexity: { time: 'O(n)', space: 'O(h)' },
            keywords: ['inorder', 'zhongxu'],
            mnemonic: '左根右遍历不偏，BST中序得升序',
            description: `<div class="desc-section"><h3>核心思想</h3><p>按特定顺序访问二叉树的每个节点：前序根-左-右，中序左-根-右，后序左-右-根，层序一层一层访问。</p></div><div class="desc-section"><h3>推导过程</h3><p>递归写法直接按定义访问。非递归写法用栈模拟递归过程：中序一路向左压栈，到底后弹出访问，再转向右子树；层序用队列按层扩展。</p></div><div class="desc-section"><h3>适用场景</h3><p>表达式求值、序列化树、按层次展示、BST 有序输出。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 文件系统目录树打印。② 表达式树求值。③ BST 中序输出有序序列。</p></div>`,
            code: inorderCode,
            run: inorderRun,
            buildState: buildBinaryTreeState
        },
        {
            id: 'tree.levelorder',
            name: '二叉树 - 层序遍历', category: 'tree', level: 'P0',
            complexity: { time: 'O(n)', space: 'O(w)' },
            keywords: ['levelorder', 'cengxu', 'bfs'],
            mnemonic: '逐层从左到右，队列辅助访问',
            description: `<div class="desc-section"><h3>核心思想</h3><p>按特定顺序访问二叉树的每个节点：前序根-左-右，中序左-根-右，后序左-右-根，层序一层一层访问。</p></div><div class="desc-section"><h3>推导过程</h3><p>递归写法直接按定义访问。非递归写法用栈模拟递归过程：中序一路向左压栈，到底后弹出访问，再转向右子树；层序用队列按层扩展。</p></div><div class="desc-section"><h3>适用场景</h3><p>表达式求值、序列化树、按层次展示、BST 有序输出。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 文件系统目录树打印。② 表达式树求值。③ BST 中序输出有序序列。</p></div>`,
            code: levelorderCode,
            run: levelorderRun,
            buildState: buildBinaryTreeState
        },
        {
            id: 'tree.bstInsert',
            name: 'BST - 插入（递归）', category: 'tree', level: 'P0',
            complexity: { time: 'O(log n)', space: 'O(h)' },
            keywords: ['bst', 'insert', 'binary search tree', 'recursive'],
            mnemonic: '小左大右下降，遇空即插新节点',
            description: `<div class="desc-section"><h3>核心思想</h3><p>二叉搜索树保持“左子树 < 根 < 右子树”，查找/插入/删除都像二分查找一样沿一条路径走。</p></div><div class="desc-section"><h3>推导过程</h3><p>查找时与当前节点比较：小则向左，大则向右。插入找到空位置放入。删除分三种情况：叶子直接删；只有一个孩子则孩子顶替；有两个孩子则用右子树最小值（或左子树最大值）替换。</p></div><div class="desc-section"><h3>适用场景</h3><p>需要动态维护有序集合、频繁增删查。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 字典树实现。② 数据库索引（简单场景）。③ 实现有序 map。</p></div>`,
            code: bstInsertCode,
            defaultData: [50, 30, 70, 20, 40, 60, 80, 35, 45],
            dataParser: (s) => s.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n)),
            run: bstInsertRun,
            buildState: buildBinaryTreeState
        },
        {
            id: 'tree.bstSearch',
            name: 'BST - 查找', category: 'tree', level: 'P0',
            complexity: { time: 'O(log n)', space: 'O(h)' },
            keywords: ['bst', 'search'],
            mnemonic: '比节点定方向，左小右大找目标',
            description: `<div class="desc-section"><h3>核心思想</h3><p>二叉搜索树保持“左子树 < 根 < 右子树”，查找/插入/删除都像二分查找一样沿一条路径走。</p></div><div class="desc-section"><h3>推导过程</h3><p>查找时与当前节点比较：小则向左，大则向右。插入找到空位置放入。删除分三种情况：叶子直接删；只有一个孩子则孩子顶替；有两个孩子则用右子树最小值（或左子树最大值）替换。</p></div><div class="desc-section"><h3>适用场景</h3><p>需要动态维护有序集合、频繁增删查。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 字典树实现。② 数据库索引（简单场景）。③ 实现有序 map。</p></div>`,
            code: bstSearchCode,
            run: bstSearchRun,
            buildState: buildBinaryTreeState
        },
        {
            id: 'tree.bstDelete',
            name: 'BST - 删除', category: 'tree', level: 'P0',
            complexity: { time: 'O(log n)', space: 'O(h)' },
            keywords: ['bst', 'delete', 'remove'],
            mnemonic: '叶子直删单子替，双子后继补位来',
            description: `<div class="desc-section"><h3>核心思想</h3><p>二叉搜索树保持“左子树 < 根 < 右子树”，查找/插入/删除都像二分查找一样沿一条路径走。</p></div><div class="desc-section"><h3>推导过程</h3><p>查找时与当前节点比较：小则向左，大则向右。插入找到空位置放入。删除分三种情况：叶子直接删；只有一个孩子则孩子顶替；有两个孩子则用右子树最小值（或左子树最大值）替换。</p></div><div class="desc-section"><h3>适用场景</h3><p>需要动态维护有序集合、频繁增删查。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 字典树实现。② 数据库索引（简单场景）。③ 实现有序 map。</p></div>`,
            code: bstDeleteCode,
            run: bstDeleteRun,
            buildState: buildBinaryTreeState
        },
        {
            id: 'tree.avlInsert',
            name: 'AVL - 插入', category: 'tree', level: 'P0',
            complexity: { time: 'O(log n)', space: 'O(h)' },
            keywords: ['avl', 'rotation', 'balance', 'rotate'],
            mnemonic: '插入回溯查平衡，四型旋转复稳定',
            description: `<div class="desc-section"><h3>核心思想</h3><p>AVL 树是严格的平衡二叉搜索树，任何节点的左右子树高度差不超过 1。</p></div><div class="desc-section"><h3>推导过程</h3><p>插入/删除后检查祖先节点的平衡因子。若失衡，通过左旋、右旋或左右双旋恢复平衡。旋转只影响局部子树，保持 BST 性质不变。</p></div><div class="desc-section"><h3>适用场景</h3><p>查找性能必须稳定为 O(log n)、数据频繁变动的场景。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 数据库索引。② 内存有序 map。③ 需要最坏情况保证的系统。</p></div>`,
            code: avlInsertCode,
            defaultData: [10, 20, 30, 40, 50, 25],
            dataParser: (s) => s.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n)),
            run: avlInsertRun,
            buildState: buildBinaryTreeState
        },
        {
            id: 'tree.heapInsert',
            name: '堆 - 插入（上浮）', category: 'tree', level: 'P0',
            complexity: { time: 'O(log n)', space: 'O(1)' },
            keywords: ['heap', 'insert', 'sift up'],
            mnemonic: '末尾追加比较父，大于则换上浮去',
            description: `<div class="desc-section"><h3>核心思想</h3><p>堆是一棵完全二叉树，大顶堆父节点 ≥ 子节点，小顶堆父节点 ≤ 子节点。</p></div><div class="desc-section"><h3>推导过程</h3><p>用数组存储：父节点 i 的左右孩子分别是 2i+1 和 2i+2。插入时上浮（与父节点交换），删除堆顶时下沉（与孩子中较大/较小者交换）。建堆可从最后一个非叶子节点开始下沉。</p></div><div class="desc-section"><h3>适用场景</h3><p>优先队列、Top-K、堆排序、任务调度。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 合并 K 个有序数组。② 操作系统进程优先级调度。③ 找中位数的数据流。</p></div>`,
            code: heapInsertCode,
            defaultData: [50, 30, 70, 20, 60, 90],
            dataParser: (s) => s.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n)),
            run: heapInsertRun,
            buildState: buildHeapState
        },
        {
            id: 'tree.heapDelete',
            name: '堆 - 删除堆顶（下沉）', category: 'tree', level: 'P0',
            complexity: { time: 'O(log n)', space: 'O(1)' },
            keywords: ['heap', 'delete', 'sift down', 'pop'],
            mnemonic: '尾代堆顶再下沉，大子交换保堆性',
            description: `<div class="desc-section"><h3>核心思想</h3><p>堆是一棵完全二叉树，大顶堆父节点 ≥ 子节点，小顶堆父节点 ≤ 子节点。</p></div><div class="desc-section"><h3>推导过程</h3><p>用数组存储：父节点 i 的左右孩子分别是 2i+1 和 2i+2。插入时上浮（与父节点交换），删除堆顶时下沉（与孩子中较大/较小者交换）。建堆可从最后一个非叶子节点开始下沉。</p></div><div class="desc-section"><h3>适用场景</h3><p>优先队列、Top-K、堆排序、任务调度。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 合并 K 个有序数组。② 操作系统进程优先级调度。③ 找中位数的数据流。</p></div>`,
            code: heapDeleteCode,
            run: heapDeleteRun,
            buildState: buildHeapState
        },
        {
            id: 'tree.heapify',
            name: '建堆（Heapify）', category: 'tree', level: 'P0',
            complexity: { time: 'O(n)', space: 'O(1)' },
            keywords: ['heapify', 'build heap'],
            mnemonic: '末父逆序下沉，线性建堆真神奇',
            description: `<div class="desc-section"><h3>核心思想</h3><p>堆是一棵完全二叉树，大顶堆父节点 ≥ 子节点，小顶堆父节点 ≤ 子节点。</p></div><div class="desc-section"><h3>推导过程</h3><p>用数组存储：父节点 i 的左右孩子分别是 2i+1 和 2i+2。插入时上浮（与父节点交换），删除堆顶时下沉（与孩子中较大/较小者交换）。建堆可从最后一个非叶子节点开始下沉。</p></div><div class="desc-section"><h3>适用场景</h3><p>优先队列、Top-K、堆排序、任务调度。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 合并 K 个有序数组。② 操作系统进程优先级调度。③ 找中位数的数据流。</p></div>`,
            code: heapifyCode,
            defaultData: [4, 10, 3, 5, 1, 8, 2, 7, 6, 9],
            dataParser: (s) => s.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n)),
            run: heapifyRun,
            buildState: buildHeapState
        },
        {
            id: 'tree.ufFind',
            name: '并查集 - Find（路径压缩）', category: 'tree', level: 'P0',
            complexity: { time: 'α(n)', space: 'O(n)' },
            keywords: ['union find', 'find', 'path compression'],
            mnemonic: '递归找根回溯挂，路径压缩秒变一',
            description: `<div class="desc-section"><h3>核心思想</h3><p>并查集维护若干不相交集合，支持“合并两个集合”和“查询是否同一集合”。</p></div><div class="desc-section"><h3>推导过程</h3><p>每个元素指向父节点，根节点代表集合。Find 时路径压缩（把访问过的节点直接连到根），Union 时按秩合并（小树挂大树）。这样均摊复杂度接近 O(α(n))。</p></div><div class="desc-section"><h3>适用场景</h3><p>连通性判断、Kruskal 最小生成树、等价类划分。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 社交网络好友圈判断。② 迷宫连通性。③ 最小生成树 Kruskal。</p></div>`,
            code: ufFindCode,
            run: ufFindRun,
            buildState: (tracerStates, _step, ctxInfo) => {
                const snap = tracerStates.graph;
                if (!snap) return null;
                // 圆形布局（画布自适应：半径/圆心随画布收缩，防节点越界）
                const W = (ctxInfo && ctxInfo.width) || (window.app?.renderer?.width || 800);
                const H = (ctxInfo && ctxInfo.height) || (window.app?.renderer?.height || 400);
                const r = Math.max(40, Math.min(130, Math.min(W, H) / 2 - 50));
                const positions = LayoutEngine.layoutGraphCircle(snap.vertices, { cx: W / 2, cy: H / 2, r });
                const vertices = snap.vertices.map((v, i) => ({ ...positions[i], ...v }));
                return { graph: { vertices, edges: snap.edges, options: { radius: 22, fontSize: 13 } } };
            }
        },
        {
            id: 'tree.ufUnion',
            name: '并查集 - Union（按秩合并）', category: 'tree', level: 'P0',
            complexity: { time: 'α(n)', space: 'O(n)' },
            keywords: ['union find', 'union', 'rank'],
            mnemonic: '矮树挂高树下，按秩合并防退化',
            description: `<div class="desc-section"><h3>核心思想</h3><p>并查集维护若干不相交集合，支持“合并两个集合”和“查询是否同一集合”。</p></div><div class="desc-section"><h3>推导过程</h3><p>每个元素指向父节点，根节点代表集合。Find 时路径压缩（把访问过的节点直接连到根），Union 时按秩合并（小树挂大树）。这样均摊复杂度接近 O(α(n))。</p></div><div class="desc-section"><h3>适用场景</h3><p>连通性判断、Kruskal 最小生成树、等价类划分。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 社交网络好友圈判断。② 迷宫连通性。③ 最小生成树 Kruskal。</p></div>`,
            code: ufUnionCode,
            run: ufUnionRun,
            buildState: (tracerStates, _step, ctxInfo) => {
                const snap = tracerStates.graph;
                if (!snap) return null;
                const W = (ctxInfo && ctxInfo.width) || (window.app?.renderer?.width || 800);
                const H = (ctxInfo && ctxInfo.height) || (window.app?.renderer?.height || 400);
                const r = Math.max(40, Math.min(150, Math.min(W, H) / 2 - 50));
                const positions = LayoutEngine.layoutGraphCircle(snap.vertices, { cx: W / 2, cy: H / 2, r });
                const vertices = snap.vertices.map((v, i) => ({ ...positions[i], ...v }));
                return { graph: { vertices, edges: snap.edges, options: { radius: 22, fontSize: 13 } } };
            }
        }
    ];

    algos.forEach(a => AlgorithmLoader.register(a.id, a));
})();
