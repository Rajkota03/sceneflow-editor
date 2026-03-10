import React from 'react';
import { Tag, Clock } from 'lucide-react';
import '../styles/beat-card.css';

export default function BeatCard({ beat, viewMode }) {
    // viewMode could be 'timeline', 'board', 'outline', etc.

    return (
        <div
            className={`beat-card view-${viewMode} status-${beat.status}`}
            style={{
                borderTopColor: beat.color || 'var(--primary-color)',
                backgroundColor: beat.color ? `${beat.color}15` : undefined // 15 is hex opacity ~8%
            }}
        >
            <div className="beat-card-header">
                <h4 className="beat-title" title={beat.title}>{beat.title}</h4>
                <div className="beat-page-range">
                    <Clock size={12} />
                    <span>p. {beat.targetPageStart}-{beat.targetPageEnd}</span>
                </div>
            </div>

            <p className="beat-description">{beat.description}</p>

            {(beat.emotionalTones && beat.emotionalTones.length > 0) && (
                <div className="beat-tones">
                    {beat.emotionalTones.map(tone => (
                        <span key={tone} className="tone-tag">{tone}</span>
                    ))}
                </div>
            )}

            <div className="beat-footer">
                <div className="beat-status-label">{beat.status.toUpperCase()}</div>
                {beat.linkedSceneIds && beat.linkedSceneIds.length > 0 && (
                    <div className="linked-scenes-count" title={`${beat.linkedSceneIds.length} scenes linked`}>
                        <Tag size={12} />
                        <span>{beat.linkedSceneIds.length}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
