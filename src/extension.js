// @author: Gael Lopes Da Silva
// @project: Colored
// @github: https://github.com/Gael-Lopes-Da-Silva/ColoredVSCode

const vscode = require('vscode');

let decorationTypes = [];

const COLOR_REGEX = new RegExp(
    "#(?:[a-fA-F0-9]{8}|[a-fA-F0-9]{6}|[a-fA-F0-9]{4}|[a-fA-F0-9]{3})\\b"
    + "|\\b(rgb)\\(\\s*(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3})\\s*(?:\\/\\s*(\\d{1,3}%|[01](?:\\.\\d+)?))?\\)"
    + "|\\b(rgba)\\(\\s*(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3}%|[01](?:\\.\\d+)?)\\)"
    + "|\\b(hsl)\\(\\s*((?:\\d+(?:deg)?|\\d+(?:\\.\\d+(?:turn)?)?))\\s*(?:,)?\\s*(\\d{1,3}%)\\s*(?:,)?\\s*(\\d{1,3}%)\\s*(?:\\/\\s*(\\d{1,3}%|[01](?:\\.\\d+)?))?\\)"
    + "|\\b(hsla)\\(\\s*((?:\\d+(?:deg)?|\\d+(?:\\.\\d+(?:turn)?)?))\\s*(?:,)?\\s*(\\d{1,3}%)\\s*(?:,)?\\s*(\\d{1,3}%)\\s*(?:,)?\\s*(\\d{1,3}%|[01](?:\\.\\d+)?)\\)"
    + "|\\b(lch)\\(\\s*(\\d{1,3}%)\\s*(?:,)?\\s*(\\d{1,3})\\s*(?:,)?\\s*((?:\\d+(?:deg)?|\\d+(?:\\.\\d+(?:turn)?)?))\\s*(?:[\\/,]\\s*(\\d{1,3}%|[01](?:\\.\\d+)?))?\\)"
    + "|\\b(hwb)\\(\\s*((?:\\d+(?:deg)?|\\d+(?:\\.\\d+(?:turn)?)?))\\s*(?:,)?\\s*(\\d{1,3}%)\\s*(?:,)?\\s*(\\d{1,3}%)\\s*(?:[\\/,]\\s*(\\d{1,3}%|[01](?:\\.\\d+)?))?\\)"
    + "|\\b(lab)\\(\\s*(\\d{1,3}%)\\s*(?:,)?\\s*(\\-?\\d{1,3})\\s*(?:,)?\\s*(\\-?\\d{1,3})\\s*(?:[\\/,]\\s*(\\d{1,3}%|[01](?:\\.\\d+)?))?\\)"
);

let highlight = true;
let borderRadius = 3;
let background = true;
let border = false;
let borderSize = 2;
let maxFileSize = 1000000;
let maxLineCount = 10000;

// ----------------------------------------------------

function activate(context) {
    loadConfiguration();

    context.subscriptions.push(
        vscode.commands.registerCommand('colored.toggleHighlight', toggleHighlight),
        vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor),
        vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument),
        vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration),
        vscode.languages.registerColorProvider({ scheme: 'file' }, colorProvider)
    );

    updateDecorations();
}

function deactivate() {
    clearDecorations();
}

// ----------------------------------------------------

function loadConfiguration() {
    const config = vscode.workspace.getConfiguration('colored');

    highlight = config.inspect('highlight').globalValue || config.get('highlight');
    background = config.inspect('background').globalValue || config.get('background');
    border = config.inspect('border').globalValue || config.get('border');
    borderSize = config.inspect('borderSize').globalValue || config.get('borderSize');
    borderRadius = config.inspect('borderRadius').globalValue || config.get('borderRadius');
    maxFileSize = config.inspect('maxFileSize').globalValue || config.get('maxFileSize');
    maxLineCount = config.inspect('maxLineCount').globalValue || config.get('maxLineCount');
}

function toggleHighlight() {
    highlight = !highlight;

    if (highlight) {
        updateDecorations();
    } else {
        clearDecorations();
    }

    vscode.window.showInformationMessage(`Colors highlight is now ${highlight ? 'on' : 'off'}.`);
}

function onDidChangeActiveTextEditor() {
    updateDecorations();
}

function onDidChangeTextDocument(event) {
    if (!vscode.window.activeTextEditor) return;

    if (event.document === vscode.window.activeTextEditor.document) {
        updateDecorations();
    }
}

