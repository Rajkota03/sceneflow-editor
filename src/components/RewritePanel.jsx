import React, { useMemo } from 'react';
import { Wand2, Eye, AlertCircle, Type, MessageSquare, ArrowRight, Zap } from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import '../styles/rewrite-panel.css';

// ── "Show don't tell" detector ──
const MENTAL_STATE_PATTERNS = [
    { regex: /\b(felt|feels|feeling)\s+\w+/gi, label: 'felt' },
    { regex: /\b(thought|thinks|thinking)\s+(that\s+)?\w+/gi, label: 'thought' },
    { regex: /\b(realized|realizes|realizing)\s+(that\s+)?\w+/gi, label: 'realized' },
    { regex: /\b(knew|knows|knowing)\s+(that\s+)?\w+/gi, label: 'knew' },
    { regex: /\b(decided|decides|deciding)\s+(to\s+)?\w+/gi, label: 'decided' },
    { regex: /\b(wanted|wants|wanting)\s+(to\s+)?\w+/gi, label: 'wanted' },
    { regex: /\b(remembered|remembers|remembering)\s+\w+/gi, label: 'remembered' },
    { regex: /\b(understood|understands|understanding)\s+\w+/gi, label: 'understood' },
    { regex: /\b(wondered|wonders|wondering)\s+\w+/gi, label: 'wondered' },
    { regex: /\b(hoped|hopes|hoping)\s+(to\s+|that\s+)?\w+/gi, label: 'hoped' },
];

const SHOW_ALTERNATIVES = {
    felt: 'Show the emotion through physical reactions, body language, or actions instead of telling what was felt.',
    thought: 'Replace with dialogue, a reaction shot, or a visual that implies the thought.',
    realized: 'Show the moment of realization through action — a look, a sudden movement, an object noticed.',
    knew: 'Demonstrate knowledge through confident action or dialogue rather than narrating it.',
    decided: 'Show the decision through action — picking up keys, making a call, changing direction.',
    wanted: 'Show desire through action — reaching, staring, following.',
    remembered: 'Use a visual or sound callback to trigger the memory naturally.',
    understood: 'Show understanding through a nod, changed behavior, or dialogue that reflects the insight.',
    wondered: 'Show curiosity through searching glances, questions, or exploratory action.',
    hoped: 'Show hope through visual cues — a distant look, clutching something, crossing fingers.',
};

// ── Passive voice detector ──
const PASSIVE_REGEX = /\b(was|were|is|are|been|being|got)\s+\w+ed\b/gi;

// ── Adverb detector ──
const ADVERB_REGEX = /\b\w+ly\b/gi;
const FALSE_ADVERBS = new Set([
    'only', 'early', 'daily', 'family', 'lonely', 'holy', 'ugly', 'likely',
    'friendly', 'lovely', 'deadly', 'belly', 'rally', 'ally', 'reply',
    'supply', 'apply', 'fly', 'july', 'italy', 'emily', 'billy', 'sally',
    'molly', 'kelly', 'holly', 'lily', 'really',
]);

function getSceneBlocks(blocks) {
    // Group blocks into scenes
    const scenes = [];
    let currentScene = null;

    blocks.forEach((block, index) => {
        if (block.type === 'scene-heading') {
            if (currentScene) scenes.push(currentScene);
            currentScene = {
                heading: block.text.trim() || `SCENE ${scenes.length + 1}`,
                headingIndex: index,
                blocks: [block],
            };
        } else if (currentScene) {
            currentScene.blocks.push(block);
        }
    });

    if (currentScene) scenes.push(currentScene);
    return scenes;
}

