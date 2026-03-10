import React from 'react';
import useBeatStore from '../stores/beatStore';
import useProjectStore from '../stores/projectStore';
import beatTemplates from '../data/beatTemplates';

const hudStyle = {
    position: 'fixed',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '6px 16px',
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-full)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    fontSize: 'var(--text-xs)',
    color: 'var(--text-muted)',
    zIndex: 'var(--z-floating)',
    animation: 'slideUp var(--duration-normal) var(--ease-smooth)',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
};

const dotStyle = (filled) => ({
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: filled ? 'var(--success)' : 'var(--text-muted)',
    opacity: filled ? 1 : 0.3,
});

export default function ProgressHUD({ projectId }) {
    const project = useProjectStore((s) =>
        s.projects.find((p) => p.id === projectId)
    );
    const template = beatTemplates[project?.structureTemplate || 'save-the-cat'];
    const beats = template?.beats || [];
    const progress = useBeatStore((s) => s.getProgress(projectId, beats.length));
    const assignments = useBeatStore((s) => s.getAssignments(projectId));

    // Find first empty beat
    const firstEmpty = beats.find((b) => {
        const scenes = assignments[b.id] || [];
        return scenes.length === 0;
    });

    if (beats.length === 0) return null;

    return (
        <div style={hudStyle}>
            <span style={{ color: 'var(--accent-text)', fontWeight: 600 }}>
                {progress.percentage}%
            </span>
            <span>
                {progress.filled}/{progress.total} beats
            </span>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                {beats.slice(0, 15).map((beat) => {
                    const isAssigned = (assignments[beat.id] || []).length > 0;
                    return <span key={beat.id} style={dotStyle(isAssigned)} />;
                })}
            </div>
            {firstEmpty && (
                <span>
                    Next: <span style={{ color: 'var(--text-secondary)' }}>{firstEmpty.name}</span>
                </span>
            )}
        </div>
    );
}
