/**
 * Toast - 轻量级消息提示
 */
(function (global) {
    'use strict';

    class Toast {
        constructor(container) {
            this.container = container || document.getElementById('toastContainer');
        }
        show(message, type = 'info', duration = 2400) {
            const el = document.createElement('div');
            el.className = `toast ${type}`;
            el.textContent = message;
            this.container.appendChild(el);
            setTimeout(() => {
                el.classList.add('fade-out');
                setTimeout(() => el.remove(), 200);
            }, duration);
        }
        success(msg, d) { this.show(msg, 'success', d); }
        error(msg, d) { this.show(msg, 'error', d); }
        warning(msg, d) { this.show(msg, 'warning', d); }
        info(msg, d) { this.show(msg, 'info', d); }
    }

    global.Toast = Toast;
})(window);
