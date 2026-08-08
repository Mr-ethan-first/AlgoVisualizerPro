/**
 * App - 应用主入口
 *
 * 职责：
 *   - 初始化所有 UI 组件
 *   - 绑定组件间事件流
 *   - 处理算法选择、加载、运行、渲染
 */
(function (global) {
    'use strict';

    class App {
        constructor() {
            this.renderer = null;
            this.animator = null;
            this.sidebar = null;
            this.codeViewer = null;
            this.controls = null;
            this.themeSwitcher = null;
            this.toast = null;
            this.shortcut = null;

            this.currentAlgo = null;
            this.currentData = null;
            this._resizeRaf = null;
        }

        async init() {
            // 1. 主题切换
            this.themeSwitcher = new ThemeSwitcher();
            this.themeSwitcher.init();

            // 2. Toast 提示
            this.toast = new Toast();

            // 3. Renderer
            this.renderer = new Renderer('mainCanvas');
            // 4. Animator
            this.animator = new Animator(this.renderer);
            // 5. CodeViewer
            this.codeViewer = new CodeViewer(document.getElementById('codeViewer'));
            // 6. Sidebar
            this.sidebar = new Sidebar(document.getElementById('sidebarNav'));
            // 7. Controls
            this.controls = new Controls(this.animator);
            // 8. Shortcut
            this.shortcut = new Shortcut(this);

            // 事件绑定
            this._bindEvents();
            this._bindAnimatorEvents();

            // 渲染侧边栏
            this.sidebar.render();
            this._updateAlgoCount();

            // 监听窗口尺寸
            this._setupResize();
            // 监听主题变化
            this._observeTheme();

            // 默认加载第一个算法
            const list = AlgorithmLoader.list();
            if (list.length > 0) {
                this.selectAlgorithm(list[0].id);
            }

            // 注册 Service Worker
            this._registerSW();
        }

        _bindEvents() {
            // 搜索
            const searchInput = document.getElementById('searchInput');
            searchInput.addEventListener('input', e => {
                this.sidebar.setSearch(e.target.value);
            });
            // 过滤标签
            document.querySelectorAll('.filter-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    this.sidebar.setFilter(tab.dataset.level);
                });
            });
            // 侧边栏选中
            this.sidebar.onSelect(id => this.selectAlgorithm(id));
            // 代码 / 说明 切换
            document.querySelectorAll('.section-tab').forEach(t => {
                t.addEventListener('click', () => {
                    document.querySelectorAll('.section-tab').forEach(x => x.classList.remove('active'));
                    t.classList.add('active');
                    this.codeViewer.showTab(t.dataset.tab);
                });
            });
            // 数据应用
            document.getElementById('applyDataBtn').addEventListener('click', () => this._applyData());
            document.getElementById('dataInput').addEventListener('keydown', e => {
                if (e.key === 'Enter') this._applyData();
            });
            // 随机数据
            document.getElementById('randomDataBtn').addEventListener('click', () => this._randomData());
            // 清空日志
            document.getElementById('clearLogBtn').addEventListener('click', () => {
                document.getElementById('logViewer').innerHTML = '';
            });
            // 全屏
            document.getElementById('fullscreenBtn').addEventListener('click', () => {
                if (!document.fullscreenElement) document.documentElement.requestFullscreen();
                else document.exitFullscreen();
            });
            // 侧边栏拖拽
            this._setupSidebarResize();
        }

        _bindAnimatorEvents() {
            this.animator.onStep(info => {
                // 更新步骤显示
                document.getElementById('stepCurrent').textContent = info.index + 1;
                document.getElementById('stepTotal').textContent = info.total;
                document.getElementById('stepDesc').textContent = info.description || '';
                const progress = info.total > 0 ? ((info.index + 1) / info.total * 100) : 0;
                document.getElementById('stepProgress').style.width = progress + '%';
                // 代码高亮
                this.codeViewer.highlightLine(info.codeLine);
                // 日志追加
                if (info.step && info.step.type === 'log') {
                    this._appendLog(info.step.payload.message, info.step.payload.level);
                } else if (info.step && info.description && info.step.tracer === 'log') {
                    // Tracer 类型为 log 时也输出
                    this._appendLog(info.description, 'info');
                }
                // 控制栏状态更新
                this.controls.updateState();
            });
            this.animator.onFinish(() => {
                this.controls.updateState();
            });
            this.animator.onReset(() => {
                this.controls.updateState();
            });
            this.animator.onPlay(() => {
                this.controls.updateState();
            });
            this.animator.onPause(() => {
                this.controls.updateState();
            });
        }

        selectAlgorithm(id) {
            const algo = AlgorithmLoader.get(id);
            if (!algo) return;
            this.currentAlgo = algo;
            this.currentData = algo.defaultData;

            // 画布高度由动画内容自适应（见 Animator._applyContentSizing），
            // 不再强制拉满视口高度把控制栏挤到屏幕外。
            const canvasSection = document.querySelector('.canvas-section');
            if (canvasSection) {
                canvasSection.classList.remove('canvas-tall');
                // 尺寸变化后重建画布，再加载步骤（布局构建依赖 renderer.width/height）
                this.renderer.resize();
            }
            const mainContent = document.querySelector('.main-content');
            if (mainContent) mainContent.scrollTop = 0;

            // 更新 UI
            document.getElementById('algoTitle').textContent = algo.name;
            document.getElementById('algoSubtitle').textContent = this._buildSubtitle(algo);
            const metaBadges = document.getElementById('algoMeta');
            metaBadges.innerHTML = `
                <span class="badge" data-type="category">${AlgorithmLoader.CATEGORIES[algo.category].name}</span>
                <span class="badge" data-type="complexity">${algo.complexity.time}</span>
                <span class="badge" data-type="level" data-level="${algo.level}">${algo.level}</span>
            `;
            // 显示记忆口诀（如果有）
            const mnemonicEl = document.getElementById('algoMnemonic');
            if (mnemonicEl) {
                if (algo.mnemonic) {
                    mnemonicEl.textContent = '💡 ' + algo.mnemonic;
                    mnemonicEl.style.display = 'block';
                } else {
                    mnemonicEl.style.display = 'none';
                }
            }
            // 代码
            this.codeViewer.setCode(algo.code);
            this.codeViewer.setDescription(algo.description || '');
            // 高亮选中
            this.sidebar.setSelected(id);

            // 数据输入框
            const dataGroup = document.getElementById('dataInputGroup');
            const randomBtn = document.getElementById('randomDataBtn');
            if (algo.dataParser) {
                dataGroup.style.display = 'flex';
                randomBtn.style.display = 'inline-flex';
                document.getElementById('dataInput').value =
                    Array.isArray(algo.defaultData) ? algo.defaultData.join(',') : (algo.defaultData || '');
            } else {
                dataGroup.style.display = 'none';
                randomBtn.style.display = 'none';
            }

            // 清空日志
            document.getElementById('logViewer').innerHTML = '';
            // 切换到代码 tab
            document.querySelectorAll('.section-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'code'));
            this.codeViewer.showTab('code');

            // 运行算法
            this._runAlgorithm();
            this.toast.info(`已加载：${algo.name}`);
        }

        _runAlgorithm() {
            if (!this.currentAlgo) return;
            try {
                const data = this.currentData;
                const result = AlgorithmLoader.runAlgorithm(this.currentAlgo.id, data);
                // 设置 buildState（自定义或默认）
                this.animator._buildState = this.currentAlgo.buildState || null;
                this.animator.loadSteps(result.steps);
                // 更新画布标签
                document.getElementById('canvasLabel').textContent = this.currentAlgo.name;
                // 隐藏空状态
                document.getElementById('canvasEmpty').style.display = 'none';
                // 重置到第一步以显示初始状态
                this.animator.goToStep(0);
                this.controls.updateState();
                // 依据动画内容自适应画布高度（树/堆/图/DP 表贴合内容，纯数组类弹性填充）
                this.animator._applyContentSizing();
            } catch (err) {
                console.error(err);
                this.toast.error('算法执行出错: ' + err.message);
            }
        }

        _applyData() {
            if (!this.currentAlgo || !this.currentAlgo.dataParser) return;
            const str = document.getElementById('dataInput').value.trim();
            try {
                const data = AlgorithmLoader.parseData(this.currentAlgo.id, str);
                if (!data || (Array.isArray(data) && data.length === 0)) {
                    this.toast.warning('数据为空，使用默认数据');
                    this.currentData = this.currentAlgo.defaultData;
                } else {
                    this.currentData = data;
                }
                this._runAlgorithm();
                this.toast.success('数据已应用');
            } catch (err) {
                this.toast.error('数据格式错误: ' + err.message);
            }
        }

        _randomData() {
            if (!this.currentAlgo || !this.currentAlgo.dataParser) return;
            const size = 8 + Math.floor(Math.random() * 4);
            const isStringAlgo = ['string.kmpNext', 'string.kmpMatch'].includes(this.currentAlgo.id);
            let data;
            if (isStringAlgo) {
                this.toast.warning('字符串算法不支持随机数据');
                return;
            } else if (['classic.nqueens'].includes(this.currentAlgo.id)) {
                data = [Math.min(6, 4 + Math.floor(Math.random() * 2))];
            } else if (['classic.fibRec', 'classic.fibDp'].includes(this.currentAlgo.id)) {
                data = [6 + Math.floor(Math.random() * 6)];
            } else if (this.currentAlgo.category === 'tree' && ['tree.avlInsert', 'tree.bstInsert', 'tree.heapInsert', 'tree.heapify'].includes(this.currentAlgo.id)) {
                // 生成不重复的随机数据
                const set = new Set();
                while (set.size < size) set.add(10 + Math.floor(Math.random() * 90));
                data = Array.from(set);
            } else {
                data = Array.from({ length: size }, () => Math.floor(Math.random() * 50) + 1);
            }
            this.currentData = data;
            document.getElementById('dataInput').value = Array.isArray(data) ? data.join(',') : '';
            this._runAlgorithm();
            this.toast.info('已生成随机数据');
        }

        _buildSubtitle(algo) {
            const parts = [];
            if (algo.complexity) parts.push(`时间 ${algo.complexity.time}`);
            if (algo.complexity && algo.complexity.space) parts.push(`空间 ${algo.complexity.space}`);
            return parts.join(' · ');
        }

        _appendLog(message, level) {
            const viewer = document.getElementById('logViewer');
            const line = document.createElement('div');
            line.className = `log-line ${level || 'info'}`;
            const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
            line.innerHTML = `<span class="log-time">${time}</span>${this._escHtml(message)}`;
            viewer.appendChild(line);
            viewer.scrollTop = viewer.scrollHeight;
        }

        _escHtml(s) {
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        _updateAlgoCount() {
            const list = AlgorithmLoader.list();
            document.getElementById('algoCountStat').textContent = `${list.length} 算法`;
            document.getElementById('implProgress').textContent = `${list.length} / ${list.length}`;
        }

        _setupResize() {
            window.addEventListener('resize', () => {
                if (this._resizeRaf) cancelAnimationFrame(this._resizeRaf);
                this._resizeRaf = requestAnimationFrame(() => {
                    this.renderer.resize();
                    // 重新计算图布局缓存键（尺寸已变）并按内容自适应画布高度
                    this.animator._applyContentSizing();
                });
            });
        }

        _observeTheme() {
            // 通过 ThemeSwitcher 间接调用 _renderCurrent
            // 已在 ThemeSwitcher.setTheme 中处理
        }

        _setupSidebarResize() {
            const sidebar = document.querySelector('.sidebar');
            const resizer = document.getElementById('sidebarResizer');
            let dragging = false;
            let startX = 0, startW = 0;
            resizer.addEventListener('mousedown', e => {
                dragging = true;
                startX = e.clientX;
                startW = sidebar.offsetWidth;
                resizer.classList.add('dragging');
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                e.preventDefault();
            });
            document.addEventListener('mousemove', e => {
                if (!dragging) return;
                const w = Math.max(220, Math.min(480, startW + (e.clientX - startX)));
                sidebar.style.width = w + 'px';
                sidebar.style.minWidth = w + 'px';
                // 通知画布重绘
                if (this.renderer) {
                    this.renderer.resize();
                    this.animator._applyContentSizing();
                }
            });
            document.addEventListener('mouseup', () => {
                if (dragging) {
                    dragging = false;
                    resizer.classList.remove('dragging');
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                }
            });
        }

        async _registerSW() {
            // file:// 协议或非 http(s) 协议下不注册 SW（浏览器不支持）
            if (location.protocol === 'file:' || location.protocol !== 'http:' && location.protocol !== 'https:') {
                console.log('[AlgoLens] file:// 协议下跳过 Service Worker 注册');
                return;
            }
            if (!('serviceWorker' in navigator)) return;
            try {
                const reg = await navigator.serviceWorker.register('./sw.js');
                console.log('[AlgoLens] Service Worker 已注册');

                // 首次注册时若已有新版本等待安装，立即提示
                if (reg.waiting) {
                    this._promptSWUpdate(reg);
                }

                // 后续更新：发现新 SW 时提示
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this._promptSWUpdate(reg);
                        }
                    });
                });

                // 新 SW 接管后自动刷新，应用新版本
                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (refreshing) return;
                    refreshing = true;
                    window.location.reload();
                });
            } catch (err) {
                console.warn('[AlgoLens] Service Worker 注册失败:', err);
            }
        }

        _promptSWUpdate(reg) {
            this.toast.show('发现新版本，点击刷新', 'info', 6000);
            // 复用 toast 容器事件：给 toast 元素绑定点击刷新（仅当存在等待中的 SW）
            const container = document.getElementById('toastContainer');
            if (!container) return;
            const lastToast = container.lastElementChild;
            if (!lastToast) return;
            lastToast.style.cursor = 'pointer';
            lastToast.addEventListener('click', () => {
                if (reg.waiting) reg.waiting.postMessage('skipWaiting');
                else window.location.reload();
            });
        }
    }

    // 启动
    function boot() {
        const app = new App();
        global.app = app;
        app.init().catch(err => {
            console.error('[AlgoLens] 启动失败:', err);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})(window);
