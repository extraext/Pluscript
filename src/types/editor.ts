/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SupportedLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'markdown'
  | 'xml'
  | 'html'
  | 'css'
  | 'json'
  | 'yaml'
  | 'sql'
  | 'bash'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'java'
  | 'rust'
  | 'go'
  | 'php'
  | 'ruby'
  | 'lua'
  | 'ini'
  | 'plaintext';

export interface GitHubFileMetadata {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  sha?: string;
  htmlUrl?: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  total_private_repos?: number;
  html_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  updated_at: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface ScriptFile {
  id: string;
  name: string;
  content: string;
  savedContent?: string;
  originalContent?: string;
  language: SupportedLanguage;
  lastModified: number;
  isDirty?: boolean;
  github?: GitHubFileMetadata;
}

export type ThemeId = 'graphite' | 'notepadClassic' | 'monokai' | 'nord' | 'oled' | 'amber';

export interface EditorTheme {
  id: ThemeId;
  name: string;
  description: string;
  isDark: boolean;
  bg: string;
  surface: string;
  surfaceBorder: string;
  headerBg: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  gutterBg: string;
  gutterText: string;
  currentLineBg: string;
  selectionBg: string;
  syntax: {
    keyword: string;
    string: string;
    comment: string;
    number: string;
    function: string;
    operator: string;
    variable: string;
    tag: string;
    boolean: string;
  };
}

export interface GeneratedImage {
  id: string;
  name: string;
  dataUrl: string;
  format: string;
  sizeBytes?: number;
}

export interface ExecutionLog {
  type: 'stdout' | 'stderr' | 'info' | 'result' | 'image';
  text: string;
  time: string;
  imageData?: GeneratedImage;
}

export interface ExecutionResult {
  logs: ExecutionLog[];
  durationMs: number;
  status: 'idle' | 'running' | 'success' | 'error';
  returnValue?: string;
  htmlPreview?: string;
  generatedImages?: GeneratedImage[];
}

export interface SearchState {
  isOpen: boolean;
  query: string;
  replaceText: string;
  matchCase: boolean;
  useRegex: boolean;
  currentMatchIndex: number;
  totalMatches: number;
}
