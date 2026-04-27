/* ============================================
   EDUFIT — service-worker.js
   PWA Service Worker — Cache & Offline Support
   ============================================ */

'use strict';

const APP_NAME    = 'EduFit';
const CACHE_VERSION = 'v1.2';
const CACHE_NAME  = `${APP_NAME}-${CACHE_VERSION}`;

// ============================================
// FILES TO CACHE (Core App Shell)
// ============================================

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
];

// External resources to cache (fonts, etc.)
const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap',
];

const ALL_ASSETS = [...CORE_ASSETS, ...EXTERNAL_ASSETS];

// ============================================
// INSTALL — Pre-cache core assets
// ============================================

self.addEventListener('install', (event) => {
  console.log(`[${APP_NAME} SW] Instalando cache: ${CACHE_NAME}`);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache core assets (must succeed)
        return cache.addAll(CORE_ASSETS)
          .then(() => {
            // Cache external assets individually (failures are acceptable)
            return Promise.allSettled(
              EXTERNAL_ASSETS.map(url =>
                cache.add(url).catch(err =>
                  console.warn(`[${APP_NAME} SW] Não foi possível cachear: ${url}`, err)
                )
              )
            );
          });
      })
      .then(() => {
        console.log(`[${APP_NAME} SW] Assets cacheados com sucesso.`);
        // Ativar imediatamente sem esperar aba fechar
        return self.skipWaiting();
      })
      .catch(err => console.error(`[${APP_NAME} SW] Falha no install:`, err))
  );
});

// ============================================
// ACTIVATE — Limpar caches antigos
// ============================================

self.addEventListener('activate', (event) => {
  console.log(`[${APP_NAME} SW] Ativando: ${CACHE_NAME}`);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith(APP_NAME) && name !== CACHE_NAME)
            .map(name => {
              console.log(`[${APP_NAME} SW] Removendo cache antigo: ${name}`);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log(`[${APP_NAME} SW] Cache atualizado. App pronto para uso offline.`);
        // Assumir controle de todas as abas abertas
        return self.clients.claim();
      })
  );
});

// ============================================
// FETCH — Estratégia: Cache First + Network Fallback
// ============================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET e extensões de browser
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  if (url.protocol === 'moz-extension:') return;

  // Para navegação (HTML), usar Network First para sempre ter versão atualizada
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Para assets estáticos (CSS, JS, fontes, imagens), usar Cache First
  if (
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js')  ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.svg') ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Para outras requisições, usar Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ============================================
// ESTRATÉGIAS DE CACHE
// ============================================

/**
 * Cache First — Retorna do cache se disponível, senão busca na rede.
 * Ideal para assets estáticos que raramente mudam.
 */
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return offlineFallback(request);
  }
}

/**
 * Network First — Tenta rede primeiro; cai para cache se offline.
 * Ideal para páginas HTML (navegação).
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

/**
 * Stale-While-Revalidate — Retorna do cache imediatamente,
 * atualiza cache em background.
 */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const networkFetch = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(() => null);

  return cached || await networkFetch || offlineFallback(request);
}

/**
 * Fallback offline — Retorna a página principal do cache.
 */
async function offlineFallback(request) {
  // Tenta retornar index.html cacheado
  const indexCache = await caches.match('./index.html');
  if (indexCache) return indexCache;

  // Fallback mínimo
  return new Response(
    `<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>EduFit — Offline</title>
      <style>
        body { font-family: sans-serif; background:#0a0a0f; color:#f0f0f8;
               display:flex; align-items:center; justify-content:center;
               min-height:100vh; margin:0; text-align:center; padding:20px; }
        h1 { font-size:36px; color:#e8ff47; margin-bottom:8px; }
        p  { color:#8888aa; }
        button { margin-top:20px; padding:12px 28px; background:#e8ff47; color:#0a0a0f;
                 border:none; border-radius:8px; font-size:15px; font-weight:700; cursor:pointer; }
      </style>
    </head>
    <body>
      <div>
        <div style="font-size:56px">⚡</div>
        <h1>EduFit</h1>
        <p>Você está offline.<br/>Verifique sua conexão e tente novamente.</p>
        <button onclick="location.reload()">Tentar novamente</button>
      </div>
    </body>
    </html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    }
  );
}

// ============================================
// BACKGROUND SYNC (futuro)
// ============================================

self.addEventListener('sync', (event) => {
  console.log(`[${APP_NAME} SW] Background sync:`, event.tag);
  // Reservado para futuras sincronizações de dados
});

// ============================================
// PUSH NOTIFICATIONS (futuro)
// ============================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json().catch(() => ({ title: APP_NAME, body: event.data.text() }));

  event.waitUntil(
    data.then(({ title, body, icon }) => {
      return self.registration.showNotification(title || APP_NAME, {
        body: body || 'Hora de treinar! 💪',
        icon: icon || './icons/icon-192.png',
        badge: './icons/icon-96.png',
        vibrate: [200, 100, 200],
        data: { url: './' },
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existingClient = clients.find(c => c.url.includes(url));
        if (existingClient) return existingClient.focus();
        return self.clients.openWindow(url);
      })
  );
});

// ============================================
// MENSAGENS DO APP
// ============================================

self.addEventListener('message', (event) => {
  if (event.data?.action === 'skipWaiting') {
    console.log(`[${APP_NAME} SW] Atualizando SW por solicitação do app...`);
    self.skipWaiting();
  }

  if (event.data?.action === 'getCacheInfo') {
    caches.keys().then(keys => {
      event.ports[0]?.postMessage({ caches: keys, current: CACHE_NAME });
    });
  }
});

console.log(`[${APP_NAME} SW] Service Worker carregado — ${CACHE_NAME}`);
