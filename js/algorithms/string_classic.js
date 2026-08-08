/**
 * 字符串算法 P0 + 经典问题 P0
 * 字符串：KMP（构建 next + 匹配）、LCS
 * 经典：二分搜索、斐波那契（递归 + DP）、0-1 背包、N 皇后
 */
(function () {
    'use strict';

    // ===== KMP - 构建 next 数组 =====
    const kmpNextCode = `function buildNext(pattern) {
  const next = new Array(pattern.length).fill(0);
  let k = 0;
  for (let q = 1; q < pattern.length; q++) {
    while (k > 0 && pattern[k] !== pattern[q]) {
      k = next[k - 1];
    }
    if (pattern[k] === pattern[q]) k++;
    next[q] = k;
  }
  return next;
}`;
    function kmpNextRun(ctx) {
        const pattern = 'ABABCABAA';
        // 用字符数组的方式：用 ArrayTracer 但显示字符
        const arr = ctx.add(new ArrayTracer('array', pattern.split('').map(c => c.charCodeAt(0))));
        // 替换显示：直接重置 items 的 value 为字符
        arr.items = pattern.split('').map(c => ({ value: c, state: 'default' }));
        arr._commit({ type: 'init', payload: { pattern }, description: `模式串 = "${pattern}"` });
        const next = new Array(pattern.length).fill(0);
        const nextTracer = ctx.add(new ArrayTracer('nextArr', next));
        nextTracer.items = next.map(v => ({ value: 0, state: 'default' }));
        nextTracer._commit({ type: 'init', payload: {}, description: 'next 数组初始化为 0' });

        const log = ctx.add(new LogTracer('log'));
        let k = 0;
        ctx.line(2);
        ctx.line(3);
        for (let q = 1; q < pattern.length; q++) {
            ctx.line(4);
            arr.setPointers([
                { index: k, label: 'k', color: '#58a6ff' },
                { index: q, label: 'q', color: '#bc8cff' }
            ]);
            while (k > 0 && pattern[k] !== pattern[q]) {
                ctx.line(5);
                log.printInfo(`pattern[${k}]='${pattern[k]}' ≠ pattern[${q}]='${pattern[q]}'，k = next[${k-1}] = ${next[k-1]}`);
                k = next[k - 1];
            }
            ctx.line(7);
            if (pattern[k] === pattern[q]) {
                ctx.line(8);
                k++;
                log.printSuccess(`pattern[${k-1}]='${pattern[k-1]}' === pattern[${q}]='${pattern[q]}'，k++ → ${k}`);
            }
            ctx.line(9);
            next[q] = k;
            nextTracer.items[q] = { value: k, state: 'sorted' };
            nextTracer._commit({
                type: 'set',
                payload: { index: q, value: k },
                description: `next[${q}] = ${k}`
            });
            nextTracer.items[q].state = 'default';
        }
        log.printSuccess(`next 数组: [${next.join(', ')}]`);
        nextTracer.done();
    }

    // ===== KMP - 主串匹配 =====
    const kmpMatchCode = `function kmpSearch(text, pattern, next) {
  let i = 0, j = 0;
  while (i < text.length && j < pattern.length) {
    if (text[i] === pattern[j]) {
      i++; j++;
    } else if (j > 0) {
      j = next[j - 1];
    } else {
      i++;
    }
  }
  return j === pattern.length ? i - j : -1;
}`;
    function kmpMatchRun(ctx) {
        const text = 'ABABDABABCABAA';
        const pattern = 'ABABCABAA';
        // 计算 next
        const next = new Array(pattern.length).fill(0);
        let k = 0;
        for (let q = 1; q < pattern.length; q++) {
            while (k > 0 && pattern[k] !== pattern[q]) k = next[k - 1];
            if (pattern[k] === pattern[q]) k++;
            next[q] = k;
        }

        const textArr = ctx.add(new ArrayTracer('array', text.split('')));
        textArr.items = text.split('').map(c => ({ value: c, state: 'default' }));
        textArr._commit({ type: 'init', payload: { text }, description: `主串 = "${text}"` });
        const patArr = ctx.add(new ArrayTracer('pattern', pattern.split('')));
        patArr.items = pattern.split('').map(c => ({ value: c, state: 'default' }));
        patArr._commit({ type: 'init', payload: { pattern }, description: `模式串 = "${pattern}"` });
        const log = ctx.add(new LogTracer('log'));
        log.printInfo(`next = [${next.join(', ')}]`);

        let i = 0, j = 0;
        ctx.line(2);
        while (i < text.length && j < pattern.length) {
            ctx.line(3);
            textArr.setPointer(i, 'i');
            patArr.setPointer(j, 'j');
            if (text[i] === pattern[j]) {
                ctx.line(4);
                textArr.items[i].state = 'sorted';
                patArr.items[j].state = 'sorted';
                textArr._commit({ type: 'compare', payload: { i, j }, description: `text[${i}]='${text[i]}' === pattern[${j}]='${pattern[j]}' → 匹配` });
                i++; j++;
            } else if (j > 0) {
                ctx.line(5);
                ctx.line(6);
                log.printWarning(`text[${i}]='${text[i]}' ≠ pattern[${j}]='${pattern[j]}'，j = next[${j-1}] = ${next[j-1]}`);
                // 清除模式串的高亮
                for (let p = 0; p < patArr.items.length; p++) patArr.items[p].state = 'default';
                j = next[j - 1];
                textArr._commit({ type: 'snapshot', payload: {}, description: `模式串右移，j 跳到 ${j}` });
            } else {
                ctx.line(7);
                ctx.line(8);
                log.printWarning(`text[${i}]='${text[i]}' ≠ pattern[${j}]='${pattern[j]}'，j=0，i++`);
                i++;
            }
        }
        if (j === pattern.length) {
            ctx.line(11);
            log.printSuccess(`匹配成功！位置 = ${i - j}`);
        } else {
            log.printError('未匹配');
        }
    }

    // ===== LCS 最长公共子序列 =====
    const lcsCode = `function lcs(s1, s2) {
  const m = s1.length, n = s2.length;
  const dp = Array.from({length: m+1}, () => new Array(n+1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i-1] === s2[j-1]) {
        dp[i][j] = dp[i-1][j-1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
      }
    }
  }
  // 回溯
  let i = m, j = n;
  const result = [];
  while (i > 0 && j > 0) {
    if (s1[i-1] === s2[j-1]) { result.unshift(s1[i-1]); i--; j--; }
    else if (dp[i-1][j] > dp[i][j-1]) i--;
    else j--;
  }
  return result.join('');
}`;
    function lcsRun(ctx) {
        const s1 = 'ABCBDAB';
        const s2 = 'BDCAB';
        const m = s1.length, n = s2.length;
        const dp = ctx.add(new DPTableTracer('dptable', m + 1, n + 1, 0));
        dp.setRowLabels(['ε', ...s1.split('')]);
        dp.setColLabels(['ε', ...s2.split('')]);
        const log = ctx.add(new LogTracer('log'));
        log.printInfo(`s1 = "${s1}", s2 = "${s2}"`);

        ctx.line(3);
        const dpVal = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        ctx.line(4);
        for (let i = 1; i <= m; i++) {
            ctx.line(5);
            for (let j = 1; j <= n; j++) {
                ctx.line(6);
                dp.highlight(i, j, 'current');
                if (s1[i - 1] === s2[j - 1]) {
                    ctx.line(7);
                    dpVal[i][j] = dpVal[i - 1][j - 1] + 1;
                    dp.set(i, j, dpVal[i][j], `s1[${i-1}]=${s1[i-1]} = s2[${j-1}]=${s2[j-1]}，dp[${i}][${j}] = dp[${i-1}][${j-1}] + 1 = ${dpVal[i][j]}`);
                    log.printSuccess(`'${s1[i-1]}' 匹配，dp[${i}][${j}] = ${dpVal[i][j]}`);
                } else {
                    ctx.line(8);
                    ctx.line(9);
                    dpVal[i][j] = Math.max(dpVal[i - 1][j], dpVal[i][j - 1]);
                    dp.set(i, j, dpVal[i][j], `s1[${i-1}]=${s1[i-1]} ≠ s2[${j-1}]=${s2[j-1]}，dp[${i}][${j}] = max(${dpVal[i-1][j]}, ${dpVal[i][j-1]}) = ${dpVal[i][j]}`);
                }
            }
        }
        // 回溯
        ctx.line(13);
        log.printInfo(`回溯寻找 LCS`);
        let i = m, j = n;
        const path = [];
        const result = [];
        while (i > 0 && j > 0) {
            ctx.line(14);
            if (s1[i - 1] === s2[j - 1]) {
                ctx.line(15);
                path.push([i, j]);
                result.unshift(s1[i - 1]);
                dp.highlight(i, j, 'sorted', `加入 ${s1[i-1]}`);
                i--; j--;
            } else if (dpVal[i - 1][j] > dpVal[i][j - 1]) {
                ctx.line(16);
                i--;
            } else {
                ctx.line(17);
                j--;
            }
        }
        dp.markPath(path);
        log.printSuccess(`LCS = "${result.join('')}"，长度 = ${dpVal[m][n]}`);
    }

    // ===== 二分搜索 =====
    const binarySearchCode = `function binarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`;
    function binarySearchRun(ctx, data) {
        const init = (data.length ? data : [1, 3, 5, 7, 9, 11, 13, 15, 17, 19]).slice().sort((a, b) => a - b);
        const arr = ctx.add(new ArrayTracer('array', init));
        const log = ctx.add(new LogTracer('log'));
        const target = init[Math.floor(init.length * 0.7)];
        log.printInfo(`查找目标 = ${target}`);
        let lo = 0, hi = arr.items.length - 1;
        ctx.line(2);
        while (lo <= hi) {
            ctx.line(3);
            const mid = (lo + hi) >> 1;
            arr.highlightRange(lo, hi, '#58a6ff');
            arr.setPointer(mid, 'mid');
            log.printInfo(`lo=${lo}, hi=${hi}, mid=${mid}`);
            ctx.line(4);
            const cmp = arr.compare(mid, mid); // 仅用于高亮
            arr.items[mid].state = 'pivot';
            arr._commit({
                type: 'snapshot',
                payload: {},
                description: `arr[${mid}] = ${arr.items[mid].value}`
            });
            if (arr.items[mid].value === target) {
                ctx.line(5);
                arr.highlight(mid, 'sorted', `找到 ${target}`);
                log.printSuccess(`找到 ${target}，位置 = ${mid}`);
                return;
            } else if (arr.items[mid].value < target) {
                ctx.line(6);
                ctx.line(7);
                lo = mid + 1;
                log.printInfo(`${arr.items[mid].value} < ${target}，向右找`);
            } else {
                ctx.line(8);
                hi = mid - 1;
                log.printInfo(`${arr.items[mid].value} > ${target}，向左找`);
            }
            arr.items[mid].state = 'default';
            ctx.line(3);
        }
        log.printError(`未找到 ${target}`);
    }

    // ===== 斐波那契 - 原始递归 =====
    const fibRecCode = `function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}`;
    function fibRecRun(ctx, data) {
        const n = data.length ? data[0] : 5;
        const arr = ctx.add(new ArrayTracer('array', new Array(n + 1).fill(0).map((_, i) => i)));
        arr.items = new Array(n + 1).fill(null).map((_, i) => ({ value: `fib(${i})`, state: 'default' }));
        arr._commit({ type: 'init', payload: { n }, description: `计算 fib(${n})` });
        const log = ctx.add(new LogTracer('log'));
        let callCount = 0;
        function fib(k) {
            ctx.line(1);
            callCount++;
            arr.highlight(k, 'current', `fib(${k})`);
            if (k <= 1) {
                ctx.line(2);
                arr.highlight(k, 'sorted', `=${k}`);
                log.printInfo(`fib(${k}) = ${k}（基准）`);
                return k;
            }
            ctx.line(3);
            log.printWarning(`fib(${k}) 递归调用 fib(${k-1})`);
            const a = fib(k - 1);
            log.printWarning(`fib(${k}) 递归调用 fib(${k-2})`);
            const b = fib(k - 2);
            arr.highlight(k, 'visited', `=${a}+${b}`);
            log.printInfo(`fib(${k}) = fib(${k-1}) + fib(${k-2}) = ${a} + ${b} = ${a + b}`);
            arr.items[k] = { value: a + b, state: 'sorted' };
            arr._commit({
                type: 'set',
                payload: { index: k, value: a + b },
                description: `fib(${k}) = ${a + b}`
            });
            return a + b;
        }
        const result = fib(n);
        log.printSuccess(`fib(${n}) = ${result}，共调用 ${callCount} 次（含大量重复计算）`);
    }

    // ===== 斐波那契 - DP =====
    const fibDpCode = `function fibDP(n) {
  const dp = new Array(n + 1);
  dp[0] = 0; dp[1] = 1;
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i-1] + dp[i-2];
  }
  return dp[n];
}`;
    function fibDpRun(ctx, data) {
        const n = data.length ? data[0] : 10;
        const arr = ctx.add(new ArrayTracer('array', new Array(n + 1).fill(0)));
        const log = ctx.add(new LogTracer('log'));
        log.printInfo(`计算 fib(${n})（自底向上 DP）`);
        ctx.line(2);
        arr.items[0] = { value: 0, state: 'sorted' };
        arr._commit({ type: 'set', payload: { index: 0, value: 0 }, description: 'dp[0] = 0' });
        if (n >= 1) {
            arr.items[1] = { value: 1, state: 'sorted' };
            arr._commit({ type: 'set', payload: { index: 1, value: 1 }, description: 'dp[1] = 1' });
        }
        ctx.line(3);
        for (let i = 2; i <= n; i++) {
            ctx.line(4);
            arr.setPointers([
                { index: i - 1, label: 'i-1', color: '#58a6ff' },
                { index: i - 2, label: 'i-2', color: '#bc8cff' }
            ]);
            const v = arr.items[i - 1].value + arr.items[i - 2].value;
            arr.items[i] = { value: v, state: 'current' };
            arr._commit({
                type: 'set',
                payload: { index: i, value: v },
                description: `dp[${i}] = dp[${i-1}] + dp[${i-2}] = ${arr.items[i-1].value} + ${arr.items[i-2].value} = ${v}`
            });
            arr.items[i].state = 'sorted';
        }
        arr.done();
        log.printSuccess(`fib(${n}) = ${arr.items[n].value}，仅 ${n + 1} 次计算`);
    }

    // ===== 0-1 背包 =====
    const knapsackCode = `function knapsack(W, weights, values) {
  const n = weights.length;
  const dp = Array.from({length: n+1}, () => new Array(W+1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let w = 1; w <= W; w++) {
      if (weights[i-1] <= w) {
        dp[i][w] = Math.max(
          dp[i-1][w],
          dp[i-1][w - weights[i-1]] + values[i-1]
        );
      } else {
        dp[i][w] = dp[i-1][w];
      }
    }
  }
  return dp[n][W];
}`;
    function knapsackRun(ctx) {
        const weights = [2, 3, 4, 5];
        const values = [3, 4, 5, 6];
        const W = 8;
        const n = weights.length;
        const dp = ctx.add(new DPTableTracer('dptable', n + 1, W + 1, 0));
        dp.setRowLabels(['无', ...weights.map((w, i) => `w=${w},v=${values[i]}`)]);
        dp.setColLabels(Array.from({ length: W + 1 }, (_, i) => `W=${i}`));
        const log = ctx.add(new LogTracer('log'));
        log.printInfo(`物品 weights=${JSON.stringify(weights)}, values=${JSON.stringify(values)}, 容量 W=${W}`);

        const dpVal = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));
        ctx.line(3);
        for (let i = 1; i <= n; i++) {
            ctx.line(4);
            for (let w = 1; w <= W; w++) {
                ctx.line(5);
                dp.highlight(i, w, 'current');
                if (weights[i - 1] <= w) {
                    ctx.line(6);
                    ctx.line(7);
                    ctx.line(8);
                    ctx.line(9);
                    const take = dpVal[i - 1][w - weights[i - 1]] + values[i - 1];
                    const notTake = dpVal[i - 1][w];
                    dpVal[i][w] = Math.max(notTake, take);
                    dp.set(i, w, dpVal[i][w], `不放=${notTake}, 放=${take} → max=${dpVal[i][w]}`);
                } else {
                    ctx.line(11);
                    ctx.line(12);
                    dpVal[i][w] = dpVal[i - 1][w];
                    dp.set(i, w, dpVal[i][w], `w${weights[i-1]} > ${w}，只能不放`);
                }
            }
        }
        log.printSuccess(`最大价值 = ${dpVal[n][W]}`);
        // 回溯
        let i = n, w = W;
        const path = [];
        const chosen = [];
        while (i > 0 && w > 0) {
            if (dpVal[i][w] !== dpVal[i - 1][w]) {
                path.push([i, w]);
                chosen.unshift(i - 1);
                w -= weights[i - 1];
            }
            i--;
        }
        dp.markPath(path, `选中物品: ${chosen.map(idx => `#${idx}`).join(', ')}`);
        log.printSuccess(`选择物品: ${chosen.map(idx => `(w=${weights[idx]},v=${values[idx]})`).join(' + ')} = ${dpVal[n][W]}`);
    }

    // ===== N 皇后 =====
    const nqueensCode = `function solveNQueens(n) {
  const board = new Array(n).fill(0).map(() => new Array(n).fill('.'));
  const result = [];
  function backtrack(row) {
    if (row === n) { result.push(board.map(r => r.join('')).slice()); return; }
    for (let col = 0; col < n; col++) {
      if (isValid(row, col)) {
        board[row][col] = 'Q';
        backtrack(row + 1);
        board[row][col] = '.';
      }
    }
  }
  function isValid(row, col) {
    for (let i = 0; i < row; i++) {
      if (board[i][col] === 'Q') return false;
      if (col - (row - i) >= 0 && board[i][col - (row - i)] === 'Q') return false;
      if (col + (row - i) < n && board[i][col + (row - i)] === 'Q') return false;
    }
    return true;
  }
  backtrack(0);
  return result;
}`;
    function nqueensRun(ctx, data) {
        const n = data.length ? data[0] : 4;
        const cb = ctx.add(new ChessBoardTracer('chessboard', n));
        const log = ctx.add(new LogTracer('log'));
        let solutionCount = 0;
        let attemptCount = 0;
        function isValid(row, col) {
            for (let i = 0; i < row; i++) {
                if (cb.board[i][col].value === 1) return false;
                if (col - (row - i) >= 0 && cb.board[i][col - (row - i)].value === 1) return false;
                if (col + (row - i) < n && cb.board[i][col + (row - i)].value === 1) return false;
            }
            return true;
        }
        function backtrack(row) {
            ctx.line(4);
            if (row === n) {
                ctx.line(5);
                solutionCount++;
                const positions = [];
                for (let r = 0; r < n; r++) {
                    for (let c = 0; c < n; c++) {
                        if (cb.board[r][c].value === 1) positions.push([r, c]);
                    }
                }
                cb.markSolution(positions, `找到解 #${solutionCount}`);
                log.printSuccess(`找到解 #${solutionCount}`);
                return;
            }
            ctx.line(6);
            for (let col = 0; col < n; col++) {
                ctx.line(7);
                attemptCount++;
                if (isValid(row, col)) {
                    ctx.line(8);
                    cb.place(row, col, 1, `(${row}, ${col}) 放置皇后`);
                    log.printInfo(`放置第 ${row+1} 行皇后到列 ${col}`);
                    ctx.line(9);
                    backtrack(row + 1);
                    ctx.line(10);
                    cb.remove(row, col, `撤销 (${row}, ${col})，回溯`);
                    log.printWarning(`撤销第 ${row+1} 行列 ${col}，回溯`);
                }
            }
        }
        backtrack(0);
        log.printSuccess(`共找到 ${solutionCount} 个解（尝试 ${attemptCount} 次）`);
    }

    // ===== 注册 =====
    const algos = [
        {
            id: 'string.kmpNext',
            name: 'KMP - 构建 next 数组', category: 'string', level: 'P0',
            complexity: { time: 'O(m)', space: 'O(m)' },
            keywords: ['kmp', 'next', 'pattern'],
            mnemonic: '前缀自比最长相配，失配跳跃不回退',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>构建部分匹配表（next 数组），利用已匹配前缀信息，避免主串指针回退。</p>
                <h3>复杂度</h3><p>构建 next: O(m)；匹配: O(n)</p>
            </div>`,
            code: kmpNextCode,
            run: kmpNextRun
        },
        {
            id: 'string.kmpMatch',
            name: 'KMP - 主串匹配', category: 'string', level: 'P0',
            complexity: { time: 'O(n+m)', space: 'O(m)' },
            keywords: ['kmp', 'match', 'search'],
            mnemonic: '失配查next跳转，主串指针永不退',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>利用 next 数组在失配时跳过重复比较，主指针 i 不回退，时间复杂度 O(n)。</p>
            </div>`,
            code: kmpMatchCode,
            run: kmpMatchRun
        },
        {
            id: 'string.lcs',
            name: '最长公共子序列 (LCS)', category: 'string', level: 'P0',
            complexity: { time: 'O(nm)', space: 'O(nm)' },
            keywords: ['lcs', 'longest common subsequence', 'dp'],
            mnemonic: '相等加一斜对角，不等取上左较大',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>动态规划：dp[i][j] = s1[0..i-1] 与 s2[0..j-1] 的 LCS 长度。</p>
                <h3>状态转移</h3>
                <ul>
                    <li>s1[i-1] = s2[j-1]: dp[i][j] = dp[i-1][j-1] + 1</li>
                    <li>否则: dp[i][j] = max(dp[i-1][j], dp[i][j-1])</li>
                </ul>
            </div>`,
            code: lcsCode,
            run: lcsRun
        },
        {
            id: 'classic.binarySearch',
            name: '二分搜索', category: 'classic', level: 'P0',
            complexity: { time: 'O(log n)', space: 'O(1)' },
            keywords: ['binary search', 'er fen', 'search'],
            mnemonic: '有序折半查中点，左右缩区定目标',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>每次比较中点元素，将搜索区间减半。要求序列有序。</p>
                <h3>复杂度</h3><p>时间 O(log n)，空间 O(1)</p>
            </div>`,
            code: binarySearchCode,
            defaultData: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19],
            dataParser: (s) => s.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n)).sort((a,b)=>a-b),
            run: binarySearchRun
        },
        {
            id: 'classic.fibRec',
            name: '斐波那契 - 原始递归', category: 'classic', level: 'P0',
            complexity: { time: 'O(2ⁿ)', space: 'O(n)' },
            keywords: ['fibonacci', 'recursion'],
            mnemonic: '递归两支同调用，指数爆炸重算多',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>直接按定义递归：fib(n) = fib(n-1) + fib(n-2)。存在大量重复子问题。</p>
                <h3>复杂度</h3><p>时间 O(2ⁿ) 指数级，空间 O(n) 递归栈</p>
            </div>`,
            code: fibRecCode,
            defaultData: [5],
            dataParser: (s) => [Math.min(10, parseInt(s.split(',')[0], 10) || 5)],
            run: fibRecRun
        },
        {
            id: 'classic.fibDp',
            name: '斐波那契 - DP 优化', category: 'classic', level: 'P0',
            complexity: { time: 'O(n)', space: 'O(n)' },
            keywords: ['fibonacci', 'dp', 'dynamic programming'],
            mnemonic: '自底向上填表，每算一次免重复',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>自底向上填表，避免重复计算。每个子问题只算一次。</p>
                <h3>复杂度</h3><p>时间 O(n)，空间 O(n)（可优化为 O(1)）</p>
            </div>`,
            code: fibDpCode,
            defaultData: [10],
            dataParser: (s) => [parseInt(s.split(',')[0], 10) || 10],
            run: fibDpRun
        },
        {
            id: 'classic.knapsack',
            name: '0-1 背包 (DP)', category: 'classic', level: 'P0',
            complexity: { time: 'O(nW)', space: 'O(nW)' },
            keywords: ['knapsack', 'backpack', 'dp'],
            mnemonic: '选或不选取最大，容量倒推防重用',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>dp[i][w] = 前 i 件物品在容量 w 下的最大价值。</p>
                <h3>状态转移</h3>
                <ul>
                    <li>不放第 i 件: dp[i][w] = dp[i-1][w]</li>
                    <li>放第 i 件: dp[i][w] = dp[i-1][w - weights[i-1]] + values[i-1]</li>
                    <li>取两者最大值</li>
                </ul>
            </div>`,
            code: knapsackCode,
            run: knapsackRun
        },
        {
            id: 'classic.nqueens',
            name: 'N 皇后', category: 'classic', level: 'P0',
            complexity: { time: 'O(n!)', space: 'O(n²)' },
            keywords: ['nqueens', 'backtrack', 'hu su'],
            mnemonic: '逐行试列查冲突，合法递归非法退',
            description: `<div class="desc-section">
                <h3>核心思想</h3><p>回溯：逐行放置皇后，每行尝试每一列，合法则递归下一行，否则撤销回溯。</p>
                <h3>复杂度</h3><p>时间 O(n!)，最坏需枚举所有排列</p>
            </div>`,
            code: nqueensCode,
            defaultData: [4],
            dataParser: (s) => [Math.min(8, Math.max(4, parseInt(s.split(',')[0], 10) || 4))],
            run: nqueensRun
        }
    ];

    algos.forEach(a => AlgorithmLoader.register(a.id, a));
})();
