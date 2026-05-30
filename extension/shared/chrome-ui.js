export function openKettles(settings, path = "/timer") {
  const origin = settings.appOrigin || "http://localhost:3000";
  chrome.tabs.create({ url: `${origin.replace(/\/$/, "")}${path}` });
}

export function notify(title, message, settings) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("assets/icon-128.png"),
    title,
    message,
    priority: 1
  });
}
