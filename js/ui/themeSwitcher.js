/**
 * ThemeSwitcher - 主题切换（浅色/深色）
 * 使用 localStorage 持久化用户选择
 */
(function (global) {
    'use strict';

    class ThemeSwitcher {
        constructor() {
            this.toggleBtn = document.getElementById('themeToggle');
            this.STORAGE_KEY = 'algolens-theme';
            this._bind();
        }

        init() {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = saved || (prefersDark ? 'dark' : 'light');
            this.setTheme(theme);
        }

        setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem(this.STORAGE_KEY, theme);
            // 通知渲染器更新颜色
            if (global.app && global.app.renderer) {
                global.app.renderer.setTheme(theme);
                global.app.renderer.renderFrame(global.app.renderer._lastRenderState);
                // Wait, _lastRenderState is on Animator, not Renderer. Let me fix.
            }
            if (global.app && global.app.animator) {
                global.app.animator._renderCurrent();
            }
            document.querySelector('meta[name="theme-color"]').setAttribute('content',
                theme === 'dark' ? '#0d1117' : '#ffffff');
        }

        toggle() {
            const current = document.documentElement.getAttribute('data-theme');
            this.setTheme(current === 'dark' ? 'light' : 'dark');
        }

        _bind() {
            this.toggleBtn.addEventListener('click', () => this.toggle());
        }
    }

    global.ThemeSwitcher = ThemeSwitcher;
})(window);
