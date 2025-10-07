/**
 * Open saved applications
 * Launches apps that were running in a saved snapshot (Obsidian, Spotify, Slack, etc.)
 */

import { runAppleScript } from "@raycast/utils";
import { IS_APP_RUNNING_SCRIPT, OPEN_APP_SCRIPT } from "../scripts";

export interface AppToOpen {
  name: string;
  bundleIdentifier?: string;
}

/**
 * Open/activate an application by name
 * @param appName - Name of the application to open
 */
export async function openApp(appName: string): Promise<void> {
  await runAppleScript(OPEN_APP_SCRIPT({ appName }));
}

/**
 * Open multiple applications
 * @param apps - Array of app names to open
 */
export async function openMultipleApps(apps: string[]): Promise<void> {
  if (!apps || apps.length === 0) {
    throw new Error("No apps provided");
  }

  // Open apps sequentially to avoid overwhelming the system
  for (const appName of apps) {
    try {
      await openApp(appName);
      // Small delay between app launches
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to open ${appName}:`, error);
      // Continue with other apps even if one fails
    }
  }
}

/**
 * Check if an app is already running
 * @param appName - Name of the application
 * @returns True if running, false otherwise
 */
export async function isAppRunning(appName: string): Promise<boolean> {
  try {
    const result = await runAppleScript(IS_APP_RUNNING_SCRIPT({ appName }));
    return result === "true";
  } catch (error) {
    console.error(`Failed to check if ${appName} is running:`, error);
    return false;
  }
}

/**
 * Open apps that are not currently running
 * @param apps - Array of app names
 * @returns Array of apps that were opened
 */
export async function openClosedApps(apps: string[]): Promise<string[]> {
  const openedApps: string[] = [];

  for (const appName of apps) {
    try {
      const running = await isAppRunning(appName);
      if (!running) {
        await openApp(appName);
        openedApps.push(appName);
        // Small delay between launches
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Error checking/opening ${appName}:`, error);
    }
  }

  return openedApps;
}
