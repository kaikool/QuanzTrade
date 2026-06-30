# UX Redesign Plan v2 — Apple HIG (iOS Design Language)

## Mục tiêu
Redesign 100% UI theo Apple Human Interface Guidelines, thay thế toàn bộ Material 3 tokens (`--sys-*`) và layout cũ.

## Priority Matrix
| Item | Effort | Impact | Phase |
|---|---|---|---|
| 1. CSS tokens (Apple colors, spacing, radius) | L | 🔴🔴🔴 | **P1** |
| 2. iOS Tab Bar (49pt, SF Symbols 28pt, label 10pt) | M | 🔴🔴🔴 | **P2** |
| 3. Header (large title 34pt, search field) | M | 🔴🔴🔴 | **P2** |
| 4. DashboardView — redesign | XL | 🔴🔴🔴 | **P3** |
| 5. JournalView — redesign | XL | 🔴🔴🔴 | **P3** |
| 6. CalendarView — redesign | L | 🔴🔴 | **P3** |
| 7. NewsPanel — redesign | L | 🔴🔴 | **P3** |
| 8. AddTradeModal — iOS sheet form | L | 🔴🔴🔴 | **P4** |
| 9. Quick Add mini modal | S | 🔴🔴 | **P4** |
| 10. Lightbox — iOS photo viewer | S | 🔴 | **P4** |
| 11. Toast system | S | 🔴 | **P4** |
| 12. FAB — position/size refine | XS | 🔴 | **P4** |
| 13. Loading / Empty / Pagination states | M | 🔴🔴 | **P5** |
| 14. Micro-interactions + animations | M | 🔴🔴 | **P5** |

---

## Phase 1: Foundation (CSS Token System)
*Nguồn: developer.apple.com/design/human-interface-guidelines/color, /layout, /typography*

### 1.1. Apple System Colors (Light)

```css
/* Backgrounds */
--ios-bg: #f2f2f7;              /* System Gray 6 */
--ios-surface: #ffffff;          /* System Background */
--ios-surface-2: #f2f2f7;       /* System Grouped Background */

/* Text */
--ios-label: #000000;            /* Label */
--ios-secondary-label: #3c3c43;  /* Secondary Label / 0.6 alpha */
--ios-tertiary-label: #8e8e93;  /* Tertiary Label / 0.3 alpha */

/* Tint */
--ios-blue: #007aff;
--ios-green: #34c759;
--ios-red: #ff3b30;
--ios-orange: #ff9500;
--ios-yellow: #ffcc00;
--ios-teal: #5ac8fa;
--ios-indigo: #5856d6;

/* Separator */
--ios-separator: #c6c6c8;       /* Separator */
--ios-opaque-separator: #c6c6c8;

/* Fill */
--ios-fill: rgba(120,120,128,0.2);
--ios-fill-secondary: rgba(120,120,128,0.16);

/* Shadows */
--ios-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
--ios-shadow-lg: 0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08);
```

### 1.2. Dark Mode
```css
.dark {
  --ios-bg: #000000;
  --ios-surface: #1c1c1e;
  --ios-surface-2: #2c2c2e;
  --ios-label: #ffffff;
  --ios-secondary-label: #ebebf5; /* 0.8 alpha */
  --ios-separator: #38383a;
  --ios-blue: #0a84ff;
  --ios-green: #30d158;
  --ios-red: #ff453a;
}
```

### 1.3. SF Typography Scale
*Verified from developer.apple.com/design/human-interface-guidelines/typography*

| Style | Size | Weight | Usage |
|---|---|---|---|
| Large Title | 34pt | Bold (700) | Page headers |
| Title 1 | 28pt | Bold (700) | Section titles |
| Title 2 | 22pt | Bold (700) | Card headers |
| Title 3 | 20pt | Semibold (600) | Sub-section headers |
| Headline | 17pt | Semibold (600) | Navigation titles, card titles |
| Body | 17pt | Regular (400) | Content text |
| Callout | 16pt | Regular (400) | Secondary content |
| Subhead | 15pt | Regular (400) | Tertiary labels |
| Footnote | 13pt | Regular (400) | Helper, metadata |
| Caption 1 | 12pt | Regular (400) | Tab labels, timestamps |
| Caption 2 | 11pt | Medium (500) | Badges, tiny labels |

