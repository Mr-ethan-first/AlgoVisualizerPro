/**
 * algs4 缺失算法补全 - 第一批
 * 涵盖：字符串排序(LSD/MSD/三路快排)、Boyer-Moore 子串匹配、
 *      最长重复子串 / 后缀数组、霍夫曼编码、
 *      图：连通分量 / 环检测 / 二分图 / 有向环 / DAG 最短路与最长路
 * 全部使用框架标准 Tracer（ArrayTracer / GraphTracer / Stack / Queue / Log），
 * 由默认状态构建器渲染，不改动任何既有动画/公共样式。
 */
(function () {
    'use strict';

    const STR_DATA = (s) => (s && s.length)
        ? s.split(',').map(x => x.trim()).filter(x => x.length)
        : null;
    const STR_DEFAULT = ['she', 'sells', 'seashells', 'by', 'the', 'sea', 'shore'];
    const asStrings = (data) => {
        let arr;
        if (Array.isArray(data) && data.length > 0) arr = data;
        else {
            const parsed = STR_DATA(data);
            arr = (parsed && parsed.length) ? parsed : STR_DEFAULT;
        }
        // 统一转换为字符串，兼容随机生成的数字数据（如 [12,34] -> ["12","34"]）
        return arr.map(x => (x == null ? '' : String(x))).filter(x => x.length > 0);
    };

    // ============================================================
    // 1. LSD 低位优先基数排序（字符串）
    // ============================================================
    const lsdCode = `function lsd(a) {
  const W = maxLen(a);
  for (let d = W - 1; d >= 0; d--) {
    const count = new Array(256 + 1).fill(0);
    for (const s of a) count[s.charCodeAt(d)]++;
    for (let r = 0; r < 256; r++)
      count[r + 1] += count[r];
    const aux = new Array(a.length);
    for (let i = 0; i < a.length; i++)
      aux[count[a[i].charCodeAt(d)]++] = a[i];
    for (let i = 0; i < a.length; i++) a[i] = aux[i];
  }
}`;
    function lsdRun(ctx, data) {
        const a = asStrings(data);
        const W = Math.max(...a.map(s => s.length));
        const codeAt = (s, d) => (s.length > d ? s.charCodeAt(d) : 0); // 越界位视为最小字符(码值0)
        const arr = a.slice();
        const at = ctx.add(new ArrayTracer('array', arr));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo(`LSD：固定宽度 W=${W}，从右到左共 ${W} 趟计数排序`);
        for (let d = W - 1; d >= 0; d--) {
            ctx.line(3);
            log.printInfo(`第 ${W - d} 趟：按第 ${d} 位字符稳定排序`);
            const count = new Array(257).fill(0);
            for (const s of arr) count[codeAt(s, d) + 1]++;
            for (let r = 0; r < 256; r++) count[r + 1] += count[r];
            const aux = new Array(arr.length);
            for (let i = 0; i < arr.length; i++) aux[count[codeAt(arr[i], d)]++] = arr[i];
            for (let i = 0; i < arr.length; i++) arr[i] = aux[i];
            ctx.line(10);
            at.setItems(arr);
            at.snapshot(`第 ${W - d} 趟后（按第 ${d} 位）`);
        }
        ctx.line(1);
        at.done('✓ LSD 排序完成');
    }

    // ============================================================
    // 2. MSD 高位优先基数排序（字符串，从左到右，遇整组相同提前终止）
    // ============================================================
    const msdCode = `function msd(a) {
  const W = maxLen(a);
  let sorted = false;
  for (let d = 0; d < W && !sorted; d++) {
    const count = new Array(256 + 1).fill(0);
    for (const s of a) count[s.charCodeAt(d)]++;
    for (let r = 0; r < 256; r++)
      count[r + 1] += count[r];
    const aux = new Array(a.length);
    for (let i = 0; i < a.length; i++)
      aux[count[a[i].charCodeAt(d)]++] = a[i];
    for (let i = 0; i < a.length; i++) a[i] = aux[i];
    sorted = isSorted(a);
  }
}`;
    function msdRun(ctx, data) {
        const a = asStrings(data);
        const W = Math.max(...a.map(s => s.length));
        const codeAt = (s, d) => (s.length > d ? s.charCodeAt(d) : 0);
        const arr = a.slice();
        const at = ctx.add(new ArrayTracer('array', arr));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo(`MSD：宽度 W=${W}，从左到右逐位排序，整组有序即停`);
        let sorted = false;
        for (let d = 0; d < W && !sorted; d++) {
            ctx.line(3);
            log.printInfo(`第 ${d + 1} 趟：按第 ${d} 位字符排序`);
            const count = new Array(257).fill(0);
            for (const s of arr) count[codeAt(s, d) + 1]++;
            for (let r = 0; r < 256; r++) count[r + 1] += count[r];
            const aux = new Array(arr.length);
            for (let i = 0; i < arr.length; i++) aux[count[codeAt(arr[i], d)]++] = arr[i];
            for (let i = 0; i < arr.length; i++) arr[i] = aux[i];
            ctx.line(9);
            at.setItems(arr);
            at.snapshot(`第 ${d + 1} 趟后（按第 ${d} 位）`);
            sorted = arr.every((s, i) => i === 0 || arr[i - 1] <= s);
        }
        ctx.line(1);
        at.done('✓ MSD 排序完成');
    }

    // ============================================================
    // 3. 三路字符串快速排序
    // ============================================================
    const q3Code = `function sort3way(a, lo, hi, d) {
  if (lo >= hi) return;
  let lt = lo, gt = hi;
  const v = a[lo].charCodeAt(d) || 0;
  let i = lo + 1;
  while (i <= gt) {
    const c = a[i].charCodeAt(d) || 0;
    if (c < v) swap(a, lt++, i++);
    else if (c > v) swap(a, i, gt--);
    else i++;
  }
  sort3way(a, lo, lt - 1, d);   // < 组
  sort3way(a, lt, gt, d + 1);   // == 组：深入下一位
  sort3way(a, gt + 1, hi, d);   // > 组
}
}`;
    function sort3(a, lo, hi, d, W, ctx, at, log) {
        if (lo >= hi || d >= W) return; // d>=W：所有串该位均已耗尽，已有序
        let lt = lo, gt = hi;
        const v = a[lo].charCodeAt(d) || 0;
        let i = lo + 1;
        while (i <= gt) {
            const c = a[i].charCodeAt(d) || 0;
            if (c < v) { const t = a[lt]; a[lt] = a[i]; a[i] = t; lt++; i++; }
            else if (c > v) { const t = a[i]; a[i] = a[gt]; a[gt] = t; gt--; }
            else { i++; }
        }
        at.setItems(a.slice());
        at.snapshot(`按第 ${d} 位三路划分（< [${lo},${lt - 1}]，== [${lt},${gt}]，> [${gt + 1},${hi}]）`);
        log.printInfo(`第 ${d} 位：基准='${a[lt] ? a[lt][d] || '' : ''}'，三路划分完成`);
        sort3(a, lo, lt - 1, d, W, ctx, at, log);     // < 组：同位置继续
        sort3(a, lt, gt, d + 1, W, ctx, at, log);     // == 组：深入下一位
        sort3(a, gt + 1, hi, d, W, ctx, at, log);     // > 组：同位置继续
    }
    function q3Run(ctx, data) {
        const a = asStrings(data);
        const W = Math.max(...a.map(s => s.length));
        const at = ctx.add(new ArrayTracer('array', a.slice()));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo('三路字符串快排：按当前字符三路划分，相等段深入下一位');
        sort3(a.slice(), 0, a.length - 1, 0, W, ctx, at, log);
        at.done('✓ 三路字符串快排完成');
    }

    // ============================================================
    // 4. Boyer-Moore 子串匹配（坏字符启发式，text + pattern 双数组）
    // ============================================================
    const bmCode = `function boyerMoore(text, pat) {
  const m = pat.length, n = text.length;
  const right = new Array(256).fill(-1);
  for (let j = 0; j < m; j++) right[pat.charCodeAt(j)] = j;
  let skip;
  for (let i = 0; i <= n - m; i += skip) {
    skip = 0;
    for (let j = m - 1; j >= 0; j--) {
      if (pat[j] !== text[i + j]) {
        skip = Math.max(1, j - right[text.charCodeAt(i + j)]);
        break;
      }
    }
    if (skip === 0) return i; // 匹配成功
  }
  return -1;
}`;
    function bmRun(ctx, data) {
        let text = 'ABAAABCDABC', pat = 'ABC';
        if (data && typeof data === 'string') {
            const parts = data.split('|');
            if (parts.length === 2) { text = parts[0]; pat = parts[1]; }
        }
        const tArr = ctx.add(new ArrayTracer('text', text.split('')));
        const pArr = ctx.add(new ArrayTracer('pattern', pat.split('')));
        const log = ctx.add(new LogTracer('log'));
        const m = pat.length, n = text.length;
        const right = new Array(256).fill(-1);
        for (let j = 0; j < m; j++) right[pat.charCodeAt(j)] = j;
        ctx.line(1);
        log.printInfo(`Boyer-Moore：模式 "${pat}" 在文本 "${text}" 中匹配`);
        let found = -1;
        let skip = 1;
        for (let i = 0; i <= n - m; i += skip) {
            let matched = true;
            for (let j = m - 1; j >= 0; j--) {
                tArr.setPointer(i + j, 't');
                pArr.setPointer(j, 'p');
                if (pat[j] !== text[i + j]) {
                    matched = false;
                    const bad = text.charCodeAt(i + j);
                    skip = Math.max(1, j - (right[bad] !== undefined ? right[bad] : -1));
                    log.printWarning(`失配：text[${i + j}]='${text[i + j]}' ≠ pat[${j}]='${pat[j]}'，右移 ${skip}`);
                    break;
                }
            }
            if (matched) { found = i; log.printSuccess(`匹配成功，起始下标 ${i}`); break; }
        }
        if (found >= 0) { tArr.highlight(Array.from({ length: m }, (_, k) => found + k), 'sorted', '匹配区间'); }
        else log.printError('未找到匹配');
        tArr.done(); pArr.done();
    }

    // ============================================================
    // 5. 最长重复子串（LRS，基于后缀排序 + 相邻 LCP）
    // ============================================================
    const lrsCode = `function lrs(s) {
  const suffixes = allSuffixes(s).sort();
  let best = '', bestLen = 0;
  for (let i = 1; i < suffixes.length; i++) {
    const lcp = commonPrefix(suffixes[i - 1], suffixes[i]);
    if (lcp > bestLen) { bestLen = lcp; best = suffixes[i].slice(0, lcp); }
  }
  return best;
}`;
    function lcp(a, b) { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; }
    function lrsRun(ctx, data) {
        const s = (data && typeof data === 'string' && data.length) ? data : 'aabaaaab';
        const suffixes = [];
        for (let i = 0; i < s.length; i++) suffixes.push({ str: s.slice(i), idx: i });
        const sufArr = ctx.add(new ArrayTracer('suffixes', suffixes.map(x => x.str)));
        const idxArr = ctx.add(new ArrayTracer('startIdx', suffixes.map(x => String(x.idx))));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo(`构造 ${s.length} 个后缀并按字典序排序`);
        suffixes.sort((a, b) => a.str < b.str ? -1 : a.str > b.str ? 1 : 0);
        sufArr.setItems(suffixes.map(x => x.str));
        idxArr.setItems(suffixes.map(x => String(x.idx)));
        sufArr.snapshot('后缀排序完成');
        let best = '', bestLen = 0, bestPair = [-1, -1];
        for (let i = 1; i < suffixes.length; i++) {
            const len = lcp(suffixes[i - 1].str, suffixes[i].str);
            log.printInfo(`比较相邻后缀 #${i - 1} 与 #${i}：公共前缀长 ${len}`);
            if (len > bestLen) { bestLen = len; best = suffixes[i].str.slice(0, len); bestPair = [i - 1, i]; }
        }
        sufArr.highlight([bestPair[0], bestPair[1]], 'sorted', `最长重复子串：'${best}'（长度 ${bestLen}）`);
        sufArr.done('✓ LRS 完成');
    }

    // ============================================================
    // 6. 后缀数组（Suffix Array）
    // ============================================================
    function suffixRun(ctx, data) {
        const s = (data && typeof data === 'string' && data.length) ? data : 'banana';
        const suffixes = [];
        for (let i = 0; i < s.length; i++) suffixes.push({ str: s.slice(i), idx: i });
        const sufArr = ctx.add(new ArrayTracer('suffixes', suffixes.map(x => x.str)));
        const idxArr = ctx.add(new ArrayTracer('rank(sa[i])', suffixes.map(x => String(x.idx))));
        const log = ctx.add(new LogTracer('log'));
        ctx.line && ctx.line(1);
        log.printInfo(`为 "${s}" 构造 ${s.length} 个后缀并排序，得到后缀数组 SA`);
        suffixes.sort((a, b) => a.str < b.str ? -1 : a.str > b.str ? 1 : 0);
        sufArr.setItems(suffixes.map(x => x.str));
        idxArr.setItems(suffixes.map(x => String(x.idx)));
        sufArr.snapshot('后缀数组（按字典序排列的后缀及其原起始下标）');
        sufArr.done('✓ 后缀数组完成');
    }

    // ============================================================
    // 7. 霍夫曼编码（频率表 → 最优前缀码）
    // ============================================================
    const huffCode = `function huffman(freq) {
  const pq = [...freq].map(f => ({ ch: f.ch, w: f.w, left: null, right: null }));
  while (pq.length > 1) {
    pq.sort((a, b) => a.w - b.w);
    const a = pq.shift(), b = pq.shift();
    pq.push({ ch: null, w: a.w + b.w, left: a, right: b });
  }
  const codes = {};
  assign(pq[0], '');
  return codes;
}`;
    function assign(node, prefix, codes) {
        if (!node) return;
        if (node.ch !== null && node.ch !== undefined) { codes[node.ch] = prefix; return; }
        assign(node.left, prefix + '0', codes);
        assign(node.right, prefix + '1', codes);
    }
    function huffRun(ctx, data) {
        const s = (data && typeof data === 'string' && data.length) ? data : 'abracadabra';
        const freq = {};
        for (const ch of s) freq[ch] = (freq[ch] || 0) + 1;
        const list = Object.keys(freq).map(ch => ({ ch, w: freq[ch] }));
        const fArr = ctx.add(new ArrayTracer('freq', list.map(x => `${x.ch}:${x.w}`)));
        const cArr = ctx.add(new ArrayTracer('code', list.map(() => '')));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo(`统计 "${s}" 中各字符频率`);
        let pq = list.map(f => ({ ch: f.ch, w: f.w, left: null, right: null }));
        while (pq.length > 1) {
            pq.sort((a, b) => a.w - b.w);
            const a = pq.shift(), b = pq.shift();
            log.printInfo(`合并权值 ${a.w} 与 ${b.w} → ${a.w + b.w}`);
            pq.push({ ch: null, w: a.w + b.w, left: a, right: b });
        }
        const codes = {};
        assign(pq[0], '', codes);
        list.forEach(x => cArr.items[list.indexOf(x)].value = codes[x.ch]);
        list.forEach((x, i) => { cArr.items[i].value = codes[x.ch]; });
        cArr.setItems(list.map(x => `${x.ch}→${codes[x.ch]}`));
        cArr.snapshot('为各字符分配霍夫曼前缀码');
        fArr.done(); cArr.done('✓ 霍夫曼编码完成');
    }

    // ============================================================
    // 8. 连通分量（CC）
    // ============================================================
    const ccSample = {
        vertices: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        edges: [
            { u: 0, v: 1 }, { u: 0, v: 2 }, { u: 1, v: 2 },
            { u: 3, v: 4 }, { u: 4, v: 5 },
            { u: 6, v: 7 }
        ]
    };
    const ccCode = `function cc(graph) {
  const id = new Array(V).fill(-1);
  let count = 0;
  for (let v = 0; v < V; v++) {
    if (id[v] === -1) {
      dfs(v, count);
      count++;
    }
  }
}
function dfs(v, cid) {
  id[v] = cid;
  for (const w of graph.adj(v))
    if (id[w] === -1) dfs(w, cid);
}`;
    function ccRun(ctx) {
        const vs = ccSample.vertices.map((v, i) => ({ label: v, state: 'default', tag: '' }));
        const es = ccSample.edges.map(e => ({ ...e, directed: false }));
        const g = ctx.add(new GraphTracer('graph', vs, es));
        const log = ctx.add(new LogTracer('log'));
        const adj = Array.from({ length: vs.length }, () => []);
        es.forEach(e => { adj[e.u].push(e.v); adj[e.v].push(e.u); });
        const id = new Array(vs.length).fill(-1);
        let count = 0;
        ctx.line(1);
        for (let v = 0; v < vs.length; v++) {
            if (id[v] === -1) {
                log.printInfo(`发现新连通分量 #${count}`);
                const stack = [v];
                id[v] = count;
                while (stack.length) {
                    const u = stack.pop();
                    g.visit(u);
                    g.vertices[u].tag = '#' + count;
                    g.highlight(u, 'current', `标记 ${vs[u].label} 属于分量 #${count}`);
                    for (const w of adj[u]) {
                        if (id[w] === -1) { id[w] = count; stack.push(w); }
                    }
                }
                count++;
            }
        }
        ctx.line(1);
        g.done(`✓ 共 ${count} 个连通分量`);
    }

    // ============================================================
    // 9. 无向图环检测（Cycle）
    // ============================================================
    const cycSample = {
        vertices: ['A', 'B', 'C', 'D', 'E'],
        edges: [
            { u: 0, v: 1 }, { u: 0, v: 2 }, { u: 1, v: 2 },
            { u: 3, v: 4 }
        ]
    };
    const cycCode = `function hasCycle(graph) {
  const visited = new Set();
  for (let v = 0; v < V; v++)
    if (!visited.has(v) && dfs(v, -1)) return true;
  return false;
}
function dfs(v, parent) {
  visited.add(v);
  for (const w of graph.adj(v))
    if (!visited.has(w)) { if (dfs(w, v)) return true; }
    else if (w !== parent) return true;
  return false;
}`;
    function cycRun(ctx) {
        const vs = cycSample.vertices.map((v, i) => ({ label: v, state: 'default' }));
        const es = cycSample.edges.map(e => ({ ...e, directed: false }));
        const g = ctx.add(new GraphTracer('graph', vs, es));
        const log = ctx.add(new LogTracer('log'));
        const adj = Array.from({ length: vs.length }, () => []);
        es.forEach(e => { adj[e.u].push(e.v); adj[e.v].push(e.u); });
        const visited = new Set();
        let hasCycle = false;
        ctx.line(1);
        function dfs(v, parent) {
            visited.add(v); g.visit(v);
            for (const w of adj[v]) {
                if (!visited.has(w)) {
                    g.highlightEdge(v, w, '#3fb950');
                    if (dfs(w, v)) return true;
                } else if (w !== parent) {
                    g.highlightEdge(v, w, '#f85149', '回边 → 存在环');
                    log.printWarning(`边 ${vs[v].label}-${vs[w].label} 指向已访问非父节点，存在环`);
                    hasCycle = true; return true;
                }
            }
            return false;
        }
        for (let v = 0; v < vs.length && !hasCycle; v++)
            if (!visited.has(v)) dfs(v, -1);
        ctx.line(1);
        g.done(hasCycle ? '✓ 检测到环' : '✓ 无环（森林）');
    }

    // ============================================================
    // 10. 二分图判定（Bipartite，双色着色）
    // ============================================================
    const bipSample = {
        vertices: ['A', 'B', 'C', 'D', 'E', 'F'],
        edges: [
            { u: 0, v: 1 }, { u: 0, v: 3 }, { u: 1, v: 2 },
            { u: 1, v: 4 }, { u: 2, v: 5 }, { u: 3, v: 4 }
        ]
    };
    const bipCode = `function isBipartite(graph) {
  const color = new Array(V).fill(-1);
  for (let s = 0; s < V; s++) {
    if (color[s] === -1) {
      color[s] = 0;
      const q = [s];
      while (q.length) {
        const v = q.shift();
        for (const w of graph.adj(v)) {
          if (color[w] === -1) { color[w] = 1 - color[v]; q.push(w); }
          else if (color[w] === color[v]) return false;
        }
      }
    }
  }
  return true;
}`;
    function bipRun(ctx) {
        const vs = bipSample.vertices.map((v, i) => ({ label: v, state: 'default', tag: '' }));
        const es = bipSample.edges.map(e => ({ ...e, directed: false }));
        const g = ctx.add(new GraphTracer('graph', vs, es));
        const log = ctx.add(new LogTracer('log'));
        const adj = Array.from({ length: vs.length }, () => []);
        es.forEach(e => { adj[e.u].push(e.v); adj[e.v].push(e.u); });
        const color = new Array(vs.length).fill(-1);
        let bipartite = true;
        ctx.line(1);
        for (let s = 0; s < vs.length && bipartite; s++) {
            if (color[s] === -1) {
                color[s] = 0; vs[s].tag = '0';
                const q = [s];
                while (q.length) {
                    const v = q.shift(); g.visit(v);
                    for (const w of adj[v]) {
                        if (color[w] === -1) {
                            color[w] = 1 - color[v]; vs[w].tag = String(color[w]);
                            g.highlight(w, color[w] === 0 ? 'current' : 'visited', `着 ${color[w]} 色`);
                            q.push(w);
                        } else if (color[w] === color[v]) {
                            log.printError(`顶点 ${vs[v].label} 与 ${vs[w].label} 同色且相邻 → 非二分图`);
                            bipartite = false;
                        }
                    }
                }
            }
        }
        ctx.line(1);
        g.done(bipartite ? '✓ 是二分图（可 2-着色）' : '✗ 非二分图');
    }

    // ============================================================
    // 11. 有向图环检测（DirectedCycle）
    // ============================================================
    const dcycSample = {
        vertices: ['A', 'B', 'C', 'D'],
        edges: [
            { u: 0, v: 1 }, { u: 1, v: 2 }, { u: 2, v: 0 }, { u: 2, v: 3 }
        ]
    };
    const dcycCode = `function findCycle(graph) {
  const onStack = new Array(V).fill(false);
  const marked = new Array(V).fill(false);
  for (let v = 0; v < V; v++)
    if (!marked[v] && dfs(v)) return cycle;
  return null;
}
function dfs(v) {
  onStack[v] = marked[v] = true;
  for (const w of graph.adj(v))
    if (!marked[w]) { if (dfs(w)) return true; }
    else if (onStack[w]) return true;
  onStack[v] = false;
  return false;
}`;
    function dcycRun(ctx) {
        const vs = dcycSample.vertices.map((v, i) => ({ label: v, state: 'default' }));
        const es = dcycSample.edges.map(e => ({ ...e, directed: true }));
        const g = ctx.add(new GraphTracer('graph', vs, es));
        const log = ctx.add(new LogTracer('log'));
        const adj = Array.from({ length: vs.length }, () => []);
        es.forEach(e => adj[e.u].push(e.v));
        const onStack = new Array(vs.length).fill(false);
        const marked = new Array(vs.length).fill(false);
        let cyclic = false;
        ctx.line(1);
        function dfs(v) {
            onStack[v] = marked[v] = true; g.visit(v);
            for (const w of adj[v]) {
                if (!marked[w]) { g.highlightEdge(v, w, '#3fb950'); if (dfs(w)) return true; }
                else if (onStack[w]) {
                    g.highlightEdge(v, w, '#f85149', '回边 → 有向环');
                    log.printWarning(`有向边 ${vs[v].label}→${vs[w].label} 指向栈中节点，存在环`);
                    cyclic = true; return true;
                }
            }
            onStack[v] = false; return false;
        }
        for (let v = 0; v < vs.length && !cyclic; v++) if (!marked[v]) dfs(v);
        ctx.line(1);
        g.done(cyclic ? '✓ 检测到有向环' : '✓ 无有向环（DAG）');
    }

    // ============================================================
    // 12. DAG 最短 / 最长路径（AcyclicSP / AcyclicLP）
    // ============================================================
    const dagSample = {
        vertices: ['A', 'B', 'C', 'D', 'E', 'F'],
        edges: [
            { u: 0, v: 1, weight: 5 }, { u: 0, v: 2, weight: 3 },
            { u: 1, v: 3, weight: 6 }, { u: 2, v: 3, weight: 2 },
            { u: 2, v: 4, weight: 4 }, { u: 3, v: 5, weight: 2 },
            { u: 4, v: 5, weight: 1 }
        ]
    };
    const spCode = `function acyclicSP(graph, s) {
  const dist = new Array(V).fill(Infinity);
  dist[s] = 0;
  for (const v of topoOrder(graph))      // 按拓扑序
    for (const e of graph.adj(v))        // 松弛边 v->w
      if (dist[e.w] > dist[v] + e.weight)
        dist[e.w] = dist[v] + e.weight;
  return dist;
}`;
    const lpCode = `function acyclicLP(graph, s) {
  const dist = new Array(V).fill(-Infinity);
  dist[s] = 0;
  for (const v of topoOrder(graph))
    for (const e of graph.adj(v))
      if (dist[e.w] < dist[v] + e.weight)  // 取最大 → 最长路
        dist[e.w] = dist[v] + e.weight;
  return dist;
}`;
    function buildDag() {
        const vs = dagSample.vertices.map((v, i) => ({ label: v, state: 'default', tag: '∞', dist: Infinity }));
        const es = dagSample.edges.map(e => ({ ...e, directed: true }));
        const adj = Array.from({ length: vs.length }, () => []);
        es.forEach(e => adj[e.u].push(e));
        // Kahn 拓扑序
        const indeg = new Array(vs.length).fill(0);
        es.forEach(e => indeg[e.v]++);
        const q = []; for (let i = 0; i < vs.length; i++) if (indeg[i] === 0) q.push(i);
        const order = [];
        while (q.length) { const u = q.shift(); order.push(u); for (const e of adj[u]) if (--indeg[e.v] === 0) q.push(e.v); }
        return { vs, es, adj, order };
    }
    function dagRun(ctx, mode) {
        const { vs, es, adj, order } = buildDag();
        const g = ctx.add(new GraphTracer('graph', vs, es));
        const log = ctx.add(new LogTracer('log'));
        const s = 0;
        const dist = new Array(vs.length).fill(mode === 'lp' ? -Infinity : Infinity);
        dist[s] = 0; vs[s].tag = '0'; vs[s].dist = 0;
        ctx.line(1);
        log.printInfo(`${mode === 'lp' ? 'DAG 最长路径' : 'DAG 最短路径'}：源点 ${vs[s].label}`);
        for (const v of order) {
            g.highlight(v, 'current', `松弛顶点 ${vs[v].label}（dist=${dist[v] === Infinity ? '∞' : dist[v]}）`);
            for (const e of adj[v]) {
                const better = mode === 'lp' ? dist[e.v] < dist[v] + e.weight : dist[e.v] > dist[v] + e.weight;
                if (better) {
                    dist[e.v] = dist[v] + e.weight;
                    vs[e.v].tag = String(dist[e.v]); vs[e.v].dist = dist[e.v];
                    g.setDist(e.v, dist[e.v]);
                    g.highlightEdge(v, e.v, '#3fb950', `${vs[v].label}→${vs[e.v].label} 松弛为 ${dist[e.v]}`);
                }
            }
        }
        ctx.line(1);
        g.done(`✓ ${mode === 'lp' ? '最长' : '最短'}路径完成`);
    }

    // ============================================================
    // 注册
    // ============================================================
    const algos = [
        {
            id: 'string.lsd', name: 'LSD 低位优先基数排序', category: 'string', level: 'P1',
            complexity: { time: 'O(W·N)', space: 'O(N)' }, keywords: ['radix', 'lsd', 'string sort'],
            mnemonic: '从右到左逐位排，计数稳定不串台',
            description: `<div class="desc-section"><h3>核心思想</h3><p>按字符进行多轮稳定排序，实现字符串字典序排序。</p></div><div class="desc-section"><h3>推导过程</h3><p>LSD 从最低位字符向最高位逐轮计数排序；MSD 从最高位开始递归分组。因为每轮稳定，前一轮的顺序会被保留。</p></div><div class="desc-section"><h3>适用场景</h3><p>大量等长或变长字符串排序、数据库索引、字典生成。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 电话号码字典序排序。② 单词列表排序。③ 车牌号排序。</p></div>`,
            code: lsdCode, defaultData: STR_DEFAULT, dataParser: STR_DATA, run: lsdRun
        },
        {
            id: 'string.msd', name: 'MSD 高位优先基数排序', category: 'string', level: 'P1',
            complexity: { time: 'O(W·N)', space: 'O(W+N)' }, keywords: ['radix', 'msd', 'string sort'],
            mnemonic: '从左到右逐位分，整组有序即收兵',
            description: `<div class="desc-section"><h3>核心思想</h3><p>按字符进行多轮稳定排序，实现字符串字典序排序。</p></div><div class="desc-section"><h3>推导过程</h3><p>LSD 从最低位字符向最高位逐轮计数排序；MSD 从最高位开始递归分组。因为每轮稳定，前一轮的顺序会被保留。</p></div><div class="desc-section"><h3>适用场景</h3><p>大量等长或变长字符串排序、数据库索引、字典生成。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 电话号码字典序排序。② 单词列表排序。③ 车牌号排序。</p></div>`,
            code: msdCode, defaultData: STR_DEFAULT, dataParser: STR_DATA, run: msdRun
        },
        {
            id: 'string.quick3string', name: '三路字符串快速排序', category: 'string', level: 'P1',
            complexity: { time: 'O(N·log N)', space: 'O(log N)' }, keywords: ['3-way', 'string quicksort'],
            mnemonic: '当前字符三路划，相等再往深里查',
            description: `<div class="desc-section"><h3>核心思想</h3><p>按字符进行多轮稳定排序，实现字符串字典序排序。</p></div><div class="desc-section"><h3>推导过程</h3><p>LSD 从最低位字符向最高位逐轮计数排序；MSD 从最高位开始递归分组。因为每轮稳定，前一轮的顺序会被保留。</p></div><div class="desc-section"><h3>适用场景</h3><p>大量等长或变长字符串排序、数据库索引、字典生成。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 电话号码字典序排序。② 单词列表排序。③ 车牌号排序。</p></div>`,
            code: q3Code, defaultData: STR_DEFAULT, dataParser: STR_DATA, run: q3Run
        },
        {
            id: 'string.boyerMoore', name: 'Boyer-Moore 子串匹配', category: 'string', level: 'P1',
            complexity: { time: 'O(N/M)', space: 'O(M)' }, keywords: ['boyer-moore', 'substring', 'pattern'],
            mnemonic: '坏字符表记右移，跳跃匹配省力气',
            description: `<div class="desc-section"><h3>核心思想</h3><p>从右向左比较模式串，利用坏字符和好后缀规则大步跳过不可能位置。</p></div><div class="desc-section"><h3>推导过程</h3><p>先根据模式串预处理每个字符最右出现位置。匹配时从模式串尾部开始，若遇到不匹配的字符，按规则计算最大安全滑动距离。Sunday 还看主串中模式串右侧第一个字符。</p></div><div class="desc-section"><h3>适用场景</h3><p>文本搜索、关键词过滤、日志匹配、大文本编辑器。</p></div><div class="desc-section"><h3>典型案例</h3><p>① grep 文本搜索。② 敏感词过滤。③ 日志中定位错误关键字。</p></div>`,
            code: bmCode, defaultData: 'ABAAABCDABC|ABC', dataParser: (s) => s, run: bmRun
        },
        {
            id: 'string.lrs', name: '最长重复子串 (LRS)', category: 'string', level: 'P1',
            complexity: { time: 'O(N·log N)', space: 'O(N)' }, keywords: ['lrs', 'suffix', 'lcp'],
            mnemonic: '后缀排序邻相比，最长公共即答案',
            description: `<div class="desc-section"><h3>核心思想</h3><p>最长重复子串找字符串中出现至少两次的最长子串。</p></div><div class="desc-section"><h3>推导过程</h3><p>常用后缀数组或后缀自动机：把所有后缀排序后，相邻后缀的最长公共前缀就是候选重复子串，取最大值。</p></div><div class="desc-section"><h3>适用场景</h3><p>DNA 重复片段、文本压缩、抄袭检测、音乐旋律重复。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 基因组重复序列分析。② 音乐指纹去重。③ 日志模式挖掘。</p></div>`,
            code: lrsCode, defaultData: 'aabaaaab', dataParser: (s) => s, run: lrsRun
        },
        {
            id: 'string.suffixArray', name: '后缀数组 (Suffix Array)', category: 'string', level: 'P1',
            complexity: { time: 'O(N·log N)', space: 'O(N)' }, keywords: ['suffix array', 'suffix'],
            mnemonic: '所有后缀排个序，原下标记成行',
            description: `<div class="desc-section"><h3>核心思想</h3><p>后缀数组存储字符串所有后缀按字典序排序后的起始下标，可高效解决大量字符串问题。</p></div><div class="desc-section"><h3>推导过程</h3><p>把所有后缀排序。任意两个后缀的最长公共前缀等于它们在排序后相邻位置的 LCP 的最小值。配合 LCP 数组可做最长重复子串、不同子串计数等。</p></div><div class="desc-section"><h3>适用场景</h3><p>字符串模式挖掘、DNA 分析、文本压缩、拼写检查。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 最长重复子串。② 不同子串数量。③ 字符串相似度。</p></div>`,
            code: lrsCode, defaultData: 'banana', dataParser: (s) => s, run: suffixRun
        },
        {
            id: 'string.huffman', name: '霍夫曼编码 (Huffman)', category: 'string', level: 'P1',
            complexity: { time: 'O(N·log N)', space: 'O(N)' }, keywords: ['huffman', 'compression', 'prefix code'],
            mnemonic: '频率最小俩合并，自底向上前缀码',
            description: `<div class="desc-section"><h3>核心思想</h3><p>霍夫曼编码按字符出现频率构建最优前缀树，高频字符短编码、低频字符长编码。</p></div><div class="desc-section"><h3>推导过程</h3><p>每次选频率最小的两个节点合并成新节点，新节点频率为二者之和。重复直到只剩一棵树。从根到叶子的路径就是该字符的编码，左 0 右 1。</p></div><div class="desc-section"><h3>适用场景</h3><p>无损数据压缩、文件压缩、通信编码。</p></div><div class="desc-section"><h3>典型案例</h3><p>① ZIP 压缩。② JPEG 图像熵编码。③ 摩斯码变长编码思想。</p></div>`,
            code: huffCode, defaultData: 'abracadabra', dataParser: (s) => s, run: huffRun
        },
        {
            id: 'graph.cc', name: '连通分量 (Connected Components)', category: 'graph', level: 'P1',
            complexity: { time: 'O(V+E)', space: 'O(V)' }, keywords: ['cc', 'connected components', 'dfs'],
            mnemonic: '未标号便新块，DFS 染同色',
            description: `<div class="desc-section"><h3>核心思想</h3><p>找出图中互相连通的最大子集。</p></div><div class="desc-section"><h3>推导过程</h3><p>对每个未访问节点做 DFS/BFS，所有访问到的节点属于同一个连通分量。有向图需分强连通分量和弱连通分量。</p></div><div class="desc-section"><h3>适用场景</h3><p>社交网络社群、网络连通性、聚类分析。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 社交圈发现。② 网络故障隔离。③ 图像区域分割。</p></div>`,
            code: ccCode, defaultData: [], dataParser: (s) => s, run: ccRun
        },
        {
            id: 'graph.cycle', name: '无向图环检测', category: 'graph', level: 'P1',
            complexity: { time: 'O(V+E)', space: 'O(V)' }, keywords: ['cycle', 'undirected', 'dfs'],
            mnemonic: '遇已访非父边，环现无疑问',
            description: `<div class="desc-section"><h3>核心思想</h3><p>检测图中是否存在环，以及找出环上的节点。</p></div><div class="desc-section"><h3>推导过程</h3><p>DFS 时记录递归栈，若遇到已在栈中的邻居，说明有环。并查集也可以：若一条边的两个端点已在同一集合，则形成环。</p></div><div class="desc-section"><h3>适用场景</h3><p>死锁检测、依赖冲突、电路网络、编译循环依赖。</p></div><div class="desc-section"><h3>典型案例</h3><p>① npm 循环依赖检测。② 数据库死锁检测。③ 判断课程先修是否有矛盾。</p></div>`,
            code: cycCode, defaultData: [], dataParser: (s) => s, run: cycRun
        },
        {
            id: 'graph.bipartite', name: '二分图判定', category: 'graph', level: 'P1',
            complexity: { time: 'O(V+E)', space: 'O(V)' }, keywords: ['bipartite', '2-coloring', 'bfs'],
            mnemonic: '邻点必异色，同色即失败',
            description: `<div class="desc-section"><h3>核心思想</h3><p>二分图能把顶点分成两组，使所有边都跨在两组之间。</p></div><div class="desc-section"><h3>推导过程</h3><p>用 BFS/DFS 给节点染色，相邻节点颜色必须不同。若发现相邻节点同色，则不是二分图。等价于图中没有奇数长度的环。</p></div><div class="desc-section"><h3>适用场景</h3><p>冲突检测、资源分配、推荐系统、染色问题。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 任务与机器分配冲突检查。② 电影与用户二分推荐。③ 棋盘染色问题。</p></div>`,
            code: bipCode, defaultData: [], dataParser: (s) => s, run: bipRun
        },
        {
            id: 'graph.directedCycle', name: '有向图环检测', category: 'graph', level: 'P1',
            complexity: { time: 'O(V+E)', space: 'O(V)' }, keywords: ['directed cycle', 'dfs', 'recursion stack'],
            mnemonic: '栈中遇回边，有向环显现',
            description: `<div class="desc-section"><h3>核心思想</h3><p>检测图中是否存在环，以及找出环上的节点。</p></div><div class="desc-section"><h3>推导过程</h3><p>DFS 时记录递归栈，若遇到已在栈中的邻居，说明有环。并查集也可以：若一条边的两个端点已在同一集合，则形成环。</p></div><div class="desc-section"><h3>适用场景</h3><p>死锁检测、依赖冲突、电路网络、编译循环依赖。</p></div><div class="desc-section"><h3>典型案例</h3><p>① npm 循环依赖检测。② 数据库死锁检测。③ 判断课程先修是否有矛盾。</p></div>`,
            code: dcycCode, defaultData: [], dataParser: (s) => s, run: dcycRun
        },
        {
            id: 'graph.acyclicSP', name: 'DAG 最短路径 (AcyclicSP)', category: 'graph', level: 'P1',
            complexity: { time: 'O(V+E)', space: 'O(V)' }, keywords: ['dag', 'shortest path', 'topological'],
            mnemonic: '拓扑序中松弛边，最短距离自然现',
            description: `<div class="desc-section"><h3>核心思想</h3><p>把问题建模成图，通过遍历、松弛或匹配等操作得到所需结果。</p></div><div class="desc-section"><h3>推导过程</h3><p>图的核心是顶点和边。根据问题选择 BFS/DFS、最短路径、最小生成树或网络流等算法，把实际问题转化为图上的计算。</p></div><div class="desc-section"><h3>适用场景</h3><p>关系网络、路径规划、依赖分析、资源分配。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 地图导航。② 社交网络分析。③ 软件依赖管理。</p></div>`,
            code: spCode, defaultData: [], dataParser: (s) => s, run: (ctx) => dagRun(ctx, 'sp')
        },
        {
            id: 'graph.acyclicLP', name: 'DAG 最长路径 (AcyclicLP/CPM)', category: 'graph', level: 'P1',
            complexity: { time: 'O(V+E)', space: 'O(V)' }, keywords: ['dag', 'longest path', 'cpm'],
            mnemonic: '拓扑序取最大，关键路径靠它',
            description: `<div class="desc-section"><h3>核心思想</h3><p>把问题建模成图，通过遍历、松弛或匹配等操作得到所需结果。</p></div><div class="desc-section"><h3>推导过程</h3><p>图的核心是顶点和边。根据问题选择 BFS/DFS、最短路径、最小生成树或网络流等算法，把实际问题转化为图上的计算。</p></div><div class="desc-section"><h3>适用场景</h3><p>关系网络、路径规划、依赖分析、资源分配。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 地图导航。② 社交网络分析。③ 软件依赖管理。</p></div>`,
            code: lpCode, defaultData: [], dataParser: (s) => s, run: (ctx) => dagRun(ctx, 'lp')
        }
    ];

    algos.forEach(a => AlgorithmLoader.register(a.id, a));
})();
