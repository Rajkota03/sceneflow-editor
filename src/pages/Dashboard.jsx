import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Clapperboard,
    Plus,
    Search,
    Sun,
    Moon,
    Clock,
    FileText,
    LayoutGrid,
    X,
    LogIn,
    LogOut,
    Cloud,
    User,
} from 'lucide-react';
import useProjectStore from '../stores/projectStore';
import useAuthStore from '../stores/authStore';
import useUIStore from '../stores/uiStore';
import { cloudCreateProject, cloudLoadProjects, cloudSaveBlocks } from '../utils/cloudSync';
import beatTemplates from '../data/beatTemplates';
import ActivityHeatmap from '../components/ActivityHeatmap';
import '../styles/dashboard.css';

const genres = [
    'Drama', 'Comedy', 'Thriller', 'Horror', 'Action',
    'Sci-Fi', 'Romance', 'Mystery', 'Fantasy', 'Documentary',
];

function formatDate(iso) {
    const date = new Date(iso);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { projects, createProject, deleteProject, setProjects } = useProjectStore();
    const { user, profile, signOut } = useAuthStore();
    const { theme, toggleTheme } = useUIStore();
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [cloudLoaded, setCloudLoaded] = useState(false);
    const [newProject, setNewProject] = useState({
        title: '',
        genre: 'Drama',
        structureTemplate: 'save-the-cat',
    });

    // Load cloud projects on auth
    useEffect(() => {
        if (user && !cloudLoaded) {
            cloudLoadProjects(user.id).then((cloudProjects) => {
                if (cloudProjects.length > 0) {
                    // Merge: cloud projects that don't exist locally
                    const localIds = new Set(projects.map(p => p.id));
                    const newFromCloud = cloudProjects.filter(p => !localIds.has(p.id));
                    if (newFromCloud.length > 0) {
                        setProjects([...projects, ...newFromCloud]);
                    }
                }
                setCloudLoaded(true);
            });
        }
    }, [user, cloudLoaded]);

    const filteredProjects = projects.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreate = async () => {
        if (!newProject.title.trim()) return;
        const project = createProject(newProject);
        // Sync to cloud if authenticated
        if (user) {
            await cloudCreateProject(user.id, project);
        }
        setShowModal(false);
        setNewProject({ title: '', genre: 'Drama', structureTemplate: 'save-the-cat' });
        navigate(`/project/${project.id}`);
    };

    const openProject = (id) => {
        navigate(`/project/${id}`);
    };

    return (
        <div className="dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="dashboard-logo">
                    <Clapperboard size={28} />
                    <h1>SceneFlow</h1>
                </div>
                <div className="dashboard-actions">
                    <button className="btn-icon" onClick={toggleTheme} title="Toggle theme">
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} />
                        New Script
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="dashboard-content">
                <div className="dashboard-welcome">
                    <h2>Your Scripts</h2>
                    <p>Pick up where you left off, or start something new.</p>
                </div>

                <ActivityHeatmap />

                {projects.length > 0 && (
                    <div className="dashboard-controls">
                        <div className="search-input">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search scripts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                <div className="projects-grid">
                    <button className="new-project-card" onClick={() => setShowModal(true)}>
                        <Plus size={32} />
                        <span>Create New Script</span>
                    </button>

                    {filteredProjects.map((project) => (
                        <div
                            key={project.id}
                            className="project-card"
                            onClick={() => openProject(project.id)}
                        >
                            <h3 className="project-card-title">{project.title}</h3>
                            <div className="project-card-meta">
                                <span className="badge">{project.genre}</span>
                                <span className="badge">
                                    {beatTemplates[project.structureTemplate]?.name || 'Custom'}
                                </span>
                            </div>
                            {project.logline && (
                                <p className="project-card-description">{project.logline}</p>
                            )}
                            <div className="project-card-footer">
                                <span>
                                    <Clock size={12} />
                                    {formatDate(project.updatedAt)}
                                </span>
                                <span>
                                    <FileText size={12} />
                                    {project.sceneCount || 0} scenes
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {projects.length === 0 && (
                    <div className="empty-state">
                        <Clapperboard size={48} />
                        <h3>No scripts yet</h3>
                        <p>Create your first screenplay to get started</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>New Script</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Untitled Screenplay"
                                    value={newProject.title}
                                    onChange={(e) =>
                                        setNewProject({ ...newProject, title: e.target.value })
                                    }
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                />
                            </div>
                            <div className="form-group">
                                <label>Genre</label>
                                <select
                                    className="form-select"
                                    value={newProject.genre}
                                    onChange={(e) =>
                                        setNewProject({ ...newProject, genre: e.target.value })
                                    }
                                >
                                    {genres.map((g) => (
                                        <option key={g} value={g}>
                                            {g}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Structure Template</label>
                                <div className="template-picker">
                                    {Object.entries(beatTemplates).map(([key, tmpl]) => (
                                        <button
                                            key={key}
                                            className={`template-option ${newProject.structureTemplate === key ? 'active' : ''
                                                }`}
                                            onClick={() =>
                                                setNewProject({ ...newProject, structureTemplate: key })
                                            }
                                        >
                                            <div className="template-option-name">{tmpl.name}</div>
                                            <div className="template-option-count">
                                                {tmpl.beats.length} beats
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-ghost"
                                onClick={() => setShowModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleCreate}
                                disabled={!newProject.title.trim()}
                            >
                                <Plus size={16} />
                                Create Script
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
