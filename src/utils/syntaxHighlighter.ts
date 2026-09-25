/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SupportedLanguage, EditorTheme } from '../types/editor';

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Comprehensive keyword sets
const KEYWORDS: Record<string, Set<string>> = {
  js: new Set([
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
    'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function',
    'if', 'import', 'in', 'instanceof', 'new', 'return', 'super', 'switch',
    'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
    'let', 'static', 'enum', 'await', 'async', 'from', 'as', 'interface', 'type',
    'implements', 'declare', 'package', 'protected', 'private', 'public', 'readonly'
  ]),
  py: new Set([
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
    'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
    'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
    'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
    'match', 'case', 'self'
  ]),
  sh: new Set([
    'if', 'then', 'else', 'elif', 'fi', 'case', 'esac', 'for', 'select',
    'while', 'until', 'do', 'done', 'in', 'function', 'time', 'echo', 'exit',
    'export', 'set', 'unset', 'cd', 'pwd', 'mkdir', 'rm', 'cp', 'mv', 'source',
    'local', 'return', 'read', 'test'
  ]),
  sql: new Set([
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'UPDATE', 'DELETE', 'CREATE',
    'TABLE', 'DROP', 'ALTER', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON',
    'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'HAVING', 'LIMIT', 'OFFSET', 'UNION',
    'ALL', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'PRIMARY', 'KEY', 'FOREIGN',
    'REFERENCES', 'DEFAULT', 'SERIAL', 'VARCHAR', 'INT', 'INTEGER', 'TIMESTAMP',
    'BOOLEAN', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'AS', 'VIEW', 'INDEX', 'TRIGGER'
  ]),
  c_like: new Set([
    'int', 'char', 'float', 'double', 'void', 'long', 'short', 'signed', 'unsigned',
    'struct', 'union', 'enum', 'typedef', 'sizeof', 'static', 'auto', 'register',
    'extern', 'const', 'volatile', 'if', 'else', 'switch', 'case', 'default',
    'while', 'do', 'for', 'goto', 'continue', 'break', 'return', 'class', 'public',
    'private', 'protected', 'virtual', 'override', 'namespace', 'using', 'template',
    'typename', 'try', 'catch', 'throw', 'bool', 'true', 'false', 'nullptr', 'new', 'delete'
  ]),
  rust: new Set([
    'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else',
    'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop',
    'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self',
    'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use',
    'where', 'while'
  ]),
  go: new Set([
    'break', 'default', 'func', 'interface', 'select', 'case', 'defer', 'go',
    'map', 'struct', 'chan', 'else', 'goto', 'package', 'switch', 'const',
    'fallthrough', 'if', 'range', 'type', 'continue', 'for', 'import', 'return', 'var'
  ]),
  lua: new Set([
    'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
    'goto', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then',
    'true', 'until', 'while'
  ])
};

// High-performance LRU line cache for instantaneous editing even with 10,000+ line files
const LINE_CACHE = new Map<string, string>();
const MAX_CACHE_SIZE = 15000;

function getCachedHighlight(
  line: string,
  language: SupportedLanguage,
  theme: EditorTheme
): string {
  if (!line) return '';
  const key = `${language}:${theme.id || theme.bg}:${line}`;
  const cached = LINE_CACHE.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const result = highlightLineSafe(line, language, theme);
  if (LINE_CACHE.size >= MAX_CACHE_SIZE) {
    // Purge oldest 3000 entries
    const iter = LINE_CACHE.keys();
    for (let i = 0; i < 3000; i++) {
      const nextKey = iter.next().value;
      if (nextKey) LINE_CACHE.delete(nextKey);
    }
  }
  LINE_CACHE.set(key, result);
  return result;
}

