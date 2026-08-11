'use strict';
const { createSandbox, loadScripts } = require('./sandbox.js');

const { sandbox, context } = createSandbox();
if (sandbox.document && sandbox.document.documentElement) {
    sandbox.document.documentElement.getAttribute = (name) => name === 'data-theme' ? 'light' : null;
}
const base = ['core/store.js','core/renderer.js','core/layoutEngine.js','core/tracer.js','core/animator.js','core/codeRegistry.js','core/algorithmLoader.js','core/stateBuilders.js','ui/codeViewer.js','ui/sidebar.js','ui/controls.js','ui/themeSwitcher.js','ui/toast.js','ui/shortcut.js','algorithms/sorting.js','algorithms/linear.js','algorithms/tree.js','algorithms/graph.js','algorithms/string_classic.js','algorithms/p1_algorithms.js','algorithms/p2_algorithms.js','algorithms/p3_algorithms.js','algorithms/advanced_algorithms.js'];
for (const r of base) loadScripts(context, r);
for (const r of ['algorithms/algs4_batch1.js','algorithms/algs4_batch2.js','algorithms/algs4_batch3.js','algorithms/algs4_batch4.js','algorithms/algs4_batch5.js','algorithms/index.js']) {
    loadScripts(context, r);
}

const list = sandbox.AlgorithmLoader.list();
console.log(JSON.stringify(list.map(a => ({ id: a.id, name: a.name, category: a.category, level: a.level, file: a._file || '' })), null, 2));
console.log('count=', list.length);
