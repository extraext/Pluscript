/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Menu,
  Play,
  Search,
  Settings,
  Code,
  Plus,
  X,
  FileCode,
  Terminal,
  Sparkles,
  Eye,
  Save,
  Download,
  Github,
  GitCommit
} from 'lucide-react';
import {
  ScriptFile,
  SupportedLanguage,
  ThemeId,
  ExecutionResult,
  SearchState
} from './types/editor';
import { THEMES } from './utils/themes';
import { DEFAULT_FILES, LANGUAGE_EXTENSIONS, EXTENSION_TO_LANG } from './utils/defaultFiles';
import { executeScript } from './utils/scriptRunner';
import { AccessoryBar } from './components/AccessoryBar';
import { EditorArea } from './components/EditorArea';
import { SearchReplaceBar } from './components/SearchReplaceBar';
import { FileDrawer } from './components/FileDrawer';
import { ConsoleOutput } from './components/ConsoleOutput';
import { SnippetsModal } from './components/SnippetsModal';
import { SettingsModal } from './components/SettingsModal';
import { InstallModal } from './components/InstallModal';
import { GitHubModal } from './components/GitHubModal';
import { CommitModal } from './components/CommitModal';
import { usePWA } from './hooks/usePWA';

const STORAGE_FILES_KEY = 'pluscript_files';
const STORAGE_ACTIVE_FILE_KEY = 'pluscript_active_file';
const STORAGE_OPEN_TABS_KEY = 'pluscript_open_tabs';

