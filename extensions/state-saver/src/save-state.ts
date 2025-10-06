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
    let sessions: TerminalSession[] = [];
    const openApps = await getOpenApps();
    console.log("Open apps:", openApps);

    if (openApps.includes(OpenApps.Chrome)) {
      // Capture Chrome tabs
      toast.title = "Capturing Chrome tabs...";
      const openTabsString = await getOpenTabs();
      urls = openTabsString.split(", ").filter((url) => url.trim().length > 0);
    }

    if (openApps.includes(OpenApps.Terminal)) {
      toast.title = "Capturing Terminal sessions...";
      const openSessionsString = await getTerminalSessions("Terminal");
      sessions = parseTerminalSessions(openSessionsString);
    }

    // Save the snapshot
    toast.title = "Saving snapshot...";
    await saveStateSnapshot({
      name: `Snapshot ${Date.now()}`,
      chrome: {
        urls,
        tabCount: urls.length,
      },
      terminal: {
        sessions,
        sessionCount: sessions.length,
      },
    });
  } catch (error) {
    console.error("Error saving state:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save snapshot";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}
