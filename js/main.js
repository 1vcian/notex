import { state, saveState } from './state.js';
import { createNewFile } from './utils.js';
import { DOM, loadActiveFile, renderSidebar, render, closeDeleteModal } from './ui.js';

// Initialize
window.addEventListener('load', () => {
    // Always start in View mode
    DOM.modeToggle.checked = true;
    DOM.wrapper.classList.add('preview-mode');

    const hash = window.location.hash.substring(1);

    // Check if we need to load a link
    let hashContent = null;
    if (hash) {
        try {
            let compressed = hash;
            if (hash.includes('|')) compressed = hash.split('|')[1];
            const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
            if (decompressed !== null) hashContent = decompressed;
        } catch (e) { }
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

    let hashContent = null;
    try {
        let compressed = hash;
        if (hash.includes('|')) compressed = hash.split('|')[1];
        const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
        if (decompressed !== null) hashContent = decompressed;
    } catch (e) { }

    if (hashContent) {
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
