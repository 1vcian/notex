const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const status = document.getElementById('status');
const charCount = document.getElementById('char-count');
const copyBtn = document.getElementById('copy-link');
const modeToggle = document.getElementById('mode-toggle');
const wrapper = document.getElementById('editor-wrapper');

// Sidebar and Modal elements
const sidebarList = document.getElementById('file-list');
const newNoteBtn = document.getElementById('new-note-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');

// markdown-it instance: GFM-like, supports fenced code blocks, linkify
const md = window.markdownit({ html: false, linkify: true, typographer: true, breaks: true });

let lastSavedContent = '';
let updateTimeout = null;

// File Management State
let files = JSON.parse(localStorage.getItem('notex-files')) || [];
let activeId = localStorage.getItem('notex-active-id');
let fileToDelete = null;

// Initialize
window.addEventListener('load', () => {
    // Always start in View mode
    modeToggle.checked = true;
    wrapper.classList.add('preview-mode');

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

    if (files.length === 0) {
        // Migration from old single-file version
        const oldSaved = localStorage.getItem('notes-content');
        if (oldSaved) {
            files.push(createNewFile(oldSaved));
        }
    }

    if (hashContent) {
        // If content exactly matches an existing file, switch to it,
        // otherwise create a new file safely without overwriting
        const existing = files.find(f => f.content === hashContent);
        if (existing) {
            activeId = existing.id;
        } else {
            const newFile = createNewFile(hashContent);
            files.push(newFile);
            activeId = newFile.id;
        }
        // Remove hash from URL to avoid repeated imports on reload
        window.history.replaceState(null, '', window.location.pathname);
    } else {
        if (files.length === 0) {
            const defaultText = "# Welcome to Notes\n\nStart typing to create your shared note.\n\n- Real-time rendering\n- Character alignment\n- URL-based sharing\n- **New:** Manage multiple files!";
            const newFile = createNewFile(defaultText);
            files.push(newFile);
            activeId = newFile.id;
        }
    }

    // Ensure activeId is valid
    if (!activeId || !files.find(f => f.id === activeId)) {
        activeId = files[0].id;
    }

    saveState();
    renderSidebar();
    loadActiveFile();

    // Auto-hide sidebar on mobile
    if (window.innerWidth < 768) {
        sidebar.classList.add('hidden');
    }
});

// Handle URL changes when the user is already on the page (e.g. pasting a different link and pressing enter)
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
        const existing = files.find(f => f.content === hashContent);
        if (existing) {
            if (activeId !== existing.id) {
                editor.blur(); // Trigger any final saves on current file
                activeId = existing.id;
                saveState();
                renderSidebar();
                loadActiveFile();
            }
        } else {
            editor.blur(); // Trigger any final saves on current file
            const newFile = createNewFile(hashContent);
            files.push(newFile);
            activeId = newFile.id;
            saveState();
            renderSidebar();
            loadActiveFile();
        }
    }
});

function createNewFile(initialContent = '') {
    return {
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: generateName(initialContent),
        content: initialContent,
        updated: Date.now()
    };
}

function generateName(content) {
    if (!content.trim()) return getUniqueName("Untitled Note");
    const firstLine = content.split('\n')[0].replace(/^#+\s*/, '').trim();
    if (!firstLine) return getUniqueName("Untitled Note");
    return getUniqueName(firstLine.substring(0, 40));
}

function getUniqueName(baseName, currentId = null) {
    let finalName = baseName;
    let counter = 1;
    // Check if any existing file (except the current one) has this exact name
    while (files.some(f => f.name === finalName && f.id !== currentId)) {
        finalName = `${baseName} - ${counter}`;
        counter++;
    }
    return finalName;
}

function saveState() {
    localStorage.setItem('notex-files', JSON.stringify(files));
    localStorage.setItem('notex-active-id', activeId);
}

function loadActiveFile() {
    const file = files.find(f => f.id === activeId);
    if (file) {
        editor.value = file.content;
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

function renderSidebar() {
    sidebarList.innerHTML = '';

    // Sort files by updated date descending
    const sortedFiles = [...files].sort((a, b) => b.updated - a.updated);

    sortedFiles.forEach(file => {
        const div = document.createElement('div');
        div.className = `file-item ${file.id === activeId ? 'active' : ''}`;

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
            if (activeId !== file.id) {
                // Focus out of editor to cleanly save state
                editor.blur();
                activeId = file.id;
                saveState();
                renderSidebar();
                loadActiveFile();
                if (window.innerWidth < 768) {
                    sidebar.classList.add('hidden');
                }
            }
        });

        sidebarList.appendChild(div);
    });
}

function render() {
    const content = editor.value;
    charCount.textContent = `${content.length} characters`;

    if (modeToggle.checked) {
        // Full View Mode (markdown-it)
        const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        preview.innerHTML = md.render(normalized);
    } else {
        // Edit Mode (PrismJS)
        const highlighted = Prism.highlight(content, Prism.languages.markdown, 'markdown');
        preview.innerHTML = `<code class="language-markdown">${highlighted}</code>` + (content.endsWith('\n') ? '<br>' : '');
        preview.scrollTop = editor.scrollTop;
    }

    if (content !== lastSavedContent) {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(saveCurrentFile, 300); // 300ms debounce
    }
}

function saveCurrentFile() {
    const content = editor.value;
    const file = files.find(f => f.id === activeId);
    if (!file) return;

    file.content = content;

    // Check if the name should update
    const previousName = file.name;
    const potentialNewName = generateName(content);

    // Simple heuristic: if the first line changed, update the name, keeping uniqueness intact
    if (previousName.startsWith('Untitled Note') || !previousName.includes(potentialNewName.replace(/ - \d+$/, ''))) {
        file.name = getUniqueName(potentialNewName, file.id);
    }

    file.updated = Date.now();

    saveState();
    renderSidebar();

    try {
        const compressed = LZString.compressToEncodedURIComponent(content);
        window.history.replaceState(null, '', '#' + compressed);
        status.textContent = 'Saved';
        lastSavedContent = content;
        setTimeout(() => status.textContent = 'All caught up', 1000);
    } catch (e) {
        status.textContent = 'Error saving';
        console.error(e);
    }
}

// Modal Logic
function openDeleteModal(id) {
    fileToDelete = id;
    deleteModal.classList.add('visible');
}

function closeDeleteModal() {
    fileToDelete = null;
    deleteModal.classList.remove('visible');
}

cancelDeleteBtn.addEventListener('click', closeDeleteModal);

confirmDeleteBtn.addEventListener('click', () => {
    if (fileToDelete) {
        files = files.filter(f => f.id !== fileToDelete);

        if (files.length === 0) {
            const newFile = createNewFile("# Welcome to Notes\n\nStart typing to create your shared note.");
            files.push(newFile);
            activeId = newFile.id;
        } else if (activeId === fileToDelete) {
            // Sort to find the most recently updated to switch to
            const sorted = [...files].sort((a, b) => b.updated - a.updated);
            activeId = sorted[0].id;
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
deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteModal();
});

// Events
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
});

newNoteBtn.addEventListener('click', () => {
    const newFile = createNewFile('');
    files.push(newFile);
    activeId = newFile.id;
    saveState();
    renderSidebar();
    loadActiveFile();

    if (modeToggle.checked) {
        modeToggle.checked = false;
        wrapper.classList.remove('preview-mode');
    }
    setTimeout(() => editor.focus(), 50);
    if (window.innerWidth < 768) {
        sidebar.classList.add('hidden');
    }
});

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
