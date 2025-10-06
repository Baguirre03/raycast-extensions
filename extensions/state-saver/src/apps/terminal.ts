import { runAppleScript } from "@raycast/utils";

// iTerm2 has better AppleScript support for getting current directory
const GET_ITERM_SESSIONS_SCRIPT = `
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

// Terminal.app has limited AppleScript support, so we use shell commands via lsof
// This gets actual directories but loses window/tab context
const GET_TERMINAL_SESSIONS_SCRIPT = `
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

// Ghostty terminal - similar approach to Terminal.app
const GET_GHOSTTY_SESSIONS_SCRIPT = `
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

export interface TerminalSession {
  directory: string;
  command: string;
}

/**
 * Get open terminal sessions from iTerm2
 * @returns Promise with comma-separated session data (directory|command)
 */
export const getOpenITermSessions = async (): Promise<string> => {
  const result = await runAppleScript(GET_ITERM_SESSIONS_SCRIPT);
  return result;
};

/**
 * Get open terminal sessions from Terminal.app
 * Note: Terminal.app has limited AppleScript support, so this is less reliable
 * @returns Promise with comma-separated session data (directory|command)
 */
export const getOpenTerminalSessions = async (): Promise<string> => {
  const result = await runAppleScript(GET_TERMINAL_SESSIONS_SCRIPT);
  console.log("Terminal sessions:", result);
  return result;
};

/**
 * Get open terminal sessions from Ghostty
 * @returns Promise with comma-separated session data (directory|command)
 */
export const getOpenGhostySessions = async (): Promise<string> => {
  const result = await runAppleScript(GET_GHOSTTY_SESSIONS_SCRIPT);
  console.log("Ghostty sessions:", result);
  return result;
};

/**
 * Get terminal sessions from whichever terminal app is running
 * @param appName - Which terminal app to use ("iTerm2", "Terminal", or "ghostty")
 */
export const getTerminalSessions = async (appName: "iTerm2" | "Terminal" | "ghostty"): Promise<string> => {
  if (appName === "iTerm2") {
    return getOpenITermSessions();
  } else if (appName === "ghostty") {
    return getOpenGhostySessions();
  } else {
    return getOpenTerminalSessions();
  }
};

/**
 * Parse terminal session string into structured data
 * @param sessionsString - Comma-separated session data
 * @returns Array of terminal sessions
 */
export function parseTerminalSessions(sessionsString: string): TerminalSession[] {
  if (!sessionsString || sessionsString.trim() === "") {
    return [];
  }

  // AppleScript returns comma-separated values
  const sessions = sessionsString.split(", ");

  return sessions
    .map((session) => {
      const [directory, command] = session.split("|");
      return {
        directory: directory?.trim() || "~",
        command: command?.trim() || "zsh",
      };
    })
    .filter((session) => session.directory !== "");
}

/**
 * Reopen terminal sessions in iTerm2
 * @param sessions - Array of terminal sessions to restore
 * @param inNewWindow - Whether to open in a new window (default: true)
 */
export const reOpenITermSessions = async (sessions: TerminalSession[], inNewWindow = true): Promise<void> => {
  if (!sessions || sessions.length === 0) {
    throw new Error("No terminal sessions provided");
  }

  const script = `
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

  await runAppleScript(script);
};

/**
 * Reopen terminal sessions in Terminal.app
 * @param sessions - Array of terminal sessions to restore
 * @param inNewWindow - Whether to open in a new window (default: true)
 */
export const reOpenTerminalSessions = async (sessions: TerminalSession[], inNewWindow = true): Promise<void> => {
  if (!sessions || sessions.length === 0) {
    throw new Error("No terminal sessions provided");
  }

  const script = `
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

  await runAppleScript(script);
};

/**
 * Reopen terminal sessions in Ghostty
 * Note: Ghostty has limited automation support, so we open it with working directory
 * @param sessions - Array of terminal sessions to restore
 */
export const reOpenGhostySessions = async (sessions: TerminalSession[]): Promise<void> => {
  if (!sessions || sessions.length === 0) {
    throw new Error("No terminal sessions provided");
  }

  // Ghostty supports --working-directory flag
  for (const session of sessions) {
    const script = `
do shell script "open -n -a ghostty --args --working-directory='${session.directory.replace(/'/g, "'\\''")}'"
    `.trim();
    await runAppleScript(script);
    // Small delay between opening sessions
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
};

/**
 * Reopen terminal sessions in the specified terminal app
 * @param sessions - Array of terminal sessions to restore
 * @param appName - Which terminal app to use ("iTerm2", "Terminal", or "ghostty")
 * @param inNewWindow - Whether to open in a new window (default: true)
 */
export const restoreTerminalSessions = async (
  sessions: TerminalSession[],
  appName: "iTerm2" | "Terminal" | "ghostty",
  inNewWindow = true,
): Promise<void> => {
  if (appName === "iTerm2") {
    return reOpenITermSessions(sessions, inNewWindow);
  } else if (appName === "ghostty") {
    return reOpenGhostySessions(sessions);
  } else {
    return reOpenTerminalSessions(sessions, inNewWindow);
  }
};
