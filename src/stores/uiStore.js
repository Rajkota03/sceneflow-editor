import { create } from 'zustand';

const useUIStore = create((set) => ({
    // Global Mode
    globalTab: 'stage', // 'stage' | 'spine'

    // Sidebar
    sidebarOpen: true,
    sidebarTab: 'scenes',

    // Right panel
    rightPanelOpen: true,
    rightPanelTab: 'logline',

    // Modes
    zenMode: false,
    focusMode: false,
    theme: 'dark',
    revisionMode: false,
    revisionColor: 'blue', // blue, pink, yellow, green, orange
    showSceneNumbers: false,
    showTitlePage: true,
    readThroughMode: false,
    typewriterMode: false,
    dialogueTunerCharacter: null, // string: character name

    // Find & Replace
    findOpen: false,
    findQuery: '',
    replaceQuery: '',
    findMatchCase: false,

    // Command palette
    commandPaletteOpen: false,

    // Title Page modal
    titlePageModalOpen: false,

    // Actions
    setGlobalTab: (tab) => set({ globalTab: tab }),

    toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarTab: (tab) => set({ sidebarTab: tab, sidebarOpen: true }),

    toggleRightPanel: () =>
        set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
    setRightPanelTab: (tab) =>
        set({ rightPanelTab: tab, rightPanelOpen: true }),

    toggleZenMode: () =>
        set((state) => ({
            zenMode: !state.zenMode,
            sidebarOpen: state.zenMode ? true : false,
            rightPanelOpen: state.zenMode ? true : false,
        })),

    toggleFocusMode: () =>
        set((state) => ({ focusMode: !state.focusMode })),

    toggleReadThroughMode: () =>
        set((state) => ({
            readThroughMode: !state.readThroughMode,
            sidebarOpen: state.readThroughMode ? true : false,
            rightPanelOpen: state.readThroughMode ? true : false,
        })),

    toggleTypewriterMode: () =>
        set((state) => ({ typewriterMode: !state.typewriterMode })),

    setDialogueTunerCharacter: (characterName) =>
        set({ dialogueTunerCharacter: characterName }),

    toggleTheme: () =>
        set((state) => {
            const newTheme = state.theme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            return { theme: newTheme };
        }),

    setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

    // Revision mode
    toggleRevisionMode: () =>
        set((state) => ({ revisionMode: !state.revisionMode })),
    setRevisionColor: (color) => set({ revisionColor: color }),

    // Scene numbers
    toggleSceneNumbers: () =>
        set((state) => ({ showSceneNumbers: !state.showSceneNumbers })),

    // Title page
    toggleTitlePage: () =>
        set((state) => ({ showTitlePage: !state.showTitlePage })),
    setTitlePageModalOpen: (open) => set({ titlePageModalOpen: open }),

    // Find & Replace
    toggleFind: () =>
        set((state) => ({ findOpen: !state.findOpen })),
    setFindOpen: (open) => set({ findOpen: open }),
    setFindQuery: (q) => set({ findQuery: q }),
    setReplaceQuery: (q) => set({ replaceQuery: q }),
    toggleFindMatchCase: () =>
        set((state) => ({ findMatchCase: !state.findMatchCase })),
}));

export default useUIStore;
