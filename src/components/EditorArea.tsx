/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useLayoutEffect, useState, useMemo, useCallback } from 'react';
import { EditorTheme, SupportedLanguage, SearchState } from '../types/editor';
import { highlightCodeLines, escapeHtml } from '../utils/syntaxHighlighter';
import { computeLineChanges } from '../utils/lineDiff';
import {
  handleSmartEnter,
  handleSmartTab,
  handleSmartBackspace,
  computeIndentGuideLevels,
  detectIndentSize
} from '../utils/smartIndent';

interface Props {
  content: string;
  savedContent?: string;
  originalContent?: string;
  language: SupportedLanguage;
  theme: EditorTheme;
  fontSize: number;
  wordWrap: boolean;
  smartIndent?: boolean;
  onChange: (newContent: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  cursorPos: { line: number; col: number; offset: number };
  setCursorPos: (pos: { line: number; col: number; offset: number }) => void;
  searchState?: SearchState;
}

function getVisualColumn(lineStr: string, charIdx: number, tabSize: number): number {
  let col = 0;
  for (let i = 0; i < charIdx && i < lineStr.length; i++) {
    if (lineStr[i] === '\t') {
      col += tabSize - (col % tabSize);
    } else {
      col++;
    }
  }
  return col;
}

interface LineSearchMatch {
  colStart: number;
  colEnd: number;
  isActive: boolean;
}

export const EditorArea: React.FC<Props> = ({
  content,
  savedContent,
  originalContent,
  language,
  theme,
  fontSize,
  wordWrap,
  smartIndent = true,
  onChange,
  textareaRef,
  cursorPos,
  setCursorPos,
  searchState
}) => {
  const gutterRef = useRef<HTMLDivElement>(null);
  const highlightOverlayRef = useRef<HTMLPreElement>(null);

  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);
  const [maxScrollLeft, setMaxScrollLeft] = useState(0);

