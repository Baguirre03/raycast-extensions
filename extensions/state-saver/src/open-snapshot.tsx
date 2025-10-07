/**
 * Open Snapshot Command
 * Select and restore a saved state snapshot
 */
import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getAllStatesArray } from "./utils/store-snapshot";
import { StateSnapshot } from "./utils/types";
import * as Browser from "./apps/browser";

// Browser restoration map
const browsers = [
  { key: "chrome" as const, appName: Browser.BROWSERS.CHROME, displayName: "Chrome" },
  { key: "arc" as const, appName: Browser.BROWSERS.ARC, displayName: "Arc" },
  { key: "brave" as const, appName: Browser.BROWSERS.BRAVE, displayName: "Brave" },
  { key: "safari" as const, appName: Browser.BROWSERS.SAFARI, displayName: "Safari" },
];

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

      for (const browser of browsers) {
        const browserData = snapshot[browser.key];
        if (browserData && browserData.urls.length > 0) {
          toast.title = `Restoring ${browser.displayName} tabs...`;
          await Browser.reOpenTabs(browser.appName, browserData.urls, inNewWindow);
          restored.push(
            `${browserData.urls.length} ${browser.displayName} tab${browserData.urls.length === 1 ? "" : "s"}`,
          );
        }
      }

      if (restored.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "Nothing to restore";
        toast.message = "This snapshot has no browser tabs";
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

  // Separate favorites from non-favorites
  const favoriteSnapshots = snapshots.filter((s) => s.favorite).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const regularSnapshots = snapshots.filter((s) => !s.favorite).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  function renderSnapshot(snapshot: StateSnapshot) {
    const totalTabs =
      (snapshot.chrome?.tabCount || 0) +
      (snapshot.arc?.tabCount || 0) +
      (snapshot.brave?.tabCount || 0) +
      (snapshot.safari?.tabCount || 0);

    return (
      <List.Item
        key={snapshot.id}
        icon={snapshot.favorite ? Icon.Star : Icon.AppWindow}
        title={snapshot.name}
        subtitle={`${totalTabs} tab${totalTabs === 1 ? "" : "s"}`}
        accessories={[
          ...(snapshot.favorite ? [{ icon: Icon.Star, tooltip: "Favorite" }] : []),
          { text: snapshot.date },
        ]}
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
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search snapshots...">
      {favoriteSnapshots.length > 0 && (
        <List.Section title="Favorites">{favoriteSnapshots.map(renderSnapshot)}</List.Section>
      )}
      {regularSnapshots.length > 0 && (
        <List.Section title={favoriteSnapshots.length > 0 ? "All Snapshots" : undefined}>
          {regularSnapshots.map(renderSnapshot)}
        </List.Section>
      )}
    </List>
  );
}
