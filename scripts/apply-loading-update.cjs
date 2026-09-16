const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
function replace(before,after){if(html.includes(before))html=html.replace(before,after);else if(!html.includes(after))throw Error('Expected loader code not found: '+before.slice(0,90));}
replace("async function loadTable(c,table,cols='*',limit=1000){const {data,error}=await c.from(table).select(cols).limit(limit);if(error){console.warn('load '+table,error.message);return []}return data||[]}","async function loadTable(c,table,cols='*'){return mfReadOperationalRows(c,table,cols)}");
replace("try{const c=await client();if(!c)return;const [prom,legal,wo,defs,dis,esc,loc,chat,anns,follow]=await Promise.all([", "try{const actor=CURRENT_PROFILE?.id||CURRENT_AUTH_USER?.id,c=await client();if(!c||!actor)throw Error('الاتصال والحساب مطلوبان لتحميل السجلات');const [prom,legal,wo,defs,dis,esc,loc,chat,anns,follow]=await Promise.all([");
replace("    const st=s();\n    st.followups=follow.map", "    if(actor!==(CURRENT_PROFILE?.id||CURRENT_AUTH_USER?.id))throw Error('تغير الحساب أثناء تحميل العمليات');const st=s();\n    st.followups=follow.map");
replace("}catch(e){console.warn('backend state',e?.message||e)}", "}catch(e){console.warn('backend state',e?.message||e);throw e}");
replace('const v=await mfOriginalRoleBootstrap?.apply(this,arguments);mfStage5AfterAuth();return v', 'const v=await mfOriginalRoleBootstrap?.apply(this,arguments);if(CURRENT_PROFILE)await mfStage5AfterAuth();return v');
const start='  let query=sb.from("clients").select("*").limit(5000);',end='  rows=Array.isArray(rows)?rows:[];';
if(html.includes(start)){const a=html.indexOf(start),b=html.indexOf(end,a);if(b<0)throw Error('Client loader end missing');html=html.slice(0,a)+`  const rows=await mfReadOperationalRows(sb,'clients','*',q=>{
    if(CURRENT_PROFILE.role==='lo')return q.eq('assigned_user_id',CURRENT_AUTH_USER.id);
    if(CURRENT_PROFILE.role==='bm'&&CURRENT_PROFILE.branch_code)return q.eq('branch_code',CURRENT_PROFILE.branch_code);
    return q;
  });`+html.slice(b+end.length);}
else if(!html.includes("const rows=await mfReadOperationalRows(sb,'clients'"))throw Error('Client loader not found');
const vehicle="const {data,error}=await db.from('clients').select('id,owns_vehicle,vehicle_mortgaged,vehicle_type,vehicle_model,vehicle_color,vehicle_plate,vehicle_photo_url,driving_license_url,guarantor_owns_vehicle,guarantor_vehicle_mortgaged,guarantor_vehicle_type,guarantor_vehicle_model,guarantor_vehicle_color,guarantor_vehicle_plate,guarantor_vehicle_photo_url,guarantor_driving_license_url');if(error)throw error;";
const columns=vehicle.match(/select\('([^']+)'\)/)[1];
replace(vehicle,`const [data,defs]=await Promise.all([mfReadOperationalRows(db,'clients','${columns}'),mfReadOperationalRows(db,'deferrals')]);`);
replace("const {data:defs,error:de}=await db.from('deferrals').select('*').order('created_at',{ascending:false}).limit(1000);if(!de){", "{");
replace("}catch(e){console.warn('execution patch load',e?.message||e)}};", "}catch(e){console.warn('execution patch load',e?.message||e);throw e}};");
const tag='<script src="./mf-loading-20260916.js"></script>';if(!html.includes(tag))html=html.replace('</body>',tag+'\n</body>');
replace("  const rows=await mfReadOperationalRows(sb,'clients'", "  const loadingActor=CURRENT_PROFILE?.id||CURRENT_AUTH_USER?.id;const rows=await mfReadOperationalRows(sb,'clients'");
replace("  const mapped=rows.map", "  if(loadingActor!==(CURRENT_PROFILE?.id||CURRENT_AUTH_USER?.id))throw Error('تغير الحساب أثناء تحميل العملاء');\n  const mapped=rows.map");
replace("const [data,defs]=await Promise.all([mfReadOperationalRows", "const metadataActor=CURRENT_PROFILE?.id||CURRENT_AUTH_USER?.id;const [data,defs]=await Promise.all([mfReadOperationalRows");
replace("mfReadOperationalRows(db,'deferrals')]);", "mfReadOperationalRows(db,'deferrals')]);if(metadataActor!==(CURRENT_PROFILE?.id||CURRENT_AUTH_USER?.id))throw Error('تغير الحساب أثناء تحميل التفاصيل');");
for(const file of ['index.html','app.html'])fs.writeFileSync(path.join(root,file),html);
let sw=fs.readFileSync(path.join(root,'sw.js'),'utf8').replace('mf-nexa-shell-20260916-r5','mf-nexa-shell-20260916-r6');if(!sw.includes("'./mf-loading-20260916.js'"))sw=sw.replace("'./mf-messaging-20260916.js'","'./mf-messaging-20260916.js','./mf-loading-20260916.js'");fs.writeFileSync(path.join(root,'sw.js'),sw);
const test=path.join(root,'scripts/test-browser-update.cjs');fs.writeFileSync(test,fs.readFileSync(test,'utf8').replace('2026-09-16-r5','2026-09-16-r6'));
console.log('Operational loading update installed.');
