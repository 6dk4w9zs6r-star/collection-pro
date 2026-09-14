from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')
marker='NEXA_SOURCE_FIX_20260914_V2'

if marker not in s:
    anchor='function mfOpenAllocation(mode){'
    if anchor not in s: raise SystemExit('Allocation anchor not found')
    helpers='''\n// NEXA_SOURCE_FIX_20260914_V2 — canonical Late classification helpers.\nfunction mfLateDaysValue(c){return Math.max(num(c?.lateDays),num(c?.dueLateDays))}\nfunction mfFlagTrue(v){return v===true||v===1||String(v||'').toLowerCase()==='true'||String(v||'')==='1'}\nfunction mfIsLate(c){return !!c&&(mfFlagTrue(c.inLate)||mfLateDaysValue(c)>=30)}\nfunction mfIsLate30to60(c){const d=mfLateDaysValue(c);return d>=30&&d<=60}\n\n'''
    s=s.replace(anchor,helpers+anchor,1)

old='function mfAllocationRows(){return (clients||[]).filter(c=>(mfAllocation.mode==="late"?c.inLate:c.inDue)&&(!mfAllocation.branch||(c.branchCode||c.branch)===mfAllocation.branch)&&(!mfAllocation.team||(c.team||"غير محدد")===mfAllocation.team)&&(!mfAllocation.employee||c.employee===mfAllocation.employee))}'
new='function mfAllocationRows(){return (clients||[]).filter(c=>(mfAllocation.mode==="late"?mfIsLate30to60(c):c.inDue)&&(!mfAllocation.branch||(c.branchCode||c.branch)===mfAllocation.branch)&&(!mfAllocation.team||(c.team||"غير محدد")===mfAllocation.team)&&(!mfAllocation.employee||c.employee===mfAllocation.employee))}'
if old in s:s=s.replace(old,new,1)
elif new not in s:raise SystemExit('Allocation rows source mismatch')

old='const out=$("mfAllocationBody");if(!out)return;const r=mfRole(),all=(clients||[]).filter(c=>mfAllocation.mode==="late"?c.inLate:c.inDue);let rows=mfAllocationRows();'
new='const out=$("mfAllocationBody");if(!out)return;const r=mfRole(),all=(clients||[]).filter(c=>mfAllocation.mode==="late"?mfIsLate30to60(c):c.inDue);let rows=mfAllocationRows();'
if old in s:s=s.replace(old,new,1)
elif new not in s:raise SystemExit('Allocation render source mismatch')

s=s.replace('if(type==="late")return scope.filter(c=>c.inLate).map(','if(type==="late")return scope.filter(c=>mfIsLate(c)).map(',1)

m=re.search(r'(<script id="mfNexaSmartSearchAuditFix_20260914">)([\s\S]*?)(</script>)',s)
if not m:raise SystemExit('Smart Search block not found')
b=m.group(2)
b=b.replace('Array.isArray(window.clients)','Array.isArray(clients)')
b=b.replace('window.clients.some','clients.some')
b=b.replace('(window.clients||[])','(clients||[])')
b=b.replace('window.clients?.[window.mfActiveClientIndex]','clients?.[mfActiveClientIndex]')
b=b.replace('window.mfActiveClientIndex','mfActiveClientIndex')
b=b.replace('(!window.mfInScope||mfInScope(active))',"(typeof mfInScope!=='function'||mfInScope(active))")
b=b.replace('late=scope.filter(c=>c.inLate)','late=scope.filter(c=>mfIsLate(c))')
b=b.replace('late:active.inLate','late:mfIsLate(active)')
b=b.replace("const matches=(clients||[]).filter(c=>[c.name","const matches=(clients||[]).filter(c=>(typeof mfInScope!=='function'||mfInScope(c))&&[c.name",1)

op="""function operational(prompt){
  const q=nrm(prompt);if(!q)return false;
  const keys=['late','due','عميل','العميل','كفيل','الكفيل','قسط','دفعة','دفع','تحصيل','متأخر','تأخير','وعد','promise','متابعة','follow','زيارة','visit','تصعيد','escalat','legal','محامي','شطب','write off','r-o','allocation','محفظة','portfolio','موظف','فريق','فرع','اداء','أداء','ترتيب','رسالة','واتس','whatsapp','sms','blunet','تقرير','report'];
  return keys.some(k=>q.includes(nrm(k)))||clientMatch(prompt);
}"""
if 'function portfolioIntent(prompt)' not in b:
    if op not in b:raise SystemExit('Operational classifier source mismatch')
    b=b.replace(op,op+"""
function portfolioIntent(prompt){
  const q=nrm(prompt);
  const keys=['late','due','allocation','محفظة','portfolio','متأخر','تأخير','استحقاق','أولوية','اولوية','ترتيب','اداء','أداء','تقرير','report'];
  return keys.some(k=>q.includes(nrm(k)));
}""",1)

