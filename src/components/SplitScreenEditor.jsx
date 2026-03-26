import React, { useRef, useState, useCallback, useEffect } from 'react';
import useUIStore from '../stores/uiStore';
import ScreenplayEditor from './ScreenplayEditor/ScreenplayEditor';
import FindReplace from './FindReplace';
import '../styles/split-screen.css';

export default function SplitScreenEditor({ projectId }) {
    const { splitScreenPosition, setSplitScreenPosition } = useUIStore();
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleMouseMove = useCallback(
        (e) => {
            if (!isDragging || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const percent = Math.max(20, Math.min(80, (y / rect.height) * 100));
            setSplitScreenPosition(percent);
        },
        [isDragging, setSplitScreenPosition]
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div className="split-screen-container" ref={containerRef}>
            {/* Top pane */}
            <div
                className="split-screen-pane split-screen-top"
                style={{ height: `${splitScreenPosition}%` }}
            >
                <FindReplace projectId={projectId} />
                <ScreenplayEditor projectId={projectId} />
            </div>

            {/* Draggable divider */}
            <div
                className={`split-screen-divider ${isDragging ? 'active' : ''}`}
                onMouseDown={handleMouseDown}
            >
                <div className="split-screen-divider-handle" />
            </div>

            {/* Bottom pane */}
            <div
                className="split-screen-pane split-screen-bottom"
                style={{ height: `${100 - splitScreenPosition}%` }}
            >
                <ScreenplayEditor projectId={projectId} />
            </div>
        </div>
    );
}
