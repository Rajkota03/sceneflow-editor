import React, { useState, useRef, useEffect } from 'react';
import useBeatStore from '../stores/beatStore';
import { Tag, Plus, X, ChevronRight } from 'lucide-react';
import useUIStore from '../stores/uiStore';

// Helper to recursively render beat options in the popover
const BeatOption = ({ beat, allBeats, depth, onAssign }) => {
    const children = allBeats.filter(b => b.parentId === beat.id);
    return (
        <>
            <div
                className="beat-assign-option"
                style={{ paddingLeft: `${12 + (depth * 16)}px` }}
                onClick={() => onAssign(beat.id)}
            >
                {beat.color && <div className="beat-color-dot" style={{ backgroundColor: beat.color }}></div>}
                <span className="beat-option-title">{beat.title}</span>
            </div>
            {children.map(child => (
                <BeatOption key={child.id} beat={child} allBeats={allBeats} depth={depth + 1} onAssign={onAssign} />
            ))}
        </>
    );
};

export default function BeatTagMargin({ projectId, sceneId }) {
    const { getBeats, linkSceneToBeat, unlinkSceneFromBeat } = useBeatStore();
    const beats = getBeats(projectId);

    // Beats linked to this specific scene
    const linkedBeats = beats.filter(b => b.linkedSceneIds && b.linkedSceneIds.includes(sceneId));

    const [showPopover, setShowPopover] = useState(false);
    const popoverRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setShowPopover(false);
            }
        };
        if (showPopover) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showPopover]);

    const handleAssign = (beatId) => {
        linkSceneToBeat(projectId, beatId, sceneId);
        setShowPopover(false);
    };

    const handleUnassign = (e, beatId) => {
        e.stopPropagation();
        unlinkSceneFromBeat(projectId, beatId, sceneId);
    };

    const topLevelBeats = beats.filter(b => b.parentId === null);

    // If there are no beats at all in the project, don't show the tagging UI
    // to avoid cluttering if the user isn't using the Spine features.
    if (beats.length === 0) return null;

    return (
        <div className="beat-tag-margin">
            {linkedBeats.map(beat => (
                <div
                    key={beat.id}
                    className="scene-beat-tag"
                    title={beat.title}
                    style={{ backgroundColor: beat.color || 'var(--primary-color)' }}
                    onClick={() => {
                        // Bidirectional navigation: Jump to Spine
                        // In a real app we'd dispatch a navigation event or update a store that controls the main view
                        const uiStore = useUIStore.getState();
                        // Assume a method exists to switch to spine, or we just rely on the user clicking the tab.
                        // We will add `setSidebarTab` to uiStore or EditorWorkspace handles it.
                    }}
                >
                    <span className="tag-label">{beat.title.substring(0, 15)}{beat.title.length > 15 ? '...' : ''}</span>
                    <button className="unlink-btn" onClick={(e) => handleUnassign(e, beat.id)}>
                        <X size={10} />
                    </button>
                </div>
            ))}

            <button
                className="add-beat-tag-btn"
                onClick={() => setShowPopover(true)}
                title="Tag Scene to Beat"
            >
                <Tag size={12} />
            </button>

            {showPopover && (
                <div className="beat-tag-popover" ref={popoverRef}>
                    <div className="popover-header">Assign to Beat</div>
                    <div className="popover-body">
                        {topLevelBeats.map(beat => (
                            <BeatOption key={beat.id} beat={beat} allBeats={beats} depth={0} onAssign={handleAssign} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
