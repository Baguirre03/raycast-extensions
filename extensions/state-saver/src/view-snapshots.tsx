/**
 * View Snapshots Command
 * Display all saved state snapshots
 */
import { List, ActionPanel, Action, Icon, Form, useNavigation, showToast, Toast, confirmAlert } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getAllStatesArray,
  updateStateSnapshot,
  deleteState,
  toggleFavorite,
  clearAllStates,
} from "./utils/store-snapshot";
import { StateSnapshot, TabItem } from "./utils/types";

interface BrowserTabs {
  chrome: TabItem[];
  arc: TabItem[];
  brave: TabItem[];
  safari: TabItem[];
}

function EditSnapshotForm({ snapshot, onUpdate }: { snapshot: StateSnapshot; onUpdate: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(snapshot.name);
  const [tabs, setTabs] = useState<BrowserTabs>(() => ({
    chrome: snapshot.chrome?.tabs || [],
    arc: snapshot.arc?.tabs || [],
    brave: snapshot.brave?.tabs || [],
    safari: snapshot.safari?.tabs || [],
  }));
  const [newUrls, setNewUrls] = useState({ chrome: "", arc: "", brave: "", safari: "" });

  function toggleTab(browser: keyof BrowserTabs, index: number) {
    setTabs((prev) => ({
      ...prev,
      [browser]: prev[browser].map((tab, i) => (i === index ? { ...tab, enabled: !tab.enabled } : tab)),
    }));
  }

  function addUrl(browser: keyof BrowserTabs) {
    const url = newUrls[browser].trim();
    if (!url) return;

    setTabs((prev) => ({
      ...prev,
      [browser]: [...prev[browser], { url, enabled: true }],
    }));
    setNewUrls((prev) => ({ ...prev, [browser]: "" }));
  }

  async function handleSubmit() {
    // Check if there are any pending URLs to add
    const browsers: Array<keyof BrowserTabs> = ["chrome", "arc", "brave", "safari"];
    const hasPendingUrls = browsers.some((browser) => newUrls[browser].trim());

    // If there are pending URLs, add them to the list instead of saving
    if (hasPendingUrls) {
      for (const browser of browsers) {
        const url = newUrls[browser].trim();
        if (url) {
          addUrl(browser);
        }
      }
      return; // Don't save yet, just add the URLs
    }

    // Otherwise, save the snapshot
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating snapshot...",
    });

    try {
      if (!name.trim()) {
        throw new Error("Name cannot be empty");
      }

      // Build updated snapshot with all tabs (enabled and disabled)
      const updates: StateSnapshot = {
        id: snapshot.id,
        name: name.trim(),
        timestamp: snapshot.timestamp,
        date: snapshot.date,
        favorite: snapshot.favorite,
      };

      for (const browser of browsers) {
        const browserTabs = tabs[browser];
        if (browserTabs.length > 0) {
          const enabledCount = browserTabs.filter((tab) => tab.enabled).length;
          updates[browser] = {
            tabs: browserTabs,
            tabCount: enabledCount,
          };
        }
      }

      await updateStateSnapshot(snapshot.id, updates);
      toast.style = Toast.Style.Success;
      toast.title = "Snapshot updated!";
      onUpdate();
      pop();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update snapshot";
      toast.message = errorMessage;
    }
  }

  const browsers: Array<{ key: keyof BrowserTabs; label: string; icon: Icon }> = [
    { key: "chrome", label: "Chrome", icon: Icon.Globe },
    { key: "arc", label: "Arc", icon: Icon.Globe },
    { key: "brave", label: "Brave", icon: Icon.Globe },
    { key: "safari", label: "Safari", icon: Icon.Globe },
  ];
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Edit your snapshot name and manage tabs. Uncheck tabs to exclude them when restoring." />
      <Form.TextField
        id="name"
        title="Snapshot Name"
        placeholder="Enter snapshot name"
        value={name}
        onChange={setName}
      />
      <Form.Separator />
      {browsers.map((browser) => {
        const browserTabs = tabs[browser.key];
        if (browserTabs.length === 0) {
          return null; // Don't show empty browsers
        }

        return [
          <Form.Description
            key={`${browser.key}-section`}
            title={`${browser.label} Tab ${browserTabs.length === 1 ? "" : "s"}`}
            text=""
          />,
          ...browserTabs.map((tab, index) => (
            <Form.Checkbox
              key={`${browser.key}-${index}`}
              id={`${browser.key}-${index}`}
              label={tab.url}
              value={!tab.enabled}
              onChange={() => toggleTab(browser.key, index)}
              info={`Click to ${tab.enabled ? "disable" : "enable"} this tab`}
            />
          )),
        ];
      })}
    </Form>
  );
}

