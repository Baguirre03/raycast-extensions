import { List, ActionPanel, Action, Toast, showToast, LocalStorage, popToRoot } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { authorize } from "./utils/oauth";
import { getCalendarList } from "./services/calendar";
import { Calendar } from "./types";

export default function SelectDefaultCalendar() {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDefault, setCurrentDefault] = useState<string>("");
  const [hiddenCalendars, setHiddenCalendars] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchData() {
      try {
        const stored = await LocalStorage.getItem<string>("defaultCalendar");
        setCurrentDefault(stored || "primary");

        // Load hidden calendars
        const hidden = await LocalStorage.getItem<string>("hiddenCalendars");
        if (hidden) {
          try {
            const hiddenArray = JSON.parse(hidden) as string[];
            setHiddenCalendars(new Set(hiddenArray));
          } catch {
            setHiddenCalendars(new Set());
          }
        }

        // Fetch calendars
        const token = await authorize();
        const calendarList = await getCalendarList(token);
        setCalendars(calendarList);
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch calendars" });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const selectCalendar = async (calendarId: string, calendarName: string) => {
    try {
      await LocalStorage.setItem("defaultCalendar", calendarId);
      await showToast({
        style: Toast.Style.Success,
        title: "Default Calendar Updated",
        message: `New events will be created in "${calendarName}"`,
      });
      await popToRoot();
    } catch (error) {
      showFailureToast(error, { title: "Failed to update default calendar" });
    }
  };

  const removeCalendar = async (calendarId: string, calendarName: string) => {
    try {
      // Add to hidden calendars
      const newHiddenCalendars = new Set(hiddenCalendars);
      newHiddenCalendars.add(calendarId);
      setHiddenCalendars(newHiddenCalendars);

      // Save to local storage
      await LocalStorage.setItem("hiddenCalendars", JSON.stringify(Array.from(newHiddenCalendars)));

      // If this was the current default, reset to primary
      if (currentDefault === calendarId) {
        await LocalStorage.setItem("defaultCalendar", "primary");
        setCurrentDefault("primary");
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Calendar Hidden",
        message: `"${calendarName}" has been hidden from the list`,
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to hide calendar" });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search calendars...">
      <List.Section title="Select Default Calendar">
        {calendars
          .filter((calendar) => !hiddenCalendars.has(calendar.id))
          .map((calendar) => (
            <List.Item
              key={calendar.id}
              title={calendar.summary}
              subtitle={calendar.description || ""}
              icon={currentDefault === calendar.id ? "✅" : "📅"}
              accessories={[
                { text: calendar.primary ? "Primary" : "" },
                { text: currentDefault === calendar.id ? "Current Default" : "" },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Set as Default Calendar"
                    onAction={() => selectCalendar(calendar.id, calendar.summary)}
                  />
                  <Action
                    title="Hide Calendar"
                    style={Action.Style.Destructive}
                    onAction={() => removeCalendar(calendar.id, calendar.summary)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Calendar ID"
                    content={calendar.id}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
