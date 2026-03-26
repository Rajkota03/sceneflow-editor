import React, { useMemo, useState } from 'react';
import {
    Users,
    BarChart3,
    Download,
    MessageSquare,
    Film,
    TrendingUp,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import '../styles/diversity-report.css';

// ── Helper: Export report data as CSV ──
function exportReportCSV(characters, totalDialogueLines, totalWords, title) {
    const headers = ['Character', 'Dialogue Lines', '% of Lines', 'Words', '% of Words', 'Scenes'];
    const rows = characters.map((c) => [
        c.name,
        c.dialogueLines,
        c.linePercent.toFixed(1),
        c.wordCount,
        c.wordPercent.toFixed(1),
        c.sceneCount,
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach((row) => {
        csv += row.join(',') + '\n';
    });

    csv += '\n';
    csv += `Total Dialogue Lines,${totalDialogueLines}\n`;
    csv += `Total Words,${totalWords}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'Screenplay'}-diversity-report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ── Bar component for visual chart ──
function DialogueBar({ name, percent, color, lines, words }) {
    return (
        <div className="diversity-bar-row">
            <div className="diversity-bar-label">{name}</div>
            <div className="diversity-bar-track">
                <div
                    className="diversity-bar-fill"
                    style={{ width: `${Math.max(percent, 1)}%`, backgroundColor: color }}
                />
            </div>
            <div className="diversity-bar-value">{percent.toFixed(1)}%</div>
        </div>
    );
}

// ── Color palette for character bars ──
const BAR_COLORS = [
    '#e8a838', '#7c3aed', '#3b82f6', '#10b981', '#f43f5e',
    '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#ec4899',
    '#14b8a6', '#f97316', '#6366f1', '#22d3ee', '#a3e635',
];

export default function DiversityReport({ projectId }) {
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);
    const [sortBy, setSortBy] = useState('lines'); // 'lines' | 'words' | 'scenes'
    const [expanded, setExpanded] = useState(true);

    const analysis = useMemo(() => {
        const characterMap = {};
        let currentCharacter = null;
        let currentScene = null;
        let totalDialogueLines = 0;
        let totalWords = 0;

        blocks.forEach((block) => {
            if (block.type === 'scene-heading') {
                currentScene = block.id;
                currentCharacter = null;
            }

            if (block.type === 'character') {
                // Normalize character name: strip extensions like (V.O.), (O.S.), (CONT'D)
                const rawName = (block.text || '').toUpperCase().trim();
                const name = rawName.replace(/\s*\(.*?\)\s*$/, '').trim();
                if (!name) return;

                if (!characterMap[name]) {
                    characterMap[name] = {
                        name,
                        dialogueLines: 0,
                        wordCount: 0,
                        scenes: new Set(),
                    };
                }
                currentCharacter = name;
                if (currentScene) {
                    characterMap[name].scenes.add(currentScene);
                }
            }

            if (block.type === 'dialogue' && currentCharacter && characterMap[currentCharacter]) {
                const text = (block.text || '').trim();
                if (text) {
                    characterMap[currentCharacter].dialogueLines += 1;
                    const words = text.split(/\s+/).filter(Boolean).length;
                    characterMap[currentCharacter].wordCount += words;
                    totalDialogueLines += 1;
                    totalWords += words;
                }
            }

            // Parentheticals don't count as dialogue lines but character stays active
            if (block.type !== 'dialogue' && block.type !== 'parenthetical' && block.type !== 'character') {
                currentCharacter = null;
            }
        });

        // Convert to array and calculate percentages
        const characters = Object.values(characterMap).map((c) => ({
            ...c,
            sceneCount: c.scenes.size,
            linePercent: totalDialogueLines > 0 ? (c.dialogueLines / totalDialogueLines) * 100 : 0,
            wordPercent: totalWords > 0 ? (c.wordCount / totalWords) * 100 : 0,
        }));

        return { characters, totalDialogueLines, totalWords };
    }, [blocks]);

    const sortedCharacters = useMemo(() => {
        const chars = [...analysis.characters];
        switch (sortBy) {
            case 'lines':
                chars.sort((a, b) => b.dialogueLines - a.dialogueLines);
                break;
            case 'words':
                chars.sort((a, b) => b.wordCount - a.wordCount);
                break;
            case 'scenes':
                chars.sort((a, b) => b.sceneCount - a.sceneCount);
                break;
        }
        return chars;
    }, [analysis.characters, sortBy]);

    // Calculate dialogue balance metric (Gini-like)
    const dialogueBalance = useMemo(() => {
        if (analysis.characters.length <= 1) return 100;
        const percents = analysis.characters.map((c) => c.linePercent);
        const idealPercent = 100 / percents.length;
        const deviations = percents.map((p) => Math.abs(p - idealPercent));
        const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
        // Normalize: 0 deviation = 100 balance, maxDeviation = 0 balance
        const maxDeviation = 100 - idealPercent;
        return Math.max(0, Math.round(100 - (avgDeviation / maxDeviation) * 100));
    }, [analysis.characters]);

    // Summary: how many characters hold X% of dialogue
    const dominanceSummary = useMemo(() => {
        if (sortedCharacters.length === 0) return null;
        let cumulative = 0;
        let count = 0;
        const sorted = [...sortedCharacters].sort((a, b) => b.linePercent - a.linePercent);
        for (const c of sorted) {
            cumulative += c.linePercent;
            count++;
            if (cumulative >= 50) break;
        }
        return { count, percent: Math.round(cumulative) };
    }, [sortedCharacters]);

    const totalScenes = useMemo(() => {
        return blocks.filter((b) => b.type === 'scene-heading').length;
    }, [blocks]);

    if (analysis.characters.length === 0) {
        return (
            <div className="diversity-report">
                <div className="diversity-header">
                    <Users size={16} />
                    <span>Dialogue Analysis</span>
                </div>
                <div className="diversity-empty">
                    No characters found. Add character and dialogue blocks to see analysis.
                </div>
            </div>
        );
    }

    return (
        <div className="diversity-report">
            {/* Header */}
            <div className="diversity-header">
                <div className="diversity-header-left">
                    <Users size={16} />
                    <span>Dialogue Analysis</span>
                </div>
                <button
                    className="diversity-export-btn"
                    onClick={() => exportReportCSV(sortedCharacters, analysis.totalDialogueLines, analysis.totalWords, 'Screenplay')}
                    title="Export as CSV"
                >
                    <Download size={14} />
                    CSV
                </button>
            </div>

            {/* Summary Stats */}
            <div className="diversity-stats-grid">
                <div className="diversity-stat">
                    <div className="diversity-stat-value">{analysis.characters.length}</div>
                    <div className="diversity-stat-label">Characters</div>
                </div>
                <div className="diversity-stat">
                    <div className="diversity-stat-value">{analysis.totalDialogueLines}</div>
                    <div className="diversity-stat-label">Lines</div>
                </div>
                <div className="diversity-stat">
                    <div className="diversity-stat-value">{analysis.totalWords.toLocaleString()}</div>
                    <div className="diversity-stat-label">Words</div>
                </div>
                <div className="diversity-stat">
                    <div className="diversity-stat-value">{dialogueBalance}%</div>
                    <div className="diversity-stat-label">Balance</div>
                </div>
            </div>

            {/* Dominance Summary */}
            {dominanceSummary && (
                <div className="diversity-summary">
                    <TrendingUp size={14} />
                    <span>
                        {dominanceSummary.count} character{dominanceSummary.count !== 1 ? 's' : ''} hold{dominanceSummary.count === 1 ? 's' : ''} {dominanceSummary.percent}% of all dialogue
                    </span>
                </div>
            )}

            {/* Bar Chart */}
            <div className="diversity-chart-section">
                <div className="diversity-chart-header">
                    <span className="diversity-chart-title">Dialogue Distribution</span>
                    <div className="diversity-sort-btns">
                        <button
                            className={`diversity-sort-btn ${sortBy === 'lines' ? 'active' : ''}`}
                            onClick={() => setSortBy('lines')}
                        >
                            Lines
                        </button>
                        <button
                            className={`diversity-sort-btn ${sortBy === 'words' ? 'active' : ''}`}
                            onClick={() => setSortBy('words')}
                        >
                            Words
                        </button>
                        <button
                            className={`diversity-sort-btn ${sortBy === 'scenes' ? 'active' : ''}`}
                            onClick={() => setSortBy('scenes')}
                        >
                            Scenes
                        </button>
                    </div>
                </div>

                <div className="diversity-bars">
                    {sortedCharacters.map((char, idx) => (
                        <DialogueBar
                            key={char.name}
                            name={char.name}
                            percent={sortBy === 'words' ? char.wordPercent : sortBy === 'scenes' ? (totalScenes > 0 ? (char.sceneCount / totalScenes) * 100 : 0) : char.linePercent}
                            color={BAR_COLORS[idx % BAR_COLORS.length]}
                            lines={char.dialogueLines}
                            words={char.wordCount}
                        />
                    ))}
                </div>
            </div>

            {/* Detailed Table */}
            <div className="diversity-table-section">
                <button
                    className="diversity-table-toggle"
                    onClick={() => setExpanded(!expanded)}
                >
                    <span>Detailed Breakdown</span>
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {expanded && (
                    <div className="diversity-table">
                        <div className="diversity-table-head">
                            <div className="dt-cell dt-name">Character</div>
                            <div className="dt-cell dt-num">Lines</div>
                            <div className="dt-cell dt-num">%</div>
                            <div className="dt-cell dt-num">Words</div>
                            <div className="dt-cell dt-num">%</div>
                            <div className="dt-cell dt-num">Scenes</div>
                        </div>
                        {sortedCharacters.map((char, idx) => (
                            <div key={char.name} className="diversity-table-row">
                                <div className="dt-cell dt-name">
                                    <span
                                        className="dt-color-dot"
                                        style={{ backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] }}
                                    />
                                    {char.name}
                                </div>
                                <div className="dt-cell dt-num">{char.dialogueLines}</div>
                                <div className="dt-cell dt-num">{char.linePercent.toFixed(1)}</div>
                                <div className="dt-cell dt-num">{char.wordCount}</div>
                                <div className="dt-cell dt-num">{char.wordPercent.toFixed(1)}</div>
                                <div className="dt-cell dt-num">{char.sceneCount}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
