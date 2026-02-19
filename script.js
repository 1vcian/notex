const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const status = document.getElementById('status');
const charCount = document.getElementById('char-count');
const copyBtn = document.getElementById('copy-link');
const modeToggle = document.getElementById('mode-toggle');
const wrapper = document.getElementById('editor-wrapper');

// markdown-it instance: GFM-like, supports fenced code blocks, linkify
const md = window.markdownit({ html: false, linkify: true, typographer: true, breaks: true });

let lastSavedContent = '';
let updateTimeout = null;

// Initialize
window.addEventListener('load', () => {
    const hash = window.location.hash.substring(1);

    // Always start in View mode
    modeToggle.checked = true;
    wrapper.classList.add('preview-mode');

    if (hash) {
        // Priority 1: URL hash
        try {
            let compressed = hash;
            if (hash.includes('|')) compressed = hash.split('|')[1];
            const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
            if (decompressed !== null) editor.value = decompressed;
        } catch (e) {
            console.error('Failed to restore from URL', e);
        }
    } else {
        // Priority 2: localStorage
        const saved = localStorage.getItem('notes-content');
        if (saved) {
            editor.value = saved;
        } else {
            // Priority 3: default text
            editor.value = "# Welcome to Notes\n\nStart typing to create your shared note.\n\n- Real-time rendering\n- Character alignment\n- URL-based sharing";
        }
    }

    render();
});

function render() {
    const content = editor.value;
    const cursor = editor.selectionStart;
    charCount.textContent = `${content.length} characters`;

    if (modeToggle.checked) {
        // Full View Mode (markdown-it)
        const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        preview.innerHTML = md.render(normalized);
    } else {
        // Edit Mode (PrismJS)
        // Highlight the content using Prism
        const highlighted = Prism.highlight(content, Prism.languages.markdown, 'markdown');

        // Wrap in a code element to match typical Prism selectors and ensure proper scoping if needed
        // Note: We need to preserve the trailing newline behavior visually
        preview.innerHTML = `<code class="language-markdown">${highlighted}</code>` + (content.endsWith('\n') ? '<br>' : '');
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
        localStorage.setItem('notes-content', content);
        status.textContent = 'Saved';
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
