/**
 * Shortcut - 键盘快捷键
 *   Space: 播放/暂停
 *   ←/→: 后退/前进一步
 *   ↑/↓: 后退/前进一步
 *   Home/End: 跳到开头/结尾
 *   R: 重置
 *   /: 聚焦搜索框
 *   T: 切换主题
 *   Esc: 清空搜索 / 失焦
 */
(function (global) {
    'use strict';

    class Shortcut {
        constructor(app) {
            this.app = app;
            this._bind();
        }
        _bind() {
            document.addEventListener('keydown', e => {
                // 忽略输入框中的按键（除非是 Esc）
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    if (e.key === 'Escape') { e.target.blur(); }
                    return;
                }
                const key = e.key;
                let handled = true;
                switch (key) {
                    case ' ':
                    case 'Spacebar':
                        this.app.animator.togglePlay();
                        break;
                    case 'ArrowLeft':
                    case 'ArrowUp':
                        this.app.animator.stepBackward();
                        break;
                    case 'ArrowRight':
                    case 'ArrowDown':
                        this.app.animator.stepForward();
                        break;
                    case 'Home':
                        this.app.animator.jumpToStart();
                        break;
                    case 'End':
                        this.app.animator.jumpToEnd();
                        break;
                    case 'r': case 'R':
                        this.app.animator.reset();
                        break;
                    case 't': case 'T':
                        this.app.themeSwitcher.toggle();
                        break;
                    case '/':
                        document.getElementById('searchInput').focus();
                        e.preventDefault();
                        break;
                    default:
                        handled = false;
                }
                if (handled) e.preventDefault();
            });
        }
    }

    global.Shortcut = Shortcut;
})(window);
