import { v4 as uuidv4 } from 'uuid';

// Helper to generate IDs for templates so they are stable in memory
const generateId = () => uuidv4();

const beatFrameworks = [
    {
        id: 'framework-savethecat',
        frameworkName: 'Save the Cat (Blake Snyder)',
        category: 'film',
        isSystemTemplate: true,
        totalExpectedPages: 110,
        beats: [
            { title: 'Opening Image', description: 'A visual that represents the hero\'s starting state.', targetPagePercentStart: 0, targetPagePercentEnd: 1, emotionalTones: ['Establishing'], children: [] },
            { title: 'Theme Stated', description: 'A character (usually not the hero) states the core theme or lesson the hero needs to learn.', targetPagePercentStart: 4, targetPagePercentEnd: 5, emotionalTones: ['Thematic'], children: [] },
            { title: 'Set-Up', description: 'Establishes the hero\'s life, flaws, and the "Six Things That Need Fixing".', targetPagePercentStart: 1, targetPagePercentEnd: 9, emotionalTones: ['Establishing'], children: [] },
            { title: 'Catalyst', description: 'The inciting incident. A life-changing event that shatters the hero\'s status quo.', targetPagePercentStart: 10, targetPagePercentEnd: 11, emotionalTones: ['Disruption'], children: [] },
            { title: 'Debate', description: 'The hero hesitates. Can they actually do this? A moment of doubt before committing.', targetPagePercentStart: 11, targetPagePercentEnd: 22, emotionalTones: ['Doubt', 'Tension'], children: [] },
            { title: 'Break into Two', description: 'The hero makes a choice and leaves the normal world to enter the upside-down world of Act 2.', targetPagePercentStart: 22, targetPagePercentEnd: 23, emotionalTones: ['Action', 'Commitment'], children: [] },
            { title: 'B Story', description: 'Introduction of the secondary plot, often the love interest or the character who helps the hero learn the theme.', targetPagePercentStart: 27, targetPagePercentEnd: 28, emotionalTones: ['Warmth', 'Connection'], children: [] },
            { title: 'Fun and Games', description: 'The promise of the premise. The hero explores the new world. Trailers are made of this section.', targetPagePercentStart: 27, targetPagePercentEnd: 50, emotionalTones: ['Fun', 'Discovery'], children: [] },
            { title: 'Midpoint', description: 'A false victory or false defeat. The stakes are raised, and the clock starts ticking.', targetPagePercentStart: 50, targetPagePercentEnd: 51, emotionalTones: ['Turning Point', 'Escalation'], children: [] },
            { title: 'Bad Guys Close In', description: 'Internal and external forces tighten around the hero. Things get tougher.', targetPagePercentStart: 51, targetPagePercentEnd: 68, emotionalTones: ['Tension', 'Dread'], children: [] },
            { title: 'All Is Lost', description: 'The lowest point. The false victory is exposed, or the mentor dies. "Whiff of death".', targetPagePercentStart: 68, targetPagePercentEnd: 69, emotionalTones: ['Despair', 'Loss'], children: [] },
            { title: 'Dark Night of the Soul', description: 'The hero wallows in hopelessness. They must figure out the theme to survive.', targetPagePercentStart: 69, targetPagePercentEnd: 77, emotionalTones: ['Despair', 'Reflection'], children: [] },
            { title: 'Break into Three', description: 'The hero finally realizes what they must do. They combine the A and B stories to find the solution.', targetPagePercentStart: 77, targetPagePercentEnd: 78, emotionalTones: ['Hope', 'Action'], children: [] },
            { title: 'Finale', description: 'The climax. The hero confronts the villain or the central conflict, proving they have learned the theme.', targetPagePercentStart: 78, targetPagePercentEnd: 99, emotionalTones: ['Action', 'Tension', 'Triumph'], children: [] },
            { title: 'Final Image', description: 'A visual that proves the hero has changed, mirroring the Opening Image.', targetPagePercentStart: 99, targetPagePercentEnd: 100, emotionalTones: ['Resolution'], children: [] }
        ]
    },
    {
        id: 'framework-threeact',
        frameworkName: 'Three-Act Paradigm (Syd Field)',
        category: 'film',
        isSystemTemplate: true,
        totalExpectedPages: 120,
        beats: [
            {
                title: 'Act I: Setup',
                description: 'Establish the world, the protagonist, and the dramatic premise.',
                targetPagePercentStart: 0,
                targetPagePercentEnd: 25,
                emotionalTones: ['Establishing'],
                children: [
                    { title: 'Inciting Incident', description: 'The event that sets the story in motion.', targetPagePercentStart: 8, targetPagePercentEnd: 12, emotionalTones: ['Disruption'], children: [] },
                    { title: 'Plot Point 1', description: 'The protagonist commits to the journey, spinning the story into Act II.', targetPagePercentStart: 23, targetPagePercentEnd: 25, emotionalTones: ['Action'], children: [] }
                ]
            },
            {
                title: 'Act II: Confrontation',
                description: 'The protagonist pursues their goal, encountering escalating obstacles.',
                targetPagePercentStart: 25,
                targetPagePercentEnd: 75,
                emotionalTones: ['Tension', 'Conflict'],
                children: [
                    { title: 'Midpoint', description: 'A major revelation or turning point that shifts the protagonist\'s understanding.', targetPagePercentStart: 48, targetPagePercentEnd: 52, emotionalTones: ['Turning Point'], children: [] },
                    { title: 'Plot Point 2', description: 'A major setback that spins the story into the final act.', targetPagePercentStart: 73, targetPagePercentEnd: 75, emotionalTones: ['Despair'], children: [] }
                ]
            },
            {
                title: 'Act III: Resolution',
                description: 'The climax and the resolution of the story.',
                targetPagePercentStart: 75,
                targetPagePercentEnd: 100,
                emotionalTones: ['Action', 'Resolution'],
                children: [
                    { title: 'Climax', description: 'The final, ultimate confrontation.', targetPagePercentStart: 90, targetPagePercentEnd: 95, emotionalTones: ['Triumph'], children: [] }
                ]
            }
        ]
    },
    {
        id: 'framework-herosjourney',
        frameworkName: 'The Hero\'s Journey (Campbell/Vogler)',
        category: 'film',
        isSystemTemplate: true,
        totalExpectedPages: 120,
        beats: [
            { title: 'Ordinary World', description: 'The hero\'s normal life before the adventure.', targetPagePercentStart: 0, targetPagePercentEnd: 10, emotionalTones: ['Establishing'], children: [] },
            { title: 'Call to Adventure', description: 'The hero is presented with a problem, challenge, or adventure.', targetPagePercentStart: 10, targetPagePercentEnd: 15, emotionalTones: ['Disruption'], children: [] },
            { title: 'Refusal of the Call', description: 'The hero hesitates or refuses out of fear.', targetPagePercentStart: 15, targetPagePercentEnd: 20, emotionalTones: ['Doubt'], children: [] },
            { title: 'Meeting the Mentor', description: 'The hero gains advice, training, or magical gifts from a mentor.', targetPagePercentStart: 20, targetPagePercentEnd: 25, emotionalTones: ['Connection'], children: [] },
            { title: 'Crossing the Threshold', description: 'The hero leaves the ordinary world and enters the special world.', targetPagePercentStart: 25, targetPagePercentEnd: 30, emotionalTones: ['Action'], children: [] },
            { title: 'Tests, Allies, Enemies', description: 'The hero learns the rules of the special world.', targetPagePercentStart: 30, targetPagePercentEnd: 50, emotionalTones: ['Discovery', 'Conflict'], children: [] },
            { title: 'Approach to the Inmost Cave', description: 'The hero prepares for the major challenge.', targetPagePercentStart: 50, targetPagePercentEnd: 60, emotionalTones: ['Tension'], children: [] },
            { title: 'The Ordeal', description: 'The hero confronts death or their greatest fear. Out of the moment of death comes a new life.', targetPagePercentStart: 60, targetPagePercentEnd: 70, emotionalTones: ['Dread', 'Turning Point'], children: [] },
            { title: 'Reward (Seizing the Sword)', description: 'The hero takes possession of the treasure won by facing death.', targetPagePercentStart: 70, targetPagePercentEnd: 75, emotionalTones: ['Triumph'], children: [] },
            { title: 'The Road Back', description: 'The hero is driven to complete the adventure, leaving the special world.', targetPagePercentStart: 75, targetPagePercentEnd: 85, emotionalTones: ['Action'], children: [] },
            { title: 'The Resurrection', description: 'The hero faces a final, severe test that purifies them. The climax.', targetPagePercentStart: 85, targetPagePercentEnd: 95, emotionalTones: ['Tension', 'Action'], children: [] },
            { title: 'Return with the Elixir', description: 'The hero returns home, transformed, bringing back the "elixir" to benefit the ordinary world.', targetPagePercentStart: 95, targetPagePercentEnd: 100, emotionalTones: ['Resolution'], children: [] }
        ]
    },
    {
        id: 'framework-tv-5act',
        frameworkName: 'Cold Open + Five Acts',
        category: 'television',
        isSystemTemplate: true,
        totalExpectedPages: 60, // 1 hour drama
        beats: [
            { title: 'Cold Open / Teaser', description: 'The hook before the opening credits.', targetPagePercentStart: 0, targetPagePercentEnd: 5, emotionalTones: ['Tension', 'Curiosity'], children: [] },
            { title: 'Act 1: Introduction', description: 'Introduce the main engine of the episode and stakes.', targetPagePercentStart: 5, targetPagePercentEnd: 25, emotionalTones: ['Establishing'], children: [] },
            { title: 'Act 2: Complication', description: 'Things get harder. First attempt to solve the problem fails.', targetPagePercentStart: 25, targetPagePercentEnd: 45, emotionalTones: ['Conflict'], children: [] },
            { title: 'Act 3: Midpoint Escalation', description: 'Major twist or raising of stakes at the exact midpoint.', targetPagePercentStart: 45, targetPagePercentEnd: 60, emotionalTones: ['Turning Point'], children: [] },
            { title: 'Act 4: False Resolution / Deepest Pit', description: 'Things seem resolved (but aren\'t) or things hit rock bottom.', targetPagePercentStart: 60, targetPagePercentEnd: 80, emotionalTones: ['Despair'], children: [] },
            { title: 'Act 5: Climax & Tag', description: 'The final confrontation and the brief resolution/cliffhanger (the Tag).', targetPagePercentStart: 80, targetPagePercentEnd: 100, emotionalTones: ['Resolution'], children: [] }
        ]
    },
    {
        id: 'framework-storycircle',
        frameworkName: 'Dan Harmon\'s Story Circle',
        category: 'television',
        isSystemTemplate: true,
        totalExpectedPages: 30, // Often used in 30-min formats
        beats: [
            { title: '1. You (A character is in a zone of comfort)', description: 'Establish the protagonist\'s normal life.', targetPagePercentStart: 0, targetPagePercentEnd: 12, emotionalTones: ['Establishing'], children: [] },
            { title: '2. Need (But they want something)', description: 'Establish the desire or lack.', targetPagePercentStart: 12, targetPagePercentEnd: 25, emotionalTones: ['Yearning'], children: [] },
            { title: '3. Go (They enter an unfamiliar situation)', description: 'Crossing the threshold.', targetPagePercentStart: 25, targetPagePercentEnd: 37, emotionalTones: ['Action'], children: [] },
            { title: '4. Search (Adapt to it)', description: 'Trials and learning the rules.', targetPagePercentStart: 37, targetPagePercentEnd: 50, emotionalTones: ['Discovery'], children: [] },
            { title: '5. Find (Get what they wanted)', description: 'The midpoint meeting with the goddess / obtaining the object.', targetPagePercentStart: 50, targetPagePercentEnd: 62, emotionalTones: ['Triumph'], children: [] },
            { title: '6. Take (Pay a heavy price for it)', description: 'The real consequences set in.', targetPagePercentStart: 62, targetPagePercentEnd: 75, emotionalTones: ['Dread'], children: [] },
            { title: '7. Return (Go back to where they started)', description: 'Heading back to the familiar world.', targetPagePercentStart: 75, targetPagePercentEnd: 87, emotionalTones: ['Action'], children: [] },
            { title: '8. Change (Now capable of change)', description: 'Applying the lesson learned to the familiar world.', targetPagePercentStart: 87, targetPagePercentEnd: 100, emotionalTones: ['Resolution'], children: [] }
        ]
    },
    {
        id: 'framework-horror',
        frameworkName: 'Horror Structure (Dread Cycle)',
        category: 'genre',
        isSystemTemplate: true,
        totalExpectedPages: 100,
        beats: [
            { title: 'Setup Normalcy', description: 'Establish the ordinary world that is about to be violated.', targetPagePercentStart: 0, targetPagePercentEnd: 15, emotionalTones: ['Establishing'], children: [] },
            { title: 'Introduce Unease', description: 'Something is wrong, but it can be rationalized.', targetPagePercentStart: 15, targetPagePercentEnd: 25, emotionalTones: ['Curiosity', 'Tension'], children: [] },
            { title: 'First Scare', description: 'The threat manifests undeniably, though perhaps only briefly.', targetPagePercentStart: 25, targetPagePercentEnd: 35, emotionalTones: ['Dread'], children: [] },
            { title: 'False Safety', description: 'The characters believe they have handled or escaped the threat.', targetPagePercentStart: 35, targetPagePercentEnd: 50, emotionalTones: ['Hope'], children: [] },
            { title: 'Escalation', description: 'The threat returns, stronger, targeting the characters\' specific vulnerabilities.', targetPagePercentStart: 50, targetPagePercentEnd: 75, emotionalTones: ['Tension', 'Despair'], children: [] },
            { title: 'Dark Night', description: 'The characters are trapped or lose their best defense.', targetPagePercentStart: 75, targetPagePercentEnd: 85, emotionalTones: ['Despair'], children: [] },
            { title: 'Climactic Confrontation', description: 'The final, desperate battle for survival.', targetPagePercentStart: 85, targetPagePercentEnd: 95, emotionalTones: ['Action', 'Dread'], children: [] },
            { title: 'New Normal / Destruction', description: 'Survival (but changed) or an ending where the evil endures.', targetPagePercentStart: 95, targetPagePercentEnd: 100, emotionalTones: ['Resolution'], children: [] }
        ]
    }
];

export default beatFrameworks;
