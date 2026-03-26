import React, { useCallback, useRef, useEffect } from 'react';
import '../styles/resize-handle.css';

const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const DEFAULT_SIDEBAR_WIDTH = 280;
const DEFAULT_RIGHT_PANEL_WIDTH = 320;

/**
 * ResizeHandle — A draggable divider between panels.
 *
 * Props:
 *   side: 'left' | 'right' — which panel this handle controls
 *   width: current width of the panel
 *   setWidth: function to update the panel width
 *   defaultWidth: default width to reset on double-click
 */
export default function ResizeHandle({ side, width, setWidth, defaultWidth }) {
    const handleRef = useRef(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(0);

    const onMouseDown = useCallback((e) => {
        e.preventDefault();
        isDragging.current = true;
        startX.current = e.clientX;
        startWidth.current = width;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [width]);

    const onMouseMove = useCallback((e) => {
        if (!isDragging.current) return;

        const delta = e.clientX - startX.current;
        let newWidth;

        if (side === 'left') {
            // Dragging right increases left sidebar width
            newWidth = startWidth.current + delta;
        } else {
            // Dragging left increases right panel width
            newWidth = startWidth.current - delta;
        }

        newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
        setWidth(newWidth);
    }, [side, setWidth]);

    const onMouseUp = useCallback(() => {
        if (!isDragging.current) return;
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    const onDoubleClick = useCallback(() => {
        const resetWidth = defaultWidth || (side === 'left' ? DEFAULT_SIDEBAR_WIDTH : DEFAULT_RIGHT_PANEL_WIDTH);
        setWidth(resetWidth);
    }, [side, setWidth, defaultWidth]);

    useEffect(() => {
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [onMouseMove, onMouseUp]);

    return (
        <div
            ref={handleRef}
            className={`resize-handle resize-handle-${side}`}
            onMouseDown={onMouseDown}
            onDoubleClick={onDoubleClick}
            title="Drag to resize, double-click to reset"
        >
            <div className="resize-handle-line" />
        </div>
    );
}
