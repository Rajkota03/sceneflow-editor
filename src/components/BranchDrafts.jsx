import React, { useState } from 'react';
import {
    GitBranch,
    Plus,
    ArrowLeftRight,
    Merge,
    Trash2,
    X,
    Check,
} from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import '../styles/branch-drafts.css';

function formatDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
        return 'Today ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
        return 'Yesterday ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
        ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function BranchDrafts({ projectId }) {
    const branches = useEditorStore((s) => s._branches[projectId] || []);
    const activeBranchId = useEditorStore((s) => s._activeBranch[projectId] || null);
    const createBranch = useEditorStore((s) => s.createBranch);
    const switchBranch = useEditorStore((s) => s.switchBranch);
    const mergeBranch = useEditorStore((s) => s.mergeBranch);
    const deleteBranch = useEditorStore((s) => s.deleteBranch);

    const [showNewBranch, setShowNewBranch] = useState(false);
    const [newBranchName, setNewBranchName] = useState('');
    const [confirmMerge, setConfirmMerge] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const activeBranch = branches.find(b => b.id === activeBranchId);
    const currentName = activeBranch ? activeBranch.name : 'Main';

    const handleCreate = () => {
        if (!newBranchName.trim()) return;
        createBranch(projectId, newBranchName.trim());
        setNewBranchName('');
        setShowNewBranch(false);
    };

    const handleMerge = (branchId) => {
        mergeBranch(projectId, branchId);
        setConfirmMerge(null);
    };

    const handleDelete = (branchId) => {
        deleteBranch(projectId, branchId);
        setConfirmDelete(null);
    };

    return (
        <div className="branch-drafts">
            <div className="bd-header">
                <div className="bd-title">
                    <GitBranch size={16} />
                    <span>Branch Drafts</span>
                </div>
                <button
                    className="bd-new-btn"
                    onClick={() => setShowNewBranch(!showNewBranch)}
                    title="New branch"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* Current branch indicator */}
            <div className="bd-current">
                <div className={`bd-current-dot ${activeBranchId ? 'branch' : 'main'}`} />
                <span className="bd-current-label">On: <strong>{currentName}</strong></span>
                {activeBranchId && (
                    <button
                        className="bd-switch-main-btn"
                        onClick={() => switchBranch(projectId, null)}
                        title="Switch to Main"
                    >
                        Back to Main
                    </button>
                )}
            </div>

            {/* New branch input */}
            {showNewBranch && (
                <div className="bd-new-form">
                    <input
                        type="text"
                        className="bd-new-input"
                        placeholder="Branch name..."
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreate();
                            if (e.key === 'Escape') { setShowNewBranch(false); setNewBranchName(''); }
                        }}
                        autoFocus
                    />
                    <button className="bd-create-btn" onClick={handleCreate} disabled={!newBranchName.trim()}>
                        <Check size={12} /> Create
                    </button>
                    <button className="bd-cancel-btn" onClick={() => { setShowNewBranch(false); setNewBranchName(''); }}>
                        <X size={12} />
                    </button>
                </div>
            )}

            {/* Branch list */}
            <div className="bd-list">
                {branches.length === 0 && (
                    <div className="bd-empty">
                        <GitBranch size={28} />
                        <p>No branches yet</p>
                        <span>Create a branch to experiment with your script</span>
                    </div>
                )}

                {branches.map((branch) => {
                    const isActive = branch.id === activeBranchId;
                    const wordCount = branch.blocks.reduce((sum, b) => {
                        const words = b.text?.trim().split(/\s+/).filter(Boolean).length || 0;
                        return sum + words;
                    }, 0);

                    return (
                        <div key={branch.id} className={`bd-branch ${isActive ? 'active' : ''}`}>
                            <div className="bd-branch-info">
                                <div className="bd-branch-row">
                                    <div className={`bd-branch-dot ${isActive ? 'active' : ''}`} />
                                    <span className="bd-branch-name">{branch.name}</span>
                                    {isActive && <span className="bd-active-badge">Active</span>}
                                </div>
                                <div className="bd-branch-meta">
                                    <span>{formatDate(branch.createdAt)}</span>
                                    <span>{wordCount} words</span>
                                    <span>{branch.blocks.length} blocks</span>
                                </div>
                            </div>
                            <div className="bd-branch-actions">
                                {!isActive && (
                                    <button
                                        className="bd-action-btn"
                                        onClick={() => switchBranch(projectId, branch.id)}
                                        title="Switch to this branch"
                                    >
                                        <ArrowLeftRight size={12} /> Switch
                                    </button>
                                )}
                                <button
                                    className="bd-action-btn bd-action-btn--merge"
                                    onClick={() => setConfirmMerge(branch.id)}
                                    title="Merge into main"
                                >
                                    <Merge size={12} /> Merge
                                </button>
                                <button
                                    className="bd-action-btn bd-action-btn--delete"
                                    onClick={() => setConfirmDelete(branch.id)}
                                    title="Delete branch"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Merge confirmation */}
            {confirmMerge && (
                <div className="bd-confirm-overlay" onClick={() => setConfirmMerge(null)}>
                    <div className="bd-confirm" onClick={(e) => e.stopPropagation()}>
                        <h4>Merge Branch?</h4>
                        <p>
                            This will replace the main script with the branch content.
                            A snapshot will be saved before merging so you can undo this.
                        </p>
                        <div className="bd-confirm-actions">
                            <button className="bd-confirm-cancel" onClick={() => setConfirmMerge(null)}>
                                Cancel
                            </button>
                            <button className="bd-confirm-merge" onClick={() => handleMerge(confirmMerge)}>
                                <Merge size={14} /> Merge
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation */}
            {confirmDelete && (
                <div className="bd-confirm-overlay" onClick={() => setConfirmDelete(null)}>
                    <div className="bd-confirm" onClick={(e) => e.stopPropagation()}>
                        <h4>Delete Branch?</h4>
                        <p>This will permanently remove this branch and all its content. This cannot be undone.</p>
                        <div className="bd-confirm-actions">
                            <button className="bd-confirm-cancel" onClick={() => setConfirmDelete(null)}>
                                Cancel
                            </button>
                            <button className="bd-confirm-delete" onClick={() => handleDelete(confirmDelete)}>
                                <Trash2 size={14} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
