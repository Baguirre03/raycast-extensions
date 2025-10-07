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
import { StateSnapshot } from "./utils/types";

function EditSnapshotForm({ snapshot, onUpdate }: { snapshot: StateSnapshot; onUpdate: () => void }) {
  const { pop } = useNavigation();
  const [jsonText, setJsonText] = useState(JSON.stringify(snapshot, null, 2));
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating snapshot...",
    });

    try {
      // Parse and validate JSON
      const parsed = JSON.parse(jsonText) as StateSnapshot;

      if (!parsed.name?.trim()) {
        throw new Error("Name cannot be empty");
      }

      // Preserve id, timestamp, and date from original
      const updates = {
        ...parsed,
        id: snapshot.id,
        timestamp: snapshot.timestamp,
        date: snapshot.date,
      };

      if (updates.chrome) {
        updates.chrome.tabCount = updates.chrome.urls?.length || 0;
      }
      if (updates.arc) {
        updates.arc.tabCount = updates.arc.urls?.length || 0;
      }
      if (updates.brave) {
        updates.brave.tabCount = updates.brave.urls?.length || 0;
      }
      if (updates.safari) {
        updates.safari.tabCount = updates.safari.urls?.length || 0;
      }

      // Update counts for terminals
      if (updates.terminal) {
        updates.terminal.sessionCount = updates.terminal.sessions?.length || 0;
      }
      if (updates.iterm2) {
        updates.iterm2.sessionCount = updates.iterm2.sessions?.length || 0;
      }
      if (updates.ghostty) {
        updates.ghostty.sessionCount = updates.ghostty.sessions?.length || 0;
      }

      await updateStateSnapshot(snapshot.id, updates);
      toast.style = Toast.Style.Success;
      toast.title = "Snapshot updated!";
      setError(undefined);
      onUpdate();
      pop();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid JSON";
      setError(errorMessage);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update snapshot";
      toast.message = errorMessage;
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
          <Action
            title="Reset to Original"
            icon={Icon.Undo}
            onAction={() => {
              setJsonText(JSON.stringify(snapshot, null, 2));
              setError(undefined);
            }}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Instructions"
        text="Edit the JSON directly. ID, timestamp, and date cannot be changed."
      />
      {error && <Form.Description title="Error" text={error} />}
      <Form.TextArea
        id="json"
        title="Snapshot JSON"
        value={jsonText}
        onChange={(value) => {
          setJsonText(value);
          setError(undefined);
        }}
        placeholder="Enter valid JSON"
        enableMarkdown={false}
      />
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

    // Apps
    if (snapshot.apps && snapshot.apps.length > 0) {
      sections.push(`## Apps (${snapshot.apps.length})`);
      sections.push("");
      sections.push(snapshot.apps.map((app, i) => `${i + 1}. ${app}`).join("\n"));
      sections.push("");
    }

    // Browsers
    const browsers = [
      { key: "chrome" as const, displayName: "Chrome" },
      { key: "arc" as const, displayName: "Arc" },
      { key: "brave" as const, displayName: "Brave" },
      { key: "safari" as const, displayName: "Safari" },
    ];

    for (const browser of browsers) {
      const browserData = snapshot[browser.key];
      if (browserData && browserData.urls.length > 0) {
        sections.push(`## ${browser.displayName}`);
        sections.push("");
        sections.push(browserData.urls.map((url, i) => `${i + 1}. ${url}`).join("\n"));
        sections.push("");
      }
    }

    // Terminals
    const terminals = [
      { key: "terminal" as const, displayName: "Terminal" },
      { key: "iterm2" as const, displayName: "iTerm2" },
      { key: "ghostty" as const, displayName: "Ghostty" },
    ];

    for (const terminal of terminals) {
      const terminalData = snapshot[terminal.key];
      if (terminalData && terminalData.sessions.length > 0) {
        sections.push(`## ${terminal.displayName}`);
        sections.push("");
        sections.push(terminalData.sessions.map((s, i) => `${i + 1}. ${s.directory}`).join("\n"));
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

  // Separate favorites from non-favorites
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
