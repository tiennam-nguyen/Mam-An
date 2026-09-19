# SRS — Mâm An Prototype v0.1

**Software Requirements Specification**  
**Trạng thái:** Baseline để chuyển sang System Design / Architecture  
**Phạm vi:** Prototype tương tác phục vụ demo học phần  
**Nền tảng mặc định:** Mobile-first Web/PWA  
**Nguồn đầu vào:** `PRD_Mam_An_Prototype_v0.1.md` và báo cáo dự án Mâm An đã chốt.

---

## 0. Evidence & assumption status

- **[READ]** PRD đã chốt prototype: camera/upload → nhận diện → user correction → chỉnh khẩu phần → carb estimate → lưu bữa → glucose → history → weekly summary; local persistence; không backend database; AI proxy nếu cần giữ secret.
- **[READ]** Báo cáo dự án định vị Mâm An là công cụ hỗ trợ hiểu bữa ăn Việt và ghi nhận bữa ăn–đường huyết, không thay thế chẩn đoán, đơn thuốc hoặc tư vấn bác sĩ.
- **[ASSUMED]** Prototype tiếp tục dùng Web/PWA. Nếu nhóm đổi sang Flutter/React Native, các hành vi và data contract trong SRS giữ nguyên, chỉ đổi adapter camera/persistence/runtime.
- **[ASSUMED]** Có thể dùng một multimodal AI service cho live analysis. Hệ thống vẫn phải chạy demo đầy đủ khi service này không dùng được.
- **[UNKNOWN]** Framework frontend, AI provider, nguồn dinh dưỡng chuẩn hóa, deadline và môi trường deploy cuối cùng chưa được chốt. Đây là input cho Architecture Decision Records, không được tự suy thành requirement mới.

---

# 1. Purpose

SRS này chuyển PRD từ mức **“sản phẩm cần làm gì”** sang mức **“hệ thống phải hành xử ra sao”** để nhóm có thể thiết kế module, interface, data model và deployment topology mà không phải đoán lại ý nghĩa của feature.

Tài liệu cố ý chưa chọn framework/UI library cụ thể. Những gì được khóa ở đây là:

1. hành vi observable của hệ thống;
2. state transition của các flow chính;
3. data contract và tính toàn vẹn dữ liệu;
4. boundary giữa client, AI service, food catalog và local storage;
5. failure behavior;
6. privacy/security constraints;
7. các điều **không được** suy diễn trong lĩnh vực y khoa;
8. các quyết định kỹ thuật đã đủ chắc để trở thành constraint cho kiến trúc.

---

# 2. Scope

## 2.1 In scope — P0

Prototype SHALL hỗ trợ đầy đủ:

- chụp ảnh hoặc chọn ảnh bữa ăn;
- gửi ảnh vào luồng phân tích;
- nhận candidate món/thành phần;
- sửa kết quả nhận diện;
- chỉnh khẩu phần;
- tính lại carbohydrate và kcal ước tính;
- what-if khi thay đổi khẩu phần;
- lưu meal log trên thiết bị;
- nhập glucose reading và tùy chọn liên kết với meal;
- xem history;
- xem summary 7 ngày;
- sample/demo mode độc lập với live AI;
- loading/error/retry/manual fallback;
- safety copy nhất quán.

## 2.2 In scope — P1

- GI/GL tham khảo khi catalog có dữ liệu;
- filter history;
- export/share summary;
- preference đơn vị glucose.

## 2.3 Out of scope

- account/authentication;
- multi-user/multi-device sync;
- backend CRUD database;
- clinician portal;
- payment/subscription;
- CGM/device integration;
- community/social;
- chatbot y khoa mở;
- insulin dosing;
- medication recommendation;
- production compliance program;
- admin CMS đầy đủ.

---

# 3. System context

## 3.1 Primary actor

**End User** — người trưởng thành mắc đái tháo đường type 2, trọng tâm 35–65 tuổi, sử dụng smartphone và chủ động quản lý bữa ăn.

## 3.2 Supporting actors / systems

### A. Device Camera / File Picker

Cung cấp ảnh đầu vào. Hệ thống không được phụ thuộc riêng camera; file upload phải là fallback hợp lệ.

### B. AI Analysis Service

Nhận ảnh và trả candidate món/thành phần/khẩu phần ban đầu. Output của AI là **suggestion**, không phải ground truth.

### C. Food Catalog

Nguồn dữ liệu deterministic để tính carb/kcal cho các món đã chuẩn hóa.

### D. Local Persistence

Lưu meal, glucose, settings, demo metadata trên thiết bị.

### E. Optional AI Proxy

Giữ secret/API key ở server side. Proxy SHALL stateless đối với meal/glucose data ở prototype.

---

# 4. Architecture-driving constraints

Các constraint dưới đây là đầu vào bắt buộc cho bước architecture sau.

