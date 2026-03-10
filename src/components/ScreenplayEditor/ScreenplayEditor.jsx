import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import useEditorStore from '../../stores/editorStore';
import useProjectStore from '../../stores/projectStore';
import useUIStore from '../../stores/uiStore';
import BeatTagMargin from '../BeatTagMargin';
import '../../styles/screenplay-editor.css';
import '../../styles/title-page.css';

const BLOCK_TYPES = {
    'scene-heading': { label: 'Scene Heading', placeholder: 'INT./EXT. LOCATION - TIME' },
    'action': { label: 'Action', placeholder: 'Describe the action...' },
    'character': { label: 'Character', placeholder: 'CHARACTER NAME' },
    'dialogue': { label: 'Dialogue', placeholder: 'Dialogue...' },
    'parenthetical': { label: 'Paren.', placeholder: 'wryly' },
    'transition': { label: 'Transition', placeholder: 'CUT TO:' },
};

const ENTER_FLOW = {
    'scene-heading': 'action',
    'action': 'action',
    'character': 'dialogue',
    'parenthetical': 'dialogue',
    'dialogue': 'action',
    'transition': 'scene-heading',
};

const SHORTCUT_MAP = {
    1: 'scene-heading',
    2: 'action',
    3: 'character',
    4: 'parenthetical',
    5: 'dialogue',
    6: 'transition',
};

const SLUGLINE_SUGGESTIONS = ['INT. ', 'EXT. ', 'INT./EXT. '];
const TRANSITION_SUGGESTIONS = ['CUT TO:', 'FADE TO:', 'SMASH CUT:', 'DISSOLVE TO:', 'MATCH CUT:', 'FADE OUT.'];

// Context buttons for floating toolbar
const CONTEXT_BUTTONS = {
    'scene-heading': [
        { label: 'INT.', value: 'INT. ' },
        { label: 'EXT.', value: 'EXT. ' },
        { label: 'INT./EXT.', value: 'INT./EXT. ' },
        { label: '- DAY', value: ' - DAY' },
        { label: '- NIGHT', value: ' - NIGHT' },
    ],
    'character': [
        { label: '(V.O.)', value: ' (V.O.)' },
        { label: '(O.S.)', value: ' (O.S.)' },
        { label: '(CONT\'D)', value: ' (CONT\'D)' },
    ],
    'dialogue': [
        { label: '→ Paren', shortcut: '⌘4', action: 'parenthetical' },
        { label: '→ Action', shortcut: '⌘2', action: 'action' },
    ],
    'transition': [
        { label: 'CUT TO:', value: 'CUT TO:' },
        { label: 'FADE TO:', value: 'FADE TO:' },
        { label: 'SMASH CUT:', value: 'SMASH CUT:' },
    ],
};

// ~55 lines per page at 12pt, each block is roughly 1–3 lines
const LINES_PER_PAGE = 55;

function getSuggestionsForText(text, type, blocks = []) {
    if (type === 'scene-heading' && text.length < 5) {
        return SLUGLINE_SUGGESTIONS.filter(s =>
            s.toLowerCase().startsWith(text.toLowerCase()) || text.length === 0
        );
    }
    if (type === 'transition' && text.length < 4) {
        return TRANSITION_SUGGESTIONS.filter(s =>
            s.toLowerCase().startsWith(text.toLowerCase()) || text.length === 0
        );
    }
    // SmartType: auto-complete character names
    if (type === 'character' && text.length >= 1) {
        const names = [...new Set(
            blocks
                .filter(b => b.type === 'character' && b.text.trim())
                .map(b => b.text.trim().toUpperCase())
        )].filter(n => n.startsWith(text.toUpperCase()) && n !== text.toUpperCase());
        return names.slice(0, 5);
    }
    // SmartType: auto-complete locations from scene headings
    if (type === 'scene-heading' && text.length >= 5) {
        const locations = [...new Set(
            blocks
                .filter(b => b.type === 'scene-heading' && b.text.trim())
                .map(b => b.text.trim().toUpperCase())
        )].filter(l => l.startsWith(text.toUpperCase()) && l !== text.toUpperCase());
        return locations.slice(0, 5);
    }
    return [];
}

function placeCaretAtEnd(el) {
    el.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    if (el.childNodes.length > 0) {
        range.selectNodeContents(el);
        range.collapse(false);
    } else {
        range.setStart(el, 0);
        range.collapse(true);
    }
    sel.removeAllRanges();
    sel.addRange(range);
}

