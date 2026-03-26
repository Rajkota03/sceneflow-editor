import React from 'react';
import { Palette, Check } from 'lucide-react';
import useUIStore, { REVISION_COLORS } from '../stores/uiStore';
import '../styles/revision-colors.css';

export default function RevisionColorPicker() {
    const revisionColor = useUIStore((s) => s.revisionColor);
    const revisionHistory = useUIStore((s) => s.revisionHistory);
    const setRevisionColor = useUIStore((s) => s.setRevisionColor);
    const addRevisionRound = useUIStore((s) => s.addRevisionRound);

    const handleSelectColor = (colorId) => {
        setRevisionColor(colorId);
        // If this color hasn't been used as a revision round yet, add it
        const alreadyUsed = revisionHistory.some(r => r.color === colorId);
        if (!alreadyUsed) {
            const colorObj = REVISION_COLORS.find(c => c.id === colorId);
            addRevisionRound(colorId, colorObj?.label || colorId);
        }
    };

    return (
        <div className="revision-color-picker">
            <div className="rcp-header">
                <Palette size={14} />
                <span>Revision Colors</span>
            </div>
            <div className="rcp-description">
                Industry-standard colored pages for tracking script revisions.
            </div>
            <div className="rcp-swatches">
                {REVISION_COLORS.map((color, idx) => {
                    const isActive = revisionColor === color.id;
                    const historyEntry = revisionHistory.find(r => r.color === color.id);
                    const roundNum = revisionHistory.findIndex(r => r.color === color.id) + 1;

                    return (
                        <button
                            key={color.id}
                            className={`rcp-swatch ${isActive ? 'active' : ''}`}
                            onClick={() => handleSelectColor(color.id)}
                            title={color.label}
                        >
                            <div
                                className="rcp-swatch-color"
                                style={{ backgroundColor: color.hex }}
                            >
                                {isActive && <Check size={10} className="rcp-check" />}
                            </div>
                            <span className="rcp-swatch-label">{color.label}</span>
                            {historyEntry && (
                                <span className="rcp-round-num">Rev {roundNum}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {revisionHistory.length > 0 && (
                <div className="rcp-history">
                    <div className="rcp-history-title">Revision Rounds</div>
                    {revisionHistory.map((round, idx) => {
                        const colorObj = REVISION_COLORS.find(c => c.id === round.color);
                        return (
                            <div key={idx} className="rcp-history-item">
                                <div
                                    className="rcp-history-dot"
                                    style={{ backgroundColor: colorObj?.hex || '#888' }}
                                />
                                <span className="rcp-history-label">
                                    Rev {idx + 1} - {round.label}
                                </span>
                                <span className="rcp-history-date">
                                    {new Date(round.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
