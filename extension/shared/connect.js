function readKettlesSessionFromPage() {
  const entries = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
    try {
      const value = JSON.parse(localStorage.getItem(key) || "{}");
      const accessToken = value.access_token || value.currentSession?.access_token;
      const expiresAt = value.expires_at || value.currentSession?.expires_at;
      if (!accessToken) continue;
      const projectRef = key.replace(/^sb-/, "").replace(/-auth-token$/, "");
      entries.push({
        accessToken,
        expiresAt,
        supabaseUrl: `https://${projectRef}.supabase.co`,
        appOrigin: window.location.origin
      });
    } catch {
      // Ignore unrelated localStorage entries.
    }
  }
  return entries[0] || null;
}

export async function connectFromActiveKettlesTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    throw new Error("Open Kettles in the active tab, then try again.");
  }

  const url = new URL(tab.url);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Open Kettles in a browser tab before connecting.");
  }

  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: readKettlesSessionFromPage
  });

  if (!result?.result?.accessToken) {
    throw new Error("No signed-in Kettles session was found in this tab.");
  }

  return result.result;
}
