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


## Smart assistant protected admin flag — 2026-09-18
- schema لم يكن يحتوي أي flag فعلي لتفعيل الاسم الذكي؛ لذلك تم إنشاء `profiles.smart_assistant_enabled boolean not null default false`.
- migration: `add_admin_controlled_smart_assistant_flag_20260918`.
- trigger `trg_protect_profile_admin_fields` يمنع أي مستخدم غير Founder من تغيير flag حتى لو كان يملك UPDATE على profile الخاص به؛ helper غير قابل للاستدعاء مباشرة من anon/authenticated.
- جميع profiles السبعة الحالية بقيت false؛ لم يُفعّل AI لأي حساب تلقائيًا.
- الواجهة أصبحت تعتمد فقط `CURRENT_PROFILE.smart_assistant_enabled===true` بدل flags افتراضية غير موجودة.
- app commit: `d2deea7dd0366030e4b9669108b71cd510d02e30`.
- index synced commit: `b954f2b88ae95a1af4e68770a683bcaf237475ec`.


## Performance / Ranking successful-payment integrity — 2026-09-18
- فحص المصدر أثبت أن إجمالي التحصيل نفسه كان يستخدم `mfCollectionTotal` الذي يستبعد غير Successful، لكن قائمة payments الداخلة لمؤشر الموظف لم تكن مصفاة مسبقًا، كما أن تقرير Payments كان يعرض كل الحالات.
- تم جعل `mfEmployeeMetrics` يمرر فقط `mfCollectedPayments`، وبالتالي Pending/Failed/Cancelled وdeferral_fee لا تدخل التحصيل أو الأداء.
- تقرير Payments التشغيلي أصبح يعرض الدفعات Successful فقط وفق تعريف التحصيل المعتمد؛ history الخام يبقى محفوظًا ولا يُحذف.
- Late داخل employee metrics أصبح يستخدم canonical `mfIsLate30to60` بدل flag قديم.
- app commit: `2bc6ca7f0f8f3baf80339e5037fb8b14eb06be32`.
- index synced commit: `f657f24282f53ffcff91aedc9afd21988c87c1f0`; content SHA متطابق `10013169d2d086f5a4f0c8856e6015568ec05ab3`.


## Loan calculator / variable 3 correction — 2026-09-18
- فحص الكود أكد أن معادلة القرض نفسها لا تحتوي الرقم 3 ثابتًا: `interest = principal × monthlyRate × months` و`payment = total / months`؛ عدد الأشهر متغير.
- الرقم 3 الوحيد داخل واجهة الحاسبة كان في مثال الحاسبة السريعة `(250 + 40) * 3`، وهو مصدر الالتباس المتوافق مع الملاحظة السابقة «الفائدة ثابتة بس الرقم متغير 3».
- تم إزالة 3 الثابت من المثال واستبداله بنص يوضح أن المضاعف «عدد الدفعات» متغير، بدون تغيير معادلة الفائدة الشهرية الثابتة.
- app commit: `d402d26c05f64516066fa7c7186ca5533c1e1867`.
- index synced commit: `6ecfd3e55cfa10a115158ebfdc848d4c05279a74`; content SHA متطابق `4e3dcf7612d321b6654cfcb0074d3cc52c60ba2a`.


## Mandatory morning-content read durability — 2026-09-18
- اكتُشف أن زر «قرأت المحتوى» كان يغيّر `readBy` محليًا فقط، رغم وجود جدول `announcement_reads` وسياسات RLS/unique key مخصصة له.
- تم استبدال المسار النشط بـ DB-first upsert على `announcement_reads(announcement_id,user_id,read_at)` ثم تحديث الحالة المحلية فقط بعد تأكيد الصف.
- تحقق schema: FK للإعلان والمستخدم + UNIQUE `(announcement_id,user_id)` موجود، لذلك upsert idempotent ولا يكرر القراءة.
- فشل قاعدة البيانات لا يسجل قراءة محلية وهمية.
- app commit: `03a54ab0f1a5a4752819573963234f8e740e2376`.
- index synced commit: `c91a2eff7aece172995735a307bccaab08a388ce`; content SHA متطابق `d70a26829a7abe4302b737366db3e59b186b167d`.


