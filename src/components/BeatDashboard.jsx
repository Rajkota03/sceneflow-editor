import React, { useMemo } from 'react';
import useBeatStore from '../stores/beatStore';
import useEditorStore from '../stores/editorStore';
import { Activity, AlertTriangle, Layers, TrendingUp, Search as SearchIcon } from 'lucide-react';
import '../styles/beat-dashboard.css';

export default function BeatDashboard({ projectId }) {
    const { getBeats } = useBeatStore();
    const { getBlocks } = useEditorStore();

    const beats = getBeats(projectId);
    const blocks = getBlocks(projectId);

    // Calculate Stats
    const stats = useMemo(() => {
        if (beats.length === 0) return null;

        let linkedScenesCount = 0;
        let totalScenes = 0;

        blocks.forEach(b => {
            if (b.type === 'scene-heading') {
                totalScenes++;
                const isLinked = beats.some(beat => beat.linkedSceneIds && beat.linkedSceneIds.includes(b.id));
                if (isLinked) linkedScenesCount++;
            }
        });

        const coveragePercent = totalScenes > 0 ? Math.round((linkedScenesCount / totalScenes) * 100) : 0;

        // Find structural drift (naive check: if a beat is tagged, but the page it's on doesn't match the target)
        // Here we just flag if beats are out of order compared to their links.
        let driftAlerts = 0;
        const linkedBeats = beats.filter(b => b.linkedSceneIds && b.linkedSceneIds.length > 0);

        // Simple heuristic for Drift: do the linked scenes flow in the same sort order as the beats?
        // (A more advanced heuristic would map real page counts using the paginator)
        let lastSceneIndex = -1;
        linkedBeats.sort((a, b) => a.sortOrder - b.sortOrder).forEach(beat => {
            beat.linkedSceneIds.forEach(sceneId => {
                const sceneIndex = blocks.findIndex(b => b.id === sceneId);
                if (sceneIndex !== -1) {
                    if (sceneIndex < lastSceneIndex) {
                        driftAlerts++;
                        // This scene is chronologically earlier in the script than a scene from an earlier beat
                    }
                    lastSceneIndex = Math.max(lastSceneIndex, sceneIndex);
                }
            });
        });

        // The Orphan Scanner
        const orphanScenesCount = totalScenes - linkedScenesCount;
        const orphanBeatsCount = beats.filter(b => (!b.linkedSceneIds || b.linkedSceneIds.length === 0) && (beats.some(c => c.parentId === b.id) === false)).length; // count bottom-level beats with no scenes

        return {
            coveragePercent,
            linkedScenesCount,
            totalScenes,
            driftAlerts,
            orphanScenesCount,
            orphanBeatsCount
        };
    }, [beats, blocks]);

    if (!stats) return null;

    return (
        <div className="beat-dashboard">
            <div className="dashboard-header">
                <h3><Activity size={16} /> Progression Stats</h3>
            </div>

            <div className="dashboard-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats.coveragePercent}%</div>
                    <div className="stat-label">Coverage Map</div>
                    <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${stats.coveragePercent}%` }}></div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-value">{stats.linkedScenesCount} / {stats.totalScenes}</div>
                    <div className="stat-label">Scenes Linked <Layers size={14} className="inline-icon" /></div>
                </div>

                <div className="stat-card drift-stat">
                    <div className={`stat-value ${stats.driftAlerts > 0 ? 'warning' : 'safe'}`}>
                        {stats.driftAlerts > 0 ? <AlertTriangle size={18} /> : <TrendingUp size={18} />}
                        {stats.driftAlerts}
                    </div>
                    <div className="stat-label">Drift Alerts</div>
                    <div className="stat-desc">Sub-optimal scene ordering</div>
                </div>

                <div className="stat-card orphan-stat">
                    <div className={`stat-value ${(stats.orphanScenesCount > 0 || stats.orphanBeatsCount > 0) ? 'warning' : 'safe'}`}>
                        <SearchIcon size={18} />
                        {stats.orphanScenesCount + stats.orphanBeatsCount}
                    </div>
                    <div className="stat-label">Orphans Found</div>
                    <div className="stat-desc">
                        {stats.orphanScenesCount} scenes, {stats.orphanBeatsCount} beats
                    </div>
                </div>
            </div>
        </div>
    );
}
