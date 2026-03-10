import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import useActivityStore from './activityStore';

const createEmptyBlock = (type = 'scene-heading') => ({
    id: uuidv4(),
    type,
    text: '',
});

const useEditorStore = create(
    persist(
        (set, get) => ({
            // blocks per project: { [projectId]: Block[] }
            blocksByProject: {},
            activeBlockId: null,

            // Undo/redo history per project: { [projectId]: { past: [], future: [] } }
            _history: {},
            _historyTimeout: null,

            // Version snapshots per project: { [projectId]: [{ id, timestamp, description, blocks }] }
            _snapshots: {},

            pushHistory: (projectId) => {
                const state = get();
                const blocks = state.blocksByProject[projectId];
                if (!blocks) return;
                const hist = state._history[projectId] || { past: [], future: [] };
                const snapshot = JSON.stringify(blocks);
                const lastSnapshot = hist.past.length > 0 ? hist.past[hist.past.length - 1] : null;
                if (snapshot === lastSnapshot) return;
                set({
                    _history: {
                        ...state._history,
                        [projectId]: {
                            past: [...hist.past.slice(-99), snapshot],
                            future: [],
                        },
                    },
                });
            },

            undo: (projectId) => {
                const state = get();
                const hist = state._history[projectId] || { past: [], future: [] };
                if (hist.past.length === 0) return;
                const current = JSON.stringify(state.blocksByProject[projectId] || []);
                const prev = hist.past[hist.past.length - 1];
                set({
                    blocksByProject: {
                        ...state.blocksByProject,
                        [projectId]: JSON.parse(prev),
                    },
                    _history: {
                        ...state._history,
                        [projectId]: {
                            past: hist.past.slice(0, -1),
                            future: [current, ...hist.future.slice(0, 99)],
                        },
                    },
                });
            },

            redo: (projectId) => {
                const state = get();
                const hist = state._history[projectId] || { past: [], future: [] };
                if (hist.future.length === 0) return;
                const current = JSON.stringify(state.blocksByProject[projectId] || []);
                const next = hist.future[0];
                set({
                    blocksByProject: {
                        ...state.blocksByProject,
                        [projectId]: JSON.parse(next),
                    },
                    _history: {
                        ...state._history,
                        [projectId]: {
                            past: [...hist.past, current],
                            future: hist.future.slice(1),
                        },
                    },
                });
            },

            getBlocks: (projectId) => {
                const state = get();
                if (!state.blocksByProject[projectId]) {
                    // Initialize with a single scene-heading block
                    const initialBlock = createEmptyBlock('scene-heading');
                    set((s) => ({
                        blocksByProject: {
                            ...s.blocksByProject,
                            [projectId]: [initialBlock],
                        },
                        activeBlockId: initialBlock.id,
                    }));
                    return [initialBlock];
                }
                return state.blocksByProject[projectId];
            },

            setBlocks: (projectId, blocks) => {
                set((state) => ({
                    blocksByProject: {
                        ...state.blocksByProject,
                        [projectId]: blocks,
                    },
                }));
            },

            setActiveBlock: (blockId) => {
                set({ activeBlockId: blockId });
            },

            updateBlockText: (projectId, blockId, text) => {
                set((state) => {
                    const blocks = state.blocksByProject[projectId] || [];

                    // Track word count delta for activity heatmap
                    const oldBlock = blocks.find(b => b.id === blockId);
                    if (oldBlock) {
                        const oldWords = oldBlock.text.trim().split(/\s+/).filter(Boolean).length;
                        const newWords = text.trim().split(/\s+/).filter(Boolean).length;
                        const wordDelta = newWords - oldWords;
                        if (wordDelta > 0) {
                            useActivityStore.getState().logWords(wordDelta);
                        }
                    }

                    return {
                        blocksByProject: {
                            ...state.blocksByProject,
                            [projectId]: blocks.map((b) =>
                                b.id === blockId ? { ...b, text } : b
                            ),
                        },
                    };
                });
            },

            updateBlockType: (projectId, blockId, type) => {
                set((state) => {
                    const blocks = state.blocksByProject[projectId] || [];
                    return {
                        blocksByProject: {
                            ...state.blocksByProject,
                            [projectId]: blocks.map((b) =>
                                b.id === blockId ? { ...b, type } : b
                            ),
                        },
                    };
                });
            },

            insertBlockAfter: (projectId, afterBlockId, type) => {
                const newBlock = createEmptyBlock(type);
                set((state) => {
                    const blocks = state.blocksByProject[projectId] || [];
                    const index = blocks.findIndex((b) => b.id === afterBlockId);
                    const newBlocks = [...blocks];
                    newBlocks.splice(index + 1, 0, newBlock);
                    return {
                        blocksByProject: {
                            ...state.blocksByProject,
                            [projectId]: newBlocks,
                        },
                        activeBlockId: newBlock.id,
                    };
                });
                return newBlock;
            },

            deleteBlock: (projectId, blockId) => {
                get().pushHistory(projectId);
                set((state) => {
                    const blocks = state.blocksByProject[projectId] || [];
                    if (blocks.length <= 1) return state; // Keep at least one block
                    const index = blocks.findIndex((b) => b.id === blockId);
                    const newBlocks = blocks.filter((b) => b.id !== blockId);
                    const prevBlock = newBlocks[Math.max(0, index - 1)];
                    return {
                        blocksByProject: {
                            ...state.blocksByProject,
                            [projectId]: newBlocks,
                        },
                        activeBlockId: prevBlock?.id || null,
                    };
                });
            },

            // Update any properties on a block (used by Find & Replace, etc.)
            updateBlock: (projectId, blockId, updates) => {
                set((state) => {
                    const blocks = state.blocksByProject[projectId] || [];
                    return {
                        blocksByProject: {
                            ...state.blocksByProject,
                            [projectId]: blocks.map((b) =>
                                b.id === blockId ? { ...b, ...updates } : b
                            ),
                        },
                    };
                });
            },

            // Derive scenes from scene-heading blocks
            getScenes: (projectId) => {
                const blocks = get().blocksByProject[projectId] || [];
                return blocks
                    .filter((b) => b.type === 'scene-heading')
                    .map((b, i) => ({
                        id: b.id,
                        number: i + 1,
                        slugline: b.text || `UNTITLED SCENE ${i + 1}`,
                        blockIndex: blocks.indexOf(b),
                    }));
            },

            getWordCount: (projectId) => {
                const blocks = get().blocksByProject[projectId] || [];
                return blocks.reduce((count, block) => {
                    const words = block.text.trim().split(/\s+/).filter(Boolean);
                    return count + words.length;
                }, 0);
            },

            // Move an entire scene (heading + its body) to a new position among scenes
            moveScene: (projectId, fromSceneId, toSceneId) => {
                set((state) => {
                    const blocks = [...(state.blocksByProject[projectId] || [])];
                    if (blocks.length === 0) return state;

                    // Identify scene boundaries
                    const sceneHeadingIndices = [];
                    blocks.forEach((b, i) => {
                        if (b.type === 'scene-heading') sceneHeadingIndices.push(i);
                    });

                    const fromIdx = blocks.findIndex((b) => b.id === fromSceneId);
                    const toIdx = blocks.findIndex((b) => b.id === toSceneId);
                    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return state;

                    // Find the end of the "from" scene
                    const fromScenePos = sceneHeadingIndices.indexOf(fromIdx);
                    const fromEnd = fromScenePos < sceneHeadingIndices.length - 1
                        ? sceneHeadingIndices[fromScenePos + 1]
                        : blocks.length;

                    // Extract the scene blocks
                    const sceneBlocks = blocks.splice(fromIdx, fromEnd - fromIdx);

                    // Find updated toIdx position after extraction
                    const newToIdx = blocks.findIndex((b) => b.id === toSceneId);
                    if (newToIdx === -1) {
                        // Target was removed (was within fromScene), revert
                        blocks.splice(fromIdx, 0, ...sceneBlocks);
                        return state;
                    }

                    // Insert before the target scene
                    blocks.splice(newToIdx, 0, ...sceneBlocks);

                    return {
                        blocksByProject: {
                            ...state.blocksByProject,
                            [projectId]: blocks,
                        },
                    };
                });
            },

            // Update metadata on a block (card color, notes, etc.)
            updateBlockMetadata: (projectId, blockId, metadata) => {
                set((state) => {
                    const blocks = state.blocksByProject[projectId] || [];
                    return {
                        blocksByProject: {
                            ...state.blocksByProject,
                            [projectId]: blocks.map((b) =>
                                b.id === blockId
                                    ? { ...b, metadata: { ...(b.metadata || {}), ...metadata } }
                                    : b
                            ),
                        },
                    };
                });
            },

            // ── Version Snapshots ──
            createSnapshot: (projectId, description = 'Manual snapshot') => {
                set((state) => {
                    const blocks = state.blocksByProject[projectId] || [];
                    const snaps = state._snapshots[projectId] || [];
                    const newSnap = {
                        id: Date.now().toString(),
                        timestamp: new Date().toISOString(),
                        description,
                        blocks: JSON.parse(JSON.stringify(blocks)),
                    };
                    // Keep max 50 snapshots
                    const updated = [...snaps, newSnap].slice(-50);
                    return {
                        _snapshots: {
                            ...state._snapshots,
                            [projectId]: updated,
                        },
                    };
                });
            },

            restoreSnapshot: (projectId, snapId) => {
                const state = get();
                const snaps = state._snapshots[projectId] || [];
                const snap = snaps.find((s) => s.id === snapId);
                if (!snap) return;
                // Save current state as a snapshot before restoring
                get().createSnapshot(projectId, 'Auto-save before restore');
                set({
                    blocksByProject: {
                        ...state.blocksByProject,
                        [projectId]: JSON.parse(JSON.stringify(snap.blocks)),
                    },
                });
            },
        }),
        {
            name: 'sceneflow-editor',
        }
    )
);

export default useEditorStore;