## First-use consent durability — 2026-09-18
- فحص مسار الموافقة كشف أن `mfAcceptConsent` كان يسجل الموافقة محليًا فقط رغم وجود جدول `usage_consents`.
- تم تحويله إلى DB-first: INSERT موثق بـ `policy_version=phase5-20260918` و`accepted_text` ووقت قاعدة البيانات، ثم فقط بعد نجاح الحفظ تُفتح الجلسة محليًا.
- سياسات RLS الحالية تسمح للمستخدم النشط بإنشاء موافقته وقراءتها، والمؤسس بالقراءة؛ لا توجد صلاحية تعديل تاريخ موافقة سابقة.
- هذا يغطي consent الخاص بحفظ الرسائل/المحادثات/المكالمات الصوتية والمرئية والمرفقات بدل الاعتماد على localStorage وحده.
- app commit: `af9071ab9dea8f6f1a3f55d52a77449901d1c441`.
- index synced commit: `4d3b95f5071702cbbcd4b9f0cef090be77ac56b8`; content SHA متطابق `8962f78e5f4d25c1019e9bdc021911ad8c6ea306`.


## Pending payment approval — no duplicate posting — 2026-09-18
- اكتُشف أن المسار القديم `mfUpdatePaymentStatus` كان يغيّر Pending محليًا ثم يستدعي `mfApplyPayment` لإنشاء INSERT جديد Successful، بينما سجل Pending الأصلي يبقى في قاعدة البيانات؛ هذا خطر تكرار/فقد اتساق.
- تم تحويل الاعتماد إلى UPDATE DB-first لنفس `payments.id` من `pending` إلى `successful` مع شرط الحالة الحالية، مستفيدًا من trigger الترحيل المالي الموجود.
- بعد التأكيد يعاد جلب العميل من Supabase لمزامنة outstanding/overdue/due/paid/last payment محليًا؛ لا يتم إنشاء دفعة ثانية ولا استخدام حالات محلية غير مدعومة مثل superseded.
- سجل بلا `dbId` يفشل مغلقًا ويطلب إعادة تحميل البيانات بدل ترحيل وهمي.
- app commit: `29c758ded1935f87428c0cf8e989d8b9bfbfe1bb`.
- index synced commit: `e4ee1936f463f17602c08629a16a75c3e00f275a`; content SHA متطابق `89505f004bf0fdc6206015b1e71bb94d6a412da3`.


## Pending payment approval — no duplicate posting — 2026-09-18
- تم إصلاح مسار اعتماد Pending الذي كان يغيّر النسخة المحلية إلى cancelled ثم ينشئ دفعة Successful ثانية ويترك سجل Pending الأصلي في قاعدة البيانات.
- الاعتماد الآن DB-first ويحدّث نفس `payments.id` من `pending → successful` فقط، وهو transition مدعوم من trigger الحالي؛ لا INSERT ثانٍ ولا حالة superseded وهمية.
- المسار يفشل مغلقًا إذا لم يكن للسجل `dbId` مؤكدًا.
- بعد نجاح الاعتماد يعاد جلب العميل من قاعدة البيانات لتحديث balances/paid/last payment في الواجهة من المصدر الحقيقي.
- app commit: `29c758ded1935f87428c0cf8e989d8b9bfbfe1bb`.
- index synced commit: `cc4c9b73055d26e31bc89a7cf54edb777c4e201d`; content SHA متطابق `89505f004bf0fdc6206015b1e71bb94d6a412da3`.


## Consent restore across devices/sessions — 2026-09-18
- تم إكمال مسار first-use consent بحيث لا يعتمد قرار إظهار نافذة الموافقة على localStorage فقط.
- `mfRequireConsent` أصبح يقرأ أحدث موافقة `phase5-20260918` للمستخدم الحالي من `usage_consents` عبر RLS؛ عند وجودها يعيد بناء الحالة المحلية ولا يطلب موافقة مكررة على جهاز/جلسة جديدة.
- عند عدم وجود موافقة موثقة تبقى النافذة إلزامية، والحفظ نفسه DB-first كما في checkpoint السابق.
- app commit: `a3dddefeddb63a14368b9c99b0864ed79f8602d6`.
- index synced commit: `d5c4b8a64a5dc16a3c61b54278a05f121a428c82`; content SHA متطابق `5d3cb06999ec80bc2a3d58e324236e8d6027dad0`.


## Supabase advisor recheck after Phase 5 hardening — 2026-09-18
- Security Advisor أعيد تشغيله بعد migrations الأخيرة: لا توجد تحذيرات RLS/function-search-path/definer جديدة. التحذير الأمني الوحيد المتبقي هو `auth_leaked_password_protection` (إعداد Supabase Auth خارجي عن تغييرات SQL الحالية).
- Performance Advisor: لم تعد auth-RLS initplan findings السابقة موجودة. المتبقي 70 `unused_index` INFO و8 `multiple_permissive_policies` WARN.
- لم يتم حذف indexes لأن قاعدة البيانات الحالية صغيرة جدًا ولا يوجد حجم إنتاج رسمي يبرر حذفها؛ هذا يحافظ على السلامة ولا يحول lint usage statistics المبكرة إلى قرار destructive.
- multiple-permissive policies سُجلت للمراجعة المنضبطة لاحقًا؛ لا تغيير صلاحيات جماعي قبل اختبارات multi-role الفعلية حتى لا نكسر الوصول المعتمد.


