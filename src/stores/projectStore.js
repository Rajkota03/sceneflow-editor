import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

const useProjectStore = create(
    persist(
        (set, get) => ({
            projects: [],
            activeProjectId: null,

            createProject: ({ title, genre, structureTemplate }) => {
                const project = {
                    id: uuidv4(),
                    title,
                    genre,
                    structureTemplate: structureTemplate || 'save-the-cat',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    wordCount: 0,
                    sceneCount: 0,
                    logline: '',
                    titlePage: {
                        author: '',
                        contact: '',
                        draftDate: new Date().toLocaleDateString(),
                        basedOn: '',
                        copyright: '',
                    },
                };
                set((state) => ({
                    projects: [project, ...state.projects],
                    activeProjectId: project.id,
                }));
                return project;
            },

            updateTitlePage: (id, titlePage) => {
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === id
                            ? { ...p, titlePage: { ...p.titlePage, ...titlePage }, updatedAt: new Date().toISOString() }
                            : p
                    ),
                }));
            },

            updateProject: (id, updates) => {
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === id
                            ? { ...p, ...updates, updatedAt: new Date().toISOString() }
                            : p
                    ),
                }));
            },

            deleteProject: (id) => {
                set((state) => ({
                    projects: state.projects.filter((p) => p.id !== id),
                    activeProjectId:
                        state.activeProjectId === id ? null : state.activeProjectId,
                }));
            },

            setActiveProject: (id) => {
                set({ activeProjectId: id });
            },

            setProjects: (projects) => {
                set({ projects });
            },

            getActiveProject: () => {
                const state = get();
                return state.projects.find((p) => p.id === state.activeProjectId);
            },
        }),
        {
            name: 'sceneflow-projects',
        }
    )
);

export default useProjectStore;
