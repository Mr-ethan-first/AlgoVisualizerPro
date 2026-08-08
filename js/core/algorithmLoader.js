/**
 * AlgorithmLoader - 算法注册与加载
 *
 * 提供注册接口 register(id, def) 和查询接口。
 * 每个算法定义包含：
 *   {
 *     id, name, category, level, complexity,
 *     description, code, defaultData, dataParser,
 *     run(ctx, data)  // 在 TracerContext 上执行算法
 *   }
 *
 * 全局暴露 AlgorithmLoader.register(id, def)。
 */
(function (global) {
    'use strict';

    const CATEGORIES = {
        sorting:   { name: '排序算法',     icon: 'sort' },
        linear:    { name: '线性结构',     icon: 'list' },
        tree:      { name: '树结构与堆',   icon: 'tree' },
        graph:     { name: '图算法',       icon: 'graph' },
        string:    { name: '字符串算法',   icon: 'string' },
        classic:   { name: '经典问题',     icon: 'classic' },
        advanced:  { name: '进阶/分布式',  icon: 'advanced' }
    };

    const registry = new Map();
    const order = []; // 保持注册顺序

    const AlgorithmLoader = {
        CATEGORIES,

        register(id, def) {
            if (registry.has(id)) {
                console.warn('Algorithm already registered:', id);
                return;
            }
            registry.set(id, Object.assign({ id }, def));
            order.push(id);
        },

        get(id) { return registry.get(id); },
        has(id) { return registry.has(id); },
        list() { return order.map(id => registry.get(id)); },
        listByCategory() {
            const groups = {};
            for (const cat of Object.keys(CATEGORIES)) groups[cat] = [];
            for (const id of order) {
                const algo = registry.get(id);
                if (groups[algo.category]) groups[algo.category].push(algo);
            }
            return groups;
        },
        search(query) {
            if (!query) return this.list();
            const q = query.toLowerCase().trim();
            return this.list().filter(a =>
                a.name.toLowerCase().includes(q) ||
                a.id.toLowerCase().includes(q) ||
                (a.keywords || []).some(k => k.toLowerCase().includes(q))
            );
        },

        /**
         * 执行算法并返回步骤序列
         * @param {string} id
         * @param {any} data
         * @returns {{ steps, tracers }}
         */
        runAlgorithm(id, data) {
            const algo = this.get(id);
            if (!algo) throw new Error('Algorithm not found: ' + id);
            const ctx = new TracerContext();
            // 注入便捷方法
            ctx.line = function (n) { this._currentLine = n; return this; };
            algo.run(ctx, data);
            return {
                steps: ctx.store.getSteps(),
                tracers: ctx.tracers,
                store: ctx.store
            };
        },

        /**
         * 解析用户输入数据
         */
        parseData(id, str) {
            const algo = this.get(id);
            if (!algo) return null;
            if (algo.dataParser) return algo.dataParser(str);
            // 默认按逗号分隔数字
            if (!str) return algo.defaultData;
            return str.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        }
    };

    global.AlgorithmLoader = AlgorithmLoader;
})(window);
