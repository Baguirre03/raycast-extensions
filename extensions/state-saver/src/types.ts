/**
 * Type definitions for State Saver
 */

export interface ChromeSnapshot {
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
  chrome?: ChromeSnapshot;
  terminal?: TerminalSnapshot;
}

export interface SavedStates {
  [key: string]: StateSnapshot;
}
