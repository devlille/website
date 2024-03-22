const cacheName = "devfest-lille-2024";

self.addEventListener("install", function (e) {});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keyList) {
      return Promise.all(
        keyList.map(function (key) {
          if (key !== cacheName) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.open(cacheName).then((cache) => {
      return fetch(event.request.url)
        .then((fetchedResponse) => {
          cache.put(event.request, fetchedResponse.clone());

          return fetchedResponse;
        })
        .catch(() => {
          return cache.match(event.request.url);
        });
    })
  );
});
