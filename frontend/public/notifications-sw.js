// Only displays notifications requested by an open page; no background event watcher.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.url;
  if (typeof path === "string" && /^\/nft\/\d+$/.test(path)) {
    event.waitUntil(self.clients.openWindow(path));
  }
});
