# MF-NEXA / Project 2 — CURRENT STATE, 2026-10-03

## نقطة الاستئناف والدليل

- مستودع العمل: `6dk4w9zs6r-star/collection-pro`، فرع `uat` فقط. آخر head بعيد عند الاستئناف: `aa2145b7e449a44898c141fefaab1b19893a24f9`.
- عُثر على نسخة Work المؤرخة 2026-10-02، على `uat` بنفس head، وبها تعديلات غير committed في app/index، manifest، payment runtime، consent SQL/tests، وثلاثة PNG، وSQL/test ماليين. نُسخت كما هي إلى مساحة هذه الجلسة؛ النسخة السابقة محفوظة.
- لم يُعَد فحص Founder/session المنتهي في 2026-09-29. أُعيدت الاختبارات المحلية ذات الصلة بعد تغيير المصدر باعتبارها Regression.
- سجل قبول/رفض Work الكامل غير متاح عبر أدوات هذه الجلسة؛ لا توجد أداة `read_thread` متاحة. لا أعدّ وجود ملف محلي دليلًا على قبول تغيير أو نشره. معاينة المحادثة تشير إلى رفض استئناف Work، ولا تثبت تنفيذ جولة جديدة.
- أُخذت قيود الطلب الحالي مرجعًا: Audit role policy والحاسبة وapp consent gate وSW/session بقيت دون تغيير. لم يؤخذ تعديل Audit المقترح في تقرير 2026-09-30 إلى هذا العمل.

## المنفذ في مصدر UAT

1. **Field visit RCA/save:** تعريف `$f` و`st` كان داخل IIFE أخرى؛ active save handler لم يكن يراهما. أضيفت aliases داخل نفس closure. المسار بقي `record_field_visit_atomic`، مع تأكيد location/visit/payment IDs قبل إعلان النجاح. الاختبار يستخرج تعريفات المصدر الفعلية دون حقن المتغيرات المفقودة. بعد تحصيل ميداني تُعاد قراءة الدفعات والأرصدة من DB؛ فشل العرض بعد الحفظ لا يعلن أن الحفظ فشل ولا يدعو لإعادة التسجيل.
2. **Scope/search:** ALS يرى إسناده وعملاء المستخدمين الفعالين تحت إشرافه المباشر بواسطة auth identity/email؛ أزيل branch fallback وclient-supplied supervision shortcuts. LO يستخدم assigned user identity. جميع مسارات البحث التشغيلية الحالية تقيد النتائج بالنطاق قبل الحد.
3. **Zero-count:** Allocation/Organization تبني مجموعات الموظفين/الفرق من catalog المرئي، وتُبقي الموظف بلا عملاء مع عدد صفر. عدد موظفي الفريق يأتي من catalog وليس عدد أصحاب العملاء.
4. **Late/Due/payment flows:** Late exits عند `payment_no/paymentCount >= 2`. Due لا يبقى عندما outstanding balance يساوي صفرًا، حتى لو بقي due component قديم. hydration يعيد مشتقات الدفع من posted successful non-fee rows، مع استبعاد reversed/pending/fees. manual posting، approval، classification، sync، field collection تعود إلى البيانات المعتمدة. أزيل frontend payment-driven PTP writer؛ بقي PTP من backend. أزيل تعارض double-submit guard الذي كان يمنع handler الداخلي من العمل.
5. **R-O:** أزيل Quick Action اليدوي وأُغلقت save/approve/decision entry points، مع الاحتفاظ بالقراءة والسجل التاريخي وتقرير R-O scoped. لا يوجد connector أو مصدر آلي مخترع، ولا ادعاء أن ingestion يعمل.
6. **Payment reversal candidate:** شاشة سبب العكس، Founder financial gate، منع double-submit، استدعاء `reverse_payment` فقط، إعادة قراءة أرصدة/دفعات/PTP، وقراءة حدث التعويض الحقيقي من Audit لإظهاره في Timeline. سجل الأصل يبقى ظاهرًا بحالة reversed؛ التاريخ المالي قبل/بعد يبقى محفوظًا.
7. **Import/sync permission:** `mfCanImportPayments` مستقلة عن صلاحية التقارير؛ منح أولي محافظ للمؤسس الفعال فقط. غير الممنوح يحتفظ بقراءة/تحديث الدفعات المعتمدة دون استدعاء matching RPC.
8. **Timeline:** إخفاء client_view من عرض العميل فقط، وتحسين عناوين إجراءات العرض؛ Audit rows/roles/policies لا تُحذف ولا تتغير.
9. **Consent:** provisioning SQL وtest fixtures متطابقة مع `phase5-20260918`. app gate لم يتغير؛ لم تُكتب consent rows أو تُعدّل تاريخيًا على DB.
10. **Archive/PWA:** أزيل local Backup/Restore الذي يستبدل snapshot. بقي الأرشيف التشغيلي المشفر الموجود والتحقق فقط، باسم واضح ودون Full DR claim. apple-touch-icon حقيقي 180×180، manifest static، icons PNG 192/512؛ SW/session بلا تعديل.

## Backend المُجهز والمختبر محليًا، غير المطبق حيًا

المشروع الوحيد الذي أظهره اتصال Supabase: `MD-COLLECTION` / `thfnitjiiwdsbwcunlbs`؛ هو backend مشترك مع Production وفق نقطة الاستئناف. لم يُنشأ مشروع ولم يُكتب SQL عليه ولم تُنشر Edge Function.

