/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Palette, Check, Download, Smartphone } from 'lucide-react';
import { EditorTheme, ThemeId } from '../types/editor';
import { THEMES } from '../utils/themes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeThemeId: ThemeId;
  onSelectTheme: (id: ThemeId) => void;
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  wordWrap: boolean;
  onToggleWordWrap: () => void;
  autoSave: boolean;
  onToggleAutoSave: () => void;
  smartIndent: boolean;
  onToggleSmartIndent: () => void;
  currentTheme: EditorTheme;
  onOpenInstallModal?: () => void;
  isInstalled?: boolean;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  activeThemeId,
  onSelectTheme,
  fontSize,
  onChangeFontSize,
  wordWrap,
  onToggleWordWrap,
  autoSave,
  onToggleAutoSave,
  smartIndent,
  onToggleSmartIndent,
  currentTheme,
  onOpenInstallModal,
  isInstalled
}) => {
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

          {/* Modal Container: zooms out to appear, zooms in until disappearing on close */}
          <motion.div
            initial={{ scale: 1.15, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.15, opacity: 0 }}
            transition={{
              duration: 0.24,
              ease: [0.16, 1, 0.3, 1]
            }}
            className="relative z-10 w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            style={{
              backgroundColor: currentTheme.bg,
              borderColor: currentTheme.surfaceBorder
            }}
          >
            {/* Header */}
            <div
              className="flex h-12 items-center justify-between border-b px-5"
              style={{
                backgroundColor: currentTheme.surface,
                borderColor: currentTheme.surfaceBorder
              }}
            >
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4" style={{ color: currentTheme.accent }} />
                <h3 className="font-semibold text-sm" style={{ color: currentTheme.text }}>
                  Preferences
                </h3>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:opacity-80 active:scale-95"
                style={{ color: currentTheme.textMuted }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Settings Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Themes */}
              <div className="space-y-2">
                <div
                  className="font-semibold uppercase tracking-wider text-[11px]"
                  style={{ color: currentTheme.textMuted }}
                >
                  Theme
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {Object.values(THEMES).map((th) => {
                    const isSelected = th.id === activeThemeId;
                    return (
                      <button
                        key={th.id}
                        onClick={() => onSelectTheme(th.id)}
                        className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.98]"
                        style={{
                          backgroundColor: th.surface,
                          borderColor: isSelected ? th.accent : th.surfaceBorder
                        }}
                      >
                        <span className="font-semibold text-xs truncate" style={{ color: th.text }}>
                          {th.name}
                        </span>
                        {isSelected && (
                          <div
                            className="h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 ml-1.5"
                            style={{ backgroundColor: th.accent, color: th.accentText }}
                          >
                            <Check className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font Size Horizontal Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-semibold uppercase tracking-wider text-[11px]" style={{ color: currentTheme.textMuted }}>
                  <span>Font Size</span>
                  <span className="font-mono text-xs font-bold" style={{ color: currentTheme.text }}>
                    {fontSize}px
                  </span>
                </div>

                <div
                  className="rounded-xl border p-3 space-y-2"
                  style={{
                    backgroundColor: currentTheme.surface,
                    borderColor: currentTheme.surfaceBorder
                  }}
                >
                  {/* Horizontal Slider Input */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono" style={{ color: currentTheme.textMuted }}>6px</span>
                    <input
                      type="range"
                      min="6"
                      max="28"
                      step="1"
                      value={fontSize}
                      onChange={(e) => onChangeFontSize(Number(e.target.value))}
                      className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                      style={{ accentColor: currentTheme.accent }}
                    />
                    <span className="text-[10px] font-mono" style={{ color: currentTheme.textMuted }}>28px</span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    {[7, 10, 13, 16, 22].map((size) => (
                      <button
                        key={size}
                        onClick={() => onChangeFontSize(size)}
                        className="px-2.5 py-1 rounded-md text-[10px] font-mono transition-all active:scale-95 border"
                        style={{
                          backgroundColor: fontSize === size ? currentTheme.accent : 'transparent',
                          color: fontSize === size ? currentTheme.accentText : currentTheme.textMuted,
                          borderColor: fontSize === size ? currentTheme.accent : currentTheme.surfaceBorder,
                          fontWeight: fontSize === size ? 700 : 400
                        }}
                      >
                        {size === 7 ? 'Tiny' : `${size}px`}
                      </button>
                    ))}
                  </div>

                  {/* Sample preview line */}
                  <div
                    className="mt-2 p-2 rounded-lg font-mono truncate border"
                    style={{
                      backgroundColor: currentTheme.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)',
                      borderColor: currentTheme.surfaceBorder,
                      color: currentTheme.text,
                      fontSize: `${fontSize}px`,
                      lineHeight: 1.3
                    }}
                  >
                    const test = "Pluscript preview text";
                  </div>
                </div>
              </div>

              {/* Editor Toggles */}
              <div className="space-y-2">
                <div className="font-semibold uppercase tracking-wider text-[11px]" style={{ color: currentTheme.textMuted }}>
                  Editor Options
                </div>

                {/* Line wrap */}
                <div
                  className="flex items-center justify-between rounded-xl border p-3 cursor-pointer"
                  style={{
                    backgroundColor: currentTheme.surface,
                    borderColor: currentTheme.surfaceBorder
                  }}
                  onClick={onToggleWordWrap}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-xs" style={{ color: currentTheme.text }}>Line wrap</span>
                    <span className="text-[10px] mt-0.5" style={{ color: currentTheme.textMuted }}>
                      Wrap long lines to fit viewport width
                    </span>
                  </div>
                  <div
                    className="h-5 w-9 rounded-full transition-colors relative flex items-center px-0.5"
                    style={{
                      backgroundColor: wordWrap ? currentTheme.accent : (currentTheme.isDark ? '#374151' : '#d1d5db')
                    }}
                  >
                    <div
                      className={`h-4 w-4 rounded-full transition-transform ${
                        wordWrap ? 'translate-x-4' : 'translate-x-0'
                      }`}
                      style={{
                        backgroundColor: wordWrap ? currentTheme.accentText : '#9ca3af'
                      }}
                    />
                  </div>
                </div>

                {/* Auto save */}
                <div
                  className="flex items-center justify-between rounded-xl border p-3 cursor-pointer"
                  style={{
                    backgroundColor: currentTheme.surface,
                    borderColor: currentTheme.surfaceBorder
                  }}
                  onClick={onToggleAutoSave}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-xs" style={{ color: currentTheme.text }}>Auto save</span>
                    <span className="text-[10px] mt-0.5" style={{ color: currentTheme.textMuted }}>
                      Automatically save modified files after editing
                    </span>
                  </div>
                  <div
                    className="h-5 w-9 rounded-full transition-colors relative flex items-center px-0.5"
                    style={{
                      backgroundColor: autoSave ? currentTheme.accent : (currentTheme.isDark ? '#374151' : '#d1d5db')
                    }}
                  >
                    <div
                      className={`h-4 w-4 rounded-full transition-transform ${
                        autoSave ? 'translate-x-4' : 'translate-x-0'
                      }`}
                      style={{
                        backgroundColor: autoSave ? currentTheme.accentText : '#9ca3af'
                      }}
                    />
                  </div>
                </div>

                {/* Smart indent */}
                <div
                  className="flex items-center justify-between rounded-xl border p-3 cursor-pointer"
                  style={{
                    backgroundColor: currentTheme.surface,
                    borderColor: currentTheme.surfaceBorder
                  }}
                  onClick={onToggleSmartIndent}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-xs" style={{ color: currentTheme.text }}>Smart indent</span>
                    <span className="text-[10px] mt-0.5" style={{ color: currentTheme.textMuted }}>
                      Auto-indent new lines and bracket blocks
                    </span>
                  </div>
                  <div
                    className="h-5 w-9 rounded-full transition-colors relative flex items-center px-0.5"
                    style={{
                      backgroundColor: smartIndent ? currentTheme.accent : (currentTheme.isDark ? '#374151' : '#d1d5db')
                    }}
                  >
                    <div
                      className={`h-4 w-4 rounded-full transition-transform ${
                        smartIndent ? 'translate-x-4' : 'translate-x-0'
                      }`}
                      style={{
                        backgroundColor: smartIndent ? currentTheme.accentText : '#9ca3af'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* App & Offline Installation */}
              {onOpenInstallModal && (
                <div className="space-y-2 pt-1 border-t" style={{ borderColor: currentTheme.surfaceBorder }}>
                  <div className="font-semibold uppercase tracking-wider text-[11px]" style={{ color: currentTheme.textMuted }}>
                    App &amp; Offline
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenInstallModal();
                    }}
                    className="w-full flex items-center justify-between rounded-xl border p-3 text-left transition-all active:scale-[0.98]"
                    style={{
                      backgroundColor: currentTheme.surface,
                      borderColor: currentTheme.surfaceBorder
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: currentTheme.isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(147, 51, 234, 0.12)',
                          color: '#a855f7'
                        }}
                      >
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs" style={{ color: currentTheme.text }}>
                          {isInstalled ? 'App Shortcut Installed' : 'Install Pluscript'}
                        </span>
                        <span className="text-[10px]" style={{ color: currentTheme.textMuted }}>
                          {isInstalled
                            ? 'App is installed and runs offline'
                            : 'Add home screen shortcut for offline launch'}
                        </span>
                      </div>
                    </div>
                    <Download className="h-4 w-4" style={{ color: currentTheme.textMuted }} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
