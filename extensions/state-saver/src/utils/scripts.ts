// ============================================================================
// Browser Scripts
// ============================================================================

interface GetBrowserOpenTabsParams {
  appName: string;
}

export const GET_BROWSER_OPEN_TABS_SCRIPT = ({ appName }: GetBrowserOpenTabsParams) => `tell application "${appName}"
    set tabURLs to {}
    repeat with w in every window
        repeat with t in every tab of w
            set end of tabURLs to URL of t
        end repeat
    end repeat
    return tabURLs
end tell`;

interface ReopenBrowserTabsParams {
  appName: string;
  urls: string[];
  inNewWindow: boolean;
}

export const REOPEN_BROWSER_TABS_SCRIPT = ({ appName, urls, inNewWindow }: ReopenBrowserTabsParams) => {
  if (appName === "Safari") {
    return `
tell application "${appName}"
    activate
    ${
      inNewWindow
        ? `
    -- Create a new window with the first URL
    make new document
    set URL of current tab of front window to "${urls[0].replace(/"/g, '\\"')}"
    
    -- Add remaining URLs as new tabs
    ${urls
      .slice(1)
      .map(
        (url) => `
    tell front window
        set current tab to (make new tab)
        set URL of current tab to "${url.replace(/"/g, '\\"')}"
    end tell`,
      )
      .join("")}
    `
        : `
    -- Open URLs in the current window
    ${urls
      .map(
        (url) => `
    tell front window
        set current tab to (make new tab)
        set URL of current tab to "${url.replace(/"/g, '\\"')}"
    end tell`,
      )
      .join("")}
    `
    }
end tell
    `.trim();
  }

  // Chrome, Arc, Brave, etc.
  return `
tell application "${appName}"
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
    tell front window
        make new tab with properties {URL:"${url.replace(/"/g, '\\"')}"}
    end tell`,
      )
      .join("")}
    `
        : `
    -- Open URLs in the current window
    ${urls
      .map(
        (url) => `
    tell front window
        make new tab with properties {URL:"${url.replace(/"/g, '\\"')}"}
    end tell`,
      )
      .join("")}
    `
    }
end tell
  `.trim();
};

// ============================================================================
// Open App Scripts (for checking if browser is running)
// ============================================================================

export const GET_OPEN_APPS_SCRIPT = `tell application "System Events"
        set openApps to name of every process whose background only is false
    end tell
    return openApps
`;
