export function createNewFile(files, initialContent = '') {
    return {
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: generateName(files, initialContent),
        content: initialContent,
        updated: Date.now()
    };
}

export function generateName(files, content) {
    if (!content.trim()) return getUniqueName(files, "Untitled Note");
    const firstLine = content.split('\n')[0].replace(/^#+\s*/, '').trim();
    if (!firstLine) return getUniqueName(files, "Untitled Note");
    return getUniqueName(files, firstLine.substring(0, 40));
}

export function getUniqueName(files, baseName, currentId = null) {
    let finalName = baseName;
    let counter = 1;
    // Check if any existing file (except the current one) has this exact name
    while (files.some(f => f.name === finalName && f.id !== currentId)) {
        finalName = `${baseName} - ${counter}`;
        counter++;
    }
    return finalName;
}