## Audit Log server durability — 2026-09-18
- Customer Timeline remains intact.
- Operational commits now also write an audit record to the server audit table with action, actor, client reference, details, and timestamp.
- Existing database audit triggers remain unchanged.
- app commit: `6810799ac3d0e0d52cda31205165d0868e5be784`.
- index synced commit: `89ca7b7c00081c14cb1c2540008fd0704bda5bda`; content SHA `6ff5fc9de01467204773b4c83c412389adcc6383`.


## Supervisor Dashboard operational metrics — 2026-09-18
- Employee metrics now expose Today, Follow-ups completed/total, Pending follow-ups, Kept promises, Broken promises, successful collections, Late 30–60 and Due from the same scoped records.
- Supervisor ranking cards now show the approved operational outcome counts instead of only portfolio/collection/completed follow-ups.
- Employee detail dashboard adds Today, Follow-ups, Kept/Broken and Pending KPI cards while preserving employee photo/profile and existing Performance/Portfolio/Late/Due/Collected.
- Payment component remains successful-only and excludes deferral fees per prior integrity fix.
- app commit: `a56d7b88c99d98bdaa027dcab94203722d70bebd`.
- index synced commit: `a21543154173ba1a6601402651fe841f9344b260`; content SHA `eaca30c5348889ca0e4ae23b952a2de1d2be764d`.


## Employee profile/photo durability — 2026-09-18
- Employee profile editing was local-first and ignored backend update failure.
- It is now DB-first and updates the correct backend table: profiles for profile-backed identities, employees for employee-backed identities.
- Local employeeProfiles/dashboard state changes only after the backend confirms the row.
- Employee-table title mapping uses official_title; profile-table mapping keeps job_title. Stored attachment path is retained for persisted avatars.
- app commit: `78e07b40f06b06897f8aa733e428d3cfa076b816`.
- index synced commit: `359c9dba195ad168e80fe2c8d5b386711be3a58a`; content SHA `af84d4cd8f712f3e27e9cee915486218d193f5f4`.


## Final consent + smart-name entry gate — 2026-09-18
- Added a final additive UI entry guard after all earlier overrides so the active assistant entry cannot bypass first-use consent.
- The assistant entry now checks persisted/local accepted consent first; otherwise it opens the consent flow and does not open the assistant.
- The active assistant then checks only the protected `profiles.smart_assistant_enabled === true` flag. Disabled users see `الاسم الذكي` + `لم يُفعل بعد` + `لا، فعّله لاحقًا`; no flag is enabled by the UI.
- Visible home tile and active assistant modal use the approved name `الاسم الذكي`.
- app commit: `3b954011f8cd47d9f8d87030c74c09162a669869`.
- index synced commit: `ac58ad5da9e8916c744268d56539a41d05161da3`; content SHA `22539ae75ded49f989cc146abfb6c19cf4983699`.


## Audit Log duplicate-write hardening — 2026-09-18
- فحص المسار النشط كشف أن `mfCommit()` يستدعي `mfAudit()`، بينما runtime hardening يلف `mfAudit` ويحفظ الحدث في `audit_log`؛ وبعد ذلك كان `mfCommit` ينفذ INSERT ثانٍ لنفس الحدث.
- أزيل INSERT المكرر من `mfCommit` مع إبقاء local timeline/save/render كما هي، وأصبح backend audit يُكتب مرة واحدة عبر wrapper المحمي.
- تحقق RLS: INSERT مقيد بـ `actor_user_id = auth.uid()`، وSELECT حسب النطاق/Founder/CFMP.
- app commit: `c8add109ba58389611235bb9939a0c73bda7517f`.
- index sync: `c0740306d05c723880a0f99b4ad631607cdca0a5`; content SHA متطابق `317e3a9ebe9d8669ed512fb43ce0264b3c43cc98`.
- لا حذف لسجلات audit التاريخية؛ الإصلاح يمنع التكرار الجديد فقط حفاظًا على البيانات.


