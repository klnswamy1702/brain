import type { CapturedTab, TabInfo, TabGroup } from "./types";

const isExtension =
  typeof chrome !== "undefined" &&
  typeof chrome.tabs !== "undefined" &&
  typeof chrome.tabs.query !== "undefined";

/** URLs to always exclude from capture. */
const EXCLUDED_PREFIXES = [
  "chrome://",
  "chrome-extension://",
  "about:",
  "edge://",
  "brave://",
];

function isExcluded(url: string): boolean {
  return EXCLUDED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

/**
 * Capture all tabs in the current window with full metadata.
 * Filters out chrome:// and extension pages.
 */
export async function captureCurrentTabs(): Promise<CapturedTab[]> {
  if (!isExtension) {
    // Mock tabs for local/dev testing
    const now = Date.now();
    return [
      { chromeTabId: 1, url: "https://react.dev/reference/react", title: "React Reference Overview – React", windowId: 1, groupId: -1, capturedAt: now },
      { chromeTabId: 2, url: "https://vitejs.dev/guide/", title: "Getting Started | Vite", windowId: 1, groupId: -1, capturedAt: now },
      { chromeTabId: 3, url: "https://ai.google.dev/docs", title: "Gemini API Documentation", windowId: 1, groupId: -1, capturedAt: now },
    ];
  }

  const tabs = await chrome.tabs.query({ currentWindow: true });
  const now = Date.now();

  return tabs
    .filter((t) => t.url && t.title && !isExcluded(t.url))
    .map((t) => ({
      chromeTabId: t.id ?? -1,
      url: t.url!,
      title: t.title!,
      favIconUrl: t.favIconUrl || undefined,
      windowId: t.windowId ?? -1,
      groupId: t.groupId ?? -1,
      capturedAt: now,
    }));
}

/**
 * Close tabs by their Chrome tab IDs.
 * Skips the extension's own app page so the user isn't stranded.
 */
export async function closeTabs(tabIds: number[]): Promise<void> {
  if (!isExtension) return;

  // Don't close the extension's own pages
  const extensionOrigin = chrome.runtime.getURL("");
  const allTabs = await chrome.tabs.query({ currentWindow: true });

  const idsToClose = tabIds.filter((id) => {
    const tab = allTabs.find((t) => t.id === id);
    if (!tab || !tab.url) return false;
    // Keep the extension's own pages open
    if (tab.url.startsWith(extensionOrigin)) return false;
    // Keep chrome:// pages (shouldn't be in list, but safety)
    if (isExcluded(tab.url)) return false;
    return true;
  });

  if (idsToClose.length > 0) {
    // If we're about to close ALL tabs, create a new tab first so the window stays open
    const remainingTabs = allTabs.filter(
      (t) => t.id !== undefined && !idsToClose.includes(t.id),
    );
    if (remainingTabs.length === 0) {
      await chrome.tabs.create({ active: true });
    }
    await chrome.tabs.remove(idsToClose);
  }
}

/**
 * Open a single URL in a new tab.
 */
export async function openTab(url: string): Promise<void> {
  if (!isExtension) {
    window.open(url, "_blank");
    return;
  }
  await chrome.tabs.create({ url, active: false });
}

/**
 * Open multiple URLs in new tabs.
 */
export async function openTabs(urls: string[]): Promise<number> {
  if (!isExtension) {
    urls.forEach((url) => window.open(url, "_blank"));
    return urls.length;
  }

  let count = 0;
  for (const url of urls) {
    try {
      await chrome.tabs.create({ url, active: false });
      count++;
    } catch (err) {
      console.warn("Failed to open tab:", url, err);
    }
  }
  return count;
}

/**
 * Deduplicate captured tabs against existing groups.
 * Removes tabs whose URL already exists in any existing group.
 */
export function deduplicateTabs(
  newTabs: CapturedTab[],
  existingGroups: TabGroup[],
): CapturedTab[] {
  const existingUrls = new Set<string>();
  for (const group of existingGroups) {
    for (const tab of group.tabs) {
      existingUrls.add(tab.url);
    }
  }
  return newTabs.filter((t) => !existingUrls.has(t.url));
}

/** Legacy helper — kept for backward compatibility with summarize/session code. */
export async function captureTabs(): Promise<TabInfo[]> {
  const captured = await captureCurrentTabs();
  return captured.map((t) => ({ url: t.url, title: t.title }));
}

/**
 * Generate a human-readable title for a tab group from captured tabs.
 * Uses the most common domain or a date-based fallback.
 */
export function generateGroupTitle(tabs: CapturedTab[]): string {
  if (tabs.length === 0) return "Empty capture";

  // Count domains
  const domainCounts = new Map<string, number>();
  for (const tab of tabs) {
    try {
      const domain = new URL(tab.url).hostname.replace("www.", "");
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    } catch {
      // skip invalid URLs
    }
  }

  // Get top 2 domains
  const sorted = [...domainCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topDomains = sorted.slice(0, 2).map(([d]) => d);

  const date = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  if (topDomains.length > 0) {
    return `${topDomains.join(", ")} — ${date}`;
  }
  return `${tabs.length} tabs — ${date}`;
}
