# MF-NEXA CHECKPOINT

> نقطة الاستئناف الرسمية لمشروع MF-NEXA. الهدف: عدم إعادة أي عمل منجز عند انقطاع جلسة أو أداة.

## المستودع
- Repository: `6dk4w9zs6r-star/collection-pro`
- Branch: `main`
- تاريخ إنشاء نقطة الاستئناف: 2026-09-18

## آخر إصدار تطبيقي مؤكد
- Application commit: `f82463f3fd3f88f1d7616f165ed504ac6ac9b249`
- Release marker: `2026-09-17-r11`
- r11 يحمي القراءات متعددة الصفحات والتقاط GPS المتأخر من تغيّر الحساب/جيل الجلسة.

## فحص ما قبل الاستكمال — 2026-09-18
تمت قراءة GitHub وSupabase مباشرة بدون Work وبدون أي كتابة على بيانات التشغيل.

### GitHub
- r8: عزل عرض الحساب، التحميل الموثوق من المصدر التشغيلي، مسح العرض عند الخروج/تبديل الحساب، وحماية الجدولة لكل حساب.
- r9: مطابقة التقارير ونسب الدفعات والموظفين، قائمة المسددين من الدفعات الناجحة، وتوحيد Late على 30–60 يوم.
- r10: تحميل كامل للمتابعات بالصفحات، fail-closed bootstrap، حماية جيل الجلسة، وإبطال اشتراك المحادثة القديم.
- r11: حماية عامة للقراءات متعددة الصفحات وGPS المتأخر.
- سجل r11 يثبت 261 اختبارًا محليًا/سلوكيًا مع fixtures للكمبيوتر والهاتف، لكنه لا يثبت E2E إنتاجيًا بحسابات حقيقية.

### Supabase
- المشروع: `MD-COLLECTION` / `thfnitjiiwdsbwcunlbs`، والحالة ACTIVE_HEALTHY وقت الفحص.
- جداول المرحلة الخامسة الأساسية موجودة وRLS مفعّل عليها، ومنها clients, profiles, follow_ups, promises_to_pay, escalated_cases, field_visits, audit_log, payments, late_due, legal_cases, write_offs, locations, messages/chat, calls, notifications, notes, consent.
- قاعدة البيانات الحالية لا تمثل حتى الآن مصدر العملاء الرسمي الكامل: clients=2 فقط وقت الفحص؛ لذلك لا يجوز إعلان اكتمال بيانات الإنتاج.
- migrations الخاصة بالمرحلة الخامسة والأمان موجودة حتى `private_active_contact_lookup`.
- Edge Function `mf-nexa-ai` ACTIVE version 4. إعداد المنصة `verify_jwt=false`، لكن الكود نفسه يتحقق من Bearer token عبر Supabase Auth ثم يتحقق من profile نشط قبل الوصول للبيانات. يلزم اختبار/قرار أمني قبل تغيير الإعداد حتى لا نكسر المسار الحالي.
- Security Advisor ما زال يرصد 4 دوال SECURITY DEFINER قابلة للاستدعاء من authenticated: `can_access_client`, `can_legal_access_client`, `can_manage_announcement_scope`, `is_founder`. لم يتم سحب EXECUTE عشوائيًا لأن هذه helpers قد تكون مستخدمة داخل RLS؛ يجب فحص اعتماد السياسات أولًا ثم إصلاحها دون كسر الصلاحيات.

### Base44
- لم تتم المطابقة الفعلية بعد. Plugin الرسمي موجود في ChatGPT لكن الاتصال الفعلي بالحساب/المشروع لم يصبح متاحًا للأدوات في هذه الجلسة.
- هذا العائق لا يوقف الأعمال المستقلة على GitHub/Supabase، ولا يجوز الادعاء بأن Base44 مطابق قبل قراءته فعليًا.

