/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CustomLanguageDefinition {
  id: string; // e.g. 'kos'
  name: string; // e.g. 'kOS'
  extensions: string[]; // e.g. ['ks']
  caseSensitive?: boolean;
  comments: {
    line?: string; // e.g. '//'
    blockStart?: string; // e.g. '/*'
    blockEnd?: string; // e.g. '*/'
  };
  keywordGroups: {
    group: number;
    color: string; // 'control' | 'commands' | 'boundvariables' | 'constants' | etc.
    words: string[];
  }[];
  strings: {
    start: string;
    end: string;
    escape?: string;
  }[];
  operators: string[];
  rawXml?: string;
}

const STORAGE_KEY = 'pluscript_custom_languages_v1';

/**
 * Sanitizes input XML to gracefully handle common format anomalies,
 * such as missing space between tag and first attribute:
 * e.g., `<LanguageName="kOS"` -> `<Language Name="kOS"`
 */
export function sanitizeXml(rawXml: string): string {
  let cleaned = rawXml.trim();

  // Fix <LanguageName="kOS" -> <Language Name="kOS"
  cleaned = cleaned.replace(/<([a-zA-Z0-9_-]+)([a-zA-Z0-9_-]+)=/g, (_match, tag, attr) => {
    // If it's something like <LanguageName=, split into <Language Name=
    if (tag.toLowerCase() === 'language' && attr.toLowerCase() === 'name') {
      return `<Language Name=`;
    }
    return `<${tag} ${attr}=`;
  });

  // Also fix closing tag if mismatched like </LanguageName>
  cleaned = cleaned.replace(/<\/LanguageName>/gi, '</Language>');

  return cleaned;
}

/**
 * Parses an XML language syntax definition into a structured CustomLanguageDefinition.
 */
