import { state, saveState, syncState } from './state.js';
import { createNewFile, decompressFromURL } from './utils.js';
import { DOM, loadActiveFile, renderSidebar, render, closeDeleteModal, lastSavedContent } from './ui.js';

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
