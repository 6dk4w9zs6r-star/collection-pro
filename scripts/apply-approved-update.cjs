const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
let s=fs.readFileSync(path.join(root,'index.html'),'utf8');
const open="${mfAction('↗','فتح الموقع',`mfOpenPartyLocation(${i},'${target}')`,true)}";
if(!s.includes("'إرسال الموقع',`mfSharePartyLocation"))s=s.replace(open,open+"${mfAction('↗','إرسال الموقع',`mfSharePartyLocation(${i},'${target}')`,true)}");
const visitStart=s.lastIndexOf('window.mfSaveVisit=async function(){'),visitEnd=s.indexOf('/* Keep the approved branding',visitStart);
if(visitStart>=0&&visitEnd>visitStart){
 let visit=s.slice(visitStart,visitEnd);
 if(!visit.includes('let persisted=false'))visit=visit.replace('  try{','  let persisted=false;\n  try{').replace('    window.mfGpsCapture=null;', '    persisted=true;window.mfGpsCapture=null;').replace("mfToast(e?.message||'تعذر حفظ الزيارة','bad')", "mfToast(persisted?'تم حفظ الزيارة؛ تعذر تحديث العرض. أعد تحميل البيانات دون إعادة التسجيل':(e?.message||'تعذر حفظ الزيارة'),'bad')");
 s=s.slice(0,visitStart)+visit+s.slice(visitEnd);
}
for(const [start,end] of [['async function holdPayment(', 'async function recordDeferralFee('],['async function recordDeferralFee(', 'const applyBeforeFinal=']]){
  const a=s.indexOf(start),b=s.indexOf(end,a+start.length);if(a<0||b<0)throw Error('Missing payment handler');
  s=s.slice(0,a)+s.slice(a,b).replaceAll('mfTryInsert(', 'mfConfirmedInsert(').replaceAll('mfTryUpdate(', 'mfConfirmedUpdate(')+s.slice(b);
}
// Preserve nulls so missing coordinates never become the real location 0,0.
s=s.replace('lat:Number(x.latitude),lng:Number(x.longitude)','lat:x.latitude,lng:x.longitude');
s=s.replace("x==='all'||x==='ops'||x===role", "x==='all'||(x==='ops'&&['founder','cfmp','bm','als','lo'].includes(role))||x===role");
// Use the same query and RLS filters on every page, not a fixed API row limit.
const paginated="try{for(let offset=0;;offset+=500){const page=await query.order('id',{ascending:true}).range(offset,offset+499);if(page.error)throw page.error;rows.push(...(page.data||[]));if((page.data||[]).length<500)break;}}catch(e){error=e;}";
s=s.replace('let {data:rows,error}=await query;', 'let rows=[],error=null;\n  '+paginated);
s=s.replace("try{rows=await mfFetchAllPages(()=>query.order('id',{ascending:true}));}catch(e){error=e;}",paginated);
if(!s.includes('src="mf-update-20260916.js"'))s=s.replace(/<\/body>\s*<\/html>\s*$/, '<script src="mf-update-20260916.js"></script>\n</body>\n</html>\n');
fs.writeFileSync(path.join(root,'index.html'),s);
// app.html is an alternate published entry point, so keep the same application.
fs.writeFileSync(path.join(root,'app.html'),s);
let sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
sw=sw.replace(/const CACHE='[^']+';/,"const CACHE='mf-nexa-shell-20260916-r1';");
if(!sw.includes("'./mf-update-20260916.js'"))sw=sw.replace("'./nexa-mf-icon.svg'", "'./nexa-mf-icon.svg','./app.html','./mf-update-20260916.js'");
fs.writeFileSync(path.join(root,'sw.js'),sw);
const test=path.join(__dirname,'test-field-late-cache.cjs');
let t=fs.readFileSync(test,'utf8');
if(!t.includes('context.$f='))t=t.replace('context.window=context;', 'context.$f=context.byId;context.st=context.mfState;context.mfNow=()=>"now";context.window=context;');
fs.writeFileSync(test,t);
console.log('Applied approved update to both entry points.');
