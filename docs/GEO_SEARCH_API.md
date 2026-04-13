# Geo Search API Documentation

## نظرة عامة (Overview)

هذا المستند يشرح واجهات البرمجة الخاصة بالبحث المكاني باستخدام **PostGIS** في نظام MediAid. جميع العمليات تعتمد على امتداد PostGIS في PostgreSQL لحساب المسافات بدقة بالأمتار.

---

## 📍 تنسيق الإحداثيات (Coordinate Format)

> ⚠️ **تحذير هام:** جميع الإحداثيات يجب أن تُمرّس بترتيب GeoJSON القياسي:  
> **`[longitude, latitude]`** — أي خط الطول أولاً ثم خط العرض.  
> 
> مثال: القاهرة = `[31.2357, 30.0444]`

هذا الترتيب عكسي لما قد تتوقعه (latitude أولاً). سبب استخدامه هو توافق معيار **GeoJSON** الذي تتعامل معه الخرائط (Leaflet, Mapbox, Google Maps).

---

## 🔧 Migration & Database Setup

### تشغيل Migration

```bash
# تشغيل Migration لإضافة PostGIS + الأعمدة المكانية + الفهارس
pnpm typeorm migration:run
```

### ما يفعله Migration

```sql
-- 1. تفعيل امتداد PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. إضافة عمود geometry للنقاط (SRID 4326 = WGS84)
ALTER TABLE "pharmacies" ADD COLUMN "location" geometry(Point, 4326);
ALTER TABLE "emergency_orders" ADD COLUMN "location" geometry(Point, 4326);

-- 3. ترحيل البيانات الحالية من lat/lng إلى geometry
UPDATE "pharmacies" SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326);
UPDATE "emergency_orders" SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326);

-- 4. إنشاء فهارس GIST مكانية للبحث السريع
CREATE INDEX idx_pharmacies_location_gist ON "pharmacies" USING GIST ("location");
CREATE INDEX idx_emergency_orders_location_gist ON "emergency_orders" USING GIST ("location");
```

> 📌 **ملاحظة أداء:** الفهارس المكانية GIST تُستخدم تلقائياً مع دالة `ST_DWithin` عند التحويل إلى `::geography`، مما يجعل البحث سريعاً حتى مع ملايين السجلات.

---

## 📡 Endpoints

### 1. البحث عن الصيدليات القريبة

```
GET /api/pharmacies/nearby
```

#### Query Parameters

| Parameter | Type   | Required | Default | Min  | Max   | Description                    |
|-----------|--------|----------|---------|------|-------|--------------------------------|
| `lon`     | number | ✅ نعم   | —       | -180 | 180   | خط الطول (Longitude)          |
| `lat`     | number | ✅ نعم   | —       | -90  | 90    | خط العرض (Latitude)           |
| `radius`  | number | ❌ لا    | 5000    | 100  | 100000| نصف القطر بالمتر (افتراضي 5كم)|

#### مثال طلب (Request Example)

```http
GET /api/pharmacies/nearby?lon=31.2357&lat=30.0444&radius=5000
```

#### مثال استجابة (Response Example)

```json
{
  "message": "Found 3 pharmacies within 5000m",
  "count": 3,
  "pharmacies": [
    {
      "id": "a1b2c3d4-...",
      "name": "Al-Amal Pharmacy",
      "address": "123 Main St, Cairo",
      "phone": "+201234567890",
      "location": {
        "type": "Point",
        "coordinates": [31.2357, 30.0444]
      },
      "distance_meters": 150.5,
      "averageRating": 4.5,
      "services": ["Delivery", "Consultation"],
      "imageUrl": "https://example.com/pharmacy.jpg"
    }
  ]
}
```

#### كيف تعمل (How It Works)

يستخدم هذا endpoint دالتين من PostGIS:

```sql
-- الفلترة: ST_DWithin تستخدم فهرس GIST للبحث السريع
ST_DWithin(
  p.location::geography,
  ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
  :radius
)

-- حساب المسافة: ST_Distance مع ::geography لدقة بالمتر على شكل الكرة الأرضية
ST_Distance(
  p.location::geography,
  ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
) AS distance_meters
```

> ⚠️ **لماذا `::geography` بدلاً من `geometry`؟**  
> `geometry` يحسب المسافات على مستوى مسطّح (planar) وهو غير دقيق على نطاقات كبيرة.  
> `geography` يحسب المسافات على سطح كروي (spheroid) ويعطي نتائج دقيقة بالمتر.

---

### 2. إنشاء طلب طارئ ذكي

```
POST /api/emergency-orders/create-smart
```

> ملاحظة: يوجد أيضاً `POST /api/emergency-orders` كـ endpoint بديل (legacy).

