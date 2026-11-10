// 成進館 入口ページの裏方（通知を表示し、アプリアイコンの数字を増やす）
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// アイコンの数字は、ここに覚えておく（アプリを開くと正しい数に直される）
async function getCount() {
  const c = await caches.open('seishin-meta');
  const r = await c.match('badge-count');
  return r ? (parseInt(await r.text(), 10) || 0) : 0;
}
async function setCount(n) {
  const c = await caches.open('seishin-meta');
  await c.put('badge-count', new Response(String(n)));
}
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'badge') e.waitUntil(setCount(Math.max(0, parseInt(e.data.count, 10) || 0)));
});

self.addEventListener('push', (e) => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (err) { p = { data: { body: e.data ? e.data.text() : '' } }; }
  const d = p.data || p.notification || p || {};
  const title = d.title || '成進館';
  e.waitUntil((async () => {
    const n = (await getCount()) + 1;
    await setCount(n);
    try { if ('setAppBadge' in self.navigator) await self.navigator.setAppBadge(n); } catch (err) {}
    await self.registration.showNotification(title, {
      body: d.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      data: { open: d.open || '' }
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.open) || '';
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if ('focus' in c) {
        await c.focus();
        c.postMessage({ type: 'open', target: target });
        return;
      }
    }
    await self.clients.openWindow('./' + (target ? '?open=' + encodeURIComponent(target) : ''));
  })());
});
