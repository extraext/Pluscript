/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Robust, lightweight, zero-dependency Markdown to HTML renderer
 * Supports headers, bold, italics, task lists, code fences, blockquotes, tables, custom tags, and links.
 */
export function renderMarkdownToHtml(markdown: string, isDark: boolean = true): string {
  if (!markdown) return '';

  const lines = markdown.split('\n');
  const htmlOutput: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockBuffer: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';

  const closeList = () => {
    if (inList) {
      htmlOutput.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
    }
  };

  const processInline = (text: string): string => {
    let processed = escapeHtml(text);

    // Code spans: `code`
    const codeSpanClass = isDark
      ? 'px-1.5 py-0.5 rounded-md bg-amber-400/10 text-amber-300 border border-amber-500/20 font-mono text-[12px]'
      : 'px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[12px] font-medium';
    processed = processed.replace(
      /`([^`]+)`/g,
      `<code class="${codeSpanClass}">$1</code>`
    );

    // Highlight: ==text==
    processed = processed.replace(
      /==([^=]+)==/g,
      '<mark class="bg-amber-400/25 text-amber-200 px-1.5 py-0.5 rounded font-semibold">$1</mark>'
    );

    // Math: $math$
    processed = processed.replace(
      /\$([^\$]+)\$/g,
      `<span class="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md ${
        isDark ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
      } font-mono text-[11px]">$1</span>`
    );

    // Badges: [badge: label] or [tag: label]
    processed = processed.replace(
      /\[(badge|tag):\s*([^\]]+)\]/gi,
      `<span class="inline-flex items-center px-2 py-0.5 mx-1 rounded-full text-[10px] font-bold tracking-wider ${
        isDark ? 'bg-sky-950/70 border border-sky-700/60 text-sky-300' : 'bg-sky-100 border border-sky-300 text-sky-800'
      } uppercase">$2</span>`
    );

    // Keyboard keys: &lt;kbd&gt;key&lt;/kbd&gt;
    processed = processed.replace(
      /&lt;kbd&gt;(.*?)&lt;\/kbd&gt;/gi,
      `<kbd class="px-1.5 py-0.5 text-[10px] font-mono rounded border ${
        isDark ? 'border-neutral-700 bg-neutral-800 text-neutral-200 shadow-xs' : 'border-neutral-300 bg-neutral-100 text-neutral-800 shadow-xs'
      }">$1</kbd>`
    );

    // Bold: **bold** or __bold__
    processed = processed.replace(
      /(\*\*|__)(.*?)\1/g,
      `<strong class="font-bold ${isDark ? 'text-white' : 'text-neutral-900'}">$2</strong>`
    );

    // Italic: *italic* or _italic_
    processed = processed.replace(
      /(\*|_)(.*?)\1/g,
      `<em class="italic ${isDark ? 'text-neutral-300' : 'text-neutral-700'}">$2</em>`
    );

    // Strikethrough: ~~strikethrough~~
    processed = processed.replace(
      /~~(.*?)~~/g,
      `<del class="line-through ${isDark ? 'text-neutral-500' : 'text-neutral-400'}">$1</del>`
    );

    // Checkboxes: [ ] and [x]
    processed = processed.replace(
      /\[ \]/g,
      `<input type="checkbox" disabled class="mr-2 h-3.5 w-3.5 rounded ${isDark ? 'border-neutral-600 bg-neutral-800' : 'border-neutral-300 bg-white'}" />`
    );
    processed = processed.replace(
      /\[(x|X)\]/g,
      '<input type="checkbox" checked disabled class="mr-2 h-3.5 w-3.5 rounded text-emerald-500 bg-emerald-950 border-emerald-500" />'
    );

    // Links: [text](url)
    processed = processed.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      `<a href="$2" target="_blank" rel="noopener noreferrer" class="${isDark ? 'text-sky-400 hover:text-sky-300' : 'text-blue-600 hover:text-blue-700'} font-medium underline underline-offset-2">$1</a>`
    );

    // Custom XML / HTML tags embedded in markdown: &lt;tag-name attr="val" ...&gt;
    // Renders custom tags with full XML syntax styling (tag, attribute, value)
    processed = processed.replace(
      /&lt;(\/?[a-zA-Z0-9_\-:]+)((?:\s+[a-zA-Z0-9_\-:]+(?:=(?:&quot;.*?&quot;|&#039;.*?&#039;|[^\s&gt;]+))?)*)\s*(\/?)&gt;/g,
      (_match, tagName, attrs, closingSlash) => {
        let highlightedAttrs = attrs;
        if (attrs) {
          highlightedAttrs = attrs.replace(
            /([a-zA-Z0-9_\-:]+)(=)(&quot;.*?&quot;|&#039;.*?&#039;)/g,
            `<span class="${isDark ? 'text-amber-300' : 'text-amber-700'}">$1</span>$2<span class="${isDark ? 'text-emerald-400' : 'text-emerald-700'}">$3</span>`
          );
        }
        return `<span class="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono font-medium ${
          isDark ? 'bg-sky-950/60 border border-sky-800/60 text-sky-300' : 'bg-sky-50 border border-sky-200 text-sky-700'
        }">&lt;${tagName}${highlightedAttrs}${closingSlash}&gt;</span>`;
      }
    );

    return processed;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();

    // Code block toggle: ```
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // Close code block
        const codeContent = escapeHtml(codeBlockBuffer.join('\n'));
        htmlOutput.push(`
          <div class="my-3 overflow-hidden rounded-xl border ${
            isDark ? 'border-neutral-800 bg-[#121316]' : 'border-neutral-300 bg-neutral-100'
          }">
            ${
              codeBlockLang
                ? `<div class="border-b ${isDark ? 'border-neutral-800/80 text-neutral-400' : 'border-neutral-300 text-neutral-600'} px-3 py-1 font-mono text-[11px] uppercase tracking-wider font-semibold">${escapeHtml(
                    codeBlockLang
                  )}</div>`
                : ''
            }
            <pre class="overflow-x-auto p-3 font-mono text-[12px] leading-relaxed ${
              isDark ? 'text-neutral-200' : 'text-neutral-800'
            }"><code>${codeContent}</code></pre>
          </div>
        `);
        codeBlockBuffer = [];
        inCodeBlock = false;
        codeBlockLang = '';
      } else {
        closeList();
        inCodeBlock = true;
        codeBlockLang = line.substring(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(rawLine);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      closeList();
      htmlOutput.push('<div class="h-2"></div>');
      continue;
    }

    // Horizontal Rule: --- or ***
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      closeList();
      htmlOutput.push('<hr class="my-4 border-neutral-800" />');
      continue;
    }

    // Custom Admonition Callouts: :::note, :::tip, :::warning, :::danger, :::info, :::xml, :::schema
    const calloutStart = line.match(/^:::\s*([a-zA-Z0-9_\-]+)?(?:\s+(.*))?$/);
    if (calloutStart && calloutStart[1]) {
      closeList();
      const type = calloutStart[1].toLowerCase();
      const title = calloutStart[2] || type.toUpperCase();
      const calloutBuffer: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(':::')) {
        calloutBuffer.push(lines[i]);
        i++;
      }
      const calloutContent = calloutBuffer.map(l => processInline(l)).join('<br/>');
      const styles: Record<string, { border: string; bg: string; text: string; icon: string }> = isDark
        ? {
            note: { border: 'border-sky-500', bg: 'bg-sky-950/30', text: 'text-sky-300', icon: '📝' },
            tip: { border: 'border-emerald-500', bg: 'bg-emerald-950/30', text: 'text-emerald-300', icon: '💡' },
            info: { border: 'border-blue-500', bg: 'bg-blue-950/30', text: 'text-blue-300', icon: 'ℹ️' },
            warning: { border: 'border-amber-500', bg: 'bg-amber-950/30', text: 'text-amber-300', icon: '⚠️' },
            danger: { border: 'border-rose-500', bg: 'bg-rose-950/30', text: 'text-rose-300', icon: '🚨' },
            xml: { border: 'border-purple-500', bg: 'bg-purple-950/30', text: 'text-purple-300', icon: '🏷️' },
            schema: { border: 'border-cyan-500', bg: 'bg-cyan-950/30', text: 'text-cyan-300', icon: '📐' }
          }
        : {
            note: { border: 'border-sky-600', bg: 'bg-sky-50', text: 'text-sky-900', icon: '📝' },
            tip: { border: 'border-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-900', icon: '💡' },
            info: { border: 'border-blue-600', bg: 'bg-blue-50', text: 'text-blue-900', icon: 'ℹ️' },
            warning: { border: 'border-amber-600', bg: 'bg-amber-50', text: 'text-amber-900', icon: '⚠️' },
            danger: { border: 'border-rose-600', bg: 'bg-rose-50', text: 'text-rose-900', icon: '🚨' },
            xml: { border: 'border-purple-600', bg: 'bg-purple-50', text: 'text-purple-900', icon: '🏷️' },
            schema: { border: 'border-cyan-600', bg: 'bg-cyan-50', text: 'text-cyan-900', icon: '📐' }
          };
      const cStyle = styles[type] || styles.note;
      htmlOutput.push(`
        <div class="my-3 rounded-xl border-l-4 ${cStyle.border} ${cStyle.bg} border ${isDark ? 'border-neutral-800/80' : 'border-neutral-200'} p-3.5 shadow-xs">
          <div class="font-bold text-xs ${cStyle.text} mb-1.5 flex items-center gap-1.5 tracking-wide">
            <span>${cStyle.icon}</span>
            <span>${escapeHtml(title)}</span>
          </div>
          <div class="text-xs ${isDark ? 'text-neutral-300' : 'text-neutral-700'} leading-relaxed">${calloutContent}</div>
        </div>
      `);
      continue;
    }

    // Headings: # H1, ## H2, ### H3, #### H4, ##### H5, ###### H6 (Standard document typography)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const text = processInline(headingMatch[2]);
      if (level === 1) {
        htmlOutput.push(
          `<h1 class="mt-5 mb-2.5 text-2xl font-extrabold tracking-tight ${isDark ? 'text-white border-neutral-800' : 'text-neutral-900 border-neutral-200'} border-b pb-2 flex items-center gap-2">${text}</h1>`
        );
      } else if (level === 2) {
        htmlOutput.push(
          `<h2 class="mt-4 mb-2 text-xl font-bold tracking-tight ${isDark ? 'text-neutral-100' : 'text-neutral-900'}">${text}</h2>`
        );
      } else if (level === 3) {
        htmlOutput.push(
          `<h3 class="mt-3.5 mb-1.5 text-base font-semibold ${isDark ? 'text-neutral-200' : 'text-neutral-800'}">${text}</h3>`
        );
      } else if (level === 4) {
        htmlOutput.push(
          `<h4 class="mt-2.5 mb-1 text-sm font-semibold ${isDark ? 'text-neutral-200' : 'text-neutral-800'}">${text}</h4>`
        );
      } else if (level === 5) {
        htmlOutput.push(
          `<h5 class="mt-2 mb-1 text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-neutral-400' : 'text-neutral-600'}">${text}</h5>`
        );
      } else {
        htmlOutput.push(
          `<h6 class="mt-2 mb-1 text-xs font-semibold ${isDark ? 'text-neutral-400' : 'text-neutral-600'}">${text}</h6>`
        );
      }
      continue;
    }

    // Blockquote: > quote
    if (line.startsWith('>')) {
      closeList();
      const quoteText = line.replace(/^>\s*/, '');
      htmlOutput.push(`
        <blockquote class="my-2.5 border-l-4 ${isDark ? 'border-sky-500 bg-sky-950/20 text-neutral-300' : 'border-sky-600 bg-sky-50 text-neutral-700'} pl-3.5 pr-2 py-2 text-xs sm:text-sm italic rounded-r-lg">
          ${processInline(quoteText)}
        </blockquote>
      `);
      continue;
    }

    // Unordered List: - item or * item
    const ulMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        closeList();
        htmlOutput.push(`<ul class="my-2 space-y-1 pl-4 list-disc ${isDark ? 'marker:text-neutral-500' : 'marker:text-neutral-400'}">`);
        inList = true;
        listType = 'ul';
      }
      htmlOutput.push(
        `<li class="text-xs sm:text-sm ${isDark ? 'text-neutral-300' : 'text-neutral-700'} leading-relaxed">${processInline(
          ulMatch[3]
        )}</li>`
      );
      continue;
    }

    // Ordered List: 1. item
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        closeList();
        htmlOutput.push(`<ol class="my-2 space-y-1 pl-4 list-decimal ${isDark ? 'marker:text-neutral-500' : 'marker:text-neutral-400'}">`);
        inList = true;
        listType = 'ol';
      }
      htmlOutput.push(
        `<li class="text-xs sm:text-sm ${isDark ? 'text-neutral-300' : 'text-neutral-700'} leading-relaxed">${processInline(
          olMatch[2]
        )}</li>`
      );
      continue;
    }

    // Markdown Table: | col1 | col2 |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      closeList();
      const cells = line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());

      // Check if delimiter row
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        continue;
      }

      htmlOutput.push(`
        <div class="my-2 overflow-x-auto">
          <div class="inline-flex min-w-full rounded-lg border ${isDark ? 'border-neutral-800 bg-white/[0.02]' : 'border-neutral-200 bg-neutral-50'} text-xs">
            ${cells
              .map(
                (c) =>
                  `<div class="px-3 py-1.5 font-medium ${isDark ? 'text-neutral-200 border-neutral-800' : 'text-neutral-800 border-neutral-200'} border-r last:border-0">${processInline(
                    c
                  )}</div>`
              )
              .join('')}
          </div>
        </div>
      `);
      continue;
    }

    // Standard Paragraph
    closeList();
    htmlOutput.push(
      `<p class="leading-relaxed text-xs sm:text-sm ${isDark ? 'text-neutral-300' : 'text-neutral-700'}">${processInline(line)}</p>`
    );
  }

  closeList();

  const themeClasses = isDark
    ? 'bg-[#14151a] text-neutral-200 selection:bg-sky-500/30'
    : 'bg-white text-neutral-900 selection:bg-sky-200';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      </style>
    </head>
    <body class="${themeClasses} p-5 min-h-screen">
      <div class="max-w-2xl mx-auto space-y-1">
        ${htmlOutput.join('\n')}
      </div>
    </body>
    </html>
  `;
}

/**
 * Beautiful XML Previewer
 */
export function renderXmlToHtml(xml: string, isDark: boolean = true): string {
  if (!xml) return '';

  const escaped = escapeHtml(xml);
  // Colorize XML tokens
  const highlighted = escaped
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="text-neutral-500 italic">$1</span>')
    .replace(/(&lt;\?[^?]*\?&gt;)/g, '<span class="text-purple-400 font-bold">$1</span>')
    .replace(/(&lt;\/?)([a-zA-Z0-9_\-:]+)/g, '$1<span class="text-sky-400 font-semibold">$2</span>')
    .replace(/([a-zA-Z0-9_\-:]+)(=)(&quot;.*?&quot;|&#039;.*?&#039;)/g, '<span class="text-amber-300">$1</span>$2<span class="text-emerald-400">$3</span>')
    .replace(/(&gt;|\/&gt;)/g, '<span class="text-sky-400 font-semibold">$1</span>');

  const themeClasses = isDark
    ? 'bg-[#14151a] text-neutral-200'
    : 'bg-[#fafafa] text-neutral-900';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        pre { font-family: 'JetBrains Mono', Menlo, Monaco, Consolas, monospace; }
      </style>
    </head>
    <body class="${themeClasses} p-4 min-h-screen font-mono text-xs leading-relaxed">
      <div class="max-w-3xl mx-auto">
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-neutral-400 text-[11px]">
          <span>XML Document Inspector</span>
          <span>${xml.split('\n').length} lines</span>
        </div>
        <pre class="overflow-x-auto whitespace-pre leading-5">${highlighted}</pre>
      </div>
    </body>
    </html>
  `;
}
