import { runAppleScript } from "@raycast/utils";
import {
  GET_ITERM_SESSIONS_SCRIPT,
  GET_TERMINAL_SESSIONS_SCRIPT,
  GET_GHOSTTY_SESSIONS_SCRIPT,
  REOPEN_ITERM_SESSIONS_SCRIPT,
  REOPEN_TERMINAL_SESSIONS_SCRIPT,
  REOPEN_GHOSTY_SESSIONS_SCRIPT,
} from "../utils/scripts";
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
  return result;
};

/**
 * Get open terminal sessions from Ghostty
 * @returns Promise with comma-separated session data (directory|command)
 */
export const getOpenGhostySessions = async (): Promise<string> => {
  const result = await runAppleScript(GET_GHOSTTY_SESSIONS_SCRIPT);
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

  await runAppleScript(REOPEN_ITERM_SESSIONS_SCRIPT({ sessions, inNewWindow }));
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

  await runAppleScript(REOPEN_TERMINAL_SESSIONS_SCRIPT({ sessions, inNewWindow }));
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

  for (const session of sessions) {
    await runAppleScript(REOPEN_GHOSTY_SESSIONS_SCRIPT({ session }));
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
