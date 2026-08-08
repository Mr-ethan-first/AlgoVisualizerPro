/**
 * P3 算法集合 - 高级算法
 *
 * 包含：
 *   - 排序：并行归并排序（模拟）
 *   - 图：SPFA 最短路、欧拉路径（Fleury/Hierholzer）、Kosaraju 强连通分量
 *   - 字符串：Sunday 字符串匹配、字符串哈希
 */
(function () {
    'use strict';

    const NUM_DATA = (s) => s.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n));
    const DEFAULT_ARR = [5, 3, 8, 1, 2, 7, 4, 6];

    // ====================================================================
    // 排序 P3
    // ====================================================================

    // ===== 并行归并排序（模拟 fork-join） =====
    const parallelMergeCode = `async function parallelMergeSort(arr, lo, hi, depth) {
  if (lo >= hi) return;
  if (depth === 0) { sequentialSort(arr, lo, hi); return; }
  const mid = (lo + hi) >> 1;
  await Promise.all([
    parallelMergeSort(arr, lo, mid, depth - 1),
    parallelMergeSort(arr, mid + 1, hi, depth - 1)
  ]);
  merge(arr, lo, mid, hi);
}`;
    function parallelMergeRun(ctx, data) {
        const arr = ctx.add(new ArrayTracer('arr', data.slice()));
        const log = ctx.add(new LogTracer('log'));
        const n = data.length;
        log.printInfo(`并行归并排序（模拟），n=${n}，最大并行深度 2`);

        // 模拟并行：用栈结构展示多个分支同时进行
        const taskQueue = ctx.add(new QueueTracer('taskQueue'));
        log.printInfo('任务队列调度：子区间并行处理');

        function merge(lo, mid, hi) {
            log.printInfo(`合并 [${lo}..${mid}] 与 [${mid + 1}..${hi}]`);
            arr.highlightRange(lo, hi, '#bc8cff');
            const tmp = [];
            let i = lo, j = mid + 1;
            while (i <= mid && j <= hi) {
                arr.setPointers([
                    { index: i, label: 'i', color: '#58a6ff' },
                    { index: j, label: 'j', color: '#bc8cff' }
                ]);
                if (arr.compare(i, j) <= 0) tmp.push(arr.items[i++].value);
                else tmp.push(arr.items[j++].value);
            }
            while (i <= mid) tmp.push(arr.items[i++].value);
            while (j <= hi) tmp.push(arr.items[j++].value);
            for (let k = 0; k < tmp.length; k++) {
                arr.items[lo + k] = { value: tmp[k], state: 'current' };
                arr._commit({
                    type: 'set',
                    payload: { index: lo + k, value: tmp[k] },
                    description: `arr[${lo + k}] = ${tmp[k]}（回填）`
                });
                arr.items[lo + k].state = 'default';
            }
            log.printSuccess(`区间 [${lo}..${hi}] 合并完成`);
        }

        function sort(lo, hi, depth, taskId) {
            ctx.line(1);
            if (lo >= hi) return;
            if (depth === 0) {
                ctx.line(2);
                log.printInfo(`任务 ${taskId}: 顺序排序 [${lo}..${hi}]`);
                // 简单插入排序
                for (let i = lo + 1; i <= hi; i++) {
                    const key = arr.items[i].value;
                    let j = i - 1;
                    arr.highlight(i, 'current', `key=${key}`);
                    while (j >= lo && arr.compare(j, i) > 0) {
                        arr.items[j + 1] = { value: arr.items[j].value, state: 'swap' };
                        arr._commit({
                            type: 'set',
                            payload: { index: j + 1, value: arr.items[j].value },
                            description: `arr[${j + 1}] = arr[${j}]`
                        });
                        arr.items[j + 1].state = 'default';
                        j--;
                    }
                    arr.items[j + 1] = { value: key, state: 'current' };
                    arr._commit({
                        type: 'set',
                        payload: { index: j + 1, value: key },
                        description: `arr[${j + 1}] = ${key}（插入）`
                    });
                    arr.items[j + 1].state = 'default';
                }
                return;
            }
            ctx.line(3);
            const mid = (lo + hi) >> 1;
            // 模拟 fork：左右子任务并行
            ctx.line(4);
            log.printInfo(`任务 ${taskId}: fork → [${lo}..${mid}] & [${mid + 1}..${hi}]`);
            taskQueue.enqueue(`L${taskId * 2}:[${lo},${mid}]`);
            taskQueue.enqueue(`R${taskId * 2 + 1}:[${mid + 1},${hi}]`);
            sort(lo, mid, depth - 1, taskId * 2);
            sort(mid + 1, hi, depth - 1, taskId * 2 + 1);
            taskQueue.dequeue();
            taskQueue.dequeue();
            ctx.line(7);
            merge(lo, mid, hi);
        }
        sort(0, n - 1, 2, 1);
        arr.done();
        log.printSuccess('并行归并排序完成');
    }

    // ====================================================================
    // 图算法 P3
    // ====================================================================

    // 图状态构建器：统一使用公共实现（js/core/stateBuilders.js）
    const buildGraphState = StateBuilders.buildGraphState;

    // ===== SPFA 最短路径 =====
    const spfaCode = `function spfa(graph, src) {
  const dist = new Array(n).fill(Infinity);
  const inQueue = new Array(n).fill(false);
  const count = new Array(n).fill(0); // 入队次数，用于判负环
  dist[src] = 0;
  const queue = [src];
  inQueue[src] = true;
  while (queue.length > 0) {
    const u = queue.shift();
    inQueue[u] = false;
    for (const [v, w] of adj[u]) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        if (!inQueue[v]) {
          queue.push(v);
          inQueue[v] = true;
          count[v]++;
          if (count[v] >= n) return null; // 存在负环
        }
      }
    }
  }
  return dist;
}`;
    function spfaRun(ctx) {
        const WG = {
            vertices: ['A', 'B', 'C', 'D', 'E'],
            edges: [
                { u: 0, v: 1, weight: 2 }, { u: 0, v: 2, weight: 5 },
                { u: 1, v: 2, weight: 1 }, { u: 1, v: 3, weight: 3 },
                { u: 2, v: 3, weight: 1 }, { u: 2, v: 4, weight: 6 },
                { u: 3, v: 4, weight: 2 }
            ]
        };
        const vertices = WG.vertices.map(v => ({ label: v, state: 'default' }));
        const edges = WG.edges.map(e => ({ ...e, directed: true }));
        const g = ctx.add(new GraphTracer('graph', vertices, edges));
        const q = ctx.add(new QueueTracer('queue'));
        const log = ctx.add(new LogTracer('log'));
        const n = vertices.length;
        const adj = Array.from({ length: n }, () => []);
        edges.forEach(e => adj[e.u].push([e.v, e.weight]));

        const dist = new Array(n).fill(Infinity);
        const inQueue = new Array(n).fill(false);
        const count = new Array(n).fill(0);
        const src = 0;
        ctx.line(6);
        dist[src] = 0;
        g.vertices[src].tag = '0';
        g._commit({ type: 'snapshot', payload: {}, description: `dist[${vertices[src].label}] = 0` });
        log.printInfo(`从 ${vertices[src].label} 开始 SPFA`);

        ctx.line(7);
        const queue = [src];
        q.enqueue(vertices[src].label);
        inQueue[src] = true;
        g.vertices[src].state = 'current';

        ctx.line(9);
        while (queue.length > 0) {
            ctx.line(10);
            const u = queue.shift();
            q.dequeue();
            inQueue[u] = false;
            g.vertices[u].state = 'visited';
            g.vertices[u].tag = String(dist[u]);
            g._commit({ type: 'visit', payload: { vertex: u }, description: `出队 ${vertices[u].label}，dist=${dist[u]}` });
            log.printInfo(`处理 ${vertices[u].label} (dist=${dist[u]})`);
            ctx.line(11);
            for (const [v, w] of adj[u]) {
                ctx.line(12);
                if (dist[u] + w < dist[v]) {
                    ctx.line(13);
                    dist[v] = dist[u] + w;
                    g.setDist(v, dist[v]);
                    g.highlightEdge(u, v, '#58a6ff', `松弛: ${dist[u]}+${w}=${dist[v]}`);
                    log.printInfo(`松弛 ${vertices[u].label} → ${vertices[v].label}，dist=${dist[v]}`);
                    ctx.line(14);
                    if (!inQueue[v]) {
                        ctx.line(15);
                        queue.push(v);
                        q.enqueue(vertices[v].label);
                        inQueue[v] = true;
                        count[v]++;
                        ctx.line(16);
                        if (count[v] >= n) {
                            log.printError('检测到负环');
                            return;
                        }
                    }
                }
            }
            g.vertices[u].state = 'default';
        }
        log.printSuccess('SPFA 完成');
    }

    // ===== 欧拉路径（Hierholzer 算法） =====
    const eulerPathCode = `function hierholzer(graph, start) {
  const stack = [start];
  const path = [];
  while (stack.length > 0) {
    const u = stack[stack.length - 1];
    if (adj[u].length > 0) {
      const v = adj[u].pop();
      stack.push(v);
    } else {
      path.push(stack.pop());
    }
  }
  return path.reverse();
}`;
    function eulerPathRun(ctx) {
        // 构造一个含欧拉路径的有向图：节点出度差为 1
        // 0 → 1 → 2 → 0 → 3 → 1（每个节点出入度相等）
        const EG = {
            vertices: ['A', 'B', 'C', 'D'],
            edges: [
                { u: 0, v: 1 }, { u: 1, v: 2 }, { u: 2, v: 0 },
                { u: 0, v: 3 }, { u: 3, v: 1 }
            ]
        };
        const vertices = EG.vertices.map(v => ({ label: v, state: 'default' }));
        const edges = EG.edges.map(e => ({ ...e, directed: true }));
        const g = ctx.add(new GraphTracer('graph', vertices, edges));
        const stack = ctx.add(new StackTracer('stack'));
        const pathQ = ctx.add(new QueueTracer('path'));
        const log = ctx.add(new LogTracer('log'));
        const n = vertices.length;
        const adj = Array.from({ length: n }, () => []);
        edges.forEach(e => adj[e.u].push(e.v));
        // 逆序以便 pop 得到较小下标优先
        adj.forEach(a => a.reverse());

        log.printInfo('Hierholzer 算法求欧拉路径');
        const stk = [0];
        stack.push(vertices[0].label);
        g.vertices[0].state = 'current';
        const path = [];
        ctx.line(3);
        while (stk.length > 0) {
            ctx.line(4);
            const u = stk[stk.length - 1];
            ctx.line(5);
            if (adj[u].length > 0) {
                ctx.line(6);
                const v = adj[u].pop();
                g.highlightEdge(u, v, '#3fb950', `${vertices[u].label} → ${vertices[v].label}`);
                log.printInfo(`走 ${vertices[u].label} → ${vertices[v].label}`);
                stk.push(v);
                stack.push(vertices[v].label);
                g.vertices[v].state = 'current';
                ctx.line(7);
            } else {
                ctx.line(9);
                const x = stk.pop();
                stack.pop();
                path.push(x);
                pathQ.enqueue(vertices[x].label);
                g.vertices[x].state = 'sorted';
                g._commit({
                    type: 'visit',
                    payload: { vertex: x },
                    description: `${vertices[x].label} 加入路径头部 → [${path.map(p => vertices[p].label).reverse().join(' → ')}]`
                });
            }
        }
        path.reverse();
        log.printSuccess(`欧拉路径: ${path.map(p => vertices[p].label).join(' → ')}`);
    }

    // ===== Kosaraju 强连通分量 =====
    const kosarajuCode = `function kosaraju(graph) {
  // 1. DFS 原图，记录逆后序
  const visited = new Set();
  const order = [];
  function dfs1(u) {
    visited.add(u);
    for (const v of adj[u]) if (!visited.has(v)) dfs1(v);
    order.push(u);
  }
  for (const u of vertices) if (!visited.has(u)) dfs1(u);
  // 2. 在反图上按逆后序 DFS，每次 DFS 树即一个 SCC
  const sccs = [];
  const visited2 = new Set();
  function dfs2(u, comp) {
    visited2.add(u);
    comp.push(u);
    for (const v of radj[u]) if (!visited2.has(v)) dfs2(v, comp);
  }
  for (let i = order.length - 1; i >= 0; i--) {
    const u = order[i];
    if (!visited2.has(u)) {
      const comp = [];
      dfs2(u, comp);
      sccs.push(comp);
    }
  }
  return sccs;
}`;
    function kosarajuRun(ctx) {
        const SCC_GRAPH = {
            vertices: ['A', 'B', 'C', 'D', 'E'],
            edges: [
                { u: 0, v: 1 }, { u: 1, v: 2 }, { u: 2, v: 0 }, // SCC1: {A, B, C}
                { u: 2, v: 3 }, { u: 3, v: 4 } // SCC2: {D}, SCC3: {E}
            ]
        };
        const vertices = SCC_GRAPH.vertices.map(v => ({ label: v, state: 'default' }));
        const edges = SCC_GRAPH.edges.map(e => ({ ...e, directed: true }));
        const g = ctx.add(new GraphTracer('graph', vertices, edges));
        const stack = ctx.add(new StackTracer('stack'));
        const log = ctx.add(new LogTracer('log'));
        const n = vertices.length;
        const adj = Array.from({ length: n }, () => []);
        const radj = Array.from({ length: n }, () => []);
        edges.forEach(e => {
            adj[e.u].push(e.v);
            radj[e.v].push(e.u);
        });

        log.printInfo('Kosaraju 算法求强连通分量');

        // Phase 1: DFS 原图，记录逆后序
        const visited = new Set();
        const order = [];
        log.printInfo('阶段 1：DFS 原图，记录逆后序');
        function dfs1(u) {
            ctx.line(5);
            visited.add(u);
            g.visit(u);
            g.vertices[u].state = 'visited';
            log.printInfo(`DFS 进入 ${vertices[u].label}`);
            ctx.line(6);
            for (const v of adj[u]) {
                if (!visited.has(v)) {
                    g.highlightEdge(u, v, '#58a6ff', `${vertices[u].label} → ${vertices[v].label}`);
                    dfs1(v);
                }
            }
            ctx.line(7);
            order.push(u);
            stack.push(vertices[u].label);
            log.printSuccess(`${vertices[u].label} 完成，加入逆后序栈`);
        }
        for (let u = 0; u < n; u++) {
            if (!visited.has(u)) dfs1(u);
        }

        // 重置颜色
        g.vertices.forEach(v => v.state = 'default');
        g._commit({ type: 'snapshot', payload: {}, description: '阶段 1 完成，开始阶段 2（反图 DFS）' });

        // Phase 2: 在反图上按逆后序 DFS
        const sccColors = ['#3fb950', '#bc8cff', '#d29922', '#f78166', '#58a6ff'];
        const sccs = [];
        const visited2 = new Set();
        log.printInfo('阶段 2：反图上按逆后序 DFS');
        function dfs2(u, comp, color) {
            visited2.add(u);
            comp.push(u);
            g.vertices[u].state = 'sorted';
            g.vertices[u].color = color;
            g._commit({
                type: 'visit',
                payload: { vertex: u },
                description: `${vertices[u].label} 加入 SCC #${sccs.length + 1}`
            });
            for (const v of radj[u]) {
                if (!visited2.has(v)) dfs2(v, comp, color);
            }
        }
        ctx.line(15);
        for (let i = order.length - 1; i >= 0; i--) {
            ctx.line(16);
            const u = order[i];
            if (!visited2.has(u)) {
                ctx.line(17);
                const comp = [];
                const color = sccColors[sccs.length % sccColors.length];
                log.printInfo(`新 SCC 起点: ${vertices[u].label}`);
                dfs2(u, comp, color);
                sccs.push(comp);
                stack.pop();
                log.printSuccess(`SCC #${sccs.length}: {${comp.map(c => vertices[c].label).join(', ')}}`);
            }
        }
        log.printSuccess(`共找到 ${sccs.length} 个强连通分量`);
    }

    // ====================================================================
    // 字符串 P3
    // ====================================================================

    // ===== Sunday 字符串匹配 =====
    const sundayCode = `function sundayMatch(text, pattern) {
  const n = text.length, m = pattern.length;
  const shift = {}; // 每个字符在最右出现位置离模式串尾的距离 + 1
  for (let i = 0; i < m; i++) shift[pattern[i]] = m - i;
  let i = 0;
  while (i <= n - m) {
    let j = 0;
    while (j < m && text[i + j] === pattern[j]) j++;
    if (j === m) return i;
    if (i + m >= n) break;
    const next = text[i + m];
    i += (shift[next] !== undefined ? shift[next] : m + 1);
  }
  return -1;
}`;
    function sundayRun(ctx) {
        const text = 'GCATCGCAGAGAGTATACAGTACG';
        const pattern = 'GCAGAGAG';
        const n = text.length, m = pattern.length;
        const textArr = ctx.add(new ArrayTracer('text', text.split('')));
        const pattArr = ctx.add(new ArrayTracer('pattern', pattern.split('')));
        const log = ctx.add(new LogTracer('log'));
        log.printInfo(`text="${text}"，pattern="${pattern}"`);

        // 构建 shift 表
        const shift = {};
        for (let i = 0; i < m; i++) shift[pattern[i]] = m - i;
        log.printInfo(`shift 表: ${JSON.stringify(shift)}`);

        let i = 0;
        ctx.line(4);
        while (i <= n - m) {
            ctx.line(5);
            textArr.setPointers([{ index: i, label: 'i', color: '#58a6ff' }]);
            let j = 0;
            ctx.line(6);
            while (j < m && text[i + j] === pattern[j]) {
                pattArr.highlight(j, 'visited');
                textArr.highlight(i + j, 'visited');
                j++;
            }
            ctx.line(7);
            if (j === m) {
                for (let k = 0; k < m; k++) {
                    textArr.items[i + k].state = 'sorted';
                    pattArr.items[k].state = 'sorted';
                }
                textArr._commit({
                    type: 'mark',
                    payload: { i, m },
                    description: `找到匹配，位置 = ${i}`
                });
                log.printSuccess(`找到匹配，位置 = ${i}`);
                return;
            }
            log.printInfo(`i=${i} 不匹配，已匹配 ${j} 字符`);
            ctx.line(8);
            if (i + m >= n) {
                ctx.line(9);
                break;
            }
            ctx.line(10);
            const next = text[i + m];
            const s = shift[next] !== undefined ? shift[next] : m + 1;
            // 高亮 next 字符位置
            textArr.highlight(i + m, 'current', `next="${next}"`);
            log.printInfo(`下一字符 '${next}'，shift=${s}，i += ${s}`);
            ctx.line(11);
            i += s;
            // 重置 pattern 高亮
            pattArr.items.forEach(it => it.state = 'default');
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
        const canvasW = (ctxInfo && ctxInfo.width) || (window.app?.renderer?.width || 800);
        const canvasH = (ctxInfo && ctxInfo.height) || (window.app?.renderer?.height || 400);
        const maxLen = Math.max(textSnap.items.length, pattSnap ? pattSnap.items.length : 0, 1);

        // 左侧为行标签（"text"/"pattern"）预留空间，避免标签被裁出画布
        const labelMargin = 60;
        const availW = Math.max(140, canvasW - labelMargin * 2);
        const gap = 6;
        // 目标方块更大以充分利用画布；文本过长时按宽度自适应压缩，保证尾部不裁切
        let cellW = 44;
        if (maxLen > 1 && maxLen * (cellW + gap) - gap > availW) {
            cellW = Math.max(12, Math.floor((availW + gap) / maxLen) - gap);
        }
        // 高度方向：两行方块随画布高度放大并垂直居中，消除上下留白
        const padTop = 40, padBottom = 22;
        const availH = Math.max(120, canvasH - padTop - padBottom);
        // 两行 + 行间间距(0.4*cellH)，整体占满 availH；上限避免过大
        let cellH = Math.min(78, Math.floor(availH / 2.4));
        cellH = Math.max(40, cellH);
        const rowGap = Math.max(18, Math.round(cellH * 0.4));
        const blockH = 2 * cellH + rowGap;
        const startY = Math.max(30, Math.round((canvasH - blockH) / 2));
        const fontSize = Math.min(22, Math.round(cellH * 0.42));
        const ptrFont = Math.min(18, Math.round(cellH * 0.34));

        const labels = ['text', 'pattern'];
        [textSnap, pattSnap].forEach((snap, idx) => {
            if (!snap) return;
            const y = startY + idx * (cellH + rowGap);
            const total = snap.items.length * (cellW + gap) - gap;
            const x0 = labelMargin + Math.max(0, (availW - total) / 2);
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
                    opts: { stroke: tk.cellBorder, strokeWidth: 1, fontSize }
                });
            });
            state.shapes.push({
                kind: 'text',
                x: labelMargin - 10, y: y + cellH / 2,
                text: labels[idx], color: tk.dim, fontSize: 12, align: 'right', opts: { bold: true }
            });
            if (snap.pointers && snap.pointers.length) {
                snap.pointers.forEach(p => {
                    if (p.index < snap.items.length) {
                        state.shapes.push({
                            kind: 'text',
                            x: x0 + p.index * (cellW + gap) + cellW / 2, y: y - 8,
                            text: p.label || '↓', color: p.color || '#d29922',
                            fontSize: ptrFont, align: 'center', opts: { bold: true }
                        });
                    }
                });
            }
        });
        return state;
    }

    // ===== 字符串哈希（多项式哈希） =====
    const strHashCode = `function polynomialHash(s, base = 131, mod = 1e9+7) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * base + s.charCodeAt(i)) % mod;
  }
  return h;
}
function computePrefixHash(s, base = 131, mod = 1e9+7) {
  const n = s.length;
  const h = new Array(n + 1).fill(0);
  const pw = new Array(n + 1).fill(1);
  for (let i = 0; i < n; i++) {
    h[i + 1] = (h[i] * base + s.charCodeAt(i)) % mod;
    pw[i + 1] = (pw[i] * base) % mod;
  }
  // 区间 [l, r] 哈希: h[r+1] - h[l] * pw[r-l+1]
  return { h, pw };
}`;
    function strHashRun(ctx) {
        const s = 'HELLOWORLD';
        const n = s.length;
        const arr = ctx.add(new ArrayTracer('arr', s.split('')));
        const dp = ctx.add(new DPTableTracer('hash', 2, n + 1));
        dp.rowLabels = ['h', 'pw'];
        dp.colLabels = Array.from({ length: n + 1 }, (_, i) => i === 0 ? '∅' : s[i - 1]);
        const log = ctx.add(new LogTracer('log'));
        const base = 131, mod = 1000000007;
        log.printInfo(`字符串 "${s}"，base=${base}, mod=${mod}`);

        const h = new Array(n + 1).fill(0);
        const pw = new Array(n + 1).fill(1);
        dp.cells[0][0] = { value: 0, state: 'default' };
        dp.cells[1][0] = { value: 1, state: 'default' };

        ctx.line(8);
        for (let i = 0; i < n; i++) {
            ctx.line(9);
            h[i + 1] = (h[i] * base + s.charCodeAt(i)) % mod;
            arr.highlight(i, 'current', `s[${i}]='${s[i]}' (ascii=${s.charCodeAt(i)})`);
            dp.cells[0][i + 1] = { value: h[i + 1], state: 'current' };
            dp._commit({
                type: 'visit',
                payload: { row: 0, col: i + 1 },
                description: `h[${i + 1}] = (h[${i}] * ${base} + ${s.charCodeAt(i)}) % ${mod} = ${h[i + 1]}`
            });
            log.printInfo(`h[${i + 1}] = ${h[i + 1]}`);
            ctx.line(10);
            pw[i + 1] = (pw[i] * base) % mod;
            dp.cells[1][i + 1] = { value: pw[i + 1], state: 'visited' };
            dp._commit({
                type: 'visit',
                payload: { row: 1, col: i + 1 },
                description: `pw[${i + 1}] = pw[${i}] * ${base} % ${mod} = ${pw[i + 1]}`
            });
            dp.cells[0][i + 1].state = 'default';
        }

        // 演示区间哈希：计算 "LL" (子串 [2,3]) 的哈希
        const L = 2, R = 3;
        ctx.line(14);
        log.printInfo(`计算子串 [${L}..${R}] = "${s.substring(L, R + 1)}" 的哈希`);
        dp.cells[0][R + 1].state = 'sorted';
        dp.cells[0][L].state = 'current';
        dp.cells[1][R - L + 1].state = 'sorted';
        const rangeHash = ((h[R + 1] - h[L] * pw[R - L + 1]) % mod + mod) % mod;
        dp._commit({
            type: 'mark',
            payload: { L, R },
            description: `hash[${L}..${R}] = (h[${R + 1}] - h[${L}] * pw[${R - L + 1}]) % ${mod} = ${rangeHash}`
        });
        log.printSuccess(`子串 "${s.substring(L, R + 1)}" 的哈希 = ${rangeHash}`);
    }

    // ====================================================================
    // 注册
    // ====================================================================
    const algos = [
        {
            id: 'sorting.parallelMerge',
            name: '并行归并排序（模拟）', category: 'sorting', level: 'P3',
            complexity: { time: 'O(n log n)', space: 'O(n)' },
            keywords: ['parallel', 'merge', 'fork join', 'bing xing'],
            mnemonic: 'fork切分并行算，join合并深度限',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>使用 fork-join 模型：递归切分子任务，并行执行两个子区间排序，再合并。最大并行深度有限以控制线程数。</p>
                <h3>复杂度</h3><p>并行时间 O(log² n)（理论），实际受限于核数与并行开销。</p>
            </div>`,
            code: parallelMergeCode,
            defaultData: DEFAULT_ARR,
            dataParser: NUM_DATA,
            run: parallelMergeRun
        },

        {
            id: 'graph.spfa',
            name: 'SPFA 最短路径', category: 'graph', level: 'P3',
            complexity: { time: 'O(kE)~', space: 'O(V+E)' },
            keywords: ['spfa', 'shortest path', 'negative weight'],
            mnemonic: '队列优化松弛法，入队超n判负环',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>用队列优化 Bellman-Ford：仅当节点 dist 被松弛时才重新入队。每个节点可多次入队。</p>
                <h3>应用</h3><p>支持负权边，可检测负环（节点入队次数 ≥ n 即存在负环）。</p>
            </div>`,
            code: spfaCode,
            run: spfaRun,
            buildState: buildGraphState
        },
        {
            id: 'graph.eulerPath',
            name: '欧拉路径（Hierholzer）', category: 'graph', level: 'P3',
            complexity: { time: 'O(V+E)', space: 'O(V+E)' },
            keywords: ['euler', 'hierholzer', 'ou la'],
            mnemonic: '栈顶有边继续走，无路弹出补路径',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>栈辅助 DFS：栈顶节点有未走的边就走下去；无路可走时弹出并加入路径头部。最终逆序即为欧拉路径。</p>
                <h3>判存在</h3><p>无向图：度数为奇数的节点数为 0 或 2。有向图：所有点出入度相等（回路）或恰有两个点出入度差为 1。</p>
            </div>`,
            code: eulerPathCode,
            run: eulerPathRun,
            buildState: buildGraphState
        },
        {
            id: 'graph.kosaraju',
            name: 'Kosaraju 强连通分量', category: 'graph', level: 'P3',
            complexity: { time: 'O(V+E)', space: 'O(V+E)' },
            keywords: ['kosaraju', 'scc', 'qiang lian tong'],
            mnemonic: '原图逆后序反图搜，两次深搜得强连',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>两遍 DFS：① 在原图上 DFS，记录节点完成顺序（逆后序）；② 在反图上按逆后序 DFS，每次 DFS 树即一个 SCC。</p>
                <h3>应用</h3><p>缩点、2-SAT、依赖分析。</p>
            </div>`,
            code: kosarajuCode,
            run: kosarajuRun,
            buildState: buildGraphState
        },

        {
            id: 'string.sunday',
            name: 'Sunday 字符串匹配', category: 'string', level: 'P3',
            complexity: { time: 'O(n)~', space: 'O(m)' },
            keywords: ['sunday', 'string match', 'shift'],
            mnemonic: '失配看下一字符，位移表定右移数',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>失配时观察模式串后紧跟的下一字符 next，根据 shift[next] 决定模式串右移位数：shift[c] = m - i（i 为 c 在模式串最右出现位置）。</p>
                <h3>对比</h3><p>通常比 KMP 更快，跳过更多无效位置。</p>
            </div>`,
            code: sundayCode,
            run: sundayRun,
            buildState: buildStringMatchState
        },
        {
            id: 'string.hash',
            name: '字符串哈希（多项式哈希）', category: 'string', level: 'P3',
            complexity: { time: 'O(n)', space: 'O(n)' },
            keywords: ['hash', 'polynomial', 'zi fu chuan ha xi'],
            mnemonic: '进制展开求前缀，幂次预处理子串',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>把字符串视为 base 进制数：h[i+1] = h[i] * base + s[i] (mod)。预处理前缀哈希和 base 的幂，可在 O(1) 内求任意子串哈希。</p>
                <h3>应用</h3><p>快速比较两子串是否相等、字符串匹配、去重。</p>
            </div>`,
            code: strHashCode,
            run: strHashRun
        }
    ];

    algos.forEach(a => AlgorithmLoader.register(a.id, a));
})();
