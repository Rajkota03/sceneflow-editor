import React, { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Search, GripVertical } from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import useBeatStore from '../stores/beatStore';
import '../styles/scene-list.css';

function SortableSceneCard({ scene, isActive, beatName, onClick, onDragStart }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: scene.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`scene-card ${isActive ? 'active' : ''}`}
            onClick={onClick}
            draggable
            onDragStart={(e) => {
                // Native drag for beat sheet assignment
                e.dataTransfer.setData('sceneId', scene.id);
                if (onDragStart) onDragStart(scene.id);
            }}
        >
            <button
                className="scene-drag-handle"
                {...attributes}
                {...listeners}
                title="Drag to reorder"
            >
                <GripVertical size={12} />
            </button>
            <div className="scene-card-content">
                <div className="scene-card-header">
                    <span className="scene-number">{scene.number}</span>
                    <span className="scene-slugline">{scene.slugline}</span>
                </div>
                <span className={`scene-beat-badge ${beatName ? 'assigned' : ''}`}>
                    {beatName || 'Unassigned'}
                </span>
            </div>
        </div>
    );
}

export default function SceneList({ projectId }) {
    const scenes = useEditorStore((s) => s.getScenes(projectId));
    const moveScene = useEditorStore((s) => s.moveScene);
    const setActiveBlock = useEditorStore((s) => s.setActiveBlock);
    const activeBlockId = useEditorStore((s) => s.activeBlockId);
    const beats = useBeatStore((s) => s.getBeats(projectId));
    const [searchQuery, setSearchQuery] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Reverse-lookup beat names for scenes
    const getBeatNameForScene = (sceneId) => {
        const beat = beats.find(b => b.linkedSceneIds && b.linkedSceneIds.includes(sceneId));
        return beat ? beat.title : null;
    };

    const filteredScenes = scenes.filter((s) =>
        s.slugline.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            moveScene(projectId, active.id, over.id);
        }
    };

    const scrollToBlock = (blockId) => {
        setActiveBlock(blockId);
        setTimeout(() => {
            const el = document.querySelector(`[data-block-id="${blockId}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.focus();
            }
        }, 50);
    };

    return (
        <div>
            <div className="scene-list-header">
                <h4>Scenes</h4>
                <span className="badge">{scenes.length}</span>
            </div>

            <div className="scene-list-search">
                <Search size={14} />
                <input
                    type="text"
                    placeholder="Search scenes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={filteredScenes.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="scene-list-items">
                        {filteredScenes.length > 0 ? (
                            filteredScenes.map((scene) => (
                                <SortableSceneCard
                                    key={scene.id}
                                    scene={scene}
                                    isActive={scene.id === activeBlockId}
                                    beatName={getBeatNameForScene(scene.id)}
                                    onClick={() => scrollToBlock(scene.id)}
                                />
                            ))
                        ) : (
                            <div className="scene-list-empty">
                                <p>No scenes found</p>
                            </div>
                        )}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}
