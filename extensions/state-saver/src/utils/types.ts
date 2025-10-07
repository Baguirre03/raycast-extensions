/**
 * Type definitions for State Saver
 */

export interface BrowserSnapshot {
  urls: string[];
  windowCount?: number;
  tabCount: number;
}

export interface TerminalSession {
  directory: string;
  command: string;
}

export interface TerminalSnapshot {
  sessions: TerminalSession[];
  sessionCount: number;
}

export interface StateSnapshot {
  id: string;
  name: string;
  timestamp: string;
  date: string;
  chrome?: BrowserSnapshot;
  brave?: BrowserSnapshot;
  safari?: BrowserSnapshot;
  arc?: BrowserSnapshot;
  terminal?: TerminalSnapshot;
  iterm2?: TerminalSnapshot;
  ghostty?: TerminalSnapshot;
  apps?: string[];
}

export interface SavedStates {
  [key: string]: StateSnapshot;
}
