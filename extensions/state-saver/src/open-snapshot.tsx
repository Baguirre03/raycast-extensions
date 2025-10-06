/**
 * Open Snapshot Command
 * Select and restore a saved state snapshot
 */
import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getAllStatesArray } from "./utils/store-state";
import { StateSnapshot } from "./types";
import { reOpenTabs } from "./apps/chrome";
import { restoreTerminalSessions } from "./apps/terminal";

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
      title: "Opening tabs...",
    });

    try {
      if (snapshot.chrome && snapshot.chrome.urls.length > 0) {
        await reOpenTabs(snapshot.chrome.urls, inNewWindow);
        toast.title = "Restored Chrome tabs";
      }
      if (snapshot.terminal && snapshot.terminal.sessions.length > 0) {
        await restoreTerminalSessions(snapshot.terminal.sessions, "Terminal", inNewWindow);
        toast.title = "Restored Terminal sessions";
      }
    } catch (error) {
      console.error("Error restoring tabs:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to restore tabs";
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
          subtitle={`${snapshot.chrome?.tabCount || 0} tabs, ${snapshot.terminal?.sessionCount || 0} sessions`}
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
                content={snapshot.chrome?.urls.join("\n") || snapshot.terminal?.sessions.join("\n") || ""}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
