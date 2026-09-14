const CACHE='mf-nexa-v5.3.2-20260914';
const APP=['./','./index.html','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))});
self.addEventListener('push',e=>{let d={};try{d=e.data?.json()||{body:e.data?.text()||''}}catch(_){d={body:e.data?.text()||''}};e.waitUntil(self.registration.showNotification(d.title||'NEXA-MF',{body:d.body||'',data:{url:d.url||'./index.html'},tag:d.tag||'mf-nexa',renotify:true}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=e.notification.data?.url||'./index.html';e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus'in c){c.navigate(url);return c.focus()}}return clients.openWindow?clients.openWindow(url):null}))});
