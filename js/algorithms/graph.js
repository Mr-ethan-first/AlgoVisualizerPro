/**
 * 图算法 P0
 * 包含：DFS（递归）、BFS、拓扑排序（Kahn）、Dijkstra、Prim、Kruskal
 */
(function () {
    'use strict';

    // 示例图：8 节点的无向图
    const SAMPLE_GRAPH = {
        vertices: [0, 1, 2, 3, 4, 5, 6, 7],
        edges: [
            { u: 0, v: 1 }, { u: 0, v: 2 }, { u: 1, v: 3 }, { u: 1, v: 4 },
            { u: 2, v: 5 }, { u: 2, v: 6 }, { u: 3, v: 7 }, { u: 4, v: 5 }
        ]
    };

    // 带权图
    const WEIGHTED_GRAPH = {
        vertices: ['A', 'B', 'C', 'D', 'E', 'F'],
        // 0=A, 1=B, 2=C, 3=D, 4=E, 5=F
        edges: [
            { u: 0, v: 1, weight: 4 }, { u: 0, v: 2, weight: 2 },
            { u: 1, v: 2, weight: 1 }, { u: 1, v: 3, weight: 5 },
            { u: 2, v: 3, weight: 8 }, { u: 2, v: 4, weight: 10 },
            { u: 3, v: 4, weight: 2 }, { u: 3, v: 5, weight: 6 },
            { u: 4, v: 5, weight: 3 }
        ]
    };

    // DAG 用于拓扑排序
    const DAG_GRAPH = {
        vertices: ['A', 'B', 'C', 'D', 'E', 'F'],
        edges: [
            { u: 0, v: 1 }, { u: 0, v: 2 }, { u: 1, v: 3 },
            { u: 2, v: 3 }, { u: 2, v: 4 }, { u: 3, v: 5 }, { u: 4, v: 5 }
        ]
    };

    // 通用图状态构建器：统一使用公共实现（js/core/stateBuilders.js）
    const buildGraphState = StateBuilders.buildGraphState;

    // 分层布局（用于 DAG / 拓扑排序）
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

    // ===== DFS 递归 =====
    const dfsCode = `function dfs(graph, start) {
  const visited = new Set();
  function visit(u) {
    visited.add(u);
    for (const v of graph.adj[u]) {
      if (!visited.has(v)) {
        visit(v);
      }
    }
  }
  visit(start);
}`;
    function dfsRun(ctx) {
        const vertices = SAMPLE_GRAPH.vertices.map((v, i) => ({ label: String(i), state: 'default' }));
        const edges = SAMPLE_GRAPH.edges.map(e => ({ ...e, directed: false }));
        const g = ctx.add(new GraphTracer('graph', vertices, edges));
        const stack = ctx.add(new StackTracer('stack'));
        const log = ctx.add(new LogTracer('log'));
        // 构造邻接表
        const adj = Array.from({ length: vertices.length }, () => []);
        edges.forEach(e => { adj[e.u].push(e.v); adj[e.v].push(e.u); });

        const visited = new Set();
        const order = [];
        ctx.line(3);
        function visit(u) {
            ctx.line(3);
            ctx.line(4);
            visited.add(u);
            g.visit(u);
            stack.push(u, `dfs(${u}) 入栈`);
            order.push(u);
            log.printInfo(`访问节点 ${u} → 顺序: [${order.join(', ')}]`);
            ctx.line(5);
            for (const v of adj[u]) {
                ctx.line(6);
                if (!visited.has(v)) {
                    ctx.line(7);
                    g.highlightEdge(u, v, '#58a6ff', `${u} → ${v}`);
                    visit(v);
                }
            }
            ctx.line(5);
            g.leave(u);
            stack.pop(`dfs(${u}) 出栈`);
            log.printInfo(`离开节点 ${u}`);
        }
        visit(0);
        ctx.line(2);
        log.printSuccess(`DFS 完成，访问顺序: [${order.join(', ')}]`);
    }

    // ===== BFS =====
    const bfsCode = `function bfs(graph, start) {
  const visited = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const u = queue.shift();
    for (const v of graph.adj[u]) {
      if (!visited.has(v)) {
        visited.add(v);
        queue.push(v);
      }
    }
  }
}`;
    function bfsRun(ctx) {
        const vertices = SAMPLE_GRAPH.vertices.map((v, i) => ({ label: String(i), state: 'default' }));
        const edges = SAMPLE_GRAPH.edges.map(e => ({ ...e, directed: false }));
        const g = ctx.add(new GraphTracer('graph', vertices, edges));
        const q = ctx.add(new QueueTracer('queue'));
        const log = ctx.add(new LogTracer('log'));
        const adj = Array.from({ length: vertices.length }, () => []);
        edges.forEach(e => { adj[e.u].push(e.v); adj[e.v].push(e.u); });

        const visited = new Set([0]);
        const queue = [0];
        q.enqueue(0);
        g.addToQueue(0);
        const order = [];
        ctx.line(4);
        while (queue.length > 0) {
            ctx.line(4);
            ctx.line(5);
            const u = queue.shift();
            q.dequeue();
            g.removeFromQueue(u);
            g.visit(u);
            order.push(u);
            log.printInfo(`出队 ${u} → 访问顺序: [${order.join(', ')}]`);
            ctx.line(6);
            for (const v of adj[u]) {
                ctx.line(7);
                if (!visited.has(v)) {
                    ctx.line(8);
                    visited.add(v);
                    g.highlightEdge(u, v, '#58a6ff', `${u} → ${v}`);
                    queue.push(v);
                    q.enqueue(v);
                    g.addToQueue(v);
                }
            }
        }
        ctx.line(4);
        log.printSuccess(`BFS 完成，访问顺序: [${order.join(', ')}]`);
    }

    // ===== 拓扑排序 Kahn =====
    const topoCode = `function topologicalSort(graph) {
  const indeg = new Array(n).fill(0);
  for (const [u, v] of edges) indeg[v]++;
  const queue = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i);
  const order = [];
  while (queue.length > 0) {
    const u = queue.shift();
    order.push(u);
    for (const v of adj[u]) {
      if (--indeg[v] === 0) queue.push(v);
    }
  }
  return order;
}`;
    function topoRun(ctx) {
        const vertices = DAG_GRAPH.vertices.map((v, i) => ({ label: v, state: 'default' }));
        const edges = DAG_GRAPH.edges.map(e => ({ ...e, directed: true }));
        const g = ctx.add(new GraphTracer('graph', vertices, edges));
        const q = ctx.add(new QueueTracer('queue'));
        const log = ctx.add(new LogTracer('log'));
        const n = vertices.length;
        const adj = Array.from({ length: n }, () => []);
        const indeg = new Array(n).fill(0);
        edges.forEach(e => { adj[e.u].push(e.v); indeg[e.v]++; });

        ctx.line(2);
        log.printInfo('计算入度');
        // 显示入度
        vertices.forEach((v, i) => g.vertices[i].tag = `in=${indeg[i]}`);
        g._commit({ type: 'snapshot', payload: {}, description: '初始化入度' });

        ctx.line(3);
        const queue = [];
        for (let i = 0; i < n; i++) {
            if (indeg[i] === 0) {
                ctx.line(4);
                queue.push(i);
                q.enqueue(i);
                g.addToQueue(i);
                log.printInfo(`入度=0，节点 ${i} 入队`);
            }
        }
        const order = [];
        ctx.line(5);
        while (queue.length > 0) {
            ctx.line(5);
            ctx.line(6);
            const u = queue.shift();
            q.dequeue();
            g.removeFromQueue(u);
            g.visit(u);
            order.push(vertices[u].label);
            log.printInfo(`输出 ${vertices[u].label} → 拓扑序: [${order.join(' → ')}]`);
            ctx.line(7);
            for (const v of adj[u]) {
                ctx.line(8);
                g.highlightEdge(u, v, '#58a6ff');
                indeg[v]--;
                g.vertices[v].tag = `in=${indeg[v]}`;
                if (indeg[v] === 0) {
                    ctx.line(9);
                    queue.push(v);
                    q.enqueue(v);
                    g.addToQueue(v);
                    log.printInfo(`${vertices[v].label} 入度归零，入队`);
                }
            }
        }
        log.printSuccess(`拓扑排序完成: ${order.join(' → ')}`);
    }

    // ===== Dijkstra =====
    const dijkstraCode = `function dijkstra(graph, src) {
  const dist = new Array(n).fill(Infinity);
  dist[src] = 0;
  const visited = new Set();
  for (let i = 0; i < n; i++) {
    // 找未访问中 dist 最小的
    let u = -1, min = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited.has(j) && dist[j] < min) {
        min = dist[j]; u = j;
      }
    }
    if (u === -1) break;
    visited.add(u);
    for (const [v, w] of adj[u]) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
      }
    }
  }
}`;
    function dijkstraRun(ctx) {
        const vertices = WEIGHTED_GRAPH.vertices.map((v, i) => ({ label: v, state: 'default', dist: Infinity }));
        const edges = WEIGHTED_GRAPH.edges.map(e => ({ ...e, directed: false }));
        const g = ctx.add(new GraphTracer('graph', vertices, edges));
        const log = ctx.add(new LogTracer('log'));
        const n = vertices.length;
        const adj = Array.from({ length: n }, () => []);
        edges.forEach(e => {
            adj[e.u].push([e.v, e.weight]);
            adj[e.v].push([e.u, e.weight]);
        });

        const dist = new Array(n).fill(Infinity);
        const visited = new Set();
        const src = 0;
        ctx.line(2);
        dist[src] = 0;
        g.setDist(src, 0);
        log.printInfo(`初始化: dist[${vertices[src].label}] = 0`);

        ctx.line(3);
        for (let i = 0; i < n; i++) {
            ctx.line(5);
            let u = -1, min = Infinity;
            for (let j = 0; j < n; j++) {
                ctx.line(6);
                if (!visited.has(j) && dist[j] < min) {
                    ctx.line(7);
                    min = dist[j]; u = j;
                }
            }
            if (u === -1) { ctx.line(8); break; }
            ctx.line(9);
            visited.add(u);
            g.visit(u);
            log.printSuccess(`确定最短路径: ${vertices[src].label} → ${vertices[u].label} = ${dist[u]}`);
            ctx.line(10);
            for (const [v, w] of adj[u]) {
                ctx.line(11);
                if (!visited.has(v)) {
                    g.highlightEdge(u, v, '#f0883e', `w=${w}`);
                    if (dist[u] + w < dist[v]) {
                        ctx.line(12);
                        const old = dist[v];
                        dist[v] = dist[u] + w;
                        g.setDist(v, dist[v]);
                        g.setParent(v, u);
                        log.printInfo(`松弛: dist[${vertices[v].label}] ${old === Infinity ? '∞' : old} → ${dist[v]}`);
                    } else {
                        log.printInfo(`不更新: dist[${vertices[v].label}] = ${dist[v]} ≤ ${dist[u] + w}`);
                    }
                }
            }
        }
        log.printSuccess('Dijkstra 完成');
        // 标出从 src 到所有点的最短路径树
        g.done();
    }

    // ===== Prim 最小生成树 =====
    const primCode = `function prim(graph, src) {
  const dist = new Array(n).fill(Infinity);
  const inTree = new Set();
  dist[src] = 0;
  for (let i = 0; i < n; i++) {
    let u = -1, min = Infinity;
    for (let j = 0; j < n; j++) {
      if (!inTree.has(j) && dist[j] < min) {
        min = dist[j]; u = j;
      }
    }
    if (u === -1) break;
    inTree.add(u);
    for (const [v, w] of adj[u]) {
      if (!inTree.has(v) && w < dist[v]) {
        dist[v] = w;
      }
    }
  }
}`;
    function primRun(ctx) {
        const vertices = WEIGHTED_GRAPH.vertices.map((v, i) => ({ label: v, state: 'default' }));
        const edges = WEIGHTED_GRAPH.edges.map(e => ({ ...e, directed: false }));
        const g = ctx.add(new GraphTracer('graph', vertices, edges));
        const log = ctx.add(new LogTracer('log'));
        const n = vertices.length;
        const adj = Array.from({ length: n }, () => []);
        edges.forEach(e => {
            adj[e.u].push([e.v, e.weight]);
            adj[e.v].push([e.u, e.weight]);
        });

        const dist = new Array(n).fill(Infinity);
        const inTree = new Set();
        const parent = new Array(n).fill(-1);
        const src = 0;
        ctx.line(2);
        dist[src] = 0;
        g.vertices[src].tag = '0';
        g._commit({ type: 'snapshot', payload: {}, description: `从 ${vertices[src].label} 开始` });
        log.printInfo(`从 ${vertices[src].label} 开始构建 MST`);

        let totalCost = 0;
        ctx.line(3);
        for (let i = 0; i < n; i++) {
            ctx.line(4);
            let u = -1, min = Infinity;
            for (let j = 0; j < n; j++) {
                ctx.line(5);
                if (!inTree.has(j) && dist[j] < min) {
                    ctx.line(6);
                    min = dist[j]; u = j;
                }
            }
            if (u === -1) { ctx.line(7); break; }
            ctx.line(8);
            inTree.add(u);
            g.markAsTree(u);
            totalCost += dist[u];
            if (parent[u] !== -1) {
                g.highlightEdge(parent[u], u, '#3fb950', `+${dist[u]}`);
                log.printSuccess(`加入 MST: ${vertices[parent[u]].label} → ${vertices[u].label} (w=${dist[u]})`);
            } else {
                log.printInfo(`根节点 ${vertices[u].label} 加入 MST`);
            }
            ctx.line(9);
            for (const [v, w] of adj[u]) {
                ctx.line(10);
                if (!inTree.has(v) && w < dist[v]) {
                    ctx.line(11);
                    dist[v] = w;
                    parent[v] = u;
                    g.setDist(v, w);
                    log.printInfo(`更新: dist[${vertices[v].label}] = ${w}`);
                }
            }
        }
        log.printSuccess(`Prim 完成，MST 总权重 = ${totalCost}`);
    }

    // ===== Kruskal 最小生成树 =====
    const kruskalCode = `function kruskal(n, edges) {
  edges.sort((a, b) => a.w - b.w);
  const parent = [...Array(n).keys()];
  function find(x) {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  const mst = [];
  for (const {u, v, w} of edges) {
    if (find(u) !== find(v)) {
      parent[find(u)] = find(v);
      mst.push({u, v, w});
    }
  }
  return mst;
}`;
    function kruskalRun(ctx) {
        const vertices = WEIGHTED_GRAPH.vertices.map((v, i) => ({ label: v, state: 'default' }));
        const edges = WEIGHTED_GRAPH.edges.map(e => ({ ...e, directed: false }));
        const g = ctx.add(new GraphTracer('graph', vertices, edges));
        const log = ctx.add(new LogTracer('log'));
        const n = vertices.length;

        const parent = [];
        const rankArr = [];
        for (let i = 0; i < n; i++) { parent[i] = i; rankArr[i] = 0; }
        function find(x) {
            while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
            return x;
        }
        function union(x, y) {
            const rx = find(x), ry = find(y);
            if (rx === ry) return false;
            if (rankArr[rx] < rankArr[ry]) parent[rx] = ry;
            else if (rankArr[rx] > rankArr[ry]) parent[ry] = rx;
            else { parent[ry] = rx; rankArr[rx]++; }
            return true;
        }

        ctx.line(2);
        const sortedEdges = edges.slice().sort((a, b) => a.weight - b.weight);
        log.printInfo(`排序后边: ${sortedEdges.map(e => `${vertices[e.u].label}-${vertices[e.v].label}(${e.weight})`).join(', ')}`);

        let totalCost = 0;
        const mstEdges = [];
        ctx.line(3);
        for (const e of sortedEdges) {
            ctx.line(10);
            const ru = find(e.u), rv = find(e.v);
            g.highlight(e.u, 'current', vertices[e.u].label);
            g.highlight(e.v, 'current', vertices[e.v].label);
            g.highlightEdge(e.u, e.v, '#f0883e', `w=${e.weight}`);
            ctx.line(11);
            if (ru !== rv) {
                ctx.line(12);
                union(e.u, e.v);
                g.highlightEdge(e.u, e.v, '#3fb950', `加入 MST`);
                g.markAsTree(e.u);
                g.markAsTree(e.v);
                mstEdges.push(e);
                totalCost += e.weight;
                log.printSuccess(`加入 ${vertices[e.u].label} → ${vertices[e.v].label} (w=${e.weight})，总权重 = ${totalCost}`);
            } else {
                log.printWarning(`跳过 ${vertices[e.u].label} → ${vertices[e.v].label}（会成环）`);
            }
            g.highlight(e.u, 'default');
            g.highlight(e.v, 'default');
        }
        log.printSuccess(`Kruskal 完成，MST 总权重 = ${totalCost}`);
    }

    // ===== 注册 =====
    const algos = [
        {
            id: 'graph.dfs',
            name: 'DFS - 递归', category: 'graph', level: 'P0',
            complexity: { time: 'O(V+E)', space: 'O(V)' },
            keywords: ['dfs', 'depth first', 'shen du you xian'],
            mnemonic: '深入到底再回溯，递归栈记来时路',
            description: `<div class="desc-section"><h3>核心思想</h3><p>从起点出发，沿着一条路径一直走到底，走不通再回退试别的路。</p></div><div class="desc-section"><h3>推导过程</h3><p>用递归或显式栈实现。访问节点后标记，再递归访问未访问的邻居。回溯时撤销当前选择。可用于遍历、找环、求连通分量、拓扑排序。</p></div><div class="desc-section"><h3>适用场景</h3><p>路径搜索、连通性、环检测、拓扑排序、回溯。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 迷宫找通路。② 判断图是否有环。③ 解数独/ N 皇后。</p></div>`,
            code: dfsCode,
            run: dfsRun,
            buildState: buildGraphState
        },
        {
            id: 'graph.bfs',
            name: 'BFS', category: 'graph', level: 'P0',
            complexity: { time: 'O(V+E)', space: 'O(V)' },
            keywords: ['bfs', 'breadth first', 'guang du you xian'],
            mnemonic: '队列按层向外扩，无权最短随手得',
            description: `<div class="desc-section"><h3>核心思想</h3><p>从起点开始，一层一层地访问所有邻居，像水波扩散。</p></div><div class="desc-section"><h3>推导过程</h3><p>用队列维护当前层节点。弹出队首，把所有未访问的邻居入队。由于先入队的先处理，保证距离起点近的节点先被访问，从而找到无权图的最短路径。</p></div><div class="desc-section"><h3>适用场景</h3><p>无权图最短路径、层级遍历、连通性、社交网络扩散。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 迷宫最短步数。② 好友关系的“六度分隔”。③ 病毒传播模拟。</p></div>`,
            code: bfsCode,
            run: bfsRun,
            buildState: buildGraphState
        },
        {
            id: 'graph.topo',
            name: '拓扑排序 - Kahn', category: 'graph', level: 'P0',
            complexity: { time: 'O(V+E)', space: 'O(V)' },
            keywords: ['topological', 'kahn', 'indegree'],
            mnemonic: '入度为零入队列，依次输出拓扑序',
            description: `<div class="desc-section"><h3>核心思想</h3><p>拓扑排序把 DAG 的顶点排成线性序列，使得所有边都从前指向后。</p></div><div class="desc-section"><h3>推导过程</h3><p>Kahn 算法反复找入度为 0 的点加入结果，并删除其出边。DFS 法则是记录后序遍历的逆序。若无法处理完所有点，说明图中有环。</p></div><div class="desc-section"><h3>适用场景</h3><p>任务调度、依赖解析、编译顺序、课程先修。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 大学选课计划。② Makefile 构建顺序。③ npm 依赖安装顺序。</p></div>`,
            code: topoCode,
            run: topoRun,
            buildState: buildDAGState
        },
        {
            id: 'graph.dijkstra',
            name: 'Dijkstra', category: 'graph', level: 'P0',
            complexity: { time: 'O(V²)', space: 'O(V)' },
            keywords: ['dijkstra', 'shortest path', 'zui duan lu jing'],
            mnemonic: '贪心选近标记定，邻边松弛更新距',
            description: `<div class="desc-section"><h3>核心思想</h3><p>用于非负权图的单源最短路径：每次都选当前距离最小的点，用它更新邻居。</p></div><div class="desc-section"><h3>推导过程</h3><p>维护 dist[] 表示起点到各点的当前最短距离。初始 dist[start]=0，其余为 ∞。用优先队列取 dist 最小的点 u，对每条边 u→v，若 dist[u]+w < dist[v] 则更新。贪心成立的前提是所有边权非负。</p></div><div class="desc-section"><h3>适用场景</h3><p>地图导航、网络路由、物流配送、游戏寻路。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 高德地图最短路径。② 网络路由协议 OSPF。③ 外卖骑手路径规划。</p></div>`,
            code: dijkstraCode,
            run: dijkstraRun,
            buildState: buildGraphState
        },
        {
            id: 'graph.prim',
            name: 'Prim 最小生成树', category: 'graph', level: 'P0',
            complexity: { time: 'O(V²)', space: 'O(V)' },
            keywords: ['prim', 'mst', 'minimum spanning tree'],
            mnemonic: '任选起点逐步扩，最近邻边入树来',
            description: `<div class="desc-section"><h3>核心思想</h3><p>最小生成树选出一组边，连接所有顶点且总权重最小。</p></div><div class="desc-section"><h3>推导过程</h3><p>Prim 从一个点开始，每次选连接“已选集合”和“未选集合”的最短边，像长草。Kruskal 按边权排序，用并查集避免成环。Boruvka 每轮为每个连通块选最小边。</p></div><div class="desc-section"><h3>适用场景</h3><p>网络设计、电路布线、聚类、管道铺设。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 城市间铺设光纤使成本最低。② 电路板最小连线。③ 传感器网络连接。</p></div>`,
            code: primCode,
            run: primRun,
            buildState: buildGraphState
        },
        {
            id: 'graph.kruskal',
            name: 'Kruskal 最小生成树', category: 'graph', level: 'P0',
            complexity: { time: 'O(E log E)', space: 'O(V)' },
            keywords: ['kruskal', 'mst', 'union find'],
            mnemonic: '边权排序依次取，并查集判不成环',
            description: `<div class="desc-section"><h3>核心思想</h3><p>最小生成树选出一组边，连接所有顶点且总权重最小。</p></div><div class="desc-section"><h3>推导过程</h3><p>Prim 从一个点开始，每次选连接“已选集合”和“未选集合”的最短边，像长草。Kruskal 按边权排序，用并查集避免成环。Boruvka 每轮为每个连通块选最小边。</p></div><div class="desc-section"><h3>适用场景</h3><p>网络设计、电路布线、聚类、管道铺设。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 城市间铺设光纤使成本最低。② 电路板最小连线。③ 传感器网络连接。</p></div>`,
            code: kruskalCode,
            run: kruskalRun,
            buildState: buildGraphState
        }
    ];

    algos.forEach(a => AlgorithmLoader.register(a.id, a));
})();
