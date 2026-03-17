// sw.js
self.addEventListener('install', function(e) {
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(self.clients.claim());
});

// 接收页面发来的消息，弹出通知
self.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'SHOW_NOTIFICATION') return;
    var title = e.data.title || '';
    var options = {
        body: e.data.body || '',
        icon: e.data.icon || '',
        tag: e.data.tag || 'huios-msg',
        data: e.data.data || {}
    };
    e.waitUntil(self.registration.showNotification(title, options));
});

// 点击通知后跳转
self.addEventListener('notificationclick', function(e) {
    e.notification.close();
    var charId = e.notification.data && e.notification.data.charId;
    e.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
            if (clients.length > 0) {
                clients[0].focus();
                if (charId) {
                    clients[0].postMessage({ type: 'OPEN_CHAT', charId: charId });
                }
                return;
            }
            return self.clients.openWindow('/');
        })
    );
});