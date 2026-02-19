const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const status = document.getElementById('status');
const charCount = document.getElementById('char-count');
const copyBtn = document.getElementById('copy-link');
const modeToggle = document.getElementById('mode-toggle');
const wrapper = document.getElementById('editor-wrapper');

let lastSavedContent = '';
let updateTimeout = null;

// Initialize
window.addEventListener('load', () => {
    const hash = window.location.hash.substring(1);

    // Always start in View mode
    modeToggle.checked = true;
    wrapper.classList.add('preview-mode');

    // Default starting text if empty
    if (!hash && !editor.value) {
        editor.value = "# Welcome to Notes\n\nStart typing to create your shared note.\n\n- Real-time rendering\n- Character alignment\n- URL-based sharing";
    }

    if (hash) {
        try {
            let compressed = hash;
            if (hash.includes('|')) {
                compressed = hash.split('|')[1];
            }

            const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
            if (decompressed !== null) {
                editor.value = decompressed;
            }
        } catch (e) {
            console.error('Failed to restore state', e);
        }
    }

    render();
});

function render() {
    const content = editor.value;
    const cursor = editor.selectionStart;
    charCount.textContent = `${content.length} characters`;

    if (modeToggle.checked) {
        // Full View Mode (marked.js)
        preview.innerHTML = marked.parse(content);
    } else {
        // Edit Mode (Interactive Overlay with Multi-line support)
        let html = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Define patterns and their replacement logic
        // We use a list of matchers to handle overlapping/sequential tags
        const patterns = [
            // Headings (single line by nature but handled here)
            { regex: /^(#+ )(.*)/gm, type: 'header', tags: [1] },
            // Bold (**text** or __text__)
            { regex: /(\*\*|__)([\s\S]*?)(\1)/g, type: 'bold', tags: [1, 3] },
            // Italic (*text* or _text_)
            { regex: /(\*|_)([\s\S]*?)(\1)/g, type: 'italic', tags: [1, 3] },
            // Inline Code (`text`)
            { regex: /(`)([\s\S]*?)(`)/g, type: 'code', tags: [1, 3] },
            // Block Code (```text```)
            { regex: /(```)([\s\S]*?)(```)/g, type: 'block-code', tags: [1, 3] }
        ];

        // To apply highlights without breaking character offsets in nested steps, 
        // we'll use a placeholder system or a sophisticated single-pass approach.
        // For simplicity and correctness in alignment, we apply tags manually.

        let result = html;
        let offsetAdjust = 0;

        // Note: Simple regex replacement doesn't easily allow "cursor inside" check 
        // while preserving HTML safety. Let's use a more robust tokenization.

        const rawContent = content;
        let tokens = [{ text: rawContent, type: 'text', start: 0, end: rawContent.length }];

        patterns.forEach(p => {
            let nextTokens = [];
            tokens.forEach(token => {
                if (token.type !== 'text') {
                    nextTokens.push(token);
                    return;
                }

                let lastIdx = 0;
                let match;
                while ((match = p.regex.exec(token.text)) !== null) {
                    // Pull out text before match
                    if (match.index > lastIdx) {
                        const preText = token.text.substring(lastIdx, match.index);
                        nextTokens.push({ text: preText, type: 'text', start: token.start + lastIdx, end: token.start + match.index });
                    }

                    // The match handles the whole thing
                    const matchStart = token.start + match.index;
                    const matchEnd = matchStart + match[0].length;

                    // Check if cursor is inside this specific match range
                    const isCursorInside = (cursor >= matchStart && cursor <= matchEnd);

                    nextTokens.push({
                        text: match[0],
                        type: p.type,
                        start: matchStart,
                        end: matchEnd,
                        isActive: isCursorInside,
                        groups: match // Store groups for tag-specific wrapping
                    });

                    lastIdx = p.regex.lastIndex;
                }

                if (lastIdx < token.text.length) {
                    const postText = token.text.substring(lastIdx);
                    nextTokens.push({ text: postText, type: 'text', start: token.start + lastIdx, end: token.end });
                }
            });
            tokens = nextTokens;
            p.regex.lastIndex = 0; // Reset for next pass (important for gm/g)
        });

        const finalHtml = tokens.map(t => {
            let escaped = t.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            if (t.type === 'text') return escaped;

            // Re-wrap groups with tags
            // This is a bit complex because we need to know WHERE the tags are.
            // For Bold/Italic/Code it's usually at start and end.

            let wrapped = escaped;
            const tagClass = t.isActive ? 'md-tag' : 'md-tag faded';

            if (t.type === 'header') {
                const spaceIdx = escaped.indexOf(' ');
                const tags = escaped.substring(0, spaceIdx + 1);
                const text = escaped.substring(spaceIdx + 1);
                wrapped = `<span class="md-header"><span class="${tagClass}">${tags}</span>${text}</span>`;
            } else if (['bold', 'italic', 'code', 'block-code'].includes(t.type)) {
                // Find tag length based on type
                let tagLen = 1;
                if (t.type === 'bold') tagLen = 2;
                if (t.type === 'block-code') tagLen = 3;

                const startTag = escaped.substring(0, tagLen);
                const middleText = escaped.substring(tagLen, escaped.length - tagLen);
                const endTag = escaped.substring(escaped.length - tagLen);

                wrapped = `<span class="md-${t.type}"><span class="${tagClass}">${startTag}</span>${middleText}<span class="${tagClass}">${endTag}</span></span>`;
            }

            return wrapped;
        }).join('');

        preview.innerHTML = finalHtml + (content.endsWith('\n') ? '<br>' : '');
        preview.scrollTop = editor.scrollTop;
    }

    if (content !== lastSavedContent) {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(updateURL, 15);
    }
}

function updateURL() {
    const content = editor.value;
    try {
        const compressed = LZString.compressToEncodedURIComponent(content);
        window.history.replaceState(null, '', '#' + compressed);
        status.textContent = 'Saved in URL';
        lastSavedContent = content;
        setTimeout(() => status.textContent = 'All caught up', 1000);
    } catch (e) {
        status.textContent = 'Error saving';
        console.error(e);
    }
}

// Events
editor.addEventListener('input', render);
editor.addEventListener('keydown', () => setTimeout(render, 0));
editor.addEventListener('mousedown', () => setTimeout(render, 0));
editor.addEventListener('scroll', () => {
    if (!modeToggle.checked) preview.scrollTop = editor.scrollTop;
});

modeToggle.addEventListener('change', () => {
    if (modeToggle.checked) {
        wrapper.classList.add('preview-mode');
    } else {
        wrapper.classList.remove('preview-mode');
        setTimeout(() => editor.focus(), 50);
    }
    render();
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    });
});
