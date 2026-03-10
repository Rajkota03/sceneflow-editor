import React, { useMemo } from 'react';
import { Mic, MicOff } from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import useUIStore from '../stores/uiStore';
import '../styles/dialogue-tuner.css';

export default function DialogueTunerPanel({ projectId }) {
    const { getBlocks } = useEditorStore();
    const { dialogueTunerCharacter, setDialogueTunerCharacter, theme } = useUIStore();
    const blocks = getBlocks(projectId);

    // Get unique characters and their line counts
    const characters = useMemo(() => {
        const counts = {};

        blocks.forEach((b, i) => {
            if (b.type === 'character') {
                const charName = b.text.replace(/\s*\(.*\)\s*/, '').trim().toUpperCase();
                if (charName) {
                    if (!counts[charName]) counts[charName] = 0;

                    // Check if next block is dialogue
                    const nextBlock = blocks[i + 1];
                    if (nextBlock && nextBlock.type === 'dialogue') {
                        counts[charName]++;
                    }
                }
            }
        });

        return Object.entries(counts)
            .map(([name, lines]) => ({ name, lines }))
            .sort((a, b) => b.lines - a.lines);
    }, [blocks]);

    const isLight = theme === 'light';

    return (
        <div className="dialogue-tuner-panel">
            <div className="tuner-header">
                <h3>Dialogue Tuner</h3>
                <p>Isolate a character's voice to ensure consistency.</p>
            </div>

            {dialogueTunerCharacter && (
                <button
                    className="clear-tuner-btn"
                    onClick={() => setDialogueTunerCharacter(null)}
                >
                    <MicOff size={14} /> Clear Isolation
                </button>
            )}

            <div className="tuner-character-list">
                {characters.length === 0 ? (
                    <div className="empty-state">No characters found yet.</div>
                ) : (
                    characters.map((char) => {
                        const isActive = dialogueTunerCharacter === char.name;
                        return (
                            <button
                                key={char.name}
                                className={`tuner-char-btn ${isActive ? 'active' : ''}`}
                                onClick={() => setDialogueTunerCharacter(isActive ? null : char.name)}
                            >
                                <div className="char-info">
                                    <Mic size={14} className="mic-icon" />
                                    <span className="char-name">{char.name}</span>
                                </div>
                                <span className="char-lines">{char.lines} lines</span>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
