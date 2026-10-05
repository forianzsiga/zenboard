import { worldToScreen } from './geometry.js';
export class CardInteractionHandler {
    dom;
    viewport;
    state;
    onSave;
    constructor(dom, viewport, state, onSave) {
        this.dom = dom;
        this.viewport = viewport;
        this.state = state;
        this.onSave = onSave;
    }
    setupDragging(el, card) {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initX = 0;
        let initY = 0;
        el.addEventListener('mousedown', (e) => {
            const target = e.target;
            if (target.closest('.card-edit-pen') || target.closest('.card-resizer'))
                return;
            if (target.isContentEditable && document.activeElement === target)
                return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initX = card.x;
            initY = card.y;
            this.selectCard(card.id);
            e.stopPropagation();
        });
        window.addEventListener('mousemove', (e) => {
            if (!isDragging)
                return;
            const dx = (e.clientX - startX) / this.viewport.zoom;
            const dy = (e.clientY - startY) / this.viewport.zoom;
            card.x = Math.round(initX + dx);
            card.y = Math.round(initY + dy);
            el.style.transform = `translate3d(${card.x}px, ${card.y}px, 0px)`;
            this.updateBarPositions();
        });
        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.onSave();
            }
        });
    }
    setupResizing(el, card) {
        const resizer = el.querySelector('.card-resizer');
        if (!resizer)
            return;
        let isResizing = false;
        let startX = 0;
        let startY = 0;
        let initW = 0;
        let initH = 0;
        resizer.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            initW = card.w;
            initH = card.h;
        });
        window.addEventListener('mousemove', (e) => {
            if (!isResizing)
                return;
            const dw = (e.clientX - startX) / this.viewport.zoom;
            const dh = (e.clientY - startY) / this.viewport.zoom;
            card.w = Math.max(120, Math.round(initW + dw));
            card.h = Math.max(80, Math.round(initH + dh));
            el.style.width = `${card.w}px`;
            el.style.height = `${card.h}px`;
            this.updateBarPositions();
        });
        window.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                this.onSave();
            }
        });
    }
    selectCard(cardId) {
        this.state.selectedCardId = cardId;
        document.querySelectorAll('.board-card').forEach(c => {
            c.classList.toggle('selected', c.id === `card-${cardId}`);
        });
        const card = this.getSelectedCard();
        if (card) {
            if (this.state.isEditingTextCardId === cardId) {
                this.showFormattingBar(card);
                this.hideCardActions();
            }
            else {
                this.showCardActions(card);
                this.hideFormattingBar();
            }
        }
        else {
            this.deselectAll();
        }
    }
    deselectAll() {
        this.state.selectedCardId = null;
        this.state.isEditingTextCardId = null;
        document.querySelectorAll('.board-card').forEach(c => c.classList.remove('selected'));
        this.hideFormattingBar();
        this.hideCardActions();
    }
    showFormattingBar(card) {
        this.dom.formattingBar.classList.remove('hidden');
        if (card.textColor && this.dom.fmtTextColor)
            this.dom.fmtTextColor.value = card.textColor;
        this.updateBarPosition(this.dom.formattingBar);
    }
    hideFormattingBar() {
        this.dom.formattingBar.classList.add('hidden');
    }
    showCardActions(card) {
        this.dom.cardActionsBar.classList.remove('hidden');
        if (card.bgColor && this.dom.cardBgColor)
            this.dom.cardBgColor.value = card.bgColor;
        this.updateBarPosition(this.dom.cardActionsBar);
    }
    hideCardActions() {
        this.dom.cardActionsBar.classList.add('hidden');
    }
    updateBarPositions() {
        if (!this.dom.formattingBar.classList.contains('hidden'))
            this.updateBarPosition(this.dom.formattingBar);
        if (!this.dom.cardActionsBar.classList.contains('hidden'))
            this.updateBarPosition(this.dom.cardActionsBar);
    }
    updateBarPosition(barEl) {
        const card = this.getSelectedCard();
        if (!card)
            return;
        const pt = worldToScreen(card.x + card.w / 2, card.y, this.viewport.panX, this.viewport.panY, this.viewport.zoom);
        barEl.style.left = `${pt.x}px`;
        barEl.style.top = `${pt.y}px`;
    }
    getSelectedCard() {
        const tab = this.state.tabs.find(t => t.id === this.state.activeTabId) || this.state.tabs[0];
        return tab?.cards.find(c => c.id === this.state.selectedCardId);
    }
}
