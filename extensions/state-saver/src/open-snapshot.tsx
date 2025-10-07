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

      // Restore Chrome tabs
      if (snapshot.chrome && snapshot.chrome.urls.length > 0) {
        toast.title = "Restoring Chrome tabs...";
        await Browser.reOpenTabs(Browser.BROWSERS.CHROME, snapshot.chrome.urls, inNewWindow);
        restored.push(`${snapshot.chrome.urls.length} Chrome tabs`);
      }

      // Restore Arc tabs
      if (snapshot.arc && snapshot.arc.urls.length > 0) {
        toast.title = "Restoring Arc tabs...";
        await Browser.reOpenTabs(Browser.BROWSERS.ARC, snapshot.arc.urls, inNewWindow);
        restored.push(`${snapshot.arc.urls.length} Arc tabs`);
      }

      // Restore Brave tabs
      if (snapshot.brave && snapshot.brave.urls.length > 0) {
        toast.title = "Restoring Brave tabs...";
        await Browser.reOpenTabs(Browser.BROWSERS.BRAVE, snapshot.brave.urls, inNewWindow);
        restored.push(`${snapshot.brave.urls.length} Brave tabs`);
      }

      if (snapshot.safari && snapshot.safari.urls.length > 0) {
        toast.title = "Restoring Safari tabs...";
        await Browser.reOpenTabs(Browser.BROWSERS.SAFARI, snapshot.safari.urls, inNewWindow);
        restored.push(`${snapshot.safari.urls.length} Safari tabs`);
      }

      // Restore Terminal.app sessions
      if (snapshot.terminal && snapshot.terminal.sessions.length > 0) {
        toast.title = "Restoring Terminal sessions...";
        await restoreTerminalSessions(snapshot.terminal.sessions, "Terminal", inNewWindow);
        restored.push(`${snapshot.terminal.sessions.length} Terminal`);
      }

      // Restore iTerm2 sessions
      if (snapshot.iterm2 && snapshot.iterm2.sessions.length > 0) {
        toast.title = "Restoring iTerm2 sessions...";
        await restoreTerminalSessions(snapshot.iterm2.sessions, "iTerm2", inNewWindow);
        restored.push(`${snapshot.iterm2.sessions.length} iTerm2`);
      }

      // Restore Ghostty sessions
      if (snapshot.ghostty && snapshot.ghostty.sessions.length > 0) {
        toast.title = "Restoring Ghostty sessions...";
        await restoreTerminalSessions(snapshot.ghostty.sessions, "ghostty", inNewWindow);
        restored.push(`${snapshot.ghostty.sessions.length} Ghostty`);
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
      {snapshots.map((snapshot) => (
        <List.Item
          key={snapshot.id}
          icon={Icon.AppWindow}
          title={snapshot.name}
          subtitle={`${snapshot.apps?.length || 0} apps • ${(snapshot.chrome?.tabCount || 0) + (snapshot.arc?.tabCount || 0)} tabs • ${(snapshot.terminal?.sessionCount || 0) + (snapshot.iterm2?.sessionCount || 0) + (snapshot.ghostty?.sessionCount || 0)} terminal sessions`}
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
                  [...(snapshot.chrome?.urls || []), ...(snapshot.arc?.urls || [])].join("\n") ||
                  snapshot.terminal?.sessions.join("\n") ||
                  ""
                }
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
