import React, { useState, useMemo } from 'react';
import { Sparkles, Check, X, MessageSquare, Wand2, Users, RefreshCw } from 'lucide-react';
import useEditorStore from '../stores/editorStore';
import useProjectStore from '../stores/projectStore';
import '../styles/kleo-panel.css';

// ── Smart Script Analysis Engine ──
function analyzeScript(blocks) {
    const characters = {};
    const settings = [];
    const conflictWords = [];
    const actionTexts = [];
    let currentChar = null;

    const CONFLICT_KEYWORDS = [
        'kill', 'fight', 'escape', 'destroy', 'save', 'stop', 'hunt', 'chase',
        'betray', 'revenge', 'steal', 'attack', 'defend', 'confront', 'threaten',
        'die', 'murder', 'war', 'danger', 'fear', 'trap', 'lie', 'secret',
        'discover', 'reveal', 'hide', 'lose', 'survive', 'protect', 'rescue',
        'kidnap', 'investigate', 'suspect', 'guilty', 'innocent', 'accused',
        'missing', 'dead', 'explosion', 'crash', 'run', 'gun', 'bomb',
        'love', 'hate', 'obsess', 'jealous', 'affair', 'broken', 'abandon',
    ];

    const STAKES_WORDS = [
        'death', 'die', 'destroy', 'end', 'lose', 'forever', 'never',
        'everyone', 'world', 'city', 'family', 'everything', 'life', 'lives',
        'time', 'deadline', 'midnight', 'dawn', 'before', 'too late',
    ];

    blocks.forEach((block, i) => {
        if (block.type === 'scene-heading' && block.text.trim()) {
            const heading = block.text.trim().toUpperCase();
            // Extract location from scene heading (e.g., "INT. COFFEE SHOP - DAY" -> "COFFEE SHOP")
            const match = heading.match(/(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*(.+?)(?:\s*-\s*(DAY|NIGHT|DAWN|DUSK|EVENING|MORNING|LATER|CONTINUOUS|SAME).*)?$/i);
            if (match && match[1]) {
                settings.push(match[1].trim());
            }
        }

        if (block.type === 'character' && block.text.trim()) {
            const name = block.text.trim().toUpperCase().replace(/\s*\(.*\)$/, '');
            currentChar = name;
            if (!characters[name]) {
                characters[name] = { dialogueCount: 0, words: 0 };
            }
            characters[name].dialogueCount++;
        }

        if (block.type === 'dialogue' && currentChar && block.text.trim()) {
            const words = block.text.trim().split(/\s+/).filter(Boolean);
            characters[currentChar].words += words.length;
        }

        if (block.type === 'action' && block.text.trim()) {
            const text = block.text.trim().toLowerCase();
            actionTexts.push(text);
            const words = text.split(/\s+/);
            words.forEach(w => {
                const clean = w.replace(/[^a-z]/g, '');
                if (CONFLICT_KEYWORDS.includes(clean)) {
                    conflictWords.push(clean);
                }
            });
        }

        if (block.type !== 'dialogue' && block.type !== 'parenthetical') {
            if (block.type !== 'character') currentChar = null;
        }
    });

    // Find protagonist (most dialogue)
    const charEntries = Object.entries(characters).sort((a, b) => b[1].words - a[1].words);
    const protagonist = charEntries.length > 0 ? charEntries[0][0] : null;
    const antagonist = charEntries.length > 1 ? charEntries[1][0] : null;

    // Deduplicate settings, pick the most common
    const settingCounts = {};
    settings.forEach(s => { settingCounts[s] = (settingCounts[s] || 0) + 1; });
    const topSettings = Object.entries(settingCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([s]) => s);

    // Most frequent conflict words
    const conflictCounts = {};
    conflictWords.forEach(w => { conflictCounts[w] = (conflictCounts[w] || 0) + 1; });
    const topConflicts = Object.entries(conflictCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([w]) => w);

    // Extract stakes from action text
    const stakesFound = [];
    const allActionText = actionTexts.join(' ');
    STAKES_WORDS.forEach(sw => {
        if (allActionText.includes(sw)) stakesFound.push(sw);
    });

    return {
        protagonist,
        antagonist,
        topSettings,
        topConflicts,
        stakesFound,
        characterCount: charEntries.length,
        sceneCount: blocks.filter(b => b.type === 'scene-heading').length,
    };
}

function formatName(name) {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function generateLoglines(analysis) {
    const { protagonist, antagonist, topSettings, topConflicts, stakesFound, sceneCount } = analysis;

    if (!protagonist) {
        return [{
            label: 'No Data Yet',
            text: 'Write some character dialogue and action blocks to generate logline variants from your script.',
        }];
    }

    const protName = formatName(protagonist);
    const antName = antagonist ? formatName(antagonist) : 'a formidable adversary';
    const setting = topSettings.length > 0 ? topSettings[0].toLowerCase() : 'a world on the brink';
    const settingArticle = /^[aeiou]/i.test(setting) ? 'an' : 'a';

    // Build inciting incident from conflicts
    const conflictVerbs = {
        kill: 'a deadly threat emerges', fight: 'conflict erupts', escape: 'a desperate escape begins',
        destroy: 'destruction looms', save: 'a life hangs in the balance', stop: 'time runs out',
        hunt: 'the hunt begins', chase: 'a relentless pursuit unfolds', betray: 'betrayal shatters trust',
        revenge: 'a quest for vengeance ignites', steal: 'a daring heist goes wrong',
        attack: 'an attack changes everything', confront: 'a confrontation becomes inevitable',
        threaten: 'a threat emerges', discover: 'a shocking discovery is made',
        reveal: 'a secret is revealed', hide: 'the truth must stay hidden',
        love: 'an unexpected connection forms', investigate: 'a mystery demands answers',
        suspect: 'suspicion falls on the wrong person', missing: 'someone goes missing',
        murder: 'a murder upends everything', secret: 'a buried secret resurfaces',
    };

    let incitingIncident = 'their world is turned upside down';
    for (const c of topConflicts) {
        if (conflictVerbs[c]) {
            incitingIncident = conflictVerbs[c];
            break;
        }
    }

    // Build stakes
    const stakesMap = {
        death: 'their own survival', die: 'everyone they love', destroy: 'total destruction',
        world: 'the fate of the world', family: 'their family', everything: 'everything they hold dear',
        life: 'life itself', lives: 'innocent lives', city: 'the entire city',
        time: 'time runs out', deadline: 'an impossible deadline', forever: 'an irreversible loss',
    };
    let stakes = 'everything falls apart';
    for (const s of stakesFound) {
        if (stakesMap[s]) {
            stakes = stakesMap[s];
            break;
        }
    }

    // Build goal from conflicts
    const goalMap = {
        save: 'save those they love', escape: 'find a way out', stop: 'stop the unthinkable',
        fight: 'fight for what matters', hunt: 'track down the truth', investigate: 'uncover the truth',
        protect: 'protect the innocent', rescue: 'mount a rescue', survive: 'survive against all odds',
        reveal: 'expose the truth', confront: 'face their demons', discover: 'solve the mystery',
    };
    let goal = 'navigate a dangerous path';
    for (const c of topConflicts) {
        if (goalMap[c]) {
            goal = goalMap[c];
            break;
        }
    }

    const variants = [];

    // 1. Classic structure: "When [protagonist] [inciting], they must [goal] before [stakes]"
    variants.push({
        label: 'Classic Structure',
        text: `When ${protName} finds themselves in ${settingArticle} ${setting} where ${incitingIncident}, they must ${goal} before ${stakes}.`,
    });

    // 2. Short & Punchy
    const punchyConflict = topConflicts.length > 0 ? topConflicts[0] : 'survive';
    const punchyVerbs = {
        kill: 'kill or be killed', fight: 'fight back', escape: 'break free',
        save: 'save everyone', stop: 'stop the clock', hunt: 'become the hunter',
        betray: 'trust no one', revenge: 'settle the score', love: 'risk everything for love',
        investigate: 'find the truth', discover: 'face what they find', murder: 'catch a killer',
    };
    const punchyAction = punchyVerbs[punchyConflict] || 'face impossible odds';
    variants.push({
        label: 'Short & Punchy',
        text: `${protName}. ${formatName(setting)}. One chance to ${punchyAction} — or lose it all.`,
    });

    // 3. Commercial version
    const genreHint = topConflicts.some(c => ['murder', 'kill', 'investigate', 'suspect', 'guilty'].includes(c))
        ? 'thriller' : topConflicts.some(c => ['love', 'affair', 'jealous'].includes(c))
            ? 'drama' : topConflicts.some(c => ['escape', 'chase', 'attack', 'bomb', 'gun'].includes(c))
                ? 'action' : 'story';

    const commercialOpener = {
        thriller: 'In this gripping thriller,',
        drama: 'In this powerful drama,',
        action: 'In this pulse-pounding ride,',
        story: 'In this compelling story,',
    };

    variants.push({
        label: 'Commercial Pitch',
        text: `${commercialOpener[genreHint]} ${protName} must ${goal} when ${incitingIncident} in ${settingArticle} ${setting}. With ${antName} closing in and ${stakes} at stake, nothing is what it seems.`,
    });

    return variants;
}

// ── Beat Suggestions (context-aware) ──
function generateBeatSuggestions(blocks) {
    const totalBlocks = blocks.length;
    const sceneHeadings = blocks.filter(b => b.type === 'scene-heading');
    const sceneCount = sceneHeadings.length;
    const wordCount = blocks.reduce((sum, b) => sum + (b.text?.split(/\s+/).filter(Boolean).length || 0), 0);
    const pageEstimate = Math.max(1, Math.round(wordCount / 250));

    const suggestions = {};

    if (pageEstimate < 5) {
        suggestions['opening-image'] = 'Your script is just getting started. Consider opening with a vivid visual that immediately establishes tone and world. Show your protagonist in their ordinary world before disruption.';
    } else {
        suggestions['opening-image'] = `At ~${pageEstimate} pages, ensure your opening image arrives in the first 1-2 pages. It should visually capture the theme and set audience expectations.`;
    }

    if (sceneCount < 3) {
        suggestions['catalyst'] = 'You need more scenes to establish a clear catalyst. The catalyst should arrive around page 12 (10% mark) — an unmistakable event that disrupts normalcy.';
    } else {
        const catalystScene = Math.max(1, Math.round(sceneCount * 0.1));
        suggestions['catalyst'] = `With ${sceneCount} scenes, your catalyst beat should land around scene ${catalystScene}. Look for a clear disruption — a phone call, discovery, or encounter that forces your protagonist to act.`;
    }

    const midSceneIdx = Math.round(sceneCount * 0.5);
    suggestions['midpoint'] = `Your midpoint should fall around scene ${midSceneIdx || 1}. This is where stakes raise dramatically. Consider a false victory that reveals a deeper problem, or a revelation that changes the protagonist's approach entirely.`;

    const lowPointIdx = Math.round(sceneCount * 0.75);
    suggestions['all-is-lost'] = `The "All Is Lost" moment belongs around scene ${lowPointIdx || 1}. Something or someone the hero relied on should be stripped away. Consider a death, betrayal, or devastating revelation that forces internal change.`;

    suggestions['finale'] = `Your finale (final ${Math.max(1, Math.round(sceneCount * 0.12))} scenes) should weave together all story threads. The hero applies everything learned to face their ultimate challenge. Ensure the climax feels earned by the character arc.`;

    return suggestions;
}

function LoglineTab({ projectId }) {
    const [accepted, setAccepted] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);
    const updateProject = useProjectStore((s) => s.updateProject);

    const loglines = useMemo(() => {
        const analysis = analyzeScript(blocks);
        return generateLoglines(analysis);
    }, [blocks, refreshKey]);

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
                    <span>{loglines.length} variants from your script</span>
                </div>
                <button
                    className="kleo-refresh-btn"
                    onClick={() => setRefreshKey(k => k + 1)}
                    title="Regenerate"
                >
                    <RefreshCw size={12} />
                </button>
            </div>
            {loglines.map((variant, i) => (
                <div key={i} className="kleo-card">
                    <div className="kleo-card-label">{variant.label}</div>
                    <p className="kleo-card-text">{variant.text}</p>
                    {variant.label !== 'No Data Yet' && (
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
                    )}
                </div>
            ))}
        </div>
    );
}

function BeatHelpTab({ projectId }) {
    const blocks = useEditorStore((s) => s.blocksByProject[projectId] || []);

    const beatSuggestions = useMemo(() => {
        return generateBeatSuggestions(blocks);
    }, [blocks]);

    return (
        <div>
            <div className="kleo-header">
                <div className="kleo-avatar">K</div>
                <div>
                    <h4>Beat Suggestions</h4>
                    <span>Structure guidance from your script</span>
                </div>
            </div>
            {Object.entries(beatSuggestions).map(([beatId, suggestion]) => (
                <div key={beatId} className="kleo-card">
                    <div className="kleo-card-label">{beatId.replace(/-/g, ' ')}</div>
                    <p className="kleo-card-text">{suggestion}</p>
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
                        <span className="char-tag-count">{char.count}x</span>
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
