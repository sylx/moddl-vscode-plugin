import React from 'react';
import { Button } from './ui/button';

interface MMLEditorProps {
  cursorPosition: { line: number; character: number };
}

export const MMLEditor: React.FC<MMLEditorProps> = ({ cursorPosition }) => {
  const [mmlText, setMmlText] = React.useState('');

  const handleUpdateMML = () => {
    // VSCode拡張にMMLの更新を通知
    const vscode = (window as any).vscode;
    if (vscode) {
      vscode.postMessage({
        type: 'updateMML',
        value: mmlText,
      });
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <textarea
        className="w-full h-32 p-2 border rounded"
        value={mmlText}
        onChange={(e) => setMmlText(e.target.value)}
        placeholder="Enter MML notation here..."
      />
      <div className="mt-4">
        <Button onClick={handleUpdateMML}>
          Update MML
        </Button>
      </div>
    </div>
  );
}; 