| ID | Constraint | Mức |
|---|---|---|
| TC-01 | Prototype là **single local profile / single device**. | P0 |
| TC-02 | Meal/glucose/settings SHALL persist local; **không có backend database** ở v0.1. | P0 |
| TC-03 | Với Web/PWA, persistence mặc định là IndexedDB hoặc abstraction tương đương có persistence qua reload. | P0 |
| TC-04 | Food catalog SHALL là dataset versioned, tách khỏi UI logic. | P0 |
| TC-05 | Carb calculation SHALL chạy deterministic từ catalog + portion; không giao việc tính toán này cho LLM ở mỗi lần render. | P0 |
| TC-06 | Secret của AI provider SHALL không xuất hiện trong frontend bundle/client storage. | P0 |
| TC-07 | Nếu cần secret, frontend SHALL gọi một stateless proxy/serverless endpoint. | P0 |
| TC-08 | Live AI SHALL là dependency có thể thay thế/bypass; demo mode không phụ thuộc nó. | P0 |
| TC-09 | AI response SHALL qua validation/normalization trước khi vào domain model. | P0 |
| TC-10 | Raw AI output SHALL không được render trực tiếp như dữ liệu chuẩn hóa. | P0 |
| TC-11 | Historical meal SHALL lưu snapshot đủ để catalog thay đổi không làm lịch sử tự biến đổi. | P0, derived |
| TC-12 | Unknown nutrition SHALL không bao giờ được ngầm hiểu là 0. | P0, derived |
| TC-13 | Original image không bắt buộc persist sau analysis; nếu lưu, ưu tiên thumbnail/local-only. | P0, derived |
| TC-14 | Deployed web prototype SHALL chạy qua HTTPS; localhost được phép cho development. | P0 |
| TC-15 | Hệ thống SHALL có một đường demo deterministic từ seed/sample data. | P0 |
| TC-16 | Framework, state library, CSS/UI kit, IndexedDB wrapper và AI vendor không bị khóa bởi SRS. | Constraint on architecture process |

**Derived** nghĩa là requirement kỹ thuật được suy ra để bảo toàn tính đúng/safety của PRD, không phải feature mới cho người dùng.

---

# 5. Logical component boundaries

SRS yêu cầu kiến trúc sau này ít nhất phải tách được các trách nhiệm logic sau, dù có thể cùng nằm trong một frontend codebase.

1. **Presentation/UI** — screen, form, loading/error state.
2. **Analysis Session Controller** — quản lý lifecycle của một phiên phân tích meal.
3. **AI Adapter** — gửi request/nhận response provider-specific.
4. **Analysis Normalizer** — chuyển AI response về schema nội bộ.
5. **Catalog Matcher** — map candidate sang FoodItem chuẩn hóa hoặc đánh dấu ambiguous/unmatched.
6. **Nutrition Calculator** — tính item/meal estimate deterministic.
7. **Meal Repository** — persistence và query meals.
8. **Glucose Repository** — persistence và query readings.
9. **Weekly Aggregator** — tính summary từ stored data.
10. **Demo Seed Service** — load/reset demo records, luôn đánh dấu là demo.
11. **Settings Repository** — đơn vị và preference local.

SRS không bắt buộc mỗi trách nhiệm phải là một microservice/module độc lập. Với prototype, chúng có thể là module nội bộ trong một client application.

---

# 6. Core domain model

## 6.1 FoodItem

```text
FoodItem
- id: string, required, stable within catalog version
- name_vi: string, required
- aliases: string[]
- serving_label: string, required
- carb_per_serving: number | null
- kcal_per_serving: number | null
- gi: number | null             [P1]
- gl: number | null             [P1]
- source_note: string | null
- catalog_version: string, required
```

### Invariants

- `id` SHALL uniquely identify a food in one catalog version.
- `carb_per_serving = null` means **unknown**, không phải 0.
- GI/GL không có dữ liệu SHALL là null và không render như 0.
- Food catalog SHALL không chứa user health data.

## 6.2 AnalysisCandidate

Schema provider-neutral sau normalization:

```text
AnalysisCandidate
- raw_name: string
- candidate_food_id: string | null
- match_state: MATCHED | AMBIGUOUS | UNMATCHED
- suggested_portion_multiplier: number | null
- suggested_portion_label: string | null
- provider_confidence: number | null
- provider_metadata: object | null
```

### Rules

- `provider_confidence` chỉ là metadata nếu provider cung cấp; SRS không định nghĩa một threshold số chung vì scale/confidence semantics phụ thuộc provider.
- `UNMATCHED` SHALL không bị ép map vào một món gần giống chỉ để tạo ra carb number.
- `AMBIGUOUS` SHALL yêu cầu người dùng xác nhận/chọn một candidate trước khi kết quả được xem là complete.

## 6.3 MealDraft

Đại diện cho session chưa save.

```text
MealDraft
- session_id: string
- image_preview_ref: local ref | null
- source: CAMERA | FILE | DEMO_SAMPLE
- analysis_state: see §7
- items: MealDraftItem[]
- total_carb_estimate: number | null
- total_kcal_estimate: number | null
- completeness: COMPLETE | PARTIAL | UNKNOWN
- note: string | null
```

## 6.4 MealDraftItem

```text
MealDraftItem
- item_id: string
- food_id: string | null
- display_name: string
- portion_multiplier: number
- portion_label: string
- carb_estimate: number | null
- kcal_estimate: number | null
- user_corrected: boolean
- included_in_total: boolean
- nutrition_state: KNOWN | UNKNOWN
```

### Invariants

- `portion_multiplier > 0` đối với item được tính.
- Item `nutrition_state=UNKNOWN` SHALL có `carb_estimate=null`, không phải 0.
- Nếu một item UNKNOWN vẫn được giữ trong bữa, meal `completeness` SHALL là PARTIAL.

