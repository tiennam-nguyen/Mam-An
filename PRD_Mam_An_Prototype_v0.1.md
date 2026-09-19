# PRD — Mâm An Prototype v0.1

**Trạng thái:** Draft để bắt đầu thiết kế/implementation  
**Mục tiêu phiên bản:** Prototype tương tác để demo cho giảng viên, chứng minh trọn vẹn luồng giá trị cốt lõi trước khi đầu tư vào MVP thật.  
**Phạm vi người dùng:** Người trưởng thành mắc đái tháo đường type 2, ưu tiên 35–65 tuổi, dùng smartphone và chủ động quản lý bữa ăn hằng ngày.  
**Giả định nền tảng:** Mobile-first web app/PWA. Nếu nhóm chọn Flutter/React Native, functional requirements giữ nguyên; lớp lưu trữ local đổi tương ứng.

---

## 1. Product definition

Mâm An là trợ lý bữa ăn Việt giúp người dùng trả lời 4 câu hỏi ngay quanh một bữa ăn:

1. Đây là món gì / gồm những phần chính nào?
2. Khẩu phần hiện tại ước tính chứa bao nhiêu carbohydrate?
3. Nếu thay đổi khẩu phần, con số ước tính thay đổi ra sao?
4. Sau bữa ăn, đường huyết của chính người dùng phản ứng thế nào theo thời gian?

Mâm An là **công cụ hỗ trợ hiểu bữa ăn và ghi nhận dữ liệu**, không phải công cụ chẩn đoán, kê đơn, tính liều insulin hay thay thế hướng dẫn của bác sĩ.

### Product principle

- Camera là điểm vào; chỉnh sửa nhanh là cơ chế sửa sai.
- Kết quả luôn được gọi là **ước tính**, không trình bày như sự thật tuyệt đối.
- Người dùng phải nhìn thấy và sửa được giả định về món/khẩu phần trước khi lưu.
- Không dùng ngôn ngữ phán xét “tốt/xấu”, “được ăn/cấm ăn”.
- Một tính năng không được làm bữa ăn phức tạp hơn vấn đề nó đang giải quyết.

---

## 2. Prototype vs. MVP thật

Báo cáo nhóm đặt MVP ở mức nhận diện khoảng 50–100 món Việt, chỉnh khẩu phần, ước tính carbohydrate, nhật ký bữa ăn, nhập đường huyết và báo cáo tuần. Prototype hiện tại **không phải MVP production**; nó chỉ cần chứng minh luồng này một cách đáng tin cậy trên tập dữ liệu hẹp.

| Hạng mục | Prototype demo v0.1 | MVP sau này |
|---|---|---|
| Món Việt | Tập demo nhỏ, curated; ưu tiên các món dùng trong kịch bản demo | 50–100 món phổ biến |
| Nhận diện ảnh | API AI hoặc demo-mode có kiểm soát; bắt buộc cho phép sửa | Pipeline nhận diện được đánh giá trên tập dữ liệu thật |
| Dữ liệu người dùng | Lưu local trên thiết bị | Tài khoản + cloud sync nếu cần |
| Báo cáo tuần | Tóm tắt 7 ngày cơ bản; có thể seed dữ liệu demo | Báo cáo cá nhân hóa, dài hạn |
| Bác sĩ/chuyên gia | Không có portal | Có thể chia sẻ báo cáo khi người dùng chủ động |
| Thiết bị đo | Nhập tay | Tích hợp thiết bị ở giai đoạn sau |

---

## 3. Goals và success criteria của prototype

### Goals

- Chứng minh trải nghiệm “chụp → hiểu carb → chỉnh khẩu phần → lưu → nhập đường huyết → xem lại xu hướng”.
- Cho giảng viên thấy điểm khác biệt của Mâm An không chỉ là nhận diện ảnh, mà là **vòng phản hồi bữa ăn–đường huyết** và trải nghiệm phù hợp món Việt.
- Chứng minh người dùng có thể sửa AI thay vì bị buộc phải tin AI.
- Giữ prototype đủ nhỏ để hoàn thành và demo ổn định.

