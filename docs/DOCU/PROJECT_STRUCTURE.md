# بنية المشروع (Project Structure)

هذا الملف يلخّص ما يحتويه كل مجلد في مشروع الـ Backend (NestJS + TypeORM).

## المجلدات على مستوى الجذر (Root)

### scripts/
- سكربتات مساعدة للتطوير/التجارب.
- أمثلة: إنشاء مستخدم تجريبي، أو أدوات مساعدة مثل عرض ملفات.

### src/
- الكود الأساسي لتطبيق NestJS.
- يحتوي على نقطة الدخول (main.ts)، AppModule، الموديولات (Modules)، ملفات TypeORM والمهاجرات (Migrations)، والمشتركات العامة (common).

### test/
- اختبارات E2E (End-to-End) الخاصة بـ NestJS/Jest.
- يحتوي إعدادات Jest E2E وملفات الاختبار.

## داخل src/

### src/common/
- أكواد مشتركة تُستخدم عبر أكثر من موديول.

#### src/common/constants/
- ثوابت عامة (مثل ثوابت الطلبات).

#### src/common/decorators/
- Decorators مخصصة مثل استخراج المستخدم الحالي من الطلب.

#### src/common/filters/
- فلاتر استثناءات (Exception Filters) لمعالجة الأخطاء وتوحيد شكل الاستجابة عند الفشل.

#### src/common/guards/
- Guards للصلاحيات/الأدوار (Roles) مثل RolesGuard وديكوريتر Roles.

#### src/common/interceptors/
- Interceptors مثل:
  - LoggingInterceptor: تسجيل الطلب/الاستجابة/الخطأ في الـ logs.
  - ResponseInterceptor: توحيد شكل الاستجابة الناجحة.

#### src/common/jobs/
- مهام مجدولة/خلفية (Jobs) مثل معالجة timeouts.

#### src/common/logger/
- Logger مخصص (CustomLogger) لتوحيد نمط الطباعة للـ console/logs.

### src/migrations/
- ملفات TypeORM Migrations (إصدارات تغييرات قاعدة البيانات).
- الهدف منها ترحيل بنية قاعدة البيانات بشكل متدرّج بين الإصدارات.

### src/modules/
- موديولات التطبيق (Domain Modules). كل موديول غالبًا يحتوي:
  - controller: تعريف REST endpoints
  - service: منطق الأعمال (Business Logic)
  - entity/entities: كائنات TypeORM (الجداول)
  - dto: Data Transfer Objects للتحقق من الإدخال (validation)
  - module: تجميع وربط مزوّدات الموديول

#### src/modules/auth/
- تسجيل الدخول وإصدار JWT (Bearer).
- JWT Strategy للتحقق من التوكن ووضع المستخدم في `req.user`.
- DTOs لتسجيل الدخول وتفعيل الإيميل وReset Password.

#### src/modules/user/
- تسجيل المستخدمين (`/users/register`).
- تفعيل الإيميل، طلب/تنفيذ إعادة تعيين كلمة المرور.
- عمليات CRUD للمستخدم.
- يحتوي UserEntity وتعريف الأدوار (UserRole).

#### src/modules/product/
- إدارة المنتجات (CRUD) وصلاحيات الوصول لبعض العمليات.
- ProductEntity + DTOs.

#### src/modules/category/
- إدارة تصنيفات المنتجات (CRUD).
- CategoryEntity + DTOs.

#### src/modules/pharmacy/
- إدارة الصيدليات (CRUD) + إضافة منتجات للصيدلية وتقييمها.
- PharmacyEntity + DTOs.

#### src/modules/cart/
- منطق سلة المشتريات: إضافة/تعديل/عرض عناصر السلة.
- CartEntity + DTOs.

#### src/modules/order/
- منطق الطلبات (Orders): إنشاء/تعديل/استعراض الطلب.
- OrderEntity + DTOs + Controllers/Services.

#### src/modules/emergencyOrder/
- طلبات طارئة (Emergency Orders): إنشاء والرد على الطلب.
- Entities/DTOs/Controllers/Services منظمة ضمن مجلدات فرعية.

#### src/modules/usedMedicine/
- إدارة أدوية مستعملة (Used Medicine): CRUD.
- Entities/DTOs/Controllers/Services منظمة ضمن مجلدات فرعية.

#### src/modules/kafuPost/
- موديول منشورات/محتوى (Kafu Post): CRUD.
- Entities/DTOs/Controllers/Services منظمة ضمن مجلدات فرعية.

#### src/modules/upload/
- رفع الملفات وإدارة Cloudinary provider.
- UploadService/Controller + إعداد مزود Cloudinary.

#### src/modules/chat/
- دردشة (Chat) تشمل:
  - REST Controller لبعض العمليات
  - Gateway (WebSocket) للتواصل الفوري
  - Entities خاصة بالدردشة والرسائل

## ملفات مهمة داخل src/ (ليست مجلدات)

### src/main.ts
- نقطة تشغيل التطبيق (bootstrap).
- تفعيل middleware مثل helmet/compression وتهيئة CORS و Swagger و Pipes/Interceptors.

### src/app.module.ts
- الموديول الرئيسي الذي يربط كل Modules ويهيّئ Config و TypeORM.

### src/typeorm.config.ts
- DataSource مستقل لاستخدام TypeORM CLI (migrations) خارج Nest DI.