function onDidChangeConfiguration(event) {
    if (event.affectsConfiguration('colored')) {
        clearDecorations();
        loadConfiguration();
        updateDecorations();
    }
}

function updateDecorations() {
    if (!highlight) return;

    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) return;

    const text = activeTextEditor.document.getText();
    if (maxFileSize !== null && text.length > maxFileSize || maxLineCount !== null && activeTextEditor.document.lineCount > maxLineCount) return;

    let decorations = new Map();

    const regex = new RegExp(COLOR_REGEX.source, 'g');

    let match;
    while ((match = regex.exec(text))) {
        const startPos = activeTextEditor.document.positionAt(match.index);
        const endPos = activeTextEditor.document.positionAt(match.index + match[0].length);

        let color = "";

        if (match[0].startsWith('#')) {
            color = match[0];
        } else if (match[1] === "rgb") {
            color = `rgba(${match[2]}, ${match[3]}, ${match[4]}, ${match[5] != undefined ? match[5] : '1'})`;
        } else if (match[6] === "rgba") {
            color = `rgba(${match[7]}, ${match[8]}, ${match[9]}, ${match[10]})`;
        } else if (match[11] === "hsl") {
            color = `hsla(${match[12]}, ${match[13]}, ${match[14]}, ${match[15] != undefined ? match[15] : '1'})`;
        } else if (match[16] === "hsla") {
            color = `hsla(${match[17]}, ${match[18]}, ${match[19]}, ${match[20]})`;
        } else if (match[21] === "lch") {
            const [lightness, chroma] = [parseFloat(match[22]), parseFloat(match[23])];
            const hue = match[24].includes("turn") ? parseFloat(match[24]) * 360 : parseFloat(match[24]);
            const alpha = match[25] ? (match[25].includes('%') ? parseFloat(match[25]) / 100 : parseFloat(match[25])) : 1;

            const [r, g, b] = lchToRgb(lightness, chroma, hue);
            color = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else if (match[26] === "hwb") {
            const hue = match[27].includes("turn") ? parseFloat(match[27]) * 360 : parseFloat(match[27]);
            const [white, black] = [parseFloat(match[28]), parseFloat(match[29])];
            const alpha = match[30] ? (match[30].includes('%') ? parseFloat(match[30]) / 100 : parseFloat(match[30])) : 1;

            const [r, g, b] = hwbToRgb(hue, white, black);
            color = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else if (match[31] === "lab") {
            const [lightness, a, d] = [parseFloat(match[32]), parseFloat(match[33]), parseFloat(match[34])];
            const alpha = match[35] ? (match[35].includes('%') ? parseFloat(match[35]) / 100 : parseFloat(match[35])) : 1;

            const [r, g, b] = labToRgb(lightness, a, d);
            color = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        if (!decorations.has(color)) {
            const decorationType = vscode.window.createTextEditorDecorationType({
                backgroundColor: background ? color : undefined,
                border: border ? `${borderSize}px solid ${color}` : undefined,
                color: background ? (isBrightColor(color) ? 'black' : 'white') : undefined,
                fontWeight: "normal",
                borderRadius: `${borderRadius}px`
            });
            decorations.set(color, {
                decorationType,
                ranges: []
            });
        }

        decorations.get(color).ranges.push(new vscode.Range(startPos, endPos));
    }

    clearDecorations();

    for (const { decorationType, ranges } of decorations.values()) {
        activeTextEditor.setDecorations(decorationType, ranges);
        decorationTypes.push(decorationType);
    }
}

function isBrightColor(color) {
    let r, g, b, a = 1;

    if (color.startsWith('#')) {
        if (color.length === 4) {
            r = parseInt(color[1] + color[1], 16);
            g = parseInt(color[2] + color[2], 16);
            b = parseInt(color[3] + color[3], 16);
        } else if (color.length === 5) {
            r = parseInt(color[1] + color[1], 16);
            g = parseInt(color[2] + color[2], 16);
            b = parseInt(color[3] + color[3], 16);
            a = parseInt(color[4] + color[4], 16) / 255;
        } else if (color.length === 9) {
            r = parseInt(color.slice(1, 3), 16);
            g = parseInt(color.slice(3, 5), 16);
            b = parseInt(color.slice(5, 7), 16);
            a = parseInt(color.slice(7, 9), 16) / 255;
        } else {
            r = parseInt(color.slice(1, 3), 16);
            g = parseInt(color.slice(3, 5), 16);
            b = parseInt(color.slice(5, 7), 16);
        }
    } else if (color.startsWith('rgb')) {
        const rgbValues = color.match("(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3})\\s*(?:[\\/,]?\\s*(\\d{1,3}%|[01](?:\\.\\d+)?))?");

        if (rgbValues) {
            r = parseInt(rgbValues[1], 10);
            g = parseInt(rgbValues[2], 10);
            b = parseInt(rgbValues[3], 10);

            if (rgbValues[4]) {
                a = rgbValues[4].includes('%') ? parseFloat(rgbValues[4]) / 100 : parseFloat(rgbValues[4]);
            }
        }
    } else if (color.startsWith('hsl')) {
        const hslValues = color.match("(?:(\\d+)(?:deg)?|([01](?:\\.\\d+)?)(?:turn)?)\\s*(?:,)?\\s*(\\d{1,3}%)\\s*(?:,)?\\s*(\\d{1,3}%)\\s*(?:[\\/\\,]\\s*(\\d{1,3}%|[01](?:\\.\\d+)?))?");

        if (hslValues) {
            if (hslValues[1]) {
                h = parseInt(hslValues[1], 10);
            } else if (hslValues[2]) {
                h = parseFloat(hslValues[2]) * 360;
            }
            const s = parseInt(hslValues[3], 10) / 100;
            const l = parseInt(hslValues[4], 10) / 100;

            if (hslValues[5]) {
                a = hslValues[5].includes('%') ? parseFloat(hslValues[5]) / 100 : parseFloat(hslValues[5]);
            }

            const [red, green, blue] = hslToRgb(h, s, l);
            r = red;
            g = green;
            b = blue;
        }
    }

    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) * a;
    return brightness > 128;
}

function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
        r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
        r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
        r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
        r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
        r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
        r = c; g = 0; b = x;
    }

    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255)
    ];
}

