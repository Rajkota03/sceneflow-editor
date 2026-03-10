import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import beatFrameworks from '../data/beatFrameworks';

const useBeatStore = create(
    persist(
        (set, get) => ({
            beatsByProject: {}, // { [projectId]: { [beatId]: Beat } }

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

                // We'll keep track of created ids (if needed) and run through the addBeat action
                const processNode = (node, parentBeatId = null, index = 0) => {
                    let targetPageStart = Math.max(1, Math.round((node.targetPagePercentStart / 100) * targetPageCount));
                    let targetPageEnd = Math.max(1, Math.round((node.targetPagePercentEnd / 100) * targetPageCount));

                    // If start and end are the same but it's not a 0-length beat, ensure it's at least 1 page
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

                // Clear existing beats for this project? No, instantiation implies adding.
                // Usually applying a template to a blank slate, but we just append here.
                template.beats.forEach((rootBeat, index) => processNode(rootBeat, null, index));
            },

            // Helpers for the components
            getBeats: (projectId) => {
                const projectBeats = get().beatsByProject[projectId] || {};
                return Object.values(projectBeats).sort((a, b) => a.sortOrder - b.sortOrder);
            }
        }),
        {
            name: 'sceneflow-beats',
        }
    )
);

export default useBeatStore;
