# QuanzTrade — UX Redesign Plan

## Current Problems (Root Cause Analysis)

### 1. Header (Information Overload)
- **Logo + "Táo Tầu Journal" + "PRO" badge**: 3 branding elements fighting for attention
- **Balance + P&L**: Financial data mixed with branding — không rõ đây là số dư real từ The5ers hay manual
- **Dark mode toggle + Settings avatar**: Controls trộn với data
- **Red alert banner**: Xuất hiện bất ngờ, không rõ context

### 2. Dashboard (No Clear Entry Point)
- **BentoStats**: Hiển thị nhiều số liệu nhưng thiếu context — win rate, P&L, profit factor hiển thị raw không có annotation
- **Calendar mini-view + Recent trades**: 2 card cạnh nhau nhưng không có mối liên kết
- **Không có "action button"**: User muốn thêm lệnh nhanh phải vào Journal tab
- **The5ers data**: Không có overview account-level trên dashboard, chỉ thấy balance tổng

### 3. Journal (Dense & Confusing)
- **Filter trùng lặp**: Account filter, pair filter, status filter — 3 dropdown chiếm nhiều space, khó hiểu cái nào ưu tiên
- **Search nhỏ + ẩn**: Icon search ở góc phải, input không được chú ý
- **Manual + The5ers lẫn lộn**: Không có visual tag rõ ràng, user khó phân biệt lệnh tự nhập vs lệnh từ scraper
- **Add trade modal dài**: ~20 field trong modal, tỉ lệ bỏ cuộc cao

### 4. Calendar
- **Chỉ có Weekly view mặc định**: User muốn xem hôm nay có tin gì phải chuyển filter
- **Không có notification summary**: Đã bật notify nhưng không có indicator trên tab bar

### 5. News
- **Tin tức + Calendar tách rời**: Cùng là market events nhưng 2 tab khác nhau
- **Không có bookmark/favorite**: Không thể lưu tin quan trọng

### 6. Settings (Developer-Facing)
- **Supabase URL/Anon key**: Config database ngay trong settings app — không phải UX cho end user
- **The5ers config phức tạp**: Email + DSR token + sync buttons — user phải hiểu về Descope/Supabase
- **6 sections không phân nhóm**: Giao diện, Đồng bộ, Thông báo, TradingView, The5ers, Bảo mật — lộn xộn

### 7. Navigation & Flow
- **No quick action**: Phải vào Journal tab → kéo lên trên cùng → bấm "+" để add trade
- **Tab switching mất scroll**: Mỗi lần chuyển tab, scroll reset về đầu
- **The5ers accounts trong settings**: User phải vào Settings → kéo xuống → mới chọn được tài khoản

---

## Redesign Plan (6 Phases)

### Phase 1: Information Architecture (Tuần 1)
**Mục tiêu**: Sắp xếp lại cấu trúc thông tin

1. **Header gọn lại**:
   - Logo + "QuanzTrade" (bỏ PRO badge)
   - Balance hiển thị với label rõ: "Tổng tài sản" (The5ers) hoặc "Số dư" (manual)
   - Settings avatar chuyển vào tab bar (gear icon)
   - Dark mode toggle chuyển vào Settings

2. **Tab bar tối ưu**:
   - 4 tab: Dashboard | Journal | Calendar | Settings
   - News gộp vào Dashboard hoặc Calendar (cùng market events)
   - Settings có badge khi có config thiếu

3. **Dashboard tái cấu trúc**:
   - Top: The5ers account overview card (balance, P&L, risk metrics)
   - Middle: BentoStats (merged trades)
   - Bottom: Recent trades + mini calendar song song

### Phase 2: Component Redesign (Tuần 2)
**Mục tiêu**: Từng component có UX rõ ràng

1. **BentoStats cải tiến**:
   - Thêm annotation tooltip cho mỗi metric
   - Chart equity curve mặc định expand
   - Thêm filter theo khoảng thời gian (1W/1M/3M/ALL)

2. **Trade List (Journal)**:
   - Visual tag "T5" / "Manual" màu khác nhau
   - Row expandable để xem chi tiết nhanh (không cần mở modal)
   - Batch actions: select multiple → delete/export

3. **Quick Add Trade**:
   - Mini form bottom sheet (không phải modal toàn màn hình)
   - Chỉ 5 field bắt buộc: pair, type, entry, exit, size
   - Còn lại optional → mở rộng khi cần

4. **Calendar + News gộp**:
   - Tab "Calendar" hiển thị cả lịch kinh tế + tin tức liên quan ngay dưới mỗi event
   - Filter High/Medium/Low kế thừa cho cả 2

### Phase 3: The5ers UX (Tuần 2-3)
**Mục tiêu**: The5ers không còn là "tính năng phụ"

1. **Account Overview trên Dashboard**:
   - Card riêng cho The5ers: danh sách account đã chọn, balance, P&L, risk
   - Click vào account → xem chi tiết (trades riêng)
   - Quick-select accounts từ dashboard (không cần vào Settings)

2. **Journal filter thông minh**:
   - Mặc định: merge tất cả trades đã chọn
   - Filter nhanh: "Manual only" / "The5ers only" / "All"

3. **Settings The5ers đơn giản hoá**:
   - Chỉ cần email + nút "Save & Sync"
   - DSR token tự động lấy từ server-side
   - Ẩn technical details (Supabase, Descope) khỏi end user

### Phase 4: Micro-interactions & Feedback (Tuần 3)
**Mục tiêu**: App "biết nói" thay vì im lặng

1. **Toast notifications**: Success/error message dạng toast (không dùng alert())
2. **Loading skeleton**: Component-shape loading thay vì pulsing block
3. **Empty state**: Hướng dẫn khi chưa có data (không chỉ "Chưa có dữ liệu")
4. **Pull-to-refresh**: Trên mobile

### Phase 5: Performance & Data (Tuần 3-4)
**Mục tiêu**: App không bị冻结 khi load data

1. **Virtual scrolling**: Trade list 1000+ items không lag
2. **Incremental loading**: Load trades theo page, không load all-in-one
3. **Offline cache**: localStorage fallback cho trades đã sync

### Phase 6: Polish (Tuần 4)
**Mục tiêu**: Quality of life

1. **Keyboard shortcuts**: `N` = new trade, `F` = focus search, `Esc` = close modal
2. **Gesture support**: Swipe to delete trên mobile
3. **Export/Share**: Export trades ra CSV
4. **Haptic feedback**: Trên mobile (nếu PWA support)

---

## Priority Matrix

| Phase | Effort | Impact | UX Value |
|---|---|---|---|
| **P1: IA** | Medium | High | ✅ Cấu trúc rõ ràng ngay lập tức |
| **P2: Components** | High | High | ✅ Từng phần dễ dùng hơn |
| **P3: The5ers** | Medium | High | ✅ Trading UX thực tế |
| **P4: Micro-interactions** | Low | Medium | ✅ App "có hồn" |
| **P5: Performance** | High | Medium | ✅ Scale tốt |
| **P6: Polish** | Low | Low | ✅ Nice to have |

---

## Recommended First Actions

1. **Header cleanup**: Xoá PRO badge, gộp dark mode vào settings
2. **Quick Add**: Mini bottom sheet cho add trade (5 field)
3. **The5ers Dashboard Card**: Overview ngay trên dashboard
4. **Toast thay alert()**: Cải thiện feedback ngay lập tức

Bố muốn bắt đầu từ Phase 1 (Information Architecture) hay đi thẳng vào The5ers UX (Phase 3)?