function estimateBlockLines(block) {
    const text = block.text || '';
    if (text.length === 0) return 1;

    // Approximate characters per line based on block type & Courier 12pt
    // At 12pt Courier, ~72 chars fit in the full width (6" writing area)
    let charsPerLine;
    switch (block.type) {
        case 'scene-heading': charsPerLine = 60; break;    // full width
        case 'action': charsPerLine = 60; break;            // full width
        case 'character': charsPerLine = 30; break;          // shorter area
        case 'dialogue': charsPerLine = 35; break;           // 3.5" width
        case 'parenthetical': charsPerLine = 25; break;      // narrow
        case 'transition': charsPerLine = 60; break;         // full width
        default: charsPerLine = 60;
    }

    const lines = Math.ceil(text.length / charsPerLine);

    // Add spacing (top margin contributes to line count)
    let spacingLines = 0;
    if (block.type === 'scene-heading') spacingLines = 2; // double-space before
    else if (block.type === 'character') spacingLines = 1;
    else if (block.type === 'action') spacingLines = 1;
    else if (block.type === 'transition') spacingLines = 1;

    return lines + spacingLines;
}

function paginateBlocks(blocks) {
    const pages = [];
    let currentPage = [];
    let currentLineCount = 0;

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const blockLines = estimateBlockLines(block);

        if (currentLineCount + blockLines > LINES_PER_PAGE && currentPage.length > 0) {
            // Start a new page
            pages.push(currentPage);
            currentPage = [];
            currentLineCount = 0;
        }

        currentPage.push(block);
        currentLineCount += blockLines;
    }

    if (currentPage.length > 0) {
        pages.push(currentPage);
    }

    return pages.length > 0 ? pages : [[]];
}

// ── Floating Toolbar Component ──
function FloatingToolbar({ blockType, blockRef, onInsertText, onChangeType }) {
    const buttons = CONTEXT_BUTTONS[blockType];
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const toolbarRef = useRef(null);

    useEffect(() => {
        if (blockRef?.current) {
            const rect = blockRef.current.getBoundingClientRect();
            setPosition({
                top: rect.top - 40,
                left: rect.left,
            });
        }
    }, [blockRef]);

    if (!buttons || buttons.length === 0) return null;

    return (
        <div
            ref={toolbarRef}
            className="floating-toolbar"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
            }}
        >
            {buttons.map((btn) => (
                <button
                    key={btn.label}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        if (btn.action) {
                            onChangeType(btn.action);
                        } else if (btn.value) {
                            onInsertText(btn.value);
                        }
                    }}
                >
                    {btn.label}
                </button>
            ))}
        </div>
    );
}

