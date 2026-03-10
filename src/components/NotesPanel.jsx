import React, { useState } from 'react';
import { StickyNote, Plus, Trash2 } from 'lucide-react';

export default function NotesPanel({ projectId }) {
    const storageKey = `sceneflow-notes-${projectId}`;
    const [notes, setNotes] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(storageKey)) || [];
        } catch {
            return [];
        }
    });
    const [newNote, setNewNote] = useState('');

    const save = (updated) => {
        setNotes(updated);
        localStorage.setItem(storageKey, JSON.stringify(updated));
    };

    const addNote = () => {
        if (!newNote.trim()) return;
        save([{ id: Date.now(), text: newNote.trim(), createdAt: new Date().toISOString() }, ...notes]);
        setNewNote('');
    };

    const deleteNote = (id) => {
        save(notes.filter((n) => n.id !== id));
    };

    return (
        <div>
            <div className="scene-list-header">
                <h4>Notes</h4>
                <span className="badge">{notes.length}</span>
            </div>

            <div style={{
                display: 'flex',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-3)',
            }}>
                <input
                    type="text"
                    className="form-input"
                    style={{ flex: 1, height: 32, fontSize: 'var(--text-xs)' }}
                    placeholder="Quick note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addNote()}
                />
                <button className="btn-icon" onClick={addNote} style={{ flexShrink: 0 }}>
                    <Plus size={16} />
                </button>
            </div>

            {notes.length > 0 ? (
                notes.map((note) => (
                    <div
                        key={note.id}
                        style={{
                            padding: 'var(--space-3)',
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--space-2)',
                            display: 'flex',
                            gap: 'var(--space-2)',
                            alignItems: 'flex-start',
                        }}
                    >
                        <p style={{
                            flex: 1,
                            fontSize: 'var(--text-sm)',
                            color: 'var(--text-primary)',
                            lineHeight: 'var(--leading-relaxed)',
                            whiteSpace: 'pre-wrap',
                        }}>
                            {note.text}
                        </p>
                        <button
                            className="btn-icon"
                            onClick={() => deleteNote(note.id)}
                            style={{ flexShrink: 0, width: 24, height: 24 }}
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))
            ) : (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                    <StickyNote size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p style={{ fontSize: 'var(--text-sm)' }}>No notes yet.</p>
                </div>
            )}
        </div>
    );
}
