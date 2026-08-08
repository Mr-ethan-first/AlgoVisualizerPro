/**
 * AlgoLens 测试沙箱 - 共享模块
 *
 * 在 Node.js 中模拟浏览器全局对象（canvas/document/window），
 * 供 run_tests.js 与 step_validation.js 复用，避免重复维护。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ===== 模拟浏览器全局对象 =====
const canvasCtx = {
    clearRect() {}, save() {}, restore() {},
    fillRect() {}, strokeRect() {}, beginPath() {}, closePath() {},
    moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {},
    set fillStyle(v) {}, get fillStyle() { return ''; },
    set strokeStyle(v) {}, get strokeStyle() { return ''; },
    set lineWidth(v) {}, get lineWidth() { return 1; },
    set font(v) {}, get font() { return '14px sans-serif'; },
    set textAlign(v) {}, get textAlign() { return 'left'; },
    set textBaseline(v) {}, get textBaseline() { return 'top'; },
    fillText() {}, strokeText() {}, measureText() { return { width: 10 }; },
    setLineDash() {}, translate() {}, rotate() {}, scale() {},
    drawImage() {}, getImageData() { return { data: new Uint8Array(4) }; },
    putImageData() {}, createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; }
};
const mockCanvas = {
    width: 800, height: 400,
    getContext: () => canvasCtx,
    addEventListener() {}, removeEventListener() {},
    getBoundingClientRect() { return { width: 800, height: 400, left: 0, top: 0 }; }
};
const mockElement = {
    innerHTML: '', textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {}, removeChild() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute() { return null; },
    getContext: () => canvasCtx,
    getBoundingClientRect() { return { width: 800, height: 400, left: 0, top: 0 }; }
};
const mockDocument = {
    getElementById() { return mockElement; },
    querySelector() { return mockElement; },
    querySelectorAll() { return []; },
    createElement() { return mockElement; },
    addEventListener() {}, removeEventListener() {},
    documentElement: { style: {}, setAttribute() {}, classList: { add() {}, remove() {}, toggle() {} } },
    body: mockElement,
    head: mockElement,
    readyState: 'complete'
};

/**
 * 创建独立 VM 沙箱（每次调用返回全新的 context）
 */
function createSandbox() {
    const sandbox = {
        window: {},
        global: {},
        document: mockDocument,
        console,
        setTimeout, clearTimeout, setInterval, clearInterval,
        Date, Math, JSON, Array, Object, String, Number, Boolean, Map, Set,
        Infinity, NaN, parseInt, parseFloat, isNaN, isFinite,
        Promise, Symbol, Uint8Array,
        navigator: { userAgent: 'node' },
        location: { origin: 'http://localhost', pathname: '/' },
        app: { renderer: { width: 800, height: 400 } }
    };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    // 一些算法会用到 window.app?.renderer
    sandbox.window.app = sandbox.app;
    const context = vm.createContext(sandbox);
    return { sandbox, context };
}

const SCRIPT_DIR = path.resolve(__dirname, '..', 'js');
const SCRIPTS = [
    'core/store.js',
    'core/renderer.js',
    'core/layoutEngine.js',
    'core/tracer.js',
    'core/animator.js',
    'core/codeRegistry.js',
    'core/algorithmLoader.js',
    'core/stateBuilders.js',
    'ui/codeViewer.js',
    'ui/sidebar.js',
    'ui/controls.js',
    'ui/themeSwitcher.js',
    'ui/toast.js',
    'ui/shortcut.js',
    'algorithms/sorting.js',
    'algorithms/linear.js',
    'algorithms/tree.js',
    'algorithms/graph.js',
    'algorithms/string_classic.js',
    'algorithms/p1_algorithms.js',
    'algorithms/p2_algorithms.js',
    'algorithms/p3_algorithms.js',
    'algorithms/advanced_algorithms.js'
];

/**
 * 加载单个脚本到指定 context
 */
function loadScripts(context, relPath) {
    const filePath = path.join(SCRIPT_DIR, relPath);
    const code = fs.readFileSync(filePath, 'utf8');
    vm.runInContext(code, context, { filename: relPath });
}

/**
 * 便捷：一次性加载全部脚本
 */
function loadAllScripts(context) {
    for (const rel of SCRIPTS) loadScripts(context, rel);
}

module.exports = { createSandbox, loadScripts, loadAllScripts, SCRIPT_DIR, SCRIPTS };
