/**
 * Open saved applications
 * Launches apps that were running in a saved snapshot (Obsidian, Spotify, Slack, etc.)
 */

import { runAppleScript } from "@raycast/utils";

export interface AppToOpen {
  name: string;
  bundleIdentifier?: string;
}

/**
 * Open/activate an application by name
 * @param appName - Name of the application to open
 */
export async function openApp(appName: string): Promise<void> {
  const script = `
tell application "${appName}"
    activate
end tell
  `.trim();

  await runAppleScript(script);
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
  const script = `
tell application "System Events"
    return (name of processes) contains "${appName}"
end tell
  `.trim();

  try {
    const result = await runAppleScript(script);
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
