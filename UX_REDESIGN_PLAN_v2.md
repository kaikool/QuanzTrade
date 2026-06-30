# UX Redesign Plan v3 — QuanzTrade (Apple HIG - iOS 26 Compliant)

## Mục tiêu
Tái cấu trúc và thiết kế lại toàn bộ UI/UX của QuanzTrade bám sát 100% theo **Apple Human Interface Guidelines (HIG) - Bản cập nhật tháng 6/2026 (iOS 26)**. Khắc phục triệt để các sai sót trong bản thiết kế cũ (v2), áp dụng chuẩn xác hệ thống màu động (Dynamic Color), hiệu ứng kính mờ không gian (Spatial Glassmorphism), độ bo góc (24-28pt) và Typography của Apple để mang lại trải nghiệm Premium mang hơi hướng tương lai, mượt mà và trực quan nhất.

## 1. Core Foundation (Thiết lập nền tảng iOS 26)

### 1.1. Hệ thống Màu Động & Hiệu ứng Kính (Dynamic Color & Spatial Glass)
Tuân thủ tuyệt đối bảng màu từ `APPLE_DESIGN_GUIDELINES.md`:
- Sử dụng trực tiếp các token `--sys-*` làm chuẩn.
- **Backgrounds**: `--sys-bg` (`#f5f7fb` cho Light, `#05060a` cho Dark).
- **Surfaces**: `--sys-surface` (kết hợp `rgba` và blur để tạo độ sâu).
- **Glassmorphism (Phong cách iOS 26 / VisionOS)**:
  - Thay vì chỉ dùng blur nhẹ, mọi thành phần kính (Tab bar, Header, Sheet) phải áp dụng: 
    `backdrop-filter: saturate(180%) blur(34px);`
  - Kèm theo viền sáng siêu mỏng `1px solid var(--sys-glass-edge)` để tách biệt lớp kính với nền.
- **Màu trạng thái (Trading)**: `--sys-green` cho Profit, `--sys-red` cho Loss, `--sys-blue` cho Accent.

### 1.2. Hệ thống Bo Góc (Shape & Corner Radius)
- **4-8pt**: Các thành phần nhỏ (Badges, Inline labels, Inputs).
- **12-16pt**: Button, Chip, Card nhỏ (`rounded-xl` tới `rounded-2xl`).
- **24pt**: Card hiển thị dữ liệu chính (Dashboard Widgets, Bento Tiles).
- **28pt**: Modal Sheets, Bottom Sheets (chuẩn iOS 26).
- **Full**: Tab bar indicators, FAB, Avatars.

### 1.3. Hệ thống Đổ Bóng Không Gian (Spatial Elevation & Shadows)
Áp dụng hệ thống đổ bóng 5 cấp độ để tạo chiều sâu giao diện không gian thay vì thiết kế phẳng:
- **Level 0 (Flat)**: Row trong danh sách.
- **Level 1 (Card - `shadow-ios-sm`)**: Widget, bento tiles (lớp `.ios26-card`).
- **Level 2 (Elevated - `shadow-ios-md`)**: Header bar, item đang được chọn.
- **Level 3 (Modal - `shadow-ios-lg`)**: Sheets, Dialogs.
- **Level 4 (Floating - `shadow-ios-xl`)**: Floating Action Button (FAB).

### 1.4. Typography Đa Luồng
- **UI Text (Tiêu đề, Nhãn)**: Sử dụng font San Francisco (SF Pro) hoặc Inter. Các kích thước tuân thủ chuẩn: Large Title (34pt), Title 1 (28pt), Headline (17pt Semibold), Body (17pt).
- **Trading Data (Số liệu, P&L, Giá)**: **BẮT BUỘC** sử dụng font Monospace (`Geist Mono`, `SF Mono` hoặc `JetBrains Mono`) để đảm bảo các con số dóng hàng theo chiều dọc (tabular nums), giúp trader dễ đọc lướt nhanh chóng.

---

## 2. Component Layout & Chrome

### 2.1. Tab Bar (Điều hướng dưới)
- **Kích thước**: Chiều cao `49px` + Inset vùng an toàn (Safe area bottom).
- **Hiệu ứng**: Nền kính cực mạnh (`saturate(180%) blur(34px)`).
- **Icon**: Kích thước 28x28px (chuẩn SF Symbols Medium).
- **Nhãn (Label)**: Kích thước 10px, Regular.
- **Touch Target**: Tối thiểu 48x48px cho mỗi vùng bấm.

