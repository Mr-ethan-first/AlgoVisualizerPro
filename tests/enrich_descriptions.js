'use strict';
/**
 * 批量为 158 个算法补充/重写 description（核心思想+推导过程+适用场景+典型案例）。
 * 已含三段式的算法会被跳过。
 */
const fs = require('fs');
const path = require('path');

const D = (h, b) => `<div class="desc-section"><h3>${h}</h3><p>${b}</p></div>`;

function hasAllSections(desc) {
    return desc && /推导过程/.test(desc) && /适用场景/.test(desc) && /典型案例/.test(desc);
}

function makeDesc(id, name, category) {
    let core = '', derive = '', scenarios = '', cases = '';

    // ========== advanced ==========
    if (id.startsWith('advanced.')) {
        if (id.includes('skipList')) {
            core = '跳表是在有序链表上建立多层“快速通道”：底层保存全部元素，上层是下层的稀疏索引，查找时从顶层大步跳过无效区间。';
            derive = '假设你要在第 10 层楼找人。先在顶层（最稀疏）看目标应该在哪个区间，再下到下一层细化，直到底层精确定位。每层节点以 1/2 概率晋升，期望层数为 O(log n)，所以查找、插入、删除都是 O(log n)。';
            scenarios = '需要“有序 + 频繁增删查”的内存数据结构，且实现比平衡树简单。';
            cases = '① Redis 有序集合（zset）的近似实现。② LevelDB/RocksDB MemTable。③ 内存排行榜、区间查询索引。';
        } else if (id.includes('consistentHash')) {
            core = '把节点和数据都映射到一个首尾相连的哈希环上，数据顺时针找最近的节点，节点增减只影响相邻数据。';
            derive = '普通哈希取模在节点数变化时会导致大量数据迁移。一致性哈希把 key 和 node 都 hash 到 0~2³²−1 的环上，key 的负责节点是顺时针第一个 node。加入虚拟节点后分布更均匀。';
            scenarios = '分布式缓存、分片数据库、负载均衡，需要动态扩缩容且减少数据迁移。';
            cases = '① Memcached 集群分片。② Redis Cluster 数据分布。③ CDN 节点调度。';
        } else if (id.includes('raft')) {
            core = 'Raft 通过“Leader 选举 + 日志复制 + 多数派提交”让多台机器状态一致。';
            derive = '所有写请求交给 Leader，Leader 先把日志发给多数 Follower，收到过半确认后再提交并返回客户端。Leader 失效时通过超时触发选举，任期号大的成为新 Leader。';
            scenarios = '分布式数据库、分布式配置中心、需要强一致性的多副本系统。';
            cases = '① etcd 配置存储。② TiKV/Raft 分布式 KV。③ Consul 服务发现。';
        } else if (id === 'math.fft') {
            core = '快速傅里叶变换把多项式从系数表示快速转成点值表示，多项式乘法可从 O(n²) 降到 O(n log n)。';
            derive = '利用单位根的对称性和分治：把多项式按奇偶下标拆成两个子多项式，递归计算后再合并。因为 ω_n^(k+n/2) = −ω_n^k，很多计算可以复用。';
            scenarios = '信号处理、多项式乘法、大整数乘法、卷积计算。';
            cases = '① 音频信号滤波。② 图像模糊/锐化卷积。③ 大整数快速乘法。';
        } else if (id === 'math.linProg') {
            core = '线性规划求一组线性约束下目标函数的最大/最小值，单纯形法沿可行域顶点迭代优化。';
            derive = '可行域是多维空间的多面体，最优解一定在某个顶点。单纯形法先找一个顶点，然后沿使目标函数更优的边走到相邻顶点，直到没有更优邻居。';
            scenarios = '生产计划、资源分配、物流运输、投资组合优化。';
            cases = '① 工厂排产使利润最大。② 运输成本最小化。③  diet problem（营养配餐）。';
        }
    }

    // ========== sorting ==========
    else if (category === 'sorting') {
        if (id.includes('bubble')) {
            core = '反复比较相邻两个元素，顺序不对就交换，让大的元素像气泡一样“浮”到右边。';
            derive = '第 1 轮把最大元素移到末尾，第 2 轮把次大元素移到倒数第 2 位……最多 n−1 轮。如果某轮没有发生交换，说明已经有序，可以提前退出。';
            scenarios = '数据量很小、教学演示、基本有序的数据。';
            cases = '① 10 个数的简单排序演示。② 已经基本排好序的列表再做一次确认。';
        } else if (id.includes('selection')) {
            core = '每一轮从剩余元素中选出最小（或最大）的，放到已排序区间的末尾。';
            derive = '已排序部分从 0 开始。第 i 轮在 [i, n−1] 里找最小值，与位置 i 交换。n−1 轮后全部有序。';
            scenarios = '数据量小、对交换次数敏感（每次只交换一次）的场景。';
            cases = '① 只关心最小/最大元素逐步归位的过程展示。② 手写排序的嵌入式设备。';
        } else if (id.includes('insertion')) {
            core = '把数组分成已排序和未排序两部分，每次从未排序部分取一个元素，插入到已排序部分的正确位置。';
            derive = '前 i 个元素已经有序。取第 i+1 个元素，从后向前比较，遇到比它大的就后移，直到找到合适位置插入。扑克牌整理牌就是这个道理。';
            scenarios = '数据基本有序、数据量不大、需要稳定排序。';
            cases = '① 扑克牌按点数整理。② 实时接收少量数据并不断维护有序列表。';
        } else if (id.includes('quick')) {
            core = '选一个基准值，把数组分成“小于基准”和“大于基准”两部分，然后递归排序两部分。';
            derive = '关键在于 partition：用两个指针从两端向中间扫描，把小于 pivot 的放左边，大于的放右边。pivot 的最终位置就是它在有序数组中的位置。然后对左右子数组递归。';
            scenarios = '通用排序、数据量大、平均性能要求高的场景。';
            cases = '① 数据库查询结果排序。② 大数据集内存排序。③ 快速求 Top-K（只递归一侧）。';
        } else if (id.includes('merge')) {
            core = '把数组不断二分，直到每个子数组只有一个元素，再两两合并成有序数组。';
            derive = '长度为 1 的数组天然有序。合并两个有序数组时，用双指针依次取较小者放入结果，时间 O(n)。因为每次二分，递归深度 O(log n)，总时间 O(n log n)。';
            scenarios = '需要稳定排序、数据量大、链表排序、外部排序。';
            cases = '① 合并两个已排序的日志文件。② 链表排序。③ 大数据外部归并排序。';
        } else if (id.includes('heap')) {
            core = '先把数组建成大顶堆，然后反复把堆顶（最大元素）移到数组末尾，并调整剩余元素保持堆性质。';
            derive = '大顶堆满足父节点 ≥ 子节点。建堆从最后一个非叶子节点开始下沉。排序时交换堆顶与末尾，堆大小减 1，再对堆顶下沉。这样每次都能确定一个元素的最终位置。';
            scenarios = '需要原地排序、求 Top-K、实现优先队列。';
            cases = '① 从 100 万个数中取最大的 100 个。② 任务调度按优先级执行。';
        } else if (id.includes('shell')) {
            core = '插入排序的改进版：先按较大间隔分组排序，让元素快速接近正确位置，再逐步缩小间隔做精细排序。';
            derive = '普通插入排序每次只移动一步。希尔排序先让相距 gap 的元素有序，元素可以一次跳 gap 步；最后 gap=1 时就是普通插入排序，此时数组已基本有序，速度很快。';
            scenarios = '中等规模数据、对实现简单性有要求、不适合递归的场景。';
            cases = '① 嵌入式系统排序。② 教学演示“减少逆序对”的思想。';
        } else if (id.includes('counting')) {
            core = '统计每个数值出现的次数，再按数值从小到大依次输出，得到有序序列。';
            derive = '假设数据范围是 0~k。开一个长度为 k+1 的计数数组，遍历原数组统计频次。然后按计数数组的下标顺序输出对应个数的元素。';
            scenarios = '数据范围小且为整数、需要稳定线性排序。';
            cases = '① 学生成绩（0~100 分）排序。② 年龄统计排序。';
        } else if (id.includes('radix')) {
            core = '按数位从低到高（或从高到低）逐位进行稳定排序，最终得到完整有序序列。';
            derive = '先按个位排序，再按十位排序……因为每次排序都是稳定的，前一轮的相对顺序会被保留。k 位数字做 k 轮计数排序，总时间 O(k·n)。';
            scenarios = '整数、字符串、定长关键字排序，需要稳定线性排序。';
            cases = '① 电话号码排序。② 银行卡号排序。③ 字符串字典序排序。';
        } else if (id.includes('bucket')) {
            core = '把数据分到若干个桶里，每个桶内部单独排序，最后按桶顺序收集结果。';
            derive = '假设数据均匀分布。把区间 [min, max] 分成 k 个桶，每个元素放入对应桶。桶内元素少，用插入排序即可。理想情况下总时间接近 O(n)。';
            scenarios = '数据分布均匀、浮点数排序、需要并行化的场景。';
            cases = '① 高考成绩按分数段分班。② 分布式排序（每个节点处理一个桶）。';
        } else if (id.includes('topM')) {
            core = '维护一个大小为 M 的最小堆，遍历数据时保留当前最大的 M 个元素。';
            derive = '堆顶是当前 Top-M 里最小的一个。来了新元素，如果它比堆顶大，就把堆顶替换为新元素并调整堆；否则忽略。遍历一遍即可得到最大的 M 个。';
            scenarios = '海量数据中取前 M 个、实时排行榜、热点统计。';
            cases = '① 直播礼物榜 Top 100。② 日志中找出现次数最多的 10 个 IP。';
        } else {
            core = '通过比较或分桶等方式调整元素位置，使整个数组满足升序/降序要求。';
            derive = '排序的本质是消除逆序对。不同算法用不同策略减少比较/交换次数：有的逐个插入，有的分而治之，有的按特征分桶。';
            scenarios = '数据整理、结果展示、作为其他算法的前置步骤。';
            cases = '① 电商商品按价格排序。② 日志按时间排序。③ 姓名按字典序排序。';
        }
    }

    // ========== linear ==========
    else if (category === 'linear') {
        if (id.includes('array')) {
            core = '动态数组用一段连续内存存储元素，支持随机访问；容量不足时申请更大空间并搬移数据。';
            derive = '追加元素时，若 size < capacity 直接放入；否则扩容（通常 1.5~2 倍），把旧数据 copy 过去，再插入。均摊时间 O(1)。插入/删除中间元素需要搬移后续元素，时间 O(n)。';
            scenarios = '需要随机访问、动态增删尾部元素的集合。';
            cases = '① Python/Java 的 ArrayList/Vector。② 实现栈和队列的底层。③ 缓冲区。';
        } else if (id.includes('list')) {
            core = '链表用节点保存数据和 next 指针，通过指针连接形成线性序列，插入删除只需改指针。';
            derive = '每个节点记录 value 和 next。要插入新节点，先找到前驱，让新节点指向原后继，再让前驱指向新节点。删除则是让前驱跳过目标节点。';
            scenarios = '频繁插入删除、不需要随机访问、需要动态增长的场景。';
            cases = '① LRU 缓存。② 实现队列、栈。③ 多项式表示。';
        } else if (id.includes('stack')) {
            core = '栈是一种“后进先出”的线性结构，只能在栈顶 push 和 pop。';
            derive = '用数组或链表维护一个 top 指针。push 时 top 加 1 并放入元素；pop 时取出 top 位置元素并减 1。最后进入的最先被取出。';
            scenarios = '函数调用、表达式求值、撤销操作、括号匹配。';
            cases = '① 浏览器前进/后退。② 编译器表达式求值。③ 括号匹配检查。';
        } else if (id.includes('queue') || id.includes('deque')) {
            core = '队列是“先进先出”的结构，队尾入队、队首出队；双端队列两端都可操作。';
            derive = '用数组循环队列或双向链表维护 head 和 tail。入队移动 tail，出队移动 head。循环队列用取模复用被释放的空间。';
            scenarios = '任务调度、BFS、缓存、流水线缓冲。';
            cases = '① 打印机任务队列。② BFS 图遍历。③ 消息队列。';
        } else if (id === 'linear.lru') {
            core = 'LRU 缓存保留最近使用过的数据，淘汰最久未使用的，兼顾 O(1) 读写。';
            derive = '用哈希表做 key→节点的映射，用双向链表维护使用顺序。访问时把节点移到头部；满时淘汰尾部节点。两者配合实现 O(1)。';
            scenarios = '缓存淘汰、数据库缓冲池、页面置换。';
            cases = '① Redis 内存淘汰策略。② 操作系统页面置换。③ LeetCode 146 LRU Cache。';
        } else if (id.startsWith('search.')) {
            core = '符号表是 key→value 的映射；通过顺序查找、二分查找或哈希实现不同性能。';
            derive = '顺序查找逐个比较 key，O(n)。有序数组可用二分查找定位 key，O(log n)。哈希表用 hash 函数把 key 映射到桶，期望 O(1)。线性探测用开放寻址解决冲突。';
            scenarios = '字典、数据库索引、缓存、统计频次。';
            cases = '① 电话号码簿查找。② 编译器符号表。③ URL 去重。';
        } else {
            core = '在线性结构上按规则执行插入、删除、查找或遍历操作。';
            derive = '线性结构的核心是维护好头尾指针或索引。操作时要注意边界（空表、只有一个节点、尾部节点）。';
            scenarios = '数据存取、缓存、表达式处理、任务调度。';
            cases = '① 联系人列表。②  undo 历史。③ 消息队列。';
        }
    }

    // ========== tree ==========
    else if (category === 'tree') {
        if (name.includes('遍历') || name.includes('序')) {
            core = '按特定顺序访问二叉树的每个节点：前序根-左-右，中序左-根-右，后序左-右-根，层序一层一层访问。';
            derive = '递归写法直接按定义访问。非递归写法用栈模拟递归过程：中序一路向左压栈，到底后弹出访问，再转向右子树；层序用队列按层扩展。';
            scenarios = '表达式求值、序列化树、按层次展示、BST 有序输出。';
            cases = '① 文件系统目录树打印。② 表达式树求值。③ BST 中序输出有序序列。';
        } else if (name.includes('BST')) {
            core = '二叉搜索树保持“左子树 < 根 < 右子树”，查找/插入/删除都像二分查找一样沿一条路径走。';
            derive = '查找时与当前节点比较：小则向左，大则向右。插入找到空位置放入。删除分三种情况：叶子直接删；只有一个孩子则孩子顶替；有两个孩子则用右子树最小值（或左子树最大值）替换。';
            scenarios = '需要动态维护有序集合、频繁增删查。';
            cases = '① 字典树实现。② 数据库索引（简单场景）。③ 实现有序 map。';
        } else if (name.includes('AVL')) {
            core = 'AVL 树是严格的平衡二叉搜索树，任何节点的左右子树高度差不超过 1。';
            derive = '插入/删除后检查祖先节点的平衡因子。若失衡，通过左旋、右旋或左右双旋恢复平衡。旋转只影响局部子树，保持 BST 性质不变。';
            scenarios = '查找性能必须稳定为 O(log n)、数据频繁变动的场景。';
            cases = '① 数据库索引。② 内存有序 map。③ 需要最坏情况保证的系统。';
        } else if (name.includes('红黑')) {
            core = '红黑树用“红/黑”染色和五条规则保持近似平衡，插入删除的旋转次数比 AVL 少。';
            derive = '规则包括根黑、叶子（NIL）黑、红节点的孩子黑、从任意节点到叶子的黑高相同。插入/删除时若破坏规则，通过变色和旋转修复，最多 O(log n) 次调整。';
            scenarios = '需要频繁插入删除且要求 O(log n) 性能的标准库实现。';
            cases = '① Java TreeMap/TreeSet。② Linux 内核 CFS 调度。③ C++ std::map。';
        } else if (name.includes('堆')) {
            core = '堆是一棵完全二叉树，大顶堆父节点 ≥ 子节点，小顶堆父节点 ≤ 子节点。';
            derive = '用数组存储：父节点 i 的左右孩子分别是 2i+1 和 2i+2。插入时上浮（与父节点交换），删除堆顶时下沉（与孩子中较大/较小者交换）。建堆可从最后一个非叶子节点开始下沉。';
            scenarios = '优先队列、Top-K、堆排序、任务调度。';
            cases = '① 合并 K 个有序数组。② 操作系统进程优先级调度。③ 找中位数的数据流。';
        } else if (name.includes('Trie')) {
            core = 'Trie（前缀树）把字符串按字符拆成边，从根到节点的路径就是一个前缀。';
            derive = '每个节点代表一个字符，从根到某节点拼起来就是前缀。插入时沿字符路径走，没有就新建；查找时同样沿路径走，走到头即存在。';
            scenarios = '前缀匹配、自动补全、拼写检查、IP 路由最长前缀匹配。';
            cases = '① 输入法自动补全。② 路由器最长前缀匹配。③ 敏感词过滤。';
        } else if (name.includes('线段树')) {
            core = '线段树把区间二分建造成树，每个节点维护一个子区间的聚合信息，支持区间查询和单点更新。';
            derive = '区间 [l,r] 对应节点，若长度大于 1 则分成 [l,mid] 和 [mid+1,r] 两个孩子。查询时把目标区间拆成若干已覆盖的子区间合并结果；更新时自底向上重新聚合。';
            scenarios = '区间最值/求和/修改、RMQ、动态区间统计。';
            cases = '① 区间最大值查询。② 数组区间加减。③ 扫描线算法。';
        } else if (name.includes('树状数组') || name.includes('BIT')) {
            core = '树状数组用 lowbit 维护前缀信息，以 O(log n) 支持单点修改和前缀查询。';
            derive = '每个节点 c[i] 负责一段长度为 lowbit(i) 的区间。更新 a[x] 时，沿 x += lowbit(x) 更新所有相关节点；查询前缀和时，沿 x -= lowbit(x) 累加。';
            scenarios = '前缀和/频次统计、逆序对、动态区间和。';
            cases = '① 动态求前缀和。② 统计逆序对数量。③ 实时频次统计。';
        } else if (name.includes('并查集')) {
            core = '并查集维护若干不相交集合，支持“合并两个集合”和“查询是否同一集合”。';
            derive = '每个元素指向父节点，根节点代表集合。Find 时路径压缩（把访问过的节点直接连到根），Union 时按秩合并（小树挂大树）。这样均摊复杂度接近 O(α(n))。';
            scenarios = '连通性判断、Kruskal 最小生成树、等价类划分。';
            cases = '① 社交网络好友圈判断。② 迷宫连通性。③ 最小生成树 Kruskal。';
        } else if (name.includes('优先队列') || name.includes('PQ')) {
            core = '优先队列每次取出优先级最高（或最低）的元素，通常用堆实现。';
            derive = '底层用堆维护。插入时上浮，删除堆顶时下沉。索引优先队列额外维护索引到堆位置的映射，支持 O(log n) 修改任意元素的优先级。';
            scenarios = '任务调度、Dijkstra 最短路径、Top-K、合并有序流。';
            cases = '① 医院急诊叫号。② 打印机优先级队列。③ Dijkstra 算法。';
        } else {
            core = '利用树的分层结构维护数据，并通过遍历或平衡操作完成查询和修改。';
            derive = '树的每个节点有父/子关系。操作从根开始，根据比较或规则选择分支，直到找到目标或到达叶子。';
            scenarios = '层次化数据、快速查找、有序集合、区间查询。';
            cases = '① 组织架构图。② 文件系统。③ 数据库索引。';
        }
    }

    // ========== graph ==========
    else if (category === 'graph') {
        if (name.includes('BFS')) {
            core = '从起点开始，一层一层地访问所有邻居，像水波扩散。';
            derive = '用队列维护当前层节点。弹出队首，把所有未访问的邻居入队。由于先入队的先处理，保证距离起点近的节点先被访问，从而找到无权图的最短路径。';
            scenarios = '无权图最短路径、层级遍历、连通性、社交网络扩散。';
            cases = '① 迷宫最短步数。② 好友关系的“六度分隔”。③ 病毒传播模拟。';
        } else if (name.includes('DFS')) {
            core = '从起点出发，沿着一条路径一直走到底，走不通再回退试别的路。';
            derive = '用递归或显式栈实现。访问节点后标记，再递归访问未访问的邻居。回溯时撤销当前选择。可用于遍历、找环、求连通分量、拓扑排序。';
            scenarios = '路径搜索、连通性、环检测、拓扑排序、回溯。';
            cases = '① 迷宫找通路。② 判断图是否有环。③ 解数独/ N 皇后。';
        } else if (name.includes('Dijkstra')) {
            core = '用于非负权图的单源最短路径：每次都选当前距离最小的点，用它更新邻居。';
            derive = '维护 dist[] 表示起点到各点的当前最短距离。初始 dist[start]=0，其余为 ∞。用优先队列取 dist 最小的点 u，对每条边 u→v，若 dist[u]+w < dist[v] 则更新。贪心成立的前提是所有边权非负。';
            scenarios = '地图导航、网络路由、物流配送、游戏寻路。';
            cases = '① 高德地图最短路径。② 网络路由协议 OSPF。③ 外卖骑手路径规划。';
        } else if (name.includes('Bellman') || name.includes('SPFA')) {
            core = 'Bellman-Ford 能处理负权边的单源最短路径，通过反复松弛所有边实现。';
            derive = '进行 n−1 轮松弛：对每条边 u→v，若 dist[u]+w < dist[v] 则更新。因为最短路径最多含 n−1 条边，n−1 轮足够。若第 n 轮还能更新，说明存在负环。SPFA 用队列只处理被更新的节点，常数更小。';
            scenarios = '含负权边的图、货币套利、差分约束。';
            cases = '① 外汇套利检测。② 差分约束系统。③ 含负权边的网络路由。';
        } else if (name.includes('Floyd')) {
            core = 'Floyd-Warshall 求任意两点间的最短路径，基于动态规划。';
            derive = '设 dist[i][j] 表示 i 到 j 的最短距离。枚举中间点 k，若 dist[i][k]+dist[k][j] < dist[i][j] 则更新。三重循环后得到全源最短路。';
            scenarios = '全源最短路径、节点数较少的稠密图、传递闭包。';
            cases = '① 全国城市间最短距离表。② 网络中任意两节点延迟。③ 判断任意两点是否可达。';
        } else if (name.includes('Prim') || name.includes('Kruskal') || name.includes('Boruvka')) {
            core = '最小生成树选出一组边，连接所有顶点且总权重最小。';
            derive = 'Prim 从一个点开始，每次选连接“已选集合”和“未选集合”的最短边，像长草。Kruskal 按边权排序，用并查集避免成环。Boruvka 每轮为每个连通块选最小边。';
            scenarios = '网络设计、电路布线、聚类、管道铺设。';
            cases = '① 城市间铺设光纤使成本最低。② 电路板最小连线。③ 传感器网络连接。';
        } else if (name.includes('拓扑')) {
            core = '拓扑排序把 DAG 的顶点排成线性序列，使得所有边都从前指向后。';
            derive = 'Kahn 算法反复找入度为 0 的点加入结果，并删除其出边。DFS 法则是记录后序遍历的逆序。若无法处理完所有点，说明图中有环。';
            scenarios = '任务调度、依赖解析、编译顺序、课程先修。';
            cases = '① 大学选课计划。② Makefile 构建顺序。③ npm 依赖安装顺序。';
        } else if (name.includes('强连通') || name.includes('Kosaraju') || name.includes('Tarjan') || name.includes('Gabow')) {
            core = '强连通分量是图中互相可达的最大子图。';
            derive = 'Kosaraju 做两次 DFS：第一次记录完成顺序，第二次在反向图上按逆序 DFS，每次得到 SCC。Tarjan 用一次 DFS 维护 dfn/low，当 low[u]==dfn[u] 时弹出栈中节点即为一个 SCC。';
            scenarios = '社交网络社群发现、依赖环检测、缩点建 DAG。';
            cases = '① 微博互相关注圈子。② 代码模块循环依赖检测。③ 地图强连通区域分析。';
        } else if (name.includes('欧拉')) {
            core = '欧拉路径/回路是经过图中每条边恰好一次的路径；回路要求起点终点相同。';
            derive = 'Hierholzer 算法：从起点出发随便走，遇到死胡同时把路径倒序加入结果，再处理还有未访问边的点。无向图存在欧拉回路当且仅当连通且所有点度数为偶数。';
            scenarios = '路线规划、一笔画问题、DNA 序列拼接。';
            cases = '① 邮递员路线（每条街走一次）。② 游戏“一笔画”。③ 基因组拼接。';
        } else if (name.includes('最大流') || name.includes('Ford')) {
            core = '最大流求从源点到汇点能通过的最大流量，同时满足每条边的容量限制。';
            derive = 'Ford-Fulkerson 在残量网络上不断找增广路径，沿路径增加流量，直到找不到增广路。 Edmonds-Karp 用 BFS 找最短增广路，保证多项式时间。';
            scenarios = '交通网络、供水/电网、二分图匹配、物流。';
            cases = '① 城市供水最大输送量。② 物流配送瓶颈分析。③ 二分图最大匹配。';
        } else if (name.includes('匹配') || name.includes('匈牙利') || name.includes('Hopcroft')) {
            core = '二分图匹配把左边的点与右边的点配对，使每点最多配一次，目标是匹配数最大或总权最小。';
            derive = '匈牙利算法用 DFS 给每个左部点找增广路：若右部点未匹配或已匹配点能找到新匹配，则配对成功。Hopcroft-Karp 用 BFS 分层+多路增广，效率更高。';
            scenarios = '任务分配、资源匹配、推荐系统、调度。';
            cases = '① 员工任务分配。② 网约车派单。③ 广告与广告位匹配。';
        } else if (name.includes('二分图')) {
            core = '二分图能把顶点分成两组，使所有边都跨在两组之间。';
            derive = '用 BFS/DFS 给节点染色，相邻节点颜色必须不同。若发现相邻节点同色，则不是二分图。等价于图中没有奇数长度的环。';
            scenarios = '冲突检测、资源分配、推荐系统、染色问题。';
            cases = '① 任务与机器分配冲突检查。② 电影与用户二分推荐。③ 棋盘染色问题。';
        } else if (name.includes('环')) {
            core = '检测图中是否存在环，以及找出环上的节点。';
            derive = 'DFS 时记录递归栈，若遇到已在栈中的邻居，说明有环。并查集也可以：若一条边的两个端点已在同一集合，则形成环。';
            scenarios = '死锁检测、依赖冲突、电路网络、编译循环依赖。';
            cases = '① npm 循环依赖检测。② 数据库死锁检测。③ 判断课程先修是否有矛盾。';
        } else if (name.includes('传递闭包')) {
            core = '传递闭包回答“从 i 能否到达 j”这一布尔关系。';
            derive = '可视为所有点对最短路径的布尔版。Floyd 思想：枚举中间点 k，若 i 能到 k 且 k 能到 j，则 i 能到 j。';
            scenarios = '可达性查询、数据库关系闭包、工作流依赖分析。';
            cases = '① 权限继承关系。② 数据库传递依赖。③ 工作流任务可达性。';
        } else if (name.includes('符号')) {
            core = '符号图把字符串（如课程名）映射为整数，再用图算法处理。';
            derive = '建立两个哈希表：name→index 和 index→name。图的顶点是整数索引，边用索引表示。这样既保留原始名称，又方便图算法运行。';
            scenarios = '顶点是字符串的图、依赖解析、社交网络中用户名作为节点。';
            cases = '① 课程先修图。② 电影演员合作图。③ 软件包依赖图。';
        } else if (name.includes('assignment') || name.includes('分配')) {
            core = '分配问题把 n 个任务分配给 n 个人，使总成本最小。';
            derive = '可转化为二分图最小权匹配。匈牙利算法在成本矩阵上维护行/列势，通过不断找零元素增广来求最优分配。';
            scenarios = '任务调度、资源分配、物流派单。';
            cases = '① 员工项目分配。② 机器任务调度。③ 运输成本最小化。';
        } else if (name.includes('zeroSum') || name.includes('博弈')) {
            core = '两人零和博弈中，一方收益等于另一方损失，可用线性规划或 minimax 求解最优混合策略。';
            derive = '把博弈写成矩阵，玩家 A 选择策略使最小期望收益最大，玩家 B 选择策略使最大期望损失最小。根据极小极大定理，二者相等时即为纳什均衡。';
            scenarios = '博弈论、经济模型、对抗性 AI、安全策略。';
            cases = '① 石头剪刀布最优策略。② 拍卖竞价模型。③ 网络安全攻防。';
        } else if (name.includes('arbitrage')) {
            core = '货币套利利用汇率差异，把一种货币经若干兑换变回自身后变多。';
            derive = '把汇率取负对数作为边权，套利等价于图中存在负环。用 Bellman-Ford 或 SPFA 检测负环即可。';
            scenarios = '外汇市场、金融产品套利、价格差异检测。';
            cases = '① 外汇三角套利。② 跨交易所加密货币套利。③ 商品价格差监控。';
        } else if (name.includes('cpm') || name.includes('关键路径')) {
            core = '关键路径法找出项目中最长的依赖路径，决定了项目的最短完成时间。';
            derive = '把任务按依赖关系建成 DAG，边权为任务持续时间。先拓扑排序，再正向求最早开始时间、反向求最晚开始时间，两者差为 0 的任务在关键路径上。';
            scenarios = '项目管理、工程调度、生产计划。';
            cases = '① 建筑项目排期。② 软件开发里程碑规划。③ 工厂流水线调度。';
        } else if (name.includes('acyclic')) {
            core = 'DAG 上按拓扑顺序进行一遍松弛，可在线性时间内求最短或最长路径。';
            derive = 'DAG 没有环，按拓扑序处理顶点时，到达该点的所有前驱都已算好最短距离。用这些前驱更新当前点，再向后传播。';
            scenarios = '项目调度、依赖链长度、DAG 上的路径优化。';
            cases = '① 任务完成最短时间。② 编译依赖链长度。③ 工作流关键链路。';
        } else if (name.includes('cc') || name.includes('连通分量')) {
            core = '找出图中互相连通的最大子集。';
            derive = '对每个未访问节点做 DFS/BFS，所有访问到的节点属于同一个连通分量。有向图需分强连通分量和弱连通分量。';
            scenarios = '社交网络社群、网络连通性、聚类分析。';
            cases = '① 社交圈发现。② 网络故障隔离。③ 图像区域分割。';
        } else {
            core = '把问题建模成图，通过遍历、松弛或匹配等操作得到所需结果。';
            derive = '图的核心是顶点和边。根据问题选择 BFS/DFS、最短路径、最小生成树或网络流等算法，把实际问题转化为图上的计算。';
            scenarios = '关系网络、路径规划、依赖分析、资源分配。';
            cases = '① 地图导航。② 社交网络分析。③ 软件依赖管理。';
        }
    }

    // ========== string ==========
    else if (category === 'string') {
        if (name.includes('KMP') || name.includes('next')) {
            core = 'KMP 在匹配失败时利用已匹配部分的信息，让模式串滑动到最可能匹配的位置。';
            derive = '预处理模式串得到 next 数组：next[i] 表示子串 [0..i] 的最长相等真前缀与真后缀长度。匹配时若主串 j 与模式串 i 不等，i 回退到 next[i−1] 继续比较，避免主串指针回退。';
            scenarios = '单模式串精确匹配、文本搜索、DNA 序列比对。';
            cases = '① 编辑器查找替换。② 病毒特征码匹配。③ 基因序列定位。';
        } else if (name.includes('Boyer') || name.includes('Sunday')) {
            core = '从右向左比较模式串，利用坏字符和好后缀规则大步跳过不可能位置。';
            derive = '先根据模式串预处理每个字符最右出现位置。匹配时从模式串尾部开始，若遇到不匹配的字符，按规则计算最大安全滑动距离。Sunday 还看主串中模式串右侧第一个字符。';
            scenarios = '文本搜索、关键词过滤、日志匹配、大文本编辑器。';
            cases = '① grep 文本搜索。② 敏感词过滤。③ 日志中定位错误关键字。';
        } else if (name.includes('Rabin-Karp')) {
            core = '用滚动哈希把子串转成数值，先比哈希再逐字符确认，实现多模式匹配。';
            derive = '选一个基数和模数，把长度为 m 的子串看作 m 位“数”。利用前一个子串的哈希在 O(1) 内推出下一个子串的哈希。哈希相等时再逐字符验证，避免冲突误判。';
            scenarios = '多模式匹配、抄袭检测、DNA 重复片段查找。';
            cases = '① 论文查重。② 病毒库多特征匹配。③ 字符串中出现次数统计。';
        } else if (name.includes('LCS')) {
            core = '最长公共子序列求两个串中按顺序出现但不一定连续的最长相同序列长度。';
            derive = '设 dp[i][j] 表示 a[0..i−1] 与 b[0..j−1] 的 LCS。若 a[i−1]==b[j−1]，dp[i][j]=dp[i−1][j−1]+1；否则 dp[i][j]=max(dp[i−1][j], dp[i][j−1])。';
            scenarios = 'DNA 比对、版本 diff、拼写纠错、蛋白质序列分析。';
            cases = '① git diff。② 基因序列相似度。③ 论文重复率初筛。';
        } else if (name.includes('LRS')) {
            core = '最长重复子串找字符串中出现至少两次的最长子串。';
            derive = '常用后缀数组或后缀自动机：把所有后缀排序后，相邻后缀的最长公共前缀就是候选重复子串，取最大值。';
            scenarios = 'DNA 重复片段、文本压缩、抄袭检测、音乐旋律重复。';
            cases = '① 基因组重复序列分析。② 音乐指纹去重。③ 日志模式挖掘。';
        } else if (name.includes('后缀数组')) {
            core = '后缀数组存储字符串所有后缀按字典序排序后的起始下标，可高效解决大量字符串问题。';
            derive = '把所有后缀排序。任意两个后缀的最长公共前缀等于它们在排序后相邻位置的 LCP 的最小值。配合 LCP 数组可做最长重复子串、不同子串计数等。';
            scenarios = '字符串模式挖掘、DNA 分析、文本压缩、拼写检查。';
            cases = '① 最长重复子串。② 不同子串数量。③ 字符串相似度。';
        } else if (name.includes('霍夫曼') || name.includes('Huffman')) {
            core = '霍夫曼编码按字符出现频率构建最优前缀树，高频字符短编码、低频字符长编码。';
            derive = '每次选频率最小的两个节点合并成新节点，新节点频率为二者之和。重复直到只剩一棵树。从根到叶子的路径就是该字符的编码，左 0 右 1。';
            scenarios = '无损数据压缩、文件压缩、通信编码。';
            cases = '① ZIP 压缩。② JPEG 图像熵编码。③ 摩斯码变长编码思想。';
        } else if (name.includes('LZW')) {
            core = 'LZW 压缩在编码过程中动态构建字典，把重复子串用短编码替换。';
            derive = '初始字典包含所有单字符。扫描输入时，尽量匹配字典中最长的已有字符串，输出其编码，并把“当前串+下一个字符”加入字典。解压时同样重建字典。';
            scenarios = '文件压缩、图像格式（GIF/TIFF）、PDF 压缩。';
            cases = '① GIF 图像压缩。② Unix compress 工具。③ PDF 文本流压缩。';
        } else if (name.includes('哈希') && !name.includes('Rabin')) {
            core = '字符串哈希把字符串映射成一个整数，用于快速比较子串是否相等。';
            derive = '把字符串看作 p 进制数，如 hash(s)=Σ s[i]·p^(n−1−i) mod M。利用前缀哈希可在 O(1) 内得到任意子串哈希，从而快速比较。';
            scenarios = '子串判等、回文检测、字符串去重、滚动比较。';
            cases = '① 判断两个子串是否相同。② 找最长回文子串。③ 大量字符串去重。';
        } else if (name.includes('三路字符串') || name.includes('LSD') || name.includes('MSD')) {
            core = '按字符进行多轮稳定排序，实现字符串字典序排序。';
            derive = 'LSD 从最低位字符向最高位逐轮计数排序；MSD 从最高位开始递归分组。因为每轮稳定，前一轮的顺序会被保留。';
            scenarios = '大量等长或变长字符串排序、数据库索引、字典生成。';
            cases = '① 电话号码字典序排序。② 单词列表排序。③ 车牌号排序。';
        } else if (name.includes('多路归并')) {
            core = '把 k 个已排序的输入流合并成一个有序输出流。';
            derive = '用最小堆维护每个输入流当前最小元素。每次取出堆顶放入结果，再从对应流取下一个元素入堆。k 路总时间 O(N log k)。';
            scenarios = '外部排序、日志合并、数据库归并连接、MapReduce。';
            cases = '① 合并多个有序日志文件。② 数据库外部排序。③ 大数据分片合并。';
        } else {
            core = '对字符串进行查找、比较、编码或排序操作。';
            derive = '字符串可看作字符序列。利用前缀、后缀、哈希或自动机等结构，避免暴力 O(n·m) 的比较。';
            scenarios = '文本处理、生物信息学、日志分析、数据压缩。';
            cases = '① 关键词搜索。② DNA 序列分析。③ 文本去重与压缩。';
        }
    }

    // ========== classic ==========
    else if (category === 'classic') {
        if (name.includes('二分搜索')) {
            core = '在有序数组中每次把搜索范围减半，快速定位目标。';
            derive = '取区间中间元素与目标比较：若相等则找到；若目标更小，在左半区间继续；否则在右半区间继续。区间长度每次减半，因此最多 O(log n) 次比较。';
            scenarios = '有序数据查找、范围查询、求上下界、旋转数组查找。';
            cases = '① 字典查单词。② 在有序成绩表找分数。③ 查找第一个/最后一个满足条件的元素。';
        } else if (name.includes('斐波那契')) {
            core = '斐波那契数列定义为 F(n)=F(n−1)+F(n−2)，体现递归与重叠子问题。';
            derive = '递归直接按定义计算会重复算很多子问题。DP 用数组保存已算结果，从 F(0)、F(1) 递推到 F(n)，时间 O(n)。矩阵快速幂可进一步优化到 O(log n)。';
            scenarios = '教学演示递归与 DP、自然界规律建模、组合计数。';
            cases = '① 爬楼梯（每次 1 或 2 步）。② 兔子繁殖模型。③ 黄金分割近似。';
        } else if (name.includes('背包')) {
            core = '背包问题在容量限制下选择物品，使价值最大。';
            derive = '设 dp[i][w] 表示前 i 个物品、容量 w 时的最大价值。0-1 背包：dp[i][w]=max(不选 i, 选 i 即 dp[i−1][w−weight[i]]+value[i])。完全背包物品可重复，顺序改为从小到大枚举容量。';
            scenarios = '资源分配、装载优化、预算分配、投资组合。';
            cases = '① 旅行箱装行李使价值最大。② 项目预算选择。③ 广告投放组合优化。';
        } else if (name.includes('N 皇后')) {
            core = '在 n×n 棋盘上放 n 个皇后，使她们互不攻击。';
            derive = '每行放一个皇后。逐行尝试每一列，检查是否与已放皇后同列或同对角线。若冲突则回溯；若放完所有行则找到一个解。';
            scenarios = '约束满足、回溯算法教学、棋盘游戏。';
            cases = '① 八皇后 puzzle。② 数独求解。③ 约束满足问题原型。';
        } else if (name.includes('汉诺塔')) {
            core = '把 n 个盘子从 A 柱移到 C 柱，借助 B 柱，大盘不能压小盘。';
            derive = '递归：先把上面 n−1 个盘子从 A 移到 B，再把最大盘从 A 移到 C，最后把 n−1 个盘子从 B 移到 C。移动次数为 2ⁿ−1。';
            scenarios = '递归教学、栈操作演示、分治思想入门。';
            cases = '① 经典益智游戏。② 递归算法入门示例。③ 机器人搬箱子规划。';
        } else if (name.includes('骑士巡游') || name.includes('数独') || name.includes('回溯')) {
            core = '通过递归尝试所有可能，遇到不满足条件就回退，直到找到可行解。';
            derive = '每步选择一个候选填入当前位置，检查约束是否满足。满足则继续下一层；不满足则撤销该选择并试下一个候选。剪枝可大幅缩小搜索空间。';
            scenarios = '组合优化、约束满足、棋类游戏、调度排班。';
            cases = '① 数独求解。② N 皇后。③ 旅行商问题。';
        } else if (name.includes('生产者')) {
            core = '生产者-消费者用队列解耦生产与消费速度不一致的问题。';
            derive = '生产者把数据放入缓冲区，消费者从缓冲区取出。缓冲区满时生产者等待，空时消费者等待。用锁或信号量保证互斥与同步。';
            scenarios = '异步处理、任务队列、日志收集、流式计算。';
            cases = '① 消息队列 Kafka/RabbitMQ。② 线程池任务分发。③ 日志缓冲写入磁盘。';
        } else if (name.includes('3-Sum')) {
            core = '找出数组中三个数之和为 0 的所有组合。';
            derive = '暴力法是三重循环 O(n³)。先排序，固定一个数后，用双指针在剩余区间找两数之和为其相反数，可优化到 O(n²)。';
            scenarios = '组合搜索、面试经典题、数据分析。';
            cases = '① 推荐系统中找互补三元组。② 财务对账找平衡组合。③ 算法面试题。';
        } else if (name.includes('最近点对')) {
            core = '在平面上找距离最近的一对点。';
            derive = '分治法：按 x 坐标分成左右两半递归求最近距离 d，再检查中间宽度为 2d 的带状区域内按 y 排序的点，只需与接下来最多 6 个点比较。';
            scenarios = '计算几何、碰撞检测、聚类、GIS。';
            cases = '① 地图上找最近的两个 POI。② 粒子碰撞检测。③ 机场最近航班对。';
        } else if (name.includes('凸包')) {
            core = '凸包是包含所有点的最小凸多边形。';
            derive = 'Graham 扫描：先找最下最左点，其余点按极角排序，用栈维护凸包边界。对于新点，若导致“右转”则弹出栈顶，直到保持“左转”或共线。';
            scenarios = '计算几何、图像处理、碰撞盒、GIS。';
            cases = '① 游戏碰撞包围盒。② 地图区域边界。③ 图像轮廓简化。';
        } else if (name.includes('最远点对')) {
            core = '平面点集的最远两点一定在凸包上，可用旋转卡壳法求凸包直径。';
            derive = '先求凸包，然后用一对平行线卡住凸包，旋转过程中记录最远顶点对。利用对踵点性质，可在 O(n) 内找到最远点对。';
            scenarios = '计算几何、直径估计、碰撞检测、GIS。';
            cases = '① 城市最远距离估算。② 物体外接直径。③ 地图范围评估。';
        } else if (name.includes('高斯')) {
            core = '高斯消元用行变换把线性方程组化成上三角矩阵，再回代求解。';
            derive = '通过交换行、倍乘行、行加减，把系数矩阵变成主对角线下方全为 0 的形式。然后从最后一行开始，依次求出每个未知数的值。';
            scenarios = '科学计算、工程仿真、计算机图形学、机器学习。';
            cases = '① 电路网络分析。② 3D 变换矩阵求解。③ 线性回归解析解。';
        } else if (id === 'math.linReg') {
            // 已有完整描述，会被跳过；这里留空占位
        } else {
            core = '通过数学推导或搜索策略求解经典问题。';
            derive = '分析问题的子结构或约束条件，用递归、回溯、动态规划或数学方法逐步化简，直到得到答案。';
            scenarios = '算法入门、面试训练、数学建模、逻辑推理。';
            cases = '① 经典算法题。② 教学演示。③ 小规模实际决策。';
        }
    }

    if (!core) {
        core = '该算法用于解决特定计算问题，通过合理的步骤把输入转化为输出。';
        derive = '从问题的约束和目标出发，设计状态/结构/策略，逐步缩小问题规模或消除不确定性，最终得到结果。';
        scenarios = '数据处理、算法教学、工程系统中的子模块。';
        cases = '① 算法学习与实践。② 作为更大系统的一部分。③ 面试与竞赛训练。';
    }

    return D('核心思想', core) + D('推导过程', derive) + D('适用场景', scenarios) + D('典型案例', cases);
}