## 6.5 Meal — persisted snapshot

```text
Meal
- id: string
- created_at: timestamp
- source: CAMERA | FILE | DEMO_SAMPLE
- thumbnail_ref: local ref | null
- catalog_version: string
- items: PersistedMealItem[]
- total_carb_estimate: number | null
- total_kcal_estimate: number | null
- completeness: COMPLETE | PARTIAL | UNKNOWN
- note: string | null
- is_demo: boolean
```

`PersistedMealItem` SHALL lưu snapshot của:

- food_id nếu có;
- display_name;
- portion_multiplier + label;
- carb/kcal estimate tại thời điểm save;
- user_corrected;
- nutrition state.

**Không được** render historical meal bằng cách lấy catalog hiện tại rồi tính lại ngầm.

## 6.6 GlucoseReading

```text
GlucoseReading
- id: string
- value: number
- unit: MG_DL | MMOL_L
- measured_at: timestamp
- meal_id: string | null
- timing_tag: BEFORE_MEAL | AFTER_MEAL | OTHER | null
- note: string | null
- is_demo: boolean
```

### Invariants

- `value` SHALL là numeric và > 0.
- SRS không gắn medical classification/target zone vào `value`.
- `meal_id` là optional reference.
- Một reading có thể tồn tại độc lập với meal.

## 6.7 UserSettings

```text
UserSettings
- glucose_unit: MG_DL | MMOL_L
- demo_mode_enabled: boolean
```

## 6.8 WeeklySummary

Không persist như source-of-truth. Tính từ Meal + GlucoseReading.

```text
WeeklySummary
- period_start
- period_end
- logged_meal_count
- daily_logged_carb_estimates[]
- glucose_readings[]
- completeness_note
```

---

# 7. Meal analysis state machine

Một analysis session SHALL tuân state machine sau:

```text
IDLE
  -> IMAGE_SELECTED
  -> ANALYZING
      -> REVIEW_REQUIRED
      -> ANALYSIS_ERROR
  REVIEW_REQUIRED
      -> REVIEW_READY
      -> ANALYSIS_ERROR
  REVIEW_READY
      -> SAVING
      -> REVIEW_READY   (sửa lại item/portion)
  SAVING
      -> SAVED
      -> SAVE_ERROR
  ANALYSIS_ERROR
      -> ANALYZING      (retry)
      -> REVIEW_READY   (manual/catalog fallback)
      -> IDLE           (cancel)
  SAVE_ERROR
      -> SAVING         (retry)
      -> REVIEW_READY
```

### State requirements

- Hệ thống SHALL không cho Save khi không có item nào trong draft.
- Hệ thống MAY cho Save một meal PARTIAL nếu còn item unknown, nhưng UI SHALL báo total chưa đầy đủ.
- User correction SHALL chỉ thay đổi draft cho tới khi Save thành công.
- Khi Save lỗi, draft SHALL không bị mất.
- Sau `SAVED`, history query SHALL đọc được meal vừa lưu mà không cần reload app.

---

# 8. Detailed functional requirements

## SRS-FR-001 — Image acquisition

**Priority:** P0  
**Trace:** PRD FR-01

System SHALL:

1. cho phép chọn `CAMERA` hoặc `FILE` khi platform hỗ trợ;
2. hiển thị preview trước khi analysis;
3. cho phép replace/cancel ảnh;
4. không bắt buộc camera để hoàn tất flow;
5. reject hoặc xử lý gracefully file không phải image;
6. chuyển session sang `IMAGE_SELECTED` khi ảnh hợp lệ.

**Failure:** file lỗi/không đọc được → giữ user ở acquisition screen, không tạo meal record.

---

## SRS-FR-002 — Submit analysis

**Priority:** P0  
**Trace:** PRD FR-02, NFR-03

Khi user chọn Analyze:

1. state SHALL chuyển sang `ANALYZING`;
2. UI SHALL hiển thị loading state ngay, không để trạng thái “đứng im”;
3. image SHALL đi qua AI adapter/proxy;
4. response SHALL được schema-validate;
5. invalid/malformed response SHALL thành `ANALYSIS_ERROR`, không render thẳng;
6. successful response SHALL đi qua normalizer + catalog matcher;
7. session SHALL vào `REVIEW_REQUIRED/REVIEW_READY`.

---

## SRS-FR-003 — AI normalization and catalog matching

**Priority:** P0  
**Trace:** PRD FR-02, FR-03

System SHALL phân loại mỗi candidate thành:

- `MATCHED`: map được vào một FoodItem;
- `AMBIGUOUS`: có nhiều candidate hợp lý hoặc không đủ chắc để auto-select;
- `UNMATCHED`: không có mapping phù hợp.

Rules:

- MATCHED item có thể prefill nutrition data.
- AMBIGUOUS item SHALL cần confirmation.
- UNMATCHED item SHALL cho user chọn từ catalog hoặc nhập tên thủ công.
- Manual custom name không có nutrition mapping SHALL được giữ với `nutrition_state=UNKNOWN`.
- Hệ thống SHALL không bịa nutrition value cho custom item unknown.

---

## SRS-FR-004 — User correction

**Priority:** P0  
**Trace:** PRD FR-03, UC-02

User SHALL có thể:

