/**
 * Store - 步骤序列存储与管理
 *
 * 负责存储算法执行过程中生成的所有步骤（steps），
 * 提供查询、追加、重置等基础能力。所有 Tracer 都通过 Store 记录步骤。
 */
(function (global) {
    'use strict';

    class Store {
        constructor() {
            this.reset();
        }

        reset() {
            this.steps = [];
            this.initialState = null; // 算法初始状态快照（用于 reset 重建）
            this.metadata = {};
        }

        /**
         * 设置初始状态（用于 Animator 重置时重建场景）
         * @param {object} state
         */
        setInitialState(state) {
            this.initialState = state;
        }

        setMetadata(meta) {
            this.metadata = Object.assign({}, this.metadata, meta);
        }

        /**
         * 追加一个步骤
         * @param {object} step - 见设计文档 Step Schema
         */
        push(step) {
            const fullStep = Object.assign({
                type: 'log',
                payload: {},
                description: '',
                codeLine: null,
                timestamp: Date.now(),
                highlight: []
            }, step);
            this.steps.push(fullStep);
            return fullStep;
        }

        get(index) {
            return this.steps[index];
        }

        getSteps() {
            return this.steps;
        }

        getTotal() {
            return this.steps.length;
        }

        /**
         * 截断到指定长度（用于回退后重新生成）
         */
        truncate(length) {
            if (length < this.steps.length) {
                this.steps.length = length;
            }
        }
    }

    global.Store = Store;
})(window);
