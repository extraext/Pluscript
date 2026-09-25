/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GitCommit, GitBranch, X, Check, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { ScriptFile, EditorTheme } from '../types/editor';
import { commitFileToGitHub } from '../utils/githubService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  file: ScriptFile;
  theme: EditorTheme;
  onSuccess: (updatedFile: ScriptFile) => void;
}

export const CommitModal: React.FC<Props> = ({
  isOpen,
  onClose,
  file,
  theme,
  onSuccess
}) => {
  const [message, setMessage] = useState(`Update ${file.github?.path || file.name}`);
  const [branch, setBranch] = useState(file.github?.branch || 'main');
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ commitSha: string; htmlUrl: string } | null>(null);

  if (!isOpen || !file.github) return null;

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file.github || !message.trim()) return;

    setIsCommitting(true);
    setError(null);
    setSuccessInfo(null);

    try {
      const result = await commitFileToGitHub({
        owner: file.github.owner,
        repo: file.github.repo,
        path: file.github.path,
        content: file.content,
        message: message.trim(),
        branch: branch.trim() || 'main',
        sha: file.github.sha
      });

      const updatedFile: ScriptFile = {
        ...file,
        savedContent: file.content,
        isDirty: false,
        lastModified: Date.now(),
        github: {
          ...file.github,
          sha: result.sha,
          branch: branch.trim() || 'main',
          htmlUrl: result.htmlUrl
        }
      };

      setSuccessInfo({
        commitSha: result.commitSha.substring(0, 7),
        htmlUrl: result.htmlUrl
      });

      onSuccess(updatedFile);
      setTimeout(() => {
        onClose();
        setSuccessInfo(null);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to commit changes to GitHub');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative z-10 w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden"
          style={{
            backgroundColor: theme.bg,
            borderColor: theme.surfaceBorder
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b px-5 py-3.5"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.surfaceBorder
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#238636] text-white">
                <GitCommit className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
                  Commit to GitHub
                </h3>
                <p className="text-[10px] font-mono text-neutral-400">
                  {file.github.owner}/{file.github.repo}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1 hover:opacity-80 active:scale-95 transition-all"
              style={{ color: theme.textMuted }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleCommit} className="p-5 space-y-4">
            {/* File Path Indicator */}
            <div
              className="rounded-xl border p-3 flex flex-col gap-1"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.surfaceBorder
              }}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                Target File in Repo
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-medium truncate" style={{ color: theme.text }}>
                  {file.github.path}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono shrink-0">
                  {file.language}
                </span>
              </div>
            </div>

            {/* Commit Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: theme.text }}>
                Commit Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your changes..."
                rows={3}
                required
                className="w-full rounded-xl border p-3 text-xs font-mono focus:outline-none resize-none"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.surfaceBorder,
                  color: theme.text
                }}
                autoFocus
              />
            </div>

            {/* Target Branch */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: theme.text }}>
                <GitBranch className="h-3.5 w-3.5 text-neutral-400" />
                <span>Target Branch</span>
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. main, master, dev"
                required
                className="w-full rounded-xl border px-3 py-2 text-xs font-mono focus:outline-none"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.surfaceBorder,
                  color: theme.text
                }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="break-all">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successInfo && (
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>Committed successfully ({successInfo.commitSha})</span>
                </div>
                {successInfo.htmlUrl && (
                  <a
                    href={successInfo.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] underline"
                  >
                    <span>View</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isCommitting}
                className="flex-1 rounded-xl border py-2 text-xs font-medium active:scale-95 transition-all text-center"
                style={{
                  borderColor: theme.surfaceBorder,
                  color: theme.textMuted
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isCommitting || !message.trim()}
                className="flex-1 rounded-xl py-2 text-xs font-semibold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 bg-[#238636] hover:bg-[#2ea043] text-white disabled:opacity-40"
              >
                {isCommitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Pushing...</span>
                  </>
                ) : (
                  <>
                    <GitCommit className="h-3.5 w-3.5" />
                    <span>Commit & Push</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
