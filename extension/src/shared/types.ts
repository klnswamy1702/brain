/** A single captured tab with full metadata. */
export interface CapturedTab {
  /** Original Chrome tab ID at capture time (informational only). */
  chromeTabId: number;
  url: string;
  title: string;
  favIconUrl?: string;
  windowId: number;
  groupId: number;
  capturedAt: number;
}

/** Legacy slim tab reference (kept for backward compat with existing sessions). */
export interface TabInfo {
  url: string;
  title: string;
}

/** A group of tabs captured together in one action. */
export interface TabGroup {
  id: string;
  title: string;
  capturedAt: number;
  tabs: CapturedTab[];
  /** True if all tabs in this group were closed after capture. */
  closedOnCapture: boolean;
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
  /** Captured tab groups (OneTab-style lists). */
  tabGroups: TabGroup[];
}

/** Messages exchanged between popup/app and the service worker. */
export type MessageAction =
  | "GET_STATUS"
  | "END_DAY"
  | "CAPTURE_TABS"
  | "RESTORE_TAB"
  | "RESTORE_ALL"
  | "DELETE_TAB_GROUP";

export interface ExtensionMessage {
  action: MessageAction;
  /** Payload varies by action. */
  payload?: CapturePayload | RestoreTabPayload | RestoreAllPayload | DeleteGroupPayload;
}

export interface CapturePayload {
  closeAfterCapture: boolean;
}

export interface RestoreTabPayload {
  groupId: string;
  url: string;
  /** Remove the tab from the group after restoring. */
  removeAfterRestore: boolean;
}

export interface RestoreAllPayload {
  groupId: string;
  /** Remove the group after restoring all tabs. */
  removeAfterRestore: boolean;
}

export interface DeleteGroupPayload {
  groupId: string;
}

export interface StatusResponse {
  currentSessionId: string | null;
  sessionCount: number;
  tabGroupCount: number;
}

export interface CaptureResponse {
  success: boolean;
  capturedCount: number;
  groupId?: string;
  error?: string;
}

export interface RestoreResponse {
  success: boolean;
  restoredCount: number;
  error?: string;
}
