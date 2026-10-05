export class VideoEditorModal {
    modal;
    video;
    cropOverlay;
    cropBox;
    playBtn;
    timeDisplay;
    trimStart;
    trimEnd;
    trimStartVal;
    trimEndVal;
    rangeHighlight;
    screenshotBtn;
    cropResetBtn;
    saveBtn;
    crop = { x: 0, y: 0, w: 100, h: 100 };
    isDragging = false;
    isResizing = false;
    activeHandle = null;
    startPointer = { x: 0, y: 0 };
    initialBox = { x: 0, y: 0, w: 100, h: 100 };
    onSaveCallback = null;
    onScreenshotCallback = null;
    constructor() {
        this.modal = document.getElementById('editor-modal');
        this.video = document.getElementById('editor-video');
        this.cropOverlay = document.getElementById('crop-overlay');
        this.cropBox = document.getElementById('editor-crop-box');
        this.playBtn = document.getElementById('editor-play-btn');
        this.timeDisplay = document.getElementById('editor-time-display');
        this.trimStart = document.getElementById('trim-start');
        this.trimEnd = document.getElementById('trim-end');
        this.trimStartVal = document.getElementById('trim-start-val');
        this.trimEndVal = document.getElementById('trim-end-val');
        this.rangeHighlight = document.getElementById('range-highlight');
        this.screenshotBtn = document.getElementById('editor-screenshot-btn');
        this.cropResetBtn = document.getElementById('crop-reset-btn');
        this.saveBtn = document.getElementById('editor-save-btn');
        this.bindEvents();
    }
    bindEvents() {
        const closeBtn = document.getElementById('editor-close-btn');
        const backdrop = document.getElementById('editor-backdrop');
        closeBtn?.addEventListener('click', () => this.close());
        backdrop?.addEventListener('click', () => this.close());
        this.playBtn.addEventListener('click', () => {
            if (this.video.paused) {
                this.video.play();
                this.playBtn.textContent = 'Pause';
            }
            else {
                this.video.pause();
                this.playBtn.textContent = 'Play';
            }
        });
        this.video.addEventListener('timeupdate', () => {
            this.updateTimeDisplay();
            const start = parseFloat(this.trimStart.value);
            const end = parseFloat(this.trimEnd.value);
            if (this.video.currentTime >= end) {
                this.video.currentTime = start;
            }
        });
        this.trimStart.addEventListener('input', () => {
            const s = parseFloat(this.trimStart.value);
            const e = parseFloat(this.trimEnd.value);
            if (s >= e)
                this.trimStart.value = (e - 0.1).toString();
            this.video.currentTime = parseFloat(this.trimStart.value);
            this.updateTrimUI();
        });
        this.trimEnd.addEventListener('input', () => {
            const s = parseFloat(this.trimStart.value);
            const e = parseFloat(this.trimEnd.value);
            if (e <= s)
                this.trimEnd.value = (s + 0.1).toString();
            this.updateTrimUI();
        });
        this.cropResetBtn.addEventListener('click', () => {
            this.crop = { x: 0, y: 0, w: 100, h: 100 };
            this.renderCropOverlay();
        });
        this.saveBtn.addEventListener('click', () => {
            const isFull = this.crop.x === 0 && this.crop.y === 0 && this.crop.w === 100 && this.crop.h === 100;
            this.onSaveCallback?.(isFull ? null : { ...this.crop }, { start: parseFloat(this.trimStart.value), end: parseFloat(this.trimEnd.value) });
            this.close();
        });
        this.screenshotBtn.addEventListener('click', () => this.captureScreenshot());
        this.setupCropOverlayEvents();
    }
    open(src, crop, trim, onSave, onScreenshot) {
        this.modal.classList.remove('hidden');
        this.video.src = src;
        this.crop = crop ? { ...crop } : { x: 0, y: 0, w: 100, h: 100 };
        this.onSaveCallback = onSave;
        this.onScreenshotCallback = onScreenshot;
        this.video.onloadedmetadata = () => {
            const dur = this.video.duration || 10;
            this.trimStart.max = dur.toString();
            this.trimEnd.max = dur.toString();
            this.trimStart.value = (trim?.start ?? 0).toString();
            this.trimEnd.value = (trim?.end ?? dur).toString();
            this.video.currentTime = parseFloat(this.trimStart.value);
            this.updateTrimUI();
            this.renderCropOverlay();
        };
        if (this.video.readyState >= 1) {
            this.video.onloadedmetadata(new Event('loadedmetadata'));
        }
    }
    close() {
        this.video.pause();
        this.modal.classList.add('hidden');
    }
    updateTrimUI() {
        const dur = this.video.duration || 10;
        const s = parseFloat(this.trimStart.value);
        const e = parseFloat(this.trimEnd.value);
        this.trimStartVal.textContent = `${s.toFixed(1)}s`;
        this.trimEndVal.textContent = `${e.toFixed(1)}s`;
        const startPct = (s / dur) * 100;
        const endPct = (e / dur) * 100;
        this.rangeHighlight.style.left = `${startPct}%`;
        this.rangeHighlight.style.width = `${endPct - startPct}%`;
    }
    updateTimeDisplay() {
        const cur = this.video.currentTime || 0;
        const dur = this.video.duration || 0;
        this.timeDisplay.textContent = `${this.fmtTime(cur)} / ${this.fmtTime(dur)}`;
    }
    fmtTime(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    setupCropOverlayEvents() {
        this.cropOverlay.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const target = e.target;
            const handle = target.getAttribute('data-handle');
            if (handle) {
                this.isResizing = true;
                this.activeHandle = handle;
            }
            else {
                this.isDragging = true;
            }
            this.startPointer = { x: e.clientX, y: e.clientY };
            this.initialBox = { ...this.crop };
        });
        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging && !this.isResizing)
                return;
            const rect = this.cropBox.getBoundingClientRect();
            const dxPct = ((e.clientX - this.startPointer.x) / rect.width) * 100;
            const dyPct = ((e.clientY - this.startPointer.y) / rect.height) * 100;
            if (this.isDragging) {
                this.crop.x = Math.max(0, Math.min(100 - this.initialBox.w, this.initialBox.x + dxPct));
                this.crop.y = Math.max(0, Math.min(100 - this.initialBox.h, this.initialBox.y + dyPct));
            }
            else if (this.isResizing && this.activeHandle) {
                if (this.activeHandle === 'se') {
                    this.crop.w = Math.max(10, Math.min(100 - this.initialBox.x, this.initialBox.w + dxPct));
                    this.crop.h = Math.max(10, Math.min(100 - this.initialBox.y, this.initialBox.h + dyPct));
                }
                else if (this.activeHandle === 'sw') {
                    const newW = Math.max(10, this.initialBox.w - dxPct);
                    this.crop.x = Math.max(0, this.initialBox.x + (this.initialBox.w - newW));
                    this.crop.w = newW;
                    this.crop.h = Math.max(10, Math.min(100 - this.initialBox.y, this.initialBox.h + dyPct));
                }
                else if (this.activeHandle === 'ne') {
                    const newH = Math.max(10, this.initialBox.h - dyPct);
                    this.crop.y = Math.max(0, this.initialBox.y + (this.initialBox.h - newH));
                    this.crop.h = newH;
                    this.crop.w = Math.max(10, Math.min(100 - this.initialBox.x, this.initialBox.w + dxPct));
                }
                else if (this.activeHandle === 'nw') {
                    const newW = Math.max(10, this.initialBox.w - dxPct);
                    const newH = Math.max(10, this.initialBox.h - dyPct);
                    this.crop.x = Math.max(0, this.initialBox.x + (this.initialBox.w - newW));
                    this.crop.y = Math.max(0, this.initialBox.y + (this.initialBox.h - newH));
                    this.crop.w = newW;
                    this.crop.h = newH;
                }
            }
            this.renderCropOverlay();
        });
        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.isResizing = false;
        });
    }
    renderCropOverlay() {
        this.cropOverlay.style.left = `${this.crop.x}%`;
        this.cropOverlay.style.top = `${this.crop.y}%`;
        this.cropOverlay.style.width = `${this.crop.w}%`;
        this.cropOverlay.style.height = `${this.crop.h}%`;
    }
    captureScreenshot() {
        if (!this.video.videoWidth)
            return;
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
        const isFull = this.crop.x === 0 && this.crop.y === 0 && this.crop.w === 100 && this.crop.h === 100;
        this.onScreenshotCallback?.(canvas.toDataURL('image/png'), isFull ? null : { ...this.crop });
        const originalText = this.screenshotBtn.innerHTML;
        this.screenshotBtn.textContent = 'Saved to Board!';
        setTimeout(() => {
            this.screenshotBtn.innerHTML = originalText;
        }, 1200);
    }
}
