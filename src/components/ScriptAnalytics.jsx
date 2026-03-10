import React, { useMemo } from 'react';
import {
    BarChart3,
    FileText,
    Type,
    Users,
    MessageSquare,
    Zap,
    Clock,
    Flame,
    TrendingUp,
    Sun,
    Moon,
} from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import '../styles/analytics.css';

// ── SVG Ring Chart ──
function RingChart({ value, max, size = 80, strokeWidth = 6, color = '#7c3aed', label, subLabel }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(value / max, 1);
    const dashOffset = circumference * (1 - progress);

    return (
        <div className="ring-chart">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                />
            </svg>
            <div className="ring-chart-label">
                <span className="ring-value">{value}</span>
                <span className="ring-sub">{label}</span>
            </div>
        </div>
    );
}

// ── Horizontal Bar ──
function HBar({ label, value, max, color }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="hbar">
            <div className="hbar-label">
                <span>{label}</span>
                <span className="hbar-value">{value}</span>
            </div>
            <div className="hbar-track">
                <div
                    className="hbar-fill"
                    style={{ width: `${pct}%`, background: color }}
                />
            </div>
        </div>
    );
}

// ── Donut Chart ──
function DonutChart({ data, size = 90 }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
        <div className="donut-chart">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {data.map((d, i) => {
                    const pct = total > 0 ? d.value / total : 0;
                    const dashLen = circumference * pct;
                    const dashOff = circumference * offset;
                    offset += pct;
                    return (
                        <circle
                            key={i}
                            cx={size / 2} cy={size / 2} r={radius}
                            fill="none"
                            stroke={d.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                            strokeDashoffset={-dashOff}
                            transform={`rotate(-90 ${size / 2} ${size / 2})`}
                            style={{ transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease' }}
                        />
                    );
                })}
            </svg>
            <div className="donut-labels">
                {data.map((d, i) => (
                    <div key={i} className="donut-label">
                        <span className="donut-dot" style={{ background: d.color }} />
                        <span>{d.label}</span>
                        <span className="donut-pct">
                            {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Main Analytics ──
export default function ScriptAnalytics({ projectId }) {
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);

    const stats = useMemo(() => {
        const wordCount = blocks.reduce((sum, b) => {
            return sum + (b.text?.split(/\s+/).filter(Boolean).length || 0);
        }, 0);

        const pageCount = Math.max(1, Math.round(wordCount / 250));

        const dialogueBlocks = blocks.filter(b => b.type === 'dialogue').length;
        const actionBlocks = blocks.filter(b => b.type === 'action').length;
        const sceneCount = blocks.filter(b => b.type === 'scene-heading').length;

        // Character screentime
        const charMap = {};
        let currentChar = null;
        blocks.forEach(b => {
            if (b.type === 'character') {
                currentChar = (b.text || '').trim().toUpperCase().replace(/\s*\(.*\)$/, '');
                if (currentChar) {
                    charMap[currentChar] = (charMap[currentChar] || 0);
                }
            } else if (b.type === 'dialogue' && currentChar) {
                const words = (b.text || '').split(/\s+/).filter(Boolean).length;
                charMap[currentChar] = (charMap[currentChar] || 0) + words;
            } else if (b.type === 'scene-heading' || b.type === 'action') {
                currentChar = null;
            }
        });

        const characters = Object.entries(charMap)
            .map(([name, words]) => ({ name, words }))
            .sort((a, b) => b.words - a.words)
            .slice(0, 8);

        const maxCharWords = characters.length > 0 ? characters[0].words : 1;

        // Day/Night distribution
        let dayCount = 0;
        let nightCount = 0;
        let otherTime = 0;
        blocks.filter(b => b.type === 'scene-heading').forEach(b => {
            const text = (b.text || '').toUpperCase();
            if (text.includes('DAY')) dayCount++;
            else if (text.includes('NIGHT')) nightCount++;
            else otherTime++;
        });

        // Scene length distribution (blocks per scene)
        const sceneLengths = [];
        let currentSceneLen = 0;
        blocks.forEach(b => {
            if (b.type === 'scene-heading') {
                if (currentSceneLen > 0) sceneLengths.push(currentSceneLen);
                currentSceneLen = 0;
            }
            currentSceneLen++;
        });
        if (currentSceneLen > 0) sceneLengths.push(currentSceneLen);

        const avgSceneLen = sceneLengths.length > 0
            ? Math.round(sceneLengths.reduce((a, b) => a + b, 0) / sceneLengths.length)
            : 0;

        // Estimated runtime (1 page ≈ 1 minute)
        const estRuntime = pageCount;

        return {
            wordCount,
            pageCount,
            dialogueBlocks,
            actionBlocks,
            sceneCount,
            characters,
            maxCharWords,
            dayCount,
            nightCount,
            otherTime,
            sceneLengths,
            avgSceneLen,
            estRuntime,
        };
    }, [blocks]);

    const charColors = ['#8b5cf6', '#6366f1', '#3b82f6', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#ec4899'];

    return (
        <div className="analytics">
            <div className="analytics-header">
                <BarChart3 size={16} />
                <span>Script Analytics</span>
            </div>

            {/* Top stats row */}
            <div className="analytics-rings">
                <RingChart
                    value={stats.pageCount}
                    max={120}
                    color="#7c3aed"
                    label="pages"
                    size={72}
                    strokeWidth={5}
                />
                <RingChart
                    value={stats.wordCount}
                    max={30000}
                    color="#3b82f6"
                    label="words"
                    size={72}
                    strokeWidth={5}
                />
                <RingChart
                    value={stats.sceneCount}
                    max={60}
                    color="#22c55e"
                    label="scenes"
                    size={72}
                    strokeWidth={5}
                />
            </div>

            {/* Runtime estimate */}
            <div className="analytics-stat-row">
                <Clock size={13} />
                <span>Est. runtime</span>
                <span className="stat-value">{stats.estRuntime} min</span>
            </div>
            <div className="analytics-stat-row">
                <TrendingUp size={13} />
                <span>Avg scene length</span>
                <span className="stat-value">{stats.avgSceneLen} blocks</span>
            </div>

            {/* Dialogue vs Action */}
            <div className="analytics-section">
                <h4><MessageSquare size={13} /> Dialogue vs Action</h4>
                <DonutChart
                    data={[
                        { label: 'Dialogue', value: stats.dialogueBlocks, color: '#8b5cf6' },
                        { label: 'Action', value: stats.actionBlocks, color: '#3b82f6' },
                    ]}
                    size={80}
                />
            </div>

            {/* Day/Night */}
            <div className="analytics-section">
                <h4><Sun size={13} /> Day / Night</h4>
                <DonutChart
                    data={[
                        { label: 'Day', value: stats.dayCount, color: '#eab308' },
                        { label: 'Night', value: stats.nightCount, color: '#6366f1' },
                        { label: 'Other', value: stats.otherTime, color: '#64748b' },
                    ]}
                    size={80}
                />
            </div>

            {/* Character Screentime */}
            {stats.characters.length > 0 && (
                <div className="analytics-section">
                    <h4><Users size={13} /> Character Dialogue (words)</h4>
                    <div className="analytics-bars">
                        {stats.characters.map((c, i) => (
                            <HBar
                                key={c.name}
                                label={c.name}
                                value={c.words}
                                max={stats.maxCharWords}
                                color={charColors[i % charColors.length]}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
