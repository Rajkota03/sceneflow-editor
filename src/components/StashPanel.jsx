import React, { useState } from 'react';
import {
    Clipboard,
    Copy,
    TextCursorInput,
    Trash2,
    XCircle,
    Archive,
} from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import '../styles/stash-panel.css';

const TYPE_LABELS = {
    'scene-heading': 'Scene',
    'action': 'Action',
    'character': 'Char',
    'dialogue': 'Dial',
    'parenthetical': 'Paren',
    'transition': 'Trans',
    'unknown': 'Text',
};

const TYPE_COLORS = {
    'scene-heading': '#e8a838',
    'action': '#8a8690',
    'character': '#60a5fa',
    'dialogue': '#f0ece4',
    'parenthetical': '#a78bfa',
    'transition': '#f472b6',
    'unknown': '#56525c',
};

function formatTime(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function StashPanel({ projectId }) {
    const stash = useEditorStore((s) => s._stash[projectId] || []);
    const removeFromStash = useEditorStore((s) => s.removeFromStash);
    const clearStash = useEditorStore((s) => s.clearStash);
    const activeBlockId = useEditorStore((s) => s.activeBlockId);
    const updateBlockText = useEditorStore((s) => s.updateBlockText);
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);

    const [copiedId, setCopiedId] = useState(null);
    const [confirmClear, setConfirmClear] = useState(false);

    const handleCopy = async (text, id) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 1500);
        } catch (err) {
            // fallback
        }
    };

    const handleInsertAtCursor = (text) => {
        if (!activeBlockId) return;
        const activeBlock = blocks.find(b => b.id === activeBlockId);
        if (!activeBlock) return;

        // Append the stashed text to the current block's text
        const newText = activeBlock.text ? activeBlock.text + ' ' + text : text;
        updateBlockText(projectId, activeBlockId, newText);

        // Update the DOM as well
        const el = document.querySelector(`[data-block-id="${activeBlockId}"]`);
        if (el) {
            el.textContent = newText;
        }
    };

    const handleClearAll = () => {
        clearStash(projectId);
        setConfirmClear(false);
    };

    return (
        <div className="stash-panel">
            <div className="sp-header">
                <div className="sp-title">
                    <Clipboard size={16} />
                    <span>Stash</span>
                </div>
                {stash.length > 0 && (
                    <button
                        className="sp-clear-btn"
                        onClick={() => setConfirmClear(true)}
                        title="Clear all"
                    >
                        <XCircle size={14} />
                    </button>
                )}
            </div>

            <div className="sp-info">
                <span>{stash.length} item{stash.length !== 1 ? 's' : ''} stashed</span>
            </div>

            <div className="sp-list">
                {stash.length === 0 && (
                    <div className="sp-empty">
                        <Archive size={28} />
                        <p>Stash is empty</p>
                        <span>Deleted text will appear here for easy retrieval</span>
                    </div>
                )}

                {stash.map((item) => (
                    <div key={item.id} className="sp-item">
                        <div className="sp-item-header">
                            <span
                                className="sp-type-badge"
                                style={{ backgroundColor: `${TYPE_COLORS[item.type] || TYPE_COLORS.unknown}20`, color: TYPE_COLORS[item.type] || TYPE_COLORS.unknown }}
                            >
                                {TYPE_LABELS[item.type] || 'Text'}
                            </span>
                            <span className="sp-item-time">{formatTime(item.stashedAt)}</span>
                            {item.source === 'deleted-block' && (
                                <span className="sp-source-badge">Deleted</span>
                            )}
                        </div>
                        <div className="sp-item-preview" onClick={() => handleCopy(item.text, item.id)}>
                            {item.text.length > 120 ? item.text.slice(0, 120) + '...' : item.text}
                        </div>
                        <div className="sp-item-actions">
                            <button
                                className={`sp-action-btn ${copiedId === item.id ? 'copied' : ''}`}
                                onClick={() => handleCopy(item.text, item.id)}
                                title="Copy to clipboard"
                            >
                                <Copy size={11} />
                                {copiedId === item.id ? 'Copied!' : 'Copy'}
                            </button>
                            <button
                                className="sp-action-btn sp-action-btn--insert"
                                onClick={() => handleInsertAtCursor(item.text)}
                                title="Insert at cursor"
                                disabled={!activeBlockId}
                            >
                                <TextCursorInput size={11} /> Insert
                            </button>
                            <button
                                className="sp-action-btn sp-action-btn--delete"
                                onClick={() => removeFromStash(projectId, item.id)}
                                title="Remove from stash"
                            >
                                <Trash2 size={11} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Clear confirmation */}
            {confirmClear && (
                <div className="sp-confirm-overlay" onClick={() => setConfirmClear(false)}>
                    <div className="sp-confirm" onClick={(e) => e.stopPropagation()}>
                        <h4>Clear Stash?</h4>
                        <p>This will remove all {stash.length} stashed items. This cannot be undone.</p>
                        <div className="sp-confirm-actions">
                            <button className="sp-confirm-cancel" onClick={() => setConfirmClear(false)}>
                                Cancel
                            </button>
                            <button className="sp-confirm-clear" onClick={handleClearAll}>
                                <Trash2 size={14} /> Clear All
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
