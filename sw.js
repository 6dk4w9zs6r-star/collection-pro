const CACHE='mf-nexa-shell-20260920-r25';
const APP=['./','./index.html','./manifest.webmanifest','./nexa-mf-icon.svg','./app.html','./mf-update-20260916.js','./mf-collaboration-20260916.js','./mf-recovery-20260916.js','./mf-messaging-20260916.js','./mf-loading-20260916.js','./mf-session-20260916.js'];
const SHELL=new Set(APP.map(p=>new URL(p,self.registration.scope).href));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&(k.startsWith('mf-nexa-')||k.startsWith('nexa-mf-'))).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request;
  // Cache only exact, public app-shell URLs. API, signed media and authenticated
  // responses must go to the network so another session cannot reuse them.
  if(r.method!=='GET'||!SHELL.has(r.url)||r.headers.has('authorization'))return;
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(r);
      if(response.ok&&response.type!=='opaque'&&!response.redirected&&!/no-store|private/i.test(response.headers.get('cache-control')||'')){
        await cache.put(r,response.clone());
      }
      return response;
    }catch(error){
      const cached=await cache.match(r);
      if(cached)return cached;
      throw error;
    }
  })());
});
self.addEventListener('push',e=>{let d={};try{d=e.data?.json()||{body:e.data?.text()||''}}catch(_){d={body:e.data?.text()||''}};e.waitUntil(self.registration.showNotification(d.title||'NEXA-MF',{body:d.body||'',data:{url:d.url||'./index.html'},tag:d.tag||'mf-nexa',renotify:true}))});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const base=new URL(self.registration.scope),target=new URL(e.notification.data?.url||'./index.html',base);
  const url=target.origin===base.origin&&target.pathname.startsWith(base.pathname)?target.href:new URL('./index.html',base).href;
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){if(c.url.startsWith(base.href)&&'focus'in c){c.navigate(url);return c.focus()}}
    return clients.openWindow?clients.openWindow(url):null;
  }));
});
