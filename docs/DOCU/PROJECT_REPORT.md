# تقرير مشروع `mid-aid-backend`

## 1) نظرة عامة سريعة
التطبيق مبني باستخدام **NestJS** (TypeScript) مع **PostgreSQL** و **TypeORM**. يعتمد على تصميم موديولي (Modules) يشمل مجالات: `auth`, `user`, `pharmacy`, `product`, `cart`, `order`, `emergencyOrders`, `chat`, `upload`, `mail`، إضافةً إلى:
- مصادقة JWT عبر `passport-jwt` و `JwtStrategy`.
- صلاحيات تعتمد على `RolesGuard` مع ديكوريتور `@Roles(...)`.
- توثيق Swagger.
- WebSocket (Socket.IO) داخل `chat` لإرسال واستقبال الرسائل.
- Job دوري لمعالجة `emergencyOrders` عند انتهاء مهلة الاستجابة.

## 2) البنية المعمارية للمشروع
### 2.1 نقطة التشغيل والـ Pipes/Interceptors
- `src/main.ts` يفعّل `ValidationPipe` بشكل صارم:
  - `whitelist: true` و `forbidNonWhitelisted: true`
  - `transform: true`
- يوجد `ResponseInterceptor` لتوحيد شكل الاستجابة (success/message/data).
- يوجد `ClassSerializerInterceptor` لدعم `class-transformer` مع `@Exclude()` في الكيانات.

### 2.2 الحماية والتسجيل
- `src/common/filters/all-exceptions.filter.ts`:
  - يضع `x-correlation-id` في الرد.
  - يسجّل تفاصيل الطلب مع تنقية (redaction) للحساسيات.
- `src/common/interceptors/logging.interceptor.ts`:
  - يسجل الطلب قبل التنفيذ والرد بعده (HTTP فقط).

### 2.3 النطاقات (Modules)
- `auth` و `user`: تسجيل/تحقق/Reset password + JWT.
- `pharmacy/product/category`: كتالوج وإدارة صيدلية ومخزون.
- `cart`: إدارة السلة وعناصرها مع التحقق من توفر المخزون.
- `order`: إنشاء طلب من السلة مع تحديث المخزون داخل Transaction + قفل.
- `emergencyOrder`: اختيار “أفضل صيدليات” عبر scoring/مسافة + التعامل مع مهلة الاستجابة.
- `chat`: REST endpoints + WebSocket لإرسال الرسائل داخل غرف مبنية على `orderId`.

## 3) قاعدة البيانات وTypeORM (المهم هنا)
### 3.1 إعداد TypeORM داخل Nest
الموجود في: `src/app.module.ts`
- `TypeOrmModule.forRootAsync(...)` يستخدم:
  - `type: 'postgres'`
  - `url: DATABASE_URL` (مطلوب حسب Validation schema)
  - `ssl` يعتمد على `DB_SSL` أو `NODE_ENV=production`
  - `entities: [join(__dirname, '**', '*.entity.js')]`
  - `migrations: [join(__dirname, 'migrations', '*.js')]`
  - `migrationsRun: false`
  - **`synchronize: true`** بشكل “Hardcoded” (حتى مع وجود env var باسم `DB_SYNCHRONIZE`)

يوجد أيضًا تعليق داخل الكود يذكر أن `synchronize` مفعل مؤقتًا لعدم فشل بعض migrations عند توفر DB جديد.

### 3.2 DataSource مستقل لمهاجرات CLI
الموجود في: `src/typeorm.config.ts`
- `AppDataSource` مستقل لـ TypeORM CLI:
  - `url: process.env.DATABASE_URL`
  - `entities: [join(__dirname, '**', '*.entity.js')]`
  - `migrations: [join(__dirname, 'migrations', '*.js')]`
  - `migrationsRun: false`

هذا جيّد كمبدأ لأن CLI لا يعتمد على Nest DI.

### 3.3 حالة migrations الحالية
يوجد migration واحد فقط:
- `src/migrations/1760000000000-AddCartItemUniqueConstraint.ts`
وظيفته إضافة constraint فريد لـ `cart_items(cartId, productId, pharmacyId)`.

