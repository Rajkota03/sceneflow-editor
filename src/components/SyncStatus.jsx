import React, { useState, useEffect, useCallback } from 'react';
import { Cloud, CloudOff, RefreshCw, Wifi, WifiOff, Loader2 } from 'lucide-react';
import supabase from '../lib/supabase';
import useAuthStore from '../stores/authStore';
import useProjectStore from '../stores/projectStore';
import useEditorStore from '../stores/editorStore';
import {
    subscribeSyncStatus,
    getSyncState,
    saveProjectToCloud,
} from '../utils/cloudSync';
import '../styles/sync-status.css';

export default function SyncStatus({ projectId }) {
    const [syncState, setSyncState] = useState(getSyncState());
    const [showTooltip, setShowTooltip] = useState(false);
    const [manualSyncing, setManualSyncing] = useState(false);
    const user = useAuthStore((s) => s.user);
    const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);

    const isCloudAvailable = !!supabase;
    const isLoggedIn = !!user;

    useEffect(() => {
        const unsub = subscribeSyncStatus((state) => {
            setSyncState(state);
        });
        return unsub;
    }, []);

    const handleSyncNow = useCallback(async () => {
        if (!isCloudAvailable || !isLoggedIn || !project) return;
        setManualSyncing(true);
        try {
            await saveProjectToCloud(
                { ...project, userId: user.id },
                blocks
            );
        } catch (err) {
            console.error('Manual sync failed:', err);
        }
        setManualSyncing(false);
    }, [isCloudAvailable, isLoggedIn, project, blocks, user]);

    const isSyncing = syncState.status === 'syncing' || manualSyncing;

    const getStatusConfig = () => {
        if (!isCloudAvailable) {
            return {
                dotClass: 'sync-dot--offline',
                icon: CloudOff,
                label: 'Offline Mode',
                tooltip: 'Supabase not configured. Working locally.',
            };
        }
        if (!isLoggedIn) {
            return {
                dotClass: 'sync-dot--offline',
                icon: CloudOff,
                label: 'Local',
                tooltip: 'Sign in to enable cloud sync.',
            };
        }
        if (isSyncing) {
            return {
                dotClass: 'sync-dot--syncing',
                icon: Loader2,
                label: 'Syncing...',
                tooltip: 'Saving to cloud...',
            };
        }
        if (syncState.status === 'error') {
            return {
                dotClass: 'sync-dot--error',
                icon: WifiOff,
                label: 'Sync Error',
                tooltip: `Error: ${syncState.lastError || 'Unknown error'}`,
            };
        }
        // online / synced
        return {
            dotClass: 'sync-dot--synced',
            icon: Cloud,
            label: 'Synced',
            tooltip: syncState.lastSyncTime
                ? `Last synced: ${new Date(syncState.lastSyncTime).toLocaleTimeString()}`
                : 'Connected to cloud.',
        };
    };

    const config = getStatusConfig();
    const StatusIcon = config.icon;

    return (
        <div
            className="sync-status"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className={`sync-indicator ${isSyncing ? 'sync-indicator--spinning' : ''}`}>
                <span className={`sync-dot ${config.dotClass}`} />
                <StatusIcon size={13} className={isSyncing ? 'sync-icon-spin' : ''} />
                <span className="sync-label">{config.label}</span>
            </div>

            {isCloudAvailable && isLoggedIn && (
                <button
                    className="sync-now-btn"
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    title="Sync now"
                >
                    <RefreshCw size={12} className={isSyncing ? 'sync-icon-spin' : ''} />
                </button>
            )}

            {showTooltip && (
                <div className="sync-tooltip">
                    <div className="sync-tooltip-text">{config.tooltip}</div>
                    {syncState.lastSyncTime && isCloudAvailable && isLoggedIn && (
                        <div className="sync-tooltip-time">
                            Last: {new Date(syncState.lastSyncTime).toLocaleString()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
