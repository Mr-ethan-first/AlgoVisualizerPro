/**
 * Controls - 播放控制栏交互
 */
(function (global) {
    'use strict';

    const MIN_SPEED = 0.25;
    const MAX_SPEED = 4;
    const SPEED_STEP = 0.25;
    const SPEED_RANGE = MAX_SPEED - MIN_SPEED; // 3.75

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function snapSpeed(s) {
        return clamp(Math.round(s / SPEED_STEP) * SPEED_STEP, MIN_SPEED, MAX_SPEED);
    }

    function percentToSpeed(p) {
        const s = MIN_SPEED + SPEED_RANGE * (clamp(p, 0, 100) / 100);
        return snapSpeed(s);
    }

    function speedToPercent(s) {
        const clamped = clamp(s, MIN_SPEED, MAX_SPEED);
        return clamp((clamped - MIN_SPEED) / SPEED_RANGE * 100, 0, 100);
    }

    function formatSpeed(s) {
        // 去除末尾的 0，例如 1 -> "1x"，1.5 -> "1.5x"，0.25 -> "0.25x"
        if (Number.isInteger(s)) return s + 'x';
        return parseFloat(s.toFixed(2)) + 'x';
    }

    class Controls {
        constructor(animator) {
            this.animator = animator;
            this.firstBtn = document.getElementById('firstBtn');
            this.prevBtn = document.getElementById('prevBtn');
            this.playBtn = document.getElementById('playBtn');
            this.nextBtn = document.getElementById('nextBtn');
            this.lastBtn = document.getElementById('lastBtn');
            this.resetBtn = document.getElementById('resetBtn');
            this.speedSlider = document.getElementById('speedSlider');
            this.speedFill = document.getElementById('speedFill');
            this.speedValue = document.getElementById('speedValue');
            this.speedMinus = document.getElementById('speedMinus');
            this.speedPlus = document.getElementById('speedPlus');
            this.playIcon = this.playBtn.querySelector('.play-icon');
            this.pauseIcon = this.playBtn.querySelector('.pause-icon');
            this._bind();
            this._updatePlayIcon();
            this._setSpeed(1);
        }

        _bind() {
            this.firstBtn.addEventListener('click', () => this.animator.jumpToStart());
            this.prevBtn.addEventListener('click', () => this.animator.stepBackward());
            this.playBtn.addEventListener('click', () => this.animator.togglePlay());
            this.nextBtn.addEventListener('click', () => this.animator.stepForward());
            this.lastBtn.addEventListener('click', () => this.animator.jumpToEnd());
            this.resetBtn.addEventListener('click', () => {
                this.animator.reset();
                this._setSpeed(1);
            });

            this.speedSlider.addEventListener('input', e => {
                this._updateSpeed(parseFloat(e.target.value));
            });

            this.speedMinus.addEventListener('click', () => this._changeSpeed(-SPEED_STEP));
            this.speedPlus.addEventListener('click', () => this._changeSpeed(SPEED_STEP));
        }

        _updateSpeed(percent) {
            const speed = percentToSpeed(percent);
            const snappedPercent = speedToPercent(speed);
            this.speedSlider.value = snappedPercent;
            this.speedFill.style.width = snappedPercent + '%';
            this.speedValue.textContent = formatSpeed(speed);
            this.animator.setSpeed(speed);
            this._currentSpeed = speed;
            this._updateSpeedButtons();
        }

        _setSpeed(speed) {
            const snapped = snapSpeed(speed);
            this._updateSpeed(speedToPercent(snapped));
        }

        _changeSpeed(delta) {
            this._setSpeed((this._currentSpeed || 1) + delta);
        }

        _updateSpeedButtons() {
            if (this.speedMinus) this.speedMinus.disabled = this._currentSpeed <= MIN_SPEED;
            if (this.speedPlus) this.speedPlus.disabled = this._currentSpeed >= MAX_SPEED;
        }

        _updatePlayIcon() {
            const playing = this.animator.isPlaying();
            this.playIcon.style.display = playing ? 'none' : 'block';
            this.pauseIcon.style.display = playing ? 'block' : 'none';
            this.playBtn.title = playing ? '暂停 (Space)' : '播放 (Space)';
        }

        /**
         * 暴露给外部更新 UI（按钮可用性、播放图标）
         */
        updateState() {
            this._updatePlayIcon();
            const atStart = this.animator.isAtStart();
            const atEnd = this.animator.isFinished();
            this.firstBtn.disabled = atStart;
            this.prevBtn.disabled = atStart;
            this.nextBtn.disabled = atEnd;
            this.lastBtn.disabled = atEnd;
        }
    }

    global.Controls = Controls;
})(window);
