import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Check, CheckCheck, Trash2, Send } from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import '../styles/comments.css';

export default function CommentBubble({ projectId, blockId }) {
    const comments = useEditorStore((s) => {
        const pc = s._comments[projectId] || {};
        return pc[blockId] || [];
    });
    const { addComment, resolveComment, deleteComment } = useEditorStore();
    const [expanded, setExpanded] = useState(false);
    const [newText, setNewText] = useState('');
    const panelRef = useRef(null);
    const inputRef = useRef(null);

    // Close panel on outside click
    useEffect(() => {
        if (!expanded) return;
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setExpanded(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [expanded]);

    // Auto-focus input when opening
    useEffect(() => {
        if (expanded && inputRef.current) {
            inputRef.current.focus();
        }
    }, [expanded]);

    if (comments.length === 0 && !expanded) return null;

    const unresolvedCount = comments.filter((c) => !c.resolved).length;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newText.trim()) return;
        addComment(projectId, blockId, newText.trim());
        setNewText('');
    };

    const formatTime = (iso) => {
        const d = new Date(iso);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString();
    };

    return (
        <div className="comment-bubble-container" ref={panelRef}>
            {/* Indicator icon */}
            <button
                className={`comment-bubble-trigger ${unresolvedCount > 0 ? 'has-unresolved' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                }}
                title={`${comments.length} comment${comments.length !== 1 ? 's' : ''}`}
            >
                <MessageSquare size={13} />
                {unresolvedCount > 0 && (
                    <span className="comment-count-badge">{unresolvedCount}</span>
                )}
            </button>

            {/* Expanded comment thread */}
            {expanded && (
                <div className="comment-thread-popup">
                    <div className="comment-thread-header">
                        <span>Comments ({comments.length})</span>
                    </div>
                    <div className="comment-thread-list">
                        {comments.map((c) => (
                            <div
                                key={c.id}
                                className={`comment-item ${c.resolved ? 'resolved' : ''}`}
                            >
                                <div className="comment-item-header">
                                    <span className="comment-author">{c.author}</span>
                                    <span className="comment-time">{formatTime(c.createdAt)}</span>
                                </div>
                                <div className="comment-item-text">{c.text}</div>
                                <div className="comment-item-actions">
                                    <button
                                        onClick={() => resolveComment(projectId, blockId, c.id)}
                                        title={c.resolved ? 'Unresolve' : 'Resolve'}
                                        className={c.resolved ? 'resolved-btn' : ''}
                                    >
                                        {c.resolved ? <CheckCheck size={12} /> : <Check size={12} />}
                                        <span>{c.resolved ? 'Resolved' : 'Resolve'}</span>
                                    </button>
                                    <button
                                        onClick={() => deleteComment(projectId, blockId, c.id)}
                                        title="Delete"
                                        className="delete-btn"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {comments.length === 0 && (
                            <div className="comment-empty">No comments yet.</div>
                        )}
                    </div>
                    <form className="comment-input-row" onSubmit={handleSubmit}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={newText}
                            onChange={(e) => setNewText(e.target.value)}
                            placeholder="Add a comment..."
                            className="comment-input"
                        />
                        <button type="submit" className="comment-send-btn" disabled={!newText.trim()}>
                            <Send size={13} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
