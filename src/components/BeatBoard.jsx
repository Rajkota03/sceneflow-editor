import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    GripVertical,
    Plus,
    Trash2,
    X,
    Link2,
    Palette,
    ChevronDown,
    Layers,
    Sparkles,
    Film,
    Tv,
    Skull,
    Circle,
    RefreshCw,
    Check,
    PenLine,
    Save,
} from 'lucide-react';
import useBeatStore from '../stores/beatStore';
import useEditorStore from '../stores/editorStore';
import beatFrameworks from '../data/beatFrameworks';
import '../styles/beat-board.css';

// ─── Color Palette for Beat Cards ───
const BEAT_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#d946ef', '#ec4899', '#f43f5e', null,
];

// ─── Framework category icons ───
const CATEGORY_ICONS = {
    film: Film,
    television: Tv,
    genre: Skull,
};

// ─── Derive act from page percentage ───
function getActFromPercentage(startPage, endPage, totalPages) {
    if (!startPage || !totalPages) return 2;
    const midPercent = ((startPage + (endPage || startPage)) / 2 / totalPages) * 100;
    if (midPercent <= 25) return 1;
    if (midPercent <= 75) return 2;
    return 3;
}

// ─── Beat status calculation ───
function getBeatStatus(beat) {
    const hasNotes = beat.notes && beat.notes.trim().length > 0;
    const hasScenes = beat.linkedSceneIds && beat.linkedSceneIds.length > 0;
    if (hasNotes && hasScenes) return 'complete';
    if (hasNotes || hasScenes) return 'in-progress';
    return 'empty';
}

// ═══════════════════════════════════════════════════════
// Template Picker
// ═══════════════════════════════════════════════════════

