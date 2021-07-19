const cacheName = 'devfestlille-20';

const filesToCache = [
  '/',
  '/css/vars.css',
  '/css/aleo-bold-webfont.woff',
  '/css/aleo-light-webfont.woff',
  '/css/aleo-regular-webfont.woff',  
  '/css/aleo-bold-webfont.woff2',
  '/css/aleo-light-webfont.woff2',
  '/css/aleo-regular-webfont.woff2',
  '/img/logo-full.svg',
  '/img/logo-sml.svg',
  '/img/header.svg'
];


self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(filesToCache);
    })
  );
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
