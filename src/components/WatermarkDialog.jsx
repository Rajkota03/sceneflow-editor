import React, { useState, useCallback, useMemo } from 'react';
import { X, Download, Shield } from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import useProjectStore from '../stores/projectStore';
import useUIStore from '../stores/uiStore';
import { exportWatermarkedPDF } from '../utils/fileOps';
import '../styles/watermark-dialog.css';

export default function WatermarkDialog({ projectId, onClose }) {
    const [recipientName, setRecipientName] = useState('');
    const [customText, setCustomText] = useState('');
    const [opacity, setOpacity] = useState(0.08);
    const [includeDate, setIncludeDate] = useState(true);

    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);
    const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
    const showSceneNumbers = useUIStore((s) => s.showSceneNumbers);
    const title = project?.title || 'Screenplay';

    const watermarkText = useMemo(() => {
        if (customText.trim()) return customText.trim();
        const parts = [];
        if (recipientName.trim()) parts.push(recipientName.trim());
        if (includeDate) parts.push(new Date().toLocaleDateString());
        return parts.length > 0 ? parts.join(' - ') : 'CONFIDENTIAL';
    }, [recipientName, customText, includeDate]);

    const handleExport = useCallback(() => {
        exportWatermarkedPDF(blocks, title, {
            titlePage: project?.titlePage,
            showSceneNumbers,
            watermark: {
                text: watermarkText,
                opacity,
                angle: 45,
                fontSize: 48,
            },
        });
        onClose();
    }, [blocks, title, project, showSceneNumbers, watermarkText, opacity, onClose]);

    return (
        <div className="wm-overlay" onClick={onClose}>
            <div className="wm-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="wm-header">
                    <div className="wm-header-left">
                        <Shield size={16} />
                        <span>Watermarked PDF Export</span>
                    </div>
                    <button className="wm-close" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                <div className="wm-body">
                    <div className="wm-field">
                        <label className="wm-label">Recipient Name</label>
                        <input
                            type="text"
                            className="wm-input"
                            placeholder="e.g. John Smith, Studio Executive"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            autoFocus
                        />
                        <span className="wm-hint">Each recipient gets a uniquely marked copy for leak tracking.</span>
                    </div>

                    <div className="wm-field">
                        <label className="wm-label">Custom Text (overrides above)</label>
                        <input
                            type="text"
                            className="wm-input"
                            placeholder="Leave blank to use recipient name + date"
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value)}
                        />
                    </div>

                    <div className="wm-field">
                        <label className="wm-label">
                            Opacity: {(opacity * 100).toFixed(0)}%
                        </label>
                        <input
                            type="range"
                            className="wm-slider"
                            min="0.03"
                            max="0.15"
                            step="0.01"
                            value={opacity}
                            onChange={(e) => setOpacity(parseFloat(e.target.value))}
                        />
                        <div className="wm-slider-labels">
                            <span>Subtle</span>
                            <span>Visible</span>
                        </div>
                    </div>

                    <div className="wm-field wm-checkbox-field">
                        <label className="wm-checkbox-label">
                            <input
                                type="checkbox"
                                checked={includeDate}
                                onChange={(e) => setIncludeDate(e.target.checked)}
                            />
                            <span>Include today's date in watermark</span>
                        </label>
                    </div>

                    {/* Preview */}
                    <div className="wm-preview">
                        <div className="wm-preview-label">Preview</div>
                        <div className="wm-preview-area">
                            <div
                                className="wm-preview-text"
                                style={{ opacity: opacity * 5 }}
                            >
                                {watermarkText}
                            </div>
                            <div className="wm-preview-page-lines">
                                <div className="wm-line wm-line-heading" />
                                <div className="wm-line wm-line-short" />
                                <div className="wm-line" />
                                <div className="wm-line" />
                                <div className="wm-line wm-line-char" />
                                <div className="wm-line wm-line-dialogue" />
                                <div className="wm-line wm-line-dialogue" />
                                <div className="wm-line" />
                                <div className="wm-line" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="wm-footer">
                    <button className="wm-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="wm-export" onClick={handleExport}>
                        <Download size={14} />
                        Export Watermarked PDF
                    </button>
                </div>
            </div>
        </div>
    );
}
