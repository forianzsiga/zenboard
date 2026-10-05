export class ViewportManager {
    viewportEl;
    canvasEl;
    drawingsGroup;
    activePath;
    panX = 0;
    panY = 0;
    zoom = 1;
    isPanning = false;
    startX = 0;
    startY = 0;
    onTransformChange = null;
    onDblClickBackground = null;
    onDeselect = null;
    constructor(viewportEl, canvasEl, drawingsGroup, activePath) {
        this.viewportEl = viewportEl;
        this.canvasEl = canvasEl;
        this.drawingsGroup = drawingsGroup;
        this.activePath = activePath;
        this.bindEvents();
    }
    bindEvents() {
        this.viewportEl.addEventListener('mousedown', (e) => {
            // Background pan check
            const target = e.target;
            if (target === this.viewportEl ||
                target === this.canvasEl ||
                target.id === 'drawing-svg' ||
                e.button === 1) {
                this.isPanning = true;
                this.startX = e.clientX - this.panX;
                this.startY = e.clientY - this.panY;
                this.viewportEl.classList.add('panning');
                this.onDeselect?.();
            }
        });
        window.addEventListener('mousemove', (e) => {
            if (!this.isPanning)
                return;
            this.panX = e.clientX - this.startX;
            this.panY = e.clientY - this.startY;
            this.updateTransform();
            this.onTransformChange?.();
        });
        window.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.viewportEl.classList.remove('panning');
                this.onTransformChange?.();
            }
        });
        this.viewportEl.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = 1.1;
            const oldZoom = this.zoom;
            let newZoom = e.deltaY < 0 ? oldZoom * zoomFactor : oldZoom / zoomFactor;
            newZoom = Math.min(Math.max(0.15, newZoom), 5.0);
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            this.panX = mouseX - (mouseX - this.panX) * (newZoom / oldZoom);
            this.panY = mouseY - (mouseY - this.panY) * (newZoom / oldZoom);
            this.zoom = newZoom;
            this.updateTransform();
            this.onTransformChange?.();
        }, { passive: false });
        this.viewportEl.addEventListener('dblclick', (e) => {
            const target = e.target;
            if (target === this.viewportEl || target === this.canvasEl) {
                const worldPt = {
                    x: (e.clientX - this.panX) / this.zoom,
                    y: (e.clientY - this.panY) / this.zoom
                };
                this.onDblClickBackground?.(worldPt);
            }
        });
    }
    updateTransform() {
        this.canvasEl.style.transform = `translate3d(${this.panX}px, ${this.panY}px, 0px) scale(${this.zoom})`;
        const dotSize = 20 * this.zoom;
        this.viewportEl.style.backgroundSize = `${dotSize}px ${dotSize}px`;
        this.viewportEl.style.backgroundPosition = `${this.panX}px ${this.panY}px`;
        this.drawingsGroup.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
        this.activePath.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
    }
    setViewport(panX, panY, zoom) {
        this.panX = panX;
        this.panY = panY;
        this.zoom = zoom;
        this.updateTransform();
    }
    onChange(cb) { this.onTransformChange = cb; }
    onDblClick(cb) { this.onDblClickBackground = cb; }
    onDeselectAction(cb) { this.onDeselect = cb; }
}
