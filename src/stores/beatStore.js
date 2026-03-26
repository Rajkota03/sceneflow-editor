import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import beatFrameworks from '../data/beatFrameworks';
import useEditorStore from './editorStore';

const useBeatStore = create(
    persist(
        (set, get) => ({
            beatsByProject: {}, // { [projectId]: { [beatId]: Beat } }
            _customTemplates: [], // [{ id, name, description, beats: [...] }]

            // Actions
            addBeat: (projectId, parentId = null, templateOrigin = null, beatData = {}) => {
                const id = uuidv4();

                // Calculate a default sort order if none provided
                let sortOrder = beatData.sortOrder;
                if (sortOrder === undefined) {
                    const projectBeats = get().beatsByProject[projectId] || {};
                    const siblings = Object.values(projectBeats).filter(b => b.parentId === parentId);
                    if (siblings.length > 0) {
                        const maxOrder = Math.max(...siblings.map(b => b.sortOrder));
                        sortOrder = maxOrder + 1;
                    } else {
                        sortOrder = 1;
                    }
                }

                const newBeat = {
                    id,
                    projectId,
                    parentId,
                    templateOrigin,
                    title: beatData.title || 'New Beat',
                    description: beatData.description || '',
                    targetPageStart: beatData.targetPageStart || null,
                    targetPageEnd: beatData.targetPageEnd || null,
                    emotionalTones: beatData.emotionalTones || [],
                    status: beatData.status || 'empty',
                    color: beatData.color || null,
                    sortOrder,
                    notes: beatData.notes || '',
                    linkedSceneIds: beatData.linkedSceneIds || [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    ...beatData
                };

                set((state) => {
                    const projectBeats = state.beatsByProject[projectId] || {};
                    return {
                        beatsByProject: {
                            ...state.beatsByProject,
                            [projectId]: {
                                ...projectBeats,
                                [id]: newBeat
                            }
                        }
                    };
                });
                return id;
            },

            updateBeat: (projectId, beatId, updates) =>
                set((state) => {
                    const projectBeats = state.beatsByProject[projectId];
                    if (!projectBeats || !projectBeats[beatId]) return state;

                    return {
                        beatsByProject: {
                            ...state.beatsByProject,
                            [projectId]: {
                                ...projectBeats,
                                [beatId]: {
                                    ...projectBeats[beatId],
                                    ...updates,
                                    updatedAt: Date.now()
                                }
                            }
                        }
                    };
                }),

            deleteBeat: (projectId, beatId) =>
                set((state) => {
                    const projectBeats = { ...(state.beatsByProject[projectId] || {}) };

                    // Recursive delete function to remove beat and its children
                    const deleteRecursively = (id) => {
                        const children = Object.values(projectBeats).filter(b => b.parentId === id);
                        children.forEach(child => deleteRecursively(child.id));
                        delete projectBeats[id];
                    };

                    deleteRecursively(beatId);

                    return {
                        beatsByProject: {
                            ...state.beatsByProject,
                            [projectId]: projectBeats
                        }
                    };
                }),

            reorderBeat: (projectId, beatId, newSortOrder, newParentId = undefined) =>
                set((state) => {
                    const projectBeats = state.beatsByProject[projectId];
                    if (!projectBeats || !projectBeats[beatId]) return state;

                    const updates = { sortOrder: newSortOrder, updatedAt: Date.now() };
                    if (newParentId !== undefined) {
                        updates.parentId = newParentId;
                    }

                    return {
                        beatsByProject: {
                            ...state.beatsByProject,
                            [projectId]: {
                                ...projectBeats,
                                [beatId]: {
                                    ...projectBeats[beatId],
                                    ...updates
                                }
                            }
                        }
                    };
                }),

            linkSceneToBeat: (projectId, beatId, sceneId) =>
                set((state) => {
                    const projectBeats = state.beatsByProject[projectId];
                    if (!projectBeats || !projectBeats[beatId]) return state;

                    const beat = projectBeats[beatId];
                    if (beat.linkedSceneIds.includes(sceneId)) return state;

                    return {
                        beatsByProject: {
                            ...state.beatsByProject,
                            [projectId]: {
                                ...projectBeats,
                                [beatId]: {
                                    ...beat,
                                    linkedSceneIds: [...beat.linkedSceneIds, sceneId],
                                    updatedAt: Date.now()
                                }
                            }
                        }
                    };
                }),

            unlinkSceneFromBeat: (projectId, beatId, sceneId) =>
                set((state) => {
                    const projectBeats = state.beatsByProject[projectId];
                    if (!projectBeats || !projectBeats[beatId]) return state;

                    const beat = projectBeats[beatId];
                    return {
                        beatsByProject: {
                            ...state.beatsByProject,
                            [projectId]: {
                                ...projectBeats,
                                [beatId]: {
                                    ...beat,
                                    linkedSceneIds: beat.linkedSceneIds.filter(id => id !== sceneId),
                                    updatedAt: Date.now()
                                }
                            }
                        }
                    };
                }),

            instantiateTemplate: (projectId, templateId, targetPageCount = 110) => {
                const template = beatFrameworks.find(t => t.id === templateId);
                if (!template) return;

                const processNode = (node, parentBeatId = null, index = 0) => {
                    let targetPageStart = Math.max(1, Math.round((node.targetPagePercentStart / 100) * targetPageCount));
                    let targetPageEnd = Math.max(1, Math.round((node.targetPagePercentEnd / 100) * targetPageCount));

                    if (targetPageStart === targetPageEnd && node.targetPagePercentStart !== node.targetPagePercentEnd) {
                        targetPageEnd += 1;
                    }

                    const beatId = get().addBeat(projectId, parentBeatId, templateId, {
                        title: node.title,
                        description: node.description,
                        targetPageStart,
                        targetPageEnd,
                        emotionalTones: node.emotionalTones,
                        sortOrder: index + 1
                    });

                    if (node.children && node.children.length > 0) {
                        node.children.forEach((child, childIndex) => processNode(child, beatId, childIndex));
                    }
                };

                template.beats.forEach((rootBeat, index) => processNode(rootBeat, null, index));
            },

            // Instantiate a custom template (uses simple beat objects without page percentages)
            instantiateCustomTemplate: (projectId, templateId, targetPageCount = 110) => {
                const template = get()._customTemplates.find(t => t.id === templateId);
                if (!template) return;

                template.beats.forEach((beat, index) => {
                    get().addBeat(projectId, null, templateId, {
                        title: beat.title,
                        description: beat.description || '',
                        targetPageStart: beat.targetPageStart || null,
                        targetPageEnd: beat.targetPageEnd || null,
                        sortOrder: index + 1
                    });
                });
            },

            // Clear all beats for a project
            clearBeats: (projectId) =>
                set((state) => ({
                    beatsByProject: {
                        ...state.beatsByProject,
                        [projectId]: {}
                    }
                })),

            // Custom template management
            saveCustomTemplate: (template) =>
                set((state) => ({
                    _customTemplates: [
                        ...state._customTemplates,
                        {
                            id: uuidv4(),
                            name: template.name,
                            description: template.description || 'Custom structure',
                            beats: template.beats,
                            createdAt: Date.now()
                        }
                    ]
                })),

            deleteCustomTemplate: (templateId) =>
                set((state) => ({
                    _customTemplates: state._customTemplates.filter(t => t.id !== templateId)
                })),

            getCustomTemplates: () => {
                return get()._customTemplates || [];
            },

            // Sync scene order in the editor to match beat order.
            // After beats are reordered, scenes linked to beats should reflect the new order.
            syncSceneOrder: (projectId) => {
                const beats = get().getBeats(projectId).filter(b => b.parentId === null);
                const editorState = useEditorStore.getState();
                const scenes = editorState.getScenes(projectId);

                if (scenes.length === 0 || beats.length === 0) return;

                // Build desired scene order from beat sequence
                const orderedSceneIds = [];
                const linkedSceneIdSet = new Set();

                beats.forEach(beat => {
                    if (beat.linkedSceneIds && beat.linkedSceneIds.length > 0) {
                        beat.linkedSceneIds.forEach(sceneId => {
                            if (!linkedSceneIdSet.has(sceneId)) {
                                orderedSceneIds.push(sceneId);
                                linkedSceneIdSet.add(sceneId);
                            }
                        });
                    }
                });

                if (orderedSceneIds.length < 2) return;

                // Move scenes one by one to match desired order.
                // We iterate the desired order and for each scene, move it before the
                // scene that currently occupies the next position in the editor.
                // Use the editor's moveScene(projectId, fromSceneId, toSceneId) which
                // inserts fromScene BEFORE toScene.
                for (let i = 0; i < orderedSceneIds.length; i++) {
                    const currentScenes = useEditorStore.getState().getScenes(projectId);
                    const desiredId = orderedSceneIds[i];
                    const currentIndex = currentScenes.findIndex(s => s.id === desiredId);
                    if (currentIndex === -1) continue;

                    // Find what scene is at position i in the current editor order
                    // among only the linked scenes
                    const linkedInCurrentOrder = currentScenes.filter(s => linkedSceneIdSet.has(s.id));
                    const currentAtPosition = linkedInCurrentOrder[i];

                    if (!currentAtPosition || currentAtPosition.id === desiredId) continue;

                    // Move desiredId before currentAtPosition
                    useEditorStore.getState().moveScene(projectId, desiredId, currentAtPosition.id);
                }
            },

            // Helpers for the components
            getBeats: (projectId) => {
                const projectBeats = get().beatsByProject[projectId] || {};
                return Object.values(projectBeats).sort((a, b) => a.sortOrder - b.sortOrder);
            },

            // Get a map of sceneId -> beatId for all linked scenes in a project
            getSceneBeatMap: (projectId) => {
                const projectBeats = get().beatsByProject[projectId] || {};
                const map = {};
                Object.values(projectBeats).forEach(beat => {
                    if (beat.linkedSceneIds) {
                        beat.linkedSceneIds.forEach(sceneId => {
                            map[sceneId] = beat.id;
                        });
                    }
                });
                return map;
            }
        }),
        {
            name: 'sceneflow-beats',
        }
    )
);

export default useBeatStore;