### Demo success criteria

Prototype được xem là đạt khi nhóm có thể thực hiện trọn vẹn các kịch bản UC-01 đến UC-05 bên dưới mà không phải sửa dữ liệu thủ công trong code giữa chừng, và hệ thống không đưa ra chỉ dẫn điều trị/y khoa vượt phạm vi.

---

## 4. Priority model

- **P0 — Must demo:** thiếu là mất proposition cốt lõi.
- **P1 — Should have:** tăng độ thuyết phục nhưng không chặn demo.
- **P2 — Later:** có giá trị cho MVP thật nhưng không đáng lấy thời gian prototype.

---

## 5. Functional requirements

| ID | Priority | Requirement | Acceptance criteria cho prototype |
|---|---|---|---|
| FR-01 | P0 | **Chụp hoặc tải ảnh bữa ăn** | Người dùng có thể mở camera/chọn ảnh và gửi ảnh vào luồng phân tích. Có preview và nút chụp/chọn lại. |
| FR-02 | P0 | **Nhận diện món/thành phần chính** | Hệ thống trả về ít nhất tên món hoặc các thành phần chính cho các ảnh demo đã chuẩn bị. Với kết quả không chắc, UI không được giả vờ chắc chắn; phải cho phép sửa. |
| FR-03 | P0 | **Xác nhận/sửa món** | Người dùng có thể thay tên món, thêm/xóa một thành phần chính trước khi tính tổng. |
| FR-04 | P0 | **Chỉnh khẩu phần nhanh** | Mỗi item có cách tăng/giảm khẩu phần đơn giản (ví dụ 1/2, 1, 1.5 phần hoặc đơn vị quen thuộc). Không bắt buộc người dùng cân từng gram để hoàn thành luồng. |
| FR-05 | P0 | **Ước tính carbohydrate** | Sau khi món và khẩu phần thay đổi, tổng carbohydrate ước tính được cập nhật ngay; hiển thị rõ đây là “ước tính”. |
| FR-06 | P0 | **Hiển thị năng lượng cơ bản** | Có thể hiển thị kcal ước tính như thông tin phụ. Carb là chỉ số chính, kcal không được lấn át mục tiêu sản phẩm. |
| FR-07 | P0 | **What-if khi chỉnh khẩu phần** | Người dùng thấy được chênh lệch carb trước/sau khi giảm/tăng phần ăn; hệ thống mô tả thay đổi theo con số, không ra lệnh “nên ăn/cấm ăn”. |
| FR-08 | P0 | **Lưu bữa ăn** | Lưu timestamp, ảnh hoặc thumbnail (nếu có), món, khẩu phần, carb/kcal ước tính và ghi chú tùy chọn. |
| FR-09 | P0 | **Nhập số đo đường huyết** | Người dùng nhập giá trị, đơn vị, thời điểm đo và có thể liên kết với một bữa ăn gần đó. Hệ thống không tự diễn giải một số đo đơn lẻ thành chẩn đoán. |
| FR-10 | P0 | **Nhật ký bữa ăn–đường huyết** | Có màn hình lịch sử theo thời gian; một bữa ăn hiển thị được món, carb ước tính và số đo liên quan nếu có. |
| FR-11 | P0 | **Tóm tắt 7 ngày** | Hệ thống tổng hợp các bữa đã lưu và số đo trong 7 ngày thành một màn hình dễ xem: số bữa, carb ước tính theo bữa/ngày và các số đo đã nhập. Không kết luận quan hệ nhân quả từ dữ liệu ít. |
| FR-12 | P0 | **Safety copy & disclaimer** | Màn hình kết quả và nơi nhập glucose phải có ngôn ngữ nhất quán: “ước tính/tham khảo”; không có chẩn đoán, kê đơn, tính liều insulin hoặc khuyến nghị thay thuốc. |
| FR-13 | P0 | **Demo seed mode** | Có bộ dữ liệu mẫu/ảnh mẫu để nhóm luôn có thể demo trọn luồng ngay cả khi API ảnh hoặc mạng không ổn định. Demo mode phải được ghi rõ là dữ liệu mẫu, không giả là live AI. |
| FR-14 | P1 | **GI/GL tham khảo** | Chỉ hiển thị cho món có dữ liệu phù hợp; ghi rõ mức tham khảo và không dùng GI/GL để gắn nhãn món “an toàn/nguy hiểm”. |
| FR-15 | P1 | **Bộ lọc lịch sử** | Lọc theo ngày/bữa/món để demo khả năng tra cứu. |
| FR-16 | P1 | **Xuất/chia sẻ báo cáo đơn giản** | Tạo trang/PDF tóm tắt để người dùng chủ động đưa cho bác sĩ/chuyên gia. Không cần portal chuyên gia. |
| FR-17 | P1 | **Thiết lập đơn vị glucose** | Người dùng chọn mmol/L hoặc mg/dL; app giữ lựa chọn cho lần sau. |
| FR-18 | P2 | **Tài khoản và đăng nhập** | Chưa cần cho prototype. Chỉ thêm khi có nhu cầu đa thiết bị/cloud sync. |
| FR-19 | P2 | **Kết nối thiết bị đo/CGM** | Ngoài phạm vi prototype. |
| FR-20 | P2 | **Cộng đồng, tư vấn trực tiếp, thương mại điện tử** | Ngoài phạm vi prototype. |