function TemplatePicker({ projectId, onCustomCreate }) {
    const instantiateTemplate = useBeatStore((s) => s.instantiateTemplate);
    const customTemplates = useBeatStore((s) => s._customTemplates) || [];
    const instantiateCustomTemplate = useBeatStore((s) => s.instantiateCustomTemplate);

    const handleSelect = (frameworkId) => {
        instantiateTemplate(projectId, frameworkId);
    };

    const handleCustomSelect = (templateId) => {
        instantiateCustomTemplate(projectId, templateId);
    };

    return (
        <div className="bb-template-picker">
            <div className="bb-template-picker-header">
                <Layers size={20} />
                <div>
                    <h3>Choose a Story Structure</h3>
                    <p>Select a framework to organize your screenplay's beats</p>
                </div>
            </div>

            <div className="bb-template-grid">
                {beatFrameworks.map((fw) => {
                    const IconComp = CATEGORY_ICONS[fw.category] || Film;
                    return (
                        <button
                            key={fw.id}
                            className="bb-template-card"
                            onClick={() => handleSelect(fw.id)}
                        >
                            <div className="bb-template-card-icon">
                                <IconComp size={20} />
                            </div>
                            <div className="bb-template-card-body">
                                <span className="bb-template-card-name">{fw.frameworkName}</span>
                                <span className="bb-template-card-desc">
                                    {fw.beats.length} beats &middot; {fw.category}
                                </span>
                            </div>
                            <span className="bb-template-card-pages">
                                ~{fw.totalExpectedPages}pp
                            </span>
                        </button>
                    );
                })}

                {/* Custom templates */}
                {customTemplates.map((ct) => (
                    <button
                        key={ct.id}
                        className="bb-template-card bb-template-card--custom"
                        onClick={() => handleCustomSelect(ct.id)}
                    >
                        <div className="bb-template-card-icon">
                            <Sparkles size={20} />
                        </div>
                        <div className="bb-template-card-body">
                            <span className="bb-template-card-name">{ct.name}</span>
                            <span className="bb-template-card-desc">
                                {ct.beats.length} beats &middot; custom
                            </span>
                        </div>
                    </button>
                ))}

                {/* Create Custom */}
                <button
                    className="bb-template-card bb-template-card--create"
                    onClick={onCustomCreate}
                >
                    <div className="bb-template-card-icon">
                        <Plus size={20} />
                    </div>
                    <div className="bb-template-card-body">
                        <span className="bb-template-card-name">Create Custom Structure</span>
                        <span className="bb-template-card-desc">
                            Design your own beat framework
                        </span>
                    </div>
                </button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// Custom Structure Creator Modal
// ═══════════════════════════════════════════════════════

function CustomStructureCreator({ onClose, onSave }) {
    const [name, setName] = useState('');
    const [beats, setBeats] = useState([
        { id: '1', title: 'Opening', description: '', act: 1 },
        { id: '2', title: 'Midpoint', description: '', act: 2 },
        { id: '3', title: 'Resolution', description: '', act: 3 },
    ]);

    const addBeat = () => {
        setBeats([
            ...beats,
            { id: Date.now().toString(), title: 'New Beat', description: '', act: 2 },
        ]);
    };

    const updateCustomBeat = (index, field, value) => {
        const updated = [...beats];
        updated[index] = { ...updated[index], [field]: value };
        setBeats(updated);
    };

    const removeCustomBeat = (index) => {
        if (beats.length <= 1) return;
        setBeats(beats.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!name.trim()) return;
        onSave({
            name: name.trim(),
            description: `Custom structure with ${beats.length} beats`,
            beats: beats.map((b, i) => ({
                title: b.title,
                description: b.description,
                act: b.act,
                targetPageStart: null,
                targetPageEnd: null,
                sortOrder: i + 1,
            })),
        });
        onClose();
    };

    return (
        <div className="bb-custom-creator-overlay" onClick={onClose}>
            <div className="bb-custom-creator" onClick={(e) => e.stopPropagation()}>
                <div className="bb-custom-creator-header">
                    <h3>Create Custom Structure</h3>
                    <button className="bb-icon-btn" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                <div className="bb-custom-creator-body">
                    <div className="bb-custom-field">
                        <label>Structure Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. My Thriller Structure"
                            className="bb-input"
                            autoFocus
                        />
                    </div>

                    <div className="bb-custom-beats-list">
                        <label>Beats</label>
                        {beats.map((beat, index) => (
                            <div key={beat.id} className="bb-custom-beat-row">
                                <input
                                    type="text"
                                    value={beat.title}
                                    onChange={(e) => updateCustomBeat(index, 'title', e.target.value)}
                                    placeholder="Beat title"
                                    className="bb-input bb-input--sm"
                                />
                                <select
                                    value={beat.act}
                                    onChange={(e) => updateCustomBeat(index, 'act', Number(e.target.value))}
                                    className="bb-select"
                                >
                                    <option value={1}>Act 1</option>
                                    <option value={2}>Act 2</option>
                                    <option value={3}>Act 3</option>
                                </select>
                                <input
                                    type="text"
                                    value={beat.description}
                                    onChange={(e) => updateCustomBeat(index, 'description', e.target.value)}
                                    placeholder="Description (optional)"
                                    className="bb-input bb-input--sm bb-input--desc"
                                />
                                <button
                                    className="bb-icon-btn bb-icon-btn--danger"
                                    onClick={() => removeCustomBeat(index)}
                                    disabled={beats.length <= 1}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        <button className="bb-add-beat-row" onClick={addBeat}>
                            <Plus size={14} /> Add Beat
                        </button>
                    </div>
                </div>

                <div className="bb-custom-creator-footer">
                    <button className="bb-btn bb-btn--ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="bb-btn bb-btn--primary"
                        onClick={handleSave}
                        disabled={!name.trim()}
                    >
                        <Save size={14} /> Save Structure
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// Sortable Beat Card
// ═══════════════════════════════════════════════════════

function SortableBeatCard({
    beat,
    projectId,
    scenes,
    sceneBeatMap,
    totalPages,
    isOverlay = false,
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: beat.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    if (isOverlay) {
        return (
            <BeatCardInner
                beat={beat}
                projectId={projectId}
                scenes={scenes}
                sceneBeatMap={sceneBeatMap}
                totalPages={totalPages}
                isOverlay
            />
        );
    }

    return (
        <div ref={setNodeRef} style={style} className={`bb-card-wrapper ${isDragging ? 'dragging' : ''}`}>
            <BeatCardInner
                beat={beat}
                projectId={projectId}
                scenes={scenes}
                sceneBeatMap={sceneBeatMap}
                totalPages={totalPages}
                dragHandleProps={{ ...attributes, ...listeners }}
            />
        </div>
    );
}

function BeatCardInner({
    beat,
    projectId,
    scenes,
    sceneBeatMap,
    totalPages,
    dragHandleProps = {},
    isOverlay = false,
}) {
    const updateBeat = useBeatStore((s) => s.updateBeat);
    const deleteBeat = useBeatStore((s) => s.deleteBeat);
    const linkSceneToBeat = useBeatStore((s) => s.linkSceneToBeat);
    const unlinkSceneFromBeat = useBeatStore((s) => s.unlinkSceneFromBeat);

    const [editingTitle, setEditingTitle] = useState(false);
    const [editingDesc, setEditingDesc] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showLinkDropdown, setShowLinkDropdown] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const titleRef = useRef(null);
    const descRef = useRef(null);
    const dropdownRef = useRef(null);

    const status = getBeatStatus(beat);
    const linkedScenes = (beat.linkedSceneIds || [])
        .map((id) => scenes.find((s) => s.id === id))
        .filter(Boolean);

    // Available scenes: not linked to any other beat
    const availableScenes = scenes.filter((s) => {
        const assignedBeatId = sceneBeatMap[s.id];
        return !assignedBeatId || assignedBeatId === beat.id;
    });

    // Close dropdown on outside click
    useEffect(() => {
        if (!showLinkDropdown) return;
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowLinkDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showLinkDropdown]);

    const handleTitleSave = () => {
        if (titleRef.current) {
            updateBeat(projectId, beat.id, { title: titleRef.current.innerText.trim() || beat.title });
        }
        setEditingTitle(false);
    };

    const handleDescSave = () => {
        if (descRef.current) {
            updateBeat(projectId, beat.id, { description: descRef.current.innerText.trim() });
        }
        setEditingDesc(false);
    };

    const handleNotesChange = (e) => {
        updateBeat(projectId, beat.id, { notes: e.target.value });
    };

    const handleColorSelect = (color) => {
        updateBeat(projectId, beat.id, { color });
        setShowColorPicker(false);
    };

    const handleLinkScene = (sceneId) => {
        linkSceneToBeat(projectId, beat.id, sceneId);
        setShowLinkDropdown(false);
    };

    const handleUnlinkScene = (sceneId) => {
        unlinkSceneFromBeat(projectId, beat.id, sceneId);
    };

    const handleDelete = () => {
        if (beat.templateOrigin && !confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        deleteBeat(projectId, beat.id);
    };

    const pageRange =
        beat.targetPageStart && beat.targetPageEnd
            ? `pp. ${beat.targetPageStart}-${beat.targetPageEnd}`
            : beat.targetPageStart
              ? `p. ${beat.targetPageStart}`
              : null;

    return (
        <div
            className={`bb-card ${isOverlay ? 'bb-card--overlay' : ''}`}
            style={beat.color ? { borderLeftColor: beat.color } : undefined}
        >
            {/* Drag handle */}
            <div className="bb-card-drag" {...dragHandleProps}>
                <GripVertical size={14} />
            </div>

            <div className="bb-card-content">
                {/* Header row */}
                <div className="bb-card-header">
                    <div className={`bb-status-dot bb-status-dot--${status}`} title={status} />

                    {editingTitle ? (
                        <div
                            ref={titleRef}
                            className="bb-card-title bb-card-title--editing"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={handleTitleSave}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleTitleSave();
                                }
                            }}
                            dangerouslySetInnerHTML={{ __html: beat.title }}
                        />
                    ) : (
                        <span
                            className="bb-card-title"
                            onClick={() => setEditingTitle(true)}
                            title="Click to edit"
                        >
                            {beat.title}
                        </span>
                    )}

                    <div className="bb-card-actions">
                        <button
                            className="bb-icon-btn"
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            title="Color"
                        >
                            <Palette size={12} />
                        </button>
                        {confirmDelete ? (
                            <button
                                className="bb-icon-btn bb-icon-btn--danger"
                                onClick={handleDelete}
                                title="Confirm delete"
                            >
                                <Check size={12} />
                            </button>
                        ) : (
                            <button
                                className="bb-icon-btn bb-icon-btn--danger"
                                onClick={handleDelete}
                                title="Delete beat"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Color picker */}
                {showColorPicker && (
                    <div className="bb-color-picker">
                        {BEAT_COLORS.map((color, i) => (
                            <button
                                key={i}
                                className={`bb-color-dot ${beat.color === color ? 'active' : ''} ${!color ? 'bb-color-dot--none' : ''}`}
                                style={color ? { background: color } : undefined}
                                onClick={() => handleColorSelect(color)}
                                title={color || 'No color'}
                            >
                                {!color && <X size={8} />}
                            </button>
                        ))}
                    </div>
                )}

                {/* Description */}
                {editingDesc ? (
                    <div
                        ref={descRef}
                        className="bb-card-desc bb-card-desc--editing"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={handleDescSave}
                        dangerouslySetInnerHTML={{ __html: beat.description }}
                    />
                ) : (
                    <p
                        className="bb-card-desc"
                        onClick={() => setEditingDesc(true)}
                        title="Click to edit"
                    >
                        {beat.description || 'Add description...'}
                    </p>
                )}

                {/* Page range */}
                {pageRange && <span className="bb-card-pages">{pageRange}</span>}

                {/* Notes textarea */}
                <textarea
                    className="bb-card-notes"
                    value={beat.notes || ''}
                    onChange={handleNotesChange}
                    placeholder="What happens in this beat..."
                    rows={2}
                />

                {/* Linked scenes */}
                <div className="bb-card-scenes">
                    {linkedScenes.map((scene) => (
                        <span key={scene.id} className="bb-scene-tag">
                            <Film size={10} />
                            {scene.slugline}
                            <button
                                className="bb-scene-tag-remove"
                                onClick={() => handleUnlinkScene(scene.id)}
                            >
                                <X size={10} />
                            </button>
                        </span>
                    ))}

                    <div className="bb-link-scene-wrapper" ref={dropdownRef}>
                        <button
                            className="bb-link-scene-btn"
                            onClick={() => setShowLinkDropdown(!showLinkDropdown)}
                        >
                            <Link2 size={11} /> Link Scene
                        </button>

                        {showLinkDropdown && (
                            <div className="bb-link-dropdown">
                                {availableScenes.length === 0 ? (
                                    <div className="bb-link-dropdown-empty">No scenes available</div>
                                ) : (
                                    availableScenes.map((scene) => {
                                        const isAlreadyLinked = beat.linkedSceneIds?.includes(scene.id);
                                        const isAssignedElsewhere = sceneBeatMap[scene.id] && sceneBeatMap[scene.id] !== beat.id;
                                        return (
                                            <button
                                                key={scene.id}
                                                className={`bb-link-dropdown-item ${isAlreadyLinked ? 'linked' : ''} ${isAssignedElsewhere ? 'assigned' : ''}`}
                                                onClick={() => {
                                                    if (!isAlreadyLinked && !isAssignedElsewhere) {
                                                        handleLinkScene(scene.id);
                                                    }
                                                }}
                                                disabled={isAlreadyLinked || isAssignedElsewhere}
                                            >
                                                <Film size={11} />
                                                <span>{scene.slugline}</span>
                                                {isAlreadyLinked && <Check size={11} />}
                                                {isAssignedElsewhere && (
                                                    <span className="bb-assigned-label">(assigned)</span>
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// Insert Beat Button (between cards)
// ═══════════════════════════════════════════════════════

function InsertBeatButton({ projectId, afterSortOrder }) {
    const addBeat = useBeatStore((s) => s.addBeat);

    const handleInsert = () => {
        // Reorder: insert at afterSortOrder + 0.5, then re-normalize
        addBeat(projectId, null, null, {
            title: 'New Beat',
            description: '',
            sortOrder: afterSortOrder + 0.5,
        });
    };

    return (
        <button className="bb-insert-btn" onClick={handleInsert} title="Insert beat here">
            <Plus size={12} />
        </button>
    );
}

// ═══════════════════════════════════════════════════════
// Progress Bar
// ═══════════════════════════════════════════════════════

function ProgressBar({ beats }) {
    const filled = beats.filter((b) => {
        const s = getBeatStatus(b);
        return s === 'complete' || s === 'in-progress';
    }).length;
    const total = beats.length;
    const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

    // Per-act progress
    const actBeats = { 1: [], 2: [], 3: [] };
    beats.forEach((b) => {
        const act = getActFromPercentage(b.targetPageStart, b.targetPageEnd, 110);
        if (actBeats[act]) actBeats[act].push(b);
    });

    return (
        <div className="bb-progress">
            <div className="bb-progress-info">
                <span className="bb-progress-label">
                    {filled}/{total} beats filled
                </span>
                <span className="bb-progress-pct">{pct}%</span>
            </div>
            <div className="bb-progress-bar">
                <div className="bb-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="bb-progress-acts">
                {[1, 2, 3].map((act) => {
                    const ab = actBeats[act] || [];
                    const af = ab.filter((b) => getBeatStatus(b) !== 'empty').length;
                    return (
                        <span key={act} className="bb-progress-act">
                            Act {act}: {af}/{ab.length}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// Main BeatBoard Component
// ═══════════════════════════════════════════════════════

export default function BeatBoard({ projectId }) {
    const beats = useBeatStore((s) => {
        const projectBeats = s.beatsByProject[projectId] || {};
        return Object.values(projectBeats)
            .filter((b) => b.parentId === null)
            .sort((a, b) => a.sortOrder - b.sortOrder);
    });

    const scenes = useEditorStore((s) => {
        const blocks = s.blocksByProject[projectId] || [];
        return blocks
            .filter((b) => b.type === 'scene-heading')
            .map((b, i) => ({
                id: b.id,
                number: i + 1,
                slugline: b.text || `UNTITLED SCENE ${i + 1}`,
            }));
    });

    const sceneBeatMap = useBeatStore((s) => s.getSceneBeatMap(projectId));
    const clearBeats = useBeatStore((s) => s.clearBeats);
    const saveCustomTemplate = useBeatStore((s) => s.saveCustomTemplate);
    const syncSceneOrder = useBeatStore((s) => s.syncSceneOrder);

    const [showCustomCreator, setShowCustomCreator] = useState(false);
    const [activeDragId, setActiveDragId] = useState(null);

    const hasBeats = beats.length > 0;
    const totalPages = 110; // default

    // Group beats by act
    const actGroups = useMemo(() => {
        const groups = { 1: [], 2: [], 3: [] };
        beats.forEach((beat) => {
            const act = getActFromPercentage(beat.targetPageStart, beat.targetPageEnd, totalPages);
            groups[act].push(beat);
        });
        return groups;
    }, [beats, totalPages]);

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const beatIds = useMemo(() => beats.map((b) => b.id), [beats]);

    const handleDragStart = useCallback((event) => {
        setActiveDragId(event.active.id);
    }, []);

    const handleDragEnd = useCallback(
        (event) => {
            setActiveDragId(null);
            const { active, over } = event;
            if (!over || active.id === over.id) return;

            const oldIndex = beats.findIndex((b) => b.id === active.id);
            const newIndex = beats.findIndex((b) => b.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reordered = arrayMove(beats, oldIndex, newIndex);

            // Update sort orders for all beats
            const beatStore = useBeatStore.getState();
            reordered.forEach((beat, index) => {
                beatStore.reorderBeat(projectId, beat.id, index + 1);
            });

            // Sync scene order to match new beat order
            setTimeout(() => {
                useBeatStore.getState().syncSceneOrder(projectId);
            }, 50);
        },
        [beats, projectId]
    );

    const handleDragCancel = useCallback(() => {
        setActiveDragId(null);
    }, []);

    const activeBeat = activeDragId ? beats.find((b) => b.id === activeDragId) : null;

    const handleResetStructure = () => {
        clearBeats(projectId);
    };

    const handleSaveCustomTemplate = (template) => {
        saveCustomTemplate(template);
    };

    // ── No beats: show template picker ──
    if (!hasBeats) {
        return (
            <div className="bb-container">
                <TemplatePicker
                    projectId={projectId}
                    onCustomCreate={() => setShowCustomCreator(true)}
                />
                {showCustomCreator && (
                    <CustomStructureCreator
                        onClose={() => setShowCustomCreator(false)}
                        onSave={handleSaveCustomTemplate}
                    />
                )}
            </div>
        );
    }

    // ── Main beat board ──
    return (
        <div className="bb-container">
            {/* Header */}
            <div className="bb-header">
                <h4 className="bb-title">
                    <Layers size={15} />
                    Beat Board
                </h4>
                <button
                    className="bb-btn bb-btn--ghost bb-btn--sm"
                    onClick={handleResetStructure}
                    title="Reset structure"
                >
                    <RefreshCw size={12} /> Reset
                </button>
            </div>

            {/* Progress */}
            <ProgressBar beats={beats} />

            {/* Beat cards with DnD */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div className="bb-acts">
                    {[1, 2, 3].map((actNum) => {
                        const actBeats = actGroups[actNum] || [];
                        if (actBeats.length === 0 && beats.length > 0) return null;
                        const actBeatIds = actBeats.map((b) => b.id);

                        return (
                            <div key={actNum} className="bb-act-section">
                                <div className={`bb-act-header bb-act-header--${actNum}`}>
                                    <span>Act {actNum}</span>
                                    <span className="bb-act-count">{actBeats.length} beats</span>
                                </div>

                                <SortableContext items={beatIds} strategy={verticalListSortingStrategy}>
                                    <div className="bb-card-list">
                                        {actBeats.map((beat, index) => (
                                            <React.Fragment key={beat.id}>
                                                <SortableBeatCard
                                                    beat={beat}
                                                    projectId={projectId}
                                                    scenes={scenes}
                                                    sceneBeatMap={sceneBeatMap}
                                                    totalPages={totalPages}
                                                />
                                                <InsertBeatButton
                                                    projectId={projectId}
                                                    afterSortOrder={beat.sortOrder}
                                                />
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </SortableContext>
                            </div>
                        );
                    })}
                </div>

                <DragOverlay>
                    {activeBeat ? (
                        <SortableBeatCard
                            beat={activeBeat}
                            projectId={projectId}
                            scenes={scenes}
                            sceneBeatMap={sceneBeatMap}
                            totalPages={totalPages}
                            isOverlay
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Custom creator modal */}
            {showCustomCreator && (
                <CustomStructureCreator
                    onClose={() => setShowCustomCreator(false)}
                    onSave={handleSaveCustomTemplate}
                />
            )}
        </div>
    );
}
