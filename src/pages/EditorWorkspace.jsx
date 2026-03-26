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
    PieChart,
    GitBranch,
    Clipboard,
    Palette,
    MessageSquare,
    Tags,
    Activity,
    GraduationCap,
    Layers,
} from 'lucide-react';
import useProjectStore from '../stores/projectStore';
import useEditorStore from '../stores/editorStore';
import useUIStore from '../stores/uiStore';
import TopBar from '../components/TopBar';
import ScreenplayEditor from '../components/ScreenplayEditor/ScreenplayEditor';
import SceneList from '../components/SceneList';
import TheSpine from './TheSpine'; // Added TheSpine
import BeatBoard from '../components/BeatBoard';
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
import DiversityReport from '../components/DiversityReport';
import BranchDrafts from '../components/BranchDrafts';
import StashPanel from '../components/StashPanel';
import RevisionColorPicker from '../components/RevisionColorPicker';
import CommentsPanel from '../components/CommentsPanel';
import SplitScreenEditor from '../components/SplitScreenEditor';
import ResizeHandle from '../components/ResizeHandle';
import ErrorBoundary from '../components/ErrorBoundary';
import BreakdownPanel from '../components/BreakdownPanel';
import WatermarkDialog from '../components/WatermarkDialog';
import DialogueCoach from '../components/DialogueCoach';
import RewritePanel from '../components/RewritePanel';
import PacingAnalysis from '../components/PacingAnalysis';
import '../styles/editor-workspace.css';

const SIDEBAR_TABS = [
    { id: 'scenes', label: 'Scenes', icon: Film },
    { id: 'corkboard', label: 'Board', icon: LayoutGrid },
    { id: 'beats', label: 'Beats', icon: Layers },
    { id: 'characters', label: 'Chars', icon: Users },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'history', label: 'History', icon: History },
    { id: 'branches', label: 'Branch', icon: GitBranch },
    { id: 'stash', label: 'Stash', icon: Clipboard },
];

const RIGHT_TABS = [
    { id: 'analytics', label: 'Stats', icon: BarChart3 },
    { id: 'comments', label: 'Comments', icon: MessageSquare },
    { id: 'diversity', label: 'Dialogue', icon: PieChart },
    { id: 'coach', label: 'Coach', icon: GraduationCap },
    { id: 'breakdown', label: 'Breakdown', icon: ClipboardList },
    { id: 'tagging', label: 'Tags', icon: Tags },
    { id: 'revision', label: 'Revision', icon: Palette },
    { id: 'logline', label: 'Logline', icon: Sparkles },
    { id: 'beat-help', label: 'Beats', icon: HelpCircle },
    { id: 'characters', label: 'Chars', icon: UserCheck },
    { id: 'tuner', label: 'Tuner', icon: Mic },
    { id: 'rewrite', label: 'Rewrite', icon: Wand2 },
    { id: 'pacing', label: 'Pacing', icon: Activity },
];

