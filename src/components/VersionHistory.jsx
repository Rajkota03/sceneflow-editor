import React, { useState, useMemo } from 'react';
import {
    Clock,
    Save,
    RotateCcw,
    ChevronRight,
    ChevronDown,
    GitBranch,
    Plus,
    Minus,
    Eye,
    X,
} from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import '../styles/version-history.css';

// ── Diff two block arrays ──
function diffBlocks(oldBlocks, newBlocks) {
    const diffs = [];
    const maxLen = Math.max(oldBlocks.length, newBlocks.length);

    for (let i = 0; i < maxLen; i++) {
        const oldB = oldBlocks[i];
        const newB = newBlocks[i];

        if (!oldB && newB) {
            diffs.push({ type: 'added', block: newB });
        } else if (oldB && !newB) {
            diffs.push({ type: 'removed', block: oldB });
        } else if (oldB && newB && (oldB.text !== newB.text || oldB.type !== newB.type)) {
            diffs.push({ type: 'changed', oldBlock: oldB, newBlock: newB });
        }
    }
    return diffs;
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function wordCount(blocks) {
    return blocks.reduce((sum, b) => sum + (b.text?.split(/\s+/).filter(Boolean).length || 0), 0);
}

export default function VersionHistory({ projectId }) {
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);
    const snapshots = useEditorStore((s) => s._snapshots?.[projectId] || []);
    const createSnapshot = useEditorStore((s) => s.createSnapshot);
    const restoreSnapshot = useEditorStore((s) => s.restoreSnapshot);

    const [selectedId, setSelectedId] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [showDiff, setShowDiff] = useState(false);
    const [confirmRestore, setConfirmRestore] = useState(null);

    const selected = snapshots.find((s) => s.id === selectedId);

    const diffs = useMemo(() => {
        if (!selected || !showDiff) return [];
        return diffBlocks(selected.blocks, blocks);
    }, [selected, blocks, showDiff]);

    // Group snapshots by date
    const grouped = useMemo(() => {
        const groups = {};
        [...snapshots].reverse().forEach((snap) => {
            const key = formatDate(snap.timestamp);
            if (!groups[key]) groups[key] = [];
            groups[key].push(snap);
        });
        return groups;
    }, [snapshots]);

    const handleCreateSnapshot = () => {
        const desc = 'Manual snapshot';
        createSnapshot(projectId, desc);
    };

    const handleRestore = (snapId) => {
        restoreSnapshot(projectId, snapId);
        setConfirmRestore(null);
        setSelectedId(null);
        setShowPreview(false);
    };

    return (
        <div className="version-history">
            <div className="vh-header">
                <div className="vh-title">
                    <GitBranch size={16} />
                    <span>Version History</span>
                </div>
                <button className="vh-save-btn" onClick={handleCreateSnapshot} title="Save snapshot">
                    <Save size={14} />
                </button>
            </div>

            <div className="vh-info">
                <span>{snapshots.length} snapshots</span>
                <span>·</span>
                <span>{wordCount(blocks)} words now</span>
            </div>

            {/* Timeline */}
            <div className="vh-timeline">
                {Object.entries(grouped).map(([dateLabel, snaps]) => (
                    <div key={dateLabel} className="vh-date-group">
                        <div className="vh-date-label">{dateLabel}</div>
                        {snaps.map((snap) => {
                            const isSelected = selectedId === snap.id;
                            const wc = wordCount(snap.blocks);
                            const currentWc = wordCount(blocks);
                            const delta = currentWc - wc;

                            return (
                                <div
                                    key={snap.id}
                                    className={`vh-snap ${isSelected ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedId(isSelected ? null : snap.id);
                                        setShowDiff(false);
                                        setShowPreview(false);
                                    }}
                                >
                                    <div className="vh-snap-dot" />
                                    <div className="vh-snap-info">
                                        <div className="vh-snap-row">
                                            <span className="vh-snap-time">{formatTime(snap.timestamp)}</span>
                                            <span className={`vh-snap-delta ${delta >= 0 ? 'positive' : 'negative'}`}>
                                                {delta >= 0 ? '+' : ''}{delta} words
                                            </span>
                                        </div>
                                        <span className="vh-snap-desc">{snap.description}</span>
                                        <span className="vh-snap-wc">{wc} words · {snap.blocks.length} blocks</span>
                                    </div>

                                    {isSelected && (
                                        <div className="vh-snap-actions">
                                            <button
                                                className="vh-action-btn"
                                                onClick={(e) => { e.stopPropagation(); setShowPreview(!showPreview); setShowDiff(false); }}
                                            >
                                                <Eye size={12} /> Preview
                                            </button>
                                            <button
                                                className="vh-action-btn"
                                                onClick={(e) => { e.stopPropagation(); setShowDiff(!showDiff); setShowPreview(false); }}
                                            >
                                                <GitBranch size={12} /> Diff
                                            </button>
                                            <button
                                                className="vh-action-btn vh-action-btn--restore"
                                                onClick={(e) => { e.stopPropagation(); setConfirmRestore(snap.id); }}
                                            >
                                                <RotateCcw size={12} /> Restore
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}

                {snapshots.length === 0 && (
                    <div className="vh-empty">
                        <Clock size={28} />
                        <p>No snapshots yet</p>
                        <span>Click the save icon to create your first snapshot</span>
                    </div>
                )}
            </div>

            {/* Preview Panel */}
            {showPreview && selected && (
                <div className="vh-preview">
                    <div className="vh-preview-header">
                        <span>Preview — {formatTime(selected.timestamp)}</span>
                        <button onClick={() => setShowPreview(false)}><X size={12} /></button>
                    </div>
                    <div className="vh-preview-content">
                        {selected.blocks.map((b, i) => (
                            <div key={i} className={`vh-preview-block vh-preview-block--${b.type}`}>
                                {b.text || '(empty)'}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Diff Panel */}
            {showDiff && selected && (
                <div className="vh-preview">
                    <div className="vh-preview-header">
                        <span>Changes since this snapshot</span>
                        <button onClick={() => setShowDiff(false)}><X size={12} /></button>
                    </div>
                    <div className="vh-preview-content">
                        {diffs.length === 0 && (
                            <div className="vh-diff-none">No changes</div>
                        )}
                        {diffs.map((d, i) => (
                            <div key={i} className={`vh-diff vh-diff--${d.type}`}>
                                {d.type === 'added' && (
                                    <><Plus size={11} /> <span>{d.block.text || '(empty block)'}</span></>
                                )}
                                {d.type === 'removed' && (
                                    <><Minus size={11} /> <span>{d.block.text || '(empty block)'}</span></>
                                )}
                                {d.type === 'changed' && (
                                    <div className="vh-diff-change">
                                        <div className="vh-diff-old"><Minus size={11} /> {d.oldBlock.text}</div>
                                        <div className="vh-diff-new"><Plus size={11} /> {d.newBlock.text}</div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Confirm Restore Modal */}
            {confirmRestore && (
                <div className="vh-confirm-overlay" onClick={() => setConfirmRestore(null)}>
                    <div className="vh-confirm" onClick={(e) => e.stopPropagation()}>
                        <h4>Restore Snapshot?</h4>
                        <p>This will replace your current work with this earlier version. Consider saving a snapshot first.</p>
                        <div className="vh-confirm-actions">
                            <button className="vh-confirm-cancel" onClick={() => setConfirmRestore(null)}>Cancel</button>
                            <button className="vh-confirm-restore" onClick={() => handleRestore(confirmRestore)}>
                                <RotateCcw size={14} /> Restore
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
