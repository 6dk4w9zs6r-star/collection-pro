from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

old='''    const days=num(c.days_overdue);\n    const paid=num(c.paid_amount);\n    const active=paid<=0;\n    const inDue=active && days>0;\n    const inLate=active && days>=30 && days<=60;'''
new='''    const days=num(c.days_overdue);\n    const inDue=days>0;\n    const inLate=days>=30 && days<=60;'''
if old not in s:
    raise SystemExit('client mapper active-state block not found')
s=s.replace(old,new,1)

s=s.replace('const active=rows.filter(c=>num(c.paid_amount)<=0);\n  const late=active.filter(c=>num(c.days_overdue)>=30&&num(c.days_overdue)<=60).length;\n  const due=active.filter(c=>num(c.days_overdue)>0).length;',
'''const late=rows.filter(c=>num(c.days_overdue)>=30&&num(c.days_overdue)<=60).length;\n  const due=rows.filter(c=>num(c.days_overdue)>0).length;''',1)
s=s.replace('const ml=mine.filter(c=>num(c.paid_amount)<=0&&num(c.days_overdue)>=30&&num(c.days_overdue)<=60).length;\n    const md=mine.filter(c=>num(c.paid_amount)<=0&&num(c.days_overdue)>0).length;',
'''const ml=mine.filter(c=>num(c.days_overdue)>=30&&num(c.days_overdue)<=60).length;\n    const md=mine.filter(c=>num(c.days_overdue)>0).length;''',1)

marker='NEXA_LATE_ACTIVE_FIX_20260914'
if marker not in s:
    s=s.replace('// NEXA_SOURCE_FIX_20260914_V2 — canonical Late classification helpers.', '// NEXA_LATE_ACTIVE_FIX_20260914\n// NEXA_SOURCE_FIX_20260914_V2 — canonical Late classification helpers.',1)

p.write_text(s,encoding='utf-8')

log=Path('MF-NEXA_FIX_LOG.md')
t=log.read_text(encoding='utf-8')
entry='''\n\n## 2026-09-14 — Late eligibility active-state correction\n- Issue: TEST RAWAN had 40 overdue days but was still excluded from the loaded Late set because `paid_amount > 0` was incorrectly treated as fully inactive.\n- Root cause: client bootstrap computed `active = paid_amount <= 0`; a partial payment therefore removed a still-overdue client from Late/Due.\n- Fix: Late/Due eligibility now follows overdue days directly; partial payment no longer removes a client that still has overdue days. Branch Late/Due counters use the same rule.\n- Data changed: none. TEST RAWAN remains unchanged.\n- Files: `index.html`, `MF-NEXA_FIX_LOG.md`.\n- Status: Retest Required.\n'''
if 'Late eligibility active-state correction' not in t:
    log.write_text(t+entry,encoding='utf-8')
