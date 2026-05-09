// ============================================================
// sw.js — Service Worker para PWA offline
// Mães e Pais Atípicos do Norte do ES — CMMPANE/NES
// Versão: v14 (P16 — Cache com versionamento e estratégia melhorada)
// ============================================================

// ── VERSÃO DE CACHE ──
// Incrementar este número quando fazer deploy para forçar atualização
const CACHE_VERSION = 'v14-20260509';
const CACHE = 'nes-' + CACHE_VERSION;
const URLS_CRITICAS = [
  './',
  './index.html',
  './inscricao.html',
  './dashboard.html',
  './manifest.json',
];

// ── INSTALL: Cache de recursos críticos ──
self.addEventListener('install', (e) => {
  console.log('[SW] Install — versão ' + CACHE_VERSION);
  e.waitUntil(
    caches.open(CACHE).then((cache) => {
      console.log('[SW] Cacheando recursos críticos...');
      return cache.addAll(URLS_CRITICAS).catch((err) => {
        console.warn('[SW] Erro ao cachear alguns recursos:', err);
        // Continuar mesmo se alguns recursos falharem
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: Limpar caches antigos ──
self.addEventListener('activate', (e) => {
  console.log('[SW] Activate — limpando caches antigos');
  e.waitUntil(
    caches.keys().then((nomes) => {
      return Promise.all(
        nomes.map((nome) => {
          if (nome !== CACHE && nome.startsWith('nes-')) {
            console.log('[SW] Deletando cache antigo:', nome);
            return caches.delete(nome);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ── FETCH: Estratégias de cache por tipo de recurso ──
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // Ignorar requisições para domínios externos (exceto APIs necessárias)
  if (url.origin !== self.location.origin) {
    // Permitir requisições para APIs externas (Firebase, etc)
    if (url.hostname.includes('googleapis.com') || 
        url.hostname.includes('firebaseapp.com') ||
        url.hostname.includes('script.google.com')) {
      e.respondWith(
        fetch(e.request).catch(() => {
          // Se falhar, retornar resposta genérica
          return new Response('Sem conexão com serviço externo', { status: 503 });
        })
      );
    }
    return;
  }

  // ── APIs do Apps Script: Network first, fallback cache ──
  if (url.pathname.includes('script.google.com') || e.request.method === 'POST') {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          // Cachear respostas bem-sucedidas
          if (resp.ok && e.request.method === 'GET') {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => {
          // Fallback para cache se houver
          return caches.match(e.request) || 
            new Response('Sem conexão. Tente novamente.', { status: 503 });
        })
    );
    return;
  }

  // ── Arquivos HTML: Network first, fallback cache ──
  if (e.request.destination === 'document') {
    const fetchPromise = fetch(e.request)
      .then((resp) => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(e.request));
    
    e.respondWith(fetchPromise || new Response('Página não encontrada', { status: 404 }));
    return;
  }

  // ── Recursos estáticos (CSS, JS, imagens): Cache first, fallback network ──
  if (e.request.destination === 'style' || 
      e.request.destination === 'script' || 
      e.request.destination === 'image') {
    const cached = caches.match(e.request);
    const fetchPromise = fetch(e.request).then((resp) => {
      if (resp.ok) {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    });
    
    e.respondWith(
      cached.then((cached) => cached || fetchPromise).catch(() => cached)
    );
    return;
  }

  // ── Demais: network first, fallback cache ──
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// ── MESSAGE: aceitar comandos do app ──
self.addEventListener('message', e => {
  if (e.data && e.data.tipo === 'skipWaiting') {
    self.skipWaiting();
  }
  if (e.data && e.data.tipo === 'cachear-pagina') {
    caches.open(CACHE).then(cache => cache.add(e.data.url)).catch(() => {});
  }
  if (e.data && e.data.tipo === 'limpar-cache') {
    caches.keys().then(nomes => {
      Promise.all(nomes.map(nome => caches.delete(nome)));
    });
  }
});

console.log('[SW] Service Worker registrado — NES v14 com cache inteligente');
