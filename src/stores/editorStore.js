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

            // ── Branch Drafts ──
            _branches: {},        // { [projectId]: [{ id, name, blocks, createdAt, parentSnapshotId }] }
            _activeBranch: {},    // { [projectId]: branchId | null } (null = main)
            _mainBlocksBackup: {}, // saved main blocks when switching to branch

            // ── Breakdown Tags ──
            _breakdownTags: {},   // { [projectId]: { [sceneId]: [{ id, category, text, color }] } }

            // ── Stash ──
            _stash: {},           // { [projectId]: [{ id, text, type, stashedAt, source }] }

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
                // Debounced history push: save undo snapshot after 500ms of inactivity
                const currentTimeout = get()._historyTimeout;
                if (currentTimeout) {
                    clearTimeout(currentTimeout);
                }
                const timeoutId = setTimeout(() => {
                    get().pushHistory(projectId);
                }, 500);
                set({ _historyTimeout: timeoutId });

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
                // Stash the deleted block's text if non-empty
                const state = get();
                const blocks = state.blocksByProject[projectId] || [];
                const deletedBlock = blocks.find(b => b.id === blockId);
                if (deletedBlock && deletedBlock.text && deletedBlock.text.trim()) {
                    get().addToStash(projectId, deletedBlock.text, deletedBlock.type, 'deleted-block');
                }
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

            // ── Page & Scene Locking ──
            _lockedBlocks: {},   // { [projectId]: blockId[] }
            _lockedScenes: {},   // { [projectId]: sceneHeadingBlockId[] }

            toggleBlockLock: (projectId, blockId) => {
                set((state) => {
                    const current = state._lockedBlocks[projectId] || [];
                    const isLocked = current.includes(blockId);
                    return {
                        _lockedBlocks: {
                            ...state._lockedBlocks,
                            [projectId]: isLocked
                                ? current.filter((id) => id !== blockId)
                                : [...current, blockId],
                        },
                    };
                });
            },

            toggleSceneLock: (projectId, sceneHeadingId) => {
                set((state) => {
                    const currentScenes = state._lockedScenes[projectId] || [];
                    const isLocked = currentScenes.includes(sceneHeadingId);

                    const blocks = state.blocksByProject[projectId] || [];
                    const startIdx = blocks.findIndex((b) => b.id === sceneHeadingId);
                    if (startIdx === -1) return state;

                    const sceneBlockIds = [];
                    for (let i = startIdx; i < blocks.length; i++) {
                        if (i > startIdx && blocks[i].type === 'scene-heading') break;
                        sceneBlockIds.push(blocks[i].id);
                    }

                    const currentBlocks = state._lockedBlocks[projectId] || [];
                    let newLockedBlocks;
                    if (isLocked) {
                        newLockedBlocks = currentBlocks.filter((id) => !sceneBlockIds.includes(id));
                    } else {
                        const toAdd = sceneBlockIds.filter((id) => !currentBlocks.includes(id));
                        newLockedBlocks = [...currentBlocks, ...toAdd];
                    }

                    return {
                        _lockedScenes: {
                            ...state._lockedScenes,
                            [projectId]: isLocked
                                ? currentScenes.filter((id) => id !== sceneHeadingId)
                                : [...currentScenes, sceneHeadingId],
                        },
                        _lockedBlocks: {
                            ...state._lockedBlocks,
                            [projectId]: newLockedBlocks,
                        },
                    };
                });
            },

            isBlockLocked: (projectId, blockId) => {
                const state = get();
                const locked = state._lockedBlocks[projectId] || [];
                return locked.includes(blockId);
            },

            isSceneLocked: (projectId, sceneHeadingId) => {
                const state = get();
                const locked = state._lockedScenes[projectId] || [];
                return locked.includes(sceneHeadingId);
            },

            // ── Inline Comments / Annotations ──
            _comments: {},

            addComment: (projectId, blockId, text, author = 'Writer') => {
                set((state) => {
                    const projectComments = state._comments[projectId] || {};
                    const blockComments = projectComments[blockId] || [];
                    const newComment = {
                        id: uuidv4(),
                        text,
                        author,
                        createdAt: new Date().toISOString(),
                        resolved: false,
                    };
                    return {
                        _comments: {
                            ...state._comments,
                            [projectId]: {
                                ...projectComments,
                                [blockId]: [...blockComments, newComment],
                            },
                        },
                    };
                });
            },

            resolveComment: (projectId, blockId, commentId) => {
                set((state) => {
                    const projectComments = state._comments[projectId] || {};
                    const blockComments = projectComments[blockId] || [];
                    return {
                        _comments: {
                            ...state._comments,
                            [projectId]: {
                                ...projectComments,
                                [blockId]: blockComments.map((c) =>
                                    c.id === commentId ? { ...c, resolved: !c.resolved } : c
                                ),
                            },
                        },
                    };
                });
            },

            deleteComment: (projectId, blockId, commentId) => {
                set((state) => {
                    const projectComments = state._comments[projectId] || {};
                    const blockComments = projectComments[blockId] || [];
                    return {
                        _comments: {
                            ...state._comments,
                            [projectId]: {
                                ...projectComments,
                                [blockId]: blockComments.filter((c) => c.id !== commentId),
                            },
                        },
                    };
                });
            },

            getComments: (projectId, blockId) => {
                const state = get();
                const projectComments = state._comments[projectId] || {};
                return projectComments[blockId] || [];
            },

            getAllComments: (projectId) => {
                const state = get();
                return state._comments[projectId] || {};
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

            // ── Branch Drafts ──
            getBranches: (projectId) => {
                return get()._branches[projectId] || [];
            },

            getActiveBranch: (projectId) => {
                return get()._activeBranch[projectId] || null;
            },

            createBranch: (projectId, name) => {
                const state = get();
                const blocks = state.blocksByProject[projectId] || [];
                const snaps = state._snapshots[projectId] || [];
                const latestSnapId = snaps.length > 0 ? snaps[snaps.length - 1].id : null;
                const newBranch = {
                    id: uuidv4(),
                    name,
                    blocks: JSON.parse(JSON.stringify(blocks)),
                    createdAt: new Date().toISOString(),
                    parentSnapshotId: latestSnapId,
                };
                set({
                    _branches: {
                        ...state._branches,
                        [projectId]: [...(state._branches[projectId] || []), newBranch],
                    },
                });
                return newBranch;
            },

            switchBranch: (projectId, branchId) => {
                const state = get();
                const currentBranchId = state._activeBranch[projectId] || null;
                const branches = state._branches[projectId] || [];
                const currentBlocks = JSON.parse(JSON.stringify(state.blocksByProject[projectId] || []));

                if (branchId === null) {
                    // Switching back to main
                    // Save current branch blocks
                    if (currentBranchId) {
                        const updatedBranches = branches.map(b =>
                            b.id === currentBranchId ? { ...b, blocks: currentBlocks } : b
                        );
                        const mainBlocks = state._mainBlocksBackup[projectId] || currentBlocks;
                        set({
                            _branches: { ...state._branches, [projectId]: updatedBranches },
                            _activeBranch: { ...state._activeBranch, [projectId]: null },
                            blocksByProject: { ...state.blocksByProject, [projectId]: JSON.parse(JSON.stringify(mainBlocks)) },
                        });
                    }
                    return;
                }

                const targetBranch = branches.find(b => b.id === branchId);
                if (!targetBranch) return;

                if (currentBranchId === null) {
                    // Currently on main, save main blocks
                    if (currentBranchId !== null) {
                        // save current branch
                        const updatedBranches = branches.map(b =>
                            b.id === currentBranchId ? { ...b, blocks: currentBlocks } : b
                        );
                        set({
                            _branches: { ...state._branches, [projectId]: updatedBranches },
                            _activeBranch: { ...state._activeBranch, [projectId]: branchId },
                            blocksByProject: { ...state.blocksByProject, [projectId]: JSON.parse(JSON.stringify(targetBranch.blocks)) },
                        });
                    } else {
                        // Save main blocks backup
                        set({
                            _mainBlocksBackup: { ...state._mainBlocksBackup, [projectId]: currentBlocks },
                            _activeBranch: { ...state._activeBranch, [projectId]: branchId },
                            blocksByProject: { ...state.blocksByProject, [projectId]: JSON.parse(JSON.stringify(targetBranch.blocks)) },
                        });
                    }
                } else {
                    // Switching from one branch to another
                    const updatedBranches = branches.map(b =>
                        b.id === currentBranchId ? { ...b, blocks: currentBlocks } : b
                    );
                    set({
                        _branches: { ...state._branches, [projectId]: updatedBranches },
                        _activeBranch: { ...state._activeBranch, [projectId]: branchId },
                        blocksByProject: { ...state.blocksByProject, [projectId]: JSON.parse(JSON.stringify(targetBranch.blocks)) },
                    });
                }
            },

            mergeBranch: (projectId, branchId) => {
                const state = get();
                const branches = state._branches[projectId] || [];
                const branch = branches.find(b => b.id === branchId);
                if (!branch) return;

                // Create a snapshot before merging
                get().createSnapshot(projectId, `Pre-merge: ${branch.name}`);

                const updatedBranches = branches.filter(b => b.id !== branchId);
                set({
                    blocksByProject: {
                        ...state.blocksByProject,
                        [projectId]: JSON.parse(JSON.stringify(branch.blocks)),
                    },
                    _branches: { ...state._branches, [projectId]: updatedBranches },
                    _activeBranch: { ...state._activeBranch, [projectId]: null },
                    _mainBlocksBackup: { ...state._mainBlocksBackup, [projectId]: undefined },
                });
            },

            deleteBranch: (projectId, branchId) => {
                const state = get();
                const activeBranchId = state._activeBranch[projectId] || null;

                // If deleting the active branch, switch to main first
                if (activeBranchId === branchId) {
                    get().switchBranch(projectId, null);
                }

                const updatedState = get();
                const branches = updatedState._branches[projectId] || [];
                set({
                    _branches: {
                        ...updatedState._branches,
                        [projectId]: branches.filter(b => b.id !== branchId),
                    },
                });
            },

            // ── Stash ──
            getStash: (projectId) => {
                return get()._stash[projectId] || [];
            },

            addToStash: (projectId, text, type, source) => {
                if (!text || !text.trim()) return;
                const state = get();
                const stash = state._stash[projectId] || [];
                const newItem = {
                    id: uuidv4(),
                    text,
                    type: type || 'unknown',
                    stashedAt: new Date().toISOString(),
                    source: source || 'manual',
                };
                // Keep max 50 items
                const updated = [newItem, ...stash].slice(0, 50);
                set({
                    _stash: {
                        ...state._stash,
                        [projectId]: updated,
                    },
                });
            },

            removeFromStash: (projectId, stashId) => {
                const state = get();
                const stash = state._stash[projectId] || [];
                set({
                    _stash: {
                        ...state._stash,
                        [projectId]: stash.filter(item => item.id !== stashId),
                    },
                });
            },

            clearStash: (projectId) => {
                const state = get();
                set({
                    _stash: {
                        ...state._stash,
                        [projectId]: [],
                    },
                });
            },

            // ── Breakdown Tags ──
            _breakdownCategoryColors: {
                'Props': '#f59e0b',
                'Wardrobe': '#ec4899',
                'Vehicles': '#3b82f6',
                'Weapons': '#ef4444',
                'Special Effects': '#8b5cf6',
                'Sound Effects': '#06b6d4',
                'Makeup': '#f472b6',
                'Animals': '#22c55e',
                'Extras': '#a78bfa',
                'Stunts': '#f97316',
                'Music': '#14b8a6',
                'Set Dressing': '#84cc16',
            },

            addBreakdownTag: (projectId, sceneId, category, text) => {
                const state = get();
                const colors = state._breakdownCategoryColors;
                const projectTags = state._breakdownTags[projectId] || {};
                const sceneTags = projectTags[sceneId] || [];
                const newTag = {
                    id: uuidv4(),
                    category,
                    text: text.trim(),
                    color: colors[category] || '#a78bfa',
                };
                set({
                    _breakdownTags: {
                        ...state._breakdownTags,
                        [projectId]: {
                            ...projectTags,
                            [sceneId]: [...sceneTags, newTag],
                        },
                    },
                });
                return newTag;
            },

            removeBreakdownTag: (projectId, sceneId, tagId) => {
                const state = get();
                const projectTags = state._breakdownTags[projectId] || {};
                const sceneTags = projectTags[sceneId] || [];
                set({
                    _breakdownTags: {
                        ...state._breakdownTags,
                        [projectId]: {
                            ...projectTags,
                            [sceneId]: sceneTags.filter((t) => t.id !== tagId),
                        },
                    },
                });
            },

            getBreakdownTags: (projectId, sceneId) => {
                const state = get();
                const projectTags = state._breakdownTags[projectId] || {};
                return projectTags[sceneId] || [];
            },

            getAllBreakdownTags: (projectId) => {
                const state = get();
                const projectTags = state._breakdownTags[projectId] || {};
                const grouped = {};
                Object.values(projectTags).forEach((sceneTags) => {
                    sceneTags.forEach((tag) => {
                        if (!grouped[tag.category]) {
                            grouped[tag.category] = [];
                        }
                        // Avoid duplicates by text
                        if (!grouped[tag.category].find((t) => t.text === tag.text)) {
                            grouped[tag.category].push(tag);
                        }
                    });
                });
                return grouped;
            },
        }),
        {
            name: 'sceneflow-editor',
            partialize: (state) => {
                const { _historyTimeout, ...rest } = state;
                return rest;
            },
        }
    )
);

export default useEditorStore;
