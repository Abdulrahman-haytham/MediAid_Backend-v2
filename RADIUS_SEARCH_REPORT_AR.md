# تقرير: خوارزمية Radius Search (البحث بنصف قطر) وأين تُستخدم في المشروع

## ما هي Radius Search؟
`Radius Search` تعني اختيار/فلترة جميع النقاط الجغرافية التي تقع على مسافة (distance) أقل من أو تساوي قيمة معيّنة `R`.

عادةً تظهر كجزء من سيناريوهات مثل:
- “أظهر الصيدليات القريبة منّي ضمن X متر”
- “حدّد المرشحين ضمن نطاق قريب ثم رتّبهم بناءً على عوامل إضافية”

## الفكرة الأساسية (Pipeline عملي)
1. تحديد نقطة مرجعية: `(latitude, longitude)` للمستخدم أو للطلب.
2. حساب مسافة كل نقطة مرشحة إلى النقطة المرجعية.
3. تطبيق شرط Radius:
   - احتفظ بالمرشحين الذين `distance <= R` (أو `distance < R` حسب التصميم).
4. بعد فلترة الـ radius:
   - إما تُعيد النتائج مباشرة،
   - أو تُرتب/تعمل scoring ثم تختار Top-K (مثل أفضل 5 صيدليات).

## كيف تُحسب المسافة؟ (حسب المشروع)
المشروع يستخدم منطقين:
1. **داخل SQL** (في `emergencyOrder`): يتم حساب مسافة “great-circle” عبر معادلة كروية (باستخدام `acos/cos/sin`) وإخراجها كعمود `distance` ثم قراءتها من `raw`.
2. **داخل التطبيق (JavaScript)** (في `pharmacy`): يتم حساب المسافة عبر دالة `distanceInMeters(...)` ثم استخدام فلترة `p.distance <= maxDistance`.

> ملاحظة: حساب المسافة على الأرض عادة يحتاج Haversine/Great-circle لأن الأرض ليست مستوية.

## أين تُستخدم Radius في مشروع `mid-aid-backend`؟

### 1) `emergencyOrder`: اختيار أفضل صيدليات ضمن نطاق مسافة ثابتة + Scoring
المكان:
- `src/modules/emergencyOrder/services/emergencyOrder.service.ts`

كيف يتم تطبيق radius؟
- يتم حساب المسافة داخل الاستعلام:
  - إضافة Select باسم `distance`.
- ثم يتم فرض شرط نصف القطر (Radius filter) في التطبيق:
  - إذا كانت `distance > ORDER_CONSTANTS.MAX_SEARCH_DISTANCE_METERS` يتم `continue` (أي حذف المرشح).

مقتطف السلوك من الكود (باختصار):
- شرط الفلترة:
  - `if (distance > ORDER_CONSTANTS.MAX_SEARCH_DISTANCE_METERS) continue;`
- بعدها يتم حساب:
  - `distanceScore`, `ratingScore`, `availabilityScore`
  - ثم `totalScore`
- ثم اختيار أفضل النتائج:
  - `slice(0, 5)` (Top 5).

قيمة نصف القطر المستخدمة:
- `src/common/constants/order.constants.ts`
  - `MAX_SEARCH_DISTANCE_METERS: 50000` (أي 50 كم).

النتيجة:
- ليس الهدف فقط “قريب”، بل “قريب + متاح + تقييم + score” لاختيار أفضل صيدليات.

### 2) `pharmacy`: endpoint لإرجاع صيدليات قريبة ضمن `maxDistance` (Radius Search مباشر)
المكان:
- `src/modules/pharmacy/pharmacy.service.ts`
- وأيضًا تعرضه في:
  - `src/modules/pharmacy/pharmacy.controller.ts` عبر `GET /pharmacies/nearby`

كيف يتم تطبيق radius؟
- يتم جلب كل الصيدليات (مع latitude/longitude).
- ثم:
  - حساب المسافة لكل صيدلية عبر `distanceInMeters(...)`.
  - ثم فلترة مباشرة:
    - `.filter((p) => p.distance <= maxDistance)`
- ثم ترتيب:
  - `.sort((a, b) => a.distance - b.distance)`

قيمة نصف القطر الافتراضية:
- في الدالة:
  - `maxDistance = 5000` (أي 5 كم).
- ويمكن تغييره عبر query param في الـ controller:
  - `maxDistance`

النتيجة:
- هذا Radius Search “واضح ومباشر”: يعيد الصيدليات ضمن نطاق `maxDistance` ويقوم بترتيبها حسب الأقرب.

## ملاحظات وتحسينات مقترحة (لو واجهت بطء)
- في `pharmacy.findNearbyPharmacies` يتم جلب “كل الصيدليات” ثم فلترة في الذاكرة.
  - مع زيادة عدد الصيدليات سيزيد زمن الاستجابة.
  - تحسين شائع: تطبيق فلترة radius/Bounding Box على مستوى SQL أو استخدام PostGIS مع فهارس مكانية (GiST).

## ملخص سريع
- `Radius Search` = فلترة النقاط التي تقع ضمن مسافة `R`.
- مشروعك يستخدمها في مكانين:
  1. `emergencyOrder`: radius ثابت (50 كم) + scoring لاختيار Top 5.
  2. `pharmacy`: radius متغير (default 5 كم) كـ فلترة مباشرة وإرجاع “الأقرب أولًا”.

