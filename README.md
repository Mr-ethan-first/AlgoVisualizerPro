# AlgoVisualizerPro

> 纯前端、完全离线、零依赖的数据结构与算法动画可视化平台。
> 通过交互式动画理解算法执行过程：单步执行、变速播放、代码高亮联动。

内部引擎代号为 **AlgoLens**（见 `manifest.json` / `index.html`）。本项目在 GitHub 上命名为 **AlgoVisualizerPro**，以避免与大量同名仓库混淆。

---

## ✨ 功能特性

- **零框架依赖**：纯 HTML / CSS / 原生 JavaScript，不引入 React / Vue 或任何第三方渲染库。
- **完全离线**：基于 Service Worker + Cache API（Cache-First 策略），首次加载后无需网络即可使用。
- **Canvas 2D 渲染**：密集图形（数组、树、图、Trie 等）使用原生 Canvas 2D 绘制，性能稳定。
- **步骤化动画引擎**：所有算法被录制成「步骤序列」，支持播放 / 暂停 / 单步前进后退 / 拖动进度 / 变速。
- **代码联动高亮**：右侧代码区随动画步骤高亮当前执行行，无需第三方高亮库（纯 CSS + 行号映射）。
- **明暗双主题**：内置暗色 / 亮色两套主题，画布与面板协调切换。
- **丰富算法覆盖**：涵盖排序、树与堆、图论、字符串、线性结构、经典 DP、高级 / 分布式共 **90+** 个算法。

---

## 🧱 技术架构

```
UI 层
 ├─ Sidebar（算法分类导航）
 ├─ Canvas（动画渲染区）
 ├─ Code Viewer（代码高亮 + 行滚动联动）
 └─ Controls（播放 / 速度 / 重置 / 单步）

核心引擎层（Core）
 ├─ Animator   （播放 / 步进 / 变速 / 重置）
 ├─ Renderer   （Canvas 绘制封装：数组 / 树 / 图 / 指针 / 文本）
 ├─ LayoutEngine（树 / 多叉树 / 图布局）
 └─ CodeViewer （代码行高亮、滚动联动）

Tracer API（步骤记录器）
 └─ ArrayTracer | GraphTracer | TreeTracer | LogTracer

离线层
 └─ Service Worker + Cache API（Cache-First）
```

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 渲染引擎 | HTML5 Canvas 2D | 密集图形渲染性能最优 |
| UI 交互 | 原生 DOM + CSS | 控件、面板、代码显示 |
| 动画控制 | requestAnimationFrame + 时间切片 | 帧率稳定可控 |
| 状态管理 | 纯 JS 对象 + 步骤序列 | 支持回退与持久化 |
| 离线存储 | Service Worker + Cache API | Cache-First 策略 |
| 代码高亮 | 纯 CSS 高亮 + 行号映射 | 无第三方高亮库依赖 |

---

## 📁 项目结构

```
AlgoVisualizerPro/
├── index.html                 # 应用入口
├── manifest.json              # PWA 清单（AlgoLens 名称）
├── sw.js                      # Service Worker（离线缓存）
├── styles/                    # 全局样式与主题（暗/亮）
├── js/
│   ├── core/                  # 核心引擎
│   │   ├── animator.js        # 播放 / 步进 / 内容自适应布局
│   │   ├── renderer.js        # Canvas 绘制封装
│   │   ├── layoutEngine.js    # 树 / 图布局算法
│   │   ├── tracer.js          # 步骤记录器（Array/Graph/Tree/Log）
│   │   └── ...
│   ├── algorithms/            # 各算法实现与状态构建器
│   │   ├── sorting_algorithms.js
│   │   ├── tree_algorithms.js
│   │   ├── graph_algorithms.js
│   │   ├── string_algorithms.js
│   │   ├── advanced_algorithms.js
│   │   └── ...
│   └── app.js                 # 应用主逻辑（初始化 / 选择算法 / 驱动）
├── icons/                     # 应用图标
├── tests/                     # 算法单元测试
└── 算法动画库-详细设计文档.md     # 完整开发设计文档
```

---

## 🚀 快速开始

本项目为纯静态站点，**无需构建、无需安装依赖**。

### 方式一：直接打开

双击 `index.html` 即可在浏览器中运行（基础动画可用）。

### 方式二：本地静态服务器（推荐，启用离线 / Service Worker）

任意静态服务器均可，例如使用 Python：

```bash
# 在项目根目录执行
python -m http.server 8080
# 然后浏览器访问 http://localhost:8080
```

或使用 Node：

```bash
npx serve .
```

> 注意：Service Worker 与离线能力要求页面运行在 `http(s)://` 源下，
> 直接以 `file://` 打开时离线缓存不生效，但动画演示本身不受影响。

---

## 🎮 使用说明

1. 左侧 **Sidebar** 选择算法分类与具体算法。
2. 中上部 **Canvas** 实时播放动画；下方为 **代码区**（高亮当前执行行）与 **执行日志**。
3. 底部 **Controls** 提供：
   - ▶ 播放 / ⏸ 暂停
   - ⏮ / ⏭ 单步前进 / 后退
   - 进度条拖动定位
   - 速度调节（慢 ↔ 快）
   - ↺ 重置
4. 部分算法支持在代码区 / 输入区修改输入数据后重新运行。

