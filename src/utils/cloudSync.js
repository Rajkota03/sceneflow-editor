/**
 * Cloud Sync — Supabase ↔ Local Zustand sync layer
 *
 * Provides functions to:
 *  • Load projects and blocks from Supabase on login
 *  • Save/sync local changes to Supabase (debounced)
 *  • Create/delete projects in Supabase
 */

import supabase from '../lib/supabase';

// ═══════════════════════════════════════════════
//  Projects
// ═══════════════════════════════════════════════

export async function cloudLoadProjects(userId) {
    if (!supabase || !userId) return [];

    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Failed to load projects:', error);
        return [];
    }

    return data.map((p) => ({
        id: p.id,
        title: p.title,
        genre: p.genre || '',
        logline: p.logline || '',
        titlePage: p.title_page || {},
        settings: p.settings || {},
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        cloudSynced: true,
    }));
}

export async function cloudCreateProject(userId, project) {
    if (!supabase || !userId) return null;

    const { data, error } = await supabase
        .from('projects')
        .insert({
            id: project.id,
            user_id: userId,
            title: project.title,
            genre: project.genre || '',
            logline: project.logline || '',
            title_page: project.titlePage || {},
            settings: project.settings || {},
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to create project:', error);
        return null;
    }
    return data;
}

export async function cloudUpdateProject(projectId, updates) {
    if (!supabase || !projectId) return;

    const mapped = {};
    if (updates.title !== undefined) mapped.title = updates.title;
    if (updates.genre !== undefined) mapped.genre = updates.genre;
    if (updates.logline !== undefined) mapped.logline = updates.logline;
    if (updates.titlePage !== undefined) mapped.title_page = updates.titlePage;
    if (updates.settings !== undefined) mapped.settings = updates.settings;

    const { error } = await supabase
        .from('projects')
        .update(mapped)
        .eq('id', projectId);

    if (error) console.error('Failed to update project:', error);
}

export async function cloudDeleteProject(projectId) {
    if (!supabase || !projectId) return;

    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

    if (error) console.error('Failed to delete project:', error);
}

// ═══════════════════════════════════════════════
//  Blocks (screenplay content)
// ═══════════════════════════════════════════════

export async function cloudLoadBlocks(projectId) {
    if (!supabase || !projectId) return [];

    const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Failed to load blocks:', error);
        return [];
    }

    return data.map((b) => ({
        id: b.id,
        type: b.type,
        text: b.text,
        metadata: b.metadata || {},
    }));
}

export async function cloudSaveBlocks(projectId, blocks) {
    if (!supabase || !projectId || !blocks) return;

    // Upsert all blocks with sort_order
    const rows = blocks.map((b, i) => ({
        id: b.id,
        project_id: projectId,
        type: b.type,
        text: b.text || '',
        sort_order: i,
        metadata: b.metadata || {},
    }));

    // Delete existing blocks for this project, then insert fresh
    // This is simpler than diffing and handles reordering/deletions
    const { error: delError } = await supabase
        .from('blocks')
        .delete()
        .eq('project_id', projectId);

    if (delError) {
        console.error('Failed to clear blocks:', delError);
        return;
    }

    if (rows.length > 0) {
        const { error: insError } = await supabase
            .from('blocks')
            .insert(rows);

        if (insError) console.error('Failed to save blocks:', insError);
    }
}

// ═══════════════════════════════════════════════
//  Debounced sync helper
// ═══════════════════════════════════════════════

const _syncTimers = {};

export function debouncedCloudSave(key, fn, delay = 2000) {
    if (_syncTimers[key]) clearTimeout(_syncTimers[key]);
    _syncTimers[key] = setTimeout(fn, delay);
}