---

## 6. Non-functional requirements

| ID | Priority | Requirement | Cách kiểm tra |
|---|---|---|---|
| NFR-01 | P0 | **Mobile-first, dễ đọc** | Demo trên màn hình điện thoại; toàn bộ core flow dùng được bằng một tay, chữ/nút không quá nhỏ và không phụ thuộc hover. |
| NFR-02 | P0 | **Ít thao tác** | Từ ảnh đã chụp tới màn hình carb ước tính không có form dài; các correction chính thực hiện ngay trên màn hình kết quả. Kiểm tra bằng walkthrough UC-01. |
| NFR-03 | P0 | **Failure-safe** | Nếu AI/API lỗi, app báo lỗi dễ hiểu, cho retry hoặc chuyển sang demo/sample; không mất dữ liệu đã nhập trong phiên. |
| NFR-04 | P0 | **Transparency** | Mỗi kết quả phải chỉ ra món/khẩu phần nào đang được dùng để tính. Không có con số carb “từ hư không”. |
| NFR-05 | P0 | **Medical safety** | Scan toàn bộ UI copy: không có chẩn đoán, tính insulin, thay đổi thuốc, hay cam kết kiểm soát đường huyết. |
| NFR-06 | P0 | **Privacy tối thiểu** | Prototype không yêu cầu tên thật, email, số điện thoại. Dữ liệu sức khỏe demo ưu tiên lưu local. Nếu ảnh phải gửi tới AI service, phải có thông báo trong app/demo notes. |
| NFR-07 | P0 | **Deterministic demo path** | Bộ kịch bản demo chuẩn phải cho ra dữ liệu ổn định đủ để thuyết trình; live AI là lớp bổ sung, không phải single point of failure cho buổi demo. |
| NFR-08 | P1 | **Responsive performance** | UI phải phản hồi ngay khi bấm; khi chờ AI phải có loading/progress state thay vì màn hình đứng. Độ trễ AI được tách khỏi độ phản hồi UI. |
| NFR-09 | P1 | **Maintainable food data** | Dữ liệu món tách khỏi UI/code logic để nhóm có thể thêm/sửa món mà không chỉnh nhiều màn hình. |
| NFR-10 | P1 | **Basic accessibility** | Tương phản đủ rõ, không chỉ dùng màu để truyền đạt trạng thái, input có label. |

