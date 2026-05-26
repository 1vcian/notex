import { state, saveState, syncState } from './state.js';
import { createNewFile, decompressFromURL } from './utils.js';
import { DOM, loadActiveFile, renderSidebar, render, closeDeleteModal, lastSavedContent, md } from './ui.js';

// Initialize
window.addEventListener('load', () => {
    syncState();
    // Always start in View mode
    DOM.modeToggle.checked = true;
    DOM.wrapper.classList.add('preview-mode');

    const hash = window.location.hash.substring(1);

    // Check if we need to load a link
    let hashContent = null;
    if (hash) {
        hashContent = decompressFromURL(hash);
    }

    if (state.files.length === 0) {
        // Migration from old single-file version
        const oldSaved = localStorage.getItem('notes-content');
        if (oldSaved) {
            state.files.push(createNewFile(state.files, oldSaved));
        }
    }

    if (hashContent) {
        // If content exactly matches an existing file, switch to it,
        // otherwise create a new file safely without overwriting
        const existing = state.files.find(f => f.content === hashContent);
        if (existing) {
            state.activeId = existing.id;
        } else {
            const newFile = createNewFile(state.files, hashContent);
            state.files.push(newFile);
            state.activeId = newFile.id;
        }
        // Remove hash from URL to avoid repeated imports on reload
        window.history.replaceState(null, '', window.location.pathname);
    } else {
        if (state.files.length === 0) {
            const defaultText = "# Welcome to Notes\n\nStart typing to create your shared note.\n\n- Real-time rendering\n- Character alignment\n- URL-based sharing\n- **New:** Manage multiple files!";
            const newFile = createNewFile(state.files, defaultText);
            state.files.push(newFile);
            state.activeId = newFile.id;
        }
    }

    // Ensure activeId is valid
    if (!state.activeId || !state.files.find(f => f.id === state.activeId)) {
        state.activeId = state.files[0].id;
    }

    saveState();
    renderSidebar();
    loadActiveFile();

    // Auto-hide sidebar on mobile
    if (window.innerWidth < 768) {
        DOM.sidebar.classList.add('hidden');
    }
});

// Handle URL changes when the user is already on the page
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    let hashContent = decompressFromURL(hash);

    if (hashContent) {
        syncState();
        const existing = state.files.find(f => f.content === hashContent);
        if (existing) {
            if (state.activeId !== existing.id) {
                DOM.editor.blur(); // Trigger any final saves on current file
                state.activeId = existing.id;
                saveState();
                renderSidebar();
                loadActiveFile();
            }
        } else {
            DOM.editor.blur(); // Trigger any final saves on current file
            const newFile = createNewFile(state.files, hashContent);
            state.files.push(newFile);
            state.activeId = newFile.id;
            saveState();
            renderSidebar();
            loadActiveFile();
        }
    }
});

// Modal Events
DOM.cancelDeleteBtn.addEventListener('click', closeDeleteModal);

DOM.confirmDeleteBtn.addEventListener('click', () => {
    if (state.fileToDelete) {
        syncState();
        state.files = state.files.filter(f => f.id !== state.fileToDelete);

        if (state.files.length === 0) {
            const newFile = createNewFile(state.files, "# Welcome to Notes\n\nStart typing to create your shared note.");
            state.files.push(newFile);
            state.activeId = newFile.id;
        } else if (state.activeId === state.fileToDelete) {
            // Sort to find the most recently updated to switch to
            const sorted = [...state.files].sort((a, b) => b.updated - a.updated);
            state.activeId = sorted[0].id;
        }

        saveState();
        renderSidebar();
        loadActiveFile();

        // Push a generic URL so the deleted content link doesn't stay
        window.history.replaceState(null, '', window.location.pathname);
    }
    closeDeleteModal();
});

// Click outside modal to close
DOM.deleteModal.addEventListener('click', (e) => {
    if (e.target === DOM.deleteModal) closeDeleteModal();
});

// UI Events
DOM.sidebarToggle.addEventListener('click', () => {
    DOM.sidebar.classList.toggle('hidden');
});

DOM.newNoteBtn.addEventListener('click', () => {
    syncState();
    const newFile = createNewFile(state.files, '');
    state.files.push(newFile);
    state.activeId = newFile.id;
    saveState();
    renderSidebar();
    loadActiveFile();

    if (DOM.modeToggle.checked) {
        DOM.modeToggle.checked = false;
        DOM.wrapper.classList.remove('preview-mode');
    }
    setTimeout(() => DOM.editor.focus(), 50);
    if (window.innerWidth < 768) {
        DOM.sidebar.classList.add('hidden');
    }
});

DOM.editor.addEventListener('input', render);
DOM.editor.addEventListener('keydown', () => setTimeout(render, 0));
DOM.editor.addEventListener('mousedown', () => setTimeout(render, 0));
DOM.editor.addEventListener('scroll', () => {
    if (!DOM.modeToggle.checked) DOM.preview.scrollTop = DOM.editor.scrollTop;
});

DOM.modeToggle.addEventListener('change', () => {
    if (DOM.modeToggle.checked) {
        DOM.wrapper.classList.add('preview-mode');
    } else {
        DOM.wrapper.classList.remove('preview-mode');
        setTimeout(() => DOM.editor.focus(), 50);
    }
    render();
});