## Mandatory first-use consent enforcement — 2026-09-18
- Consent was durable/restored from usage_consents, but the consent modal could still be dismissed from its backdrop and general forms could be opened before acceptance.
- Consent backdrop dismissal is now blocked while consent is pending.
- General operational form opening is gated by persisted/restored consent; the consent modal is shown instead until acceptance is confirmed.
- The consent modal itself cannot be programmatically closed through the normal close helper until consent is accepted.
- Smart assistant retains its explicit consent gate and protected admin activation flag.
- app commit: `b32acd56129b653685cbf95059e99575cb2abb90`.
- index synced commit: `6ca6e786dbb60544194761b83a7136bd7e81cb01`; content SHA `d4efcfd335f0af1022fbbe2ec36c5333cde56fc8`.


## First-use consent enforcement — 2026-09-18
- Persisted consent was already DB-first and restored across devices, but the generic consent guard still returned true and operational modals could be opened while consent was unresolved.
- `mfEnsureConsent` now awaits the persisted-consent check and returns the actual accepted state.
- The active modal opener now permits only the consent modal before acceptance; other operational modals are blocked until consent exists. The consent modal still cannot be dismissed before acceptance.
- Smart assistant remains additionally protected by the founder-controlled `profiles.smart_assistant_enabled` flag and is labeled `الاسم الذكي`.
- app commit: `b5e4a4033f2eb2b6e9513deea0db4454cdcf700e`.
- index synced commit: `2f353a14eab415c2977be499990004ec4c1ca661`; content SHA `603e5d85b1779365dbee29a8caea96e289ef87f7`.


## Smart assistant naming + consent gate verification — 2026-09-18
- Verified final additive consent gate is active after all imported scripts: non-consent users cannot open operational modals/forms, cannot close the consent modal, and `mfEnsureConsent` returns the actual accepted state.
- Verified smart assistant remains disabled unless the protected `profiles.smart_assistant_enabled===true` flag is present.
- Removed the remaining base visible label `البحث الذكي` from the active smart assistant panel/home source and standardized the approved visible name to `الاسم الذكي`.
- app commit: `0daa690f1876e881968084676fed3097222bf49d`.
- index synced commit: `d76a829c993cd7b12fda19f8b7240d024983a95a`; content SHA `cc6a69e1288e008f5985d363a64ee4e84d6c24bc`.


## Consent enforcement + approved smart name — 2026-09-18
- Verified the final active override already blocks non-consent modal/form access, prevents closing the consent modal before acceptance, restores persisted consent, and gates the smart assistant behind the protected admin flag.
- Verified visible smart-assistant labels are `الاسم الذكي`, including the Home tile and modal; disabled state is `لم يُفعل بعد` with `لا، فعّله لاحقًا`.
- Hardened consent acceptance check so only the current policy version `phase5-20260918` unlocks operational access; stale/local consent objects no longer satisfy the final gate.
- app commit: `006aa0b5c74d17de644e90131a54818fc9484369`.
- index synced commit: `aefa4a599764d9459b0aa5683f7a948d72b16edc`; content SHA `4344a789133af15ca26fe999a9a25068cd802417`.


## Smart assistant execution boundary — 2026-09-18
- Verified the visible tile/modal already use the approved name `الاسم الذكي`, consent gating is active, and the protected profile flag is the activation source.
- Added the same protected-flag check directly at both local and backend AI execution functions, so invoking the function directly cannot bypass the disabled state.
- app commit: `dfcc9faf987921619383419642df41ecd568373f`.
- index synced commit: `1029562dc73fed1f7f3748bcef084e1b67fd01da`; content SHA `8958c617fed3bb7aff108651f375beb22fe652ee`.


## Consent enforcement + approved smart name verification — 2026-09-18
- Verified the final active consent gate, not the earlier base helper.
- Final gate requires policy version `phase5-20260918`; non-consent modal opens are blocked, form actions are blocked, consent modal backdrop/close are blocked until acceptance, and persisted consent is restored from `usage_consents`.
- Verified the final active smart-assistant entry is labeled `الاسم الذكي` on the Home tile and modal.
- Smart assistant remains unavailable unless protected `profiles.smart_assistant_enabled=true`; disabled state displays `لم يُفعل بعد` and does not self-activate.
- No additional source change was required in this verification pass.
- Current app/index content SHA remains `af84d4cd8f712f3e27e9cee915486218d193f5f4`.


