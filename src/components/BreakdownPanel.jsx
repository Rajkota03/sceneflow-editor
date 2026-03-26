import React, { useState, useMemo, useCallback } from 'react';
import {
    Tags, Plus, X, Download, ChevronDown, ChevronRight,
    Package, Shirt, Car, Sword, Sparkles, Volume2,
    Palette, Dog, Users, Flame, Music, Lamp,
    Eye, List,
} from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import '../styles/breakdown-panel.css';

const CATEGORIES = [
    { name: 'Props', icon: Package, color: '#f59e0b' },
    { name: 'Wardrobe', icon: Shirt, color: '#ec4899' },
    { name: 'Vehicles', icon: Car, color: '#3b82f6' },
    { name: 'Weapons', icon: Sword, color: '#ef4444' },
    { name: 'Special Effects', icon: Sparkles, color: '#8b5cf6' },
    { name: 'Sound Effects', icon: Volume2, color: '#06b6d4' },
    { name: 'Makeup', icon: Palette, color: '#f472b6' },
    { name: 'Animals', icon: Dog, color: '#22c55e' },
    { name: 'Extras', icon: Users, color: '#a78bfa' },
    { name: 'Stunts', icon: Flame, color: '#f97316' },
    { name: 'Music', icon: Music, color: '#14b8a6' },
    { name: 'Set Dressing', icon: Lamp, color: '#84cc16' },
];

