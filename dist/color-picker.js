export class ZenColorPicker {
    el;
    currentCallback = null;
    currentCloseCallback = null;
    // Curated Blender & Zen coherent palette presets
    presets = [
        '#181818', '#242424', '#2d2d2d', '#383838', '#444444', '#555555',
        '#e87d1e', '#e56420', '#4772b3', '#2b63ff', '#10b981', '#059669',
        '#ef4444', '#b91c1c', '#8b5cf6', '#6d28d9', '#ec4899', '#be185d',
        '#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280'
    ];
    constructor() {
        this.el = document.createElement('div');
        this.el.className = 'zen-color-picker hidden';
        this.render();
        document.body.appendChild(this.el);
        this.bindGlobalEvents();
    }
    render() {
        this.el.innerHTML = `
      <div class="zen-picker-presets">
        ${this.presets.map(c => `
          <button class="zen-picker-swatch" data-color="${c}" style="background-color: ${c};" title="${c}"></button>
        `).join('')}
      </div>
      <div class="zen-picker-custom-row">
        <span class="zen-picker-preview" id="zen-picker-preview"></span>
        <input type="text" class="zen-picker-input" id="zen-picker-hex" placeholder="#hex" maxlength="9" spellcheck="false" />
      </div>
    `;
        this.el.querySelectorAll('.zen-picker-swatch').forEach(swatch => {
            swatch.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const color = swatch.getAttribute('data-color');
                if (color)
                    this.selectColor(color);
            });
        });
        const hexInput = this.el.querySelector('#zen-picker-hex');
        hexInput?.addEventListener('input', () => {
            const val = hexInput.value.trim();
            if (/^#[0-9a-fA-F]{3,8}$/.test(val)) {
                this.selectColor(val, false);
            }
        });
        // Prevent losing focus / closing on picker interaction
        this.el.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
    }
    selectColor(color, updateInput = true) {
        const preview = this.el.querySelector('#zen-picker-preview');
        const hexInput = this.el.querySelector('#zen-picker-hex');
        if (preview)
            preview.style.backgroundColor = color;
        if (hexInput && updateInput)
            hexInput.value = color;
        this.currentCallback?.(color);
    }
    open(opts) {
        this.currentCallback = opts.onChange;
        this.currentCloseCallback = opts.onClose || null;
        const preview = this.el.querySelector('#zen-picker-preview');
        const hexInput = this.el.querySelector('#zen-picker-hex');
        if (preview)
            preview.style.backgroundColor = opts.initialColor;
        if (hexInput)
            hexInput.value = opts.initialColor;
        this.el.classList.remove('hidden');
        // Position popover relative to anchor
        const rect = opts.anchorEl.getBoundingClientRect();
        const pickerW = 196;
        let left = rect.left + rect.width / 2 - pickerW / 2;
        left = Math.max(10, Math.min(window.innerWidth - pickerW - 10, left));
        let top = rect.top - 120; // Default open above
        if (top < 10)
            top = rect.bottom + 10; // Open below if no room above
        this.el.style.left = `${left}px`;
        this.el.style.top = `${top}px`;
    }
    close() {
        if (!this.el.classList.contains('hidden')) {
            this.el.classList.add('hidden');
            this.currentCloseCallback?.();
            this.currentCallback = null;
            this.currentCloseCallback = null;
        }
    }
    isOpen() {
        return !this.el.classList.contains('hidden');
    }
    bindGlobalEvents() {
        window.addEventListener('mousedown', (e) => {
            if (!this.isOpen())
                return;
            // Do not close if clicking inside picker or on the anchor button itself
            if (this.el.contains(e.target) || e.target.closest('.fmt-color-wrap')) {
                return;
            }
            this.close();
        });
    }
}
export const zenColorPicker = new ZenColorPicker();