export default function App() {
  // File state persisted across sessions and refreshes
  const [files, setFiles] = useState<ScriptFile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FILES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load saved files from localStorage:', e);
    }
    return DEFAULT_FILES;
  });

  const [activeFileId, setActiveFileId] = useState<string>(() => {
    try {
      const savedActive = localStorage.getItem(STORAGE_ACTIVE_FILE_KEY);
      if (savedActive) return savedActive;
    } catch {}
    return DEFAULT_FILES[0].id;
  });

  const [openFileIds, setOpenFileIds] = useState<string[]>(() => {
    try {
      const savedTabs = localStorage.getItem(STORAGE_OPEN_TABS_KEY);
      if (savedTabs) {
        const parsed = JSON.parse(savedTabs);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [DEFAULT_FILES[0].id];
  });

  // Keep files, active file, and open tabs synchronized with localStorage
  // Debounce files persistence to eliminate typing lag on 2000+ line files
  const saveFilesTimerRef = useRef<any>(null);
  useEffect(() => {
    if (saveFilesTimerRef.current) clearTimeout(saveFilesTimerRef.current);
    saveFilesTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(files));
      } catch (err) {
        console.warn('Failed to persist files:', err);
      }
    }, 500);

    return () => {
      if (saveFilesTimerRef.current) clearTimeout(saveFilesTimerRef.current);
    };
  }, [files]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVE_FILE_KEY, activeFileId);
    } catch {}
  }, [activeFileId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_OPEN_TABS_KEY, JSON.stringify(openFileIds));
    } catch {}
  }, [openFileIds]);

  // Undo / Redo history stack per file
  const [history, setHistory] = useState<Record<string, { past: string[]; future: string[] }>>({
    [DEFAULT_FILES[0].id]: { past: [], future: [] }
  });

  // Editor configuration with localStorage persistence for all preferences
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem('pluscript_theme');
      if (saved && THEMES[saved as ThemeId]) {
        return saved as ThemeId;
      }
      return 'graphite';
    } catch {
      return 'graphite';
    }
  });

  const handleSelectTheme = useCallback((newThemeId: ThemeId) => {
    setThemeId(newThemeId);
    try {
      localStorage.setItem('pluscript_theme', newThemeId);
    } catch {}
  }, []);

  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('pluscript_fontsize');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 6 && parsed <= 32) return parsed;
      }
      return 13;
    } catch {
      return 13;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pluscript_fontsize', String(fontSize));
    } catch {}
  }, [fontSize]);

  const handleChangeFontSize = useCallback((newSize: number) => {
    setFontSize(newSize);
    try {
      localStorage.setItem('pluscript_fontsize', String(newSize));
    } catch {}
  }, []);

  const [wordWrap, setWordWrap] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pluscript_wordwrap');
      return saved !== null ? saved === 'true' : false; // Default line wrap is OFF
    } catch {
      return false;
    }
  });

  const handleToggleWordWrap = useCallback(() => {
    setWordWrap((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pluscript_wordwrap', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Auto Save and Smart Indent configuration with persistence
  const [autoSave, setAutoSave] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pluscript_autosave') === 'true';
    } catch {
      return false;
    }
  });

  const [smartIndent, setSmartIndent] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pluscript_smartindent');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleAutoSave = useCallback(() => {
    setAutoSave((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pluscript_autosave', String(next));
      } catch {}
      return next;
    });
  }, []);

  const handleToggleSmartIndent = useCallback(() => {
    setSmartIndent((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pluscript_smartindent', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Active cursor tracking
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1, offset: 0 });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Modals & Panels
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSnippetsOpen, setIsSnippetsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isGitHubOpen, setIsGitHubOpen] = useState(false);
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [hasGitHubToken, setHasGitHubToken] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem('pluscript_github_token'));
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const checkToken = () => {
      try {
        setHasGitHubToken(Boolean(localStorage.getItem('pluscript_github_token')));
      } catch {}
    };
    window.addEventListener('storage', checkToken);
    window.addEventListener('focus', checkToken);
    return () => {
      window.removeEventListener('storage', checkToken);
      window.removeEventListener('focus', checkToken);
    };
  }, []);

  // PWA & Offline integration
  const { isInstallable, isInstalled, isIOS, triggerInstall } = usePWA();

  // Auto show Install Pluscript pop up on app launch
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (!isStandalone) {
      const timer = setTimeout(() => {
        setIsInstallModalOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Execution state
  const [executionResult, setExecutionResult] = useState<ExecutionResult>({
    logs: [],
    durationMs: 0,
    status: 'idle'
  });

  // Search & Replace state
  const [searchState, setSearchState] = useState<SearchState>({
    isOpen: false,
    query: '',
    replaceText: '',
    matchCase: false,
    useRegex: false,
    currentMatchIndex: 0,
    totalMatches: 0
  });

  const activeTheme = THEMES[themeId] || THEMES.graphite;
  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  // Save active file changes
  const handleSaveFile = useCallback(() => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === activeFileId) {
          return {
            ...f,
            savedContent: f.content,
            originalContent: f.originalContent ?? f.savedContent ?? f.content,
            isDirty: false
          };
        }
        return f;
      })
    );
  }, [activeFileId]);

  // Reload code (discard unsaved modifications and revert file to saved/original state)
  const handleReloadFile = useCallback((id: string) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const revertContent = f.savedContent ?? f.originalContent ?? f.content;
          return {
            ...f,
            content: revertContent,
            isDirty: false
          };
        }
        return f;
      })
    );
    // Reset undo/redo history for this file
    setHistory((prev) => ({
      ...prev,
      [id]: { past: [], future: [] }
    }));
  }, []);

  // Disallow accidental browser page refresh / unload & immediately flush persisted files
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      try {
        localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(files));
      } catch {}
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [files]);

  // Save shortcut (Ctrl+S / Cmd+S) and disallow browser refresh keys (F5, Ctrl+R, Cmd+R)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Disallow browser refresh shortcuts
      if (
        e.key === 'F5' ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r')
      ) {
        e.preventDefault();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveFile();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleSaveFile]);

  // Debounced Auto-Save effect when enabled
  useEffect(() => {
    if (!autoSave) return;
    const current = files.find((f) => f.id === activeFileId);
    if (!current || !current.isDirty) return;

    const timer = setTimeout(() => {
      handleSaveFile();
    }, 1200);

    return () => clearTimeout(timer);
  }, [autoSave, files, activeFileId, handleSaveFile]);

  // Record history when content changes
  const updateActiveContent = useCallback(
    (newContent: string) => {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id === activeFileId) {
            return {
              ...f,
              content: newContent,
              lastModified: Date.now(),
              isDirty: newContent !== (f.savedContent ?? f.content)
            };
          }
          return f;
        })
      );

      // Record to history
      setHistory((prev) => {
        const fileHistory = prev[activeFileId] || { past: [], future: [] };
        // Max 50 history steps
        const newPast = [...fileHistory.past, activeFile.content].slice(-50);
        return {
          ...prev,
          [activeFileId]: {
            past: newPast,
            future: []
          }
        };
      });
    },
    [activeFileId, activeFile]
  );

  // Undo Handler
  const handleUndo = () => {
    const fileHist = history[activeFileId];
    if (!fileHist || fileHist.past.length === 0) return;

    const previousContent = fileHist.past[fileHist.past.length - 1];
    const newPast = fileHist.past.slice(0, -1);
    const newFuture = [activeFile.content, ...fileHist.future];

    setHistory((prev) => ({
      ...prev,
      [activeFileId]: { past: newPast, future: newFuture }
    }));

    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: previousContent } : f))
    );
  };

  // Redo Handler
  const handleRedo = () => {
    const fileHist = history[activeFileId];
    if (!fileHist || fileHist.future.length === 0) return;

    const nextContent = fileHist.future[0];
    const newFuture = fileHist.future.slice(1);
    const newPast = [...fileHist.past, activeFile.content];

    setHistory((prev) => ({
      ...prev,
      [activeFileId]: { past: newPast, future: newFuture }
    }));

    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: nextContent } : f))
    );
  };

  const canUndo = (history[activeFileId]?.past.length || 0) > 0;
  const canRedo = (history[activeFileId]?.future.length || 0) > 0;

  // Insert symbol at current cursor
  const handleInsertSymbol = (symbol: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const { selectionStart, selectionEnd } = el;
    const before = activeFile.content.substring(0, selectionStart);
    const after = activeFile.content.substring(selectionEnd);
    const newContent = before + symbol + after;

    updateActiveContent(newContent);

    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = selectionStart + symbol.length;
      setCursorPos({
        line: cursorPos.line,
        col: cursorPos.col + symbol.length,
        offset: selectionStart + symbol.length
      });
    }, 0);
  };

  // Indent active line
  const handleIndent = () => {
    handleInsertSymbol('  ');
  };

  // Outdent active line
  const handleOutdent = () => {
    const el = textareaRef.current;
    if (!el) return;

    const { selectionStart } = el;
    const before = activeFile.content.substring(0, selectionStart);
    const after = activeFile.content.substring(selectionStart);
    const lineStart = before.lastIndexOf('\n') + 1;
    const lineStr = before.substring(lineStart);

    if (lineStr.startsWith('  ')) {
      const newBefore = before.substring(0, lineStart) + lineStr.substring(2);
      updateActiveContent(newBefore + after);
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = selectionStart - 2;
      }, 0);
    }
  };

  // Toggle Comment
  const handleToggleComment = () => {
    const el = textareaRef.current;
    if (!el) return;

    const { selectionStart } = el;
    const before = activeFile.content.substring(0, selectionStart);
    const after = activeFile.content.substring(selectionStart);
    const lineStart = before.lastIndexOf('\n') + 1;
    const currentLine = before.substring(lineStart);

    const prefix = activeFile.language === 'python' || activeFile.language === 'bash' ? '# ' : '// ';

    let newContent = '';
    if (currentLine.startsWith(prefix)) {
      newContent = before.substring(0, lineStart) + currentLine.substring(prefix.length) + after;
    } else {
      newContent = before.substring(0, lineStart) + prefix + currentLine + after;
    }

    updateActiveContent(newContent);
  };

  // Nudge cursor left or right
  const handleMoveCursor = (dir: 'left' | 'right') => {
    const el = textareaRef.current;
    if (!el) return;

    if (dir === 'left' && el.selectionStart > 0) {
      el.selectionStart = el.selectionEnd = el.selectionStart - 1;
    } else if (dir === 'right' && el.selectionStart < activeFile.content.length) {
      el.selectionStart = el.selectionEnd = el.selectionStart + 1;
    }
    el.focus();
  };

  // Tab management
  const handleSelectTab = (id: string) => {
    if (autoSave && activeFile.isDirty) {
      handleSaveFile();
    }
    setActiveFileId(id);
    if (!openFileIds.includes(id)) {
      setOpenFileIds([...openFileIds, id]);
    }
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newOpen = openFileIds.filter((item) => item !== id);
    setOpenFileIds(newOpen);
    if (activeFileId === id && newOpen.length > 0) {
      setActiveFileId(newOpen[0]);
    }
  };

  // Create new script file
  const handleCreateFile = (name: string, language: SupportedLanguage) => {
    const newId = `file-${Date.now()}`;
    const starter = language === 'python'
      ? `# ${name}\nfrom PIL import Image, ImageDraw\n\n# Create a canvas\nimg = Image.new('RGB', (320, 200), color='#0f172a')\ndraw = ImageDraw.Draw(img)\n\n# Draw graphics\ndraw.rounded_rectangle([15, 15, 305, 185], radius=16, outline='#38bdf8', width=2)\ndraw.ellipse([45, 55, 115, 125], fill='#0284c7', outline='#7dd3fc', width=2)\ndraw.text((135, 75), "Pillow in Pluscript", fill='#ffffff')\ndraw.text((135, 98), "Image generated!", fill='#94a3b8')\n\n# Save to output file\nimg.save("output.png")\nprint("✓ Generated output.png with Pillow!")\n`
      : language === 'bash'
      ? `#!/usr/bin/env bash\n\necho "Running ${name}"\n`
      : `/**\n * ${name}\n */\n\nconsole.log("Loaded ${name}");\n`;

    const newFile: ScriptFile = {
      id: newId,
      name,
      language,
      lastModified: Date.now(),
      content: starter,
      savedContent: starter,
      originalContent: starter,
      isDirty: false
    };

    setFiles((prev) => [...prev, newFile]);
    setOpenFileIds((prev) => [...prev, newId]);
    setActiveFileId(newId);
  };

  const handleRenameFile = (id: string, newName: string) => {
    const ext = newName.split('.').pop()?.toLowerCase();
    const newLang = ext && EXTENSION_TO_LANG[ext] ? EXTENSION_TO_LANG[ext] : undefined;

    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, name: newName, ...(newLang ? { language: newLang } : {}) }
          : f
      )
    );
  };

  const handleChangeLanguage = (newLang: SupportedLanguage) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, language: newLang } : f))
    );
  };

  const handleDeleteFile = (id: string) => {
    if (files.length <= 1) return;
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setOpenFileIds((prev) => prev.filter((item) => item !== id));
    if (activeFileId === id) {
      const remaining = files.filter((f) => f.id !== id);
      if (remaining.length > 0) setActiveFileId(remaining[0].id);
    }
  };

  const handleExportFile = (file: ScriptFile) => {
    // Use application/octet-stream to prevent mobile browsers from appending .txt to code files
    const blob = new Blob([file.content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const name = file.name;
      const ext = name.split('.').pop()?.toLowerCase();
      let lang: SupportedLanguage = 'javascript';
      if (ext === 'py') lang = 'python';
      else if (ext === 'sh' || ext === 'bash') lang = 'bash';
      else if (ext === 'html' || ext === 'htm') lang = 'html';
      else if (ext === 'sql') lang = 'sql';
      else if (ext === 'json') lang = 'json';
      else if (ext === 'md' || ext === 'markdown') lang = 'markdown';
      else if (ext === 'lua') lang = 'lua';

      const newId = `file-${Date.now()}`;
      const newFile: ScriptFile = {
        id: newId,
        name,
        language: lang,
        content: content || '',
        lastModified: Date.now()
      };

      setFiles((prev) => [...prev, newFile]);
      setOpenFileIds((prev) => [...prev, newId]);
      setActiveFileId(newId);
      setIsDrawerOpen(false);
    };
    reader.readAsText(file);
  };

  // Open / sync file from GitHub repository
  const handleOpenFileFromGitHub = (ghFile: ScriptFile) => {
    setFiles((prev) => {
      const existingIdx = prev.findIndex(
        (f) =>
          f.id === ghFile.id ||
          (f.github &&
            ghFile.github &&
            f.github.owner === ghFile.github.owner &&
            f.github.repo === ghFile.github.repo &&
            f.github.path === ghFile.github.path)
      );
      if (existingIdx !== -1) {
        const next = [...prev];
        next[existingIdx] = ghFile;
        return next;
      }
      return [...prev, ghFile];
    });

    setOpenFileIds((prev) => {
      if (prev.includes(ghFile.id)) return prev;
      return [...prev, ghFile.id];
    });

    setActiveFileId(ghFile.id);
  };

  // Update file metadata after successful GitHub commit
  const handleCommitSuccess = (updatedFile: ScriptFile) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === updatedFile.id ? updatedFile : f))
    );
  };

  // Execute current active script
  const handleRunScript = async () => {
    setIsConsoleOpen(true);
    setExecutionResult({
      logs: [],
      durationMs: 0,
      status: 'running'
    });

    const res = await executeScript(activeFile.content, activeFile.language);
    setExecutionResult(res);
  };

  // Helper to scroll and locate match in script editor
  const locateMatch = useCallback((targetIndex: number, currentSearchState?: SearchState) => {
    const sState = currentSearchState || searchState;
    if (!sState.query || !activeFile) return;

    try {
      const flags = sState.matchCase ? 'g' : 'gi';
      const regex = sState.useRegex
        ? new RegExp(sState.query, flags)
        : new RegExp(sState.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      const matches = [...activeFile.content.matchAll(regex)];
      if (matches.length === 0) return;

      const validIdx = ((targetIndex % matches.length) + matches.length) % matches.length;
      const targetMatch = matches[validIdx];
      const matchOffset = targetMatch.index ?? 0;
      const matchLength = targetMatch[0].length;

      // Update state
      setSearchState((prev) => ({
        ...prev,
        currentMatchIndex: validIdx,
        totalMatches: matches.length
      }));

      // Calculate line and column
      const textBefore = activeFile.content.substring(0, matchOffset);
      const linesBefore = textBefore.split('\n');
      const lineNum = linesBefore.length;
      const colNum = linesBefore[linesBefore.length - 1].length + 1;

      // Update cursor position state
      setCursorPos({ line: lineNum, col: colNum, offset: matchOffset });

      // Scroll and select match WITHOUT focusing textarea to avoid triggering virtual keyboard on mobile
      const el = textareaRef.current;
      if (el) {
        el.setSelectionRange(matchOffset, matchOffset + matchLength);

        // Scroll smoothly to center the matched line
        const lineHeightPx = Math.max(10, Math.round(fontSize * 1.55));
        const viewportLines = Math.floor(el.clientHeight / lineHeightPx);
        const centerLineOffset = Math.max(0, Math.floor(viewportLines / 2) - 1);
        const targetScrollTop = Math.max(0, (lineNum - 1 - centerLineOffset) * lineHeightPx);

        el.scrollTop = targetScrollTop;

        // Also scroll horizontally if match is far right
        const charWidth = fontSize * 0.62;
        const targetScrollLeft = Math.max(0, (colNum - 5) * charWidth);
        el.scrollLeft = targetScrollLeft;
      }
    } catch {
      // Regex parse error safety
    }
  }, [searchState, activeFile, fontSize, setCursorPos, textareaRef]);

  // Search & Replace Handlers
  const handleUpdateSearch = (partial: Partial<SearchState>) => {
    setSearchState((prev) => {
      const updated = { ...prev, ...partial };
      // Compute matches
      if (updated.query) {
        try {
          const flags = updated.matchCase ? 'g' : 'gi';
          const regex = updated.useRegex
            ? new RegExp(updated.query, flags)
            : new RegExp(updated.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
          const matches = [...activeFile.content.matchAll(regex)];
          updated.totalMatches = matches.length;
          if (updated.currentMatchIndex >= matches.length) {
            updated.currentMatchIndex = 0;
          }
        } catch {
          updated.totalMatches = 0;
        }
      } else {
        updated.totalMatches = 0;
        updated.currentMatchIndex = 0;
      }
      return updated;
    });
  };

  const handleLocate = () => {
    locateMatch(searchState.currentMatchIndex);
  };

  const handleFindNext = () => {
    if (searchState.totalMatches === 0) return;
    const nextIdx = (searchState.currentMatchIndex + 1) % searchState.totalMatches;
    locateMatch(nextIdx);
  };

  const handleFindPrev = () => {
    if (searchState.totalMatches === 0) return;
    const prevIdx = (searchState.currentMatchIndex - 1 + searchState.totalMatches) % searchState.totalMatches;
    locateMatch(prevIdx);
  };

  const handleReplace = () => {
    if (!searchState.query || searchState.totalMatches === 0) return;
    try {
      const flags = searchState.matchCase ? '' : 'i';
      const regex = searchState.useRegex
        ? new RegExp(searchState.query, flags)
        : new RegExp(searchState.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      const newContent = activeFile.content.replace(regex, searchState.replaceText);
      updateActiveContent(newContent);
    } catch {
      // Regex parse error safety
    }
  };

  const handleReplaceAll = () => {
    if (!searchState.query || searchState.totalMatches === 0) return;
    try {
      const flags = searchState.matchCase ? 'g' : 'gi';
      const regex = searchState.useRegex
        ? new RegExp(searchState.query, flags)
        : new RegExp(searchState.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      const newContent = activeFile.content.replace(regex, searchState.replaceText);
      updateActiveContent(newContent);
    } catch {
      // Regex parse error safety
    }
  };

  return (
    <div
      className="h-[100dvh] w-full flex flex-col overflow-hidden select-none"
      style={{
        backgroundColor: activeTheme.bg,
        color: activeTheme.text,
        ['--selection-bg' as any]: activeTheme.isDark ? 'rgba(96, 165, 250, 0.40)' : 'rgba(37, 99, 235, 0.35)',
        ['--selection-text' as any]: 'inherit'
      }}
    >
      {/* Header Bar */}
      <header
        className="flex h-12 sm:h-13 w-full items-center justify-between border-b px-2.5 sm:px-3 transition-colors shrink-0 z-20"
        style={{
          backgroundColor: activeTheme.headerBg,
          borderColor: activeTheme.surfaceBorder
        }}
      >
        {/* Left: Drawer Trigger + Brand */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all active:scale-95 shrink-0"
            style={{
              backgroundColor: activeTheme.surface,
              color: activeTheme.text
            }}
            title="Open File Explorer"
          >
            <Menu className="h-4 w-4" />
          </button>

          <span
            className="font-bitter font-bold text-base tracking-tight leading-none shrink-0 select-none"
            style={{ color: activeTheme.text }}
          >
            Pluscript
          </span>
        </div>

        {/* Right: Actions (Search, Snippets, Settings, Save, Run/Preview) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={() =>
              setSearchState((prev) => ({ ...prev, isOpen: !prev.isOpen }))
            }
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all active:scale-95 shrink-0 ${
              searchState.isOpen ? 'bg-white text-black' : ''
            }`}
            style={{
              backgroundColor: searchState.isOpen ? activeTheme.accent : activeTheme.surface,
              borderColor: activeTheme.surfaceBorder,
              color: searchState.isOpen ? activeTheme.accentText : activeTheme.text
            }}
            title="Find & Replace"
          >
            <Search className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setIsSnippetsOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-all active:scale-95 shrink-0"
            style={{
              backgroundColor: activeTheme.surface,
              borderColor: activeTheme.surfaceBorder,
              color: activeTheme.text
            }}
            title="Insert Snippets"
          >
            <Code className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-all active:scale-95 shrink-0"
            style={{
              backgroundColor: activeTheme.surface,
              borderColor: activeTheme.surfaceBorder,
              color: activeTheme.text
            }}
            title="Preferences"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>

          {/* GitHub Integration Button */}
          <button
            onClick={() => {
              setIsGitHubOpen(true);
              setHasGitHubToken(Boolean(localStorage.getItem('pluscript_github_token')));
            }}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border transition-all active:scale-95 shrink-0"
            style={{
              backgroundColor: activeTheme.surface,
              borderColor: hasGitHubToken ? 'rgba(56, 189, 248, 0.4)' : activeTheme.surfaceBorder,
              color: hasGitHubToken ? '#38bdf8' : activeTheme.text
            }}
            title={hasGitHubToken ? "GitHub Connected (Repositories)" : "Connect to GitHub"}
          >
            <Github className="h-3.5 w-3.5" />
            {hasGitHubToken && (
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 ring-1 ring-black" />
            )}
          </button>

          {/* Install Pluscript Button */}
          {!isInstalled && (
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 text-xs font-semibold shadow-sm transition-all active:scale-95 shrink-0 hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.4) 0%, rgba(26, 27, 34, 0.9) 100%)',
                borderColor: 'rgba(168, 85, 247, 0.35)',
                color: '#d8b4fe'
              }}
              title="Install Pluscript shortcut & offline access"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          {/* Commit to GitHub Button (when editing a GitHub file) */}
          {activeFile.github && (
            <button
              onClick={() => setIsCommitModalOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2 sm:px-2.5 text-xs font-bold shadow-md transition-all active:scale-95 shrink-0 bg-[#238636] hover:bg-[#2ea043] text-white"
              title={`Commit and push changes to ${activeFile.github.owner}/${activeFile.github.repo}`}
            >
              <GitCommit className="h-3.5 w-3.5" />
              <span>Commit</span>
            </button>
          )}

          {/* Save Button */}
          <button
            onClick={handleSaveFile}
            className="flex h-8 items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 text-xs font-semibold shadow-sm transition-all active:scale-95 shrink-0"
            style={{
              backgroundColor: activeTheme.surface,
              borderColor: activeTheme.surfaceBorder,
              color: activeFile.content !== (activeFile.savedContent ?? activeFile.content) ? '#f59e0b' : activeTheme.text
            }}
            title={autoSave ? "Save · Auto-save is active" : "Save file"}
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Save</span>
            {activeFile.content !== (activeFile.savedContent ?? activeFile.content) && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
            )}
          </button>

          {/* Primary Action Button: Preview for Markdown/HTML/XML, Run for executable scripts */}
          {activeFile.language === 'markdown' || activeFile.language === 'html' || activeFile.language === 'xml' ? (
            <button
              onClick={handleRunScript}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs font-bold shadow-md transition-all active:scale-95 shrink-0"
              style={{
                backgroundColor: activeTheme.accent,
                color: activeTheme.accentText
              }}
              title="Preview Rendered Output"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview</span>
            </button>
          ) : (
            <button
              onClick={handleRunScript}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs font-bold shadow-md transition-all active:scale-95 shrink-0"
              style={{
                backgroundColor: activeTheme.accent,
                color: activeTheme.accentText
              }}
              title="Run script"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Run</span>
            </button>
          )}
        </div>
      </header>

        {/* Multi-Tab File Bar (Horizontal scrollable) */}
        <div
          className="flex h-10 w-full items-center border-b px-2 gap-1 overflow-x-auto no-scrollbar shrink-0 select-none"
          style={{
            backgroundColor: activeTheme.surface,
            borderColor: activeTheme.surfaceBorder
          }}
        >
          {openFileIds.map((id) => {
            const file = files.find((f) => f.id === id);
            if (!file) return null;
            const isActive = file.id === activeFileId;

            return (
              <div
                key={file.id}
                onClick={() => handleSelectTab(file.id)}
                className={`flex h-7 items-center gap-1.5 rounded-lg px-2 sm:px-2.5 text-xs cursor-pointer transition-all border shrink-0 ${
                  isActive ? 'shadow-sm font-semibold' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isActive ? activeTheme.bg : 'transparent',
                  borderColor: isActive ? activeTheme.surfaceBorder : 'transparent',
                  color: isActive ? activeTheme.text : activeTheme.textMuted
                }}
              >
                {file.github && (
                  <Github className="h-3 w-3 text-sky-400 shrink-0" />
                )}

                <span className="font-mono text-[11px] truncate max-w-[80px] sm:max-w-[120px]">
                  {file.name}
                </span>

                {file.isDirty && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                )}

                {openFileIds.length > 1 && (
                  <button
                    onClick={(e) => handleCloseTab(file.id, e)}
                    className="p-0.5 rounded hover:bg-white/10 opacity-60 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={() => {
              const lang: SupportedLanguage = 'javascript';
              const name = `script_${files.length + 1}.js`;
              handleCreateFile(name, lang);
            }}
            title="New File Tab"
            className="flex h-7 w-7 items-center justify-center rounded-lg border transition-all active:scale-95 shrink-0 opacity-70 hover:opacity-100"
            style={{
              borderColor: activeTheme.surfaceBorder,
              color: activeTheme.text
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Search & Replace Sheet */}
        <SearchReplaceBar
          theme={activeTheme}
          searchState={searchState}
          onUpdateSearch={handleUpdateSearch}
          onLocate={handleLocate}
          onFindNext={handleFindNext}
          onFindPrev={handleFindPrev}
          onReplace={handleReplace}
          onReplaceAll={handleReplaceAll}
          onClose={() => setSearchState((prev) => ({ ...prev, isOpen: false }))}
        />

        {/* Central Editor Canvas */}
        <div className="relative flex-1 flex flex-col overflow-hidden">
          <EditorArea
            content={activeFile.content}
            savedContent={activeFile.savedContent}
            originalContent={activeFile.originalContent}
            language={activeFile.language}
            theme={activeTheme}
            fontSize={fontSize}
            wordWrap={wordWrap}
            smartIndent={smartIndent}
            onChange={updateActiveContent}
            textareaRef={textareaRef}
            cursorPos={cursorPos}
            setCursorPos={setCursorPos}
            searchState={searchState}
          />
        </div>

        {/* Execution Output Console Bottom Sheet */}
        <ConsoleOutput
          isOpen={isConsoleOpen}
          onClose={() => setIsConsoleOpen(false)}
          result={executionResult}
          onClear={() =>
            setExecutionResult({ logs: [], durationMs: 0, status: 'idle' })
          }
          onRunAgain={handleRunScript}
          language={activeFile.language}
          theme={activeTheme}
        />

        {/* Mobile Accessory Symbol Bar */}
        <AccessoryBar
          theme={activeTheme}
          onInsertSymbol={handleInsertSymbol}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onIndent={handleIndent}
          onOutdent={handleOutdent}
          onToggleComment={handleToggleComment}
          onMoveCursor={handleMoveCursor}
        />

        {/* Bottom Editor Telemetry Bar */}
        <div
          className="flex h-7 w-full items-center justify-between border-t text-[10px] font-mono select-none shrink-0"
          style={{
            backgroundColor: activeTheme.headerBg,
            borderColor: activeTheme.surfaceBorder,
            color: activeTheme.textMuted,
            paddingLeft: 'max(1rem, env(safe-area-inset-left, 1rem))',
            paddingRight: 'max(1rem, env(safe-area-inset-right, 1rem))'
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="tabular-nums whitespace-nowrap">
              Ln <strong style={{ color: activeTheme.text }}>{cursorPos.line}</strong>, Col <strong style={{ color: activeTheme.text }}>{cursorPos.col}</strong>
            </span>
            <span className="opacity-40">·</span>
            <span className="tabular-nums whitespace-nowrap">{activeFile.content.split('\n').length} lines</span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0 shrink-0">
            <select
              value={activeFile.language}
              onChange={(e) => handleChangeLanguage(e.target.value as SupportedLanguage)}
              className="bg-transparent border-0 text-[10px] font-mono capitalize cursor-pointer focus:outline-none max-w-[120px] sm:max-w-none truncate"
              style={{ color: activeTheme.text }}
              title="Change active language syntax"
            >
              <optgroup label="Web & Markup" style={{ backgroundColor: activeTheme.surface, color: activeTheme.textMuted }}>
                <option value="javascript" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>JavaScript (.js)</option>
                <option value="typescript" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>TypeScript (.ts)</option>
                <option value="markdown" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>Markdown (.md)</option>
                <option value="xml" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>XML / Markup (.xml)</option>
                <option value="html" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>HTML5 (.html)</option>
                <option value="css" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>CSS (.css)</option>
                <option value="json" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>JSON (.json)</option>
                <option value="yaml" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>YAML (.yaml)</option>
              </optgroup>
              <optgroup label="Languages" style={{ backgroundColor: activeTheme.surface, color: activeTheme.textMuted }}>
                <option value="python" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>Python (.py)</option>
                <option value="rust" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>Rust (.rs)</option>
                <option value="go" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>Go (.go)</option>
                <option value="c" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>C (.c)</option>
                <option value="cpp" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>C++ (.cpp)</option>
                <option value="csharp" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>C# (.cs)</option>
                <option value="java" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>Java (.java)</option>
                <option value="php" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>PHP (.php)</option>
                <option value="ruby" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>Ruby (.rb)</option>
                <option value="lua" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>Lua (.lua)</option>
                <option value="bash" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>Bash Shell (.sh)</option>
                <option value="sql" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>SQL (.sql)</option>
              </optgroup>
              <optgroup label="Config & Text" style={{ backgroundColor: activeTheme.surface, color: activeTheme.textMuted }}>
                <option value="ini" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>INI / Conf (.ini)</option>
                <option value="plaintext" style={{ backgroundColor: activeTheme.surface, color: activeTheme.text }}>Plain Text (.txt)</option>
              </optgroup>
            </select>
            <span className="opacity-40">·</span>
            <span>UTF-8</span>
            {isConsoleOpen && (
              <button
                onClick={() => setIsConsoleOpen(false)}
                className="ml-1 font-semibold hover:opacity-80 transition-opacity"
                style={{ color: activeTheme.text }}
              >
                [Hide]
              </button>
            )}
          </div>
        </div>

      {/* Slide-out Navigation Drawer */}
      <FileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        files={files}
        activeFileId={activeFileId}
        onSelectFile={handleSelectTab}
        onCreateFile={handleCreateFile}
        onRenameFile={handleRenameFile}
        onReloadFile={handleReloadFile}
        onDeleteFile={handleDeleteFile}
        onExportFile={handleExportFile}
        onImportFile={handleImportFile}
        onOpenGitHub={() => setIsGitHubOpen(true)}
        theme={activeTheme}
      />

      {/* GitHub Integration Modal */}
      <GitHubModal
        isOpen={isGitHubOpen}
        onClose={() => setIsGitHubOpen(false)}
        theme={activeTheme}
        onOpenFileFromGitHub={handleOpenFileFromGitHub}
      />

      {/* GitHub Commit & Push Modal */}
      <CommitModal
        isOpen={isCommitModalOpen}
        onClose={() => setIsCommitModalOpen(false)}
        file={activeFile}
        theme={activeTheme}
        onSuccess={handleCommitSuccess}
      />

      {/* Snippets Modal */}
      <SnippetsModal
        isOpen={isSnippetsOpen}
        onClose={() => setIsSnippetsOpen(false)}
        onInsert={(code) => handleInsertSymbol('\n' + code + '\n')}
        currentLanguage={activeFile.language}
        theme={activeTheme}
      />

      {/* Settings & Themes Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeThemeId={themeId}
        onSelectTheme={handleSelectTheme}
        fontSize={fontSize}
        onChangeFontSize={handleChangeFontSize}
        wordWrap={wordWrap}
        onToggleWordWrap={handleToggleWordWrap}
        autoSave={autoSave}
        onToggleAutoSave={handleToggleAutoSave}
        smartIndent={smartIndent}
        onToggleSmartIndent={handleToggleSmartIndent}
        currentTheme={activeTheme}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        isInstalled={isInstalled}
      />

      {/* PWA Install Modal */}
      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        isIOS={isIOS}
        onInstall={triggerInstall}
        theme={activeTheme}
      />
    </div>
  );
}
