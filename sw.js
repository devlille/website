const cacheName = 'devfest-lille';

self.addEventListener('install', function(e) {

});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== cacheName) {
          return caches.delete(key);
        }
      }));
    })
  );
});

self.addEventListener('fetch', function(e) {
  e.respondWith(async function() {
    const cachedUrl = await fetch(e.request)
    .then(response => {
      return caches.open(cacheName).then(function(cache) {
        cache.put(e.request, response.clone());
        return response;
      });
    })
    .catch(function() {
      return caches.match(e.request);
    })

    return cachedUrl;
  }());
});
