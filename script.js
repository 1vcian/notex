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
            // Check for potential legacy format (mode|content) but always ignore the mode
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

function getCursorLine() {
    const textBeforeCursor = editor.value.substring(0, editor.selectionStart);
    return textBeforeCursor.split('\n').length - 1;
}

function render() {
    const content = editor.value;
    charCount.textContent = `${content.length} characters`;

    if (modeToggle.checked) {
        // Full Preview Mode (marked.js)
        preview.innerHTML = marked.parse(content);
    } else {
        // Editor Mode (Interactive Overlay)
        const currentLineIndex = getCursorLine();
        const lines = content.split('\n');

        preview.innerHTML = lines.map((line, i) => {
            let renderedLine = line;
            const isActive = (i === currentLineIndex);

            // Escape HTML
            renderedLine = renderedLine.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            // Custom Regex Highlighter (Char-preserving)
            renderedLine = renderedLine.replace(/^(#+ )(.*)/, '<span class="md-header"><span class="md-tag">$1</span>$2</span>');
            renderedLine = renderedLine.replace(/(\*\*)(.*?)(\*\*)/g, '<span class="md-bold"><span class="md-tag">$1</span>$2<span class="md-tag">$3</span></span>');
            renderedLine = renderedLine.replace(/(\*)(.*?)(\*)/g, '<span class="md-italic"><span class="md-tag">$1</span>$2<span class="md-tag">$3</span></span>');
            renderedLine = renderedLine.replace(/(`)(.*?)(`)/g, '<span class="md-code"><span class="md-tag">$1</span>$2<span class="md-tag">$3</span></span>');

            return `<div class="line ${isActive ? 'active' : ''}">${renderedLine || ' '}</div>`;
        }).join('');

        // Sync scrolling
        preview.scrollTop = editor.scrollTop;
    }

    // URL Update Logic (Only content)
    if (content !== lastSavedContent) {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(updateURL, 15);
    }
}

function updateURL() {
    const content = editor.value;

    try {
        const compressed = LZString.compressToEncodedURIComponent(content);
        // Only content in the hash, no UI state
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
