/**
 * Open Snapshot Command
 * Select and restore a saved state snapshot
 */
import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getAllStatesArray } from "./utils/store-snapshot";
import { StateSnapshot } from "./utils/types";
import * as Browser from "./apps/browser";
import { restoreTerminalSessions } from "./apps/terminal";
import { openClosedApps } from "./apps/open-apps";

export default function Command() {
  const [snapshots, setSnapshots] = useState<StateSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSnapshots() {
      try {
        const states = await getAllStatesArray();
        setSnapshots(states);
      } catch (error) {
        console.error("Error loading snapshots:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSnapshots();
  }, []);

  async function handleOpenSnapshot(snapshot: StateSnapshot, inNewWindow = true) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Restoring snapshot...",
    });

    try {
      const restored: string[] = [];

      // Open apps first (Obsidian, Spotify, Slack, etc.)
      if (snapshot.apps && snapshot.apps.length > 0) {
        toast.title = "Opening apps...";
        const openedApps = await openClosedApps(snapshot.apps);
        if (openedApps.length > 0) {
          restored.push(`${openedApps.length} apps`);
        }
      }

      // Browser restoration map
      const browsers = [
        { key: "chrome" as const, appName: Browser.BROWSERS.CHROME, displayName: "Chrome" },
        { key: "arc" as const, appName: Browser.BROWSERS.ARC, displayName: "Arc" },
        { key: "brave" as const, appName: Browser.BROWSERS.BRAVE, displayName: "Brave" },
        { key: "safari" as const, appName: Browser.BROWSERS.SAFARI, displayName: "Safari" },
      ];

      for (const browser of browsers) {
        const browserData = snapshot[browser.key];
        if (browserData && browserData.urls.length > 0) {
          toast.title = `Restoring ${browser.displayName} tabs...`;
          await Browser.reOpenTabs(browser.appName, browserData.urls, inNewWindow);
          restored.push(`${browserData.urls.length} ${browser.displayName} tabs`);
        }
      }

      // Terminal restoration map
      const terminals = [
        { key: "terminal" as const, appName: "Terminal" as const, displayName: "Terminal" },
        { key: "iterm2" as const, appName: "iTerm2" as const, displayName: "iTerm2" },
        { key: "ghostty" as const, appName: "ghostty" as const, displayName: "Ghostty" },
      ];

      for (const terminal of terminals) {
        const terminalData = snapshot[terminal.key];
        if (terminalData && terminalData.sessions.length > 0) {
          toast.title = `Restoring ${terminal.displayName} sessions...`;
          await restoreTerminalSessions(terminalData.sessions, terminal.appName, inNewWindow);
          restored.push(`${terminalData.sessions.length} ${terminal.displayName}`);
        }
      }

      if (restored.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "Nothing to restore";
        toast.message = "This snapshot has no data";
        return;
      }

      toast.style = Toast.Style.Success;
      toast.title = "Snapshot restored!";
      toast.message = restored.join(" • ");
    } catch (error) {
      console.error("Error restoring snapshot:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to restore snapshot";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search snapshots...">
      {snapshots.map((snapshot) => {
        const totalTabs =
          (snapshot.chrome?.tabCount || 0) +
          (snapshot.arc?.tabCount || 0) +
          (snapshot.brave?.tabCount || 0) +
          (snapshot.safari?.tabCount || 0);
        const totalTerminals =
          (snapshot.terminal?.sessionCount || 0) +
          (snapshot.iterm2?.sessionCount || 0) +
          (snapshot.ghostty?.sessionCount || 0);

        return (
          <List.Item
            key={snapshot.id}
            icon={Icon.AppWindow}
            title={snapshot.name}
            subtitle={`${snapshot.apps?.length || 0} apps • ${totalTabs} tabs • ${totalTerminals} terminal sessions`}
            accessories={[{ text: snapshot.date }]}
            actions={
              <ActionPanel>
                <Action
                  title="Open in New Window"
                  icon={Icon.PlusSquare}
                  onAction={() => handleOpenSnapshot(snapshot, true)}
                />
                <Action
                  title="Open in Current Window"
                  icon={Icon.AppWindow}
                  onAction={() => handleOpenSnapshot(snapshot, false)}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.CopyToClipboard
                  title="Copy URLs"
                  content={
                    [
                      ...(snapshot.chrome?.urls || []),
                      ...(snapshot.arc?.urls || []),
                      ...(snapshot.brave?.urls || []),
                      ...(snapshot.safari?.urls || []),
                    ].join("\n") || ""
                  }
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
