import React, { useState, useMemo } from 'react';
import { MessageSquare, Check, CheckCheck, Trash2, Filter } from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import '../styles/comments.css';

export default function CommentsPanel({ projectId }) {
    const allComments = useEditorStore((s) => s._comments[projectId] || {});
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);
    const { resolveComment, deleteComment, setActiveBlock } = useEditorStore();
    const [filter, setFilter] = useState('all'); // 'all' | 'open' | 'resolved'

    // Group comments by scene
    const groupedComments = useMemo(() => {
        const scenes = [];
        let currentScene = { heading: 'Before First Scene', headingId: null, comments: [] };

        blocks.forEach((block) => {
            if (block.type === 'scene-heading') {
                if (currentScene.comments.length > 0) {
                    scenes.push(currentScene);
                }
                currentScene = {
                    heading: block.text || 'UNTITLED SCENE',
                    headingId: block.id,
                    comments: [],
                };
            }

            const blockComments = allComments[block.id] || [];
            if (blockComments.length > 0) {
                blockComments.forEach((c) => {
                    currentScene.comments.push({
                        ...c,
                        blockId: block.id,
                        blockText: block.text?.slice(0, 60) || '',
                        blockType: block.type,
                    });
                });
            }
        });

        if (currentScene.comments.length > 0) {
            scenes.push(currentScene);
        }

        return scenes;
    }, [blocks, allComments]);

    // Apply filter
    const filteredScenes = useMemo(() => {
        if (filter === 'all') return groupedComments;
        return groupedComments
            .map((scene) => ({
                ...scene,
                comments: scene.comments.filter((c) =>
                    filter === 'open' ? !c.resolved : c.resolved
                ),
            }))
            .filter((scene) => scene.comments.length > 0);
    }, [groupedComments, filter]);

    // Count totals
    const totalCount = useMemo(() => {
        let total = 0;
        let open = 0;
        let resolved = 0;
        Object.values(allComments).forEach((arr) => {
            arr.forEach((c) => {
                total++;
                if (c.resolved) resolved++;
                else open++;
            });
        });
        return { total, open, resolved };
    }, [allComments]);

    const formatTime = (iso) => {
        const d = new Date(iso);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString();
    };

    const handleJumpToBlock = (blockId) => {
        setActiveBlock(blockId);
        const el = document.querySelector(`[data-block-id="${blockId}"]`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();
        }
    };

    return (
        <div className="comments-panel">
            <div className="comments-panel-header">
                <div className="comments-panel-title">
                    <MessageSquare size={14} />
                    <span>Comments</span>
                    {totalCount.total > 0 && (
                        <span className="comments-total-badge">{totalCount.total}</span>
                    )}
                </div>
                <div className="comments-filter-row">
                    <button
                        className={`comments-filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All ({totalCount.total})
                    </button>
                    <button
                        className={`comments-filter-btn ${filter === 'open' ? 'active' : ''}`}
                        onClick={() => setFilter('open')}
                    >
                        Open ({totalCount.open})
                    </button>
                    <button
                        className={`comments-filter-btn ${filter === 'resolved' ? 'active' : ''}`}
                        onClick={() => setFilter('resolved')}
                    >
                        Resolved ({totalCount.resolved})
                    </button>
                </div>
            </div>

            <div className="comments-panel-body">
                {filteredScenes.length === 0 && (
                    <div className="comments-panel-empty">
                        <MessageSquare size={24} />
                        <p>No comments {filter !== 'all' ? `(${filter})` : 'yet'}</p>
                        <span>Right-click any block to add a comment</span>
                    </div>
                )}

                {filteredScenes.map((scene, sIdx) => (
                    <div key={sIdx} className="comments-scene-group">
                        <div className="comments-scene-heading">
                            {scene.heading}
                        </div>
                        {scene.comments.map((c) => (
                            <div
                                key={c.id}
                                className={`comments-panel-item ${c.resolved ? 'resolved' : ''}`}
                            >
                                <div
                                    className="comments-panel-item-block"
                                    onClick={() => handleJumpToBlock(c.blockId)}
                                    title="Jump to block"
                                >
                                    <span className="comments-block-type-tag">{c.blockType}</span>
                                    <span className="comments-block-preview">
                                        {c.blockText || '(empty)'}
                                    </span>
                                </div>
                                <div className="comments-panel-item-body">
                                    <div className="comments-panel-item-meta">
                                        <span className="comment-author">{c.author}</span>
                                        <span className="comment-time">{formatTime(c.createdAt)}</span>
                                    </div>
                                    <div className="comments-panel-item-text">{c.text}</div>
                                    <div className="comments-panel-item-actions">
                                        <button
                                            onClick={() => resolveComment(projectId, c.blockId, c.id)}
                                            className={c.resolved ? 'resolved-btn' : ''}
                                        >
                                            {c.resolved ? <CheckCheck size={11} /> : <Check size={11} />}
                                            <span>{c.resolved ? 'Resolved' : 'Resolve'}</span>
                                        </button>
                                        <button
                                            onClick={() => deleteComment(projectId, c.blockId, c.id)}
                                            className="delete-btn"
                                        >
                                            <Trash2 size={11} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
