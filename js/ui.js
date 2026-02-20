import { state, saveState } from './state.js';
import { generateName, getUniqueName, createNewFile } from './utils.js';

export const DOM = {
    editor: document.getElementById('editor'),
    preview: document.getElementById('preview'),
    status: document.getElementById('status'),
    charCount: document.getElementById('char-count'),
    copyBtn: document.getElementById('copy-link'),
    modeToggle: document.getElementById('mode-toggle'),
    wrapper: document.getElementById('editor-wrapper'),
    sidebarList: document.getElementById('file-list'),
    newNoteBtn: document.getElementById('new-note-btn'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    sidebar: document.getElementById('sidebar'),
    deleteModal: document.getElementById('delete-modal'),
    confirmDeleteBtn: document.getElementById('confirm-delete'),
    cancelDeleteBtn: document.getElementById('cancel-delete')
};

// markdown-it instance: GFM-like, supports fenced code blocks, linkify
export const md = window.markdownit({ html: false, linkify: true, typographer: true, breaks: true });

export let lastSavedContent = '';
export let updateTimeout = null;

export function loadActiveFile() {
    const file = state.files.find(f => f.id === state.activeId);
    if (file) {
        DOM.editor.value = file.content;
        lastSavedContent = file.content;
        render(); // render preview

        // Update the URL so the "Copy Link" button grabs the hash for the active file
        try {
            const compressed = LZString.compressToEncodedURIComponent(file.content);
            window.history.replaceState(null, '', '#' + compressed);
        } catch (e) {
            console.error(e);
        }
    }
}

export function renderSidebar() {
    DOM.sidebarList.innerHTML = '';

    // Sort files by updated date descending
    const sortedFiles = [...state.files].sort((a, b) => b.updated - a.updated);

    sortedFiles.forEach(file => {
        const div = document.createElement('div');
        div.className = `file-item ${file.id === state.activeId ? 'active' : ''}`;

        const infoDiv = document.createElement('div');
        infoDiv.className = 'file-info';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'file-name';
        nameSpan.textContent = file.name;

        const dateSpan = document.createElement('span');
        dateSpan.className = 'file-date';
        dateSpan.textContent = new Date(file.updated).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(dateSpan);

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.title = 'Delete Note';
        delBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';

        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openDeleteModal(file.id);
        });

        div.appendChild(infoDiv);
        div.appendChild(delBtn);

        div.addEventListener('click', () => {
            if (state.activeId !== file.id) {
                // Focus out of editor to cleanly save state
                DOM.editor.blur();
                state.activeId = file.id;
                saveState();
                renderSidebar();
                loadActiveFile();
                if (window.innerWidth < 768) {
                    DOM.sidebar.classList.add('hidden');
                }
            }
        });

        DOM.sidebarList.appendChild(div);
    });
}

export function render() {
    const content = DOM.editor.value;
    DOM.charCount.textContent = `${content.length} characters`;

    if (DOM.modeToggle.checked) {
        // Full View Mode (markdown-it)
        const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        DOM.preview.innerHTML = md.render(normalized);
    } else {
        // Edit Mode (PrismJS)
        const highlighted = Prism.highlight(content, Prism.languages.markdown, 'markdown');
        DOM.preview.innerHTML = `<code class="language-markdown">${highlighted}</code>` + (content.endsWith('\n') ? '<br>' : '');
        DOM.preview.scrollTop = DOM.editor.scrollTop;
    }

    if (content !== lastSavedContent) {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(saveCurrentFile, 300); // 300ms debounce
    }
}

export function saveCurrentFile() {
    const content = DOM.editor.value;
    const file = state.files.find(f => f.id === state.activeId);
    if (!file) return;

    file.content = content;

    // Check if the name should update
    const previousName = file.name;
    const potentialNewName = generateName(state.files, content);

    // Simple heuristic: if the first line changed, update the name, keeping uniqueness intact
    if (previousName.startsWith('Untitled Note') || !previousName.includes(potentialNewName.replace(/ - \d+$/, ''))) {
        file.name = getUniqueName(state.files, potentialNewName, file.id);
    }

    file.updated = Date.now();

    saveState();
    renderSidebar();

    try {
        const compressed = LZString.compressToEncodedURIComponent(content);
        window.history.replaceState(null, '', '#' + compressed);
        DOM.status.textContent = 'Saved';
        lastSavedContent = content;
        setTimeout(() => DOM.status.textContent = 'All caught up', 1000);
    } catch (e) {
        DOM.status.textContent = 'Error saving';
        console.error(e);
    }
}

// Modal Logic
export function openDeleteModal(id) {
    state.fileToDelete = id;
    DOM.deleteModal.classList.add('visible');
}

export function closeDeleteModal() {
    state.fileToDelete = null;
    DOM.deleteModal.classList.remove('visible');
}
