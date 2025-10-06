import { runAppleScript } from "@raycast/utils";

const GET_OPEN_TABS_SCRIPT = `
tell application "Google Chrome"
    set tabURLs to {}
    repeat with w in every window
        repeat with t in every tab of w
            set end of tabURLs to URL of t
        end repeat
    end repeat
    return tabURLs
end tell
`;

export const getOpenTabs = async (): Promise<string> => {
  const result = await runAppleScript(GET_OPEN_TABS_SCRIPT);
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

  // Build AppleScript dynamically with URLs
  const script = `
tell application "Google Chrome"
    activate
    ${
      inNewWindow
        ? `
    -- Create a new window with the first URL
    make new window
    set URL of active tab of front window to "${urls[0].replace(/"/g, '\\"')}"
    
    -- Add remaining URLs as new tabs
    ${urls
      .slice(1)
      .map(
        (url) => `
    make new tab at end of tabs of front window with properties {URL:"${url.replace(/"/g, '\\"')}"}`,
      )
      .join("")}
    `
        : `
    -- Open URLs in the current window
    ${urls
      .map(
        (url) => `
    make new tab at end of tabs of front window with properties {URL:"${url.replace(/"/g, '\\"')}"}`,
      )
      .join("")}
    `
    }
end tell
  `.trim();

  await runAppleScript(script);
};