## Consent enforcement + Smart Name verification — 2026-09-18
- Verified the final active patch already enforces first-use consent at modal/form entry points: non-consent modals are blocked, the consent modal cannot be dismissed by backdrop/close while acceptance is missing, and mfEnsureConsent returns the persisted policy state after DB restore.
- Verified the final smart-assistant entry is labeled `الاسم الذكي`, blocks access until consent exists, and when the protected profile flag is false shows `لم يُفعل بعد` with the approved later-activation action.
- The active assistant path checks only `profiles.smart_assistant_enabled === true`; no fallback self-activation flag remains.
- No additional source mutation was required for this checkpoint because the active final patch already contains the intended gate.


## Escalation + Write-Off hardening — 2026-09-18
- Escalation final path now resolves and stores the real recipient employee for every target, rejects duplicate active escalation to the same target, and inserts LO→ALS/BM grouped targets in one database INSERT so the pair cannot partially insert.
- ALS→BM now resolves the actual Branch Manager and, if parent-status update fails after child creation, attempts a compensating delete; it fails closed and warns not to repeat if safe rollback cannot be confirmed.
- Current employee data still has no active ALS/Supervisor account, so LO→ALS remains intentionally fail-closed until an approved ALS identity exists.
- Write-Off approval was corrected to be database-authoritative: the existing `guard_writeoff_decision` trigger owns the balance mutation and Before/After values; frontend no longer updates the write-off row and then separately zeros client balances a second time.
- After a write-off decision the frontend reloads the authoritative client financial fields from Supabase before updating local Late/Due state.
- The current UI intentionally requests full write-off equal to outstanding balance; this was preserved because the historical requirement has not yet been found explicitly enough to justify changing full vs partial behavior.
- app/index content SHA: `b250cc2760feee446db81fb5c19d64360884fb03` and exact content equality verified: `true`.
- latest index sync commit: `684c3d885b6497254315df348c9312a62d2fc23f`.


## Write-off frontend/backend alignment — 2026-09-18
- فحص قاعدة البيانات أثبت أن القرار الفعلي للشطب محمي بــ trigger `writeoff_atomic_decision` / `guard_writeoff_decision`، وهو يدعم مبلغ شطب موجبًا حتى قيمة الدين ويطبق الرصيد داخل نفس معاملة قرار `write_offs`؛ لذلك يدعم الشطب الجزئي أو الكامل ولا يفترض Full-only.
- كان override الواجهة النهائي يفرض Full Write-off فقط رغم أن backend المعتمد يدعم partial/full؛ أزيل هذا التعارض. الطلب الآن يقبل أي مبلغ >0 لا يتجاوز الرصيد القائم، بينما قرار الموافقة وتحديث رصيد العميل يبقيان DB-atomic.
- لم يتم إنشاء أو تعديل أي Write-off تشغيلي للاختبار؛ الجدول ما زال 0 rows وقت الفحص.
- فحص اتساق read-only: pending duplicate groups=0, approved bad balance=0, approved amount mismatch=0.
- app commit: `fd0e40022d623b0ad47fb9a146a0686efbcb4c43`.
- index synced commit: `7b8e21c8591b9c64d5c01216143fed3918a2bbe2`; content SHA متطابق `9a41579f501c589e71d228991e775c03520e43f0`.


## Payment → Promise single-match hardening — 2026-09-18
- فحص trigger الفعلي `trg_link_successful_payment_to_promises` كشف أن helper السابق كان ينفذ UPDATE لكل الوعود Pending المؤهلة لنفس العميل؛ أي دفعة واحدة كان يمكن أن تحول أكثر من Promise إلى Kept.
- طُبقت migration `link_each_successful_payment_to_single_promise_20260918` مع الحفاظ على trigger الحالي وتعديل helper فقط.
- كل دفعة Successful/posted جديدة تختار Promise واحدًا فقط: أقرب `promise_date` مؤهل، ثم الأقدم إنشاءً كفاصل تعادل، مع row lock و`SKIP LOCKED` لتجنب المطابقة المتزامنة المزدوجة.
- أضيف guard يمنع إعادة معالجة نفس الدفعة إذا كانت Successful ومُرحلة أصلًا ثم حصل UPDATE لاحق غير متعلق بالترحيل.
- EXECUTE المباشر للـ SECURITY DEFINER helper ما زال مسحوبًا من public/anon/authenticated؛ يعمل من trigger فقط.
- لم تُنشأ بيانات اختبار وهمية: promises=0 وقت الفحص؛ kept=0؛ kept_missing_payment_date=0.
- هذا يغلق عيب «دفعة واحدة لا يجوز أن تجعل عدة وعود Kept» على مستوى قاعدة البيانات، ويبقى E2E ببيانات تشغيل معتمدة gate منفصلًا.


