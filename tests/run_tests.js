/**
 * AlgoLens 自动化测试 - Node.js
 *
 * 在 Node.js 环境中加载所有算法并逐一运行，验证：
 *   - 算法注册成功
 *   - 算法执行不抛异常
 *   - 生成至少 1 个步骤
 *   - 状态构建器（buildState 或默认）可生成渲染状态
 *
 * 运行方式：node tests/run_tests.js
 */
const { createSandbox, loadScripts, SCRIPTS } = require('./sandbox.js');

// ===== 1. 创建沙箱环境：模拟浏览器全局对象 =====
const { sandbox, context } = createSandbox();

// ===== 2. 加载脚本文件 =====
function loadScript(relPath) {
    loadScripts(context, relPath);
}

console.log('=== AlgoLens 算法自动化测试 ===\n');
console.log('[1/4] 加载脚本...');
for (const s of SCRIPTS) {
    try {
        loadScript(s);
    } catch (e) {
        console.error(`  ✗ 加载失败: ${s} - ${e.message}`);
        process.exit(1);
    }
}
console.log(`  ✓ 已加载 ${SCRIPTS.length} 个脚本文件`);

// ===== 3. 收集所有已注册算法 =====
const AlgorithmLoader = sandbox.AlgorithmLoader;
const allAlgos = AlgorithmLoader.list();
console.log(`[2/4] 已注册算法: ${allAlgos.length} 个`);

// 按层级分组统计
const byLevel = {};
const byCategory = {};
for (const a of allAlgos) {
    byLevel[a.level] = (byLevel[a.level] || 0) + 1;
    byCategory[a.category] = (byCategory[a.category] || 0) + 1;
}
console.log('  层级分布:', JSON.stringify(byLevel));
console.log('  分类分布:', JSON.stringify(byCategory));

// ===== 4. 运行每个算法并验证 =====
console.log(`\n[3/4] 逐个运行算法...`);
const results = { passed: [], failed: [], errors: [] };
for (const algo of allAlgos) {
    const id = algo.id;
    const data = algo.defaultData;
    const t0 = Date.now();
    try {
        const out = AlgorithmLoader.runAlgorithm(id, data);
        const stepCount = out.steps.length;
        if (stepCount === 0) {
            results.failed.push({ id, reason: `无步骤生成 (${stepCount} steps)`, duration: Date.now() - t0 });
            console.log(`  ✗ ${id.padEnd(28)} 0 步骤 - 失败`);
            continue;
        }
        // 验证每个步骤的状态可被构建
        let stateBuildOk = true;
        let stateBuildErr = null;
        const buildState = algo.buildState;
        // 模拟 animator 收集状态
        const tracerStates = {};
        for (let i = 0; i < Math.min(out.steps.length, 3); i++) {
            const step = out.steps[i];
            if (step && step.state) Object.assign(tracerStates, step.state);
        }
        // 检查最后一个步骤
        const lastStep = out.steps[out.steps.length - 1];
        const lastStates = {};
        // 累积所有步骤的状态
        for (let i = 0; i < out.steps.length; i++) {
            const step = out.steps[i];
            if (step && step.state) Object.assign(lastStates, step.state);
        }
        if (buildState) {
            try {
                buildState(lastStates, lastStep);
            } catch (e) {
                stateBuildOk = false;
                stateBuildErr = e.message;
            }
        }
        if (!stateBuildOk) {
            results.failed.push({
                id, reason: `状态构建器抛异常: ${stateBuildErr}`,
                steps: stepCount, duration: Date.now() - t0
            });
            console.log(`  ✗ ${id.padEnd(28)} ${stepCount} 步骤 - buildState 失败: ${stateBuildErr}`);
        } else {
            results.passed.push({ id, steps: stepCount, duration: Date.now() - t0 });
            console.log(`  ✓ ${id.padEnd(28)} ${String(stepCount).padStart(4)} 步骤 (${Date.now() - t0}ms)`);
        }
    } catch (e) {
        results.errors.push({ id, error: e.message, stack: e.stack });
        console.log(`  ✗ ${id.padEnd(28)} 异常: ${e.message}`);
    }
}

// ===== 5. 输出汇总 =====
console.log(`\n[4/4] 测试汇总:`);
console.log(`  通过: ${results.passed.length}/${allAlgos.length}`);
console.log(`  失败: ${results.failed.length}/${allAlgos.length}`);
console.log(`  异常: ${results.errors.length}/${allAlgos.length}`);

if (results.failed.length > 0) {
    console.log('\n--- 失败详情 ---');
    for (const f of results.failed) {
        console.log(`  ${f.id}: ${f.reason}`);
    }
}
if (results.errors.length > 0) {
    console.log('\n--- 异常详情 ---');
    for (const e of results.errors) {
        console.log(`  ${e.id}:`);
        console.log(`    ${e.error}`);
        if (e.stack) console.log(`    ${e.stack.split('\n').slice(1, 3).join('\n    ')}`);
    }
}

const exitCode = (results.failed.length + results.errors.length) > 0 ? 1 : 0;
console.log(`\n=== 测试${exitCode === 0 ? '全部通过' : '存在失败'} ===`);
process.exit(exitCode);