#### Headers

```
Authorization: Bearer <JWT_TOKEN>
```

#### Request Body

```json
{
  "requestedMedicine": "Panadol Extra",
  "deliveryAddress": "456 Tahrir St, Cairo",
  "additionalNotes": "Urgent, need it within 30 minutes",
  "priority": "high",
  "responseTimeoutInMinutes": 15,
  "latitude": 30.0444,
  "longitude": 31.2357
}
```

#### مثال استجابة (Response Example)

```json
{
  "message": "Emergency order created and sent to the best-matching pharmacies.",
  "order": {
    "id": "e5f6g7h8-...",
    "requestedMedicine": "Panadol Extra",
    "status": "pending",
    "priority": "high",
    "targettedPharmacies": [
      { "id": "...", "name": "Al-Amal Pharmacy" },
      { "id": "...", "name": "Seif Pharmacy" }
    ]
  },
  "matchedPharmacies": [
    {
      "pharmacyId": "a1b2c3d4-...",
      "pharmacyName": "Al-Amal Pharmacy",
      "score": 85.5,
      "distance_meters": 250,
      "rating": 4.5,
      "hasProduct": true
    },
    {
      "pharmacyId": "b2c3d4e5-...",
      "pharmacyName": "Seif Pharmacy",
      "score": 72.3,
      "distance_meters": 1200,
      "rating": 4.0,
      "hasProduct": true
    }
  ]
}
```

#### معادلة التقييم (Scoring Equation)

كل صيدلية تحصل على تقييم من **100 نقطة**:

| المعيار | النقاط | المعادلة |
|---------|--------|----------|
| **المسافة** | 0–50 | `GREATEST(0, 50 - (distance_meters / max_distance) * 50)` |
| **التقييم** | 0–30 | `(rating / 5.0) * 30` |
| **توفر الدواء** | 0 أو 20 | `CASE WHEN drug_available THEN 20 ELSE 0 END` |

```sql
-- المعادلة الكاملة في SQL:
GREATEST(0, 50 - (
  ST_Distance(p.location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) 
  / $max_distance * 50
))
+ (COALESCE(p."averageRating", 0) / 5.0 * 30)
+ (CASE WHEN EXISTS (
    SELECT 1 FROM pharmacy_medicines pm
    WHERE pm."pharmacyId" = p.id AND pm."productId" = $productId AND pm.quantity > 0
  ) THEN 20 ELSE 0 END)
AS total_score
```

يتم إرجاع **أعلى 5 صيدليات** مرتبة حسب `total_score DESC`.

---

## 🔍 ملاحظات أداء (Performance Notes)

### استخدام الفهرس المكاني (GIST Index)

للتأكد من أن الفهرس المكاني يُستخدم، يمكنك تشغيل `EXPLAIN ANALYZE`:

```sql
EXPLAIN ANALYZE
SELECT * FROM pharmacies p
WHERE ST_DWithin(
  p.location::geography,
  ST_SetSRID(ST_MakePoint(31.2357, 30.0444), 4326)::geography,
  5000
);
```

يجب أن ترى `Index Scan using idx_pharmacies_location_gist` في الخطة.

### نصائح تحسين الأداء

1. **استخدم `::geography` دائماً** لحساب المسافات — الدقة بالأمتار ضرورية للتطبيقات الطبية.
2. **الفهرس GIST** يُستخدم تلقائياً مع `ST_DWithin` ولكن ليس مع `ST_Distance` في `ORDER BY` — لذا نستخدم `ST_DWithin` للفلترة أولاً.
3. **لا تستخدم `synchronize: true`** في الإنتاج — استخدم Migrations دائماً.
4. جميع المعاملات مُمرّرة عبر **parameterized queries** (`$1, $2, ...`) — لا يوجد حقن SQL.

---

## 🛡 التحقق من المدخلات (Validation)

جميع المدخلات تخضع للتحقق عبر `class-validator`:

| Field | Validators |
|-------|-----------|
| `lon` | `@IsNumber()`, `@Min(-180)`, `@Max(180)`, `@Type(() => Number)` |
| `lat` | `@IsNumber()`, `@Min(-90)`, `@Max(90)`, `@Type(() => Number)` |
| `radius` | `@IsOptional()`, `@IsNumber()`, `@Min(100)`, `@Max(100000)` |

---

## 📚 المراجع

- [PostGIS Documentation](https://postgis.net/documentation/)
- [ST_DWithin Reference](https://postgis.net/docs/ST_DWithin.html)
- [ST_Distance Reference](https://postgis.net/docs/ST_Distance.html)
- [GeoJSON Specification (RFC 7946)](https://datatracker.ietf.org/doc/html/rfc7946)
