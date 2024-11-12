// @author: Gael Lopes Da Silva
// @project: Colored
// @github: https://github.com/Gael-Lopes-Da-Silva/ColoredVSCode

const vscode = require('vscode');

let decorationTypes = [];

let highlight = true;
let borderRadius = 3;
let maxFileSize = 1000000;
let maxLineCount = 10000;

// ----------------------------------------------------

function activate(context) {
    loadConfiguration();

    context.subscriptions.push(
        vscode.commands.registerCommand('colored.toggleHighlight', toggleHighlight),
        vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor),
        vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument),
        vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration)
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

    const regex = new RegExp("#(?:[a-fA-F0-9]{8}|[a-fA-F0-9]{6}|[a-fA-F0-9]{4}|[a-fA-F0-9]{3})\\b"
        + "|\\b(rgb)\\(\\s*(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3})\\s*(?:\\/\\s*(\\d{1,3}%|[01](?:\\.\\d+)?))?\\)"
        + "|\\b(rgba)\\(\\s*(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3}%|[01](?:\\.\\d+)?)\\)"
        + "|\\b(hsl)\\(\\s*((?:\\d+(?:deg)?|\\d+(?:\\.\\d+(?:turn)?)?))\\s*(?:,)?\\s*(\\d{1,3}%)\\s*(?:,)?\\s*(\\d{1,3}%)\\s*(?:\\/\\s*(\\d{1,3}%|[01](?:\\.\\d+)?))?\\)"
        + "|\\b(hsla)\\(\\s*((?:\\d+(?:deg)?|\\d+(?:\\.\\d+(?:turn)?)?))\\s*(?:,)?\\s*(\\d{1,3}%)\\s*(?:,)?\\s*(\\d{1,3}%)\\s*(?:,)?\\s*(\\d{1,3}%|[01](?:\\.\\d+)?)\\)"
        + "|\\b(lch)\\(\\s*(\\d{1,3}%)\\s*(?:,)?\\s*(\\d{1,3})\\s*(?:,)?\\s*((?:\\d+(?:deg)?|\\d+(?:\\.\\d+(?:turn)?)?))\\s*(?:[\\/,]\\s*(\\d{1,3}%|[01](?:\\.\\d+)?))?\\)"
        + "|\\b(hwb)\\(\\s*((?:\\d+(?:deg)?|\\d+(?:\\.\\d+(?:turn)?)?))\\s*(?:,)?\\s*(\\d{1,3}%)\\s*(?:,)?\\s*(\\d{1,3}%)\\s*(?:[\\/,]\\s*(\\d{1,3}%|[01](?:\\.\\d+)?))?\\)"
        + "|\\b(lab)\\(\\s*(\\d{1,3}%)\\s*(?:,)?\\s*(\\-?\\d{1,3})\\s*(?:,)?\\s*(\\-?\\d{1,3})\\s*(?:[\\/,]\\s*(\\d{1,3}%|[01](?:\\.\\d+)?))?\\)", 'g');

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
                backgroundColor: color,
                color: isBrightColor(color) ? 'black' : 'white',
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

function clearDecorations() {
    decorationTypes.forEach(decorationType => decorationType.dispose());
    decorationTypes = [];
}

module.exports = {
    activate,
    deactivate
};