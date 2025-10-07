import { runAppleScript } from "@raycast/utils";
import { GET_BROWSER_OPEN_TABS_SCRIPT, REOPEN_BROWSER_TABS_SCRIPT } from "../utils/scripts";

/**
 * Get open tabs from a browser
 * @param appName - The browser application name (e.g., "Arc", "Google Chrome")
 */
export const getOpenTabs = async (appName: string): Promise<string> => {
  const result = await runAppleScript(GET_BROWSER_OPEN_TABS_SCRIPT({ appName }));
  return result;
};

/**
 * Reopen tabs in a browser
 * @param appName - The browser application name (e.g., "Arc", "Google Chrome")
 * @param urls - Array of URLs to open
 * @param inNewWindow - Whether to open in a new window (default: true)
 */
export const reOpenTabs = async (appName: string, urls: string[], inNewWindow = true): Promise<void> => {
  if (!urls || urls.length === 0) {
    throw new Error("No URLs provided");
  }

  await runAppleScript(REOPEN_BROWSER_TABS_SCRIPT({ appName, urls, inNewWindow }));
};

export const BROWSERS = {
  ARC: "Arc",
  CHROME: "Google Chrome",
  SAFARI: "Safari",
  BRAVE: "Brave Browser",
} as const;