- đổi món đã match sang món khác trong catalog;
- sửa display name;
- thêm item;
- xóa item khỏi draft;
- đánh dấu/giữ item custom;
- sửa portion.

Sau correction:

- `user_corrected=true` cho item liên quan;
- calculator SHALL recompute item/meal estimate;
- AI SHALL không tự ghi đè correction của user trong cùng session.

---

## SRS-FR-005 — Portion model

**Priority:** P0  
**Trace:** PRD FR-04

Mỗi item SHALL có một reference serving từ catalog và một `portion_multiplier`.

UI SHALL hỗ trợ ít nhất các thao tác quick-adjust tương đương với:

- giảm portion;
- reset về reference serving;
- tăng portion.

UI MAY dùng chips như 0.5× / 1× / 1.5×; SRS không khóa control cụ thể.

Rules:

- portion SHALL > 0;
- invalid text/number SHALL không vào calculator;
- user không bị bắt buộc nhập gram để hoàn thành core flow.

---

## SRS-FR-006 — Nutrition calculation

**Priority:** P0  
**Trace:** PRD FR-05, FR-06, FR-07

Đối với FoodItem có nutrition data:

```text
item_carb_estimate = carb_per_serving × portion_multiplier
item_kcal_estimate = kcal_per_serving × portion_multiplier
meal_total = sum(known included items)
```

Rules:

1. calculator SHALL deterministic;
2. calculator SHALL dùng full internal precision; rounding chỉ là presentation concern;
3. thay portion SHALL trigger recomputation;
4. item unknown SHALL không cộng như 0;
5. nếu tồn tại item unknown, meal total SHALL được gắn `PARTIAL`;
6. UI SHALL nói rõ total hiện tại chưa bao gồm item unknown;
7. carb là primary metric; kcal là supporting metric.

---

## SRS-FR-007 — What-if behavior

**Priority:** P0  
**Trace:** PRD FR-07

Khi user thay portion:

- UI SHALL cho thấy current estimate mới;
- UI SHOULD hiển thị delta so với state trước khi user thay đổi;
- copy SHALL mô tả thay đổi về số liệu, ví dụ “ước tính giảm/tăng …”, không chuyển thành mệnh lệnh ăn uống;
- system SHALL không gắn nhãn “an toàn”, “nguy hiểm”, “được ăn”, “cấm ăn”.

---

## SRS-FR-008 — Save meal

**Priority:** P0  
**Trace:** PRD FR-08

Khi user Save:

1. system SHALL tạo stable local meal ID;
2. snapshot SHALL chứa các field ở §6.5;
3. timestamp SHALL lấy theo device time và được persist ở dạng không mơ hồ; presentation dùng timezone local;
4. nếu có image persistence, ưu tiên thumbnail/local reference;
5. save transaction SHALL atomic ở mức meal record: hoặc record hợp lệ tồn tại, hoặc không tạo partial record;
6. save thành công → state `SAVED`;
7. save lỗi → state `SAVE_ERROR`, draft vẫn còn.

---

## SRS-FR-009 — Enter glucose reading

**Priority:** P0  
**Trace:** PRD FR-09, UC-03

Form SHALL có:

- value;
- unit;
- measured_at;
- optional meal link;
- optional timing tag;
- optional note.

Validation SHALL kiểm tra technical validity:

- value là số;
- value > 0;
- timestamp parse được;
- unit thuộc enum được hỗ trợ.

System SHALL **không** dùng form validation để biến một value thành diagnosis/medical target classification.

---

## SRS-FR-010 — Link glucose to meal

**Priority:** P0  
**Trace:** PRD FR-09

- User MAY tạo reading từ meal detail; khi đó meal được preselected.
- User MAY tạo reading độc lập rồi chọn một meal gần đây.
- Link SHALL là optional.
- App SHALL trình bày đây là association do user ghi nhận, không phải causal relation do hệ thống suy luận.

---

## SRS-FR-011 — History

**Priority:** P0  
**Trace:** PRD FR-10, UC-04

History SHALL:

- query local persisted meals;
- sort newest-first mặc định;
- hiển thị tối thiểu timestamp, item names, carb estimate/completeness và glucose count/linked value nếu có;
- mở được meal detail;
- distinguish demo data from user-created data;
- không thay đổi historical nutrition number khi catalog version thay đổi.

**Empty state:** nếu không có data, UI SHALL hướng user về “Chụp bữa ăn” hoặc load demo data; không render chart giả.

---

## SRS-FR-012 — Weekly summary

**Priority:** P0  
**Trace:** PRD FR-11, UC-05

### Period semantics

- “7 ngày” = 7 calendar days gần nhất theo device local timezone, bao gồm ngày hiện tại.

### Inputs

- persisted Meals trong window;
- persisted GlucoseReadings trong window.

### Output tối thiểu

- số **bữa đã ghi**, không gọi là tổng số bữa người dùng đã ăn;
- carb estimate theo từng ngày từ **các bữa đã ghi**;
- danh sách/plot các glucose readings đã nhập;
- indicator nếu có meal PARTIAL;
- note rằng summary phản ánh data được log, không phải toàn bộ intake.

### Forbidden inference

Weekly view SHALL NOT:

- tuyên bố món X “gây” glucose Y;
- kết luận chẩn đoán;
- sinh medication/insulin advice;
- ngầm coi thiếu log là 0 intake.

