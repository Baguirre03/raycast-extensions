/**
 * Storage utilities for saving and retrieving state snapshots
 * Uses Raycast's LocalStorage API for encrypted local storage
 */

import { LocalStorage } from "@raycast/api";
import { StateSnapshot, SavedStates } from "./types";

const STORAGE_KEY = "saved-states";
/**
 * Generate a unique ID for a snapshot
 */
function generateSnapshotId(): string {
  return `state-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format a date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Save a new state snapshot
 * @param snapshot - The state snapshot to save (without id, will be generated)
 * @returns The saved snapshot with generated ID
 */
export async function saveStateSnapshot(
  snapshot: Omit<StateSnapshot, "id" | "timestamp" | "date">,
): Promise<StateSnapshot> {
  const allStates = await getAllStates();

  const newSnapshot: StateSnapshot = {
    ...snapshot,
    id: generateSnapshotId(),
    timestamp: new Date().toISOString(),
    date: formatDate(new Date()),
  };

  allStates[newSnapshot.id] = newSnapshot;
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(allStates));

  return newSnapshot;
}

/**
 * Get all saved state snapshots
 * @returns Object containing all saved states, keyed by ID
 */
export async function getAllStates(): Promise<SavedStates> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);

  if (!stored) {
    return {};
  }

  try {
    return JSON.parse(stored) as SavedStates;
  } catch (error) {
    console.error("Error parsing saved states:", error);
    return {};
  }
}

/**
 * Get all saved states as an array, sorted by timestamp (newest first)
 * @returns Array of state snapshots
 */
export async function getAllStatesArray(): Promise<StateSnapshot[]> {
  const states = await getAllStates();
  return Object.values(states).sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

/**
 * Get a specific state snapshot by ID
 * @param id - The snapshot ID
 * @returns The state snapshot or undefined if not found
 */
export async function getStateById(id: string): Promise<StateSnapshot | undefined> {
  const allStates = await getAllStates();
  return allStates[id];
}

/**
 * Delete a state snapshot by ID
 * @param id - The snapshot ID to delete
 * @returns True if deleted, false if not found
 */
export async function deleteState(id: string): Promise<boolean> {
  const allStates = await getAllStates();

  if (!allStates[id]) {
    return false;
  }

  delete allStates[id];
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(allStates));

  return true;
}

/**
 * Update a state snapshot's name
 * @param id - The snapshot ID
 * @param newName - The new name for the snapshot
 * @returns True if updated, false if not found
 */
export async function updateStateName(id: string, newName: string): Promise<boolean> {
  const allStates = await getAllStates();

  if (!allStates[id]) {
    return false;
  }

  allStates[id].name = newName;
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(allStates));

  return true;
}

/**
 * Update an entire state snapshot
 * @param id - The snapshot ID
 * @param updates - Partial snapshot data to update (keeps id, timestamp, and date from original)
 * @returns True if updated, false if not found
 */
export async function updateStateSnapshot(
  id: string,
  updates: Partial<Omit<StateSnapshot, "id" | "timestamp" | "date">>,
): Promise<boolean> {
  const allStates = await getAllStates();

  if (!allStates[id]) {
    return false;
  }

  // Merge updates while preserving id, timestamp, and date
  allStates[id] = {
    ...allStates[id],
    ...updates,
    id: allStates[id].id,
    timestamp: allStates[id].timestamp,
    date: allStates[id].date,
  };

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(allStates));

  return true;
}

/**
 * Toggle favorite status of a snapshot
 * @param id - The snapshot ID
 * @returns True if updated, false if not found
 */
export async function toggleFavorite(id: string): Promise<boolean> {
  const allStates = await getAllStates();

  if (!allStates[id]) {
    return false;
  }

  allStates[id].favorite = !allStates[id].favorite;
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(allStates));

  return true;
}

/**
 * Clear all saved states (use with caution!)
 */
export async function clearAllStates(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
