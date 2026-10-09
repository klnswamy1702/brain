/** Open the full Research Brain app page in a new tab. */
export function openAppPage(): void {
  chrome.tabs.create({ url: chrome.runtime.getURL("app.html") });
}
