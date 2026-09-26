/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Download,
  X,
  Smartphone,
  CheckCircle2,
  Sparkles,
  Share,
  PlusSquare,
  Zap,
  WifiOff
} from 'lucide-react';
import { EditorTheme } from '../types/editor';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  onInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  theme: EditorTheme;
}

export const InstallModal: React.FC<Props> = ({
  isOpen,
  onClose,
  isInstallable,
  isInstalled,
  isIOS,
  onInstall,
  theme
}) => {
  const [installing, setInstalling] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosInstructions(true);
      return;
    }

    if (isInstallable) {
      setInstalling(true);
      const res = await onInstall();
      setInstalling(false);
      if (res === 'accepted') {
        setInstalledSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    } else {
      setShowIosInstructions(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border shadow-2xl transition-all animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: '#121316',
          borderColor: 'rgba(168, 85, 247, 0.25)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(147, 51, 234, 0.15)'
        }}
      >
        {/* Header background with subtle gradient */}
        <div className="relative bg-gradient-to-br from-purple-950/60 via-[#161224] to-[#121316] p-6 pb-5 text-center border-b border-purple-500/10">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          >
            <X className="h-4 w-4" />
          </button>

          {/* App Icon preview: Sci-Fi "P" on Dark Purple to Black Gradient */}
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl shadow-xl border border-purple-400/30 overflow-hidden relative group">
            {/* Dark purple top-left to black bottom-right background */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-[#4c1d95] via-[#2e1065] to-[#020204]"
              style={{
                background: 'linear-gradient(135deg, #4c1d95 0%, #2e1065 40%, #080312 85%, #000000 100%)'
              }}
            />

            {/* Subtle cyber grid */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(216, 180, 254, 0.5) 1px, transparent 0)`,
                backgroundSize: '12px 12px'
              }}
            />

            {/* Sci-Fi "P" SVG Icon */}
            <svg
              viewBox="0 0 512 512"
              className="relative z-10 w-14 h-14 drop-shadow-[0_0_12px_rgba(192,132,252,0.6)]"
            >
              <defs>
                <linearGradient id="modalPGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="30%" stopColor="#e9d5ff" />
                  <stop offset="70%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <path
                d="M 148 108 L 326 108 L 374 156 L 374 252 L 326 300 L 242 300 L 242 404 L 182 404 L 148 370 Z"
                fill="url(#modalPGrad)"
              />
              <path
                d="M 218 168 L 302 168 L 322 188 L 322 220 L 302 240 L 218 240 Z"
                fill="#170b2c"
              />
              <polygon points="140,224 168,224 180,240 140,240" fill="#f3e8ff" opacity="0.9" />
              <rect x="180" y="328" width="4" height="42" fill="#c084fc" opacity="0.8" />
              <polygon points="340,118 360,138 348,138 332,122" fill="#ffffff" opacity="0.9" />
            </svg>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            <span>Install Pluscript</span>
          </h2>
          <p className="mt-1 text-xs text-neutral-300">
            Add to your home screen for instantaneous launch & offline code notebook access
          </p>
        </div>

        {/* Body content & features */}
        <div className="p-5 space-y-3.5 bg-[#121316]">
          {installedSuccess ? (
            <div className="flex flex-col items-center justify-center py-4 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 animate-bounce" />
              <div className="text-sm font-semibold text-white">Pluscript Added to Home Screen!</div>
              <p className="text-xs text-neutral-400">Launch anytime right from your home screen.</p>
            </div>
          ) : showIosInstructions || (!isInstallable && !isInstalled) ? (
            <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-3.5 space-y-2.5 text-xs text-neutral-200">
              <div className="font-semibold text-purple-300 flex items-center gap-1.5">
                <Smartphone className="h-4 w-4" />
                <span>How to Add to Home Screen:</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                  1
                </div>
                <div>
                  Tap the <strong className="text-white">Share</strong> button{' '}
                  <Share className="inline h-3.5 w-3.5 text-blue-400 mx-0.5" /> in your browser toolbar.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                  2
                </div>
                <div>
                  Scroll down and tap <strong className="text-white">Add to Home Screen</strong>{' '}
                  <PlusSquare className="inline h-3.5 w-3.5 text-purple-400 mx-0.5" />.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                  3
                </div>
                <div>
                  Tap <strong className="text-white">Add</strong> in the top corner.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs text-neutral-300">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-white">Full-Screen Mobile Editor:</span> Dedicated window with zero browser bars.
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-neutral-300">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <WifiOff className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-white">100% Offline Capable:</span> Code, run scripts, and preview markdown anywhere.
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-neutral-300">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-white">Instant Python & JS Engine:</span> Cached local execution environment.
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!installedSuccess && (
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleInstallClick}
                disabled={installing}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-bold text-white shadow-lg active:scale-98 transition-all relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #6b21a8 100%)',
                  boxShadow: '0 4px 15px rgba(147, 51, 234, 0.4)'
                }}
              >
                <Download className="h-4 w-4" />
                <span>
                  {installing
                    ? 'Installing...'
                    : showIosInstructions
                    ? 'Got it!'
                    : 'Add Shortcut to Home Screen'}
                </span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Maybe later
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
