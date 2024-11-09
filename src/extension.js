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

    const regex = new RegExp("#(?:[a-fA-F0-9]{8}|[a-fA-F0-9]{6}|[a-fA-F0-9]{4}|[a-fA-F0-9]{3})\\b|\\b(rgb)\\(\\s*(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3})\\s*\\)|\\b(rgba)\\(\\s*(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3})\\s*(?:,)?\\s*\\/?\\s*(\\d{1,3}%|[01](?:\\.\\d+)?)\\)", 'g');

    let match;
    while ((match = regex.exec(text))) {
        const startPos = activeTextEditor.document.positionAt(match.index);
        const endPos = activeTextEditor.document.positionAt(match.index + match[0].length);

        let color = "";

        if (match[0].startsWith('#')) {
            color = match[0];
        } else {
            if (match[1] == "rgb") {
                color = `rgb(${match[2]}, ${match[3]}, ${match[4]})`;
            } else if (match[5] == "rgba") {
                color = `rgba(${match[6]}, ${match[7]}, ${match[8]}, ${match[9]})`;
            }
        }

        if (!decorations.has(color)) {
            const decorationType = vscode.window.createTextEditorDecorationType({
                backgroundColor: color,
                color: isBrightColor(match[0]) ? 'black' : 'white',
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
    } else {
        const rgbValues = color.match(/(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*\/?\s*(\d{1,3}%|[01](?:\.\d+)?)?/);

        if (rgbValues) {
            r = parseInt(rgbValues[1], 10);
            g = parseInt(rgbValues[2], 10);
            b = parseInt(rgbValues[3], 10);

            if (rgbValues[4]) {
                a = rgbValues[4].includes('%') ? parseFloat(rgbValues[4]) / 100 : parseFloat(rgbValues[4]);
            }
        }
    }

    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) * a;
    return brightness > 128;
}

function clearDecorations() {
    decorationTypes.forEach(decorationType => decorationType.dispose());
    decorationTypes = [];
}

module.exports = {
    activate,
    deactivate
};