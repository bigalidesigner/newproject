/* sw.js */
const VER = 'v1.0.0';
const STATIC_CACHE = `static-${VER}`;
const HTML_CACHE   = `html-${VER}`;
const API_CACHE    = `api-${VER}`;
const STATIC_ASSETS = [
  '/', '/index.html', '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png'
];

const isHtml = (req)=> req.destination === 'document' || req.headers.get('accept')?.includes('text/html');
const isApi  = (url)=> url.pathname.startsWith('/api/');

self.addEventListener('install', (e)=>{
  self.skipWaiting();
  e.waitUntil(caches.open(STATIC_CACHE).then(c=>c.addAll(STATIC_ASSETS)));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil((async ()=>{
    const names = await caches.keys();
    await Promise.all(names.filter(n=>![STATIC_CACHE,HTML_CACHE,API_CACHE].includes(n)).map(n=>caches.delete(n)));
    await self.clients.claim();
  })());
});

async function networkFirstWithTimeout(req, cacheName, timeoutMs=4000){
  const cache = await caches.open(cacheName);
  return Promise.race([
    fetch(req).then(async res=>{ cache.put(req, res.clone()); return res; }),
    new Promise((_,rej)=> setTimeout(()=>rej(new Error('timeout')), timeoutMs))
  ]).catch(async ()=>{
    const cached = await cache.match(req);
    if (cached) return cached;
    throw new Error('offline and no cache');
  });
}

self.addEventListener('fetch', (e)=>{
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  if (isApi(url)) {
    e.respondWith(
      networkFirstWithTimeout(e.request, API_CACHE, 4000)
        .catch(()=>new Response('{"error":"offline"}',{status:503,headers:{'Content-Type':'application/json'}}))
    );
    return;
  }

  if (isHtml(e.request)) {
    e.respondWith((async ()=>{
      const cache = await caches.open(HTML_CACHE);
      const cached = await cache.match(e.request);
      const fetchPromise = fetch(e.request).then(res=>{ cache.put(e.request, res.clone()); return res; })
        .catch(async ()=> (await caches.match('/offline.html')) || new Response('<h1>Offline</h1>', {headers:{'Content-Type':'text/html'}}));
      return cached || fetchPromise;
    })());
    return;
  }

  if (['style','script','image','font'].includes(e.request.destination)) {
    e.respondWith((async ()=>{
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(e.request);
      if (cached) return cached;
      const res = await fetch(e.request);
      cache.put(e.request, res.clone());
      return res;
    })());
  }
});