// ========== patch files ==========
const list = JSON.parse(fs.readFileSync(path.join(__dirname, 'algos.json'), 'utf8'));
const files = {};

// discover which file each id lives in by scanning js/algorithms
const algoDir = path.join(__dirname, '..', 'js', 'algorithms');
const jsFiles = fs.readdirSync(algoDir).filter(f => f.endsWith('.js'));
for (const f of jsFiles) {
    const fp = path.join(algoDir, f);
    const code = fs.readFileSync(fp, 'utf8');
    for (const a of list) {
        if (code.includes(`id: '${a.id}'`) || code.includes(`id:"${a.id}"`)) {
            files[a.id] = fp;
        }
    }
}

let patched = 0, skipped = 0, missing = 0;
for (const a of list) {
    const fp = files[a.id];
    if (!fp) { missing++; console.log('MISSING FILE', a.id); continue; }
    let code = fs.readFileSync(fp, 'utf8');

    // find the registration object that contains this id
    const idLit = `id: '${a.id}'`;
    const idx = code.indexOf(idLit);
    if (idx === -1) { missing++; console.log('MISSING ID', a.id); continue; }

    // extract object literal roughly: search for "description:" after id, and "code:" or "run:" after description
    const afterId = code.slice(idx);
    const descMatch = afterId.match(/description\s*:\s*([\s\S]*?)(?=,\s*(?:code|run|defaultData|keywords|complexity|dataParser|parseData)\s*:)/);
    if (!descMatch) { missing++; console.log('MISSING DESC', a.id); continue; }
    const currentDesc = descMatch[1].trim();
    if (hasAllSections(currentDesc)) { skipped++; continue; }

    const newDesc = makeDesc(a.id, a.name, a.category);
    if (!newDesc) { skipped++; continue; }

    // replace only within this object's description
    // 用反引号包裹，避免内容中的引号冲突；不补逗号，因为正则 lookahead 保留了原逗号
    const replacement = `description: \`${newDesc}\``;
    // ensure we replace the correct occurrence by matching from idx
    const segment = code.slice(idx);
    const replacedSegment = segment.replace(/description\s*:\s*([\s\S]*?)(?=,\s*(?:code|run|defaultData|keywords|complexity|dataParser|parseData)\s*:)/, replacement);
    if (replacedSegment === segment) { missing++; continue; }
    code = code.slice(0, idx) + replacedSegment;
    fs.writeFileSync(fp, code);
    patched++;
}

console.log(`patched=${patched}, skipped=${skipped}, missing=${missing}`);
