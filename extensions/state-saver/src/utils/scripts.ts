import { TerminalSession } from "../apps/terminal";

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
// Open App Scripts
// ============================================================================

export const GET_OPEN_APPS_SCRIPT = `tell application "System Events"
        set openApps to name of every process whose background only is false
    end tell
    return openApps
`;

interface OpenAppParams {
  appName: string;
}

interface IsAppRunningParams {
  appName: string;
}

export const OPEN_APP_SCRIPT = ({ appName }: OpenAppParams) =>
  `tell application "${appName}"
    activate
end tell`.trim();

export const IS_APP_RUNNING_SCRIPT = ({ appName }: IsAppRunningParams) =>
  `tell application "System Events"
    return (name of processes) contains "${appName}"
end tell`.trim();

// ============================================================================
// Terminal and Terminal Emulators Scripts
// Implements: iTerm2, Terminal, Ghostty
// ============================================================================

export const GET_ITERM_SESSIONS_SCRIPT = `
tell application "iTerm"
    set sessionData to {}
    repeat with w in every window
        repeat with t in every tab of w
            repeat with s in every session of t
                tell s
                    set sessionInfo to (variable named "session.path") & "|" & (variable named "session.name")
                    set end of sessionData to sessionInfo
                end tell
            end repeat
        end repeat
    end repeat
    return sessionData
end tell
`;

export const GET_TERMINAL_SESSIONS_SCRIPT = `
do shell script "ps -ax -o pid,ppid,comm | grep -E '/bin/(bash|zsh|sh)$' | while read pid ppid comm; do
    # Check if any ancestor process is Terminal
    current_ppid=$ppid
    is_terminal=false
    
    while [ $current_ppid -gt 1 ]; do
        parent_comm=$(ps -o comm= -p $current_ppid 2>/dev/null)
        if [[ \\"$parent_comm\\" == *Terminal* ]] || [[ \\"$parent_comm\\" == *login* ]]; then
            is_terminal=true
            break
        fi
        current_ppid=$(ps -o ppid= -p $current_ppid 2>/dev/null | tr -d ' ')
        [ -z \\"$current_ppid\\" ] && break
    done
    
    if [ \\"$is_terminal\\" = true ]; then
        shell_name=$(basename $comm)
        dir=$(lsof -a -p $pid -d cwd -Fn 2>/dev/null | grep '^n/' | sed 's/^n//')
        
        if [ -n \\"$dir\\" ]; then
            echo \\"$dir|$shell_name\\"
        fi
    fi
done"
`;

export const GET_GHOSTTY_SESSIONS_SCRIPT = `
do shell script "ps -ax -o pid,ppid,comm | grep -E '/bin/(bash|zsh|sh)$' | while read pid ppid comm; do
    # Check if any ancestor process is ghostty
    current_ppid=$ppid
    is_ghostty=false
    
    while [ $current_ppid -gt 1 ]; do
        parent_comm=$(ps -o comm= -p $current_ppid 2>/dev/null)
        if [[ \\"$parent_comm\\" == *ghostty* ]]; then
            is_ghostty=true
            break
        fi
        current_ppid=$(ps -o ppid= -p $current_ppid 2>/dev/null | tr -d ' ')
        [ -z \\"$current_ppid\\" ] && break
    done
    
    if [ \\"$is_ghostty\\" = true ]; then
        shell_name=$(basename $comm)
        dir=$(lsof -a -p $pid -d cwd -Fn 2>/dev/null | grep '^n/' | sed 's/^n//')
        
        if [ -n \\"$dir\\" ]; then
            echo \\"$dir|$shell_name\\"
        fi
    fi
done"
`;

interface ReopenTerminalSessionsParams {
  sessions: TerminalSession[];
  inNewWindow: boolean;
}

export const REOPEN_ITERM_SESSIONS_SCRIPT = ({ sessions, inNewWindow }: ReopenTerminalSessionsParams) =>
  `
tell application "iTerm"
    activate
    ${
      inNewWindow
        ? `
    create window with default profile
    tell current session of current window
        write text "cd \\"${sessions[0].directory.replace(/"/g, '\\"')}\\""
    end tell
    ${sessions
      .slice(1)
      .map(
        (session) => `
    tell current window
        create tab with default profile
        tell current session
            write text "cd \\"${session.directory.replace(/"/g, '\\"')}\\""
        end tell
    end tell`,
      )
      .join("")}
    `
        : `
    ${sessions
      .map(
        (session) => `
    tell current window
        create tab with default profile
        tell current session
            write text "cd \\"${session.directory.replace(/"/g, '\\"')}\\""
        end tell
    end tell`,
      )
      .join("")}
    `
    }
end tell
  `.trim();

export const REOPEN_TERMINAL_SESSIONS_SCRIPT = ({ sessions, inNewWindow }: ReopenTerminalSessionsParams) =>
  `
tell application "Terminal"
    activate
    ${
      inNewWindow
        ? `
    do script "cd \\"${sessions[0].directory.replace(/"/g, '\\"')}\\""
    ${sessions
      .slice(1)
      .map(
        (session) => `
    do script "cd \\"${session.directory.replace(/"/g, '\\"')}\\"" in window 1`,
      )
      .join("")}
    `
        : `
    ${sessions
      .map(
        (session) => `
    tell window 1
        do script "cd \\"${session.directory.replace(/"/g, '\\"')}\\"" in window 1
    end tell`,
      )
      .join("")}
    `
    }
end tell
  `.trim();

interface ReopenGhostySessionsParams {
  session: TerminalSession;
}

export const REOPEN_GHOSTY_SESSIONS_SCRIPT = ({ session }: ReopenGhostySessionsParams) =>
  `
do shell script "open -n -a ghostty --args --working-directory='${session.directory.replace(/'/g, "'\\''")}'"
    `.trim();
