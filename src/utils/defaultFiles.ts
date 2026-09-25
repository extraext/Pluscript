/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScriptFile, SupportedLanguage } from '../types/editor';

const INITIAL_README_CONTENT = `# README

Welcome to Pluscript.

- Edit code and scripts
- Tap the **Save** button at the top (or enable **Auto Save** in Preferences)
- Tap **Preview** for live Markdown/HTML/XML rendering
- Tap **Run** to execute scripts and view console output
- Smart indent automatically formats blocks and indentation
- Line change markers appear on the left gutter
- Mobile accessory bar provides quick symbols, indent, and undo

\`\`\`javascript
console.log("Hello from Pluscript.");
\`\`\`
`.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

export const DEFAULT_FILES: ScriptFile[] = [
  {
    id: 'file-readme',
    name: 'README.md',
    language: 'markdown',
    lastModified: Date.now(),
    content: INITIAL_README_CONTENT,
    savedContent: INITIAL_README_CONTENT,
    originalContent: INITIAL_README_CONTENT,
    isDirty: false
  }
];

export const LANGUAGE_EXTENSIONS: Record<string, string> = {
  javascript: '.js',
  typescript: '.ts',
  python: '.py',
  markdown: '.md',
  xml: '.xml',
  html: '.html',
  css: '.css',
  json: '.json',
  yaml: '.yaml',
  sql: '.sql',
  bash: '.sh',
  c: '.c',
  cpp: '.cpp',
  csharp: '.cs',
  java: '.java',
  rust: '.rs',
  go: '.go',
  php: '.php',
  ruby: '.rb',
  lua: '.lua',
  ini: '.ini',
  plaintext: '.txt'
};

export const EXTENSION_TO_LANG: Record<string, SupportedLanguage> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  pyw: 'python',
  md: 'markdown',
  markdown: 'markdown',
  mdown: 'markdown',
  xml: 'xml',
  svg: 'xml',
  plist: 'xml',
  xaml: 'xml',
  rss: 'xml',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'css',
  sass: 'css',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  cc: 'cpp',
  cs: 'csharp',
  java: 'java',
  rs: 'rust',
  go: 'go',
  php: 'php',
  rb: 'ruby',
  lua: 'lua',
  ini: 'ini',
  conf: 'ini',
  env: 'ini',
  txt: 'plaintext',
  log: 'plaintext'
};
