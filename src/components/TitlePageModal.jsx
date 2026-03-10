import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import useProjectStore from '../stores/projectStore';
import useUIStore from '../stores/uiStore';
import '../styles/title-page.css';

export default function TitlePageModal({ projectId }) {
    const { titlePageModalOpen, setTitlePageModalOpen } = useUIStore();
    const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
    const updateTitlePage = useProjectStore((s) => s.updateTitlePage);

    const tp = project?.titlePage || {};
    const [form, setForm] = useState({
        author: tp.author || '',
        contact: tp.contact || '',
        draftDate: tp.draftDate || '',
        basedOn: tp.basedOn || '',
        copyright: tp.copyright || '',
    });

    useEffect(() => {
        if (project?.titlePage) {
            setForm({
                author: project.titlePage.author || '',
                contact: project.titlePage.contact || '',
                draftDate: project.titlePage.draftDate || '',
                basedOn: project.titlePage.basedOn || '',
                copyright: project.titlePage.copyright || '',
            });
        }
    }, [project?.titlePage, titlePageModalOpen]);

    if (!titlePageModalOpen) return null;

    const handleSave = () => {
        updateTitlePage(projectId, form);
        setTitlePageModalOpen(false);
    };

    return (
        <div className="modal-overlay" onClick={() => setTitlePageModalOpen(false)}>
            <div className="modal title-page-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Title Page</h3>
                    <button className="btn-icon" onClick={() => setTitlePageModalOpen(false)}>
                        <X size={18} />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="title-page-preview">
                        <div className="tp-preview-title">{project?.title || 'UNTITLED'}</div>
                        {form.basedOn && <div className="tp-preview-based">Based on {form.basedOn}</div>}
                        <div className="tp-preview-by">Written by</div>
                        <div className="tp-preview-author">{form.author || 'Author Name'}</div>
                        <div className="tp-preview-footer">
                            {form.contact && <div>{form.contact}</div>}
                            {form.draftDate && <div>{form.draftDate}</div>}
                            {form.copyright && <div>{form.copyright}</div>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Written by</label>
                        <input
                            className="form-input"
                            value={form.author}
                            onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                            placeholder="Your name"
                        />
                    </div>
                    <div className="form-group">
                        <label>Contact</label>
                        <input
                            className="form-input"
                            value={form.contact}
                            onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                            placeholder="Email or agent info"
                        />
                    </div>
                    <div className="form-group">
                        <label>Draft Date</label>
                        <input
                            className="form-input"
                            value={form.draftDate}
                            onChange={(e) => setForm((f) => ({ ...f, draftDate: e.target.value }))}
                            placeholder="March 2026"
                        />
                    </div>
                    <div className="form-group">
                        <label>Based on</label>
                        <input
                            className="form-input"
                            value={form.basedOn}
                            onChange={(e) => setForm((f) => ({ ...f, basedOn: e.target.value }))}
                            placeholder="e.g., the novel by..."
                        />
                    </div>
                    <div className="form-group">
                        <label>Copyright</label>
                        <input
                            className="form-input"
                            value={form.copyright}
                            onChange={(e) => setForm((f) => ({ ...f, copyright: e.target.value }))}
                            placeholder="© 2026 Your Name"
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={() => setTitlePageModalOpen(false)}>Cancel</button>
                    <button className="btn-primary" onClick={handleSave}>Save Title Page</button>
                </div>
            </div>
        </div>
    );
}
