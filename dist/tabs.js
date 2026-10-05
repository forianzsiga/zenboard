export class TabManager {
    tabListEl;
    addTabBtn;
    exportBtn;
    onSwitchTab = null;
    onCloseTab = null;
    onAddTab = null;
    onExportTab = null;
    constructor(tabListEl, addTabBtn, exportBtn) {
        this.tabListEl = tabListEl;
        this.addTabBtn = addTabBtn;
        this.exportBtn = exportBtn;
        this.bindEvents();
    }
    bindEvents() {
        this.addTabBtn?.addEventListener('click', () => this.onAddTab?.());
        this.exportBtn?.addEventListener('click', () => this.onExportTab?.());
    }
    renderTabs(tabs, activeTabId) {
        this.tabListEl.innerHTML = '';
        tabs.forEach((tab) => {
            const tabEl = document.createElement('div');
            tabEl.className = `tab-item ${tab.id === activeTabId ? 'active' : ''}`;
            tabEl.setAttribute('role', 'tab');
            tabEl.setAttribute('aria-selected', tab.id === activeTabId ? 'true' : 'false');
            const nameSpan = document.createElement('span');
            nameSpan.textContent = tab.name;
            nameSpan.ondblclick = (e) => {
                e.stopPropagation();
                const newName = prompt('Rename tab:', tab.name);
                if (newName && newName.trim()) {
                    tab.name = newName.trim();
                    this.renderTabs(tabs, activeTabId);
                }
            };
            tabEl.appendChild(nameSpan);
            if (tabs.length > 1) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'tab-close-btn';
                closeBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
                closeBtn.title = 'Close Tab';
                closeBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.onCloseTab?.(tab.id);
                };
                tabEl.appendChild(closeBtn);
            }
            tabEl.onclick = () => this.onSwitchTab?.(tab.id);
            this.tabListEl.appendChild(tabEl);
        });
    }
    onSwitch(cb) { this.onSwitchTab = cb; }
    onClose(cb) { this.onCloseTab = cb; }
    onAdd(cb) { this.onAddTab = cb; }
    onExport(cb) { this.onExportTab = cb; }
}
