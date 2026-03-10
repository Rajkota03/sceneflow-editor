import React, { useRef, useEffect, useCallback, useState } from 'react';
import { X, ChevronUp, ChevronDown, CaseSensitive, Replace, ReplaceAll } from 'lucide-react';
import useUIStore from '../stores/uiStore';
import useEditorStore from '../stores/editorStore';
import '../styles/title-page.css';

export default function FindReplace({ projectId }) {
    const {
        findOpen, setFindOpen,
        findQuery, setFindQuery,
        replaceQuery, setReplaceQuery,
        findMatchCase, toggleFindMatchCase,
    } = useUIStore();

    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);
    const updateBlock = useEditorStore((s) => s.updateBlock);
    const inputRef = useRef(null);
    const [currentMatch, setCurrentMatch] = useState(0);

    // Focus input when opened
    useEffect(() => {
        if (findOpen && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [findOpen]);

    // Global ⌘F shortcut
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault();
                setFindOpen(true);
            }
            if (e.key === 'Escape' && findOpen) {
                setFindOpen(false);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [findOpen, setFindOpen]);

    // Count matches
    const matches = useCallback(() => {
        if (!findQuery) return [];
        const results = [];
        const flags = findMatchCase ? 'g' : 'gi';
        const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

        blocks.forEach((block) => {
            let match;
            while ((match = regex.exec(block.text)) !== null) {
                results.push({
                    blockId: block.id,
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                });
            }
        });
        return results;
    }, [blocks, findQuery, findMatchCase]);

    const allMatches = matches();
    const matchCount = allMatches.length;

    const handleNext = () => {
        setCurrentMatch((prev) => (prev + 1) % Math.max(1, matchCount));
    };

    const handlePrev = () => {
        setCurrentMatch((prev) => (prev - 1 + matchCount) % Math.max(1, matchCount));
    };

    const handleReplace = () => {
        if (matchCount === 0) return;
        const match = allMatches[currentMatch];
        if (!match) return;

        const block = blocks.find((b) => b.id === match.blockId);
        if (!block) return;

        const newText = block.text.substring(0, match.start) + replaceQuery + block.text.substring(match.end);
        updateBlock(projectId, match.blockId, { text: newText });
    };

    const handleReplaceAll = () => {
        if (matchCount === 0 || !findQuery) return;

        const flags = findMatchCase ? 'g' : 'gi';
        const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

        blocks.forEach((block) => {
            if (regex.test(block.text)) {
                const newText = block.text.replace(regex, replaceQuery);
                updateBlock(projectId, block.id, { text: newText });
            }
        });
        setCurrentMatch(0);
    };

    if (!findOpen) return null;

    return (
        <div className="find-replace-bar">
            <div className="find-replace-row">
                <input
                    ref={inputRef}
                    className="find-replace-input"
                    value={findQuery}
                    onChange={(e) => { setFindQuery(e.target.value); setCurrentMatch(0); }}
                    placeholder="Find..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleNext();
                        if (e.key === 'Escape') setFindOpen(false);
                    }}
                />
                <span className="find-replace-count">
                    {matchCount > 0 ? `${currentMatch + 1}/${matchCount}` : '0'}
                </span>
                <button className="find-replace-btn" onClick={handlePrev} title="Previous">
                    <ChevronUp size={14} />
                </button>
                <button className="find-replace-btn" onClick={handleNext} title="Next">
                    <ChevronDown size={14} />
                </button>
                <button
                    className={`find-replace-btn ${findMatchCase ? 'active' : ''}`}
                    onClick={toggleFindMatchCase}
                    title="Match case"
                >
                    <CaseSensitive size={14} />
                </button>
                <button className="find-replace-close" onClick={() => setFindOpen(false)}>
                    <X size={14} />
                </button>
            </div>
            <div className="find-replace-row">
                <input
                    className="find-replace-input"
                    value={replaceQuery}
                    onChange={(e) => setReplaceQuery(e.target.value)}
                    placeholder="Replace..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleReplace();
                    }}
                />
                <button className="find-replace-btn" onClick={handleReplace} title="Replace">
                    Replace
                </button>
                <button className="find-replace-btn" onClick={handleReplaceAll} title="Replace All">
                    All
                </button>
            </div>
        </div>
    );
}
