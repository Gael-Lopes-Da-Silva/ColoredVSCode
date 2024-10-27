// @author: Gael Lopes Da Silva
// @project: Todoed
// @github: https://github.com/Gael-Lopes-Da-Silva/TodoedVSCode

const vscode = require('vscode');

let highlight = true;
let borderRadius = 3;
let decorationTypes = [];

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
    
    let decorations = new Map();
    let expresion = "";

    expresion += `#([a-fA-F0-9]{8}|[a-fA-F0-9]{6}|[a-fA-F0-9]{3})\\b`;
    expresion += `|\\brgba?\\(\\s*(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3})\\s*(?:,)?\\s*(\\d{1,3})\\s*(?:,)?\\s*\\/?\\s*(\\d{1,3}%|0(?:\\.\\d+)?)\\)`;

    const regex = new RegExp(expresion, `g`);

    let match;
    while ((match = regex.exec(text))) {
        const startPos = activeTextEditor.document.positionAt(match.index);
        const endPos = activeTextEditor.document.positionAt(match.index + match[0].length);

        let color = "";

        if (match[0].startsWith('#')) {
            color = match[0];
        } else if (match[0].startsWith('rgba')) {
            color = `rgba(${match[2]}, ${match[3]}, ${match[4]}, ${match[5]})`;
        } else if (match[0].startsWith('rgb')) {
            color = `rgb(${match[2]}, ${match[3]}, ${match[4]})`;
        }

        const isBright = isBrightColor(match[0]);
        const textColor = isBright ? 'black' : 'white';

        if (!decorations.has(color)) {
            const decorationType = vscode.window.createTextEditorDecorationType({
                backgroundColor: color,
                color: textColor,
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
    let r, g, b;

    if (color.startsWith('#')) {
        if (color.length === 4) {
            r = parseInt(color[1] + color[1], 16);
            g = parseInt(color[2] + color[2], 16);
            b = parseInt(color[3] + color[3], 16);
        } else {
            r = parseInt(color.slice(1, 3), 16);
            g = parseInt(color.slice(3, 5), 16);
            b = parseInt(color.slice(5, 7), 16);
        }
    } else {
        r = parseInt(color.match(/\d+/g)[0]);
        g = parseInt(color.match(/\d+/g)[1]);
        b = parseInt(color.match(/\d+/g)[2]);
    }

    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
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