## بوابات القبول المفتوحة
- مطابقة Base44 مع GitHub/Supabase.
- تحديد واعتماد مصدر بيانات العملاء الكامل ومطابقته.
- E2E مصادق عليه لكل الأدوار المطلوبة وعلى أجهزة فعلية.
- Late/Due + Payments + Write-off + Follow-ups/Today + Promise + Escalation + Timeline/Audit كمسار إنتاج كامل.
- اختبار GPS فعلي ومشاركة الموقع.
- Realtime/chat/attachments/calling/media/notifications الفعلية.
- مراجعة Security Advisor وإغلاق/قبول البنود المتبقية دون كسر RLS.
- Backup/Restore كامل يشمل DB/Auth/Storage/config واختبار استعادة موثق.
- فحص الهوية والتصميم والبحث/Allocation/حاسبة القرض/الاسم الذكي والوظائف المعتمدة على النسخة المنشورة.
- الإغلاق النهائي للمرحلة الخامسة فقط بعد الأدلة السابقة.

## نقطة الاستئناف التالية
1. لا تعيد فحص r8-r11 من الصفر.
2. افحص اعتماد RLS على الدوال الأربع قبل أي migration أمني.
3. أكمل كل فحص/إصلاح مستقل يمكن تنفيذه بدون Base44.
4. عند توفر Base44، نفذ المطابقة الثلاثية قبل اعتماد النسخة النهائية.
5. بعد كل تغيير ناجح: اختبار → Commit → تحديث هذا الملف.

## قواعد ثابتة
- بدون Work.
- لا إعادة بناء من الصفر.
- لا حذف بيانات أو reset أو history rewrite.
- لا اعتبار mock/local مساويًا لـ production E2E.
- لا اعتبار بيانات Supabase الحالية مصدر العملاء الكامل دون اعتماد المصدر الرسمي.
- كل تغيير صغير، قابل للتتبع، ومحفوظ قبل الانتقال لما بعده.


## تنفيذ أمني — 2026-09-18
- تم فحص اعتماد سياسات RLS على الدوال الأربع قبل أي تغيير.
- ثبت أن الدوال `can_access_client` و`can_legal_access_client` و`can_manage_announcement_scope` و`is_founder` مستخدمة كـRLS helpers، وأن المشكلة هي إمكانية استدعائها مباشرة كـRPC من authenticated.
- طُبقت migration: `revoke_direct_rpc_execute_from_rls_helpers_20260918`.
- تم سحب EXECUTE المباشر من authenticated للدوال الأربع مع إبقائها كـRLS helpers.
- تحقق ما بعد التنفيذ: `authenticated_execute=false` للدوال الأربع.
- Security Advisor بعد التنفيذ لم يعد يعرض تحذيرات SECURITY DEFINER الأربعة.
- التحذير الأمني المتبقي: Leaked Password Protection Disabled، وهو إعداد Auth وليس تعديل بيانات تشغيل.
- لم يتم حذف أو reset أو تعديل بيانات العملاء.


## تحسين RLS للأداء — 2026-09-18
- فُحص Performance Advisor بعد الإغلاق الأمني.
- عولجت تحذيرات auth_rls_initplan الثلاثة المتبقية في سياسات payments باستبدال استدعاءات auth.uid المباشرة داخل السياسات باستدعاء initplan ثابت `(select auth.uid())` مع الحفاظ على نفس شروط النطاق.
- migration: `optimize_remaining_payment_auth_rls_initplans_20260918`.
- إعادة فحص Performance Advisor: تحذيرات auth_rls_initplan اختفت. بقيت معلومات unused indexes فقط؛ لم تُحذف الفهارس لأن قاعدة البيانات الحالية صغيرة ولا تكفي لإثبات عدم الحاجة إليها في حجم الإنتاج.
- فحص الأدوار الحالية: founder=1, bm=1, lo=5. لا توجد حاليًا حسابات ALS/CFMP/Department Manager مستقلة مثبتة في profiles، لذلك E2E لهذه الأدوار لا يمكن ادعاء نجاحه حتى تتوفر حسابات معتمدة.
- snapshot تشغيلي للعد فقط: clients=2, successful payments=1, followups=2, late_due=3, audit rows=110, consents=1. لا يُعامل كمصدر العملاء الرسمي.