لكن:
- `migrationsRun` في `app.module.ts` مضبوط على `false` دائمًا، لذلك لا يتم تشغيل migrations تلقائيًا مع تشغيل التطبيق.
- وبما أن `synchronize: true` مفعّل، غالبًا يتم إنشاء الجداول/الـ Indexes عبر TypeORM أثناء runtime بدل الاعتماد على migrations.

## 4) التحديات والمشاكل (مركزة على المخاطر الفعلية)
### 4.1 خطر كبير: `synchronize: true` داخل الإنتاج + env var غير مستخدم
الحالة الآن بعد الإصلاح:
- تم تغيير `src/app.module.ts` بحيث يصبح `synchronize` يعتمد على `DB_SYNCHRONIZE` و `NODE_ENV`:
  - في `production`: يبقى `false`
  - خارج production: يمكن تفعيله عبر `DB_SYNCHRONIZE`

### 4.2 mismatch قوي في متغيرات البيئة: `DATABASE_URL` مطلوب لكن `.env.example` لا يحتويه
الحالة الآن بعد الإصلاح:
- تم جعل `DATABASE_URL` اختياريًا، وتوليد رابط PostgreSQL ديناميكيًا من `DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME` في:
  - `src/app.module.ts`
  - `src/typeorm.config.ts` (مهم لمهاجرات CLI)

### 4.3 مشكلة خطيرة جدًا في كيانات Chat (Entity duplication/تعارض)
الحالة الآن بعد الإصلاح:
- تم إزالة الكلاس المكرر لـ `ChatMessage` من `chat.entity.ts` وتوحيد التعريف على كلاس واحد في `chat-message.entity.ts`.
- كذلك تم ضبط علاقة `Chat.messages` لتشير إلى `message.order` حتى يبقى الـ schema متسقًا.

### 4.4 أمن WebSocket: غرفة `order_{orderId}` بدون تحقق وصول
الحالة الآن بعد الإصلاح:
- تم تفعيل تحقق صلاحيات المستخدم قبل `client.join` داخل `handleJoinOrderRoom` باستخدام `ChatService.assertUserCanAccessOrder`.
- تمت إضافة تحقق بسيط أن `orderId` UUID صالح.

### 4.5 عدم اتساق بين DTO و Entity في Chat (imageUrl)
الحالة الآن بعد الإصلاح:
- تم إضافة عمود `imageUrl` إلى `chat-message.entity.ts`، وتخزينه في `chat.service.ts` عند إنشاء الرسالة.

### 4.6 أداء/قابلية توسّع: عمليات فلترة في الذاكرة بدل SQL
أمثلة:
- `pharmacy.service.ts`:
  - `searchMedicineInPharmacy` يجلب كل عناصر المخزون داخل صيدلية ثم يفلتر في JavaScript.
- `emergencyOrder.service.ts`:
  - scoring يعتمد على `getRawAndEntities` ثم iterates + matching raw.

النتيجة:
- مع زيادة البيانات سيزداد زمن الاستجابة وتكلفة الذاكرة.

التوصية:
- استخدم SQL filters + indexes:
  - على Product name (ILIKE) قد تحتاج full-text/search indexes
  - وعلى علاقات المخزون.
- للفحص المكاني/المسافة: التأكد من أن الاستعلامات فعلاً تستغل index أو bounding heuristics.

### 4.7 جودة تصميم Schema: استخدام `float` للأموال/المؤشرات
أمثلة:
- `Order.totalPrice: float`
- `Product.price: float`
- `Pharmacy.averageRating: float`

المخاطر:
- `float` قد يسبب أخطاء rounding في مبالغ/حسابات.

التوصية:
- استخدم `numeric/decimal` للأموال ودرجات التقييم (مثلاً numeric(10,2)).

### 4.8 الاختبارات غير كافية تغطي المنطق المهم
الموجود:
- ملفات Jest الموجودة (`user.service.spec.ts`, `user.controller.spec.ts`) فحصها سطحياً فقط (`toBeDefined`).