// ── Editor Block Component ──
export function EditorBlock({ block, projectId, isActive, onFocus, onToolbarContext, isChanged, contdMarker, tunedCharacter }) {
    const ref = useRef(null);
    const { updateBlockText, updateBlockType, insertBlockAfter, deleteBlock } = useEditorStore();
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedSuggestion, setHighlightedSuggestion] = useState(0);

    const typeInfo = BLOCK_TYPES[block.type];

    // Sync text from state ONLY if it differs from the DOM (e.g. from Undo/Redo or Initial Load)
    // This prevents the browser's cursor from resetting to position 0 on every typing re-render
    useEffect(() => {
        if (ref.current && ref.current.textContent !== block.text) {
            ref.current.textContent = block.text;
        }
    }, [block.text]);

    // Focus management
    useEffect(() => {
        if (isActive && ref.current && document.activeElement !== ref.current) {
            placeCaretAtEnd(ref.current);
        }
    }, [isActive]);

    // Report ref for toolbar positioning
    useEffect(() => {
        if (isActive && ref.current) {
            onToolbarContext(block.type, ref);
        }
    }, [isActive, block.type, onToolbarContext]); // Added onToolbarContext to dependency array

    const applySuggestion = useCallback((suggestion) => {
        updateBlockText(projectId, block.id, suggestion);
        if (ref.current) {
            ref.current.textContent = suggestion;
            placeCaretAtEnd(ref.current);
        }
        setShowSuggestions(false);
    }, [projectId, block.id, updateBlockText]);

    const insertTextAtCursor = useCallback((text) => {
        const currentText = ref.current?.textContent || '';
        const sel = window.getSelection();
        const offset = sel?.anchorOffset || currentText.length;
        const newText = currentText.slice(0, offset) + text + currentText.slice(offset);
        updateBlockText(projectId, block.id, newText);
        if (ref.current) {
            ref.current.textContent = newText;
            // Place cursor after inserted text
            const range = document.createRange();
            if (ref.current.firstChild) {
                range.setStart(ref.current.firstChild, offset + text.length);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }, [projectId, block.id, updateBlockText]);

    const handleInput = useCallback(() => {
        const text = ref.current?.textContent || '';
        updateBlockText(projectId, block.id, text);
        const allBlocks = useEditorStore.getState().blocksByProject[projectId] || [];
        const suggestions = getSuggestionsForText(text, block.type, allBlocks);
        setShowSuggestions(suggestions.length > 0);
        setHighlightedSuggestion(0);
    }, [projectId, block.id, block.type, updateBlockText]);

    const handleKeyDown = useCallback((e) => {
        const isMod = e.metaKey || e.ctrlKey;

        if (isMod && SHORTCUT_MAP[e.key]) {
            e.preventDefault();
            const newType = SHORTCUT_MAP[e.key];
            const text = ref.current?.textContent || '';
            if (text.trim() === '') {
                updateBlockType(projectId, block.id, newType);
            } else {
                insertBlockAfter(projectId, block.id, newType);
            }
            return;
        }

        if (showSuggestions) {
            const text = ref.current?.textContent || '';
            const allBlocks2 = useEditorStore.getState().blocksByProject[projectId] || [];
            const suggestions = getSuggestionsForText(text, block.type, allBlocks2);
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedSuggestion((p) => Math.min(p + 1, suggestions.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedSuggestion((p) => Math.max(p - 1, 0));
                return;
            }
            if (e.key === 'Tab' || (e.key === 'Enter' && suggestions.length > 0 && (text.length < 3))) {
                e.preventDefault();
                applySuggestion(suggestions[highlightedSuggestion]);
                return;
            }
            if (e.key === 'Escape') {
                setShowSuggestions(false);
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const nextType = ENTER_FLOW[block.type] || 'action';
            insertBlockAfter(projectId, block.id, nextType);
            return;
        }

        if (e.key === 'Backspace') {
            const text = ref.current?.textContent || '';
            if (text === '') {
                e.preventDefault();
                deleteBlock(projectId, block.id);
                return;
            }
        }

        if (e.key === 'ArrowUp') {
            const sel = window.getSelection();
            if (sel.anchorOffset === 0) {
                e.preventDefault();
                const prev = ref.current?.closest('.editor-block-wrapper')?.previousElementSibling;
                if (prev) {
                    const el = prev.querySelector('[contenteditable]');
                    if (el) placeCaretAtEnd(el);
                }
            }
        }
        if (e.key === 'ArrowDown') {
            const sel = window.getSelection();
            const text = ref.current?.textContent || '';
            if (sel.anchorOffset >= text.length) {
                e.preventDefault();
                const next = ref.current?.closest('.editor-block-wrapper')?.nextElementSibling;
                if (next) {
                    const el = next.querySelector('[contenteditable]');
                    if (el) {
                        el.focus();
                        const range = document.createRange();
                        range.setStart(el, 0);
                        range.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                }
            }
        }
    }, [showSuggestions, highlightedSuggestion, block.type, block.id, projectId, applySuggestion, updateBlockType, insertBlockAfter, deleteBlock]);

    const handleFocus = useCallback(() => {
        onFocus(block.id);
        const text = ref.current?.textContent || '';
        const allBlocks = useEditorStore.getState().blocksByProject[projectId] || [];
        const suggestions = getSuggestionsForText(text, block.type, allBlocks);
        setShowSuggestions(suggestions.length > 0);
    }, [block.id, block.type, onFocus, projectId]);

    const handleBlur = useCallback(() => {
        setTimeout(() => setShowSuggestions(false), 200);
    }, []);

    const currentText = ref.current?.textContent || block.text;
    const allBlocksRef = useEditorStore.getState().blocksByProject[projectId] || [];
    const currentSuggestions = getSuggestionsForText(currentText, block.type, allBlocksRef);

    // Determine if this block should be faded out during Dialogue Tuning
    let isTunedOut = false;
    if (tunedCharacter) {
        if (block.type === 'character' && block.text.trim().toUpperCase() !== tunedCharacter) {
            isTunedOut = true;
        } else if (block.type !== 'character' && block.type !== 'dialogue') {
            isTunedOut = true;
        }
        // To precisely fade out dialogue of OTHER characters, we rely on the parent CSS logic,
        // or we could track the "current speaker" down to the block level.
        // For simplicity, we add a class `tuned-out` which can be refined in CSS.
    }

    return (
        <div className="editor-block-wrapper" style={{ position: 'relative' }}>
            <div
                ref={ref}
                className={`editor-block block-${block.type} ${isActive ? 'active' : ''} ${isChanged ? 'revised-block' : ''} ${isTunedOut ? 'tuned-out' : ''}`}
                contentEditable
                suppressContentEditableWarning
                data-placeholder={typeInfo.placeholder}
                data-block-id={block.id}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                spellCheck={true}
            />
            {contdMarker && block.type === 'character' && (
                <span className="contd-marker-character"> {contdMarker}</span>
            )}
            {contdMarker && block.type === 'dialogue' && (
                <div className="contd-marker-dialogue">{contdMarker}</div>
            )}
            {isActive && (
                <span className="block-type-label" style={{ opacity: 1 }}>
                    {typeInfo.label}
                </span>
            )}
            {block.type === 'scene-heading' && (
                <BeatTagMargin projectId={projectId} sceneId={block.id} />
            )}
            {showSuggestions && currentSuggestions.length > 0 && isActive && (
                <div className="suggestion-dropdown">
                    {currentSuggestions.map((s, i) => (
                        <button
                            key={s}
                            className={`suggestion-item ${i === highlightedSuggestion ? 'highlighted' : ''}`}
                            onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Helper function for revision mode
function isBlockChanged(block, latestSnapshot) {
    if (!latestSnapshot) return false;
    const snapshotBlock = latestSnapshot.blocks.find(b => b.id === block.id);
    return !snapshotBlock || snapshotBlock.text !== block.text;
}

// ── Main Screenplay Editor ──
export default function ScreenplayEditor({ projectId }) {
    const { getBlocks, setActiveBlock, activeBlockId, insertBlockAfter, updateBlockType } = useEditorStore();
    const { focusMode, showSceneNumbers, showTitlePage, readThroughMode, revisionMode, typewriterMode, dialogueTunerCharacter } = useUIStore();
    const { setTitlePageModalOpen } = useUIStore();
    const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
    const blocks = getBlocks(projectId);
    const snapshots = useEditorStore(s => s._snapshots?.[projectId] || []);
    const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

    const [toolbarCtx, setToolbarCtx] = useState({ type: null, ref: null });

    const pages = useMemo(() => paginateBlocks(blocks), [blocks]);

    // Track scene numbers
    const sceneNumbers = useMemo(() => {
        const map = {};
        let num = 0;
        blocks.forEach((b) => {
            if (b.type === 'scene-heading') {
                num++;
                map[b.id] = num;
            }
        });
        return map;
    }, [blocks]);

    // Compute CONT'D and MORE markers
    const contdMarkers = useMemo(() => {
        const map = {};
        let lastChar = null;

        pages.forEach((pageBlocks, pageIndex) => {
            pageBlocks.forEach((block, idx) => {
                if (block.type === 'character') {
                    const charName = block.text.trim().toUpperCase();
                    // Character regex to strip out existing (V.O.) etc
                    const baseChar = charName.replace(/\s*\(.*\)\s*/, '').trim();
                    if (baseChar && baseChar === lastChar) {
                        map[block.id] = "(CONT'D)";
                    } else if (baseChar) {
                        lastChar = baseChar;
                    }
                } else if (block.type === 'scene-heading' || block.type === 'transition') {
                    lastChar = null; // reset speaking character on new scene or transition
                }

                // (MORE) marker at bottom of page
                if (block.type === 'dialogue' && idx === pageBlocks.length - 1) {
                    const nextPage = pages[pageIndex + 1];
                    if (nextPage && nextPage[0] && (nextPage[0].type === 'dialogue' || nextPage[0].type === 'character')) {
                        map[block.id] = "(MORE)";
                    }
                }
            });
        });
        return map;
    }, [pages]);

    // Read-Through mode auto-scroll
    useEffect(() => {
        if (!readThroughMode) return;

        let animationFrameId;
        const scrollStep = () => {
            const container = document.getElementById('screenplay-canvas');
            if (container) container.scrollBy(0, 1);
            animationFrameId = requestAnimationFrame(scrollStep);
        };

        animationFrameId = requestAnimationFrame(scrollStep);
        return () => cancelAnimationFrame(animationFrameId);
    }, [readThroughMode]);

    // Typewriter Mode auto-centering
    useEffect(() => {
        if (!typewriterMode || !activeBlockId) return;

        // Debounce slightly to allow rendering to catch up
        const timeoutId = setTimeout(() => {
            const activeEl = document.querySelector(`[data-block-id="${activeBlockId}"]`);
            const container = document.getElementById('screenplay-canvas');

            if (activeEl && container) {
                // Determine vertical center of the container
                const containerCenter = container.clientHeight / 2;
                // Get element's actual top relative to the scrolling container content
                // offsetTop is usually relative to the closest positioned ancestor, 
                // but for our flat structure inside `screenplay-page`, we need its absolute position within the scroll area

                const elementRect = activeEl.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();

                // Calculate how much we need to scroll to put the element in the center
                const offset = (elementRect.top - containerRect.top) - containerCenter + (elementRect.height / 2);

                container.scrollBy({
                    top: offset,
                    behavior: 'smooth'
                });
            }
        }, 50);

        return () => clearTimeout(timeoutId);
    }, [typewriterMode, activeBlockId, blocks]); // Add blocks dependency so it recenters on typing new lines

    const handleBlockFocus = useCallback((blockId) => {
        setActiveBlock(blockId);
    }, [setActiveBlock]);

    const handleToolbarContext = useCallback((type, ref) => {
        setToolbarCtx({ type, ref });
    }, []);

    const handleToolbarInsert = useCallback((text) => {
        const activeEl = document.querySelector(`[data-block-id="${activeBlockId}"]`);
        if (activeEl) {
            const currentText = activeEl.textContent || '';
            const sel = window.getSelection();
            const offset = sel?.anchorOffset || currentText.length;
            const newText = currentText.slice(0, offset) + text + currentText.slice(offset);
            activeEl.textContent = newText;
            useEditorStore.getState().updateBlockText(projectId, activeBlockId, newText);
            placeCaretAtEnd(activeEl);
        }
    }, [activeBlockId, projectId]);

    const handleToolbarChangeType = useCallback((type) => {
        if (activeBlockId) {
            const block = blocks.find(b => b.id === activeBlockId);
            if (block && block.text.trim() === '') {
                updateBlockType(projectId, activeBlockId, type);
            } else {
                insertBlockAfter(projectId, activeBlockId, type);
            }
        }
    }, [activeBlockId, blocks, projectId, updateBlockType, insertBlockAfter]);

    const tp = project?.titlePage;

    return (
        <div className={`screenplay-canvas ${dialogueTunerCharacter ? 'dialogue-tuner-active' : ''}`} id="screenplay-canvas">
            <div className="screenplay-page-container">
                {/* Title Page */}
                {showTitlePage && tp && (
                    <div
                        className="title-page-display"
                        onClick={() => setTitlePageModalOpen(true)}
                    >
                        <div className="tp-title">{project?.title || 'UNTITLED'}</div>
                        {tp.basedOn && <div className="tp-based">Based on {tp.basedOn}</div>}
                        <div className="tp-by">Written by</div>
                        <div className="tp-author">{tp.author || 'Author Name'}</div>
                        <div className="tp-footer">
                            {tp.contact && <div>{tp.contact}</div>}
                            {tp.draftDate && <div>{tp.draftDate}</div>}
                            {tp.copyright && <div>{tp.copyright}</div>}
                        </div>
                        <span className="tp-edit-hint">Click to edit title page</span>
                    </div>
                )}

                {pages.map((pageBlocks, pageIndex) => (
                    <React.Fragment key={pageIndex}>
                        <div
                            className={`screenplay-page ${focusMode ? 'focus-mode' : ''}`}
                            data-page={pageIndex + 1}
                        >
                            {pageBlocks.map((block) => (
                                <div key={block.id} style={{ position: 'relative' }}>
                                    {/* Scene Numbers */}
                                    {showSceneNumbers && block.type === 'scene-heading' && sceneNumbers[block.id] && (
                                        <>
                                            <span className="scene-number-left">{sceneNumbers[block.id]}</span>
                                            <span className="scene-number-right">{sceneNumbers[block.id]}</span>
                                        </>
                                    )}
                                    <EditorBlock
                                        block={block}
                                        projectId={projectId}
                                        isActive={block.id === activeBlockId}
                                        onFocus={handleBlockFocus}
                                        onToolbarContext={handleToolbarContext}
                                        isChanged={revisionMode && isBlockChanged(block, latestSnapshot)}
                                        contdMarker={contdMarkers[block.id]}
                                        tunedCharacter={dialogueTunerCharacter}
                                    />
                                </div>
                            ))}
                        </div>
                        {pageIndex < pages.length - 1 && (
                            <div className="page-break-indicator" />
                        )}
                    </React.Fragment>
                ))}
            </div>
            {/* Floating Toolbar */}
            {toolbarCtx.type && toolbarCtx.ref && activeBlockId && (
                <FloatingToolbar
                    blockType={toolbarCtx.type}
                    blockRef={toolbarCtx.ref}
                    onInsertText={handleToolbarInsert}
                    onChangeType={handleToolbarChangeType}
                />
            )}
        </div>
    );
}
