/**
 * Save State Command
 * Captures browser tabs and saves them to LocalStorage
 */
import { showToast, Toast, launchCommand, LaunchType } from "@raycast/api";
import * as Browser from "./apps/browser";
import { getOpenApps } from "./utils/get-open-apps";
import { saveStateSnapshot } from "./utils/store-snapshot";

enum OpenApps {
  Chrome = "Google Chrome",
  Arc = "Arc",
  Brave = "Brave Browser",
  Safari = "Safari",
}

const createSnapshotName = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `snapshot-${month}/${day}/${year}-${hours}:${minutes}`;
};

// Browser capture map
const browsers = [
  {
    openAppKey: OpenApps.Chrome,
    browserKey: Browser.BROWSERS.CHROME,
    displayName: "Chrome",
    snapshotKey: "chrome" as const,
  },
  { openAppKey: OpenApps.Arc, browserKey: Browser.BROWSERS.ARC, displayName: "Arc", snapshotKey: "arc" as const },
  {
    openAppKey: OpenApps.Brave,
    browserKey: Browser.BROWSERS.BRAVE,
    displayName: "Brave",
    snapshotKey: "brave" as const,
  },
  {
    openAppKey: OpenApps.Safari,
    browserKey: Browser.BROWSERS.SAFARI,
    displayName: "Safari",
    snapshotKey: "safari" as const,
  },
];

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Checking for browsers...",
  });

  try {
    const openApps = await getOpenApps();

    const browserData: Record<
      string,
      { tabs: Array<{ url: string; enabled: boolean }>; tabCount: number } | undefined
    > = {};

    for (const browser of browsers) {
      if (openApps.includes(browser.openAppKey)) {
        toast.title = `Capturing ${browser.displayName} tabs...`;
        const openTabsString = await Browser.getOpenTabs(browser.browserKey);
        const urls = openTabsString.split(", ").filter((url) => url.trim().length > 0);
        if (urls.length > 0) {
          browserData[browser.snapshotKey] = {
            tabs: urls.map((url) => ({ url, enabled: true })),
            tabCount: urls.length,
          };
        }
      }
    }

    // Save the snapshot
    toast.title = "Saving snapshot...";
    const snapshotName = createSnapshotName();

    await saveStateSnapshot({
      name: snapshotName,
      chrome: browserData.chrome,
      arc: browserData.arc,
      brave: browserData.brave,
      safari: browserData.safari,
    });
    toast.style = Toast.Style.Success;
    toast.title = "Snapshot saved!";
    toast.primaryAction = {
      title: "View Snapshot",
      shortcut: { modifiers: ["cmd"], key: "v" },
      onAction: async () => {
        await launchCommand({
          name: "view-snapshots",
          type: LaunchType.UserInitiated,
        });
      },
    };
  } catch (error) {
    console.error("Error saving state:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save snapshot";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}
