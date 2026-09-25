/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EditorTheme } from '../types/editor';

export const THEMES: Record<string, EditorTheme> = {
  graphite: {
    id: 'graphite',
    name: 'Dark Slate',
    description: 'Dark (Default)',
    isDark: true,
    bg: '#14151a',
    surface: '#1e2027',
    surfaceBorder: '#2c2f3a',
    headerBg: '#191b22',
    text: '#ffffff',
    textMuted: '#9ea3b2',
    accent: '#ffffff',
    accentText: '#14151a',
    gutterBg: '#181920',
    gutterText: '#626778',
    currentLineBg: 'rgba(255, 255, 255, 0.04)',
    selectionBg: 'rgba(255, 255, 255, 0.18)',
    syntax: {
      keyword: '#93c5fd',
      string: '#86efac',
      comment: '#64748b',
      number: '#fde047',
      function: '#c084fc',
      operator: '#f472b6',
      variable: '#f8fafc',
      tag: '#38bdf8',
      boolean: '#fb923c'
    }
  },
  notepadClassic: {
    id: 'notepadClassic',
    name: 'Paper Light',
    description: 'Light',
    isDark: false,
    bg: '#ffffff',
    surface: '#f3f4f6',
    surfaceBorder: '#d1d5db',
    headerBg: '#e5e7eb',
    text: '#111827',
    textMuted: '#6b7280',
    accent: '#2563eb',
    accentText: '#ffffff',
    gutterBg: '#f8fafc',
    gutterText: '#94a3b8',
    currentLineBg: '#eef2ff',
    selectionBg: '#c7d2fe',
    syntax: {
      keyword: '#0052cc',
      string: '#b45309',
      comment: '#15803d',
      number: '#d97706',
      function: '#7c3aed',
      operator: '#0f172a',
      variable: '#0f172a',
      tag: '#2563eb',
      boolean: '#dc2626'
    }
  },
  monokai: {
    id: 'monokai',
    name: 'Monokai',
    description: 'Vibrant',
    isDark: true,
    bg: '#272822',
    surface: '#1e1f1c',
    surfaceBorder: '#3e3d32',
    headerBg: '#21221d',
    text: '#f8f8f2',
    textMuted: '#75715e',
    accent: '#a6e22e',
    accentText: '#272822',
    gutterBg: '#23241f',
    gutterText: '#75715e',
    currentLineBg: '#3e3d3255',
    selectionBg: '#49483e',
    syntax: {
      keyword: '#f92672',
      string: '#e6db74',
      comment: '#75715e',
      number: '#ae81ff',
      function: '#a6e22e',
      operator: '#f92672',
      variable: '#66d9ef',
      tag: '#f92672',
      boolean: '#ae81ff'
    }
  },
  nord: {
    id: 'nord',
    name: 'Nord',
    description: 'Arctic blue',
    isDark: true,
    bg: '#2e3440',
    surface: '#3b4252',
    surfaceBorder: '#4c566a',
    headerBg: '#272c36',
    text: '#eceff4',
    textMuted: '#d8dee9',
    accent: '#88c0d0',
    accentText: '#2e3440',
    gutterBg: '#2b303c',
    gutterText: '#4c566a',
    currentLineBg: '#383f4d',
    selectionBg: '#434c5e',
    syntax: {
      keyword: '#81a1c1',
      string: '#a3be8c',
      comment: '#616e88',
      number: '#b48ead',
      function: '#88c0d0',
      operator: '#81a1c1',
      variable: '#eceff4',
      tag: '#81a1c1',
      boolean: '#b48ead'
    }
  },
  oled: {
    id: 'oled',
    name: 'Vivid Black',
    description: 'Vivid Black',
    isDark: true,
    bg: '#000000',
    surface: '#0d0e11',
    surfaceBorder: '#202229',
    headerBg: '#08080a',
    text: '#ffffff',
    textMuted: '#7c8294',
    accent: '#ffffff',
    accentText: '#000000',
    gutterBg: '#050507',
    gutterText: '#4e5466',
    currentLineBg: '#15161b',
    selectionBg: '#2a2d36',
    syntax: {
      keyword: '#60a5fa',
      string: '#4ade80',
      comment: '#52525b',
      number: '#facc15',
      function: '#c084fc',
      operator: '#f43f5e',
      variable: '#f8fafc',
      tag: '#38bdf8',
      boolean: '#fb923c'
    }
  }
};
