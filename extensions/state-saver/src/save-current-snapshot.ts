/**
 * Save State Command
 * Captures Chrome and Arc tabs and saves them to LocalStorage
 */
import { showToast, Toast } from "@raycast/api";
import * as Browser from "./apps/browser";
import { getOpenApps } from "./utils/get-open-apps";
import { saveStateSnapshot } from "./utils/store-snapshot";
import { getTerminalSessions, parseTerminalSessions, TerminalSession } from "./apps/terminal";

enum OpenApps {
  Chrome = "Google Chrome",
  Arc = "Arc",
  Finder = "Finder",
  Slack = "Slack",
  Ghostyy = "ghostty",
  Obsidian = "Obsidian",
  Spotify = "Spotify",
  ITerm = "iTerm2",
  Terminal = "Terminal",
  Brave = "Brave Browser",
  Safari = "Safari",
}

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Checking for browsers...",
  });

  try {
    const openApps = await getOpenApps();

    // Filter apps to save (exclude system apps, only save user apps)
    const appsToSave = openApps.filter((app) => {
      return [
        OpenApps.Obsidian,
        OpenApps.Spotify,
        OpenApps.Slack,
        // Add more apps you want to restore
      ].includes(app as OpenApps);
    });

    // Browser capture map
    const browsers = [
      {
        openAppKey: OpenApps.Chrome,
        browserKey: Browser.BROWSERS.CHROME,
        displayName: "Chrome",
        snapshotKey: "chrome" as const,
      },
      { openAppKey: OpenApps.Arc, browserKey: Browser.BROWSERS.ARC, displayName: "Arc", snapshotKey: "arc" as const },
      {
        openAppKey: OpenApps.Brave,
        browserKey: Browser.BROWSERS.BRAVE,
        displayName: "Brave",
        snapshotKey: "brave" as const,
      },
      {
        openAppKey: OpenApps.Safari,
        browserKey: Browser.BROWSERS.SAFARI,
        displayName: "Safari",
        snapshotKey: "safari" as const,
      },
    ];

    const browserData: Record<string, { urls: string[]; tabCount: number } | undefined> = {};

    for (const browser of browsers) {
      if (openApps.includes(browser.openAppKey)) {
        toast.title = `Capturing ${browser.displayName} tabs...`;
        const openTabsString = await Browser.getOpenTabs(browser.browserKey);
        const urls = openTabsString.split(", ").filter((url) => url.trim().length > 0);
        if (urls.length > 0) {
          browserData[browser.snapshotKey] = { urls, tabCount: urls.length };
        }
      }
    }

    // Terminal capture map
    const terminals = [
      {
        openAppKey: OpenApps.Terminal,
        appName: "Terminal" as const,
        displayName: "Terminal",
        snapshotKey: "terminal" as const,
      },
      { openAppKey: OpenApps.ITerm, appName: "iTerm2" as const, displayName: "iTerm2", snapshotKey: "iterm2" as const },
      {
        openAppKey: OpenApps.Ghostyy,
        appName: "ghostty" as const,
        displayName: "Ghostty",
        snapshotKey: "ghostty" as const,
      },
    ];

    const terminalData: Record<string, { sessions: TerminalSession[]; sessionCount: number } | undefined> = {};

    for (const terminal of terminals) {
      if (openApps.includes(terminal.openAppKey)) {
        toast.title = `Capturing ${terminal.displayName} sessions...`;
        const openSessionsString = await getTerminalSessions(terminal.appName);
        const sessions = parseTerminalSessions(openSessionsString);
        if (sessions.length > 0) {
          terminalData[terminal.snapshotKey] = { sessions, sessionCount: sessions.length };
        }
      }
    }

    // Save the snapshot
    toast.title = "Saving snapshot...";
    await saveStateSnapshot({
      name: `Snapshot ${Date.now()}`,
      chrome: browserData.chrome,
      arc: browserData.arc,
      brave: browserData.brave,
      safari: browserData.safari,
      terminal: terminalData.terminal,
      iterm2: terminalData.iterm2,
      ghostty: terminalData.ghostty,
      apps: appsToSave,
    });
  } catch (error) {
    console.error("Error saving state:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save snapshot";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}
