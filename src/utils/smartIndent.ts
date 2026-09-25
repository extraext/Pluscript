/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SupportedLanguage } from '../types/editor';

export interface SmartIndentResult {
  newContent: string;
  newCursorPos: number;
}

const INDENT_UNIT = '  '; // 2 spaces

/**
 * Handles Enter key with Smart Indentation:
 * - Preserves indentation of previous line
 * - Detects block openers ({, [, (, :, =>) and adds an extra indent level
 * - Handles split bracket expansion ({|} -> creates newline + indent + newline + close bracket)
 */
export function handleSmartEnter(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  language: SupportedLanguage
): SmartIndentResult {
  const before = content.substring(0, selectionStart);
  const after = content.substring(selectionEnd);

  const lastNewlineIndex = before.lastIndexOf('\n');
  const currentLineBefore = lastNewlineIndex === -1 ? before : before.substring(lastNewlineIndex + 1);

  // Extract base leading indentation
  const indentMatch = currentLineBefore.match(/^(\s*)/);
  const baseIndent = indentMatch ? indentMatch[1] : '';

  const trimmedBefore = currentLineBefore.trimEnd();
  const charBefore = before.slice(-1);
  const charAfter = after.slice(0, 1);

  // Split bracket expansion: cursor is between matching open & close brackets
  // e.g. {|} or [|] or (|)
  const isSplitPair =
    (charBefore === '{' && charAfter === '}') ||
    (charBefore === '[' && charAfter === ']') ||
    (charBefore === '(' && charAfter === ')');

  if (isSplitPair) {
    const innerIndent = baseIndent + INDENT_UNIT;
    const insertText = '\n' + innerIndent + '\n' + baseIndent;
    const newContent = before + insertText + after;
    const newCursorPos = selectionStart + 1 + innerIndent.length;

    return { newContent, newCursorPos };
  }

  // Detect block openers
  let extraIndent = '';
  if (language === 'python') {
    // In Python, lines ending with colon ':' open a suite
    if (trimmedBefore.endsWith(':')) {
      extraIndent = INDENT_UNIT;
    }
  } else {
    // In C-like, JS, TS, HTML, CSS, JSON, etc.
    const lastChar = trimmedBefore.slice(-1);
    if (lastChar === '{' || lastChar === '[' || lastChar === '(' || trimmedBefore.endsWith('=>')) {
      extraIndent = INDENT_UNIT;
    }
  }

  const nextIndent = baseIndent + extraIndent;
  const newContent = before + '\n' + nextIndent + after;
  const newCursorPos = selectionStart + 1 + nextIndent.length;

  return { newContent, newCursorPos };
}

/**
 * Handles Tab and Shift+Tab key:
 * - Multi-line selection: indents or outdents all lines spanned by selection
 * - Single cursor: inserts 2 spaces (Tab) or removes up to 2 leading spaces (Shift+Tab)
 */
export function handleSmartTab(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  shiftKey: boolean
): {
  newContent: string;
  newStart: number;
  newEnd: number;
} {
  // If multi-line selection exists
  if (selectionStart !== selectionEnd && content.substring(selectionStart, selectionEnd).includes('\n')) {
    const startLinePos = content.lastIndexOf('\n', selectionStart - 1) + 1;
    const endLinePosIdx = content.indexOf('\n', selectionEnd);
    const endLinePos = endLinePosIdx === -1 ? content.length : endLinePosIdx;

    const selectedBlock = content.substring(startLinePos, endLinePos);
    const lines = selectedBlock.split('\n');

    let totalOffsetStart = 0;
    let totalOffsetEnd = 0;

    const modifiedLines = lines.map((line, idx) => {
      if (!shiftKey) {
        // Indent: add 2 spaces to beginning of each line
        if (idx === 0) totalOffsetStart += INDENT_UNIT.length;
        totalOffsetEnd += INDENT_UNIT.length;
        return INDENT_UNIT + line;
      } else {
        // Outdent: remove up to 2 leading spaces
        const spacesToRemove = line.startsWith('  ') ? 2 : line.startsWith(' ') ? 1 : line.startsWith('\t') ? 1 : 0;
        if (spacesToRemove > 0) {
          if (idx === 0) totalOffsetStart -= Math.min(spacesToRemove, selectionStart - startLinePos);
          totalOffsetEnd -= spacesToRemove;
          return line.substring(spacesToRemove);
        }
        return line;
      }
    });

    const newBlock = modifiedLines.join('\n');
    const newContent = content.substring(0, startLinePos) + newBlock + content.substring(endLinePos);
    const newStart = Math.max(startLinePos, selectionStart + totalOffsetStart);
    const newEnd = Math.max(newStart, selectionEnd + totalOffsetEnd);

    return { newContent, newStart, newEnd };
  }

  // Single line / collapsed cursor
  if (shiftKey) {
    // Shift+Tab: Outdent current line
    const lineStart = content.lastIndexOf('\n', selectionStart - 1) + 1;
    const line = content.substring(lineStart);
    const spacesToRemove = line.startsWith('  ') ? 2 : line.startsWith(' ') ? 1 : line.startsWith('\t') ? 1 : 0;

    if (spacesToRemove > 0) {
      const newContent =
        content.substring(0, lineStart) + content.substring(lineStart + spacesToRemove);
      const newPos = Math.max(lineStart, selectionStart - spacesToRemove);
      return { newContent, newStart: newPos, newEnd: newPos };
    }

    return { newContent: content, newStart: selectionStart, newEnd: selectionEnd };
  } else {
    // Tab: Insert 2 spaces
    const before = content.substring(0, selectionStart);
    const after = content.substring(selectionEnd);
    const newContent = before + INDENT_UNIT + after;
    const newPos = selectionStart + INDENT_UNIT.length;
    return { newContent, newStart: newPos, newEnd: newPos };
  }
}

