/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Undo2,
  Redo2,
  ChevronLeft,
  ChevronRight,
  Indent,
  Outdent,
  MessageSquareCode
} from 'lucide-react';
import { EditorTheme } from '../types/editor';

interface Props {
  theme: EditorTheme;
  onInsertSymbol: (symbol: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onIndent: () => void;
  onOutdent: () => void;
  onToggleComment: () => void;
  onMoveCursor: (dir: 'left' | 'right') => void;
}

const SYMBOLS = [
  '{', '}', '(', ')', '[', ']', ';', ':', '=', '>', '<',
  '/', '"', "'", '`', '\\', '$', '#', '!', '?', '&', '|',
  '+', '-', '*', '%', '~', '^', '_', '@'
];

export const AccessoryBar: React.FC<Props> = ({
  theme,
  onInsertSymbol,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onIndent,
  onOutdent,
  onToggleComment,
  onMoveCursor
}) => {
  return (
    <div
      className="flex h-11 w-full items-center border-t px-2 select-none z-20 shrink-0"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.surfaceBorder
      }}
    >
      {/* Pinned Undo/Redo actions */}
      <div className="flex items-center gap-1 pr-2 border-r" style={{ borderColor: theme.surfaceBorder }}>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-all active:scale-95 disabled:opacity-30"
          style={{
            backgroundColor: theme.bg,
            color: theme.text
          }}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-all active:scale-95 disabled:opacity-30"
          style={{
            backgroundColor: theme.bg,
            color: theme.text
          }}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={onToggleComment}
          title="Comment line"
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-all active:scale-95"
          style={{
            backgroundColor: theme.bg,
            color: theme.text
          }}
        >
          <MessageSquareCode className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => onMoveCursor('left')}
          title="Left"
          className="flex h-8 w-7 items-center justify-center rounded-lg transition-all active:scale-95"
          style={{
            backgroundColor: theme.bg,
            color: theme.text
          }}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => onMoveCursor('right')}
          title="Right"
          className="flex h-8 w-7 items-center justify-center rounded-lg transition-all active:scale-95"
          style={{
            backgroundColor: theme.bg,
            color: theme.text
          }}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Horizontal Scrollable Symbol Row */}
      <div className="flex flex-1 items-center gap-1 overflow-x-auto px-2 no-scrollbar">
        {/* Tab symbol shortcut */}
        <button
          onClick={() => onInsertSymbol('  ')}
          className="flex h-8 px-2.5 items-center justify-center rounded-lg font-mono text-xs font-semibold shrink-0 transition-all active:scale-95"
          style={{
            backgroundColor: theme.bg,
            color: theme.text
          }}
          title="Insert Tab (2 spaces)"
        >
          Tab
        </button>

        {SYMBOLS.map((sym) => (
          <button
            key={sym}
            onClick={() => onInsertSymbol(sym)}
            className="flex h-8 min-w-[32px] px-2 items-center justify-center rounded-lg font-mono text-xs font-medium shrink-0 transition-all active:scale-95 hover:opacity-80"
            style={{
              backgroundColor: theme.bg,
              color: theme.text
            }}
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
};
