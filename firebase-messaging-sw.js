// ============================================================
// firebase-messaging-sw.js — Service Worker do Firebase FCM
// Mães e Pais Atípicos do Norte do ES — CMMPANE/NES
// Versão: v14 (P16 — Push Notifications com app fechado)
//
// ⚠️ IMPORTANTE:
//   1. Este arquivo deve estar na RAIZ do GitHub Pages
//      (mesma pasta que index.html e sw.js)
//   2. Substitua os valores de firebaseConfig pelos do seu projeto
//   3. Depois de subir, acesse a aba Dados do app → seção Firebase
//      para configurar a chave VAPID e o firebaseConfig
//   4. Para gerar credenciais Firebase:
//      - Acesse https://console.firebase.google.com
//      - Crie um novo projeto ou use um existente
//      - Vá em Configurações do projeto → Contas de serviço
//      - Copie o firebaseConfig
// ============================================================

// Importar Firebase via CDN (versão compat para SW)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ── Configuração Firebase ──
// Substitua pelo seu firebaseConfig (do Firebase Console → Configurações do projeto → Web)
// Este valor também pode ser injetado dinamicamente pelo app ao salvar na aba Dados
const FIREBASE_CONFIG = {
  apiKey:            "COLE_SUA_API_KEY_AQUI",
  authDomain:        "COLE_SEU_AUTH_DOMAIN_AQUI",
  projectId:         "COLE_SEU_PROJECT_ID_AQUI",
  storageBucket:     "COLE_SEU_STORAGE_BUCKET_AQUI",
  messagingSenderId: "COLE_SEU_MESSAGING_SENDER_ID_AQUI",
  appId:             "COLE_SEU_APP_ID_AQUI",
};

// Inicializar Firebase (só se ainda não inicializado)
let app;
try {
  app = firebase.app();
} catch (e) {
  app = firebase.initializeApp(FIREBASE_CONFIG);
}

const messaging = firebase.messaging(app);

// ── Handler de push em background ──
// Chamado quando o app está fechado ou em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM-SW] Mensagem recebida em background:', payload);
  const { title, body, icon, badge, image } = payload.notification || {};
  const data = payload.data || {};
  
  const notificationTitle = title || '💜 NES — Mães e Pais Atípicos';
  const notificationOptions = {
    body: body || 'Você tem uma nova notificação do evento CMMPANE/NES.',
    icon:  icon  || './icons/icon-192.png',
    badge: badge || './icons/icon-192.png',
    image: image || undefined,
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'nes-fcm-' + Date.now(),
    requireInteraction: data.requireInteraction === 'true',
    data: {
      url: data.url || './',
      ...data,
    },
    actions: data.action1Label ? [
      { action: 'open',    title: data.action1Label || 'Abrir app' },
      { action: 'dismiss', title: 'Fechar' },
    ] : [],
  };
  
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ── Clique na notificação ──
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();
  
  if (action === 'dismiss') return;
  
  // Abrir ou focar o app
  const urlParaAbrir = data.url || './';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Tentar focar janela existente
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (urlParaAbrir !== './') client.navigate(urlParaAbrir);
          return;
        }
      }
      // Abrir nova janela
      if (clients.openWindow) {
        return clients.openWindow(urlParaAbrir);
      }
    })
  );
});

// ── Push genérico (fallback para versões antigas) ──
self.addEventListener('push', (event) => {
  // O Firebase SDK já lida com isso via onBackgroundMessage,
  // mas mantemos aqui como fallback para compatibilidade
  if (event.data) {
    try {
      const data = event.data.json();
      // Se Firebase não tratou, tratar aqui
      if (!data.notification) {
        const title = data.title || '💜 NES';
        const options = {
          body: data.body || 'Nova notificação do evento.',
          icon: './icons/icon-192.png',
          badge: './icons/icon-192.png',
          tag: 'nes-push-' + Date.now(),
        };
        event.waitUntil(self.registration.showNotification(title, options));
      }
    } catch (e) {
      // Dado não é JSON — ignorar
      console.warn('[FCM-SW] Erro ao fazer parse do push:', e);
    }
  }
});

// ── Error handler ──
self.addEventListener('error', (event) => {
  console.error('[FCM-SW] Erro no service worker:', event.error);
});

console.log('[FCM-SW] Service Worker Firebase registrado — NES v14');
