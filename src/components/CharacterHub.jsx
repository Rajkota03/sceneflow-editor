import React, { useState } from 'react';
import { Users, User, MessageSquare } from 'lucide-react';
import useEditorStore from '../stores/editorStore';

export default function CharacterHub({ projectId }) {
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);

    // Extract characters from character blocks
    const characters = {};
    let sceneIndex = 0;
    let currentScene = 'Unknown';

    blocks.forEach((block) => {
        if (block.type === 'scene-heading') {
            sceneIndex++;
            currentScene = block.text || `Scene ${sceneIndex}`;
        }
        if (block.type === 'character' && block.text.trim()) {
            const name = block.text.trim().toUpperCase();
            if (!characters[name]) {
                characters[name] = {
                    name,
                    dialogueCount: 0,
                    firstScene: currentScene,
                    scenes: new Set(),
                };
            }
            characters[name].dialogueCount++;
            characters[name].scenes.add(currentScene);
        }
    });

    const charList = Object.values(characters).sort(
        (a, b) => b.dialogueCount - a.dialogueCount
    );

    if (charList.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                <Users size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p style={{ fontSize: 'var(--text-sm)' }}>
                    No characters yet.<br />
                    Write character dialogue to see them here.
                </p>
            </div>
        );
    }

    return (
        <div>
            <div className="scene-list-header">
                <h4>Characters</h4>
                <span className="badge">{charList.length}</span>
            </div>
            {charList.map((char) => (
                <div key={char.name} className="char-tag-card">
                    <div className="char-tag-avatar">{char.name.charAt(0)}</div>
                    <div className="char-tag-info">
                        <div className="char-tag-name">{char.name}</div>
                        <div className="char-tag-scene">
                            First: {char.firstScene}
                        </div>
                    </div>
                    <span className="char-tag-count">
                        <MessageSquare size={10} style={{ marginRight: 3 }} />
                        {char.dialogueCount}
                    </span>
                </div>
            ))}
        </div>
    );
}
