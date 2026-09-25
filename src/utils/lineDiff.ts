/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LineChangeType = 'clean' | 'modified' | 'saved';

/**
 * Computes single LCS line diff returning 'clean' or 'changed' for each line in current.
 */
function computeSingleDiff(currentLines: string[], refLines: string[]): boolean[] {
  const m = currentLines.length;
  const n = refLines.length;

  if (m === 0) return [];
  if (n === 0) return new Array(m).fill(true);

  const isChanged = new Array(m).fill(false);

  // Common prefix
  let prefix = 0;
  while (prefix < n && prefix < m && refLines[prefix] === currentLines[prefix]) {
    prefix++;
  }

  // Common suffix
  let suffix = 0;
  while (
    suffix < n - prefix &&
    suffix < m - prefix &&
    refLines[n - 1 - suffix] === currentLines[m - 1 - suffix]
  ) {
    suffix++;
  }

  const midA = refLines.slice(prefix, n - suffix);
  const midB = currentLines.slice(prefix, m - suffix);
  const lenA = midA.length;
  const lenB = midB.length;

  if (lenB === 0) {
    return isChanged;
  }

  if (lenA === 0) {
    for (let j = 0; j < lenB; j++) {
      isChanged[prefix + j] = true;
    }
    return isChanged;
  }

  // LCS on the middle portion (cap at 5000 to keep diff calculation sub-millisecond)
  if (lenA * lenB <= 5000) {
    const dp: number[][] = Array.from({ length: lenA + 1 }, () =>
      new Array(lenB + 1).fill(0)
    );

    for (let i = 1; i <= lenA; i++) {
      for (let j = 1; j <= lenB; j++) {
        if (midA[i - 1] === midB[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    let i = lenA;
    let j = lenB;
    const isMatchedInB = new Array(lenB).fill(false);

    while (i > 0 && j > 0) {
      if (midA[i - 1] === midB[j - 1]) {
        isMatchedInB[j - 1] = true;
        i--;
        j--;
      } else if (dp[i][j - 1] >= dp[i - 1][j]) {
        j--;
      } else {
        i--;
      }
    }

    for (let jIdx = 0; jIdx < lenB; jIdx++) {
      if (!isMatchedInB[jIdx]) {
        isChanged[prefix + jIdx] = true;
      }
    }
  } else {
    // Hash fallback for massive blocks
    const refSet = new Set(midA);
    for (let j = 0; j < lenB; j++) {
      if (!refSet.has(midB[j])) {
        isChanged[prefix + j] = true;
      }
    }
  }

  return isChanged;
}

/**
 * Computes Notepad++ style line change statuses:
 * - 'modified' (Orange): Unsaved edits since last save.
 * - 'saved' (Green): Saved modifications in the current session (relative to original opened/reloaded content).
 * - 'clean' (Transparent): Unmodified lines.
 */
export function computeLineChanges(
  current: string,
  saved?: string,
  original?: string
): LineChangeType[] {
  const normCurrent = (current || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const currentLines = normCurrent.split('\n');
  const m = currentLines.length;

  if (m === 0) return [];

  const normSaved = (saved !== undefined ? saved : current || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const normOriginal = (original !== undefined ? original : normSaved).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Check diff against saved (unsaved changes -> orange/modified)
  const unsavedDiff = normCurrent === normSaved
    ? new Array(m).fill(false)
    : computeSingleDiff(currentLines, normSaved.split('\n'));

  // Check diff against original (session saved changes -> green/saved)
  const sessionDiff = normCurrent === normOriginal
    ? new Array(m).fill(false)
    : computeSingleDiff(currentLines, normOriginal.split('\n'));

  const result: LineChangeType[] = new Array(m).fill('clean');

  for (let idx = 0; idx < m; idx++) {
    if (unsavedDiff[idx]) {
      result[idx] = 'modified'; // Orange / unsaved
    } else if (sessionDiff[idx]) {
      result[idx] = 'saved';    // Green / saved in session
    } else {
      result[idx] = 'clean';    // Untouched
    }
  }

  return result;
}
