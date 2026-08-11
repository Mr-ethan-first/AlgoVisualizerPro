# Algs4 算法覆盖清单（对照 algs4-master 190 类）

> 生成时间：2026-08-10  |  已注册算法：101  |  algs4 类：190


## 状态说明
- **done**：已有等价算法实现（含本项目非 algs4 同名算法）
- **missing**：待补充的可视化算法（本次目标）
- **excluded**：基础设施 / 客户端 / 数据类型 / 物理 / GUI 等，不适合作为独立动画


## 统计
| 状态 | 数量 |
| --- | --- |
| done | 34 |
| missing | 79 |
| excluded | 77 |
| **合计** | **190** |

## 按章节：缺失算法（待补，含细节）

### 排序（缺失 8）

| algs4 类 | 目标 id | 核心细节 |
| --- | --- | --- |
| BinaryInsertion | `sorting.binaryInsertion` | 二分插入排序：插入前先二分定位插入点，比较次数减少为 O(n log n)，移动仍为 O(n) |
| InsertionX | `sorting.insertionX` | 插入排序哨兵优化版：减少边界判断 |
| LSD | `string.lsd` | 低位优先(LSD)基数排序，按字符从右到左多趟计数排序 |
| MSD | `string.msd` | 高位优先(MSD)基数排序，递归按字符分治 |
| MergeX | `sorting.mergeX` | 自顶向下归并优化版 |
| Multiway | `string.multiway` | 多路归并外排序(败者树思路)，字符串多路合并 |
| Quick3string | `string.quick3string` | 三路字符串快速排序，按当前字符三路划分 |
| QuickX | `sorting.quickX` | 快速排序优化版(三数取中+插入小数组) |

### 查找（缺失 18）

| algs4 类 | 目标 id | 核心细节 |
| --- | --- | --- |
| BTree | `search.btree` | B 树：多路平衡查找树，磁盘友好 |
| BinarySearchST | `search.binST` | 二分查找符号表：有序数组+二分 |
| BinomialMinPQ | `search.binomPQ` | 二项堆最小优先队列 |
| FibonacciMinPQ | `search.fibPQ` | 斐波那契堆最小优先队列 |
| IndexBinomialMinPQ | `search.indexBinomPQ` | 带索引二项堆 |
| IndexFibonacciMinPQ | `search.indexFibPQ` | 带索引斐波那契堆 |
| IndexMaxPQ | `search.indexMaxPQ` | 带索引最大优先队列 |
| IndexMinPQ | `search.indexMinPQ` | 带索引最小优先队列 |
| IndexMultiwayMinPQ | `search.indexMultiPQ` | 带索引多路最小优先队列 |
| LinearProbingHashST | `search.linProbe` | 线性探测哈希表：开放寻址 |
| MaxPQ | `search.maxPQ` | 最大优先队列(二叉堆) |
| MinPQ | `search.minPQ` | 最小优先队列(二叉堆) |
| MultiwayMinPQ | `search.multiPQ` | 多路最小优先队列 |
| PatriciaSET | `search.patricia` | PATRICIA 压缩前缀树(集合) |
| PatriciaST | `search.patriciaST` | PATRICIA 压缩前缀树(符号表) |
| SeparateChainingHashST | `search.sepChain` | 拉链法哈希表：数组+链表桶 |
| SequentialSearchST | `search.seqST` | 顺序查找符号表：链表线性查找 |
| TST | `string.tst` | 三元搜索树：字符三路(小于/等于/大于) |

### 图（缺失 35）

| algs4 类 | 目标 id | 核心细节 |
| --- | --- | --- |
| AcyclicLP | `graph.acyclicLP` | DAG 最长路 |
| AcyclicSP | `graph.acyclicSP` | DAG 最短路 |
| Arbitrage | `graph.arbitrage` | 套利=负环 |
| AssignmentProblem | `graph.assignment` | 分配问题(最小权重完美匹配) |
| Bipartite | `graph.bipartite` | 二分图判定：双色着色 |
| BipartiteMatching | `graph.bipMatch` | 二分图最大匹配(匈牙利) |
| BipartiteX | `graph.bipartiteX` | 二分图判定优化版(含匹配) |
| BoruvkaMST | `graph.boruvka` | Boruvka 最小生成树(多源合并) |
| BreadthFirstDirectedPaths | `graph.bfsDirPaths` | 有向图 BFS 路径 |
| CC | `graph.cc` | 连通分量：DFS/BFS 给每个连通块编号 |
| CPM | `graph.cpm` | 关键路径法(基于 AcyclicLP 调度) |
| Cycle | `graph.cycle` | 无向图环检测 |
| DepthFirstDirectedPaths | `graph.dfsDirPaths` | 有向图 DFS 路径 |
| DepthFirstOrder | `graph.dfsOrder` | DFS 序(前/后/逆后序) |
| DijkstraAllPairsSP | `graph.dijkstraAll` | 全源最短路(Dijkstra×n) |
| DijkstraUndirectedSP | `graph.dijkstraUndir` | 无向图 Dijkstra |
| DirectedCycle | `graph.directedCycle` | 有向图环检测 |
| DirectedCycleX | `graph.directedCycleX` | 有向图环检测优化版 |
| DirectedDFS | `graph.dirDFS` | 有向图可达性 DFS |
| DirectedEulerianCycle | `graph.dirEulerCycle` | 有向欧拉回路 |
| DirectedEulerianPath | `graph.dirEulerPath` | 有向欧拉路径 |
| EdgeWeightedDirectedCycle | `graph.ewDirCycle` | 带权有向图环 |
| EulerianCycle | `graph.eulerCycle` | 无向欧拉回路 |
| FordFulkerson | `graph.maxflow` | Ford-Fulkerson 最大流(Edmonds-Karp) |
| GabowSCC | `graph.gabow` | Gabow 强连通分量 |
| HopcroftKarp | `graph.hopcroftKarp` | Hopcroft-Karp 二分图最大匹配 |
| LazyPrimMST | `graph.lazyPrim` | 惰性 Prim 最小生成树 |
| NonrecursiveDFS | `graph.nrDFS` | 非递归 DFS(显式栈) |
| NonrecursiveDirectedDFS | `graph.nrDirDFS` | 非递归有向 DFS |
| SymbolDigraph | `graph.symbolDigraph` | 符号有向图 |
| SymbolGraph | `graph.symbol` | 符号图(字符串顶点映射) |
| TarjanSCC | `graph.tarjan` | Tarjan 强连通分量(单遍DFS) |
| TopologicalX | `graph.topoX` | 拓扑排序优化版 |
| TransitiveClosure | `graph.transClosure` | 传递闭包(Warshall) |
| TwoPersonZeroSumGame | `graph.zeroSum` | 两人零和博弈 |