النتيجة:
- لا يوجد coverage لسيناريوهات حساسة مثل:
  - create order transaction + lock
  - stock decrements
  - emergency order scoring/timeout
  - chat access control

## 5) التحسينات المقترحة (عملية وقابلة للتنفيذ)
### 5.1 تحويل إدارة قاعدة البيانات إلى migrations “حقيقية”
1) اجعل `synchronize` خارج الإنتاج:
   - استخدم `DB_SYNCHRONIZE` أو `NODE_ENV` داخل `src/app.module.ts`
2) أضف/استخدم DataSource لتوليد migrations:
   - أنت بالفعل جهزت `src/typeorm.config.ts`.
3) نفّذ migrations على Railway كـ “One-off command” قبل تشغيل الخدمة.
4) امنع drift:
   - لا تستخدم `synchronize` مرة أخرى إلا محليًا لفترات قصيرة.

### 5.2 إصلاح Chat entities duplication
- احذف الكيان المكرر أو وحده.
- تأكد أن:
  - `chat.module.ts` يستورد نفس Entity التي تمثل الجدول بالفعل.
  - لا يوجد أي `@Entity('chat_messages')` مرتين لنفس الكيان/الاسم.

### 5.3 تقوية أمن WebSocket
- نفّذ authorization في `handleJoinOrderRoom`:
  - تحقق من أن المستخدم ينتمي للطلب.
- أزل console logs أو استبدلها بـ logger مضبوط لبيئة production.

### 5.4 توحيد Schema types
- استبدل `float` بالأموال بـ `numeric/decimal`.

### 5.5 تحسين الأداء
- استبدل بعض filters في الذاكرة بـ SQL queries.
- أدخل pagination حيث يلزم (search/results).

### 5.6 تطوير الاختبارات
- أضف integration tests:
  - مع SQLite memory أو Postgres test container.
- ركّز على flows التي تتأثر بالمخزون والـ locks.

## 6) ملاحظات تنفيذ الـ migrations على Railway (بعد رفع التطبيق)
### السؤال الذي يجب تحديده
هل تريد:
1) **Generate** migration جديد (migration:generate) بناءً على تغييرات الكود؟  
2) أم تريد **Run** migrations الموجودة بالفعل (migration:run) على DB في Railway؟

### المسار المقترح الآمن (غالبًا هو الصحيح)
1) على بيئة محلية:
   - تأكد من تشغيل التطبيق مع نسخة DB مطابقة قدر الإمكان
   - اجمع migrations جديدة (إن وُجدت تغييرات في entities)
2) قبل النشر:
   - عطّل `synchronize` في الإنتاج
3) على Railway:
   - شغّل migration:run كخطوة منفصلة
4) بعدها شغّل التطبيق.

### تنبيه مهم بخصوص DB الحالي على Railway
إذا كان التطبيق على Railway بدأ بـ `synchronize: true` وأنشأ الجداول بالفعل:
- قد تكون بعض القيود (indexes/constraints) موجودة مسبقًا من synchronize.
- حينها migration:run قد:
  - يفشل إذا migration يتوقع “عدم وجود” constraint مسبقًا
  - أو لا تكون ضرورية أصلًا لأن الفرق كان تم إنشاؤه فعلاً

لهذا السبب:
- يُفضّل توليد baseline migration بعد تثبيت entities النهائية وتعطيل synchronize،
أو على الأقل التأكد من حالة `migrations` table في DB.

## 7) الخلاصة التنفيذية (أولوية)
1) **Fix `ChatMessage` duplication** (أخطر مشكلة قد تسبب أعطال DB/synchronize).
2) **إيقاف `synchronize` في الإنتاج وربطه بـ env**.
3) **توحيد env var `DATABASE_URL`** مع `.env.example` و `docker-compose.yml`.
4) **تأمين WebSocket authorization** قبل join rooms.
5) **تحسين types للأموال** + تحسين أداء الاستعلامات الأكثر تكرارًا.
6) **تعزيز الاختبارات** للسيناريوهات الحرجة.

