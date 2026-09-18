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


## فحص وظائف الواجهة — 2026-09-18
- تمت قراءة المصدر النشط `app.html` من main بدل الاعتماد على أسماء الملفات القديمة/redirects.
- البحث الصوتي موجود فعليًا عبر Web Speech API (`SpeechRecognition/webkitSpeechRecognition`) ومضبوط على `ar-JO` ويغذي بحث العميل.
- حاسبة القرض الحالية تستخدم فائدة شهرية ثابتة: interest = principal × monthly_rate × months، total = principal + interest، payment = total / months. لا توجد قيمة ثابتة 3 داخل معادلة القرض؛ الرقم 3 الظاهر في الواجهة موجود فقط كمثال للحاسبة السريعة `(250 + 40) * 3`. لذلك لا يُعد خلل الحاسبة مغلقًا قبل مطابقة المقصود القديم بالقيمة 3 مع المتطلب المعتمد.
- سجل التنفيذ السابق يؤكد أن Client page/search/contact/voice search موجودة، وأن الإغلاق المتبقي لها اختبار browser مصادق عليه.
- لم يتم تعديل الواجهة في هذه الوحدة لأن الفحص لم يثبت خللًا آمنًا يمكن إصلاحه دون معرفة المقصود الدقيق من متطلب القيمة 3.


## تصحيح الصفحة الرئيسية — 2026-09-18
- ثبت من المصدر النشط أن بطاقات Today / Pending Promises / Escalated Cases كانت ما تزال ظاهرة على الصفحة الرئيسية رغم المتطلب المعتمد بإخفائها من Home وإبقائها داخليًا.
- تم أصغر تعديل ممكن في `app.html`: إخفاء العدادات الثلاثة من Home مع إبقاء عناصر العد الداخلية و`mfOpenToday` ووظائف Promise/Escalation قائمة، حتى لا تنكسر تحديثات العد أو الوظائف الداخلية.
- application commit: `0b33671892b08157e4aecb92a205365412afadd8`.
- تحقق المصدر بعد commit: Home buttons القديمة غير موجودة، العدادات الداخلية ما زالت موجودة، ووظيفة Today الداخلية ما زالت موجودة.


## تصحيح الهوية الداخلية — 2026-09-18
- طُبق المتطلب المعتمد بإزالة اسم NEXA-MF من مواضع الواجهة التشغيلية الداخلية المحددة دون تغيير مفاتيح التخزين أو أسماء الـAPI أو metadata التقنية اللازمة للتوافق.
- استبدلت هوية الهيدر والقائمة والـhero/footer والبطاقة الداخلية باسم Microfinance Department / دائرة التمويل الصغير وUNRWA، وتغير عنوان نافذة About إلى «عن النظام».
- لم يُمس اسم التطبيق الخارجي في title/manifest/login لأن المتطلب هو عدم ظهوره داخليًا بالمواقع المطلوب إزالتها منها، وليس كسر هوية التطبيق الخارجية أو مفاتيحه التقنية.
- application commit: `c57d32eef15a976af6e75ebb092e07ee53b6b70f`.
- تحقق المصدر: أنماط العرض الداخلية الستة المستهدفة لم تعد تحتوي NEXA-MF.


## مطابقة Late/Payments التشغيلية — 2026-09-18
- فُحص schema الفعلي بدل افتراض أسماء أعمدة: late_due يستخدم `case_type/days_overdue/remaining_amount`.
- snapshot read-only: حالتا Late الموجودتان كلتاهما ضمن 30–60 وبرصيد متبقٍ موجب؛ لا توجد حالة Late خارج النطاق في البيانات الحالية.
- الدفعة الناجحة الوحيدة مرتبطة بعميل؛ لا توجد successful unmatched في العينة الحالية.
- promises/escalations لا تحتوي سجلات حاليًا، لذلك لا يجوز تحويل غياب البيانات إلى ادعاء E2E.
- كود الواجهة النشط يستخدم `mfIsLate30to60` بشرط 30<=days<=60 ومبلغ متأخر>0، وتقارير التحصيل تجمع status=successful وتستبعد deferral_fee.
- لا تعديل بيانات في هذه الوحدة.


## إصلاح حفظ Escalation — 2026-09-18
- كشف فحص المصدر أن مسار التصعيد النهائي كان يضيف الحالة إلى local state فقط رغم وجود جدول `escalated_cases` وRLS فعليين في Supabase؛ هذا كان خطر فقدان التصعيد بعد reload.
- تم تحويل `mfSaveEscalationFinal` إلى DB-first: يحفظ كل target في `escalated_cases`، ينتظر `insert().select().single()` المؤكد، ثم فقط يضيف السجل المؤكد إلى local state.
- ملكية العميل لم تُعدّل إطلاقًا؛ payload لا يغير `clients.assigned_user_id`.
- عند فشل DB لا يُنشأ local escalation وهمي.
- التطبيق commit: `78c1156be60e00c2b3eabfa18f990b31f107867a`.
- التحقق الساكن بعد commit يؤكد أن local push يأتي بعد DB confirmation.
- بقي E2E الحقيقي للتصعيد مفتوحًا لأن قاعدة الإنتاج الحالية لا تحتوي حساب ALS مستقل معتمد.


