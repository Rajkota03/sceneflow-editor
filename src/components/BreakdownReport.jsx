import React, { useMemo, useState } from 'react';
import {
    MapPin,
    Users as UsersIcon,
    Sun,
    Moon,
    Sunrise,
    Download,
    ClipboardList,
    Film,
    Hash,
} from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import '../styles/breakdown.css';

// ── Parse breakdown data from blocks ──
function analyzeBreakdown(blocks) {
    const locations = {};
    const cast = {};
    let dayCount = 0, nightCount = 0, otherTime = 0;
    let intCount = 0, extCount = 0;
    let currentScene = 0;
    let currentChar = null;

    blocks.forEach((block) => {
        if (block.type === 'scene-heading') {
            currentScene++;
            const text = (block.text || '').toUpperCase();

            // Interior / Exterior
            if (text.startsWith('INT.') || text.startsWith('INT ')) intCount++;
            else if (text.startsWith('EXT.') || text.startsWith('EXT ')) extCount++;

            // Day / Night
            if (text.includes('DAY')) dayCount++;
            else if (text.includes('NIGHT')) nightCount++;
            else otherTime++;

            // Location extraction (between INT./EXT. and - DAY/NIGHT)
            let loc = text.replace(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)?\s*/i, '');
            loc = loc.replace(/\s*[-—]\s*(DAY|NIGHT|DAWN|DUSK|MORNING|EVENING|LATER|CONTINUOUS|SAME).*$/i, '').trim();
            if (loc) {
                if (!locations[loc]) locations[loc] = { name: loc, scenes: [], pageCount: 0 };
                locations[loc].scenes.push(currentScene);
            }
        }

        if (block.type === 'character') {
            const name = (block.text || '').trim().toUpperCase().replace(/\s*\(.*\)$/, '');
            if (name) {
                currentChar = name;
                if (!cast[name]) cast[name] = { name, firstScene: currentScene, scenes: new Set() };
                cast[name].scenes.add(currentScene);
            }
        }
    });

    // Estimate page counts per location
    const totalScenes = currentScene;
    const totalPages = Math.max(1, Math.round(
        blocks.reduce((s, b) => s + (b.text?.split(/\s+/).filter(Boolean).length || 0), 0) / 250
    ));

    Object.values(locations).forEach((loc) => {
        loc.pageCount = Math.round((loc.scenes.length / Math.max(1, totalScenes)) * totalPages);
    });

    return {
        locations: Object.values(locations).sort((a, b) => b.scenes.length - a.scenes.length),
        cast: Object.values(cast).map(c => ({ ...c, scenes: c.scenes.size })).sort((a, b) => a.firstScene - b.firstScene),
        dayCount, nightCount, otherTime,
        intCount, extCount,
        totalScenes, totalPages,
    };
}

function exportCSV(data) {
    let csv = 'Type,Name,Scenes,Page Count\n';
    data.locations.forEach((l) => {
        csv += `Location,"${l.name}",${l.scenes.length},${l.pageCount}\n`;
    });
    csv += '\nCharacter,First Scene,Total Scenes\n';
    data.cast.forEach((c) => {
        csv += `"${c.name}",${c.firstScene},${c.scenes}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'breakdown-report.csv';
    a.click();
    URL.revokeObjectURL(url);
}

export default function BreakdownReport({ projectId }) {
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);
    const [tab, setTab] = useState('locations');

    const data = useMemo(() => analyzeBreakdown(blocks), [blocks]);

    return (
        <div className="breakdown">
            <div className="breakdown-header">
                <div className="breakdown-title">
                    <ClipboardList size={16} />
                    <span>Breakdown</span>
                </div>
                <button className="breakdown-export" onClick={() => exportCSV(data)} title="Export CSV">
                    <Download size={14} />
                </button>
            </div>

            {/* Quick Stats */}
            <div className="breakdown-quick-stats">
                <div className="bq-stat">
                    <span className="bq-value">{data.totalScenes}</span>
                    <span className="bq-label">Scenes</span>
                </div>
                <div className="bq-stat">
                    <span className="bq-value">{data.totalPages}</span>
                    <span className="bq-label">Pages</span>
                </div>
                <div className="bq-stat">
                    <span className="bq-value">{data.cast.length}</span>
                    <span className="bq-label">Cast</span>
                </div>
                <div className="bq-stat">
                    <span className="bq-value">{data.locations.length}</span>
                    <span className="bq-label">Locations</span>
                </div>
            </div>

            {/* Day/Night + Int/Ext pills */}
            <div className="breakdown-pills">
                <div className="bp-pill">
                    <Sun size={11} className="bp-day" />
                    <span>{data.dayCount} Day</span>
                </div>
                <div className="bp-pill">
                    <Moon size={11} className="bp-night" />
                    <span>{data.nightCount} Night</span>
                </div>
                <div className="bp-pill">
                    <span>INT {data.intCount}</span>
                </div>
                <div className="bp-pill">
                    <span>EXT {data.extCount}</span>
                </div>
            </div>

            {/* Tab toggles */}
            <div className="breakdown-tabs">
                <button className={`bd-tab ${tab === 'locations' ? 'active' : ''}`} onClick={() => setTab('locations')}>
                    <MapPin size={12} /> Locations
                </button>
                <button className={`bd-tab ${tab === 'cast' ? 'active' : ''}`} onClick={() => setTab('cast')}>
                    <UsersIcon size={12} /> Cast
                </button>
            </div>

            {/* Location List */}
            {tab === 'locations' && (
                <div className="breakdown-list">
                    {data.locations.map((loc, i) => (
                        <div key={i} className="bd-item">
                            <span className="bd-item-name">{loc.name}</span>
                            <div className="bd-item-meta">
                                <span><Film size={10} /> {loc.scenes.length}</span>
                                <span><Hash size={10} /> ~{loc.pageCount}p</span>
                            </div>
                        </div>
                    ))}
                    {data.locations.length === 0 && (
                        <div className="bd-empty">No locations found</div>
                    )}
                </div>
            )}

            {/* Cast List */}
            {tab === 'cast' && (
                <div className="breakdown-list">
                    {data.cast.map((c, i) => (
                        <div key={i} className="bd-item">
                            <span className="bd-item-name">{c.name}</span>
                            <div className="bd-item-meta">
                                <span>First: Sc. {c.firstScene}</span>
                                <span>{c.scenes} scenes</span>
                            </div>
                        </div>
                    ))}
                    {data.cast.length === 0 && (
                        <div className="bd-empty">No cast found</div>
                    )}
                </div>
            )}
        </div>
    );
}
