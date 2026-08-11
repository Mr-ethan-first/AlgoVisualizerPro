/**
 * algs4 缺失算法补全 - 第四批（数学 / 计算几何）
 *
 * 覆盖：3-Sum（暴力 / 排序+二分）、最近点对、最远点对（凸包直径）、
 *       Graham 扫描凸包、快速傅里叶变换、高斯消元、高斯-约当消元、
 *       单纯形法线性规划、最小二乘线性回归。
 *
 * 几何类算法通过给 GraphTracer 顶点附加归一化坐标 nx/ny（0..1）启用坐标布局，
 * 其余算法沿用框架标准 Tracer，由默认状态构建器渲染，不改动任何既有动画与公共样式。
 */
(function () {
    'use strict';

    const GREEN = '#3fb950';
    const RED = '#f85149';
    const BLUE = '#58a6ff';
    const ORANGE = '#d29922';
    const GRAY = '#8b949e';

    // ============================================================
    // 工具
    // ============================================================

    const NUM_DATA = (s) => typeof s === 'string'
        ? s.split(',').map(x => Number(x.trim())).filter(n => !isNaN(n))
        : null;
    const asNumbers = (data, fallback) => {
        if (Array.isArray(data) && data.length > 0) return data.map(Number);
        const parsed = NUM_DATA(data);
        return (parsed && parsed.length) ? parsed : fallback.slice();
    };

    /** 把二维点数组变成 GraphTracer 顶点（附归一化坐标，启用坐标布局） */
    function mkPts(pts, labels) {
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const sx = maxX - minX || 1, sy = maxY - minY || 1;
        return pts.map((p, i) => ({
            label: labels ? labels[i] : 'P' + i,
            // 留出 6% 边距，避免点贴到画布边缘
            nx: 0.06 + 0.88 * (p[0] - minX) / sx,
            ny: 0.06 + 0.88 * (p[1] - minY) / sy
        }));
    }
    /** 整体替换图的边集合（几何算法需要动态增删边） */
    function setEdges(g, list) {
        g.edges = list.map(e => ({
            u: e[0], v: e[1],
            weight: e[2] !== undefined ? e[2] : 1,
            color: e[3] || null,
            state: 'default',
            directed: false
        }));
    }
    /** 直接提交一帧（用于批量修改顶点/边后统一出帧） */
    function snap(tracer, description) {
        tracer._commit({ type: 'snapshot', payload: {}, description });
    }
    /** 清除所有顶点的某个状态 */
    function clearState(g, state) {
        g.vertices.forEach(v => { if (v.state === state) v.state = 'default'; });
    }

    // 共享点集（10 个点，凸包为 6 边形，最近点对为 P3–P4）
    const PTS = [
        [8, 72], [18, 30], [30, 86], [36, 52], [40, 55],
        [58, 20], [66, 78], [78, 40], [86, 88], [92, 16]
    ];

    // ============================================================
    // 1. 3-Sum（暴力 O(N³)）
    // ============================================================
    const THREE_SUM_DATA = [30, -40, -20, -10, 40, 0, 10, 5];

    const threeSumCode = `function count(a) {
  const n = a.length;
  let cnt = 0;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++)
        if (a[i] + a[j] + a[k] === 0) cnt++;
  return cnt;              // 三重循环 → O(N³)
}`;
    function threeSumRun(ctx, data) {
        const a = asNumbers(data, THREE_SUM_DATA);
        const arr = ctx.add(new ArrayTracer('数组', a));
        const res = ctx.add(new ArrayTracer('零和三元组', []));
        const log = ctx.add(new LogTracer('log'));
        const n = a.length;
        const total = n * (n - 1) * (n - 2) / 6;

        ctx.line(3);
        log.printInfo(`暴力枚举全部 C(${n},3) = ${total} 个三元组`);
        let cnt = 0;
        const found = [];
        for (let i = 0; i < n; i++) {
            ctx.line(4);
            for (let j = i + 1; j < n; j++) {
                ctx.line(5);
                for (let k = j + 1; k < n; k++) {
                    ctx.line(7);
                    const s = a[i] + a[j] + a[k];
                    arr.setPointers([
                        { index: i, label: 'i', color: BLUE },
                        { index: j, label: 'j', color: ORANGE },
                        { index: k, label: 'k', color: GRAY }
                    ]);
                    if (s === 0) {
                        cnt++;
                        found.push(`${a[i]}+${a[j]}+${a[k]}`);
                        arr.highlightRange(i, k, GREEN, `✓ ${a[i]} + ${a[j]} + ${a[k]} = 0`);
                        res.setItems(found.slice());
                        log.printSuccess(`第 ${cnt} 组：${a[i]} + ${a[j]} + ${a[k]} = 0`);
                    }
                }
            }
        }
        ctx.line(8);
        log.printInfo(`共检查 ${total} 个三元组，命中 ${cnt} 组`);
        arr.done(`✓ 和为 0 的三元组共 ${cnt} 组`);
    }

    // ============================================================
    // 2. 3-Sum Fast（排序 + 二分 O(N² log N)）
    // ============================================================
    const threeSumFastCode = `function count(a) {
  a.sort((x, y) => x - y);            // 先排序
  const n = a.length;
  let cnt = 0;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const k = binarySearch(a, -(a[i] + a[j]));
      if (k > j) cnt++;               // k > j 保证 i<j<k 不重复
    }
  return cnt;              // O(N² log N)
}`;
    function threeSumFastRun(ctx, data) {
        const raw = asNumbers(data, THREE_SUM_DATA);
        const a = raw.slice().sort((x, y) => x - y);
        const arr = ctx.add(new ArrayTracer('已排序数组', a));
        const res = ctx.add(new ArrayTracer('零和三元组', []));
        const log = ctx.add(new LogTracer('log'));
        const n = a.length;

        ctx.line(2);
        log.printInfo(`排序后：[${a.join(', ')}]，随后对每一对 (i, j) 二分查找 -(a[i]+a[j])`);
        let cnt = 0;
        const found = [];
        for (let i = 0; i < n; i++) {
            ctx.line(5);
            for (let j = i + 1; j < n; j++) {
                ctx.line(6);
                const target = -(a[i] + a[j]);
                arr.setPointers([
                    { index: i, label: 'i', color: BLUE },
                    { index: j, label: 'j', color: ORANGE }
                ]);
                // 二分查找 target
                ctx.line(7);
                let lo = 0, hi = n - 1, k = -1;
                while (lo <= hi) {
                    const mid = (lo + hi) >> 1;
                    arr.highlightRange(lo, hi, GRAY, `二分查找 ${target}：区间 [${lo}, ${hi}]，mid=${mid} → ${a[mid]}`);
                    if (a[mid] === target) { k = mid; break; }
                    if (a[mid] < target) lo = mid + 1; else hi = mid - 1;
                }
                ctx.line(8);
                if (k > j) {
                    cnt++;
                    found.push(`${a[i]}+${a[j]}+${a[k]}`);
                    arr.highlightRange(i, k, GREEN, `✓ ${a[i]} + ${a[j]} + ${a[k]} = 0（k=${k} > j=${j}）`);
                    res.setItems(found.slice());
                    log.printSuccess(`第 ${cnt} 组：${a[i]} + ${a[j]} + ${a[k]} = 0`);
                } else if (k >= 0) {
                    arr.highlight(k, 'compare', `找到 ${target} 于下标 ${k}，但 k ≤ j，跳过（避免重复计数）`);
                }
            }
        }
        ctx.line(9);
        arr.done(`✓ 和为 0 的三元组共 ${cnt} 组（与暴力法结果一致）`);
    }

    // ============================================================
    // 3. 最近点对（分治）
    // ============================================================
    const closestPairCode = `function closest(points) {
  points.sort(byX);
  return rec(0, n - 1);

  function rec(lo, hi) {
    if (hi - lo <= 2) return brute(lo, hi);   // 基例
    const mid = (lo + hi) >> 1, midX = points[mid].x;
    rec(lo, mid); rec(mid + 1, hi);           // 分治两半
    const strip = pointsWithin(midX, best);   // 中线带状区
    strip.sort(byY);
    for (let i = 0; i < strip.length; i++)    // 每点最多比较 7 个
      for (let j = i + 1; strip[j].y - strip[i].y < best; j++)
        best = min(best, dist(strip[i], strip[j]));
  }
}`;
    function closestPairRun(ctx) {
        const P = PTS;
        const n = P.length;
        const g = ctx.add(new GraphTracer('点集', mkPts(P), []));
        const log = ctx.add(new LogTracer('log'));

        const idx = P.map((_, i) => i).sort((x, y) => P[x][0] - P[y][0]);
        const dist = (i, j) => Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]);
        const fmt = d => d.toFixed(2);

        let best = Infinity, bp = null;
        const draw = (cand, desc) => {
            const list = [];
            if (bp) list.push([bp[0], bp[1], 1, GREEN]);
            if (cand) list.push([cand[0], cand[1], 1, ORANGE]);
            setEdges(g, list);
            snap(g, desc);
        };
        const tryPair = (i, j, tag) => {
            const d = dist(i, j);
            draw([i, j], `${tag}：比较 P${i}–P${j}，距离 ${fmt(d)}${d < best ? '（更近！）' : `（不优于 ${fmt(best)}）`}`);
            if (d < best) {
                best = d; bp = [i, j];
                clearState(g, 'path');
                g.vertices[i].state = 'path';
                g.vertices[j].state = 'path';
                draw(null, `✓ 当前最近点对更新为 P${i}–P${j} = ${fmt(d)}`);
                log.printSuccess(`最近距离更新为 ${fmt(d)}（P${i}, P${j}）`);
            }
        };

        ctx.line(2);
        log.printInfo(`按 x 坐标排序：${idx.map(i => 'P' + i).join(' → ')}`);
        idx.forEach((v, i) => { g.vertices[v].tag = `#${i + 1}`; });
        snap(g, `按 x 排序后的下标顺序：${idx.map(i => 'P' + i).join(' → ')}`);

        function rec(lo, hi, depth) {
            const pad = '· '.repeat(depth);
            if (hi - lo <= 2) {
                ctx.line(6);
                log.printInfo(`${pad}基例 [${lo}..${hi}]：暴力比较 ${(hi - lo + 1)} 个点`);
                for (let x = lo; x <= hi; x++) {
                    for (let y = x + 1; y <= hi; y++) tryPair(idx[x], idx[y], '基例');
                }
                return;
            }
            ctx.line(7);
            const mid = (lo + hi) >> 1;
            const midX = P[idx[mid]][0];
            log.printInfo(`${pad}划分 [${lo}..${hi}]，中线 x = ${midX}`);
            ctx.line(8);
            rec(lo, mid, depth + 1);
            rec(mid + 1, hi, depth + 1);

            ctx.line(9);
            const strip = [];
            for (let x = lo; x <= hi; x++) if (Math.abs(P[idx[x]][0] - midX) < best) strip.push(idx[x]);
            strip.sort((x, y) => P[x][1] - P[y][1]);
            log.printInfo(`${pad}中线带状区（|x − ${midX}| < ${fmt(best)}）含 ${strip.length} 个点`);
            ctx.line(12);
            for (let x = 0; x < strip.length; x++) {
                for (let y = x + 1; y < strip.length && P[strip[y]][1] - P[strip[x]][1] < best; y++) {
                    tryPair(strip[x], strip[y], '带状区');
                }
            }
        }
        rec(0, n - 1, 0);

        setEdges(g, bp ? [[bp[0], bp[1], 1, GREEN]] : []);
        log.printSuccess(`最近点对：P${bp[0]}(${P[bp[0]].join(',')}) 与 P${bp[1]}(${P[bp[1]].join(',')})，距离 ${fmt(best)}`);
        g.done(`✓ 最近点对 P${bp[0]}–P${bp[1]}，距离 ${fmt(best)}`);
    }

    // ============================================================
    // 4. Graham 扫描求凸包
    // ============================================================
    const grahamCode = `function grahamScan(points) {
  points.sort(byYThenX);                 // 最低点排首位
  points[1..].sortByPolarAngle(points[0]);
  const hull = [points[0], points[1]];
  for (let i = 2; i < n; i++) {
    let top = hull.pop();
    while (ccw(hull.top(), top, points[i]) <= 0)
      top = hull.pop();                  // 非左转 → 弹出
    hull.push(top);
    hull.push(points[i]);
  }
  return hull;                           // O(N log N)
}`;
    /** 叉积：>0 左转（逆时针），<0 右转，=0 共线 */
    function ccw(P, a, b, c) {
        return (P[b][0] - P[a][0]) * (P[c][1] - P[a][1]) - (P[b][1] - P[a][1]) * (P[c][0] - P[a][0]);
    }
    /** 计算凸包顶点索引（逆时针，首点为最低点），不产生动画 */
    function convexHull(P) {
        const n = P.length;
        let base = 0;
        for (let i = 1; i < n; i++) {
            if (P[i][1] < P[base][1] || (P[i][1] === P[base][1] && P[i][0] < P[base][0])) base = i;
        }
        const rest = P.map((_, i) => i).filter(i => i !== base).sort((x, y) => {
            const c = ccw(P, base, x, y);
            if (c !== 0) return -c;
            return Math.hypot(P[x][0] - P[base][0], P[x][1] - P[base][1])
                - Math.hypot(P[y][0] - P[base][0], P[y][1] - P[base][1]);
        });
        const hull = [base, rest[0]];
        for (let i = 1; i < rest.length; i++) {
            while (hull.length >= 2 && ccw(P, hull[hull.length - 2], hull[hull.length - 1], rest[i]) <= 0) hull.pop();
            hull.push(rest[i]);
        }
        return hull;
    }
    function grahamRun(ctx) {
        const P = PTS;
        const n = P.length;
        const g = ctx.add(new GraphTracer('点集', mkPts(P), []));
        const st = ctx.add(new StackTracer('凸包栈'));
        const log = ctx.add(new LogTracer('log'));

        const hullEdges = () => {
            const list = [];
            for (let i = 0; i + 1 < hull.length; i++) list.push([hull[i], hull[i + 1], 1, BLUE]);
            return list;
        };

        ctx.line(2);
        let base = 0;
        for (let i = 1; i < n; i++) {
            if (P[i][1] < P[base][1] || (P[i][1] === P[base][1] && P[i][0] < P[base][0])) base = i;
        }
        g.highlight(base, 'source', `最低点 P${base}(${P[base].join(',')}) 作为极角排序基准`);
        log.printInfo(`基准点 P${base}，其余点按相对它的极角逆时针排序`);

        ctx.line(3);
        const rest = P.map((_, i) => i).filter(i => i !== base).sort((x, y) => {
            const c = ccw(P, base, x, y);
            if (c !== 0) return -c;
            return Math.hypot(P[x][0] - P[base][0], P[x][1] - P[base][1])
                - Math.hypot(P[y][0] - P[base][0], P[y][1] - P[base][1]);
        });
        rest.forEach((i, k) => { g.vertices[i].tag = '#' + (k + 1); });
        snap(g, `极角排序结果：${rest.map(i => 'P' + i).join(' → ')}`);

        ctx.line(4);
        const hull = [base, rest[0]];
        st.push('P' + base); st.push('P' + rest[0]);
        g.vertices[base].state = 'path';
        g.vertices[rest[0]].state = 'path';
        setEdges(g, hullEdges());
        snap(g, `栈初始化：P${base}, P${rest[0]}`);

        for (let i = 1; i < rest.length; i++) {
            const c = rest[i];
            ctx.line(5);
            g.vertices[c].state = 'current';
            setEdges(g, hullEdges().concat([[hull[hull.length - 1], c, 1, ORANGE]]));
            snap(g, `考察 P${c}（第 ${i + 1} 个）`);

            ctx.line(7);
            while (hull.length >= 2 && ccw(P, hull[hull.length - 2], hull[hull.length - 1], c) <= 0) {
                const popped = hull.pop();
                st.pop();
                g.vertices[popped].state = 'default';
                g.vertices[popped].tag = '✗';
                setEdges(g, hullEdges().concat([[hull[hull.length - 1], c, 1, ORANGE]]));
                snap(g, `P${popped} 处非左转（叉积 ≤ 0），弹出栈`);
                log.printWarning(`P${popped} 不在凸包上，弹出`);
            }
            ctx.line(10);
            hull.push(c);
            st.push('P' + c);
            g.vertices[c].state = 'path';
            setEdges(g, hullEdges());
            snap(g, `P${c} 入栈，当前凸包：${hull.map(v => 'P' + v).join(' → ')}`);
        }

        ctx.line(12);
        setEdges(g, hullEdges().concat([[hull[hull.length - 1], hull[0], 1, GREEN]]));
        const area = Math.abs(hull.reduce((s, v, i) => {
            const w = hull[(i + 1) % hull.length];
            return s + P[v][0] * P[w][1] - P[w][0] * P[v][1];
        }, 0)) / 2;
        log.printSuccess(`凸包顶点（逆时针）：${hull.map(v => 'P' + v).join(' → ')}`);
        g.done(`✓ 凸包含 ${hull.length} 个顶点，面积 ${area.toFixed(1)}`);
    }

    // ============================================================
    // 5. 最远点对（凸包 + 旋转卡壳）
    // ============================================================
    const farthestCode = `function farthestPair(points) {
  const hull = grahamScan(points);      // 最远点对必在凸包上
  let best = 0, bp = null;
  for (let i = 0; i < h; i++)           // 旋转卡壳：只需扫描凸包
    for (let j = i + 1; j < h; j++) {
      const d = dist(hull[i], hull[j]);
      if (d > best) { best = d; bp = [i, j]; }
    }
  return bp;                            // O(N log N)
}`;
    function farthestRun(ctx) {
        const P = PTS;
        const g = ctx.add(new GraphTracer('点集', mkPts(P), []));
        const log = ctx.add(new LogTracer('log'));
        const dist = (i, j) => Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]);
        const fmt = d => d.toFixed(2);

        ctx.line(2);
        const hull = convexHull(P);
        const h = hull.length;
        // 凸包顶点用状态标记，避免数组与图重叠
        hull.forEach((v, k) => { g.vertices[v].tag = 'H' + (k + 1); });
        const hullEdges = hull.map((v, i) => [v, hull[(i + 1) % h], 1, BLUE]);
        hull.forEach(v => { g.vertices[v].state = 'tree'; });
        setEdges(g, hullEdges);
        snap(g, `先求凸包：${hull.map(v => 'P' + v).join(' → ')}（内部点不可能是最远点对）`);
        log.printInfo(`凸包含 ${h} 个顶点，最远点对必为其中两点，比较量从 C(${P.length},2)=${P.length * (P.length - 1) / 2} 降至 C(${h},2)=${h * (h - 1) / 2}`);

        let best = 0, bp = null;
        ctx.line(4);
        for (let i = 0; i < h; i++) {
            for (let j = i + 1; j < h; j++) {
                ctx.line(6);
                const u = hull[i], v = hull[j];
                const d = dist(u, v);
                const cur = bp ? [[bp[0], bp[1], 1, GREEN]] : [];
                setEdges(g, hullEdges.concat(cur, [[u, v, 1, ORANGE]]));
                snap(g, `卡壳对 P${u}–P${v}：${fmt(d)}${d > best ? '（更远！）' : `（不优于 ${fmt(best)}）`}`);
                if (d > best) {
                    ctx.line(7);
                    best = d; bp = [u, v];
                    clearState(g, 'path');
                    g.vertices[u].state = 'path';
                    g.vertices[v].state = 'path';
                    setEdges(g, hullEdges.concat([[u, v, 1, GREEN]]));
                    snap(g, `✓ 最远点对更新为 P${u}–P${v} = ${fmt(d)}`);
                    log.printSuccess(`直径更新为 ${fmt(d)}（P${u}, P${v}）`);
                }
            }
        }
        ctx.line(9);
        setEdges(g, hullEdges.concat([[bp[0], bp[1], 1, GREEN]]));
        log.printSuccess(`最远点对：P${bp[0]}(${P[bp[0]].join(',')}) 与 P${bp[1]}(${P[bp[1]].join(',')})`);
        g.done(`✓ 凸包直径 = ${fmt(best)}（P${bp[0]}–P${bp[1]}）`);
    }

    // ============================================================
    // 6. 快速傅里叶变换（迭代 Cooley-Tukey）
    // ============================================================
    const fftCode = `function fft(a) {              // n 为 2 的幂
  bitReversePermute(a);                   // 位反转重排
  for (let len = 2; len <= n; len <<= 1) {         // 逐级合并
    const ang = -2 * PI / len;
    for (let i = 0; i < n; i += len)
      for (let k = 0; k < len / 2; k++) {
        const w = exp(i * ang * k);                // 旋转因子
        const u = a[i + k], t = w * a[i + k + len / 2];
        a[i + k] = u + t;                          // 蝶形运算
        a[i + k + len / 2] = u - t;
      }
  }
  return a;                 // O(N log N)
}`;
    function fftRun(ctx) {
        const input = [1, 1, 1, 1, 0, 0, 0, 0]; // 方波脉冲，频谱有解析解便于核对
        const n = input.length;
        const levels = Math.log2(n);
        const tbl = ctx.add(new DPTableTracer('复数序列', levels + 2, n, ''));
        const mag = ctx.add(new ArrayTracer('幅度谱 |X[k]|', new Array(n).fill(0)));
        const log = ctx.add(new LogTracer('log'));
        tbl.setRowLabels(['输入'].concat(['位反转']).concat(Array.from({ length: levels }, (_, i) => `第${i + 1}级`)));
        tbl.setColLabels(Array.from({ length: n }, (_, i) => String(i)));

        const re = input.slice(), im = new Array(n).fill(0);
        const fmtC = (r, i) => {
            const rr = Math.abs(r) < 1e-9 ? 0 : r, ii = Math.abs(i) < 1e-9 ? 0 : i;
            if (ii === 0) return rr.toFixed(2);
            return `${rr.toFixed(2)}${ii > 0 ? '+' : '−'}${Math.abs(ii).toFixed(2)}i`;
        };
        const writeRow = (row, desc, hl) => {
            for (let k = 0; k < n; k++) {
                tbl.cells[row][k] = { value: fmtC(re[k], im[k]), state: (hl && hl.indexOf(k) >= 0) ? 'current' : 'default' };
            }
            snap(tbl, desc);
        };

        ctx.line(1);
        writeRow(0, `输入序列：[${input.join(', ')}]（长度 ${n} 的方波脉冲）`);
        log.printInfo(`FFT 输入长度 ${n} = 2^${levels}，需 ${levels} 级蝶形运算`);

        // 位反转重排
        ctx.line(2);
        for (let i = 1, j = 0; i < n; i++) {
            let bit = n >> 1;
            for (; j & bit; bit >>= 1) j ^= bit;
            j ^= bit;
            if (i < j) {
                [re[i], re[j]] = [re[j], re[i]];
                [im[i], im[j]] = [im[j], im[i]];
                writeRow(1, `位反转：交换下标 ${i} ↔ ${j}`, [i, j]);
            }
        }
        writeRow(1, `位反转重排完成：[${re.map((v, k) => fmtC(v, im[k])).join(', ')}]`);

        // 逐级蝶形
        let stage = 0;
        for (let len = 2; len <= n; len <<= 1) {
            ctx.line(3);
            stage++;
            const ang = -2 * Math.PI / len;
            log.printInfo(`第 ${stage} 级：合并长度 ${len / 2} → ${len}，旋转因子 W_${len}`);
            for (let i = 0; i < n; i += len) {
                for (let k = 0; k < len / 2; k++) {
                    ctx.line(7);
                    const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
                    const p = i + k, q = i + k + len / 2;
                    const ur = re[p], ui = im[p];
                    const tr = wr * re[q] - wi * im[q];
                    const ti = wr * im[q] + wi * re[q];
                    ctx.line(9);
                    re[p] = ur + tr; im[p] = ui + ti;
                    ctx.line(10);
                    re[q] = ur - tr; im[q] = ui - ti;
                    writeRow(stage + 1, `蝶形 (${p}, ${q})：W=${fmtC(wr, wi)} → X[${p}]=${fmtC(re[p], im[p])}, X[${q}]=${fmtC(re[q], im[q])}`, [p, q]);
                }
            }
            writeRow(stage + 1, `第 ${stage} 级完成`);
        }

        ctx.line(13);
        mag.setItems(re.map((r, k) => Number(Math.hypot(r, im[k]).toFixed(2))));
        log.printSuccess(`频谱：${re.map((r, k) => `X[${k}]=${fmtC(r, im[k])}`).join('，')}`);
        mag.done(`✓ FFT 完成，直流分量 X[0] = ${fmtC(re[0], im[0])}`);
    }

    // ============================================================
    // 7. 高斯消元（部分主元）
    // ============================================================
    const LINSYS = {
        A: [[0, 1, 1], [2, 4, -2], [0, 3, 15]],
        b: [4, 2, 36],
        names: ['x', 'y', 'z']
    };
    const gaussCode = `function gaussian(A, b) {
  for (let p = 0; p < n; p++) {
    let max = p;                         // 部分主元：选列内绝对值最大行
    for (let i = p + 1; i < n; i++)
      if (abs(A[i][p]) > abs(A[max][p])) max = i;
    swap(A, p, max); swap(b, p, max);
    for (let i = p + 1; i < n; i++) {    // 消去主元下方
      const alpha = A[i][p] / A[p][p];
      b[i] -= alpha * b[p];
      for (let j = p; j < n; j++) A[i][j] -= alpha * A[p][j];
    }
  }
  for (let i = n - 1; i >= 0; i--) {     // 回代
    let sum = 0;
    for (let j = i + 1; j < n; j++) sum += A[i][j] * x[j];
    x[i] = (b[i] - sum) / A[i][i];
  }
  return x;
}`;
    function buildAug(ctx, tblName) {
        const n = LINSYS.A.length;
        const M = LINSYS.A.map((r, i) => r.concat([LINSYS.b[i]]));
        const tbl = ctx.add(new DPTableTracer(tblName, n, n + 1, 0));
        tbl.setRowLabels(LINSYS.A.map((_, i) => 'R' + (i + 1)));
        tbl.setColLabels(LINSYS.names.concat(['=']));
        return { n, M, tbl };
    }
    function syncM(tbl, M, desc, hl) {
        for (let i = 0; i < M.length; i++) {
            for (let j = 0; j < M[i].length; j++) {
                const v = Math.abs(M[i][j]) < 1e-9 ? 0 : M[i][j];
                const state = hl && hl.some(h => h[0] === i && h[1] === j) ? 'current' : 'default';
                tbl.cells[i][j] = { value: Number(v.toFixed(3)), state };
            }
        }
        snap(tbl, desc);
    }
    function gaussElimRun(ctx) {
        const { n, M, tbl } = buildAug(ctx, '增广矩阵');
        const xs = ctx.add(new ArrayTracer('解向量', LINSYS.names.map(() => '?')));
        const log = ctx.add(new LogTracer('log'));

        ctx.line(1);
        syncM(tbl, M, `增广矩阵 [A | b]，求解 ${LINSYS.names.join(', ')}`);
        log.printInfo('方程组：' + LINSYS.A.map((r, i) =>
            r.map((c, j) => `${c}${LINSYS.names[j]}`).join(' + ') + ` = ${LINSYS.b[i]}`).join('；'));

        for (let p = 0; p < n; p++) {
            ctx.line(3);
            let mx = p;
            for (let i = p + 1; i < n; i++) if (Math.abs(M[i][p]) > Math.abs(M[mx][p])) mx = i;
            syncM(tbl, M, `第 ${p + 1} 列选主元：第 ${mx + 1} 行的 |${M[mx][p]}| 最大`, [[mx, p]]);
            if (mx !== p) {
                ctx.line(6);
                [M[p], M[mx]] = [M[mx], M[p]];
                syncM(tbl, M, `交换 R${p + 1} ↔ R${mx + 1}（部分主元，保证数值稳定）`, [[p, p]]);
                log.printInfo(`交换第 ${p + 1} 行与第 ${mx + 1} 行`);
            }
            if (Math.abs(M[p][p]) < 1e-12) { log.printError('矩阵奇异，无唯一解'); break; }
            for (let i = p + 1; i < n; i++) {
                ctx.line(8);
                const alpha = M[i][p] / M[p][p];
                if (alpha === 0) continue;
                for (let j = p; j <= n; j++) M[i][j] -= alpha * M[p][j];
                syncM(tbl, M, `R${i + 1} −= ${alpha.toFixed(3)} × R${p + 1}，消去 (${i + 1}, ${p + 1})`, [[i, p]]);
            }
        }
        log.printSuccess('前向消元完成，矩阵已化为上三角');

        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            ctx.line(14);
            let sum = 0;
            for (let j = i + 1; j < n; j++) sum += M[i][j] * x[j];
            x[i] = (M[i][n] - sum) / M[i][i];
            xs.set(i, Number(x[i].toFixed(3)));
            xs.highlight(i, 'sorted', `回代：${LINSYS.names[i]} = (${M[i][n].toFixed(2)} − ${sum.toFixed(2)}) / ${M[i][i].toFixed(2)} = ${x[i].toFixed(3)}`);
        }
        ctx.line(17);
        log.printSuccess(`解：${LINSYS.names.map((nm, i) => `${nm} = ${x[i].toFixed(3)}`).join('，')}`);
        xs.done(`✓ 解得 ${LINSYS.names.map((nm, i) => `${nm}=${x[i].toFixed(2)}`).join(', ')}`);
    }

    // ============================================================
    // 8. 高斯-约当消元（化为行最简形）
    // ============================================================
    const gaussJordanCode = `function gaussJordan(A, b) {
  for (let p = 0; p < n; p++) {
    pivot(p);                            // 选主元并交换到第 p 行
    const d = A[p][p];
    for (let j = p; j <= n; j++) A[p][j] /= d;   // 主元归一化
    for (let i = 0; i < n; i++) {        // 上下同时消去
      if (i === p) continue;
      const alpha = A[i][p];
      for (let j = p; j <= n; j++) A[i][j] -= alpha * A[p][j];
    }
  }
  return lastColumn(A);   // 化为 [I | x]，最后一列直接是解
}`;
    function gaussJordanRun(ctx) {
        const { n, M, tbl } = buildAug(ctx, '增广矩阵 → [I | x]');
        const xs = ctx.add(new ArrayTracer('解向量', LINSYS.names.map(() => '?')));
        const log = ctx.add(new LogTracer('log'));

        ctx.line(1);
        syncM(tbl, M, '增广矩阵 [A | b]，目标化为行最简形 [I | x]');
        log.printInfo('与高斯消元的区别：主元归一化，且同时消去主元上方与下方');

        for (let p = 0; p < n; p++) {
            ctx.line(3);
            let mx = p;
            for (let i = p + 1; i < n; i++) if (Math.abs(M[i][p]) > Math.abs(M[mx][p])) mx = i;
            if (mx !== p) {
                [M[p], M[mx]] = [M[mx], M[p]];
                syncM(tbl, M, `交换 R${p + 1} ↔ R${mx + 1}（主元 ${M[p][p]}）`, [[p, p]]);
            }
            if (Math.abs(M[p][p]) < 1e-12) { log.printError('矩阵奇异，无唯一解'); break; }

            ctx.line(5);
            const d = M[p][p];
            for (let j = p; j <= n; j++) M[p][j] /= d;
            syncM(tbl, M, `R${p + 1} ÷= ${d.toFixed(3)}，主元归一化为 1`, [[p, p]]);

            for (let i = 0; i < n; i++) {
                if (i === p) continue;
                const alpha = M[i][p];
                if (Math.abs(alpha) < 1e-12) continue;
                ctx.line(9);
                for (let j = p; j <= n; j++) M[i][j] -= alpha * M[p][j];
                syncM(tbl, M, `R${i + 1} −= ${alpha.toFixed(3)} × R${p + 1}，${i < p ? '消去主元上方' : '消去主元下方'}`, [[i, p]]);
            }
        }

        ctx.line(12);
        for (let i = 0; i < n; i++) {
            xs.set(i, Number(M[i][n].toFixed(3)));
            xs.highlight(i, 'sorted', `${LINSYS.names[i]} = ${M[i][n].toFixed(3)}（最后一列直接给出）`);
        }
        log.printSuccess(`行最简形 [I | x]，解：${LINSYS.names.map((nm, i) => `${nm} = ${M[i][n].toFixed(3)}`).join('，')}`);
        xs.done(`✓ 解得 ${LINSYS.names.map((nm, i) => `${nm}=${M[i][n].toFixed(2)}`).join(', ')}`);
    }

    // ============================================================
    // 9. 单纯形法线性规划
    // ============================================================
    const simplexCode = `function simplex(A, b, c) {       // max cᵀx, Ax ≤ b, x ≥ 0
  buildTableau();                          // [A | I | b] 上方加目标行
  while (true) {
    const q = bland();                     // 选入基列（目标行系数 > 0）
    if (q === -1) break;                   // 全 ≤ 0 → 已最优
    const p = minRatio(q);                 // 最小比值法选出基行
    if (p === -1) throw '无界';
    pivot(p, q);                           // 主元化 1，其余列消为 0
  }
  return -tableau[m][n + m];               // 目标值
}`;
    function simplexRun(ctx) {
        // max 13A + 23B s.t. 5A+15B≤480, 4A+4B≤160, 35A+20B≤1190
        const A = [[5, 15], [4, 4], [35, 20]];
        const b = [480, 160, 1190];
        const c = [13, 23];
        const m = A.length, nv = c.length;
        const cols = nv + m + 1;
        const tbl = ctx.add(new DPTableTracer('单纯形表', m + 1, cols, 0));
        const basisArr = ctx.add(new ArrayTracer('基变量', []));
        const log = ctx.add(new LogTracer('log'));
        tbl.setRowLabels(['约束1', '约束2', '约束3', '目标行']);
        tbl.setColLabels(['A', 'B', 's1', 's2', 's3', 'RHS']);

        // 构造表：前 m 行为约束（含松弛变量单位阵），最后一行为目标行
        const T = [];
        for (let i = 0; i < m; i++) {
            const row = new Array(cols).fill(0);
            for (let j = 0; j < nv; j++) row[j] = A[i][j];
            row[nv + i] = 1;
            row[cols - 1] = b[i];
            T.push(row);
        }
        const obj = new Array(cols).fill(0);
        for (let j = 0; j < nv; j++) obj[j] = c[j];
        T.push(obj);

        const basis = Array.from({ length: m }, (_, i) => nv + i); // 初始基为松弛变量
        const names = ['A', 'B', 's1', 's2', 's3'];
        const sync = (desc, hl) => {
            for (let i = 0; i <= m; i++) {
                for (let j = 0; j < cols; j++) {
                    const v = Math.abs(T[i][j]) < 1e-9 ? 0 : T[i][j];
                    const st = hl && hl.some(h => h[0] === i && h[1] === j) ? 'current' : 'default';
                    tbl.cells[i][j] = { value: Number(v.toFixed(2)), state: st };
                }
            }
            snap(tbl, desc);
        };

        ctx.line(2);
        sync('初始单纯形表：加入松弛变量 s1, s2, s3 化为标准型');
        basisArr.setItems(basis.map(i => names[i]));
        log.printInfo('目标：max 13A + 23B；初始可行解 A=B=0，目标值 0');

        let iter = 0;
        while (iter < 20) {
            iter++;
            ctx.line(4);
            // 选入基列：目标行系数最大且 > 0
            let q = -1, bestC = 1e-9;
            for (let j = 0; j < cols - 1; j++) if (T[m][j] > bestC) { bestC = T[m][j]; q = j; }
            if (q === -1) {
                ctx.line(5);
                sync('目标行系数全部 ≤ 0，已达最优解');
                log.printSuccess('无可改进方向，迭代结束');
                break;
            }
            sync(`第 ${iter} 轮：选入基变量 ${names[q]}（目标行系数 ${T[m][q].toFixed(2)} 最大）`,
                Array.from({ length: m + 1 }, (_, i) => [i, q]));

            ctx.line(6);
            // 最小比值法选出基行
            let p = -1, bestR = Infinity;
            const ratios = [];
            for (let i = 0; i < m; i++) {
                if (T[i][q] <= 1e-9) { ratios.push('—'); continue; }
                const r = T[i][cols - 1] / T[i][q];
                ratios.push(r.toFixed(2));
                if (r < bestR) { bestR = r; p = i; }
            }
            if (p === -1) { log.printError('问题无界'); break; }
            log.printInfo(`比值检验：${ratios.map((r, i) => `R${i + 1}=${r}`).join('，')} → 选第 ${p + 1} 行`);
            sync(`最小比值 ${bestR.toFixed(2)} 在约束${p + 1}，主元 = T[${p + 1}][${names[q]}] = ${T[p][q].toFixed(2)}`, [[p, q]]);

            ctx.line(8);
            // 主元行归一化
            const pv = T[p][q];
            for (let j = 0; j < cols; j++) T[p][j] /= pv;
            sync(`主元行 ÷= ${pv.toFixed(2)}，主元化为 1`, [[p, q]]);
            // 其余行消元
            for (let i = 0; i <= m; i++) {
                if (i === p) continue;
                const alpha = T[i][q];
                if (Math.abs(alpha) < 1e-12) continue;
                for (let j = 0; j < cols; j++) T[i][j] -= alpha * T[p][j];
            }
            basis[p] = q;
            basisArr.setItems(basis.map(i => names[i]));
            sync(`消元完成：${names[q]} 入基替换 ${names[basis[p]]}，当前目标值 ${(-T[m][cols - 1]).toFixed(2)}`, [[m, cols - 1]]);
            log.printSuccess(`第 ${iter} 轮结束，目标值提升到 ${(-T[m][cols - 1]).toFixed(2)}`);
        }

        ctx.line(11);
        const sol = new Array(nv).fill(0);
        basis.forEach((bv, i) => { if (bv < nv) sol[bv] = T[i][cols - 1]; });
        const value = -T[m][cols - 1];
        log.printSuccess(`最优解：A = ${sol[0].toFixed(2)}，B = ${sol[1].toFixed(2)}，最优值 = ${value.toFixed(2)}`);
        basisArr.done(`✓ 最优值 ${value.toFixed(0)}（A=${sol[0].toFixed(0)}, B=${sol[1].toFixed(0)}）`);
    }

    // ============================================================
    // 10. 最小二乘线性回归
    // ============================================================
    const linRegCode = `function linearRegression(x, y) {
  const n = x.length;
  const xbar = mean(x), ybar = mean(y);
  let xxbar = 0, xybar = 0;
  for (let i = 0; i < n; i++) {
    xxbar += (x[i] - xbar) ** 2;          // Σ(xᵢ − x̄)²
    xybar += (x[i] - xbar) * (y[i] - ybar);
  }
  const slope = xybar / xxbar;            // β₁
  const intercept = ybar - slope * xbar;  // β₀
  let ssr = 0, sst = 0;
  for (let i = 0; i < n; i++) {
    const fit = slope * x[i] + intercept;
    ssr += (fit - ybar) ** 2; sst += (y[i] - ybar) ** 2;
  }
  return { slope, intercept, r2: ssr / sst };
}`;
    function linRegRun(ctx) {
        const X = [1, 2, 3, 4, 5, 6, 7, 8];
        const Y = [2.1, 3.9, 6.2, 7.8, 10.1, 12.2, 13.8, 16.1];
        const n = X.length;

        // 散点 + 拟合直线两端点（末两个顶点为直线端点）
        const pts = X.map((x, i) => [x, Y[i]]);
        const xbar = X.reduce((a, b) => a + b, 0) / n;
        const ybar = Y.reduce((a, b) => a + b, 0) / n;
        let xxbar = 0, xybar = 0;
        for (let i = 0; i < n; i++) { xxbar += (X[i] - xbar) ** 2; xybar += (X[i] - xbar) * (Y[i] - ybar); }
        const slope = xybar / xxbar;
        const intercept = ybar - slope * xbar;
        const x0 = X[0], x1 = X[n - 1];
        const lineP = [[x0, slope * x0 + intercept], [x1, slope * x1 + intercept]];

        const labels = X.map((_, i) => 'P' + i).concat(['◜', '◞']);
        const g = ctx.add(new GraphTracer('散点与拟合直线', mkPts(pts.concat(lineP), labels), []));
        const log = ctx.add(new LogTracer('log'));

        // 直线端点用低调状态，避免被误认为数据点
        g.vertices[n].state = 'tree';
        g.vertices[n + 1].state = 'tree';

        ctx.line(3);
        snap(g, `样本 n = ${n}，x̄ = ${xbar.toFixed(3)}，ȳ = ${ybar.toFixed(3)}；${n} 个样本点散布图`);
        log.printInfo(`均值：x̄ = ${xbar.toFixed(3)}，ȳ = ${ybar.toFixed(3)}`);

        let sxx = 0, sxy = 0;
        for (let i = 0; i < n; i++) {
            ctx.line(6);
            const dx = X[i] - xbar, dy = Y[i] - ybar;
            sxx += dx * dx; sxy += dx * dy;
            g.vertices[i].tag = `${dx.toFixed(1)}·${dy.toFixed(1)}`;
            g.vertices[i].state = 'current';
            snap(g, `第 ${i} 点：(x−x̄) = ${dx.toFixed(2)}，(x−x̄)(y−ȳ) = ${(dx * dy).toFixed(2)}；累计 Sxx=${sxx.toFixed(2)}, Sxy=${sxy.toFixed(2)}`);
            g.vertices[i].state = 'visited';
        }

        ctx.line(9);
        log.printInfo(`Sxx = Σ(x−x̄)² = ${sxx.toFixed(3)}，Sxy = Σ(x−x̄)(y−ȳ) = ${sxy.toFixed(3)}`);
        g.vertices.forEach(v => { v.tag = ''; });
        snap(g, `斜率 β₁ = Sxy / Sxx = ${sxy.toFixed(2)} / ${sxx.toFixed(2)} = ${slope.toFixed(4)}`);
        ctx.line(10);
        snap(g, `截距 β₀ = ȳ − β₁·x̄ = ${ybar.toFixed(3)} − ${slope.toFixed(4)}×${xbar.toFixed(2)} = ${intercept.toFixed(4)}`);

        // 画出拟合直线
        setEdges(g, [[n, n + 1, 1, GREEN]]);
        snap(g, `拟合直线：ŷ = ${slope.toFixed(4)}x + ${intercept.toFixed(4)}`);

        // 残差
        ctx.line(13);
        let ssr = 0, sst = 0;
        for (let i = 0; i < n; i++) {
            const fit = slope * X[i] + intercept;
            ssr += (fit - ybar) ** 2; sst += (Y[i] - ybar) ** 2;
            g.vertices[i].tag = (Y[i] - fit).toFixed(2);
        }
        snap(g, '各点标注残差 y − ŷ');
        const r2 = ssr / sst;
        ctx.line(16);
        log.printSuccess(`回归方程 ŷ = ${slope.toFixed(4)}x + ${intercept.toFixed(4)}，R² = ${r2.toFixed(4)}`);
        g.done(`✓ ŷ = ${slope.toFixed(3)}x + ${intercept.toFixed(3)}，R² = ${r2.toFixed(4)}`);
    }

    // ============================================================
    // 注册
    // ============================================================
    const D = (h, b) => `<div class="desc-section"><h3>${h}</h3><p>${b}</p></div>`;
    const G_ = { defaultData: [], dataParser: (s) => s };

    const algos = [
        {
            id: 'math.threeSum', name: '3-Sum 暴力解', category: 'classic', level: 'P1',
            complexity: { time: 'O(N³)', space: 'O(1)' }, keywords: ['3-sum', 'brute force', '复杂度分析'],
            mnemonic: '三重循环枚举，立方复杂度基准',
            description: D('核心思想', '三重循环枚举所有 i &lt; j &lt; k 的三元组，判断三数之和是否为 0。它是《算法》第 1.4 节讲复杂度增长阶的标准范例：N 翻倍则运行时间约变为 8 倍。'),
            code: threeSumCode, defaultData: THREE_SUM_DATA, dataParser: NUM_DATA, run: threeSumRun
        },
        {
            id: 'math.threeSumFast', name: '3-Sum 排序+二分', category: 'classic', level: 'P2',
            complexity: { time: 'O(N² log N)', space: 'O(1)' }, keywords: ['3-sum', 'binary search', '算法改进'],
            mnemonic: '先排序再二分，立方降到平方对数',
            description: D('核心思想', '先把数组排序，再枚举前两个数 a[i]、a[j]，用二分查找第三个数 −(a[i]+a[j])。只在查到的下标 k &gt; j 时计数，既保证 i &lt; j &lt; k 又避免重复。复杂度由 O(N³) 降为 O(N² log N)。'),
            code: threeSumFastCode, defaultData: THREE_SUM_DATA, dataParser: NUM_DATA, run: threeSumFastRun
        },
        {
            id: 'math.closestPair', name: '最近点对（分治）', category: 'classic', level: 'P3',
            complexity: { time: 'O(N log N)', space: 'O(N)' }, keywords: ['closest pair', 'divide and conquer', '计算几何'],
            mnemonic: '左右各求最近，中线带状再补刀',
            description: D('核心思想', '按 x 排序后二分成左右两半，递归求各自最近距离 δ。跨越中线的点对只可能落在宽度 2δ 的带状区内；把带内点按 y 排序后，每个点最多只需与后面 7 个点比较，因此合并是线性的，总复杂度 O(N log N)。'),
            code: closestPairCode, ...G_, run: closestPairRun
        },
        {
            id: 'math.grahamScan', name: 'Graham 扫描凸包', category: 'classic', level: 'P2',
            complexity: { time: 'O(N log N)', space: 'O(N)' }, keywords: ['convex hull', 'graham scan', 'ccw'],
            mnemonic: '极角排一圈，右转就弹栈',
            description: D('核心思想', '取最低点为基准，其余点按极角逆时针排序后依次入栈。每次入栈前检查栈顶两点与新点是否构成左转（叉积 &gt; 0），若非左转说明栈顶点在凸包内部，弹出即可。排序主导复杂度 O(N log N)。'),
            code: grahamCode, ...G_, run: grahamRun
        },
        {
            id: 'math.farthestPair', name: '最远点对（凸包直径）', category: 'classic', level: 'P3',
            complexity: { time: 'O(N log N)', space: 'O(N)' }, keywords: ['farthest pair', 'convex hull', 'rotating calipers'],
            mnemonic: '最远必在壳上，只扫凸包顶点',
            description: D('核心思想', '关键性质：最远点对的两个端点一定都是凸包顶点（否则可沿某方向继续外移）。因此先求凸包把候选从 N 个点缩到 h 个顶点，再用旋转卡壳扫描，避免了 O(N²) 的全枚举。'),
            code: farthestCode, ...G_, run: farthestRun
        },
        {
            id: 'math.fft', name: '快速傅里叶变换 FFT', category: 'advanced', level: 'P3',
            complexity: { time: 'O(N log N)', space: 'O(N)' }, keywords: ['fft', 'butterfly', 'cooley-tukey', '分治'],
            mnemonic: '位反转开局，逐级蝶形合并',
            description: D('核心思想', '把长度 N 的 DFT 按奇偶下标拆成两个 N/2 的 DFT，利用旋转因子的周期性合并。迭代实现先做位反转重排，再自底向上做 log N 级蝶形运算，每级 O(N)，总计 O(N log N)。'),
            code: fftCode, ...G_, run: fftRun
        },
        {
            id: 'math.gaussElim', name: '高斯消元', category: 'classic', level: 'P2',
            complexity: { time: 'O(N³)', space: 'O(N²)' }, keywords: ['gaussian elimination', 'pivot', '线性方程组'],
            mnemonic: '选主元换行，消成上三角回代',
            description: D('核心思想', '对增广矩阵 [A | b] 逐列处理：先用部分主元（选该列绝对值最大的行）交换到对角位置以保证数值稳定，再把主元下方元素消为 0。矩阵化为上三角后自下而上回代即可求出全部未知量。'),
            code: gaussCode, ...G_, run: gaussElimRun
        },
        {
            id: 'math.gaussJordan', name: '高斯-约当消元', category: 'classic', level: 'P2',
            complexity: { time: 'O(N³)', space: 'O(N²)' }, keywords: ['gauss-jordan', 'rref', '行最简形'],
            mnemonic: '主元归一，上下一起消',
            description: D('核心思想', '在高斯消元基础上多做两件事：把主元归一化为 1，并同时消去主元上方与下方的元素。最终矩阵化为行最简形 [I | x]，最后一列直接就是解，无需回代；同样的过程还可用于求逆矩阵。'),
            code: gaussJordanCode, ...G_, run: gaussJordanRun
        },
        {
            id: 'math.linProg', name: '单纯形法线性规划', category: 'advanced', level: 'P3',
            complexity: { time: '实践中近似 O(m·n)', space: 'O(m·n)' }, keywords: ['simplex', 'linear programming', '单纯形表'],
            mnemonic: '沿棱走顶点，比值定出基',
            description: D('核心思想', '把不等式约束加松弛变量化为标准型，构造单纯形表。每轮从目标行挑一个系数为正的列入基（有改进方向），用最小比值法选出基行（保持可行性），做主元消元后移动到相邻的更优顶点。目标行系数全部 ≤ 0 时即为最优。'),
            code: simplexCode, ...G_, run: simplexRun
        },
        {
            id: 'math.linReg', name: '最小二乘线性回归', category: 'classic', level: 'P1',
            complexity: { time: 'O(N)', space: 'O(1)' }, keywords: ['linear regression', 'least squares', 'R²'],
            mnemonic: '斜率协方差比方差，截距过均值点',
            description: D('核心思想', '最小化残差平方和 Σ(yᵢ − β₀ − β₁xᵢ)²，对两个参数求偏导置零，得到闭式解：β₁ = Σ(xᵢ−x̄)(yᵢ−ȳ) / Σ(xᵢ−x̄)²，β₀ = ȳ − β₁x̄。回归直线必过样本均值点 (x̄, ȳ)，拟合优度用 R² = SSR/SST 衡量。')
                + D('推导过程（小白版）', '把直线写成 ŷ = β₀ + β₁x。每个样本的真实值 y 与预测值 ŷ 之差叫“残差” e = y − ŷ；最小二乘就是让所有残差的平方和 SSE = Σeᵢ² 最小。<br>对 β₀、β₁ 分别求偏导并令其为 0（函数取得最小值的必要条件），得到两个方程：<br>① 对 β₀ 求导：Σ(yᵢ − β₀ − β₁xᵢ) = 0，两边除以 n 得 ȳ = β₀ + β₁x̄，于是 截距 β₀ = ȳ − β₁x̄（直线必过均值点 (x̄, ȳ)）。<br>② 把 β₀ 代入对 β₁ 求导的式子，化简得 斜率 β₁ = Σ(xᵢ−x̄)(yᵢ−ȳ) / Σ(xᵢ−x̄)²。分子是 x、y 的“协方差”，分母是 x 的“方差”，所以斜率 = 协方差 ÷ 方差，表示 x 每变 1 单位、y 平均变多少。<br>拟合优度用 R² = SSR/SST 衡量：R² 越接近 1，说明直线解释掉的波动越多、拟合越好。')
                + D('适用场景', '当你想用一个连续量去预测另一个连续量，且两者大致呈直线关系时最合适。例如：按房屋面积预测房价、按广告投入预测销量、按学习时长预测成绩、按月份预测平均气温。它也是逻辑回归、岭回归、神经网络线性层等更复杂模型的基石。')
                + D('典型案例', '① 身高预测体重：采集多人 (身高, 体重) 样本，拟合一条直线，输入新身高即可估计体重。<br>② 销量预测：把“广告费”当 x、“销售额”当 y，算出斜率就能回答“每多投 1 万元广告大概多卖多少”。<br>③ 气温趋势：用近 12 个月数据拟合，外推下个月大致温度。'),
            code: linRegCode, ...G_, run: linRegRun
        }
    ];

    algos.forEach(a => AlgorithmLoader.register(a.id, a));
})();
