/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Code } from 'lucide-react';
import { EditorTheme, SupportedLanguage } from '../types/editor';

interface Snippet {
  id: string;
  title: string;
  language: SupportedLanguage;
  code: string;
}

const SNIPPETS: Snippet[] = [
  {
    id: 'js-fetch',
    title: 'Fetch JSON',
    language: 'javascript',
    code: `async function fetchData(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(\`HTTP error \${res.status}\`);
    return await res.json();
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}`
  },
  {
    id: 'js-benchmark',
    title: 'Benchmark timer',
    language: 'javascript',
    code: `const t0 = performance.now();
// Code to measure
const t1 = performance.now();
console.log(\`Elapsed: \${(t1 - t0).toFixed(2)}ms\`);`
  },
  {
    id: 'py-comprehension',
    title: 'List comprehension',
    language: 'python',
    code: `numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
evens = [n ** 2 for n in numbers if n % 2 == 0]
print(evens)`
  },
  {
    id: 'py-class',
    title: 'Class definition',
    language: 'python',
    code: `class Item:
    def __init__(self, name, price):
        self.name = name
        self.price = price

    def summary(self):
        return f"{self.name}: \${self.price}"`
  },
  {
    id: 'py-pillow-image',
    title: 'Pillow: Draw & Save Image',
    language: 'python',
    code: `from PIL import Image, ImageDraw

# Create image canvas
img = Image.new('RGB', (320, 200), color='#0f172a')
draw = ImageDraw.Draw(img)

# Draw shapes
draw.rounded_rectangle([15, 15, 305, 185], radius=16, outline='#38bdf8', width=2)
draw.ellipse([45, 50, 115, 120], fill='#0284c7', outline='#7dd3fc', width=2)
draw.text((135, 75), "Pillow in Pluscript", fill='#ffffff')
draw.text((135, 95), "Image created!", fill='#94a3b8')

# Save to output file (automatically displayed in Console!)
img.save("art.png")
print("Saved art.png successfully!")`
  },
  {
    id: 'bash-check',
    title: 'Directory check',
    language: 'bash',
    code: `TARGET="./build"

if [ -d "$TARGET" ]; then
    echo "Found: $TARGET"
else
    mkdir -p "$TARGET"
fi`
  },
  {
    id: 'html-template',
    title: 'HTML5 template',
    language: 'html',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
</head>
<body>
  <h1>Hello world</h1>
</body>
</html>`
  },
  {
    id: 'sql-query',
    title: 'Group By query',
    language: 'sql',
    code: `SELECT department, COUNT(id) AS total, AVG(salary) AS avg_salary
FROM employees
GROUP BY department
ORDER BY total DESC;`
  },
  {
    id: 'md-tasks',
    title: 'Task list',
    language: 'markdown',
    code: `### Tasks

- [x] Item 1
- [ ] Item 2`
  },
  {
    id: 'md-table',
    title: 'Table',
    language: 'markdown',
    code: `| Header 1 | Header 2 |
| :--- | :--- |
| Val 1 | Val 2 |`
  },
  {
    id: 'md-callout',
    title: 'Blockquote',
    language: 'markdown',
    code: `> Note: Add your note here.`
  },
  {
    id: 'xml-android',
    title: 'Android button',
    language: 'xml',
    code: `<Button
    android:id="@+id/btn_action"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:text="Click me" />`
  },
  {
    id: 'xml-config',
    title: 'App config',
    language: 'xml',
    code: `<?xml version="1.0" encoding="utf-8"?>
<config>
    <app name="Pluscript" version="1.0" />
</config>`
  },
  {
    id: 'xml-svg',
    title: 'SVG icon',
    language: 'xml',
    code: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
  <path d="M12 2v20M2 12h20"/>
</svg>`
  }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (code: string) => void;
  currentLanguage: SupportedLanguage;
  theme: EditorTheme;
}

export const SnippetsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onInsert,
  currentLanguage,
  theme
}) => {
  const [selectedLang, setSelectedLang] = useState<string>(currentLanguage);

  const filteredSnippets = SNIPPETS.filter(
    (s) => selectedLang === 'all' || s.language === selectedLang
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Container: zooms out to appear, zooms in until disappearing on close (identical to Preferences) */}
          <motion.div
            initial={{ scale: 1.15, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.15, opacity: 0 }}
            transition={{
              duration: 0.24,
              ease: [0.16, 1, 0.3, 1]
            }}
            className="relative z-10 w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            style={{
              backgroundColor: theme.bg,
              borderColor: theme.surfaceBorder
            }}
          >
            {/* Header */}
            <div
              className="flex h-12 items-center justify-between border-b px-5"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.surfaceBorder
              }}
            >
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4" style={{ color: theme.accent }} />
                <h3 className="font-semibold text-sm" style={{ color: theme.text }}>
                  Snippets
                </h3>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:opacity-80 active:scale-95"
                style={{ color: theme.textMuted }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filter Bar */}
            <div
              className="flex items-center gap-1.5 overflow-x-auto p-2.5 border-b no-scrollbar"
              style={{
                backgroundColor: theme.headerBg,
                borderColor: theme.surfaceBorder
              }}
            >
              {['all', 'javascript', 'python', 'markdown', 'xml', 'bash', 'html', 'sql'].map((lang) => {
                const isSelected = selectedLang === lang;
                return (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-mono capitalize transition-all whitespace-nowrap active:scale-95"
                    style={{
                      backgroundColor: isSelected ? theme.accent : 'transparent',
                      color: isSelected ? theme.accentText : theme.textMuted,
                      fontWeight: isSelected ? 600 : 400
                    }}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>

            {/* Snippet List */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
              {filteredSnippets.length === 0 ? (
                <div
                  className="py-12 text-center text-xs"
                  style={{ color: theme.textMuted }}
                >
                  No snippets for this filter.
                </div>
              ) : (
                filteredSnippets.map((snippet) => (
                  <div
                    key={snippet.id}
                    onClick={() => {
                      onInsert(snippet.code);
                      onClose();
                    }}
                    className="group flex flex-col rounded-xl border p-3 cursor-pointer transition-all active:scale-[0.99] hover:shadow-md"
                    style={{
                      backgroundColor: theme.surface,
                      borderColor: theme.surfaceBorder
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="font-semibold text-xs transition-colors"
                        style={{ color: theme.text }}
                      >
                        {snippet.title}
                      </span>
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-medium"
                        style={{
                          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                          color: theme.accent
                        }}
                      >
                        {snippet.language}
                      </span>
                    </div>
                    <pre
                      className="overflow-hidden rounded-lg p-2.5 font-mono text-[10.5px] whitespace-pre leading-relaxed line-clamp-3 border"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.04)',
                        borderColor: theme.surfaceBorder,
                        color: theme.textMuted
                      }}
                    >
                      {snippet.code}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
