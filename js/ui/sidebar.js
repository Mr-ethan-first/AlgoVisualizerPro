/**
 * Sidebar - 算法导航树
 */
(function (global) {
    'use strict';

    const CATEGORY_ICONS = {
        sorting: '<path fill="currentColor" d="M3 4h10v2H3V4Zm0 4h7v2H3V8Zm0 4h4v2H3v-2Zm12-4 4 4 4-4h-8Z"/>',
        linear: '<path fill="currentColor" d="M2 4h12v2H2V4Zm0 4h12v2H2V8Zm0 4h12v2H2v-2Z"/>',
        tree: '<path fill="currentColor" d="M8 2 4 6h2.5v3h3V6H12L8 2ZM3 11h10v3H3v-3Z"/>',
        graph: '<path fill="currentColor" d="M5 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm-3 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm-4.5-3.5 2 2m5-2-2 2"/>',
        string: '<path fill="currentColor" d="M2 4h2v8H2V4Zm4 0v2h4v4H6v2h6V4H6Zm8 0h2v8h-2V4Z"/>',
        classic: '<path fill="currentColor" d="M8 1 9.9 6.2 15 6.2l-4 3.4 1.5 5.4L8 12l-4.5 3 1.5-5.4-4-3.4 5.1 0L8 1Z"/>',
        advanced: '<path fill="currentColor" d="M8 1 4 5h8L8 1ZM3 6h10v2H3V6Zm1 4h8v5H4v-5Z"/>'
    };

    class Sidebar {
        constructor(rootEl) {
            this.root = rootEl;
            this.filter = 'all';
            this.searchQuery = '';
            this.selectedId = null;
            this.onSelectCallback = null;
        }

        render() {
            const groups = AlgorithmLoader.listByCategory();
            const html = Object.entries(groups).map(([catKey, algos]) => {
                const cat = AlgorithmLoader.CATEGORIES[catKey];
                const filtered = algos.filter(a => this._matches(a));
                if (filtered.length === 0) return '';
                return this._renderCategory(catKey, cat, filtered);
            }).join('');
            this.root.innerHTML = html;
            this._bindEvents();
            // 高亮已选中
            if (this.selectedId) {
                const item = this.root.querySelector(`[data-id="${this.selectedId}"]`);
                if (item) item.classList.add('active');
            }
        }

        _renderCategory(catKey, cat, algos) {
            const items = algos.map(a => {
                const cls = a.disabled ? 'nav-item disabled' : 'nav-item';
                const active = a.id === this.selectedId ? ' active' : '';
                return `
                    <div class="${cls}${active}" data-id="${a.id}" data-category="${catKey}" data-level="${a.level}">
                        <span class="nav-item-title">${a.name}</span>
                        <span class="nav-item-meta" data-level="${a.level}">${a.level}</span>
                    </div>`;
            }).join('');
            return `
                <div class="nav-group" data-category="${catKey}">
                    <div class="nav-group-header">
                        <svg class="nav-group-icon" viewBox="0 0 16 16" aria-hidden="true">${CATEGORY_ICONS[catKey] || ''}</svg>
                        <span>${cat.name}</span>
                        <svg class="nav-group-arrow" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6 4.22a.75.75 0 0 1 1.06 0l2.72 2.72a.5.5 0 0 1 0 .83L7.06 10.5a.75.75 0 1 1-1.06-1.06L8 7.5 6.06 5.28A.75.75 0 0 1 6 4.22Z"/></svg>
                    </div>
                    <div class="nav-group-list">${items}</div>
                </div>`;
        }

        _matches(a) {
            if (this.filter !== 'all' && a.level !== this.filter) return false;
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                return a.name.toLowerCase().includes(q) ||
                    a.id.toLowerCase().includes(q) ||
                    (a.keywords || []).some(k => k.toLowerCase().includes(q));
            }
            return true;
        }

        _bindEvents() {
            // 分组折叠
            this.root.querySelectorAll('.nav-group-header').forEach(h => {
                h.addEventListener('click', e => {
                    if (e.target.closest('.nav-item')) return;
                    h.parentElement.classList.toggle('collapsed');
                });
            });
            // 算法点击
            this.root.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', () => {
                    if (item.classList.contains('disabled')) return;
                    const id = item.dataset.id;
                    this.setSelected(id);
                    if (this.onSelectCallback) this.onSelectCallback(id);
                });
            });
        }

        setSelected(id) {
            this.selectedId = id;
            this.root.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            const item = this.root.querySelector(`[data-id="${id}"]`);
            if (item) item.classList.add('active');
        }

        setFilter(level) {
            this.filter = level;
            this.render();
        }

        setSearch(query) {
            this.searchQuery = query;
            this.render();
        }

        onSelect(cb) { this.onSelectCallback = cb; }
    }

    global.Sidebar = Sidebar;
})(window);