### 2.2. Vùng Tương Tác (Touch Ergonomics)
- Đảm bảo mọi button, filter pill, hoặc cell có khả năng tương tác đều có vùng bấm (hit target) tối thiểu **48x48pt** để phù hợp với quy chuẩn công thái học mới nhất.

---

## 3. Screen-by-Screen Redesign Strategy

### 3.1. DashboardView (Premium Analytics)
- **Widget Stats**: Bố cục dạng Bento Grid. Card `.ios26-card` bo tròn **24pt**, đổ bóng `shadow-ios-sm`. Hiển thị số P&L bằng font Monospace cỡ lớn.
- **Recent Trades**: Hiển thị dưới dạng "iOS Inset Grouped List". Mỗi giao dịch là một row bo góc **24pt**, màu nền `--sys-surface`, mũi tên disclosure `>` ở bên phải.

### 3.2. JournalView (Sổ Nhật Ký)
- **Từ bỏ Table truyền thống**: Chuyển sang dạng "iOS Settings List".
- **Cell Design**: Mỗi giao dịch là một cell liền mạch, có avatar/icon phân loại (BUY/SELL) ở bên trái, thông tin chính giữa, và P&L monospace ở bên phải.
- **Filter Bar**: Dạng Scrollable Segmented Control nằm sát Header với độ bo góc pill-shape (100px).
- **Search**: Khung tìm kiếm phong cách iOS 26 (`h-[36px]`, bo góc `10pt`, nền `--sys-surface-2`).

### 3.3. CalendarView (Lịch Kinh Tế)
- **Phân tách Ngày (Section Headers)**: Chữ in hoa (15pt, Semibold), stick trên top khi cuộn lớp nền kính.
- **Dòng Sự kiện (Event Rows)**: 
  - Thời gian hiển thị Monospace (17pt).
  - Chấm màu (Impact Dot - 8pt) biểu thị mức độ quan trọng.
  - Tên sự kiện (Body 17pt) hiển thị gọn gàng, rõ nét.

### 3.4. Modal & Tương tác phụ (Sheets, Toasts, Lightbox)
- **AddTradeModal / Filters (Bottom Sheets)**: 
  - Giao diện bám đáy (Bottom Sheet) với độ bo góc **28pt** ở hai góc trên.
  - Có thanh kéo (Grabber handle) `w-9 h-1 rounded-full` ở chính giữa phía trên.
  - Hiệu ứng xuất hiện dạng lò xo (Spring animation, mô phỏng vật lý iOS 26).
- **Toasts / Notifications**: Dạng Dynamic Island thông minh hoặc notification banner vuốt từ trên xuống, bo góc 16pt, hiệu ứng kính mờ và viền sáng siêu mỏng.
- **Lightbox (Xem ảnh)**: Nền đen tuyền (Black 100%), ảnh hiển thị ở giữa không bo góc, nút Close to rõ góc trên cùng (SF Symbol `xmark.circle.fill`).

---

## 4. Lộ Trình Triển Khai (Priority Matrix v3)

| Giai đoạn | Hạng mục | Độ khó | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- |
| **Phase 1: CSS & Tokens** | Đồng bộ lại `index.css` chuẩn `--sys-*`, áp dụng Glassmorphism iOS 26. | Medium | 🔴🔴🔴 (Blocker) |
| **Phase 2: Chrome (Nav/Header)** | Tái thiết kế Tab Bar (49pt, Glass) và Header (Large Titles). | Medium | 🔴🔴🔴 |
| **Phase 3: Core Views** | Nâng cấp Dashboard (24pt Cards, Monospace) và Journal (iOS List cells). | High | 🔴🔴🔴 |
| **Phase 4: Modals & Details** | Triển khai Bottom Sheets (28pt), Calendar, và Toasts (Spring animations). | Medium | 🔴🔴 |
| **Phase 5: Polish & Motion** | Thêm Micro-animations, Spatial hovers, Haptic CSS feedback. | Low | 🔴 |

---
*Tài liệu này được biên soạn lại đảm bảo sự sắc nét, cao cấp và chuẩn mực tuyệt đối theo iOS 26 HIG, mang tới trải nghiệm không gian (spatial experience) vượt trội.*
