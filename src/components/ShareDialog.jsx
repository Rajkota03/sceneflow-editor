import React, { useState, useCallback } from 'react';
import {
    X,
    Link2,
    Copy,
    Check,
    Trash2,
    Globe,
    Lock,
    ChevronDown,
    UserPlus,
    CloudOff,
} from 'lucide-react';
import supabase from '../lib/supabase';
import useAuthStore from '../stores/authStore';
import '../styles/share-dialog.css';

const PERMISSION_LEVELS = [
    { value: 'editor', label: 'Editor', description: 'Can edit the screenplay' },
    { value: 'commenter', label: 'Commenter', description: 'Can add comments' },
    { value: 'viewer', label: 'Viewer', description: 'Can view only' },
];

export default function ShareDialog({ projectId, projectTitle, isOpen, onClose }) {
    const user = useAuthStore((s) => s.user);
    const isCloudAvailable = !!supabase && !!user;

    const [email, setEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState('editor');
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [isPublic, setIsPublic] = useState(false);
    const [shareError, setShareError] = useState('');

    // Mock shared users (would come from Supabase in production)
    const [sharedUsers, setSharedUsers] = useState([]);

    if (!isOpen) return null;

    const shareableLink = `${window.location.origin}/project/${projectId}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareableLink).then(() => {
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        }).catch(() => {
            // Fallback
            setLinkCopied(false);
        });
    };

    const handleInvite = () => {
        if (!email.trim()) return;

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setShareError('Please enter a valid email address.');
            return;
        }

        // Check for duplicate
        if (sharedUsers.find((u) => u.email === email.trim())) {
            setShareError('This person already has access.');
            return;
        }

        setShareError('');

        const newUser = {
            id: Date.now().toString(),
            email: email.trim(),
            name: email.trim().split('@')[0],
            role: selectedRole,
            addedAt: new Date().toISOString(),
            avatar: null,
        };

        setSharedUsers((prev) => [...prev, newUser]);
        setEmail('');
    };

    const handleRemoveUser = (userId) => {
        setSharedUsers((prev) => prev.filter((u) => u.id !== userId));
    };

    const handleChangeRole = (userId, newRole) => {
        setSharedUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleInvite();
        }
    };

    const getRoleLabel = (roleValue) => {
        return PERMISSION_LEVELS.find((p) => p.value === roleValue)?.label || roleValue;
    };

    return (
        <div className="share-overlay" onClick={onClose}>
            <div className="share-dialog" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="share-header">
                    <h2 className="share-title">Share "{projectTitle || 'Untitled'}"</h2>
                    <button className="share-close" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                {/* Cloud not available warning */}
                {!isCloudAvailable && (
                    <div className="share-cloud-warning">
                        <CloudOff size={16} />
                        <div>
                            <strong>Cloud features require Supabase configuration</strong>
                            <p>
                                Sharing and collaboration require a Supabase backend.
                                Configure your environment variables to enable these features.
                            </p>
                        </div>
                    </div>
                )}

                {/* Invite section */}
                <div className={`share-invite-section ${!isCloudAvailable ? 'share-section--disabled' : ''}`}>
                    <div className="share-invite-row">
                        <div className="share-invite-input-wrap">
                            <UserPlus size={14} className="share-invite-icon" />
                            <input
                                type="email"
                                placeholder="Add people by email..."
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setShareError(''); }}
                                onKeyDown={handleKeyDown}
                                disabled={!isCloudAvailable}
                                className="share-invite-input"
                            />
                        </div>

                        <div className="share-role-picker">
                            <button
                                className="share-role-btn"
                                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                                disabled={!isCloudAvailable}
                            >
                                {getRoleLabel(selectedRole)}
                                <ChevronDown size={12} />
                            </button>
                            {showRoleDropdown && (
                                <div className="share-role-dropdown">
                                    {PERMISSION_LEVELS.map((perm) => (
                                        <button
                                            key={perm.value}
                                            className={`share-role-option ${selectedRole === perm.value ? 'active' : ''}`}
                                            onClick={() => {
                                                setSelectedRole(perm.value);
                                                setShowRoleDropdown(false);
                                            }}
                                        >
                                            <span className="share-role-option-label">{perm.label}</span>
                                            <span className="share-role-option-desc">{perm.description}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            className="share-invite-btn"
                            onClick={handleInvite}
                            disabled={!isCloudAvailable || !email.trim()}
                        >
                            Invite
                        </button>
                    </div>
                    {shareError && (
                        <div className="share-error">{shareError}</div>
                    )}
                </div>

                {/* People with access */}
                <div className="share-people-section">
                    <h3 className="share-section-title">People with access</h3>

                    {/* Owner */}
                    <div className="share-person">
                        <div className="share-person-avatar share-person-avatar--owner">
                            {user?.email?.charAt(0).toUpperCase() || 'Y'}
                        </div>
                        <div className="share-person-info">
                            <span className="share-person-name">
                                {user?.user_metadata?.display_name || user?.email || 'You'}
                            </span>
                            <span className="share-person-email">
                                {user?.email || 'Local user'}
                            </span>
                        </div>
                        <span className="share-person-role share-person-role--owner">Owner</span>
                    </div>

                    {/* Shared users */}
                    {sharedUsers.map((person) => (
                        <div key={person.id} className="share-person">
                            <div
                                className="share-person-avatar"
                                style={{ backgroundColor: stringToColor(person.email) }}
                            >
                                {person.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="share-person-info">
                                <span className="share-person-name">{person.name}</span>
                                <span className="share-person-email">{person.email}</span>
                            </div>
                            <div className="share-person-actions">
                                <select
                                    className="share-person-role-select"
                                    value={person.role}
                                    onChange={(e) => handleChangeRole(person.id, e.target.value)}
                                >
                                    {PERMISSION_LEVELS.map((p) => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                                <button
                                    className="share-person-remove"
                                    onClick={() => handleRemoveUser(person.id)}
                                    title="Remove access"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {sharedUsers.length === 0 && (
                        <div className="share-empty">
                            No one else has access yet.
                        </div>
                    )}
                </div>

                {/* Link section */}
                <div className="share-link-section">
                    <div className="share-link-header">
                        <div className="share-link-access">
                            <button
                                className={`share-link-toggle ${isPublic ? 'share-link-toggle--public' : ''}`}
                                onClick={() => isCloudAvailable && setIsPublic(!isPublic)}
                                disabled={!isCloudAvailable}
                            >
                                {isPublic ? <Globe size={14} /> : <Lock size={14} />}
                                {isPublic ? 'Anyone with the link' : 'Restricted'}
                            </button>
                            {isPublic && (
                                <span className="share-link-note">
                                    Anyone with the link can view this project
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="share-link-row">
                        <div className="share-link-url">
                            <Link2 size={13} />
                            <span className="share-link-text">{shareableLink}</span>
                        </div>
                        <button
                            className="share-copy-btn"
                            onClick={handleCopyLink}
                        >
                            {linkCopied ? <Check size={13} /> : <Copy size={13} />}
                            {linkCopied ? 'Copied!' : 'Copy Link'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Simple hash-to-color for avatar backgrounds
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#f87171', '#60a5fa', '#4ade80', '#fbbf24', '#a78bfa', '#f472b6', '#34d399', '#fb923c'];
    return colors[Math.abs(hash) % colors.length];
}