function analyzeScene(scene, allScenes) {
    const suggestions = [];
    const { blocks, heading } = scene;

    let dialogueBlocks = 0;
    let actionBlocks = 0;
    let totalWords = 0;

    blocks.forEach(block => {
        const text = block.text?.trim() || '';
        const words = text.split(/\s+/).filter(Boolean).length;
        totalWords += words;

        if (block.type === 'dialogue') dialogueBlocks++;
        if (block.type === 'action') actionBlocks++;

        // Only analyze action blocks for show/tell and style issues
        if (block.type === 'action' && text) {
            // Show don't tell
            MENTAL_STATE_PATTERNS.forEach(({ regex, label }) => {
                regex.lastIndex = 0;
                const matches = text.match(regex);
                if (matches) {
                    matches.forEach(match => {
                        suggestions.push({
                            type: 'show-dont-tell',
                            severity: 'warning',
                            icon: Eye,
                            title: 'Show, Don\'t Tell',
                            text: match,
                            blockText: text,
                            suggestion: SHOW_ALTERNATIVES[label] || 'Show through action instead of telling.',
                        });
                    });
                }
            });

            // Passive voice
            const passiveMatches = text.match(PASSIVE_REGEX);
            if (passiveMatches) {
                passiveMatches.forEach(match => {
                    suggestions.push({
                        type: 'passive-voice',
                        severity: 'info',
                        icon: Type,
                        title: 'Passive Voice',
                        text: match,
                        blockText: text,
                        suggestion: `Rewrite in active voice for stronger impact. Instead of "${match}", consider who is performing the action.`,
                    });
                });
            }

            // Adverb overuse
            const adverbMatches = text.match(ADVERB_REGEX);
            if (adverbMatches) {
                const realAdverbs = adverbMatches.filter(m => !FALSE_ADVERBS.has(m.toLowerCase()));
                if (realAdverbs.length >= 2) {
                    suggestions.push({
                        type: 'adverb-overuse',
                        severity: 'info',
                        icon: Zap,
                        title: 'Adverb Overuse',
                        text: realAdverbs.join(', '),
                        blockText: text,
                        suggestion: `Found ${realAdverbs.length} adverbs in one block: ${realAdverbs.join(', ')}. Replace with stronger verbs. "Ran quickly" becomes "sprinted."`,
                    });
                }
            }
        }
    });

    // Dialogue-to-action ratio
    const totalRelevant = dialogueBlocks + actionBlocks;
    if (totalRelevant > 0) {
        const dialogueRatio = dialogueBlocks / totalRelevant;
        if (dialogueRatio > 0.85 && totalRelevant > 4) {
            suggestions.push({
                type: 'ratio',
                severity: 'warning',
                icon: MessageSquare,
                title: 'Too Dialogue-Heavy',
                text: `${Math.round(dialogueRatio * 100)}% dialogue`,
                blockText: '',
                suggestion: 'This scene is almost entirely dialogue. Consider adding action beats, visual reactions, or physical business to break up the talking.',
            });
        } else if (dialogueRatio < 0.15 && totalRelevant > 4) {
            suggestions.push({
                type: 'ratio',
                severity: 'info',
                icon: MessageSquare,
                title: 'Action-Heavy Scene',
                text: `Only ${Math.round(dialogueRatio * 100)}% dialogue`,
                blockText: '',
                suggestion: 'This scene is mostly action. If characters are present, consider adding brief dialogue exchanges to maintain character voice and connection.',
            });
        }
    }

    // Scene length assessment
    const pageEstimate = totalWords / 250;
    if (pageEstimate > 4) {
        suggestions.push({
            type: 'length',
            severity: 'warning',
            icon: AlertCircle,
            title: 'Scene Too Long',
            text: `~${pageEstimate.toFixed(1)} pages`,
            blockText: '',
            suggestion: `At ~${pageEstimate.toFixed(1)} pages, this scene may lose audience attention. The ideal scene is 2-3 pages. Consider splitting into two scenes or trimming excess.`,
        });
    } else if (pageEstimate < 0.3 && blocks.length > 1) {
        suggestions.push({
            type: 'length',
            severity: 'info',
            icon: AlertCircle,
            title: 'Very Short Scene',
            text: `~${pageEstimate.toFixed(1)} pages`,
            blockText: '',
            suggestion: 'This scene is very brief. Short scenes work for montages or quick cuts, but ensure it has enough substance to justify a scene break.',
        });
    }

    return {
        heading,
        dialogueBlocks,
        actionBlocks,
        totalWords,
        pageEstimate,
        suggestions,
        dialogueRatio: totalRelevant > 0 ? dialogueBlocks / totalRelevant : 0,
    };
}

function SuggestionCard({ suggestion }) {
    const Icon = suggestion.icon;
    return (
        <div className={`rewrite-suggestion ${suggestion.severity}`}>
            <div className="rewrite-suggestion-header">
                <Icon size={13} />
                <span className="rewrite-suggestion-title">{suggestion.title}</span>
                <span className={`rewrite-severity-badge ${suggestion.severity}`}>
                    {suggestion.severity}
                </span>
            </div>
            {suggestion.text && (
                <div className="rewrite-highlight">
                    <span className="rewrite-found-text">"{suggestion.text}"</span>
                </div>
            )}
            <p className="rewrite-suggestion-fix">
                <ArrowRight size={10} />
                {suggestion.suggestion}
            </p>
        </div>
    );
}

