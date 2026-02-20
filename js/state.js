export const state = {
    files: JSON.parse(localStorage.getItem('notex-files')) || [],
    activeId: localStorage.getItem('notex-active-id'),
    fileToDelete: null
};

export function saveState() {
    localStorage.setItem('notex-files', JSON.stringify(state.files));
    localStorage.setItem('notex-active-id', state.activeId);
}
