import { MathParser } from './math-parser.js';
export function createCardElement(card, isSelected, callbacks) {
    const el = document.createElement('div');
    el.className = `board-card ${isSelected ? 'selected' : ''}`;
    el.id = `card-${card.id}`;
    el.style.transform = `translate3d(${card.x}px, ${card.y}px, 0px)`;
    el.style.width = `${card.w}px`;
    el.style.height = `${card.h}px`;
    if (card.bgColor)
        el.style.backgroundColor = card.bgColor;
    if (card.textColor)
        el.style.color = card.textColor;
    // Header Bar
    const headerBar = document.createElement('div');
    headerBar.className = 'card-header-bar';
    const typeLabel = card.type === 'text' ? 'Note / Formula' : (card.type === 'video' ? 'Video Player' : 'Image');
    headerBar.innerHTML = `<span style="opacity:0.8;">•</span> <span style="margin-left:5px;flex:1;">${typeLabel}</span>`;
    el.appendChild(headerBar);
    // Inner wrapper
    const inner = document.createElement('div');
    inner.className = 'card-inner';
    // Hover Pen
    const penBtn = document.createElement('button');
    penBtn.className = 'card-edit-pen';
    penBtn.title = 'Edit / Trim / Crop';
    penBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
    penBtn.onclick = (e) => {
        e.stopPropagation();
        callbacks.onOpenEditor(card.id);
    };
    el.appendChild(penBtn);
    // Resizer
    const resizer = document.createElement('div');
    resizer.className = 'card-resizer';
    el.appendChild(resizer);
    // Content
    if (card.type === 'text') {
        renderTextContent(card, inner, callbacks);
    }
    else if (card.type === 'image') {
        renderImageContent(card, inner);
    }
    else if (card.type === 'video') {
        renderVideoContent(card, inner);
    }
    el.appendChild(inner);
    el.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        callbacks.onOpenEditor(card.id);
    });
    return el;
}
function renderTextContent(card, inner, callbacks) {
    const contentEl = document.createElement('div');
    contentEl.className = 'card-text-content';
    contentEl.spellcheck = false;
    contentEl.innerHTML = MathParser.renderToHtml(card.rawText || '');
    contentEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (contentEl.getAttribute('contenteditable') !== 'true') {
            contentEl.setAttribute('contenteditable', 'true');
            contentEl.innerText = card.rawText || '';
            contentEl.focus();
            callbacks.onEditStart(card.id);
        }
    });
    contentEl.addEventListener('focus', () => {
        callbacks.onEditStart(card.id);
    });
    contentEl.addEventListener('blur', () => {
        contentEl.removeAttribute('contenteditable');
        const text = contentEl.innerText;
        card.rawText = text;
        contentEl.innerHTML = MathParser.renderToHtml(text);
        callbacks.onEditEnd(card.id, text);
    });
    inner.appendChild(contentEl);
}
function renderImageContent(card, inner) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card-media-wrapper';
    if (card.crop) {
        const cropped = document.createElement('div');
        cropped.className = 'card-media-cropped';
        const img = document.createElement('img');
        img.src = card.src || '';
        applyInRendererCrop(img, card.crop, card.w, card.h);
        cropped.appendChild(img);
        wrapper.appendChild(cropped);
    }
    else {
        const img = document.createElement('img');
        img.src = card.src || '';
        wrapper.appendChild(img);
    }
    inner.appendChild(wrapper);
}
function renderVideoContent(card, inner) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card-media-wrapper';
    const video = document.createElement('video');
    video.src = card.src || '';
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    if (card.trim) {
        video.addEventListener('loadedmetadata', () => {
            video.currentTime = card.trim?.start || 0;
        });
        video.addEventListener('timeupdate', () => {
            if (card.trim?.end && video.currentTime >= card.trim.end) {
                video.currentTime = card.trim.start || 0;
            }
        });
    }
    if (card.crop) {
        const cropped = document.createElement('div');
        cropped.className = 'card-media-cropped';
        applyInRendererCrop(video, card.crop, card.w, card.h);
        cropped.appendChild(video);
        wrapper.appendChild(cropped);
    }
    else {
        wrapper.appendChild(video);
    }
    const badge = document.createElement('div');
    badge.className = 'card-video-indicator';
    badge.textContent = 'VIDEO';
    wrapper.appendChild(badge);
    inner.appendChild(wrapper);
}
export function applyInRendererCrop(element, crop, containerW, containerH) {
    const scaleX = 100 / crop.w;
    const scaleY = 100 / crop.h;
    const offsetX = -(crop.x * containerW * (scaleX / 100));
    const offsetY = -(crop.y * containerH * (scaleY / 100));
    element.style.width = `${containerW * scaleX}px`;
    element.style.height = `${containerH * scaleY}px`;
    element.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0px)`;
}
