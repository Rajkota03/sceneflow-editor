/**
 * Cloud Sync — Supabase ↔ Local Zustand sync layer
 *
 * Provides functions to:
 *  • Load projects and blocks from Supabase on login
 *  • Save/sync local changes to Supabase (debounced)
 *  • Create/delete projects in Supabase
 *  • High-level sync helpers: saveProjectToCloud, loadProjectFromCloud, etc.
 *  • Sync status tracking
 */

import supabase from '../lib/supabase';

// ═══════════════════════════════════════════════
//  Sync Status Tracking
// ═══════════════════════════════════════════════

let _syncState = {
    status: supabase ? 'online' : 'offline', // 'online' | 'offline' | 'syncing' | 'error'
    lastSyncTime: null,
    lastError: null,
    listeners: new Set(),
};

function _notifyListeners() {
    _syncState.listeners.forEach((fn) => {
        try { fn({ ..._syncState }); } catch (e) { /* ignore */ }
    });
}

export function subscribeSyncStatus(listener) {
    _syncState.listeners.add(listener);
    // Immediately call with current state
    listener({ ..._syncState });
    return () => _syncState.listeners.delete(listener);
}

export function syncStatus() {
    return _syncState.status;
}

export function getSyncState() {
    return {
        status: _syncState.status,
        lastSyncTime: _syncState.lastSyncTime,
        lastError: _syncState.lastError,
    };
}

function _setSyncing() {
    _syncState.status = 'syncing';
    _syncState.lastError = null;
    _notifyListeners();
}

function _setSynced() {
    _syncState.status = 'online';
    _syncState.lastSyncTime = new Date().toISOString();
    _syncState.lastError = null;
    _notifyListeners();
}

function _setSyncError(error) {
    _syncState.status = 'error';
    _syncState.lastError = error?.message || String(error);
    _notifyListeners();
}

function _setOffline() {
    _syncState.status = 'offline';
    _notifyListeners();
}

// ═══════════════════════════════════════════════
//  Projects — Low-level CRUD
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
//  Blocks (screenplay content) — Low-level CRUD
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
//  High-level Sync Functions
// ═══════════════════════════════════════════════

/**
 * Save a full project + its blocks to Supabase.
 * Upserts the project row and replaces all blocks.
 */
export async function saveProjectToCloud(project, blocks) {
    if (!supabase) {
        _setOffline();
        return { success: false, reason: 'offline' };
    }

    try {
        _setSyncing();

        // Upsert the project
        const { error: projError } = await supabase
            .from('projects')
            .upsert({
                id: project.id,
                user_id: project.userId || project.user_id,
                title: project.title,
                genre: project.genre || '',
                logline: project.logline || '',
                title_page: project.titlePage || {},
                settings: project.settings || {},
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });

        if (projError) {
            _setSyncError(projError);
            return { success: false, reason: projError.message };
        }

        // Replace blocks
        if (blocks && blocks.length > 0) {
            await cloudSaveBlocks(project.id, blocks);
        }

        _setSynced();
        return { success: true };
    } catch (err) {
        _setSyncError(err);
        return { success: false, reason: err.message };
    }
}

/**
 * Load a single project + its blocks from Supabase.
 */
export async function loadProjectFromCloud(projectId) {
    if (!supabase) {
        _setOffline();
        return null;
    }

    try {
        _setSyncing();

        const { data: project, error: projError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (projError) {
            _setSyncError(projError);
            return null;
        }

        const blocks = await cloudLoadBlocks(projectId);

        _setSynced();
        return {
            project: {
                id: project.id,
                title: project.title,
                genre: project.genre || '',
                logline: project.logline || '',
                titlePage: project.title_page || {},
                settings: project.settings || {},
                createdAt: project.created_at,
                updatedAt: project.updated_at,
                cloudSynced: true,
            },
            blocks,
        };
    } catch (err) {
        _setSyncError(err);
        return null;
    }
}

/**
 * Load all projects for a user from Supabase.
 */
export async function loadAllProjectsFromCloud(userId) {
    if (!supabase || !userId) {
        _setOffline();
        return [];
    }

    try {
        _setSyncing();
        const projects = await cloudLoadProjects(userId);
        _setSynced();
        return projects;
    } catch (err) {
        _setSyncError(err);
        return [];
    }
}

/**
 * Delete a project and all its blocks from Supabase.
 */
export async function deleteProjectFromCloud(projectId) {
    if (!supabase) {
        _setOffline();
        return { success: false, reason: 'offline' };
    }

    try {
        _setSyncing();

        // Delete blocks first
        const { error: blockError } = await supabase
            .from('blocks')
            .delete()
            .eq('project_id', projectId);

        if (blockError) {
            _setSyncError(blockError);
            return { success: false, reason: blockError.message };
        }

        // Delete project
        const { error: projError } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (projError) {
            _setSyncError(projError);
            return { success: false, reason: projError.message };
        }

        _setSynced();
        return { success: true };
    } catch (err) {
        _setSyncError(err);
        return { success: false, reason: err.message };
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