### 字符串（缺失 8）

| algs4 类 | 目标 id | 核心细节 |
| --- | --- | --- |
| BoyerMoore | `string.boyerMoore` | Boyer-Moore 子串匹配(坏字符+好后缀) |
| Huffman | `string.huffman` | 霍夫曼编码(最优前缀码) |
| LZW | `string.lzw` | LZW 字典压缩 |
| LongestRepeatedSubstring | `string.lrs` | 最长重复子串(后缀数组/排序) |
| NFA | `string.nfa` | 正则 NFA 模拟匹配 |
| RunLength | `string.runLength` | 游程编码(数据压缩) |
| SuffixArray | `string.suffixArray` | 后缀数组(所有后缀排序) |
| SuffixArrayX | `string.suffixArrayX` | 后缀数组优化版(3-字母倍增) |

### 数学几何（缺失 10）

| algs4 类 | 目标 id | 核心细节 |
| --- | --- | --- |
| ClosestPair | `math.closestPair` | 最近点对(分治) |
| FFT | `math.fft` | 快速傅里叶变换(多项式乘法) |
| FarthestPair | `math.farthestPair` | 最远点对(凸包直径) |
| GaussJordanElimination | `math.gaussJordan` | 高斯-约当消元(求逆) |
| GaussianElimination | `math.gaussElim` | 高斯消元(线性方程组) |
| GrahamScan | `math.grahamScan` | 凸包(Graham 扫描) |
| LinearProgramming | `math.linProg` | 线性规划(单纯形) |
| LinearRegression | `math.linReg` | 线性回归(最小二乘) |
| ThreeSum | `math.threeSum` | 3-SUM 问题(暴力) |
| ThreeSumFast | `math.threeSumFast` | 3-SUM 优化(排序+二分) |

## 已覆盖（done，等价）

- **排序**：Shell(sorting.shell)
- **图**：BellmanFordSP(graph.spfa)
- **并查集**：QuickFindUF(tree.uf*)、QuickUnionUF(tree.uf*)、UF(tree.uf*)、WeightedQuickUnionUF(tree.uf*)

## 不纳入（excluded 类别汇总）

- **?**：BST、BinarySearch、BreadthFirstPaths、DepthFirstPaths、DepthFirstSearch、DijkstraSP、EulerianPath、FenwickTree、FloydWarshall、Heap、Insertion、KMP、Knuth、KosarajuSharirSCC、KruskalMST、LongestCommonSubstring、Merge、MergeBU、PrimMST、Quick、Quick3way、RabinKarp、RedBlackBST、SegmentTree、Selection、TopM、Topological、TrieSET、TrieST
- **GUI**：Draw、DrawListener、Picture、StdDraw
- **图**：AdjMatrixEdgeWeightedDigraph
- **基准**：DoublingRatio、DoublingTest
- **基础设施**：Accumulator、Alphabet、Bag、BinaryIn、BinaryOut、BinaryStdIn、BinaryStdOut、Count、Counter、In、LinkedBag、LinkedQueue、LinkedStack、Out、Queue、ResizingArrayBag、ResizingArrayQueue、ResizingArrayStack、SET、ST、Stack、StaticSETofInts、StdArrayIO、StdAudio、StdIn、StdOut、StdRandom、StdStats、Stopwatch、StopwatchCPU
- **字符串**：GREP、Genome
- **客户端**：Average、BinaryDump、BlackFilter、Cat、DeDup、DegreesOfSeparation、FileIndex、FrequencyCounter、HexDump、KWIK、LookupCSV、LookupIndex、PictureDump、RandomSeq、WhiteFilter、Whitelist
- **数学**：Complex、SparseVector、Vector
- **数据类型**：Date、Digraph、DirectedEdge、Edge、EdgeWeightedDigraph、EdgeWeightedGraph、FlowEdge、FlowNetwork、Graph、Interval1D、Interval2D、Point2D、RectHV、Transaction
- **物理**：CollisionSystem、Particle
- **生成器**：DigraphGenerator、GraphGenerator
