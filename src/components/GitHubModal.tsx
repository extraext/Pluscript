/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Github,
  X,
  Key,
  Folder,
  FileCode,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Lock,
  Globe,
  Loader2,
  RefreshCw,
  LogOut,
  GitBranch,
  Check,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Download
} from 'lucide-react';
import { EditorTheme, GitHubUser, GitHubRepo, GitHubTreeItem, ScriptFile } from '../types/editor';
import {
  getStoredGitHubToken,
  setStoredGitHubToken,
  clearStoredGitHubToken,
  fetchGitHubUser,
  fetchUserRepos,
  fetchRepo,
  fetchRepoTree,
  fetchFileContent,
  getLanguageFromPath
} from '../utils/githubService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: EditorTheme;
  onOpenFileFromGitHub: (file: ScriptFile) => void;
  onBatchOpenFiles?: (files: ScriptFile[]) => void;
}

export const GitHubModal: React.FC<Props> = ({
  isOpen,
  onClose,
  theme,
  onOpenFileFromGitHub,
  onBatchOpenFiles
}) => {
  const [token, setToken] = useState<string | null>(getStoredGitHubToken());
  const [patInput, setPatInput] = useState('');
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Selected Repo & Tree Explorer State
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [treeItems, setTreeItems] = useState<GitHubTreeItem[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [openingFilePath, setOpeningFilePath] = useState<string | null>(null);

  // Custom Repo input
  const [customRepoInput, setCustomRepoInput] = useState('');
  const [isLoadingCustomRepo, setIsLoadingCustomRepo] = useState(false);

  // Filter repositories
  const [repoSearch, setRepoSearch] = useState('');

  // Load user info and repos if token exists
  const loadUserData = useCallback(async () => {
    setIsLoadingUser(true);
    setError(null);
    try {
      const userData = await fetchGitHubUser();
      setUser(userData);

      setIsLoadingRepos(true);
      const userRepos = await fetchUserRepos();
      setRepos(userRepos);
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate with GitHub. Check your token or network connection.');
      setUser(null);
    } finally {
      setIsLoadingUser(false);
      setIsLoadingRepos(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && token) {
      loadUserData();
    }
  }, [isOpen, token, loadUserData]);

  // Handle OAuth listeners (postMessage, BroadcastChannel, storage, focus)
  useEffect(() => {
    const handleAuthToken = (receivedToken: string) => {
      if (!receivedToken) return;
      setStoredGitHubToken(receivedToken);
      setToken(receivedToken);
      setError(null);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.token) {
        handleAuthToken(event.data.token);
      }
    };

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('pluscript_oauth');
        bc.onmessage = (event) => {
          if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.token) {
            handleAuthToken(event.data.token);
          }
        };
      }
    } catch (e) {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pluscript_github_token' && e.newValue) {
        handleAuthToken(e.newValue);
      }
    };

    const handleFocus = () => {
      const currentToken = getStoredGitHubToken();
      if (currentToken && currentToken !== token) {
        setToken(currentToken);
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      if (bc) bc.close();
    };
  }, [token]);

  // Initiate OAuth connect
  const handleConnectOAuth = async () => {
    setError(null);
    try {
      const originParam = encodeURIComponent(window.location.origin);
      const res = await fetch(`/api/auth/github/url?origin=${originParam}`);
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to get OAuth authorization URL.');
      }

      const authWindow = window.open(
        data.url,
        'github_oauth_popup',
        'width=600,height=750,menubar=no,toolbar=no'
      );

      if (!authWindow) {
        setError('Popup was blocked by your browser. Please allow popups or use a Personal Access Token.');
      }
    } catch (err: any) {
      setError(err?.message || 'OAuth initiation failed. You can connect instantly using a Personal Access Token below.');
    }
  };

  // Connect via Personal Access Token
  const handleConnectPAT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patInput.trim()) return;

    const cleanToken = patInput.trim();
    setStoredGitHubToken(cleanToken);
    setToken(cleanToken);
    setPatInput('');
    setError(null);
  };

  // Disconnect GitHub
  const handleDisconnect = () => {
    clearStoredGitHubToken();
    setToken(null);
    setUser(null);
    setRepos([]);
    setSelectedRepo(null);
    setTreeItems([]);
  };

  // Open repository file tree
  const handleSelectRepo = async (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setSelectedBranch(repo.default_branch || 'main');
    setIsLoadingTree(true);
    setError(null);
    setFileSearchQuery('');

    try {
      const items = await fetchRepoTree(repo.owner.login, repo.name, repo.default_branch || 'main');
      setTreeItems(items);
      // Auto-expand root level directories
      const rootDirs = new Set<string>();
      items.forEach((item) => {
        if (item.type === 'tree' && !item.path.includes('/')) {
          rootDirs.add(item.path);
        }
      });
      setExpandedFolders(rootDirs);
    } catch (err: any) {
      setError(err?.message || `Failed to load file tree for ${repo.full_name}`);
    } finally {
      setIsLoadingTree(false);
    }
  };

  // Load custom repository by owner/repo
  const handleLoadCustomRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRepoInput.trim()) return;

    let cleanInput = customRepoInput.trim();
    // support full URL like https://github.com/owner/repo
    cleanInput = cleanInput.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    const parts = cleanInput.split('/');
    if (parts.length < 2) {
      setError('Please provide format as "owner/repository" (e.g. facebook/react)');
      return;
    }

    const [owner, repoName] = parts;
    setIsLoadingCustomRepo(true);
    setError(null);

    try {
      const repo = await fetchRepo(owner, repoName);
      await handleSelectRepo(repo);
      setCustomRepoInput('');
    } catch (err: any) {
      setError(err?.message || `Could not find repository "${cleanInput}"`);
    } finally {
      setIsLoadingCustomRepo(false);
    }
  };

  // Open a specific file from GitHub into Pluscript editor
  const handleOpenFile = async (item: GitHubTreeItem) => {
    if (!selectedRepo) return;
    setOpeningFilePath(item.path);
    setError(null);

    try {
      const fileData = await fetchFileContent(
        selectedRepo.owner.login,
        selectedRepo.name,
        item.path,
        selectedBranch
      );

      const fileName = item.path.split('/').pop() || item.path;
      const lang = getLanguageFromPath(item.path);

      const scriptFile: ScriptFile = {
        id: `github-${selectedRepo.owner.login}-${selectedRepo.name}-${item.path.replace(/\//g, '_')}`,
        name: fileName,
        content: fileData.content,
        savedContent: fileData.content,
        originalContent: fileData.content,
        language: lang,
        lastModified: Date.now(),
        isDirty: false,
        github: {
          owner: selectedRepo.owner.login,
          repo: selectedRepo.name,
          branch: selectedBranch,
          path: item.path,
          sha: fileData.sha,
          htmlUrl: fileData.htmlUrl
        }
      };

      onOpenFileFromGitHub(scriptFile);
      onClose();
    } catch (err: any) {
      setError(err?.message || `Failed to open "${item.path}"`);
    } finally {
      setOpeningFilePath(null);
    }
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  // Filter repositories
  const filteredRepos = repos.filter((r) =>
    r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
    r.description?.toLowerCase().includes(repoSearch.toLowerCase())
  );

  // Filter file tree
  const filteredTree = treeItems.filter((item) => {
    if (!fileSearchQuery.trim()) return true;
    return item.path.toLowerCase().includes(fileSearchQuery.toLowerCase());
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 select-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative z-10 flex flex-col w-full max-w-2xl h-[88vh] max-h-[720px] rounded-2xl border shadow-2xl overflow-hidden"
          style={{
            backgroundColor: theme.bg,
            borderColor: theme.surfaceBorder
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b px-4 py-3 shrink-0"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.surfaceBorder
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#24292f] text-white shadow-sm border border-white/10">
                <Github className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: theme.text }}>
                  <span>GitHub Integration</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Source Code
                  </span>
                </h3>
                <p className="text-[11px]" style={{ color: theme.textMuted }}>
                  Edit source files directly, commit changes & browse repositories
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:opacity-80 active:scale-95 transition-all"
              style={{ color: theme.textMuted }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 shrink-0">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold">Notice: </span>
                  <span className="break-all">{error}</span>
                </div>
                <button onClick={() => setError(null)} className="text-rose-400/80 hover:text-rose-400">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* If NOT logged in / No User */}
            {!user ? (
              <div className="flex-1 flex flex-col justify-center items-center max-w-md mx-auto py-6 space-y-6 text-center">
                <div className="space-y-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#24292f] border border-white/10 text-white shadow-xl">
                    <Github className="h-7 w-7" />
                  </div>
                  <h4 className="text-base font-bold" style={{ color: theme.text }}>
                    Connect GitHub Account
                  </h4>
                  <p className="text-xs max-w-xs leading-relaxed" style={{ color: theme.textMuted }}>
                    Open and edit source code files from your GitHub repositories and commit updates directly from Pluscript.
                  </p>
                </div>

                {/* Connect Buttons */}
                <div className="w-full space-y-3">
                  <button
                    onClick={handleConnectOAuth}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold shadow-md active:scale-95 transition-all bg-[#24292f] hover:bg-[#2f363d] text-white border border-white/10"
                  >
                    <Github className="h-4 w-4" />
                    <span>Connect with GitHub OAuth</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 border-t" style={{ borderColor: theme.surfaceBorder }} />
                    <span className="text-[10px] font-mono uppercase text-neutral-500">or use Access Token</span>
                    <div className="flex-1 border-t" style={{ borderColor: theme.surfaceBorder }} />
                  </div>

                  <form onSubmit={handleConnectPAT} className="space-y-2 text-left">
                    <label className="text-[11px] font-medium flex items-center justify-between" style={{ color: theme.text }}>
                      <span className="flex items-center gap-1">
                        <Key className="h-3 w-3 text-neutral-400" />
                        <span>Personal Access Token</span>
                      </span>
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=Pluscript%20Editor"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>Generate token</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="ghp_... or github_pat_..."
                        value={patInput}
                        onChange={(e) => setPatInput(e.target.value)}
                        className="flex-1 rounded-xl border px-3 py-2 text-xs font-mono focus:outline-none"
                        style={{
                          backgroundColor: theme.surface,
                          borderColor: theme.surfaceBorder,
                          color: theme.text
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!patInput.trim()}
                        className="rounded-xl px-4 py-2 text-xs font-semibold active:scale-95 transition-all bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40"
                      >
                        Connect
                      </button>
                    </div>
                    <p className="text-[10px] text-neutral-500">
                      Requires <code>repo</code> scope for private repos and commit permissions.
                    </p>
                  </form>
                </div>
              </div>
            ) : selectedRepo ? (
              /* VIEW: Inside Repository (File Tree Browser) */
              <div className="flex-1 flex flex-col min-h-0 gap-3">
                {/* Repo Navigation Bar */}
                <div
                  className="flex items-center justify-between rounded-xl border p-2.5 shrink-0"
                  style={{
                    backgroundColor: theme.surface,
                    borderColor: theme.surfaceBorder
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => setSelectedRepo(null)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium hover:bg-white/5 active:scale-95 transition-all shrink-0"
                      style={{
                        borderColor: theme.surfaceBorder,
                        color: theme.text
                      }}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Repos</span>
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold truncate" style={{ color: theme.text }}>
                        <span>{selectedRepo.name}</span>
                        {selectedRepo.private ? (
                          <Lock className="h-3 w-3 text-amber-400 shrink-0" />
                        ) : (
                          <Globe className="h-3 w-3 text-neutral-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        <span>{selectedBranch}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleSelectRepo(selectedRepo)}
                      disabled={isLoadingTree}
                      title="Refresh files"
                      className="p-1.5 rounded-lg border hover:bg-white/5 transition-all"
                      style={{ borderColor: theme.surfaceBorder, color: theme.textMuted }}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoadingTree ? 'animate-spin' : ''}`} />
                    </button>
                    <a
                      href={selectedRepo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border hover:bg-white/5 transition-all"
                      style={{ borderColor: theme.surfaceBorder, color: theme.textMuted }}
                      title="View on GitHub"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                {/* Tree Filter Input */}
                <div className="relative shrink-0">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search files in repo..."
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    className="w-full rounded-xl border pl-9 pr-3 py-1.5 text-xs font-mono focus:outline-none"
                    style={{
                      backgroundColor: theme.surface,
                      borderColor: theme.surfaceBorder,
                      color: theme.text
                    }}
                  />
                </div>

                {/* File Tree List */}
                <div
                  className="flex-1 rounded-xl border overflow-y-auto p-2 space-y-0.5 font-mono text-xs"
                  style={{
                    backgroundColor: theme.surface,
                    borderColor: theme.surfaceBorder
                  }}
                >
                  {isLoadingTree ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400 text-xs">
                      <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
                      <span>Loading repository file tree...</span>
                    </div>
                  ) : filteredTree.length === 0 ? (
                    <div className="py-12 text-center text-xs text-neutral-400">
                      No files matching "{fileSearchQuery}"
                    </div>
                  ) : (
                    filteredTree.map((item) => {
                      const isFolder = item.type === 'tree';
                      const pathParts = item.path.split('/');
                      const depth = pathParts.length - 1;
                      const fileName = pathParts[pathParts.length - 1];
                      const isExpanded = expandedFolders.has(item.path);
                      const isOpening = openingFilePath === item.path;

                      // If searching, show flat path, else hierarchical indent
                      const isSearching = !!fileSearchQuery.trim();

                      return (
                        <div
                          key={item.sha + item.path}
                          onClick={() => {
                            if (isFolder) {
                              toggleFolder(item.path);
                            } else {
                              handleOpenFile(item);
                            }
                          }}
                          className={`group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                            isOpening ? 'bg-sky-500/20 text-sky-300' : 'hover:bg-white/5'
                          }`}
                          style={{
                            paddingLeft: !isSearching ? `${Math.max(8, depth * 14 + 8)}px` : '8px',
                            color: isFolder ? theme.text : theme.textMuted
                          }}
                        >
                          <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                            {isFolder ? (
                              <div className="flex items-center gap-1 shrink-0 text-amber-400">
                                {isExpanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                                <Folder className="h-3.5 w-3.5 fill-amber-400/20" />
                              </div>
                            ) : (
                              <FileCode className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                            )}

                            <span className={`truncate ${isFolder ? 'font-semibold' : ''}`}>
                              {isSearching ? item.path : fileName}
                            </span>
                          </div>

                          {!isFolder && (
                            <div className="flex items-center gap-1.5 shrink-0 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              {isOpening ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-sans font-medium">
                                  Open
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* VIEW: User Profile + Repositories List */
              <div className="flex-1 flex flex-col min-h-0 gap-4">
                {/* User Profile Bar */}
                <div
                  className="flex items-center justify-between rounded-xl border p-3 shrink-0"
                  style={{
                    backgroundColor: theme.surface,
                    borderColor: theme.surfaceBorder
                  }}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar_url}
                      alt={user.login}
                      className="h-9 w-9 rounded-full border border-white/10"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold" style={{ color: theme.text }}>
                          {user.name || user.login}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400">@{user.login}</span>
                      </div>
                      <div className="text-[10px] text-neutral-400 flex items-center gap-2">
                        <span>{user.public_repos} public repos</span>
                        {user.total_private_repos !== undefined && (
                          <span>• {user.total_private_repos} private</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={loadUserData}
                      disabled={isLoadingRepos}
                      title="Refresh repositories"
                      className="p-1.5 rounded-lg border hover:bg-white/5 transition-all"
                      style={{ borderColor: theme.surfaceBorder, color: theme.textMuted }}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoadingRepos ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={handleDisconnect}
                      title="Disconnect GitHub"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium text-rose-400 hover:bg-rose-500/10 border-rose-500/20 active:scale-95 transition-all"
                    >
                      <LogOut className="h-3 w-3" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>

                {/* Open Custom Repo / Clone Form */}
                <form
                  onSubmit={handleLoadCustomRepo}
                  className="flex items-center gap-2 rounded-xl border p-2 shrink-0"
                  style={{
                    backgroundColor: theme.surface,
                    borderColor: theme.surfaceBorder
                  }}
                >
                  <Search className="h-3.5 w-3.5 text-neutral-400 ml-1 shrink-0" />
                  <input
                    type="text"
                    placeholder="Open any repo: owner/repo (e.g. vercel/next.js)..."
                    value={customRepoInput}
                    onChange={(e) => setCustomRepoInput(e.target.value)}
                    className="flex-1 bg-transparent text-xs font-mono focus:outline-none"
                    style={{ color: theme.text }}
                  />
                  <button
                    type="submit"
                    disabled={!customRepoInput.trim() || isLoadingCustomRepo}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 transition-all active:scale-95 shrink-0"
                  >
                    {isLoadingCustomRepo ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>Open</span>}
                  </button>
                </form>

                {/* Filter Repositories */}
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Filter your repositories..."
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      className="w-full rounded-xl border pl-8 pr-3 py-1 text-xs font-mono focus:outline-none"
                      style={{
                        backgroundColor: theme.surface,
                        borderColor: theme.surfaceBorder,
                        color: theme.text
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                    {filteredRepos.length} repos
                  </span>
                </div>

                {/* Repositories Grid */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {isLoadingRepos ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400 text-xs">
                      <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
                      <span>Loading your GitHub repositories...</span>
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="py-12 text-center text-xs text-neutral-400">
                      No repositories found. Try typing a repo name above.
                    </div>
                  ) : (
                    filteredRepos.map((repo) => (
                      <div
                        key={repo.id}
                        onClick={() => handleSelectRepo(repo)}
                        className="group flex items-center justify-between rounded-xl border p-3 transition-all hover:border-sky-500/50 cursor-pointer active:scale-[0.99]"
                        style={{
                          backgroundColor: theme.surface,
                          borderColor: theme.surfaceBorder
                        }}
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs font-mono truncate" style={{ color: theme.text }}>
                              {repo.name}
                            </span>
                            {repo.private ? (
                              <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Lock className="h-2.5 w-2.5" />
                                <span>Private</span>
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
                                Public
                              </span>
                            )}
                            {repo.language && (
                              <span className="text-[10px] font-mono text-neutral-400 hidden sm:inline">
                                • {repo.language}
                              </span>
                            )}
                          </div>

                          {repo.description && (
                            <p className="text-[11px] truncate text-neutral-400 mt-1 font-sans">
                              {repo.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-medium text-sky-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                            <span>Browse</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
