import * as vscode from 'vscode';
import { join } from 'path';

export class ModdlWebviewProvider {
  private _panel?: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  constructor(
    private readonly _extensionUri: vscode.Uri,
  ) {
    // エディタの変更を監視
    this._disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this._update()),
      vscode.workspace.onDidChangeTextDocument(e => {
        if (e.document === vscode.window.activeTextEditor?.document) {
          this._update();
        }
      })
    );
  }

  public showPreview() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'moddl') {
      vscode.window.showErrorMessage('No ModDL file is active');
      return;
    }

    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    this._panel = vscode.window.createWebviewPanel(
      'moddl.graphicalEditor',
      'ModDL Graphical Editor',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
        retainContextWhenHidden: true,
      }
    );

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    // メッセージハンドラーの設定
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'updateEnvelope':
            await this._updateEnvelope(message.value);
            return;
          case 'updateMML':
            await this._updateMML(message.value);
            return;
        }
      }
    );

    // パネルが閉じられたときのクリーンアップ
    this._panel.onDidDispose(() => {
      this._panel = undefined;
    }, null, this._disposables);

    this._update();
  }

  private _update() {
    const editor = vscode.window.activeTextEditor;
    if (!this._panel || !editor || editor.document.languageId !== 'moddl') {
      return;
    }

    // エディタの内容をプレビューに送信
    this._panel.webview.postMessage({
      type: 'update',
      content: editor.document.getText(),
      position: {
        line: editor.selection.active.line,
        character: editor.selection.active.character
      }
    });
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

  public dispose() {
    if (this._panel) {
      this._panel.dispose();
    }
    this._disposables.forEach(d => d.dispose());
  }
} 