## Search + client hydration hardening — 2026-09-18
- فحص البحث كشف أن `mfSearchHay` كان يحتوي حقول العمل والمراجع، لكن bootstrap من Supabase لم يكن يحمّل معظمها إلى client model؛ لذلك كانت الحقول موجودة في الكود ولكن تختفي عمليًا بعد logout/login/reload.
- أضيفت hydration من `clients` للحقول: alternate phone، reference 1/2 name+phone، company، work location، work manager phone، employment status، new work، مع client address fallback.
- وُسع البحث العام/الذكي الذي كان يقتصر على العميل/الكفيل/المراجع/الموظف ليشمل حقول العمل والشركة والمدير وحالة العمل والعمل الجديد والفرع أيضًا.
- البحث المنزلي `mfSearchHay` كان أصلًا يشمل هذه الحقول، والبحث الصوتي ما زال مضبوطًا على `ar-JO`.
- app commit: `38d649f4170f3ba096e36c60ff5d3a2b6a9050f2`؛ index sync: `d1b6c6f57733df754692b54575cabbbac09ef521`; content SHA `91b3a6bd1e6510fbd31c0f8a4a622ff978e6f597`.


## Backend hydration audit + legal metadata — 2026-09-18
- راجعت السلسلة الفعلية لـ `mfLoadBackendState`: التحميل الأساسي يعيد promises, legal_cases, write_offs, deferrals, disbursements, escalated_cases, locations, field_visits, messages, chat_messages, announcements, follow_ups؛ والـ wrappers اللاحقة تعيد payments/attachments وبيانات المركبات.
- ظهر نقص محدد في Legal hydration: الحفظ يكتب `transferred_to_lawyer_at`, `attachment_url`, actor/update metadata، لكن reload كان يسقطها من state.
- تم توسيع Legal mapping ليحفظ transferredToLawyerAt، attachment storage path، actorId، updatedById، updatedAt؛ وبذلك لا تختفي metadata القانونية بعد logout/login/reload.
- فحص read-only الحالي: legal=0, messages=0, field_visits=0, escalations=0, writeoffs=0, deferrals=0, disbursements=0, locations=4. لم تُنشأ بيانات تشغيلية وهمية.
- app commit `e2d5ef5cfaae75e41666d294df3020d3f3528587`; index sync `1350dcaa31d0762304deb9f6048e4e0641b96069`; content SHA `bfda595857124cac67f3a421bae1924436a138b3`.


## Timeline/Audit semantic dedup + payment consistency — 2026-09-18
- فحص Audit الفعلي أكد وجود نوعين مشروعين من الأحداث: operational records نفسها (payments/followups/etc.) وaudit records لنفس العمليات. عرض النوعين معًا داخل Customer Timeline كان يكرر الحدث بصريًا رغم أن Audit Log نفسه يجب أن يحتفظ بالتاريخ الكامل.
- تم تعديل Customer Timeline فقط: الأحداث التشغيلية المعروفة تُعرض من مصدرها التشغيلي ولا يعاد عرض audit counterpart لها. Audit Log لم يُحذف أو يُختصر، وأحداث audit غير التشغيلية (login/client_view/AI وغيرها عند ارتباطها بعميل) تبقى قابلة للعرض وفق المنطق الحالي.
- لم تُحذف أي سجلات تاريخية من Supabase.
- فحص payment read-only الحالي: payments=1, successful=1, pending=0, successful_unposted=0, successful balance mismatch=0.
- app commit `3d1f34b8d45bac847906a7e6d9ca14b76c05017a`; index sync `bc2e9095f65fbee4d42be8ed1c8fc1e605d570c8`; content SHA `8ef8cc6208b0be9bb3fa5cb8dda2732f8d15a0fc`.


## Payment → Late/Due consistency — 2026-09-18
- راجعت مسار successful المباشر ومسار Pending→Successful مقابل قاعدة Late المعتمدة الموجودة في الكود: الخروج من Late بعد payment_no >= 2، بينما Due يخرج عند تصفير الرصيد المستحق.
- وجد اختلاف في مسار اعتماد Pending: كان يعيد حساب inLate من days/arrears فقط بعد قراءة client من DB، فيستطيع إعادة العميل Late رغم وصول payment_no إلى 2.
- تم توحيد هذا المسار مع قاعدة الدفعتين: بعد refresh من DB، إذا payment_no >= 2 يصبح inLate=false؛ Due يبقى مرتبطًا بالرصيد.
- app commit `30317833e1462242163243faa1b03b9584b1bddc`; index sync `df648ae7241b5211e04e05a54458e3af09d23f96`; content SHA `20f8d83f7292e7a1642b7e4b7e15e5dd5269f884`.


