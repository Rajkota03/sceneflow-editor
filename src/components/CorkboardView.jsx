import React, { useState, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    SortableContext,
    rectSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    GripVertical,
    Film,
    MapPin,
    Clock,
    MessageSquare,
    Maximize2,
    Minimize2,
    Palette,
} from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import '../styles/corkboard.css';

// ── Color palette for cards ──
const CARD_COLORS = [
    { id: 'none', label: 'None', value: 'transparent' },
    { id: 'blue', label: 'Blue', value: '#3b82f6' },
    { id: 'purple', label: 'Purple', value: '#8b5cf6' },
    { id: 'pink', label: 'Pink', value: '#ec4899' },
    { id: 'red', label: 'Red', value: '#ef4444' },
    { id: 'orange', label: 'Orange', value: '#f97316' },
    { id: 'yellow', label: 'Yellow', value: '#eab308' },
    { id: 'green', label: 'Green', value: '#22c55e' },
    { id: 'teal', label: 'Teal', value: '#14b8a6' },
];

// ── Extract scene data from blocks ──
function extractScenes(blocks) {
    const scenes = [];
    let currentScene = null;

    blocks.forEach((block, idx) => {
        if (block.type === 'scene-heading') {
            if (currentScene) scenes.push(currentScene);
            currentScene = {
                id: block.id,
                heading: block.text || 'UNTITLED SCENE',
                sceneNumber: scenes.length + 1,
                blocks: [block],
                dialogueCount: 0,
                actionPreview: '',
                color: block.metadata?.cardColor || 'none',
                blockIndex: idx,
            };
        } else if (currentScene) {
            currentScene.blocks.push(block);
            if (block.type === 'character') currentScene.dialogueCount++;
            if (block.type === 'action' && !currentScene.actionPreview && block.text) {
                currentScene.actionPreview = block.text.substring(0, 120);
            }
        }
    });

    if (currentScene) scenes.push(currentScene);
    return scenes;
}

// ── Sortable Card Component ──
function SortableCard({ scene, cardSize, onJumpToScene, onColorChange }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: scene.id });

    const [showColors, setShowColors] = useState(false);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    const colorValue = CARD_COLORS.find(c => c.id === scene.color)?.value || 'transparent';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`cork-card cork-card--${cardSize} ${isDragging ? 'dragging' : ''}`}
        >
            {/* Color strip */}
            <div
                className="cork-card-color-strip"
                style={{ background: colorValue !== 'transparent' ? colorValue : 'var(--accent-primary)' }}
            />

            {/* Header */}
            <div className="cork-card-header">
                <span className="cork-card-number">{scene.sceneNumber}</span>
                <div className="cork-card-drag" {...attributes} {...listeners}>
                    <GripVertical size={14} />
                </div>
            </div>

            {/* Heading */}
            <h4
                className="cork-card-heading"
                onDoubleClick={() => onJumpToScene(scene.blockIndex)}
            >
                {scene.heading}
            </h4>

            {/* Preview (only in medium/large) */}
            {cardSize !== 'compact' && scene.actionPreview && (
                <p className="cork-card-preview">{scene.actionPreview}</p>
            )}

            {/* Footer */}
            <div className="cork-card-footer">
                <span className="cork-card-stat">
                    <MessageSquare size={11} />
                    {scene.dialogueCount}
                </span>
                <span className="cork-card-stat">
                    <Film size={11} />
                    {scene.blocks.length} blocks
                </span>

                {/* Color picker toggle */}
                <button
                    className="cork-card-color-btn"
                    onClick={(e) => { e.stopPropagation(); setShowColors(!showColors); }}
                >
                    <Palette size={11} />
                </button>
            </div>

            {/* Color picker dropdown */}
            {showColors && (
                <div className="cork-color-picker" onClick={(e) => e.stopPropagation()}>
                    {CARD_COLORS.map((c) => (
                        <button
                            key={c.id}
                            className={`cork-color-dot ${scene.color === c.id ? 'active' : ''}`}
                            style={{
                                background: c.value === 'transparent'
                                    ? 'var(--bg-tertiary)'
                                    : c.value,
                            }}
                            onClick={() => { onColorChange(scene.id, c.id); setShowColors(false); }}
                            title={c.label}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Overlay card shown while dragging ──
function DragOverlayCard({ scene, cardSize }) {
    const colorValue = CARD_COLORS.find(c => c.id === scene.color)?.value || 'transparent';

    return (
        <div className={`cork-card cork-card--${cardSize} cork-card--overlay`}>
            <div
                className="cork-card-color-strip"
                style={{ background: colorValue !== 'transparent' ? colorValue : 'var(--accent-primary)' }}
            />
            <div className="cork-card-header">
                <span className="cork-card-number">{scene.sceneNumber}</span>
            </div>
            <h4 className="cork-card-heading">{scene.heading}</h4>
        </div>
    );
}

// ── Main Corkboard View ──
export default function CorkboardView({ projectId, onJumpToScene }) {
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);
    const moveScene = useEditorStore((s) => s.moveScene);
    const updateBlockMetadata = useEditorStore((s) => s.updateBlockMetadata);

    const [cardSize, setCardSize] = useState('medium'); // compact | medium | large
    const [activeId, setActiveId] = useState(null);

    const scenes = useMemo(() => extractScenes(blocks), [blocks]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over || active.id === over.id) return;

        // Use moveScene to reorder entire scene blocks
        moveScene(projectId, active.id, over.id);
    };

    const handleColorChange = (sceneId, colorId) => {
        if (updateBlockMetadata) {
            updateBlockMetadata(projectId, sceneId, { cardColor: colorId });
        }
    };

    const activeScene = scenes.find((s) => s.id === activeId);

    const sizeIcons = [
        { id: 'compact', icon: Minimize2, label: 'Compact' },
        { id: 'medium', icon: Film, label: 'Medium' },
        { id: 'large', icon: Maximize2, label: 'Large' },
    ];

    return (
        <div className="corkboard">
            {/* Toolbar */}
            <div className="corkboard-toolbar">
                <div className="corkboard-title">
                    <Film size={16} />
                    <span>{scenes.length} Scenes</span>
                </div>

                <div className="corkboard-size-toggle">
                    {sizeIcons.map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            className={`size-btn ${cardSize === id ? 'active' : ''}`}
                            onClick={() => setCardSize(id)}
                            title={label}
                        >
                            <Icon size={14} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Card Grid */}
            <div className={`corkboard-grid corkboard-grid--${cardSize}`}>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={scenes.map((s) => s.id)}
                        strategy={rectSortingStrategy}
                    >
                        {scenes.map((scene) => (
                            <SortableCard
                                key={scene.id}
                                scene={scene}
                                cardSize={cardSize}
                                onJumpToScene={onJumpToScene || (() => { })}
                                onColorChange={handleColorChange}
                            />
                        ))}
                    </SortableContext>

                    <DragOverlay>
                        {activeScene ? (
                            <DragOverlayCard scene={activeScene} cardSize={cardSize} />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {scenes.length === 0 && (
                <div className="corkboard-empty">
                    <Film size={40} />
                    <p>No scenes yet</p>
                    <span>Add a scene heading in the editor to see cards here</span>
                </div>
            )}
        </div>
    );
}
