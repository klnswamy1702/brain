import type { TabInfo } from "./types";

const isExtension =
  typeof chrome !== "undefined" &&
  typeof chrome.tabs !== "undefined" &&
  typeof chrome.tabs.query !== "undefined";

export async function captureTabs(): Promise<TabInfo[]> {
  if (isExtension) {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    return tabs
      .filter((t) => t.url && t.title && !t.url.startsWith("chrome://"))
      .map((t) => ({ url: t.url!, title: t.title! }));
  }

  // Mock tabs for local testing
  return [
    { url: "https://react.dev/reference/react", title: "React Reference Overview – React" },
    { url: "https://vitejs.dev/guide/", title: "Getting Started | Vite" },
    { url: "https://ai.google.dev/docs", title: "Gemini API Documentation" },
  ];
}