old_general="""async function generalBackend(prompt,out){
  try{
    const c=await getSecureClient();if(!c?.functions?.invoke)return false;
    const {data,error}=await c.functions.invoke('mf-nexa-ai',{body:{prompt:String(prompt),mode:'general_qa',source:'smart_search',client:null,summary:null}});
    const answer=data?.answer||data?.message;if(!error&&answer){out.textContent=String(answer);return true}
  }catch(_){ }
  return false;
}"""
new_general="""async function generalBackend(prompt,out){
  try{
    const c=await getSecureClient();if(!c?.functions?.invoke)return false;
    const ask=async(prefix='')=>c.functions.invoke('mf-nexa-ai',{body:{prompt:(prefix||'')+String(prompt),mode:'general_qa',source:'smart_search',client:null,summary:null,force_general:true}});
    let {data,error}=await ask('أجب عن السؤال التالي كسؤال معرفة عامة فقط، ولا تعرض أي ملخص للعملاء أو المحفظة: ');
    let answer=data?.answer||data?.message;
    const leaked=x=>/ملخص\s*(?:نطاق|المحفظة)|العملاء\s*[:：]\s*\d+|(?:Late|Due)\s*[:：]\s*\d+/i.test(String(x||''));
    if(!error&&answer&&!leaked(answer)){out.textContent=String(answer);return true}
    ({data,error}=await ask('هذا سؤال عام وليس طلب بيانات تشغيلية. أجب فقط عن المعرفة العامة: '));
    answer=data?.answer||data?.message;if(!error&&answer&&!leaked(answer)){out.textContent=String(answer);return true}
  }catch(_){ }
  return false;
}"""
if old_general in b:b=b.replace(old_general,new_general,1)
elif 'force_general:true' not in b:raise SystemExit('General backend source mismatch')

old_summary="""else answer=`ملخص المحفظة ضمن صلاحيتك:\
• العملاء: ${scope.length}\
• Late: ${late.length}\
• Due: ${due.length}\
• أولوية عالية: ${high.length}`;"""
new_summary="""else if(portfolioIntent(prompt))answer=`ملخص المحفظة ضمن صلاحيتك:\
• العملاء: ${scope.length}\
• Late: ${late.length}\
• Due: ${due.length}\
• أولوية عالية: ${high.length}`;
    else {
      out.textContent='جاري معالجة السؤال العام…';
      const ok=await generalBackend(prompt,out);
      if(!ok)out.textContent='تعذر الحصول على إجابة عامة الآن. لم يتم تحويل سؤالك إلى بيانات العملاء.';
      try{mfAudit?.('ai_general_question',null,prompt.slice(0,250))}catch(_){}
      return;
    }"""
if old_summary in b:b=b.replace(old_summary,new_summary,1)
elif 'else if(portfolioIntent(prompt))answer=' not in b:raise SystemExit('Smart Search fallback source mismatch')

s=s[:m.start(2)]+b+s[m.end(2):]
p.write_text(s,encoding='utf-8')

checks=['function mfIsLate30to60(c)','mfAllocation.mode==="late"?mfIsLate30to60(c):c.inDue','function portfolioIntent(prompt)','force_general:true','scope=(clients||[]).filter','late=scope.filter(c=>mfIsLate(c))']
missing=[x for x in checks if x not in s]
if missing:raise SystemExit('Missing checks: '+repr(missing))

Path('sw.js').write_text("""const CACHE='mf-nexa-v5.3.2-20260914';
const APP=['./','./index.html','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))});
self.addEventListener('push',e=>{let d={};try{d=e.data?.json()||{body:e.data?.text()||''}}catch(_){d={body:e.data?.text()||''}};e.waitUntil(self.registration.showNotification(d.title||'NEXA-MF',{body:d.body||'',data:{url:d.url||'./index.html'},tag:d.tag||'mf-nexa',renotify:true}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=e.notification.data?.url||'./index.html';e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus'in c){c.navigate(url);return c.focus()}}return clients.openWindow?clients.openWindow(url):null}))});
""",encoding='utf-8')
Path('mf-nexa-runtime-fix-20260914.js').unlink(missing_ok=True)

log=Path('MF-NEXA_FIX_LOG.md')
entry='''\n\n## 2026-09-14 — Direct source correction (Allocation Late + Smart Search)\n- Issue: TEST RAWAN has 40 late days but was absent from Allocation → Late 30–60.\n- Root cause: Allocation filtered on stored `inLate` instead of the actual late-day range displayed by the client profile.\n- Fix: `index.html` uses canonical late-day helpers; Allocation Late 30–60 is driven by 30–60 days directly without changing balances, ownership, payment history, or test data.\n- Issue: Smart Search used `window.clients` instead of the lexical client array and could return a portfolio summary for a general question.\n- Root cause: wrong state binding plus unsafe fallback; General QA responses were not guarded against portfolio-summary leakage.\n- Fix: Smart Search reads `clients`, enforces `mfInScope`, uses canonical Late classification, routes ambiguous requests to General QA, and rejects/retries operational-summary leakage.\n- Removed: service-worker runtime injection and `mf-nexa-runtime-fix-20260914.js`.\n- Files: `index.html`, `sw.js`, `MF-NEXA_FIX_LOG.md`.\n- Test: Allocation Late 30–60 must show TEST RAWAN under Rawan KHALED; general search must not return portfolio counts; operational search must show real permission-scoped counts.\n- Status: Retest Required.\n'''
text=log.read_text(encoding='utf-8') if log.exists() else '# MF-NEXA Fix Log\n'
if 'Direct source correction (Allocation Late + Smart Search)' not in text:log.write_text(text+entry,encoding='utf-8')
