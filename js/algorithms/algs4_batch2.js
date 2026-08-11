/**
 * algs4 缺失算法补全 - 第二批
 * 涵盖：排序增强（二分插入/插入X/归并X/快速X）、多路归并、
 *      查找结构（顺序ST/二分ST/线性探测哈希）、优先队列（最小/最大/索引版）
 * 全部使用框架标准 Tracer（ArrayTracer / LogTracer / DPTableTracer），
 * 由默认状态构建器渲染，不改动任何既有动画/公共样式。
 */
(function () {
    'use strict';

    const NUM_DATA = (s) => (s && s.length)
        ? s.split(',').map(x => Number(x.trim())).filter(n => !isNaN(n))
        : null;
    const NUM_DEFAULT = [64, 25, 12, 22, 11, 90, 34, 55, 77, 88];
    // 递归型排序（MergeX / QuickX）需要更大规模才能展示"分治 + 小数组转插排"两条路径
    const NUM_DEFAULT16 = [64, 25, 12, 22, 11, 90, 34, 55, 77, 88, 43, 19, 71, 5, 60, 38];
    const asNumbers = (data, fallback) => {
        if (Array.isArray(data) && data.length > 0) return data.map(Number);
        const parsed = NUM_DATA(data);
        return (parsed && parsed.length) ? parsed : (fallback || NUM_DEFAULT).slice();
    };

    // ============================================================
    // 排序增强
    // ============================================================

    // 1. 二分插入排序
    const binInsertCode = `function binaryInsertion(a) {
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let lo = 0, hi = i;
    while (lo < hi) {           // 二分定位插入点
      const mid = (lo + hi) >> 1;
      if (a[mid] > key) hi = mid;
      else lo = mid + 1;
    }
    for (let j = i; j > lo; j--) a[j] = a[j - 1];
    a[lo] = key;
  }
}`;
    function binaryInsertionRun(ctx, data) {
        const a = asNumbers(data);
        const arr = ctx.add(new ArrayTracer('array', a.slice()));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo('二分插入排序：用二分查找定位插入点，减少比较次数');
        for (let i = 1; i < a.length; i++) {
            const key = a[i];
            arr.setPointer(i, 'key');
            log.printInfo(`处理 a[${i}] = ${key}`);
            let lo = 0, hi = i;
            ctx.line(4);
            while (lo < hi) {
                const mid = (lo + hi) >> 1;
                arr.setPointer(mid, 'mid');
                ctx.line(5);
                if (a[mid] > key) { hi = mid; log.printInfo(`a[${mid}]=${a[mid]} > ${key}，hi=${hi}`); }
                else { lo = mid + 1; log.printInfo(`a[${mid}]=${a[mid]} ≤ ${key}，lo=${lo}`); }
                arr.snapshot(`二分范围 [${lo}, ${hi})`);
            }
            ctx.line(9);
            for (let j = i; j > lo; j--) { a[j] = a[j - 1]; arr.setItems(a); arr.snapshot(`后移 a[${j - 1}]`); }
            a[lo] = key;
            arr.setItems(a);
            arr.highlight([lo], 'sorted', `插入 ${key} 到位置 ${lo}`);
        }
        arr.done('✓ 二分插入排序完成');
    }

    // 2. 插入排序哨兵优化版 (InsertionX)
    const insertionXCode = `function insertionX(a) {
  // 先找到最小元放到最左作哨兵，省去内层边界判断
  let minIdx = 0;
  for (let i = 1; i < a.length; i++) if (a[i] < a[minIdx]) minIdx = i;
  [a[0], a[minIdx]] = [a[minIdx], a[0]];
  for (let i = 2; i < a.length; i++) {
    let j = i;
    const v = a[i];
    while (v < a[j - 1]) { a[j] = a[j - 1]; j--; }
    a[j] = v;
  }
}`;
    function insertionXRun(ctx, data) {
        const a = asNumbers(data);
        const arr = ctx.add(new ArrayTracer('array', a.slice()));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo('InsertionX：先把最小元换到首位作哨兵，内层循环无需边界判断');
        let minIdx = 0;
        for (let i = 1; i < a.length; i++) {
            arr.setPointer(i, 'i'); arr.setPointer(minIdx, 'min');
            if (a[i] < a[minIdx]) { minIdx = i; log.printInfo(`新最小元 a[${i}] = ${a[i]}`); }
        }
        [a[0], a[minIdx]] = [a[minIdx], a[0]];
        arr.setItems(a);
        arr.highlight([0], 'current', `哨兵：最小元 ${a[0]} 置于首位`);
        ctx.line(6);
        for (let i = 2; i < a.length; i++) {
            const v = a[i];
            arr.setPointer(i, 'i');
            log.printInfo(`插入 a[${i}] = ${v}`);
            let j = i;
            ctx.line(8);
            while (v < a[j - 1]) {
                a[j] = a[j - 1];
                arr.setItems(a);
                arr.setPointer(j - 1, 'j');
                arr.snapshot(`后移 a[${j - 1}]`);
                j--;
            }
            a[j] = v;
            arr.setItems(a);
            arr.highlight([j], 'sorted', `插入到位置 ${j}`);
        }
        arr.done('✓ InsertionX 完成');
    }

    // 3. 归并排序优化版 (MergeX)：小数组用插入排序，避免 aux 数组反复创建
    const mergeXCode = `function mergeX(a) {
  const aux = new Array(a.length);
  sort(a, aux, 0, a.length - 1);
}
function sort(a, aux, lo, hi) {
  if (hi <= lo) return;
  if (hi - lo + 1 <= 4) { insertionSort(a, lo, hi); return; }
  const mid = lo + ((hi - lo) >> 1);
  sort(a, aux, lo, mid);
  sort(a, aux, mid + 1, hi);
  if (a[mid] <= a[mid + 1]) return; // 已有序
  merge(a, aux, lo, mid, hi);
}`;
    function insertionSortRange(a, lo, hi, arr, log) {
        log.printInfo(`子区间 [${lo},${hi}] 规模小，切换插入排序`);
        for (let i = lo + 1; i <= hi; i++) {
            const v = a[i]; let j = i;
            arr.setPointer(i, 'key');
            arr.highlight(range(lo, hi), 'current', `插排子区间 [${lo},${hi}]，待插入 ${v}`);
            while (j > lo && v < a[j - 1]) {
                a[j] = a[j - 1]; j--;
                arr.setItems(a);
                arr.snapshot(`${v} 左移，腾出位置 ${j}`);
            }
            a[j] = v;
            arr.setItems(a);
            arr.snapshot(`${v} 落位到索引 ${j}`);
        }
        arr.highlight(range(lo, hi), 'sorted', `小数组 [${lo},${hi}] 插入排序完成`);
    }
    function mergeXRun(ctx, data) {
        const a = asNumbers(data, NUM_DEFAULT16);
        const arr = ctx.add(new ArrayTracer('array', a.slice()));
        const log = ctx.add(new LogTracer('log'));
        const aux = new Array(a.length);
        ctx.line(1);
        log.printInfo('MergeX：小数组转插入排序，若左右已有序则跳过 merge');
        function sort(lo, hi) {
            if (hi <= lo) return;
            if (hi - lo + 1 <= 4) { insertionSortRange(a, lo, hi, arr, log); return; }
            const mid = lo + ((hi - lo) >> 1);
            arr.setPointer(mid, 'mid');
            arr.highlight(range(lo, mid), 'current', `分解 [${lo},${mid}]`);
            arr.highlight(range(mid + 1, hi), 'compare', `分解 [${mid + 1},${hi}]`);
            sort(lo, mid);
            sort(mid + 1, hi);
            ctx.line(10);
            if (a[mid] <= a[mid + 1]) {
                arr.highlight(range(lo, hi), 'sorted', `a[${mid}] ≤ a[${mid + 1}]，已有序`);
                log.printInfo(`子区间 [${lo},${hi}] 已有序，跳过 merge`);
                return;
            }
            merge(lo, mid, hi);
        }
        function merge(lo, mid, hi) {
            for (let k = lo; k <= hi; k++) aux[k] = a[k];
            let i = lo, j = mid + 1;
            for (let k = lo; k <= hi; k++) {
                if (i > mid) a[k] = aux[j++];
                else if (j > hi) a[k] = aux[i++];
                else if (aux[j] < aux[i]) a[k] = aux[j++];
                else a[k] = aux[i++];
                arr.setItems(a);
                arr.setPointer(k, 'k');
                arr.snapshot(`merge 位置 ${k} = ${a[k]}`);
            }
            arr.highlight(range(lo, hi), 'sorted', `区间 [${lo},${hi}] 归并完成`);
        }
        sort(0, a.length - 1);
        arr.done('✓ MergeX 完成');
    }

    // 4. 快速排序优化版 (QuickX)：三数取中 + 小数组插排
    const quickXCode = `function quickX(a) {
  sort(a, 0, a.length - 1);
}
function sort(a, lo, hi) {
  if (hi <= lo) return;
  if (hi - lo + 1 <= 5) { insertionSort(a, lo, hi); return; }
  const m = median3(a, lo, lo + (hi - lo) / 2, hi);
  swap(a, lo, m);
  const j = partition(a, lo, hi);
  sort(a, lo, j - 1);
  sort(a, j + 1, hi);
}`;
    function quickXRun(ctx, data) {
        const a = asNumbers(data, NUM_DEFAULT16);
        const arr = ctx.add(new ArrayTracer('array', a.slice()));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo('QuickX：小数组转插入排序，三数取中避免最坏划分');
        function median3(lo, mid, hi) {
            const vals = [[lo, a[lo]], [mid, a[mid]], [hi, a[hi]]];
            vals.sort((x, y) => x[1] - y[1]);
            return vals[1][0];
        }
        function sort(lo, hi) {
            if (hi <= lo) return;
            if (hi - lo + 1 <= 5) { insertionSortRange(a, lo, hi, arr, log); return; }
            const mid = lo + ((hi - lo) >> 1);
            const m = median3(lo, mid, hi);
            arr.highlight([lo, mid, hi], 'compare', `三数取中：候选 ${a[lo]},${a[mid]},${a[hi]}`);
            [a[lo], a[m]] = [a[m], a[lo]];
            arr.setItems(a);
            arr.highlight([lo], 'pivot', `枢轴 = ${a[lo]}`);
            log.printInfo(`三数取中后枢轴 ${a[lo]} 置于位置 ${lo}`);
            const j = partition(lo, hi);
            arr.highlight([j], 'sorted', `枢轴最终位置 ${j}`);
            sort(lo, j - 1);
            sort(j + 1, hi);
        }
        function partition(lo, hi) {
            let i = lo, j = hi + 1;
            const v = a[lo];
            while (true) {
                while (a[++i] < v) { arr.setPointer(i, 'i'); if (i === hi) break; }
                while (a[--j] > v) { arr.setPointer(j, 'j'); if (j === lo) break; }
                if (i >= j) break;
                [a[i], a[j]] = [a[j], a[i]];
                arr.setItems(a);
                arr.snapshot(`交换 a[${i}]=${a[i]} 与 a[${j}]=${a[j]}`);
            }
            [a[lo], a[j]] = [a[j], a[lo]];
            arr.setItems(a);
            return j;
        }
        sort(0, a.length - 1);
        arr.done('✓ QuickX 完成');
    }

    // 5. 多路归并 (Multiway)：k 个有序输入流逐次取最小
    const multiwayCode = `function multiwayMerge(streams) {
  const pq = new MinPQ();
  for (let i = 0; i < streams.length; i++)
    if (streams[i].length) pq.insert({ val: streams[i][0], s: i });
  while (!pq.isEmpty()) {
    const min = pq.delMin();
    output.push(min.val);
    streams[min.s].shift();
    if (streams[min.s].length) pq.insert({ val: streams[min.s][0], s: i });
  }
}`;
    function multiwayRun(ctx, data) {
        const streams = (Array.isArray(data) && Array.isArray(data[0])) ? data : [
            [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15], [4, 8, 12, 16]
        ];
        const flat = streams.flat();
        const arr = ctx.add(new ArrayTracer('runs', flat.map((v, i) => `${i}:${v}`)));
        const out = ctx.add(new ArrayTracer('output', []));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo(`多路归并：${streams.length} 个有序输入流合并为 1 个有序输出`);
        const pq = [];
        const heads = streams.map(() => 0);
        function pqInsert(item) { pq.push(item); pq.sort((x, y) => x.val - y.val); }
        function pqDelMin() { return pq.shift(); }
        for (let i = 0; i < streams.length; i++) if (streams[i].length) pqInsert({ val: streams[i][0], s: i });
        arr.highlight(streams.map((_, i) => i * streams[0].length), 'current', '各流首元素进入优先队列');
        const output = [];
        while (pq.length) {
            const min = pqDelMin();
            output.push(min.val);
            out.setItems(output.map(v => String(v)));
            log.printInfo(`输出最小元 ${min.val}（来自流 ${min.s}）`);
            arr.setPointer(min.s * streams[0].length + heads[min.s], 'out');
            heads[min.s]++;
            if (heads[min.s] < streams[min.s].length) {
                pqInsert({ val: streams[min.s][heads[min.s]], s: min.s });
                arr.setPointer(min.s * streams[0].length + heads[min.s], 'in');
            }
            arr.snapshot(`PQ 状态: [${pq.map(x => x.val).join(', ')}]`);
        }
        out.done('✓ 多路归并完成');
    }

    // ============================================================
    // 查找结构
    // ============================================================

    // 6. 顺序查找符号表 (Sequential Search ST)：链表，新键插到表头
    const seqSTCode = `function get(head, key) {
  for (let x = head; x; x = x.next)
    if (x.key === key) return x.val;
  return null;
}
function put(head, key, val) {
  for (let x = head; x; x = x.next)
    if (x.key === key) { x.val = val; return head; }
  return { key, val, next: head };
}`;
    function seqSTRun(ctx, data) {
        const pairs = (Array.isArray(data) && data.length && typeof data[0] === 'object') ? data : [
            { k: 'S', v: 0 }, { k: 'E', v: 1 }, { k: 'A', v: 2 },
            { k: 'R', v: 3 }, { k: 'C', v: 4 }, { k: 'H', v: 5 },
            { k: 'E', v: 6 }, { k: 'X', v: 7 }
        ];
        const list = [];
        const arr = ctx.add(new ArrayTracer('list', []));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo('顺序查找符号表：链表实现，新键插入表头；重复键则更新');
        for (const p of pairs) {
            let found = false;
            for (let i = 0; i < list.length; i++) {
                arr.setPointer(i, 'scan');
                if (list[i].k === p.k) {
                    list[i].v = p.v;
                    found = true;
                    arr.setItems(list.map(x => `${x.k}:${x.v}`));
                    arr.highlight([i], 'sorted', `更新键 ${p.k} = ${p.v}`);
                    log.printInfo(`更新已有键 ${p.k} = ${p.v}`);
                    break;
                }
            }
            if (!found) {
                list.unshift({ k: p.k, v: p.v });
                arr.setItems(list.map(x => `${x.k}:${x.v}`));
                arr.highlight([0], 'current', `新键 ${p.k}:${p.v} 插入表头`);
                log.printInfo(`插入新键 ${p.k} = ${p.v} 到表头`);
            }
        }
        arr.done('✓ 顺序查找 ST 完成');
    }

    // 7. 二分查找符号表 (Binary Search ST)：有序数组 + 二分查找
    const binSTCode = `function get(keys, vals, key) {
  let lo = 0, hi = keys.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (key < keys[mid]) hi = mid - 1;
    else if (key > keys[mid]) lo = mid + 1;
    else return vals[mid];
  }
  return null;
}
function put(keys, vals, key, val) {
  const i = rank(keys, key);
  if (keys[i] === key) { vals[i] = val; return; }
  // 插入到位置 i，后续元素后移
}`;
    function binSTRun(ctx, data) {
        const pairs = (Array.isArray(data) && data.length && typeof data[0] === 'object') ? data : [
            { k: 'S', v: 0 }, { k: 'E', v: 1 }, { k: 'A', v: 2 },
            { k: 'R', v: 3 }, { k: 'C', v: 4 }, { k: 'H', v: 5 },
            { k: 'E', v: 6 }, { k: 'X', v: 7 }
        ];
        const keys = [];
        const vals = [];
        const arr = ctx.add(new ArrayTracer('keys', []));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo('二分查找符号表：维护有序键数组，查找/插入都用二分');
        for (const p of pairs) {
            let lo = 0, hi = keys.length - 1, rank = keys.length;
            while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                arr.setPointer(mid, 'mid');
                arr.snapshot(`二分查找 ${p.k}：范围 [${lo},${hi}]`);
                if (p.k < keys[mid]) hi = mid - 1;
                else if (p.k > keys[mid]) lo = mid + 1;
                else { rank = mid; break; }
                rank = lo;
            }
            if (rank < keys.length && keys[rank] === p.k) {
                vals[rank] = p.v;
                arr.setItems(keys.map((k, i) => `${k}:${vals[i]}`));
                arr.highlight([rank], 'sorted', `更新 ${p.k}=${p.v}`);
                log.printInfo(`更新键 ${p.k} = ${p.v}`);
            } else {
                keys.splice(rank, 0, p.k);
                vals.splice(rank, 0, p.v);
                arr.setItems(keys.map((k, i) => `${k}:${vals[i]}`));
                arr.highlight([rank], 'current', `插入 ${p.k}:${p.v} 到位置 ${rank}`);
                log.printInfo(`插入键 ${p.k} = ${p.v} 到位置 ${rank}`);
            }
        }
        arr.done('✓ 二分查找 ST 完成');
    }

    // 8. 线性探测哈希表 (Linear Probing Hash ST)
    const linProbeCode = `function put(st, key, val) {
  let i = hash(key) % M;
  while (st[i]) {
    if (st[i].key === key) { st[i].val = val; return; }
    i = (i + 1) % M;
  }
  st[i] = { key, val };
}`;
    function linProbeRun(ctx, data) {
        const pairs = (Array.isArray(data) && data.length && typeof data[0] === 'object') ? data : [
            { k: 'S', v: 0 }, { k: 'E', v: 1 }, { k: 'A', v: 2 },
            { k: 'R', v: 3 }, { k: 'C', v: 4 }, { k: 'H', v: 5 },
            { k: 'E', v: 6 }, { k: 'X', v: 7 }
        ];
        const M = Math.max(16, pairs.length * 2);
        const st = Array.from({ length: M }, () => null);
        const arr = ctx.add(new ArrayTracer('table', st.map(() => '')));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo(`线性探测哈希表：表大小 M=${M}，冲突时顺序探测下一个空位`);
        for (const p of pairs) {
            let i = hashCode(p.k) % M;
            const start = i;
            while (st[i]) {
                arr.setPointer(i, 'probe');
                if (st[i].k === p.k) {
                    st[i].v = p.v;
                    arr.setItems(st.map(x => x ? `${x.k}:${x.v}` : ''));
                    arr.highlight([i], 'sorted', `更新 ${p.k}:${p.v}`);
                    log.printInfo(`更新键 ${p.k} = ${p.v}（位置 ${i}）`);
                    break;
                }
                i = (i + 1) % M;
                if (i === start) { log.printError('哈希表已满'); break; }
            }
            if (!st[i]) {
                st[i] = { k: p.k, v: p.v };
                arr.setItems(st.map(x => x ? `${x.k}:${x.v}` : ''));
                arr.highlight([i], 'current', `插入 ${p.k}:${p.v} 到位置 ${i}`);
                log.printInfo(`插入键 ${p.k} = ${p.v} 到位置 ${i}`);
            }
        }
        arr.done('✓ 线性探测哈希完成');
    }
    function hashCode(s) { let h = 0; for (const c of String(s)) h = ((h << 5) - h) + c.charCodeAt(0); return Math.abs(h); }

    // ============================================================
    // 优先队列
    // ============================================================

    // 9. 最小优先队列 (二叉堆)
    const minPQCode = `function MinPQ() {
  this.pq = [null];
}
MinPQ.prototype.insert = function(v) {
  this.pq.push(v);
  this.swim(this.pq.length - 1);
};
MinPQ.prototype.delMin = function() {
  const min = this.pq[1];
  this.pq[1] = this.pq.pop();
  this.sink(1);
  return min;
};`;
    function minPQRun(ctx, data) {
        const vals = asNumbers(data);
        const pq = [null];
        const arr = ctx.add(new ArrayTracer('heap', []));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo('最小优先队列：基于二叉堆，父节点 ≤ 子节点');
        function swim(k) {
            while (k > 1 && pq[k >> 1] > pq[k]) {
                [pq[k], pq[k >> 1]] = [pq[k >> 1], pq[k]];
                arr.setItems(pq.slice(1));
                arr.snapshot(`swim：交换位置 ${k} 与 ${k >> 1}`);
                k >>= 1;
            }
        }
        function sink(k) {
            const n = pq.length - 1;
            while (2 * k <= n) {
                let j = 2 * k;
                if (j < n && pq[j + 1] < pq[j]) j++;
                if (pq[k] <= pq[j]) break;
                [pq[k], pq[j]] = [pq[j], pq[k]];
                arr.setItems(pq.slice(1));
                arr.snapshot(`sink：交换位置 ${k} 与 ${j}`);
                k = j;
            }
        }
        for (const v of vals) {
            pq.push(v); swim(pq.length - 1);
            arr.setItems(pq.slice(1));
            arr.highlight([pq.indexOf(v) - 1], 'current', `插入 ${v}`);
            log.printInfo(`插入 ${v}`);
        }
        log.printInfo('开始依次删除最小元');
        const out = [];
        while (pq.length > 1) {
            const min = pq[1];
            pq[1] = pq[pq.length - 1]; pq.pop();
            out.push(min);
            arr.setItems(pq.slice(1));
            arr.highlight([0], 'sorted', `删除最小元 ${min}`);
            log.printInfo(`删除最小元 ${min}`);
            if (pq.length > 1) sink(1);
        }
        arr.done('✓ MinPQ 完成');
    }

    // 10. 最大优先队列 (二叉堆)
    const maxPQCode = `function MaxPQ() {
  this.pq = [null];
}
MaxPQ.prototype.insert = function(v) {
  this.pq.push(v);
  this.swim(this.pq.length - 1);
};
MaxPQ.prototype.delMax = function() {
  const max = this.pq[1];
  this.pq[1] = this.pq.pop();
  this.sink(1);
  return max;
};`;
    function maxPQRun(ctx, data) {
        const vals = asNumbers(data);
        const pq = [null];
        const arr = ctx.add(new ArrayTracer('heap', []));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo('最大优先队列：基于二叉堆，父节点 ≥ 子节点');
        function swim(k) {
            while (k > 1 && pq[k >> 1] < pq[k]) {
                [pq[k], pq[k >> 1]] = [pq[k >> 1], pq[k]];
                arr.setItems(pq.slice(1));
                arr.snapshot(`swim：交换位置 ${k} 与 ${k >> 1}`);
                k >>= 1;
            }
        }
        function sink(k) {
            const n = pq.length - 1;
            while (2 * k <= n) {
                let j = 2 * k;
                if (j < n && pq[j + 1] > pq[j]) j++;
                if (pq[k] >= pq[j]) break;
                [pq[k], pq[j]] = [pq[j], pq[k]];
                arr.setItems(pq.slice(1));
                arr.snapshot(`sink：交换位置 ${k} 与 ${j}`);
                k = j;
            }
        }
        for (const v of vals) {
            pq.push(v); swim(pq.length - 1);
            arr.setItems(pq.slice(1));
            arr.highlight([pq.indexOf(v) - 1], 'current', `插入 ${v}`);
            log.printInfo(`插入 ${v}`);
        }
        log.printInfo('开始依次删除最大元');
        const out = [];
        while (pq.length > 1) {
            const max = pq[1];
            pq[1] = pq[pq.length - 1]; pq.pop();
            out.push(max);
            arr.setItems(pq.slice(1));
            arr.highlight([0], 'sorted', `删除最大元 ${max}`);
            log.printInfo(`删除最大元 ${max}`);
            if (pq.length > 1) sink(1);
        }
        arr.done('✓ MaxPQ 完成');
    }

    // 11. 索引最小优先队列
    const indexMinPQCode = `function IndexMinPQ(n) {
  this.pq = new Array(n + 1); // pq[i] = 堆中第 i 个位置的键索引
  this.qp = new Array(n).fill(-1); // qp[k] = 索引 k 在 pq 中的位置
  this.keys = new Array(n); // keys[k] = 索引 k 的键值
}`;
    function indexMinPQRun(ctx, data) {
        const vals = asNumbers(data);
        const n = vals.length;
        const pq = new Array(n + 1);
        const qp = new Array(n).fill(-1);
        const keys = vals.slice();
        let size = 0;
        const arr = ctx.add(new ArrayTracer('pq', []));
        const meta = ctx.add(new DPTableTracer('meta', 2, n, '-'));
        meta.setRowLabels(['qp', 'key']);
        meta.setColLabels(Array.from({ length: n }, (_, i) => String(i)));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo('索引最小优先队列：pq 存堆顺序，qp 存反向索引，keys 存键值');
        function swim(k) {
            while (k > 1 && keys[pq[k >> 1]] > keys[pq[k]]) {
                [pq[k], pq[k >> 1]] = [pq[k >> 1], pq[k]];
                qp[pq[k]] = k; qp[pq[k >> 1]] = k >> 1;
                k >>= 1;
            }
        }
        function sink(k) {
            while (2 * k <= size) {
                let j = 2 * k;
                if (j < size && keys[pq[j + 1]] < keys[pq[j]]) j++;
                if (keys[pq[k]] <= keys[pq[j]]) break;
                [pq[k], pq[j]] = [pq[j], pq[k]];
                qp[pq[k]] = k; qp[pq[j]] = j;
                k = j;
            }
        }
        function updateViews(desc) {
            arr.setItems(pq.slice(1, size + 1).map(x => String(x)));
            for (let i = 0; i < n; i++) {
                meta.cells[0][i] = { value: qp[i] === -1 ? '-' : qp[i], state: 'default' };
                meta.cells[1][i] = { value: keys[i], state: 'default' };
            }
            meta._commit({ type: 'snapshot', description: desc || '更新 qp / keys' });
        }
        for (let i = 0; i < n; i++) {
            pq[++size] = i;
            qp[i] = size;
            updateViews(`插入索引 ${i}（值 ${keys[i]}）`);
            arr.setPointer(size - 1, 'in');
            arr.highlight([size - 1], 'current', `插入索引 ${i}（值 ${keys[i]}）`);
            log.printInfo(`插入索引 ${i}，值 ${keys[i]}`);
            swim(size);
            updateViews('堆调整完成');
        }
        log.printInfo('开始删除最小索引');
        while (size > 0) {
            const min = pq[1];
            pq[1] = pq[size]; qp[pq[1]] = 1;
            size--;
            updateViews(`删除最小索引 ${min}（值 ${keys[min]}）`);
            arr.highlight([0], 'sorted', `删除最小索引 ${min}（值 ${keys[min]}）`);
            log.printInfo(`删除最小索引 ${min}，值 ${keys[min]}`);
            if (size > 0) { sink(1); updateViews('堆调整完成'); }
        }
        arr.done('✓ IndexMinPQ 完成');
    }

    // 12. 索引最大优先队列
    const indexMaxPQCode = `function IndexMaxPQ(n) {
  this.pq = new Array(n + 1);
  this.qp = new Array(n).fill(-1);
  this.keys = new Array(n);
}`;
    function indexMaxPQRun(ctx, data) {
        const vals = asNumbers(data);
        const n = vals.length;
        const pq = new Array(n + 1);
        const qp = new Array(n).fill(-1);
        const keys = vals.slice();
        let size = 0;
        const arr = ctx.add(new ArrayTracer('pq', []));
        const meta = ctx.add(new DPTableTracer('meta', 2, n, '-'));
        meta.setRowLabels(['qp', 'key']);
        meta.setColLabels(Array.from({ length: n }, (_, i) => String(i)));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(1);
        log.printInfo('索引最大优先队列：pq 存堆顺序，qp 存反向索引，keys 存键值');
        function swim(k) {
            while (k > 1 && keys[pq[k >> 1]] < keys[pq[k]]) {
                [pq[k], pq[k >> 1]] = [pq[k >> 1], pq[k]];
                qp[pq[k]] = k; qp[pq[k >> 1]] = k >> 1;
                k >>= 1;
            }
        }
        function sink(k) {
            while (2 * k <= size) {
                let j = 2 * k;
                if (j < size && keys[pq[j + 1]] > keys[pq[j]]) j++;
                if (keys[pq[k]] >= keys[pq[j]]) break;
                [pq[k], pq[j]] = [pq[j], pq[k]];
                qp[pq[k]] = k; qp[pq[j]] = j;
                k = j;
            }
        }
        function updateViews(desc) {
            arr.setItems(pq.slice(1, size + 1).map(x => String(x)));
            for (let i = 0; i < n; i++) {
                meta.cells[0][i] = { value: qp[i] === -1 ? '-' : qp[i], state: 'default' };
                meta.cells[1][i] = { value: keys[i], state: 'default' };
            }
            meta._commit({ type: 'snapshot', description: desc || '更新 qp / keys' });
        }
        for (let i = 0; i < n; i++) {
            pq[++size] = i;
            qp[i] = size;
            updateViews(`插入索引 ${i}（值 ${keys[i]}）`);
            arr.setPointer(size - 1, 'in');
            arr.highlight([size - 1], 'current', `插入索引 ${i}（值 ${keys[i]}）`);
            log.printInfo(`插入索引 ${i}，值 ${keys[i]}`);
            swim(size);
            updateViews('堆调整完成');
        }
        log.printInfo('开始删除最大索引');
        while (size > 0) {
            const max = pq[1];
            pq[1] = pq[size]; qp[pq[1]] = 1;
            size--;
            updateViews(`删除最大索引 ${max}（值 ${keys[max]}）`);
            arr.highlight([0], 'sorted', `删除最大索引 ${max}（值 ${keys[max]}）`);
            log.printInfo(`删除最大索引 ${max}，值 ${keys[max]}`);
            if (size > 0) { sink(1); updateViews('堆调整完成'); }
        }
        arr.done('✓ IndexMaxPQ 完成');
    }

    // ============================================================
    // 工具
    // ============================================================
    function range(lo, hi) { return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i); }

    // ============================================================
    // 注册
    // ============================================================
    const algos = [
        {
            id: 'sorting.binaryInsertion', name: '二分插入排序', category: 'sorting', level: 'P1',
            complexity: { time: 'O(n log n)', space: 'O(1)' }, keywords: ['binary insertion', 'sorting'],
            mnemonic: '二分定位再后移，比较少了移动仍',
            description: '<div class="desc-section"><h3>核心思想</h3><p>插入排序的改进：在已排序前缀中用二分查找确定插入位置，减少比较次数至 O(n log n)，但元素移动仍为 O(n²)。</p></div>',
            code: binInsertCode, defaultData: NUM_DEFAULT, dataParser: NUM_DATA, run: binaryInsertionRun
        },
        {
            id: 'sorting.insertionX', name: '插入排序哨兵优化版 (InsertionX)', category: 'sorting', level: 'P1',
            complexity: { time: 'O(n²)', space: 'O(1)' }, keywords: ['insertion sort', 'sentinel'],
            mnemonic: '最小元放当头，循环不用愁',
            description: '<div class="desc-section"><h3>核心思想</h3><p>先将最小元素交换到数组首位作为哨兵，内层 while 无需再检查下界，减少约一半比较。</p></div>',
            code: insertionXCode, defaultData: NUM_DEFAULT, dataParser: NUM_DATA, run: insertionXRun
        },
        {
            id: 'sorting.mergeX', name: '归并排序优化版 (MergeX)', category: 'sorting', level: 'P2',
            complexity: { time: 'O(n log n)', space: 'O(n)' }, keywords: ['merge sort', 'optimized'],
            mnemonic: '小子数组插排替，已有序跳过 merge',
            description: '<div class="desc-section"><h3>核心思想</h3><p>对小规模子数组切换到插入排序减少递归开销；若左半最大值 ≤ 右半最小值则直接跳过 merge。</p></div>',
            code: mergeXCode, defaultData: NUM_DEFAULT16, dataParser: NUM_DATA, run: mergeXRun
        },
        {
            id: 'sorting.quickX', name: '快速排序优化版 (QuickX)', category: 'sorting', level: 'P2',
            complexity: { time: 'O(n log n)', space: 'O(log n)' }, keywords: ['quicksort', 'median-of-three'],
            mnemonic: '三数取中选好枢，小子数组插排补',
            description: '<div class="desc-section"><h3>核心思想</h3><p>用三数取中策略选择枢轴，降低最坏情况概率；小数组改用插入排序，兼顾效率与稳定性。</p></div>',
            code: quickXCode, defaultData: NUM_DEFAULT16, dataParser: NUM_DATA, run: quickXRun
        },
        {
            id: 'string.multiway', name: '多路归并 (Multiway Merge)', category: 'string', level: 'P2',
            complexity: { time: 'O(N log k)', space: 'O(k)' }, keywords: ['multiway merge', 'external sort'],
            mnemonic: 'k 路有序流，最小堆出头',
            description: '<div class="desc-section"><h3>核心思想</h3><p>将 k 个已排序输入流用最小优先队列合并成一个有序输出流，常用于外部排序。</p></div>',
            code: multiwayCode, defaultData: [[1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15], [4, 8, 12, 16]], dataParser: (s) => { try { return JSON.parse(s); } catch (e) { return null; } }, run: multiwayRun
        },
        {
            id: 'search.seqST', name: '顺序查找符号表', category: 'linear', level: 'P0',
            complexity: { time: 'O(n)', space: 'O(n)' }, keywords: ['sequential search', 'symbol table'],
            mnemonic: '链表从头扫到尾，重复更新新插首',
            description: '<div class="desc-section"><h3>核心思想</h3><p>用无序链表存储键值对；查找时顺序扫描，新键插入表头，重复键更新值。</p></div>',
            code: seqSTCode, defaultData: [{ k: 'S', v: 0 }, { k: 'E', v: 1 }, { k: 'A', v: 2 }, { k: 'R', v: 3 }, { k: 'C', v: 4 }, { k: 'H', v: 5 }, { k: 'E', v: 6 }, { k: 'X', v: 7 }], dataParser: (s) => null, run: seqSTRun
        },
        {
            id: 'search.binST', name: '二分查找符号表', category: 'linear', level: 'P1',
            complexity: { time: 'O(log n)', space: 'O(n)' }, keywords: ['binary search', 'symbol table'],
            mnemonic: '键数组保持有序，二分查找定插入',
            description: '<div class="desc-section"><h3>核心思想</h3><p>维护一个有序键数组，查找与插入都通过二分定位，插入时需要移动后续元素。</p></div>',
            code: binSTCode, defaultData: [{ k: 'S', v: 0 }, { k: 'E', v: 1 }, { k: 'A', v: 2 }, { k: 'R', v: 3 }, { k: 'C', v: 4 }, { k: 'H', v: 5 }, { k: 'E', v: 6 }, { k: 'X', v: 7 }], dataParser: (s) => null, run: binSTRun
        },
        {
            id: 'search.linProbe', name: '线性探测哈希表', category: 'linear', level: 'P1',
            complexity: { time: 'O(1) ~ O(n)', space: 'O(n)' }, keywords: ['hash table', 'linear probing'],
            mnemonic: '冲突就往后走，空位即安家',
            description: '<div class="desc-section"><h3>核心思想</h3><p>开放寻址法：计算哈希位置后若被占用则顺序探测下一个槽位，直到找到空位或相同键。</p></div>',
            code: linProbeCode, defaultData: [{ k: 'S', v: 0 }, { k: 'E', v: 1 }, { k: 'A', v: 2 }, { k: 'R', v: 3 }, { k: 'C', v: 4 }, { k: 'H', v: 5 }, { k: 'E', v: 6 }, { k: 'X', v: 7 }], dataParser: (s) => null, run: linProbeRun
        },
        {
            id: 'search.minPQ', name: '最小优先队列 (MinPQ)', category: 'tree', level: 'P1',
            complexity: { time: 'O(log n)', space: 'O(n)' }, keywords: ['min heap', 'priority queue'],
            mnemonic: '父小子上浮，删顶下沉补',
            description: '<div class="desc-section"><h3>核心思想</h3><p>基于完全二叉堆实现：插入时 swim 上浮，删除最小时 sink 下沉，保证根节点始终最小。</p></div>',
            code: minPQCode, defaultData: NUM_DEFAULT, dataParser: NUM_DATA, run: minPQRun
        },
        {
            id: 'search.maxPQ', name: '最大优先队列 (MaxPQ)', category: 'tree', level: 'P1',
            complexity: { time: 'O(log n)', space: 'O(n)' }, keywords: ['max heap', 'priority queue'],
            mnemonic: '父大子上浮，删顶下沉补',
            description: '<div class="desc-section"><h3>核心思想</h3><p>与 MinPQ 相反，父节点 ≥ 子节点；根节点始终为最大值。</p></div>',
            code: maxPQCode, defaultData: NUM_DEFAULT, dataParser: NUM_DATA, run: maxPQRun
        },
        {
            id: 'search.indexMinPQ', name: '索引最小优先队列 (IndexMinPQ)', category: 'tree', level: 'P2',
            complexity: { time: 'O(log n)', space: 'O(n)' }, keywords: ['indexed heap', 'priority queue'],
            mnemonic: 'pq 排队 qp 反向，索引改值堆内调',
            description: '<div class="desc-section"><h3>核心思想</h3><p>维护三个数组：pq（堆顺序）、qp（索引到堆位置）、keys（索引对应的键值），支持按索引更新键值，常用于 Dijkstra/Prim。</p></div>',
            code: indexMinPQCode, defaultData: NUM_DEFAULT, dataParser: NUM_DATA, run: indexMinPQRun
        },
        {
            id: 'search.indexMaxPQ', name: '索引最大优先队列 (IndexMaxPQ)', category: 'tree', level: 'P2',
            complexity: { time: 'O(log n)', space: 'O(n)' }, keywords: ['indexed heap', 'priority queue'],
            mnemonic: 'pq 排队 qp 反向，索引改值堆内调',
            description: '<div class="desc-section"><h3>核心思想</h3><p>与 IndexMinPQ 相同结构，比较方向相反，支持按索引更新并获取最大键值。</p></div>',
            code: indexMaxPQCode, defaultData: NUM_DEFAULT, dataParser: NUM_DATA, run: indexMaxPQRun
        }
    ];

    algos.forEach(a => AlgorithmLoader.register(a.id, a));
})();
