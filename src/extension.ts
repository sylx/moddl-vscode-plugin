import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

let currentProcess: cp.ChildProcess | undefined;

export function activate(context: vscode.ExtensionContext) {
    // Play command
    let playCommand = vscode.commands.registerCommand('moddl.play', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'moddl') {
            vscode.window.showErrorMessage('No ModDL file is active');
            return;
        }

        // Save the file first
        await editor.document.save();
        const filePath = editor.document.uri.fsPath;

        // Get configuration
        const config = vscode.workspace.getConfiguration('moddl');
        const execPath = config.get<string>('executablePath') || 'moddl';
        const outputType = config.get<string>('defaultOutputType') || 'audio';

        try {
            if (currentProcess) {
                currentProcess.kill();
                currentProcess = undefined;
            }

            currentProcess = cp.spawn(execPath, [
                `--output=${outputType}`,
                filePath
            ]);

            currentProcess.stdout?.on('data', (data) => {
                console.log(`ModDL output: ${data}`);
            });

            currentProcess.stderr?.on('data', (data) => {
                console.error(`ModDL error: ${data}`);
                vscode.window.showErrorMessage(`ModDL error: ${data}`);
            });

            currentProcess.on('error', (err) => {
                vscode.window.showErrorMessage(`Failed to start ModDL: ${err.message}`);
            });

            vscode.window.showInformationMessage('ModDL playback started');
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to execute ModDL: ${err}`);
        }
    });

    // Stop command
    let stopCommand = vscode.commands.registerCommand('moddl.stop', () => {
        if (currentProcess) {
            currentProcess.kill();
            currentProcess = undefined;
            vscode.window.showInformationMessage('ModDL playback stopped');
        }
    });

    context.subscriptions.push(playCommand, stopCommand);
}

export function deactivate() {
    if (currentProcess) {
        currentProcess.kill();
        currentProcess = undefined;
    }
}