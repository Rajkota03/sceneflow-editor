import { create } from 'zustand';
import supabase from '../lib/supabase';

// Predefined collaborator colors
const COLLAB_COLORS = [
    '#f87171', // red
    '#60a5fa', // blue
    '#4ade80', // green
    '#fbbf24', // yellow
    '#a78bfa', // purple
    '#f472b6', // pink
    '#34d399', // emerald
    '#fb923c', // orange
];

let _presenceChannel = null;
let _inactivityTimers = {};

const useCollabStore = create((set, get) => ({
    collaborators: [],       // [{ id, name, color, cursor, activeBlockId, lastActive }]
    isCollabMode: false,
    sessionProjectId: null,

    /**
     * Join a collaboration session for a project.
     * Uses Supabase Realtime Presence if available; otherwise no-ops gracefully.
     */
    joinSession: async (projectId, user) => {
        if (!supabase || !projectId) {
            // Offline — just mark collab mode as false
            set({ isCollabMode: false, sessionProjectId: null });
            return;
        }

        const userName = user?.user_metadata?.display_name
            || user?.email?.split('@')[0]
            || 'Anonymous';
        const userId = user?.id || 'local';
        const colorIndex = userId.charCodeAt(0) % COLLAB_COLORS.length;
        const color = COLLAB_COLORS[colorIndex];

        try {
            // Create or reuse a presence channel
            if (_presenceChannel) {
                await supabase.removeChannel(_presenceChannel);
                _presenceChannel = null;
            }

            const channel = supabase.channel(`project:${projectId}`, {
                config: { presence: { key: userId } },
            });

            channel
                .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState();
                    const collabs = [];
                    Object.entries(state).forEach(([key, presences]) => {
                        if (key === userId) return; // Skip self
                        const p = presences[0];
                        if (p) {
                            collabs.push({
                                id: key,
                                name: p.name || 'User',
                                color: p.color || '#60a5fa',
                                cursor: p.cursor || null,
                                activeBlockId: p.activeBlockId || null,
                                lastActive: p.lastActive || new Date().toISOString(),
                            });
                        }
                    });
                    set({ collaborators: collabs });
                })
                .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                    if (key === userId) return;
                    const p = newPresences[0];
                    if (!p) return;
                    set((state) => {
                        const exists = state.collaborators.find((c) => c.id === key);
                        if (exists) return state;
                        return {
                            collaborators: [
                                ...state.collaborators,
                                {
                                    id: key,
                                    name: p.name || 'User',
                                    color: p.color || '#60a5fa',
                                    cursor: p.cursor || null,
                                    activeBlockId: p.activeBlockId || null,
                                    lastActive: new Date().toISOString(),
                                },
                            ],
                        };
                    });
                })
                .on('presence', { event: 'leave' }, ({ key }) => {
                    set((state) => ({
                        collaborators: state.collaborators.filter((c) => c.id !== key),
                    }));
                });

            await channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        name: userName,
                        color,
                        cursor: null,
                        activeBlockId: null,
                        lastActive: new Date().toISOString(),
                    });
                }
            });

            _presenceChannel = channel;
            set({
                isCollabMode: true,
                sessionProjectId: projectId,
            });
        } catch (err) {
            console.warn('Collab session join failed (running offline):', err);
            set({ isCollabMode: false, sessionProjectId: null });
        }
    },

    /**
     * Leave the current collaboration session.
     */
    leaveSession: async () => {
        if (_presenceChannel && supabase) {
            try {
                await _presenceChannel.untrack();
                await supabase.removeChannel(_presenceChannel);
            } catch (e) {
                // Ignore cleanup errors
            }
            _presenceChannel = null;
        }

        // Clear all inactivity timers
        Object.values(_inactivityTimers).forEach(clearTimeout);
        _inactivityTimers = {};

        set({
            collaborators: [],
            isCollabMode: false,
            sessionProjectId: null,
        });
    },

    /**
     * Update the current user's cursor position (which block they're editing).
     * Also broadcast via Presence if connected.
     */
    updateCursorPosition: async (userId, blockId) => {
        if (_presenceChannel) {
            try {
                await _presenceChannel.track({
                    ...(_presenceChannel.presenceState()?.[userId]?.[0] || {}),
                    activeBlockId: blockId,
                    lastActive: new Date().toISOString(),
                });
            } catch (e) {
                // Silently fail if presence not available
            }
        }

        // Also update local collaborator state if this is a remote user update
        set((state) => ({
            collaborators: state.collaborators.map((c) =>
                c.id === userId
                    ? { ...c, activeBlockId: blockId, lastActive: new Date().toISOString() }
                    : c
            ),
        }));

        // Set up inactivity fade-out: after 5s, clear activeBlockId
        if (_inactivityTimers[userId]) {
            clearTimeout(_inactivityTimers[userId]);
        }
        _inactivityTimers[userId] = setTimeout(() => {
            set((state) => ({
                collaborators: state.collaborators.map((c) =>
                    c.id === userId
                        ? { ...c, activeBlockId: null }
                        : c
                ),
            }));
        }, 5000);
    },

    /**
     * Set the collaborator list directly (useful for testing / mock data).
     */
    setCollaborators: (list) => set({ collaborators: list }),

    /**
     * Check if Supabase is available for collaboration.
     */
    isCloudAvailable: () => !!supabase,
}));

export default useCollabStore;
