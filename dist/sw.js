// Optional app shell only. No weather, radar, geocoding or personal data caching.
const CACHE = "alpen-shell-1.2.5-d403856c105e"; // replaced with version + content digest by build
const root = new URL("./", self.registration.scope);
const shell = new URL("./index.html", root).href;
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const file of [
        "./index.html",
        "./manifest.webmanifest",
        "./icon.svg",
      ]) {
        const response = await fetch(new URL(file, root), {
          cache: "reload",
          redirect: "error",
        });
        if (!response.ok) throw Error("Shell unavailable");
        if (
          file === "./index.html" &&
          !(await response.clone().text()).includes("alpenwetter-version")
        )
          throw Error("Unexpected shell");
        await cache.put(new URL(file, root), response);
      }
      await self.skipWaiting();
    })(),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      // Retain one previous app shell for recovery. Never delete another app's caches.
      const previous = (await caches.keys()).filter(
        (k) => k.startsWith("alpen-shell-") && k !== CACHE,
      );
      for (const name of previous.slice(0, -1)) await caches.delete(name);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== "GET")
    return;
  if (
    event.request.mode === "navigate" &&
    [root.pathname, new URL(shell).pathname].includes(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          if (response.ok) return response;
          throw Error("Navigation unavailable");
        } catch {
          return (
            (await (await caches.open(CACHE)).match(shell)) ||
            new Response("Open Alpenwetter again when online.", { status: 503 })
          );
        }
      })(),
    );
    return;
  }
  if (
    ["manifest.webmanifest", "icon.svg"].some(
      (file) => url.href === new URL(file, root).href,
    )
  )
    event.respondWith(
      caches
        .open(CACHE)
        .then(
          async (cache) =>
            (await cache.match(event.request)) || fetch(event.request),
        ),
    );
});
