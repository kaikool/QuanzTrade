const CACHE_NAME = "trade-journal-v3";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.svg"
];

// ─── In-SW notification state ───────────────────────────────────────────────
let calendarEvents = [];
let notificationsEnabled = false;
let notifiedEvents = new Set();

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()).then(() => {
      // Start background calendar check
      checkCalendarAndNotify();
      setInterval(checkCalendarAndNotify, 30000);
    })
  );
});

// ─── Background notification checker ────────────────────────────────────────
async function checkCalendarAndNotify() {
  if (!notificationsEnabled) return;

  try {
    const res = await fetch("/api/calendar", {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json();
    if (!json.success || !json.data) return;

    const now = new Date();
    const events = json.data;
    const newNotified = new Set(notifiedEvents);

    for (const ev of events) {
      if (ev.impact !== "High") continue;

      const evTime = new Date(ev.date);
      const diffMs = evTime.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / (1000 * 60));

      // Check if event is ~50-70 minutes away
      if (diffMins >= 50 && diffMins <= 70) {
        const eventId = `${ev.title}-${ev.date}`;
        if (!newNotified.has(eventId)) {
          newNotified.add(eventId);
          self.registration.showNotification(
            `🚨 Tin Đỏ Sắp Diễn Ra: ${ev.title}`,
            {
              body: `Sự kiện USD quan trọng sẽ xảy ra sau 1 tiếng (${evTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}). Hãy lưu ý rủi ro!`,
              icon: "/icon.svg",
              badge: "/icon.svg",
              vibrate: [200, 100, 200],
              tag: eventId,
              requireInteraction: true,
            }
          );
        }
      }
    }

    notifiedEvents = newNotified;
  } catch (err) {
    // Silently fail — will retry on next interval
  }
}

// ─── Message channel from page ──────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (!event.data) return;

  const msg = event.data;

  if (msg.type === "SET_NOTIFICATION_STATE") {
    notificationsEnabled = Boolean(msg.enabled);
    if (msg.notifiedIds && Array.isArray(msg.notifiedIds)) {
      notifiedEvents = new Set(msg.notifiedIds);
    }
  }

  if (msg.type === "SYNC_NOTIFIED_EVENTS") {
    if (msg.notifiedIds && Array.isArray(msg.notifiedIds)) {
      notifiedEvents = new Set(msg.notifiedIds);
    }
    // Return current state back to page
    event.source.postMessage({
      type: "NOTIFIED_EVENTS_STATE",
      notifiedIds: Array.from(notifiedEvents),
    });
  }
});

// ─── Push event (for future VAPID server push) ─────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    self.registration.showNotification(data.title || "Quantum Trade", {
      body: data.body || "",
      icon: data.icon || "/icon.svg",
      badge: "/icon.svg",
      vibrate: [200, 100, 200],
      data: data.url ? { url: data.url } : {},
    });
  } catch {
    self.registration.showNotification("Quantum Trade", {
      body: event.data.text(),
      icon: "/icon.svg",
    });
  }
});

// ─── Notification click → open app ─────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Fetch Event
self.addEventListener("fetch", (e) => {
  // Only handle GET requests or bypass API endpoints
  if (e.request.method !== "GET" || e.request.url.includes("/api/")) {
    return;
  }

  const url = new URL(e.request.url);
  if (
    e.request.mode === "navigate" ||
    url.pathname === "/" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css")
  ) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        return networkResponse;
      })
      .catch(() => {
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return caches.match("/");
        });
      })
  );
});
