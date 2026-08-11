/**
 * Animator - 动画控制器
 *
 * 负责按步骤序列回放算法：
 *   - play / pause / stepForward / stepBackward / goToStep / reset
 *   - 速度控制（0.25x ~ 4x）
 *   - 每步触发回调以更新 UI（描述、代码高亮、日志）
 *   - 调用 Renderer.renderFrame(state) 重绘画面
 */
(function (global) {
    'use strict';

    const SPEED_PRESETS = [0.25, 0.5, 1, 1.5, 2, 4];
    const BASE_INTERVAL = 700; // 1x 速度下每步的毫秒数

    class Animator {
        constructor(renderer, options = {}) {
            this.renderer = renderer;
            this.steps = [];
            this.currentStep = -1; // -1 = 初始状态（未开始）
            this.playing = false;
            this.speed = options.speed || 1;
            this._timer = null;
            this._buildState = options.buildState || null; // 自定义状态构建器
            this._lastRenderState = null;

            // 事件回调
            this._onStep = [];
            this._onFinish = [];
            this._onReset = [];
            this._onPlay = [];
            this._onPause = [];
        }

        // ===== 加载算法步骤序列 =====
        loadSteps(steps) {
            this.pause();
            this.steps = steps || [];
            this.currentStep = -1;
            this._renderCurrent();
            this._notify('step', this._buildStepInfo());
        }

        // ===== 播放控制 =====
        play() {
            if (this.playing) return;
            if (this.currentStep >= this.steps.length - 1) {
                // 已到末尾，从头开始
                this.currentStep = -1;
            }
            this.playing = true;
            this._notify('play');
            this._scheduleNext();
        }

        pause() {
            if (!this.playing) return;
            this.playing = false;
            if (this._timer) {
                clearTimeout(this._timer);
                this._timer = null;
            }
            this._notify('pause');
        }

        togglePlay() {
            if (this.playing) this.pause();
            else this.play();
        }

        stepForward() {
            if (this.currentStep < this.steps.length - 1) {
                this.pause();
                this.currentStep++;
                this._renderCurrent();
                this._notify('step', this._buildStepInfo());
                if (this.currentStep === this.steps.length - 1) {
                    this._notify('finish');
                }
            }
        }

        stepBackward() {
            if (this.currentStep >= 0) {
                this.pause();
                this.currentStep--;
                this._renderCurrent();
                this._notify('step', this._buildStepInfo());
            }
        }

        goToStep(index) {
            this.pause();
            this.currentStep = Math.max(-1, Math.min(this.steps.length - 1, index));
            this._renderCurrent();
            this._notify('step', this._buildStepInfo());
            if (this.currentStep === this.steps.length - 1) {
                this._notify('finish');
            }
        }

        reset() {
            this.pause();
            this.currentStep = -1;
            this._renderCurrent();
            this._notify('step', this._buildStepInfo());
            this._notify('reset');
        }

        jumpToStart() { this.goToStep(-1); }
        jumpToEnd() { this.goToStep(this.steps.length - 1); }

        // ===== 速度控制 =====
        setSpeed(factor) {
            this.speed = factor;
            if (this.playing) {
                if (this._timer) clearTimeout(this._timer);
                this._scheduleNext();
            }
        }
        getSpeed() { return this.speed; }

        // ===== 状态查询 =====
        getCurrentStep() { return this.currentStep; }
        getTotalSteps() { return this.steps.length; }
        isPlaying() { return this.playing; }
        isFinished() { return this.currentStep >= this.steps.length - 1 && this.steps.length > 0; }
        isAtStart() { return this.currentStep <= -1; }
        canStepForward() { return this.currentStep < this.steps.length - 1; }
        canStepBackward() { return this.currentStep >= 0; }

        // ===== 事件订阅 =====
        onStep(cb) { this._onStep.push(cb); return this; }
        onFinish(cb) { this._onFinish.push(cb); return this; }
        onReset(cb) { this._onReset.push(cb); return this; }
        onPlay(cb) { this._onPlay.push(cb); return this; }
        onPause(cb) { this._onPause.push(cb); return this; }

        // ===== 内部实现 =====
        _scheduleNext() {
            if (!this.playing) return;
            if (this.currentStep >= this.steps.length - 1) {
                this.playing = false;
                this._notify('finish');
                return;
            }
            const step = this.steps[this.currentStep + 1] || {};
            // 不同类型步骤的间隔不同
            const interval = this._stepInterval(step) / this.speed;
            this._timer = setTimeout(() => {
                if (!this.playing) return;
                this.currentStep++;
                this._renderCurrent();
                this._notify('step', this._buildStepInfo());
                if (this.currentStep >= this.steps.length - 1) {
                    this.playing = false;
                    this._notify('finish');
                } else {
                    this._scheduleNext();
                }
            }, Math.max(40, interval));
        }

        _stepInterval(step) {
            switch (step.type) {
                case 'init': return 400;
                case 'done': return 600;
                case 'compare': return BASE_INTERVAL * 0.8;
                case 'swap': return BASE_INTERVAL * 0.7;
                case 'visit': return BASE_INTERVAL * 0.9;
                case 'rotate': return BASE_INTERVAL * 1.2;
                case 'log': return BASE_INTERVAL * 0.5;
                case 'snapshot': return BASE_INTERVAL * 1.0;
                default: return BASE_INTERVAL * 0.7;
            }
        }

        _renderCurrent() {
            // 收集截至当前步的所有 Tracer 快照
            const tracerStates = {};
            for (let i = 0; i <= this.currentStep; i++) {
                const step = this.steps[i];
                if (step && step.state) {
                    Object.assign(tracerStates, step.state);
                }
            }
            // 调用算法自定义状态构建器
            const ctxInfo = { width: this.renderer.width, height: this.renderer.height };
            let renderState = null;
            if (this._buildState) {
                renderState = this._buildState(tracerStates, this.currentStep >= 0 ? this.steps[this.currentStep] : null, ctxInfo);
            } else {
                renderState = this._defaultStateBuilder(tracerStates, null, ctxInfo);
            }
            this._lastRenderState = renderState;
            this.renderer.renderFrame(renderState);
        }

        // ===== 内容驱动画布高度（自适应动画实际高度） =====
        _buildStateForStep(i) {
            const tracerStates = {};
            for (let k = 0; k <= i; k++) {
                const s = this.steps[k];
                if (s && s.state) Object.assign(tracerStates, s.state);
            }
            const ctxInfo = { width: this.renderer.width, height: this.renderer.height };
            const step = i >= 0 ? this.steps[i] : null;
            return this._buildState
                ? this._buildState(tracerStates, step, ctxInfo)
                : this._defaultStateBuilder(tracerStates, step, ctxInfo);
        }

        // 计算一个渲染状态的垂直/水平包围盒（用于测量动画实际高度）
        _measureBounds(state) {
            if (!state) return null;
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            const acc = (x1, y1, x2, y2) => {
                if (x1 < minX) minX = x1;
                if (x2 > maxX) maxX = x2;
                if (y1 < minY) minY = y1;
                if (y2 > maxY) maxY = y2;
            };
            if (state.title) acc(0, 8, 0, 30);
            if (state.array) {
                const o = state.array.options || {};
                const top = (o.y || 80) - ((o.indexPosition === 'top' && o.showIndex) ? 24 : 30);
                let bot = (o.y || 80) + (o.cellH || 48) + (o.showIndex && o.indexPosition !== 'top' ? 18 : 0);
                if (o.below) {
                    // 与 drawPointer(below 模式) 实际绘制长度完全一致，避免底部留白 / 裁切
                    const scale = Math.max(0.6, Math.min(2.5, ((o.cellW || 48) + (o.cellH || 48)) / 2 / 48));
                    bot += (o.belowOffset || 0) + 30 * scale + 28;
                }
                acc(0, top, 0, bot);
            }
            (state.shapes || []).forEach(s => {
                if (s.kind === 'rect') acc(s.x, s.y, s.x + s.w, s.y + s.h);
                else if (s.kind === 'circle') { const r = s.r || 0; acc(s.x - r, s.y - r, s.x + r, s.y + r); }
                else if (s.kind === 'text') { const f = s.fontSize || 14; const w = (s.text ? String(s.text).length : 1) * f * 0.6; acc(s.x - w, s.y - f / 2, s.x + w, s.y + f / 2); }
                else if (s.kind === 'line' || s.kind === 'arrow') acc(Math.min(s.x1, s.x2), Math.min(s.y1, s.y2), Math.max(s.x1, s.x2), Math.max(s.y1, s.y2));
            });
            (state.tree ? state.tree.nodes : []).forEach(n => {
                if (n.hidden) return;
                const r = (state.tree.options && state.tree.options.radius) || 20;
                // 上方预留 tag（指针标签）空间：胶囊半高 9 + 圆心到胶囊中心 16 + 2px 边距 → 27，取整 28
                const tagReserve = n.tag ? 28 : 16;
                acc(n.x - r, n.y - r - tagReserve, n.x + r, n.y + r);
            });
            (state.graph ? state.graph.vertices : []).forEach(v => {
                if (v.hidden) {
                    // 隐藏节点只贡献其几何中心（用于保留连线端点），不预留圆的半径
                    acc(v.x, v.y, v.x, v.y);
                    return;
                }
                const baseR = (state.graph.options && state.graph.options.radius) || 22;
                const r = v.radius !== undefined ? v.radius : baseR;
                // tag（pill）绘制在顶点上方 cy - r - 16 处，pill 半高约 9，再留 2px 边距
                const tagReserve = v.tag ? 28 : 0;
                // 长标签会以“圆下小标签”呈现（见 drawGraphNode），为底部预留空间防裁切
                const captionReserve = (v.label && String(v.label).length > 4) ? 22 : 0;
                acc(v.x - r, v.y - r - tagReserve, v.x + r, v.y + r + captionReserve);
            });
            (state.overlays || []).forEach(o => {
                if (o.panel) acc(o.panel.x, o.panel.y, o.panel.x + o.panel.w, o.panel.y + o.panel.h);
            });
            if (minX === Infinity) return null;
            // 全局预留边距：防止圆/线/标签紧贴画布边缘时被裁切或描边发虚
            const MARGIN = 12;
            minX -= MARGIN; maxX += MARGIN;
            minY -= MARGIN; maxY += MARGIN;
            return { minX, maxX, minY, maxY, spanY: maxY - minY, spanX: maxX - minX };
        }

        // 根据动画内容自适应画布（canvas-wrap）高度：
        // - 纯数组 / 无结构动画：保持弹性填充，让 .canvas-section flex:1 自动占用主内容区剩余空间。
        // - 结构化动画（树/图/数组+DP表/棋盘/栈队列辅助面板/Trie 等）：按内容包围盒实际高度
        //   设置 canvas-section 高度，避免“画布太矮导致图/树被压扁”。高度由 _measureBounds 计算，
        //   并迭代一次以消除“画布变大后内容同步放大”的耦合；同时设置上下限，防止过小或过高。
        // - 代码区/日志区仍在 .main-content 内可滚动查看，不会被挤出视口。
        _applyContentSizing() {
            const canvasWrap = document.getElementById('canvasWrap');
            const canvasSection = document.querySelector('.canvas-section');
            if (!canvasWrap || !canvasSection || !this.steps.length) return;
            const r = this.renderer;
            const w = canvasWrap.clientWidth || r.width || 800;
            const prevH = r.height;

            const states = [this._buildStateForStep(this.steps.length - 1), this._buildStateForStep(-1)]
                .filter(Boolean);
            if (!states.length) { r.resize(w, canvasWrap.clientHeight || prevH); this._renderCurrent(); return; }

            // 弹性填充：让 .canvas-section 保持 CSS flex:1，自动填满主内容区剩余空间。
            const elasticFill = () => {
                canvasSection.classList.remove('canvas-tall');
                canvasSection.style.flex = '';
                canvasSection.style.height = '';
                canvasWrap.style.flex = '';
                canvasWrap.style.height = '';
                const h = canvasWrap.clientHeight || prevH;
                r.resize(w, h);
                this._renderCurrent();
            };

            const hasStructure = states.some(s => s.tree || s.graph || s.overlays || (s.shapes && s.shapes.length));
            const pureArray = states.every(s => s.array && !(s.shapes && s.shapes.length) && !s.tree && !s.graph && !s.overlays);

            // Trie：固定高度，避免节点被压扁；其余树/图/结构化内容走下方 content-driven 分支。
            if (states.some(s => s._isTrie)) {
                const vh = (typeof window !== 'undefined' && window.innerHeight) || 800;
                const targetH = Math.min(520, Math.max(380, Math.round(vh * 0.6)));
                canvasSection.classList.remove('canvas-tall');
                canvasSection.style.flex = '0 0 auto';
                const heights = this._redistributeHeight(canvasSection, targetH);
                canvasSection.style.height = heights.canvas + 'px';
                canvasWrap.style.flex = '';
                canvasWrap.style.height = '';
                const wrapH = canvasWrap.clientHeight || (heights.canvas - 38);
                r.resize(w, wrapH);
                this._renderCurrent();
                return;
            }

            // 纯数组 / 无结构动画：直接弹性填充（排序等）。
            if (!hasStructure || pureArray) {
                elasticFill();
                return;
            }

            // 结构化动画：按内容实际包围盒高度驱动画布高度。
            // 先在“参考高度”（视口 70%）下测量内容自然高度，再以此为依据设置画布高度，
            // 避免“当前弹性高度太小 → 内容被压扁 → 测量值也小”的耦合。
            const vh = (typeof window !== 'undefined' && window.innerHeight) || 800;
            const measureIndices = [-1, 0, Math.floor(this.steps.length / 2), this.steps.length - 1]
                .filter((v, i, a) => v >= -1 && a.indexOf(v) === i);
            const refH = Math.max(360, Math.round(vh * 0.7));
            r.resize(w, refH);
            let maxY = 0;
            for (const idx of measureIndices) {
                const st = this._buildStateForStep(idx);
                const b = this._measureBounds(st);
                if (b && b.maxY > maxY) maxY = b.maxY;
            }

            const minH = 280;
            const maxH = Math.max(360, Math.round(vh * 0.88)); // 不超过视口 88%，避免过度滚动
            // 内容实际需要的画布高度（底部留 24px 边距）。
            const needed = maxY + 24;
            const h = Math.max(minH, Math.min(needed, maxH));

            // 修复“页面底部无效空白”：内容未占满视口时，把剩余高度均匀分配给
            // 动画区(canvasSection) 与 执行日志+代码区(bottomSection)，消除空白。
            const heights = this._redistributeHeight(canvasSection, h);

            canvasSection.classList.remove('canvas-tall');
            canvasSection.style.flex = '0 0 auto';
            canvasSection.style.height = heights.canvas + 'px';
            canvasWrap.style.flex = '1';
            canvasWrap.style.height = '';
            r.resize(w, canvasWrap.clientHeight || heights.canvas);
            this._renderCurrent();
        }

        // 把“内容所需高度”与“剩余视口空间”重新分配：
        // 动画区与 日志+代码区 各拿一半剩余空间，页面底部不再出现无效空白。
        _redistributeHeight(canvasSection, contentH) {
            const bottomSection = document.querySelector('.bottom-section');
            const header = document.querySelector('.algo-header');
            const infoPanel = document.querySelector('.info-panel');
            const vh = (typeof window !== 'undefined' && window.innerHeight) || 800;
            if (!bottomSection || !header || !infoPanel) {
                return { canvas: contentH, bottom: null };
            }
            // 先还原底部区高度到 CSS 基线（响应式断点下的 260/220/180），避免重复累加。
            bottomSection.style.height = '';
            const baseBottom = bottomSection.offsetHeight || 260;
            const headerH = header.offsetHeight || 56;
            const infoH = infoPanel.offsetHeight || 52;
            // 视口中扣除固定栏后，可供“动画区 + 底部区”分配的高度预算。
            const budget = vh - headerH - infoH;
            let canvasH = contentH;
            let bottomH = baseBottom;
            // 内容 + 基线底部区能放下 → 把剩余空间五五开分配。
            if (contentH + baseBottom <= budget) {
                const free = budget - baseBottom - contentH;
                canvasH = contentH + free * 0.5;
                bottomH = baseBottom + free * 0.5;
            }
            bottomSection.style.height = Math.round(bottomH) + 'px';
            return { canvas: Math.round(canvasH), bottom: Math.round(bottomH) };
        }

        _defaultStateBuilder(tracerStates, _step, ctxInfo) {
            // 默认状态构建：按 Tracer 类型分发（不依赖具体名称）
            // 这样算法可以用任意名字（arr / array / nextArr ...）注册 Tracer
            const canvasW = (ctxInfo && ctxInfo.width) || 800;
            const canvasH = (ctxInfo && ctxInfo.height) || 400;
            // 辅助面板（栈/队列）：先计算，主结构布局时使用收缩后的主区宽度
            const aux = Animator.computeAuxLayout(tracerStates, canvasW, canvasH);
            const names = Object.keys(tracerStates);
            if (names.length === 0) return null;
            const state = {};

            // 收集各类型 Tracer 快照
            const arrays = [];      // ArrayTracer 快照列表
            const linkedLists = [];
            const graphs = [];
            const trees = [];
            const dpTables = [];
            const chessboards = [];
            const queues = [];
            const stacks = [];
            for (const name of names) {
                const snap = tracerStates[name];
                if (!snap) continue;
                switch (snap._type) {
                    case 'array': arrays.push({ name, snap }); break;
                    case 'linkedlist': linkedLists.push({ name, snap }); break;
                    case 'graph': graphs.push({ name, snap }); break;
                    case 'tree': trees.push({ name, snap }); break;
                    case 'dptable': dpTables.push({ name, snap }); break;
                    case 'chessboard': chessboards.push({ name, snap }); break;
                    case 'queue': queues.push({ name, snap }); break;
                    case 'stack': stacks.push({ name, snap }); break;
                }
            }

            // 数组：单个直接渲染；多个则垂直堆叠渲染（在主区内水平居中）
            if (arrays.length === 1) {
                const a = arrays[0].snap;
                state.array = {
                    items: a.items,
                    pointers: a.pointers,
                    ranges: a.ranges,
                    options: this._arrayOptions(arrays[0].name, aux.mainW, a.items.length, canvasH, { nearTop: dpTables.length > 0 })
                };
            } else if (arrays.length > 1) {
                // 多数组场景（如 KMP 的 text + pattern）：从上到下排列，每行水平居中
                const layouts = this._layoutMultipleArrays(arrays.length, aux.mainW, arrays.map(x => x.snap.items.length));
                state.shapes = state.shapes || [];
                const tokens = this.renderer._tokens();
                arrays.forEach(({ name, snap }, idx) => {
                    const opt = layouts[idx];
                    snap.items.forEach((item, i) => {
                        const ix = opt.x + i * (opt.cellW + opt.gap);
                        const st = item.state || 'default';
                        const color = this._stateColor(st);
                        state.shapes.push({
                            kind: 'rect',
                            x: ix, y: opt.y, w: opt.cellW, h: opt.cellH,
                            color, radius: tokens.radiusSmall,
                            label: String(item.value ?? ''),
                            opts: { stroke: this._stateBorder(st), strokeWidth: 2, fontSize: Math.max(11, Math.min(40, Math.round(Math.min(opt.cellW, opt.cellH) * 0.5))) }
                        });
                        if (opt.showIndex) {
                            state.shapes.push({
                                kind: 'text',
                                x: ix + opt.cellW / 2, y: opt.y + opt.cellH + 14,
                                text: String(i), color: this.renderer._dimText(),
                                fontSize: 10, align: 'center'
                            });
                        }
                    });
                    // 名称标签
                    state.shapes.push({
                        kind: 'text',
                        x: opt.x - 12, y: opt.y + opt.cellH / 2,
                        text: opt.label || name, color: this.renderer._panelText(),
                        fontSize: 11, align: 'right', opts: { bold: true }
                    });
                });
            }

            // 链表 / DP表 / 棋盘 → 通用 shapes
            if (linkedLists.length) {
                state.shapes = (state.shapes || []).concat(this._buildLinkedListShapes(linkedLists[0].snap));
            }
            if (dpTables.length) {
                // 数组与表共存时（如基数排序的桶表）：表紧贴数组底边，充分利用顶部留白，
                // 避免上方大片空白、下方表被裁切；表高随画布自适应（数字完整、不溢出）
                const hasArrayAbove = arrays.length > 0;
                let arrBottom = 0;
                if (state.shapes) {
                    for (const s of state.shapes) {
                        const b = s.kind === 'rect' ? s.y + s.h : (s.kind === 'text' ? s.y : 0);
                        if (b > arrBottom) arrBottom = b;
                    }
                }
                // 单个数组被存为 state.array，未进入 state.shapes，必须单独取底边，
                // 否则 DP 表会按 arrBottom=0 从 y=30 开始，与数组重叠。
                if (state.array && state.array.options) {
                    const o = state.array.options;
                    // 数组索引绘制在单元格下方（y + cellH + 14，字号 10，底部到 y + cellH + 19）。
                    // 原 18px/34px 仍会导致 DP 表的列标签与数组索引垂直交错；改为 54px，留出清晰间距。
                    // 同时与 _buildDPTableShapes 中列标签位置（startY - 12）配合，保证二者不重叠。
                    let bot = (o.y || 80) + (o.cellH || 48) + (o.showIndex && o.indexPosition !== 'top' ? 54 : 0);
                    if (o.below) {
                        const scale = Math.max(0.6, Math.min(2.5, ((o.cellW || 48) + (o.cellH || 48)) / 2 / 48));
                        bot += (o.belowOffset || 0) + 30 * scale + 28;
                    }
                    if (bot > arrBottom) arrBottom = bot;
                }
                state.shapes = (state.shapes || []).concat(this._buildDPTableShapes(dpTables[0].snap, canvasH, hasArrayAbove, arrBottom));
            }
            if (chessboards.length) {
                state.shapes = (state.shapes || []).concat(this._buildChessBoardShapes(chessboards[0].snap));
            }

            // 树：自动布局并渲染（适配画布尺寸）
            if (trees.length) {
                Object.assign(state, this._buildTreeState(trees[0].snap, aux.mainW, canvasH));
            }
            // 图：自动布局并渲染（适配画布尺寸）
            if (graphs.length) {
                Object.assign(state, this._buildGraphState(graphs[0].snap, aux.mainW, canvasH));
            }

            // 辅助面板：栈/队列 → 独立方块（右侧面板或居中），开头已由 computeAuxLayout 计算
            if (aux.overlays.length) {
                state.overlays = (state.overlays || []).concat(aux.overlays);
            }

            return state;
        }

        _arrayOptions(name, canvasW = 0, itemCount = 0, canvasH = 0, opts = {}) {
            // 数组方块：保持【正方形】，且在画布内尽量放大（长数组自动压缩到不溢出宽度）。
            // 堆排序/基数排序/Trie 走各自自定义 builder，不受影响。
            const MARGIN_X = 40;                 // 左右各留白
            const gap = 6;
            const MAX_SQ = 84;                   // 上限：短数组尽量放大到接近此值（在画布内尽量大）
            const NEAR_TOP_MAX = 34;             // 下方有 DP 表时最大边长（紧凑，给表留空间）
            const availW = canvasW > 0 ? Math.max(120, canvasW - MARGIN_X * 2) : 820;

            // 正方形（cellW = cellH = cell）；默认放大到上限 MAX_SQ，仅当数组过长（fitW 更小）时自动缩小以不溢出宽度。
            let cell = MAX_SQ;
            if (itemCount > 1) {
                // 恰好铺满可用宽度的正方形边长（含间距）
                const fitW = (availW + gap) / itemCount - gap;
                cell = Math.min(MAX_SQ, fitW);
            }
            if (opts.nearTop) {
                // 有下方 DP 表（如最长公共子串）：数组保持紧凑，把纵向空间让给表；仍保证不溢出宽度
                cell = Math.min(NEAR_TOP_MAX, cell);
            }
            cell = Math.max(10, Math.round(cell));
            const cellW = cell, cellH = cell;

            const totalW = itemCount ? itemCount * (cellW + gap) - gap : 0;
            const x = canvasW ? Math.max(MARGIN_X, (canvasW - totalW) / 2) : MARGIN_X;

            // 指针（绘制在数组上方）所需顶部预留高度：箭头杆+头(随方块等比缩放) + 标签 + 余量。
            // 修复回归：此前数组 y 过小（24）导致上方指针被画布上沿裁切而“看不见”。
            const scale = Math.max(0.6, Math.min(2.5, (cellW + cellH) / 2 / 48));
            const pointerReserve = Math.ceil(6 + 30 * scale + 24); // 6 余量 + 箭头(≈30·scale) + 标签(24)

            // 数组（含上方指针、下方索引）纵向定位：
            // - 下方有 DP 表时：贴顶排布，仅保留指针余量，把纵向空间让给 DP 表。
            // - 纯数组（排序等）：在可用画布内垂直居中，指针自然获得上方空间，画面更均衡。
            let y;
            if (opts.nearTop || !canvasH || canvasH <= 0) {
                y = pointerReserve;
            } else {
                const blockH = pointerReserve + cellH + 18; // +18：下方索引行
                y = Math.round(pointerReserve + Math.max(0, (canvasH - blockH) / 2));
                if (y < pointerReserve) y = pointerReserve;
            }
            return {
                x, y, cellW, cellH, gap,
                mode: 'cell', showIndex: true, showValue: true
            };
        }

        _layoutMultipleArrays(count, canvasW = 0, lengths = []) {
            // 多数组（如 KMP 主串/模式、LCS 两串）纵向布局：方块保持【正方形】，并在画布内尽量放大；
            // 超宽时压缩以不溢出（动画元素不允许展示不全）。
            const MARGIN_X = 40;
            const gap = 6;
            const BASE = 44;                 // 期望正方形边长（较单数组略小，给多行留纵向空间）
            const MAX_SQ = 48;
            const startY = 56;
            const rowGap = 70;
            const arr = [];
            const labels = ['主串', '模式'];
            const maxLen = Math.max(...lengths, 0);
            let cell = BASE;
            if (canvasW > 0 && maxLen > 1) {
                const availW = Math.max(120, canvasW - MARGIN_X * 2);
                // 恰好铺满宽度的正方形边长；长串自动缩小以不溢出
                const fitW = (availW + gap) / maxLen - gap;
                cell = Math.min(BASE, fitW);
            }
            cell = Math.min(MAX_SQ, cell);
            cell = Math.max(10, Math.round(cell));
            const cellW = cell, cellH = cell;
            for (let i = 0; i < count; i++) {
                const len = lengths[i] || 0;
                const rowW = len ? len * (cellW + gap) - gap : 0;
                const x = canvasW ? Math.max(MARGIN_X, (canvasW - rowW) / 2) : MARGIN_X;
                arr.push({
                    x, y: startY + i * rowGap,
                    cellW, cellH, gap,
                    showIndex: false,
                    label: labels[i] || ('数组' + (i + 1))
                });
            }
            return arr;
        }

        _buildLinkedListShapes(ll) {
            const shapes = [];
            const { nodes } = ll;
            if (!nodes.length) return shapes;
            const tokens = this.renderer._tokens();
            let cellW = 56, cellH = 40, gap = 24;
            const cw = this.renderer.width;
            // 宽度自适应：节点多时压缩节点宽/间距，保证尾部节点不被裁出画布（动画元素不允许展示不全）
            const maxTotal = cw - 80;
            if (nodes.length > 1 && nodes.length * (cellW + gap) - gap > maxTotal) {
                gap = 10;
                if (nodes.length * (cellW + gap) - gap > maxTotal) {
                    cellW = Math.max(20, Math.floor((maxTotal + gap) / nodes.length) - gap);
                }
            }
            const startX = 60, startY = 80;
            const totalW = nodes.length * (cellW + gap) - gap;
            const cx = Math.max(60, (cw - totalW) / 2);
            nodes.forEach((n, i) => {
                const x = cx + i * (cellW + gap);
                // 节点矩形
                shapes.push({
                    kind: 'rect',
                    x, y: startY, w: cellW, h: cellH,
                    color: this._stateColor(n.state),
                    radius: tokens.radiusSmall,
                    label: String(n.value),
                    opts: { stroke: this._stateBorder(n.state), strokeWidth: 2, fontSize: 14 }
                });
                // next 指针箭头
                if (i < nodes.length - 1) {
                    shapes.push({
                        kind: 'arrow',
                        x1: x + cellW, y1: startY + cellH / 2,
                        x2: x + cellW + gap, y2: startY + cellH / 2,
                        color: '#58a6ff', headSize: 8, width: 2
                    });
                }
            });
            // head 标签
            if (nodes.length) {
                shapes.push({
                    kind: 'text',
                    x: cx, y: startY - 14,
                    text: 'head', color: this.renderer._panelText(), fontSize: 11, align: 'center', opts: { bold: true }
                });
            }
            return shapes;
        }

        _buildDPTableShapes(dp, canvasH = 0, hasArrayAbove = false, arrBottom = 0) {
            const shapes = [];
            const tokens = this.renderer._tokens();
            const { rows, cols, cells, rowLabels, colLabels } = dp;
            // 紧凑模式：行数很多（如基数排序桶表、超大 DP）时才压缩单元格，保证全部行在画布内；
            // 行数较少（如最长公共子串等）时使用更舒适的大单元格，避免“展示不全/看不清”。
            const compact = rows >= 10;
            const gap = compact ? 2 : 3;
            const baseFont = compact ? 12 : 15;
            const maxTotalW = this.renderer.width - 40;

            // 1) 测量最长单元格文字宽度，让列宽根据内容自适应变大（不再固定 54px）。
            //    超长数字（如字符串哈希的 h/pw 值，可达 10 位）此前会溢出小方框，故此处按内容定宽。
            let maxContentW = 0;
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    const c = cells[i][j];
                    if (!c) continue;
                    const t = (c.value === null || c.value === undefined) ? '' : String(c.value);
                    if (t) {
                        const w = this._measureTextWidth(t, baseFont);
                        if (w > maxContentW) maxContentW = w;
                    }
                }
            }
            // 内容需要的单元格宽度（含左右内边距）
            const contentCellW = maxContentW + 14;

            // 2) 起始列宽取“基础宽度”与“内容宽度”中较大者（小方框按内容长胖）
            let cellW = Math.max(compact ? 40 : 72, contentCellW);

            // 3) 若整体超出画布，先把列宽压到画布允许的最大值（保证不横向溢出）
            const maxAllowedCellW = Math.max(8, Math.floor((maxTotalW + gap) / cols) - gap);
            if (cellW > maxAllowedCellW) cellW = maxAllowedCellW;

            // 起始 Y：有上方数组时紧贴数组底边（动态计算），把顶部留白用起来；
            // 同时保证列标签有足够上边距，不压到数组索引
            const startY = hasArrayAbove
                ? Math.max(compact ? 24 : 40, arrBottom + 10)
                : (compact ? 40 : 52);
            // 高度自适应：行高严格按可用高度计算，保证全部行在画布内（动画元素不允许展示不全）
            const availH = Math.max(20, canvasH - startY - 10);
            let cellH = Math.min(52, Math.floor((availH + gap) / rows) - gap);
            if (cellH < 10) cellH = 10;
            // 字号：随单元格等比例放大（大方块→大数字），上限避免极端；
            // 若单元格内容过长（如 10 位多项式哈希值）则收缩字号保证数字完整不裁切。
            const propFont = Math.max(10, Math.min(40, Math.round(Math.min(cellW, cellH) * 0.5)));
            let fontSize = propFont;
            if (maxContentW > 0) {
                const contentFont = Math.max(10, Math.round((cellW - 14) * baseFont / maxContentW));
                if (contentFont < fontSize) fontSize = contentFont;
            }
            const totalW = cols * (cellW + gap) - gap;
            const startX = Math.max(40, (this.renderer.width - totalW) / 2);
            // 行标签
            for (let i = 0; i < rows; i++) {
                shapes.push({
                    kind: 'text',
                    x: startX - 12, y: startY + i * (cellH + gap) + cellH / 2,
                    text: rowLabels[i] !== undefined ? rowLabels[i] : i,
                    color: this.renderer._panelText(),
                    fontSize: 11, align: 'right', opts: { bold: true }
                });
            }
            // 列标签
            for (let j = 0; j < cols; j++) {
                shapes.push({
                    kind: 'text',
                    x: startX + j * (cellW + gap) + cellW / 2, y: startY - 12,
                    text: colLabels[j] !== undefined ? colLabels[j] : j,
                    color: this.renderer._panelText(),
                    fontSize: fontSize - 1, align: 'center', opts: { bold: true }
                });
            }
            // 单元格
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    const c = cells[i][j];
                    shapes.push({
                        kind: 'rect',
                        x: startX + j * (cellW + gap),
                        y: startY + i * (cellH + gap),
                        w: cellW, h: cellH,
                        color: this._stateColor(c.state),
                        radius: tokens.radiusSmall,
                        label: c.value === null || c.value === undefined ? '' : String(c.value),
                        opts: { stroke: this._stateBorder(c.state), strokeWidth: 2, fontSize }
                    });
                }
            }
            return shapes;
        }

        _buildChessBoardShapes(cb) {
            const shapes = [];
            const tokens = this.renderer._tokens();
            const { size, board } = cb;
            // 宽度与高度双重约束：棋盘不允许超出画布（动画元素不允许展示不全）
            // 边距随画布变小而收紧，大画布下尽量放大格子，把动画区留白利用起来。
            const margin = Math.min(28, Math.max(14, Math.round(this.renderer.width * 0.03)));
            const vMargin = Math.min(28, Math.max(14, Math.round(this.renderer.height * 0.035)));
            const cellW = Math.max(22, Math.min(64,
                Math.floor((this.renderer.width - margin * 2) / size),
                Math.floor((this.renderer.height - vMargin * 2) / size)));
            const cellH = cellW;
            const totalW = size * cellW;
            const totalH = size * cellH;
            const startX = Math.max(margin, Math.round((this.renderer.width - totalW) / 2));
            const startY = Math.max(vMargin, Math.round((this.renderer.height - totalH) / 2));
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    const c = board[i][j];
                    const isLight = (i + j) % 2 === 0;
                    const baseColor = isLight
                        ? tokens.cell
                        : (this.renderer._theme === 'dark' ? '#15203F' : '#C7DCA8');
                    shapes.push({
                        kind: 'rect',
                        x: startX + j * cellW, y: startY + i * cellH,
                        w: cellW, h: cellH,
                        color: c.state === 'default' ? baseColor : this._stateColor(c.state),
                        radius: tokens.radiusSmall,
                        label: c.value ? 'Q' : '',
                        opts: {
                            stroke: c.state === 'default' ? tokens.cellBorder : this._stateBorder(c.state),
                            // 所有棋盘格（含数独）统一 2px 实线边框，默认 1px 在浅色/小格子上太淡。
                            strokeWidth: 2,
                            fontSize: Math.floor(cellW * 0.5)
                        }
                    });
                }
            }
            // 数独：额外绘制加粗的 3x3 宫格边界，让九宫格分界分明可见
            if (size === 9) {
                const box = 3;
                const strong = this.renderer._panelText();
                for (let k = 1; k < box; k++) {
                    const x = startX + k * box * cellW;
                    shapes.push({ kind: 'line', x1: x, y1: startY, x2: x, y2: startY + size * cellH, color: strong, width: 3, opts: {} });
                    const y = startY + k * box * cellH;
                    shapes.push({ kind: 'line', x1: startX, y1: y, x2: startX + size * cellW, y2: y, color: strong, width: 3, opts: {} });
                }
            }
            return shapes;
        }

        _measureTextWidth(text, fontSize) {
            // 与渲染器 drawRect 标签字体保持一致：JetBrains Mono, monospace
            const ctx = this.renderer && this.renderer.ctx;
            if (ctx && typeof ctx.measureText === 'function') {
                try {
                    ctx.font = `${fontSize}px JetBrains Mono, monospace`;
                    return ctx.measureText(String(text)).width;
                } catch (e) { /* 降级到估算 */ }
            }
            // 兜底估算：等宽字体下每字符约占 0.62 × fontSize
            return String(text).length * fontSize * 0.62;
        }

        _stateColor(state) {
            const tokens = this.renderer._tokens();
            const map = {
                default: tokens.cell,
                compare: '#f78166',
                swap: '#d29922',
                sorted: '#3fb950',
                current: '#58a6ff',
                visited: '#bc8cff',
                pivot: '#f0883e',
                rotate: '#ff6b6b',
                backtrack: '#ff6b6b',
                queue: '#bc8cff',
                stack: '#58a6ff',
                tree: '#3fb950',
                path: '#3fb950'
            };
            return map[state] || map.default;
        }

        _stateBorder(state) {
            const tokens = this.renderer._tokens();
            const map = {
                default: tokens.cellBorder,
                compare: '#f78166',
                swap: '#d29922',
                sorted: '#3fb950',
                current: '#58a6ff',
                visited: '#bc8cff',
                pivot: '#f0883e',
                rotate: '#ff6b6b',
                backtrack: '#ff6b6b',
                queue: '#bc8cff',
                stack: '#58a6ff',
                tree: '#3fb950',
                path: '#3fb950'
            };
            return map[state || 'default'] || map.default;
        }

        // ===== 树状态构建（自动适配画布尺寸，防裁切） =====
        _buildTreeState(snap, canvasW, canvasH) {
            const nodes = snap.nodes;
            if (!nodes || !nodes.length) return { tree: { nodes: [], edges: [] } };

            const layoutNodes = nodes.map(n => ({
                value: n ? n.value : null,
                left: n ? n.left : null,
                right: n ? n.right : null,
                state: n ? n.state : 'default',
                tag: n ? n.tag : '',
                hidden: !n || n.hidden
            }));

            // 计算布局，传入画布尺寸用于自动缩放（深树自动缩小半径/间距防重叠）
            const positions = LayoutEngine.layoutBinaryTree(layoutNodes, snap.root, {
                y: 50, vGap: 65, hGap: 26, nodeRadius: 18,
                fitWidth: canvasW,
                fitHeight: canvasH
            });
            const radius = positions._radius || 18;

            const renderNodes = nodes.map((n, i) => ({
                x: positions[i].x,
                y: positions[i].y,
                label: n ? n.value : '',
                state: n && !n.hidden ? n.state : 'default',
                tag: n ? n.tag : '',
                tagColor: n ? n.tagColor : null,
                color: n ? n.color : null,
                hidden: !n || n.hidden
            }));

            const edges = [];
            nodes.forEach((n, i) => {
                if (!n || n.hidden) return;
                if (n.left !== null && n.left !== undefined && nodes[n.left] && !nodes[n.left].hidden) {
                    edges.push({ parent: i, child: n.left, color: n.leftHighlight });
                }
                if (n.right !== null && n.right !== undefined && nodes[n.right] && !nodes[n.right].hidden) {
                    edges.push({ parent: i, child: n.right, color: n.rightHighlight });
                }
            });

            const fontSize = Math.max(12, Math.min(16, Math.round(radius * 0.65)));
            return { tree: { nodes: renderNodes, edges, options: { radius, fontSize } } };
        }

        // ===== 图状态构建（自动适配画布尺寸，防裁切） =====
        _buildGraphState(snap, canvasW, canvasH) {
            const vertices = snap.vertices || [];
            const edges = snap.edges || [];
            if (!vertices.length) return { graph: { vertices: [], edges: [] } };

            const n = vertices.length;

            // 几何类算法（凸包/最近点对等）会在顶点上带归一化坐标 nx/ny（0..1）。
            // 仅当"所有顶点都提供了 nx/ny"时才启用坐标布局；否则保持既有圆形布局，
            // 因此不影响任何未设置 nx/ny 的既有图算法。
            const useXY = n > 0 && vertices.every(v => typeof v.nx === 'number' && typeof v.ny === 'number');
            if (useXY) {
                // 边距与节点半径、可能存在的 tag/caption 挂钩，确保任意尺寸下都不贴边裁切
                const baseR = (snap.options && snap.options.radius) || 13;
                const pad = Math.max(56, Math.round(baseR * 2.5 + 16));
                const w = Math.max(1, canvasW - pad * 2);
                const h = Math.max(1, canvasH - pad * 2);
                const renderVertices = vertices.map(v => ({
                    x: pad + v.nx * w,
                    y: pad + (1 - v.ny) * h, // 数学坐标系：y 轴向上
                    label: v.label !== undefined ? v.label : '',
                    state: v.state || 'default',
                    tag: v.tag || '',
                    hidden: v.hidden || false
                }));
                return { graph: { vertices: renderVertices, edges, options: { radius: baseR, fontSize: 11, directed: snap.directed } } };
            }

            // 使用圆形布局，自动适配画布
            const cx = canvasW / 2;
            const cy = canvasH / 2;
            const r = Math.min(canvasW, canvasH) * 0.35;

            const renderVertices = vertices.map((v, i) => {
                const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
                return {
                    x: cx + r * Math.cos(angle),
                    y: cy + r * Math.sin(angle),
                    label: v.label !== undefined ? v.label : i,
                    state: v.state || 'default',
                    tag: v.tag || ''
                };
            });

            return { graph: { vertices: renderVertices, edges, options: { radius: 20, fontSize: 13, directed: snap.directed } } };
        }

        _buildStepInfo() {
            const step = this.currentStep >= 0 ? this.steps[this.currentStep] : null;
            return {
                index: this.currentStep,
                total: this.steps.length,
                step: step,
                description: step ? step.description : '准备就绪',
                codeLine: step ? step.codeLine : null,
                isPlaying: this.playing,
                isFinished: this.isFinished()
            };
        }

        _notify(event, data) {
            const cbs = {
                step: this._onStep,
                finish: this._onFinish,
                reset: this._onReset,
                play: this._onPlay,
                pause: this._onPause
            }[event];
            if (cbs) cbs.forEach(cb => { try { cb(data); } catch (e) { console.error(e); } });
        }
    }

    Animator.SPEED_PRESETS = SPEED_PRESETS;

    // 辅助面板（栈/队列）布局常量
    Animator.AUX_PANEL_W = 118;   // 面板宽度（辅助动画无需太宽，竖排展示即可）
    Animator.AUX_GAP = 14;        // 主区与面板间距
    Animator.AUX_MARGIN = 12;     // 面板与画布边缘间距

    /**
     * 计算辅助面板（栈/队列）布局，供默认状态构建器与自定义 buildState 共用。
     * @param {object} tracerStates - 各 Tracer 快照 { name: snap }
     * @param {number} canvasW / canvasH - 画布尺寸
     * @returns {{ mainW: number, overlays: Array, hasAux: boolean }}
     *   mainW：主结构可用宽度（有右侧面板时收缩，否则为全宽）
     *   overlays：面板渲染数据（含 panel 字段：独立方块 + 标题）
     */
    Animator.computeAuxLayout = function (tracerStates, canvasW, canvasH) {
        const names = Object.keys(tracerStates || {});
        const stacks = [], queues = [];
        for (const name of names) {
            const snap = tracerStates[name];
            if (!snap || !snap._type) continue;
            if (snap._type === 'stack' && snap.items && snap.items.length) stacks.push({ name, snap });
            else if (snap._type === 'queue' && snap.items && snap.items.length) queues.push({ name, snap });
        }
        if (!stacks.length && !queues.length) {
            return { mainW: canvasW, overlays: [], hasAux: false };
        }

        // 是否存在主结构（非栈/队列/日志）
        const hasMain = names.some(n => {
            const t = tracerStates[n] && tracerStates[n]._type;
            return t && t !== 'stack' && t !== 'queue' && t !== 'log';
        });

        // 定义面板：栈/队列均竖排展示（栈顶/队首在上）；栈倒序、队列正序
        const defs = [];
        stacks.forEach(({ snap }) => {
            const items = snap.items.slice().reverse().map(it => ({
                label: it.value,
                color: it.state === 'current' ? '#d29922' : '#58a6ff'
            }));
            defs.push({ title: '栈', items, layout: 'vertical', marker: '#d29922' });
        });
        queues.forEach(({ snap }) => {
            const items = snap.items.map(it => ({
                label: it.value,
                color: it.state === 'current' ? '#bc8cff' : '#58a6ff'
            }));
            defs.push({ title: '队列', items, layout: 'vertical', marker: '#bc8cff' });
        });

        // 独立栈/队列动画（没有主结构）时，面板适当放大，避免“小widget丢在大片空白里”。
        // 作为主结构的辅助面板（如 DFS/BFS 的栈/队列）时保持紧凑，不抢占主区。
        const standalone = !hasMain;
        const panelW = standalone
            ? Math.min(220, Math.max(150, Math.round(canvasW * 0.22)))
            : Animator.AUX_PANEL_W;
        const itemH = standalone ? 44 : 28;
        const gapY = standalone ? 6 : 4;
        const titleH = 34, footH = 14;

        // 面板高度：竖排按元素数（压缩时由下方超限逻辑均分）
        const maxH = Math.max(80, canvasH - Animator.AUX_MARGIN * 2);
        const sized = defs.map(d => ({
            ...d,
            itemH,
            gapY,
            h: d.layout === 'vertical'
                ? Math.min(maxH, titleH + Math.max(0, d.items.length - 1) * gapY + d.items.length * itemH + footH)
                : Math.min(maxH, 74)
        }));

        // 垂直布局：总高不超限则整体垂直居中；超限则压缩各面板高度后贴顶，
        // 避免多面板堆叠时下方面板超出画布被裁剪（如双栈后序的 s1/s2）
        const gap = 10;
        let totalH = sized.reduce((a, d) => a + d.h + gap, -gap);
        if (totalH > maxH && sized.length > 1) {
            const avail = maxH - (sized.length - 1) * gap;
            const per = Math.max(58, Math.floor(avail / sized.length)); // 保底：标题栏 + 1 项
            sized.forEach(d => { d.h = Math.min(d.h, per); });
            totalH = sized.reduce((a, d) => a + d.h + gap, -gap);
        }
        const startY = totalH <= maxH ? Math.max(10, (canvasH - totalH) / 2) : Animator.AUX_MARGIN;

        const panelX = hasMain
            ? canvasW - panelW - Animator.AUX_MARGIN
            : Math.max(10, (canvasW - panelW) / 2);

        const overlays = [];
        let cursorY = startY;
        sized.forEach(d => {
            overlays.push({
                title: d.title,
                items: d.items,
                marker: d.marker,
                panel: { x: panelX, y: cursorY, w: panelW, h: d.h, layout: d.layout, itemH: d.itemH, gapY: d.gapY }
            });
            cursorY += d.h + 10;
        });

        const mainW = hasMain ? panelX - Animator.AUX_GAP : canvasW;
        return { mainW, overlays, hasAux: true };
    };

    /**
     * 全局工具函数：为自定义 buildState 添加栈/队列浮层
     * 用法：Animator.addOverlays(state, tracerStates, canvasW, canvasH)
     * 在 buildBinaryTreeState / buildGraphState 等函数末尾调用
     */
    Animator.addOverlays = function (state, tracerStates, canvasW, canvasH) {
        const aux = Animator.computeAuxLayout(tracerStates, canvasW, canvasH);
        if (aux.overlays.length) {
            state.overlays = (state.overlays || []).concat(aux.overlays);
        }
        return state;
    };

    global.Animator = Animator;
})(window);
