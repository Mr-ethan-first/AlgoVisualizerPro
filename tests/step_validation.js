/**
 * AlgoLens 步骤合法性校验 + 边界输入测试 - Node.js
 *
 * 在 run_tests.js 基础验证之上，补充：
 *   1. 步骤类型（type）必须属于已知枚举
 *   2. 步骤 codeLine 必须在算法代码行数范围内（1..N）
 *   3. 每个步骤必须带非空 description（教学文案完整性）
 *   4. highlight 结构合法性（target/type/color 字段）
 *   5. 边界输入：空数据 / 最小规模数据运行不抛异常
 *
 * 运行方式：node tests/step_validation.js
 */
const { createSandbox, loadAllScripts } = require('./sandbox.js');

const { sandbox, context } = createSandbox();
loadAllScripts(context);

const AlgorithmLoader = sandbox.AlgorithmLoader;
const allAlgos = AlgorithmLoader.list();

// 已知步骤类型枚举（与设计文档 StepType 一致）
const KNOWN_TYPES = new Set([
    'init', 'snapshot', 'compare', 'swap', 'set', 'highlight', 'visit', 'leave',
    'mark', 'relax', 'backtrack', 'log', 'push', 'pop',
    'enqueue', 'dequeue', 'rotate', 'colorChange', 'merge',
    'partition', 'done'
]);

// 已知 highlight 类型
const KNOWN_HL_TYPES = new Set(['node', 'edge', 'cell', 'range']);

console.log('=== AlgoLens 步骤合法性校验 ===\n');

const issues = [];
let totalSteps = 0;

for (const algo of allAlgos) {
    const id = algo.id;
    let out;
    try {
        out = AlgorithmLoader.runAlgorithm(id, algo.defaultData);
    } catch (e) {
        issues.push(`[${id}] 运行失败: ${e.message}`);
        continue;
    }
    const steps = out.steps || [];
    totalSteps += steps.length;

    // 代码行数（仅当注册了 code 时校验）
    let codeLines = 0;
    if (algo.code) {
        codeLines = String(algo.code).split('\n').length;
    }

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const where = `[${id}] step#${i + 1} (${step.type || '(无type)'})`;

        // 1. 步骤类型枚举
        if (!step.type) {
            issues.push(`${where}: 缺少 type`);
        } else if (!KNOWN_TYPES.has(step.type)) {
            issues.push(`${where}: 未知步骤类型 "${step.type}"`);
        }

        // 2. codeLine 范围
        if (step.codeLine !== undefined && step.codeLine !== null) {
            if (codeLines > 0 && (step.codeLine < 1 || step.codeLine > codeLines)) {
                issues.push(`${where}: codeLine=${step.codeLine} 超出代码行数 ${codeLines}`);
            }
        }

        // 3. description 非空
        if (step.description === undefined || step.description === null || String(step.description).trim() === '') {
            issues.push(`${where}: description 为空`);
        }

        // 4. highlight 结构
        if (Array.isArray(step.highlight)) {
            for (const hl of step.highlight) {
                if (!KNOWN_HL_TYPES.has(hl.type)) {
                    issues.push(`${where}: highlight.type="${hl.type}" 未知`);
                }
                if (hl.target === undefined || hl.target === null) {
                    issues.push(`${where}: highlight 缺少 target`);
                }
                if (!hl.color) {
                    issues.push(`${where}: highlight 缺少 color`);
                }
            }
        }
    }
}

console.log(`已检查 ${allAlgos.length} 个算法，共 ${totalSteps} 个步骤\n`);

// ===== 边界输入测试 =====
console.log('=== 边界输入测试（空数据 / 单元素 / 重复元素） ===\n');
const edgeCases = [
    { label: '空数组', data: [] },
    { label: '单元素', data: [1] },
    { label: '重复元素', data: [5, 5, 5, 5] }
];
let edgeFail = 0;
let edgePass = 0;

for (const algo of allAlgos) {
    // 仅对接受数据输入的算法做边界测试（存在 dataParser 或 defaultData）
    if (!algo.dataParser && !algo.defaultData) continue;
    for (const ec of edgeCases) {
        try {
            const out = AlgorithmLoader.runAlgorithm(algo.id, ec.data.slice());
            if (!out.steps || out.steps.length === 0) {
                issues.push(`[${algo.id}] 边界输入(${ec.label}): 无步骤生成`);
                edgeFail++;
            } else {
                edgePass++;
            }
        } catch (e) {
            issues.push(`[${algo.id}] 边界输入(${ec.label}) 抛异常: ${e.message}`);
            edgeFail++;
        }
    }
}
console.log(`边界输入通过: ${edgePass} 组，失败: ${edgeFail} 组\n`);

// ===== 输出 =====
if (issues.length === 0) {
    console.log('=== 全部校验通过 ===');
    process.exit(0);
} else {
    console.log(`=== 发现 ${issues.length} 个问题 ===\n`);
    // 按算法分组去重输出（每类问题最多显示前 5 条）
    const shown = new Set();
    let shownCount = 0;
    for (const msg of issues) {
        const key = msg.split(':')[0];
        if (shown.has(key) || shownCount >= 60) continue;
        shown.add(key);
        shownCount++;
        console.log('  - ' + msg);
    }
    if (issues.length > shownCount) {
        console.log(`  ... 其余 ${issues.length - shownCount} 条问题略（按算法去重）`);
    }
    process.exit(1);
}