## إصلاح دوام حالات Promise to Pay — 2026-09-18
- تم إلغاء التحويل local-only للوعد المنتهي من Pending إلى Broken.
- `mfAutoStates` أصبح DB-first: لا يغيّر الحالة محليًا إلا بعد نجاح تحديث `promises_to_pay` المؤكد، ويتجاهل السجل غير المؤكد بدل خلق اختلاف بين الجهاز والقاعدة.
- `mfUpdatePromise` أصبح async وDB-first للحالات Pending/Kept/Broken مع فحص الصلاحية؛ فشل DB لا يغيّر local state.
- Schema الفعلي يدعم status/payment_date/paid_amount/updated_by/updated_at.
- التطبيق commit: `3840bc6cc7a767c1b4033914ba19b075fc7011e9`.
- بقي ربط Kept تلقائيًا بالدفعة الناجحة بحاجة إغلاق مستقل؛ مسار الدفع الحالي يحدّث الوعد محليًا فقط ولا يكفي كدليل دوام.


## ربط Promise بالدفعة الناجحة — 2026-09-18
- أضيف trigger DB فعلي `trg_link_successful_payment_to_promises` على payments INSERT/UPDATE بعد الترحيل.
- الدفعة Successful المؤكدة والمربوطة بعميل تحوّل الوعد Pending المؤهل إلى Kept في Supabase، وتحفظ payment_date وpaid_amount وupdated_by.
- trigger يعتمد `posted_at`، لذلك لا يعتبر Pending أو دفعة غير مُرحّلة وفاءً للوعد.
- الواجهة لم تعد تقلب الوعد محليًا فقط؛ تحاول مزامنة سجل promise المؤكد DB-first وتحفظ معرف الدفعة المؤكدة.
- migration: `link_successful_payments_to_promises_20260918`.
- التطبيق commit: `84009bacb86141813cf4b8088c7d451880cb499a`.
- لا توجد promises تشغيلية حاليًا، لذلك لم يُنشأ وعد وهمي لاختبار الإنتاج.


## Security follow-up للـ Promise trigger
- بعد إنشاء helper ظهر تحذيرا direct EXECUTE لـ anon/authenticated.
- تم revoke EXECUTE من public/anon/authenticated والإبقاء على تشغيله كـ trigger فقط؛ migration `revoke_direct_execute_payment_promise_trigger_helper_20260918`.
- Security Advisor أعيد تشغيله بعد الإصلاح.


## Escalation recipient resolution — 2026-09-18
- تم إغلاق خطر إنشاء تصعيد دائم بـ `to_employee_id=null`.
- قبل INSERT أصبح التطبيق يحل المستلم الفعلي من `employees`: ALS/Supervisor عبر supervisor_employee_id أو دور الفرع، وBM عبر branch_manager/bm لنفس الفرع.
- عند غياب/تعدد مستلم صالح يفشل التصعيد قبل إنشاء سجل غير مرئي، بدل حفظ تصعيد بلا مستلم.
- `to_employee_id` واسم المستلم يحفظان مع السجل، وملكية العميل لا تتغير.
- التطبيق commit: `54697c37a5a32c034b8976858cbb17893a85a8c6`.
- بيانات الإنتاج الحالية: يوجد Branch Manager واحد فعّال B1؛ لا يوجد موظف بدور ALS/Supervisor مستقل حاليًا، لذلك مسار ALS سيبقى fail-closed حتى إضافة الحساب/التعيين المعتمد، ولا يتم اختلاق حساب اختبار.


## مزامنة deployment entrypoint — 2026-09-18
- ثبت أن `index.html` كان أقدم من `app.html` ومختلفًا عنه، بينما index هو entrypoint الطبيعي للنشر الثابت؛ هذا يفسر احتمال ظهور نسخة أقدم رغم وجود الإصلاحات في app.
- تمت مزامنة `index.html` حرفيًا مع المصدر النشط `app.html` بعد الإصلاحات الحالية، دون إعادة بناء أو حذف وظائف.
- بعد commit أصبح content SHA للملفين واحدًا: `6b0a9dbcde08f56a377034dfc9a71f398f3919be`.
- commit: `a31e55f3fb3cf06e4cba5b08ac9329e2c586a576`.
- workflow القديم `nexa-source-fix-20260914.yml` لا يعمل على تغييرات app/index؛ trigger الخاص به محصور بتغيير ملف workflow نفسه، لذلك لم يُستخدم كدليل نشر.
- تحقق endpoint المنشور فعليًا يبقى gate منفصلًا عن تطابق source داخل GitHub.


## الاسم الذكي / activation gate — 2026-09-18
- المصدر النشط كان يفتح البحث الذكي مباشرة لكل مستخدم مصادق، وهذا يخالف المتطلب المعتمد بأن يظهر «لم يُفعل بعد» وأن التفعيل يحتاج إذنًا إداريًا.
- أضيف fail-closed gate: لا يفتح الاسم الذكي إلا إذا كان profile يحمل أحد أعلام التفعيل المعتمدة الموجودة عند الدمج (`smart_assistant_enabled/ai_enabled/smart_search_enabled`).
- عند عدم التفعيل تظهر واجهة «الاسم الذكي — لم يُفعل بعد» مع «لا، فعّله لاحقًا» وبيان أن التفعيل يحتاج صلاحية إدارية.
- لم تُمنح صلاحية AI لأي حساب تلقائيًا ولم تُختلق قيمة تفعيل في الإنتاج.
- app commit: `08c9d3b080a5e2a5d6caa061e69da8603636a130`.
- index synced commit: `6bf33a969d07f2dca2ce6113a95989dff143f57a`; app/index content SHA متطابق `ed0e0cc30ba052d8d504a9f7c00a408fff0aa40c`.
- بقي مسار إدارة flag نفسه بحاجة مطابقة schema/permissions قبل توفير زر تفعيل إداري؛ لا يتم تجاوز ذلك محليًا.
