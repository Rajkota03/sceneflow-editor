import React from 'react';
import useBeatStore from '../stores/beatStore';
import BeatCard from './BeatCard';
import '../styles/spine-timeline.css';

export default function SpineTimelineView({ projectId }) {
    const { getBeats } = useBeatStore();
    const beats = getBeats(projectId);

    // Filter to just top-level beats for the main horizontal lane
    const topLevelBeats = beats.filter(b => b.parentId === null);

    // Calculate maximum page to scale the timeline proportionally
    const maxPage = Math.max(10, ...topLevelBeats.map(b => b.targetPageEnd || 10));

    // A multiplier to define how many pixels one page takes up.
    // E.g., 100 pages * 30px = 3000px wide scrolling track.
    const pxPerPage = 40;
    const totalWidth = maxPage * pxPerPage;

    return (
        <div className="spine-timeline-container">
            <div className="timeline-scroll-area">
                <div className="timeline-track" style={{ width: `${totalWidth}px` }}>
                    {/* The horizontal rule representing the spine */}
                    <div className="timeline-line"></div>

                    {/* Page markers (optional) */}
                    <div className="timeline-markers">
                        {Array.from({ length: Math.ceil(maxPage / 10) + 1 }).map((_, i) => (
                            <div key={i} className="page-marker" style={{ left: `${(i * 10 / maxPage) * 100}%` }}>
                                <span>{i * 10}</span>
                            </div>
                        ))}
                    </div>

                    {/* Beat Nodes mapped proportionally */}
                    <div className="timeline-nodes-container">
                        {topLevelBeats.map((beat, index) => {
                            const startPage = beat.targetPageStart || 1;
                            const endPage = Math.max(startPage + 1, beat.targetPageEnd || startPage + 1);

                            // To prevent overlapping too much, we alternate vertical positioning slightly
                            const isAlt = index % 2 === 1;

                            return (
                                <div
                                    key={beat.id}
                                    className={`timeline-beat-node ${isAlt ? 'alt-position' : ''}`}
                                    style={{
                                        left: `${(startPage / maxPage) * 100}%`,
                                        width: `${((endPage - startPage) / maxPage) * 100}%`
                                    }}
                                >
                                    {/* The connecting dot to the main timeline line */}
                                    <div className="node-connector"></div>
                                    <div className="node-content">
                                        <BeatCard beat={beat} viewMode="timeline" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
