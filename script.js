const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const status = document.getElementById('status');
const charCount = document.getElementById('char-count');
const copyBtn = document.getElementById('copy-link');

let lastSavedContent = '';
let updateTimeout = null;

// Initialize
window.addEventListener('load', () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
        try {
            const decompressed = LZString.decompressFromEncodedURIComponent(hash);
            if (decompressed) {
                editor.value = decompressed;
                updatePreview();
            }
        } catch (e) {
            console.error('Failed to decompress content from URL', e);
        }
    }
});

function updatePreview() {
    const content = editor.value;

    // Configure marked to handle synchronous rendering safely
    preview.innerHTML = marked.parse(content);
    charCount.textContent = `${content.length} caratteri`;

    // Sync scrolling (preview follows editor)
    preview.scrollTop = editor.scrollTop;

    // Schedule URL update (every 15ms if modified)
    if (content !== lastSavedContent) {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(updateURL, 15);
    }
}

function updateURL() {
    const content = editor.value;
    if (content === lastSavedContent) return;

    try {
        const compressed = LZString.compressToEncodedURIComponent(content);
        // Use replaceState to not pollute history while typing fast
        window.history.replaceState(null, '', '#' + compressed);

        status.textContent = 'URL aggiornato';
        lastSavedContent = content;

        setTimeout(() => {
            status.textContent = 'Tutto aggiornato';
        }, 1000);
    } catch (e) {
        status.textContent = 'Errore salvataggio URL';
        console.error(e);
    }
}

// Sync scrolling
editor.addEventListener('scroll', () => {
    preview.scrollTop = editor.scrollTop;
});

editor.addEventListener('input', updatePreview);

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    });
});