---

## SRS-FR-013 — Demo seed mode

**Priority:** P0  
**Trace:** PRD FR-13

Demo mode SHALL:

1. có một tập ảnh/sample analysis cố định;
2. có thể seed meal/glucose history để weekly view có dữ liệu;
3. gắn `is_demo=true` cho mọi seeded record;
4. hiển thị rõ sample/demo state;
5. không giả sample result là live AI;
6. có thao tác reset demo data về baseline;
7. không xóa user-created data khi reset demo, trừ khi user chọn clear-all rõ ràng.

---

## SRS-FR-014 — AI failure recovery

**Priority:** P0  
**Trace:** PRD NFR-03, ambiguity resolution

Khi AI call fail/timeout/invalid:

- UI SHALL nêu lỗi theo ngôn ngữ người dùng hiểu được;
- SHALL cho Retry;
- SHALL cho dùng sample/demo analysis hoặc tiếp tục bằng catalog/manual flow;
- SHALL không mất image preview/draft data của session hiện tại khi có thể giữ local;
- SHALL không tạo persisted Meal chỉ vì analysis request đã xảy ra.

---

## SRS-FR-015 — Safety copy

**Priority:** P0  
**Trace:** PRD FR-12

Các surface sau SHALL sử dụng wording “ước tính/tham khảo” một cách nhất quán:

- meal result;
- portion what-if;
- weekly summary;
- GI/GL nếu có.

App SHALL không phát sinh:

- diagnosis;
- prescription;
- insulin dose;
- suggestion thay đổi thuốc;
- claim rằng một món chắc chắn làm tăng/giảm glucose của user.

---

## SRS-FR-016 — GI/GL [P1]

- GI/GL chỉ render nếu FoodItem có data tương ứng.
- Missing data SHALL không render 0.
- GI/GL SHALL có label “tham khảo”.
- SRS không yêu cầu dùng GI/GL để tính meal recommendation.

---

## SRS-FR-017 — Glucose unit preference [P1]

- User SHALL chọn default unit cho entry mới.
- Setting SHALL persist local.
- SRS v0.1 không yêu cầu mixed-unit analytics hoặc automatic historical conversion.
- Nếu implementation cho phép đổi unit của historical display, conversion logic SHALL được test riêng và không làm mất original value/unit.

---

## SRS-FR-018 — Export/share [P1]

- User initiates export explicitly.
- Export SHALL chứa summary data đã hiển thị và safety note.
- Không có auto-sharing tới third party.
- Export SHALL không yêu cầu clinician account ở v0.1.

---

# 9. Data flows

## DF-01 — Live meal analysis

```text
User
 -> Camera/File Picker
 -> Image Preview
 -> Analysis Session Controller
 -> AI Adapter
 -> Optional Stateless Proxy
 -> External AI Service
 <- Raw Provider Response
 -> Response Validator
 -> Analysis Normalizer
 -> Catalog Matcher
 -> MealDraft Items
 -> Nutrition Calculator
 -> Review UI
```

### Boundary rules

- Raw image leaves device only khi user kích hoạt analysis.
- Raw provider response không đi thẳng vào UI/domain storage.
- Nutrition total được tính từ normalized item + local catalog, không lấy một total opaque từ AI làm source-of-truth.

## DF-02 — Manual fallback

```text
AI Error / Unmatched Candidate
 -> Catalog Search / Custom Name
 -> Portion Input
 -> Catalog Nutrition Lookup
 -> Calculator
 -> Review UI
```

Không có nutrition mapping → item UNKNOWN → total PARTIAL.

## DF-03 — Persist meal

```text
MealDraft
 -> Domain Validation
 -> Snapshot Builder
 -> Meal Repository
 -> Local Persistence
 -> History Query Cache/View
```

Không có server database trong flow.

## DF-04 — Glucose entry

```text
User Form
 -> Technical Validation
 -> Optional Meal Lookup
 -> Glucose Repository
 -> Local Persistence
 -> Meal Detail / History / Weekly Query
```

## DF-05 — Weekly summary

```text
Current Local Date
 -> derive 7-day window
 -> Meal Repository query
 -> Glucose Repository query
 -> Weekly Aggregator
 -> Summary View Model
 -> UI
```

Aggregator SHALL không ghi ngược computed summary thành source-of-truth.

## DF-06 — Demo seed

```text
Demo Seed Dataset
 -> Seed Service
 -> mark is_demo=true
 -> Local Persistence
 -> normal repositories
 -> History / Weekly UI
```

Demo data đi qua cùng read-path với real local data để demo đúng hành vi hệ thống thay vì render hardcoded screen riêng.

---

# 10. External interface requirements

## 10.1 AI Adapter interface

Architecture SHOULD expose một provider-neutral contract tương đương:

```text
analyzeMealImage(image) -> AnalysisResult

AnalysisResult
- request_id
- candidates[]
- raw_provider_metadata?  // optional, not UI source
```

### Requirements

- provider error SHALL map về internal error type;
- provider response SHALL be validated;
- adapter SHALL be replaceable mà không thay domain model;
- API key SHALL server-side nếu provider cần secret.

## 10.2 Food Catalog interface

Tối thiểu:

```text
getFoodById(id)
searchFood(query)
getCatalogVersion()
```

Catalog SHALL read-only trong prototype runtime.