export function highlightCodeLines(
  code: string,
  language: SupportedLanguage,
  theme: EditorTheme
): string[] {
  if (code === undefined || code === null) return [];

  const lines = code.split('\n');
  let inCodeBlock = false;
  let codeBlockLang: SupportedLanguage = 'javascript';

  return lines.map((line) => {
    // If line is empty, return an empty string
    if (line === '') return '';

    try {
      if (language === 'markdown') {
        const trimmed = line.trim();
        if (trimmed.startsWith('```')) {
          if (!inCodeBlock) {
            inCodeBlock = true;
            const langStr = trimmed.slice(3).trim().toLowerCase();
            codeBlockLang = (langStr as SupportedLanguage) || 'javascript';
            return `<span style="color: ${theme.syntax.keyword}; font-weight: bold;">${escapeHtml(line)}</span>`;
          } else {
            inCodeBlock = false;
            return `<span style="color: ${theme.syntax.keyword}; font-weight: bold;">${escapeHtml(line)}</span>`;
          }
        }

        if (inCodeBlock) {
          return getCachedHighlight(line, codeBlockLang, theme);
        }

        return highlightMarkdownLine(line, theme);
      }

      return getCachedHighlight(line, language, theme);
    } catch {
      return escapeHtml(line);
    }
  });
}

export function highlightCode(
  code: string,
  language: SupportedLanguage,
  theme: EditorTheme
): string {
  return highlightCodeLines(code, language, theme).join('\n');
}

function highlightLineSafe(
  line: string,
  language: SupportedLanguage,
  theme: EditorTheme
): string {
  if (language === 'markdown') {
    return highlightMarkdownLine(line, theme);
  }

  if (language === 'xml' || language === 'html') {
    return highlightMarkupLine(line, theme);
  }

  if (language === 'json') {
    return highlightJsonLine(line, theme);
  }

  if (language === 'css') {
    return highlightCssLine(line, theme);
  }

  if (language === 'yaml' || language === 'ini') {
    return highlightYamlLine(line, theme);
  }

  if (language === 'plaintext') {
    return escapeHtml(line);
  }

  return highlightStandardCodeLine(line, language, theme);
}

