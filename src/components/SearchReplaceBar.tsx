/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ChevronUp,
  ChevronDown,
  X,
  Replace,
  Search
} from 'lucide-react';
import { EditorTheme, SearchState } from '../types/editor';

interface Props {
  theme: EditorTheme;
  searchState: SearchState;
  onUpdateSearch: (partial: Partial<SearchState>) => void;
  onLocate: () => void;
  onFindNext: () => void;
  onFindPrev: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

export const SearchReplaceBar: React.FC<Props> = ({
  theme,
  searchState,
  onUpdateSearch,
  onLocate,
  onFindNext,
  onFindPrev,
  onReplace,
  onReplaceAll,
  onClose
}) => {
  if (!searchState.isOpen) return null;

  return (
    <div
      className="flex flex-col gap-2 border-b p-2.5 text-xs shadow-md transition-all select-none z-30"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.surfaceBorder
      }}
    >
      {/* Row 1: Search input + Match Count + Locate + Nav + Mode toggles + Close */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <div className="relative flex-1 min-w-[140px]">
          <input
            type="text"
            placeholder="Find in script... (Enter for next)"
            value={searchState.query}
            onChange={(e) => onUpdateSearch({ query: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                  onFindPrev();
                } else {
                  onFindNext();
                }
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
            className="w-full rounded-lg border px-3 py-1.5 text-xs font-mono focus:outline-none"
            style={{
              backgroundColor: theme.bg,
              borderColor: theme.surfaceBorder,
              color: theme.text
            }}
            autoFocus
          />
        </div>

        {/* Counter Badge */}
        <span
          className="text-[11px] font-mono tabular-nums shrink-0 px-1 font-medium"
          style={{ color: searchState.totalMatches > 0 ? theme.text : theme.textMuted }}
        >
          {searchState.query
            ? `${searchState.totalMatches > 0 ? searchState.currentMatchIndex + 1 : 0}/${searchState.totalMatches}`
            : ''}
        </span>

        {/* Locate Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            (document.activeElement as HTMLElement)?.blur();
            onLocate();
          }}
          disabled={searchState.totalMatches === 0}
          title="Locate / Scroll to current match"
          className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold transition-all active:scale-95 disabled:opacity-30 shrink-0"
          style={{
            backgroundColor: theme.accent,
            color: theme.accentText
          }}
        >
          <Search className="h-3 w-3 stroke-[2.5]" />
          <span>Locate</span>
        </button>

        {/* Prev / Next Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onFindPrev}
            disabled={searchState.totalMatches === 0}
            title="Previous match (Shift+Enter)"
            className="flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium disabled:opacity-30 active:scale-95 shrink-0"
            style={{
              backgroundColor: theme.bg,
              borderColor: theme.surfaceBorder,
              color: theme.text
            }}
          >
            <ChevronUp className="h-3.5 w-3.5" />
            <span className="hidden xs:inline text-[10px]">Prev</span>
          </button>
          <button
            onClick={onFindNext}
            disabled={searchState.totalMatches === 0}
            title="Next match (Enter)"
            className="flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium disabled:opacity-30 active:scale-95 shrink-0"
            style={{
              backgroundColor: theme.bg,
              borderColor: theme.surfaceBorder,
              color: theme.text
            }}
          >
            <ChevronDown className="h-3.5 w-3.5" />
            <span className="hidden xs:inline text-[10px]">Next</span>
          </button>
        </div>

        {/* Mode toggles: Case Sensitive & Regex */}
        <button
          onClick={() => onUpdateSearch({ matchCase: !searchState.matchCase })}
          title="Match Case"
          className="flex h-7 px-2 items-center justify-center rounded-md border text-[10px] font-mono font-bold shrink-0 transition-all active:scale-95"
          style={{
            backgroundColor: searchState.matchCase ? theme.accent : theme.bg,
            color: searchState.matchCase ? theme.accentText : theme.textMuted,
            borderColor: theme.surfaceBorder
          }}
        >
          Aa
        </button>

        <button
          onClick={() => onUpdateSearch({ useRegex: !searchState.useRegex })}
          title="Use Regex"
          className="flex h-7 px-2 items-center justify-center rounded-md border text-[10px] font-mono font-bold shrink-0 transition-all active:scale-95"
          style={{
            backgroundColor: searchState.useRegex ? theme.accent : theme.bg,
            color: searchState.useRegex ? theme.accentText : theme.textMuted,
            borderColor: theme.surfaceBorder
          }}
        >
          .*
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md hover:opacity-80 shrink-0"
          style={{ color: theme.textMuted }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Row 2: Replace Input + Action Buttons */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Replace with..."
          value={searchState.replaceText}
          onChange={(e) => onUpdateSearch({ replaceText: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onReplace();
            }
          }}
          className="flex-1 rounded-lg border px-3 py-1.5 text-xs font-mono focus:outline-none"
          style={{
            backgroundColor: theme.bg,
            borderColor: theme.surfaceBorder,
            color: theme.text
          }}
        />

        <button
          onClick={onReplace}
          disabled={searchState.totalMatches === 0}
          className="flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium disabled:opacity-30 active:scale-95 shrink-0"
          style={{
            backgroundColor: theme.bg,
            borderColor: theme.surfaceBorder,
            color: theme.text
          }}
        >
          <Replace className="h-3 w-3" />
          <span>Replace</span>
        </button>

        <button
          onClick={onReplaceAll}
          disabled={searchState.totalMatches === 0}
          className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold disabled:opacity-30 active:scale-95 shrink-0"
          style={{
            backgroundColor: theme.accent,
            color: theme.accentText
          }}
        >
          <span>All</span>
        </button>
      </div>
    </div>
  );
};