## 10.3 Persistence interface

Logical repositories cần support:

```text
MealRepository
- save(meal)
- getById(id)
- list(range?, filters?)

GlucoseRepository
- save(reading)
- getById(id)
- list(range?, mealId?)

SettingsRepository
- get()
- save(settings)
```

Exact IndexedDB schema/object-store naming thuộc architecture.

---

# 11. Error taxonomy

Architecture SHALL map lỗi kỹ thuật về một set domain-facing error ổn định.

| Error | Meaning | Required user behavior |
|---|---|---|
| INVALID_IMAGE | File không đọc được/không phải image | Chọn lại ảnh |
| NETWORK_UNAVAILABLE | Không có network cho live AI | Retry hoặc demo/manual fallback |
| AI_TIMEOUT | Provider/proxy quá lâu | Retry/fallback; draft giữ nguyên |
| AI_INVALID_RESPONSE | Response không đúng schema | Fallback; không render raw output |
| CATALOG_UNMATCHED | Không map được món | Catalog search/custom item |
| NUTRITION_UNKNOWN | Item thiếu nutrition | Đánh dấu PARTIAL, không dùng 0 |
| STORAGE_WRITE_FAILED | Không persist được | Giữ draft/read input; cho retry |
| STORAGE_READ_FAILED | Không đọc history được | Error state; không render fake empty state |
| INVALID_INPUT | Form/value không hợp lệ | Inline validation; không persist |

SRS không quy định exception class cụ thể.

---

# 12. Non-functional requirements

## NFR-01 — Usability / mobile-first

- Core flow SHALL usable trên viewport điện thoại.
- Core interaction SHALL không phụ thuộc hover.
- Correction/portion controls SHALL ở ngay review screen, không đẩy user qua form dài.
- UI SHALL không yêu cầu cân gram để hoàn tất flow.

**Verification:** walkthrough UC-01 trên một mobile viewport + device thật hoặc browser responsive mode.

## NFR-02 — Responsiveness

- Mọi user action SHALL có immediate visual acknowledgement: state change, loading, disabled state hoặc feedback.
- External AI latency SHALL không làm UI trông frozen.
- Local calculation SHALL xảy ra trong client flow, không phụ thuộc một network round-trip mới cho mỗi portion change.

**Verification:** throttle network để AI chậm; portion changes vẫn update bằng local calculator.

## NFR-03 — Reliability / demo determinism

- UC-01 đến UC-05 SHALL có thể demo mà không chỉnh code/data bằng tay giữa buổi.
- Live AI failure SHALL không chặn toàn bộ demo.
- Seed reset SHALL đưa demo data về baseline xác định.

**Verification:** ngắt network trước demo; chạy sample path end-to-end.

## NFR-04 — Data integrity

- Unknown ≠ zero.
- Historical meal estimate SHALL không bị catalog update làm đổi ngầm.
- Failed save SHALL không tạo half-written meal.
- Demo/user records SHALL distinguishable.

**Verification:** test unknown item, catalog version change fixture, simulated storage error.

## NFR-05 — Privacy minimization

- App SHALL không yêu cầu name/email/phone để dùng prototype.
- Meal/glucose history SHALL local-only ở v0.1.
- Backend/proxy SHALL không cần persist meal/glucose history.
- Image transmission tới AI SHALL chỉ xảy ra cho action analysis.
- UI/demo notes SHALL nói rõ ảnh có thể được gửi tới external AI service khi live analysis được dùng.

## NFR-06 — Security

- Không secret/API key trong client code/build artifact/local storage.
- External calls SHALL use HTTPS.
- AI response SHALL được coi là untrusted input và schema-validated.
- User-provided text SHALL không được dùng như executable HTML/code.
- Export/share SHALL là explicit user action.

## NFR-07 — Medical safety

- Safety wording SHALL nhất quán với §8 SRS-FR-015.
- Một number hoặc trend SHALL không tự động chuyển thành diagnosis/recommendation.
- No insulin/medication logic tồn tại trong prototype code path.

**Verification:** static copy audit + feature inventory before demo.

## NFR-08 — Maintainability

- Food data SHALL tách khỏi view components.
- AI provider-specific logic SHALL nằm sau adapter.
- Calculator SHALL là pure/deterministic logic có unit tests.
- Repositories SHALL che persistence implementation khỏi UI.

## NFR-09 — Testability

Ít nhất các phần sau SHALL test độc lập được:

1. carb/kcal calculator;
2. completeness rule;
3. AI normalization schema;
4. catalog matching outcomes;
5. weekly window + aggregation;
6. persistence round-trip;
7. demo seed/reset;
8. safety copy smoke check hoặc review checklist.

## NFR-10 — Accessibility baseline

- Input SHALL có visible/accessible label.
- State SHALL không truyền đạt chỉ bằng màu.
- Text/action chính SHALL có contrast/readability đủ cho mobile demo.

## NFR-11 — Observability for development/demo

Prototype SHOULD có developer-safe logging cho:

- analysis request start/end/error type;
- normalization/match state;
- storage error type;
- seed/reset event.

Logs SHALL không in secret và SHOULD tránh raw health/image data.

---

# 13. Persistence semantics

## 13.1 Source of truth

