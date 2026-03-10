import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Play,
    Pause,
    RotateCcw,
    Trophy,
    Flame,
    Target,
    Timer,
    X,
    ChevronDown,
} from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import '../styles/sprint.css';

const PRESETS = [
    { label: '15 min', minutes: 15, words: 300 },
    { label: '25 min', minutes: 25, words: 500 },
    { label: '45 min', minutes: 45, words: 900 },
    { label: '60 min', minutes: 60, words: 1200 },
];

export default function WritingSprint({ projectId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState(1); // 25 min default
    const [timeLeft, setTimeLeft] = useState(PRESETS[1].minutes * 60);
    const [totalTime, setTotalTime] = useState(PRESETS[1].minutes * 60);
    const [wordGoal, setWordGoal] = useState(PRESETS[1].words);
    const [startWordCount, setStartWordCount] = useState(0);
    const [wordsWritten, setWordsWritten] = useState(0);
    const [todaySprints, setTodaySprints] = useState([]);
    const [showPresets, setShowPresets] = useState(false);

    const intervalRef = useRef(null);
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);

    // Calculate current word count
    const currentWordCount = blocks.reduce((sum, b) => {
        return sum + (b.text?.split(/\s+/).filter(Boolean).length || 0);
    }, 0);

    // Track words during sprint
    useEffect(() => {
        if (isRunning && !isPaused) {
            setWordsWritten(Math.max(0, currentWordCount - startWordCount));
        }
    }, [currentWordCount, isRunning, isPaused, startWordCount]);

    // Timer countdown
    useEffect(() => {
        if (isRunning && !isPaused && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current);
                        handleComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => clearInterval(intervalRef.current);
    }, [isRunning, isPaused]);

    const handleComplete = useCallback(() => {
        setIsRunning(false);
        setIsPaused(false);
        setIsComplete(true);
        const sprint = {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            words: Math.max(0, currentWordCount - startWordCount),
            duration: totalTime - timeLeft,
            goalMet: (currentWordCount - startWordCount) >= wordGoal,
        };
        setTodaySprints((prev) => [...prev, sprint]);
    }, [currentWordCount, startWordCount, totalTime, timeLeft, wordGoal]);

    const startSprint = () => {
        const preset = PRESETS[selectedPreset];
        setTimeLeft(preset.minutes * 60);
        setTotalTime(preset.minutes * 60);
        setWordGoal(preset.words);
        setStartWordCount(currentWordCount);
        setWordsWritten(0);
        setIsRunning(true);
        setIsPaused(false);
        setIsComplete(false);
        setShowPresets(false);
    };

    const togglePause = () => setIsPaused(!isPaused);

    const resetSprint = () => {
        clearInterval(intervalRef.current);
        setIsRunning(false);
        setIsPaused(false);
        setIsComplete(false);
        setTimeLeft(PRESETS[selectedPreset].minutes * 60);
        setWordsWritten(0);
    };

    const selectPreset = (idx) => {
        setSelectedPreset(idx);
        setTimeLeft(PRESETS[idx].minutes * 60);
        setTotalTime(PRESETS[idx].minutes * 60);
        setWordGoal(PRESETS[idx].words);
        setShowPresets(false);
    };

    // Format time
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const progress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;
    const wordProgress = wordGoal > 0 ? Math.min(wordsWritten / wordGoal, 1) : 0;

    // Ring dimensions
    const ringSize = 130;
    const strokeWidth = 6;
    const radius = (ringSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress);

    const totalWordsToday = todaySprints.reduce((s, sp) => s + sp.words, 0);

    // Floating button when not open
    if (!isOpen) {
        return (
            <button
                className={`sprint-fab ${isRunning ? 'sprint-fab--active' : ''}`}
                onClick={() => setIsOpen(true)}
                title="Writing Sprint"
            >
                {isRunning ? (
                    <>
                        <Timer size={18} />
                        <span className="sprint-fab-time">
                            {mins}:{secs.toString().padStart(2, '0')}
                        </span>
                    </>
                ) : (
                    <Flame size={20} />
                )}
            </button>
        );
    }

    return (
        <div className={`sprint-panel ${isComplete ? 'sprint-panel--complete' : ''}`}>
            {/* Header */}
            <div className="sprint-header">
                <div className="sprint-title">
                    <Flame size={16} />
                    <span>Writing Sprint</span>
                </div>
                <button className="sprint-close" onClick={() => setIsOpen(false)}>
                    <X size={14} />
                </button>
            </div>

            {/* Complete celebration */}
            {isComplete && (
                <div className="sprint-celebration">
                    <div className="sprint-celebration-icon">
                        <Trophy size={32} />
                    </div>
                    <h3>Sprint Complete!</h3>
                    <p>{wordsWritten} words written</p>
                    {wordsWritten >= wordGoal && (
                        <span className="sprint-goal-badge">🎯 Goal reached!</span>
                    )}
                    <button className="sprint-btn sprint-btn--primary" onClick={startSprint}>
                        <Play size={14} /> New Sprint
                    </button>
                </div>
            )}

            {/* Timer display */}
            {!isComplete && (
                <>
                    <div className="sprint-timer">
                        <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
                            <circle
                                cx={ringSize / 2} cy={ringSize / 2} r={radius}
                                fill="none"
                                stroke="rgba(255,255,255,0.04)"
                                strokeWidth={strokeWidth}
                            />
                            <circle
                                cx={ringSize / 2} cy={ringSize / 2} r={radius}
                                fill="none"
                                stroke={isRunning ? (isPaused ? '#f97316' : '#7c3aed') : 'rgba(255,255,255,0.1)'}
                                strokeWidth={strokeWidth}
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                strokeLinecap="round"
                                transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                            />
                        </svg>
                        <div className="sprint-timer-display">
                            <span className="sprint-time">
                                {mins}:{secs.toString().padStart(2, '0')}
                            </span>
                            <span className="sprint-time-label">
                                {isRunning ? (isPaused ? 'Paused' : 'Writing…') : 'Ready'}
                            </span>
                        </div>
                    </div>

                    {/* Word progress */}
                    {isRunning && (
                        <div className="sprint-word-progress">
                            <div className="sprint-word-label">
                                <Target size={12} />
                                <span>{wordsWritten} / {wordGoal} words</span>
                            </div>
                            <div className="sprint-word-track">
                                <div
                                    className="sprint-word-fill"
                                    style={{ width: `${wordProgress * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Preset selector */}
                    {!isRunning && (
                        <div className="sprint-preset-area">
                            <button
                                className="sprint-preset-toggle"
                                onClick={() => setShowPresets(!showPresets)}
                            >
                                {PRESETS[selectedPreset].label} · {PRESETS[selectedPreset].words} words
                                <ChevronDown size={12} />
                            </button>
                            {showPresets && (
                                <div className="sprint-presets">
                                    {PRESETS.map((p, i) => (
                                        <button
                                            key={i}
                                            className={`sprint-preset ${selectedPreset === i ? 'active' : ''}`}
                                            onClick={() => selectPreset(i)}
                                        >
                                            <span>{p.label}</span>
                                            <span className="sprint-preset-words">{p.words} words</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Controls */}
                    <div className="sprint-controls">
                        {!isRunning ? (
                            <button className="sprint-btn sprint-btn--primary" onClick={startSprint}>
                                <Play size={14} /> Start Sprint
                            </button>
                        ) : (
                            <>
                                <button className="sprint-btn sprint-btn--secondary" onClick={togglePause}>
                                    {isPaused ? <Play size={14} /> : <Pause size={14} />}
                                    {isPaused ? 'Resume' : 'Pause'}
                                </button>
                                <button className="sprint-btn sprint-btn--ghost" onClick={resetSprint}>
                                    <RotateCcw size={14} />
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Today's sprints */}
            {todaySprints.length > 0 && (
                <div className="sprint-history">
                    <div className="sprint-history-header">
                        <span>Today's sprints</span>
                        <span className="sprint-history-total">{totalWordsToday} words</span>
                    </div>
                    {todaySprints.map((sp, i) => (
                        <div key={i} className="sprint-history-item">
                            <span className="sprint-history-time">{sp.time}</span>
                            <span>{sp.words} words</span>
                            {sp.goalMet && <Trophy size={11} className="sprint-history-trophy" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