function lchToRgb(l, c, h) {
    const hradians = (h * Math.PI) / 180;
    const a = c * Math.cos(hradians);
    const d = c * Math.sin(hradians);

    const y = (l + 16) / 116;
    const x = a / 500 + y;
    const z = y - d / 200;

    const [xr, yr, zr] = [0.95047, 1.00000, 1.08883];
    const X = xr * (x ** 3 > 0.008856 ? x ** 3 : (x - 16 / 116) / 7.787);
    const Y = yr * (y ** 3 > 0.008856 ? y ** 3 : (y - 16 / 116) / 7.787);
    const Z = zr * (z ** 3 > 0.008856 ? z ** 3 : (z - 16 / 116) / 7.787);

    let r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
    let g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
    let b = X * 0.0557 + Y * -0.2040 + Z * 1.0570;

    r = Math.max(0, Math.min(1, r)) * 255;
    g = Math.max(0, Math.min(1, g)) * 255;
    b = Math.max(0, Math.min(1, b)) * 255;

    return [
        Math.round(r),
        Math.round(g),
        Math.round(b)
    ];
}

function hwbToRgb(h, w, b) {
    h = h % 360;
    const rgb = hslToRgb(h, 1, 0.5);
    const factor = 1 - w / 100 - b / 100;

    return [
        Math.round((rgb[0] * factor + 255 * w / 100) * (1 - b / 100)),
        Math.round((rgb[1] * factor + 255 * w / 100) * (1 - b / 100)),
        Math.round((rgb[2] * factor + 255 * w / 100) * (1 - b / 100)),
    ];
}

function labToRgb(l, a, d) {
    const y = (l + 16) / 116;
    const x = a / 500 + y;
    const z = y - d / 200;

    const [xr, yr, zr] = [0.95047, 1.00000, 1.08883];
    const X = xr * (x ** 3 > 0.008856 ? x ** 3 : (x - 16 / 116) / 7.787);
    const Y = yr * (y ** 3 > 0.008856 ? y ** 3 : (y - 16 / 116) / 7.787);
    const Z = zr * (z ** 3 > 0.008856 ? z ** 3 : (z - 16 / 116) / 7.787);

    let r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
    let g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
    let b = X * 0.0557 + Y * -0.2040 + Z * 1.0570;

    r = Math.max(0, Math.min(1, r)) * 255;
    g = Math.max(0, Math.min(1, g)) * 255;
    b = Math.max(0, Math.min(1, b)) * 255;

    return [
        Math.round(r),
        Math.round(g),
        Math.round(b)
    ];
}

