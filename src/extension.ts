import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

let currentProcess: cp.ChildProcess | undefined;

// Helper function to check if ffmpeg is available
async function checkFfmpeg(ffmpegPath: string): Promise<boolean> {
    try {
        await new Promise<void>((resolve, reject) => {
            cp.exec(`${ffmpegPath} -version`, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
        return true;
    } catch {
        return false;
    }
}

// Helper function to ensure directory exists
function ensureDirectoryExists(filePath: string) {
    const dirname = path.dirname(filePath);
    if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
    }
}

async function convertAudioFormat(inputPath: string, outputPath: string, ffmpegPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const process = cp.spawn(ffmpegPath, [
            '-i', inputPath,
            '-y', // Overwrite output file if it exists
            outputPath
        ]);

        process.on('close', (code) => {
            if (code === 0) {
                // Clean up temporary WAV file if needed
                if (inputPath !== outputPath) {
                    fs.unlinkSync(inputPath);
                }
                resolve();
            } else {
                reject(new Error(`FFmpeg process exited with code ${code}`));
            }
        });

        process.on('error', (err) => {
            reject(err);
        });
    });
}

export function activate(context: vscode.ExtensionContext) {
    // Existing play command
    let playCommand = vscode.commands.registerCommand('moddl.play', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'moddl') {
            vscode.window.showErrorMessage('No ModDL file is active');
            return;
        }

        await editor.document.save();
        const filePath = editor.document.uri.fsPath;

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

    // Existing stop command
    let stopCommand = vscode.commands.registerCommand('moddl.stop', () => {
        if (currentProcess) {
            currentProcess.kill();
            currentProcess = undefined;
            vscode.window.showInformationMessage('ModDL playback stopped');
        }
    });

    // New export command
    let exportCommand = vscode.commands.registerCommand('moddl.export', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'moddl') {
            vscode.window.showErrorMessage('No ModDL file is active');
            return;
        }

        await editor.document.save();
        const sourceFilePath = editor.document.uri.fsPath;
        const config = vscode.workspace.getConfiguration('moddl');
        const execPath = config.get<string>('executablePath') || 'moddl';
        const exportFormat = config.get<string>('exportFormat') || 'wav';
        const ffmpegPath = config.get<string>('ffmpegPath') || 'ffmpeg';

        // Check if ffmpeg is needed and available
        if (exportFormat !== 'wav') {
            const ffmpegAvailable = await checkFfmpeg(ffmpegPath);
            if (!ffmpegAvailable) {
                vscode.window.showErrorMessage('FFmpeg is required for mp3/m4a export but not found. Please install FFmpeg and configure its path in settings.');
                return;
            }
        }

        // Ask user for save location
        const defaultName = path.basename(sourceFilePath, '.moddl') + '.' + exportFormat;
        const saveUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(path.join(path.dirname(sourceFilePath), defaultName)),
            filters: {
                'Audio Files': [exportFormat]
            }
        });

        if (!saveUri) {
            return;
        }

        const outputPath = saveUri.fsPath;
        ensureDirectoryExists(outputPath);

        try {
            // Create progress notification
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Exporting audio file...",
                cancellable: false
            }, async (progress) => {
                // First export as WAV if needed
                const tempWavPath = exportFormat === 'wav' ? 
                    outputPath : 
                    path.join(os.tmpdir(), `${path.basename(sourceFilePath, '.moddl')}_temp.wav`);

                progress.report({ message: "Generating audio..." });

                // Run ModDL to generate WAV
                await new Promise<void>((resolve, reject) => {
                    const process = cp.spawn(execPath, [
                        '--output-file', tempWavPath,
                        sourceFilePath
                    ]);

                    process.stderr?.on('data', (data) => {
                        console.error(`ModDL error: ${data}`);
                    });

                    process.on('close', (code) => {
                        if (code === 0) {
                            resolve();
                        } else {
                            reject(new Error(`ModDL process exited with code ${code}`));
                        }
                    });

                    process.on('error', reject);
                });

                // Convert to desired format if needed
                if (exportFormat !== 'wav') {
                    progress.report({ message: "Converting format..." });
                    await convertAudioFormat(tempWavPath, outputPath, ffmpegPath);
                }
            });

            vscode.window.showInformationMessage(`Audio exported successfully to ${outputPath}`);
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to export audio: ${err}`);
        }
    });

    context.subscriptions.push(playCommand, stopCommand, exportCommand);
}

export function deactivate() {
    if (currentProcess) {
        currentProcess.kill();
        currentProcess = undefined;
    }
}