function CategorySection({ category, tags, projectId, sceneId, onAdd, onRemove }) {
    const [expanded, setExpanded] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [showInput, setShowInput] = useState(false);
    const Icon = category.icon;
    const categoryTags = tags.filter((t) => t.category === category.name);

    const handleAdd = () => {
        if (inputValue.trim()) {
            onAdd(category.name, inputValue.trim());
            setInputValue('');
            setShowInput(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleAdd();
        if (e.key === 'Escape') {
            setShowInput(false);
            setInputValue('');
        }
    };

    return (
        <div className="bp-category-section">
            <button
                className="bp-category-header"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="bp-category-left">
                    {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <Icon size={13} style={{ color: category.color }} />
                    <span className="bp-category-name">{category.name}</span>
                </div>
                <div className="bp-category-right">
                    <span className="bp-category-count" style={{ backgroundColor: category.color + '20', color: category.color }}>
                        {categoryTags.length}
                    </span>
                    <button
                        className="bp-add-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(true);
                            setShowInput(true);
                        }}
                        title={`Add ${category.name}`}
                    >
                        <Plus size={12} />
                    </button>
                </div>
            </button>
            {expanded && (
                <div className="bp-category-body">
                    {categoryTags.map((tag) => (
                        <div
                            key={tag.id}
                            className="bp-tag"
                            style={{ borderLeftColor: category.color }}
                        >
                            <span className="bp-tag-text">{tag.text}</span>
                            <button
                                className="bp-tag-remove"
                                onClick={() => onRemove(tag.id)}
                                title="Remove tag"
                            >
                                <X size={11} />
                            </button>
                        </div>
                    ))}
                    {showInput && (
                        <div className="bp-tag-input-row">
                            <input
                                type="text"
                                className="bp-tag-input"
                                placeholder={`Add ${category.name.toLowerCase()}...`}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                            />
                            <button className="bp-tag-confirm" onClick={handleAdd}>
                                <Plus size={12} />
                            </button>
                        </div>
                    )}
                    {categoryTags.length === 0 && !showInput && (
                        <div className="bp-empty-cat">No {category.name.toLowerCase()} tagged</div>
                    )}
                </div>
            )}
        </div>
    );
}

function OverviewMode({ projectId }) {
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);
    const breakdownTags = useEditorStore((s) => s._breakdownTags[projectId] || {});

    const scenes = useMemo(() => {
        return blocks
            .filter((b) => b.type === 'scene-heading')
            .map((b, i) => ({
                id: b.id,
                number: i + 1,
                slugline: b.text || `UNTITLED SCENE ${i + 1}`,
                tags: breakdownTags[b.id] || [],
            }));
    }, [blocks, breakdownTags]);

    const allGrouped = useEditorStore.getState().getAllBreakdownTags(projectId);
    const totalTags = Object.values(allGrouped).reduce((sum, arr) => sum + arr.length, 0);

    return (
        <div className="bp-overview">
            <div className="bp-overview-summary">
                <span className="bp-overview-total">{totalTags} unique elements across {scenes.length} scenes</span>
            </div>
            {CATEGORIES.map((cat) => {
                const items = allGrouped[cat.name] || [];
                if (items.length === 0) return null;
                const Icon = cat.icon;
                return (
                    <div key={cat.name} className="bp-overview-category">
                        <div className="bp-overview-cat-header">
                            <Icon size={13} style={{ color: cat.color }} />
                            <span style={{ color: cat.color }}>{cat.name}</span>
                            <span className="bp-overview-cat-count">{items.length}</span>
                        </div>
                        <div className="bp-overview-tags">
                            {items.map((tag) => (
                                <span
                                    key={tag.id}
                                    className="bp-overview-pill"
                                    style={{ backgroundColor: cat.color + '18', color: cat.color, borderColor: cat.color + '30' }}
                                >
                                    {tag.text}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
            {totalTags === 0 && (
                <div className="bp-overview-empty">
                    No breakdown tags yet. Select a scene and start tagging production elements.
                </div>
            )}
        </div>
    );
}

export default function BreakdownPanel({ projectId }) {
    const [mode, setMode] = useState('scene'); // 'scene' | 'overview'
    const activeBlockId = useEditorStore((s) => s.activeBlockId);
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);
    const breakdownTags = useEditorStore((s) => s._breakdownTags[projectId] || {});
    const { addBreakdownTag, removeBreakdownTag } = useEditorStore();

    // Find the current scene heading for the active block
    const currentSceneId = useMemo(() => {
        if (!activeBlockId) return null;
        const idx = blocks.findIndex((b) => b.id === activeBlockId);
        if (idx === -1) return null;
        // Walk backward to find the nearest scene heading
        for (let i = idx; i >= 0; i--) {
            if (blocks[i].type === 'scene-heading') return blocks[i].id;
        }
        return null;
    }, [activeBlockId, blocks]);

    const currentScene = useMemo(() => {
        if (!currentSceneId) return null;
        const block = blocks.find((b) => b.id === currentSceneId);
        if (!block) return null;
        const sceneHeadings = blocks.filter((b) => b.type === 'scene-heading');
        const sceneIndex = sceneHeadings.findIndex((b) => b.id === currentSceneId);
        return {
            id: block.id,
            number: sceneIndex + 1,
            slugline: block.text || `UNTITLED SCENE ${sceneIndex + 1}`,
        };
    }, [currentSceneId, blocks]);

    const sceneTags = useMemo(() => {
        if (!currentSceneId) return [];
        return breakdownTags[currentSceneId] || [];
    }, [currentSceneId, breakdownTags]);

    const handleAdd = useCallback((category, text) => {
        if (currentSceneId) {
            addBreakdownTag(projectId, currentSceneId, category, text);
        }
    }, [projectId, currentSceneId, addBreakdownTag]);

    const handleRemove = useCallback((tagId) => {
        if (currentSceneId) {
            removeBreakdownTag(projectId, currentSceneId, tagId);
        }
    }, [projectId, currentSceneId, removeBreakdownTag]);

    const handleExportCSV = useCallback(() => {
        const allTags = useEditorStore.getState()._breakdownTags[projectId] || {};
        const sceneHeadings = blocks.filter((b) => b.type === 'scene-heading');
        const rows = [['Scene', 'Category', 'Element']];

        sceneHeadings.forEach((scene, idx) => {
            const tags = allTags[scene.id] || [];
            if (tags.length === 0) {
                rows.push([`${idx + 1}. ${scene.text || 'UNTITLED'}`, '', '']);
            } else {
                tags.forEach((tag) => {
                    rows.push([`${idx + 1}. ${scene.text || 'UNTITLED'}`, tag.category, tag.text]);
                });
            }
        });

        const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'breakdown-report.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [projectId, blocks]);

    return (
        <div className="breakdown-panel">
            <div className="bp-header">
                <div className="bp-header-left">
                    <Tags size={15} />
                    <span className="bp-title">Script Breakdown</span>
                </div>
                <div className="bp-header-actions">
                    <button
                        className={`bp-mode-btn ${mode === 'scene' ? 'active' : ''}`}
                        onClick={() => setMode('scene')}
                        title="Scene View"
                    >
                        <Eye size={13} />
                    </button>
                    <button
                        className={`bp-mode-btn ${mode === 'overview' ? 'active' : ''}`}
                        onClick={() => setMode('overview')}
                        title="Overview"
                    >
                        <List size={13} />
                    </button>
                    <button
                        className="bp-export-btn"
                        onClick={handleExportCSV}
                        title="Export as CSV"
                    >
                        <Download size={13} />
                    </button>
                </div>
            </div>

            {mode === 'overview' ? (
                <OverviewMode projectId={projectId} />
            ) : (
                <div className="bp-scene-view">
                    {currentScene ? (
                        <>
                            <div className="bp-scene-header">
                                <span className="bp-scene-number">Scene {currentScene.number}</span>
                                <span className="bp-scene-slugline">{currentScene.slugline}</span>
                            </div>
                            <div className="bp-categories-list">
                                {CATEGORIES.map((cat) => (
                                    <CategorySection
                                        key={cat.name}
                                        category={cat}
                                        tags={sceneTags}
                                        projectId={projectId}
                                        sceneId={currentSceneId}
                                        onAdd={handleAdd}
                                        onRemove={handleRemove}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="bp-no-scene">
                            <Tags size={24} style={{ opacity: 0.3 }} />
                            <p>Select a scene in the editor to tag production elements.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
