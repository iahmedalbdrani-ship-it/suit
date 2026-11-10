# Suitly — منصة حجز الشقق المفروشة (suitly.online)

منصة حجز كاملة: بحث وفلاتر، صفحة شقة بتقويم توفر، رحلة حجز تعرض السعر الكامل قبل الدفع، دفع إلكتروني عبر نقطة تكامل آمنة، حساب عميل، مساحة مضيف، ولوحة إدارة. العربية افتراضية (RTL) مع إنجليزية كاملة (LTR).

> **الحالة الحالية: نسخة تجريبية.** الشقق والتقييمات والحجوزات الأولية بيانات تجريبية واضحة، والدفع يعمل عبر «بوابة دفع تجريبية» لا تخصم أي مبلغ. راجع قسم «قبل الإطلاق».

---

## التشغيل محليًا

المتطلبات: Node.js 22.13 أو أحدث (يستخدم SQLite المدمج في Node، بدون حزم أصلية).

```bash
npm install
cp .env.example .env.local      # عدّل القيم عند الحاجة
npm run dev                     # http://localhost:3000  → يحوّل إلى /ar
```

للإنتاج:

```bash
npm run build
npm start                       # PORT=3000 افتراضيًا
```

تُنشأ قاعدة البيانات تلقائيًا في `data/suitly.db` عند أول تشغيل، وتُعبأ ببيانات تجريبية إذا كانت فارغة و`SEED_DEMO_DATA=true`.

### حسابات تجريبية (عند `DEMO_MODE=true`)

| الدور | البريد | كلمة المرور |
|---|---|---|
| ضيف | guest@suitly.online | Demo@1234 |
| مضيف | host@suitly.online | Demo@1234 |
| مدير | admin@suitly.online | Demo@1234 |

---

## البنية

| المسار | الوظيفة |
|---|---|
| `app/[locale]/` | كل الصفحات تحت `/ar` و`/en` (الرئيسية، البحث، الشقة، الحجز، الدفع، التأكيد، الدخول، الحساب، المضيف، الإدارة، صفحات المساعدة) |
| `app/actions/` | Server Actions للنماذج (دخول، حجز، دفع، إلغاء، مضيف، إدارة) — تعمل حتى بدون JavaScript |
| `app/api/quote` | حساب السعر على الخادم لعرضه في بطاقة الحجز |
| `app/api/listings/[slug]/availability` | الليالي المحجوزة/المغلقة للتقويم |
| `app/api/payments/moyasar/*` | العودة من بوابة الدفع + إشعار الدفع (Webhook) |
| `lib/pricing.ts` | منطق التسعير (ليالٍ، نهاية الأسبوع الخميس/الجمعة، أسعار خاصة، خصومات، تنظيف، رسوم خدمة، ضريبة) وسياسات الاسترداد |
| `lib/data/bookings.ts` | إنشاء الحجز داخل معاملة `BEGIN IMMEDIATE` لمنع التعارض، تأكيد الدفع، الإلغاء والاسترداد |
| `lib/payments/` | نقطة تكامل الدفع: `demo` أو `moyasar` |
| `lib/i18n/` | ترجمة كاملة `ar.ts` و`en.ts` |
| `lib/art.ts` | رسومات أصلية بألوان الهوية تُستخدم كصور تجريبية |
| `db/schema.postgres.sql` | مخطط PostgreSQL للإنتاج مع قيد يمنع تداخل الحجوزات على مستوى القاعدة |

### الأمان
- السعر الإجمالي يُحسب على الخادم فقط، ويُعاد التحقق من التوفر والسعر لحظة إنشاء الحجز.
- منع الحجز المزدوج: قفل كتابة قبل التحقق + حجز مؤقت للتواريخ أثناء الدفع (`BOOKING_HOLD_MINUTES`). تم اختباره بأربعة حجوزات متزامنة لنفس التواريخ: نجح واحد ورُفضت ثلاثة.
- لا توجد أي مفاتيح سرية في الواجهة. مفتاح بوابة الدفع يُقرأ من متغيرات البيئة على الخادم.
- لا يُؤكَّد أي حجز اعتمادًا على إعادة التوجيه؛ تُجلب حالة الفاتورة من البوابة وتُطابَق الحالة والمبلغ والعملة.
- إذا وصل الدفع بعد انتهاء المهلة وأُخذت التواريخ، يُعلَّم الحجز «يحتاج متابعة» والدفعة «استرداد قيد المعالجة» بدل إنشاء حجز مزدوج.
- كلمات المرور بـ scrypt، وجلسات بملف ارتباط httpOnly، وتحديد معدل محاولات الدخول، وترويسات أمان.

---

## ربط بوابة الدفع (ميسر Moyasar)

التكامل مبني على **فواتير ميسر** (صفحة دفع مستضافة لدى ميسر):

1. افتح حسابًا لدى ميسر واحصل على المفتاح السري (`sk_live_…` أو `sk_test_…` للتجربة).
2. في `.env.local` على الخادم:
   ```
   PAYMENT_PROVIDER=moyasar
   MOYASAR_SECRET_KEY=sk_test_xxx
   SITE_URL=https://suitly.online
   ```
