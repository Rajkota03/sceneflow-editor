import React, { useState } from 'react';
import useBeatStore from '../stores/beatStore';
import { ChevronRight, ChevronDown, ListTree, Tag, Clock } from 'lucide-react';
import '../styles/spine-outline.css';

const OutlineNode = ({ beat, allBeats, depth = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const children = allBeats.filter(b => b.parentId === beat.id);
    const hasChildren = children.length > 0;

    return (
        <div className="outline-node-container" style={{ marginLeft: depth > 0 ? '24px' : '0' }}>
            <div className={`outline-row level-${depth}`}>
                <div className="outline-expander" onClick={() => setIsExpanded(!isExpanded)}>
                    {hasChildren ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="empty-expander" />}
                </div>
                <div className="outline-content" style={{ borderLeftColor: beat.color || 'var(--primary-color)' }}>
                    <div className="outline-header">
                        <div className="outline-title">{beat.title}</div>
                        <div className="outline-meta">
                            <span className="outline-pages"><Clock size={12} /> p. {beat.targetPageStart}-{beat.targetPageEnd}</span>
                            <span className="outline-status">{beat.status.toUpperCase()}</span>
                            {beat.linkedSceneIds?.length > 0 && (
                                <span className="outline-links" title={`${beat.linkedSceneIds.length} scenes linked`}>
                                    <Tag size={12} /> {beat.linkedSceneIds.length}
                                </span>
                            )}
                        </div>
                    </div>
                    {beat.description && <div className="outline-desc">{beat.description}</div>}
                </div>
            </div>
            {hasChildren && isExpanded && (
                <div className="outline-children">
                    {children.map(child => (
                        <OutlineNode key={child.id} beat={child} allBeats={allBeats} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function SpineOutlineView({ projectId }) {
    const { getBeats } = useBeatStore();
    const beats = getBeats(projectId);
    const topLevelBeats = beats.filter(b => b.parentId === null);

    return (
        <div className="spine-outline-container">
            <div className="outline-header-main">
                <ListTree size={16} /> <span>Story Outline</span>
            </div>
            {topLevelBeats.length === 0 && <div className="outline-empty">No beats loaded.</div>}
            {topLevelBeats.map(beat => (
                <OutlineNode key={beat.id} beat={beat} allBeats={beats} depth={0} />
            ))}
        </div>
    );
}
