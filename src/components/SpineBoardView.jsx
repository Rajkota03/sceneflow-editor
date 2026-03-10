import React from 'react';
import useBeatStore from '../stores/beatStore';
import BeatCard from './BeatCard';
import '../styles/spine-board.css';

export default function SpineBoardView({ projectId }) {
    const { getBeats } = useBeatStore();
    const beats = getBeats(projectId);

    const topLevelBeats = beats.filter(b => b.parentId === null);

    // Determine if it's a flat structure or hierarchical
    const isHierarchical = beats.some(b => b.parentId !== null);

    if (isHierarchical) {
        return (
            <div className="spine-board-container columns-mode">
                {topLevelBeats.map(columnBeat => {
                    const children = beats.filter(b => b.parentId === columnBeat.id);
                    return (
                        <div key={columnBeat.id} className="board-column">
                            <div className="board-column-header">
                                <h3 title={columnBeat.description}>{columnBeat.title}</h3>
                                <span className="column-count">{children.length}</span>
                            </div>
                            <div className="board-column-content">
                                {children.map(child => (
                                    <BeatCard key={child.id} beat={child} viewMode="board" />
                                ))}
                                {children.length === 0 && (
                                    <div className="empty-column-placeholder">No sub-beats</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Flat structure: render as a masonry/wrap grid of cards
    return (
        <div className="spine-board-container grid-mode">
            {topLevelBeats.map(beat => (
                <div key={beat.id} className="board-grid-item">
                    <BeatCard beat={beat} viewMode="board" />
                </div>
            ))}
        </div>
    );
}