---

## 7. Use cases — mô tả cho người không kỹ thuật

### UC-01 — Chụp bữa ăn trước khi ăn

**Người dùng:** Người mắc type 2.  
**Tình huống:** Anh Hùng chuẩn bị ăn một suất cơm/phở và muốn biết phần nào chứa nhiều carbohydrate.

**Luồng:**
1. Mở Mâm An và chọn “Chụp bữa ăn”.
2. Chụp ảnh hoặc dùng ảnh có sẵn.
3. App nhận diện món/thành phần và đưa ra khẩu phần ban đầu.
4. Người dùng sửa nếu app nhận sai hoặc khẩu phần chưa đúng.
5. App hiển thị tổng carbohydrate ước tính và năng lượng phụ trợ.
6. Người dùng thử giảm/tăng một phần ăn và thấy con số thay đổi.
7. Người dùng lưu bữa ăn.

**Kết quả:** Người dùng hiểu được bữa ăn cụ thể đang được ước tính như thế nào, thay vì chỉ nhận lời khuyên chung chung.

### UC-02 — Sửa khi AI nhận sai

**Tình huống:** App nhận nhầm bún thành phở hoặc ước lượng phần cơm quá lớn.

**Luồng:** Người dùng chạm vào món → chọn/sửa tên món → chỉnh khẩu phần → kết quả carb được tính lại.

**Kết quả:** Sai số AI không khóa người dùng vào một kết quả sai; người dùng giữ quyền kiểm soát dữ liệu.

### UC-03 — Ghi số đo đường huyết sau bữa ăn

**Tình huống:** Sau bữa ăn, người dùng đo đường huyết theo hướng dẫn cá nhân đang áp dụng.

**Luồng:** Mở bữa ăn đã lưu → “Thêm số đo” → nhập giá trị, đơn vị, thời điểm → lưu.

**Kết quả:** Bữa ăn và số đo được đặt cạnh nhau trong nhật ký. App không tự kết luận “món X gây ra Y” chỉ từ một lần đo.

### UC-04 — Xem lại lịch sử

**Tình huống:** Người dùng muốn nhớ những bữa gần đây đã ăn gì và phần nào nhiều carb.

**Luồng:** Mở Nhật ký → xem theo ngày → mở từng bữa → thấy món, khẩu phần, carb ước tính, số đo liên quan.

**Kết quả:** Người dùng có dữ liệu dễ xem lại thay vì phải nhớ bằng đầu hoặc ghi rời rạc.

### UC-05 — Xem tóm tắt tuần

**Tình huống:** Cuối tuần hoặc trước khi tái khám, người dùng muốn xem lại 7 ngày gần nhất.

**Luồng:** Mở “Tuần của tôi” → xem số bữa đã ghi, phân bố carb ước tính, các số đo đã nhập và danh sách bữa nổi bật theo dữ liệu.

**Kết quả:** Người dùng nhìn được pattern để tự đặt câu hỏi tốt hơn; báo cáo không thay bác sĩ đưa ra kết luận điều trị.

### UC-06 — Chia sẻ báo cáo (P1)

Người dùng chủ động xuất bản tóm tắt và gửi cho bác sĩ/chuyên gia. Không có quyền truy cập tự động cho bên thứ ba trong prototype.

---

## 8. Data & database decision

### Quyết định

**Không dựng backend database cho prototype v0.1.**  
Dùng hai lớp dữ liệu:

1. **Food catalog tĩnh**: JSON/TS file trong app chứa dữ liệu món demo và định lượng tham chiếu.
2. **Local persistence**: lưu meal log, glucose log và setting trên thiết bị. Với web/PWA dùng IndexedDB; nếu nhóm dùng Flutter/React Native thì dùng SQLite/local storage tương đương.

