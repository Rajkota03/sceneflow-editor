import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Sun,
    Moon,
    Maximize,
    Minimize,
    Command,
    PanelLeftClose,
    PanelLeft,
    PanelRightClose,
    PanelRight,
    Eye,
    FileText,
    PlayCircle,
    PencilRuler,
    AlignVerticalSpaceAround,
    Film,
    Layout,
} from 'lucide-react';
import useProjectStore from '../stores/projectStore';
import useEditorStore from '../stores/editorStore';
import useUIStore from '../stores/uiStore';
import MenuBar from './MenuBar';
import '../styles/topbar.css';

export default function TopBar({ projectId }) {
    const navigate = useNavigate();
    const { updateProject } = useProjectStore();
    const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
    const wordCount = useEditorStore((s) => {
        const blocks = s.blocksByProject[projectId] || [];
        return blocks.reduce((c, b) => c + (b.text.trim().split(/\s+/).filter(Boolean).length), 0);
    });
    const pageCount = useEditorStore((s) => {
        const blocks = s.blocksByProject[projectId] || [];
        let lines = 0;
        blocks.forEach((b) => {
            const text = b.text || '';
            const charsPerLine = b.type === 'dialogue' ? 35 : b.type === 'character' ? 30 : 60;
            lines += Math.max(1, Math.ceil(text.length / charsPerLine));
            if (b.type === 'scene-heading') lines += 2;
            else if (['character', 'action', 'transition'].includes(b.type)) lines += 1;
        });
        return Math.max(1, Math.ceil(lines / 55));
    });
    const {
        theme, toggleTheme,
        zenMode, toggleZenMode,
        focusMode, toggleFocusMode,
        readThroughMode, toggleReadThroughMode,
        typewriterMode, toggleTypewriterMode,
        revisionMode, toggleRevisionMode,
        sidebarOpen, toggleSidebar,
        rightPanelOpen, toggleRightPanel,
        setCommandPaletteOpen,
        globalTab, setGlobalTab,
    } = useUIStore();

    const [title, setTitle] = useState(project?.title || '');
    const [saved, setSaved] = useState(true);

    useEffect(() => {
        setTitle(project?.title || '');
    }, [project?.title]);

    const handleTitleChange = (e) => {
        setTitle(e.target.value);
        setSaved(false);
    };

    const handleTitleBlur = () => {
        if (title.trim() && title !== project?.title) {
            updateProject(projectId, { title: title.trim() });
        }
        setSaved(true);
    };

    return (
        <div className="topbar">
            <div className="topbar-left">
                <button
                    className="topbar-back"
                    onClick={() => navigate('/')}
                    title="Back to Dashboard"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="topbar-divider" />
                <MenuBar projectId={projectId} />
                <div className="topbar-divider" />
                <button className="btn-icon" onClick={toggleSidebar} title="Toggle sidebar">
                    {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
                </button>
                <div className="topbar-title">
                    <input
                        type="text"
                        value={title}
                        onChange={handleTitleChange}
                        onBlur={handleTitleBlur}
                        onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    />
                </div>
            </div>

            <div className="topbar-center">
                <div className="segmented-control">
                    <button
                        className={`segment ${globalTab === 'stage' ? 'active' : ''}`}
                        onClick={() => setGlobalTab('stage')}
                    >
                        <Film size={14} />
                        The Stage
                    </button>
                    <button
                        className={`segment ${globalTab === 'spine' ? 'active' : ''}`}
                        onClick={() => setGlobalTab('spine')}
                    >
                        <Layout size={14} />
                        The Spine
                    </button>
                </div>

                <div className="save-indicator">
                    <span className={`save-dot ${saved ? '' : 'saving'}`} />
                    <span>{saved ? 'Saved' : 'Saving...'}</span>
                </div>
            </div>

            <div className="topbar-right">
                <span className="word-count">
                    <FileText size={11} style={{ marginRight: 3, opacity: 0.5 }} />
                    {pageCount} pg
                </span>
                <span className="word-count">{wordCount} words</span>
                <div className="topbar-divider" />
                <button
                    className="btn-icon"
                    onClick={toggleFocusMode}
                    title="Focus mode"
                    style={focusMode ? { color: 'var(--accent-primary, #a78bfa)' } : {}}
                >
                    <Eye size={16} />
                </button>
                <button
                    className="btn-icon"
                    onClick={toggleRevisionMode}
                    title="Revision Mode (highlight changes)"
                    style={revisionMode ? { color: 'var(--accent-primary, #a78bfa)' } : {}}
                >
                    <PencilRuler size={16} />
                </button>
                <button
                    className="btn-icon"
                    onClick={toggleReadThroughMode}
                    title="Read-Through Mode (auto-scroll)"
                    style={readThroughMode ? { color: 'var(--accent-primary, #a78bfa)' } : {}}
                >
                    <PlayCircle size={16} />
                </button>
                <button
                    className="btn-icon"
                    onClick={toggleTypewriterMode}
                    title="Typewriter Mode (keep typing centered)"
                    style={typewriterMode ? { color: 'var(--accent-primary, #a78bfa)' } : {}}
                >
                    <AlignVerticalSpaceAround size={16} />
                </button>
                <button className="btn-icon" onClick={toggleZenMode} title="Zen mode">
                    {zenMode ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
                <button
                    className="btn-icon"
                    onClick={() => setCommandPaletteOpen(true)}
                    title="Command palette (⌘K)"
                >
                    <Command size={16} />
                </button>
                <button className="btn-icon" onClick={toggleTheme} title="Toggle theme">
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button className="btn-icon" onClick={toggleRightPanel} title="Toggle Kleo panel">
                    {rightPanelOpen ? <PanelRightClose size={16} /> : <PanelRight size={16} />}
                </button>
            </div>
        </div>
    );
}