export function parseLanguageXml(xmlString: string): CustomLanguageDefinition {
  if (!xmlString || !xmlString.trim()) {
    throw new Error('XML content is empty.');
  }

  const sanitized = sanitizeXml(xmlString);
  const parser = new DOMParser();
  let doc = parser.parseFromString(sanitized, 'text/xml');

  let parserError = doc.querySelector('parsererror');
  if (parserError) {
    // Try wrapping in a root element in case file is multiple snippets or lacks root
    const wrapped = `<Root>\n${sanitized}\n</Root>`;
    const retryDoc = parser.parseFromString(wrapped, 'text/xml');
    if (!retryDoc.querySelector('parsererror')) {
      doc = retryDoc;
      parserError = null;
    } else {
      // Return human-readable error description
      const errorText = parserError.textContent || 'XML syntax parsing failed';
      const cleanError = errorText.split('\n')[0].replace(/^error on line \d+ at column \d+: /, '');
      throw new Error(`Invalid XML format: ${cleanError}`);
    }
  }

  // Find Language node or root
  let langEl: Element | null = doc.querySelector('Language, language');
  if (!langEl) {
    langEl = doc.documentElement;
  }

  let langName = '';
  let extAttr = '';
  let caseSensitive = false;

  // Attributes on Language element
  if (langEl) {
    for (let i = 0; i < langEl.attributes.length; i++) {
      const attr = langEl.attributes[i];
      const lower = attr.name.toLowerCase();
      if (lower === 'name' || lower === 'languagename') {
        langName = attr.value;
      } else if (lower === 'ext' || lower === 'extension' || lower === 'extensions') {
        extAttr = attr.value;
      } else if (lower === 'casesensitive') {
        caseSensitive = attr.value.toLowerCase() === 'true' || attr.value.toLowerCase() === 'file';
      }
    }
  }

  // Fallback if name was in raw string match
  if (!langName) {
    const nameMatch = sanitized.match(/Name=["']?([^"'>\s]+)["']?/i);
    if (nameMatch) langName = nameMatch[1];
  }

  // Fallback for extensions
  if (!extAttr) {
    const extMatch = sanitized.match(/Ext(?:ension)?s?=["']?([^"'>\s]+)["']?/i);
    if (extMatch) extAttr = extMatch[1];
  }

  // Default fallback
  if (!langName) {
    langName = 'CustomLanguage';
  }

  const id = langName.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'custom';
  const extensions = extAttr
    ? extAttr.split(/[,;\s|]+/).map(e => e.replace(/^\./, '').toLowerCase().trim()).filter(Boolean)
    : [id];

  // Parse comments: <Comment Line="//" BlockStart="/*" BlockEnd="*/" />
  const commentEl = doc.querySelector('Comment, comment');
  const comments: CustomLanguageDefinition['comments'] = {
    line: commentEl?.getAttribute('Line') || commentEl?.getAttribute('line') || '//',
    blockStart: commentEl?.getAttribute('BlockStart') || commentEl?.getAttribute('blockstart') || '/*',
    blockEnd: commentEl?.getAttribute('BlockEnd') || commentEl?.getAttribute('blockend') || '*/'
  };

  // Parse keyword groups: <Keywords Group="1" Color="Control"> ... </Keywords>
  const keywordEls = doc.querySelectorAll('Keywords, keywords, KeywordList, keywordlist');
  const keywordGroups: CustomLanguageDefinition['keywordGroups'] = [];

  keywordEls.forEach((kwEl, idx) => {
    const groupNum = parseInt(kwEl.getAttribute('Group') || kwEl.getAttribute('group') || String(idx + 1), 10);
    const color = (kwEl.getAttribute('Color') || kwEl.getAttribute('color') || 'default').toLowerCase();
    
    // Find <Word> or <Item> or text nodes
    const wordEls = kwEl.querySelectorAll('Word, word, Item, item');
    const words: string[] = [];

    wordEls.forEach(w => {
      const text = w.textContent?.trim();
      if (text) words.push(text);
    });

    // If no child word elements, split innerText whitespace
    if (words.length === 0) {
      const rawText = kwEl.textContent || '';
      const splitWords = rawText.split(/\s+/).map(w => w.trim()).filter(Boolean);
      words.push(...splitWords);
    }

    if (words.length > 0) {
      keywordGroups.push({
        group: groupNum,
        color,
        words
      });
    }
  });

  // Parse strings: <String Start="&quot;" End="&quot;" Escape="\" />
  const stringEls = doc.querySelectorAll('String, string, Strings, strings');
  const strings: CustomLanguageDefinition['strings'] = [];
  stringEls.forEach(sEl => {
    const start = sEl.getAttribute('Start') || sEl.getAttribute('start') || '"';
    const end = sEl.getAttribute('End') || sEl.getAttribute('end') || '"';
    const escape = sEl.getAttribute('Escape') || sEl.getAttribute('escape') || '\\';
    strings.push({ start, end, escape });
  });

  if (strings.length === 0) {
    strings.push({ start: '"', end: '"', escape: '\\' });
    strings.push({ start: "'", end: "'", escape: '\\' });
  }

  // Parse operators: <Operators><Char>+</Char>...</Operators>
  const operators: string[] = [];
  const operatorCharEls = doc.querySelectorAll('Operators Char, operators char, Operator, operator, Char, char');
  operatorCharEls.forEach(op => {
    // Only accept if inside Operators container or operator tag
    if (op.closest('Operators, operators') || op.tagName.toLowerCase() === 'operator') {
      const ch = op.textContent?.trim();
      if (ch && !operators.includes(ch)) operators.push(ch);
    }
  });

  return {
    id,
    name: langName,
    extensions,
    caseSensitive,
    comments,
    keywordGroups,
    strings,
    operators: operators.length > 0 ? operators : ['+', '-', '*', '/', '^', '=', '<', '>', '.', ':'],
    rawXml: xmlString
  };
}

/**
 * Storage helpers
 */
export function getSavedCustomLanguages(): CustomLanguageDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCustomLanguage(lang: CustomLanguageDefinition): void {
  const existing = getSavedCustomLanguages().filter(l => l.id !== lang.id);
  existing.push(lang);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to save custom language', e);
  }
}

export function removeCustomLanguage(id: string): void {
  const filtered = getSavedCustomLanguages().filter(l => l.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to remove custom language', e);
  }
}
