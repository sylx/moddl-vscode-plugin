import React from 'react';
import { createRoot } from 'react-dom/client';
import { ModdlEditor, editorModeAtom, cursorPositionAtom } from './components/ModdlEditor';
import { Provider, useSetAtom } from 'jotai';
import './styles/globals.css';

// VSCodeのWebView APIを型定義
declare global {
  interface Window {
    vscode: {
      postMessage: (message: any) => void;
    };
  }
}

const App: React.FC = () => {
  const setEditorMode = useSetAtom(editorModeAtom);
  const setCursorPosition = useSetAtom(cursorPositionAtom);

  React.useEffect(() => {
    // VSCodeからのメッセージを受け取る
    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.type) {
        case 'cursorMove':
          setCursorPosition(message.position);
          // カーソル位置に基づいてエディタモードを切り替え
          // TODO: 実際のModDLファイルの解析に基づいて切り替える
          setEditorMode(message.position.line < 10 ? 'envelope' : 'mml');
          break;
      }
    });
  }, [setEditorMode, setCursorPosition]);

  return <ModdlEditor />;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <Provider>
      <App />
    </Provider>
  </React.StrictMode>
); 