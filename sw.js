// sw.js
self.addEventListener('install', function(e) {
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(self.clients.claim());
});

// 监听来自页面的消息，弹出通知
self.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
        var title = e.data.title || 'HuIOS';
        var options = {
            body: e.data.body || '',
            icon: e.data.icon || '',
            badge: '',
            tag: e.data.tag || 'huios-notify',
            renotify: true,
            data: e.data.data || {}
        };
        e.waitUntil(self.registration.showNotification(title, options));
    }
});

// 点击通知后聚焦到页面
self.addEventListener('notificationclick', function(e) {
    e.notification.close();
    e.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
            if (clients.length > 0) {
                return clients[0].focus();
            }
            return self.clients.openWindow('/');
        })
    );
});