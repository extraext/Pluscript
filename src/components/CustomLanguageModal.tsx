/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileCode,
  X,
  Upload,
  Check,
  Trash2,
  AlertCircle,
  FileCheck,
  Code
} from 'lucide-react';
import { EditorTheme } from '../types/editor';
import {
  CustomLanguageDefinition,
  getSavedCustomLanguages,
  parseLanguageXml,
  saveCustomLanguage,
  removeCustomLanguage
} from '../utils/customLanguageParser';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: EditorTheme;
  onLanguageImported: (lang: CustomLanguageDefinition) => void;
  onLanguageRemoved?: (id: string) => void;
}

export const CustomLanguageModal: React.FC<Props> = ({
  isOpen,
  onClose,
  theme,
  onLanguageImported,
  onLanguageRemoved
}) => {
  const [xmlInput, setXmlInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [customLangs, setCustomLangs] = useState<CustomLanguageDefinition[]>(() =>
    getSavedCustomLanguages()
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setXmlInput(text || '');
      setError(null);
      setSuccess(null);
    };
    reader.readAsText(file);
    // Reset file input target so re-selecting same file triggers onChange
    e.target.value = '';
  };

  const handleImportXml = (content?: string) => {
    const toParse = content || xmlInput;
    if (!toParse.trim()) {
      setError('Please paste or upload an XML language definition.');
      return;
    }

    try {
      const def = parseLanguageXml(toParse);
      saveCustomLanguage(def);
      const updated = getSavedCustomLanguages();
      setCustomLangs(updated);
      setSuccess(`✓ Successfully imported syntax for "${def.name}" (*.${def.extensions.join(', *.')}) with ${def.keywordGroups.reduce((acc, g) => acc + g.words.length, 0)} keywords!`);
      setError(null);
      setXmlInput('');
      onLanguageImported(def);
    } catch (err: any) {
      setError(err?.message || 'Failed to parse XML syntax definition.');
      setSuccess(null);
    }
  };

  const handleRemove = (id: string, name: string) => {
    removeCustomLanguage(id);
    const updated = getSavedCustomLanguages();
    setCustomLangs(updated);
    setSuccess(`Removed "${name}" custom language.`);
    setError(null);
    if (onLanguageRemoved) {
      onLanguageRemoved(id);
    }
  };

  const loadExample = () => {
    const sample = `<?xml version="1.0" encoding="UTF-8"?>
<Language Name="SampleLang" Ext="sl" CaseSensitive="false">
    <!-- Comments -->
    <Comment Line="//" BlockStart="/*" BlockEnd="*/" />
    
    <!-- Flow Control -->
    <Keywords Group="1" Color="Control">
        <Word>if</Word>
        <Word>else</Word>
        <Word>while</Word>
        <Word>return</Word>
        <Word>function</Word>
    </Keywords>

    <!-- Built-in Commands -->
    <Keywords Group="2" Color="Commands">
        <Word>print</Word>
        <Word>set</Word>
        <Word>launch</Word>
        <Word>start</Word>
        <Word>stop</Word>
    </Keywords>

    <!-- Constants & Booleans -->
    <Keywords Group="3" Color="Constants">
        <Word>true</Word>
        <Word>false</Word>
        <Word>null</Word>
    </Keywords>

    <!-- String Literals -->
    <String Start="&quot;" End="&quot;" Escape="\\" />
    
    <!-- Operators & Punctuation -->
    <Operators>
        <Char>+</Char>
        <Char>-</Char>
        <Char>*</Char>
        <Char>/</Char>
        <Char>=</Char>
        <Char>&lt;</Char>
        <Char>&gt;</Char>
        <Char>.</Char>
        <Char>:</Char>
    </Operators>
</Language>`;
    setXmlInput(sample);
    setError(null);
    setSuccess(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            style={{
              backgroundColor: theme.bg,
              borderColor: theme.surfaceBorder
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3.5 border-b"
              style={{ borderColor: theme.surfaceBorder }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: theme.isDark
                      ? 'rgba(56, 189, 248, 0.2)'
                      : 'rgba(14, 165, 233, 0.15)',
                    color: '#0284c7'
                  }}
                >
                  <FileCode className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: theme.text }}>
                    XML Language Definitions
                  </h3>
                  <p className="text-[11px]" style={{ color: theme.textMuted }}>
                    Import custom syntax coloring from any XML definition
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: theme.textMuted }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Active Installed Custom Languages */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold uppercase tracking-wider text-[10px]" style={{ color: theme.textMuted }}>
                    Installed XML Languages ({customLangs.length})
                  </span>
                  {customLangs.length > 0 && (
                    <button
                      onClick={() => {
                        customLangs.forEach(l => removeCustomLanguage(l.id));
                        setCustomLangs([]);
                        setSuccess('Removed all custom XML languages.');
                      }}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {customLangs.length === 0 ? (
                  <div
                    className="p-3.5 rounded-xl border border-dashed text-center"
                    style={{
                      borderColor: theme.surfaceBorder,
                      color: theme.textMuted
                    }}
                  >
                    No custom XML languages installed yet. Upload or paste an XML syntax file below to add one!
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {customLangs.map((lang) => (
                      <div
                        key={lang.id}
                        className="flex items-center justify-between px-3 py-2 rounded-xl border"
                        style={{
                          backgroundColor: theme.surface,
                          borderColor: theme.surfaceBorder
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Code className="h-3.5 w-3.5 text-sky-400" />
                          <span className="font-semibold" style={{ color: theme.text }}>{lang.name}</span>
                          {lang.extensions.map((ext) => (
                            <span
                              key={ext}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono"
                            >
                              .{ext}
                            </span>
                          ))}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-400 font-mono">
                            {lang.keywordGroups.reduce((acc, g) => acc + g.words.length, 0)} keywords
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemove(lang.id, lang.name)}
                          className="flex items-center gap-1 text-rose-400 hover:text-rose-300 px-2 py-1 rounded-md transition-colors border border-rose-500/30 hover:bg-rose-500/10 text-[11px]"
                          title={`Remove ${lang.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload file or paste XML */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold uppercase tracking-wider text-[10px]" style={{ color: theme.textMuted }}>
                    Import New XML Definition
                  </span>
                  <button
                    onClick={loadExample}
                    className="text-[11px] text-sky-400 hover:underline"
                  >
                    Insert Sample XML Template
                  </button>
                </div>

                <div className="flex gap-2">
                  <label
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed text-xs font-medium cursor-pointer transition-all active:scale-[0.99] hover:opacity-90"
                    style={{
                      backgroundColor: theme.surface,
                      borderColor: theme.surfaceBorder,
                      color: theme.text
                    }}
                  >
                    <Upload className="h-3.5 w-3.5 text-sky-400" />
                    <span>Choose .xml definition file</span>
                    <input
                      type="file"
                      accept=".xml"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>

                <textarea
                  value={xmlInput}
                  onChange={(e) => {
                    setXmlInput(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Or paste your XML language definition here..."
                  rows={7}
                  className="w-full rounded-xl border p-2.5 font-mono text-[11px] leading-relaxed focus:outline-none"
                  style={{
                    backgroundColor: theme.surface,
                    borderColor: theme.surfaceBorder,
                    color: theme.text
                  }}
                />
              </div>

              {/* Feedback banners */}
              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
                  <FileCheck className="h-4 w-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-2 px-4 py-3 border-t"
              style={{ borderColor: theme.surfaceBorder }}
            >
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: theme.surfaceBorder,
                  color: theme.textMuted
                }}
              >
                Close
              </button>
              <button
                onClick={() => handleImportXml()}
                disabled={!xmlInput.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-40"
                style={{
                  backgroundColor: '#3b82f6',
                  color: '#ffffff'
                }}
              >
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                <span className="font-semibold text-white">Save &amp; Activate XML</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
