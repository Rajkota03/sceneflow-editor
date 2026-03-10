import { create } from 'zustand';
import supabase from '../lib/supabase';

const useAuthStore = create((set, get) => ({
    user: null,
    profile: null,
    loading: true,
    error: null,

    // ── Initialize auth listener ──
    initialize: async () => {
        if (!supabase) {
            set({ loading: false });
            return;
        }

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            set({ user: session.user });
            await get().fetchProfile(session.user.id);
        }
        set({ loading: false });

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                set({ user: session.user });
                await get().fetchProfile(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                set({ user: null, profile: null });
            }
        });
    },

    // ── Fetch profile ──
    fetchProfile: async (userId) => {
        if (!supabase) return;
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (data) set({ profile: data });
        if (error) console.error('Profile fetch error:', error);
    },

    // ── Sign up with email ──
    signUp: async (email, password, displayName) => {
        if (!supabase) return { error: 'Supabase not configured' };
        set({ loading: true, error: null });

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { display_name: displayName || email.split('@')[0] },
            },
        });

        if (error) {
            set({ loading: false, error: error.message });
            return { error: error.message };
        }

        set({ loading: false });
        return { data };
    },

    // ── Sign in with email ──
    signIn: async (email, password) => {
        if (!supabase) return { error: 'Supabase not configured' };
        set({ loading: true, error: null });

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            set({ loading: false, error: error.message });
            return { error: error.message };
        }

        set({ loading: false });
        return { data };
    },

    // ── Sign in with magic link ──
    signInMagicLink: async (email) => {
        if (!supabase) return { error: 'Supabase not configured' };
        set({ loading: true, error: null });

        const { error } = await supabase.auth.signInWithOtp({ email });

        if (error) {
            set({ loading: false, error: error.message });
            return { error: error.message };
        }

        set({ loading: false });
        return { success: true };
    },

    // ── Sign out ──
    signOut: async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        set({ user: null, profile: null });
    },

    // ── Clear error ──
    clearError: () => set({ error: null }),
}));

export default useAuthStore;
