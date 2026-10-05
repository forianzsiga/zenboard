import { resamplePoints, generateSmoothBezierPath, screenToWorld } from './geometry.js';
export class DrawingManager {
    isDrawMode = false;
    isDrawingStroke = false;
    currentStrokePoints = [];
    btn;
    viewport;
    drawingsGroup;
    activePath;
    onStrokeFinished = null;
    onDeleteDrawing = null;
    constructor(viewport, drawingsGroup, activePath, btn) {
        this.viewport = viewport;
        this.drawingsGroup = drawingsGroup;
        this.activePath = activePath;
        this.btn = btn;
        this.bindEvents();
    }
    bindEvents() {
        this.btn?.addEventListener('click', () => this.toggleDrawMode());
        window.addEventListener('keydown', (e) => {
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable)
                return;
            if (e.key === 'd' || e.key === 'D') {
                this.toggleDrawMode();
            }
        });
    }
    toggleDrawMode() {
        this.isDrawMode = !this.isDrawMode;
        this.btn?.classList.toggle('active-tool', this.isDrawMode);
        this.viewport.classList.toggle('drawing-mode', this.isDrawMode);
        if (!this.isDrawMode) {
            this.currentStrokePoints = [];
            this.activePath.setAttribute('d', '');
        }
    }
    get active() {
        return this.isDrawMode;
    }
    startStroke(e, panX, panY, zoom) {
        if (!this.isDrawMode || e.button !== 0)
            return;
        this.isDrawingStroke = true;
        const pt = screenToWorld(e.clientX, e.clientY, panX, panY, zoom);
        this.currentStrokePoints = [pt];
        this.renderActiveStroke();
    }
    moveStroke(e, panX, panY, zoom) {
        if (!this.isDrawMode || !this.isDrawingStroke)
            return;
        const pt = screenToWorld(e.clientX, e.clientY, panX, panY, zoom);
        const last = this.currentStrokePoints[this.currentStrokePoints.length - 1];
        if (!last || (pt.x !== last.x || pt.y !== last.y)) {
            this.currentStrokePoints.push(pt);
            this.renderActiveStroke();
        }
    }
    endStroke() {
        if (!this.isDrawMode || !this.isDrawingStroke)
            return;
        this.isDrawingStroke = false;
        this.activePath.setAttribute('d', '');
        if (this.currentStrokePoints.length < 3) {
            this.currentStrokePoints = [];
            return;
        }
        const resampled = resamplePoints(this.currentStrokePoints, 12);
        this.currentStrokePoints = [];
        if (resampled.length < 2)
            return;
        const bezierD = generateSmoothBezierPath(resampled);
        const item = {
            id: 'draw_' + Date.now(),
            d: bezierD,
            color: '#e87d1e',
            width: 3
        };
        this.onStrokeFinished?.(item);
    }
    renderActiveStroke() {
        if (this.currentStrokePoints.length < 2) {
            this.activePath.setAttribute('d', '');
            return;
        }
        let d = `M ${this.currentStrokePoints[0].x.toFixed(1)} ${this.currentStrokePoints[0].y.toFixed(1)}`;
        for (let i = 1; i < this.currentStrokePoints.length; i++) {
            d += ` L ${this.currentStrokePoints[i].x.toFixed(1)} ${this.currentStrokePoints[i].y.toFixed(1)}`;
        }
        this.activePath.setAttribute('d', d);
    }
    renderDrawings(drawings = []) {
        this.drawingsGroup.innerHTML = '';
        drawings.forEach((item) => {
            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('d', item.d);
            pathEl.setAttribute('class', 'smoothed-arrow-path');
            pathEl.setAttribute('stroke', item.color || '#e87d1e');
            pathEl.setAttribute('stroke-width', `${item.width || 3}px`);
            pathEl.setAttribute('marker-end', 'url(#arrowhead)');
            pathEl.setAttribute('data-title', 'Click to delete arrow');
            pathEl.onclick = (e) => {
                e.stopPropagation();
                this.onDeleteDrawing?.(item.id);
            };
            this.drawingsGroup.appendChild(pathEl);
        });
    }
    onStroke(cb) {
        this.onStrokeFinished = cb;
    }
    onDelete(cb) {
        this.onDeleteDrawing = cb;
    }
}
