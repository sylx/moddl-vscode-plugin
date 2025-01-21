import React from 'react';
import { atom, useAtom } from 'jotai';
import { EnvelopeEditor } from './EnvelopeEditor';
import { MMLEditor } from './MMLEditor';

// エディタの状態を管理するatom
export const editorModeAtom = atom<'envelope' | 'mml'>('envelope');
export const cursorPositionAtom = atom<{ line: number; character: number }>({ line: 0, character: 0 });

export const ModdlEditor: React.FC = () => {
  const [editorMode] = useAtom(editorModeAtom);
  const [cursorPosition] = useAtom(cursorPositionAtom);

  return (
    <div className="p-4">
        hogehoge
      {editorMode === 'envelope' ? (
        <EnvelopeEditor cursorPosition={cursorPosition} />
      ) : (
        <MMLEditor cursorPosition={cursorPosition} />
      )}
    </div>
  );
}; 