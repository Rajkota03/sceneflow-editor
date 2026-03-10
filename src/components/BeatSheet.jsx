import React from 'react';
import useEditorStore from '../stores/editorStore';
import useBeatStore from '../stores/beatStore';
import useProjectStore from '../stores/projectStore';
import beatTemplates from '../data/beatTemplates';
import '../styles/beat-sheet.css';

export default function BeatSheet({ projectId }) {
    const project = useProjectStore((s) =>
        s.projects.find((p) => p.id === projectId)
    );
    const template = beatTemplates[project?.structureTemplate || 'save-the-cat'];
    const beats = template?.beats || [];
    const assignments = useBeatStore((s) => s.getAssignments(projectId));
    const progress = useBeatStore((s) =>
        s.getProgress(projectId, beats.length)
    );
    const scenes = useEditorStore((s) => {
        const blocks = s.blocksByProject[projectId] || [];
        return blocks
            .filter((b) => b.type === 'scene-heading')
            .map((b, i) => ({
                id: b.id,
                slugline: b.text || `Scene ${i + 1}`,
            }));
    });

    const assignSceneToBeat = useBeatStore((s) => s.assignSceneToBeat);
    const unassignSceneFromBeat = useBeatStore((s) => s.unassignSceneFromBeat);

    // Group beats by act
    const actGroups = {};
    beats.forEach((beat) => {
        if (!actGroups[beat.act]) actGroups[beat.act] = [];
        actGroups[beat.act].push(beat);
    });

    const handleDrop = (beatId, e) => {
        e.preventDefault();
        const sceneId = e.dataTransfer.getData('sceneId');
        if (sceneId) {
            assignSceneToBeat(projectId, beatId, sceneId);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('droppable');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('droppable');
    };

    return (
        <div>
            <div className="beat-sheet-header">
                <h4>Beat Sheet</h4>
                <span className="badge badge-accent">{template?.name}</span>
            </div>

            {/* Progress Bar */}
            <div className="beat-progress">
                <div className="beat-progress-info">
                    <span className="beat-progress-label">
                        {progress.filled}/{progress.total} beats filled
                    </span>
                    <span className="beat-progress-pct">{progress.percentage}%</span>
                </div>
                <div className="beat-progress-bar">
                    <div
                        className="beat-progress-fill"
                        style={{ width: `${progress.percentage}%` }}
                    />
                </div>
            </div>

            {/* Beats by Act */}
            {Object.entries(actGroups).map(([act, actBeats]) => (
                <div key={act} className="beat-act-group">
                    <div className="beat-act-label">Act {act}</div>
                    {actBeats.map((beat) => {
                        const beatSceneIds = assignments[beat.id] || [];
                        const beatScenes = beatSceneIds
                            .map((id) => scenes.find((s) => s.id === id))
                            .filter(Boolean);
                        const isFilled = beatScenes.length > 0;

                        return (
                            <div
                                key={beat.id}
                                className={`beat-card ${isFilled ? 'filled' : ''}`}
                                onDrop={(e) => handleDrop(beat.id, e)}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                            >
                                <div className="beat-card-header">
                                    <span className="beat-card-name">{beat.name}</span>
                                    <span
                                        className={`beat-card-status ${isFilled ? 'filled' : ''}`}
                                    />
                                </div>
                                <p className="beat-card-description">{beat.description}</p>
                                {beatScenes.length > 0 ? (
                                    <div className="beat-card-scenes">
                                        {beatScenes.map((s) => (
                                            <span key={s.id} className="beat-scene-tag">
                                                {s.slugline}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="beat-empty-hint">
                                        Drag a scene here to assign
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
