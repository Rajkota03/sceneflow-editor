import React, { useMemo } from 'react';
import { Activity, AlertTriangle, Zap, Clock, TrendingUp } from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import '../styles/pacing-analysis.css';

function getSceneData(blocks) {
    const scenes = [];
    let current = null;

    blocks.forEach(block => {
        if (block.type === 'scene-heading') {
            if (current) scenes.push(current);
            current = {
                heading: block.text?.trim() || 'UNTITLED',
                blocks: [],
                dialogue: 0,
                action: 0,
                other: 0,
                totalWords: 0,
                exclamations: 0,
                capsWords: 0,
                shortSentences: 0,
                questions: 0,
            };
        }
        if (current) {
            current.blocks.push(block);
            const text = block.text?.trim() || '';
            const words = text.split(/\s+/).filter(Boolean);
            current.totalWords += words.length;

            if (block.type === 'dialogue') {
                current.dialogue += words.length;
                // Count exclamations and questions in dialogue
                if (text.includes('!')) current.exclamations++;
                if (text.endsWith('?')) current.questions++;
                // Short punchy lines (under 5 words)
                if (words.length > 0 && words.length < 5) current.shortSentences++;
            } else if (block.type === 'action') {
                current.action += words.length;
                // Caps words in action (BANG, CRASH, etc.)
                words.forEach(w => {
                    if (w === w.toUpperCase() && w.length > 2 && /[A-Z]/.test(w)) {
                        current.capsWords++;
                    }
                });
                if (text.includes('!')) current.exclamations++;
                // Check for short punchy sentences in action
                const sentences = text.split(/[.!?]+/).filter(s => s.trim());
                sentences.forEach(s => {
                    if (s.trim().split(/\s+/).length < 5) current.shortSentences++;
                });
            } else if (block.type !== 'scene-heading') {
                current.other += words.length;
            }
        }
    });

    if (current) scenes.push(current);
    return scenes;
}

function calculateIntensity(scene) {
    // Intensity factors:
    // - Dialogue density (higher = more conversational, moderate is good)
    // - Exclamation marks (urgency)
    // - Short sentences (tension)
    // - ALL CAPS words (action emphasis)
    // - Action-heavy (high action ratio = more intense)

    if (scene.totalWords === 0) return 0;

    const dialogueDensity = scene.dialogue / Math.max(scene.totalWords, 1);
    const exclamationRate = scene.exclamations / Math.max(scene.blocks.length, 1);
    const shortRate = scene.shortSentences / Math.max(scene.blocks.length, 1);
    const capsRate = scene.capsWords / Math.max(scene.totalWords, 1);
    const actionRatio = scene.action / Math.max(scene.totalWords, 1);

    // Weighted intensity score (0-100)
    let intensity = 0;
    intensity += Math.min(exclamationRate * 80, 25);     // Exclamations: up to 25
    intensity += Math.min(shortRate * 50, 20);            // Short sentences: up to 20
    intensity += Math.min(capsRate * 500, 20);            // ALL CAPS: up to 20
    intensity += Math.min(actionRatio * 40, 20);          // Action ratio: up to 20
    intensity += Math.min(dialogueDensity * 0.5 * 30, 15); // Dialogue adds moderate tension

    return Math.min(Math.round(intensity), 100);
}

