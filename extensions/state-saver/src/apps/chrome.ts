import { runAppleScript } from "@raycast/utils";
import { GET_CHROME_OPEN_TABS_SCRIPT, REOPEN_CHROME_TABS_SCRIPT } from "../scripts";

export const getOpenTabs = async (): Promise<string> => {
  const result = await runAppleScript(GET_CHROME_OPEN_TABS_SCRIPT);
  return result;
};

/**
 * Reopen tabs in Chrome
 * @param urls - Array of URLs to open
 * @param inNewWindow - Whether to open in a new window (default: true)
 */
export const reOpenTabs = async (urls: string[], inNewWindow = true): Promise<void> => {
  if (!urls || urls.length === 0) {
    throw new Error("No URLs provided");
  }

  await runAppleScript(REOPEN_CHROME_TABS_SCRIPT({ urls, inNewWindow }));
};
