import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Film,
    Layout,
    Users,
    StickyNote,
    Sparkles,
    HelpCircle,
    UserCheck,
    Wand2,
    LayoutGrid,
    BarChart3,
    ClipboardList,
    History,
    Mic,
} from 'lucide-react';
import useProjectStore from '../stores/projectStore';
import useEditorStore from '../stores/editorStore';
import useUIStore from '../stores/uiStore';
import TopBar from '../components/TopBar';
import ScreenplayEditor from '../components/ScreenplayEditor/ScreenplayEditor';
import SceneList from '../components/SceneList';
import TheSpine from './TheSpine'; // Added TheSpine
import BeatSheet from '../components/BeatSheet';
import CharacterBible from '../components/CharacterBible';
import NotesPanel from '../components/NotesPanel';
import KleoPanel from '../components/KleoPanel';
import CommandPalette from '../components/CommandPalette';
import ProgressHUD from '../components/ProgressHUD';
import TitlePageModal from '../components/TitlePageModal';
import FindReplace from '../components/FindReplace';
import CorkboardView from '../components/CorkboardView';
import ScriptAnalytics from '../components/ScriptAnalytics';
import WritingSprint from '../components/WritingSprint';
import BreakdownReport from '../components/BreakdownReport';
import VersionHistory from '../components/VersionHistory';
import DialogueTunerPanel from '../components/DialogueTunerPanel';
import StoryTimeline from '../components/StoryTimeline';
import '../styles/editor-workspace.css';

const SIDEBAR_TABS = [
    { id: 'scenes', label: 'Scenes', icon: Film },
    { id: 'corkboard', label: 'Board', icon: LayoutGrid },
    { id: 'characters', label: 'Chars', icon: Users },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'history', label: 'History', icon: History },
];

const RIGHT_TABS = [
    { id: 'analytics', label: 'Stats', icon: BarChart3 },
    { id: 'breakdown', label: 'Breakdown', icon: ClipboardList },
    { id: 'logline', label: 'Logline', icon: Sparkles },
    { id: 'beat-help', label: 'Beats', icon: HelpCircle },
    { id: 'characters', label: 'Chars', icon: UserCheck },
    { id: 'tuner', label: 'Tuner', icon: Mic },
    { id: 'rewrite', label: 'Rewrite', icon: Wand2 },
];

export default function EditorWorkspace() {
    const { id: projectId } = useParams();
    const navigate = useNavigate();
    const project = useProjectStore((s) =>
        s.projects.find((p) => p.id === projectId)
    );
    const setActiveProject = useProjectStore((s) => s.setActiveProject);

    const {
        sidebarOpen,
        sidebarTab,
        setSidebarTab,
        rightPanelOpen,
        rightPanelTab,
        setRightPanelTab,
        zenMode,
        commandPaletteOpen,
        setCommandPaletteOpen,
        globalTab,
    } = useUIStore();

    // Set active project on mount
    useEffect(() => {
        if (projectId) {
            setActiveProject(projectId);
        }
    }, [projectId, setActiveProject]);

    // Redirect if project not found
    useEffect(() => {
        if (!project) {
            navigate('/');
        }
    }, [project, navigate]);

    // Global keyboard shortcuts
    useEffect(() => {
        const handler = (e) => {
            const isMod = e.metaKey || e.ctrlKey;

            // Cmd+K — Command palette
            if (isMod && e.key === 'k') {
                e.preventDefault();
                setCommandPaletteOpen(!commandPaletteOpen);
            }

            // Cmd+Z — Undo (custom block-level)
            if (isMod && !e.shiftKey && e.key === 'z') {
                // Let the contenteditable handle text-level undo
                // Only intercept when not focused on an editor block
                const activeEl = document.activeElement;
                if (!activeEl?.closest('.editor-block')) {
                    e.preventDefault();
                    useEditorStore.getState().undo(projectId);
                }
            }

            // Cmd+Shift+Z — Redo
            if (isMod && e.shiftKey && e.key === 'z') {
                e.preventDefault();
                useEditorStore.getState().redo(projectId);
            }

            // Cmd+Shift+F — Focus mode
            if (isMod && e.shiftKey && e.key === 'f') {
                e.preventDefault();
                useUIStore.getState().toggleFocusMode();
            }

            // Escape — exit zen / close palette
            if (e.key === 'Escape') {
                if (commandPaletteOpen) {
                    setCommandPaletteOpen(false);
                } else if (zenMode) {
                    useUIStore.getState().toggleZenMode();
                }
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [commandPaletteOpen, zenMode, setCommandPaletteOpen, projectId]);

    if (!project) return null;

    const renderSidebarContent = () => {
        switch (sidebarTab) {
            case 'scenes':
                return <SceneList projectId={projectId} />;
            case 'corkboard':
                return <CorkboardView projectId={projectId} />;
            case 'characters':
                return <CharacterBible projectId={projectId} />;
            case 'notes':
                return <NotesPanel projectId={projectId} />;
            case 'history':
                return <VersionHistory projectId={projectId} />;
            default:
                return <SceneList projectId={projectId} />;
        }
    };

    return (
        <div className={`editor-workspace ${zenMode ? 'zen' : ''}`}>
            <TopBar projectId={projectId} />

            <div className="editor-layout">
                {/* Left Sidebar */}
                <aside className={`left-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
                    <div className="sidebar-tabs">
                        {SIDEBAR_TABS.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                className={`sidebar-tab ${sidebarTab === id ? 'active' : ''}`}
                                onClick={() => setSidebarTab(id)}
                                title={label}
                            >
                                <Icon size={14} />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="sidebar-content">{renderSidebarContent()}</div>
                </aside>

                {/* Center: The Stage (Screenplay Editor) or The Spine */}
                <main className="center-canvas" style={{ position: 'relative' }}>
                    {globalTab === 'spine' ? (
                        <TheSpine projectId={projectId} />
                    ) : (
                        <>
                            <FindReplace projectId={projectId} />
                            <ScreenplayEditor projectId={projectId} />
                        </>
                    )}
                </main>

                {/* Right Panel: Kleo */}
                <aside className={`right-panel ${rightPanelOpen ? '' : 'collapsed'}`}>
                    <div className="right-panel-tabs">
                        {RIGHT_TABS.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                className={`right-panel-tab ${rightPanelTab === id ? 'active' : ''}`}
                                onClick={() => setRightPanelTab(id)}
                                title={label}
                            >
                                <Icon size={14} />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="right-panel-content">
                        {rightPanelTab === 'analytics' ? (
                            <ScriptAnalytics projectId={projectId} />
                        ) : rightPanelTab === 'breakdown' ? (
                            <BreakdownReport projectId={projectId} />
                        ) : rightPanelTab === 'tuner' ? (
                            <DialogueTunerPanel projectId={projectId} />
                        ) : (
                            <KleoPanel projectId={projectId} activeTab={rightPanelTab} />
                        )}
                    </div>
                </aside>
            </div>

            {/* Writing Sprint Timer */}
            <WritingSprint projectId={projectId} />

            {/* Command Palette */}
            {commandPaletteOpen && <CommandPalette />}

            {/* Title Page Modal */}
            <TitlePageModal projectId={projectId} />
        </div>
    );
}
