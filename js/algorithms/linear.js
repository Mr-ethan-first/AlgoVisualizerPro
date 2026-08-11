/**
 * 线性结构 P0 算法
 * 包含：动态数组追加、动态数组插入删除、单向链表插入删除、单向链表遍历、栈 push/pop、队列 入队/出队
 */
(function () {
    'use strict';

    const NUM_DATA = (s) => s.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n));

    // ===== 动态数组 - 追加（含扩容） =====
    const appendCode = `class DynamicArray {
  constructor(cap = 4) {
    this.data = new Array(cap);
    this.size = 0;
    this.cap = cap;
  }
  append(x) {
    if (this.size === this.cap) {
      this._expand();
    }
    this.data[this.size++] = x;
  }
  _expand() {
    const old = this.data;
    this.cap *= 2;
    this.data = new Array(this.cap);
    for (let i = 0; i < this.size; i++) {
      this.data[i] = old[i];
    }
  }
}`;
    function appendRun(ctx, data) {
        const arr = ctx.add(new ArrayTracer('array', []));
        const log = ctx.add(new LogTracer('log'));
        const values = data.length ? data : [10, 20, 30, 40, 50, 60];
        let cap = 4;
        // 显示容量信息（占位符：_ 表示空槽位）
        arr.setItems(['_', '', '', '']);
        arr._commit({ type: 'init', payload: { cap }, description: `初始化容量 = ${cap}` });
        let size = 0;
        for (const x of values) {
            ctx.line(7);
            log.printInfo(`append(${x})`);
            if (size === cap) {
                ctx.line(8);
                log.printWarning(`容量已满 (size=${size}, cap=${cap})，触发扩容`);
                // 标记扩容前的数组
                for (let i = 0; i < cap; i++) arr.items[i].state = 'swap';
                arr._commit({ type: 'snapshot', payload: {}, description: '准备扩容，复制元素到新数组' });
                for (let i = 0; i < cap; i++) arr.items[i].state = 'default';
                ctx.line(13);
                const oldCap = cap;
                cap *= 2;
                // 扩容
                const newData = [];
                for (let i = 0; i < size; i++) {
                    newData.push({ value: arr.items[i].value, state: 'visited' });
                }
                for (let i = size; i < cap; i++) newData.push({ value: '', state: 'default' });
                arr.items = newData;
                arr._commit({ type: 'snapshot', payload: { cap }, description: `新数组容量 = ${cap}，复制 ${size} 个元素` });
                for (let i = 0; i < size; i++) arr.items[i].state = 'default';
                log.printSuccess(`扩容完成: ${oldCap} → ${cap}`);
            }
            ctx.line(10);
            arr.items[size] = { value: x, state: 'current' };
            arr.setPointer(size, 'size');
            arr._commit({
                type: 'set',
                payload: { index: size, value: x },
                description: `data[${size}] = ${x}（size=${size+1}）`
            });
            arr.items[size].state = 'sorted';
            size++;
        }
        log.printSuccess(`追加完成，最终 size=${size}, cap=${cap}`);
    }

    // ===== 动态数组 - 插入/删除 =====
    const insertDeleteCode = `function insert(arr, idx, x) {
  for (let i = arr.size; i > idx; i--) {
    arr[i] = arr[i - 1];
  }
  arr[idx] = x;
  arr.size++;
}
function remove(arr, idx) {
  for (let i = idx; i < arr.size - 1; i++) {
    arr[i] = arr[i + 1];
  }
  arr.size--;
}`;
    function insertDeleteRun(ctx, data) {
        const init = (data && data.length >= 4) ? data.slice(0, 5) : [10, 20, 30, 40, 50];
        const arr = ctx.add(new ArrayTracer('array', init));
        const log = ctx.add(new LogTracer('log'));

        // 演示插入
        ctx.line(1);
        const insertIdx = 2;
        const insertVal = 25;
        log.printInfo(`插入 ${insertVal} 于位置 ${insertIdx}`);
        for (let i = init.length; i > insertIdx; i--) {
            ctx.line(2);
            arr.setPointer(i - 1, 'i');
            const v = arr.items[i - 1].value;
            arr.items[i] = { value: v, state: 'swap' };
            arr._commit({
                type: 'set',
                payload: { index: i, value: v },
                description: `arr[${i}] = arr[${i-1}] = ${v}（右移）`
            });
            arr.items[i].state = 'default';
        }
        ctx.line(4);
        arr.items[insertIdx] = { value: insertVal, state: 'current' };
        arr._commit({
            type: 'set',
            payload: { index: insertIdx, value: insertVal },
            description: `arr[${insertIdx}] = ${insertVal}（插入）`
        });
        arr.items[insertIdx].state = 'sorted';
        log.printSuccess('插入完成');

        // 演示删除
        const delIdx = 3;
        ctx.line(8);
        log.printWarning(`删除位置 ${delIdx} 的元素 (值=${arr.items[delIdx].value})`);
        arr.highlight(delIdx, 'compare', `del`);
        for (let i = delIdx; i < arr.items.length - 1; i++) {
            ctx.line(9);
            const v = arr.items[i + 1].value;
            arr.items[i] = { value: v, state: 'swap' };
            arr._commit({
                type: 'set',
                payload: { index: i, value: v },
                description: `arr[${i}] = arr[${i+1}] = ${v}（左移）`
            });
            arr.items[i].state = 'default';
        }
        arr.items[arr.items.length - 1] = { value: '', state: 'default' };
        arr._commit({ type: 'snapshot', payload: {}, description: '末尾元素已清除' });
        log.printSuccess('删除完成');
    }

    // ===== 单向链表 - 插入/删除 =====
    const listInsDelCode = `class Node {
  constructor(v) { this.val = v; this.next = null; }
}
function insert(head, idx, x) {
  if (idx === 0) {
    const n = new Node(x);
    n.next = head;
    return n;
  }
  let cur = head;
  for (let i = 0; i < idx - 1; i++) cur = cur.next;
  const node = new Node(x);
  node.next = cur.next;
  cur.next = node;
}
function remove(head, idx) {
  if (idx === 0) return head.next;
  let cur = head;
  for (let i = 0; i < idx - 1; i++) cur = cur.next;
  cur.next = cur.next.next;
}`;
    function listInsDelRun(ctx, data) {
        const init = (data && data.length >= 4) ? data.slice(0, 5) : [10, 20, 30, 40];
        const list = ctx.add(new LinkedListTracer('linkedlist', init));
        const log = ctx.add(new LogTracer('log'));

        // 插入到中间
        ctx.line(8);
        const insIdx = 2, insVal = 25;
        log.printInfo(`在位置 ${insIdx} 插入 ${insVal}`);
        // 先遍历到前驱
        for (let i = 0; i < insIdx; i++) {
            ctx.line(10);
            list.visit(i, `遍历到位置 ${i}`);
        }
        ctx.line(11);
        list.insert(insIdx, insVal, `创建新节点 ${insVal}，链接 next 指针`);
        log.printSuccess(`插入完成：链表现在为 ${list.nodes.map(n => n.value).join(' → ')}`);

        // 删除一个节点
        const delIdx = 3;
        ctx.line(15);
        log.printWarning(`删除位置 ${delIdx} 的节点`);
        for (let i = 0; i < delIdx - 1; i++) {
            ctx.line(17);
            list.visit(i, `遍历到前驱位置 ${i}`);
        }
        ctx.line(18);
        list.remove(delIdx, `断开 next 指针，跳过被删节点`);
        log.printSuccess('删除完成');
    }

    // ===== 单向链表 - 查找/遍历 =====
    const listTravelCode = `function traverse(head) {
  let cur = head;
  while (cur !== null) {
    visit(cur.val);
    cur = cur.next;
  }
}
function find(head, target) {
  let cur = head, idx = 0;
  while (cur !== null) {
    if (cur.val === target) return idx;
    cur = cur.next;
    idx++;
  }
  return -1;
}`;
    function listTravelRun(ctx, data) {
        const init = data.length ? data.slice(0, 6) : [10, 20, 30, 40, 50, 60];
        const list = ctx.add(new LinkedListTracer('linkedlist', init));
        const log = ctx.add(new LogTracer('log'));
        const target = init[Math.floor(init.length / 2)];
        log.printInfo(`查找目标值 ${target}`);
        ctx.line(8);
        let cur = 0, idx = 0;
        while (cur < list.nodes.length) {
            ctx.line(9);
            list.visit(cur, `访问节点 ${list.nodes[cur].value}`);
            if (list.nodes[cur].value === target) {
                ctx.line(10);
                log.printSuccess(`找到目标 ${target} 于位置 ${idx}`);
                list.nodes[cur].state = 'sorted';
                list._commit({ type: 'mark', payload: { node: cur }, description: `找到目标 ${target}` });
                return;
            }
            cur++;
            idx++;
            ctx.line(11);
        }
        log.printWarning(`未找到目标 ${target}`);
    }

    // ===== 栈 push/pop =====
    const stackCode = `class Stack {
  constructor() { this.data = []; }
  push(x) { this.data.push(x); }
  pop() { return this.data.pop(); }
  peek() { return this.data[this.data.length - 1]; }
  isEmpty() { return this.data.length === 0; }
}`;
    function stackRun(ctx, data) {
        const stk = ctx.add(new StackTracer('stack'));
        const log = ctx.add(new LogTracer('log'));
        const ops = [10, 20, 30, 40, 50];
        // push 序列
        for (const x of ops) {
            ctx.line(3);
            stk.push(x);
            log.printInfo(`push(${x})`);
        }
        ctx.line(4);
        log.printInfo('peek() → ' + stk.items[stk.items.length - 1].value);
        stk.peek();
        // pop 两次
        ctx.line(4);
        stk.pop();
        log.printInfo('pop()');
        stk.pop();
        log.printInfo('pop()');
        ctx.line(4);
        log.printSuccess('栈操作演示完成');
    }

    // ===== 队列 入队/出队 =====
    const queueCode = `class Queue {
  constructor() { this.data = []; }
  enqueue(x) { this.data.push(x); }
  dequeue() { return this.data.shift(); }
  front() { return this.data[0]; }
  isEmpty() { return this.data.length === 0; }
}`;
    function queueRun(ctx, data) {
        const q = ctx.add(new QueueTracer('queue'));
        const log = ctx.add(new LogTracer('log'));
        ctx.line(2);
        for (const x of [10, 20, 30, 40]) {
            ctx.line(3);
            q.enqueue(x);
            log.printInfo(`enqueue(${x})`);
        }
        ctx.line(4);
        log.printInfo('front() → ' + q.items[0].value);
        ctx.line(4);
        q.dequeue();
        log.printInfo('dequeue() → 出队');
        q.dequeue();
        log.printInfo('dequeue() → 出队');
        log.printSuccess('队列操作演示完成');
    }

    // ===== 注册 =====
    const algos = [
        {
            id: 'linear.arrayAppend',
            name: '动态数组 - 追加（扩容）', category: 'linear', level: 'P0',
            complexity: { time: '均摊 O(1)', space: 'O(n)' },
            keywords: ['dynamic array', 'append', 'expand'],
            mnemonic: '满则倍增扩容，尾部追加均摊一',
            description: `<div class="desc-section"><h3>核心思想</h3><p>动态数组用一段连续内存存储元素，支持随机访问；容量不足时申请更大空间并搬移数据。</p></div><div class="desc-section"><h3>推导过程</h3><p>追加元素时，若 size < capacity 直接放入；否则扩容（通常 1.5~2 倍），把旧数据 copy 过去，再插入。均摊时间 O(1)。插入/删除中间元素需要搬移后续元素，时间 O(n)。</p></div><div class="desc-section"><h3>适用场景</h3><p>需要随机访问、动态增删尾部元素的集合。</p></div><div class="desc-section"><h3>典型案例</h3><p>① Python/Java 的 ArrayList/Vector。② 实现栈和队列的底层。③ 缓冲区。</p></div>`,
            code: appendCode,
            defaultData: [],
            dataParser: NUM_DATA,
            run: appendRun
        },
        {
            id: 'linear.arrayInsert',
            name: '动态数组 - 插入/删除', category: 'linear', level: 'P0',
            complexity: { time: 'O(n)', space: 'O(1)' },
            keywords: ['insert', 'remove', 'shift'],
            mnemonic: '中间插入先腾位，后移元素再落座',
            description: `<div class="desc-section"><h3>核心思想</h3><p>动态数组用一段连续内存存储元素，支持随机访问；容量不足时申请更大空间并搬移数据。</p></div><div class="desc-section"><h3>推导过程</h3><p>追加元素时，若 size < capacity 直接放入；否则扩容（通常 1.5~2 倍），把旧数据 copy 过去，再插入。均摊时间 O(1)。插入/删除中间元素需要搬移后续元素，时间 O(n)。</p></div><div class="desc-section"><h3>适用场景</h3><p>需要随机访问、动态增删尾部元素的集合。</p></div><div class="desc-section"><h3>典型案例</h3><p>① Python/Java 的 ArrayList/Vector。② 实现栈和队列的底层。③ 缓冲区。</p></div>`,
            code: insertDeleteCode,
            defaultData: [],
            dataParser: NUM_DATA,
            run: insertDeleteRun
        },
        {
            id: 'linear.listInsert',
            name: '单向链表 - 插入/删除', category: 'linear', level: 'P0',
            complexity: { time: 'O(n)', space: 'O(1)' },
            keywords: ['linked list', 'insert', 'remove'],
            mnemonic: '改指即插删，遍历找位先',
            description: `<div class="desc-section"><h3>核心思想</h3><p>链表用节点保存数据和 next 指针，通过指针连接形成线性序列，插入删除只需改指针。</p></div><div class="desc-section"><h3>推导过程</h3><p>每个节点记录 value 和 next。要插入新节点，先找到前驱，让新节点指向原后继，再让前驱指向新节点。删除则是让前驱跳过目标节点。</p></div><div class="desc-section"><h3>适用场景</h3><p>频繁插入删除、不需要随机访问、需要动态增长的场景。</p></div><div class="desc-section"><h3>典型案例</h3><p>① LRU 缓存。② 实现队列、栈。③ 多项式表示。</p></div>`,
            code: listInsDelCode,
            defaultData: [],
            dataParser: NUM_DATA,
            run: listInsDelRun
        },
        {
            id: 'linear.listTravel',
            name: '单向链表 - 查找/遍历', category: 'linear', level: 'P0',
            complexity: { time: 'O(n)', space: 'O(1)' },
            keywords: ['linked list', 'find', 'traverse'],
            mnemonic: '从头顺次走，遇空即终止',
            description: `<div class="desc-section"><h3>核心思想</h3><p>链表用节点保存数据和 next 指针，通过指针连接形成线性序列，插入删除只需改指针。</p></div><div class="desc-section"><h3>推导过程</h3><p>每个节点记录 value 和 next。要插入新节点，先找到前驱，让新节点指向原后继，再让前驱指向新节点。删除则是让前驱跳过目标节点。</p></div><div class="desc-section"><h3>适用场景</h3><p>频繁插入删除、不需要随机访问、需要动态增长的场景。</p></div><div class="desc-section"><h3>典型案例</h3><p>① LRU 缓存。② 实现队列、栈。③ 多项式表示。</p></div>`,
            code: listTravelCode,
            defaultData: [],
            dataParser: NUM_DATA,
            run: listTravelRun
        },
        {
            id: 'linear.stack',
            name: '栈 - push/pop', category: 'linear', level: 'P0',
            complexity: { time: 'O(1)', space: 'O(n)' },
            keywords: ['stack', 'push', 'pop', 'LIFO'],
            mnemonic: '后进先出栈顶忙，入出均一记得牢',
            description: `<div class="desc-section"><h3>核心思想</h3><p>栈是一种“后进先出”的线性结构，只能在栈顶 push 和 pop。</p></div><div class="desc-section"><h3>推导过程</h3><p>用数组或链表维护一个 top 指针。push 时 top 加 1 并放入元素；pop 时取出 top 位置元素并减 1。最后进入的最先被取出。</p></div><div class="desc-section"><h3>适用场景</h3><p>函数调用、表达式求值、撤销操作、括号匹配。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 浏览器前进/后退。② 编译器表达式求值。③ 括号匹配检查。</p></div>`,
            code: stackCode,
            defaultData: [],
            dataParser: NUM_DATA,
            run: stackRun
        },
        {
            id: 'linear.queue',
            name: '队列 - 入队/出队', category: 'linear', level: 'P0',
            complexity: { time: 'O(1)', space: 'O(n)' },
            keywords: ['queue', 'enqueue', 'dequeue', 'FIFO'],
            mnemonic: '先进先出排尾首，入出均一无等待',
            description: `<div class="desc-section"><h3>核心思想</h3><p>队列是“先进先出”的结构，队尾入队、队首出队；双端队列两端都可操作。</p></div><div class="desc-section"><h3>推导过程</h3><p>用数组循环队列或双向链表维护 head 和 tail。入队移动 tail，出队移动 head。循环队列用取模复用被释放的空间。</p></div><div class="desc-section"><h3>适用场景</h3><p>任务调度、BFS、缓存、流水线缓冲。</p></div><div class="desc-section"><h3>典型案例</h3><p>① 打印机任务队列。② BFS 图遍历。③ 消息队列。</p></div>`,
            code: queueCode,
            defaultData: [],
            dataParser: NUM_DATA,
            run: queueRun
        }
    ];

    algos.forEach(a => AlgorithmLoader.register(a.id, a));
})();
