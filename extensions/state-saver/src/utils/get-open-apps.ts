import { runAppleScript } from "@raycast/utils";

export const GET_OPEN_APPS_SCRIPT = `tell application "System Events"
        set openApps to name of every process whose background only is false
    end tell
    return openApps
`;

export const getOpenApps = async (): Promise<string[]> => {
  const result = await runAppleScript(GET_OPEN_APPS_SCRIPT);
  return result.split(",").map((app: string) => app.trim());
};