export default function Command() {
  const [snapshots, setSnapshots] = useState<StateSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadSnapshots() {
    try {
      setIsLoading(true);
      const states = await getAllStatesArray();
      setSnapshots(states);
    } catch (error) {
      console.error("Error loading snapshots:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSnapshots();
  }, []);

  function generateMarkdown(snapshot: StateSnapshot): string {
    const sections: string[] = [];

    // Header
    sections.push(`# ${snapshot.name}`);
    sections.push("");
    sections.push(`**Date:** ${snapshot.date}`);
    sections.push("");

    // Browsers
    const browsers = [
      { key: "chrome" as const, displayName: "Chrome" },
      { key: "arc" as const, displayName: "Arc" },
      { key: "brave" as const, displayName: "Brave" },
      { key: "safari" as const, displayName: "Safari" },
    ];

    for (const browser of browsers) {
      const browserData = snapshot[browser.key];
      if (browserData && browserData.tabs && browserData.tabs.length > 0) {
        sections.push(
          `## ${browser.displayName} (${browserData.tabCount} Enabled ${browserData.tabCount === 1 ? "tab" : "tabs"})`,
        );
        sections.push("");
        sections.push(browserData.tabs.map((tab, i) => `${i + 1}. ${tab.url}`).join("\n"));
        sections.push("");
      }
    }

    // Raw JSON
    sections.push("## Raw JSON");
    sections.push("");
    sections.push("```json");
    sections.push(JSON.stringify(snapshot, null, 2));
    sections.push("```");

    return sections.join("\n");
  }

  async function handleDelete(snapshot: StateSnapshot) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting snapshot...",
    });

    try {
      await deleteState(snapshot.id);
      toast.style = Toast.Style.Success;
      toast.title = "Snapshot deleted!";
      await loadSnapshots();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete snapshot";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  async function handleToggleFavorite(snapshot: StateSnapshot) {
    try {
      await toggleFavorite(snapshot.id);
      await loadSnapshots();
      await showToast({
        style: Toast.Style.Success,
        title: snapshot.favorite ? "Removed from favorites" : "Added to favorites",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update favorite",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleDeleteAll() {
    const confirmed = await confirmAlert({
      title: "Delete All Snapshots?",
      message: `This will permanently delete all ${snapshots.length} snapshot${snapshots.length === 1 ? "" : "s"}. This action cannot be undone.`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete All",
      },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting all snapshots...",
    });

    try {
      await clearAllStates();
      toast.style = Toast.Style.Success;
      toast.title = "All snapshots deleted!";
      await loadSnapshots();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete snapshots";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }
  const favoriteSnapshots = snapshots.filter((s) => s.favorite).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const regularSnapshots = snapshots.filter((s) => !s.favorite).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  function renderSnapshot(snapshot: StateSnapshot) {
    return (
      <List.Item
        key={snapshot.id}
        icon={snapshot.favorite ? Icon.Star : Icon.AppWindow}
        title={snapshot.name}
        accessories={[
          ...(snapshot.favorite ? [{ icon: Icon.Star, tooltip: "Favorite" }] : []),
          { text: snapshot.date },
        ]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Edit Snapshot"
              icon={Icon.Pencil}
              target={<EditSnapshotForm snapshot={snapshot} onUpdate={loadSnapshots} />}
            />
            <Action
              title={snapshot.favorite ? "Remove from Favorites" : "Add to Favorites"}
              icon={snapshot.favorite ? Icon.StarDisabled : Icon.Star}
              onAction={() => handleToggleFavorite(snapshot)}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
            <Action
              title="Delete Snapshot"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => handleDelete(snapshot)}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            <ActionPanel.Section title="Copy">
              <Action.CopyToClipboard title="Copy Snapshot JSON" content={JSON.stringify(snapshot, null, 2)} />
              <Action.CopyToClipboard
                title="Copy Snapshot ID"
                content={snapshot.id}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
            </ActionPanel.Section>
            {snapshots.length > 0 && (
              <ActionPanel.Section title="Danger Zone">
                <Action
                  title="Delete All Snapshots"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={handleDeleteAll}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                />
              </ActionPanel.Section>
            )}
          </ActionPanel>
        }
        detail={<List.Item.Detail markdown={generateMarkdown(snapshot)} />}
      />
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search snapshots...">
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