function rgbToHex(r, g, b, a = 1) {
    const toHex = v => Math.round(v).toString(16).padStart(2, '0');
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    return a < 1 ? hex + toHex(a * 255) : hex;
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function rgbToHwb(r, g, b) {
    const [h] = rgbToHsl(r, g, b);
    const w = Math.round(Math.min(r, g, b) / 255 * 100);
    const bk = Math.round((1 - Math.max(r, g, b) / 255) * 100);
    return [h, w, bk];
}

function rgbToLab(r, g, b) {
    let R = r / 255, G = g / 255, B = b / 255;
    R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92;
    G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92;
    B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92;
    let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
    let Y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.00000;
    let Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const f = v => v > 0.008856 ? Math.cbrt(v) : (7.787 * v) + 16 / 116;
    X = f(X); Y = f(Y); Z = f(Z);
    const L = Math.round((116 * Y - 16) * 10) / 10;
    const A = Math.round((500 * (X - Y)) * 10) / 10;
    const D = Math.round((200 * (Y - Z)) * 10) / 10;
    return [L, A, D];
}

function rgbToLch(r, g, b) {
    const [L, A, D] = rgbToLab(r, g, b);
    const C = Math.round(Math.sqrt(A * A + D * D) * 10) / 10;
    let H = Math.round(Math.atan2(D, A) * 180 / Math.PI * 10) / 10;
    if (H < 0) H += 360;
    return [L, C, H];
}

function clearDecorations() {
    decorationTypes.forEach(decorationType => decorationType.dispose());
    decorationTypes = [];
}

// ----------------------------------------------------

const colorProvider = {
    provideDocumentColors(document) {
        const text = document.getText();
        if (maxFileSize !== null && text.length > maxFileSize) return [];
        if (maxLineCount !== null && document.lineCount > maxLineCount) return [];

        const results = [];
        const regex = new RegExp(COLOR_REGEX.source, 'g');
        let match;

        while ((match = regex.exec(text))) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);

            let r = 0, g = 0, b = 0, a = 1;
            let valid = false;

            if (match[0].startsWith('#')) {
                const hex = match[0].slice(1);
                if (hex.length === 3) {
                    r = parseInt(hex[0] + hex[0], 16);
                    g = parseInt(hex[1] + hex[1], 16);
                    b = parseInt(hex[2] + hex[2], 16);
                } else if (hex.length === 4) {
                    r = parseInt(hex[0] + hex[0], 16);
                    g = parseInt(hex[1] + hex[1], 16);
                    b = parseInt(hex[2] + hex[2], 16);
                    a = parseInt(hex[3] + hex[3], 16) / 255;
                } else if (hex.length === 6) {
                    r = parseInt(hex.slice(0, 2), 16);
                    g = parseInt(hex.slice(2, 4), 16);
                    b = parseInt(hex.slice(4, 6), 16);
                } else if (hex.length === 8) {
                    r = parseInt(hex.slice(0, 2), 16);
                    g = parseInt(hex.slice(2, 4), 16);
                    b = parseInt(hex.slice(4, 6), 16);
                    a = parseInt(hex.slice(6, 8), 16) / 255;
                }
                valid = true;
            } else if (match[1] === 'rgb') {
                r = parseInt(match[2], 10);
                g = parseInt(match[3], 10);
                b = parseInt(match[4], 10);
                a = match[5] != null ? (match[5].includes('%') ? parseFloat(match[5]) / 100 : parseFloat(match[5])) : 1;
                valid = true;
            } else if (match[6] === 'rgba') {
                r = parseInt(match[7], 10);
                g = parseInt(match[8], 10);
                b = parseInt(match[9], 10);
                a = match[10].includes('%') ? parseFloat(match[10]) / 100 : parseFloat(match[10]);
                valid = true;
            } else if (match[11] === 'hsl') {
                const hRaw = match[12];
                const h = hRaw.includes('turn') ? parseFloat(hRaw) * 360 : parseFloat(hRaw);
                const s = parseFloat(match[13]) / 100;
                const l = parseFloat(match[14]) / 100;
                [r, g, b] = hslToRgb(h, s, l);
                a = match[15] != null ? (match[15].includes('%') ? parseFloat(match[15]) / 100 : parseFloat(match[15])) : 1;
                valid = true;
            } else if (match[16] === 'hsla') {
                const hRaw = match[17];
                const h = hRaw.includes('turn') ? parseFloat(hRaw) * 360 : parseFloat(hRaw);
                const s = parseFloat(match[18]) / 100;
                const l = parseFloat(match[19]) / 100;
                [r, g, b] = hslToRgb(h, s, l);
                a = match[20].includes('%') ? parseFloat(match[20]) / 100 : parseFloat(match[20]);
                valid = true;
            } else if (match[21] === 'lch') {
                const lightness = parseFloat(match[22]);
                const chroma = parseFloat(match[23]);
                const hue = match[24].includes('turn') ? parseFloat(match[24]) * 360 : parseFloat(match[24]);
                [r, g, b] = lchToRgb(lightness, chroma, hue);
                a = match[25] != null ? (match[25].includes('%') ? parseFloat(match[25]) / 100 : parseFloat(match[25])) : 1;
                valid = true;
            } else if (match[26] === 'hwb') {
                const hue = match[27].includes('turn') ? parseFloat(match[27]) * 360 : parseFloat(match[27]);
                [r, g, b] = hwbToRgb(hue, parseFloat(match[28]), parseFloat(match[29]));
                a = match[30] != null ? (match[30].includes('%') ? parseFloat(match[30]) / 100 : parseFloat(match[30])) : 1;
                valid = true;
            } else if (match[31] === 'lab') {
                [r, g, b] = labToRgb(parseFloat(match[32]), parseFloat(match[33]), parseFloat(match[34]));
                a = match[35] != null ? (match[35].includes('%') ? parseFloat(match[35]) / 100 : parseFloat(match[35])) : 1;
                valid = true;
            }

            if (valid) {
                results.push(new vscode.ColorInformation(
                    range,
                    new vscode.Color(r / 255, g / 255, b / 255, a)
                ));
            }
        }

        return results;
    },

    provideColorPresentations(color, { document, range }) {
        const original = document.getText(range);
        const r = Math.round(color.red * 255);
        const g = Math.round(color.green * 255);
        const b = Math.round(color.blue * 255);
        const a = color.alpha;
        const alphaStr = a < 1 ? ` / ${Math.round(a * 100) / 100}` : '';
        const alphaStrLegacy = a < 1 ? `, ${Math.round(a * 100) / 100}` : '';

        let newColor;

        if (original.startsWith('#')) {
            newColor = rgbToHex(r, g, b, a);
        } else if (original.startsWith('rgba(')) {
            newColor = `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`;
        } else if (original.startsWith('rgb(')) {
            newColor = `rgb(${r} ${g} ${b}${alphaStr})`;
        } else if (original.startsWith('hsla(')) {
            const [h, s, l] = rgbToHsl(r, g, b);
            const useDeg = /\d+deg/.test(original);
            const hStr = useDeg ? `${h}deg` : `${h}`;
            newColor = `hsla(${hStr}, ${s}%, ${l}%${alphaStrLegacy})`;
        } else if (original.startsWith('hsl(')) {
            const [h, s, l] = rgbToHsl(r, g, b);
            const useDeg = /\d+deg/.test(original);
            const hStr = useDeg ? `${h}deg` : `${h}`;
            newColor = `hsl(${hStr} ${s}% ${l}%${alphaStr})`;
        } else if (original.startsWith('lch(')) {
            const [L, C, H] = rgbToLch(r, g, b);
            newColor = `lch(${L}% ${C} ${H}${alphaStr})`;
        } else if (original.startsWith('hwb(')) {
            const [h, w, bk] = rgbToHwb(r, g, b);
            newColor = `hwb(${h} ${w}% ${bk}%${alphaStr})`;
        } else if (original.startsWith('lab(')) {
            const [L, A, D] = rgbToLab(r, g, b);
            newColor = `lab(${L}% ${A} ${D}${alphaStr})`;
        } else {
            newColor = rgbToHex(r, g, b, a);
        }

        return [new vscode.ColorPresentation(newColor)];
    }
};

module.exports = {
    activate,
    deactivate
};