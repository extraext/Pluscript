/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Terminal,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  Play,
  Globe,
  Image as ImageIcon,
  Download,
  Eye,
  X
} from 'lucide-react';
import { ExecutionResult, EditorTheme, SupportedLanguage, GeneratedImage } from '../types/editor';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  result: ExecutionResult;
  onClear: () => void;
  onRunAgain: () => void;
  language: SupportedLanguage;
  theme: EditorTheme;
}

export const ConsoleOutput: React.FC<Props> = ({
  isOpen,
  onClose,
  result,
  onClear,
  onRunAgain,
  language,
  theme
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'preview' | 'images'>(
    language === 'html' || language === 'markdown' || language === 'xml' ? 'preview' : 'console'
  );
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  React.useEffect(() => {
    if ((language === 'html' || language === 'markdown' || language === 'xml') && result.htmlPreview) {
      setActiveTab('preview');
    }
  }, [language, result.htmlPreview]);

  React.useEffect(() => {
    if (result.generatedImages && result.generatedImages.length > 0) {
      setActiveTab('images');
    }
  }, [result.generatedImages]);

  const handleCopyLogs = () => {
    const text = result.logs.map((l) => `[${l.time}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = (img: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = img.dataUrl;
    link.download = img.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasImages = !!(result.generatedImages && result.generatedImages.length > 0);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0.8 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: 0.28,
              ease: [0.16, 1, 0.3, 1]
            }}
            className="flex flex-col border-t shadow-2xl z-30 select-none overflow-hidden shrink-0"
            style={{
              backgroundColor: theme.bg,
              borderColor: theme.surfaceBorder
            }}
          >
            <motion.div
              initial={{ y: 70 }}
              animate={{ y: 0 }}
              exit={{ y: 70 }}
              transition={{
                duration: 0.28,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="flex flex-col max-h-[55vh] h-84 overflow-hidden"
            >
              {/* Console Top Header */}
              <div
                className="flex h-11 items-center justify-between border-b px-2 sm:px-3 text-xs gap-1.5 select-none"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.surfaceBorder
                }}
              >
                {/* Left Side: Tabs & Status Badge (Fluid, scrollable if narrow, never overlaps) */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
                  {/* Terminal Tab */}
                  <button
                    onClick={() => setActiveTab('console')}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md font-medium text-xs transition-colors shrink-0 ${
                      activeTab === 'console'
                        ? 'bg-white/10 text-white font-semibold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Terminal className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Terminal</span>
                    {result.logs.length > 0 && (
                      <span className="font-mono text-[10px] opacity-70 shrink-0">({result.logs.length})</span>
                    )}
                  </button>

                  {/* Images Tab (when Pillow/Python produces images) */}
                  {hasImages && (
                    <button
                      onClick={() => setActiveTab('images')}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md font-medium text-xs transition-colors shrink-0 ${
                        activeTab === 'images'
                          ? 'bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <ImageIcon className="h-3.5 w-3.5 shrink-0 text-purple-400" />
                      <span className="truncate">Images</span>
                      <span className="font-mono text-[10px] px-1 rounded bg-purple-500/30 text-purple-200 shrink-0">
                        {result.generatedImages!.length}
                      </span>
                    </button>
                  )}

                  {/* Markdown/HTML/XML Preview Tab */}
                  {(language === 'html' || language === 'markdown' || language === 'xml') && (
                    <button
                      onClick={() => setActiveTab('preview')}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md font-medium text-xs transition-colors shrink-0 ${
                        activeTab === 'preview'
                          ? 'bg-white/10 text-white font-semibold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {language === 'markdown'
                          ? 'Markdown'
                          : language === 'xml'
                          ? 'XML'
                          : 'Preview'}
                      </span>
                    </button>
                  )}

                  {/* Status & Execution Time Badge */}
                  {result.status !== 'idle' && (
                    <span
                      className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 border ${
                        result.status === 'success'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : result.status === 'error'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 animate-pulse border-amber-500/30'
                      }`}
                    >
                      {result.status === 'running' ? (
                        'Running...'
                      ) : (
                        <>
                          <span className="font-bold">{result.status.toUpperCase()}</span>
                          <span className="opacity-90">({result.durationMs}ms)</span>
                        </>
                      )}
                    </span>
                  )}
                </div>

                {/* Right Side: Action Icons (Strict shrink-0 boundary, guaranteed zero overlap) */}
                <div
                  className="flex items-center gap-0.5 sm:gap-1 shrink-0 pl-1.5 border-l"
                  style={{ borderColor: theme.surfaceBorder }}
                >
                  <button
                    onClick={onRunAgain}
                    title="Re-run script"
                    className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 transition-all active:scale-95 shrink-0"
                    style={{ color: theme.textMuted }}
                  >
                    <Play className="h-3.5 w-3.5 fill-current shrink-0" />
                  </button>

                  <button
                    onClick={handleCopyLogs}
                    title="Copy logs"
                    className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 transition-all active:scale-95 shrink-0"
                    style={{ color: theme.textMuted }}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </button>

                  <button
                    onClick={onClear}
                    title="Clear console"
                    className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 transition-all active:scale-95 shrink-0"
                    style={{ color: theme.textMuted }}
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  </button>

                  <button
                    onClick={onClose}
                    title="Minimize console"
                    className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 transition-all active:scale-95 shrink-0"
                    style={{ color: theme.textMuted }}
                  >
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs select-text">
                {/* HTML / Markdown Preview View */}
                {activeTab === 'preview' && result.htmlPreview ? (
                  <iframe
                    title="HTML Preview"
                    srcDoc={result.htmlPreview}
                    className="h-full w-full rounded-lg border bg-white"
                    style={{ borderColor: theme.surfaceBorder }}
                    sandbox="allow-scripts"
                  />
                ) : activeTab === 'images' && hasImages ? (
                  /* Pillow Images Gallery View */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: theme.surfaceBorder }}>
                      <span className="text-neutral-400 font-sans text-xs">
                        Generated {result.generatedImages!.length} image{result.generatedImages!.length > 1 ? 's' : ''} via Pillow
                      </span>
                      <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 font-sans">
                        Python PIL Wasm
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {result.generatedImages!.map((img) => (
                        <div
                          key={img.id}
                          className="rounded-xl border p-2.5 flex flex-col gap-2 bg-neutral-900/40 backdrop-blur-sm shadow-md"
                          style={{ borderColor: theme.surfaceBorder }}
                        >
                          <div className="relative group overflow-hidden rounded-lg bg-neutral-950/80 border border-white/5 flex items-center justify-center p-2 min-h-[140px]">
                            <img
                              src={img.dataUrl}
                              alt={img.name}
                              className="max-h-48 max-w-full object-contain rounded shadow"
                              loading="lazy"
                            />
                            <button
                              onClick={() => setSelectedImage(img)}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-all opacity-80 sm:opacity-0 group-hover:opacity-100"
                              title="Enlarge image"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 font-sans">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-neutral-200 truncate font-mono">
                                {img.name}
                              </div>
                              <div className="text-[10px] text-neutral-400">
                                {img.format} {img.sizeBytes ? `• ${Math.round((img.sizeBytes / 1024) * 10) / 10} KB` : ''}
                              </div>
                            </div>

                            <button
                              onClick={() => handleDownloadImage(img)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-600/30 text-purple-200 hover:bg-purple-600/50 border border-purple-500/30 transition-all active:scale-95 shrink-0"
                              title="Download image"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Save</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Terminal Console Output View */
                  <div className="space-y-1">
                    {result.logs.length === 0 ? (
                      <div className="py-6 text-center text-xs" style={{ color: theme.textMuted }}>
                        {language === 'markdown' || language === 'html' || language === 'xml' ? (
                          <>Console is empty. Tap the <span className="font-semibold text-white">Preview</span> button to inspect output.</>
                        ) : (
                          <>Console is empty. Tap the <span className="font-semibold text-white">▶ Run</span> button to execute this script.</>
                        )}
                      </div>
                    ) : (
                      result.logs.map((log, idx) => (
                        <div key={idx} className="flex flex-col gap-1.5 py-0.5">
                          <div
                            className={`flex items-start gap-2 leading-relaxed ${
                              log.type === 'stderr'
                                ? 'text-rose-400'
                                : log.type === 'info'
                                ? 'text-indigo-400'
                                : log.type === 'result'
                                ? 'text-emerald-400 font-semibold'
                                : log.type === 'image'
                                ? 'text-purple-300 font-medium'
                                : 'text-neutral-200'
                            }`}
                          >
                            <span className="text-[10px] opacity-40 shrink-0 select-none font-mono">
                              {log.time}
                            </span>
                            <span className="whitespace-pre-wrap break-all flex-1 font-mono">{log.text}</span>
                          </div>

                          {/* Inline Image Card in Terminal */}
                          {log.type === 'image' && log.imageData && (
                            <div
                              className="ml-6 sm:ml-8 my-1 p-2 rounded-xl border bg-black/40 max-w-sm flex flex-col gap-2"
                              style={{ borderColor: theme.surfaceBorder }}
                            >
                              <div className="relative group bg-neutral-950 rounded-lg p-2 flex items-center justify-center border border-white/5">
                                <img
                                  src={log.imageData.dataUrl}
                                  alt={log.imageData.name}
                                  className="max-h-36 max-w-full object-contain rounded"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-2 font-sans">
                                <span className="text-[11px] font-mono text-neutral-300 truncate">
                                  {log.imageData.name}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => setActiveTab('images')}
                                    className="px-2 py-0.5 rounded text-[11px] bg-white/10 text-neutral-200 hover:text-white transition-colors"
                                  >
                                    Inspect
                                  </button>
                                  <button
                                    onClick={() => handleDownloadImage(log.imageData!)}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-purple-600/30 text-purple-200 hover:bg-purple-600/50 border border-purple-500/30 transition-colors"
                                  >
                                    <Download className="h-3 w-3" />
                                    <span>Save</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox / Fullscreen Modal for image inspection */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in select-none"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-lg w-full rounded-2xl border p-4 shadow-2xl flex flex-col gap-3"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.surfaceBorder
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: theme.surfaceBorder }}>
              <div className="flex flex-col">
                <span className="font-mono text-sm font-semibold text-white">{selectedImage.name}</span>
                <span className="text-[10px] text-neutral-400">
                  {selectedImage.format} {selectedImage.sizeBytes ? `• ${Math.round((selectedImage.sizeBytes / 1024) * 10) / 10} KB` : ''}
                </span>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-center bg-neutral-950 rounded-xl p-3 border border-white/5 min-h-[200px] max-h-[60vh] overflow-hidden">
              <img
                src={selectedImage.dataUrl}
                alt={selectedImage.name}
                className="max-h-[55vh] max-w-full object-contain rounded-lg shadow-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setSelectedImage(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:bg-white/5 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadImage(selectedImage)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white shadow transition-all active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Image</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