- `scripts/uat-financial-hardening.sql` ثم `scripts/uat-financial-functions.sql` يشكلان transaction واحدة. الأول يرفض التنفيذ دون `mf.isolated_uat='confirmed'` ويتحقق من schema/consent. الثاني ينهي transaction. يُطبقان فقط على clone معزول مُتحقق منه، وليس المشروع المشترك.
- SQL يضيف financial import gate إلى RPCs وسياسات كتابة الدفع، ويحظر manual R-O mutations مع الحفاظ على SELECT/history، ويمنع DELETE للأصل المرحل.
- posting trigger يسجل exact component deltas في private ledger. reversal يقفل الدفعة/العميل، يسجل سجل تعويض unique لكل payment، يعيد الدلتا المؤكدة فقط، ويحفظ Audit event داخل نفس transaction. replay لا يطبق الدلتا مرتين. الدفعة القديمة بلا evidence تُرفض وتتطلب reconciliation؛ لا تُخمن آثارها.
- posted amount/date/type/source/reference تبقى immutable. reversal لا يحذف الأصل. PTP يُستعاد فقط إذا بقي مطابقًا للحالة التي أنتجتها الدفعة؛ قرار لاحق لا يُكتب فوقه.
- فحص مصدر البحث المنشور قراءة فقط كشف أن SQL SECURITY DEFINER والـEdge التي تستخدم service-role يرجعان بيانات خارج النطاق. جُهز RPC SECURITY INVOKER scoped، و`supabase/functions/limited-client-search/index.ts` باستخدام caller JWT، دون service-role. كلاهما غير منشور؛ الحماية الخلفية الحية ما زالت بندًا مفتوحًا.

## Smart Assistant — تحقق فقط

قراءة مصدر `mf-nexa-ai` المنشور version 4 أظهرت authenticate عبر `/auth/v1/user` ثم profile active، والقراءة التشغيلية بجلسة المستخدم. المصدر لا يفرض Founder-only ولا يتحقق من `smart_assistant_enabled` على backend. هذه فجوة مؤكدة بفحص المصدر، وليست اختبار طلب حي لحساب آخر. لم أعدّل الخدمة أو أنشرها. اختبار AI scope القديم يثبت حدود المصدر الحالي فقط، ولا يثبت Founder authorization.

## التحقق النهائي

- **16 local suites ناجحة، 0 فاشلة.** مجموع behavioral/financial checks المسماة: **350**، إضافة إلى فحص 35 HTML و82 inline scripts وparity.
- **34 تحقق PostgreSQL فعلي داخل PGlite 0.3.14:** posting/approval، idempotent replay، exact reversal deltas، الأصل/Audit، permission denials، source immutability، fees/PTP، import duplicate، field atomic rollback/collection، SQL scoped search وanon denial. بيانات disposable محلية فقط؛ ليست شهادة على RLS deployment أو concurrent remote transactions.
- **37 تحقق continuation:** ALS/LO identities، inactive/empty-email denial، zero portfolios، scoped search، Late/Due، hydration، reversal error/retry/duplicate-submit، icon sizes/static manifest/parity.
- **7 تحقق Edge search بمصادر شبكية وهمية:** caller JWT، no service-role، رد غير فعال/غير مصرح، scoped output وquery bounds. لا deployment.
- consent/recovery **28** checks ناجحة؛ جرى تصحيح fixtures والسياسة القديمة والاعتماد على persisted read ومسار `mfFinishAuthenticatedEntry` الفعلي.
- راجعت diff، `git diff --check` ناجح، app/index متطابقان byte-for-byte. Audit role policy والحاسبة وSW/session وSmart Assistant runtime لم تتغير.
- browser suite محاولة مستقلة **BLOCKED: `spawn EPERM`**. ليس PASS. لا إعادة ادعاء تحقق Founder الحي السابق على المصدر الجديد.
- لا رسائل حقيقية، ولا كتابة customer/payment/visit/auth/consent على DB المشتركة، ولا main/Production commit/deploy أو Release.

## المتبقي live/device-only

1. توفير/تحديد Supabase UAT معزول، تطبيق SQL والخدمة عليه، ثم اختبار role/RLS الحقيقي، concurrent reversal/retry، source matching، وatomic field collection ببيانات UAT disposable. هو شرط تشغيل backend الجديد، وليس إذنًا للكتابة على DB مشتركة.
2. تقديم مصدر R-O الآلي المعتمد وعقد هويته/schema/reference. التقرير التاريخي جاهز؛ ingestion لم يُنفّذ دون هذا المصدر.
3. تأكيد مسار UAT hosting ونشر المصدر المرشح عليه، ثم browser regression. تحديث فرع المصدر لا يثبت deployment إلى رابط UAT.
4. GPS permission/capture على هاتف حقيقي، WebRTC بين جلستين/جهازين، iPhone/PC layout/session، SW update/install على الأجهزة.
5. معالجة Founder authorization للـSmart Assistant في backend على UAT معزول عند تحديد سياسة التفعيل؛ لم يكن الطلب الحالي تفويضًا لتغيير الخدمة المشتركة.

أي Release أو merge إلى main أو Production يحتاج موافقة مشعل الصريحة.
