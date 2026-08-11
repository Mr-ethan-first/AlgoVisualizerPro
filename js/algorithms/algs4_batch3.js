/**
 * algs4 缺失算法补全 - 第三批（图论）
 *
 * 覆盖：强连通分量、传递闭包、拓扑/DFS 序、非递归 DFS、有向可达性与路径、
 *       最小生成树（惰性 Prim / Boruvka）、最短路（无向 Dijkstra / 全源 / 套利 / 关键路径）、
 *       欧拉回路与路径、最大流、二分图匹配、符号图、分配问题、零和博弈。
 *
 * 全部使用框架标准 Tracer（GraphTracer / ArrayTracer / DPTableTracer /
 * StackTracer / QueueTracer / LogTracer），由默认状态构建器渲染，
 * 不改动任何既有动画与公共样式。
 */
(function () {
    'use strict';

    // ============================================================
    // 共享样例图
    // ============================================================

    // 无向图（含环 + 一个孤立分支）
    const UG = {
        v: ['A', 'B', 'C', 'D', 'E', 'F'],
        e: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 5]]
    };

    // 有向图（含两个强连通分量）
    const DG = {
        v: ['0', '1', '2', '3', '4', '5'],
        e: [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 3]]
    };

    // 有向无环图（DAG）
    const DAG = {
        v: ['A', 'B', 'C', 'D', 'E', 'F'],
        e: [[0, 1], [0, 2], [1, 3], [2, 3], [2, 5], [3, 4], [5, 4]]
    };

    // 带权无向图
    const EWG = {
        v: ['A', 'B', 'C', 'D', 'E', 'F'],
        e: [
            [0, 1, 4], [0, 2, 3], [1, 2, 1], [1, 3, 2],
            [2, 3, 4], [3, 4, 2], [4, 5, 6], [2, 5, 7]
        ]
    };

    // 带权 DAG（用于 AcyclicSP / CPM）
    const EWDAG = {
        v: ['0', '1', '2', '3', '4', '5'],
        e: [
            [0, 1, 5], [0, 2, 3], [1, 3, 6], [2, 3, 7],
            [2, 4, 4], [3, 5, 1], [4, 5, 2]
        ]
    };

    // 流网络（源 0，汇 5）
    const FLOW = {
        v: ['s', '1', '2', '3', '4', 't'],
        e: [
            [0, 1, 10], [0, 2, 10], [1, 2, 2], [1, 3, 4],
            [1, 4, 8], [2, 4, 9], [3, 5, 10], [4, 3, 6], [4, 5, 10]
        ]
    };

    // 二分图（左 0-3，右 4-7）
    const BIP = {
        v: ['L0', 'L1', 'L2', 'L3', 'R0', 'R1', 'R2', 'R3'],
        e: [[0, 4], [0, 5], [1, 4], [1, 6], [2, 5], [2, 6], [3, 6], [3, 7]],
        leftN: 4
    };

    // 欧拉图（每个顶点度数为偶）
    const EULER_UG = {
        v: ['0', '1', '2', '3', '4'],
        e: [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 2]]
    };

    // 有向欧拉回路图（每点入度=出度）
    const EULER_DG = {
        v: ['0', '1', '2', '3'],
        e: [[0, 1], [1, 2], [2, 0], [0, 3], [3, 0]]
    };

    // 有向欧拉路径图（恰好一点出度-入度=1，一点入度-出度=1）
    // 有向欧拉「路径」样例：顶点0 出度-入度=+1（起点），顶点4 入度-出度=+1（终点），其余平衡
    const EULER_PATH_DG = {
        v: ['0', '1', '2', '3', '4'],
        e: [[0, 1], [1, 2], [2, 0], [0, 3], [3, 4]]
    };

    // ============================================================
    // 工具
    // ============================================================

    /** 构造 GraphTracer 需要的顶点/边数组 */
    function mkVerts(labels) {
        return labels.map(l => ({ label: l }));
    }
    function mkEdges(list, directed) {
        return list.map(e => ({ u: e[0], v: e[1], weight: e.length > 2 ? e[2] : 1, directed: !!directed }));
    }
    /** 邻接表（无向双向 / 有向单向） */
    function adjOf(n, list, directed) {
        const adj = Array.from({ length: n }, () => []);
        list.forEach(e => {
            adj[e[0]].push(e[1]);
            if (!directed) adj[e[1]].push(e[0]);
        });
        return adj;
    }
    /** 带权邻接表 */
    function wadjOf(n, list, directed) {
        const adj = Array.from({ length: n }, () => []);
        list.forEach(e => {
            adj[e[0]].push({ to: e[1], w: e[2] });
            if (!directed) adj[e[1]].push({ to: e[0], w: e[2] });
        });
        return adj;
    }
    const GREEN = '#3fb950';
    const RED = '#f85149';
    const BLUE = '#58a6ff';
    const ORANGE = '#d29922';

    // ============================================================
    // 1. Tarjan 强连通分量
    // ============================================================
    const tarjanCode = `function tarjan(G) {
  let idx = 0; const low = [], num = [], onStack = [];
  const stack = [];
  for (let v = 0; v < V; v++) if (num[v] === undefined) dfs(v);

  function dfs(v) {
    num[v] = low[v] = idx++;
    stack.push(v); onStack[v] = true;
    for (const w of G.adj(v)) {
      if (num[w] === undefined) { dfs(w); low[v] = min(low[v], low[w]); }
      else if (onStack[w])      low[v] = min(low[v], num[w]);
    }
    if (low[v] === num[v]) {          // v 是 SCC 的根
      let w; const comp = [];
      do { w = stack.pop(); onStack[w] = false; comp.push(w); } while (w !== v);
    }
  }
}`;
    function tarjanRun(ctx) {
        const g = ctx.add(new GraphTracer('graph', mkVerts(DG.v), mkEdges(DG.e, true)));
        const st = ctx.add(new StackTracer('stack'));
        const log = ctx.add(new LogTracer('log'));
        const n = DG.v.length;
        const adj = adjOf(n, DG.e, true);
        const num = new Array(n).fill(-1);
        const low = new Array(n).fill(-1);
        const onStack = new Array(n).fill(false);
        const stack = [];
        let idx = 0, compCount = 0;

        ctx.line(1);
        log.printInfo('Tarjan：单遍 DFS，用 low-link 值识别强连通分量的根');

        function dfs(v) {
            num[v] = low[v] = idx++;
            stack.push(v); onStack[v] = true;
            st.push(DG.v[v]);
            g.vertices[v].tag = `${num[v]}/${low[v]}`;
            g.highlight(v, 'current', `访问 ${DG.v[v]}，num=low=${num[v]}`);
            ctx.line(6);
            for (const w of adj[v]) {
                if (num[w] === -1) {
                    g.highlightEdge(v, w, GREEN, `树边 ${DG.v[v]} → ${DG.v[w]}`);
                    dfs(w);
                    low[v] = Math.min(low[v], low[w]);
                    g.vertices[v].tag = `${num[v]}/${low[v]}`;
                    g.highlight(v, 'current', `回溯：low[${DG.v[v]}] = ${low[v]}`);
                } else if (onStack[w]) {
                    low[v] = Math.min(low[v], num[w]);
                    g.vertices[v].tag = `${num[v]}/${low[v]}`;
                    g.highlightEdge(v, w, ORANGE, `回边 ${DG.v[v]} → ${DG.v[w]}，low[${DG.v[v]}]=${low[v]}`);
                }
            }
            ctx.line(13);
            if (low[v] === num[v]) {
                const comp = [];
                let w;
                do {
                    w = stack.pop(); onStack[w] = false; st.pop();
                    comp.push(w);
                    g.vertices[w].tag = 'SCC' + compCount;
                    g.highlight(w, 'visited', `${DG.v[w]} 归入 SCC #${compCount}`);
                } while (w !== v);
                log.printSuccess(`SCC #${compCount} = { ${comp.map(x => DG.v[x]).join(', ')} }`);
                compCount++;
            }
        }

        for (let v = 0; v < n; v++) if (num[v] === -1) dfs(v);
        g.done(`✓ 共 ${compCount} 个强连通分量`);
    }

    // ============================================================
    // 2. Gabow 强连通分量（双栈）
    // ============================================================
    const gabowCode = `function gabow(G) {
  const stack1 = [], stack2 = [];  // stack1: 所有点；stack2: 候选根
  for (let v = 0; v < V; v++) if (pre[v] === undefined) dfs(v);

  function dfs(v) {
    pre[v] = cnt++;
    stack1.push(v); stack2.push(v);
    for (const w of G.adj(v)) {
      if (pre[w] === undefined) dfs(w);
      else if (id[w] === -1)                     // w 仍在栈中
        while (pre[stack2.top()] > pre[w]) stack2.pop();
    }
    if (stack2.top() === v) {                    // v 是 SCC 的根
      stack2.pop();
      let w; do { w = stack1.pop(); id[w] = sccCount; } while (w !== v);
      sccCount++;
    }
  }
}`;
    function gabowRun(ctx) {
        const g = ctx.add(new GraphTracer('graph', mkVerts(DG.v), mkEdges(DG.e, true)));
        const s1 = ctx.add(new StackTracer('stack1'));
        const s2 = ctx.add(new StackTracer('stack2'));
        const log = ctx.add(new LogTracer('log'));
        const n = DG.v.length;
        const adj = adjOf(n, DG.e, true);
        const pre = new Array(n).fill(-1);
        const id = new Array(n).fill(-1);
        const stack1 = [], stack2 = [];
        let cnt = 0, sccCount = 0;

        ctx.line(1);
        log.printInfo('Gabow：用两个栈代替 low-link，stack2 栈顶始终是当前 SCC 的候选根');

        function dfs(v) {
            pre[v] = cnt++;
            stack1.push(v); stack2.push(v);
            s1.push(DG.v[v]); s2.push(DG.v[v]);
            g.vertices[v].tag = 'pre' + pre[v];
            g.highlight(v, 'current', `访问 ${DG.v[v]}，pre=${pre[v]}`);
            for (const w of adj[v]) {
                if (pre[w] === -1) {
                    g.highlightEdge(v, w, GREEN, `树边 ${DG.v[v]} → ${DG.v[w]}`);
                    dfs(w);
                } else if (id[w] === -1) {
                    g.highlightEdge(v, w, ORANGE, `回边 ${DG.v[v]} → ${DG.v[w]}，回退候选根`);
                    while (stack2.length && pre[stack2[stack2.length - 1]] > pre[w]) {
                        const popped = stack2.pop(); s2.pop();
                        log.printInfo(`候选根 ${DG.v[popped]} 出栈（pre ${pre[popped]} > ${pre[w]}）`);
                    }
                }
            }
            if (stack2.length && stack2[stack2.length - 1] === v) {
                stack2.pop(); s2.pop();
                let w;
                const comp = [];
                do {
                    w = stack1.pop(); s1.pop();
                    id[w] = sccCount; comp.push(w);
                    g.vertices[w].tag = 'SCC' + sccCount;
                    g.highlight(w, 'visited', `${DG.v[w]} 归入 SCC #${sccCount}`);
                } while (w !== v);
                log.printSuccess(`SCC #${sccCount} = { ${comp.map(x => DG.v[x]).join(', ')} }`);
                sccCount++;
            }
        }

        for (let v = 0; v < n; v++) if (pre[v] === -1) dfs(v);
        g.done(`✓ 共 ${sccCount} 个强连通分量`);
    }

    // ============================================================
    // 3. 传递闭包（Warshall）
    // ============================================================
    const transClosureCode = `function transitiveClosure(G) {
  // reach[v][w] = v 是否可达 w
  for (let v = 0; v < V; v++) reach[v][v] = true;
  for (const (v, w) of G.edges()) reach[v][w] = true;
  for (let k = 0; k < V; k++)          // 中转点
    for (let i = 0; i < V; i++)
      for (let j = 0; j < V; j++)
        if (reach[i][k] && reach[k][j]) reach[i][j] = true;
}`;
    function transClosureRun(ctx) {
        const g = ctx.add(new GraphTracer('graph', mkVerts(DAG.v), mkEdges(DAG.e, true)));
        const tbl = ctx.add(new DPTableTracer('reach', DAG.v.length, DAG.v.length, 0));
        const log = ctx.add(new LogTracer('log'));
        tbl.setRowLabels(DAG.v);
        tbl.setColLabels(DAG.v);
        const n = DAG.v.length;
        const reach = Array.from({ length: n }, () => new Array(n).fill(false));

        ctx.line(1);
        log.printInfo('传递闭包：Floyd-Warshall 三重循环，reach[i][j] 表示 i 能否到达 j');
        for (let v = 0; v < n; v++) { reach[v][v] = true; tbl.set(v, v, 1, `${DAG.v[v]} 自身可达`); }
        DAG.e.forEach(e => {
            reach[e[0]][e[1]] = true;
            g.highlightEdge(e[0], e[1], BLUE);
            tbl.set(e[0], e[1], 1, `直连边 ${DAG.v[e[0]]} → ${DAG.v[e[1]]}`);
        });

        ctx.line(5);
        for (let k = 0; k < n; k++) {
            g.highlight(k, 'current', `以 ${DAG.v[k]} 作为中转点`);
            log.printInfo(`中转点 k = ${DAG.v[k]}`);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (!reach[i][j] && reach[i][k] && reach[k][j]) {
                        reach[i][j] = true;
                        tbl.set(i, j, 1, `${DAG.v[i]} →(经 ${DAG.v[k]})→ ${DAG.v[j]}`);
                    }
                }
            }
            g.highlight(k, 'visited');
        }
        const total = reach.flat().filter(Boolean).length;
        g.done(`✓ 传递闭包完成，共 ${total} 组可达关系`);
    }

    // ============================================================
    // 4. 拓扑排序优化版（Kahn 入度法）
    // ============================================================
    const topoXCode = `function topologicalX(G) {
  const indegree = new Array(V).fill(0);
  for (const (v, w) of G.edges()) indegree[w]++;
  const q = [];
  for (let v = 0; v < V; v++) if (indegree[v] === 0) q.push(v);
  const order = [];
  while (q.length) {
    const v = q.shift();
    order.push(v);
    for (const w of G.adj(v))
      if (--indegree[w] === 0) q.push(w);
  }
  return order.length === V ? order : null; // 有环则为 null
}`;
    function topoXRun(ctx) {
        const g = ctx.add(new GraphTracer('graph', mkVerts(DAG.v), mkEdges(DAG.e, true)));
        const q = ctx.add(new QueueTracer('queue'));
        const arr = ctx.add(new ArrayTracer('order', []));
        const log = ctx.add(new LogTracer('log'));
        const n = DAG.v.length;
        const adj = adjOf(n, DAG.e, true);
        const indeg = new Array(n).fill(0);

        ctx.line(2);
        DAG.e.forEach(e => indeg[e[1]]++);
        for (let v = 0; v < n; v++) { g.vertices[v].tag = 'in' + indeg[v]; }
        g.highlight(0, 'default', `统计入度：[${indeg.join(', ')}]`);
        log.printInfo('Kahn 算法：不断取出入度为 0 的顶点');

        ctx.line(4);
        const queue = [];
        for (let v = 0; v < n; v++) {
            if (indeg[v] === 0) { queue.push(v); q.enqueue(DAG.v[v]); g.highlight(v, 'queue', `${DAG.v[v]} 入度为 0，入队`); }
        }

        const order = [];
        ctx.line(7);
        while (queue.length) {
            const v = queue.shift(); q.dequeue();
            order.push(v);
            arr.setItems(order.map(x => DAG.v[x]));
            g.highlight(v, 'visited', `输出 ${DAG.v[v]}（第 ${order.length} 位）`);
            log.printInfo(`输出顺序 #${order.length}：${DAG.v[v]}`);
            for (const w of adj[v]) {
                indeg[w]--;
                g.vertices[w].tag = 'in' + indeg[w];
                g.highlightEdge(v, w, BLUE, `${DAG.v[w]} 入度减为 ${indeg[w]}`);
                if (indeg[w] === 0) { queue.push(w); q.enqueue(DAG.v[w]); g.highlight(w, 'queue', `${DAG.v[w]} 入度归零，入队`); }
            }
        }
        ctx.line(13);
        if (order.length === n) {
            arr.done(`✓ 拓扑序：${order.map(x => DAG.v[x]).join(' → ')}`);
        } else {
            log.printError('存在环，无拓扑序');
            g.done('✗ 图中存在环');
        }
    }

    // ============================================================
    // 5. DFS 序（前序 / 后序 / 逆后序）
    // ============================================================
    const dfsOrderCode = `function depthFirstOrder(G) {
  const pre = [], post = [];
  for (let v = 0; v < V; v++) if (!marked[v]) dfs(v);

  function dfs(v) {
    marked[v] = true;
    pre.push(v);                 // 前序：进入时记录
    for (const w of G.adj(v)) if (!marked[w]) dfs(w);
    post.push(v);                // 后序：离开时记录
  }
  // 逆后序 = post 反转 = 拓扑序
}`;
    function dfsOrderRun(ctx) {
        const g = ctx.add(new GraphTracer('graph', mkVerts(DAG.v), mkEdges(DAG.e, true)));
        const preArr = ctx.add(new ArrayTracer('pre', []));
        const postArr = ctx.add(new ArrayTracer('post', []));
        const log = ctx.add(new LogTracer('log'));
        const n = DAG.v.length;
        const adj = adjOf(n, DAG.e, true);
        const marked = new Array(n).fill(false);
        const pre = [], post = [];

        ctx.line(1);
        log.printInfo('DFS 序：前序=进入时记录，后序=离开时记录，逆后序即拓扑序');

        function dfs(v) {
            marked[v] = true;
            pre.push(v);
            preArr.setItems(pre.map(x => DAG.v[x]));
            g.vertices[v].tag = 'pre' + (pre.length - 1);
            g.highlight(v, 'current', `进入 ${DAG.v[v]}，前序 #${pre.length - 1}`);
            ctx.line(8);
            for (const w of adj[v]) {
                if (!marked[w]) {
                    g.highlightEdge(v, w, GREEN, `树边 ${DAG.v[v]} → ${DAG.v[w]}`);
                    dfs(w);
                }
            }
            post.push(v);
            postArr.setItems(post.map(x => DAG.v[x]));
            g.vertices[v].tag = `p${pre.indexOf(v)}/q${post.length - 1}`;
            g.highlight(v, 'visited', `离开 ${DAG.v[v]}，后序 #${post.length - 1}`);
            ctx.line(9);
        }

        for (let v = 0; v < n; v++) if (!marked[v]) dfs(v);
        const revPost = post.slice().reverse();
        log.printSuccess(`前序：${pre.map(x => DAG.v[x]).join(' ')}`);
        log.printSuccess(`后序：${post.map(x => DAG.v[x]).join(' ')}`);
        log.printSuccess(`逆后序（拓扑序）：${revPost.map(x => DAG.v[x]).join(' ')}`);
        g.done('✓ DFS 三种序计算完成');
    }

    // ============================================================
    // 6. 非递归 DFS（显式栈，无向图）
    // ============================================================
    const nrDFSCode = `function nonrecursiveDFS(G, s) {
  const stack = [s];
  marked[s] = true;
  while (stack.length) {
    const v = stack.pop();
    visit(v);
    for (const w of G.adj(v))
      if (!marked[w]) { marked[w] = true; stack.push(w); }
  }
}`;
    function nrDFSRun(ctx) {
        const g = ctx.add(new GraphTracer('graph', mkVerts(UG.v), mkEdges(UG.e, false)));
        const st = ctx.add(new StackTracer('stack'));
        const log = ctx.add(new LogTracer('log'));
        const n = UG.v.length;
        const adj = adjOf(n, UG.e, false);
        const marked = new Array(n).fill(false);

        ctx.line(1);
        log.printInfo('非递归 DFS：用显式栈替代函数调用栈，避免深度递归爆栈');
        const stack = [0];
        marked[0] = true;
        st.push(UG.v[0]);
        g.highlight(0, 'queue', `起点 ${UG.v[0]} 入栈`);

        let order = 0;
        ctx.line(4);
        while (stack.length) {
            const v = stack.pop(); st.pop();
            g.vertices[v].tag = '#' + (order++);
            g.visit(v);
            g.highlight(v, 'current', `弹出并访问 ${UG.v[v]}`);
            log.printInfo(`访问 ${UG.v[v]}（第 ${order} 个）`);
            for (const w of adj[v]) {
                if (!marked[w]) {
                    marked[w] = true;
                    stack.push(w); st.push(UG.v[w]);
                    g.highlightEdge(v, w, GREEN);
                    g.highlight(w, 'queue', `${UG.v[w]} 入栈`);
                }
            }
        }
        g.done(`✓ 非递归 DFS 访问了 ${order} 个顶点`);
    }

    // ============================================================
    // 7. 非递归有向 DFS（可达性）
    // ============================================================
    function nrDirDFSRun(ctx) {
        const g = ctx.add(new GraphTracer('graph', mkVerts(DG.v), mkEdges(DG.e, true)));
        const st = ctx.add(new StackTracer('stack'));
        const log = ctx.add(new LogTracer('log'));
        const n = DG.v.length;
        const adj = adjOf(n, DG.e, true);
        const marked = new Array(n).fill(false);

        ctx.line(1);
        log.printInfo('非递归有向 DFS：从源点出发，沿有向边求可达集合');
        const stack = [0];
        marked[0] = true;
        st.push(DG.v[0]);
        g.highlight(0, 'queue', `源点 ${DG.v[0]} 入栈`);

        let order = 0;
        ctx.line(4);
        while (stack.length) {
            const v = stack.pop(); st.pop();
            g.vertices[v].tag = '#' + (order++);
            g.highlight(v, 'current', `弹出并访问 ${DG.v[v]}`);
            for (const w of adj[v]) {
                if (!marked[w]) {
                    marked[w] = true;
                    stack.push(w); st.push(DG.v[w]);
                    g.highlightEdge(v, w, GREEN);
                    g.highlight(w, 'queue', `${DG.v[w]} 入栈`);
                } else {
                    g.highlightEdge(v, w, ORANGE, `${DG.v[w]} 已访问，跳过`);
                }
            }
            g.highlight(v, 'visited');
        }
        const reach = marked.map((m, i) => m ? DG.v[i] : null).filter(Boolean);
        log.printSuccess(`可达集合：{ ${reach.join(', ')} }`);
        g.done(`✓ 从 ${DG.v[0]} 可达 ${reach.length} 个顶点`);
    }

    // ============================================================
    // 8. 有向图可达性（多源 DirectedDFS）
    // ============================================================
    const dirDFSCode = `function DirectedDFS(G, sources) {
  for (const s of sources) if (!marked[s]) dfs(s);

  function dfs(v) {
    marked[v] = true;
    for (const w of G.adj(v)) if (!marked[w]) dfs(w);
  }
  // marked[v] === true ⟺ 某个源点可达 v
}`;
    function dirDFSRun(ctx) {
        const g = ctx.add(new GraphTracer('graph', mkVerts(DG.v), mkEdges(DG.e, true)));
        const log = ctx.add(new LogTracer('log'));
        const n = DG.v.length;
        const adj = adjOf(n, DG.e, true);
        const marked = new Array(n).fill(false);
        const sources = [0, 3];

        ctx.line(1);
        log.printInfo(`多源可达性：源点 { ${sources.map(s => DG.v[s]).join(', ')} }`);
        function dfs(v) {
            marked[v] = true;
            g.vertices[v].tag = '✓';
            g.highlight(v, 'current', `${DG.v[v]} 可达`);
            for (const w of adj[v]) {
                if (!marked[w]) {
                    g.highlightEdge(v, w, GREEN);
                    dfs(w);
                }
            }
            g.highlight(v, 'visited');
        }
        for (const s of sources) {
            if (!marked[s]) {
                g.highlight(s, 'current', `从源点 ${DG.v[s]} 出发`);
                dfs(s);
            }
        }
        const reach = marked.map((m, i) => m ? DG.v[i] : null).filter(Boolean);
        log.printSuccess(`可达集合：{ ${reach.join(', ')} }`);
        g.done(`✓ 共 ${reach.length} 个顶点可达`);
    }

    // ============================================================
    // 9. 有向图 BFS 路径
    // ============================================================
    const bfsDirCode = `function BreadthFirstDirectedPaths(G, s) {
  const q = [s]; marked[s] = true; distTo[s] = 0;
  while (q.length) {
    const v = q.shift();
    for (const w of G.adj(v))
      if (!marked[w]) {
        edgeTo[w] = v; distTo[w] = distTo[v] + 1;
        marked[w] = true; q.push(w);
      }
  }
}`;
    function bfsDirRun(ctx) {
        const g = ctx.add(new GraphTracer('graph', mkVerts(DG.v), mkEdges(DG.e, true)));
        const q = ctx.add(new QueueTracer('queue'));
        const log = ctx.add(new LogTracer('log'));
        const n = DG.v.length;
        const adj = adjOf(n, DG.e, true);
        const marked = new Array(n).fill(false);
        const edgeTo = new Array(n).fill(-1);
        const distTo = new Array(n).fill(Infinity);

        ctx.line(1);
        log.printInfo('有向图 BFS：按层扩展，得到源点到各点的最少边数路径');
        const queue = [0];
        marked[0] = true; distTo[0] = 0;
        q.enqueue(DG.v[0]);
        g.vertices[0].tag = 'd0';
        g.highlight(0, 'queue', `源点 ${DG.v[0]} 入队，dist=0`);

        ctx.line(3);
        while (queue.length) {
            const v = queue.shift(); q.dequeue();
            g.highlight(v, 'current', `出队 ${DG.v[v]}（dist=${distTo[v]}）`);
            for (const w of adj[v]) {
                if (!marked[w]) {
                    edgeTo[w] = v;
                    distTo[w] = distTo[v] + 1;
                    marked[w] = true;
                    queue.push(w); q.enqueue(DG.v[w]);
                    g.vertices[w].tag = 'd' + distTo[w];
                    g.highlightEdge(v, w, GREEN, `${DG.v[w]} dist=${distTo[w]}`);
                    g.highlight(w, 'queue');
                }
            }
            g.highlight(v, 'visited');
        }
        // 回溯一条路径
        const target = n - 1;
        if (distTo[target] < Infinity) {
            const path = [];
            for (let x = target; x !== -1; x = edgeTo[x]) path.push(x);
            path.reverse();
            g.markPath(path);
            log.printSuccess(`${DG.v[0]} → ${DG.v[target]} 最短路径（${distTo[target]} 条边）：${path.map(x => DG.v[x]).join(' → ')}`);
        }
        g.done('✓ BFS 路径计算完成');
    }

    // ============================================================
    // 10. 有向图 DFS 路径
    // ============================================================
    function dfsDirRun(ctx) {
        const g = ctx.add(new GraphTracer('graph', mkVerts(DG.v), mkEdges(DG.e, true)));
        const st = ctx.add(new StackTracer('path'));
        const log = ctx.add(new LogTracer('log'));
        const n = DG.v.length;
        const adj = adjOf(n, DG.e, true);
        const marked = new Array(n).fill(false);
        const edgeTo = new Array(n).fill(-1);

        ctx.line(1);
        log.printInfo('有向图 DFS 路径：edgeTo[] 记录 DFS 树的父边，可回溯任意可达点的路径');
        function dfs(v) {
            marked[v] = true;
            st.push(DG.v[v]);
            g.highlight(v, 'current', `进入 ${DG.v[v]}`);
            for (const w of adj[v]) {
                if (!marked[w]) {
                    edgeTo[w] = v;
                    g.highlightEdge(v, w, GREEN, `edgeTo[${DG.v[w]}] = ${DG.v[v]}`);
                    dfs(w);
                }
            }
            st.pop();
            g.highlight(v, 'visited', `离开 ${DG.v[v]}`);
        }
        dfs(0);
        const target = n - 1;
        if (marked[target]) {
            const path = [];
            for (let x = target; x !== -1; x = edgeTo[x]) path.push(x);
            path.reverse();
            g.markPath(path);
            log.printSuccess(`DFS 路径 ${DG.v[0]} → ${DG.v[target]}：${path.map(x => DG.v[x]).join(' → ')}`);
        }
        g.done('✓ DFS 路径计算完成');
    }

    // ============================================================
    // 11. 有向环检测优化版（入度法，非递归）
    // ============================================================
    const dcycXCode = `function DirectedCycleX(G) {
  // 反复删除入度为 0 的顶点；剩下的顶点必定构成环
  const indegree = [...]; const q = [入度为0的点];
  while (q.length) { const v = q.shift();
    for (const w of G.adj(v)) if (--indegree[w] === 0) q.push(w); }
  // 仍有 indegree > 0 的顶点 ⟹ 存在有向环
}`;
    function dcycXRun(ctx) {
        // 专用样例：前 3 个点可依次删除，剩下 {3,4,5} 构成有向环，剥离过程清晰可见
        const S = {
            v: ['0', '1', '2', '3', '4', '5'],
            e: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 5], [5, 3]]
        };
        const g = ctx.add(new GraphTracer('graph', mkVerts(S.v), mkEdges(S.e, true)));
        const q = ctx.add(new QueueTracer('queue'));
        const log = ctx.add(new LogTracer('log'));
        const n = S.v.length;
        const adj = adjOf(n, S.e, true);
        const indeg = new Array(n).fill(0);
        S.e.forEach(e => indeg[e[1]]++);
        for (let v = 0; v < n; v++) g.vertices[v].tag = 'in' + indeg[v];

        ctx.line(1);
        log.printInfo('非递归环检测：反复删除入度为 0 的点，剩余顶点即在环上');
        const queue = [];
        for (let v = 0; v < n; v++) if (indeg[v] === 0) { queue.push(v); q.enqueue(S.v[v]); g.highlight(v, 'queue', `${S.v[v]} 入度为 0，入队`); }

        let removed = 0;
        ctx.line(3);
        while (queue.length) {
            const v = queue.shift(); q.dequeue();
            removed++;
            g.highlight(v, 'visited', `删除入度 0 的 ${S.v[v]}（已删 ${removed}/${n}）`);
            for (const w of adj[v]) {
                indeg[w]--;
                g.vertices[w].tag = 'in' + indeg[w];
                g.highlightEdge(v, w, BLUE, `移除边 ${S.v[v]} → ${S.v[w]}，${S.v[w]} 入度降为 ${indeg[w]}`);
                if (indeg[w] === 0) { queue.push(w); q.enqueue(S.v[w]); g.highlight(w, 'queue', `${S.v[w]} 入度归 0，入队`); }
            }
        }
        ctx.line(5);
        if (removed < n) {
            const onCycle = [];
            for (let v = 0; v < n; v++) if (indeg[v] > 0) { onCycle.push(v); g.highlight(v, 'path', `${S.v[v]} 无法删除，位于环上`); }
            log.printWarning(`存在有向环，环上顶点：{ ${onCycle.map(x => S.v[x]).join(', ')} }`);
            g.done(`✗ 存在有向环（${onCycle.length} 个顶点在环上）`);
        } else {
            log.printSuccess('无环（DAG）');
            g.done('✓ 图是 DAG，无有向环');
        }
    }

    // ============================================================
    // 12. 带权有向图环检测
    // ============================================================
    function ewDirCycleRun(ctx) {
        const sample = {
            v: ['0', '1', '2', '3', '4'],
            e: [[0, 1, 5], [1, 2, 3], [2, 3, 2], [3, 1, 4], [3, 4, 6]]
        };
        const g = ctx.add(new GraphTracer('graph', mkVerts(sample.v), mkEdges(sample.e, true)));
        const st = ctx.add(new StackTracer('dfs栈'));
        const log = ctx.add(new LogTracer('log'));
        const n = sample.v.length;
        const wadj = wadjOf(n, sample.e, true);
        const marked = new Array(n).fill(false);
        const onStack = new Array(n).fill(false);
        const edgeTo = new Array(n).fill(-1);
        let cycle = null;

        ctx.line(1);
        log.printInfo('带权有向图环检测：DFS 中若遇到仍在递归栈上的顶点，则找到有向环');
        function dfs(v) {
            marked[v] = true; onStack[v] = true;
            st.push(sample.v[v]);
            g.highlight(v, 'current', `进入 ${sample.v[v]}（在栈上）`);
            for (const { to: w, w: wt } of wadj[v]) {
                if (cycle) return;
                if (!marked[w]) {
                    edgeTo[w] = v;
                    g.highlightEdge(v, w, GREEN, `树边 ${sample.v[v]} →(${wt}) ${sample.v[w]}`);
                    dfs(w);
                } else if (onStack[w]) {
                    cycle = [];
                    for (let x = v; x !== w; x = edgeTo[x]) cycle.push(x);
                    cycle.push(w); cycle.reverse();
                    g.highlightEdge(v, w, RED, `回边 ${sample.v[v]} → ${sample.v[w]}，发现环`);
                    log.printWarning(`发现有向环：${cycle.map(x => sample.v[x]).join(' → ')} → ${sample.v[cycle[0]]}`);
                    g.markPath(cycle);
                    return;
                }
            }
            onStack[v] = false; st.pop();
            g.highlight(v, 'visited', `离开 ${sample.v[v]}`);
        }
        for (let v = 0; v < n && !cycle; v++) if (!marked[v]) dfs(v);
        g.done(cycle ? `✗ 存在带权有向环（长度 ${cycle.length}）` : '✓ 无环');
    }

    // ============================================================
    // 13. 惰性 Prim 最小生成树
    // ============================================================
    const lazyPrimCode = `function LazyPrimMST(G) {
  const pq = new MinPQ();   // 存放"横切边"
  visit(0);
  while (!pq.isEmpty()) {
    const e = pq.delMin();          // 权值最小的横切边
    const [v, w] = e.endpoints();
    if (marked[v] && marked[w]) continue;   // 惰性：跳过失效边
    mst.push(e);
    if (!marked[v]) visit(v);
    if (!marked[w]) visit(w);
  }
}
function visit(v) { marked[v] = true;
  for (const e of G.adj(v)) if (!marked[e.other(v)]) pq.insert(e); }`;
    function lazyPrimRun(ctx) {
        const g = ctx.add(new GraphTracer('graph', mkVerts(EWG.v), mkEdges(EWG.e, false)));
        const log = ctx.add(new LogTracer('log'));
        const n = EWG.v.length;
        const wadj = wadjOf(n, EWG.e, false);
        const marked = new Array(n).fill(false);
        const pq = [];
        const mst = [];
        let total = 0;

        const syncPQ = () => log.printInfo('优先队列：[' + pq.slice().sort((a, b) => a.w - b.w).map(e => `${EWG.v[e.u]}-${EWG.v[e.v]}:${e.w}`).join(', ') + ']');

        ctx.line(1);
        log.printInfo('惰性 Prim：优先队列存所有横切边，取出时才判断是否失效');
        function visit(v) {
            marked[v] = true;
            g.highlight(v, 'tree', `${EWG.v[v]} 加入生成树`);
            for (const { to: w, w: wt } of wadj[v]) {
                if (!marked[w]) { pq.push({ u: v, v: w, w: wt }); }
            }
            syncPQ();
        }
        visit(0);
        ctx.line(4);
        while (pq.length && mst.length < n - 1) {
            pq.sort((a, b) => a.w - b.w);
            const e = pq.shift();
            syncPQ();
            if (marked[e.u] && marked[e.v]) {
                g.highlightEdge(e.u, e.v, ORANGE, `边 ${EWG.v[e.u]}-${EWG.v[e.v]} 已失效（两端都在树中）`);
                continue;
            }
            mst.push(e); total += e.w;
            g.highlightEdge(e.u, e.v, GREEN, `选中最小横切边 ${EWG.v[e.u]}-${EWG.v[e.v]} = ${e.w}`);
            g.edges.forEach(ed => { if ((ed.u === e.u && ed.v === e.v) || (ed.u === e.v && ed.v === e.u)) ed.state = 'tree'; });
            log.printSuccess(`加入 MST：${EWG.v[e.u]}-${EWG.v[e.v]} (${e.w})，累计权重 ${total}`);
            if (!marked[e.u]) visit(e.u);
            if (!marked[e.v]) visit(e.v);
        }
        g.done(`✓ MST 共 ${mst.length} 条边，总权重 ${total}`);
    }

    // ============================================================
    // 14. Boruvka 最小生成树
    // ============================================================
    const boruvkaCode = `function BoruvkaMST(G) {
  const uf = new UF(V);
  for (let t = 1; t < V && mst.length < V-1; t += t) {
    const closest = new Array(V).fill(null);
    for (const e of G.edges()) {           // 为每个分量找最短出边
      const i = uf.find(e.v), j = uf.find(e.w);
      if (i === j) continue;
      if (!closest[i] || e.weight < closest[i].weight) closest[i] = e;
      if (!closest[j] || e.weight < closest[j].weight) closest[j] = e;
    }
    for (const e of closest)               // 合并
      if (e && uf.find(e.v) !== uf.find(e.w)) { mst.push(e); uf.union(e.v, e.w); }
  }
}`;
    function boruvkaRun(ctx) {
        const g = ctx.add(new GraphTracer('graph', mkVerts(EWG.v), mkEdges(EWG.e, false)));
        const compArr = ctx.add(new ArrayTracer('分量id', []));
        const log = ctx.add(new LogTracer('log'));
        const n = EWG.v.length;
        const parent = Array.from({ length: n }, (_, i) => i);
        const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
        const union = (a, b) => { parent[find(a)] = find(b); };
        const mst = [];
        let total = 0;
        const sync = () => {
            compArr.setItems(EWG.v.map((_, i) => String(find(i))));
            for (let i = 0; i < n; i++) g.vertices[i].tag = 'c' + find(i);
        };

        ctx.line(1);
        log.printInfo('Boruvka：每轮为每个连通分量找最短出边并合并，轮数 O(log V)');
        sync();
        let round = 0;
        while (mst.length < n - 1) {
            round++;
            log.printInfo(`—— 第 ${round} 轮 ——`);
            const closest = new Array(n).fill(null);
            ctx.line(4);
            for (const e of EWG.e) {
                const i = find(e[0]), j = find(e[1]);
                if (i === j) continue;
                g.highlightEdge(e[0], e[1], BLUE, `考察边 ${EWG.v[e[0]]}-${EWG.v[e[1]]} = ${e[2]}`);
                if (!closest[i] || e[2] < closest[i][2]) closest[i] = e;
                if (!closest[j] || e[2] < closest[j][2]) closest[j] = e;
            }
            let merged = 0;
            ctx.line(11);
            for (const e of closest) {
                if (!e) continue;
                if (find(e[0]) === find(e[1])) continue;
                mst.push(e); total += e[2]; merged++;
                union(e[0], e[1]);
                g.edges.forEach(ed => { if ((ed.u === e[0] && ed.v === e[1]) || (ed.u === e[1] && ed.v === e[0])) ed.state = 'tree'; });
                g.highlightEdge(e[0], e[1], GREEN, `合并：${EWG.v[e[0]]}-${EWG.v[e[1]]} (${e[2]})`);
                log.printSuccess(`加入 MST：${EWG.v[e[0]]}-${EWG.v[e[1]]} (${e[2]})`);
                sync();
            }
            if (merged === 0) break;
        }
        g.done(`✓ Boruvka 完成，${round} 轮，MST 权重 ${total}`);
    }

    // ============================================================
    // 15. 无向图 Dijkstra
    // ============================================================
    const dijkstraUndirCode = `function DijkstraUndirectedSP(G, s) {
  distTo.fill(Infinity); distTo[s] = 0;
  const pq = new IndexMinPQ(); pq.insert(s, 0);
  while (!pq.isEmpty()) {
    const v = pq.delMin();
    for (const e of G.adj(v)) relax(e, v);
  }
}
function relax(e, v) {
  const w = e.other(v);
  if (distTo[w] > distTo[v] + e.weight) {
    distTo[w] = distTo[v] + e.weight; edgeTo[w] = e;
    pq.insertOrDecrease(w, distTo[w]);
  }
}`;
    function dijkstraUndirRun(ctx) {
        const g = ctx.add(new GraphTracer('graph', mkVerts(EWG.v), mkEdges(EWG.e, false)));
        const log = ctx.add(new LogTracer('log'));
        const n = EWG.v.length;
        const wadj = wadjOf(n, EWG.e, false);
        const dist = new Array(n).fill(Infinity);
        const edgeTo = new Array(n).fill(-1);
        const done = new Array(n).fill(false);

        const sync = () => {
            for (let i = 0; i < n; i++) g.vertices[i].tag = dist[i] === Infinity ? '∞' : String(dist[i]);
        };

        ctx.line(1);
        dist[0] = 0; sync();
        log.printInfo(`无向图 Dijkstra：源点 ${EWG.v[0]}，每次取未确定顶点中 dist 最小者`);

        ctx.line(4);
        for (let iter = 0; iter < n; iter++) {
            let v = -1, best = Infinity;
            for (let i = 0; i < n; i++) if (!done[i] && dist[i] < best) { best = dist[i]; v = i; }
            if (v === -1) break;
            done[v] = true;
            g.highlight(v, 'current', `确定 ${EWG.v[v]}，最短距离 ${dist[v]}`);
            log.printInfo(`确定顶点 ${EWG.v[v]}，dist = ${dist[v]}`);
            ctx.line(9);
            for (const { to: w, w: wt } of wadj[v]) {
                if (dist[v] + wt < dist[w]) {
                    dist[w] = dist[v] + wt; edgeTo[w] = v;
                    sync();
                    g.highlightEdge(v, w, GREEN, `松弛 ${EWG.v[w]}：dist = ${dist[w]}`);
                } else {
                    g.highlightEdge(v, w, ORANGE, `${EWG.v[w]} 无需松弛（${dist[v] + wt} ≥ ${dist[w] === Infinity ? '∞' : dist[w]}）`);
                }
            }
            g.highlight(v, 'visited');
        }
        const target = n - 1;
        if (dist[target] < Infinity) {
            const path = [];
            for (let x = target; x !== -1; x = edgeTo[x]) path.push(x);
            path.reverse();
            g.markPath(path);
            log.printSuccess(`${EWG.v[0]} → ${EWG.v[target]} 最短路 ${dist[target]}：${path.map(x => EWG.v[x]).join(' → ')}`);
        }
        g.done('✓ 无向图 Dijkstra 完成');
    }

    // ============================================================
    // 16. 全源最短路（Dijkstra × V）
    // ============================================================
    function dijkstraAllRun(ctx) {
        const g = ctx.add(new GraphTracer('graph', mkVerts(EWG.v), mkEdges(EWG.e, false)));
        const n = EWG.v.length;
        const tbl = ctx.add(new DPTableTracer('全源距离', n, n, '∞'));
        const log = ctx.add(new LogTracer('log'));
        tbl.setRowLabels(EWG.v);
        tbl.setColLabels(EWG.v);
        const wadj = wadjOf(n, EWG.e, false);

        ctx.line(1);
        log.printInfo('全源最短路：以每个顶点为源各跑一次 Dijkstra，时间 O(V · E log V)');
        for (let s = 0; s < n; s++) {
            const dist = new Array(n).fill(Infinity);
            const done = new Array(n).fill(false);
            dist[s] = 0;
            g.highlight(s, 'current', `以 ${EWG.v[s]} 为源`);
            tbl.set(s, s, 0, `dist[${EWG.v[s]}][${EWG.v[s]}] = 0`);
            for (let iter = 0; iter < n; iter++) {
                let v = -1, best = Infinity;
                for (let i = 0; i < n; i++) if (!done[i] && dist[i] < best) { best = dist[i]; v = i; }
                if (v === -1) break;
                done[v] = true;
                for (const { to: w, wt } of []) { /* noop */ }
                for (const item of wadj[v]) {
                    const w = item.to, wt = item.w;
                    if (dist[v] + wt < dist[w]) {
                        dist[w] = dist[v] + wt;
                        tbl.set(s, w, dist[w], `dist[${EWG.v[s]}][${EWG.v[w]}] = ${dist[w]}`);
                    }
                }
            }
            g.highlight(s, 'visited');
            log.printSuccess(`源 ${EWG.v[s]} 完成：[${dist.map(d => d === Infinity ? '∞' : d).join(', ')}]`);
        }
        g.done('✓ 全源最短路矩阵计算完成');
    }

    // ============================================================
    // 17. 套利检测（负环 / Bellman-Ford）
    // ============================================================
    const arbitrageCode = `function Arbitrage(rates) {
  // 边权取 -ln(rate)，则"汇率乘积 > 1" ⟺ "权重和 < 0"
  for (let i = 0; i < V; i++)
    for (let j = 0; j < V; j++)
      weight[i][j] = -Math.log(rates[i][j]);
  // Bellman-Ford 找负环 ⟹ 存在套利机会
}`;
    function arbitrageRun(ctx) {
        const names = ['USD', 'EUR', 'GBP', 'CHF', 'CAD'];
        const rate = [
            [1.000, 0.741, 0.657, 1.061, 1.005],
            [1.349, 1.000, 0.888, 1.433, 1.366],
            [1.521, 1.126, 1.000, 1.614, 1.538],
            [0.942, 0.698, 0.619, 1.000, 0.953],
            [0.995, 0.732, 0.650, 1.049, 1.000]
        ];
        const n = names.length;
        const es = [];
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) es.push([i, j, +(-Math.log(rate[i][j])).toFixed(3)]);
        const g = ctx.add(new GraphTracer('汇率图', mkVerts(names), mkEdges(es.filter(e => e[0] === 0 || e[1] === 0 || Math.abs(e[0] - e[1]) === 1), true)));
        const log = ctx.add(new LogTracer('log'));

        const dist = new Array(n).fill(Infinity);
        const edgeTo = new Array(n).fill(-1);
        dist[0] = 0;
        const sync = () => {
            for (let i = 0; i < n; i++) g.vertices[i].tag = dist[i] === Infinity ? '∞' : dist[i].toFixed(2);
        };

        ctx.line(1);
        log.printInfo('套利检测：边权 = -ln(汇率)，负权环 ⟺ 汇率乘积 > 1 ⟹ 存在套利');
        sync();

        let last = -1;
        for (let pass = 0; pass < n; pass++) {
            last = -1;
            g.highlight(pass % n, 'current', `第 ${pass + 1} 轮松弛`);
            for (const [u, v, w] of es) {
                if (dist[u] < Infinity && dist[u] + w < dist[v] - 1e-12) {
                    dist[v] = dist[u] + w; edgeTo[v] = u; last = v;
                }
            }
            sync();
            log.printInfo(`第 ${pass + 1} 轮后 dist = [${dist.map(d => d === Infinity ? '∞' : d.toFixed(3)).join(', ')}]`);
            if (last === -1) break;
        }

        if (last !== -1) {
            // 第 V 轮仍能松弛 ⟹ 有负环
            let x = last;
            for (let i = 0; i < n; i++) x = edgeTo[x];
            const cyc = [];
            let y = x;
            do { cyc.push(y); y = edgeTo[y]; } while (y !== x && cyc.length <= n);
            cyc.push(x); cyc.reverse();
            g.markPath(cyc);
            let amount = 1000;
            const steps = [];
            for (let i = 0; i < cyc.length - 1; i++) {
                const a = cyc[i], b = cyc[i + 1];
                amount *= rate[a][b];
                steps.push(`${names[a]} → ${names[b]}：${amount.toFixed(2)}`);
            }
            steps.forEach(s => log.printSuccess(s));
            log.printSuccess(`1000 ${names[cyc[0]]} 经套利环变为 ${amount.toFixed(2)} ${names[cyc[cyc.length - 1]]}`);
            g.done(`✓ 发现套利机会（负权环，收益 ${(amount - 1000).toFixed(2)}）`);
        } else {
            g.done('✓ 无套利机会（无负权环）');
        }
    }

    // ============================================================
    // 18. 关键路径法 CPM
    // ============================================================
    const cpmCode = `function CPM(jobs) {
  // 每个作业拆成"开始点"与"结束点"，用时长做边权
  // 加虚拟源 s 与虚拟汇 t
  // 在这张 DAG 上求最长路 ⟹ 关键路径 = 项目最短工期
  const lp = new AcyclicLP(G, s);
  finishTime = lp.distTo(t);
}`;
    function cpmRun(ctx) {
        const jobs = [
            { name: 'A', dur: 41, pre: [] },
            { name: 'B', dur: 51, pre: [0] },
            { name: 'C', dur: 50, pre: [] },
            { name: 'D', dur: 36, pre: [1, 2] },
            { name: 'E', dur: 38, pre: [1] },
            { name: 'F', dur: 45, pre: [3, 4] }
        ];
        const n = jobs.length;
        const labels = jobs.map(j => j.name);
        const es = [];
        jobs.forEach((j, i) => j.pre.forEach(p => es.push([p, i, jobs[p].dur])));
        const g = ctx.add(new GraphTracer('作业图', mkVerts(labels), mkEdges(es, true)));
        const log = ctx.add(new LogTracer('log'));

        const est = new Array(n).fill(0);   // earliest start time
        const edgeTo = new Array(n).fill(-1);
        const sync = () => { for (let i = 0; i < n; i++) g.vertices[i].tag = String(est[i]); };
        // 拓扑序
        const indeg = new Array(n).fill(0);
        es.forEach(e => indeg[e[1]]++);
        const q = [], order = [];
        for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
        const adjW = wadjOf(n, es, true);
        while (q.length) {
            const v = q.shift(); order.push(v);
            for (const { to: w } of adjW[v]) if (--indeg[w] === 0) q.push(w);
        }

        ctx.line(1);
        log.printInfo('关键路径法：在作业 DAG 上求最长路，长度即项目最短工期');
        log.printInfo(`拓扑序：${order.map(x => labels[x]).join(' → ')}`);

        ctx.line(5);
        for (const v of order) {
            g.highlight(v, 'current', `处理作业 ${labels[v]}（工期 ${jobs[v].dur}）`);
            for (const { to: w, w: wt } of adjW[v]) {
                if (est[v] + wt > est[w]) {
                    est[w] = est[v] + wt; edgeTo[w] = v;
                    sync();
                    g.highlightEdge(v, w, GREEN, `${labels[w]} 最早开始 = ${est[w]}`);
                }
            }
            g.highlight(v, 'visited');
        }
        // 找完成时间最大者
        let finish = 0, last = 0;
        for (let i = 0; i < n; i++) if (est[i] + jobs[i].dur > finish) { finish = est[i] + jobs[i].dur; last = i; }
        const path = [];
        for (let x = last; x !== -1; x = edgeTo[x]) path.push(x);
        path.reverse();
        g.markPath(path);
        log.printSuccess(`关键路径：${path.map(x => labels[x]).join(' → ')}`);
        log.printSuccess(`项目最短工期：${finish}`);
        g.done(`✓ 关键路径长度 ${finish}`);
    }

    // ============================================================
    // 19. 无向欧拉回路（Hierholzer）
    // ============================================================
    const eulerCode = `function EulerianCycle(G) {
  // 前提：连通且所有顶点度数为偶数
  const stack = [0], cycle = [];
  while (stack.length) {
    const v = stack[stack.length - 1];
    if (有未用边 (v, w)) { 标记该边已用; stack.push(w); }
    else cycle.push(stack.pop());
  }
  return cycle.reverse();
}`;
    function eulerCycleRun(ctx) {
        const S = EULER_UG;
        const g = ctx.add(new GraphTracer('graph', mkVerts(S.v), mkEdges(S.e, false)));
        const st = ctx.add(new StackTracer('stack'));
        const arr = ctx.add(new ArrayTracer('回路', []));
        const log = ctx.add(new LogTracer('log'));
        const n = S.v.length;
        const deg = new Array(n).fill(0);
        S.e.forEach(e => { deg[e[0]]++; deg[e[1]]++; });
        for (let i = 0; i < n; i++) g.vertices[i].tag = 'd' + deg[i];

        ctx.line(1);
        log.printInfo(`度数：[${deg.join(', ')}]，全部为偶 ⟹ 存在欧拉回路`);
        const used = new Array(S.e.length).fill(false);
        const inc = Array.from({ length: n }, () => []);
        S.e.forEach((e, i) => { inc[e[0]].push({ to: e[1], i }); inc[e[1]].push({ to: e[0], i }); });

        const stack = [0];
        st.push(S.v[0]);
        const cycle = [];
        ctx.line(3);
        while (stack.length) {
            const v = stack[stack.length - 1];
            const nxt = inc[v].find(x => !used[x.i]);
            if (nxt) {
                used[nxt.i] = true;
                stack.push(nxt.to); st.push(S.v[nxt.to]);
                g.highlightEdge(v, nxt.to, GREEN, `走边 ${S.v[v]}-${S.v[nxt.to]}`);
                g.highlight(nxt.to, 'current');
            } else {
                const x = stack.pop(); st.pop();
                cycle.push(x);
                arr.setItems(cycle.slice().reverse().map(i => S.v[i]));
                g.highlight(x, 'visited', `${S.v[x]} 无未用边，加入回路`);
            }
        }
        cycle.reverse();
        arr.setItems(cycle.map(i => S.v[i]));
        log.printSuccess(`欧拉回路：${cycle.map(i => S.v[i]).join(' → ')}`);
        g.done(`✓ 欧拉回路含 ${cycle.length - 1} 条边`);
    }

    // ============================================================
    // 20. 有向欧拉回路
    // ============================================================
    function dirEulerCycleRun(ctx) {
        const S = EULER_DG;
        const g = ctx.add(new GraphTracer('graph', mkVerts(S.v), mkEdges(S.e, true)));
        const st = ctx.add(new StackTracer('stack'));
        const arr = ctx.add(new ArrayTracer('回路', []));
        const log = ctx.add(new LogTracer('log'));
        const n = S.v.length;
        const indeg = new Array(n).fill(0), outdeg = new Array(n).fill(0);
        S.e.forEach(e => { outdeg[e[0]]++; indeg[e[1]]++; });
        for (let i = 0; i < n; i++) g.vertices[i].tag = `${indeg[i]}/${outdeg[i]}`;

        ctx.line(1);
        log.printInfo('有向欧拉回路前提：每个顶点入度 = 出度（标签显示 入度/出度）');
        const ptr = new Array(n).fill(0);
        const out = Array.from({ length: n }, () => []);
        S.e.forEach(e => out[e[0]].push(e[1]));

        const stack = [0]; st.push(S.v[0]);
        const cycle = [];
        while (stack.length) {
            const v = stack[stack.length - 1];
            if (ptr[v] < out[v].length) {
                const w = out[v][ptr[v]++];
                stack.push(w); st.push(S.v[w]);
                g.highlightEdge(v, w, GREEN, `走边 ${S.v[v]} → ${S.v[w]}`);
                g.highlight(w, 'current');
            } else {
                const x = stack.pop(); st.pop();
                cycle.push(x);
                arr.setItems(cycle.slice().reverse().map(i => S.v[i]));
                g.highlight(x, 'visited', `${S.v[x]} 出边耗尽，加入回路`);
            }
        }
        cycle.reverse();
        arr.setItems(cycle.map(i => S.v[i]));
        log.printSuccess(`有向欧拉回路：${cycle.map(i => S.v[i]).join(' → ')}`);
        g.done(`✓ 有向欧拉回路含 ${cycle.length - 1} 条边`);
    }

    // ============================================================
    // 21. 有向欧拉路径
    // ============================================================
    function dirEulerPathRun(ctx) {
        const S = EULER_PATH_DG;
        const g = ctx.add(new GraphTracer('graph', mkVerts(S.v), mkEdges(S.e, true)));
        const st = ctx.add(new StackTracer('stack'));
        const arr = ctx.add(new ArrayTracer('路径', []));
        const log = ctx.add(new LogTracer('log'));
        const n = S.v.length;
        const indeg = new Array(n).fill(0), outdeg = new Array(n).fill(0);
        S.e.forEach(e => { outdeg[e[0]]++; indeg[e[1]]++; });
        for (let i = 0; i < n; i++) g.vertices[i].tag = `${indeg[i]}/${outdeg[i]}`;

        ctx.line(1);
        let start = 0, deficit = 0, surplus = 0;
        for (let i = 0; i < n; i++) {
            if (outdeg[i] - indeg[i] === 1) { start = i; surplus++; }
            else if (indeg[i] - outdeg[i] === 1) deficit++;
        }
        log.printInfo(`起点 ${S.v[start]}（出度-入度=1），终点为入度-出度=1 的顶点`);
        if (surplus > 1 || deficit > 1) { log.printError('不满足欧拉路径条件'); g.done('✗ 无欧拉路径'); return; }
        g.highlight(start, 'current', `选定起点 ${S.v[start]}`);

        const ptr = new Array(n).fill(0);
        const out = Array.from({ length: n }, () => []);
        S.e.forEach(e => out[e[0]].push(e[1]));
        const stack = [start]; st.push(S.v[start]);
        const path = [];
        while (stack.length) {
            const v = stack[stack.length - 1];
            if (ptr[v] < out[v].length) {
                const w = out[v][ptr[v]++];
                stack.push(w); st.push(S.v[w]);
                g.highlightEdge(v, w, GREEN, `走边 ${S.v[v]} → ${S.v[w]}`);
                g.highlight(w, 'current');
            } else {
                const x = stack.pop(); st.pop();
                path.push(x);
                arr.setItems(path.slice().reverse().map(i => S.v[i]));
                g.highlight(x, 'visited');
            }
        }
        path.reverse();
        arr.setItems(path.map(i => S.v[i]));
        log.printSuccess(`欧拉路径：${path.map(i => S.v[i]).join(' → ')}`);
        g.done(`✓ 欧拉路径含 ${path.length - 1} 条边`);
    }

    // ============================================================
    // 22. Ford-Fulkerson 最大流（Edmonds-Karp）
    // ============================================================
    const maxflowCode = `function FordFulkerson(G, s, t) {
  let value = 0;
  while (hasAugmentingPath(G, s, t)) {   // BFS 找增广路
    let bottle = Infinity;
    for (let v = t; v !== s; v = edgeTo[v].other(v))
      bottle = min(bottle, edgeTo[v].residualCapacityTo(v));
    for (let v = t; v !== s; v = edgeTo[v].other(v))
      edgeTo[v].addResidualFlowTo(v, bottle);
    value += bottle;
  }
  return value;
}`;
    function maxflowRun(ctx) {
        const S = FLOW;
        const n = S.v.length;
        const g = ctx.add(new GraphTracer('流网络', mkVerts(S.v), mkEdges(S.e, true)));
        const tbl = ctx.add(new DPTableTracer('残量', n, n, 0));
        const log = ctx.add(new LogTracer('log'));
        tbl.setRowLabels(S.v);
        tbl.setColLabels(S.v);
        const cap = Array.from({ length: n }, () => new Array(n).fill(0));
        S.e.forEach(e => { cap[e[0]][e[1]] = e[2]; });
        const syncTbl = (desc) => {
            for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) tbl.cells[i][j] = { value: cap[i][j] || 0, state: 'default' };
            tbl._commit({ type: 'snapshot', description: desc || '更新残量网络' });
        };
        syncTbl('初始容量矩阵');

        const s = 0, t = n - 1;
        let maxflow = 0, round = 0;
        ctx.line(1);
        log.printInfo(`Edmonds-Karp：BFS 找最短增广路，源 ${S.v[s]} → 汇 ${S.v[t]}`);

        while (true) {
            // BFS 找增广路
            const parent = new Array(n).fill(-1);
            parent[s] = s;
            const q = [s];
            while (q.length) {
                const v = q.shift();
                for (let w = 0; w < n; w++) {
                    if (parent[w] === -1 && cap[v][w] > 0) { parent[w] = v; q.push(w); }
                }
            }
            if (parent[t] === -1) break;
            round++;

            // 找瓶颈
            let bottle = Infinity;
            const path = [];
            for (let v = t; v !== s; v = parent[v]) { bottle = Math.min(bottle, cap[parent[v]][v]); path.push(v); }
            path.push(s); path.reverse();
            g.markPath(path);
            for (let i = 0; i < path.length - 1; i++) g.highlightEdge(path[i], path[i + 1], GREEN);
            log.printInfo(`第 ${round} 条增广路：${path.map(x => S.v[x]).join(' → ')}，瓶颈 = ${bottle}`);

            // 更新残量
            for (let v = t; v !== s; v = parent[v]) {
                cap[parent[v]][v] -= bottle;
                cap[v][parent[v]] += bottle;
            }
            maxflow += bottle;
            syncTbl(`增广 ${bottle}，累计最大流 = ${maxflow}`);
            path.forEach(x => { g.vertices[x].state = 'default'; });
            g.highlight(t, 'current', `累计最大流 = ${maxflow}`);
        }
        // 最小割
        const cut = [];
        const vis = new Array(n).fill(false);
        const q2 = [s]; vis[s] = true;
        while (q2.length) { const v = q2.shift(); for (let w = 0; w < n; w++) if (!vis[w] && cap[v][w] > 0) { vis[w] = true; q2.push(w); } }
        for (let i = 0; i < n; i++) if (vis[i]) { g.highlight(i, 'tree'); cut.push(S.v[i]); }
        log.printSuccess(`最大流 = ${maxflow}`);
        log.printSuccess(`最小割 S 侧：{ ${cut.join(', ')} }`);
        g.done(`✓ 最大流 = ${maxflow}（${round} 条增广路）`);
    }

    // ============================================================
    // 23. 二分图最大匹配（匈牙利算法）
    // ============================================================
    const bipMatchCode = `function BipartiteMatching(G) {
  const match = new Array(V).fill(-1);
  for (let v = 0; v < leftN; v++) { visited.fill(false); if (tryAugment(v)) size++; }

  function tryAugment(v) {           // 为左点 v 寻找增广路
    for (const w of G.adj(v)) {
      if (visited[w]) continue;
      visited[w] = true;
      if (match[w] === -1 || tryAugment(match[w])) {
        match[w] = v; match[v] = w; return true;
      }
    }
    return false;
  }
}`;
    function bipMatchRun(ctx) {
        const S = BIP;
        const n = S.v.length;
        const g = ctx.add(new GraphTracer('二分图', mkVerts(S.v), mkEdges(S.e, false)));
        const log = ctx.add(new LogTracer('log'));
        const adj = adjOf(n, S.e, false);
        const match = new Array(n).fill(-1);
        let size = 0;
        const sync = () => {
            for (let i = 0; i < n; i++) g.vertices[i].tag = match[i] === -1 ? '' : S.v[match[i]];
        };

        ctx.line(1);
        log.printInfo(`匈牙利算法：为每个左点尝试寻找增广路（左 ${S.leftN} 点，右 ${n - S.leftN} 点）`);

        function tryAug(v, visited) {
            for (const w of adj[v]) {
                if (w < S.leftN || visited[w]) continue;
                visited[w] = true;
                g.highlightEdge(v, w, BLUE, `尝试 ${S.v[v]} - ${S.v[w]}`);
                if (match[w] === -1 || tryAug(match[w], visited)) {
                    match[w] = v; match[v] = w;
                    sync();
                    g.highlightEdge(v, w, GREEN, `匹配 ${S.v[v]} ↔ ${S.v[w]}`);
                    return true;
                }
            }
            return false;
        }

        for (let v = 0; v < S.leftN; v++) {
            const visited = new Array(n).fill(false);
            g.highlight(v, 'current', `为 ${S.v[v]} 寻找匹配`);
            if (tryAug(v, visited)) {
                size++;
                g.highlight(v, 'tree', `${S.v[v]} 匹配成功（当前匹配数 ${size}）`);
                log.printSuccess(`${S.v[v]} ↔ ${S.v[match[v]]}，匹配数 = ${size}`);
            } else {
                g.highlight(v, 'visited', `${S.v[v]} 暂无法匹配`);
                log.printWarning(`${S.v[v]} 未找到增广路`);
            }
        }
        g.done(`✓ 最大匹配数 = ${size}`);
    }

    // ============================================================
    // 24. Hopcroft-Karp 二分图最大匹配
    // ============================================================
    const hkCode = `function HopcroftKarp(G) {
  while (bfsLayers()) {          // 每轮 BFS 构造层次图
    for (const v of 左侧未匹配点)
      if (dfsAugment(v)) size++; // 同一轮内并行找多条顶点不相交增广路
  }
  // 复杂度 O(E√V)，优于匈牙利的 O(V·E)
}`;
    function hkRun(ctx) {
        const S = BIP;
        const n = S.v.length, L = S.leftN;
        const g = ctx.add(new GraphTracer('二分图', mkVerts(S.v), mkEdges(S.e, false)));
        const log = ctx.add(new LogTracer('log'));
        const adj = adjOf(n, S.e, false);
        const match = new Array(n).fill(-1);
        const dist = new Array(n).fill(Infinity);
        let size = 0, phase = 0;
        const sync = () => {
            for (let i = 0; i < n; i++) g.vertices[i].tag = match[i] === -1 ? '' : S.v[match[i]];
        };

        ctx.line(1);
        log.printInfo('Hopcroft-Karp：BFS 分层 + DFS 批量增广，复杂度 O(E√V)');

        function bfs() {
            const q = [];
            for (let v = 0; v < L; v++) {
                if (match[v] === -1) { dist[v] = 0; q.push(v); g.highlight(v, 'queue', `未匹配点 ${S.v[v]} 入队（层 0）`); }
                else dist[v] = Infinity;
            }
            let found = false;
            while (q.length) {
                const v = q.shift();
                for (const w of adj[v]) {
                    if (w < L) continue;
                    const nx = match[w];
                    if (nx === -1) { found = true; }
                    else if (dist[nx] === Infinity) {
                        dist[nx] = dist[v] + 1;
                        q.push(nx);
                        g.highlightEdge(v, w, BLUE, `层次 ${S.v[nx]} = ${dist[nx]}`);
                    }
                }
            }
            return found;
        }
        function dfs(v) {
            for (const w of adj[v]) {
                if (w < L) continue;
                const nx = match[w];
                if (nx === -1 || (dist[nx] === dist[v] + 1 && dfs(nx))) {
                    match[v] = w; match[w] = v;
                    sync();
                    g.highlightEdge(v, w, GREEN, `增广：${S.v[v]} ↔ ${S.v[w]}`);
                    return true;
                }
            }
            dist[v] = Infinity;
            return false;
        }

        while (bfs()) {
            phase++;
            log.printInfo(`—— 第 ${phase} 阶段（BFS 分层完成）——`);
            for (let v = 0; v < L; v++) {
                if (match[v] === -1) {
                    g.highlight(v, 'current', `从 ${S.v[v]} 开始 DFS 增广`);
                    if (dfs(v)) { size++; g.highlight(v, 'tree'); log.printSuccess(`匹配数增至 ${size}`); }
                }
            }
        }
        g.done(`✓ 最大匹配数 = ${size}（${phase} 个阶段）`);
    }

    // ============================================================
    // 25. 二分图判定优化版（非递归 BFS 双色）
    // ============================================================
    function bipartiteXRun(ctx) {
        const S = { v: ['A', 'B', 'C', 'D', 'E', 'F'], e: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5]] };
        const n = S.v.length;
        const g = ctx.add(new GraphTracer('graph', mkVerts(S.v), mkEdges(S.e, false)));
        const q = ctx.add(new QueueTracer('queue'));
        const arr = ctx.add(new ArrayTracer('color', S.v.map(() => '-')));
        const log = ctx.add(new LogTracer('log'));
        const adj = adjOf(n, S.e, false);
        const color = new Array(n).fill(-1);
        let ok = true;

        ctx.line(1);
        log.printInfo('非递归二分图判定：BFS 逐层染色，相邻同色即非二分图');
        for (let s = 0; s < n && ok; s++) {
            if (color[s] !== -1) continue;
            color[s] = 0;
            arr.setItems(color.map(c => c === -1 ? '-' : (c === 0 ? '红' : '蓝')));
            g.vertices[s].tag = '红';
            const queue = [s]; q.enqueue(S.v[s]);
            g.highlight(s, 'queue', `${S.v[s]} 染红并入队`);
            while (queue.length && ok) {
                const v = queue.shift(); q.dequeue();
                g.highlight(v, 'current', `处理 ${S.v[v]}（${color[v] === 0 ? '红' : '蓝'}）`);
                for (const w of adj[v]) {
                    if (color[w] === -1) {
                        color[w] = 1 - color[v];
                        arr.setItems(color.map(c => c === -1 ? '-' : (c === 0 ? '红' : '蓝')));
                        g.vertices[w].tag = color[w] === 0 ? '红' : '蓝';
                        queue.push(w); q.enqueue(S.v[w]);
                        g.highlightEdge(v, w, GREEN, `${S.v[w]} 染${color[w] === 0 ? '红' : '蓝'}`);
                        g.highlight(w, 'queue');
                    } else if (color[w] === color[v]) {
                        g.highlightEdge(v, w, RED, `冲突！${S.v[v]} 与 ${S.v[w]} 同色`);
                        log.printError(`边 ${S.v[v]}-${S.v[w]} 两端同色，不是二分图`);
                        ok = false; break;
                    }
                }
                if (ok) g.highlight(v, 'visited');
            }
        }
        if (ok) {
            const red = S.v.filter((_, i) => color[i] === 0);
            const blue = S.v.filter((_, i) => color[i] === 1);
            log.printSuccess(`是二分图：{${red.join(',')}} | {${blue.join(',')}}`);
            g.done('✓ 是二分图');
        } else {
            g.done('✗ 不是二分图（存在奇环）');
        }
    }

    // ============================================================
    // 26. 符号图（字符串顶点 → 索引映射）
    // ============================================================
    const symbolCode = `class SymbolGraph {
  constructor(lines) {
    this.st = new Map();                 // 名字 → 索引
    for (const line of lines)
      for (const name of line.split('/'))
        if (!this.st.has(name)) this.st.set(name, this.st.size);
    this.keys = [...this.st.keys()];     // 索引 → 名字
    this.graph = new Graph(this.st.size);
    for (const line of lines) {
      const a = line.split('/');
      const v = this.st.get(a[0]);
      for (let i = 1; i < a.length; i++) this.graph.addEdge(v, this.st.get(a[i]));
    }
  }
}`;
    function symbolRun(ctx) {
        const lines = [
            'JFK/MCO', 'ORD/DEN', 'ORD/HOU', 'DFW/PHX',
            'JFK/ATL', 'ORD/DFW', 'ATL/HOU', 'DEN/PHX'
        ];
        const names = [];
        const st = new Map();
        lines.forEach(l => l.split('/').forEach(nm => { if (!st.has(nm)) { st.set(nm, names.length); names.push(nm); } }));
        const es = lines.map(l => { const a = l.split('/'); return [st.get(a[0]), st.get(a[1])]; });
        const g = ctx.add(new GraphTracer('符号图', mkVerts(names), mkEdges(es, false)));
        const tbl = ctx.add(new DPTableTracer('符号表', 2, names.length, ''));
        const log = ctx.add(new LogTracer('log'));
        tbl.setRowLabels(['名字', '索引']);
        tbl.setColLabels(names.map((_, i) => String(i)));

        ctx.line(1);
        log.printInfo('符号图：用哈希表把字符串顶点名映射为整数索引，再复用普通 Graph');
        names.forEach((nm, i) => {
            tbl.set(0, i, nm, `st["${nm}"] = ${i}`);
            tbl.set(1, i, i);
            g.highlight(i, 'current', `注册顶点 "${nm}" → 索引 ${i}`);
        });
        ctx.line(9);
        es.forEach((e, i) => {
            g.highlightEdge(e[0], e[1], GREEN, `加边 ${names[e[0]]} - ${names[e[1]]}（${lines[i]}）`);
        });
        // 展示邻居查询
        const adj = adjOf(names.length, es, false);
        const query = st.get('ORD');
        g.highlight(query, 'tree', `查询 ORD 的邻居`);
        adj[query].forEach(w => g.highlight(w, 'path'));
        log.printSuccess(`ORD 的邻居：${adj[query].map(w => names[w]).join(', ')}`);
        g.done(`✓ 符号图：${names.length} 个顶点，${es.length} 条边`);
    }

    // ============================================================
    // 27. 符号有向图
    // ============================================================
    function symbolDigraphRun(ctx) {
        const lines = ['算法/数据结构', '算法/数学', '数据结构/离散数学', '数学/离散数学', '编译原理/算法', '操作系统/数据结构'];
        const names = [];
        const st = new Map();
        lines.forEach(l => l.split('/').forEach(nm => { if (!st.has(nm)) { st.set(nm, names.length); names.push(nm); } }));
        const es = lines.map(l => { const a = l.split('/'); return [st.get(a[0]), st.get(a[1])]; });
        const n = names.length;
        const g = ctx.add(new GraphTracer('符号有向图', mkVerts(names), mkEdges(es, true)));
        const tbl = ctx.add(new DPTableTracer('符号表', 2, n, ''));
        const arr = ctx.add(new ArrayTracer('拓扑序', []));
        const log = ctx.add(new LogTracer('log'));
        tbl.setRowLabels(['课程', '索引']);
        tbl.setColLabels(names.map((_, i) => String(i)));

        ctx.line(1);
        log.printInfo('符号有向图：课程 → 先修课程，映射为整数后做拓扑排序');
        names.forEach((nm, i) => {
            tbl.set(0, i, nm, `st["${nm}"] = ${i}`);
            tbl.set(1, i, i);
            g.highlight(i, 'current', `注册 "${nm}" → ${i}`);
        });
        es.forEach((e, i) => g.highlightEdge(e[0], e[1], GREEN, `${names[e[0]]} 依赖 ${names[e[1]]}`));

        // 拓扑排序
        const adj = adjOf(n, es, true);
        const indeg = new Array(n).fill(0);
        es.forEach(e => indeg[e[1]]++);
        const q = [], order = [];
        for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
        while (q.length) {
            const v = q.shift(); order.push(v);
            arr.setItems(order.map(x => names[x]));
            g.highlight(v, 'visited', `输出 ${names[v]}`);
            for (const w of adj[v]) if (--indeg[w] === 0) q.push(w);
        }
        log.printSuccess(`学习顺序（逆序）：${order.slice().reverse().map(x => names[x]).join(' → ')}`);
        g.done(`✓ 符号有向图 ${n} 个顶点，${es.length} 条依赖边`);
    }

    // 符号图 / 符号有向图 自定义状态构建：采用“左符号表 + 右整数图”的左右分块策略
    // （与堆算法的“左树 + 右数组”双视图一致），避免长字符串顶点名在圆圈内互相遮盖 / 重叠，
    // 中间区域展示不全时，把“名字→索引”映射单独放到左侧，右侧只画整数索引，保证两者都完整可见。
    function buildSymbolState(tracerStates, _step, ctxInfo) {
        if (!tracerStates) return null;
        let gsnap = null;
        for (const k in tracerStates) {
            const s = tracerStates[k];
            if (s && Array.isArray(s.vertices) && Array.isArray(s.edges)) { gsnap = s; break; }
        }
        if (!gsnap) return null;
        const names = gsnap.vertices.map(v => (v.label !== undefined ? v.label : ''));
        const n = names.length;
        const cw = (ctxInfo && ctxInfo.width) || 800;
        const ch = (ctxInfo && ctxInfo.height) || 500;
        const pad = 28;
        const panelW = Math.min(260, Math.max(150, Math.round(cw * 0.26)));
        const gx0 = panelW + pad + 6;          // 右侧图区域左边界（给左侧符号表留位置）
        const gx1 = cw - pad;
        const gy0 = pad + 22;                  // 顶部给标题留位置
        const gy1 = ch - pad;
        const gcxs = (gx0 + gx1) / 2;
        const gcy = (gy0 + gy1) / 2;
        const R = Math.max(40, Math.min(gx1 - gx0, gy1 - gy0) * 0.40);
        const radius = 18;
        const directed = gsnap.edges.some(e => e.directed);
        const verts = gsnap.vertices.map((v, i) => {
            const angle = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
            return {
                x: gcxs + R * Math.cos(angle),
                y: gcy + R * Math.sin(angle),
                label: String(i),              // 圆内只用整数索引（短，必能完整显示）
                state: v.state || 'default',
                tag: v.tag || ''
            };
        });
        const edges = gsnap.edges.map(e => ({ u: e.u, v: e.v, color: e.color || null, directed: !!e.directed }));
        const items = names.map((nm, i) => ({ label: i + '：' + nm }));
        return {
            graph: { vertices: verts, edges, options: { radius, fontSize: 13, directed } },
            overlays: [{
                title: '符号表  名字 → 索引',
                panel: { x: pad, y: pad, w: panelW, h: Math.max(120, ch - pad * 2), layout: 'vertical', itemH: 26, gapY: 4 },
                items
            }]
        };
    }

    // ============================================================
    // 28. 分配问题（最小权重完美匹配 / 匈牙利 O(n³) 简化）
    // ============================================================
    const assignCode = `function AssignmentProblem(cost) {
  // 目标：为 n 个人各分配 1 项任务，使总成本最小
  // 这里演示"逐行归约 + 逐列归约 + 增广"的核心思想
  // 完整实现见 Kuhn-Munkres (匈牙利) 算法
}`;
    function assignRun(ctx) {
        const people = ['甲', '乙', '丙', '丁'];
        const tasks = ['T1', 'T2', 'T3', 'T4'];
        const cost = [
            [82, 83, 69, 92],
            [77, 37, 49, 92],
            [11, 69, 5, 86],
            [8, 9, 98, 23]
        ];
        const n = 4;
        const tbl = ctx.add(new DPTableTracer('成本矩阵', n, n, 0));
        const arr = ctx.add(new ArrayTracer('分配', people.map(() => '-')));
        const log = ctx.add(new LogTracer('log'));
        tbl.setRowLabels(people);
        tbl.setColLabels(tasks);
        const work = cost.map(r => r.slice());
        const sync = (desc) => {
            for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) tbl.cells[i][j] = { value: work[i][j], state: 'default' };
            tbl._commit({ type: 'snapshot', description: desc });
        };

        ctx.line(1);
        sync('原始成本矩阵');
        log.printInfo('分配问题：为每人分配唯一任务，使总成本最小');

        // 行归约
        for (let i = 0; i < n; i++) {
            const m = Math.min(...work[i]);
            for (let j = 0; j < n; j++) work[i][j] -= m;
            sync(`行 ${people[i]} 减去最小值 ${m}`);
            log.printInfo(`行归约：${people[i]} 各项减 ${m}`);
        }
        // 列归约
        for (let j = 0; j < n; j++) {
            let m = Infinity;
            for (let i = 0; i < n; i++) m = Math.min(m, work[i][j]);
            if (m > 0) {
                for (let i = 0; i < n; i++) work[i][j] -= m;
                sync(`列 ${tasks[j]} 减去最小值 ${m}`);
                log.printInfo(`列归约：${tasks[j]} 各项减 ${m}`);
            }
        }

        // 在归约矩阵的 0 元素上做匹配（暴力枚举保证最优，n=4 只有 24 种）
        const perms = [];
        const permute = (arrIn, cur) => {
            if (!arrIn.length) { perms.push(cur.slice()); return; }
            for (let i = 0; i < arrIn.length; i++) {
                const rest = arrIn.slice(0, i).concat(arrIn.slice(i + 1));
                cur.push(arrIn[i]); permute(rest, cur); cur.pop();
            }
        };
        permute([0, 1, 2, 3], []);
        let best = null, bestCost = Infinity;
        for (const p of perms) {
            let c = 0;
            for (let i = 0; i < n; i++) c += cost[i][p[i]];
            if (c < bestCost) { bestCost = c; best = p; }
        }
        for (let i = 0; i < n; i++) {
            tbl.highlight(i, best[i], 'path', `${people[i]} → ${tasks[best[i]]}（成本 ${cost[i][best[i]]}）`);
            arr.setItems(people.map((_, k) => k <= i ? tasks[best[k]] : '-'));
            log.printSuccess(`${people[i]} 承担 ${tasks[best[i]]}，成本 ${cost[i][best[i]]}`);
        }
        arr.done(`✓ 最小总成本 = ${bestCost}`);
    }

    // ============================================================
    // 29. 两人零和博弈（минимакс / 支付矩阵）
    // ============================================================
    const zeroSumCode = `function TwoPersonZeroSumGame(payoff) {
  // 行玩家最大化最小收益（maximin），列玩家最小化最大损失（minimax）
  const maximin = max over rows of (min over cols);
  const minimax = min over cols of (max over rows);
  // maximin === minimax ⟹ 存在纯策略鞍点，否则需要混合策略
}`;
    function zeroSumRun(ctx) {
        const rows = ['行R1', '行R2', '行R3'];
        const cols = ['列C1', '列C2', '列C3'];
        const payoff = [
            [30, -10, 20],
            [10, 20, -20],
            [-10, 20, 15]
        ];
        const R = 3, C = 3;
        const tbl = ctx.add(new DPTableTracer('支付矩阵', R, C, 0));
        const arr = ctx.add(new ArrayTracer('行最小值', rows.map(() => '-')));
        const log = ctx.add(new LogTracer('log'));
        tbl.setRowLabels(rows);
        tbl.setColLabels(cols);
        for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) tbl.set(i, j, payoff[i][j]);

        ctx.line(1);
        log.printInfo('两人零和博弈：行玩家求 maximin，列玩家求 minimax');

        const rowMin = [];
        for (let i = 0; i < R; i++) {
            let m = Infinity, mj = 0;
            for (let j = 0; j < C; j++) if (payoff[i][j] < m) { m = payoff[i][j]; mj = j; }
            rowMin.push(m);
            tbl.highlight(i, mj, 'compare', `${rows[i]} 最坏收益 = ${m}`);
            arr.setItems(rowMin.map(String).concat(Array(R - rowMin.length).fill('-')));
            log.printInfo(`${rows[i]} 的最小收益 = ${m}`);
        }
        const maximin = Math.max(...rowMin);
        const bestRow = rowMin.indexOf(maximin);
        log.printSuccess(`maximin = ${maximin}（行玩家选 ${rows[bestRow]}）`);

        const colMax = [];
        for (let j = 0; j < C; j++) {
            let m = -Infinity, mi = 0;
            for (let i = 0; i < R; i++) if (payoff[i][j] > m) { m = payoff[i][j]; mi = i; }
            colMax.push(m);
            tbl.highlight(mi, j, 'current', `${cols[j]} 最大损失 = ${m}`);
            log.printInfo(`${cols[j]} 的最大损失 = ${m}`);
        }
        const minimax = Math.min(...colMax);
        const bestCol = colMax.indexOf(minimax);
        log.printSuccess(`minimax = ${minimax}（列玩家选 ${cols[bestCol]}）`);

        if (maximin === minimax) {
            tbl.highlight(bestRow, bestCol, 'path', `鞍点 (${rows[bestRow]}, ${cols[bestCol]}) = ${maximin}`);
            log.printSuccess(`存在纯策略鞍点，博弈值 = ${maximin}`);
            arr.done(`✓ 纯策略鞍点，博弈值 = ${maximin}`);
        } else {
            log.printWarning(`maximin(${maximin}) ≠ minimax(${minimax})，无纯策略鞍点，需混合策略`);
            arr.done(`✓ 需混合策略（博弈值介于 ${maximin} 与 ${minimax} 之间）`);
        }
    }

    // ============================================================
    // 注册
    // ============================================================
    const D = (h, b) => `<div class="desc-section"><h3>${h}</h3><p>${b}</p></div>`;
    const G_ = { defaultData: [], dataParser: (s) => s };

    const algos = [
        {
            id: 'graph.tarjan', name: 'Tarjan 强连通分量', category: 'graph', level: 'P3',
            complexity: { time: 'O(V + E)', space: 'O(V)' }, keywords: ['tarjan', 'scc', 'low-link'],
            mnemonic: '一遍DFS记low值，low等num出分量',
            description: `<div class="desc-section"><h3>核心思想</h3><p>强连通分量是图中互相可达的最大子图。</p></div><div class="desc-section"><h3>推导过程</h3><p>Kosaraju 做两次 DFS：第一次记录完成顺序，第二次在反向图上按逆序 DFS，每次得到 SCC。Tarjan 用一次 DFS 维护 dfn/low，当 low[u]==dfn[u] 时弹出栈中节点即为一个 SCC。</p></div><div class="desc-section"><h3>适用场景</h3><p>社交网络社群发现、依赖环检测、缩点建 DAG。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 微博互相关注圈子。② 代码模块循环依赖检测。③ 地图强连通区域分析。</p></div>`,
            code: tarjanCode, ...G_, run: tarjanRun
        },
        {
            id: 'graph.gabow', name: 'Gabow 强连通分量', category: 'graph', level: 'P3',
            complexity: { time: 'O(V + E)', space: 'O(V)' }, keywords: ['gabow', 'scc', 'two stacks'],
            mnemonic: '双栈代替low值，栈顶即候选根',
            description: `<div class="desc-section"><h3>核心思想</h3><p>强连通分量是图中互相可达的最大子图。</p></div><div class="desc-section"><h3>推导过程</h3><p>Kosaraju 做两次 DFS：第一次记录完成顺序，第二次在反向图上按逆序 DFS，每次得到 SCC。Tarjan 用一次 DFS 维护 dfn/low，当 low[u]==dfn[u] 时弹出栈中节点即为一个 SCC。</p></div><div class="desc-section"><h3>适用场景</h3><p>社交网络社群发现、依赖环检测、缩点建 DAG。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 微博互相关注圈子。② 代码模块循环依赖检测。③ 地图强连通区域分析。</p></div>`,
            code: gabowCode, ...G_, run: gabowRun
        },
        {
            id: 'graph.transClosure', name: '传递闭包 (Warshall)', category: 'graph', level: 'P2',
            complexity: { time: 'O(V³)', space: 'O(V²)' }, keywords: ['transitive closure', 'warshall'],
            mnemonic: '三重循环转中点，可达关系全打通',
            description: `<div class="desc-section"><h3>核心思想</h3><p>传递闭包回答“从 i 能否到达 j”这一布尔关系。</p></div><div class="desc-section"><h3>推导过程</h3><p>可视为所有点对最短路径的布尔版。Floyd 思想：枚举中间点 k，若 i 能到 k 且 k 能到 j，则 i 能到 j。</p></div><div class="desc-section"><h3>适用场景</h3><p>可达性查询、数据库关系闭包、工作流依赖分析。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 权限继承关系。② 数据库传递依赖。③ 工作流任务可达性。</p></div>`,
            code: transClosureCode, ...G_, run: transClosureRun
        },
        {
            id: 'graph.topoX', name: '拓扑排序优化版 (Kahn)', category: 'graph', level: 'P2',
            complexity: { time: 'O(V + E)', space: 'O(V)' }, keywords: ['topological sort', 'kahn', 'indegree'],
            mnemonic: '入度为零先出队，删边降度再入队',
            description: `<div class="desc-section"><h3>核心思想</h3><p>拓扑排序把 DAG 的顶点排成线性序列，使得所有边都从前指向后。</p></div><div class="desc-section"><h3>推导过程</h3><p>Kahn 算法反复找入度为 0 的点加入结果，并删除其出边。DFS 法则是记录后序遍历的逆序。若无法处理完所有点，说明图中有环。</p></div><div class="desc-section"><h3>适用场景</h3><p>任务调度、依赖解析、编译顺序、课程先修。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 大学选课计划。② Makefile 构建顺序。③ npm 依赖安装顺序。</p></div>`,
            code: topoXCode, ...G_, run: topoXRun
        },
        {
            id: 'graph.dfsOrder', name: 'DFS 序（前/后/逆后序）', category: 'graph', level: 'P2',
            complexity: { time: 'O(V + E)', space: 'O(V)' }, keywords: ['dfs order', 'preorder', 'postorder'],
            mnemonic: '进时记前离记后，后序反转即拓扑',
            description: `<div class="desc-section"><h3>核心思想</h3><p>从起点出发，沿着一条路径一直走到底，走不通再回退试别的路。</p></div><div class="desc-section"><h3>推导过程</h3><p>用递归或显式栈实现。访问节点后标记，再递归访问未访问的邻居。回溯时撤销当前选择。可用于遍历、找环、求连通分量、拓扑排序。</p></div><div class="desc-section"><h3>适用场景</h3><p>路径搜索、连通性、环检测、拓扑排序、回溯。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 迷宫找通路。② 判断图是否有环。③ 解数独/ N 皇后。</p></div>`,
            code: dfsOrderCode, ...G_, run: dfsOrderRun
        },
        {
            id: 'graph.nrDFS', name: '非递归 DFS（显式栈）', category: 'graph', level: 'P1',
            complexity: { time: 'O(V + E)', space: 'O(V)' }, keywords: ['dfs', 'iterative', 'stack'],
            mnemonic: '显式栈替调用栈，深图不怕爆栈',
            description: `<div class="desc-section"><h3>核心思想</h3><p>从起点出发，沿着一条路径一直走到底，走不通再回退试别的路。</p></div><div class="desc-section"><h3>推导过程</h3><p>用递归或显式栈实现。访问节点后标记，再递归访问未访问的邻居。回溯时撤销当前选择。可用于遍历、找环、求连通分量、拓扑排序。</p></div><div class="desc-section"><h3>适用场景</h3><p>路径搜索、连通性、环检测、拓扑排序、回溯。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 迷宫找通路。② 判断图是否有环。③ 解数独/ N 皇后。</p></div>`,
            code: nrDFSCode, ...G_, run: nrDFSRun
        },
        {
            id: 'graph.nrDirDFS', name: '非递归有向 DFS', category: 'graph', level: 'P1',
            complexity: { time: 'O(V + E)', space: 'O(V)' }, keywords: ['directed dfs', 'iterative'],
            mnemonic: '有向边单向走，栈中求可达集',
            description: `<div class="desc-section"><h3>核心思想</h3><p>从起点出发，沿着一条路径一直走到底，走不通再回退试别的路。</p></div><div class="desc-section"><h3>推导过程</h3><p>用递归或显式栈实现。访问节点后标记，再递归访问未访问的邻居。回溯时撤销当前选择。可用于遍历、找环、求连通分量、拓扑排序。</p></div><div class="desc-section"><h3>适用场景</h3><p>路径搜索、连通性、环检测、拓扑排序、回溯。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 迷宫找通路。② 判断图是否有环。③ 解数独/ N 皇后。</p></div>`,
            code: nrDFSCode, ...G_, run: nrDirDFSRun
        },
        {
            id: 'graph.dirDFS', name: '有向图可达性（多源）', category: 'graph', level: 'P1',
            complexity: { time: 'O(V + E)', space: 'O(V)' }, keywords: ['reachability', 'directed dfs'],
            mnemonic: '多源同标记，可达一次算',
            description: `<div class="desc-section"><h3>核心思想</h3><p>把问题建模成图，通过遍历、松弛或匹配等操作得到所需结果。</p></div><div class="desc-section"><h3>推导过程</h3><p>图的核心是顶点和边。根据问题选择 BFS/DFS、最短路径、最小生成树或网络流等算法，把实际问题转化为图上的计算。</p></div><div class="desc-section"><h3>适用场景</h3><p>关系网络、路径规划、依赖分析、资源分配。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 地图导航。② 社交网络分析。③ 软件依赖管理。</p></div>`,
            code: dirDFSCode, ...G_, run: dirDFSRun
        },
        {
            id: 'graph.bfsDirPaths', name: '有向图 BFS 路径', category: 'graph', level: 'P1',
            complexity: { time: 'O(V + E)', space: 'O(V)' }, keywords: ['bfs', 'shortest path', 'directed'],
            mnemonic: '按层扩展队列走，边数最少即最短',
            description: `<div class="desc-section"><h3>核心思想</h3><p>从起点开始，一层一层地访问所有邻居，像水波扩散。</p></div><div class="desc-section"><h3>推导过程</h3><p>用队列维护当前层节点。弹出队首，把所有未访问的邻居入队。由于先入队的先处理，保证距离起点近的节点先被访问，从而找到无权图的最短路径。</p></div><div class="desc-section"><h3>适用场景</h3><p>无权图最短路径、层级遍历、连通性、社交网络扩散。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 迷宫最短步数。② 好友关系的“六度分隔”。③ 病毒传播模拟。</p></div>`,
            code: bfsDirCode, ...G_, run: bfsDirRun
        },
        {
            id: 'graph.dfsDirPaths', name: '有向图 DFS 路径', category: 'graph', level: 'P1',
            complexity: { time: 'O(V + E)', space: 'O(V)' }, keywords: ['dfs', 'path', 'directed'],
            mnemonic: 'edgeTo记父边，回溯得到一条路',
            description: `<div class="desc-section"><h3>核心思想</h3><p>从起点出发，沿着一条路径一直走到底，走不通再回退试别的路。</p></div><div class="desc-section"><h3>推导过程</h3><p>用递归或显式栈实现。访问节点后标记，再递归访问未访问的邻居。回溯时撤销当前选择。可用于遍历、找环、求连通分量、拓扑排序。</p></div><div class="desc-section"><h3>适用场景</h3><p>路径搜索、连通性、环检测、拓扑排序、回溯。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 迷宫找通路。② 判断图是否有环。③ 解数独/ N 皇后。</p></div>`,
            code: dirDFSCode, ...G_, run: dfsDirRun
        },
        {
            id: 'graph.directedCycleX', name: '有向环检测优化版', category: 'graph', level: 'P2',
            complexity: { time: 'O(V + E)', space: 'O(V)' }, keywords: ['cycle detection', 'indegree'],
            mnemonic: '反复删零入度点，剩下的都在环上',
            description: `<div class="desc-section"><h3>核心思想</h3><p>检测图中是否存在环，以及找出环上的节点。</p></div><div class="desc-section"><h3>推导过程</h3><p>DFS 时记录递归栈，若遇到已在栈中的邻居，说明有环。并查集也可以：若一条边的两个端点已在同一集合，则形成环。</p></div><div class="desc-section"><h3>适用场景</h3><p>死锁检测、依赖冲突、电路网络、编译循环依赖。</p></div><div class="desc-section"><h3>典型案例</h3><p>① npm 循环依赖检测。② 数据库死锁检测。③ 判断课程先修是否有矛盾。</p></div>`,
            code: dcycXCode, ...G_, run: dcycXRun
        },
        {
            id: 'graph.ewDirCycle', name: '带权有向图环检测', category: 'graph', level: 'P2',
            complexity: { time: 'O(V + E)', space: 'O(V)' }, keywords: ['weighted', 'cycle', 'onStack'],
            mnemonic: '栈上遇旧点，即刻现环形',
            description: `<div class="desc-section"><h3>核心思想</h3><p>检测图中是否存在环，以及找出环上的节点。</p></div><div class="desc-section"><h3>推导过程</h3><p>DFS 时记录递归栈，若遇到已在栈中的邻居，说明有环。并查集也可以：若一条边的两个端点已在同一集合，则形成环。</p></div><div class="desc-section"><h3>适用场景</h3><p>死锁检测、依赖冲突、电路网络、编译循环依赖。</p></div><div class="desc-section"><h3>典型案例</h3><p>① npm 循环依赖检测。② 数据库死锁检测。③ 判断课程先修是否有矛盾。</p></div>`,
            code: dcycXCode, ...G_, run: ewDirCycleRun
        },
        {
            id: 'graph.lazyPrim', name: '惰性 Prim 最小生成树', category: 'graph', level: 'P2',
            complexity: { time: 'O(E log E)', space: 'O(E)' }, keywords: ['mst', 'prim', 'lazy'],
            mnemonic: '横切边全入堆，取出再判失效',
            description: `<div class="desc-section"><h3>核心思想</h3><p>最小生成树选出一组边，连接所有顶点且总权重最小。</p></div><div class="desc-section"><h3>推导过程</h3><p>Prim 从一个点开始，每次选连接“已选集合”和“未选集合”的最短边，像长草。Kruskal 按边权排序，用并查集避免成环。Boruvka 每轮为每个连通块选最小边。</p></div><div class="desc-section"><h3>适用场景</h3><p>网络设计、电路布线、聚类、管道铺设。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 城市间铺设光纤使成本最低。② 电路板最小连线。③ 传感器网络连接。</p></div>`,
            code: lazyPrimCode, ...G_, run: lazyPrimRun
        },
        {
            id: 'graph.boruvka', name: 'Boruvka 最小生成树', category: 'graph', level: 'P3',
            complexity: { time: 'O(E log V)', space: 'O(V)' }, keywords: ['mst', 'boruvka', 'parallel'],
            mnemonic: '每轮各找最短出边，分量成对并起来',
            description: `<div class="desc-section"><h3>核心思想</h3><p>最小生成树选出一组边，连接所有顶点且总权重最小。</p></div><div class="desc-section"><h3>推导过程</h3><p>Prim 从一个点开始，每次选连接“已选集合”和“未选集合”的最短边，像长草。Kruskal 按边权排序，用并查集避免成环。Boruvka 每轮为每个连通块选最小边。</p></div><div class="desc-section"><h3>适用场景</h3><p>网络设计、电路布线、聚类、管道铺设。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 城市间铺设光纤使成本最低。② 电路板最小连线。③ 传感器网络连接。</p></div>`,
            code: boruvkaCode, ...G_, run: boruvkaRun
        },
        {
            id: 'graph.dijkstraUndir', name: '无向图 Dijkstra', category: 'graph', level: 'P2',
            complexity: { time: 'O(E log V)', space: 'O(V)' }, keywords: ['dijkstra', 'shortest path', 'undirected'],
            mnemonic: '每次取最近点，松弛所有邻边',
            description: `<div class="desc-section"><h3>核心思想</h3><p>用于非负权图的单源最短路径：每次都选当前距离最小的点，用它更新邻居。</p></div><div class="desc-section"><h3>推导过程</h3><p>维护 dist[] 表示起点到各点的当前最短距离。初始 dist[start]=0，其余为 ∞。用优先队列取 dist 最小的点 u，对每条边 u→v，若 dist[u]+w < dist[v] 则更新。贪心成立的前提是所有边权非负。</p></div><div class="desc-section"><h3>适用场景</h3><p>地图导航、网络路由、物流配送、游戏寻路。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 高德地图最短路径。② 网络路由协议 OSPF。③ 外卖骑手路径规划。</p></div>`,
            code: dijkstraUndirCode, ...G_, run: dijkstraUndirRun
        },
        {
            id: 'graph.dijkstraAll', name: '全源最短路 (Dijkstra×V)', category: 'graph', level: 'P2',
            complexity: { time: 'O(V·E log V)', space: 'O(V²)' }, keywords: ['all pairs', 'dijkstra'],
            mnemonic: '每点当源跑一遍，距离矩阵全填满',
            description: `<div class="desc-section"><h3>核心思想</h3><p>用于非负权图的单源最短路径：每次都选当前距离最小的点，用它更新邻居。</p></div><div class="desc-section"><h3>推导过程</h3><p>维护 dist[] 表示起点到各点的当前最短距离。初始 dist[start]=0，其余为 ∞。用优先队列取 dist 最小的点 u，对每条边 u→v，若 dist[u]+w < dist[v] 则更新。贪心成立的前提是所有边权非负。</p></div><div class="desc-section"><h3>适用场景</h3><p>地图导航、网络路由、物流配送、游戏寻路。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 高德地图最短路径。② 网络路由协议 OSPF。③ 外卖骑手路径规划。</p></div>`,
            code: dijkstraUndirCode, ...G_, run: dijkstraAllRun
        },
        {
            id: 'graph.arbitrage', name: '货币套利（负环检测）', category: 'graph', level: 'P3',
            complexity: { time: 'O(V·E)', space: 'O(V)' }, keywords: ['arbitrage', 'negative cycle', 'bellman-ford'],
            mnemonic: '取负对数化乘为加，负环就是套利环',
            description: `<div class="desc-section"><h3>核心思想</h3><p>检测图中是否存在环，以及找出环上的节点。</p></div><div class="desc-section"><h3>推导过程</h3><p>DFS 时记录递归栈，若遇到已在栈中的邻居，说明有环。并查集也可以：若一条边的两个端点已在同一集合，则形成环。</p></div><div class="desc-section"><h3>适用场景</h3><p>死锁检测、依赖冲突、电路网络、编译循环依赖。</p></div><div class="desc-section"><h3>典型案例</h3><p>① npm 循环依赖检测。② 数据库死锁检测。③ 判断课程先修是否有矛盾。</p></div>`,
            code: arbitrageCode, ...G_, run: arbitrageRun
        },
        {
            id: 'graph.cpm', name: '关键路径法 (CPM)', category: 'graph', level: 'P3',
            complexity: { time: 'O(V + E)', space: 'O(V)' }, keywords: ['cpm', 'critical path', 'scheduling'],
            mnemonic: 'DAG上求最长路，关键路径定工期',
            description: `<div class="desc-section"><h3>核心思想</h3><p>关键路径法找出项目中最长的依赖路径，决定了项目的最短完成时间。</p></div><div class="desc-section"><h3>推导过程</h3><p>把任务按依赖关系建成 DAG，边权为任务持续时间。先拓扑排序，再正向求最早开始时间、反向求最晚开始时间，两者差为 0 的任务在关键路径上。</p></div><div class="desc-section"><h3>适用场景</h3><p>项目管理、工程调度、生产计划。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 建筑项目排期。② 软件开发里程碑规划。③ 工厂流水线调度。</p></div>`,
            code: cpmCode, ...G_, run: cpmRun
        },
        {
            id: 'graph.eulerCycle', name: '无向欧拉回路', category: 'graph', level: 'P3',
            complexity: { time: 'O(E)', space: 'O(E)' }, keywords: ['eulerian', 'hierholzer'],
            mnemonic: '度数全偶有回路，走不动就回溯记',
            description: `<div class="desc-section"><h3>核心思想</h3><p>欧拉路径/回路是经过图中每条边恰好一次的路径；回路要求起点终点相同。</p></div><div class="desc-section"><h3>推导过程</h3><p>Hierholzer 算法：从起点出发随便走，遇到死胡同时把路径倒序加入结果，再处理还有未访问边的点。无向图存在欧拉回路当且仅当连通且所有点度数为偶数。</p></div><div class="desc-section"><h3>适用场景</h3><p>路线规划、一笔画问题、DNA 序列拼接。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 邮递员路线（每条街走一次）。② 游戏“一笔画”。③ 基因组拼接。</p></div>`,
            code: eulerCode, ...G_, run: eulerCycleRun
        },
        {
            id: 'graph.dirEulerCycle', name: '有向欧拉回路', category: 'graph', level: 'P3',
            complexity: { time: 'O(E)', space: 'O(E)' }, keywords: ['directed eulerian', 'hierholzer'],
            mnemonic: '入度等出度，一笔画回原点',
            description: `<div class="desc-section"><h3>核心思想</h3><p>欧拉路径/回路是经过图中每条边恰好一次的路径；回路要求起点终点相同。</p></div><div class="desc-section"><h3>推导过程</h3><p>Hierholzer 算法：从起点出发随便走，遇到死胡同时把路径倒序加入结果，再处理还有未访问边的点。无向图存在欧拉回路当且仅当连通且所有点度数为偶数。</p></div><div class="desc-section"><h3>适用场景</h3><p>路线规划、一笔画问题、DNA 序列拼接。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 邮递员路线（每条街走一次）。② 游戏“一笔画”。③ 基因组拼接。</p></div>`,
            code: eulerCode, ...G_, run: dirEulerCycleRun
        },
        {
            id: 'graph.dirEulerPath', name: '有向欧拉路径', category: 'graph', level: 'P3',
            complexity: { time: 'O(E)', space: 'O(E)' }, keywords: ['eulerian path', 'directed'],
            mnemonic: '出多一起点，入多一终点',
            description: `<div class="desc-section"><h3>核心思想</h3><p>欧拉路径/回路是经过图中每条边恰好一次的路径；回路要求起点终点相同。</p></div><div class="desc-section"><h3>推导过程</h3><p>Hierholzer 算法：从起点出发随便走，遇到死胡同时把路径倒序加入结果，再处理还有未访问边的点。无向图存在欧拉回路当且仅当连通且所有点度数为偶数。</p></div><div class="desc-section"><h3>适用场景</h3><p>路线规划、一笔画问题、DNA 序列拼接。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 邮递员路线（每条街走一次）。② 游戏“一笔画”。③ 基因组拼接。</p></div>`,
            code: eulerCode, ...G_, run: dirEulerPathRun
        },
        {
            id: 'graph.maxflow', name: 'Ford-Fulkerson 最大流', category: 'graph', level: 'P3',
            complexity: { time: 'O(V·E²)', space: 'O(V²)' }, keywords: ['max flow', 'edmonds-karp', 'min cut'],
            mnemonic: 'BFS找增广路，瓶颈流量往上加',
            description: `<div class="desc-section"><h3>核心思想</h3><p>最大流求从源点到汇点能通过的最大流量，同时满足每条边的容量限制。</p></div><div class="desc-section"><h3>推导过程</h3><p>Ford-Fulkerson 在残量网络上不断找增广路径，沿路径增加流量，直到找不到增广路。 Edmonds-Karp 用 BFS 找最短增广路，保证多项式时间。</p></div><div class="desc-section"><h3>适用场景</h3><p>交通网络、供水/电网、二分图匹配、物流。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 城市供水最大输送量。② 物流配送瓶颈分析。③ 二分图最大匹配。</p></div>`,
            code: maxflowCode, ...G_, run: maxflowRun
        },
        {
            id: 'graph.bipMatch', name: '二分图最大匹配（匈牙利）', category: 'graph', level: 'P3',
            complexity: { time: 'O(V·E)', space: 'O(V)' }, keywords: ['bipartite matching', 'hungarian', 'augmenting path'],
            mnemonic: '逐点找增广，让位再让位',
            description: `<div class="desc-section"><h3>核心思想</h3><p>二分图匹配把左边的点与右边的点配对，使每点最多配一次，目标是匹配数最大或总权最小。</p></div><div class="desc-section"><h3>推导过程</h3><p>匈牙利算法用 DFS 给每个左部点找增广路：若右部点未匹配或已匹配点能找到新匹配，则配对成功。Hopcroft-Karp 用 BFS 分层+多路增广，效率更高。</p></div><div class="desc-section"><h3>适用场景</h3><p>任务分配、资源匹配、推荐系统、调度。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 员工任务分配。② 网约车派单。③ 广告与广告位匹配。</p></div>`,
            code: bipMatchCode, ...G_, run: bipMatchRun
        },
        {
            id: 'graph.hopcroftKarp', name: 'Hopcroft-Karp 匹配', category: 'graph', level: 'P3',
            complexity: { time: 'O(E√V)', space: 'O(V)' }, keywords: ['hopcroft-karp', 'matching', 'layered'],
            mnemonic: 'BFS分层DFS增广，一轮多条同时上',
            description: `<div class="desc-section"><h3>核心思想</h3><p>二分图匹配把左边的点与右边的点配对，使每点最多配一次，目标是匹配数最大或总权最小。</p></div><div class="desc-section"><h3>推导过程</h3><p>匈牙利算法用 DFS 给每个左部点找增广路：若右部点未匹配或已匹配点能找到新匹配，则配对成功。Hopcroft-Karp 用 BFS 分层+多路增广，效率更高。</p></div><div class="desc-section"><h3>适用场景</h3><p>任务分配、资源匹配、推荐系统、调度。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 员工任务分配。② 网约车派单。③ 广告与广告位匹配。</p></div>`,
            code: hkCode, ...G_, run: hkRun
        },
        {
            id: 'graph.bipartiteX', name: '二分图判定优化版 (BFS)', category: 'graph', level: 'P1',
            complexity: { time: 'O(V + E)', space: 'O(V)' }, keywords: ['bipartite', 'bfs', 'two coloring'],
            mnemonic: '逐层交替染两色，同色相邻即出局',
            description: `<div class="desc-section"><h3>核心思想</h3><p>从起点开始，一层一层地访问所有邻居，像水波扩散。</p></div><div class="desc-section"><h3>推导过程</h3><p>用队列维护当前层节点。弹出队首，把所有未访问的邻居入队。由于先入队的先处理，保证距离起点近的节点先被访问，从而找到无权图的最短路径。</p></div><div class="desc-section"><h3>适用场景</h3><p>无权图最短路径、层级遍历、连通性、社交网络扩散。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 迷宫最短步数。② 好友关系的“六度分隔”。③ 病毒传播模拟。</p></div>`,
            code: dcycXCode, ...G_, run: bipartiteXRun
        },
        {
            id: 'graph.symbol', name: '符号图 (SymbolGraph)', category: 'graph', level: 'P1',
            complexity: { time: 'O(E)', space: 'O(V + E)' }, keywords: ['symbol graph', 'string vertex'],
            mnemonic: '名字映索引，普通图复用',
            description: `<div class="desc-section"><h3>核心思想</h3><p>符号图把字符串（如课程名）映射为整数，再用图算法处理。</p></div><div class="desc-section"><h3>推导过程</h3><p>建立两个哈希表：name→index 和 index→name。图的顶点是整数索引，边用索引表示。这样既保留原始名称，又方便图算法运行。</p></div><div class="desc-section"><h3>适用场景</h3><p>顶点是字符串的图、依赖解析、社交网络中用户名作为节点。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 课程先修图。② 电影演员合作图。③ 软件包依赖图。</p></div>`,
            code: symbolCode, ...G_, run: symbolRun, buildState: buildSymbolState
        },
        {
            id: 'graph.symbolDigraph', name: '符号有向图', category: 'graph', level: 'P1',
            complexity: { time: 'O(E)', space: 'O(V + E)' }, keywords: ['symbol digraph', 'dependency'],
            mnemonic: '课程依赖建有向，拓扑排出学习序',
            description: D('核心思想', '符号图的有向版本，典型应用是课程先修关系、软件包依赖。把字符串顶点映射为索引后做拓扑排序，即得到合法的执行/学习顺序。')
                + D('推导过程（小白版）', '现实中的图，顶点往往是字符串：课程名、机场代码、包名。如果直接拿字符串当顶点，比较和建邻接表都很麻烦。于是先建一张“符号表”：从左到右扫描每一行，遇到没见过的名字就分配一个新整数索引（st：名字→索引；keys：索引→名字），这一步只需一次线性扫描。接着把每条边“课程/先修”翻译成整数索引对 (u, v)，就得到一张普通的整数图，可以复用 DFS / 拓扑排序等现成算法。拓扑排序从入度为 0 的顶点开始，每次输出一个顶点并把它指向的邻居入度减 1，减到 0 就入队；输出顺序反过来就是一条不违反任何依赖的学习路线。')
                + D('适用场景', '一切“A 必须在 B 之前”的依赖关系：大学选课先修、软件包/库的依赖解析（npm、Maven）、构建系统（Makefile、Bazel）、编译器处理 import 图、任务调度。')
                + D('典型案例', '① 选课顺序：给定“算法→数据结构→离散数学”等依赖，排出能顺利毕业的修读顺序。<br>② 依赖安装：npm install 时先装被依赖的底层包，再装上层包，避免循环依赖报错。<br>③ 工程构建：make 先编译被依赖的源文件，再链接成最终程序。'),
            code: symbolCode, ...G_, run: symbolDigraphRun, buildState: buildSymbolState
        },
        {
            id: 'graph.assignment', name: '分配问题（最小权匹配）', category: 'graph', level: 'P3',
            complexity: { time: 'O(n³)', space: 'O(n²)' }, keywords: ['assignment problem', 'hungarian', 'kuhn-munkres'],
            mnemonic: '行减列减出零点，零点匹配最优解',
            description: `<div class="desc-section"><h3>核心思想</h3><p>二分图匹配把左边的点与右边的点配对，使每点最多配一次，目标是匹配数最大或总权最小。</p></div><div class="desc-section"><h3>推导过程</h3><p>匈牙利算法用 DFS 给每个左部点找增广路：若右部点未匹配或已匹配点能找到新匹配，则配对成功。Hopcroft-Karp 用 BFS 分层+多路增广，效率更高。</p></div><div class="desc-section"><h3>适用场景</h3><p>任务分配、资源匹配、推荐系统、调度。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 员工任务分配。② 网约车派单。③ 广告与广告位匹配。</p></div>`,
            code: assignCode, ...G_, run: assignRun
        },
        {
            id: 'graph.zeroSum', name: '两人零和博弈', category: 'graph', level: 'P3',
            complexity: { time: 'O(n³)', space: 'O(n²)' }, keywords: ['game theory', 'minimax', 'saddle point'],
            mnemonic: '行求最大化最小，列求最小化最大',
            description: `<div class="desc-section"><h3>核心思想</h3><p>两人零和博弈中，一方收益等于另一方损失，可用线性规划或 minimax 求解最优混合策略。</p></div><div class="desc-section"><h3>推导过程</h3><p>把博弈写成矩阵，玩家 A 选择策略使最小期望收益最大，玩家 B 选择策略使最大期望损失最小。根据极小极大定理，二者相等时即为纳什均衡。</p></div><div class="desc-section"><h3>适用场景</h3><p>博弈论、经济模型、对抗性 AI、安全策略。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 石头剪刀布最优策略。② 拍卖竞价模型。③ 网络安全攻防。</p></div>`,
            code: zeroSumCode, ...G_, run: zeroSumRun
        }
    ];

    algos.forEach(a => AlgorithmLoader.register(a.id, a));
})();