| Data | Source of truth |
|---|---|
| Food nutrition | versioned local food catalog |
| Current analysis | MealDraft in session/application state |
| Saved meals | local Meal repository |
| Glucose | local Glucose repository |
| Weekly summary | derived query, not persisted |
| AI raw response | transient/debug-only; not authoritative |

## 13.2 Versioning

- `catalog_version` SHALL được gắn vào Meal snapshot.
- Persistence schema SHOULD có version number để architecture có thể migrate nếu model đổi.
- Prototype không yêu cầu production-grade migration framework, nhưng schema version không được hoàn toàn implicit.

## 13.3 Deletion/editing — derived scope decision

PRD không yêu cầu CRUD history đầy đủ.

**[INFERRED]** Để tránh mở rộng scope, v0.1 P0 chỉ yêu cầu create/read cho meal/glucose và reset demo data. Edit/delete historical record có thể là P1.

Nếu architecture vẫn triển khai delete:

- deleting a meal SHOULD không tự xóa glucose reading;
- linked reading SHOULD được unlink hoặc user confirm cascade;
- không silent cascade.

---

# 14. Offline/degraded-mode behavior

## Offline nhưng app đã load

SHALL vẫn hỗ trợ:

- xem local history;
- xem weekly summary từ local data;
- nhập glucose local;
- chỉnh/sử dụng meal data nếu flow không cần live AI;
- sample/demo flow nếu sample assets bundled/cached.

MAY không hỗ trợ live AI analysis.

## AI service down

System SHALL degrade sang:

1. retry;
2. sample analysis;
3. catalog/manual correction flow.

Không được degrade thành fake “AI success”.

---

# 15. Use-case specifications

## UC-01 — Analyze and save meal

**Preconditions**

- App loaded.
- Food catalog available locally.

**Main flow**

1. User taps “Chụp/Chọn ảnh”.
2. App obtains image and shows preview.
3. User taps Analyze.
4. App enters loading.
5. AI returns candidate(s); app normalizes/matches catalog.
6. App shows editable meal draft.
7. User corrects food/portion as needed.
8. Calculator updates estimate.
9. User reviews estimate/completeness.
10. User taps Save.
11. Meal snapshot persists locally.
12. App confirms save and can navigate history/detail.

**Alternate A — AI fails**

- Step 5 fails → show retry/manual/demo fallback → user continues without losing selected image.

**Alternate B — unknown item**

- Candidate has no catalog nutrition → user may choose catalog item or keep custom item → total marked PARTIAL.

**Postconditions**

- Exactly one persisted Meal if save succeeds.
- No persisted Meal if user cancels before save.

---

## UC-02 — Correct AI result

**Precondition:** MealDraft exists.

1. User selects incorrect item.
2. User searches/selects replacement or enters custom name.
3. Item marks `user_corrected=true`.
4. Calculator recomputes using replacement nutrition if known.
5. User remains on review screen.

**Postcondition:** AI result never overrides user correction automatically.

---

## UC-03 — Add glucose reading to meal

**Precondition:** Meal exists or user enters glucose from standalone form.

1. User opens “Thêm số đo”.
2. App preselects meal if launched from meal detail.
3. User enters value/unit/time.
4. App validates technical format.
5. Reading saves locally.
6. Meal detail/history shows association.

**Postcondition:** No diagnosis or causal statement generated.

---

## UC-04 — View history

1. App queries local Meal repository.
2. Results sort newest-first.
3. User opens a meal.
4. Detail renders persisted snapshot + linked glucose readings.

**Failure:** storage read error ≠ empty history. UI SHALL distinguish error from no data.

---

## UC-05 — View weekly summary

1. App derives local 7-day window.
2. Queries meals/readings.
3. Aggregator computes logged-meal metrics.
4. View labels all data as logged/estimated where applicable.
5. No causal/medical inference.

---

## UC-06 — Run deterministic demo

1. Presenter enables/chooses demo mode.
2. App loads sample image/result or seeded history.
3. Presenter performs same UI flow as normal user.
4. Records are labeled demo.
5. Presenter can reset demo dataset before another run.

---

# 16. Acceptance test matrix

| Test ID | Scenario | Pass condition |
|---|---|---|
| AT-01 | Valid sample image → analysis | Editable meal draft appears |
| AT-02 | AI wrong item → user corrects | Estimate changes and correction persists in draft |
| AT-03 | Portion change | Carb recomputes without new AI/network request |
| AT-04 | Unknown item | Total is PARTIAL; unknown not counted as zero |
| AT-05 | Save meal | Reload app → meal remains in history |
| AT-06 | Storage write fail | Draft remains; no corrupt meal record |
| AT-07 | Add glucose | Reading persists and can link to meal |
| AT-08 | Weekly view | Uses last 7 local calendar days and labels metrics as logged |
| AT-09 | AI unavailable | Retry/fallback path exists; demo still completable |
| AT-10 | Catalog update fixture | Existing saved meal number remains unchanged |
| AT-11 | Demo reset | Seeded records reset; user-created records remain |
| AT-12 | Secret scan | Frontend artifact/config contains no AI secret |
| AT-13 | Safety copy audit | No diagnosis/insulin/medication advice in UI surfaces |
| AT-14 | History read error | UI shows error, not fake empty state |

---

# 17. PRD → SRS traceability

