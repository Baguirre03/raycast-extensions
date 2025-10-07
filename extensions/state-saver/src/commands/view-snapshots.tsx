/**
 * View Snapshots Command
 * Display all saved state snapshots
 */
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getAllStatesArray } from "./utils/store-state";
import { StateSnapshot } from "./types";

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

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search snapshots...">
      {snapshots.map((snapshot) => (
        <List.Item
          key={snapshot.id}
          icon={Icon.AppWindow}
          title={snapshot.name}
          subtitle={`${snapshot.chrome?.tabCount || 0} tabs`}
          accessories={[{ text: snapshot.date }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Snapshot JSON" content={JSON.stringify(snapshot, null, 2)} />
              <Action.CopyToClipboard
                title="Copy Snapshot ID"
                content={snapshot.id}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={`# ${snapshot.name}

**Date:** ${snapshot.date}

**ID:** ${snapshot.id}

## Apps (${snapshot.apps?.length || 0})

${snapshot.apps?.map((app, i) => `${i + 1}. ${app}`).join("\n") || "No apps"}

## Chrome Tabs (${snapshot.chrome?.tabCount || 0})

${snapshot.chrome?.urls.map((url, i) => `${i + 1}. ${url}`).join("\n") || "No tabs"}

## Terminal Sessions (${snapshot.terminal?.sessionCount || 0})

${snapshot.terminal?.sessions.map((s, i) => `${i + 1}. ${s.directory}`).join("\n") || "No sessions"}

## iTerm2 Sessions (${snapshot.iterm2?.sessionCount || 0})

${snapshot.iterm2?.sessions.map((s, i) => `${i + 1}. ${s.directory}`).join("\n") || "No sessions"}

## Ghostty Sessions (${snapshot.ghostty?.sessionCount || 0})

${snapshot.ghostty?.sessions.map((s, i) => `${i + 1}. ${s.directory}`).join("\n") || "No sessions"}

## Raw JSON

\`\`\`json
${JSON.stringify(snapshot, null, 2)}
\`\`\``}
            />
          }
        />
      ))}
    </List>
  );
}