## Escalation rollback RLS hardening — 2026-09-18
- راجعت RLS الفعلي لـ escalated_cases: كان INSERT/SELECT/UPDATE موجودًا لكن DELETE غير موجود، بينما مسار ALS→BM rollback الآمن يحتاج حذف child المفتوح إذا فشل تحديث parent.
- أضيفت migration `allow_safe_escalation_rollback_delete_20260918` بسياسة DELETE ضيقة فقط للمستخدم authenticated الذي أنشأ التصعيد بنفسه، والسجل ما زال status=open، ومع استمرار can_access_client.
- لا يوجد منح حذف عام ولا bypass لـRLS.
- فحص البيئة: active escalations=0؛ active BM=1؛ active ALS/Supervisor=0. غياب ALS/Supervisor يبقى blocker بيانات لا يتم تزويره أو تعيين دور دون مرجع معتمد.


## Calculator stale override cleanup — 2026-09-18
- بعد فحص جميع overrides، وُجد أن إصلاح مثال الرقم 3 السابق لم يشمل نسختين أقدم من واجهة الحاسبة بقيتا في المصدر. رغم أن override النهائي كان صحيحًا، أزيلت كل أمثلة `(250 + 40) * 3` المتبقية حتى لا يعود الرقم الثابت عند تغير ترتيب/تحميل overrides.
- المعادلة بقيت كما هي: principal × monthly rate × months؛ لم يتم تغيير منطق الفائدة.
- app commit `c6125b34658c5567c3fcba6a41361d47c06f1184`; index sync `e83807df73356cb79ba162e0bf81a547c313671e`; content SHA `aeebe98381cf94dd7fbaf6f73278287a22b040ae`.


## Calculator stale override cleanup — 2026-09-18
- إعادة فحص كل التعريفات المتكررة لـ mfOpenCalculator كشفت بقاء مثالين قديمين داخل overrides لاحقة يعرضان `* 3` رغم أن المعادلة نفسها صحيحة ومتغيرة الأشهر.
- تم تنظيف كل الأمثلة القديمة النشطة/المحتملة واستبدالها بصياغة «× عدد الدفعات»؛ لا يوجد الآن placeholder ثابت 3 في app/index.
- app commit `c6125b34658c5567c3fcba6a41361d47c06f1184`; index sync `3b64d4c6b6dc38bdf157160697303767f6276242`; content SHA `aeebe98381cf94dd7fbaf6f73278287a22b040ae`.


## Due report consistency hardening — 2026-09-18
- فحص تقارير المرحلة الخامسة وجد أن Due report يعتمد flag `c.inDue` بينما قاعدة Due المالية الفعلية في بقية المسار تعتمد `dueAmount > 0`; flag قد يصبح stale بين refreshes/عمليات الترحيل.
- تم جعل تقرير Due balance-driven مباشرة من dueAmount>0، مع بقاء نطاق الصلاحيات كما هو. هذا يمنع إسقاط عميل مستحق من التقرير بسبب flag محلي قديم.
- app commit `84930234895836a2ba1b9d7313e60c98d596d44c`; index sync `04561bc0e56b155c1d465fc14c0ff48acbee0a27`; content SHA `1acd0242866ad277c6614e3c4e6dfc622132275d`.


## Calculator stale-definition cleanup — 2026-09-18
- بعد مراجعة جميع التعريفات المتكررة للحاسبة، ظهر أن تعريفين legacy ما زالا يحملان مثالًا ثابتًا `* 3` رغم أن التعريف النهائي كان مصححًا سابقًا.
- تم إزالة المثال الثابت من جميع النسخ المتبقية واستبداله بصياغة توضح أن المضاعف هو عدد الدفعات المتغير. معادلة الفائدة بقيت كما هي: principal × monthlyRate × months.
- app commit `c6125b34658c5567c3fcba6a41361d47c06f1184`; index sync `f519934a33df6f993558c99ca0e4b0a78f510c1c`; content SHA `1acd0242866ad277c6614e3c4e6dfc622132275d`.


## Late report active-state alignment — 2026-09-18
- تم توحيد تقرير Late مع قاعدة الخروج التشغيلية: العميل لا يعود للتقرير إذا كانت inLate=false بعد استيفاء قاعدة الخروج، حتى لو بقي arrears/days يطابقان التصنيف الخام.
- LateDays في التقرير أصبح يستخدم canonical mfLateDaysValue ليأخذ lateDays/dueLateDays بشكل موحد.
- app commit `4cd9902501ddccc45cb6dbc8b2138c4d73dcab21`; index sync `74dd0ee81edba4b3dd12a7563d898c31fca0100c`; content SHA `7503103c5a03639878fcdfc6aad2a69510471bfd`.


