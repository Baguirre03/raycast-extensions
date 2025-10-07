import { runAppleScript } from "@raycast/utils";
import { GET_OPEN_APPS_SCRIPT } from "./scripts";

export const getOpenApps = async (): Promise<string[]> => {
  const result = await runAppleScript(GET_OPEN_APPS_SCRIPT);
  return result.split(",").map((app: string) => app.trim());
};
