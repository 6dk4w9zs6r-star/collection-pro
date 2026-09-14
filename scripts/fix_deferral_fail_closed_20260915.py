from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
old="""    const db=await getSecureClient();let row=null;
    if(db){const r=await db.from('deferrals').insert({client_id:c.id,old_due_date:oldDate,new_due_date:newDate,reason,deferral_count:1,installment_count:count,deferral_fee:fee,status:'pending',requested_by:CURRENT_AUTH_USER?.id||CURRENT_PROFILE?.id}).select().single();if(r.error)throw r.error;row=r.data}
    const entry={id:String(row?.id||mfId()),dbId:row?.id,kind:'Deferral'"""
new="""    const db=await getSecureClient();if(!db)throw new Error('قاعدة البيانات غير متاحة');
    const r=await db.from('deferrals').insert({client_id:c.id,old_due_date:oldDate,new_due_date:newDate,reason,deferral_count:1,installment_count:count,deferral_fee:fee,status:'pending',requested_by:CURRENT_AUTH_USER?.id||CURRENT_PROFILE?.id}).select().single();if(r.error)throw r.error;const row=r.data;
    const entry={id:String(row?.id||mfId()),dbId:row?.id,kind:'Deferral'"""
if old not in s:
    raise SystemExit('active deferral fallback block not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

log=Path('MF-NEXA_FIX_LOG.md')
b=log.read_text(encoding='utf-8')
e="""

## 2026-09-15 — Full Audit: Deferral fail-closed persistence
- Issue: the final Deferral UI override could create a local pending deferral when the secure Supabase client was unavailable, displaying success for a record that was never persisted.
- Root Cause: the handler treated a missing DB client as an offline/local fallback and generated a local id.
- Fix: Deferral now requires the secure Supabase client and a successful `deferrals` insert before mutating local state or showing success.
- Files: `index.html`.
- Status: Retest Required until deployed source is verified.
"""
if '## 2026-09-15 — Full Audit: Deferral fail-closed persistence' not in b:
    log.write_text(b+e,encoding='utf-8')
