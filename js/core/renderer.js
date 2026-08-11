/**
 * Renderer - Canvas 2D 渲染封装
 *
 * 提供数组、图、树、节点、边、指针等元素的绘制接口。
 * Animator 在每一步调用 renderFrame(state) 时，Renderer 根据 state 重绘整个画面。
 * 视觉风格与组件库保持一致：
 *   - 浅色主题：有机亲自然，对称圆角 + 柔和绿调阴影
 *   - 深色主题：VisionOS 空间玻璃，饱满圆角 + 深邃悬浮阴影
 */
(function (global) {
    'use strict';

    // 语义颜色（与 CSS 变量同步）
    const COLORS = {
        compare: '#f78166',
        swap: '#d29922',
        sorted: '#3fb950',
        current: '#58a6ff',
        visited: '#bc8cff',
        instack: '#a371f7',
        pivot: '#f0883e',
        rotate: '#ff6b6b',
        backtrack: '#ff6b6b',
        success: '#3fb950',
        error: '#f78166',
        warning: '#d29922',
        info: '#58a6ff',
        queue: '#bc8cff',
        stack: '#58a6ff',
        default: '#6e7681'
    };

    // 主题视觉令牌（"锐利平面"风格：实色填充 + 实线边框，无模糊、无发光、无扩散阴影）
    // 所有颜色均为不透明实色，保证画布上不产生半透明叠加造成的"发灰/发虚"观感。
    const THEME = {
        light: {
            cell: '#E4F1D4',
            cellBorder: '#4F7F2E',
            node: '#E4F1D4',
            nodeBorder: '#4F7F2E',
            panelBg: '#FFFFFF',
            auxBg: '#F3F7EB',
            dim: '#4C5C39',
            panelText: '#1C2712',
            canvasBg: '#FBFCF8',
            boxFill: '#F5F8EF',
            boxBorder: '#9DB585',
            boxLabelBg: '#FFFFFF',
            edge: '#8AA372',
            rbRed: '#E85D4C',
            rbBlack: '#2D3A4F',
            radiusCell: [10, 10, 10, 10],
            radiusRect: [12, 12, 12, 12],
            radiusSmall: [6, 6, 6, 6],
            font: '"Nunito Sans", "Inter", sans-serif',
            mono: '"JetBrains Mono", "Space Mono", monospace'
        },
        dark: {
            cell: '#26345A',
            cellBorder: '#8FA4CC',
            node: '#2B3A61',
            nodeBorder: '#8FA4CC',
            panelBg: '#131C2F',
            auxBg: '#16203A',
            dim: '#AFBED6',
            panelText: '#E9EFFB',
            canvasBg: '#0D1424',
            boxFill: '#141D31',
            boxBorder: '#3B4B6B',
            boxLabelBg: '#1A2440',
            edge: '#5A6E93',
            rbRed: '#FF6B6B',
            rbBlack: '#8FA4CC',
            radiusCell: [10, 10, 10, 10],
            radiusRect: [12, 12, 12, 12],
            radiusSmall: [6, 6, 6, 6],
            font: 'Inter, Sora, sans-serif',
            mono: '"JetBrains Mono", "Space Mono", monospace'
        }
    };

    class Renderer {
        constructor(canvasId, options = {}) {
            this.canvas = typeof canvasId === 'string'
                ? document.getElementById(canvasId)
                : canvasId;
            this.ctx = this.canvas.getContext('2d');
            this.dpr = options.dpr || (window.devicePixelRatio || 1);
            this.width = 0;
            this.height = 0;
            this._theme = document.documentElement.getAttribute('data-theme') || 'dark';
            this._animFrame = null;
            this._tweens = [];
            this.resize();
        }

        setTheme(theme) {
            this._theme = theme;
        }

        _tokens() {
            return THEME[this._theme] || THEME.dark;
        }

        resize(width, height) {
            const w = width || this.canvas.clientWidth;
            const h = height || this.canvas.clientHeight;
            this.width = w;
            this.height = h;
            this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
            this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
            this.canvas.style.width = w + 'px';
            this.canvas.style.height = h + 'px';
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }

        clear() {
            this.ctx.clearRect(0, 0, this.width, this.height);
        }

        getCtx() { return this.ctx; }

        // ===== 颜色辅助 =====
        color(name) {
            return COLORS[name] || COLORS.default;
        }

        // ===== 基础图形 =====
        _noFill(color) {
            return color === undefined || color === null || color === 'none' || color === 'transparent';
        }

        // 锐利模式：不使用任何模糊 / 扩散阴影 / 发光，保持画面干净锐利。
        // 保留方法签名，避免调用点大改；内部统一关闭阴影。
        _setShadow(ctx) {
            this._clearShadow(ctx);
        }

        _clearShadow(ctx) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowOffsetX = 0;
        }

        // 整数像素对齐：偶数线宽落在整数坐标、奇数线宽落在半像素，边框才不会发虚
        _px(v, lineWidth) {
            const half = (lineWidth % 2) ? 0.5 : 0;
            return Math.round(v) + half;
        }

        // 活跃态不再用发光，改为「更粗的实线边框」表达强调，高对比且不刺眼
        _lineW(opts) {
            if (opts && opts.strokeWidth) return opts.strokeWidth;
            return (opts && (opts.glow || opts.pulse)) ? 3 : 2;
        }

        drawRect(x, y, w, h, color, borderRadius = 0, label = '', opts = {}) {
            const ctx = this.ctx;
            const tokens = this._tokens();
            ctx.save();
            this._clearShadow(ctx);
            const hasFill = !this._noFill(color);
            let radii = borderRadius;
            if (radii === undefined || radii === null) radii = tokens.radiusRect;

            const lw = this._lineW(opts);
            const rx = this._px(x, lw), ry = this._px(y, lw);
            const rw = Math.round(w), rh = Math.round(h);

            // 构建圆角路径（整数像素对齐）
            this._roundRectPath(rx, ry, rw, rh, radii);

            if (hasFill) {
                ctx.fillStyle = color;
                ctx.fill();
            }
            if (opts.stroke) {
                ctx.strokeStyle = opts.stroke;
                ctx.lineWidth = lw;
                ctx.stroke();
            }
            if (label) {
                // 有填充：按背景算高对比文字色；无填充（透明）：用主题面板文字色（在画布上可读）
                const labelColor = opts.labelColor || (hasFill ? this._textOn(color) : tokens.panelText);
                ctx.fillStyle = labelColor;
                const fontFamily = opts.fontFamily || tokens.font;
                let fs = opts.fontSize || 14;
                // 文字自适应：标签宽度超出方框时缩小字号，保证「方框内部文字完整展示不全」问题消失
                const maxW = Math.max(8, w - 8);
                fs = this._fitFont(String(label), maxW, fs, fontFamily, opts.bold);
                ctx.font = `${opts.bold ? 'bold ' : ''}${fs}px ${fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(label), Math.round(x + w / 2), Math.round(y + h / 2));
            }
            ctx.restore();
        }

        drawCircle(cx, cy, r, color, label = '', opts = {}) {
            const ctx = this.ctx;
            const tokens = this._tokens();
            ctx.save();
            this._clearShadow(ctx);
            // 整数像素：圆心与半径取整，2px 实线描边落在整像素上，边缘锐利不发虚
            const icx = Math.round(cx), icy = Math.round(cy), ir = Math.round(r);
            ctx.beginPath();
            ctx.arc(icx, icy, ir, 0, Math.PI * 2);
            if (!this._noFill(color)) {
                ctx.fillStyle = color;
                ctx.fill();
            }
            if (opts.stroke) {
                ctx.strokeStyle = opts.stroke;
                ctx.lineWidth = this._lineW(opts);
                ctx.stroke();
            }
            if (label) {
                const labelColor = opts.labelColor || (this._noFill(color) ? tokens.panelText : this._textOn(color));
                ctx.fillStyle = labelColor;
                const fontFamily = opts.fontFamily || tokens.font;
                let fs = opts.fontSize || 13;
                // 文字自适应：标签宽度超出圆形直径时缩小字号，保证「圆形内部文字完整展示不全」问题消失
                const maxW = Math.max(8, ir * 2 - 6);
                fs = this._fitFont(String(label), maxW, fs, fontFamily, opts.bold);
                ctx.font = `${opts.bold ? 'bold ' : ''}${fs}px ${fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(label), icx, icy);
            }
            ctx.restore();
        }

        drawLine(x1, y1, x2, y2, color, width = 2, opts = {}) {
            const ctx = this.ctx;
            ctx.save();
            this._clearShadow(ctx);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            if (opts.dash) ctx.setLineDash(opts.dash);
            // 纯水平 / 纯垂直线做像素对齐，斜线保持原坐标（对齐反而会抖动）
            let ax = x1, ay = y1, bx = x2, by = y2;
            if (Math.abs(x1 - x2) < 0.5) { ax = bx = this._px(x1, width); ay = Math.round(y1); by = Math.round(y2); }
            else if (Math.abs(y1 - y2) < 0.5) { ay = by = this._px(y1, width); ax = Math.round(x1); bx = Math.round(x2); }
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
            ctx.restore();
        }

        drawArrow(x1, y1, x2, y2, color, headSize = 8, width = 2, opts = {}) {
            const ctx = this.ctx;
            ctx.save();
            this._clearShadow(ctx);
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = width;
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const shorten = headSize;
            const ex = x2 - Math.cos(angle) * shorten;
            const ey = y2 - Math.sin(angle) * shorten;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(
                x2 - headSize * Math.cos(angle - Math.PI / 6),
                y2 - headSize * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
                x2 - headSize * Math.cos(angle + Math.PI / 6),
                y2 - headSize * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        drawText(x, y, text, color, fontSize = 14, align = 'center', opts = {}) {
            const ctx = this.ctx;
            const tokens = this._tokens();
            ctx.save();
            this._clearShadow(ctx);
            ctx.fillStyle = color;
            const fontFamily = opts.fontFamily || tokens.font;
            ctx.font = `${opts.bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
            ctx.textAlign = align;
            ctx.textBaseline = opts.baseline || 'middle';
            // 文字落在整数像素上，避免亚像素抗锯齿造成的"糊"
            ctx.fillText(String(text), Math.round(x), Math.round(y));
            ctx.restore();
        }

        drawEdge(u, v, color, label = '', opts = {}) {
            const ctx = this.ctx;
            ctx.save();
            this._clearShadow(ctx);
            const { x: x1, y: y1 } = u;
            const { x: x2, y: y2 } = v;
            ctx.strokeStyle = color;
            ctx.lineWidth = opts.width || 2;
            if (opts.dash) ctx.setLineDash(opts.dash);
            if (opts.directed) {
                this.drawArrow(x1, y1, x2, y2, color, opts.headSize || 10, opts.width || 2, opts);
            } else {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            if (label) {
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                const m = ctx.measureText(label);
                const tokens = this._tokens();
                ctx.fillStyle = tokens.panelBg;
                this._roundRectPath(mx - m.width / 2 - 5, my - 10, m.width + 10, 20, tokens.radiusSmall);
                ctx.fill();
                ctx.fillStyle = tokens.panelText;
                ctx.font = `11px ${tokens.mono}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, mx, my);
            }
            ctx.restore();
        }

        // ===== 高级组合动画 =====
    drawArray(items, opts = {}) {
        let {
            x = 60, y = 80,
            cellW = 48, cellH = 48, gap = 6,
            mode = 'cell',
            showIndex = true, showValue = true,
            indexPosition = 'bottom', // 'top' | 'bottom'
            radius = null,            // 方块的圆角半径（null=用主题令牌）；堆视图传 cell*0.16 使圆角比例与组件库一致
            fontSize = null,           // 未显式指定时按图块大小等比计算（大方块→大数字）
            barMaxHeight = 200, maxValue = null
            } = opts;

            const ctx = this.ctx;
            const tokens = this._tokens();

            // 单元格内数字字号随图块等比放大（方框很大时数字也相应变大，避免“大框小字”不匹配）；
            // 上限 42px、下限 12px，防止极端。显式传入的 fontSize 优先。
            if (!fontSize) {
                fontSize = Math.max(12, Math.min(42, Math.round(Math.min(cellW, cellH) * 0.5)));
                // 内容适配：当单元格文本较长时（如 "fib(5)"），按实际文本宽度进一步收缩字号，
                // 防止文字溢出到相邻单元格。纯数字/短标签通常不受影响。
                const fontFamily = tokens.mono;
                const pad = Math.max(6, Math.round(cellW * 0.12));
                const maxW = cellW - pad;
                let widest = '';
                for (const it of items) {
                    const t = String(it.value ?? '');
                    if (t.length > widest.length) widest = t;
                }
                if (widest) {
                    ctx.font = `${fontSize}px ${fontFamily}`;
                    while (fontSize > 12 && ctx.measureText(widest).width > maxW) {
                        fontSize -= 1;
                        ctx.font = `${fontSize}px ${fontFamily}`;
                    }
                }
            }
            const activeStates = new Set(['current', 'compare', 'swap', 'visited', 'pivot', 'rotate', 'instack', 'queue', 'stack']);

            items.forEach((item, i) => {
                const ix = x + i * (cellW + gap);
                const state = item.state || 'default';
                const color = this._stateColor(state, item.color);
                const isActive = activeStates.has(state);
                // 锐利模式：活跃态用 3px 实线边框强调（替代发光），非活跃态 2px
                const rectOpts = {
                    stroke: this._stateBorder(state),
                    strokeWidth: isActive ? 3 : 2,
                    fontFamily: tokens.mono
                };

                if (mode === 'bar') {
                    const maxV = maxValue || Math.max(...items.map(it => it.value || 0), 1);
                    const h = Math.max(8, (item.value / maxV) * barMaxHeight);
                    const by = y + (barMaxHeight - h);
                    this.drawRect(ix, by, cellW, h, color, tokens.radiusSmall, '', rectOpts);
                    if (showValue) {
                        this.drawText(ix + cellW / 2, by - 12, item.value, tokens.panelText, 12, 'center', { bold: true, fontFamily: tokens.mono });
                    }
                    if (showIndex) {
                        this.drawText(ix + cellW / 2, y + barMaxHeight + 18, i, tokens.dim, 11, 'center');
                    }
                } else {
                    this.drawRect(ix, y, cellW, cellH, color, radius || tokens.radiusCell, String(item.value ?? ''), Object.assign(rectOpts, { fontSize }));
                    if (showIndex) {
                        const idxY = indexPosition === 'top' ? y - 14 : y + cellH + 18;
                        this.drawText(ix + cellW / 2, idxY, i, tokens.dim, 11, 'center');
                    }
                }
                if (item.tag) {
                    // 数组单元格上方/下方标签带实色胶囊背景，避免被上层组件遮挡
                    const tagY = indexPosition === 'top' ? y - 30 : y - 16;
                    this._drawPill(ix + cellW / 2, tagY, item.tag, tokens.panelText, tokens.panelText);
                }
            });
        }

    drawPointer(index, opts = {}) {
        const { x = 60, cellW = 48, gap = 6, y = 80, cellH = cellW, label = '', color = null, below = false, belowOffset = 0 } = opts;
        const px = Math.round(x + index * (cellW + gap) + cellW / 2);
        // 箭头尺寸与目标图块大小成比例，保证大图块下箭头也不显小气
        const baseCell = 48;
        // 指针随图块等比缩放：cell=48 → 1 倍；cell=96(堆 2×) → 2 倍；同时允许更小幅度的下限
        const scale = Math.max(0.6, Math.min(2.5, (cellW + cellH) / 2 / baseCell));
        // 下箭头比例（与组件库箭头图标一致：细长杆 + 宽箭头头）
        const shaftHalf = Math.round(5 * scale);   // 杆半宽
        const headHalf = Math.round(16 * scale);   // 箭头头半宽
        const shaftH = Math.round(14 * scale);     // 杆高
        const headH = Math.round(16 * scale);      // 箭头头高
        const r = Math.max(2, Math.round(4 * scale)); // 圆角
        // 箭头尖端正对单元格顶部下方一点（默认 above 模式），整体向下指向目标格
        const tipY = y - 4;
        const topY = tipY - (shaftH + headH);
        const c = color || this.color('current');
        const ctx = this.ctx;
        const tokens = this._tokens();

        ctx.save();
        // 锐利模式：指针为纯实色形状，不加任何投影
        this._clearShadow(ctx);

        // 下指针模式：垂直镜像到单元格下方，箭头朝上指向单元格（避免与上方图形重叠）
        ctx.save();
        if (below) {
            const L = y + cellH / 2;
            ctx.translate(0, 2 * L + belowOffset);
            ctx.scale(1, -1);
        }

        // 单一闭合路径绘制“下箭头”图形（杆+箭头头一体，无拼接感）
        ctx.beginPath();
            ctx.moveTo(px - shaftHalf, topY + r);
            // 杆顶部圆角
            ctx.quadraticCurveTo(px - shaftHalf, topY, px - shaftHalf + r, topY);
            ctx.lineTo(px + shaftHalf - r, topY);
            ctx.quadraticCurveTo(px + shaftHalf, topY, px + shaftHalf, topY + r);
            // 杆右侧下行至箭头头肩部
            ctx.lineTo(px + shaftHalf, topY + shaftH);
            // 箭头头右肩（圆角外扩）
            ctx.lineTo(px + headHalf - r, topY + shaftH);
            ctx.quadraticCurveTo(px + headHalf, topY + shaftH, px + headHalf - r * 0.7, topY + shaftH + r * 0.7);
            // 右侧斜边至尖端（尖端微圆角）
            ctx.lineTo(px + r * 0.6, tipY - r * 0.9);
            ctx.quadraticCurveTo(px, tipY, px - r * 0.6, tipY - r * 0.9);
            // 左侧斜边上行
            ctx.lineTo(px - headHalf + r * 0.7, topY + shaftH + r * 0.7);
            ctx.quadraticCurveTo(px - headHalf, topY + shaftH, px - headHalf + r, topY + shaftH);
            // 回到杆左侧
            ctx.lineTo(px - shaftHalf, topY + shaftH);
            ctx.lineTo(px - shaftHalf, topY + r);
            ctx.closePath();
            ctx.fillStyle = c;
            ctx.fill();
            ctx.restore();      // 取消镜像，标签保持正向
            this._clearShadow(ctx);

            // 标签：带实色胶囊背景，避免文字直接悬空
            if (label) {
                const lblH = 18;
                const lblY = below
                    ? (y + cellH + 4 + belowOffset + shaftH + headH + 6)
                    : (topY - lblH - 6);
                this._drawPill(px, lblY + lblH / 2, label, c, c);
            }
            ctx.restore();
        }

        /**
         * 统一的"胶囊标签"绘制：实色底 + 1px 实线边框 + 整数像素，
         * 保证任何叠放次序下文字都清晰可读且不被遮挡（锐利模式下无模糊背景）。
         */
        _drawPill(cx, cy, text, textColor, borderColor, opts = {}) {
            const ctx = this.ctx;
            const tokens = this._tokens();
            const fontSize = opts.fontSize || 11;
            ctx.save();
            this._clearShadow(ctx);
            ctx.font = `bold ${fontSize}px ${tokens.mono}`;
            const w = Math.round(ctx.measureText(String(text)).width) + 12;
            const h = opts.height || 18;
            const x = this._px(Math.round(cx) - w / 2, 1);
            const y = this._px(Math.round(cy) - h / 2, 1);
            this._roundRectPath(x, y, w, h, tokens.radiusSmall);
            ctx.fillStyle = opts.bg || tokens.panelBg;
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = borderColor || tokens.panelText;
            ctx.stroke();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = textColor || tokens.panelText;
            ctx.fillText(String(text), Math.round(cx), Math.round(cy));
            ctx.restore();
        }

        drawRangeHighlight(start, end, opts = {}) {
            const { x = 60, cellW = 48, gap = 6, y = 80, h = 48, color = null, alpha = 0.12 } = opts;
            const x0 = x + start * (cellW + gap) - 4;
            const x1 = x + (end + 1) * (cellW + gap) - 4 + 0;
            const w = x1 - x0;
            const ctx = this.ctx;
            const tokens = this._tokens();
            ctx.save();
            ctx.fillStyle = color || this.color('current');
            ctx.globalAlpha = alpha;
            this._roundRectPath(x0, y - 6, w, h + 12, tokens.radiusRect);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        drawGraphNode(cx, cy, r, label, state, opts = {}) {
            const tokens = this._tokens();
            const isRb = opts.color === 'red' || opts.color === 'black';
            let color = isRb
                ? (opts.color === 'red' ? tokens.rbRed : tokens.rbBlack)
                : this._stateColor(state || 'default');
            const active = ['current', 'visited', 'instack', 'queue', 'stack'].includes(state);
            // 红黑节点使用与填充色高对比的边框；默认节点沿用状态边框
            let stroke = active
                ? this._stateBorder(state)
                : (opts.stroke || this._stateBorder(state || 'default'));
            if (isRb && !active) stroke = opts.stroke || this._textOn(color);

            const labelStr = (label === undefined || label === null) ? '' : String(label);
            const fontFamily = opts.fontFamily || tokens.font;
            const desiredFs = opts.fontSize || 13;
            // 文字自适应：标签能在圆内放下则居中显示；放不下则改为“圆下小标签”，
            // 保证动画内部文字始终完整、不被裁切（修复“圆形内部文字展示不全”）。
            let drawInside = false;
            if (labelStr) {
                this.ctx.save();
                this.ctx.font = `${desiredFs}px ${fontFamily}`;
                const lw = this.ctx.measureText(labelStr).width;
                this.ctx.restore();
                drawInside = lw <= (r * 2 - 6);
            }
            if (drawInside) {
                this.drawCircle(cx, cy, r, color, labelStr, {
                    stroke,
                    // 锐利模式：活跃态 3px 实线边框强调，替代原发光外圈
                    strokeWidth: active ? 3 : 2,
                    fontSize: desiredFs,
                    fontFamily
                });
            } else {
                // 标签太长：只画圆（无内文字），圆下用实色胶囊承载完整文字
                this.drawCircle(cx, cy, r, color, '', {
                    stroke,
                    strokeWidth: active ? 3 : 2
                });
                if (labelStr) this._drawPill(cx, cy + r + 14, labelStr, tokens.panelText, tokens.edge);
            }
            if (opts.tag) {
                // 节点标签（指针文字）带实色胶囊背景，保证在任意叠放次序下都清晰可读、不"被覆盖"
                this._drawPill(cx, cy - r - 16, opts.tag, opts.tagColor || tokens.panelText, opts.tagColor || tokens.panelText);
            }
        }

        // ===== 工具方法 =====
        _roundRectPath(x, y, w, h, r) {
            const ctx = this.ctx;
            let radii;
            if (Array.isArray(r)) {
                radii = r.map(v => Math.max(0, Math.min(v, w / 2, h / 2)));
            } else {
                const v = Math.max(0, Math.min(r, w / 2, h / 2));
                radii = [v, v, v, v];
            }
            const [tl, tr, br, bl] = radii;
            ctx.beginPath();
            ctx.moveTo(x + tl, y);
            ctx.lineTo(x + w - tr, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
            ctx.lineTo(x + w, y + h - br);
            ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
            ctx.lineTo(x + bl, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
            ctx.lineTo(x, y + tl);
            ctx.quadraticCurveTo(x, y, x + tl, y);
            ctx.closePath();
        }

        _stateColor(state, fallback) {
            if (fallback) return fallback;
            const tokens = this._tokens();
            const map = {
                default: tokens.cell,
                compare: COLORS.compare,
                swap: COLORS.swap,
                sorted: COLORS.sorted,
                current: COLORS.current,
                visited: COLORS.visited,
                instack: COLORS.instack,
                pivot: COLORS.pivot,
                rotate: COLORS.rotate,
                backtrack: COLORS.backtrack,
                queue: COLORS.queue,
                stack: COLORS.stack,
                tree: COLORS.success,
                path: COLORS.success,
                active: COLORS.info
            };
            return map[state] || map.default;
        }

        _stateBorder(state) {
            const tokens = this._tokens();
            const map = {
                default: tokens.cellBorder,
                compare: COLORS.compare,
                swap: COLORS.swap,
                sorted: COLORS.sorted,
                current: COLORS.current,
                visited: COLORS.visited,
                instack: COLORS.instack,
                pivot: COLORS.pivot,
                rotate: COLORS.rotate,
                backtrack: COLORS.backtrack,
                queue: COLORS.queue,
                stack: COLORS.stack,
                tree: COLORS.success,
                path: COLORS.success,
                active: COLORS.info
            };
            return map[state || 'default'] || map.default;
        }

        // 解析颜色为 [r,g,b]；支持 #rgb / #rrggbb / rgb()/rgba()
        _parseColor(c) {
            c = String(c).trim();
            if (c[0] === '#') {
                let h = c.slice(1);
                if (h.length === 3) h = h.split('').map(x => x + x).join('');
                if (h.length < 6) return null;
                return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
            }
            const m = c.match(/rgba?\(\s*([^)]+)\)/i);
            if (m) {
                const p = m[1].split(',').map(s => parseFloat(s));
                return [p[0] || 0, p[1] || 0, p[2] || 0];
            }
            return null;
        }

        // WCAG 相对亮度（sRGB 线性化）
        _relLum([r, g, b]) {
            const f = v => {
                v /= 255;
                return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            };
            return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        }

        // 给定背景色，返回与其对比度最高的文字色（黑 #161b22 / 白 #ffffff）
        _textOn(bgColor) {
            const rgb = this._parseColor(bgColor);
            if (!rgb) return '#ffffff';
            const lum = this._relLum(rgb); // 0(黑)~1(白)
            const crWhite = (1.0 + 0.05) / (lum + 0.05);
            const crBlack = (lum + 0.05) / (0.0 + 0.05);
            return crWhite >= crBlack ? '#ffffff' : '#161b22';
        }

        // 文字自适应：在 maxW 像素宽度内尽量用大字号；超出则向下等比缩小到 floor 下限。
        // 处理多行标签（按 \n 拆分，取最宽行作为约束），防止「圆形/方框内部文字展示不全」。
        _fitFont(text, maxW, startFs, fontFamily, bold) {
            const ctx = this.ctx;
            const bf = bold ? 'bold ' : '';
            const fam = fontFamily || this._tokens().font;
            let fs = Math.max(8, Math.floor(startFs) || 12);
            const floor = 9;
            const lines = String(text).split('\n');
            const measure = (f) => {
                ctx.font = `${bf}${f}px ${fam}`;
                let m = 0;
                for (const ln of lines) m = Math.max(m, ctx.measureText(ln).width);
                return m;
            };
            // 当前字号已能放下，直接返回（不无谓缩小）
            if (measure(fs) <= maxW) return fs;
            // 逐步缩小到能放下为止，下限 floor（保证最小可读）
            while (fs > floor && measure(fs) > maxW) fs -= 1;
            return fs;
        }

        _dimText() {
            return this._tokens().dim;
        }

        _panelText() {
            return this._tokens().panelText;
        }

        // ===== 场景渲染入口 =====
        renderFrame(state) {
            this.clear();
            // 平面底色：整块实色，不用渐变/光晕，保证画面干净、对比稳定
            const tk = this._tokens();
            if (tk.canvasBg) {
                this.ctx.save();
                this._clearShadow(this.ctx);
                this.ctx.fillStyle = tk.canvasBg;
                this.ctx.fillRect(0, 0, this.width, this.height);
                this.ctx.restore();
            }
            if (!state) return;
            if (state.title) {
                this.drawText(this.width / 2, 26, state.title, this._panelText(), 13, 'center');
            }
            if (state.boxes) {
                state.boxes.forEach(b => this._renderBox(b));
            }
            if (state.array) {
                this.drawArray(state.array.items, state.array.options);
                if (state.array.pointers) {
                    state.array.pointers.forEach(p => this.drawPointer(p.index, Object.assign({}, state.array.options, p)));
                }
                if (state.array.ranges) {
                    state.array.ranges.forEach(r => this.drawRangeHighlight(r.start, r.end, Object.assign({}, state.array.options, r)));
                }
            }
            if (state.graph) {
                this._renderGraph(state.graph);
            }
            if (state.tree) {
                this._renderTree(state.tree);
            }
            if (state.shapes) {
                state.shapes.forEach(s => this._renderShape(s));
            }
            if (state.overlays) {
                state.overlays.forEach(o => this._renderOverlay(o));
            }
        }

        _renderGraph(g) {
            const { vertices = [], edges = [], options = {} } = g;
            edges.forEach(e => {
                const u = vertices[e.u];
                const v = vertices[e.v];
                if (!u || !v) return;
                const color = e.color || this._tokens().edge;
                this.drawEdge(
                    { x: u.x, y: u.y }, { x: v.x, y: v.y },
                    color, e.label || '',
                    { directed: e.directed || options.directed, width: e.width || 2 }
                );
            });
            vertices.forEach((v, i) => {
                if (v.hidden) return;
                this.drawGraphNode(v.x, v.y, options.radius || 22, v.label !== undefined ? v.label : i, v.state, {
                    tag: v.tag,
                    fontSize: options.fontSize || 13
                });
            });
        }

        _renderTree(t) {
            const { nodes = [], edges = [], options = {} } = t;
            edges.forEach(e => {
                const u = nodes[e.parent];
                const v = nodes[e.child];
                if (!u || !v) return;
                const color = e.color || this._tokens().edge;
                this.drawLine(u.x, u.y, v.x, v.y, color, e.width || 2);
            });
            nodes.forEach((n, i) => {
                if (n.hidden) return;
                this.drawGraphNode(n.x, n.y, options.radius || 20, n.label !== undefined ? n.label : i, n.state, {
                    tag: n.tag,
                    tagColor: n.tagColor,
                    color: n.color,
                    fontSize: options.fontSize || 13
                });
            });
        }

        // 背景框（堆双视图的"树框 / 数组框"）：实色平面填充 + 2px 实线边框，
        // 整数像素对齐，无半透明叠加、无模糊，边界清晰可辨。
        _renderBox(b) {
            const ctx = this.ctx;
            const tokens = this._tokens();
            ctx.save();
            this._clearShadow(ctx);
            const x = this._px(b.x, 2), y = this._px(b.y, 2);
            const w = Math.round(b.w), h = Math.round(b.h);
            this._roundRectPath(x, y, w, h, tokens.radiusRect);
            ctx.fillStyle = tokens.boxFill;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = tokens.boxBorder;
            ctx.stroke();
            if (b.label) {
                ctx.font = `bold 12px ${tokens.mono}`;
                const tw = Math.round(ctx.measureText(b.label).width);
                const padX = 8, lblW = tw + padX * 2, lblH = 20;
                const lx = this._px(b.align === 'right' ? (x + w - 12 - lblW) : (x + 12), 1);
                const ly = this._px(y + 14 - lblH / 2, 1);
                this._roundRectPath(lx, ly, lblW, lblH, tokens.radiusSmall);
                ctx.fillStyle = tokens.boxLabelBg;
                ctx.fill();
                ctx.strokeStyle = tokens.boxBorder;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = tokens.dim;
                ctx.fillText(b.label, Math.round(lx + padX), Math.round(ly + lblH / 2));
            }
            ctx.restore();
        }

        _renderShape(s) {
            switch (s.kind) {
                case 'rect':
                    this.drawRect(s.x, s.y, s.w, s.h, s.color, s.radius, s.label || '', s.opts || {});
                    break;
                case 'circle':
                    this.drawCircle(s.x, s.y, s.r, s.color, s.label || '', s.opts || {});
                    break;
                case 'line':
                    this.drawLine(s.x1, s.y1, s.x2, s.y2, s.color, s.width || 2, s.opts || {});
                    break;
                case 'arrow':
                    this.drawArrow(s.x1, s.y1, s.x2, s.y2, s.color, s.headSize || 8, s.width || 2, s.opts || {});
                    break;
                case 'text':
                    this.drawText(s.x, s.y, s.text, s.color, s.fontSize || 14, s.align || 'center', s.opts || {});
                    break;
            }
        }

        _renderOverlay(o) {
            const ctx = this.ctx;
            ctx.save();
            if (o.panel) {
                this._renderAuxPanel(o);
                ctx.restore();
                return;
            }
            const tokens = this._tokens();
            const x = o.x || 12;
            const y = o.y || (this.height - 80);
            const padding = 10;
            ctx.font = `11px ${tokens.mono}`;
            const items = o.items || [];
            const totalW = items.reduce((acc, it) => acc + ctx.measureText(String(it.label)).width + 16, 0) - 4;
            const w = Math.max(80, totalW + padding * 2);
            const h = items.length === 0 ? 40 : 56;

            this._roundRectPath(x, y, w, h, tokens.radiusRect);
            ctx.fillStyle = tokens.panelBg;
            ctx.fill();
            ctx.strokeStyle = tokens.cellBorder;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = tokens.panelText;
            ctx.font = `bold 10px ${tokens.mono}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(o.title || '', x + padding, y + 8);

            ctx.font = `12px ${tokens.mono}`;
            let cx = x + padding;
            items.forEach((it) => {
                ctx.fillStyle = it.color || this.color('current');
                const bw = Math.max(20, ctx.measureText(String(it.label)).width + 8);
                this._roundRectPath(cx, y + 28, bw, 22, tokens.radiusSmall);
                ctx.fill();
                ctx.fillStyle = this._textOn(it.color || this.color('current'));
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(it.label), cx + bw / 2, y + 39);
                cx += bw + 4;
            });
            ctx.restore();
        }

        _renderAuxPanel(o) {
            const ctx = this.ctx;
            const p = o.panel;
            const tokens = this._tokens();
            const items = o.items || [];

            this._roundRectPath(p.x, p.y, p.w, p.h, tokens.radiusRect);
            ctx.fillStyle = tokens.auxBg;
            ctx.fill();
            ctx.strokeStyle = tokens.cellBorder;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.fillStyle = tokens.panelText;
            ctx.font = `bold 11px ${tokens.mono}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(o.title || '', p.x + 10, p.y + 8);
            ctx.strokeStyle = tokens.cellBorder;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x + 8, p.y + 26);
            ctx.lineTo(p.x + p.w - 8, p.y + 26);
            ctx.stroke();

            ctx.textBaseline = 'middle';
            if (p.layout === 'vertical') {
                const itemH = p.itemH || 28;
                const gapY = p.gapY || 4;
                const maxVisible = Math.max(1, Math.floor((p.h - 40) / (itemH + gapY)));
                items.slice(0, maxVisible).forEach((it, i) => {
                    const iy = p.y + 32 + i * (itemH + gapY);
                    this._roundRectPath(p.x + 12, iy, p.w - 24, itemH, tokens.radiusSmall);
                    ctx.fillStyle = it.color || this.color('current');
                    ctx.fill();
                    ctx.fillStyle = this._textOn(it.color || this.color('current'));
                    ctx.font = `bold 12px ${tokens.mono}`;
                    ctx.textAlign = 'center';
                    ctx.fillText(String(it.label), p.x + p.w / 2, iy + itemH / 2 + 1);
                });
                if (items.length) {
                    const triY = p.y + 32 + itemH / 2;
                    ctx.fillStyle = o.marker || '#d29922';
                    ctx.beginPath();
                    ctx.moveTo(p.x + p.w - 6, triY);
                    ctx.lineTo(p.x + p.w - 14, triY - 5);
                    ctx.lineTo(p.x + p.w - 14, triY + 5);
                    ctx.closePath();
                    ctx.fill();
                }
            } else {
                let cx = p.x + 10;
                const iy = p.y + 32;
                ctx.font = `bold 12px ${tokens.mono}`;
                ctx.textAlign = 'center';
                items.forEach(it => {
                    const bw = Math.min(p.w - 24, Math.max(26, ctx.measureText(String(it.label)).width + 14));
                    this._roundRectPath(cx, iy, bw, 26, tokens.radiusSmall);
                    ctx.fillStyle = it.color || this.color('current');
                    ctx.fill();
                    ctx.fillStyle = this._textOn(it.color || this.color('current'));
                    ctx.fillText(String(it.label), cx + bw / 2, iy + 14);
                    cx += bw + 6;
                });
                if (items.length) {
                    ctx.fillStyle = '#bc8cff';
                    ctx.beginPath();
                    ctx.moveTo(p.x + 8, iy + 13);
                    ctx.lineTo(p.x + 14, iy + 8);
                    ctx.lineTo(p.x + 14, iy + 18);
                    ctx.closePath();
                    ctx.fill();
                }
            }
            ctx.restore();
        }
    }

    Renderer.COLORS = COLORS;

    global.Renderer = Renderer;
})(window);
