/**
 * Type definitions for State Saver
 */

export interface BrowserSnapshot {
  urls: string[];
  windowCount?: number;
  tabCount: number;
}

export interface StateSnapshot {
  id: string;
  name: string;
  timestamp: string;
  date: string;
  favorite?: boolean;
  chrome?: BrowserSnapshot;
  brave?: BrowserSnapshot;
  safari?: BrowserSnapshot;
  arc?: BrowserSnapshot;
}

export interface SavedStates {
  [key: string]: StateSnapshot;
}
