/**
 * Save State Command
 * Captures Chrome tabs and saves them to LocalStorage
 */
import { showToast, Toast } from "@raycast/api";
import { getOpenTabs } from "./apps/chrome";
import { OpenApps } from "./consts";
import { getOpenApps } from "./utils/get-open-apps";
import { saveStateSnapshot } from "./utils/store-state";
import { getTerminalSessions, parseTerminalSessions, TerminalSession } from "./apps/terminal";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Checking for Chrome...",
  });

  try {
    let urls: string[] = [];
    let terminalSessions: TerminalSession[] = [];
    let iterm2Sessions: TerminalSession[] = [];
    let ghosttySessions: TerminalSession[] = [];
    const openApps = await getOpenApps();
    console.log("Open apps:", openApps);

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
      // Capture Chrome tabs
      toast.title = "Capturing Chrome tabs...";
      const openTabsString = await getOpenTabs();
      urls = openTabsString.split(", ").filter((url) => url.trim().length > 0);
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
      chrome: urls.length > 0 ? { urls, tabCount: urls.length } : undefined,
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
