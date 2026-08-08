/**
 * CodeViewer - 代码显示与行高亮
 */
(function (global) {
    'use strict';

    class CodeViewer {
        constructor(rootEl) {
            this.root = rootEl;
            this.codeEl = document.getElementById('codeContent');
            this.lines = [];
            this.currentLine = -1;
        }

        setCode(code) {
            this.lines = (code || '').split('\n');
            const html = this.lines.map((line, i) => {
                const highlighted = CodeRegistry.highlight(line);
                return `<span class="code-line" data-line="${i + 1}">${highlighted || '&nbsp;'}</span>`;
            }).join('');
            this.codeEl.innerHTML = html;
            this.currentLine = -1;
        }

        highlightLine(lineNum) {
            // 移除旧高亮
            const old = this.codeEl.querySelector('.code-line.highlight');
            if (old) old.classList.remove('highlight');
            if (lineNum === null || lineNum === undefined || lineNum < 1) {
                this.currentLine = -1;
                return;
            }
            const target = this.codeEl.querySelector(`.code-line[data-line="${lineNum}"]`);
            if (target) {
                target.classList.add('highlight');
                this.currentLine = lineNum;
                // 滚动到可视区
                const container = this.root;
                const rect = target.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                if (rect.top < containerRect.top + 20 || rect.bottom > containerRect.bottom - 20) {
                    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            }
        }

        clearHighlight() { this.highlightLine(null); }

        showTab(tab) {
            const codeViewer = document.getElementById('codeViewer');
            const descViewer = document.getElementById('descViewer');
            if (tab === 'desc') {
                codeViewer.style.display = 'none';
                descViewer.style.display = 'block';
            } else {
                codeViewer.style.display = 'block';
                descViewer.style.display = 'none';
            }
        }

        setDescription(html) {
            document.getElementById('descViewer').innerHTML = html;
        }
    }

    global.CodeViewer = CodeViewer;
})(window);