  const lines = useMemo(() => {
    return (content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  }, [content]);

  // Dynamically detect file indent size (2 or 4 spaces) based on language conventions and content
  const tabSize = useMemo(() => {
    return detectIndentSize(lines, language);
  }, [lines, language]);

  // Visual Indent Guide Levels per line (computes column positions connecting brackets)
  const indentLevels = useMemo(() => {
    if (!smartIndent) return [];
    return computeIndentGuideLevels(lines, tabSize);
  }, [lines, smartIndent, tabSize]);

  // Active enclosing code block for indent guide highlighting (only highlights the block surrounding current cursor)
  const activeScope = useMemo(() => {
    if (!smartIndent || !cursorPos) return null;
    const currentLineIdx = cursorPos.line - 1;
    if (currentLineIdx < 0 || currentLineIdx >= lines.length) return null;

    const currentLvls = indentLevels[currentLineIdx];
    if (!currentLvls || currentLvls.length === 0) return null;
    const targetLvl = currentLvls[currentLvls.length - 1];
    if (targetLvl <= 0) return null;

    // Find block start (scan upwards)
    let startIdx = currentLineIdx;
    for (let i = currentLineIdx; i >= 0; i--) {
      const lvls = indentLevels[i];
      if (lvls && lvls.includes(targetLvl)) {
        startIdx = i;
      } else {
        break;
      }
    }

    // Find block end (scan downwards)
    let endIdx = currentLineIdx;
    for (let i = currentLineIdx; i < lines.length; i++) {
      const lvls = indentLevels[i];
      if (lvls && lvls.includes(targetLvl)) {
        endIdx = i;
      } else {
        break;
      }
    }

    return { startIdx, endIdx, targetLvl };
  }, [indentLevels, cursorPos, lines.length, smartIndent]);

  // Map from line index to list of search matches on that line
  const searchMatchesByLine = useMemo(() => {
    const map = new Map<number, LineSearchMatch[]>();
    if (!searchState || !searchState.isOpen || !searchState.query || !content) return map;

    try {
      const flags = searchState.matchCase ? 'g' : 'gi';
      const regex = searchState.useRegex
        ? new RegExp(searchState.query, flags)
        : new RegExp(searchState.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

      // Precalculate exact line start offsets based on normalized lines array
      const lineCount = lines.length;
      const lineStartOffsets = new Int32Array(lineCount);
      let runningOffset = 0;
      for (let i = 0; i < lineCount; i++) {
        lineStartOffsets[i] = runningOffset;
        runningOffset += lines[i].length + 1; // +1 for '\n'
      }

      const normalizedContent = lines.join('\n');
      let matchIdx = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(normalizedContent)) !== null) {
        if (match[0].length === 0) {
          regex.lastIndex++;
          continue;
        }
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;

        // Binary search to find the exact target line index containing matchStart
        let low = 0;
        let high = lineCount - 1;
        let targetLine = 0;

        while (low <= high) {
          const mid = (low + high) >> 1;
          if (lineStartOffsets[mid] <= matchStart) {
            targetLine = mid;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }

        const lineStartOffset = lineStartOffsets[targetLine];
        const currentLine = lines[targetLine] || '';
        const localStart = Math.max(0, matchStart - lineStartOffset);
        const localEnd = Math.min(currentLine.length, matchEnd - lineStartOffset);

        const colStart = getVisualColumn(currentLine, localStart, tabSize);
        const colEnd = getVisualColumn(currentLine, localEnd, tabSize);

        const isActive = searchState.totalMatches > 0 && matchIdx === searchState.currentMatchIndex;

        const item: LineSearchMatch = {
          colStart,
          colEnd: Math.max(colStart + 1, colEnd),
          isActive
        };

        const existing = map.get(targetLine) || [];
        existing.push(item);
        map.set(targetLine, existing);

        matchIdx++;
      }
    } catch {
      // Regex safety
    }

    return map;
  }, [searchState, content, lines, tabSize]);

  // Compute Notepad++ style line change statuses relative to saved snapshot and session original
  const [lineChanges, setLineChanges] = useState<('clean' | 'modified' | 'saved')[]>([]);
  const diffTimerRef = useRef<any>(null);

  useEffect(() => {
    if (diffTimerRef.current) clearTimeout(diffTimerRef.current);
    if (lines.length > 300) {
      // Debounce diffing on large files during rapid typing
      diffTimerRef.current = setTimeout(() => {
        setLineChanges(computeLineChanges(content, savedContent, originalContent));
      }, 120);
    } else {
      setLineChanges(computeLineChanges(content, savedContent, originalContent));
    }
    return () => {
      if (diffTimerRef.current) clearTimeout(diffTimerRef.current);
    };
  }, [content, savedContent, originalContent, lines.length]);

  // Proportional line height based on font size
  const lineHeightPx = Math.max(10, Math.round(fontSize * 1.55));

  // Dynamically calculate gutter width based on digit count and font size so no massive blank space remains
  const digitCount = Math.max(2, String(lines.length).length);
  const charWidth = fontSize * 0.62;
  const gutterWidthPx = Math.max(24, Math.ceil(16 + digitCount * charWidth));

  // Find length of longest line in the entire document for horizontal scroll sync
  const maxLineLength = useMemo(() => {
    let maxLen = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > maxLen) maxLen = lines[i].length;
    }
    return maxLen;
  }, [lines]);

  // Windowed rendering slice for high performance on 2000+ line files
  const isLargeFile = lines.length > 120 && !wordWrap;
  const bufferLines = 35;

  const startLineIdx = isLargeFile
    ? Math.max(0, Math.floor(scrollTop / lineHeightPx) - bufferLines)
    : 0;

  const endLineIdx = isLargeFile
    ? Math.min(lines.length, Math.ceil((scrollTop + viewportHeight) / lineHeightPx) + bufferLines)
    : lines.length;

  const topSpacerHeight = isLargeFile ? startLineIdx * lineHeightPx : 0;
  const bottomSpacerHeight = isLargeFile ? (lines.length - endLineIdx) * lineHeightPx : 0;

  // Synchronize scrolling between textarea, highlight layer, and gutter
  const animFrameId = useRef<number | null>(null);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const {
      scrollTop: sTop,
      scrollLeft: sLeft,
      scrollWidth,
      clientWidth,
      clientHeight
    } = e.currentTarget;

    setScrollLeft(sLeft);
    setScrollTop(sTop);
    if (clientHeight) setViewportHeight(clientHeight);
    setMaxScrollLeft(Math.max(0, scrollWidth - clientWidth));

    if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    animFrameId.current = requestAnimationFrame(() => {
      if (highlightOverlayRef.current) {
        highlightOverlayRef.current.scrollTop = sTop;
        highlightOverlayRef.current.scrollLeft = sLeft;
      }
      if (gutterRef.current) {
        gutterRef.current.scrollTop = sTop;
      }
    });
  };

  // Recompute scroll metrics on content or size change
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      setMaxScrollLeft(Math.max(0, el.scrollWidth - el.clientWidth));
    }
  }, [content, fontSize, wordWrap, textareaRef]);

  // Horizontal pan slider handler
  const handleHorizontalSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setScrollLeft(val);
    if (textareaRef.current) {
      textareaRef.current.scrollLeft = val;
    }
    if (highlightOverlayRef.current) {
      highlightOverlayRef.current.scrollLeft = val;
    }
  };

  // Track cursor position with DOM text synchronization
  const updateCursorPosition = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    const offset = el.selectionStart;
    const textBefore = el.value.substring(0, offset);
    const lineArr = textBefore.split('\n');
    const line = lineArr.length;
    const col = lineArr[lineArr.length - 1].length + 1;

    setCursorPos({ line, col, offset });
  }, [setCursorPos, textareaRef]);

  // Keep cursor position synced on content or file switch
  useEffect(() => {
    updateCursorPosition();
  }, [content, updateCursorPosition]);

  // Keyboard interceptor: Smart Indent, Smart Tab, Smart Backspace
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = textareaRef.current;
    if (!el) return;

    const { selectionStart, selectionEnd } = el;

    // Tab key: Smart Tab & Multi-line indent/outdent
    if (e.key === 'Tab') {
      e.preventDefault();
      const { newContent, newStart, newEnd } = handleSmartTab(
        content,
        selectionStart,
        selectionEnd,
        e.shiftKey
      );
      onChange(newContent);
      setTimeout(() => {
        el.selectionStart = newStart;
        el.selectionEnd = newEnd;
        updateCursorPosition();
      }, 0);
      return;
    }

    // Enter key: Smart Indentation
    if (e.key === 'Enter') {
      if (smartIndent) {
        e.preventDefault();
        const { newContent, newCursorPos } = handleSmartEnter(
          content,
          selectionStart,
          selectionEnd,
          language
        );
        onChange(newContent);
        setTimeout(() => {
          el.selectionStart = el.selectionEnd = newCursorPos;
          updateCursorPosition();
        }, 0);
        return;
      }
      // If smartIndent is false, let default browser newline behavior proceed
      return;
    }

    // Backspace: Smart dedent when cursor is within leading indentation spaces
    if (e.key === 'Backspace' && smartIndent) {
      const result = handleSmartBackspace(content, selectionStart, selectionEnd);
      if (result) {
        e.preventDefault();
        onChange(result.newContent);
        setTimeout(() => {
          el.selectionStart = el.selectionEnd = result.newCursorPos;
          updateCursorPosition();
        }, 0);
        return;
      }
    }

    // NOTE: Auto-closing brackets like { -> {} and automatic quotes/spaces have been removed
    // to give direct, natural typing control without unwanted assisted text insertion.
  };

  // Highlighted code lines with active theme
  const highlightedLines = useMemo(() => {
    try {
      return highlightCodeLines(content, language, theme);
    } catch {
      return (content || '').split('\n').map((l) => escapeHtml(l));
    }
  }, [content, language, theme]);

  // Track wrapped heights for each logical line to ensure the gutter line numbers align 1:1
  const [lineHeights, setLineHeights] = useState<number[]>([]);
  const measureTimerRef = useRef<any>(null);

  const measureLineHeights = useCallback(() => {
    if (!wordWrap) {
      setLineHeights([]);
      return;
    }
    const container = highlightOverlayRef.current;
    if (!container) return;

    if (measureTimerRef.current) clearTimeout(measureTimerRef.current);

    const runMeasure = () => {
      const children = container.children;
      const count = children.length;
      if (count === 0) return;

      const heights: number[] = new Array(count);
      const containerWidth = container.clientWidth || 300;
      const approxCharsPerLine = Math.floor(containerWidth / (fontSize * 0.62));

      for (let i = 0; i < count; i++) {
        const lineText = lines[i] || '';
        // Fast path: if the text line length is well below wrapping width, height is guaranteed lineHeightPx
        if (lineText.length < approxCharsPerLine) {
          heights[i] = lineHeightPx;
        } else {
          const el = children[i] as HTMLElement;
          heights[i] = el ? el.offsetHeight || lineHeightPx : lineHeightPx;
        }
      }

      setLineHeights(heights);
    };

    if (lines.length > 200) {
      measureTimerRef.current = setTimeout(runMeasure, 80);
    } else {
      runMeasure();
    }
  }, [wordWrap, lineHeightPx, lines, fontSize]);

  useLayoutEffect(() => {
    measureLineHeights();
  }, [content, wordWrap, fontSize, lineHeightPx, measureLineHeights]);

  useEffect(() => {
    if (!wordWrap || !highlightOverlayRef.current) return;

    const ro = new ResizeObserver(() => {
      measureLineHeights();
    });

    ro.observe(highlightOverlayRef.current);
    return () => ro.disconnect();
  }, [wordWrap, measureLineHeights]);

  const monoFontFamily =
    "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

  return (
    <div className="relative flex flex-col flex-1 w-full overflow-hidden select-none">
      <div
        className="relative flex flex-1 w-full overflow-hidden select-none"
        style={{
          backgroundColor: theme.bg,
          fontFamily: monoFontFamily,
          fontSize: `${fontSize}px`
        }}
      >
        {/* Line Numbers Gutter with Notepad++ Change Indicators */}
        <div
          ref={gutterRef}
          className="shrink-0 overflow-hidden border-r py-3 select-none transition-all"
          style={{
            width: `${gutterWidthPx}px`,
            backgroundColor: theme.gutterBg,
            borderColor: theme.surfaceBorder,
            color: theme.gutterText,
            fontFamily: monoFontFamily,
            fontSize: `${fontSize}px`,
            lineHeight: `${lineHeightPx}px`
          }}
        >
          {topSpacerHeight > 0 && <div style={{ height: `${topSpacerHeight}px` }} />}
          {lines.slice(startLineIdx, endLineIdx).map((_, sliceIdx) => {
            const index = startLineIdx + sliceIdx;
            const lineNum = index + 1;
            const isCurrent = lineNum === cursorPos.line;
            const status = lineChanges[index] || 'clean';

            // Calculate how many visual rows this logical line spans due to wrapping
            const measuredHeight =
              wordWrap && lineHeights[index] ? lineHeights[index] : lineHeightPx;
            const visualRows = Math.max(1, Math.round(measuredHeight / lineHeightPx));

            return (
              <div
                key={lineNum}
                style={{
                  height: `${visualRows * lineHeightPx}px`
                }}
                className="flex flex-col w-full"
              >
                {Array.from({ length: visualRows }).map((_, rIdx) => (
                  <div
                    key={rIdx}
                    style={{ height: `${lineHeightPx}px`, lineHeight: `${lineHeightPx}px` }}
                    className="flex items-center justify-between w-full px-1"
                  >
                    {/* Left indicator: Notepad++ style: modified (amber/orange), saved (green), clean (transparent) */}
                    <span
                      style={{ height: `${Math.max(6, lineHeightPx - 4)}px` }}
                      className={`w-1 rounded-full shrink-0 transition-all ${
                        rIdx === 0
                          ? status === 'modified'
                            ? 'bg-amber-400 shadow-[0_0_5px_rgba(245,158,11,0.7)]'
                            : status === 'saved'
                            ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.7)]'
                            : 'bg-transparent'
                          : 'bg-transparent'
                      }`}
                      title={
                        rIdx === 0
                          ? status === 'modified'
                            ? 'Unsaved modification'
                            : status === 'saved'
                            ? 'Saved modification'
                            : 'Unchanged'
                          : undefined
                      }
                    />

                    {/* Line number text: shown ONLY on the first visual row (rIdx === 0).
                        Wrapped continuation lines (rIdx > 0) have NO number! */}
                    <span
                      className="font-mono text-right flex-1 pr-1 select-none transition-colors"
                      style={{
                        color: isCurrent
                          ? (theme.isDark ? '#ffffff' : theme.accent)
                          : theme.gutterText,
                        fontWeight: isCurrent ? 700 : 400,
                        opacity: isCurrent ? 1 : 0.45
                      }}
                    >
                      {rIdx === 0 ? lineNum : ''}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
          {bottomSpacerHeight > 0 && <div style={{ height: `${bottomSpacerHeight}px` }} />}
        </div>

        {/* Editor Main Canvas (Dual Layer) */}
        <div className="relative flex-1 h-full overflow-hidden">
          {/* Layer 1: Syntax Highlight Display */}
          <pre
            ref={highlightOverlayRef}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 m-0 py-3 px-3 overflow-hidden select-none ${
              wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
            }`}
            style={{
              fontFamily: monoFontFamily,
              fontSize: `${fontSize}px`,
              lineHeight: `${lineHeightPx}px`,
              color: theme.text,
              boxSizing: 'border-box',
              tabSize: tabSize
            }}
          >
            {topSpacerHeight > 0 && <div style={{ height: `${topSpacerHeight}px` }} />}
            {/* Horizontal width sizer to ensure pre layer scrollWidth matches document max line width */}
            {!wordWrap && maxLineLength > 0 && (
              <div
                aria-hidden="true"
                style={{
                  width: `calc(${maxLineLength}ch + 36px)`,
                  height: '0px',
                  minHeight: '0px',
                  lineHeight: '0px',
                  overflow: 'hidden',
                  pointerEvents: 'none'
                }}
              />
            )}
            {highlightedLines.slice(startLineIdx, endLineIdx).map((lineHtml, sliceIdx) => {
              const index = startLineIdx + sliceIdx;
              const lineIndentLevels = indentLevels[index] || [];
              const isLineInActiveScope =
                activeScope &&
                index >= activeScope.startIdx &&
                index <= activeScope.endIdx;

              return (
                <div
                  key={index}
                  className={`relative ${wordWrap ? 'w-full' : 'min-w-full w-max'}`}
                  style={{
                    minHeight: `${lineHeightPx}px`,
                    lineHeight: `${lineHeightPx}px`
                  }}
                >
                  {/* Indent Guide vertical lines connecting brackets and code blocks */}
                  {smartIndent &&
                    lineIndentLevels.map((lvl) => {
                      const isActive = isLineInActiveScope && activeScope.targetLvl === lvl;
                      return (
                        <span
                          key={lvl}
                          aria-hidden="true"
                          className="pointer-events-none absolute top-0 bottom-0 select-none box-border"
                          style={{
                            left: `${(lvl - 1) * tabSize}ch`,
                            width: '0px',
                            borderLeftWidth: '1px',
                            borderLeftStyle: 'solid',
                            borderLeftColor: isActive
                              ? theme.isDark
                                ? 'rgba(96, 165, 250, 0.55)'
                                : 'rgba(37, 99, 235, 0.50)'
                              : theme.isDark
                              ? 'rgba(255, 255, 255, 0.10)'
                              : 'rgba(0, 0, 0, 0.08)'
                          }}
                        />
                      );
                    })}

                  {/* Search Matches Overlay Highlighting */}
                  {searchMatchesByLine.get(index)?.map((m, mIdx) => (
                    <span
                      key={mIdx}
                      aria-hidden="true"
                      className={`pointer-events-none absolute top-0 bottom-0 select-none rounded-[3px] transition-all ${
                        m.isActive ? 'z-10 animate-pulse' : 'z-0'
                      }`}
                      style={{
                        left: `${m.colStart}ch`,
                        width: `${m.colEnd - m.colStart}ch`,
                        backgroundColor: m.isActive
                          ? 'rgba(245, 158, 11, 0.65)'
                          : theme.isDark
                          ? 'rgba(234, 179, 8, 0.28)'
                          : 'rgba(234, 179, 8, 0.35)',
                        border: m.isActive
                          ? '2px solid #eab308'
                          : '1px solid rgba(234, 179, 8, 0.45)',
                        boxShadow: m.isActive
                          ? '0 0 12px rgba(234, 179, 8, 0.85), 0 0 0 1px #000000'
                          : 'none'
                      }}
                    />
                  ))}

                  <span
                    className="relative z-[2]"
                    dangerouslySetInnerHTML={{ __html: lineHtml || '<br />' }}
                  />
                </div>
              );
            })}
            {bottomSpacerHeight > 0 && <div style={{ height: `${bottomSpacerHeight}px` }} />}
          </pre>

          {/* Layer 2: Editable Interactive Textarea */}
          <textarea
            ref={textareaRef as any}
            value={content}
            onChange={(e) => {
              onChange(e.target.value);
              updateCursorPosition();
            }}
            onScroll={handleScroll}
            onClick={updateCursorPosition}
            onKeyUp={updateCursorPosition}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap={wordWrap ? 'soft' : 'off'}
            className={`hide-h-scrollbar absolute inset-0 h-full w-full resize-none border-0 bg-transparent py-3 px-3 text-transparent focus:outline-none focus:ring-0 ${
              wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
            }`}
            style={{
              fontFamily: monoFontFamily,
              fontSize: `${fontSize}px`,
              lineHeight: `${lineHeightPx}px`,
              color: 'transparent',
              caretColor: theme.text,
              boxSizing: 'border-box',
              tabSize: tabSize,
              ['--selection-bg' as any]: theme.isDark ? 'rgba(96, 165, 250, 0.40)' : 'rgba(37, 99, 235, 0.35)',
              ['--selection-text' as any]: 'transparent'
            }}
          />
        </div>
      </div>

      {/* Scroll Slider: ONLY appears when code actually exceeds screen boundaries horizontally without word wrap */}
      {!wordWrap && maxScrollLeft > 15 && (
        <div
          className="flex items-center gap-2 px-3 py-1 border-t shrink-0 select-none z-10 text-[10px]"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.surfaceBorder
          }}
        >
          <span className="font-mono text-neutral-400 shrink-0">Scroll X</span>
          <input
            type="range"
            min="0"
            max={maxScrollLeft}
            value={scrollLeft}
            onChange={handleHorizontalSlider}
            className="flex-1 h-1.5 bg-neutral-700 rounded appearance-none cursor-pointer accent-white"
          />
          <span className="font-mono text-neutral-400 shrink-0">
            {Math.round((scrollLeft / (maxScrollLeft || 1)) * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};
