import React, { useMemo, useState } from 'react';
import {
    Users,
    MessageSquare,
    Hash,
    ArrowRight,
    Film,
    SortAsc,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import '../styles/character-bible.css';

// ── Extract character data from blocks ──
function analyzeCharacters(blocks) {
    const charData = {};
    let currentChar = null;
    let currentSceneNum = 0;
    let currentSceneId = null;

    blocks.forEach((block, idx) => {
        if (block.type === 'scene-heading') {
            currentSceneNum++;
            currentSceneId = block.id;
        }

        if (block.type === 'character') {
            const rawName = (block.text || '').trim().toUpperCase().replace(/\s*\(.*\)$/, '');
            if (!rawName) return;

            currentChar = rawName;
            if (!charData[rawName]) {
                charData[rawName] = {
                    name: rawName,
                    dialogueCount: 0,
                    wordCount: 0,
                    firstAppearance: currentSceneNum,
                    firstBlockIdx: idx,
                    scenes: new Set(),
                    dialogueLengths: [],
                };
            }
            charData[rawName].dialogueCount++;
            if (currentSceneId) charData[rawName].scenes.add(currentSceneNum);
        }

        if (block.type === 'dialogue' && currentChar && charData[currentChar]) {
            const words = (block.text || '').split(/\s+/).filter(Boolean).length;
            charData[currentChar].wordCount += words;
            charData[currentChar].dialogueLengths.push(words);
        }

        if (['scene-heading', 'action'].includes(block.type)) {
            currentChar = null;
        }
    });

    return Object.values(charData).map((c) => ({
        ...c,
        scenes: [...c.scenes],
        sceneCount: c.scenes.size || c.scenes.length,
        avgLineLength: c.dialogueLengths.length > 0
            ? Math.round(c.dialogueLengths.reduce((a, b) => a + b, 0) / c.dialogueLengths.length)
            : 0,
    }));
}

// ── Find shared scenes (relationships) ──
function buildRelationships(characters) {
    const edges = [];
    for (let i = 0; i < characters.length; i++) {
        for (let j = i + 1; j < characters.length; j++) {
            const a = characters[i];
            const b = characters[j];
            const shared = a.scenes.filter((s) => b.scenes.includes(s)).length;
            if (shared > 0) {
                edges.push({ from: a.name, to: b.name, weight: shared });
            }
        }
    }
    return edges.sort((a, b) => b.weight - a.weight).slice(0, 15);
}

const SORT_OPTIONS = [
    { id: 'dialogue', label: 'Most dialogue' },
    { id: 'words', label: 'Most words' },
    { id: 'scenes', label: 'Most scenes' },
    { id: 'first', label: 'First appearance' },
    { id: 'alpha', label: 'A → Z' },
];

const CHAR_COLORS = [
    '#8b5cf6', '#3b82f6', '#22c55e', '#f97316', '#ec4899',
    '#14b8a6', '#eab308', '#6366f1', '#ef4444', '#06b6d4',
];

export default function CharacterBible({ projectId }) {
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);
    const [sortBy, setSortBy] = useState('dialogue');
    const [expandedChar, setExpandedChar] = useState(null);
    const [showRelationships, setShowRelationships] = useState(false);

    const characters = useMemo(() => analyzeCharacters(blocks), [blocks]);
    const relationships = useMemo(() => buildRelationships(characters), [characters]);

    const sorted = useMemo(() => {
        const list = [...characters];
        switch (sortBy) {
            case 'dialogue': return list.sort((a, b) => b.dialogueCount - a.dialogueCount);
            case 'words': return list.sort((a, b) => b.wordCount - a.wordCount);
            case 'scenes': return list.sort((a, b) => b.sceneCount - a.sceneCount);
            case 'first': return list.sort((a, b) => a.firstAppearance - b.firstAppearance);
            case 'alpha': return list.sort((a, b) => a.name.localeCompare(b.name));
            default: return list;
        }
    }, [characters, sortBy]);

    const maxDialogue = sorted.length > 0 ? sorted.reduce((m, c) => Math.max(m, c.dialogueCount), 0) : 1;

    return (
        <div className="char-bible">
            <div className="char-bible-header">
                <div className="char-bible-title">
                    <Users size={16} />
                    <span>{characters.length} Characters</span>
                </div>
            </div>

            {/* Sort & View Controls */}
            <div className="char-bible-controls">
                <select
                    className="char-bible-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                >
                    {SORT_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                </select>
                <button
                    className={`char-bible-toggle ${showRelationships ? 'active' : ''}`}
                    onClick={() => setShowRelationships(!showRelationships)}
                    title="Show relationships"
                >
                    Relationships
                </button>
            </div>

            {/* Relationship Graph */}
            {showRelationships && relationships.length > 0 && (
                <div className="char-relationships">
                    <h4>Shared Scenes</h4>
                    {relationships.map((rel, i) => (
                        <div key={i} className="char-rel-edge">
                            <span className="char-rel-name">{rel.from}</span>
                            <div className="char-rel-line">
                                <div
                                    className="char-rel-fill"
                                    style={{
                                        width: `${(rel.weight / Math.max(1, relationships[0]?.weight)) * 100}%`,
                                    }}
                                />
                            </div>
                            <span className="char-rel-name">{rel.to}</span>
                            <span className="char-rel-count">{rel.weight}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Character Cards */}
            <div className="char-bible-list">
                {sorted.map((char, idx) => {
                    const isExpanded = expandedChar === char.name;
                    const color = CHAR_COLORS[idx % CHAR_COLORS.length];
                    const barPct = (char.dialogueCount / maxDialogue) * 100;

                    return (
                        <div
                            key={char.name}
                            className={`char-card ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => setExpandedChar(isExpanded ? null : char.name)}
                        >
                            <div className="char-card-main">
                                <div className="char-card-avatar" style={{ background: color }}>
                                    {char.name[0]}
                                </div>
                                <div className="char-card-info">
                                    <h4 className="char-card-name">{char.name}</h4>
                                    <div className="char-card-bar-track">
                                        <div
                                            className="char-card-bar-fill"
                                            style={{ width: `${barPct}%`, background: color }}
                                        />
                                    </div>
                                </div>
                                <div className="char-card-stats">
                                    <span><MessageSquare size={10} /> {char.dialogueCount}</span>
                                    <span><Film size={10} /> {char.sceneCount}</span>
                                </div>
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>

                            {isExpanded && (
                                <div className="char-card-details">
                                    <div className="char-detail-row">
                                        <span>Total words</span>
                                        <span>{char.wordCount.toLocaleString()}</span>
                                    </div>
                                    <div className="char-detail-row">
                                        <span>Avg line length</span>
                                        <span>{char.avgLineLength} words</span>
                                    </div>
                                    <div className="char-detail-row">
                                        <span>First appearance</span>
                                        <span>Scene {char.firstAppearance}</span>
                                    </div>
                                    <div className="char-detail-row">
                                        <span>Scenes</span>
                                        <span className="char-detail-scenes">
                                            {char.scenes.join(', ')}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {characters.length === 0 && (
                <div className="char-bible-empty">
                    <Users size={32} />
                    <p>No characters yet</p>
                    <span>Add character blocks in the editor</span>
                </div>
            )}
        </div>
    );
}
