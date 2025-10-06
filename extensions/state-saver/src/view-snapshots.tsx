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
              markdown={`# ${snapshot.name}\n\n**Date:** ${snapshot.date}\n\n**ID:** ${snapshot.id}\n\n## Chrome Tabs (${snapshot.chrome?.tabCount || 0})\n\n${
                snapshot.chrome?.urls.map((url, i) => `${i + 1}. ${url}`).join("\n") || "No tabs"
              }\n\n## Raw JSON\n\n\`\`\`json\n${JSON.stringify(snapshot, null, 2)}\n\`\`\``}
            />
          }
        />
      ))}
    </List>
  );
}