DOM.copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
        const originalText = DOM.copyBtn.textContent;
        DOM.copyBtn.textContent = 'Copied!';
        setTimeout(() => DOM.copyBtn.textContent = originalText, 2000);
    });
});

// Dropdown Toggle
DOM.downloadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    DOM.downloadDropdown.classList.toggle('open');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!DOM.downloadDropdown.contains(e.target)) {
        DOM.downloadDropdown.classList.remove('open');
    }
});

// Helper for exporting text files (MD and TXT)
function downloadTextFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Helper for exporting high-quality vector PDF using print layout
function exportToPDF(file) {
    if (!file) return;

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    // Render markdown to HTML
    const renderedHTML = md.render(file.content);

    // Write document to iframe with a custom print layout stylesheet
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${file.name}</title>
            <style>
                body {
                    background: white !important;
                    color: black !important;
                    padding: 40px !important;
                    overflow: visible !important;
                    height: auto !important;
                }
                .markdown-body {
                    background: white !important;
                    color: #24292f !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
                    line-height: 1.6;
                }
                h1, h2, h3, h4, h5, h6 {
                    color: black !important;
                    border-bottom: 1px solid #d0d7de !important;
                    padding-bottom: 0.3em;
                    margin-top: 24px;
                    margin-bottom: 16px;
                    page-break-after: avoid;
                }
                h1 { font-size: 2em; }
                h2 { font-size: 1.5em; }
                h3 { font-size: 1.25em; }
                p {
                    margin-top: 0;
                    margin-bottom: 16px;
                    word-wrap: break-word;
                }
                pre {
                    background-color: #f6f8fa !important;
                    border: 1px solid #d0d7de !important;
                    border-radius: 6px !important;
                    padding: 16px !important;
                    white-space: pre-wrap !important;
                    word-wrap: break-word !important;
                    margin-bottom: 16px;
                }
                code {
                    background-color: rgba(175, 184, 193, 0.2) !important;
                    color: #24292f !important;
                    font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace !important;
                    font-size: 85% !important;
                    padding: 0.2em 0.4em !important;
                    border-radius: 6px !important;
                }
                pre>code {
                    background-color: transparent !important;
                    padding: 0 !important;
                    font-size: 100% !important;
                    border-radius: 0 !important;
                    word-break: normal !important;
                    white-space: pre !important;
                }
                blockquote {
                    border-left: .25em solid #d0d7de !important;
                    color: #57606a !important;
                    padding: 0 1em !important;
                    margin: 0 0 16px 0 !important;
                }
                a {
                    color: #0969da !important;
                    text-decoration: none !important;
                }
                ul, ol {
                    padding-left: 2em !important;
                    margin-bottom: 16px !important;
                    margin-top: 0;
                }
                li {
                    margin-top: 0.25em;
                }
                img {
                    max-width: 100% !important;
                }
                @media print {
                    @page {
                        margin: 20mm;
                    }
                    body {
                        padding: 0 !important;
                    }
                }
            </style>
        </head>
        <body class="preview-mode">
            <div class="markdown-body">
                ${renderedHTML}
            </div>
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 250);
                };
            </script>
        </body>
        </html>
    `);
    doc.close();

    // Remove the iframe after printing (afterprint works when print dialog is accepted or cancelled)
    iframe.contentWindow.addEventListener('afterprint', () => {
        document.body.removeChild(iframe);
    });
}

// Download action handlers
DOM.downloadMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.dropdown-item');
    if (!item) return;

    const format = item.dataset.format;
    syncState();
    const file = state.files.find(f => f.id === state.activeId);
    if (!file) return;

    // Sanitize filename to avoid invalid characters
    const safeName = file.name.replace(/[/\\?%*:|"<>]/g, '-');

    if (format === 'pdf') {
        exportToPDF(file);
    } else if (format === 'md') {
        downloadTextFile(file.content, `${safeName}.md`, 'text/markdown;charset=utf-8');
    } else if (format === 'txt') {
        downloadTextFile(file.content, `${safeName}.txt`, 'text/plain;charset=utf-8');
    }

    DOM.downloadDropdown.classList.remove('open');
});

// Sync state across multiple tabs
window.addEventListener('storage', (e) => {
    if (e.key === 'notex-files' && e.newValue) {
        try {
            const newFiles = JSON.parse(e.newValue);
            if (Array.isArray(newFiles)) {
                state.files = newFiles;
                renderSidebar();

                const activeFile = state.files.find(f => f.id === state.activeId);
                if (activeFile) {
                    if (DOM.editor.value === lastSavedContent && activeFile.content !== lastSavedContent) {
                        loadActiveFile();
                    }
                } else if (state.files.length > 0) {
                    // Current active file was deleted in another tab
                    state.activeId = state.files[0].id;
                    saveState();
                    renderSidebar();
                    loadActiveFile();
                }
            }
        } catch (err) {
            console.error('Failed to sync across tabs', err);
        }
    }

    // If the active ID changed in another tab, we might want to know (optional)
    // but the user specifically asked about the "file list" not updating.
    // However, if some tab adds a file and sets it as active,
    // notex-files will change anyway because of the new file object.
});
