/**
 * StateBuilders - 公共状态构建器
 *
 * 从各算法文件中提取去重（原 buildBinaryTreeState / buildGraphState
 * 在 tree/p1/p2/p3/advanced/graph 各文件中重复定义 4+ 份）。
 * 合并策略：取功能最全版本（树布局自适应 + 边高亮 + overlay 浮层，
 * 图力导向布局 + 位置缓存 + overlay），统一布局参数。
 *
 * 算法文件通过 `const buildBinaryTreeState = StateBuilders.buildBinaryTreeState;`
 * 别名引用，注册块的 buildState 字段无需改动。
 */
(function (global) {
    'use strict';

    // 图布局位置缓存（模块级，避免 this 绑定问题：算法文件以别名方式引用本函数）
    const graphPosCache = new Map();

    const StateBuilders = {
        /**
         * 二叉树状态构建器
         * @param {object} tracerStates - 各 tracer 的快照 { tree: { nodes, root, ... } }
         * @param {number} [step] - 当前步骤（兼容签名，未使用）
         * @param {object} [ctxInfo] - 画布尺寸 { width, height }，用于自适应缩放
         */
        buildBinaryTreeState(tracerStates, step, ctxInfo) {
            const snap = tracerStates.tree;
            if (!snap) return null;
            const nodes = snap.nodes;
            if (!nodes || !nodes.length) return { tree: { nodes: [], edges: [] } };

            // 辅助面板（栈/队列）：树布局使用收缩后的主区宽度
            const canvasW = ctxInfo ? ctxInfo.width : 0;
            const canvasH = ctxInfo ? ctxInfo.height : 0;
            const aux = (canvasW && typeof Animator !== 'undefined' && Animator.computeAuxLayout)
                ? Animator.computeAuxLayout(tracerStates, canvasW, canvasH)
                : { mainW: canvasW, overlays: [] };

            const layoutNodes = nodes.map(n => ({
                value: n ? n.value : null,
                left: n ? n.left : null,
                right: n ? n.right : null,
                state: n ? n.state : 'default',
                tag: n ? n.tag : '',
                hidden: !n || n.hidden
            }));
            const positions = LayoutEngine.layoutBinaryTree(layoutNodes, snap.root, {
                y: 50, vGap: 65, hGap: 26, nodeRadius: 18,
                fitWidth: aux.mainW,
                fitHeight: canvasH
            });
            // 布局可能自适应缩小半径（深树防重叠），渲染层使用同一半径
            const radius = positions._radius || 18;

            const renderNodes = nodes.map((n, i) => ({
                x: positions[i] ? positions[i].x : 0,
                y: positions[i] ? positions[i].y : 0,
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
            const result = { tree: { nodes: renderNodes, edges, options: { radius, fontSize } } };
            // 辅助面板（栈/队列）：独立方块显示递归调用栈、BFS 队列等
            if (aux.overlays.length) {
                result.overlays = aux.overlays;
            }
            return result;
        },

        /**
         * 图状态构建器（力导向布局 + 位置缓存）
         * @param {object} tracerStates - 各 tracer 的快照 { graph: { vertices, edges } }
         * @param {number} [step] - 当前步骤（兼容签名，未使用）
         * @param {object} [ctxInfo] - 画布尺寸 { width, height }
         */
        buildGraphState(tracerStates, step, ctxInfo) {
            const snap = tracerStates.graph;
            if (!snap) return null;
            const w = (ctxInfo && ctxInfo.width) ||
                (typeof window !== 'undefined' && window.app && window.app.renderer && window.app.renderer.width) || 800;
            const h = (ctxInfo && ctxInfo.height) ||
                (typeof window !== 'undefined' && window.app && window.app.renderer && window.app.renderer.height) || 400;
            const padding = 50;
            // 辅助面板（栈/队列）：图布局使用收缩后的主区宽度
            const aux = (typeof Animator !== 'undefined' && Animator.computeAuxLayout)
                ? Animator.computeAuxLayout(tracerStates, w, h)
                : { mainW: w, overlays: [] };
            const radius = Math.min(22, Math.min(aux.mainW, h) / 8);

            // 位置缓存：同一顶点数 + 同一画布尺寸复用布局，避免每步重算（节点位置不变）。
            // 必须含尺寸维度——不同尺寸（如窗口缩放）复用布局会导致节点越界
            const cacheKey = snap.vertices.length + 'x' + Math.round(aux.mainW) + 'x' + Math.round(h);
            let positions = graphPosCache.get(cacheKey);
            if (!positions || positions.length !== snap.vertices.length) {
                positions = LayoutEngine.layoutGraphForce(snap.vertices, snap.edges, {
                    width: aux.mainW - padding * 2, height: h - padding * 2
                });
                // 偏移到画布内
                positions.forEach(p => { p.x += padding; p.y += padding; });
                graphPosCache.set(cacheKey, positions);
            }
            const vertices = snap.vertices.map((v, i) => ({ ...positions[i], ...v }));
            const result = { graph: { vertices, edges: snap.edges, options: { radius, fontSize: 13 } } };
            if (aux.overlays.length) {
                result.overlays = aux.overlays;
            }
            return result;
        },

    /**
     * 堆状态构建器：左（树） + 右（数组）双视图（左右布局，类似两个方框）。
     * 把堆数组（完全二叉树）以“树”形式置于左侧，数组以一行方块置于右侧，二者在同一
     * 行内左右并排。两框宽度按各自内容真实宽度分配（树天然比数组宽，等宽会浪费右侧空间），
     * 剩余空隙再按比例补回，使双框合起来铺满动画区；上下只留 6px 空隙。
     * cell 上限 76px，空间不足时等比缩小，保证两框内容（含树根上方指针、数组下方指针、
     * 索引）都完整不被裁切。数组上的指针（i / p 等）同步映射到树节点标签。
     * @param {object} tracerStates - 含 { array: ArrayTracer 快照 }
     * @param {number} [step]
     * @param {object} [ctxInfo] - 画布尺寸 { width, height }
     */
    buildHeapState(tracerStates, step, ctxInfo) {
        const haveDefault = this && typeof this._defaultStateBuilder === 'function';
        const base = (haveDefault ? this._defaultStateBuilder(tracerStates, step, ctxInfo) : null) || {};
        // 找到堆数组快照（不依赖 tracer 注册名，可能是 'array' 或 'arr'）
        let snap = null;
        for (const key in tracerStates) {
            const s = tracerStates[key];
            if (s && s._type === 'array' && s.items) { snap = s; break; }
        }
        if (!snap) return base;

        const items = snap.items;
        const n = items.length;
        const w = (ctxInfo && ctxInfo.width) ||
            (typeof window !== 'undefined' && window.app && window.app.renderer && window.app.renderer.width) || 900;
        const h = (ctxInfo && ctxInfo.height) ||
            (typeof window !== 'undefined' && window.app && window.app.renderer && window.app.renderer.height) || 560;

        const arrGap = 7;
        const ML = 18, MR = 18, GAP = 20;           // 左右外边距 + 两框间隔（收紧，把宽度让给内容）
        const boxTop = 6;                           // 双框几乎贴动画区上沿，只留一点点空隙
        const boxBottom = Math.max(boxTop + 120, h - 6);
        const boxH = boxBottom - boxTop;
        const innerPad = 14;                        // 框内边距
        const totalBoxW = Math.max(220, w - ML - MR - GAP);      // 两框可占用的总宽度
        const contentAvailW = Math.max(80, totalBoxW - innerPad * 4); // 扣掉两框各自的内边距

        // 空堆（如"堆插入"的第 0 步）：不做树/数组布局，但仍绘制两个方框，
        // 避免动画开头没有边框、下一步框突然出现造成跳变。
        if (n === 0) {
            const halfW = Math.round(totalBoxW / 2);
            base.tree = { nodes: [], edges: [], options: { radius: 20, fontSize: 13 } };
            base.boxes = [
                { x: ML, y: boxTop, w: halfW, h: boxH, label: '树 (Tree)', fill: true, align: 'right' },
                { x: w - MR - (totalBoxW - halfW), y: boxTop, w: totalBoxW - halfW, h: boxH, label: '数组 (Array)', fill: true, align: 'right' }
            ];
            return base;
        }

        // 堆数组 ↔ 完全二叉树：下标 i 的左右子为 2i+1 / 2i+2
        const nodes = items.map((it, i) => ({
            value: it.value,
            state: it.state || 'default',
            tag: it.tag || '',
            left: (2 * i + 1 < n) ? 2 * i + 1 : null,
            right: (2 * i + 2 < n) ? 2 * i + 2 : null,
            hidden: false
        }));

        // 完全二叉树深度（用于预估树高）
        let depth = 0;
        const walkD = (i, d) => {
            if (i >= n) return;
            if (d > depth) depth = d;
            walkD(2 * i + 1, d + 1);
            walkD(2 * i + 2, d + 1);
        };
        walkD(0, 0);

        // 尺寸：让「左树 / 右数组」两个方框一起铺满动画区。
        // 关键改进：两框不再等宽——树的真实宽度约为 n*(cell+hGap)，数组约为 n*(cell+arrGap)，
        // 树天然更宽。等宽会让树成为唯一瓶颈、同时数组两侧空出大片留白。
        // 现在按「各自内容真实宽度」占用空间，剩余空隙再按比例补回两框，
        // 于是同样的画布宽度可以撑出更大的 cell（方块 / 节点都更大），数组也不再有大留白。
        const CELL_MAX = 76, CELL_MIN = 14;
        // 树最底层节点圆圈下边框与背景框底边之间留出约两个边框粗细的间隙，避免贴在一起。
        const TREE_BOTTOM_GAP = 4;
        // 框顶部预留：根节点上方的标签胶囊（离圆心 r+16、半高 9 → 共 25px）再留 3px 余量，
        // 保证根节点的索引/指针标签不会压到方框上边框。
        const tagReserve = 28;
        // 每个候选 cell 的几何量（树/数组的宽高）
        const metrics = (c) => {
            const rr = c / 2;
            const vg = Math.round(c * 1.15) + 28;   // +28：树节点标签竖向空间（防父子标签互相覆盖）
            const hg = Math.round(c * 0.45);
            const bo = Math.max(12, Math.round(c * 0.28));
            const ps = Math.max(0.6, Math.min(2.5, c / 48));
            const pe = Math.round(30 * ps + 26);
            return {
                r: rr, vGap: vg, hGap: hg, belowOffset: bo, pointerExt: pe,
                // LayoutEngine 用中序遍历排布，真实总宽 = 节点数 * (直径 + 水平间距)
                treeW: n * (2 * rr + hg),
                arrW: n > 0 ? n * c + (n - 1) * arrGap : 0,
                // treeH 额外加上 TREE_BOTTOM_GAP，让 fitting 自动缩小 cell 以留出底部间隙
                treeH: tagReserve + (depth > 0 ? depth * vg : 0) + c + TREE_BOTTOM_GAP,
                arrH: tagReserve + c + bo + pe
            };
        };

        let cell = CELL_MAX;
        for (let iter = 0; iter < 40; iter++) {
            const m = metrics(cell);
            const needW = m.treeW + m.arrW;                 // 两框内容并排的总宽
            const needH = Math.max(m.treeH, m.arrH);
            if ((needW <= contentAvailW && needH <= boxH) || cell <= CELL_MIN) break;
            const sx = needW > contentAvailW ? contentAvailW / needW : 1;
            const sy = needH > boxH ? boxH / needH : 1;
            let f = Math.min(sx, sy);
            if (f > 0.99) f = 0.99;                          // 保证每轮必有收敛进展
            cell = Math.max(CELL_MIN, Math.floor(cell * f));
        }

        const mBase = metrics(cell);

        // 两框宽度：先各自贴合内容，再把剩余空隙按内容比例补回，使双框合起来铺满动画区
        let treeBoxW = mBase.treeW + innerPad * 2;
        let arrBoxW = mBase.arrW + innerPad * 2;
        const slack = totalBoxW - treeBoxW - arrBoxW;
        if (slack > 0) {
            const sum = treeBoxW + arrBoxW || 1;
            treeBoxW += slack * (treeBoxW / sum);
            arrBoxW += slack * (arrBoxW / sum);
        }
        treeBoxW = Math.max(120, Math.round(treeBoxW));
        arrBoxW = Math.max(100, Math.round(totalBoxW - treeBoxW));

        // 二次放大：树受「深度 × 层高」限制通常是高度瓶颈，而数组只有一行、竖向很宽裕。
        // 若继续强制"数组方块 == 树节点直径"，数组框两侧就会空出大片留白、方块偏小。
        // 因此这里让两者在各自的框内独立长到最大：视觉上仍同源（同样的圆角/字号比例），
        // 但数组方块可以比树节点更大。arrCell 不超过树节点的 1.6 倍，避免尺寸差过于突兀。
        // 均取偶数：树节点半径 = cell/2 必须是整数，否则描边落在半像素上会发虚，
        // 且顶部标签的预留计算会差 0.5px 导致胶囊压到框边框。
        const grow = (start, fits) => {
            let c = start - (start % 2);
            while (c + 2 <= CELL_MAX && fits(c + 2)) c += 2;
            return Math.max(2, c);
        };
        const treeInnerW = Math.max(40, treeBoxW - innerPad * 2);
        const arrInnerW = Math.max(40, arrBoxW - innerPad * 2);
        cell = grow(cell, (c) => { const m = metrics(c); return m.treeW <= treeInnerW && m.treeH <= boxH; });
        const arrCellCap = Math.min(CELL_MAX, Math.round(cell * 1.6));
        const arrCell = grow(cell, (c) => {
            if (c > arrCellCap) return false;
            const m = metrics(c);
            return m.arrW <= arrInnerW && m.arrH <= boxH;
        });

        const m0 = metrics(cell);
        const mA = metrics(arrCell);
        const r = m0.r;
        const vGap = m0.vGap;
        const hGap = m0.hGap;
        const treeH = m0.treeH;
        const belowOffset = mA.belowOffset;   // 指针几何跟随数组方块尺寸
        const pointerExt = mA.pointerExt;

        // 树布局（左侧框内）：根节点在框内垂直居中（顶部预留标签空间），整棵树水平居中于左框
        const rootCenterY = boxTop + (boxH - treeH) / 2 + tagReserve + r;
        const positions = LayoutEngine.layoutBinaryTree(nodes, 0, {
            x: 0, y: rootCenterY, hGap, vGap, nodeRadius: r, fitWidth: 0, fitHeight: 0
        });
        const radius = positions._radius || r;
        cell = Math.round(2 * radius);

        // 归一化：整棵树平移，使其水平居中于左框；根节点标签顶部始终 ≥ boxTop（不被框顶裁切）
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        positions.forEach((p, i) => {
            if (nodes[i] && !nodes[i].hidden) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            }
        });
        const treeBoxCX = ML + treeBoxW / 2;
        const shiftX = treeBoxCX - (minX + maxX) / 2;
        const shiftY = rootCenterY - minY;
        positions.forEach(p => { p.x += shiftX; p.y += shiftY; });

        const treeFont = Math.max(11, Math.min(28, Math.round(radius * 0.62)));

        const treeNodes = nodes.map((nd, i) => {
            const p = positions[i];
            return {
                x: p ? p.x : 0,
                y: p ? p.y : 0,
                label: String(nd.value),
                state: nd.state,
                tag: nd.tag,
                tagColor: null
            };
        });
        // 数组上的指针（i / p 等）同步到树节点，强调“数组下标即树节点”
        if (snap.pointers && snap.pointers.length) {
            snap.pointers.forEach(pt => {
                if (treeNodes[pt.index]) {
                    treeNodes[pt.index].tag = pt.label;
                    treeNodes[pt.index].tagColor = pt.color || null;
                }
            });
        }
        const edges = [];
        for (let i = 0; i < n; i++) {
            if (2 * i + 1 < n) edges.push({ parent: i, child: 2 * i + 1 });
            if (2 * i + 2 < n) edges.push({ parent: i, child: 2 * i + 2 });
        }
        base.tree = { nodes: treeNodes, edges, options: { radius, fontSize: treeFont } };

        // 数组移到右侧框（框内垂直居中）；单元格 cellW===cellH 始终正方；
        // 索引放数组上方，指针放数组下方、向上指。
        const arrayW = n > 0 ? n * (arrCell + arrGap) - arrGap : 0;
        const arrBoxX = w - MR - arrBoxW;
        const arrBoxCX = arrBoxX + arrBoxW / 2;
        const optsX = Math.round(arrBoxCX - arrayW / 2);
        // 顶部让出 tagReserve（索引 / 指针标签在方块上方），再把剩余空间居中
        const arrBlockH = arrCell + belowOffset + pointerExt;
        const optsY = Math.round(boxTop + tagReserve + Math.max(0, (boxH - tagReserve - arrBlockH) / 2));
        const opts = base.array && base.array.options ? base.array.options : null;
        if (opts) {
            opts.cellW = arrCell;
            opts.cellH = arrCell;         // 正方形单元格
            opts.gap = arrGap;
            opts.x = optsX;
            opts.y = optsY;
            opts.showIndex = true;
            opts.indexPosition = 'top';
            opts.fontSize = Math.max(11, Math.min(30, Math.round(arrCell * 0.34)));
            opts.radius = Math.round(arrCell * 0.16);
            opts.below = true;
            opts.belowOffset = belowOffset;
            opts._horizontal = true;      // 标记：堆双视图（左右），供 _applyContentSizing 识别
        }

        // 两个方框背景（左：树；右：数组），几乎铺满整个动画区，强化“左右双视图”
        base.boxes = [
            { x: ML, y: boxTop, w: treeBoxW, h: boxH, label: '树 (Tree)', fill: true, align: 'right' },
            { x: arrBoxX, y: boxTop, w: arrBoxW, h: boxH, label: '数组 (Array)', fill: true, align: 'right' }
        ];

        return base;
    },

    /**
     * 基数排序 (LSD) 状态构建器：左（输入数组）+ 右（桶表）左右布局。
     * 输入数组以垂直长列置于左侧，桶表以 10 行网格铺满右侧、高度接近画布高度。
     * 不绘制独立背景方框，两区之间保留合理间隙，且桶表顶部列索引不被裁切。
     * @param {object} tracerStates - 含 { arr: ArrayTracer, buckets: DPTableTracer }
     * @param {number} [step]
     * @param {object} [ctxInfo] - 画布尺寸 { width, height }
     */
    buildRadixSortState(tracerStates, step, ctxInfo) {
        const haveDefault = this && typeof this._defaultStateBuilder === 'function';
        const base = (haveDefault ? this._defaultStateBuilder(tracerStates, step, ctxInfo) : null) || {};

        let arrSnap = null, dpSnap = null;
        for (const key in tracerStates) {
            const s = tracerStates[key];
            if (!s) continue;
            if (s._type === 'array' && s.items) arrSnap = s;
            if (s._type === 'dptable' && s.cells) dpSnap = s;
        }
        if (!arrSnap || !dpSnap) return base;

        const w = (ctxInfo && ctxInfo.width) ||
            (typeof window !== 'undefined' && window.app && window.app.renderer && window.app.renderer.width) || 900;
        const h = (ctxInfo && ctxInfo.height) ||
            (typeof window !== 'undefined' && window.app && window.app.renderer && window.app.renderer.height) || 560;

        const tokens = (typeof Renderer !== 'undefined' && Renderer.prototype && Renderer.prototype._tokens)
            ? Renderer.prototype._tokens()
            : { radiusSmall: 6 };

        const n = arrSnap.items.length;
        const rows = dpSnap.rows || 10;
        const cols = dpSnap.cols || 1;

        // 布局参数：左右边距、两区间隙、上下留白
        const MARGIN_L = 28, MARGIN_R = 24, GAP_MID = 34;
        const MARGIN_TOP = 34, MARGIN_BOT = 20;
        const availH = Math.max(160, h - MARGIN_TOP - MARGIN_BOT);

        // 右侧桶表：高度铺满 availH，10 行均分；先按 availH 算单元格高，再 clamp 到 [18,64]，
        // 并回退一行高确保 bucketRowsH <= availH（防止底部裁切）。列标签在 bucketTop 上方 12px，
        // 故 bucketTop 至少留出 12px 上边距。
        const rightX0 = Math.round(w * 0.38);   // 左区占约 38%，右区从 38% 开始
        const rightW = w - rightX0 - MARGIN_R;
        const bucketGap = 3;
        const bucketTopMin = MARGIN_TOP + 14;   // 给顶部列标签留 12px + 2px 余量
        const bucketAvailH = Math.max(rows * 18, h - bucketTopMin - MARGIN_BOT);
        let bucketCellH = Math.floor((bucketAvailH + bucketGap) / rows) - bucketGap;
        bucketCellH = Math.max(18, Math.min(64, bucketCellH));
        let bucketRowsH = rows * (bucketCellH + bucketGap) - bucketGap;
        if (bucketRowsH > bucketAvailH) {
            bucketCellH = Math.max(18, Math.floor((bucketAvailH + bucketGap) / rows) - bucketGap);
            bucketRowsH = rows * (bucketCellH + bucketGap) - bucketGap;
        }
        const bucketTop = bucketTopMin + Math.max(0, (bucketAvailH - bucketRowsH) / 2);
        // 列宽：按内容（最大数字宽度）自适应，同时保证最大值放进去时宽一些、高一些
        let maxValW = 0;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const c = dpSnap.cells[i][j];
                if (!c) continue;
                const t = (c.value === null || c.value === undefined) ? '' : String(c.value);
                if (t) {
                    const tw = (this && this._measureTextWidth) ? this._measureTextWidth(t, 14) : t.length * 9;
                    if (tw > maxValW) maxValW = tw;
                }
            }
        }
        const bucketCellWFromContent = Math.max(34, maxValW + 18);
        const bucketCellWFromWidth = Math.max(20, Math.floor((rightW - 32 - bucketGap) / Math.max(cols, 1)) - bucketGap);
        const bucketCellW = Math.min(90, Math.max(bucketCellWFromContent, bucketCellWFromWidth));

        // 左侧输入数组：垂直长列，方块尺寸与右侧桶表高度协调，让两者视觉统一。
        // 先按 bucketAvailH 反推数组最大允许高度，确保不超出画布底边。
        const leftW = rightX0 - MARGIN_L - GAP_MID;
        const arrCellW = Math.max(48, Math.min(92, leftW - 24));
        const arrGap = 6;
        const maxArrCellH = Math.floor((bucketAvailH - (n - 1) * arrGap) / n);
        // 数组方块高度：取“与宽度相近的正方形感”和“桶表单元格高度的 1.15 倍”中较小者，
        // 再用 maxArrCellH 封顶；画布过小时允许降到 22，避免裁切。
        let arrCellH = Math.min(arrCellW, bucketCellH * 1.15);
        arrCellH = Math.min(maxArrCellH, arrCellH);
        arrCellH = Math.max(Math.min(32, maxArrCellH), arrCellH);
        const arrTotalH = n * (arrCellH + arrGap) - arrGap;
        // 数组垂直居中于右侧桶表可用区域
        const arrTop = bucketTopMin + Math.max(0, (bucketAvailH - arrTotalH) / 2);
        const arrLeft = MARGIN_L + Math.max(0, (leftW - arrCellW) / 2);

        // 构建左侧数组 shapes（垂直列，索引在左侧）
        const shapes = [];
        arrSnap.items.forEach((it, i) => {
            const y = arrTop + i * (arrCellH + arrGap);
            const st = it.state || 'default';
            shapes.push({
                kind: 'rect',
                x: arrLeft, y, w: arrCellW, h: arrCellH,
                color: (this && this._stateColor) ? this._stateColor(st) : '#e8f5e9',
                radius: tokens.radiusSmall,
                label: String(it.value ?? ''),
                opts: { stroke: (this && this._stateBorder) ? this._stateBorder(st) : '#81c784', strokeWidth: 2, fontSize: Math.max(13, Math.round(arrCellH * 0.38)) }
            });
            // 索引放在方块左侧
            shapes.push({
                kind: 'text',
                x: arrLeft - 10, y: y + arrCellH / 2,
                text: String(i),
                color: (this && this.renderer && this.renderer._panelText) ? this.renderer._panelText() : '#555',
                fontSize: 11, align: 'right', opts: { bold: true }
            });
        });

        // 桶表列标签（顶部，确保不被裁切）
        const bucketStartX = rightX0 + 24;
        const bucketTotalW = cols * (bucketCellW + bucketGap) - bucketGap;
        const bucketStartXCentered = bucketStartX + Math.max(0, (rightW - 24 - bucketTotalW) / 2);
        const colFont = Math.max(10, Math.min(14, Math.round(bucketCellH * 0.32)));
        for (let j = 0; j < cols; j++) {
            const label = dpSnap.colLabels && dpSnap.colLabels[j] !== undefined ? dpSnap.colLabels[j] : String(j);
            shapes.push({
                kind: 'text',
                x: bucketStartXCentered + j * (bucketCellW + bucketGap) + bucketCellW / 2,
                y: bucketTop - 12,
                text: String(label),
                color: (this && this.renderer && this.renderer._panelText) ? this.renderer._panelText() : '#555',
                fontSize: colFont, align: 'center', opts: { bold: true }
            });
        }
        // 桶表行标签（左侧，0-9）
        for (let i = 0; i < rows; i++) {
            const label = dpSnap.rowLabels && dpSnap.rowLabels[i] !== undefined ? dpSnap.rowLabels[i] : String(i);
            shapes.push({
                kind: 'text',
                x: bucketStartXCentered - 10,
                y: bucketTop + i * (bucketCellH + bucketGap) + bucketCellH / 2,
                text: String(label),
                color: (this && this.renderer && this.renderer._panelText) ? this.renderer._panelText() : '#555',
                fontSize: colFont, align: 'right', opts: { bold: true }
            });
        }
        // 桶表单元格
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const c = dpSnap.cells[i][j];
                if (!c) continue;
                const st = c.state || 'default';
                const val = (c.value === null || c.value === undefined) ? '' : String(c.value);
                shapes.push({
                    kind: 'rect',
                    x: bucketStartXCentered + j * (bucketCellW + bucketGap),
                    y: bucketTop + i * (bucketCellH + bucketGap),
                    w: bucketCellW, h: bucketCellH,
                    color: (this && this._stateColor) ? this._stateColor(st) : '#e8f5e9',
                    radius: tokens.radiusSmall,
                    label: val,
                    opts: { stroke: (this && this._stateBorder) ? this._stateBorder(st) : '#81c784', strokeWidth: 2, fontSize: colFont }
                });
            }
        }

        base.shapes = shapes;
        // 屏蔽默认数组/dptable，避免重复渲染
        delete base.array;
        return base;
    }
    };

    global.StateBuilders = StateBuilders;
})(window);