// ── Scene Composition Bar ──
function CompositionBar({ scene, maxWords }) {
    const total = scene.dialogue + scene.action + scene.other;
    if (total === 0) return null;

    const widthPct = maxWords > 0 ? Math.max((scene.totalWords / maxWords) * 100, 8) : 8;
    const dPct = (scene.dialogue / total) * 100;
    const aPct = (scene.action / total) * 100;
    const oPct = (scene.other / total) * 100;

    // Truncate heading for display
    const shortHeading = scene.heading.length > 30
        ? scene.heading.substring(0, 30) + '...'
        : scene.heading;

    return (
        <div className="pacing-comp-row">
            <span className="pacing-comp-label" title={scene.heading}>{shortHeading}</span>
            <div className="pacing-comp-bar-wrapper" style={{ width: `${widthPct}%` }}>
                <div className="pacing-comp-bar">
                    {dPct > 0 && (
                        <div
                            className="pacing-comp-segment dialogue"
                            style={{ width: `${dPct}%` }}
                            title={`Dialogue: ${scene.dialogue} words`}
                        />
                    )}
                    {aPct > 0 && (
                        <div
                            className="pacing-comp-segment action"
                            style={{ width: `${aPct}%` }}
                            title={`Action: ${scene.action} words`}
                        />
                    )}
                    {oPct > 0 && (
                        <div
                            className="pacing-comp-segment other"
                            style={{ width: `${oPct}%` }}
                            title={`Other: ${scene.other} words`}
                        />
                    )}
                </div>
            </div>
            <span className="pacing-comp-words">{scene.totalWords}w</span>
        </div>
    );
}

// ── SVG Pacing Line Chart ──
function PacingGraph({ scenes, intensities }) {
    if (scenes.length < 2) return null;

    const width = 280;
    const height = 100;
    const padding = { top: 10, right: 10, bottom: 20, left: 10 };
    const graphW = width - padding.left - padding.right;
    const graphH = height - padding.top - padding.bottom;

    const maxIntensity = Math.max(...intensities, 1);
    const points = intensities.map((val, i) => ({
        x: padding.left + (i / (intensities.length - 1)) * graphW,
        y: padding.top + graphH - (val / maxIntensity) * graphH,
    }));

    // Smooth curve through points
    const pathD = points.reduce((acc, point, i) => {
        if (i === 0) return `M ${point.x} ${point.y}`;
        const prev = points[i - 1];
        const cpx = (prev.x + point.x) / 2;
        return acc + ` C ${cpx} ${prev.y}, ${cpx} ${point.y}, ${point.x} ${point.y}`;
    }, '');

    // Area fill
    const areaD = pathD + ` L ${points[points.length - 1].x} ${padding.top + graphH} L ${points[0].x} ${padding.top + graphH} Z`;

    // Act structure lines (25% / 75%)
    const act2Start = padding.left + graphW * 0.25;
    const act3Start = padding.left + graphW * 0.75;

    return (
        <div className="pacing-graph-container">
            <svg viewBox={`0 0 ${width} ${height}`} className="pacing-graph-svg">
                {/* Grid lines */}
                <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top}
                    stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                <line x1={padding.left} y1={padding.top + graphH / 2} x2={width - padding.right} y2={padding.top + graphH / 2}
                    stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                <line x1={padding.left} y1={padding.top + graphH} x2={width - padding.right} y2={padding.top + graphH}
                    stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

                {/* Act structure overlays */}
                <line x1={act2Start} y1={padding.top} x2={act2Start} y2={padding.top + graphH}
                    stroke="rgba(232, 168, 56, 0.3)" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1={act3Start} y1={padding.top} x2={act3Start} y2={padding.top + graphH}
                    stroke="rgba(232, 168, 56, 0.3)" strokeWidth="0.5" strokeDasharray="3,3" />

                {/* Act labels */}
                <text x={padding.left + graphW * 0.125} y={height - 4}
                    fill="rgba(232, 168, 56, 0.5)" fontSize="7" textAnchor="middle">ACT 1</text>
                <text x={padding.left + graphW * 0.5} y={height - 4}
                    fill="rgba(232, 168, 56, 0.5)" fontSize="7" textAnchor="middle">ACT 2</text>
                <text x={padding.left + graphW * 0.875} y={height - 4}
                    fill="rgba(232, 168, 56, 0.5)" fontSize="7" textAnchor="middle">ACT 3</text>

                {/* Area fill */}
                <defs>
                    <linearGradient id="pacingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#e8a838" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#e8a838" stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                <path d={areaD} fill="url(#pacingGradient)" />

                {/* Line */}
                <path d={pathD} fill="none" stroke="#e8a838" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" />

                {/* Data points */}
                {points.map((point, i) => (
                    <circle key={i} cx={point.x} cy={point.y} r="2.5"
                        fill="#e8a838" stroke="#0a0a0f" strokeWidth="1">
                        <title>{scenes[i].heading}: {intensities[i]}% intensity</title>
                    </circle>
                ))}
            </svg>
        </div>
    );
}

