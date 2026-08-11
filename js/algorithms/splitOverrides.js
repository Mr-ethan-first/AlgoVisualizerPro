/**
 * 左右分框覆盖层：在全部算法注册完成后，给“同时含两种主结构、且会相互重叠”的算法
 * 挂载通用 buildSplitState（图/树 + 数组/DP表 → 左框 + 右框各展示一个）。
 * - 仅作用于默认构建器会重叠的算法；已有自定义 buildState（堆 buildHeapState、
 *   符号图 buildSymbolState、基数排序 buildRadixSortState 等）或无法干净拆分的，
 *   因下方 `!algo.buildState` 守卫而自动跳过，绝不覆盖、不丢数据。
 */
(function () {
    'use strict';
    if (!window.AlgorithmLoader || !window.StateBuilders || !StateBuilders.buildSplitState) return;

    var SPLIT_IDS = [
        'advanced.raftLog',
        'graph.assignment',
        'graph.bellmanFord',
        'graph.bipartiteX',
        'graph.boruvka',
        'graph.dfsOrder',
        'graph.dijkstraAll',
        'graph.dirEulerCycle',
        'graph.dirEulerPath',
        'graph.eulerCycle',
        'graph.maxflow',
        'graph.topoX',
        'graph.transClosure',
        'graph.zeroSum',
        'math.fft',
        'math.gaussElim',
        'math.gaussJordan',
        'math.linProg',
        'search.indexMaxPQ',
        'search.indexMinPQ',
        'string.hash'
    ];

    var attached = [];
    for (var i = 0; i < SPLIT_IDS.length; i++) {
        var id = SPLIT_IDS[i];
        var algo = AlgorithmLoader.get(id);
        if (algo && !algo.buildState) {
            algo.buildState = StateBuilders.buildSplitState;
            attached.push(id);
        }
    }
    // 便于调试：在控制台记录实际挂载数量
    if (typeof console !== 'undefined' && console.log) {
        console.log('[splitOverrides] 已挂载左右分框构建器：' + attached.length + ' 个', attached);
    }
})();
