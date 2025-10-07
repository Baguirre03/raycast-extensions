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
    let chromeUrls: string[] = [];
    let arcUrls: string[] = [];
    let braveUrls: string[] = [];
    let safariUrls: string[] = [];
    let terminalSessions: TerminalSession[] = [];
    let iterm2Sessions: TerminalSession[] = [];
    let ghosttySessions: TerminalSession[] = [];
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

    if (openApps.includes(OpenApps.Chrome)) {
      toast.title = "Capturing Chrome tabs...";
      const openTabsString = await Browser.getOpenTabs(Browser.BROWSERS.CHROME);
      chromeUrls = openTabsString.split(", ").filter((url) => url.trim().length > 0);
    }

    if (openApps.includes(OpenApps.Arc)) {
      toast.title = "Capturing Arc tabs...";
      const openTabsString = await Browser.getOpenTabs(Browser.BROWSERS.ARC);
      arcUrls = openTabsString.split(", ").filter((url) => url.trim().length > 0);
    }

    if (openApps.includes(OpenApps.Brave)) {
      toast.title = "Capturing Brave tabs...";
      const openTabsString = await Browser.getOpenTabs(Browser.BROWSERS.BRAVE);
      braveUrls = openTabsString.split(", ").filter((url) => url.trim().length > 0);
    }

    if (openApps.includes(OpenApps.Safari)) {
      toast.title = "Capturing Safari tabs...";
      const openTabsString = await Browser.getOpenTabs(Browser.BROWSERS.SAFARI);
      safariUrls = openTabsString.split(", ").filter((url) => url.trim().length > 0);
    }

    if (openApps.includes(OpenApps.Terminal)) {
      toast.title = "Capturing Terminal sessions...";
      const openSessionsString = await getTerminalSessions("Terminal");
      terminalSessions = parseTerminalSessions(openSessionsString);
    }

    if (openApps.includes(OpenApps.ITerm)) {
      toast.title = "Capturing iTerm2 sessions...";
      const openSessionsString = await getTerminalSessions("iTerm2");
      iterm2Sessions = parseTerminalSessions(openSessionsString);
    }

    if (openApps.includes(OpenApps.Ghostyy)) {
      toast.title = "Capturing Ghostty sessions...";
      const openSessionsString = await getTerminalSessions("ghostty");
      ghosttySessions = parseTerminalSessions(openSessionsString);
    }

    // Save the snapshot
    toast.title = "Saving snapshot...";
    await saveStateSnapshot({
      name: `Snapshot ${Date.now()}`,
      chrome: chromeUrls.length > 0 ? { urls: chromeUrls, tabCount: chromeUrls.length } : undefined,
      arc: arcUrls.length > 0 ? { urls: arcUrls, tabCount: arcUrls.length } : undefined,
      brave: braveUrls.length > 0 ? { urls: braveUrls, tabCount: braveUrls.length } : undefined,
      safari: safariUrls.length > 0 ? { urls: safariUrls, tabCount: safariUrls.length } : undefined,
      terminal:
        terminalSessions.length > 0 ? { sessions: terminalSessions, sessionCount: terminalSessions.length } : undefined,
      iterm2: iterm2Sessions.length > 0 ? { sessions: iterm2Sessions, sessionCount: iterm2Sessions.length } : undefined,
      ghostty:
        ghosttySessions.length > 0 ? { sessions: ghosttySessions, sessionCount: ghosttySessions.length } : undefined,
      apps: appsToSave,
    });
  } catch (error) {
    console.error("Error saving state:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save snapshot";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}
