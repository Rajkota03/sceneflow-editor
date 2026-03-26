/**
 * SceneFlow — File Import/Export Operations
 *
 * Import: FDX, Fountain, TXT, PDF
 * Export: PDF (direct download via jsPDF), FDX, Fountain, TXT
 */

import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';

// ═══════════════════════════════════════════════
//  BLOCK TYPE CONSTANTS
// ═══════════════════════════════════════════════

const ELEMENT_MAP_FDX = {
    'Scene Heading': 'scene-heading',
    'Action': 'action',
    'Character': 'character',
    'Dialogue': 'dialogue',
    'Parenthetical': 'parenthetical',
    'Transition': 'transition',
    'General': 'action',
    'Shot': 'scene-heading',
};

const REVERSE_ELEMENT_MAP_FDX = {
    'scene-heading': 'Scene Heading',
    'action': 'Action',
    'character': 'Character',
    'dialogue': 'Dialogue',
    'parenthetical': 'Parenthetical',
    'transition': 'Transition',
};

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════

function generateId() {
    return crypto.randomUUID ? crypto.randomUUID() :
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
}

function triggerDownload(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════
//  IMPORT: FDX (Final Draft XML)
// ═══════════════════════════════════════════════

export function importFDX(fileContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(fileContent, 'text/xml');
    const paragraphs = doc.querySelectorAll('Paragraph');
    const blocks = [];

    paragraphs.forEach((p) => {
        const elementType = p.getAttribute('Type') || 'Action';
        const blockType = ELEMENT_MAP_FDX[elementType] || 'action';

        // Combine all Text nodes within the paragraph
        const textNodes = p.querySelectorAll('Text');
        let text = '';
        textNodes.forEach((t) => {
            text += t.textContent || '';
        });

        if (text.trim() || blockType === 'scene-heading') {
            blocks.push({
                id: generateId(),
                type: blockType,
                text: text.trim(),
            });
        }
    });

    return blocks.length > 0 ? blocks : [{ id: generateId(), type: 'scene-heading', text: '' }];
}

// ═══════════════════════════════════════════════
//  IMPORT: Fountain
// ═══════════════════════════════════════════════

export function importFountain(fileContent) {
    const lines = fileContent.split('\n');
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip empty lines
        if (trimmed === '') {
            i++;
            continue;
        }

        // Title page (skip key: value pairs at start)
        if (i < 10 && /^[A-Za-z ]+:/.test(trimmed) && blocks.length === 0) {
            i++;
            continue;
        }

        // Scene heading: starts with INT., EXT., INT./EXT., or forced with .
        if (/^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)/.test(trimmed) || trimmed.startsWith('.')) {
            blocks.push({
                id: generateId(),
                type: 'scene-heading',
                text: trimmed.startsWith('.') ? trimmed.slice(1).trim() : trimmed,
            });
            i++;
            continue;
        }

        // Transition: ends with TO: or forced with >
        if (/^[A-Z\s]+TO:$/.test(trimmed) || trimmed.startsWith('>')) {
            blocks.push({
                id: generateId(),
                type: 'transition',
                text: trimmed.startsWith('>') ? trimmed.slice(1).trim() : trimmed,
            });
            i++;
            continue;
        }

        // Character: ALL CAPS line (preceded by empty line, followed by dialogue)
        if (/^[A-Z][A-Z\s\d.(')\-]+$/.test(trimmed) && !trimmed.endsWith(':')) {
            const prevLine = i > 0 ? lines[i - 1].trim() : '';
            const nextLine = i + 1 < lines.length ? lines[i + 1] : '';

            if (prevLine === '' || blocks.length === 0) {
                blocks.push({
                    id: generateId(),
                    type: 'character',
                    text: trimmed,
                });
                i++;

                // Look for parenthetical and dialogue
                while (i < lines.length) {
                    const nextTrimmed = lines[i].trim();
                    if (nextTrimmed === '') break;

                    if (nextTrimmed.startsWith('(') && nextTrimmed.endsWith(')')) {
                        blocks.push({
                            id: generateId(),
                            type: 'parenthetical',
                            text: nextTrimmed.slice(1, -1),
                        });
                    } else {
                        blocks.push({
                            id: generateId(),
                            type: 'dialogue',
                            text: nextTrimmed,
                        });
                    }
                    i++;
                }
                continue;
            }
        }

        // Default: Action
        blocks.push({
            id: generateId(),
            type: 'action',
            text: trimmed,
        });
        i++;
    }

    return blocks.length > 0 ? blocks : [{ id: generateId(), type: 'scene-heading', text: '' }];
}

// ═══════════════════════════════════════════════
//  IMPORT: TXT (plain text → action blocks)
// ═══════════════════════════════════════════════

export function importTXT(fileContent) {
    const lines = fileContent.split('\n').filter((l) => l.trim() !== '');
    const blocks = lines.map((line) => ({
        id: generateId(),
        type: 'action',
        text: line.trim(),
    }));
    return blocks.length > 0 ? blocks : [{ id: generateId(), type: 'scene-heading', text: '' }];
}

// ═══════════════════════════════════════════════
//  IMPORT: PDF (via pdfjs-dist)
// ═══════════════════════════════════════════════

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

/**
 * Heuristic analysis of extracted PDF text to detect screenplay elements.
 * Patterns:
 *   - Lines starting with INT./EXT. = Scene Heading
 *   - ALL CAPS lines preceded by blank line = Character
 *   - Lines ending with TO: = Transition
 *   - Lines in parentheses = Parenthetical
 *   - Indented text after Character = Dialogue
 *   - Everything else = Action
 */
function classifyScreenplayLines(rawText) {
    const lines = rawText.split('\n');
    const blocks = [];
    let i = 0;
    let lastType = null;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip empty lines
        if (trimmed === '') {
            i++;
            lastType = null;
            continue;
        }

        // Scene heading: starts with INT. / EXT. / INT./EXT. / I/E.
        if (/^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.|INT\/EXT)/i.test(trimmed)) {
            blocks.push({
                id: generateId(),
                type: 'scene-heading',
                text: trimmed,
            });
            lastType = 'scene-heading';
            i++;
            continue;
        }

        // Transition: ends with TO: (e.g., CUT TO:, FADE TO:, DISSOLVE TO:)
        if (/^[A-Z\s]+TO:$/.test(trimmed) || /^FADE (IN|OUT)[.:]?$/i.test(trimmed)) {
            blocks.push({
                id: generateId(),
                type: 'transition',
                text: trimmed,
            });
            lastType = 'transition';
            i++;
            continue;
        }

        // Parenthetical: line wrapped in parentheses
        if (/^\(.*\)$/.test(trimmed)) {
            blocks.push({
                id: generateId(),
                type: 'parenthetical',
                text: trimmed.slice(1, -1),
            });
            lastType = 'parenthetical';
            i++;
            continue;
        }

        // Character: ALL CAPS line (at least 2 chars, may have (V.O.), (O.S.), (CONT'D))
        // Must be preceded by a blank line or be after action/scene-heading
        const isAllCaps = /^[A-Z][A-Z\s\d.(')\-]+$/.test(trimmed) && trimmed.length >= 2;
        const prevLineEmpty = i === 0 || lines[i - 1].trim() === '';
        const hasCharExtension = /\((V\.?O\.?|O\.?S\.?|O\.?C\.?|CONT['']?D)\)$/i.test(trimmed);

        if ((isAllCaps || hasCharExtension) && prevLineEmpty && !trimmed.endsWith(':')) {
            // Check if next non-empty line looks like dialogue (not a scene heading or all caps)
            let nextIdx = i + 1;
            while (nextIdx < lines.length && lines[nextIdx].trim() === '') nextIdx++;
            const nextLine = nextIdx < lines.length ? lines[nextIdx].trim() : '';
            const nextLooksLikeDialogue = nextLine !== '' &&
                !(/^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)/i.test(nextLine)) &&
                !(/^[A-Z\s]+TO:$/.test(nextLine));

            if (nextLooksLikeDialogue || hasCharExtension) {
                blocks.push({
                    id: generateId(),
                    type: 'character',
                    text: trimmed,
                });
                lastType = 'character';
                i++;

                // Consume following parenthetical and dialogue lines
                while (i < lines.length) {
                    const nextTrimmed = lines[i].trim();
                    if (nextTrimmed === '') break;

                    if (/^\(.*\)$/.test(nextTrimmed)) {
                        blocks.push({
                            id: generateId(),
                            type: 'parenthetical',
                            text: nextTrimmed.slice(1, -1),
                        });
                        lastType = 'parenthetical';
                    } else {
                        blocks.push({
                            id: generateId(),
                            type: 'dialogue',
                            text: nextTrimmed,
                        });
                        lastType = 'dialogue';
                    }
                    i++;
                }
                continue;
            }
        }

        // If the previous block was a character or parenthetical, treat as dialogue
        if (lastType === 'character' || lastType === 'parenthetical') {
            blocks.push({
                id: generateId(),
                type: 'dialogue',
                text: trimmed,
            });
            lastType = 'dialogue';
            i++;
            continue;
        }

        // Default: Action
        blocks.push({
            id: generateId(),
            type: 'action',
            text: trimmed,
        });
        lastType = 'action';
        i++;
    }

    return blocks;
}

