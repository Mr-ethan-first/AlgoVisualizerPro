/**
 * LayoutEngine - 树 / 图自动布局
 *
 * 提供：
 *   - layoutBinaryTree(nodes, root): 根据二叉树结构计算每个节点的 (x, y) 坐标
 *   - layoutGraph(vertices, edges): 简单的圆形 / 力导向布局
 *   - layoutNaryTree(nodes, root): 多叉树（Trie 等）
 */
(function (global) {
    'use strict';

    const LayoutEngine = {
        /**
         * 二叉树布局（基于宽度计算，支持画布自动适配）
         * @param {Array} nodes - [{ value, left, right }]
         * @param {number} root - 根节点下标
         * @param {object} opts - { x, y, hGap, vGap, nodeRadius, fitWidth, fitHeight }
         */
        layoutBinaryTree(nodes, root, opts = {}) {
            let {
                x = 0, y = 60,
                hGap = 36, vGap = 70,
                nodeRadius = 20,
                fitWidth = 0,
                fitHeight = 0
            } = opts;
            const positions = new Array(nodes.length).fill(null).map(() => ({ x: 0, y: 0 }));

            // 0. 参数自适应：按画布尺寸与树形状调整节点半径 / 垂直间距，
            //    保证深树全部节点可见且圆圈不互相重叠（fit 缩放不再缩小半径导致重叠）
            if (fitWidth > 0 || fitHeight > 0) {
                let depth = 0, count = 0;
                const walk = (idx, d) => {
                    if (idx === null || idx === undefined || !nodes[idx] || nodes[idx].hidden) return;
                    if (d > depth) depth = d;
                    count++;
                    walk(nodes[idx].left, d + 1);
                    walk(nodes[idx].right, d + 1);
                };
                walk(root, 0);
                const pad = (r) => r + 16;
                if (fitHeight > 0 && depth > 0) {
                    const availH = fitHeight - pad(nodeRadius) * 2;
                    const maxV = availH / depth;
                    if (maxV < vGap) {
                        vGap = Math.max(14, maxV);
                        nodeRadius = Math.min(nodeRadius, Math.max(7, vGap / 2 - 4));
                    }
                }
                if (fitWidth > 0 && count > 0) {
                    const availW = fitWidth - pad(nodeRadius) * 2;
                    const maxH = availW / count;
                    if (maxH < nodeRadius * 2) {
                        nodeRadius = Math.max(7, maxH / 2 - 2);
                    }
                }
                hGap = Math.max(10, nodeRadius * 2 + 6);
            }
            // 返回自适应后的节点半径（供渲染层使用，避免圆圈与布局参数不一致）
            positions._radius = nodeRadius;

            // 1. 中序遍历确定每个节点的水平位置（按访问顺序）
            let counter = 0;
            const inorder = (idx) => {
                if (idx === null || idx === undefined || !nodes[idx]) return;
                inorder(nodes[idx].left);
                positions[idx].x = counter++;
                inorder(nodes[idx].right);
            };
            inorder(root);

            // 2. 前序遍历确定垂直层级
            const setY = (idx, depth) => {
                if (idx === null || idx === undefined || !nodes[idx]) return;
                positions[idx].y = depth;
                setY(nodes[idx].left, depth + 1);
                setY(nodes[idx].right, depth + 1);
            };
            setY(root, 0);

            // 3. 计算实际像素坐标
            const totalWidth = counter;
            const widthFactor = nodeRadius * 2 + hGap;
            const actualWidth = totalWidth * widthFactor;
            const offsetX = x;
            const cx = offsetX + actualWidth / 2;
            positions.forEach((p, i) => {
                p.x = offsetX + (p.x + 0.5) * widthFactor;
                p.y = y + p.y * vGap;
            });

            // 4. 居中
            const xs = positions.filter((_, i) => nodes[i]).map(p => p.x);
            if (xs.length) {
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const shift = (minX + maxX) / 2;
                positions.forEach(p => { p.x -= (shift - cx); });
            }

            // 5. 自动适配画布尺寸（防裁切）
            if (fitWidth > 0 && fitHeight > 0 && nodes.length > 0) {
                // 顶部预留足够空间给节点标签胶囊（半高 9 + 圆心到胶囊中心 16 + 边距 ≈ 28）
                const tagPad = 28;
                const padding = nodeRadius + tagPad;
                const validPositions = positions.filter((_, i) => nodes[i] && !nodes[i].hidden);
                if (validPositions.length > 0) {
                    const minX = Math.min(...validPositions.map(p => p.x));
                    const maxX = Math.max(...validPositions.map(p => p.x));
                    const minY = Math.min(...validPositions.map(p => p.y));
                    const maxY = Math.max(...validPositions.map(p => p.y));
                    const treeW = Math.max(1, maxX - minX);
                    const treeH = Math.max(1, maxY - minY);
                    const availW = fitWidth - padding * 2;
                    const availH = fitHeight - padding * 2;
                    const scaleX = availW / treeW;
                    const scaleY = availH / treeH;
                    // 只缩小不放大
                    const scale = Math.min(1, scaleX, scaleY);
                    if (scale < 1) {
                        const offsetX2 = (fitWidth - treeW * scale) / 2 - minX * scale;
                        let offsetY2 = (fitHeight - treeH * scale) / 2 - minY * scale;
                        // 强制留出顶部/底部边距，防止标签或节点被裁切
                        const minOffset = padding - minY * scale;
                        const maxOffset = fitHeight - padding - maxY * scale;
                        offsetY2 = Math.max(minOffset, Math.min(maxOffset, offsetY2));
                        positions.forEach(p => {
                            p.x = p.x * scale + offsetX2;
                            p.y = p.y * scale + offsetY2;
                        });
                    } else {
                        // 不需要缩放：水平居中；垂直方向保证上下留白（节点不裁切），放得下时整体居中
                        const offsetX2 = (fitWidth - treeW) / 2 - minX;
                        const topPad = nodeRadius + tagPad;
                        const botPad = nodeRadius + 10;
                        const tMin = topPad - minY;
                        const tMax = fitHeight - botPad - maxY;
                        let offsetY2;
                        if (tMin <= tMax) {
                            offsetY2 = Math.max(tMin, Math.min(tMax, (fitHeight - (minY + maxY)) / 2));
                        } else {
                            offsetY2 = tMin;
                        }
                        positions.forEach(p => {
                            p.x = p.x + offsetX2;
                            p.y = p.y + offsetY2;
                        });
                    }
                }
            }

            return positions;
        },

        /**
         * 多叉树布局（Trie / 一般树）
         * nodes: [{ children: [idx, idx, ...] }]
         */
        layoutNaryTree(nodes, root, opts = {}) {
            const {
                y = 60, hGap = 30, vGap = 70, nodeRadius = 20,
                fitWidth = 0, fitHeight = 0
            } = opts;
            const positions = new Array(nodes.length).fill(null).map(() => ({ x: 0, y: 0 }));

            // 递归计算子树宽度
            const widthCache = new Array(nodes.length).fill(null);
            const calcWidth = (idx) => {
                if (idx === null || idx === undefined || !nodes[idx]) return 0;
                const node = nodes[idx];
                if (!node.children || node.children.length === 0) {
                    widthCache[idx] = nodeRadius * 2 + hGap;
                    return widthCache[idx];
                }
                let w = 0;
                for (const c of node.children) w += calcWidth(c);
                widthCache[idx] = Math.max(w, nodeRadius * 2 + hGap);
                return widthCache[idx];
            };
            calcWidth(root);

            // 递归分配位置
            const place = (idx, x, depth) => {
                if (idx === null || idx === undefined || !nodes[idx]) return;
                const node = nodes[idx];
                positions[idx].y = y + depth * vGap;
                if (!node.children || node.children.length === 0) {
                    positions[idx].x = x + nodeRadius + hGap / 2;
                    return;
                }
                let childX = x;
                for (const c of node.children) {
                    const cw = widthCache[c] || 0;
                    place(c, childX, depth + 1);
                    childX += cw;
                }
                // 父节点居中于子节点
                const firstChild = node.children[0];
                const lastChild = node.children[node.children.length - 1];
                positions[idx].x = (positions[firstChild].x + positions[lastChild].x) / 2;
            };
            place(root, 0, 0);

            // 画布自适应：整体缩放防裁剪（Trie 等节点多时容易超出画布，动画元素不允许展示不全）。
            // - rawW/rawH 只含节点本身跨度，边距独立计算，避免 hGap/vGap 被重复计入缩放分母。
            // - 支持 minScale：可选“不缩小低于自然尺寸”，配合 _allowScroll 让画布纵向放大滚动。
            // - scale 与 radius 同步上限 MAX_R，防止“位置拉大、节点没跟上”的怪异稀疏布局。
            if (fitWidth > 0 || fitHeight > 0) {
                let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
                for (const p of positions) {
                    if (!p) continue;
                    xMin = Math.min(xMin, p.x); xMax = Math.max(xMax, p.x);
                    yMin = Math.min(yMin, p.y); yMax = Math.max(yMax, p.y);
                }
                // 先归一化到原点，便于统一缩放与居中
                for (const p of positions) {
                    if (!p) continue;
                    p.x -= xMin; p.y -= yMin;
                }
                const rawW = (xMax - xMin) + nodeRadius * 2;
                const rawH = (yMax - yMin) + nodeRadius * 2;

                const MAX_R = 64;
                const minScale = opts.minScale || 0;
                const hMargin = 44, vMargin = 64;
                let scale = Infinity;
                if (fitWidth > 0) scale = Math.min(scale, (fitWidth - hMargin * 2) / Math.max(rawW, 1));
                if (fitHeight > 0) scale = Math.min(scale, (fitHeight - vMargin * 2) / Math.max(rawH, 1));
                if (MAX_R > 0 && nodeRadius > 0) scale = Math.min(scale, MAX_R / nodeRadius);
                if (minScale > 0) scale = Math.max(minScale, scale);
                scale = Math.max(0.1, scale);

                const effRadius = Math.max(14, Math.round(nodeRadius * scale));
                const treeW = rawW * scale, treeH = rawH * scale;
                const dx = fitWidth > 0 ? hMargin + Math.max(0, (fitWidth - hMargin * 2 - treeW) / 2) : hMargin;
                const dy = fitHeight > 0 ? vMargin + Math.max(0, (fitHeight - vMargin * 2 - treeH) / 2) : vMargin;
                for (const p of positions) {
                    if (!p) continue;
                    p.x = p.x * scale + dx;
                    p.y = p.y * scale + dy;
                }
                positions._radius = effRadius;
            }

            return positions;
        },

        /**
         * 图布局：圆形布局（适用于小规模图，简洁稳定）
         */
        layoutGraphCircle(vertices, opts = {}) {
            const { cx, cy, r } = opts;
            const n = vertices.length;
            return vertices.map((v, i) => {
                const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
                return {
                    x: cx + r * Math.cos(angle),
                    y: cy + r * Math.sin(angle),
                    ...v
                };
            });
        },

        /**
         * 图布局：分层布局（适用于 DAG / 拓扑排序可视化）
         * 关键：每层节点在「可用宽度」内等分居中，纵向按层数等分；
         * 节点间距完全由 nodeR + 间隙决定，保证任意层数 / 节点数下都不会相互重叠。
         * 输入 edges 为 [{u, v}]；opts 接受 width/height/padX/padY/hGap/vGap/nodeR。
         */
        layoutGraphHierarchical(vertices, edges, opts = {}) {
            const {
                width = 800, height = 400,
                nodeR = 22, padX = 40, padY = 40,
                hGap = 26, vGap = 34
            } = opts;
            const n = vertices.length;
            // 计算入度
            const indeg = new Array(n).fill(0);
            const adj = Array.from({ length: n }, () => []);
            edges.forEach(e => {
                adj[e.u].push(e.v);
                indeg[e.v]++;
            });
            // BFS 分层
            const layer = new Array(n).fill(-1);
            const queue = [];
            for (let i = 0; i < n; i++) if (indeg[i] === 0) { layer[i] = 0; queue.push(i); }
            while (queue.length) {
                const u = queue.shift();
                for (const v of adj[u]) {
                    layer[v] = Math.max(layer[v], layer[u] + 1);
                    indeg[v]--;
                    if (indeg[v] === 0) queue.push(v);
                }
            }
            // 处理孤立 / 环（未分层的）归入第 0 层
            for (let i = 0; i < n; i++) if (layer[i] === -1) layer[i] = 0;

            // 按层分组
            const maxLayer = Math.max(...layer);
            const byLayer = Array.from({ length: maxLayer + 1 }, () => []);
            for (let i = 0; i < n; i++) byLayer[layer[i]].push(i);
            const maxCount = Math.max(1, ...byLayer.map(g => g.length));

            const usableW = Math.max(1, width - 2 * padX);
            const usableH = Math.max(1, height - 2 * padY);
            const layerStep = 2 * nodeR + vGap;          // 层间纵向步进
            const totalH = maxLayer * layerStep;
            const yStart = padY + Math.max(0, (usableH - totalH) / 2) + nodeR; // 首层圆心 y

            const positions = new Array(n);
            for (let l = 0; l <= maxLayer; l++) {
                const group = byLayer[l];
                const cnt = group.length;
                const y = yStart + l * layerStep;
                if (cnt === 1) {
                    positions[group[0]] = { x: padX + usableW / 2, y };
                } else {
                    const step = usableW / cnt;          // 等分居中，节点绝不会相互重叠
                    for (let k = 0; k < cnt; k++) {
                        positions[group[k]] = { x: padX + step * (k + 0.5), y };
                    }
                }
            }
            return positions;
        },

        /**
         * 力导向布局（简化版）
         * 适用于无向图，迭代若干次后返回坐标
         */
        layoutGraphForce(vertices, edges, opts = {}) {
            const {
                width = 800, height = 400,
                iterations = 300,
                k = 80, // 理想距离
                cooling = 0.95
            } = opts;
            const n = vertices.length;
            const pos = vertices.map((v, i) => ({
                x: width / 2 + (Math.random() - 0.5) * width * 0.6,
                y: height / 2 + (Math.random() - 0.5) * height * 0.6,
                vx: 0, vy: 0
            }));

            const adj = Array.from({ length: n }, () => []);
            edges.forEach(e => { adj[e.u].push(e.v); adj[e.v].push(e.u); });

            let temperature = 1.0;
            for (let iter = 0; iter < iterations; iter++) {
                // 排斥力
                for (let i = 0; i < n; i++) {
                    let fx = 0, fy = 0;
                    for (let j = 0; j < n; j++) {
                        if (i === j) continue;
                        const dx = pos[i].x - pos[j].x;
                        const dy = pos[i].y - pos[j].y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const force = (k * k) / dist;
                        fx += (dx / dist) * force;
                        fy += (dy / dist) * force;
                    }
                    pos[i].vx = fx;
                    pos[i].vy = fy;
                }
                // 吸引力（边）
                edges.forEach(e => {
                    const dx = pos[e.u].x - pos[e.v].x;
                    const dy = pos[e.u].y - pos[e.v].y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = (dist * dist) / k;
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    pos[e.u].vx -= fx;
                    pos[e.u].vy -= fy;
                    pos[e.v].vx += fx;
                    pos[e.v].vy += fy;
                });
                // 限制位移
                for (let i = 0; i < n; i++) {
                    const disp = Math.sqrt(pos[i].vx ** 2 + pos[i].vy ** 2) || 1;
                    pos[i].x += (pos[i].vx / disp) * Math.min(disp, temperature * 30);
                    pos[i].y += (pos[i].vy / disp) * Math.min(disp, temperature * 30);
                    // 边界
                    pos[i].x = Math.max(40, Math.min(width - 40, pos[i].x));
                    pos[i].y = Math.max(40, Math.min(height - 40, pos[i].y));
                }
                temperature *= cooling;
            }
            return pos;
        }
    };

    global.LayoutEngine = LayoutEngine;
})(window);