export default function EditorWorkspace() {
    const { id: projectId } = useParams();
    const navigate = useNavigate();
    const watermarkDialogOpen = useUIStore((s) => s.watermarkDialogOpen);
    const setWatermarkDialogOpen = useUIStore((s) => s.setWatermarkDialogOpen);
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
        sidebarWidth,
        setSidebarWidth,
        rightPanelWidth,
        setRightPanelWidth,
        splitScreenMode,
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

    const handleJumpToScene = (blockIndex) => {
        const blocks = useEditorStore.getState().getBlocks(projectId);
        if (blocks && blocks[blockIndex]) {
            const blockId = blocks[blockIndex].id;
            useEditorStore.getState().setActiveBlock(blockId);
            // Scroll the editor to the target block
            setTimeout(() => {
                const el = document.querySelector(`[data-block-id="${blockId}"]`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 50);
        }
    };

    const renderSidebarContent = () => {
        switch (sidebarTab) {
            case 'scenes':
                return <SceneList projectId={projectId} />;
            case 'corkboard':
                return <CorkboardView projectId={projectId} onJumpToScene={handleJumpToScene} />;
            case 'beats':
                return <BeatBoard projectId={projectId} />;
            case 'characters':
                return <CharacterBible projectId={projectId} />;
            case 'notes':
                return <NotesPanel projectId={projectId} />;
            case 'history':
                return <VersionHistory projectId={projectId} />;
            case 'branches':
                return <BranchDrafts projectId={projectId} />;
            case 'stash':
                return <StashPanel projectId={projectId} />;
            default:
                return <SceneList projectId={projectId} />;
        }
    };

    return (
        <div className={`editor-workspace ${zenMode ? 'zen' : ''}`}>
            <TopBar projectId={projectId} />

            <div className="editor-layout">
                {/* Left Sidebar */}
                <aside
                    className={`left-sidebar ${sidebarOpen ? '' : 'collapsed'}`}
                    style={sidebarOpen ? { width: `${sidebarWidth}px` } : undefined}
                >
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
                    <div className="sidebar-content"><ErrorBoundary>{renderSidebarContent()}</ErrorBoundary></div>
                </aside>

                {/* Left Resize Handle */}
                {sidebarOpen && !zenMode && (
                    <ResizeHandle
                        side="left"
                        width={sidebarWidth}
                        setWidth={setSidebarWidth}
                        defaultWidth={280}
                    />
                )}

                {/* Center: The Stage (Screenplay Editor) or The Spine */}
                <main className="center-canvas" style={{ position: 'relative' }}>
                    {globalTab === 'spine' ? (
                        <TheSpine projectId={projectId} />
                    ) : splitScreenMode ? (
                        <SplitScreenEditor projectId={projectId} />
                    ) : (
                        <>
                            <FindReplace projectId={projectId} />
                            <ScreenplayEditor projectId={projectId} />
                        </>
                    )}
                </main>

                {/* Right Resize Handle */}
                {rightPanelOpen && !zenMode && (
                    <ResizeHandle
                        side="right"
                        width={rightPanelWidth}
                        setWidth={setRightPanelWidth}
                        defaultWidth={320}
                    />
                )}

                {/* Right Panel: Kleo */}
                <aside
                    className={`right-panel ${rightPanelOpen ? '' : 'collapsed'}`}
                    style={rightPanelOpen ? { width: `${rightPanelWidth}px` } : undefined}
                >
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
                        <ErrorBoundary>
                            {rightPanelTab === 'analytics' ? (
                                <ScriptAnalytics projectId={projectId} />
                            ) : rightPanelTab === 'comments' ? (
                                <CommentsPanel projectId={projectId} />
                            ) : rightPanelTab === 'diversity' ? (
                                <DiversityReport projectId={projectId} />
                            ) : rightPanelTab === 'coach' ? (
                                <DialogueCoach projectId={projectId} />
                            ) : rightPanelTab === 'breakdown' ? (
                                <BreakdownReport projectId={projectId} />
                            ) : rightPanelTab === 'tagging' ? (
                                <BreakdownPanel projectId={projectId} />
                            ) : rightPanelTab === 'revision' ? (
                                <RevisionColorPicker />
                            ) : rightPanelTab === 'tuner' ? (
                                <DialogueTunerPanel projectId={projectId} />
                            ) : rightPanelTab === 'rewrite' ? (
                                <RewritePanel projectId={projectId} />
                            ) : rightPanelTab === 'pacing' ? (
                                <PacingAnalysis projectId={projectId} />
                            ) : (
                                <KleoPanel projectId={projectId} activeTab={rightPanelTab} />
                            )}
                        </ErrorBoundary>
                    </div>
                </aside>
            </div>

            {/* Writing Sprint Timer */}
            <WritingSprint projectId={projectId} />

            {/* Command Palette */}
            {commandPaletteOpen && <CommandPalette />}

            {/* Title Page Modal */}
            <TitlePageModal projectId={projectId} />

            {/* Watermark Dialog */}
            {watermarkDialogOpen && (
                <WatermarkDialog
                    projectId={projectId}
                    onClose={() => setWatermarkDialogOpen(false)}
                />
            )}
        </div>
    );
}