// ----------------------------------------------------
// MARKDOWN HIGHLIGHTER (Pixel-perfect monospace)
// ----------------------------------------------------
function highlightMarkdownLine(line: string, theme: EditorTheme): string {
  const { syntax } = theme;

  // Custom Admonition Callouts: :::note, :::tip, :::warning, :::danger, :::info
  const calloutMatch = line.match(/^:::\s*([a-zA-Z0-9_\-]+)?(?:\s+(.*))?$/);
  if (calloutMatch) {
    const type = (calloutMatch[1] || '').toLowerCase();
    const title = calloutMatch[2] || '';
    const colorMap: Record<string, string> = {
      note: '#38bdf8',
      tip: '#34d399',
      info: '#60a5fa',
      warning: '#fbbf24',
      danger: '#f87171'
    };
    const color = colorMap[type] || syntax.keyword;
    return `<span style="color: ${color}; font-weight: bold; background: rgba(255,255,255,0.06); padding: 1px 4px; border-radius: 4px;">::: ${escapeHtml(type)}</span> <span style="color: #ffffff; font-weight: 600;">${escapeHtml(title)}</span>`;
  }

  // Headings: # H1, ## H2, etc. (Strictly font-size: inherit for caret alignment)
  const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const hashes = headingMatch[1];
    const text = headingMatch[2];

    const headingColors = [
      '#60a5fa', // H1 (Sky blue)
      '#a78bfa', // H2 (Violet)
      '#34d399', // H3 (Emerald)
      '#f472b6', // H4 (Rose)
      '#fbbf24', // H5 (Amber)
      '#38bdf8'  // H6 (Cyan)
    ];
    const color = headingColors[level - 1] || syntax.keyword;

    return `<span style="color: ${color}; font-weight: 700;"><span style="opacity: 0.6;">${escapeHtml(hashes)}</span> ${highlightMarkdownInline(text, theme)}</span>`;
  }

  // Blockquotes: > quote
  if (line.startsWith('>')) {
    const rest = line.substring(1);
    return `<span style="color: ${syntax.string};"><span style="color: ${syntax.keyword}; font-weight: bold;">&gt;</span><span style="font-style: italic;">${highlightMarkdownInline(rest, theme)}</span></span>`;
  }

  // Code block fences: ```lang
  if (line.startsWith('```')) {
    return `<span style="color: ${syntax.keyword}; font-weight: bold;">${escapeHtml(line)}</span>`;
  }

  // Horizontal rules: --- or ***
  if (/^(\-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
    return `<span style="color: ${syntax.comment}; font-weight: bold; opacity: 0.6;">${escapeHtml(line)}</span>`;
  }

  // Task list items: - [ ] or - [x]
  const taskMatch = line.match(/^(\s*)([-*+]|\d+\.)(\s+\[([ xX])\])(\s+.*)$/);
  if (taskMatch) {
    const [_, indent, bullet, box, check, content] = taskMatch;
    const isChecked = check.toLowerCase() === 'x';
    const boxColor = isChecked ? '#34d399' : '#f59e0b';
    return (
      escapeHtml(indent) +
      `<span style="color: ${syntax.operator}; font-weight: bold;">${escapeHtml(bullet)}</span>` +
      `<span style="color: ${boxColor}; font-weight: bold;">${escapeHtml(box)}</span>` +
      highlightMarkdownInline(content, theme)
    );
  }

  // Standard bullet or numbered lists
  const listMatch = line.match(/^(\s*)([-*+]|\d+\.)(\s+.*)$/);
  if (listMatch) {
    const [_, indent, bullet, content] = listMatch;
    return (
      escapeHtml(indent) +
      `<span style="color: ${syntax.operator}; font-weight: bold;">${escapeHtml(bullet)}</span>` +
      highlightMarkdownInline(content, theme)
    );
  }

  // Tables: | col1 | col2 |
  if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
    const parts = line.split('|');
    const highlightedParts = parts.map((part, i) => {
      if (i === 0 || i === parts.length - 1) return '';
      if (/^\s*:?-+:?\s*$/.test(part)) {
        return `<span style="color: ${syntax.comment};">${escapeHtml(part)}</span>`;
      }
      return highlightMarkdownInline(part, theme);
    });
    return (
      `<span style="color: ${syntax.operator};">|</span>` +
      highlightedParts.slice(1, -1).join(`<span style="color: ${syntax.operator};">|</span>`) +
      `<span style="color: ${syntax.operator};">|</span>`
    );
  }

  return highlightMarkdownInline(line, theme);
}

function highlightMarkdownInline(text: string, theme: EditorTheme): string {
  const { syntax } = theme;

  // First check if there are embedded XML / HTML tags like <custom-tag attr="val">
  const tagRegex = /<([a-zA-Z0-9_\-:]+)([^>]*)>|<\/([a-zA-Z0-9_\-:]+)>|<([a-zA-Z0-9_\-:]+)([^>]*)\/>/g;

  // Tokenize line into segments
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(text)) !== null) {
    // Process text before the tag
    const before = text.substring(lastIndex, match.index);
    result += processMarkdownFormatting(before, theme);

    // Process the tag itself safely
    const fullTag = match[0];
    result += highlightTagSubstring(fullTag, theme);

    lastIndex = tagRegex.lastIndex;
  }

  // Process remaining text
  const remaining = text.substring(lastIndex);
  result += processMarkdownFormatting(remaining, theme);

  return result;
}

