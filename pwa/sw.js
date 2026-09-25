// Service worker do Asa Norte: guarda os arquivos do jogo na primeira visita para abrir sem internet.
// Modelo: o build (vite.config.ts) preenche a versão e a lista de arquivos e grava o resultado em dist/sw.js.
// O save não passa por aqui: fica no IndexedDB do aparelho.
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CACHE = 'asa-norte-' + VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith('asa-norte-') && k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// a versão nova só assume quando o jogador pede ("Atualizar"), nunca no meio da partida
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // a página do jogo sai do cache: abre offline e sempre na versão instalada
    event.respondWith(caches.match('./index.html').then((hit) => hit || fetch(req)));
    return;
  }
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
