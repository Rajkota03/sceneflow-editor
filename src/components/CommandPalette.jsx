import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    FileText,
    Sparkles,
    Layout,
    Users,
    Settings,
    Maximize,
    Eye,
    Sun,
    Moon,
    CornerDownLeft,
    ArrowUp,
    ArrowDown,
    Type,
} from 'lucide-react';
import useUIStore from '../stores/uiStore';
import '../styles/command-palette.css';

const COMMANDS = [
    // Editor
    { id: 'scene-heading', name: 'Insert Scene Heading', shortcut: '⌘1', icon: Type, category: 'Editor' },
    { id: 'action', name: 'Insert Action', shortcut: '⌘2', icon: Type, category: 'Editor' },
    { id: 'character', name: 'Insert Character', shortcut: '⌘3', icon: Type, category: 'Editor' },
    { id: 'parenthetical', name: 'Insert Parenthetical', shortcut: '⌘4', icon: Type, category: 'Editor' },
    { id: 'dialogue', name: 'Insert Dialogue', shortcut: '⌘5', icon: Type, category: 'Editor' },
    { id: 'transition', name: 'Insert Transition', shortcut: '⌘6', icon: Type, category: 'Editor' },
    // Navigation
    { id: 'scenes', name: 'Go to Scenes Panel', icon: FileText, category: 'Navigation', action: 'setSidebarTab:scenes' },
    { id: 'structure', name: 'Go to Beat Sheet', icon: Layout, category: 'Navigation', action: 'setSidebarTab:structure' },
    { id: 'characters', name: 'Go to Characters', icon: Users, category: 'Navigation', action: 'setSidebarTab:characters' },
    // Modes
    { id: 'zen', name: 'Toggle Zen Mode', shortcut: '⌘⇧Z', icon: Maximize, category: 'Mode', action: 'toggleZenMode' },
    { id: 'focus', name: 'Toggle Focus Mode', shortcut: '⌘⇧F', icon: Eye, category: 'Mode', action: 'toggleFocusMode' },
    { id: 'theme', name: 'Toggle Dark/Light Theme', icon: Sun, category: 'Mode', action: 'toggleTheme' },
    // Kleo
    { id: 'logline', name: 'Generate Logline', icon: Sparkles, category: 'Kleo AI', action: 'setRightPanelTab:logline' },
    { id: 'beat-help', name: 'Beat Suggestions', icon: Sparkles, category: 'Kleo AI', action: 'setRightPanelTab:beat-help' },
];

export default function CommandPalette() {
    const { setCommandPaletteOpen, setSidebarTab, setRightPanelTab, toggleZenMode, toggleFocusMode, toggleTheme } = useUIStore();
    const [query, setQuery] = useState('');
    const [highlighted, setHighlighted] = useState(0);
    const inputRef = useRef(null);

    const filtered = COMMANDS.filter((cmd) =>
        cmd.name.toLowerCase().includes(query.toLowerCase())
    );

    // Group by category
    const groups = {};
    filtered.forEach((cmd) => {
        if (!groups[cmd.category]) groups[cmd.category] = [];
        groups[cmd.category].push(cmd);
    });

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        setHighlighted(0);
    }, [query]);

    const executeCommand = (cmd) => {
        if (cmd.action) {
            const [fn, arg] = cmd.action.split(':');
            const actions = {
                setSidebarTab: () => setSidebarTab(arg),
                setRightPanelTab: () => setRightPanelTab(arg),
                toggleZenMode,
                toggleFocusMode,
                toggleTheme,
            };
            actions[fn]?.();
        }
        setCommandPaletteOpen(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setCommandPaletteOpen(false);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted((prev) => Math.min(prev + 1, filtered.length - 1));
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted((prev) => Math.max(prev - 1, 0));
        }
        if (e.key === 'Enter' && filtered[highlighted]) {
            executeCommand(filtered[highlighted]);
        }
    };

    let flatIndex = -1;

    return (
        <div
            className="command-palette-overlay"
            onClick={() => setCommandPaletteOpen(false)}
        >
            <div
                className="command-palette"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                <div className="command-palette-input">
                    <Search size={18} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a command..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                <div className="command-palette-list">
                    {Object.keys(groups).length > 0 ? (
                        Object.entries(groups).map(([category, cmds]) => (
                            <div key={category}>
                                <div className="command-group-label">{category}</div>
                                {cmds.map((cmd) => {
                                    flatIndex++;
                                    const idx = flatIndex;
                                    const Icon = cmd.icon;
                                    return (
                                        <button
                                            key={cmd.id}
                                            className={`command-item ${idx === highlighted ? 'highlighted' : ''}`}
                                            onClick={() => executeCommand(cmd)}
                                            onMouseEnter={() => setHighlighted(idx)}
                                        >
                                            <Icon size={16} />
                                            <div className="command-item-text">
                                                <span className="command-item-name">{cmd.name}</span>
                                            </div>
                                            {cmd.shortcut && (
                                                <div className="command-item-shortcut">
                                                    <span className="kbd">{cmd.shortcut}</span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    ) : (
                        <div className="command-palette-empty">No commands found</div>
                    )}
                </div>

                <div className="command-palette-footer">
                    <span>
                        <span className="kbd">↑↓</span> Navigate
                    </span>
                    <span>
                        <span className="kbd">↵</span> Select
                    </span>
                    <span>
                        <span className="kbd">esc</span> Close
                    </span>
                </div>
            </div>
        </div>
    );
}