| PRD requirement | SRS coverage |
|---|---|
| FR-01 Image capture | SRS-FR-001 |
| FR-02 Recognition | SRS-FR-002, 003 |
| FR-03 Correction | SRS-FR-004 |
| FR-04 Portion | SRS-FR-005 |
| FR-05 Carb | SRS-FR-006 |
| FR-06 kcal | SRS-FR-006 |
| FR-07 What-if | SRS-FR-007 |
| FR-08 Save meal | SRS-FR-008 |
| FR-09 Glucose | SRS-FR-009, 010 |
| FR-10 History | SRS-FR-011 |
| FR-11 Weekly | SRS-FR-012 |
| FR-12 Safety | SRS-FR-015, NFR-07 |
| FR-13 Demo mode | SRS-FR-013, NFR-03 |
| FR-14 GI/GL | SRS-FR-016 |
| FR-16 Export | SRS-FR-018 |
| FR-17 Unit | SRS-FR-017 |
| NFR-03 Failure safe | SRS-FR-014, error taxonomy |
| NFR-04 Transparency | calculator/completeness rules |
| NFR-06 Privacy | NFR-05/06 |
| NFR-07 Deterministic demo | SRS-FR-013, UC-06 |
| NFR-09 Maintainable food data | TC-04, NFR-08 |

---

# 18. Ambiguities resolved for system design

## A. AI decides carb or catalog decides carb?

**Decision:** AI identifies/suggests; local normalized catalog + calculator is source for carb/kcal calculation.

**Reason:** keeps estimate explainable, editable and deterministic.

## B. AI cannot identify a dish — block flow?

**Decision:** No. User can select catalog/manual item. Unknown nutrition produces PARTIAL, never fake 0.

## C. Recalculate historical meals when catalog changes?

**Decision:** No. Historical meal stores snapshot + catalog version.

## D. Store raw image forever?

**Decision:** Not required. Persist thumbnail only if useful for history; original can remain transient. This minimizes local storage/privacy surface.

## E. Weekly summary means full dietary intake?

**Decision:** No. It summarizes **logged meals only** and UI must say so.

## F. Glucose reading implies meal caused result?

**Decision:** No. Link is association chosen by user, not causal inference.

## G. Backend database needed?

**Decision:** No for v0.1. Client persistence + optional stateless AI proxy only.

## H. Live AI mandatory for demo?

**Decision:** No. It may enhance demo; deterministic sample flow is mandatory.

## I. Numeric AI confidence threshold?

**Decision:** Not specified globally. Provider adapter/matcher architecture may define provider-specific rules after provider is chosen. SRS only requires MATCHED/AMBIGUOUS/UNMATCHED outcomes.

## J. Edit/delete past records?

**Decision:** Not P0 because PRD did not require it. Create/read + demo reset are enough for prototype baseline; add history edit/delete as P1 if implementation time allows.

---

# 19. Open decisions for architecture phase

Các điểm này **không được đoán trong SRS**. Architecture phase phải ra ADR hoặc spike nếu chúng ảnh hưởng design.

1. **Frontend framework:** React/Vue/Svelte/khác.
2. **IndexedDB access:** native API hay library wrapper.
3. **AI provider/model:** contract, pricing, image limits, latency, retention policy.
4. **Proxy runtime:** serverless platform nào nếu cần secret.
5. **Image preprocessing:** resize/compress strategy và provider limits.
6. **Food catalog source:** nguồn dinh dưỡng nào, cách provenance/versioning.
7. **Deployment:** hosting domain, HTTPS, environment config.
8. **Export format P1:** print view hay PDF generation.
9. **PWA offline caching:** mức nào cần service worker so với chỉ persistence local.

---

# 20. Architecture readiness gate

SRS được xem là đủ để bắt đầu kiến trúc khi team có thể trả lời “có” cho các câu sau:

- Có thể vẽ component boundary mà không cho UI gọi AI provider trực tiếp bằng secret?
- Có một data model phân biệt draft, persisted meal, catalog item và AI candidate?
- Có cách biểu diễn UNKNOWN/PARTIAL mà không biến nó thành 0?
- Có persistence boundary không buộc UI biết IndexedDB details?
- Có calculator deterministic độc lập AI?
- Có demo mode chạy cùng read-path với product data?
- Có failure path cho network/AI/storage?
- Có data snapshot strategy để history không mutate theo catalog?
- Có local-only health data path ở v0.1?
- Có một đường từ UC-01 → UC-05 không cần backend DB?

Nếu bất kỳ câu nào là “không”, architecture chưa được phép tối ưu framework/deployment trước khi joint đó được giải quyết.

---

# 21. Assumption ledger

- **[ASSUMED]** Web/PWA remains the delivery platform for v0.1.
- **[ASSUMED]** One local user/profile per browser/device is sufficient for demo.
- **[ASSUMED]** Live AI provider is optional to proposition validation because deterministic sample mode is accepted as prototype support.
- **[ASSUMED]** Food catalog nutrition data will be curated/versioned by the team before it is used in demo estimates.
- **[INFERRED]** Historical snapshots, explicit PARTIAL state, schema validation and demo/user separation are necessary engineering requirements to preserve the PRD’s transparency/safety promises.
- **[UNKNOWN]** AI vendor limits/retention, exact food-data source, framework, hosting and export mechanism remain unresolved and should be handled in Architecture/ADR rather than silently fixed here.