### Vì sao

- Prototype chỉ có một người dùng tại một thiết bị trong buổi demo.
- Chưa cần account, sync, phân quyền hoặc truy cập đa thiết bị.
- Tránh tốn thời gian cho auth, schema migration, API CRUD và deployment database — những phần không chứng minh proposition cốt lõi.
- Vẫn cần persistence local vì nhật ký và báo cáo tuần sẽ rất yếu nếu dữ liệu biến mất mỗi lần reload.

### Khi nào mới cần database server

Chuyển sang backend DB khi xuất hiện ít nhất một trong các nhu cầu: đăng nhập đa người dùng, đồng bộ nhiều thiết bị, backup cloud, chia sẻ với chuyên gia, analytics thật, hoặc quản trị food catalog từ xa.

### Backend tối thiểu nếu dùng AI API

Nếu app gọi một dịch vụ AI bằng secret API key, **không nhúng key trong frontend**. Dùng một serverless function/backend nhỏ làm proxy cho request ảnh. Backend này không cần database ở v0.1.

---

## 9. Minimal data model

### FoodItem

- `id`
- `name_vi`
- `aliases[]`
- `serving_label`
- `carb_per_serving`
- `kcal_per_serving`
- `gi` / `gl` (optional, chỉ khi có dữ liệu phù hợp)
- `source_note`

### Meal

- `id`
- `created_at`
- `image_ref` (optional/local)
- `items[]`
- `total_carb_estimate`
- `total_kcal_estimate`
- `note` (optional)

### MealItem

- `food_id` hoặc `custom_name`
- `portion_multiplier` / `portion_label`
- `carb_estimate`
- `kcal_estimate`
- `user_corrected` (boolean)

### GlucoseReading

- `id`
- `value`
- `unit`
- `measured_at`
- `meal_id` (optional)
- `timing_tag` (optional: trước bữa/sau bữa/khác)
- `note` (optional)

### WeeklySummary

Không cần lưu riêng; tính từ Meal + GlucoseReading khi mở màn hình báo cáo.

---

## 10. Product constraints / hard boundaries

| Constraint | Quyết định |
|---|---|
| Medical scope | Không chẩn đoán, kê đơn, tính insulin, khuyên đổi thuốc hoặc thay hướng dẫn bác sĩ. |
| Accuracy | Carb, khẩu phần và GI/GL được trình bày là **ước tính/tham khảo**; user correction là bắt buộc trong thiết kế. |
| AI | Không coi output model là ground truth. Nếu confidence thấp hoặc không match catalog, yêu cầu người dùng xác nhận/chọn lại. |
| Data | Prototype ưu tiên local-only; không thu dữ liệu định danh không cần thiết. |
| Demo | Phải có fallback/sample mode để không phụ thuộc hoàn toàn vào internet/AI service. |
| Scope | Không community, e-commerce, clinician portal, device integration, payment, subscription trong v0.1. |
| Platform | Mobile-first; desktop chỉ cần đủ để trình chiếu nếu giảng viên xem trên laptop. |

---

## 11. Ambiguities / contradictions đã chốt

