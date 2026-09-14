const CACHE='mf-nexa-v5.3.1-20260914';
const HOTFIX='./mf-nexa-runtime-fix-20260914.js';
const APP=['./','./index.html','./manifest.webmanifest',HOTFIX];

function isHtmlRequest(req){
  try{
    const u=new URL(req.url);
    return req.mode==='navigate'||u.pathname.endsWith('/')||u.pathname.endsWith('/index.html');
  }catch(_){return false}
}

async function injectRuntimeFix(response){
  if(!response||!isHtmlResponse(response))return response;
  try{
    const text=await response.text();
    if(text.includes('mf-nexa-runtime-fix-20260914.js'))return new Response(text,{status:response.status,statusText:response.statusText,headers:response.headers});
    const tag='<script src="./mf-nexa-runtime-fix-20260914.js?v=20260914-1"></script>';
    const patched=text.includes('</body>')?text.replace('</body>',tag+'\n</body>'):text+tag;
    const headers=new Headers(response.headers);headers.set('content-type','text/html; charset=utf-8');
    return new Response(patched,{status:response.status,statusText:response.statusText,headers});
  }catch(_){return response}
}
function isHtmlResponse(response){
  const ct=response.headers.get('content-type')||'';
  return ct.includes('text/html');
}

self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith((async()=>{
    try{
      let r=await fetch(e.request);
      if(isHtmlRequest(e.request))r=await injectRuntimeFix(r);
      const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
      return r;
    }catch(_){
      let r=await caches.match(e.request);
      if(!r)r=await caches.match('./index.html');
      if(r&&isHtmlRequest(e.request))r=await injectRuntimeFix(r);
      return r;
    }
  })());
});
self.addEventListener('push',e=>{let d={};try{d=e.data?.json()||{body:e.data?.text()||''}}catch(_){d={body:e.data?.text()||''}};e.waitUntil(self.registration.showNotification(d.title||'NEXA-MF',{body:d.body||'',data:{url:d.url||'./index.html'},tag:d.tag||'mf-nexa',renotify:true}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=e.notification.data?.url||'./index.html';e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus'in c){c.navigate(url);return c.focus()}}return clients.openWindow?clients.openWindow(url):null}))});