/**
 * Import a PDF file and convert it to screenplay blocks.
 * Reads the PDF page by page, extracts text, then runs heuristic analysis.
 * @param {ArrayBuffer} arrayBuffer - The PDF file as an ArrayBuffer
 * @returns {Promise<Array>} Array of screenplay blocks
 */
export async function importPDF(arrayBuffer) {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Sort items by vertical position (y), then horizontal (x) to reconstruct lines
        const items = textContent.items.filter(item => item.str.trim() !== '' || item.hasEOL);

        // Group text items into lines based on y-position proximity
        const lines = [];
        let currentLine = { y: null, items: [] };
        const Y_THRESHOLD = 3; // pixels of tolerance for same-line detection

        // Sort by y descending (PDF coords), then x ascending
        const sorted = [...items].sort((a, b) => {
            const yDiff = b.transform[5] - a.transform[5];
            if (Math.abs(yDiff) > Y_THRESHOLD) return yDiff;
            return a.transform[4] - b.transform[4];
        });

        for (const item of sorted) {
            const y = item.transform[5];
            if (currentLine.y === null || Math.abs(currentLine.y - y) > Y_THRESHOLD) {
                if (currentLine.items.length > 0) {
                    lines.push(currentLine);
                }
                currentLine = { y, items: [item] };
            } else {
                currentLine.items.push(item);
            }
        }
        if (currentLine.items.length > 0) {
            lines.push(currentLine);
        }

        // Convert line groups to text strings
        for (const lineGroup of lines) {
            const lineText = lineGroup.items.map(item => item.str).join('');
            fullText += lineText + '\n';
        }

        // Add a page break marker (blank line between pages)
        fullText += '\n';
    }

    const blocks = classifyScreenplayLines(fullText);
    return blocks.length > 0 ? blocks : [{ id: generateId(), type: 'scene-heading', text: '' }];
}