| Mơ hồ / mâu thuẫn | Quyết định cho prototype |
|---|---|
| Báo cáo gọi “MVP” 50–100 món nhưng nhóm chỉ cần prototype demo | Tách rõ hai tầng. Prototype chỉ dùng tập curated nhỏ; mục tiêu 50–100 giữ cho MVP thật. |
| “AI ước tính khẩu phần” dễ tạo cảm giác chính xác giả | AI chỉ đưa initial guess; người dùng luôn xác nhận/sửa trước khi lưu. |
| “Gợi ý điều chỉnh khẩu phần” có thể biến thành lời khuyên y khoa | Prototype dùng **what-if**: “nếu giảm phần này thì carb ước tính đổi từ A → B”, không ra lệnh ăn/không ăn. |
| GI/GL có nên là core không | Không. Carb + portion là P0; GI/GL P1 và chỉ hiện khi dữ liệu đủ phù hợp. |
| Có cần database không | Không cần backend DB; cần local persistence. |
| Có cần login không | Không cho v0.1. Một local demo profile là đủ. |
| Có cần báo cáo tuần nếu chưa có 7 ngày dữ liệu thật | Có, nhưng dùng seed/demo history được ghi rõ là dữ liệu mẫu để chứng minh flow. |
| Đường huyết liên kết thế nào với bữa ăn | User nhập timestamp + có thể gắn vào meal; app không tự suy causal relationship. |
| Nếu AI không nhận diện được món | Cho phép chọn món từ catalog hoặc nhập tên thủ công; flow không được dead-end. |

---

## 12. Out of scope v0.1

- Subscription/freemium/payment.
- Tài khoản thật, password reset, social login.
- Cloud sync / multi-device.
- Portal bác sĩ/chuyên gia.
- CGM/máy đo đường huyết integration.
- Tính liều insulin hoặc quyết định điều trị.
- Chatbot y khoa mở.
- Community/social feed.
- E-commerce/gợi ý mua thực phẩm.
- Push notification/reminder phức tạp.
- Admin CMS hoàn chỉnh cho food database.
- Production-grade analytics/monitoring/compliance.

---

## 13. Recommended build order

| Milestone | Nội dung | Definition of done |
|---|---|---|
| M1 — Walking skeleton | Ảnh mẫu → kết quả món → chỉnh portion → carb đổi | Chạy end-to-end bằng dữ liệu hardcoded, chưa cần AI/DB. |
| M2 — Local data | Save meal → history → reload vẫn còn | Core meal log persist local. |
| M3 — Glucose loop | Add glucose → link meal → history hiển thị cùng | UC-03 hoàn chỉnh. |
| M4 — Weekly view | Tóm tắt 7 ngày từ local logs + seed data | UC-05 chạy ổn định. |
| M5 — AI integration | Ảnh thật → AI result → map vào editable meal items | Có fallback nếu service fail. |
| M6 — Polish/demo | Safety copy, loading/error states, demo dataset, responsive UI | Chạy trọn demo script không cần sửa code. |

---

## 14. Demo script đề xuất

1. Mở bằng persona “Anh Hùng, 52 tuổi” và một bữa cơm/phở quen thuộc.
2. Chụp/chọn ảnh.
3. Cho app nhận diện và cố ý sửa một chi tiết nhỏ để chứng minh user control.
4. Giảm phần cơm/bún → cho thấy carb ước tính thay đổi tức thời.
5. Lưu bữa ăn.
6. Mở bữa đã lưu và thêm một số đo đường huyết.
7. Mở “Tuần của tôi” để cho thấy loop tích lũy dữ liệu.
8. Kết thúc bằng disclaimer: app giúp hiểu và ghi nhận, không thay bác sĩ.

---

## 15. Assumption ledger

- **[ASSUMED]** Prototype ưu tiên web/PWA mobile-first vì dễ demo và triển khai nhanh. Nếu nhóm đã chốt Flutter/React Native, thay lớp persistence và camera adapter, không đổi PRD lõi.
- **[ASSUMED]** Nhóm có thể dùng một multimodal AI API hoặc service tương đương; nếu không, v0.1 vẫn demo được bằng sample mode + catalog.
- **[ASSUMED]** Dữ liệu dinh dưỡng của tập món demo sẽ được nhóm chuẩn hóa từ nguồn có thể truy vết trước khi trình bày như dữ liệu tham khảo.
- **[UNKNOWN]** Platform/framework, deadline demo, số thành viên dev và mức độ live-AI mà giảng viên kỳ vọng chưa được chốt. Các yếu tố này ảnh hưởng implementation plan, không làm thay đổi functional scope cốt lõi ở trên.
