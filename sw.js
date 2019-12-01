const cacheName = 'devfestlille-19';

const filesToCache = [
  '/',
  '/js/load.js',
  '/css/vars.css',
  '/css/barlowsemicondensed-bold-webfont.woff',
  '/css/barlowsemicondensed-italic-webfont.woff',
  '/css/barlowsemicondensed-regular-webfont.woff',
  '/css/boogaloo-regular-webfont.woff',
  '/css/boogaloo-regular-webfont.woff2',
  '/img/logo.svg',
  '/img/logo-big.svg',
  '/img/vase.svg',
  '/img/hifi.svg',
  '/img/tablet.svg'
];

const excludedUrlsOfCache = [
  'https://us-central1-cms-devfest.cloudfunctions.net'
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
    const excludedUrl = excludedUrlsOfCache.find(url => e.request.url.indexOf(url) !== -1);
    
    if(excludedUrl) {
      return fetch(e.request);
    }

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