export default function PacingAnalysis({ projectId }) {
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);

    const { scenes, intensities, flags, actAnalysis } = useMemo(() => {
        const sceneData = getSceneData(blocks);
        const intensityScores = sceneData.map(s => calculateIntensity(s));

        // Flag slow spots (>80% dialogue with no action, more than 4 blocks)
        const slowSpots = [];
        sceneData.forEach((scene, i) => {
            const total = scene.dialogue + scene.action + scene.other;
            if (total > 0 && scene.blocks.length > 4) {
                const dialogueRatio = scene.dialogue / total;
                if (dialogueRatio > 0.8 && scene.action < 10) {
                    slowSpots.push({ index: i, heading: scene.heading, dialogueRatio });
                }
            }
        });

        // Flag rush spots (sequences of 3+ very short scenes <5 blocks each)
        const rushSpots = [];
        let streak = [];
        sceneData.forEach((scene, i) => {
            if (scene.blocks.length < 5) {
                streak.push({ index: i, heading: scene.heading });
            } else {
                if (streak.length >= 3) {
                    rushSpots.push([...streak]);
                }
                streak = [];
            }
        });
        if (streak.length >= 3) rushSpots.push([...streak]);

        // Act structure analysis
        const totalWords = sceneData.reduce((s, sc) => s + sc.totalWords, 0);
        let runningWords = 0;
        const actBoundaries = { act1End: -1, act2End: -1 };
        sceneData.forEach((scene, i) => {
            runningWords += scene.totalWords;
            const pct = totalWords > 0 ? runningWords / totalWords : 0;
            if (actBoundaries.act1End === -1 && pct >= 0.25) actBoundaries.act1End = i;
            if (actBoundaries.act2End === -1 && pct >= 0.75) actBoundaries.act2End = i;
        });

        // Average intensity per act
        const act1Scenes = sceneData.slice(0, (actBoundaries.act1End || 0) + 1);
        const act2Scenes = sceneData.slice((actBoundaries.act1End || 0) + 1, (actBoundaries.act2End || 0) + 1);
        const act3Scenes = sceneData.slice((actBoundaries.act2End || 0) + 1);

        const avgIntensity = (arr, startIdx) => {
            if (arr.length === 0) return 0;
            return Math.round(arr.reduce((s, _, i) => s + intensityScores[startIdx + i], 0) / arr.length);
        };

        const actAnalysis = {
            act1: { scenes: act1Scenes.length, avgIntensity: avgIntensity(act1Scenes, 0) },
            act2: { scenes: act2Scenes.length, avgIntensity: avgIntensity(act2Scenes, (actBoundaries.act1End || 0) + 1) },
            act3: { scenes: act3Scenes.length, avgIntensity: avgIntensity(act3Scenes, (actBoundaries.act2End || 0) + 1) },
        };

        return {
            scenes: sceneData,
            intensities: intensityScores,
            flags: { slowSpots, rushSpots },
            actAnalysis,
        };
    }, [blocks]);

    const maxWords = Math.max(...scenes.map(s => s.totalWords), 1);

    if (scenes.length === 0) {
        return (
            <div className="pacing-analysis">
                <div className="pacing-header">
                    <Activity size={16} />
                    <span>Pacing Analysis</span>
                </div>
                <div className="pacing-empty">
                    <Activity size={32} />
                    <p>No scenes found yet.<br />Add scene headings to see pacing analysis.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pacing-analysis">
            <div className="pacing-header">
                <Activity size={16} />
                <span>Pacing Analysis</span>
            </div>

            {/* Act Structure Summary */}
            <div className="pacing-acts">
                <div className="pacing-act">
                    <span className="pacing-act-label">Act 1</span>
                    <span className="pacing-act-count">{actAnalysis.act1.scenes} scenes</span>
                    <div className="pacing-act-intensity">
                        <div className="pacing-act-bar" style={{
                            width: `${actAnalysis.act1.avgIntensity}%`,
                            background: '#3b82f6'
                        }} />
                    </div>
                    <span className="pacing-act-pct">{actAnalysis.act1.avgIntensity}%</span>
                </div>
                <div className="pacing-act">
                    <span className="pacing-act-label">Act 2</span>
                    <span className="pacing-act-count">{actAnalysis.act2.scenes} scenes</span>
                    <div className="pacing-act-intensity">
                        <div className="pacing-act-bar" style={{
                            width: `${actAnalysis.act2.avgIntensity}%`,
                            background: '#e8a838'
                        }} />
                    </div>
                    <span className="pacing-act-pct">{actAnalysis.act2.avgIntensity}%</span>
                </div>
                <div className="pacing-act">
                    <span className="pacing-act-label">Act 3</span>
                    <span className="pacing-act-count">{actAnalysis.act3.scenes} scenes</span>
                    <div className="pacing-act-intensity">
                        <div className="pacing-act-bar" style={{
                            width: `${actAnalysis.act3.avgIntensity}%`,
                            background: '#f87171'
                        }} />
                    </div>
                    <span className="pacing-act-pct">{actAnalysis.act3.avgIntensity}%</span>
                </div>
            </div>

            {/* Tension/Intensity Graph */}
            <div className="pacing-section">
                <h4><TrendingUp size={13} /> Tension Graph</h4>
                <PacingGraph scenes={scenes} intensities={intensities} />
            </div>

            {/* Scene Composition */}
            <div className="pacing-section">
                <h4><Activity size={13} /> Scene Composition</h4>
                <div className="pacing-legend">
                    <span className="pacing-legend-item"><span className="pacing-dot dialogue" /> Dialogue</span>
                    <span className="pacing-legend-item"><span className="pacing-dot action" /> Action</span>
                    <span className="pacing-legend-item"><span className="pacing-dot other" /> Other</span>
                </div>
                <div className="pacing-composition">
                    {scenes.map((scene, i) => (
                        <CompositionBar key={i} scene={scene} maxWords={maxWords} />
                    ))}
                </div>
            </div>

            {/* Pacing Flags */}
            {(flags.slowSpots.length > 0 || flags.rushSpots.length > 0) && (
                <div className="pacing-section">
                    <h4><AlertTriangle size={13} /> Pacing Flags</h4>

                    {flags.slowSpots.map((spot, i) => (
                        <div key={`slow-${i}`} className="pacing-flag slow">
                            <Clock size={12} />
                            <div className="pacing-flag-content">
                                <span className="pacing-flag-title">Slow Spot</span>
                                <span className="pacing-flag-detail">
                                    {spot.heading} is {Math.round(spot.dialogueRatio * 100)}% dialogue with minimal action. Consider adding visual beats or movement.
                                </span>
                            </div>
                        </div>
                    ))}

                    {flags.rushSpots.map((streak, i) => (
                        <div key={`rush-${i}`} className="pacing-flag rush">
                            <Zap size={12} />
                            <div className="pacing-flag-content">
                                <span className="pacing-flag-title">Rush Spot</span>
                                <span className="pacing-flag-detail">
                                    {streak.length} consecutive short scenes (scenes {streak[0].index + 1}-{streak[streak.length - 1].index + 1}). This rapid pacing may disorient the audience unless it is intentional for a montage or climax.
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
