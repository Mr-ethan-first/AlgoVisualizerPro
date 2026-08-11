(function (global) {
    'use strict';

    const NUM_DATA = (s) => (s && s.length)
        ? s.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n))
        : null;
    const asNumbers = (data, fallback) => {
        if (Array.isArray(data) && data.length > 0) return data.map(x => Number(x) || 0);
        const parsed = NUM_DATA(data);
        return (parsed && parsed.length) ? parsed : fallback;
    };
    const GREEN = '#3fb950';
    const BLUE = '#58a6ff';
    const ORANGE = '#d29922';

    // ============================================================
    // 1. Bellman-Ford 单源最短路径（可处理负权边）
    // ============================================================
    const bellmanCode = `function bellmanFord(G, s) {
  distTo[s] = 0;
  for (let i = 0; i < V - 1; i++)
    for (const e of G.edges())
      relax(e);
  for (const e of G.edges())
    if (distTo[e.to] > distTo[e.from] + e.weight)
      return false; // 存在负环
  return true;
}
function relax(e) {
  if (distTo[e.to] > distTo[e.from] + e.weight) {
    distTo[e.to] = distTo[e.from] + e.weight;
    edgeTo[e.to] = e;
  }
}`;
    function bellmanRun(ctx) {
        // 带负权边的有向图
        const labels = ['A', 'B', 'C', 'D', 'E'];
        const edges = [
            { u: 0, v: 1, w: 4 }, { u: 0, v: 2, w: 2 },
            { u: 1, v: 2, w: -2 }, { u: 2, v: 3, w: 2 },
            { u: 1, v: 3, w: 1 }, { u: 3, v: 4, w: 3 },
            { u: 2, v: 4, w: 1 }
        ];
        const n = labels.length;
        const g = ctx.add(new GraphTracer('graph',
            labels.map(l => ({ label: l })),
            edges.map(e => ({ u: e.u, v: e.v, weight: e.w, directed: true }))));
        const dist = ctx.add(new ArrayTracer('dist', Array.from({ length: n }, () => '∞')));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo('Bellman-Ford：对全部边进行 V-1 轮松弛，可处理负权边');

        const d = new Array(n).fill(Infinity);
        d[0] = 0;
        dist.set(0, 0);
        log.printInfo('初始化：源点 A 距离为 0，其余为 ∞');

        let relaxed = false;
        for (let i = 0; i < n - 1; i++) {
            ctx.line(3);
            log.printInfo(`第 ${i + 1} / ${n - 1} 轮松弛`);
            relaxed = false;
            for (const e of edges) {
                if (d[e.u] === Infinity) continue;
                g.highlightEdge(e.u, e.v, BLUE, `松弛边 ${labels[e.u]}→${labels[e.v]}(${e.w})`);
                if (d[e.u] + e.w < d[e.v]) {
                    d[e.v] = d[e.u] + e.w;
                    dist.set(e.v, d[e.v]);
                    g.setDist(e.v, d[e.v]);
                    g.highlightEdge(e.u, e.v, GREEN, `更新 ${labels[e.v]} 的距离为 ${d[e.v]}`);
                    log.printSuccess(`${labels[e.v]} 距离更新为 ${d[e.v]}`);
                    relaxed = true;
                } else {
                    g.highlightEdge(e.u, e.v, ORANGE, `${labels[e.v]} 无需更新`);
                }
            }
            if (!relaxed) {
                log.printInfo('本轮无更新，提前结束');
                break;
            }
        }
        ctx.line(5);
        let hasNegCycle = false;
        for (const e of edges) {
            if (d[e.u] !== Infinity && d[e.u] + e.w < d[e.v]) {
                hasNegCycle = true;
                g.highlightEdge(e.u, e.v, '#f85149', `负环检测：${labels[e.u]}→${labels[e.v]}`);
                log.printError('检测到负权环');
                break;
            }
        }
        if (!hasNegCycle) log.printSuccess('✓ Bellman-Ford 完成，无负环');
        g.done('✓ Bellman-Ford 完成');
    }

    // ============================================================
    // 2. LZW 压缩
    // ============================================================
    const lzwCode = `function lzwCompress(input) {
  const dict = new Map(); let code = 256;
  for (let i = 0; i < 256; i++) dict.set(String.fromCharCode(i), i);
  let s = '';
  for (const c of input) {
    const sc = s + c;
    if (dict.has(sc)) s = sc;
    else { output.push(dict.get(s)); dict.set(sc, code++); s = c; }
  }
  if (s) output.push(dict.get(s));
}`;
    function lzwRun(ctx, data) {
        const input = (typeof data === 'string' && data.length) ? data : 'TOBEORNOTTOBEORTOBEORNOT';
        const chars = input.split('');
        const arr = ctx.add(new ArrayTracer('input', chars));
        const out = ctx.add(new ArrayTracer('output', []));
        const dictArr = ctx.add(new ArrayTracer('dict', []));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo('LZW：初始化字典 0-255 为单字符');

        const dict = new Map();
        for (let i = 0; i < 256; i++) dict.set(String.fromCharCode(i), i);
        let code = 256;
        let s = '';
        const output = [];
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            arr.highlight(i, 'current', `当前字符 '${c}'`);
            const sc = s + c;
            if (dict.has(sc)) {
                s = sc;
                log.printInfo(`"${sc}" 已在字典中，继续扩展`);
            } else {
                output.push(dict.get(s));
                out.push(dict.get(s), `输出编码 ${dict.get(s)}（"${s}"）`);
                dict.set(sc, code);
                dictArr.push(`${sc}:${code}`, `字典新增 "${sc}" → ${code}`);
                log.printSuccess(`输出 ${dict.get(s)}，字典新增 "${sc}" = ${code}`);
                code++;
                s = c;
            }
        }
        if (s) {
            output.push(dict.get(s));
            out.push(dict.get(s), `输出末尾编码 ${dict.get(s)}（"${s}"）`);
        }
        log.printSuccess(`✓ LZW 完成：输入 ${chars.length} 字符 → 输出 ${output.length} 个编码`);
        out.done('✓ 输出完成');
    }

    // ============================================================
    // 3. TopM（维护最小堆，从流中找最大的 M 个）
    // ============================================================
    const topMCode = `function topM(stream, M) {
  const pq = new MinPQ();
  for (const x of stream) {
    pq.insert(x);
    if (pq.size() > M) pq.delMin();
  }
  return pq;
}`;
    function topMRun(ctx, data) {
        const M = 5;
        const stream = asNumbers(data, [12, 5, 9, 22, 3, 17, 8, 31, 14, 6, 19, 2, 25, 11]);
        if (stream.length < M) stream.push(...Array.from({ length: M }, () => Math.floor(Math.random() * 50) + 1));
        const arr = ctx.add(new ArrayTracer('stream', stream.slice()));
        const pq = ctx.add(new ArrayTracer('topM', []));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo(`TopM：维护容量为 ${M} 的最小堆，保留流中最大的 ${M} 个元素`);

        const heap = [];
        function heapifyUp(i) {
            while (i > 0) {
                const p = (i - 1) >> 1;
                if (heap[p] <= heap[i]) break;
                [heap[p], heap[i]] = [heap[i], heap[p]]; i = p;
            }
        }
        function heapifyDown(i) {
            const n = heap.length;
            while (true) {
                let l = 2 * i + 1, r = 2 * i + 2, smallest = i;
                if (l < n && heap[l] < heap[smallest]) smallest = l;
                if (r < n && heap[r] < heap[smallest]) smallest = r;
                if (smallest === i) break;
                [heap[i], heap[smallest]] = [heap[smallest], heap[i]]; i = smallest;
            }
        }

        for (let i = 0; i < stream.length; i++) {
            const x = stream[i];
            arr.highlight(i, 'current', `读入 ${x}`);
            if (heap.length < M) {
                heap.push(x); heapifyUp(heap.length - 1);
                pq.setItems(heap.slice());
                log.printInfo(`${x} 入堆，当前堆大小 ${heap.length}`);
            } else if (x > heap[0]) {
                const old = heap[0];
                heap[0] = x; heapifyDown(0);
                pq.setItems(heap.slice());
                log.printSuccess(`${x} 替换堆顶最小值 ${old}`);
            } else {
                log.printInfo(`${x} 小于堆顶最小值 ${heap[0]}，丢弃`);
            }
        }
        pq.done(`✓ Top ${M} 结果：${heap.slice().sort((a, b) => b - a).join(', ')}`);
    }

    // ============================================================
    // 注册
    // ============================================================
    const algos = [
        {
            id: 'graph.bellmanFord', name: 'Bellman-Ford 单源最短路径', category: 'graph', level: 'P2',
            complexity: { time: 'O(V·E)', space: 'O(V)' }, keywords: ['bellman-ford', 'shortest path', 'negative weight'],
            mnemonic: 'V-1 轮全边松，再多一轮查负环',
            description: `<div class="desc-section"><h3>核心思想</h3><p>Bellman-Ford 能处理负权边的单源最短路径，通过反复松弛所有边实现。</p></div><div class="desc-section"><h3>推导过程</h3><p>进行 n−1 轮松弛：对每条边 u→v，若 dist[u]+w < dist[v] 则更新。因为最短路径最多含 n−1 条边，n−1 轮足够。若第 n 轮还能更新，说明存在负环。SPFA 用队列只处理被更新的节点，常数更小。</p></div><div class="desc-section"><h3>适用场景</h3><p>含负权边的图、货币套利、差分约束。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 外汇套利检测。② 差分约束系统。③ 含负权边的网络路由。</p></div>`,
            code: bellmanCode, defaultData: [], dataParser: (s) => s, run: bellmanRun
        },
        {
            id: 'string.lzw', name: 'LZW 压缩', category: 'string', level: 'P2',
            complexity: { time: 'O(N)', space: 'O(N)' }, keywords: ['lzw', 'compression', 'dictionary'],
            mnemonic: '字符流建字典，未见过就输出并新增',
            description: `<div class="desc-section"><h3>核心思想</h3><p>LZW 压缩在编码过程中动态构建字典，把重复子串用短编码替换。</p></div><div class="desc-section"><h3>推导过程</h3><p>初始字典包含所有单字符。扫描输入时，尽量匹配字典中最长的已有字符串，输出其编码，并把“当前串+下一个字符”加入字典。解压时同样重建字典。</p></div><div class="desc-section"><h3>适用场景</h3><p>文件压缩、图像格式（GIF/TIFF）、PDF 压缩。</p></div><div class="desc-section"><h3>典型案例</h3><p>① GIF 图像压缩。② Unix compress 工具。③ PDF 文本流压缩。</p></div>`,
            code: lzwCode, defaultData: 'TOBEORNOTTOBEORTOBEORNOT', dataParser: (s) => s, run: lzwRun
        },
        {
            id: 'sorting.topM', name: 'TopM（最小堆选最大 M 个）', category: 'sorting', level: 'P2',
            complexity: { time: 'O(N log M)', space: 'O(M)' }, keywords: ['top m', 'min heap', 'selection'],
            mnemonic: '小顶堆留大者，超容量踢最小',
            description: `<div class="desc-section"><h3>核心思想</h3><p>维护一个大小为 M 的最小堆，遍历数据时保留当前最大的 M 个元素。</p></div><div class="desc-section"><h3>推导过程</h3><p>堆顶是当前 Top-M 里最小的一个。来了新元素，如果它比堆顶大，就把堆顶替换为新元素并调整堆；否则忽略。遍历一遍即可得到最大的 M 个。</p></div><div class="desc-section"><h3>适用场景</h3><p>海量数据中取前 M 个、实时排行榜、热点统计。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 直播礼物榜 Top 100。② 日志中找出现次数最多的 10 个 IP。</p></div>`,
            code: topMCode, defaultData: [12, 5, 9, 22, 3, 17, 8, 31, 14, 6, 19, 2, 25, 11], dataParser: NUM_DATA, run: topMRun
        }
    ];

    algos.forEach(a => AlgorithmLoader.register(a.id, a));
})(window);
