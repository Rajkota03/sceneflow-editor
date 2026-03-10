import React, { useState } from 'react';
import useBeatStore from '../stores/beatStore';
import useUIStore from '../stores/uiStore';
import beatFrameworks from '../data/beatFrameworks';
import SpineTimelineView from '../components/SpineTimelineView';
import SpineBoardView from '../components/SpineBoardView';
import SpineOutlineView from '../components/SpineOutlineView';
import BeatDashboard from '../components/BeatDashboard';
import { AlignLeft, Filter, Search, Plus, Map, X, LayoutTemplate, Columns, ListTree } from 'lucide-react';
import '../styles/the-spine.css';

export default function TheSpine({ projectId }) {
    const { getBeats, addBeat, instantiateTemplate } = useBeatStore();
    const beats = getBeats(projectId);
    const [viewMode, setViewMode] = useState('timeline'); // 'timeline', 'board', 'outline'
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);

    return (
        <div className="the-spine-container">
            {/* Header / Toolbar */}
            <div className="spine-toolbar">
                <div className="spine-toolbar-left">
                    <h2 className="spine-title">The Spine</h2>
                    <div className="spine-view-toggles">
                        <button
                            className={`tool-btn ${viewMode === 'timeline' ? 'active' : ''}`}
                            onClick={() => setViewMode('timeline')}
                            title="Timeline View"
                        >
                            <Map size={16} /> {/* Replace with appropriate icon */}
                        </button>
                        <button
                            className={`tool-btn ${viewMode === 'board' ? 'active' : ''}`}
                            onClick={() => setViewMode('board')}
                            title="Board View"
                        >
                            <AlignLeft size={16} style={{ transform: 'rotate(-90deg)' }} />
                        </button>
                        <button
                            className={`tool-btn ${viewMode === 'outline' ? 'active' : ''}`}
                            onClick={() => setViewMode('outline')}
                            title="Outline View"
                        >
                            <AlignLeft size={16} />
                        </button>
                    </div>
                </div>

                <div className="spine-toolbar-right">
                    <button className="primary-btn" onClick={() => addBeat(projectId)}>
                        <Plus size={16} />
                        <span>Add Beat</span>
                    </button>
                </div>
            </div>

            {beats.length > 0 && <BeatDashboard projectId={projectId} />}

            {/* Canvas Area */}
            <div className={`spine-canvas view-${viewMode}`}>
                {beats.length === 0 ? (
                    <div className="empty-state">
                        <LayoutTemplate size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                        <h3 style={{ marginBottom: 8 }}>No Beats Yet</h3>
                        <p style={{ maxWidth: 400, textAlign: 'center', marginBottom: 24 }}>Define your story's structural spine by creating custom beats or loading an industry-standard template.</p>
                        <div className="empty-state-actions">
                            <button onClick={() => addBeat(projectId)} className="primary-btn">
                                <Plus size={16} /> Create Custom Beat
                            </button>
                            <button onClick={() => setShowTemplateSelector(true)} className="secondary-btn">
                                Load Template...
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {viewMode === 'timeline' && <SpineTimelineView projectId={projectId} />}
                        {viewMode === 'board' && <SpineBoardView projectId={projectId} />}
                        {viewMode === 'outline' && <SpineOutlineView projectId={projectId} />}
                    </>
                )}
            </div>

            {/* Template Selector Modal */}
            {showTemplateSelector && (
                <div className="modal-overlay" onClick={() => setShowTemplateSelector(false)}>
                    <div className="modal-content spine-template-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Choose a Beat Framework</h2>
                            <button className="icon-btn" onClick={() => setShowTemplateSelector(false)}><X size={20} /></button>
                        </div>
                        <div className="template-grid">
                            {beatFrameworks.map(template => (
                                <div key={template.id} className="template-card" onClick={() => {
                                    // Default target pages could be pulled from project settings. Hardcoded 110 here as a sensible default.
                                    instantiateTemplate(projectId, template.id, template.category === 'television' ? 60 : 110);
                                    setShowTemplateSelector(false);
                                }}>
                                    <div className="template-category-badge">{template.category}</div>
                                    <h3>{template.frameworkName}</h3>
                                    <p>{template.beats.length} top-level beats. Expected {template.totalExpectedPages} pages.</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
