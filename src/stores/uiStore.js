import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Industry-standard revision colors in order
export const REVISION_COLORS = [
    { id: 'white', label: 'White', hex: '#f0ece4' },
    { id: 'blue', label: 'Blue', hex: '#60a5fa' },
    { id: 'pink', label: 'Pink', hex: '#f472b6' },
    { id: 'yellow', label: 'Yellow', hex: '#fbbf24' },
    { id: 'green', label: 'Green', hex: '#4ade80' },
    { id: 'goldenrod', label: 'Goldenrod', hex: '#daa520' },
    { id: 'buff', label: 'Buff', hex: '#f0dc82' },
    { id: 'salmon', label: 'Salmon', hex: '#fa8072' },
    { id: 'cherry', label: 'Cherry', hex: '#de3163' },
];

const useUIStore = create(
    persist(
        (set) => ({
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
            revisionColor: 'blue', // matches REVISION_COLORS ids
            revisionHistory: [],   // [{ color, label, date }] tracks revision rounds
            showSceneNumbers: false,
            showTitlePage: true,
            readThroughMode: false,
            typewriterMode: false,
            dialogueTunerCharacter: null, // string: character name

            // Split Screen
            splitScreenMode: false,
            splitScreenPosition: 50,

            // Find & Replace
            findOpen: false,
            findQuery: '',
            replaceQuery: '',
            findMatchCase: false,

            // Resizable panel widths
            sidebarWidth: 280,
            rightPanelWidth: 320,

            // Command palette
            commandPaletteOpen: false,

            // Title Page modal
            titlePageModalOpen: false,

            // Watermark Dialog
            watermarkDialogOpen: false,

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

            // Resizable panels
            setSidebarWidth: (w) => set({ sidebarWidth: w }),
            setRightPanelWidth: (w) => set({ rightPanelWidth: w }),

            // Revision mode
            toggleRevisionMode: () =>
                set((state) => ({ revisionMode: !state.revisionMode })),
            setRevisionColor: (color) => set({ revisionColor: color }),
            addRevisionRound: (color, label) =>
                set((state) => ({
                    revisionHistory: [
                        ...state.revisionHistory,
                        { color, label, date: new Date().toISOString() },
                    ],
                })),

            // Scene numbers
            toggleSceneNumbers: () =>
                set((state) => ({ showSceneNumbers: !state.showSceneNumbers })),

            // Title page
            toggleTitlePage: () =>
                set((state) => ({ showTitlePage: !state.showTitlePage })),
            setTitlePageModalOpen: (open) => set({ titlePageModalOpen: open }),
            setWatermarkDialogOpen: (open) => set({ watermarkDialogOpen: open }),

            // Split Screen
            toggleSplitScreen: () =>
                set((state) => ({ splitScreenMode: !state.splitScreenMode })),
            setSplitScreenPosition: (pos) => set({ splitScreenPosition: pos }),

            // Find & Replace
            toggleFind: () =>
                set((state) => ({ findOpen: !state.findOpen })),
            setFindOpen: (open) => set({ findOpen: open }),
            setFindQuery: (q) => set({ findQuery: q }),
            setReplaceQuery: (q) => set({ replaceQuery: q }),
            toggleFindMatchCase: () =>
                set((state) => ({ findMatchCase: !state.findMatchCase })),

            // Initialize theme from persisted value on app load
            initTheme: () => {
                const theme = useUIStore.getState().theme || 'dark';
                document.documentElement.setAttribute('data-theme', theme);
            },
        }),
        {
            name: 'sceneflow-ui',
            partialize: (state) => ({
                theme: state.theme,
                showSceneNumbers: state.showSceneNumbers,
                showTitlePage: state.showTitlePage,
                sidebarWidth: state.sidebarWidth,
                rightPanelWidth: state.rightPanelWidth,
            }),
            onRehydrateStorage: () => (state) => {
                // Apply persisted theme to DOM after rehydration
                if (state) {
                    const theme = state.theme || 'dark';
                    document.documentElement.setAttribute('data-theme', theme);
                }
            },
        }
    )
);

export default useUIStore;
