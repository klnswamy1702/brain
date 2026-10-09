import type { StorageSchema } from "./types";

const DEFAULTS: StorageSchema = {
  sessions: [],
  currentSessionId: null,
  geminiApiKey: null,
};

const isExtension =
  typeof chrome !== "undefined" &&
  typeof chrome.storage !== "undefined" &&
  typeof chrome.storage.local !== "undefined";

/**
 * Storage abstraction that works in both Chrome extension and regular browser.
 * Uses chrome.storage.local when available, falls back to localStorage.
 */
export const storage = {
  async get<K extends keyof StorageSchema>(key: K): Promise<StorageSchema[K]> {
    if (isExtension) {
      const result = await chrome.storage.local.get(key);
      return (result[key] as StorageSchema[K]) ?? DEFAULTS[key];
    }
    const raw = localStorage.getItem(`brain:${key}`);
    if (raw === null) return DEFAULTS[key];
    return JSON.parse(raw) as StorageSchema[K];
  },

  async set<K extends keyof StorageSchema>(
    key: K,
    value: StorageSchema[K],
  ): Promise<void> {
    if (isExtension) {
      await chrome.storage.local.set({ [key]: value });
      return;
    }
    localStorage.setItem(`brain:${key}`, JSON.stringify(value));
  },

  async getAll(): Promise<StorageSchema> {
    if (isExtension) {
      const result = await chrome.storage.local.get(Object.keys(DEFAULTS));
      return { ...DEFAULTS, ...result } as StorageSchema;
    }
    const sessions = await this.get("sessions");
    const currentSessionId = await this.get("currentSessionId");
    const geminiApiKey = await this.get("geminiApiKey");
    return { sessions, currentSessionId, geminiApiKey };
  },

  async clear(): Promise<void> {
    if (isExtension) {
      await chrome.storage.local.clear();
      return;
    }
    for (const key of Object.keys(DEFAULTS)) {
      localStorage.removeItem(`brain:${key}`);
    }
  },
};
