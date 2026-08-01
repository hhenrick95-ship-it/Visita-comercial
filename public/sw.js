// =============================================================
// Service Worker "killer" — neutraliza qualquer SW legado do PWA
// Ao ser instalado no mesmo escopo (/sw.js), ele:
//   1. Toma controle imediatamente (skipWaiting + clientsClaim)
//   2. Limpa todos os caches antigos
//   3. Se desregistra automaticamente
//   4. Notifica abas abertas para recarregar
// =============================================================

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Limpar todos os caches
      const keys = await caches.keys();
      await Promise.allSettled(keys.map(k => caches.delete(k)));

      // Tomar controle de todas as abas
      await self.clients.claim();

      // Notificar abas para recarregar
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => {
        client.postMessage({ type: 'SW_KILLED' });
      });

      // Se auto-destruir
      await self.registration.unregister();
    })()
  );
});

// Não interceptar nenhum fetch — deixar tudo ir para rede
self.addEventListener('fetch', () => {});
