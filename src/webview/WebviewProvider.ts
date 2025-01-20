import * as vscode from 'vscode';
import { join } from 'path';

export class ModdlWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'moddl.graphicalEditor';

  constructor(
    private readonly _extensionUri: vscode.Uri,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri
      ]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // メッセージハンドラーの設定
    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'updateEnvelope':
            await this._updateEnvelope(message.value);
            return;
          case 'updateMML':
            await this._updateMML(message.value);
            return;
        }
      },
      undefined,
      context.subscriptions
    );

    // エディタのカーソル位置変更を監視
    vscode.window.onDidChangeTextEditorSelection(
      (e) => {
        if (e.textEditor.document.languageId === 'moddl') {
          const position = e.selections[0].active;
          webviewView.webview.postMessage({
            type: 'cursorMove',
            position: {
              line: position.line,
              character: position.character
            }
          });
        }
      },
      undefined,
      context.subscriptions
    );
  }

  private async _updateEnvelope(points: { x: number; y: number }[]) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    // エンベロープの更新処理を実装
    // TODO: カーソル位置のadsrEnvを更新
  }

  private async _updateMML(mml: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    // MMLの更新処理を実装
    // TODO: カーソル位置のMMLを更新
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'main.js')
    );

    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'styles', 'globals.css')
    );

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet">
        <title>ModDL Graphical Editor</title>
      </head>
      <body>
        <div id="root"></div>
        <script src="${scriptUri}"></script>
      </body>
      </html>`;
  }
} 