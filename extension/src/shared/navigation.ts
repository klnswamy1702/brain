/** Open the full Research Brain app page in a new tab, optionally at a specific anchor/route. */
export function openAppPage(hash?: string): void {
  const hashPart = hash ? (hash.startsWith("#") ? hash : `#${hash}`) : "";
  const url = chrome.runtime.getURL(`app.html${hashPart}`);
  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url });
  } else {
    window.open(url, "_blank");
  }
}