---

## 📚 算法目录（90+）

<details open>
<summary><b>排序算法（Sorting，13）</b></summary>

- 冒泡排序 `sorting.bubble`
- 插入排序 `sorting.insertion`
- 选择排序 `sorting.selection`
- 快速排序（递归）`sorting.quick`
- 快速排序（迭代）`sorting.quickIter`
- 归并排序 `sorting.merge`
- 自底向上归并 `sorting.mergeBottomUp`
- 并行归并 `sorting.parallelMerge`
- 堆排序 `sorting.heap`
- 希尔排序 `sorting.shell`
- 计数排序 `sorting.counting`
- 桶排序 `sorting.bucket`
- 基数排序 `sorting.radixSort`

</details>

<details>
<summary><b>树与堆（Tree & Heap，28）</b></summary>

- 二叉搜索树：插入 / 删除（递归·迭代）/ 查找 `tree.bstInsert` `tree.bstInsertIter` `tree.bstDelete` `tree.bstDeleteIter` `tree.bstSearch`
- 遍历：前序 / 中序 / 后序（递归·迭代·双栈）/ 层序 `tree.preorder` `tree.preorderIter` `tree.inorder` `tree.inorderIter` `tree.postorderRec` `tree.postorderIter` `tree.postorderTwoStack` `tree.levelorder`
- AVL 树：插入 / 删除 `tree.avlInsert` `tree.avlDelete`
- 红黑树：插入 / 删除 `tree.rbInsert` `tree.rbDelete`
- 堆：插入 / 调整 / 删除 `tree.heapInsert` `tree.heapify` `tree.heapDelete`
- 线段树：构建 / 查询 `tree.segmentTree` `tree.segmentTreeQuery`
- Trie（前缀树）：插入 / 搜索 `tree.trieInsert` `tree.trieSearch`
- 并查集：查找 / 合并（递归·迭代）`tree.ufFind` `tree.ufFindIter` `tree.ufUnion`
- 树状数组 `tree.bit`

</details>

<details>
<summary><b>图论（Graph，13）</b></summary>

- 广度优先 BFS `graph.bfs`
- 深度优先 DFS（递归·迭代）`graph.dfs` `graph.dfsIter`
- 最短路径：Dijkstra（朴素·堆优化）/ SPFA / Floyd `graph.dijkstraNaive` `graph.dijkstra` `graph.spfa` `graph.floyd`
- 最小生成树：Kruskal / Prim `graph.kruskal` `graph.prim`
- 拓扑排序（Kahn·DFS）`graph.topo` `graph.topoDfs`
- 强连通分量 Kosaraju `graph.kosaraju`
- 欧拉路径 `graph.eulerPath`

</details>

<details>
<summary><b>字符串（String，7）</b></summary>

- 多项式哈希 `string.hash`
- KMP：匹配 / 失配函数 `string.kmpMatch` `string.kmpNext`
- Rabin-Karp `string.rabinKarp`
- Sunday `string.sunday`
- 最长公共子序列 LCS `string.lcs`
- 最长公共子串 `string.lcsSubstr`

</details>

<details>
<summary><b>线性结构（Linear，10）</b></summary>

- 数组：追加 / 插入 `linear.arrayAppend` `linear.arrayInsert`
- 栈 `linear.stack`
- 队列 / 循环队列 / 双端队列 `linear.queue` `linear.circularQueue` `linear.deque`
- 单链表：插入 / 遍历 `linear.listInsert` `linear.listTravel`
- 双向链表 `linear.doublyList`
- LRU 缓存 `linear.lru`

</details>

<details>
<summary><b>经典 / 动态规划（Classic，11）</b></summary>

- 二分查找（迭代·递归）`classic.binarySearch` `classic.binarySearchRec`
- 斐波那契：原始递归 / 动态规划 `classic.fibRec` `classic.fibDp`
- 汉诺塔 `classic.hanoi`
- 背包：0-1 / 完全 `classic.knapsack` `classic.completeKnapsack`
- 骑士巡游 `classic.knightTour`
- N 皇后 `classic.nqueens`
- 生产者-消费者 `classic.producerConsumer`
- 数独求解 `classic.sudoku`

</details>

<details>
<summary><b>高级 / 分布式（Advanced，8）</b></summary>

- 一致性哈希：加节点 / 删节点 / 虚拟节点 `advanced.consistentHashAdd` `advanced.consistentHashRemove` `advanced.consistentHashVNode`
- Raft：Leader 选举 / 日志复制 `advanced.raftLeader` `advanced.raftLog`
- 跳表：插入 / 查找 / 删除 `advanced.skipListInsert` `advanced.skipListFind` `advanced.skipListDelete`

</details>

---

## 🎨 主题

- 应用内置 **暗色（Dark）** 与 **亮色（Light）** 两套主题。
- 主题切换后画布、Sidebar、代码区与日志区同步更新，配色由 CSS 变量集中管理。

---

## 🧪 测试

算法正确性由 `tests/` 下的单元测试覆盖（纯 JavaScript，可直接在 Node 或浏览器中运行）。

---

## 📄 许可

本项目当前以私有（Private）仓库形式托管于 GitHub。
如需使用、修改或二次分发，请与作者联系并获得授权。

---

*AlgoVisualizerPro · 让算法「看得见的」运行。*
