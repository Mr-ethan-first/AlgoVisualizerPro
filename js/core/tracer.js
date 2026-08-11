/**
 * Tracer API - 步骤记录器
 *
 * 提供 ArrayTracer / GraphTracer / TreeTracer / LogTracer 等"录制器"。
 * 每个 Tracer 在算法执行过程中产生步骤（steps），写入 Store。
 * Animator 通过 applyStep(state, step) 把步骤应用到当前 state 形成可视化。
 *
 * 设计思路（参考 algorithm-visualizer）：
 *   - Tracer 在算法执行期间维护"当前状态"
 *   - 每次 mutate 后调用 _commit() 记录一个 step
 *   - Animator 重放时调用 Tracer.replay(stepIndex) 重建某一帧状态
 */
(function (global) {
    'use strict';

    /**
     * TracerContext - 算法运行上下文
     * 持有所有 Tracer 实例与共享的 Store。
     * 每当任意 Tracer 提交一步时，自动捕获所有 Tracer 的当前快照存入 step.state。
     */
    class TracerContext {
        constructor() {
            this.tracers = [];
            this.store = new Store();
            this._currentLine = null;
        }
        add(tracer) {
            tracer._context = this;
            tracer._attachStore(this.store);
            this.tracers.push(tracer);
            return tracer;
        }
        /** 设置当前代码行号（用于代码高亮联动） */
        line(n) { this._currentLine = n; return this; }
        clearLine() { this._currentLine = null; return this; }
        captureState(step) {
            const state = {};
            for (const t of this.tracers) {
                if (typeof t.getSnapshot === 'function') {
                    const snap = t.getSnapshot();
                    // 注入类型信息，便于 Animator 默认状态构建器按类型分发
                    if (snap && typeof snap === 'object' && !snap._type) {
                        snap._type = t.type;
                    }
                    state[t.name] = snap;
                }
            }
            step.state = state;
            // 注入当前代码行
            if (this._currentLine !== null && step.codeLine === undefined) {
                step.codeLine = this._currentLine;
            }
        }
    }

    /**
     * 基类：所有 Tracer 的公共行为
     */
    class BaseTracer {
        constructor(name, type) {
            this.name = name;
            this.type = type;
            this.store = null; // 由 TracerContext 注入
            this._context = null;
        }

        _attachStore(store) {
            this.store = store;
        }

        _commit(step) {
            if (!this.store) return;
            step.tracer = this.type;
            step.tracerName = this.name;
            // 捕获所有 Tracer 的当前状态
            if (this._context) {
                this._context.captureState(step);
            } else {
                // 兼容独立使用：仅捕获自身
                if (typeof this.getSnapshot === 'function') {
                    step.state = { [this.name]: this.getSnapshot() };
                }
            }
            this.store.push(step);
        }
    }

    /**
     * ArrayTracer - 数组追踪器（排序、二分、动态数组）
     *
     * 维护 items：[{ value, state, color, tag }]
     * 支持状态：default / compare / swap / sorted / current / visited / pivot 等
     */
    class ArrayTracer extends BaseTracer {
        constructor(name, array = []) {
            super(name, 'array');
            this.items = ArrayTracer._normalize(array);
            this.pointers = []; // [{ index, label, color }]
            this.ranges = [];   // [{ start, end, color, alpha }]
            this._commit({ type: 'init', payload: { array: this.items.map(it => it.value) }, description: `初始化数组 [${this.items.map(it => it.value).join(', ')}]` });
        }

        /** 规范化输入：支持原始值数组或 { value, state } 对象数组 */
        static _normalize(array) {
            return (array || []).map(v => {
                if (v !== null && typeof v === 'object') {
                    return { value: v.value, state: v.state || 'default' };
                }
                return { value: v, state: 'default' };
            });
        }

        setItems(array) {
            this.items = ArrayTracer._normalize(array);
            this.pointers = [];
            this.ranges = [];
            this._commit({ type: 'init', payload: { array: this.items.map(it => it.value) }, description: `重置数组 [${this.items.map(it => it.value).join(', ')}]` });
        }

        set(index, value) {
            this.items[index] = { value, state: 'current' };
            this._commit({ type: 'set', payload: { index, value }, description: `设置 arr[${index}] = ${value}` });
            this.items[index].state = 'default';
        }

        swap(i, j, description) {
            const a = this.items[i].value;
            const b = this.items[j].value;
            this.items[i] = { value: b, state: 'swap' };
            this.items[j] = { value: a, state: 'swap' };
            this._commit({
                type: 'swap',
                payload: { indices: [i, j], values: [b, a] },
                description: description || `交换 arr[${i}]=${a} ↔ arr[${j}]=${b}`,
                highlight: [{ type: 'range', target: [Math.min(i, j), Math.max(i, j)], color: '#d29922' }]
            });
            this.items[i].state = 'default';
            this.items[j].state = 'default';
        }

        compare(i, j) {
            const a = this.items[i].value;
            const b = this.items[j].value;
            this.items[i].state = 'compare';
            this.items[j].state = 'compare';
            const result = a > b ? 1 : (a < b ? -1 : 0);
            this._commit({
                type: 'compare',
                payload: { indices: [i, j], values: [a, b], result },
                description: `比较 arr[${i}]=${a} 和 arr[${j}]=${b}`,
                highlight: [{ type: 'range', target: [Math.min(i, j), Math.max(i, j)], color: '#f78166' }]
            });
            this.items[i].state = 'default';
            this.items[j].state = 'default';
            return result;
        }

        highlight(index, state = 'current', description) {
            if (Array.isArray(index)) {
                index.forEach(i => this.items[i] && (this.items[i].state = state));
                this._commit({
                    type: 'highlight',
                    payload: { indices: index, state },
                    description: description || `高亮 ${state}: [${index.join(', ')}]`
                });
                index.forEach(i => this.items[i] && (this.items[i].state = 'default'));
            } else {
                this.items[index] && (this.items[index].state = state);
                this._commit({
                    type: 'highlight',
                    payload: { index, state },
                    description: description || `高亮 arr[${index}]=${this.items[index]?.value} (${state})`
                });
                this.items[index] && (this.items[index].state = 'default');
            }
        }

        highlightRange(start, end, color, description) {
            this.ranges.push({ start, end, color, alpha: 0.15 });
            this._commit({
                type: 'highlight',
                payload: { range: [start, end] },
                description: description || `区间高亮 [${start}, ${end}]`
            });
            this.ranges.pop();
        }

        markSorted(index, description) {
            if (Array.isArray(index)) {
                index.forEach(i => this.items[i] && (this.items[i].state = 'sorted'));
                this._commit({
                    type: 'mark',
                    payload: { indices: index, state: 'sorted' },
                    description: description || `标记已排序: [${index.join(', ')}]`
                });
            } else {
                this.items[index] && (this.items[index].state = 'sorted');
                this._commit({
                    type: 'mark',
                    payload: { index, state: 'sorted' },
                    description: description || `arr[${index}] 已就位`
                });
            }
        }

        setPointer(index, label, color) {
            this.pointers = [{ index, label, color }];
            this._commit({
                type: 'highlight',
                payload: { pointer: index, label },
                description: `指针 ${label || 'i'} → arr[${index}]`
            });
            this.pointers = [];
        }

        setPointers(ptrs) {
            this.pointers = ptrs.slice();
            this._commit({
                type: 'highlight',
                payload: { pointers: ptrs },
                description: `指针: ${ptrs.map(p => `${p.label || ''}@${p.index}`).join(', ')}`
            });
            this.pointers = [];
        }

        snapshot(description, opts = {}) {
            // 用于关键节点强制渲染当前状态（如完成、分区完成）
            this._commit({
                type: 'snapshot',
                payload: {},
                description: description || '快照',
                highlight: opts.highlight || []
            });
        }

        done(description) {
            this.items.forEach(it => it.state = 'sorted');
            this._commit({
                type: 'done',
                payload: {},
                description: description || '✓ 排序完成'
            });
        }

        /**
         * 重建指定步骤时的状态
         * 算法执行完毕后，每个 step 对应一帧状态。我们维护一个每步的"状态快照"，
         * 在 commit 时同步保存 items/pointers/ranges 的深拷贝。
         */
        getSnapshot() {
            return {
                items: this.items.map(it => Object.assign({}, it)),
                pointers: this.pointers.map(p => Object.assign({}, p)),
                ranges: this.ranges.map(r => Object.assign({}, r))
            };
        }
    }

    /**
     * GraphTracer - 图追踪器
     */
    class GraphTracer extends BaseTracer {
        constructor(name, vertices = [], edges = []) {
            super(name, 'graph');
            this.vertices = vertices.map((v, i) => {
                const node = {
                    id: i,
                    label: v.label !== undefined ? v.label : i,
                    state: 'default',
                    tag: '',
                    dist: null
                };
                // 几何类算法可携带归一化坐标（0..1），由状态构建器决定是否启用坐标布局
                if (typeof v.nx === 'number') node.nx = v.nx;
                if (typeof v.ny === 'number') node.ny = v.ny;
                return node;
            });
            this.edges = edges.map(e => ({
                u: e.u, v: e.v,
                weight: e.weight || 1,
                color: null,
                state: 'default',
                directed: !!e.directed
            }));
            this.queue = []; // 队列状态展示
            this._commit({
                type: 'init',
                payload: { vertices: vertices.length, edges: edges.length },
                description: `初始化图（${vertices.length} 节点，${edges.length} 边）`
            });
        }

        visit(v, description) {
            this.vertices[v].state = 'visited';
            this._commit({
                type: 'visit',
                payload: { vertex: v },
                description: description || `访问节点 ${this.vertices[v].label}`
            });
        }

        leave(v, description) {
            this.vertices[v].state = 'default';
            this._commit({
                type: 'leave',
                payload: { vertex: v },
                description: description || `离开节点 ${this.vertices[v].label}`
            });
        }

        highlight(v, state = 'current', description) {
            if (!this.vertices[v]) return;
            this.vertices[v].state = state;
            this._commit({
                type: 'highlight',
                payload: { vertex: v, state },
                description: description || `高亮节点 ${this.vertices[v].label}`
            });
        }

        highlightEdge(u, v, color, description) {
            const e = this.edges.find(ed => (ed.u === u && ed.v === v) || (!ed.directed && ed.u === v && ed.v === u));
            if (e) e.color = color || '#3fb950';
            this._commit({
                type: 'highlight',
                payload: { edge: [u, v] },
                description: description || `高亮边 ${this.vertices[u].label} → ${this.vertices[v].label}`
            });
            if (e) e.color = null;
        }

        setDist(v, value) {
            this.vertices[v].dist = value;
            this.vertices[v].tag = value === Infinity ? '∞' : String(value);
            this.vertices[v].state = 'current';
            this._commit({
                type: 'relax',
                payload: { vertex: v, dist: value },
                description: `dist[${this.vertices[v].label}] = ${value === Infinity ? '∞' : value}`
            });
            this.vertices[v].state = 'default';
        }

        setParent(child, parent) {
            const e = this.edges.find(ed => ed.u === parent && ed.v === child);
            if (e) { e.color = '#3fb950'; e.state = 'tree'; }
            this.vertices[child].state = 'tree';
            this._commit({
                type: 'mark',
                payload: { child, parent },
                description: `${this.vertices[parent]?.label} → ${this.vertices[child].label} (父边)`
            });
        }

        markAsTree(v) {
            this.vertices[v].state = 'tree';
            this._commit({ type: 'mark', payload: { vertex: v }, description: `节点 ${this.vertices[v].label} 加入生成树` });
        }

        markPath(vertices) {
            vertices.forEach(v => this.vertices[v].state = 'path');
            this._commit({ type: 'mark', payload: { path: vertices }, description: `路径: ${vertices.map(v => this.vertices[v].label).join(' → ')}` });
        }

        addToQueue(v) {
            this.queue.push(v);
            this.vertices[v].state = 'queue';
            this._commit({ type: 'enqueue', payload: { vertex: v }, description: `节点 ${this.vertices[v].label} 入队` });
        }

        removeFromQueue(v) {
            const idx = this.queue.indexOf(v);
            if (idx >= 0) this.queue.splice(idx, 1);
            this._commit({ type: 'dequeue', payload: { vertex: v }, description: `节点 ${this.vertices[v].label} 出队` });
        }

        done(description) {
            this._commit({ type: 'done', payload: {}, description: description || '✓ 完成' });
        }

        getSnapshot() {
            return {
                vertices: this.vertices.map(v => Object.assign({}, v)),
                edges: this.edges.map(e => Object.assign({}, e)),
                queue: this.queue.slice()
            };
        }
    }

    /**
     * TreeTracer - 树追踪器（用于 BST / AVL / Trie 等）
     * nodes: [{ value, left, right, state, tag, x, y }]  使用数组下标引用
     */
    class TreeTracer extends BaseTracer {
        constructor(name, nodes = []) {
            super(name, 'tree');
            this.nodes = nodes.map(n => ({
                value: n.value,
                left: n.left ?? null,
                right: n.right ?? null,
                parent: n.parent ?? null,
                state: 'default',
                tag: '',
                hidden: false,
                color: n.color || null
            }));
            this.root = nodes.length ? 0 : null;
            this._commit({
                type: 'init',
                payload: { nodes: nodes.length },
                description: `初始化树（${nodes.length} 节点）`
            });
        }

        setRoot(r) { this.root = r; }

        visit(node, description) {
            if (this.nodes[node]) {
                this.nodes[node].state = 'visited';
                this._commit({ type: 'visit', payload: { node }, description: description || `访问 ${this.nodes[node].value}` });
            }
        }

        highlight(node, state = 'current', description) {
            if (this.nodes[node]) {
                this.nodes[node].state = state;
                this._commit({ type: 'highlight', payload: { node, state }, description: description || `高亮 ${this.nodes[node].value}` });
            }
        }

        highlightEdge(parent, child, color, description) {
            this._commit({
                type: 'highlight',
                payload: { edge: [parent, child], color },
                description: description || `边 ${this.nodes[parent]?.value} → ${this.nodes[child]?.value}`
            });
        }

        set(node, value, description) {
            if (this.nodes[node]) {
                this.nodes[node].value = value;
                this.nodes[node].state = 'current';
                this._commit({ type: 'set', payload: { node, value }, description: description || `设置节点 = ${value}` });
                this.nodes[node].state = 'default';
            }
        }

        rotate(node, description) {
            if (this.nodes[node]) {
                this.nodes[node].state = 'rotate';
                this._commit({ type: 'rotate', payload: { node }, description: description || `旋转节点 ${this.nodes[node].value}` });
                this.nodes[node].state = 'default';
            }
        }

        done(description) {
            this.nodes.forEach(n => { if (n && !n.hidden) n.state = 'tree'; });
            this._commit({ type: 'done', payload: {}, description: description || '✓ 完成' });
        }

        getSnapshot() {
            // root 防丢失：部分算法直接赋值 tree.nodes 忘记同步 root（如红黑树 flatten），
            // 若 root 无效则自动检测——找 parent 为空的节点（flatten 约定根恒无父），兜底取 0
            let root = this.root;
            if ((root === null || root === undefined) && this.nodes.length) {
                root = this.nodes.findIndex(n => n && (n.parent === null || n.parent === undefined));
                if (root < 0) root = 0;
            }
            return {
                nodes: this.nodes.map(n => n ? Object.assign({}, n) : null),
                root
            };
        }
    }

    /**
     * LogTracer - 执行日志
     */
    class LogTracer extends BaseTracer {
        constructor(name) {
            super(name, 'log');
            this.lines = [];
        }

        print(message, level = 'info') {
            this.lines.push({ message: String(message), level });
            this._commit({ type: 'log', payload: { message, level }, description: String(message) });
        }
        printSuccess(msg) { this.print(msg, 'success'); }
        printError(msg) { this.print(msg, 'error'); }
        printWarning(msg) { this.print(msg, 'warning'); }
        printInfo(msg) { this.print(msg, 'info'); }
        clear() { this.lines = []; this._commit({ type: 'log', payload: { clear: true }, description: '清空日志' }); }
    }

    /**
     * LinkedListTracer - 链表追踪器（用于单/双向链表）
     * nodes: [{ value, state, prevColor, nextColor }]
     */
    class LinkedListTracer extends BaseTracer {
        constructor(name, values = []) {
            super(name, 'linkedlist');
            this.nodes = values.map(v => ({ value: v, state: 'default' }));
            this.head = values.length ? 0 : null;
            this._commit({ type: 'init', payload: { values: values.slice() }, description: `初始化链表：${values.join(' → ')}` });
        }

        visit(index, description) {
            if (this.nodes[index]) {
                this.nodes[index].state = 'current';
                this._commit({ type: 'visit', payload: { index }, description: description || `访问节点 ${this.nodes[index].value}` });
                this.nodes[index].state = 'default';
            }
        }

        set(index, value, description) {
            if (this.nodes[index]) {
                this.nodes[index].value = value;
                this.nodes[index].state = 'swap';
                this._commit({ type: 'set', payload: { index, value }, description: description || `节点[${index}] = ${value}` });
                this.nodes[index].state = 'default';
            }
        }

        insert(index, value, description) {
            this.nodes.splice(index, 0, { value, state: 'current' });
            this._commit({ type: 'set', payload: { index, value, op: 'insert' }, description: description || `插入节点 ${value} 于位置 ${index}` });
            this.nodes[index].state = 'default';
        }

        remove(index, description) {
            const removed = this.nodes.splice(index, 1)[0];
            this._commit({ type: 'set', payload: { index, op: 'remove', value: removed?.value }, description: description || `删除节点[${index}]` });
        }

        push(value, description) {
            this.nodes.push({ value, state: 'current' });
            this._commit({ type: 'set', payload: { op: 'push', value }, description: description || `push(${value})` });
            this.nodes[this.nodes.length - 1].state = 'default';
        }

        unshift(value, description) {
            this.nodes.unshift({ value, state: 'current' });
            this._commit({ type: 'set', payload: { op: 'unshift', value }, description: description || `unshift(${value})` });
            this.nodes[0].state = 'default';
        }

        setItems(items, description) {
            this.nodes = items.map(it => ({
                value: it.value !== undefined ? it.value : it,
                state: it.state || 'default'
            }));
            this._commit({ type: 'snapshot', payload: { op: 'setItems' }, description: description || `更新链表：${this.nodes.map(n => n.value).join(' → ')}` });
        }

        getSnapshot() {
            return {
                nodes: this.nodes.map(n => Object.assign({}, n)),
                head: this.head
            };
        }
    }

    /**
     * StackTracer - 栈追踪器
     */
    class StackTracer extends BaseTracer {
        constructor(name, init = []) {
            super(name, 'stack');
            this.items = init.map(v => ({ value: v, state: 'default' }));
            this._commit({ type: 'init', payload: { items: init.slice() }, description: `初始化栈（${init.length} 元素）` });
        }
        push(value, description) {
            this.items.push({ value, state: 'current' });
            this._commit({ type: 'push', payload: { value }, description: description || `push(${value})` });
            if (this.items.length) this.items[this.items.length - 1].state = 'default';
        }
        pop(description) {
            const top = this.items.pop();
            if (top) top.state = 'current';
            this._commit({ type: 'pop', payload: { value: top?.value }, description: description || `pop() → ${top?.value}` });
        }
        peek(description) {
            const top = this.items[this.items.length - 1];
            if (top) top.state = 'current';
            this._commit({ type: 'highlight', payload: { top: top?.value }, description: description || `peek() → ${top?.value}` });
            if (top) top.state = 'default';
        }
        getSnapshot() {
            return { items: this.items.map(it => Object.assign({}, it)) };
        }
    }

    /**
     * QueueTracer - 队列追踪器
     */
    class QueueTracer extends BaseTracer {
        constructor(name, init = []) {
            super(name, 'queue');
            this.items = init.map(v => ({ value: v, state: 'default' }));
            this._commit({ type: 'init', payload: { items: init.slice() }, description: `初始化队列（${init.length} 元素）` });
        }
        enqueue(value, description) {
            this.items.push({ value, state: 'current' });
            this._commit({ type: 'enqueue', payload: { value }, description: description || `enqueue(${value})` });
            if (this.items.length) this.items[this.items.length - 1].state = 'default';
        }
        dequeue(description) {
            const front = this.items.shift();
            if (front) front.state = 'current';
            this._commit({ type: 'dequeue', payload: { value: front?.value }, description: description || `dequeue() → ${front?.value}` });
        }
        getSnapshot() {
            return { items: this.items.map(it => Object.assign({}, it)) };
        }
    }

    /**
     * DPTableTracer - DP 表追踪器（用于 LCS、背包、斐波那契等）
     * 维护一个二维表，单元格可高亮
     */
    class DPTableTracer extends BaseTracer {
        constructor(name, rows, cols, init = null) {
            super(name, 'dptable');
            this.rows = rows;
            this.cols = cols;
            this.cells = [];
            for (let i = 0; i < rows; i++) {
                const row = [];
                for (let j = 0; j < cols; j++) {
                    row.push({ value: init, state: 'default' });
                }
                this.cells.push(row);
            }
            this.rowLabels = [];
            this.colLabels = [];
            this._commit({ type: 'init', payload: { rows, cols }, description: `初始化 DP 表 ${rows}×${cols}` });
        }
        setRowLabels(labels) { this.rowLabels = labels; }
        setColLabels(labels) { this.colLabels = labels; }
        set(i, j, value, description) {
            this.cells[i][j] = { value, state: 'current' };
            this._commit({ type: 'set', payload: { i, j, value }, description: description || `dp[${i}][${j}] = ${value}` });
            this.cells[i][j].state = 'default';
        }
        highlight(i, j, state = 'current', description) {
            this.cells[i][j].state = state;
            this._commit({ type: 'highlight', payload: { i, j, state }, description: description || `高亮 dp[${i}][${j}]` });
            this.cells[i][j].state = 'default';
        }
        markPath(path, description) {
            path.forEach(([i, j]) => { if (this.cells[i]?.[j]) this.cells[i][j].state = 'path'; });
            this._commit({ type: 'mark', payload: { path }, description: description || `路径标记 (${path.length} 格)` });
        }
        getSnapshot() {
            return {
                rows: this.rows, cols: this.cols,
                cells: this.cells.map(r => r.map(c => Object.assign({}, c))),
                rowLabels: this.rowLabels.slice(),
                colLabels: this.colLabels.slice()
            };
        }
    }

    /**
     * ChessBoardTracer - 棋盘追踪器（N 皇后、骑士巡游等）
     */
    class ChessBoardTracer extends BaseTracer {
        constructor(name, size) {
            super(name, 'chessboard');
            this.size = size;
            this.board = [];
            for (let i = 0; i < size; i++) {
                const row = [];
                for (let j = 0; j < size; j++) row.push({ value: 0, state: 'default' });
                this.board.push(row);
            }
            this._commit({ type: 'init', payload: { size }, description: `初始化 ${size}×${size} 棋盘` });
        }
        place(row, col, value, description) {
            this.board[row][col] = { value, state: 'current' };
            this._commit({ type: 'set', payload: { row, col, value }, description: description || `放置 (${row}, ${col})` });
        }
        remove(row, col, description) {
            this.board[row][col] = { value: 0, state: 'backtrack' };
            this._commit({ type: 'backtrack', payload: { row, col }, description: description || `撤销 (${row}, ${col})` });
            this.board[row][col] = { value: 0, state: 'default' };
        }
        markSolution(positions, description) {
            positions.forEach(([r, c]) => { if (this.board[r]?.[c]) this.board[r][c].state = 'sorted'; });
            this._commit({ type: 'mark', payload: { positions }, description: description || `标记解 (${positions.length} 个)` });
        }
        getSnapshot() {
            return {
                size: this.size,
                board: this.board.map(r => r.map(c => Object.assign({}, c)))
            };
        }
    }

    // 暴露到全局
    global.TracerContext = TracerContext;
    global.ArrayTracer = ArrayTracer;
    global.GraphTracer = GraphTracer;
    global.TreeTracer = TreeTracer;
    global.LogTracer = LogTracer;
    global.LinkedListTracer = LinkedListTracer;
    global.StackTracer = StackTracer;
    global.QueueTracer = QueueTracer;
    global.DPTableTracer = DPTableTracer;
    global.ChessBoardTracer = ChessBoardTracer;
})(window);