// ═══════════════════════════════════════════════
//  IMPORT: File reader wrapper
// ═══════════════════════════════════════════════

export function importFile(file) {
    return new Promise((resolve, reject) => {
        const ext = file.name.split('.').pop().toLowerCase();

        // PDF needs ArrayBuffer, not text
        if (ext === 'pdf') {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const blocks = await importPDF(e.target.result);
                    resolve({ blocks, filename: file.name.replace(/\.[^.]+$/, '') });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            let blocks;

            switch (ext) {
                case 'fdx':
                    blocks = importFDX(content);
                    break;
                case 'fountain':
                case 'spmd':
                    blocks = importFountain(content);
                    break;
                case 'txt':
                    blocks = importTXT(content);
                    break;
                default:
                    // Try to guess — if it has XML tags, treat as FDX
                    if (content.includes('<FinalDraft') || content.includes('<Paragraph')) {
                        blocks = importFDX(content);
                    } else {
                        blocks = importFountain(content);
                    }
            }
            resolve({ blocks, filename: file.name.replace(/\.[^.]+$/, '') });
        };

        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// ═══════════════════════════════════════════════
//  EXPORT: PDF (Direct download via jsPDF)
// ═══════════════════════════════════════════════

/**
 * Strip parenthetical extensions from a character name for comparison.
 * "JOHN (V.O.)" -> "JOHN", "MARY (CONT'D)" -> "MARY"
 */
function stripCharacterExtensions(name) {
    return name.replace(/\s*\(.*?\)\s*/g, '').trim().toUpperCase();
}

/**
 * Compute CONT'D markers for PDF export. Returns a map of block index -> marker text.
 * CONT'D: when the same character speaks again after non-dialogue intervening blocks.
 */
function computePDFContdMarkers(blocks) {
    const markers = {}; // { blockIndex: "(CONT'D)" }
    let lastSpeaker = null;
    let hadInterveningNonDialogue = false;

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.type === 'character') {
            const baseName = stripCharacterExtensions(block.text || '');
            if (baseName === lastSpeaker && hadInterveningNonDialogue) {
                markers[i] = "(CONT'D)";
            }
            lastSpeaker = baseName;
            hadInterveningNonDialogue = false;
        } else if (block.type === 'dialogue' || block.type === 'parenthetical') {
            // Still part of the current speaker's dialogue block
        } else if (block.type === 'scene-heading' || block.type === 'transition') {
            lastSpeaker = null;
            hadInterveningNonDialogue = false;
        } else {
            // Action or other non-dialogue block
            if (lastSpeaker) {
                hadInterveningNonDialogue = true;
            }
        }
    }
    return markers;
}

export function exportPDF(blocks, title = 'Screenplay', options = {}) {
    const { titlePage, showSceneNumbers } = options;
    const pdf = new jsPDF({
        unit: 'in',
        format: 'letter',  // 8.5 x 11
        orientation: 'portrait',
    });

    const LEFT_MARGIN = 1.5;
    const RIGHT_MARGIN = 1.0;
    const TOP_MARGIN = 1.0;
    const BOTTOM_MARGIN = 1.0;
    const PAGE_WIDTH = 8.5;
    const PAGE_HEIGHT = 11;
    const USABLE_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN;

    const FONT_SIZE = 12;
    const LINE_HEIGHT = FONT_SIZE / 72;
    const LINE_SPACING = LINE_HEIGHT * 1.1;
    const CHARS_PER_INCH = 10;

    let y = TOP_MARGIN;
    let pageNum = 0;
    let sceneNum = 0;

    // Pre-compute CONT'D markers
    const contdMarkers = computePDFContdMarkers(blocks);

    // Track current speaker for (MORE)/(CONT'D) at page breaks
    let currentSpeaker = null;

    pdf.setFont('Courier', 'normal');
    pdf.setFontSize(FONT_SIZE);

    // ── Title Page ──
    if (titlePage && (titlePage.author || title)) {
        pageNum = 0; // Title page = page 0 (unnumbered)
        const centerX = PAGE_WIDTH / 2;

        // Title (centered, ~4in from top)
        pdf.setFont('Courier', 'normal');
        pdf.setFontSize(24);
        pdf.text(title.toUpperCase(), centerX, 4.0, { align: 'center' });

        // "Written by" + author
        pdf.setFontSize(FONT_SIZE);
        if (titlePage.basedOn) {
            pdf.text(`Based on ${titlePage.basedOn}`, centerX, 4.8, { align: 'center' });
            pdf.text('Written by', centerX, 5.4, { align: 'center' });
            pdf.text(titlePage.author || '', centerX, 5.8, { align: 'center' });
        } else {
            pdf.text('Written by', centerX, 5.0, { align: 'center' });
            pdf.text(titlePage.author || '', centerX, 5.4, { align: 'center' });
        }

        // Bottom-left: contact info
        let footerY = 9.0;
        pdf.setFontSize(FONT_SIZE);
        if (titlePage.contact) {
            pdf.text(titlePage.contact, LEFT_MARGIN, footerY);
            footerY += LINE_SPACING * 1.5;
        }
        if (titlePage.draftDate) {
            pdf.text(titlePage.draftDate, LEFT_MARGIN, footerY);
            footerY += LINE_SPACING * 1.5;
        }
        if (titlePage.copyright) {
            pdf.text(titlePage.copyright, LEFT_MARGIN, footerY);
        }

        pdf.addPage();
    }

    pageNum = 1;
    y = TOP_MARGIN;

    const addPage = (moreCharacter = null) => {
        // If we're mid-dialogue, add (MORE) at bottom
        if (moreCharacter) {
            pdf.setFont('Courier', 'normal');
            pdf.setFontSize(FONT_SIZE);
            pdf.text('(MORE)', 3.7, y);
        }

        pdf.addPage();
        pageNum++;
        y = TOP_MARGIN;
        pdf.setFont('Courier', 'normal');
        pdf.setFontSize(FONT_SIZE);
        pdf.text(`${pageNum}.`, PAGE_WIDTH - RIGHT_MARGIN, 0.5, { align: 'right' });

        // If continuing dialogue on new page, print character name with (CONT'D)
        if (moreCharacter) {
            pdf.text(`${moreCharacter} (CONT'D)`, 3.7, y);
            y += LINE_SPACING;
        }
    };

    const checkPageBreak = (linesNeeded = 1, inDialogue = false) => {
        if (y + linesNeeded * LINE_SPACING > PAGE_HEIGHT - BOTTOM_MARGIN) {
            addPage(inDialogue ? currentSpeaker : null);
        }
    };

    const wrapText = (text, maxWidth) => {
        const maxChars = Math.floor(maxWidth * CHARS_PER_INCH);
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach((word) => {
            if ((currentLine + ' ' + word).trim().length <= maxChars) {
                currentLine = (currentLine + ' ' + word).trim();
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        });
        if (currentLine) lines.push(currentLine);
        return lines.length > 0 ? lines : [''];
    };

    blocks.forEach((block, idx) => {
        const text = block.text || '';
        if (text.trim() === '' && block.type !== 'scene-heading') return;

        let leftOffset = LEFT_MARGIN;
        let textWidth = USABLE_WIDTH;
        let displayText = text;
        let topSpacing = LINE_SPACING;
        let isDialogueBlock = false;

        switch (block.type) {
            case 'scene-heading':
                sceneNum++;
                topSpacing = idx === 0 ? 0 : LINE_SPACING * 2;
                displayText = text.toUpperCase();
                pdf.setFont('Courier', 'bold');
                currentSpeaker = null;
                break;
            case 'action':
                topSpacing = LINE_SPACING;
                pdf.setFont('Courier', 'normal');
                currentSpeaker = null;
                break;
            case 'character': {
                topSpacing = LINE_SPACING * 1.5;
                leftOffset = 3.7;
                textWidth = PAGE_WIDTH - 3.7 - RIGHT_MARGIN;
                const baseName = stripCharacterExtensions(text);
                currentSpeaker = baseName;
                // Append CONT'D if the marker exists for this block
                if (contdMarkers[idx]) {
                    displayText = text.toUpperCase() + " (CONT'D)";
                } else {
                    displayText = text.toUpperCase();
                }
                pdf.setFont('Courier', 'normal');
                break;
            }
            case 'dialogue':
                topSpacing = 0;
                leftOffset = 2.5;
                textWidth = 3.5;
                isDialogueBlock = true;
                pdf.setFont('Courier', 'normal');
                break;
            case 'parenthetical':
                topSpacing = 0;
                leftOffset = 3.1;
                textWidth = 2.5;
                displayText = `(${text})`;
                isDialogueBlock = true;
                pdf.setFont('Courier', 'normal');
                break;
            case 'transition':
                topSpacing = LINE_SPACING;
                displayText = text.toUpperCase();
                pdf.setFont('Courier', 'normal');
                currentSpeaker = null;
                break;
            default:
                pdf.setFont('Courier', 'normal');
                currentSpeaker = null;
        }

        y += topSpacing;
        checkPageBreak(1, isDialogueBlock);

        // Scene numbers (both sides of the page)
        if (block.type === 'scene-heading' && showSceneNumbers) {
            pdf.setFont('Courier', 'bold');
            pdf.text(`${sceneNum}`, LEFT_MARGIN - 0.3, y, { align: 'right' });
            pdf.text(`${sceneNum}`, PAGE_WIDTH - RIGHT_MARGIN + 0.3, y);
        }

        const wrappedLines = wrapText(displayText, textWidth);

        wrappedLines.forEach((line, lineIdx) => {
            checkPageBreak(1, isDialogueBlock);

            if (block.type === 'transition') {
                pdf.text(line, PAGE_WIDTH - RIGHT_MARGIN, y, { align: 'right' });
            } else {
                pdf.text(line, leftOffset, y);
            }
            y += LINE_SPACING;
        });

        if (block.type === 'scene-heading') {
            pdf.setFont('Courier', 'normal');
        }
    });

    pdf.save(`${title}.pdf`);
}

// ═══════════════════════════════════════════════
//  EXPORT: Watermarked PDF
// ═══════════════════════════════════════════════

export function exportWatermarkedPDF(blocks, title = 'Screenplay', options = {}) {
    const {
        titlePage,
        showSceneNumbers,
        watermark = {},
    } = options;

    const watermarkText = watermark.text || 'CONFIDENTIAL';
    const watermarkOpacity = watermark.opacity !== undefined ? watermark.opacity : 0.08;
    const watermarkAngle = watermark.angle !== undefined ? watermark.angle : 45;
    const watermarkFontSize = watermark.fontSize || 48;

    const pdf = new jsPDF({
        unit: 'in',
        format: 'letter',
        orientation: 'portrait',
    });

    const LEFT_MARGIN = 1.5;
    const RIGHT_MARGIN = 1.0;
    const TOP_MARGIN = 1.0;
    const BOTTOM_MARGIN = 1.0;
    const PAGE_WIDTH = 8.5;
    const PAGE_HEIGHT = 11;
    const USABLE_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN;

    const FONT_SIZE = 12;
    const LINE_HEIGHT = FONT_SIZE / 72;
    const LINE_SPACING = LINE_HEIGHT * 1.1;
    const CHARS_PER_INCH = 10;

    let y = TOP_MARGIN;
    let pageNum = 0;
    let sceneNum = 0;

    const contdMarkers = computePDFContdMarkers(blocks);
    let currentSpeaker = null;

    pdf.setFont('Courier', 'normal');
    pdf.setFontSize(FONT_SIZE);

    // Function to stamp watermark on the current page
    const stampWatermark = () => {
        const gState = pdf.GState({ opacity: watermarkOpacity });
        pdf.saveGraphicsState();
        pdf.setGState(gState);
        pdf.setFont('Helvetica', 'bold');
        pdf.setFontSize(watermarkFontSize);
        pdf.setTextColor(128, 128, 128);

        const centerX = PAGE_WIDTH / 2;
        const centerY = PAGE_HEIGHT / 2;
        const radians = (watermarkAngle * Math.PI) / 180;

        pdf.text(watermarkText, centerX, centerY, {
            align: 'center',
            angle: watermarkAngle,
        });

        pdf.restoreGraphicsState();
        pdf.setFont('Courier', 'normal');
        pdf.setFontSize(FONT_SIZE);
        pdf.setTextColor(0, 0, 0);
    };

    // ── Title Page ──
    if (titlePage && (titlePage.author || title)) {
        pageNum = 0;
        const centerX = PAGE_WIDTH / 2;

        pdf.setFont('Courier', 'normal');
        pdf.setFontSize(24);
        pdf.text(title.toUpperCase(), centerX, 4.0, { align: 'center' });

        pdf.setFontSize(FONT_SIZE);
        if (titlePage.basedOn) {
            pdf.text(`Based on ${titlePage.basedOn}`, centerX, 4.8, { align: 'center' });
            pdf.text('Written by', centerX, 5.4, { align: 'center' });
            pdf.text(titlePage.author || '', centerX, 5.8, { align: 'center' });
        } else {
            pdf.text('Written by', centerX, 5.0, { align: 'center' });
            pdf.text(titlePage.author || '', centerX, 5.4, { align: 'center' });
        }

        let footerY = 9.0;
        pdf.setFontSize(FONT_SIZE);
        if (titlePage.contact) {
            pdf.text(titlePage.contact, LEFT_MARGIN, footerY);
            footerY += LINE_SPACING * 1.5;
        }
        if (titlePage.draftDate) {
            pdf.text(titlePage.draftDate, LEFT_MARGIN, footerY);
            footerY += LINE_SPACING * 1.5;
        }
        if (titlePage.copyright) {
            pdf.text(titlePage.copyright, LEFT_MARGIN, footerY);
        }

        stampWatermark();
        pdf.addPage();
    }

    pageNum = 1;
    y = TOP_MARGIN;

    const addPage = (moreCharacter = null) => {
        if (moreCharacter) {
            pdf.setFont('Courier', 'normal');
            pdf.setFontSize(FONT_SIZE);
            pdf.text('(MORE)', 3.7, y);
        }

        stampWatermark(); // Stamp watermark on the page we're leaving
        pdf.addPage();
        pageNum++;
        y = TOP_MARGIN;
        pdf.setFont('Courier', 'normal');
        pdf.setFontSize(FONT_SIZE);
        pdf.text(`${pageNum}.`, PAGE_WIDTH - RIGHT_MARGIN, 0.5, { align: 'right' });

        if (moreCharacter) {
            pdf.text(`${moreCharacter} (CONT'D)`, 3.7, y);
            y += LINE_SPACING;
        }
    };

    const checkPageBreak = (linesNeeded = 1, inDialogue = false) => {
        if (y + linesNeeded * LINE_SPACING > PAGE_HEIGHT - BOTTOM_MARGIN) {
            addPage(inDialogue ? currentSpeaker : null);
        }
    };

    const wrapText = (text, maxWidth) => {
        const maxChars = Math.floor(maxWidth * CHARS_PER_INCH);
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach((word) => {
            if ((currentLine + ' ' + word).trim().length <= maxChars) {
                currentLine = (currentLine + ' ' + word).trim();
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        });
        if (currentLine) lines.push(currentLine);
        return lines.length > 0 ? lines : [''];
    };

    blocks.forEach((block, idx) => {
        const text = block.text || '';
        if (text.trim() === '' && block.type !== 'scene-heading') return;

        let leftOffset = LEFT_MARGIN;
        let textWidth = USABLE_WIDTH;
        let displayText = text;
        let topSpacing = LINE_SPACING;
        let isDialogueBlock = false;

        switch (block.type) {
            case 'scene-heading':
                sceneNum++;
                topSpacing = idx === 0 ? 0 : LINE_SPACING * 2;
                displayText = text.toUpperCase();
                pdf.setFont('Courier', 'bold');
                currentSpeaker = null;
                break;
            case 'action':
                topSpacing = LINE_SPACING;
                pdf.setFont('Courier', 'normal');
                currentSpeaker = null;
                break;
            case 'character': {
                topSpacing = LINE_SPACING * 1.5;
                leftOffset = 3.7;
                textWidth = PAGE_WIDTH - 3.7 - RIGHT_MARGIN;
                const baseName = stripCharacterExtensions(text);
                currentSpeaker = baseName;
                if (contdMarkers[idx]) {
                    displayText = text.toUpperCase() + " (CONT'D)";
                } else {
                    displayText = text.toUpperCase();
                }
                pdf.setFont('Courier', 'normal');
                break;
            }
            case 'dialogue':
                topSpacing = 0;
                leftOffset = 2.5;
                textWidth = 3.5;
                isDialogueBlock = true;
                pdf.setFont('Courier', 'normal');
                break;
            case 'parenthetical':
                topSpacing = 0;
                leftOffset = 3.1;
                textWidth = 2.5;
                displayText = `(${text})`;
                isDialogueBlock = true;
                pdf.setFont('Courier', 'normal');
                break;
            case 'transition':
                topSpacing = LINE_SPACING;
                displayText = text.toUpperCase();
                pdf.setFont('Courier', 'normal');
                currentSpeaker = null;
                break;
            default:
                pdf.setFont('Courier', 'normal');
                currentSpeaker = null;
        }

        y += topSpacing;
        checkPageBreak(1, isDialogueBlock);

        if (block.type === 'scene-heading' && showSceneNumbers) {
            pdf.setFont('Courier', 'bold');
            pdf.text(`${sceneNum}`, LEFT_MARGIN - 0.3, y, { align: 'right' });
            pdf.text(`${sceneNum}`, PAGE_WIDTH - RIGHT_MARGIN + 0.3, y);
        }

        const wrappedLines = wrapText(displayText, textWidth);

        wrappedLines.forEach((line) => {
            checkPageBreak(1, isDialogueBlock);

            if (block.type === 'transition') {
                pdf.text(line, PAGE_WIDTH - RIGHT_MARGIN, y, { align: 'right' });
            } else {
                pdf.text(line, leftOffset, y);
            }
            y += LINE_SPACING;
        });

        if (block.type === 'scene-heading') {
            pdf.setFont('Courier', 'normal');
        }
    });

    // Stamp watermark on the last page
    stampWatermark();

    pdf.save(`${title}.pdf`);
}

// ═══════════════════════════════════════════════
//  EXPORT: FDX (Final Draft XML)
// ═══════════════════════════════════════════════

export function exportFDX(blocks, title = 'Screenplay') {
    const escapeXml = (s) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

    let xml = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
    xml += `<FinalDraft DocumentType="Script" Template="No" Version="4">\n`;
    xml += `  <Content>\n`;

    blocks.forEach((block) => {
        const type = REVERSE_ELEMENT_MAP_FDX[block.type] || 'Action';
        const text = escapeXml(block.text || '');
        xml += `    <Paragraph Type="${type}">\n`;
        xml += `      <Text>${text}</Text>\n`;
        xml += `    </Paragraph>\n`;
    });

    xml += `  </Content>\n`;
    xml += `</FinalDraft>\n`;

    triggerDownload(xml, `${title}.fdx`, 'application/xml');
}

// ═══════════════════════════════════════════════
//  EXPORT: Fountain
// ═══════════════════════════════════════════════

export function exportFountain(blocks, title = 'Screenplay') {
    let output = `Title: ${title}\nCredit: Written by\nAuthor: \nDraft date: ${new Date().toLocaleDateString()}\n\n`;

    blocks.forEach((block, idx) => {
        const text = block.text || '';
        switch (block.type) {
            case 'scene-heading':
                if (idx > 0) output += '\n';
                output += text.toUpperCase() + '\n\n';
                break;
            case 'action':
                output += text + '\n\n';
                break;
            case 'character':
                output += '\n' + text.toUpperCase() + '\n';
                break;
            case 'dialogue':
                output += text + '\n';
                break;
            case 'parenthetical':
                output += `(${text})\n`;
                break;
            case 'transition':
                output += '\n>' + text.toUpperCase() + '\n\n';
                break;
            default:
                output += text + '\n';
        }
    });

    triggerDownload(output, `${title}.fountain`, 'text/plain');
}

// ═══════════════════════════════════════════════
//  EXPORT: TXT (plain text with layout)
// ═══════════════════════════════════════════════

export function exportTXT(blocks, title = 'Screenplay') {
    let output = `${title.toUpperCase()}\n${'='.repeat(title.length)}\n\n`;

    blocks.forEach((block) => {
        const text = block.text || '';
        switch (block.type) {
            case 'scene-heading':
                output += '\n' + text.toUpperCase() + '\n\n';
                break;
            case 'action':
                output += text + '\n\n';
                break;
            case 'character':
                output += '                                 ' + text.toUpperCase() + '\n';
                break;
            case 'dialogue':
                output += '                   ' + text + '\n';
                break;
            case 'parenthetical':
                output += '                         (' + text + ')\n';
                break;
            case 'transition':
                output += '                                                     ' + text.toUpperCase() + '\n\n';
                break;
            default:
                output += text + '\n';
        }
    });

    triggerDownload(output, `${title}.txt`, 'text/plain');
}
