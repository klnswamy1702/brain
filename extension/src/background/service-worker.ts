import type {
  ExtensionMessage,
  StatusResponse,
  CaptureResponse,
  RestoreResponse,
  CapturePayload,
  RestoreTabPayload,
  RestoreAllPayload,
  DeleteGroupPayload,
  Session,
  TabGroup,
} from "../shared/types";
import { storage } from "../shared/storage";
import {
  captureCurrentTabs,
  closeTabs,
  openTab,
  openTabs,
  deduplicateTabs,
  generateGroupTitle,
} from "../shared/tabs";

chrome.runtime.onInstalled.addListener(async () => {
  const sessions = await storage.get("sessions");
  if (sessions.length === 0) {
    await storage.set("sessions", []);
  }
  // Ensure tabGroups key exists
  const groups = await storage.get("tabGroups");
  if (!groups || !Array.isArray(groups)) {
    await storage.set("tabGroups", []);
  }
});

type AnyResponse = StatusResponse | CaptureResponse | RestoreResponse | { success: boolean };

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: AnyResponse) => void,
  ) => {
    handleMessage(message).then(sendResponse);
    return true; // keep the message channel open for async response
  },
);

async function handleMessage(message: ExtensionMessage): Promise<AnyResponse> {
  switch (message.action) {
    case "GET_STATUS": {
      const sessions = await storage.get("sessions");
      const currentSessionId = await storage.get("currentSessionId");
      const tabGroups = await storage.get("tabGroups");
      return {
        currentSessionId,
        sessionCount: sessions.length,
        tabGroupCount: tabGroups.length,
      };
    }

    case "END_DAY": {
      const currentSessionId = await storage.get("currentSessionId");
      if (currentSessionId) {
        const sessions = await storage.get("sessions");
        const updated = sessions.map((s: Session) =>
          s.id === currentSessionId ? { ...s, endedAt: Date.now() } : s,
        );
        await storage.set("sessions", updated);
        await storage.set("currentSessionId", null);
      }
      return { success: true };
    }

    case "CAPTURE_TABS": {
      try {
        const payload = message.payload as CapturePayload | undefined;
        const closeAfter = payload?.closeAfterCapture ?? true;

        // Capture all tabs in the current window
        let captured = await captureCurrentTabs();
        if (captured.length === 0) {
          return { success: false, capturedCount: 0, error: "No capturable tabs found" };
        }

        // Deduplicate against existing groups
        const existingGroups = await storage.get("tabGroups");
        const deduplicated = deduplicateTabs(captured, existingGroups);

        if (deduplicated.length === 0) {
          return {
            success: true,
            capturedCount: 0,
            error: "All tabs already captured in existing groups",
          };
        }

        // Create the tab group
        const group: TabGroup = {
          id: crypto.randomUUID(),
          title: generateGroupTitle(deduplicated),
          capturedAt: Date.now(),
          tabs: deduplicated,
          closedOnCapture: closeAfter,
        };

        // Save to storage
        const updated = [group, ...existingGroups];
        await storage.set("tabGroups", updated);

        // Close the captured tabs if requested
        if (closeAfter) {
          const tabIds = deduplicated.map((t) => t.chromeTabId).filter((id) => id > 0);
          await closeTabs(tabIds);
        }

        return { success: true, capturedCount: deduplicated.length, groupId: group.id };
      } catch (err: any) {
        console.error("Capture error:", err);
        return { success: false, capturedCount: 0, error: err?.message || String(err) };
      }
    }

    case "RESTORE_TAB": {
      try {
        const payload = message.payload as RestoreTabPayload;
        if (!payload?.groupId || !payload?.url) {
          return { success: false, restoredCount: 0, error: "Missing groupId or url" };
        }

        await openTab(payload.url);

        // Remove from group if requested
        if (payload.removeAfterRestore) {
          const groups = await storage.get("tabGroups");
          const updated = groups
            .map((g: TabGroup) => {
              if (g.id !== payload.groupId) return g;
              return { ...g, tabs: g.tabs.filter((t) => t.url !== payload.url) };
            })
            .filter((g: TabGroup) => g.tabs.length > 0); // Remove empty groups
          await storage.set("tabGroups", updated);
        }

        return { success: true, restoredCount: 1 };
      } catch (err: any) {
        return { success: false, restoredCount: 0, error: err?.message || String(err) };
      }
    }

    case "RESTORE_ALL": {
      try {
        const payload = message.payload as RestoreAllPayload;
        if (!payload?.groupId) {
          return { success: false, restoredCount: 0, error: "Missing groupId" };
        }

        const groups = await storage.get("tabGroups");
        const group = groups.find((g: TabGroup) => g.id === payload.groupId);
        if (!group) {
          return { success: false, restoredCount: 0, error: "Group not found" };
        }

        const urls = group.tabs.map((t) => t.url);
        const count = await openTabs(urls);

        // Remove the group after restoring if requested
        if (payload.removeAfterRestore) {
          const updated = groups.filter((g: TabGroup) => g.id !== payload.groupId);
          await storage.set("tabGroups", updated);
        }

        return { success: true, restoredCount: count };
      } catch (err: any) {
        return { success: false, restoredCount: 0, error: err?.message || String(err) };
      }
    }

    case "DELETE_TAB_GROUP": {
      try {
        const payload = message.payload as DeleteGroupPayload;
        if (!payload?.groupId) {
          return { success: false };
        }
        const groups = await storage.get("tabGroups");
        const updated = groups.filter((g: TabGroup) => g.id !== payload.groupId);
        await storage.set("tabGroups", updated);
        return { success: true };
      } catch {
        return { success: false };
      }
    }

    default:
      return { success: false };
  }
}