/**
 * Smart Backspace:
 * If the characters immediately preceding cursor are leading indentation spaces,
 * delete a full indent level (2 spaces) instead of a single space.
 */
export function handleSmartBackspace(
  content: string,
  selectionStart: number,
  selectionEnd: number
): SmartIndentResult | null {
  if (selectionStart !== selectionEnd || selectionStart < 2) return null;

  const lineStart = content.lastIndexOf('\n', selectionStart - 1) + 1;
  const textBeforeCursorOnLine = content.substring(lineStart, selectionStart);

  // Check if text up to cursor is only whitespace and ends with 2 spaces
  if (/^ +$/.test(textBeforeCursorOnLine) && textBeforeCursorOnLine.endsWith(INDENT_UNIT)) {
    const before = content.substring(0, selectionStart - INDENT_UNIT.length);
    const after = content.substring(selectionStart);
    return {
      newContent: before + after,
      newCursorPos: selectionStart - INDENT_UNIT.length
    };
  }

  return null;
}

/**
 * Automatically detects the indent unit (2 or 4 spaces) based on language conventions and content sampling.
 */
export function detectIndentSize(lines: string[], language: SupportedLanguage): number {
  const default4Lang = ['csharp', 'python', 'java', 'c', 'cpp', 'rust', 'go', 'php', 'bash', 'sql'];
  const defaultTabSize = default4Lang.includes(language) ? 4 : 2;

  if (!lines || lines.length === 0) return defaultTabSize;

  const sample = lines.slice(0, 150);
  const indents: number[] = [];

  for (const line of sample) {
    let spaces = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === ' ') spaces++;
      else if (line[i] === '\t') spaces += 4;
      else break;
    }
    if (spaces > 0) indents.push(spaces);
  }

  if (indents.length < 2) return defaultTabSize;

  let count4 = 0;
  let count2 = 0;
  for (const s of indents) {
    if (s % 4 === 0) count4++;
    if (s % 2 === 0 && s % 4 !== 0) count2++;
  }

  if (count4 > count2) return 4;
  if (count2 > count4) return 2;

  return defaultTabSize;
}

/**
 * Computes visual indent guide levels for each line in the file.
 * Returns an array of level numbers for each line (e.g. [1, 2] for 8 leading spaces with tabSize 4).
 * Empty/blank lines inherit the surrounding scope indentation so vertical guide lines seamlessly
 * connect matching opening and closing brackets across blank lines.
 */
export function computeIndentGuideLevels(
  lines: string[],
  tabSize: number = 4
): number[][] {
  const lineCount = lines.length;
  if (lineCount === 0) return [];

  const rawLevels = new Int16Array(lineCount);

  for (let i = 0; i < lineCount; i++) {
    const str = lines[i];
    let spaces = 0;
    let hasContent = false;
    for (let c = 0; c < str.length; c++) {
      const ch = str.charCodeAt(c);
      if (ch === 32) {
        spaces++;
      } else if (ch === 9) {
        spaces += tabSize;
      } else {
        hasContent = true;
        break;
      }
    }
    rawLevels[i] = hasContent ? Math.floor(spaces / tabSize) : -1;
  }

  // Backfill empty lines with minimum of surrounding non-empty lines
  for (let i = 0; i < lineCount; i++) {
    if (rawLevels[i] === -1) {
      let prev = 0;
      for (let p = i - 1; p >= 0; p--) {
        if (rawLevels[p] !== -1) {
          prev = rawLevels[p];
          break;
        }
      }
      let next = 0;
      for (let n = i + 1; n < lineCount; n++) {
        if (rawLevels[n] !== -1) {
          next = rawLevels[n];
          break;
        }
      }
      rawLevels[i] = Math.max(0, Math.min(prev, next));
    }
  }

  const result: number[][] = new Array(lineCount);
  for (let i = 0; i < lineCount; i++) {
    const lvl = rawLevels[i];
    if (lvl <= 0) {
      result[i] = [];
    } else {
      const arr = new Array(lvl);
      for (let k = 1; k <= lvl; k++) arr[k - 1] = k;
      result[i] = arr;
    }
  }

  return result;
}
