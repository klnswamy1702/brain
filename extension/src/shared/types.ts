export interface TabInfo {
  url: string;
  title: string;
}

/** A single research session record. */
export interface Session {
  id: string;
  title: string;
  createdAt: number;
  endedAt?: number;
  tabs?: TabInfo[];
  summary?: string;
}

/** Shape of the data persisted in chrome.storage.local. */
export interface StorageSchema {
  sessions: Session[];
  currentSessionId: string | null;
  geminiApiKey: string | null;
}

/** Messages exchanged between popup/app and the service worker. */
export type MessageAction = "GET_STATUS" | "END_DAY";

export interface ExtensionMessage {
  action: MessageAction;
}

export interface StatusResponse {
  currentSessionId: string | null;
  sessionCount: number;
}
