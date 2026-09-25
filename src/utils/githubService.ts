/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GitHubUser, GitHubRepo, GitHubTreeItem, SupportedLanguage } from '../types/editor';
import { EXTENSION_TO_LANG } from './defaultFiles';

const GITHUB_TOKEN_KEY = 'pluscript_github_token';

export function getStoredGitHubToken(): string | null {
  return localStorage.getItem(GITHUB_TOKEN_KEY);
}

export function setStoredGitHubToken(token: string): void {
  localStorage.setItem(GITHUB_TOKEN_KEY, token);
}

export function clearStoredGitHubToken(): void {
  localStorage.removeItem(GITHUB_TOKEN_KEY);
}

// UTF-8 safe base64 encode
export function encodeBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// UTF-8 safe base64 decode
export function decodeBase64Utf8(base64: string): string {
  const cleanBase64 = base64.replace(/\s/g, '');
  const binary = atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function githubFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getStoredGitHubToken();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.replace(/^\//, '');
  let res: Response;

  try {
    const url = endpoint.startsWith('http') ? endpoint : `/api/github/${cleanEndpoint}`;
    res = await fetch(url, { ...options, headers });
    if (!res.ok && res.status >= 500 && !endpoint.startsWith('http')) {
      res = await fetch(`https://api.github.com/${cleanEndpoint}`, { ...options, headers });
    }
  } catch {
    if (!endpoint.startsWith('http')) {
      res = await fetch(`https://api.github.com/${cleanEndpoint}`, { ...options, headers });
    } else {
      throw new Error('Network error reaching GitHub');
    }
  }

  if (!res.ok) {
    let errMsg = `GitHub request failed (${res.status})`;
    try {
      const errData = await res.json();
      errMsg = errData.message || errData.error || errMsg;
    } catch {
      // ignore json parse error
    }
    throw new Error(errMsg);
  }

  return res.json();
}

/**
 * Fetch authenticated user profile
 */
export async function fetchGitHubUser(): Promise<GitHubUser> {
  return githubFetch('user');
}

/**
 * Fetch user repositories (both public and private if token has scope)
 */
export async function fetchUserRepos(page = 1, perPage = 100): Promise<GitHubRepo[]> {
  return githubFetch(`user/repos?sort=updated&direction=desc&per_page=${perPage}&page=${page}&affiliation=owner,collaborator,organization_member`);
}

/**
 * Fetch a specific public or private repo
 */
export async function fetchRepo(owner: string, repo: string): Promise<GitHubRepo> {
  return githubFetch(`repos/${owner}/${repo}`);
}

/**
 * Fetch complete repository tree (recursive)
 */
export async function fetchRepoTree(owner: string, repo: string, branch: string): Promise<GitHubTreeItem[]> {
  const data = await githubFetch(`repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  if (!data.tree || !Array.isArray(data.tree)) {
    return [];
  }
  return data.tree;
}

/**
 * Fetch file raw content from GitHub
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<{ content: string; sha: string; htmlUrl?: string }> {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const data = await githubFetch(`repos/${owner}/${repo}/contents/${cleanPath}?ref=${ref}`);

  if (data.type !== 'file') {
    throw new Error(`Path "${path}" is a directory, not a file`);
  }

  let textContent = '';
  if (data.encoding === 'base64' && data.content) {
    textContent = decodeBase64Utf8(data.content);
  } else if (data.download_url) {
    const rawRes = await fetch(data.download_url);
    textContent = await rawRes.text();
  }

  return {
    content: textContent,
    sha: data.sha,
    htmlUrl: data.html_url
  };
}

/**
 * Commit and update or create a file in GitHub
 */
export async function commitFileToGitHub(params: {
  owner: string;
  repo: string;
  path: string;
  content: string;
  message: string;
  branch: string;
  sha?: string;
}): Promise<{ sha: string; commitSha: string; htmlUrl: string }> {
  const { owner, repo, path, content, message, branch, sha } = params;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  const base64Content = encodeBase64Utf8(content);

  const payload: any = {
    message: message || `Update ${cleanPath}`,
    content: base64Content,
    branch: branch || 'main'
  };

  if (sha) {
    payload.sha = sha;
  }

  const res = await githubFetch(`repos/${owner}/${repo}/contents/${cleanPath}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return {
    sha: res.content?.sha || '',
    commitSha: res.commit?.sha || '',
    htmlUrl: res.content?.html_url || ''
  };
}

/**
 * Delete a file in GitHub
 */
export async function deleteFileFromGitHub(params: {
  owner: string;
  repo: string;
  path: string;
  message: string;
  sha: string;
  branch: string;
}): Promise<void> {
  const { owner, repo, path, message, sha, branch } = params;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  await githubFetch(`repos/${owner}/${repo}/contents/${cleanPath}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: message || `Delete ${cleanPath}`,
      sha,
      branch
    })
  });
}

/**
 * Determine supported language from file path
 */
export function getLanguageFromPath(filePath: string): SupportedLanguage {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1];
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (fileName === 'Dockerfile') return 'bash';
  if (fileName === 'Makefile') return 'bash';
  if (ext && EXTENSION_TO_LANG[ext]) {
    return EXTENSION_TO_LANG[ext];
  }
  return 'plaintext';
}