## Calculator stale-definition cleanup — 2026-09-18
- فحص جميع التعريفات المتكررة لـ mfOpenCalculator كشف نسختين أقدم ما زالتا تحملان مثال `* 3` رغم أن التعريف النهائي كان قد صُحح سابقًا. المعادلة نفسها بقيت صحيحة ومتغيرة الأشهر.
- تم تنظيف جميع أمثلة `* 3` المتبقية من app/index حتى لا يعود الرقم 3 للظهور إذا تغيّر ترتيب تحميل/override مستقبلًا.
- app commit `c6125b34658c5567c3fcba6a41361d47c06f1184`; index synced; current content SHA `7503103c5a03639878fcdfc6aad2a69510471bfd`.


## Notification pagination hardening — 2026-09-18
- فحص fixed row caps كشف cap=200 في Notification Center؛ هذا كان يخفي الإشعارات الأقدم للحسابات طويلة الاستخدام.
- استُبدل الاستعلام المحدود بـ mfReadOperationalRows paginated مع نفس recipient scope وترتيب created_at desc.
- app commit `5b6bdb612ca91c8723b843b3a18f73f0220e15f2`; index `f6ae9237891e803fccfdad8938b1719ba2d735aa`; content SHA `79d77e899171f3b843bc862e3a9cc6ebe790502d`.


## Calculator stale-definition cleanup — 2026-09-18
- مراجعة جميع التعريفات المتكررة للحاسبة كشفت نسختين قديمتين ما زال مثال placeholder فيهما يحتوي multiplier ثابت 3 رغم أن التعريف النهائي سبق تصحيحه.
- تم تنظيف كل النسخ المتبقية إلى نص «× عدد الدفعات» مع إبقاء المعادلة المعتمدة كما هي: principal × monthlyRate × months، وعدد الأشهر متغير.
- app commit `c6125b34658c5567c3fcba6a41361d47c06f1184`; index sync `5ddc56d3c440f7c9637f88f77c79587d1687164b`; content SHA `79d77e899171f3b843bc862e3a9cc6ebe790502d`.


## Promise concurrency duplicate guard — 2026-09-18
- فحص record_promise_atomic أكد أنه DB-first ويحدّث client + inserts promise في transaction واحدة، لكنه لم يكن يمنع طلبين متزامنين من إنشاء Pending مكرر لنفس client/date.
- أضيف partial unique index `promises_to_pay_one_pending_client_date_idx` على (client_id,promise_date) فقط عندما status='pending'. هذا يغلق race condition على مستوى قاعدة البيانات مع السماح بسجل تاريخي Kept/Broken لنفس التاريخ.
- لا توجد بيانات promises حالية، لذلك migration لم تحتج حذف/دمج أي سجل.


## Calculator stale-definition cleanup — 2026-09-18
- متابعة الفحص وجدت نسختين legacy إضافيتين من واجهة الحاسبة ما زالتا تحملان مثالًا ثابتًا `* 3` رغم أن التعريف النهائي كان قد صُحح سابقًا.
- أزيل المثال الثابت من جميع التعريفات المتبقية واستبدل بوصف «× عدد الدفعات»؛ معادلة الفائدة نفسها لم تتغير وتبقى principal × monthlyRate × months.
- app commit `c6125b34658c5567c3fcba6a41361d47c06f1184`; index sync `bfdf606f6a360452d45a4599f7ac7e338f92937e`; content SHA `79d77e899171f3b843bc862e3a9cc6ebe790502d`.


## Calculator stale-definition cleanup — 2026-09-18
- متابعة الفحص كشفت نسختين legacy إضافيتين من واجهة الحاسبة ما زالتا تحملان مثال `(250 + 40) * 3` رغم أن النسخة النهائية كانت مصححة.
- تم تنظيف جميع الأمثلة القديمة حتى لا يعاود الرقم 3 الظهور إذا تغيّر ترتيب التعريفات أو جرى استدعاء legacy path. معادلة القرض نفسها بقيت monthly flat-interest والمتغير هو عدد الأشهر.
- app commit `c6125b34658c5567c3fcba6a41361d47c06f1184`; index sync `842b42e1bb7e170f6c186b948998e6e60c45e3f9`; content SHA `aeebe98381cf94dd7fbaf6f73278287a22b040ae`; stale fixed-3 placeholders after check=0.
