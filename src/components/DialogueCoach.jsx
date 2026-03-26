import React, { useMemo, useState } from 'react';
import { MessageSquare, ChevronDown, ChevronRight, AlertTriangle, Lightbulb, BarChart3 } from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import '../styles/dialogue-coach.css';

const FILLER_WORDS = [
    'just', 'really', 'very', 'actually', 'basically', 'literally',
    'kind of', 'sort of', 'you know', 'i mean', 'like', 'honestly',
    'obviously', 'definitely', 'absolutely', 'totally', 'probably',
];

function extractCharacterDialogue(blocks) {
    const characters = {};
    let currentChar = null;

    blocks.forEach((block, i) => {
        if (block.type === 'character' && block.text.trim()) {
            currentChar = block.text.trim().toUpperCase().replace(/\s*\(.*\)$/, '');
            if (!characters[currentChar]) {
                characters[currentChar] = { lines: [], allText: '' };
            }
        } else if (block.type === 'dialogue' && currentChar && block.text.trim()) {
            characters[currentChar].lines.push(block.text.trim());
            characters[currentChar].allText += ' ' + block.text.trim();
        } else if (block.type === 'scene-heading' || block.type === 'action') {
            currentChar = null;
        }
    });

    return characters;
}

function analyzeCharacterDialogue(name, data, allCharData) {
    const { lines, allText } = data;
    if (lines.length === 0) return null;

    const text = allText.trim().toLowerCase();
    const words = text.split(/\s+/).filter(Boolean);
    const totalWords = words.length;

    // Average line length
    const avgLineLength = Math.round(totalWords / lines.length);
    let lineLengthLabel = 'balanced';
    if (avgLineLength < 8) lineLengthLabel = 'punchy & concise';
    else if (avgLineLength > 25) lineLengthLabel = 'expository';
    else if (avgLineLength > 15) lineLengthLabel = 'verbose';

    // Vocabulary richness
    const uniqueWords = new Set(words.map(w => w.replace(/[^a-z']/g, '')).filter(w => w.length > 2));
    const vocabRichness = totalWords > 0 ? (uniqueWords.size / totalWords) : 0;
    let vocabLabel = 'average';
    if (vocabRichness > 0.7) vocabLabel = 'highly diverse';
    else if (vocabRichness > 0.55) vocabLabel = 'good variety';
    else if (vocabRichness < 0.35) vocabLabel = 'repetitive';

    // Overused phrases (2-word combos used 3+ times)
    const phraseCounts = {};
    for (let i = 0; i < words.length - 1; i++) {
        const phrase = words[i].replace(/[^a-z']/g, '') + ' ' + words[i + 1].replace(/[^a-z']/g, '');
        if (phrase.length > 4) {
            phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
        }
    }
    const overusedPhrases = Object.entries(phraseCounts)
        .filter(([, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([phrase, count]) => ({ phrase, count }));

    // Filler words
    let fillerCount = 0;
    const fillerFound = {};
    FILLER_WORDS.forEach(filler => {
        const regex = new RegExp('\\b' + filler.replace(/ /g, '\\s+') + '\\b', 'gi');
        const matches = text.match(regex);
        if (matches) {
            fillerCount += matches.length;
            fillerFound[filler] = matches.length;
        }
    });
    const fillerRate = totalWords > 0 ? (fillerCount / totalWords) * 100 : 0;

    // Question ratio
    const questionLines = lines.filter(l => l.trim().endsWith('?')).length;
    const questionRatio = lines.length > 0 ? (questionLines / lines.length) * 100 : 0;

    // Exclamation ratio
    const exclamationLines = lines.filter(l => l.includes('!')).length;
    const exclamationRatio = lines.length > 0 ? (exclamationLines / lines.length) * 100 : 0;

    // Voice distinctiveness: compare this character's word frequency to others
    const thisWordFreq = {};
    words.forEach(w => {
        const clean = w.replace(/[^a-z']/g, '');
        if (clean.length > 2) thisWordFreq[clean] = (thisWordFreq[clean] || 0) + 1;
    });

    // Get all other characters' combined word frequencies
    const otherWordFreq = {};
    let otherTotal = 0;
    Object.entries(allCharData).forEach(([otherName, otherData]) => {
        if (otherName === name) return;
        const otherWords = otherData.allText.trim().toLowerCase().split(/\s+/).filter(Boolean);
        otherTotal += otherWords.length;
        otherWords.forEach(w => {
            const clean = w.replace(/[^a-z']/g, '');
            if (clean.length > 2) otherWordFreq[clean] = (otherWordFreq[clean] || 0) + 1;
        });
    });

    // Compute cosine-like distinctiveness
    let distinctiveness = 0.5; // default if no other characters
    if (otherTotal > 0 && totalWords > 0) {
        const allWords = new Set([...Object.keys(thisWordFreq), ...Object.keys(otherWordFreq)]);
        let dotProduct = 0, magA = 0, magB = 0;
        allWords.forEach(w => {
            const a = (thisWordFreq[w] || 0) / totalWords;
            const b = (otherWordFreq[w] || 0) / otherTotal;
            dotProduct += a * b;
            magA += a * a;
            magB += b * b;
        });
        const cosineSim = (magA > 0 && magB > 0) ? dotProduct / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
        distinctiveness = 1 - cosineSim; // 0 = identical, 1 = completely different
    }

    // Generate tips
    const tips = [];
    if (avgLineLength > 20) tips.push('Consider breaking up long speeches. Audiences lose attention after ~15 words per line.');
    if (avgLineLength < 5 && lines.length > 5) tips.push('Lines are very short. While punchy, ensure there is enough variety to avoid monotony.');
    if (vocabRichness < 0.35) tips.push('Vocabulary is quite repetitive. Try varying word choices to make dialogue feel more natural.');
    if (fillerRate > 5) tips.push(`High filler word usage (${fillerRate.toFixed(1)}%). Remove fillers unless they define this character's voice.`);
    if (questionRatio > 60) tips.push('Over 60% questions. Unless this character is an interrogator, consider mixing in more statements.');
    if (questionRatio < 5 && lines.length > 5) tips.push('Very few questions. Questions create natural conversation rhythm and subtext.');
    if (exclamationRatio > 40) tips.push('Heavy exclamation mark usage. Overuse dilutes emotional impact — save them for key moments.');
    if (distinctiveness < 0.3 && Object.keys(allCharData).length > 1) tips.push('This character sounds similar to others. Give them unique speech patterns, vocabulary, or rhythm.');
    if (overusedPhrases.length > 0) tips.push(`Watch for repeated phrases: "${overusedPhrases[0].phrase}" appears ${overusedPhrases[0].count} times.`);
    if (tips.length === 0) tips.push('Dialogue looks solid! Keep up the good work.');

    return {
        name,
        lineCount: lines.length,
        totalWords,
        avgLineLength,
        lineLengthLabel,
        vocabRichness,
        vocabLabel,
        overusedPhrases,
        fillerCount,
        fillerRate,
        fillerFound,
        questionRatio,
        exclamationRatio,
        distinctiveness,
        tips,
    };
}

function MetricBar({ label, value, max, color, suffix = '' }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="coach-metric">
            <div className="coach-metric-header">
                <span className="coach-metric-label">{label}</span>
                <span className="coach-metric-value">{typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}{suffix}</span>
            </div>
            <div className="coach-metric-track">
                <div className="coach-metric-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
        </div>
    );
}

function CharacterCard({ analysis, isExpanded, onToggle }) {
    const { name, lineCount, totalWords, avgLineLength, lineLengthLabel, vocabRichness,
        vocabLabel, overusedPhrases, fillerCount, fillerRate, fillerFound,
        questionRatio, exclamationRatio, distinctiveness, tips } = analysis;

    return (
        <div className={`coach-character-card ${isExpanded ? 'expanded' : ''}`}>
            <button className="coach-char-header" onClick={onToggle}>
                <div className="coach-char-avatar">{name.charAt(0)}</div>
                <div className="coach-char-info">
                    <span className="coach-char-name">{name}</span>
                    <span className="coach-char-stats">{lineCount} lines &middot; {totalWords} words</span>
                </div>
                <div className="coach-char-score" title="Voice distinctiveness">
                    <span className={`score-badge ${distinctiveness > 0.5 ? 'good' : distinctiveness > 0.3 ? 'fair' : 'low'}`}>
                        {Math.round(distinctiveness * 100)}%
                    </span>
                </div>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {isExpanded && (
                <div className="coach-char-details">
                    <div className="coach-metrics-grid">
                        <MetricBar
                            label={`Avg line length (${lineLengthLabel})`}
                            value={avgLineLength}
                            max={30}
                            color="#8b5cf6"
                            suffix=" words"
                        />
                        <MetricBar
                            label={`Vocab richness (${vocabLabel})`}
                            value={vocabRichness * 100}
                            max={100}
                            color="#3b82f6"
                            suffix="%"
                        />
                        <MetricBar
                            label="Filler word rate"
                            value={fillerRate}
                            max={10}
                            color={fillerRate > 5 ? '#f87171' : '#22c55e'}
                            suffix="%"
                        />
                        <MetricBar
                            label="Question ratio"
                            value={questionRatio}
                            max={100}
                            color="#eab308"
                            suffix="%"
                        />
                        <MetricBar
                            label="Exclamation ratio"
                            value={exclamationRatio}
                            max={100}
                            color="#f97316"
                            suffix="%"
                        />
                        <MetricBar
                            label="Voice distinctiveness"
                            value={distinctiveness * 100}
                            max={100}
                            color={distinctiveness > 0.5 ? '#22c55e' : distinctiveness > 0.3 ? '#eab308' : '#f87171'}
                            suffix="%"
                        />
                    </div>

                    {overusedPhrases.length > 0 && (
                        <div className="coach-section">
                            <h5><AlertTriangle size={12} /> Overused Phrases</h5>
                            <div className="coach-phrases">
                                {overusedPhrases.map(({ phrase, count }) => (
                                    <span key={phrase} className="coach-phrase-tag">
                                        "{phrase}" <em>{count}x</em>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {fillerCount > 0 && (
                        <div className="coach-section">
                            <h5><AlertTriangle size={12} /> Filler Words ({fillerCount})</h5>
                            <div className="coach-phrases">
                                {Object.entries(fillerFound)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([word, count]) => (
                                        <span key={word} className="coach-phrase-tag filler">
                                            {word} <em>{count}x</em>
                                        </span>
                                    ))}
                            </div>
                        </div>
                    )}

                    <div className="coach-section">
                        <h5><Lightbulb size={12} /> Tips</h5>
                        <ul className="coach-tips">
                            {tips.map((tip, i) => (
                                <li key={i}>{tip}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DialogueCoach({ projectId }) {
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);
    const [expandedChar, setExpandedChar] = useState(null);

    const analyses = useMemo(() => {
        const charData = extractCharacterDialogue(blocks);
        const results = [];

        Object.entries(charData).forEach(([name, data]) => {
            const analysis = analyzeCharacterDialogue(name, data, charData);
            if (analysis) results.push(analysis);
        });

        return results.sort((a, b) => b.totalWords - a.totalWords);
    }, [blocks]);

    // Overall script dialogue health
    const overallStats = useMemo(() => {
        if (analyses.length === 0) return null;
        const totalFillers = analyses.reduce((s, a) => s + a.fillerCount, 0);
        const avgDistinctiveness = analyses.reduce((s, a) => s + a.distinctiveness, 0) / analyses.length;
        const totalOverused = analyses.reduce((s, a) => s + a.overusedPhrases.length, 0);
        return { totalFillers, avgDistinctiveness, totalOverused, charCount: analyses.length };
    }, [analyses]);

    return (
        <div className="dialogue-coach">
            <div className="coach-header">
                <MessageSquare size={16} />
                <span>Dialogue Coach</span>
            </div>

            {analyses.length === 0 ? (
                <div className="coach-empty">
                    <MessageSquare size={32} />
                    <p>No dialogue found yet.<br />Add character and dialogue blocks to get coaching insights.</p>
                </div>
            ) : (
                <>
                    {overallStats && (
                        <div className="coach-overview">
                            <div className="coach-overview-stat">
                                <span className="coach-ov-value">{overallStats.charCount}</span>
                                <span className="coach-ov-label">Characters</span>
                            </div>
                            <div className="coach-overview-stat">
                                <span className="coach-ov-value">{overallStats.totalFillers}</span>
                                <span className="coach-ov-label">Fillers</span>
                            </div>
                            <div className="coach-overview-stat">
                                <span className={`coach-ov-value ${overallStats.avgDistinctiveness > 0.5 ? 'good' : 'warn'}`}>
                                    {Math.round(overallStats.avgDistinctiveness * 100)}%
                                </span>
                                <span className="coach-ov-label">Avg Voice</span>
                            </div>
                            <div className="coach-overview-stat">
                                <span className={`coach-ov-value ${overallStats.totalOverused > 3 ? 'warn' : ''}`}>
                                    {overallStats.totalOverused}
                                </span>
                                <span className="coach-ov-label">Repeats</span>
                            </div>
                        </div>
                    )}

                    <div className="coach-characters">
                        {analyses.map(analysis => (
                            <CharacterCard
                                key={analysis.name}
                                analysis={analysis}
                                isExpanded={expandedChar === analysis.name}
                                onToggle={() => setExpandedChar(
                                    expandedChar === analysis.name ? null : analysis.name
                                )}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
