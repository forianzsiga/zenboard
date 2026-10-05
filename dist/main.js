import { boardStorage } from './storage.js';
import { ViewportManager } from './viewport.js';
import { TabManager } from './tabs.js';
import { DrawingManager } from './drawing.js';
import { VideoEditorModal } from './video-editor.js';
import { createCardElement } from './card.js';
import { CardInteractionHandler } from './card-interaction.js';
import { screenToWorld } from './geometry.js';
import { googleDriveSync } from './gdrive-sync.js';
export class ZenMoodboardApp {
    state = {
        theme: 'dark',
        tabs: [],
        activeTabId: '',
        viewport: { panX: 0, panY: 0, zoom: 1 },
        selectedCardId: null,
        isEditingTextCardId: null,
        activeEditorCardId: null
    };
    dom = {
        html: document.documentElement,
        viewport: document.getElementById('viewport'),
        canvas: document.getElementById('canvas'),
        tabList: document.getElementById('tab-list'),
        addTabBtn: document.getElementById('add-tab-btn'),
        drawToolBtn: document.getElementById('draw-tool-btn'),
        driveSyncBtn: document.getElementById('drive-sync-btn'),
        driveSyncLabel: document.getElementById('drive-sync-label'),
        exportTabBtn: document.getElementById('export-tab-btn'),
        addTextBtn: document.getElementById('add-text-btn'),
        themeToggle: document.getElementById('theme-toggle'),
        cardActionsBar: document.getElementById('card-actions-bar'),
        cardBgBtn: document.getElementById('card-bg-btn'),
        cardDeleteBtn: document.getElementById('card-delete-btn'),
        formattingBar: document.getElementById('formatting-bar'),
        fmtTextColorBtn: document.getElementById('fmt-text-color-btn'),
        drawingSvg: document.getElementById('drawing-svg'),
        drawingsGroup: document.getElementById('drawings-group'),
        activeDrawPath: document.getElementById('active-draw-path')
    };
    viewport;
    tabs;
    drawing;
    videoEditor;
    cardInteraction;
    async init() {
        this.viewport = new ViewportManager(this.dom.viewport, this.dom.canvas, this.dom.drawingsGroup, this.dom.activeDrawPath);
        this.tabs = new TabManager(this.dom.tabList, this.dom.addTabBtn, this.dom.exportTabBtn);
        this.drawing = new DrawingManager(this.dom.viewport, this.dom.drawingsGroup, this.dom.activeDrawPath, this.dom.drawToolBtn);
        this.videoEditor = new VideoEditorModal();
        this.cardInteraction = new CardInteractionHandler({
            canvas: this.dom.canvas,
            cardActionsBar: this.dom.cardActionsBar,
            cardBgBtn: this.dom.cardBgBtn,
            cardDeleteBtn: this.dom.cardDeleteBtn,
            formattingBar: this.dom.formattingBar,
            fmtTextColorBtn: this.dom.fmtTextColorBtn
        }, this.viewport, this.state, () => this.save());
        this.setupTheme();
        this.setupToolbarHandlers();
        this.setupSubsystems();
        this.setupGoogleDriveSync();
        this.setupDragAndDrop();
        const saved = await boardStorage.loadBoardState();
        if (saved && saved.tabs && saved.tabs.length > 0) {
            this.state.tabs = saved.tabs;
            this.state.activeTabId = saved.activeTabId || saved.tabs[0].id;
            if (saved.theme)
                this.setTheme(saved.theme);
        }
        else {
            this.createInitialBoard();
            this.save();
        }
        const curTab = this.getActiveTab();
        if (curTab) {
            this.viewport.setViewport(curTab.panX, curTab.panY, curTab.zoom);
        }
        this.renderTabs();
        this.renderBoard();
    }
    setupSubsystems() {
        this.viewport.onChange(() => {
            const tab = this.getActiveTab();
            if (tab) {
                tab.panX = this.viewport.panX;
                tab.panY = this.viewport.panY;
                tab.zoom = this.viewport.zoom;
                this.cardInteraction.updateBarPositions();
                this.save();
            }
        });
        // Re-evaluate and re-render nodes crisp elements when zoom settles
        this.viewport.onZoomSettled(() => {
            this.cardInteraction.updateBarPositions();
            // Re-evaluate in-renderer cropped media elements at new resolution
            const tab = this.getActiveTab();
            if (tab) {
                tab.cards.forEach(card => {
                    if (card.crop) {
                        const el = document.getElementById(`card-${card.id}`);
                        const media = el?.querySelector('.card-media-cropped img, .card-media-cropped video');
                        if (media) {
                            // Trigger renderer re-flow to ensure maximum sharpness
                            media.style.transform = media.style.transform;
                        }
                    }
                });
            }
        });
        this.viewport.onDblClick((pt) => {
            this.addNoteCard(pt.x, pt.y);
        });
        this.viewport.onDeselectAction(() => {
            this.cardInteraction.deselectAll();
        });
        this.tabs.onSwitch((id) => this.switchTab(id));
        this.tabs.onClose((id) => this.closeTab(id));
        this.tabs.onAdd(() => this.addNewTab());
        this.tabs.onExport(() => this.exportCurrentTab());
        this.drawing.onStroke((item) => {
            const tab = this.getActiveTab();
            if (!tab)
                return;
            if (!tab.drawings)
                tab.drawings = [];
            tab.drawings.push(item);
            this.drawing.renderDrawings(tab.drawings);
            this.save();
        });
        this.drawing.onDelete((id) => {
            const tab = this.getActiveTab();
            if (!tab || !tab.drawings)
                return;
            const idx = tab.drawings.findIndex(d => d.id === id);
            if (idx !== -1) {
                tab.drawings.splice(idx, 1);
                this.drawing.renderDrawings(tab.drawings);
                this.save();
            }
        });
        this.dom.viewport.addEventListener('mousedown', (e) => {
            if (this.drawing.active) {
                this.drawing.startStroke(e, this.viewport.panX, this.viewport.panY, this.viewport.zoom);
            }
        });
        window.addEventListener('mousemove', (e) => {
            if (this.drawing.active) {
                this.drawing.moveStroke(e, this.viewport.panX, this.viewport.panY, this.viewport.zoom);
            }
        });
        window.addEventListener('mouseup', () => {
            if (this.drawing.active) {
                this.drawing.endStroke();
            }
        });
    }
    setupTheme() {
        this.dom.themeToggle.addEventListener('click', () => {
            const isDark = this.dom.html.classList.contains('dark');
            this.setTheme(isDark ? 'light' : 'dark');
        });
    }
    setTheme(theme) {
        this.state.theme = theme;
        this.dom.html.classList.toggle('dark', theme === 'dark');
        this.save();
    }
    setupToolbarHandlers() {
        this.dom.addTextBtn?.addEventListener('click', () => {
            const center = screenToWorld(window.innerWidth / 2, window.innerHeight / 2, this.viewport.panX, this.viewport.panY, this.viewport.zoom);
            this.addNoteCard(center.x - 150, center.y - 100);
        });
        document.querySelectorAll('.formatting-bar .fmt-btn[data-cmd]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const cmd = btn.getAttribute('data-cmd');
                if (cmd)
                    document.execCommand(cmd, false, undefined);
            });
        });
        this.dom.cardDeleteBtn?.addEventListener('click', () => {
            const tab = this.getActiveTab();
            if (!tab || !this.state.selectedCardId)
                return;
            const idx = tab.cards.findIndex(c => c.id === this.state.selectedCardId);
            if (idx !== -1) {
                tab.cards.splice(idx, 1);
                this.renderBoard();
                this.cardInteraction.deselectAll();
                this.save();
            }
        });
    }
    setupGoogleDriveSync() {
        googleDriveSync.init(() => this.state);
        this.dom.driveSyncBtn?.addEventListener('click', () => {
            googleDriveSync.connect();
        });
        googleDriveSync.onStatus((status, text) => {
            if (this.dom.driveSyncLabel) {
                this.dom.driveSyncLabel.textContent = text || 'Drive Sync';
            }
            if (this.dom.driveSyncBtn) {
                this.dom.driveSyncBtn.classList.toggle('active-tool', status === 'synced');
            }
        });
    }
    createInitialBoard() {
        const initialTab = {
            id: 'tab_' + Date.now(),
            name: 'Zen Board 1',
            panX: window.innerWidth / 2 - 200,
            panY: window.innerHeight / 2 - 200,
            zoom: 1,
            cards: [
                {
                    id: 'card_welcome',
                    type: 'text',
                    x: 40,
                    y: 60,
                    w: 420,
                    h: 280,
                    rawText: '### Welcome to Zenboard\n\n• **Drag & Drop** images or videos from your computer\n• Double click anywhere to create a **Note**\n• Auto TeX formulas: $E = mc^2$ or $\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$\n• Hover over media & click the top-right pen to **trim, crop & screenshot**!',
                    textColor: '#e0e0e0',
                    bgColor: '#242424'
                }
            ],
            drawings: []
        };
        this.state.tabs.push(initialTab);
        this.state.activeTabId = initialTab.id;
    }
    renderTabs() {
        this.tabs.renderTabs(this.state.tabs, this.state.activeTabId);
    }
    renderBoard() {
        this.dom.canvas.innerHTML = '';
        const tab = this.getActiveTab();
        if (!tab)
            return;
        tab.cards.forEach((card) => {
            const cardEl = createCardElement(card, card.id === this.state.selectedCardId, {
                onSelect: (id) => this.cardInteraction.selectCard(id),
                onEditStart: (id) => {
                    this.state.isEditingTextCardId = id;
                    this.cardInteraction.selectCard(id);
                },
                onEditEnd: (id, text) => {
                    this.state.isEditingTextCardId = null;
                    card.rawText = text;
                    if (this.state.selectedCardId === id)
                        this.cardInteraction.showCardActions(card);
                    this.save();
                },
                onOpenEditor: (id) => this.openEditor(id),
                onMove: () => this.cardInteraction.updateBarPositions(),
                onResize: () => this.cardInteraction.updateBarPositions()
            });
            this.cardInteraction.setupDragging(cardEl, card);
            this.cardInteraction.setupResizing(cardEl, card);
            this.dom.canvas.appendChild(cardEl);
        });
        this.drawing.renderDrawings(tab.drawings || []);
    }
    addNoteCard(x, y) {
        const tab = this.getActiveTab();
        if (!tab)
            return;
        const newCard = {
            id: 'card_' + Date.now(),
            type: 'text',
            x: Math.round(x),
            y: Math.round(y),
            w: 280,
            h: 160,
            rawText: 'New Note',
            textColor: this.state.theme === 'dark' ? '#ffffff' : '#141416',
            bgColor: this.state.theme === 'dark' ? '#1e1e24' : '#ffffff'
        };
        tab.cards.push(newCard);
        this.renderBoard();
        this.cardInteraction.selectCard(newCard.id);
        this.save();
    }
    openEditor(cardId) {
        const tab = this.getActiveTab();
        const card = tab?.cards.find(c => c.id === cardId);
        if (!card || !card.src)
            return;
        this.videoEditor.open(card.src, card.crop || null, card.trim || null, (crop, trim) => {
            card.crop = crop;
            if (card.type === 'video')
                card.trim = trim;
            this.renderBoard();
            this.save();
        }, (dataUrl, crop) => {
            const snapCard = {
                id: 'card_snap_' + Date.now(),
                type: 'image',
                src: dataUrl,
                x: card.x + card.w + 30,
                y: card.y,
                w: card.w,
                h: card.h,
                crop: crop
            };
            tab?.cards.push(snapCard);
            this.renderBoard();
            this.save();
        });
    }
    addNewTab() {
        const newTab = {
            id: 'tab_' + Date.now(),
            name: `Board ${this.state.tabs.length + 1}`,
            panX: window.innerWidth / 2,
            panY: window.innerHeight / 2,
            zoom: 1,
            cards: [],
            drawings: []
        };
        this.state.tabs.push(newTab);
        this.switchTab(newTab.id);
    }
    switchTab(tabId) {
        this.state.activeTabId = tabId;
        this.cardInteraction.deselectAll();
        const tab = this.getActiveTab();
        if (tab) {
            this.viewport.setViewport(tab.panX || 0, tab.panY || 0, tab.zoom || 1);
        }
        this.renderTabs();
        this.renderBoard();
        this.save();
    }
    closeTab(tabId) {
        if (this.state.tabs.length <= 1)
            return;
        const idx = this.state.tabs.findIndex(t => t.id === tabId);
        if (idx !== -1) {
            this.state.tabs.splice(idx, 1);
            if (this.state.activeTabId === tabId) {
                this.switchTab(this.state.tabs[Math.max(0, idx - 1)].id);
            }
            else {
                this.renderTabs();
                this.save();
            }
        }
    }
    exportCurrentTab() {
        const tab = this.getActiveTab();
        if (!tab)
            return;
        const data = {
            version: '1.0',
            app: 'zenboard',
            exportedAt: new Date().toISOString(),
            tab
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = `${(tab.name || 'board').replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}.zmbtab`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    setupDragAndDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
            window.addEventListener(ev, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        window.addEventListener('drop', (e) => {
            const files = e.dataTransfer?.files;
            if (!files || files.length === 0)
                return;
            const worldPos = screenToWorld(e.clientX, e.clientY, this.viewport.panX, this.viewport.panY, this.viewport.zoom);
            let offset = 0;
            Array.from(files).forEach((file) => {
                if (file.name.endsWith('.zmbtab') || file.type === 'application/json') {
                    const reader = new FileReader();
                    reader.onload = (re) => {
                        try {
                            const parsed = JSON.parse(re.target?.result);
                            if (parsed && parsed.tab) {
                                const imported = {
                                    id: 'tab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                                    name: parsed.tab.name || 'Imported Board',
                                    panX: parsed.tab.panX || 0,
                                    panY: parsed.tab.panY || 0,
                                    zoom: parsed.tab.zoom || 1,
                                    cards: parsed.tab.cards || [],
                                    drawings: parsed.tab.drawings || []
                                };
                                this.state.tabs.push(imported);
                                this.switchTab(imported.id);
                            }
                        }
                        catch (err) {
                            console.error(err);
                        }
                    };
                    reader.readAsText(file);
                }
                else if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                    const type = file.type.startsWith('video/') ? 'video' : 'image';
                    const reader = new FileReader();
                    reader.onload = (re) => {
                        const card = {
                            id: 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                            type,
                            src: re.target?.result,
                            x: Math.round(worldPos.x + offset),
                            y: Math.round(worldPos.y + offset),
                            w: type === 'video' ? 440 : 360,
                            h: 260
                        };
                        this.getActiveTab()?.cards.push(card);
                        this.renderBoard();
                        this.cardInteraction.selectCard(card.id);
                        this.save();
                    };
                    reader.readAsDataURL(file);
                    offset += 40;
                }
            });
        });
    }
    getActiveTab() {
        return this.state.tabs.find(t => t.id === this.state.activeTabId) || this.state.tabs[0];
    }
    getSelectedCard() {
        return this.getActiveTab()?.cards.find(c => c.id === this.state.selectedCardId);
    }
    save() {
        boardStorage.saveBoardState({
            theme: this.state.theme,
            tabs: this.state.tabs,
            activeTabId: this.state.activeTabId
        });
        // Trigger lazy autosave (10s idle debounce / 60s max force timer)
        googleDriveSync.markDirty();
    }
}
// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
    const app = new ZenMoodboardApp();
    app.init();
});