3. أعد التشغيل. سيُنشئ الموقع فاتورة لكل حجز ويحوّل العميل لصفحة الدفع، ثم يتحقق من الدفع عند العودة وعبر الإشعار:
   - العودة: `https://suitly.online/api/payments/moyasar/return`
   - الإشعار: `https://suitly.online/api/payments/moyasar/webhook`
4. جرّب ببطاقات الاختبار من لوحة ميسر قبل التحويل للمفتاح الحي.

لإضافة بوابة أخرى (مثل HyperPay أو Tap) أضف محولًا في `lib/payments/index.ts` بنفس الدوال: `startPayment` و`verify…` و`refundPayment`.

---

## النشر

قاعدة SQLite تحتاج **قرصًا دائمًا**. خيارات مناسبة:
- خادم VPS أو أي استضافة Node.js بقرص دائم: `npm run build && npm start` خلف Nginx مع HTTPS، واجعل `DATABASE_PATH` و`UPLOADS_DIR` على القرص الدائم مع نسخ احتياطي دوري.
- منصات Serverless (مثل Vercel) لا تحفظ الملفات؛ استخدمها فقط بعد نقل البيانات إلى PostgreSQL (`db/schema.postgres.sql`) ونقل الصور إلى تخزين سحابي (S3 / Supabase Storage).

اربط الدومين `suitly.online` بالخادم واضبط `SITE_URL=https://suitly.online`.

---

## قبل الإطلاق (مطلوب منك)

- [ ] `DEMO_MODE=false` و`SEED_DEMO_DATA=false`، وحذف `data/suitly.db` التجريبية أو تعطيل الحسابات التجريبية.
- [ ] ضبط `ADMIN_EMAIL` و`ADMIN_PASSWORD` لإنشاء حساب المدير الحقيقي.
- [ ] مفتاح ميسر الحي و`PAYMENT_PROVIDER=moyasar`.
- [ ] تأكيد نسب **رسوم الخدمة** (افتراضيًا 5%) و**الضريبة** (افتراضيًا 15%) مع محاسبك، وأي رسوم أو تراخيص يتطلبها نشاط الإيواء السياحي.
- [ ] مراجعة قانونية لصفحتي الخصوصية والشروط وسياسات الإلغاء (نصوصها مسودة أولية).
- [ ] بيانات التواصل الحقيقية: `CONTACT_EMAIL` و`CONTACT_WHATSAPP`.
- [ ] إضافة الشقق الحقيقية وصورها من مساحة المضيف.
- [ ] إرسال رسائل البريد/SMS لتأكيد الحجز (غير مضاف بعد — يحتاج مزود مثل Resend أو Unifonic).

---

## النشر على Cloudflare (Workers + D1 + R2)

المشروع يعمل على Cloudflare Workers عبر OpenNext، وقاعدة البيانات D1، وصور الشقق في R2. جُرّب محليًا على بيئة Workers الحقيقية (`wrangler dev`) مع D1 محلية، ونجحت مسارات الحجز والسباق على الحجز نفسه ولوحتا المضيف والإدارة.

**متطلبات:** حساب Cloudflare، وخطة **Workers Paid** (5$ شهريًا). تسجيل الدخول يستخدم PBKDF2 ويحتاج وقت معالجة يزيد على حد الخطة المجانية (10ms).

الأوامر من مجلد المشروع (Node 22+):

```bash
npm install
npx wrangler login

# 1) قاعدة البيانات
npx wrangler d1 create suitly            # انسخ database_id إلى wrangler.jsonc
npx wrangler d1 execute suitly --remote --file=migrations/0001_schema.sql
npx wrangler d1 execute suitly --remote --file=db/seed.demo.sql   # بيانات تجريبية فقط

# 2) مخزن الصور
npx wrangler r2 bucket create suitly-uploads

# 3) أسرار (لا توضع في الملفات)
npx wrangler secret put MOYASAR_SECRET_KEY    # عند تفعيل الدفع الحقيقي فقط

# 4) البناء والنشر
npm run cf:deploy
```

ثم في لوحة Cloudflare: Workers & Pages ← suitly ← Settings ← Domains & Routes، وأضف `suitly.online`.

**قبل الإطلاق الفعلي**
- ولّد بيانات الإدارة بكلمة مرورك: `ADMIN_EMAIL=you@x.com ADMIN_PASSWORD='...' SEED_DEMO_DATA=false npm run d1:export` ثم نفّذ `db/seed.sql` الناتج بدل `seed.demo.sql`.
- غيّر `DEMO_MODE` و`PAYMENT_PROVIDER` و`CONTACT_*` في `wrangler.jsonc`.
- محدّد معدّل الطلبات داخل ذاكرة كل نسخة من الـ Worker؛ للحماية الصارمة أضف قاعدة Rate Limiting من Cloudflare على `/api/*` وصفحة الدخول.
- الاختبار المحلي بدون نشر: `npm run cf:build` ثم `npx wrangler d1 execute suitly --local --file=...` ثم `npm run cf:preview`.
- الاستضافة بـ Docker/Node (SQLite محلية) ما زالت تعمل كما هي.
