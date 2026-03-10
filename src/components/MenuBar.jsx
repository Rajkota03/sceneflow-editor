import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, FilePlus, FolderOpen, Download, FileDown, FileUp,
    Undo2, Redo2, Search, Copy, Scissors, ClipboardPaste,
    Eye, Maximize, PanelLeft, PanelRight, Sun, Moon,
    Type, AlignLeft, AlignCenter, AlignRight, Minus,
    Sparkles, BarChart3, Users, BookOpen,
    Command, Hash, MessageSquare, Clapperboard,
    ChevronRight, ArrowLeft, BookMarked, Paintbrush, ListOrdered,
} from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import useUIStore from '../stores/uiStore';
import useProjectStore from '../stores/projectStore';
import { exportPDF, exportFDX, exportFountain, exportTXT, importFile } from '../utils/fileOps';
import '../styles/menu-bar.css';

// ═══════════════════════════════════════════════
//  Menu Definition
// ═══════════════════════════════════════════════

function useMenuItems(projectId, navigate) {
    const store = useEditorStore();
    const ui = useUIStore();
    const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
    const title = project?.title || 'Screenplay';

    const handleImport = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.fdx,.fountain,.txt,.spmd';
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
                const result = await importFile(file);
                store.setBlocks(projectId, result.blocks);
                if (result.filename) {
                    useProjectStore.getState().updateProject(projectId, { title: result.filename });
                }
            } catch (err) {
                console.error('Import failed:', err);
            }
        };
        input.click();
    }, [projectId, store]);

    const getBlocks = () => store.blocksByProject[projectId] || [];

    return [
        {
            label: 'File',
            items: [
                {
                    label: 'New Script',
                    icon: FilePlus,
                    shortcut: '⌘N',
                    action: () => navigate('/'),
                },
                {
                    label: 'Open / Import…',
                    icon: FolderOpen,
                    shortcut: '⌘O',
                    action: handleImport,
                    badge: 'FDX · Fountain · TXT',
                },
                { separator: true },
                {
                    label: 'Export as PDF',
                    icon: Download,
                    shortcut: '⌘⇧P',
                    action: () => exportPDF(getBlocks(), title, {
                        titlePage: project?.titlePage,
                        showSceneNumbers: ui.showSceneNumbers,
                    }),
                },
                {
                    label: 'Export as FDX',
                    icon: FileDown,
                    shortcut: null,
                    description: 'Final Draft format',
                    action: () => exportFDX(getBlocks(), title),
                },
                {
                    label: 'Export as Fountain',
                    icon: FileText,
                    shortcut: null,
                    description: 'Industry plaintext',
                    action: () => exportFountain(getBlocks(), title),
                },
                {
                    label: 'Export as TXT',
                    icon: FileDown,
                    shortcut: null,
                    action: () => exportTXT(getBlocks(), title),
                },
                { separator: true },
                {
                    label: 'Back to Dashboard',
                    icon: ArrowLeft,
                    action: () => navigate('/'),
                },
            ],
        },
        {
            label: 'Edit',
            items: [
                { label: 'Undo', icon: Undo2, shortcut: '⌘Z', action: () => store.undo(projectId) },
                { label: 'Redo', icon: Redo2, shortcut: '⌘⇧Z', action: () => store.redo(projectId) },
                { separator: true },
                { label: 'Cut', icon: Scissors, shortcut: '⌘X', action: () => document.execCommand('cut') },
                { label: 'Copy', icon: Copy, shortcut: '⌘C', action: () => document.execCommand('copy') },
                { label: 'Paste', icon: ClipboardPaste, shortcut: '⌘V', action: () => document.execCommand('paste') },
                { separator: true },
                {
                    label: 'Find & Replace',
                    icon: Search,
                    shortcut: '⌘F',
                    action: () => ui.setFindOpen(true),
                },
            ],
        },
        {
            label: 'View',
            items: [
                {
                    label: ui.zenMode ? 'Exit Zen Mode' : 'Zen Mode',
                    icon: Maximize,
                    shortcut: '⌘⇧Z',
                    action: () => ui.toggleZenMode(),
                },
                {
                    label: ui.focusMode ? 'Exit Focus Mode' : 'Focus Mode',
                    icon: Eye,
                    shortcut: '⌘⇧F',
                    action: () => ui.toggleFocusMode(),
                },
                { separator: true },
                {
                    label: ui.sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar',
                    icon: PanelLeft,
                    shortcut: '⌘\\',
                    action: () => ui.toggleSidebar(),
                },
                {
                    label: ui.rightPanelOpen ? 'Hide Kleo Panel' : 'Show Kleo Panel',
                    icon: PanelRight,
                    shortcut: '⌘⇧K',
                    action: () => ui.toggleRightPanel(),
                },
                { separator: true },
                {
                    label: ui.showSceneNumbers ? 'Hide Scene Numbers' : 'Show Scene Numbers',
                    icon: ListOrdered,
                    action: () => ui.toggleSceneNumbers(),
                },
                {
                    label: ui.revisionMode ? 'Exit Revision Mode' : 'Revision Mode',
                    icon: Paintbrush,
                    action: () => ui.toggleRevisionMode(),
                },
                { separator: true },
                {
                    label: ui.theme === 'dark' ? 'Light Mode' : 'Dark Mode',
                    icon: ui.theme === 'dark' ? Sun : Moon,
                    action: () => ui.toggleTheme(),
                },
            ],
        },
        {
            label: 'Format',
            items: [
                {
                    label: 'Title Page…',
                    icon: BookMarked,
                    action: () => ui.setTitlePageModalOpen(true),
                },
                { separator: true },
                { label: 'Scene Heading', icon: Clapperboard, shortcut: '⌘1', action: () => insertElement('scene-heading') },
                { label: 'Action', icon: AlignLeft, shortcut: '⌘2', action: () => insertElement('action') },
                { label: 'Character', icon: Users, shortcut: '⌘3', action: () => insertElement('character') },
                { label: 'Parenthetical', icon: MessageSquare, shortcut: '⌘4', action: () => insertElement('parenthetical') },
                { label: 'Dialogue', icon: AlignCenter, shortcut: '⌘5', action: () => insertElement('dialogue') },
                { label: 'Transition', icon: AlignRight, shortcut: '⌘6', action: () => insertElement('transition') },
            ],
        },
        {
            label: 'Tools',
            items: [
                {
                    label: 'Command Palette',
                    icon: Command,
                    shortcut: '⌘K',
                    action: () => ui.setCommandPaletteOpen(true),
                },
                { separator: true },
                {
                    label: 'Character Report',
                    icon: Users,
                    action: () => {
                        ui.setSidebarTab('characters');
                    },
                },
                {
                    label: 'Beat Sheet Progress',
                    icon: BarChart3,
                    action: () => {
                        ui.setSidebarTab('structure');
                    },
                },
            ],
        },
    ];

    function insertElement(type) {
        const blocks = getBlocks();
        const activeId = store.activeBlockId;
        if (activeId) {
            store.insertBlockAfter(projectId, activeId, type);
        } else if (blocks.length > 0) {
            store.insertBlockAfter(projectId, blocks[blocks.length - 1].id, type);
        }
    }
}

