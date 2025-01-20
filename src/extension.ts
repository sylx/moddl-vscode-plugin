import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ModdlWebviewProvider } from './WebviewProvider';

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

// moddlのstderr,stdoutを処理する
const showLog = (msg: string, mode: 'stdout' | 'stderr' = 'stdout') => {
    console.log(mode, msg);
    mode === 'stdout' ? vscode.window.showInformationMessage(msg) : vscode.window.showErrorMessage(msg);
};

// moddlコマンドを実行して、stdout,stderrを処理する
const execModdl = (execPath: string, args: string[], token: vscode.CancellationToken): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        const process = cp.spawn(execPath, args);

        // キャンセル時の処理
        token.onCancellationRequested(() => {
            process.kill();
            reject(new Error('Operation cancelled'));
        });

        process.stdout?.on('data', (data) => {
            showLog(data.toString(), 'stdout');
        });

        process.stderr?.on('data', (data) => {
            showLog(data.toString(), 'stderr');
        });

        process.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`ModDL process exited with code ${code}`));
            }
            resolve();
        });

        process.on('error', (err) => {
            reject(err);
        });
    });
};

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

const checkEditorIsModdlMode = (editor: vscode.TextEditor | undefined) => {
    if (!editor || editor.document.languageId !== 'moddl') {
        vscode.window.showErrorMessage('No ModDL file is active');
        return false;
    }
    return true;
};

export function activate(context: vscode.ExtensionContext) {
    // キャンセルトークンソースを保持
    let tokenSource: vscode.CancellationTokenSource | undefined;

    // Webview provider
    const provider = new ModdlWebviewProvider(context.extensionUri);
    context.subscriptions.push({ dispose: () => provider.dispose() });

    // Open webview command
    const openWebviewCommand = vscode.commands.registerCommand('moddl.openWebview', () => {
        provider.showPreview();
    });

    // Existing play command
    const playCommand = vscode.commands.registerCommand('moddl.play', async () => {
        const editor = vscode.window.activeTextEditor as vscode.TextEditor;
        if (!checkEditorIsModdlMode(editor)) {
            return;
        }
        await editor.document.save();
        const filePath = editor.document.uri.fsPath;

        const config = vscode.workspace.getConfiguration('moddl');
        const execPath = config.get<string>('executablePath') || 'moddl';
        const outputType = config.get<string>('defaultOutputType') || 'audio';

        // 既存の実行をキャンセル
        if (tokenSource) {
            tokenSource.cancel();
            //前の実行のfinallyでtokenSourceが破棄されるのを待つ
            while (tokenSource) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
        
        // 新しいトークンソースを作成
        tokenSource = new vscode.CancellationTokenSource();

        try {
            await execModdl(execPath, [`--output=${outputType}`, filePath], tokenSource.token);
        } catch (error) {
            if (tokenSource.token.isCancellationRequested) {
                vscode.window.showInformationMessage('ModDL playback stopped');
            } else {
                throw error;
            }
        } finally {
            tokenSource.dispose();
            tokenSource = undefined;
        }
    });

    // Existing stop command
    const stopCommand = vscode.commands.registerCommand('moddl.stop', () => {
        if (tokenSource) {
            tokenSource.cancel();
        }else{
            showLog('No playback to stop', 'stderr');
        }
    });

    // New export command
    const exportCommand = vscode.commands.registerCommand('moddl.export', async () => {
        const editor = vscode.window.activeTextEditor as vscode.TextEditor;
        if (!checkEditorIsModdlMode(editor)) {
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

        // Export用の新しいトークンソース
        const exportTokenSource = new vscode.CancellationTokenSource();

        try {
            // Create progress notification
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Exporting audio file...",
                cancellable: true
            }, async (progress, token) => {
                // First export as WAV if needed
                const tempWavPath = exportFormat === 'wav' ?
                    outputPath :
                    path.join(os.tmpdir(), `${path.basename(sourceFilePath, '.moddl')}_temp.wav`);

                progress.report({ message: "Generating audio..." });

                // Run ModDL to generate WAV
                await execModdl(execPath, [
                    '--output-file', tempWavPath,
                    sourceFilePath
                ], token);

                // Convert to desired format if needed
                if (exportFormat !== 'wav') {
                    progress.report({ message: "Converting format..." });
                    await convertAudioFormat(tempWavPath, outputPath, ffmpegPath);
                }
            });
            vscode.window.showInformationMessage(`Audio exported successfully to ${outputPath}`);
        } catch (err) {
            if (err instanceof Error && err.message === 'Operation cancelled') {
                vscode.window.showInformationMessage('Export cancelled');
            } else {
                vscode.window.showErrorMessage(`Failed to export audio: ${err}`);
            }
        } finally {
            exportTokenSource.dispose();
        }
    });

    context.subscriptions.push(playCommand, stopCommand, exportCommand, openWebviewCommand);
}

export function deactivate() {
    // Ensure any remaining token sources are disposed
}