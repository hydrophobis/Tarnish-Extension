import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('Your Language extension is now active!');

    // Register compile command
    let compileCommand = vscode.commands.registerCommand('z.compile', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const document = editor.document;
        if (document.languageId !== 'z') {
            vscode.window.showErrorMessage('Current file is not a Z file');
            return;
        }

        // Save the file first
        document.save().then(() => {
            compileFile(document.fileName);
        });
    });

    // Auto-compile on save
    let onSaveHandler = vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.languageId === 'z') {
            const config = vscode.workspace.getConfiguration('z');
            const autoCompile = config.get('autoCompileOnSave', false);
            if (autoCompile) {
                compileFile(document.fileName);
            }
        }
    });

    context.subscriptions.push(compileCommand, onSaveHandler);

    // Register hover provider
    let hoverProvider = vscode.languages.registerHoverProvider('z', {
        provideHover(document, position, token) {
            const range = document.getWordRangeAtPosition(position);
            const word = document.getText(range);
            
            // Add hover information for keywords, built-ins, etc.
            const hoverInfo = getHoverInfo(word);
            if (hoverInfo) {
                return new vscode.Hover(hoverInfo);
            }
        }
    });

    context.subscriptions.push(hoverProvider);
}

function compileFile(filePath: string) {
    const config = vscode.workspace.getConfiguration('z');
    const compilerPath = config.get('compilerPath', 'your_compiler');
    
    const outputChannel = vscode.window.createOutputChannel('Your Language');
    outputChannel.show();
    outputChannel.appendLine(`Compiling: ${filePath}`);

    const command = `${compilerPath} "${filePath}"`;
    
    exec(command, { cwd: path.dirname(filePath) }, (error, stdout, stderr) => {
        if (error) {
            outputChannel.appendLine(`Error: ${error.message}`);
            vscode.window.showErrorMessage(`Compilation failed: ${error.message}`);
            return;
        }
        
        if (stderr) {
            outputChannel.appendLine(`stderr: ${stderr}`);
        }
        
        outputChannel.appendLine(`stdout: ${stdout}`);
        outputChannel.appendLine('Compilation completed successfully!');
        vscode.window.showInformationMessage('Compilation completed successfully!');
    });
}

function getHoverInfo(word: string): vscode.MarkdownString | null {
    const keywords: { [key: string]: string } = {
        'class': 'Define a new class',
        'int': 'Integer type',
        'float': 'Floating point number type',
        'string': 'String type',
        'return': 'Return a value from a function',
        '#import': 'Import another file'
    };

    if (keywords[word]) {
        const hover = new vscode.MarkdownString();
        hover.appendCodeblock(word, 'z');
        hover.appendMarkdown(keywords[word]);
        return hover;
    }

    return null;
}

export function deactivate() {}