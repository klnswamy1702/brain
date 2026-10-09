import type { ExtensionMessage, StatusResponse, Session } from "../shared/types";
import { storage } from "../shared/storage";

chrome.runtime.onInstalled.addListener(async () => {
  const sessions = await storage.get("sessions");
  if (sessions.length === 0) {
    await storage.set("sessions", []);
  }
});

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: StatusResponse | { success: boolean }) => void,
  ) => {
    handleMessage(message).then(sendResponse);
    return true; // keep the message channel open for async response
  },
);

async function handleMessage(
  message: ExtensionMessage,
): Promise<StatusResponse | { success: boolean }> {
  switch (message.action) {
    case "GET_STATUS": {
      const sessions = await storage.get("sessions");
      const currentSessionId = await storage.get("currentSessionId");
      return { currentSessionId, sessionCount: sessions.length };
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
    default:
      return { success: false };
  }
}
