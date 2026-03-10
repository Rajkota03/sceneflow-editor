import React, { useState } from 'react';
import { Sparkles, Check, X, MessageSquare, Wand2, Users } from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import useProjectStore from '../stores/projectStore';
import '../styles/kleo-panel.css';

// Mock logline variants
const MOCK_LOGLINES = [
    {
        label: 'Short & Punchy',
        text: 'A burnt-out detective must solve one final case — or lose everything she fought for.',
    },
    {
        label: 'Clear & Commercial',
        text: 'When a celebrated detective is drawn into a cold case that mirrors her own tragic past, she must confront buried secrets to catch a killer before he strikes again.',
    },
    {
        label: 'Creative & Edgy',
        text: 'The dead don\'t speak — but in a city that never sleeps, a detective learns to listen to what the silence is screaming.',
    },
];

const MOCK_BEAT_SUGGESTIONS = {
    'opening-image': 'Consider opening with a striking visual that captures your protagonist\'s current emotional state or world before change begins.',
    'catalyst': 'This beat needs a clear, unmistakable event that disrupts the status quo. A phone call, discovery, or encounter that changes everything.',
    'midpoint': 'The midpoint should raise the stakes dramatically. Consider a false victory that reveals a deeper problem, or a reversals that changes the hero\'s approach.',
    'all-is-lost': 'This is the lowest point. Something or someone the hero relied on is taken away. Consider a death, betrayal, or devastating revelation.',
    'finale': 'Your finale should weave together A and B stories. The hero applies everything learned to face the final challenge in a new way.',
};

function LoglineTab({ projectId }) {
    const [accepted, setAccepted] = useState(null);
    const updateProject = useProjectStore((s) => s.updateProject);

    const handleAccept = (text) => {
        setAccepted(text);
        updateProject(projectId, { logline: text });
    };

    return (
        <div>
            <div className="kleo-header">
                <div className="kleo-avatar">K</div>
                <div>
                    <h4>Logline Generator</h4>
                    <span>3 variants ready</span>
                </div>
            </div>
            {MOCK_LOGLINES.map((variant, i) => (
                <div key={i} className="kleo-card">
                    <div className="kleo-card-label">{variant.label}</div>
                    <p className="kleo-card-text">{variant.text}</p>
                    <div className="kleo-card-actions">
                        <button
                            className="kleo-btn-accept"
                            onClick={() => handleAccept(variant.text)}
                            disabled={accepted === variant.text}
                        >
                            <Check size={12} />
                            {accepted === variant.text ? 'Accepted' : 'Accept'}
                        </button>
                        <button className="kleo-btn-reject">
                            <X size={12} />
                            Pass
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function BeatHelpTab({ projectId }) {
    return (
        <div>
            <div className="kleo-header">
                <div className="kleo-avatar">K</div>
                <div>
                    <h4>Beat Suggestions</h4>
                    <span>AI-powered structure guidance</span>
                </div>
            </div>
            {Object.entries(MOCK_BEAT_SUGGESTIONS).map(([beatId, suggestion]) => (
                <div key={beatId} className="kleo-card">
                    <div className="kleo-card-label">{beatId.replace(/-/g, ' ')}</div>
                    <p className="kleo-card-text">{suggestion}</p>
                    <div className="kleo-card-actions">
                        <button className="kleo-btn-accept">
                            <Check size={12} /> Apply
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function CharacterTab({ projectId }) {
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);

    // Extract characters from character blocks
    const characters = {};
    blocks.forEach((block, i) => {
        if (block.type === 'character' && block.text.trim()) {
            const name = block.text.trim().toUpperCase();
            if (!characters[name]) {
                characters[name] = { name, count: 0, firstBlock: i };
            }
            characters[name].count++;
        }
    });

    const charList = Object.values(characters);

    return (
        <div>
            <div className="kleo-header">
                <div className="kleo-avatar">K</div>
                <div>
                    <h4>Characters Detected</h4>
                    <span>{charList.length} characters found</span>
                </div>
            </div>
            {charList.length > 0 ? (
                charList.map((char) => (
                    <div key={char.name} className="char-tag-card">
                        <div className="char-tag-avatar">
                            {char.name.charAt(0)}
                        </div>
                        <div className="char-tag-info">
                            <div className="char-tag-name">{char.name}</div>
                            <div className="char-tag-scene">
                                {char.count} dialogue block{char.count > 1 ? 's' : ''}
                            </div>
                        </div>
                        <span className="char-tag-count">{char.count}×</span>
                    </div>
                ))
            ) : (
                <div className="kleo-placeholder">
                    <Users size={32} />
                    <p>No characters detected yet.<br />Write character dialogue to see them here.</p>
                </div>
            )}
        </div>
    );
}

function RewriteTab() {
    return (
        <div className="kleo-placeholder">
            <Wand2 size={32} />
            <p>Select text in the editor to get rewrite suggestions from Kleo.</p>
        </div>
    );
}

export default function KleoPanel({ projectId, activeTab }) {
    const tabs = {
        logline: LoglineTab,
        'beat-help': BeatHelpTab,
        characters: CharacterTab,
        rewrite: RewriteTab,
    };

    const ActiveTabComponent = tabs[activeTab] || LoglineTab;

    return <ActiveTabComponent projectId={projectId} />;
}