### 1.4. Corner Radius
*Apple HIG: controls 5.5pt / 8pt, cards 12-16pt, modal sheets 28pt*

| Value | Usage |
|---|---|
| 5.5pt | Icons in tab bar, small controls |
| 8pt (`rounded-lg`) | Text fields, buttons |
| 10pt (`rounded-xl`) | Segmented controls, search field |
| 12pt | Small cards |
| 14pt | Cards, list rows |
| 16pt (`rounded-2xl`) | Medium cards, Bento items |
| 20pt | Large cards, panels |
| 28pt | Modal sheets |
| 999px | Pills, avatars, FAB |

### 1.5. Spacing Grid (8pt system)
- 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 56 / 64

---

## Phase 2: Layout Chrome

### 2.1. iOS Tab Bar (49pt)
**Specs (UIKit: developer.apple.com/documentation/uikit/uitabbar):**
- Height: 49pt content + safe area bottom
- Background: Translucent (`backdrop-blur-xl` + `bg-[--ios-surface]`)
- Icon: SF Symbol 28×28pt (Medium configuration)
- Label: 10pt Regular (Caption 1)
- Selection: Tint icon + label with `--ios-blue`
- Spacing: 8pt gap between icon and label
- Hit area: min 48pt per item

**Implementation:**
- Extract current nav → `src/components/iOSTabBar.tsx`
- Icons: `size={28}` , wrapper `p-1.5`
- Label: `text-[10px] font-[400]`
- Selected state: `bg-[--ios-blue]/10 rounded-full` behind icon
- Tab bar: `fixed bottom-0 z-30`

### 2.2. Header
- iOS Large Title: 34pt Bold, `pb-1 pt-12`
- Search field: `rounded-[10px] h-9 bg-[--ios-surface-2]`, clear button, SF Symbol magnifying glass
- Pull-down refresh (iOS refresh control style)

### 2.3. FAB
- Bottom: `calc(49px + env(safe-area-inset-bottom, 16px) + 16px)` — clear of tab bar
- Size: `w-14 h-14`
- Shadow: `--ios-shadow-lg`
- Animation: `active:scale-90` with spring

---

## Phase 3: Screen Redesign (per component)

### 3.1. DashboardView
- **Quick Stats**: 4 cells in 2×2 grid, iOS widget style:
  - `rounded-[14px]` bg `--ios-surface-2`
  - Icon + value (Large Title 34pt) + label (Footnote 13pt)
- **The5ers Cards**: Large `rounded-[20px]`, monospace values, pill badges
- **Recent Trades**: iOS List style:
  - Inset grouped cells `rounded-[14px]`
  - Left: direction badge (pill), pair, date
  - Right: P&L value + mini bar
  - Disclosure indicator `>` for detail
- **Empty state**: SF Symbol (48pt `--ios-tertiary-label`) + Body 17pt + Footnote 13pt

### 3.2. JournalView
- **Desktop Table** → iOS Settings List:
  - Cell-based layout (no `<table>` tag)
  - Each trade is a `rounded-[14px]` cell
  - Pill badges for BUY/SELL/OPEN/CLOSED
  - Edit/Delete buttons: SF Symbol `p-2`
- **Mobile Cards** → iOS List Row:
  - `rounded-[14px]` bg `--ios-surface`
  - Swipe action hints
- **Filter row**: iOS Segmented Control style (`rounded-[10px]` pills)
- **Search**: iOS search field `rounded-[10px] h-9`
- **Pagination**: Plain text "Xem thêm N giao dịch" at bottom

### 3.3. CalendarView
- **Day header**: `text-[15pt] font-[600] uppercase` + monospace date
- **Event row**: Leading time (monospace 17pt) + colored impact dot (8pt circle) + title (Body 17pt) + forecast/actual (Subhead 15pt)
- **Filter**: Dot-style `rounded-full` buttons, 8pt circles
- **Refresh**: SF Symbol button, `size={20}`
- **Loading**: UIActivityIndicatorView style (spinning circle, `--ios-blue`)

### 3.4. NewsPanel
- **Article card**: `rounded-[14px]` bg `--ios-surface`
  - Hero image `h-40` (if present)
  - Headline (Headline 17pt Semibold)
  - Source + time (Footnote 13pt `--ios-secondary-label`)
  - "Xem thêm" link
- **Loading**: Skeleton shimmer (`bg-[--ios-fill]` animate-pulse)

