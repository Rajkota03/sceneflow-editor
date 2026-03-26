import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import useCollabStore from '../stores/collabStore';
import '../styles/collab-cursors.css';

/**
 * Renders colored indicators next to blocks being edited by other collaborators.
 * Place this inside or alongside the block editor — it renders absolutely-positioned
 * indicators that should be overlaid on the editor.
 *
 * Props:
 *  - blockId: the ID of the current block being rendered
 *  - style: optional additional styles for positioning
 */
export function CollabBlockIndicator({ blockId }) {
    const collaborators = useCollabStore((s) => s.collaborators);
    const isCollabMode = useCollabStore((s) => s.isCollabMode);

    if (!isCollabMode) return null;

    // Find collaborators editing this block
    const activeOnBlock = collaborators.filter(
        (c) => c.activeBlockId === blockId
    );

    if (activeOnBlock.length === 0) return null;

    return (
        <div className="collab-block-indicators">
            {activeOnBlock.map((collab) => (
                <div
                    key={collab.id}
                    className="collab-cursor-indicator"
                    style={{ '--collab-color': collab.color }}
                >
                    <span
                        className="collab-cursor-bar"
                        style={{ backgroundColor: collab.color }}
                    />
                    <span
                        className="collab-cursor-label"
                        style={{ backgroundColor: collab.color }}
                    >
                        {collab.name}
                    </span>
                </div>
            ))}
        </div>
    );
}

/**
 * Displays a compact list of active collaborators in the session.
 * Typically placed in the TopBar or a panel header.
 */
export function CollabAvatars() {
    const collaborators = useCollabStore((s) => s.collaborators);
    const isCollabMode = useCollabStore((s) => s.isCollabMode);
    const [showList, setShowList] = useState(false);

    if (!isCollabMode || collaborators.length === 0) return null;

    return (
        <div
            className="collab-avatars"
            onMouseEnter={() => setShowList(true)}
            onMouseLeave={() => setShowList(false)}
        >
            <div className="collab-avatar-stack">
                {collaborators.slice(0, 3).map((collab) => (
                    <div
                        key={collab.id}
                        className="collab-avatar"
                        style={{ backgroundColor: collab.color }}
                        title={collab.name}
                    >
                        {collab.name.charAt(0).toUpperCase()}
                    </div>
                ))}
                {collaborators.length > 3 && (
                    <div className="collab-avatar collab-avatar--overflow">
                        +{collaborators.length - 3}
                    </div>
                )}
            </div>

            <span className="collab-count">
                <Users size={12} />
                {collaborators.length + 1}
            </span>

            {showList && (
                <div className="collab-dropdown">
                    <div className="collab-dropdown-title">Collaborators</div>
                    <div className="collab-dropdown-self">
                        <span className="collab-dropdown-dot" style={{ background: 'var(--accent, #e8a838)' }} />
                        You
                    </div>
                    {collaborators.map((collab) => (
                        <div key={collab.id} className="collab-dropdown-item">
                            <span
                                className="collab-dropdown-dot"
                                style={{ background: collab.color }}
                            />
                            <span className="collab-dropdown-name">{collab.name}</span>
                            {collab.activeBlockId && (
                                <span className="collab-dropdown-status">editing</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Full CollaboratorCursors overlay component.
 * Pass the list of visible block IDs and it renders cursor indicators for each.
 * This is an alternative approach for rendering all cursors at once.
 */
export default function CollaboratorCursors({ blockIds = [] }) {
    const collaborators = useCollabStore((s) => s.collaborators);
    const isCollabMode = useCollabStore((s) => s.isCollabMode);

    if (!isCollabMode || collaborators.length === 0) return null;

    const activeCursors = collaborators.filter(
        (c) => c.activeBlockId && blockIds.includes(c.activeBlockId)
    );

    if (activeCursors.length === 0) return null;

    return (
        <div className="collab-cursors-overlay">
            {activeCursors.map((collab) => (
                <div
                    key={collab.id}
                    className="collab-cursor-flag"
                    data-block-id={collab.activeBlockId}
                    style={{ '--collab-color': collab.color }}
                >
                    <span
                        className="collab-cursor-bar"
                        style={{ backgroundColor: collab.color }}
                    />
                    <span
                        className="collab-cursor-label"
                        style={{ backgroundColor: collab.color }}
                    >
                        {collab.name}
                    </span>
                </div>
            ))}
        </div>
    );
}
