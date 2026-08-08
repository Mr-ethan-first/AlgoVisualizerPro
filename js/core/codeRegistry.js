/**
 * CodeRegistry - 算法源代码注册表
 *
 * 每个算法的源代码以字符串形式存储，提供简单的语法高亮（纯 JS 实现）。
 * 行号与算法步骤中的 codeLine 字段对应，用于高亮联动。
 */
(function (global) {
    'use strict';

    // JavaScript 关键字
    const KEYWORDS = new Set([
        'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch',
        'case', 'break', 'continue', 'const', 'let', 'var', 'class', 'new',
        'this', 'true', 'false', 'null', 'undefined', 'typeof', 'instanceof',
        'in', 'of', 'try', 'catch', 'finally', 'throw', 'await', 'async',
        'yield', 'delete', 'void', 'with', 'export', 'import', 'default'
    ]);

    const CodeRegistry = {
        /**
         * 简易 JS 语法高亮（输出 HTML，带 token class）
         */
        highlight(code) {
            if (!code) return '';
            const lines = code.split('\n');
            return lines.map(line => this._highlightLine(line)).join('\n');
        },

        _highlightLine(line) {
            // 用占位符避免后续替换破坏已生成标签
            const tokens = [];
            const placeholder = (html) => {
                const i = tokens.length;
                tokens.push(html);
                return `\x00${i}\x00`;
            };

            let s = line;
            // 1. 注释
            s = s.replace(/(\/\/.*$)/g, m => placeholder(`<span class="tok-com">${this._esc(m)}</span>`));
            // 2. 字符串
            s = s.replace(/(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
                m => placeholder(`<span class="tok-str">${this._esc(m)}</span>`));
            // 3. 数字
            s = s.replace(/\b(\d+(?:\.\d+)?)\b/g, m => placeholder(`<span class="tok-num">${this._esc(m)}</span>`));
            // 4. 函数调用
            s = s.replace(/\b([a-zA-Z_$][\w$]*)(\s*\()/g, (m, name) => {
                if (KEYWORDS.has(name)) return m;
                return placeholder(`<span class="tok-fn">${this._esc(name)}</span>`) + m.slice(name.length);
            });
            // 5. 关键字
            s = s.replace(/\b([a-zA-Z_$][\w$]*)\b/g, (m, name) => {
                if (KEYWORDS.has(name)) return placeholder(`<span class="tok-kw">${this._esc(name)}</span>`);
                return m;
            });
            // 6. 运算符
            s = s.replace(/([+\-*/%=<>!&|^~?:]+)/g, m => placeholder(`<span class="tok-op">${this._esc(m)}</span>`));

            // 还原占位符 - 先转义剩余文本
            s = this._esc(s);
            s = s.replace(/\x00(\d+)\x00/g, (_, i) => tokens[parseInt(i, 10)]);

            return s;
        },

        _esc(s) {
            return String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }
    };

    global.CodeRegistry = CodeRegistry;
})(window);