function processMarkdownFormatting(raw: string, theme: EditorTheme): string {
  if (!raw) return '';

  const { syntax } = theme;
  let out = escapeHtml(raw);

  // Inline code: `code` (zero horizontal padding to strictly preserve monospace alignment)
  out = out.replace(/`([^`]+)`/g, (_m, code) => {
    return `<span style="background: ${theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.07)'}; color: ${syntax.string};">\`${code}\`</span>`;
  });

  // Highlight: ==marked text==
  out = out.replace(/==([^=]+)==/g, (_m, marked) => {
    return `<span style="background: rgba(250, 204, 21, 0.25); color: ${syntax.operator};">==${marked}==</span>`;
  });

  // Math equations: $E = mc^2$
  out = out.replace(/\$([^\$]+)\$/g, (_m, math) => {
    return `<span style="color: #10b981; background: ${theme.isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(16, 185, 129, 0.10)'};">$${math}$</span>`;
  });

  // Custom Badges: [badge: label]
  out = out.replace(/\[badge:\s*([^\]]+)\]/gi, (_m, label) => {
    return `<span style="color: ${syntax.function}; font-weight: 600;">[badge: ${label}]</span>`;
  });

  // Bold: **bold** or __bold__ (theme-adaptive color so bold text never disappears on white themes!)
  out = out.replace(/(\*\*|__)(.*?)\1/g, (_m, marker, content) => {
    return `<strong style="color: ${theme.text}; font-weight: 700;"><span style="opacity: 0.5;">${marker}</span>${content}<span style="opacity: 0.5;">${marker}</span></strong>`;
  });

  // Italic: *italic* or _italic_
  out = out.replace(/(\*|_)(.*?)\1/g, (_m, marker, content) => {
    return `<em style="color: ${theme.textMuted}; font-style: italic;"><span style="opacity: 0.5;">${marker}</span>${content}<span style="opacity: 0.5;">${marker}</span></em>`;
  });

  // Strikethrough: ~~del~~
  out = out.replace(/~~(.*?)~~/g, (_m, content) => {
    return `<del style="color: ${syntax.comment}; text-decoration: line-through;"><span style="opacity: 0.5;">~~</span>${content}<span style="opacity: 0.5;">~~</span></del>`;
  });

  // Links: [label](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
    return `<span style="color: ${syntax.function}; text-decoration: underline;">[${label}]</span><span style="color: ${syntax.comment};">(${url})</span>`;
  });

  return out;
}

// ----------------------------------------------------
// XML & HTML HIGHLIGHTER
// ----------------------------------------------------
function highlightMarkupLine(line: string, theme: EditorTheme): string {
  const { syntax } = theme;

  // XML / HTML Comments: <!-- ... -->
  if (line.trim().startsWith('<!--') || line.includes('-->')) {
    return `<span style="color: ${syntax.comment}; font-style: italic;">${escapeHtml(line)}</span>`;
  }

  // XML Prolog / Processing Instruction: <?xml ... ?>
  if (line.trim().startsWith('<?') && line.trim().endsWith('?>')) {
    return `<span style="color: ${syntax.function}; font-weight: bold;">${escapeHtml(line)}</span>`;
  }

  // CDATA: <![CDATA[ ... ]]>
  if (line.includes('<![CDATA[')) {
    return `<span style="color: ${syntax.string}; font-weight: bold;">${escapeHtml(line)}</span>`;
  }

  // Scan for tags
  const tagRegex = /(<\/?[a-zA-Z0-9_\-:]+)([^>]*?)(\/?>)/g;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(line)) !== null) {
    const before = line.substring(lastIndex, match.index);
    result += escapeHtml(before);

    const tagStart = match[1];
    const attrs = match[2];
    const tagEnd = match[3];

    // Highlight tag name
    let tagHtml = `<span style="color: ${syntax.tag}; font-weight: 600;">${escapeHtml(tagStart)}</span>`;

    // Highlight attributes inside the tag
    if (attrs) {
      const attrRegex = /([a-zA-Z0-9_\-:]+)(=)("[^"]*"|'[^']*'|[^\s>]+)?/g;
      let attrResult = '';
      let attrLastIndex = 0;
      let attrMatch: RegExpExecArray | null;

      while ((attrMatch = attrRegex.exec(attrs)) !== null) {
        attrResult += escapeHtml(attrs.substring(attrLastIndex, attrMatch.index));
        const attrName = attrMatch[1];
        const eq = attrMatch[2] || '';
        const attrVal = attrMatch[3] || '';

        attrResult += `<span style="color: ${syntax.variable};">${escapeHtml(attrName)}</span>`;
        if (eq) {
          attrResult += `<span style="color: ${syntax.operator};">${escapeHtml(eq)}</span>`;
        }
        if (attrVal) {
          attrResult += `<span style="color: ${syntax.string};">${escapeHtml(attrVal)}</span>`;
        }
        attrLastIndex = attrRegex.lastIndex;
      }
      attrResult += escapeHtml(attrs.substring(attrLastIndex));
      tagHtml += attrResult;
    }

    tagHtml += `<span style="color: ${syntax.tag}; font-weight: 600;">${escapeHtml(tagEnd)}</span>`;
    result += tagHtml;
    lastIndex = tagRegex.lastIndex;
  }

  result += escapeHtml(line.substring(lastIndex));
  return result;
}

