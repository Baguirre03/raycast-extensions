/**
 * IDE workspace management
 * Handles capturing and restoring open workspaces in code editors (VS Code, Cursor)
 */

import { runAppleScript } from "@raycast/utils";
import { GET_IDE_WORKSPACES_SCRIPT, REOPEN_IDE_WORKSPACES_SCRIPT } from "../utils/scripts";

/**
 * Get open workspaces from an IDE
 * @param appName - The IDE application name (e.g., "Visual Studio Code", "Cursor")
 * @returns Comma-separated string of workspace paths
 */
export const getOpenWorkspaces = async (appName: string): Promise<string> => {
  const result = await runAppleScript(GET_IDE_WORKSPACES_SCRIPT({ appName }));
  return result;
};

/**
 * Reopen workspaces in an IDE
 * @param appName - The IDE application name (e.g., "Visual Studio Code", "Cursor")
 * @param workspaces - Array of workspace paths to open
 * @param inNewWindow - Whether to open in new windows (default: true)
 */
export const reOpenWorkspaces = async (appName: string, workspaces: string[], inNewWindow = true): Promise<void> => {
  if (!workspaces || workspaces.length === 0) {
    throw new Error("No workspaces provided");
  }

  await runAppleScript(REOPEN_IDE_WORKSPACES_SCRIPT({ appName, workspaces, inNewWindow }));
};

export const IDES = {
  VSCODE: "Visual Studio Code",
  CURSOR: "Cursor",
} as const;
