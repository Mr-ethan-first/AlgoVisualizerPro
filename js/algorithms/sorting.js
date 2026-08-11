/**
 * 排序算法 P0 集合
 * 包含：冒泡、选择、插入、快速（递归）、归并（自顶向下）、堆排序
 */
(function () {
    'use strict';

    const DEFAULT_DATA = [5, 3, 8, 1, 2, 7, 4, 6];
    const DATA_PARSER = (s) => s.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n));

    // 堆状态构建器：数组 + 树 双视图（堆数组即完全二叉树）
    const buildHeapState = StateBuilders.buildHeapState;

    // ===== 冒泡排序 =====
    const bubbleCode = `function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    arr[n - i - 1] 已就位;
    if (!swapped) break;
  }
  排序完成;
}`;
    function bubbleRun(ctx, data) {
        const arr = ctx.add(new ArrayTracer('arr', data.slice()));
        const log = ctx.add(new LogTracer('log'));
        const n = data.length;
        ctx.line(1);
        for (let i = 0; i < n - 1; i++) {
            ctx.line(3);
            let swapped = false;
            for (let j = 0; j < n - i - 1; j++) {
                ctx.line(5);
                arr.setPointer(j, 'j');
                const cmp = arr.compare(j, j + 1);
                if (cmp > 0) {
                    ctx.line(6);
                    arr.swap(j, j + 1);
                    swapped = true;
                    log.printInfo(`交换 arr[${j}] ↔ arr[${j+1}]`);
                }
            }
            ctx.line(9);
            arr.markSorted(n - i - 1);
            if (!swapped) { ctx.line(10); log.printSuccess('无交换，提前结束'); break; }
        }
        if (n > 1) { ctx.line(9); arr.markSorted(0); }
        ctx.line(12);
        arr.done();
        log.printSuccess('排序完成');
    }

    // ===== 选择排序 =====
    const selectionCode = `function selectionSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      if (arr[j] < arr[minIdx]) {
        minIdx = j;
      }
    }
    if (minIdx !== i) {
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
    }
    arr[i] 已就位;
  }
  排序完成;
}`;
    function selectionRun(ctx, data) {
        const arr = ctx.add(new ArrayTracer('arr', data.slice()));
        const log = ctx.add(new LogTracer('log'));
        const n = data.length;
        ctx.line(1);
        for (let i = 0; i < n - 1; i++) {
            ctx.line(3);
            let minIdx = i;
            arr.highlight(i, 'pivot', `min=${arr.items[i].value}`);
            for (let j = i + 1; j < n; j++) {
                ctx.line(5);
                arr.setPointer(j, 'j');
                if (arr.compare(j, minIdx) < 0) {
                    ctx.line(6);
                    arr.highlight(minIdx, 'default');
                    minIdx = j;
                    arr.highlight(minIdx, 'pivot', `min=${arr.items[minIdx].value}`);
                    log.printInfo(`更新最小值: arr[${j}]=${arr.items[j].value}`);
                }
            }
            if (minIdx !== i) {
                ctx.line(9);
                arr.swap(i, minIdx);
                log.printInfo(`交换 arr[${i}] ↔ arr[${minIdx}]`);
            }
            arr.highlight(minIdx, 'default');
            ctx.line(12);
            arr.markSorted(i);
        }
        if (n > 0) { ctx.line(12); arr.markSorted(n - 1); }
        ctx.line(14);
        arr.done();
        log.printSuccess('排序完成');
    }

    // ===== 插入排序 =====
    const insertionCode = `function insertionSort(arr) {
  const n = arr.length;
  for (let i = 1; i < n; i++) {
    const key = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key;
  }
  排序完成;
}`;
    function insertionRun(ctx, data) {
        const arr = ctx.add(new ArrayTracer('arr', data.slice()));
        const log = ctx.add(new LogTracer('log'));
        const n = data.length;
        ctx.line(1);
        arr.markSorted(0);
        for (let i = 1; i < n; i++) {
            ctx.line(3);
            const key = arr.items[i].value;
            arr.highlight(i, 'current', `key=${key}`);
            let j = i - 1;
            ctx.line(5);
            while (j >= 0) {
                ctx.line(5);
                arr.setPointer(j, 'j');
                // 比较 arr[j] 与 key（key 已保存；arr[i] 位置可能已被右移覆盖，不能作为比较对象）
                arr.items[j].state = 'compare';
                arr._commit({
                    type: 'compare',
                    payload: { indices: [j], key },
                    description: `比较 arr[${j}]=${arr.items[j].value} 与 key=${key}`,
                    highlight: [{ type: 'range', target: [Math.min(j, i), Math.max(j, i)], color: '#f78166' }]
                });
                if (arr.items[j].value <= key) {
                    arr.items[j].state = 'default';
                    break;
                }
                arr.items[j].state = 'default';
                ctx.line(6);
                const v = arr.items[j].value;
                arr.items[j + 1] = { value: v, state: 'swap' };
                arr._commit({
                    type: 'set',
                    payload: { index: j + 1, value: v },
                    description: `arr[${j+1}] = arr[${j}] = ${v}（右移）`
                });
                arr.items[j + 1].state = 'sorted';
                j--;
                ctx.line(5);
            }
            ctx.line(8);
            arr.items[j + 1] = { value: key, state: 'current' };
            arr._commit({
                type: 'set',
                payload: { index: j + 1, value: key },
                description: `arr[${j+1}] = ${key}（插入）`
            });
            arr.items[j + 1].state = 'sorted';
            log.printInfo(`插入 ${key} 于位置 ${j + 1}`);
        }
        ctx.line(10);
        arr.done();
        log.printSuccess('排序完成');
    }

    // ===== 快速排序（递归） =====
    const quickCode = `function quickSort(arr, lo, hi) {
  if (lo >= hi) return;
  const p = partition(arr, lo, hi);
  quickSort(arr, lo, p - 1);
  quickSort(arr, p + 1, hi);
}
function partition(arr, lo, hi) {
  const pivot = arr[hi];
  let i = lo - 1;
  for (let j = lo; j < hi; j++) {
    if (arr[j] < pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  [arr[i+1], arr[hi]] = [arr[hi], arr[i+1]];
  return i + 1;
}`;
    function quickRun(ctx, data) {
        const arr = ctx.add(new ArrayTracer('arr', data.slice()));
        const stack = ctx.add(new StackTracer('递归栈'));
        const log = ctx.add(new LogTracer('log'));

        function partition(lo, hi) {
            ctx.line(7);
            arr.highlight(hi, 'pivot', 'pivot');
            const pivot = arr.items[hi].value;
            log.printInfo(`选择 pivot = arr[${hi}] = ${pivot}`);
            let i = lo - 1;
            ctx.line(8);
            for (let j = lo; j < hi; j++) {
                ctx.line(9);
                arr.setPointer(j, 'j');
                arr.highlight(hi, 'pivot', 'pivot');
                if (arr.compare(j, hi) < 0) {
                    ctx.line(10);
                    i++;
                    if (i !== j) arr.swap(i, j);
                }
            }
            ctx.line(13);
            if (i + 1 !== hi) arr.swap(i + 1, hi);
            log.printSuccess(`pivot 就位于 arr[${i+1}]`);
            arr.highlight(hi, 'default');
            arr.markSorted(i + 1);
            return i + 1;
        }
        function qs(lo, hi) {
            // 栈操作辅助动画：进入递归帧时压入当前待处理子区间 [lo,hi]，
            // 退出时弹出，直观展示快速排序的隐式调用栈（分治子问题边界）。
            stack.push(`[${lo},${hi}]`);
            log.printInfo(`递归处理区间 [${lo}..${hi}]`);
            ctx.line(1);
            if (lo >= hi) {
                if (lo === hi && lo >= 0 && lo < arr.items.length) arr.markSorted(lo);
                stack.pop();
                return;
            }
            const p = partition(lo, hi);
            qs(lo, p - 1);
            qs(p + 1, hi);
            stack.pop();
        }
        qs(0, data.length - 1);
        ctx.line(2);
        arr.done();
        log.printSuccess('排序完成');
    }

    // ===== 归并排序（自顶向下） =====
    const mergeCode = `function mergeSort(arr, lo, hi) {
  if (lo >= hi) return;
  const mid = (lo + hi) >> 1;
  mergeSort(arr, lo, mid);
  mergeSort(arr, mid + 1, hi);
  merge(arr, lo, mid, hi);
}
function merge(arr, lo, mid, hi) {
  const tmp = [];
  let i = lo, j = mid + 1;
  while (i <= mid && j <= hi) {
    if (arr[i] <= arr[j]) tmp.push(arr[i++]);
    else tmp.push(arr[j++]);
  }
  while (i <= mid) tmp.push(arr[i++]);
  while (j <= hi) tmp.push(arr[j++]);
  for (let k = 0; k < tmp.length; k++) {
    arr[lo + k] = tmp[k];
  }
}`;
    function mergeRun(ctx, data) {
        const arr = ctx.add(new ArrayTracer('arr', data.slice()));
        const log = ctx.add(new LogTracer('log'));

        function merge(lo, mid, hi) {
            ctx.line(8);
            log.printInfo(`合并 [${lo}..${mid}] 与 [${mid+1}..${hi}]`);
            arr.highlightRange(lo, hi, '#58a6ff');
            const tmp = [];
            let i = lo, j = mid + 1;
            ctx.line(9);
            while (i <= mid && j <= hi) {
                ctx.line(10);
                arr.setPointers([
                    { index: i, label: 'i', color: '#58a6ff' },
                    { index: j, label: 'j', color: '#bc8cff' }
                ]);
                const cmp = arr.compare(i, j);
                if (cmp <= 0) {
                    tmp.push(arr.items[i].value);
                    ctx.line(11);
                    arr.highlight(i, 'current');
                    i++;
                } else {
                    tmp.push(arr.items[j].value);
                    ctx.line(12);
                    arr.highlight(j, 'current');
                    j++;
                }
            }
            ctx.line(14);
            while (i <= mid) { tmp.push(arr.items[i].value); arr.highlight(i, 'visited'); i++; }
            ctx.line(15);
            while (j <= hi) { tmp.push(arr.items[j].value); arr.highlight(j, 'visited'); j++; }
            ctx.line(16);
            for (let k = 0; k < tmp.length; k++) {
                arr.items[lo + k] = { value: tmp[k], state: 'current' };
                arr._commit({
                    type: 'set',
                    payload: { index: lo + k, value: tmp[k] },
                    description: `arr[${lo+k}] = ${tmp[k]}（回填）`
                });
                arr.items[lo + k].state = 'default';
            }
            log.printSuccess(`区间 [${lo}..${hi}] 已有序`);
        }
        function ms(lo, hi) {
            ctx.line(1);
            if (lo >= hi) return;
            ctx.line(2);
            const mid = (lo + hi) >> 1;
            ms(lo, mid);
            ms(mid + 1, hi);
            merge(lo, mid, hi);
        }
        ms(0, data.length - 1);
        ctx.line(2);
        arr.done();
        log.printSuccess('排序完成');
    }

    // ===== 堆排序 =====
    const heapCode = `function heapSort(arr) {
  const n = arr.length;
  // 建堆
  for (let i = (n >> 1) - 1; i >= 0; i--) {
    siftDown(arr, i, n);
  }
  // 排序
  for (let i = n - 1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]];
    siftDown(arr, 0, i);
  }
}
function siftDown(arr, i, n) {
  while (true) {
    let max = i;
    const l = 2 * i + 1, r = 2 * i + 2;
    if (l < n && arr[l] > arr[max]) max = l;
    if (r < n && arr[r] > arr[max]) max = r;
    if (max === i) break;
    [arr[i], arr[max]] = [arr[max], arr[i]];
    i = max;
  }
}`;
    function heapRun(ctx, data) {
        const arr = ctx.add(new ArrayTracer('arr', data.slice()));
        const log = ctx.add(new LogTracer('log'));
        const n = data.length;

        function siftDown(i, size) {
            ctx.line(11);
            while (true) {
                ctx.line(12);
                let max = i;
                const l = 2 * i + 1, r = 2 * i + 2;
                arr.setPointer(i, 'i');
                if (l < size) {
                    ctx.line(13);
                    if (arr.compare(l, max) > 0) max = l;
                }
                if (r < size) {
                    ctx.line(14);
                    if (arr.compare(r, max) > 0) max = r;
                }
                ctx.line(15);
                if (max === i) break;
                ctx.line(16);
                arr.swap(i, max);
                i = max;
            }
        }
        ctx.line(3);
        log.printInfo('阶段 1：建立最大堆');
        for (let i = (n >> 1) - 1; i >= 0; i--) {
            ctx.line(4);
            log.printInfo(`siftDown(${i})`);
            siftDown(i, n);
        }
        ctx.line(7);
        log.printSuccess('堆构建完成');
        log.printInfo('阶段 2：逐个提取最大值');
        for (let i = n - 1; i > 0; i--) {
            ctx.line(8);
            arr.swap(0, i);
            log.printInfo(`堆顶与 arr[${i}] 交换`);
            arr.markSorted(i);
            ctx.line(9);
            siftDown(0, i);
        }
        ctx.line(8);
        arr.markSorted(0);
        arr.done();
        log.printSuccess('排序完成');
    }

    // ===== 注册 =====
    const algos = [
        {
            id: 'sorting.bubble',
            name: '冒泡排序', category: 'sorting', level: 'P0',
            complexity: { time: 'O(n²)', space: 'O(1)' },
            keywords: ['bubble', 'mao pao'],
            mnemonic: '相邻比较逆则换，每轮最大沉底端',
            description: `<div class="desc-section">
                <h3>算法思想</h3>
                <p>比较相邻元素，如果顺序错误就交换。每轮把最大元素"冒泡"到末尾。</p>
                <h3>复杂度</h3>
                <table class="complexity-table"><tr><th>最好</th><th>平均</th><th>最坏</th><th>空间</th></tr>
                <tr><td>O(n)</td><td>O(n²)</td><td>O(n²)</td><td>O(1)</td></tr></table>
                <h3>稳定性</h3><p>稳定排序。相等的元素不会交换，相对位置保持不变。</p>
            </div>`,
            code: bubbleCode,
            defaultData: DEFAULT_DATA,
            dataParser: DATA_PARSER,
            run: bubbleRun
        },
        {
            id: 'sorting.selection',
            name: '选择排序', category: 'sorting', level: 'P0',
            complexity: { time: 'O(n²)', space: 'O(1)' },
            keywords: ['selection', 'xuanze'],
            mnemonic: '每轮扫描找最小，换到首位逐步排',
            description: `<div class="desc-section">
                <h3>算法思想</h3>
                <p>每轮在未排序区间中找到最小元素，与未排序起点交换。</p>
                <h3>复杂度</h3>
                <table class="complexity-table"><tr><th>最好</th><th>平均</th><th>最坏</th><th>空间</th></tr>
                <tr><td>O(n²)</td><td>O(n²)</td><td>O(n²)</td><td>O(1)</td></tr></table>
                <h3>稳定性</h3><p>不稳定。交换可能改变相等元素的相对顺序。</p>
            </div>`,
            code: selectionCode,
            defaultData: DEFAULT_DATA,
            dataParser: DATA_PARSER,
            run: selectionRun
        },
        {
            id: 'sorting.insertion',
            name: '插入排序', category: 'sorting', level: 'P0',
            complexity: { time: 'O(n²)', space: 'O(1)' },
            keywords: ['insertion', 'charu'],
            mnemonic: '逐个抽取往前插，已序部分保有序',
            description: `<div class="desc-section">
                <h3>算法思想</h3>
                <p>将每个元素插入到前面已排序部分的合适位置，类似整理扑克牌。</p>
                <h3>复杂度</h3>
                <table class="complexity-table"><tr><th>最好</th><th>平均</th><th>最坏</th><th>空间</th></tr>
                <tr><td>O(n)</td><td>O(n²)</td><td>O(n²)</td><td>O(1)</td></tr></table>
                <h3>稳定性</h3><p>稳定排序。</p>
            </div>`,
            code: insertionCode,
            defaultData: DEFAULT_DATA,
            dataParser: DATA_PARSER,
            run: insertionRun
        },
        {
            id: 'sorting.quick',
            name: '快速排序（递归）', category: 'sorting', level: 'P0',
            complexity: { time: 'O(n log n)', space: 'O(log n)' },
            keywords: ['quick', 'kuaisu', 'partition'],
            mnemonic: '选基准分左右，递归治之快如风',
            description: `<div class="desc-section">
                <h3>算法思想</h3>
                <p>选取 pivot 将数组分为两部分：小于 pivot 的在左、大于的在右，递归处理左右子区间。</p>
                <h3>复杂度</h3>
                <table class="complexity-table"><tr><th>最好</th><th>平均</th><th>最坏</th><th>空间</th></tr>
                <tr><td>O(n log n)</td><td>O(n log n)</td><td>O(n²)</td><td>O(log n)</td></tr></table>
                <h3>稳定性</h3><p>不稳定。</p>
            </div>`,
            code: quickCode,
            defaultData: DEFAULT_DATA,
            dataParser: DATA_PARSER,
            run: quickRun
        },
        {
            id: 'sorting.merge',
            name: '归并排序（自顶向下）', category: 'sorting', level: 'P0',
            complexity: { time: 'O(n log n)', space: 'O(n)' },
            keywords: ['merge', 'guibing'],
            mnemonic: '分治拆到单，两两归并保稳定',
            description: `<div class="desc-section">
                <h3>算法思想</h3>
                <p>分治：递归拆分到单元素，再两两归并形成有序数组。</p>
                <h3>复杂度</h3>
                <table class="complexity-table"><tr><th>最好</th><th>平均</th><th>最坏</th><th>空间</th></tr>
                <tr><td>O(n log n)</td><td>O(n log n)</td><td>O(n log n)</td><td>O(n)</td></tr></table>
                <h3>稳定性</h3><p>稳定排序。</p>
            </div>`,
            code: mergeCode,
            defaultData: DEFAULT_DATA,
            dataParser: DATA_PARSER,
            run: mergeRun
        },
        {
            id: 'sorting.heap',
            name: '堆排序', category: 'sorting', level: 'P0',
            complexity: { time: 'O(n log n)', space: 'O(1)' },
            keywords: ['heap', 'dui', 'siftdown'],
            mnemonic: '建大堆顶最大，换尾缩堆下沉',
            description: `<div class="desc-section">
                <h3>算法思想</h3>
                <p>先建立最大堆，然后将堆顶（最大值）与末尾交换，缩小堆并下沉恢复堆性质。</p>
                <h3>复杂度</h3>
                <table class="complexity-table"><tr><th>最好</th><th>平均</th><th>最坏</th><th>空间</th></tr>
                <tr><td>O(n log n)</td><td>O(n log n)</td><td>O(n log n)</td><td>O(1)</td></tr></table>
                <h3>稳定性</h3><p>不稳定。</p>
            </div>`,
            code: heapCode,
            defaultData: DEFAULT_DATA,
            dataParser: DATA_PARSER,
            run: heapRun,
            buildState: buildHeapState
        }
    ];

    algos.forEach(a => AlgorithmLoader.register(a.id, a));
})();