function highlightTagSubstring(fullTag: string, theme: EditorTheme): string {
  return highlightMarkupLine(fullTag, theme);
}

// ----------------------------------------------------
// JSON HIGHLIGHTER
// ----------------------------------------------------
function highlightJsonLine(line: string, theme: EditorTheme): string {
  const { syntax } = theme;
  // Match key: "key":
  return line.replace(/(".*?")(\s*:)?/g, (match, str, colon) => {
    if (colon) {
      return `<span style="color: ${syntax.keyword}; font-weight: 600;">${escapeHtml(str)}</span><span style="color: ${syntax.operator};">${escapeHtml(colon)}</span>`;
    }
    return `<span style="color: ${syntax.string};">${escapeHtml(str)}</span>`;
  });
}

// ----------------------------------------------------
// CSS HIGHLIGHTER
// ----------------------------------------------------
function highlightCssLine(line: string, theme: EditorTheme): string {
  const { syntax } = theme;
  if (line.includes('{') || line.includes('}')) {
    return escapeHtml(line).replace(/([.#]?[a-zA-Z0-9_\-]+)(?=\s*\{)/g, `<span style="color: ${syntax.tag}; font-weight: bold;">$1</span>`);
  }
  const colonIndex = line.indexOf(':');
  if (colonIndex !== -1) {
    const prop = line.substring(0, colonIndex);
    const val = line.substring(colonIndex + 1);
    return `<span style="color: ${syntax.variable};">${escapeHtml(prop)}</span>:<span style="color: ${syntax.string};">${escapeHtml(val)}</span>`;
  }
  return escapeHtml(line);
}

// ----------------------------------------------------
// YAML / INI HIGHLIGHTER
// ----------------------------------------------------
function highlightYamlLine(line: string, theme: EditorTheme): string {
  const { syntax } = theme;
  if (line.trim().startsWith('#') || line.trim().startsWith(';')) {
    return `<span style="color: ${syntax.comment}; font-style: italic;">${escapeHtml(line)}</span>`;
  }
  const colonIndex = line.indexOf(':') !== -1 ? line.indexOf(':') : line.indexOf('=');
  if (colonIndex !== -1) {
    const key = line.substring(0, colonIndex);
    const sep = line[colonIndex];
    const val = line.substring(colonIndex + 1);
    return `<span style="color: ${syntax.keyword}; font-weight: 600;">${escapeHtml(key)}</span><span style="color: ${syntax.operator};">${escapeHtml(sep)}</span><span style="color: ${syntax.string};">${escapeHtml(val)}</span>`;
  }
  return escapeHtml(line);
}

// ----------------------------------------------------
// STANDARD PROGRAMMING CODE HIGHLIGHTER (JS, TS, PY, C, C++, RUST, GO, BASH, SQL, ETC.)
// ----------------------------------------------------
function highlightStandardCodeLine(
  line: string,
  language: SupportedLanguage,
  theme: EditorTheme
): string {
  const { syntax } = theme;

  // Single-line Comments
  if (language === 'python' || language === 'bash' || language === 'ruby') {
    const hashIdx = line.indexOf('#');
    if (hashIdx !== -1) {
      const codePart = line.substring(0, hashIdx);
      const commentPart = line.substring(hashIdx);
      return (
        tokenizeCode(codePart, language, theme) +
        `<span style="color: ${syntax.comment}; font-style: italic;">${escapeHtml(commentPart)}</span>`
      );
    }
  } else if (language === 'sql' || language === 'lua') {
    const dashIdx = line.indexOf('--');
    if (dashIdx !== -1) {
      const codePart = line.substring(0, dashIdx);
      const commentPart = line.substring(dashIdx);
      return (
        tokenizeCode(codePart, language, theme) +
        `<span style="color: ${syntax.comment}; font-style: italic;">${escapeHtml(commentPart)}</span>`
      );
    }
  } else {
    // C, JS, TS, Java, C#, Go, Rust, PHP comments
    const slashIdx = line.indexOf('//');
    if (slashIdx !== -1) {
      const codePart = line.substring(0, slashIdx);
      const commentPart = line.substring(slashIdx);
      return (
        tokenizeCode(codePart, language, theme) +
        `<span style="color: ${syntax.comment}; font-style: italic;">${escapeHtml(commentPart)}</span>`
      );
    }
    if (line.trim().startsWith('/*') || line.trim().startsWith('*')) {
      return `<span style="color: ${syntax.comment}; font-style: italic;">${escapeHtml(line)}</span>`;
    }
  }

  return tokenizeCode(line, language, theme);
}

function tokenizeCode(
  line: string,
  language: SupportedLanguage,
  theme: EditorTheme
): string {
  const { syntax } = theme;

  // Pick keyword set
  let keySet = KEYWORDS.js;
  if (language === 'python') keySet = KEYWORDS.py;
  else if (language === 'bash') keySet = KEYWORDS.sh;
  else if (language === 'sql') keySet = KEYWORDS.sql;
  else if (['c', 'cpp', 'csharp', 'java'].includes(language)) keySet = KEYWORDS.c_like;
  else if (language === 'rust') keySet = KEYWORDS.rust;
  else if (language === 'go') keySet = KEYWORDS.go;
  else if (language === 'lua') keySet = KEYWORDS.lua;

  // Tokenize safely: string literals, numbers, words, operators, punctuation, whitespace
  const tokenRegex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[a-zA-Z_]\w*\b|[+\-*/%=<>!&|^~?:;.,()\[\]{}]|\s+|[^\s\w]+)/g;

  return line.replace(tokenRegex, (token) => {
    // Strings
    if (
      (token.startsWith('"') && token.endsWith('"') && token.length > 1) ||
      (token.startsWith("'") && token.endsWith("'") && token.length > 1) ||
      (token.startsWith('`') && token.endsWith('`') && token.length > 1)
    ) {
      return `<span style="color: ${syntax.string};">${escapeHtml(token)}</span>`;
    }

    // Numbers
    if (/^\d+(?:\.\d+)?$/.test(token)) {
      return `<span style="color: ${syntax.number};">${escapeHtml(token)}</span>`;
    }

    // Keywords
    const upper = token.toUpperCase();
    if (language === 'sql' && KEYWORDS.sql.has(upper)) {
      return `<span style="color: ${syntax.keyword}; font-weight: 600;">${escapeHtml(token)}</span>`;
    }
    if (keySet.has(token)) {
      return `<span style="color: ${syntax.keyword}; font-weight: 600;">${escapeHtml(token)}</span>`;
    }

    // Booleans & Nulls
    if (['true', 'false', 'null', 'undefined', 'nil', 'None', 'True', 'False'].includes(token)) {
      return `<span style="color: ${syntax.boolean}; font-weight: 600;">${escapeHtml(token)}</span>`;
    }

    // Identifiers / Variables / Functions
    if (/^[a-zA-Z_]\w*$/.test(token)) {
      return `<span style="color: ${syntax.variable};">${escapeHtml(token)}</span>`;
    }

    // Operators
    if (/[+\-*/%=<>!&|^~?]/.test(token)) {
      return `<span style="color: ${syntax.operator};">${escapeHtml(token)}</span>`;
    }

    return escapeHtml(token);
  });
}
