export const MathParser = {
    rawTexRegex: /\\(?:frac|sqrt|sum|int|prod|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|tau|phi|omega|times|div|pm|neq|le|ge|approx|infty|partial|nabla|vec|mathbf|mathcal)\b/i,
    renderToHtml(text) {
        if (!text)
            return '';
        const mathPlaceholders = [];
        let processed = text;
        const trimmed = text.trim();
        if (!trimmed.includes('$') && this.rawTexRegex.test(trimmed)) {
            return this.renderKatex(trimmed, trimmed.includes('\\\\') || trimmed.includes('\\begin'));
        }
        // Replace $$...$$
        processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_match, formula) => {
            const id = `__MATH_PLACEHOLDER_${mathPlaceholders.length}__`;
            mathPlaceholders.push(this.renderKatex(formula, true));
            return id;
        });
        // Replace \[...\]
        processed = processed.replace(/\\\[([\s\S]+?)\\\]/g, (_match, formula) => {
            const id = `__MATH_PLACEHOLDER_${mathPlaceholders.length}__`;
            mathPlaceholders.push(this.renderKatex(formula, true));
            return id;
        });
        // Replace \(...\)
        processed = processed.replace(/\\\(([\s\S]+?)\\\)/g, (_match, formula) => {
            const id = `__MATH_PLACEHOLDER_${mathPlaceholders.length}__`;
            mathPlaceholders.push(this.renderKatex(formula, false));
            return id;
        });
        // Replace $...$
        processed = processed.replace(/(^|[^\\])\$([^\$]+?)\$/g, (match, prefix, formula) => {
            if (/[a-zA-Z\\_^=+\-*/{}]/.test(formula)) {
                const id = `__MATH_PLACEHOLDER_${mathPlaceholders.length}__`;
                mathPlaceholders.push(this.renderKatex(formula, false));
                return prefix + id;
            }
            return match;
        });
        // Auto-recognize standalone raw LaTeX segments like \frac{a}{b}
        processed = processed.replace(/(\\(?:frac\{[^}]*\}\{[^}]*\}|sqrt\{[^}]*\}|[a-zA-Z]+_[0-9a-zA-Z]+))/g, (_match, formula) => {
            const id = `__MATH_PLACEHOLDER_${mathPlaceholders.length}__`;
            mathPlaceholders.push(this.renderKatex(formula, false));
            return id;
        });
        // Process basic Markdown for formatting
        let html = this.escapeHtml(processed);
        mathPlaceholders.forEach((mathHtml, idx) => {
            html = html.split(`__MATH_PLACEHOLDER_${idx}__`).join(mathHtml);
        });
        html = html.replace(/^### (.*$)/gim, '<h3 style="margin:2px 0 6px 0;font-size:14px;font-weight:600;">$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2 style="margin:2px 0 6px 0;font-size:15px;font-weight:600;">$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1 style="margin:2px 0 6px 0;font-size:16px;font-weight:600;">$1</h1>');
        html = html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
        html = html.replace(/~([^~]+)~/g, '<u>$1</u>');
        html = html.replace(/\n/g, '<br>');
        return html;
    },
    renderKatex(math, displayMode) {
        if (typeof window !== 'undefined' && window.katex) {
            try {
                return window.katex.renderToString(math.trim(), {
                    displayMode,
                    throwOnError: false
                });
            }
            catch {
                return `<span class="katex-error">${this.escapeHtml(math)}</span>`;
            }
        }
        return this.escapeHtml(math);
    },
    escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};
