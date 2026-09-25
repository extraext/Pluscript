/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FilePlus,
  Trash2,
  Edit3,
  ArrowDown,
  ArrowUp,
  X,
  FileCode,
  Check,
  FolderOpen,
  Code,
  RotateCcw,
  Github
} from 'lucide-react';
import { ScriptFile, EditorTheme, SupportedLanguage } from '../types/editor';
import { LANGUAGE_EXTENSIONS, EXTENSION_TO_LANG } from '../utils/defaultFiles';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  files: ScriptFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onCreateFile: (name: string, language: SupportedLanguage) => void;
  onRenameFile: (id: string, newName: string) => void;
  onReloadFile: (id: string) => void;
  onDeleteFile: (id: string) => void;
  onExportFile: (file: ScriptFile) => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenGitHub?: () => void;
  theme: EditorTheme;
}

export const FileDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  files,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onRenameFile,
  onReloadFile,
  onDeleteFile,
  onExportFile,
  onImportFile,
  onOpenGitHub,
  theme
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileLang, setNewFileLang] = useState<SupportedLanguage>('javascript');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    let finalName = newFileName.trim();
    const ext = finalName.split('.').pop()?.toLowerCase();

    let lang = newFileLang;
    if (ext && EXTENSION_TO_LANG[ext]) {
      lang = EXTENSION_TO_LANG[ext];
    } else if (!finalName.includes('.')) {
      finalName += LANGUAGE_EXTENSIONS[newFileLang] || '.js';
    }

    onCreateFile(finalName, lang);
    setNewFileName('');
    setIsCreating(false);
  };

  const startRename = (file: ScriptFile) => {
    setEditingId(file.id);
    setEditName(file.name);
  };

  const handleRenameSubmit = (id: string) => {
    if (editName.trim()) {
      onRenameFile(id, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex select-none">
          {/* Backdrop with smooth fade animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer Body: Sliding to right on open, sliding to left on close */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '-100%' }}
            transition={{
              type: 'spring',
              damping: 26,
              stiffness: 280,
              mass: 0.85
            }}
            className="relative z-10 flex h-full w-72 sm:w-80 max-w-[85vw] flex-col shadow-2xl border-r"
            style={{
              backgroundColor: theme.bg,
              borderColor: theme.surfaceBorder
            }}
          >
            {/* Header */}
            <div
              className="flex h-14 items-center justify-between border-b px-4"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.surfaceBorder
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg shadow-sm"
                  style={{
                    backgroundColor: theme.accent,
                    color: theme.accentText
                  }}
                >
                  <Code className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="font-bitter text-base font-bold tracking-tight" style={{ color: theme.text }}>
                    Pluscript
                  </span>
                  <div className="text-[10px] text-neutral-400 font-mono">Files ({files.length})</div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:opacity-80 active:scale-95"
                style={{ color: theme.textMuted }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Actions Row */}
            <div
              className="flex items-center gap-1.5 border-b px-3 py-2.5 overflow-x-auto no-scrollbar"
              style={{ borderColor: theme.surfaceBorder }}
            >
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center justify-center gap-1 rounded-lg py-1.5 px-2.5 text-xs font-semibold shadow-xs active:scale-95 transition-all shrink-0"
                style={{
                  backgroundColor: theme.accent,
                  color: theme.accentText
                }}
              >
                <FilePlus className="h-3.5 w-3.5" />
                <span>New</span>
              </button>

              {onOpenGitHub && (
                <button
                  onClick={() => {
                    onOpenGitHub();
                    onClose();
                  }}
                  title="Open GitHub Repositories"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all active:scale-95 hover:opacity-90 shadow-2xs shrink-0"
                  style={{
                    backgroundColor: '#1f242c',
                    borderColor: 'rgba(255,255,255,0.12)',
                    color: '#f0f6fc'
                  }}
                >
                  <Github className="h-3.5 w-3.5 text-white" />
                  <span className="text-[11px]">GitHub</span>
                </button>
              )}

              <label
                title="Import code, XML, or markdown file"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all active:scale-95 hover:opacity-90 shadow-2xs shrink-0"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.surfaceBorder,
                  color: theme.text
                }}
              >
                <div
                  className="flex h-4 w-4 items-center justify-center rounded shrink-0"
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(56, 189, 248, 0.18)' : 'rgba(14, 165, 233, 0.15)',
                    color: '#0284c7'
                  }}
                >
                  <ArrowDown className="h-3 w-3 stroke-[2.5]" />
                </div>
                <span className="text-[11px] font-semibold">Import</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".js,.ts,.py,.sh,.html,.css,.json,.yaml,.yml,.sql,.md,.xml,.svg,.c,.cpp,.cs,.java,.rs,.go,.php,.rb,.lua,.ini,.txt"
                  onChange={onImportFile}
                />
              </label>

              {files.find((f) => f.id === activeFileId) && (
                <button
                  onClick={() => {
                    const f = files.find((item) => item.id === activeFileId);
                    if (f) onExportFile(f);
                  }}
                  title="Export active script file"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all active:scale-95 hover:opacity-90 shadow-2xs shrink-0"
                  style={{
                    backgroundColor: theme.surface,
                    borderColor: theme.surfaceBorder,
                    color: theme.text
                  }}
                >
                  <div
                    className="flex h-4 w-4 items-center justify-center rounded shrink-0"
                    style={{
                      backgroundColor: theme.isDark ? 'rgba(168, 85, 247, 0.18)' : 'rgba(147, 51, 234, 0.15)',
                      color: '#9333ea'
                    }}
                  >
                    <ArrowUp className="h-3 w-3 stroke-[2.5]" />
                  </div>
                  <span className="text-[11px] font-semibold">Export</span>
                </button>
              )}
            </div>

            {/* Inline Create Form */}
            {isCreating && (
              <form
                onSubmit={handleCreateSubmit}
                className="border-b p-3 space-y-2"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.surfaceBorder
                }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Create New Script
                </div>
                <input
                  type="text"
                  placeholder="e.g. script.js, layout.xml, notes.md"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full rounded-lg border px-3 py-1.5 text-xs font-mono focus:outline-none"
                  style={{
                    backgroundColor: theme.bg,
                    borderColor: theme.surfaceBorder,
                    color: theme.text
                  }}
                  autoFocus
                />

                <select
                  value={newFileLang}
                  onChange={(e) => setNewFileLang(e.target.value as SupportedLanguage)}
                  className="w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                  style={{
                    backgroundColor: theme.bg,
                    borderColor: theme.surfaceBorder,
                    color: theme.text
                  }}
                >
                  <optgroup label="Web & Markup">
                    <option value="javascript">JavaScript (.js)</option>
                    <option value="typescript">TypeScript (.ts)</option>
                    <option value="markdown">Markdown (.md)</option>
                    <option value="xml">XML / Markup (.xml)</option>
                    <option value="html">HTML5 (.html)</option>
                    <option value="css">CSS (.css)</option>
                    <option value="json">JSON (.json)</option>
                    <option value="yaml">YAML (.yaml)</option>
                  </optgroup>
                  <optgroup label="Languages">
                    <option value="python">Python (.py)</option>
                    <option value="rust">Rust (.rs)</option>
                    <option value="go">Go (.go)</option>
                    <option value="c">C (.c)</option>
                    <option value="cpp">C++ (.cpp)</option>
                    <option value="csharp">C# (.cs)</option>
                    <option value="java">Java (.java)</option>
                    <option value="php">PHP (.php)</option>
                    <option value="ruby">Ruby (.rb)</option>
                    <option value="lua">Lua (.lua)</option>
                    <option value="bash">Bash Shell (.sh)</option>
                    <option value="sql">SQL (.sql)</option>
                  </optgroup>
                  <optgroup label="Config & Text">
                    <option value="ini">INI / Conf (.ini)</option>
                    <option value="plaintext">Plain Text (.txt)</option>
                  </optgroup>
                </select>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 rounded-lg border py-1.5 text-xs font-medium active:scale-95 transition-all text-center"
                    style={{
                      borderColor: theme.surfaceBorder,
                      color: theme.textMuted
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg py-1.5 text-xs font-semibold shadow-sm active:scale-95 transition-all text-center"
                    style={{
                      backgroundColor: theme.accent,
                      color: theme.accentText
                    }}
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            {/* Files List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {files.map((file) => {
                const isActive = file.id === activeFileId;
                return (
                  <div
                    key={file.id}
                    className="group flex items-center justify-between rounded-xl px-3 py-2.5 transition-all text-xs cursor-pointer border"
                    style={{
                      backgroundColor: isActive ? theme.surface : 'transparent',
                      borderColor: isActive ? theme.surfaceBorder : 'transparent'
                    }}
                    onClick={() => {
                      onSelectFile(file.id);
                      onClose();
                    }}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                      <FileCode
                        className="h-4 w-4 shrink-0"
                        style={{
                          color: isActive ? theme.accent : theme.textMuted
                        }}
                      />

                      {editingId === file.id ? (
                        <div
                          className="flex items-center gap-1 flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded border px-1.5 py-0.5 text-xs font-mono focus:outline-none"
                            style={{
                              backgroundColor: theme.bg,
                              borderColor: theme.surfaceBorder,
                              color: theme.text
                            }}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameSubmit(file.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <button
                            onClick={() => handleRenameSubmit(file.id)}
                            className="p-1 text-emerald-400 hover:text-emerald-300"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col truncate">
                          <div className="flex items-center gap-1.5">
                            {file.github && (
                              <Github className="h-3 w-3 text-sky-400 shrink-0" />
                            )}
                            <span
                              className={`font-mono truncate ${isActive ? 'font-semibold text-white' : ''}`}
                              style={{ color: isActive ? theme.text : theme.textMuted }}
                            >
                              {file.name}
                            </span>
                            {file.isDirty && (
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] opacity-60 font-mono">
                            {file.github ? `${file.github.owner}/${file.github.repo} (${file.language})` : file.language}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Hover / Active Actions */}
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Reload button: appears on modified/unsaved files to revert code */}
                      {file.isDirty && (
                        <button
                          onClick={() => onReloadFile(file.id)}
                          title="Reload code (discard unsaved changes)"
                          className="p-1 rounded opacity-80 hover:opacity-100 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                          style={{ color: '#f59e0b' }}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      )}

                      <button
                        onClick={() => startRename(file)}
                        title="Rename"
                        className="p-1 rounded opacity-60 hover:opacity-100 hover:bg-white/10"
                        style={{ color: theme.textMuted }}
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>

                      {files.length > 1 && (
                        <button
                          onClick={() => onDeleteFile(file.id)}
                          title="Delete script"
                          className="p-1 rounded opacity-60 hover:opacity-100 hover:text-rose-400 hover:bg-rose-500/10"
                          style={{ color: theme.textMuted }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer info */}
            <div
              className="border-t p-3 text-[11px] font-mono flex items-center justify-center"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.surfaceBorder,
                color: theme.textMuted
              }}
            >
              <span>Pluscript v1.0</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