// ═══════════════════════════════════════════════
//  Menu Item Component
// ═══════════════════════════════════════════════

function MenuItem({ item, onClose }) {
    if (item.separator) {
        return <div className="menu-separator" />;
    }

    if (item.groupLabel) {
        return <div className="menu-group-label">{item.groupLabel}</div>;
    }

    const Icon = item.icon;

    return (
        <button
            className={`menu-item ${item.disabled ? 'disabled' : ''}`}
            onClick={() => {
                if (!item.disabled && item.action) {
                    item.action();
                    onClose();
                }
            }}
        >
            <span className="menu-item-icon">
                {Icon && <Icon size={14} />}
            </span>
            <span className="menu-item-label">{item.label}</span>
            {item.badge && (
                <span className="menu-item-badge">{item.badge}</span>
            )}
            {item.shortcut && (
                <span className="menu-item-shortcut">{item.shortcut}</span>
            )}
        </button>
    );
}

// ═══════════════════════════════════════════════
//  Menu Dropdown Component
// ═══════════════════════════════════════════════

function MenuDropdown({ menu, onClose, triggerRef }) {
    const dropdownRef = useRef(null);
    const [position, setPosition] = useState({ left: 0, top: 0 });

    useEffect(() => {
        if (triggerRef?.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                left: rect.left,
                top: rect.bottom + 4,
            });
        }
    }, [triggerRef]);

    return (
        <>
            <div className="menu-overlay" onClick={onClose} />
            <div
                ref={dropdownRef}
                className="menu-dropdown"
                style={{
                    position: 'fixed',
                    left: `${position.left}px`,
                    top: `${position.top}px`,
                }}
            >
                {menu.items.map((item, i) => (
                    <MenuItem key={i} item={item} onClose={onClose} />
                ))}
            </div>
        </>
    );
}

// ═══════════════════════════════════════════════
//  Main MenuBar Component
// ═══════════════════════════════════════════════

export default function MenuBar({ projectId }) {
    const navigate = useNavigate();
    const menus = useMenuItems(projectId, navigate);
    const [openMenu, setOpenMenu] = useState(null);
    const triggerRefs = useRef({});

    const handleTriggerClick = useCallback((label) => {
        setOpenMenu((prev) => (prev === label ? null : label));
    }, []);

    const handleTriggerHover = useCallback((label) => {
        if (openMenu !== null) {
            setOpenMenu(label);
        }
    }, [openMenu]);

    const handleClose = useCallback(() => {
        setOpenMenu(null);
    }, []);

    // Global keyboard shortcuts for menu actions
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isMod = e.metaKey || e.ctrlKey;
            const isShift = e.shiftKey;

            if (isMod && isShift && e.key === 'p') {
                e.preventDefault();
                const blocks = useEditorStore.getState().blocksByProject[projectId] || [];
                const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
                exportPDF(blocks, project?.title || 'Screenplay');
            }

            if (isMod && e.key === 'o') {
                e.preventDefault();
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.fdx,.fountain,.txt,.spmd';
                input.onchange = async (ev) => {
                    const file = ev.target.files?.[0];
                    if (!file) return;
                    const result = await importFile(file);
                    useEditorStore.getState().setBlocks(projectId, result.blocks);
                    if (result.filename) {
                        useProjectStore.getState().updateProject(projectId, { title: result.filename });
                    }
                };
                input.click();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [projectId]);

    return (
        <div className="menu-bar">
            {menus.map((menu) => (
                <div key={menu.label} style={{ position: 'relative' }}>
                    <button
                        ref={(el) => { triggerRefs.current[menu.label] = el; }}
                        className={`menu-trigger ${openMenu === menu.label ? 'open' : ''}`}
                        onClick={() => handleTriggerClick(menu.label)}
                        onMouseEnter={() => handleTriggerHover(menu.label)}
                    >
                        {menu.label}
                    </button>
                    {openMenu === menu.label && (
                        <MenuDropdown
                            menu={menu}
                            onClose={handleClose}
                            triggerRef={{ current: triggerRefs.current[menu.label] }}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}