export default function RewritePanel({ projectId }) {
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);
    const activeBlockId = useEditorStore((s) => s.activeBlockId);

    const analysis = useMemo(() => {
        const scenes = getSceneBlocks(blocks);

        // Find which scene the active block is in
        let activeSceneIndex = -1;
        if (activeBlockId) {
            for (let i = 0; i < scenes.length; i++) {
                if (scenes[i].blocks.some(b => b.id === activeBlockId)) {
                    activeSceneIndex = i;
                    break;
                }
            }
        }

        // Analyze the active scene, or show overview of all
        if (activeSceneIndex >= 0) {
            const sceneAnalysis = analyzeScene(scenes[activeSceneIndex], scenes);
            return { mode: 'scene', scene: sceneAnalysis, sceneIndex: activeSceneIndex };
        }

        // Overview: analyze all scenes and collect suggestions
        const allSuggestions = [];
        scenes.forEach((scene, i) => {
            const sceneAnalysis = analyzeScene(scene, scenes);
            sceneAnalysis.suggestions.forEach(s => {
                allSuggestions.push({ ...s, sceneName: sceneAnalysis.heading, sceneIndex: i });
            });
        });

        return { mode: 'overview', suggestions: allSuggestions, sceneCount: scenes.length };
    }, [blocks, activeBlockId]);

    // Count suggestions by type for summary
    const typeCounts = useMemo(() => {
        const suggestions = analysis.mode === 'scene'
            ? analysis.scene.suggestions
            : analysis.suggestions;

        const counts = { 'show-dont-tell': 0, 'passive-voice': 0, 'adverb-overuse': 0, ratio: 0, length: 0 };
        suggestions.forEach(s => {
            counts[s.type] = (counts[s.type] || 0) + 1;
        });
        return counts;
    }, [analysis]);

    const allSuggestions = analysis.mode === 'scene' ? analysis.scene.suggestions : analysis.suggestions;

    return (
        <div className="rewrite-panel">
            <div className="rewrite-header">
                <Wand2 size={16} />
                <span>Rewrite Suggestions</span>
            </div>

            {analysis.mode === 'scene' ? (
                <div className="rewrite-scene-info">
                    <span className="rewrite-scene-label">Analyzing Scene</span>
                    <span className="rewrite-scene-name">{analysis.scene.heading}</span>
                    <div className="rewrite-scene-stats">
                        <span>~{analysis.scene.pageEstimate.toFixed(1)} pages</span>
                        <span>&middot;</span>
                        <span>{Math.round(analysis.scene.dialogueRatio * 100)}% dialogue</span>
                        <span>&middot;</span>
                        <span>{allSuggestions.length} issue{allSuggestions.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            ) : (
                <div className="rewrite-scene-info">
                    <span className="rewrite-scene-label">Script Overview</span>
                    <span className="rewrite-scene-name">{analysis.sceneCount} scenes analyzed</span>
                    <span className="rewrite-scene-stats">
                        {allSuggestions.length} total suggestion{allSuggestions.length !== 1 ? 's' : ''}
                    </span>
                </div>
            )}

            {/* Summary badges */}
            {allSuggestions.length > 0 && (
                <div className="rewrite-summary">
                    {typeCounts['show-dont-tell'] > 0 && (
                        <span className="rewrite-type-badge show">
                            <Eye size={10} /> Show/Tell: {typeCounts['show-dont-tell']}
                        </span>
                    )}
                    {typeCounts['passive-voice'] > 0 && (
                        <span className="rewrite-type-badge passive">
                            <Type size={10} /> Passive: {typeCounts['passive-voice']}
                        </span>
                    )}
                    {typeCounts['adverb-overuse'] > 0 && (
                        <span className="rewrite-type-badge adverb">
                            <Zap size={10} /> Adverbs: {typeCounts['adverb-overuse']}
                        </span>
                    )}
                    {typeCounts.ratio > 0 && (
                        <span className="rewrite-type-badge ratio">
                            <MessageSquare size={10} /> Balance: {typeCounts.ratio}
                        </span>
                    )}
                    {typeCounts.length > 0 && (
                        <span className="rewrite-type-badge length">
                            <AlertCircle size={10} /> Length: {typeCounts.length}
                        </span>
                    )}
                </div>
            )}

            {/* Suggestions list */}
            <div className="rewrite-suggestions-list">
                {allSuggestions.length === 0 ? (
                    <div className="rewrite-clean">
                        <Wand2 size={28} />
                        <p>Looking good! No immediate rewrite suggestions for this {analysis.mode === 'scene' ? 'scene' : 'script'}.</p>
                    </div>
                ) : (
                    allSuggestions.map((suggestion, i) => (
                        <div key={i}>
                            {analysis.mode === 'overview' && (i === 0 || suggestion.sceneName !== allSuggestions[i - 1]?.sceneName) && (
                                <div className="rewrite-scene-divider">
                                    {suggestion.sceneName}
                                </div>
                            )}
                            <SuggestionCard suggestion={suggestion} />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