---

## Phase 4: Modal & Utility Redesign

### 4.1. AddTradeModal (iOS Sheet)
- UISheetPresentationController style:
  - Large title (Title 2 22pt) + grabber handle (`rounded-full w-9 h-1 bg-[--ios-separator]`)
  - Safe area top/bottom
- Form: iOS Grouped Table style
  - Cells in groups with `rounded-[14px]` bg `--ios-surface-2`
  - Separator `--ios-separator` between cells (except last)
  - Labels: Footnote 13pt `--ios-secondary-label`
- Controls:
  - Segmented buttons: `rounded-[10px]` border
  - Input fields: `rounded-[10px]` bg `--ios-surface` border `--ios-separator`
  - TextArea: same
- Footer:
  - Primary: `--ios-blue` text button (SF Semibold)
  - Cancel: `--ios-blue` text (previous style)
- Snapshot: `rounded-[14px]` with overlay zoom button

### 4.2. Quick Add Mini Modal
- Bottom sheet style (shorter):
  - Drag handle
  - 4 fields: Pair, Type, Entry, Size
  - Submit: blue button
  - Animation: spring (slide up from FAB position)

### 4.3. Lightbox
- iOS Photos viewer:
  - Black background 100%
  - Image centered, max `90vh`
  - Close button: SF Symbol `x.circle.fill` white `size={36}`
  - No border/radius on image container

### 4.4. Toast
- iOS Notification Banner:
  - Slide down from top (spring animation)
  - `rounded-[14px]` bg `--ios-surface` with blur
  - SF Symbol + text (Footnote 13pt)
  - Auto-dismiss 3s

---

## Phase 5: Polish & Micro-interactions

### 5.1. Loading States
- **Skeleton**: `rounded-[14px]` shimmer (`bg-[--ios-fill]` + `animate-pulse`)
- **Spinner**: `w-6 h-6 border-2 border-[--ios-blue] border-t-transparent rounded-full animate-spin`
- **Pull-to-refresh**: Not possible without library — skip

### 5.2. Empty States
- SF Symbol (48pt, `--ios-tertiary-label`)
- Headline: Body 17pt Semibold `--ios-label`
- Subtitle: Footnote 13pt `--ios-secondary-label`
- Action button (if applicable): `rounded-[10px]` `--ios-blue` text

### 5.3. Page Transitions
- Tab switch: opacity crossfade (0.2s)
- Modal open: spring sheet (damping 26, stiffness 220)
- Button press: `active:scale-95` with 0.1s duration

### 5.4. Haptic Simulation (CSS)
- Success: green checkmark bounce (SF Symbol `checkmark.circle.fill`)
- Error: red shake (CSS `animate-shake`)
- Generic: opacity/scale tap feedback

---

## File Changes Summary
```
src/App.tsx              ⏳ ~1941 → ~1700 (remove inline nav, header, lightbox, toast)
src/index.css            🔲 full rewrite: --sys-* → --ios-*, SF fonts, new radii
src/components/
├── AddTradeModal.tsx    🔲 redesign (sheet style, grouped cells)
├── CalendarView.tsx     🔲 redesign (iOS calendar event cells)
├── DashboardView.tsx    🔲 redesign (widget cards, list rows)
├── JournalView.tsx      🔲 redesign (iOS Settings list, no table)
├── NewsPanel.tsx        🔲 redesign (iOS News-style cards)
├── iOSTabBar.tsx        ✨ new (49pt tab bar)
├── iOSSegmentedControl.tsx  ✨ new (reusable)
└── iOSListItem.tsx      ✨ new (reusable list cell)
```

## Progress Checklist
- [ ] **P1** — CSS tokens replace `--sys-*` with `--ios-*`
- [ ] **P2.1** — iOSTabBar component
- [ ] **P2.2** — Header + large title
- [ ] **P2.3** — FAB position refine
- [ ] **P3.1** — Dashboard redesign
- [ ] **P3.2** — Journal redesign
- [ ] **P3.3** — Calendar redesign
- [ ] **P3.4** — News redesign
- [ ] **P4.1** — AddTradeModal sheet
- [ ] **P4.2** — Quick Add redesign
- [ ] **P4.3** — Lightbox
- [ ] **P4.4** — Toast
- [ ] **P5.1** — Loading/Empty states
- [ ] **P5.2** — Animations + polish
