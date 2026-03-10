import React, { useMemo } from 'react';
import useEditorStore from '../stores/editorStore';
import useUIStore from '../stores/uiStore';
import beatTemplates from '../data/beatTemplates';
import '../styles/timeline.css';

export default function StoryTimeline({ projectId }) {
    const { getBlocks, setActiveBlock, activeBlockId } = useEditorStore();
    const { theme } = useUIStore();
    const blocks = getBlocks(projectId);

    // Calculate story length based on scene blocks
    const scenes = useMemo(() => {
        const sceneList = [];
        let num = 0;
        let wordCountSinceLastScene = 0;

        blocks.forEach((b) => {
            if (b.type === 'scene-heading') {
                num++;
                sceneList.push({
                    id: b.id,
                    num,
                    text: b.text || `Scene ${num}`,
                    wordCount: wordCountSinceLastScene,
                });
                wordCountSinceLastScene = 0;
            } else {
                wordCountSinceLastScene += b.text.trim().split(/\s+/).filter(Boolean).length;
            }
        });

        // Add remaining words to the last scene
        if (sceneList.length > 0) {
            sceneList[sceneList.length - 1].wordCount += wordCountSinceLastScene;
        }

        return sceneList;
    }, [blocks]);

    const totalWords = useMemo(() => scenes.reduce((sum, s) => sum + s.wordCount, 0), [scenes]);

    // Apply Save The Cat beat structure map (simplified)
    const beats = beatTemplates['save-the-cat'].beats;

    const handleSceneClick = (sceneId) => {
        setActiveBlock(sceneId);

        // Scroll to block
        setTimeout(() => {
            const el = document.querySelector(`[data-block-id="${sceneId}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Optional: add a temporary highlight class
                el.parentElement.classList.add('flash-highlight');
                setTimeout(() => el.parentElement.classList.remove('flash-highlight'), 1000);
            }
        }, 50);
    };

    if (scenes.length === 0) return null;

    return (
        <div className="story-timeline-container">
            <div className="timeline-beats-track">
                {beats.map((beat, i) => {
                    // Approximate percentage width based on target percentage from standard templates
                    // Here we just use a generic equal spread or mapping based on the beat index for demo
                    const widthPercent = 100 / beats.length;
                    return (
                        <div
                            key={beat.title}
                            className="beat-marker"
                            style={{ width: `${widthPercent}%` }}
                            title={beat.title}
                        >
                            <span className="beat-label">{beat.title}</span>
                        </div>
                    );
                })}
            </div>
            <div className="timeline-scenes-track">
                {scenes.map((scene) => {
                    // Width is proportional to its word count relative to total words
                    // Minimum width so small scenes are still clickable
                    const widthPercent = totalWords > 0 ? Math.max((scene.wordCount / totalWords) * 100, 2) : (100 / scenes.length);
                    const isActive = scene.id === activeBlockId;

                    return (
                        <div
                            key={scene.id}
                            className={`scene-node ${isActive ? 'active' : ''}`}
                            style={{ width: `${widthPercent}%` }}
                            onClick={() => handleSceneClick(scene.id)}
                            title={`${scene.num}: ${scene.text} (${scene.wordCount} words)`}
                        >
                            <div className="scene-node-indicator"></div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
