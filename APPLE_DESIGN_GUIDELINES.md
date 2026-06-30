# Apple Human Interface Guidelines (HIG) Implementation Specification

This document defines the iOS design system used in QuanzTrade, based on Apple's official Human Interface Guidelines (HIG) — June 2026 update.

Source: `https://developer.apple.com/design/human-interface-guidelines/`

---

## 1. Dynamic Color System

Apple HIG defines system colors that automatically adapt to light/dark mode. All colors use iOS system values.

### iOS Light Palette

| Token | Value | Usage |
| :--- | :--- | :--- |
| **sys-bg** | `#f5f7fb` | App viewport background |
| **sys-surface** | `rgba(255,255,255,0.72)` | Cards, sheets, elevated containers (glass) |
| **sys-surface-2** | `rgba(255,255,255,0.52)` | Secondary surfaces, inset containers |
| **sys-blue** | `#007aff` | Accent, selected state, primary actions (iOS system blue) |
| **sys-green** | `#34c759` | Profit, positive values (iOS system green) |
| **sys-red** | `#ff3b30` | Loss, negative values (iOS system red) |
| **sys-pink** | `#ff2d55` | Alternative accent |
| **sys-violet** | `#5856d6` | Alternative accent |
| **sys-teal** | `#00c7be` | Alternative accent |
| **sys-text** | `#111827` | Primary text |
| **sys-text-secondary** | `#6b7280` | Secondary text, labels |
| **sys-border** | `rgba(22,28,45,0.12)` | Separators, borders |
| **sys-glass** | `rgba(255,255,255,0.58)` | Glass morphism backgrounds |
| **sys-glass-strong** | `rgba(255,255,255,0.78)` | Stronger glass effect |
| **sys-tint-soft** | `rgba(0,122,255,0.12)` | Subtle blue tint backgrounds |
| **sys-danger-soft** | `rgba(255,59,48,0.12)` | Subtle red tint backgrounds |
| **sys-success-soft** | `rgba(52,199,89,0.13)` | Subtle green tint backgrounds |

### iOS Dark Palette

| Token | Value | Usage |
| :--- | :--- | :--- |
| **sys-bg** | `#05060a` | App viewport background |
| **sys-surface** | `rgba(28,31,39,0.66)` | Cards, elevated containers |
| **sys-surface-2** | `rgba(44,48,58,0.52)` | Secondary surfaces |
| **sys-blue** | `#0a84ff` | Accent (iOS dark mode blue) |
| **sys-green** | `#30d158` | Profit (iOS dark mode green) |
| **sys-red** | `#ff453a` | Loss (iOS dark mode red) |
| **sys-text** | `#f8fafc` | Primary text |
| **sys-text-secondary** | `#a2a8b3` | Secondary text |

---

## 2. Bar Specifications (iOS HIG)

### Tab Bar (Bottom Navigation)

| Property | Apple HIG Spec | Implementation |
| :--- | :--- | :--- |
| **Height** | `49pt` (standard) | `height: 49px` (container) |
| **Content area** | `49pt` | Vertical center alignment, 8pt top padding |
| **Safe area** | `env(safe-area-inset-bottom)` | Bottom inset for home indicator |
| **Background** | Translucent (`isTranslucent: true`) | `backdrop-blur-xl` glass |
| **Icon size** | `28×28pt` (SF Symbols Medium) | Icon: 28px, container: 32px |
| **Label font** | `10pt Regular` (caption1) | `text-[10px] font-[400]` |
| **Icon-label gap** | `2pt` | `gap-0.5` (2px) |
| **Hit target** | Min `48×48pt` | `min-h-[48px]` |
| **Selection indicator** | Color tint on icon area | `bg-[var(--sys-blue)]/10 rounded-full` |

### Navigation Bar (Top)

| Property | Apple HIG Spec | Implementation |
| :--- | :--- | :--- |
| **Height** | `44pt` (standard) / `48pt` (large title) | `h-11` (44px) or `h-12` (48px) |
| **Title font** | `17pt Semibold` | `text-[17px] font-semibold` |
| **Bar button** | `16pt Regular` | `text-[16px]` |

---

## 3. Elevation & Shadow System

Apple HIG uses shadow to convey visual depth, not for decorative purposes.

```css
/* iOS Shadow Tokens */
--shadow-ios-sm:   0 1px 2px rgba(20,24,32,0.04), 0 1px 3px rgba(20,24,32,0.08);
--shadow-ios-md:   0 10px 30px rgba(20,24,32,0.08), 0 2px 8px rgba(20,24,32,0.05);
--shadow-ios-lg:   0 24px 60px rgba(20,24,32,0.14), 0 8px 24px rgba(20,24,32,0.08);
--shadow-ios-xl:   0 40px 90px rgba(20,24,32,0.18), 0 14px 36px rgba(20,24,32,0.1);
--shadow-ios-glass: 0 22px 70px rgba(20,24,32,0.16), inset 0 1px 0 rgba(255,255,255,0.72);
```

- **Level 0 (Flat)**: Standard child buttons, passive list rows.
- **Level 1 (Card)**: Bento tiles, metric cards → `shadow-ios-sm`
- **Level 2 (Elevated)**: Header bar, selected items → `shadow-ios-md`
- **Level 3 (Modal)**: Sheets, dialogs → `shadow-ios-lg`
- **Level 4 (Floating)**: FAB, popovers → `shadow-ios-xl`

---

## 4. Shape & Corner Radius

Apple HIG uses consistent rounded corners. iOS 17 design language favors `28pt` corner radius for sheets and `16pt` for cards.

- **4pt** (`rounded-[4px]`): Badges, inline labels
- **8pt** (`rounded-lg`): Small controls, inputs
- **12pt** (`rounded-xl`): Buttons, chips
- **16pt** (`rounded-2xl`): Cards, bento items, metric tiles
- **20pt** (`rounded-[20px]`): Medium containers
- **24pt** (`rounded-[24px]`): Large panels, desktop cards
- **28pt** (`rounded-[28px]`): Modal sheets, bottom sheets
- **Full** (`rounded-full`): Avatars, pills, FABs, tab indicator

---

## 5. Typography

Apple uses San Francisco (SF Pro) as the system font. Fallback: Inter.

| Style | iOS Size | Weight | Usage |
| :--- | :--- | :--- | :--- |
| **Large Title** | `34pt` | Bold (700) | Page headers |
| **Title 1** | `28pt` | Bold (700) | Section titles |
| **Title 2** | `22pt` | Bold (700) | Card headers |
| **Title 3** | `20pt` | Semibold (600) | Panel titles |
| **Headline** | `17pt` | Semibold (600) | Navigation titles |
| **Body** | `17pt` | Regular (400) | Content text |
| **Callout** | `16pt` | Regular (400) | Secondary content |
| **Subhead** | `15pt` | Regular (400) | Tertiary labels |
| **Footnote** | `13pt` | Regular (400) | Caption text |
| **Caption 1** | `12pt` | Regular (400) | Tab labels, metadata |
| **Caption 2** | `11pt` | Regular (400) | Mini labels |

### Numeric Data
Monospace for trading values to ensure tabular vertical alignment:
```css
font-family: "Geist Mono", "SF Mono", "JetBrains Mono", monospace;
```

---

## 6. Spacing & Layout

| Context | Rule |
| :--- | :--- |
| **Desktop max width** | `max-w-7xl` centered (`mx-auto`) |
| **Grid gap** | `gap-4` (16px) / `gap-6` (24px) |
| **Mobile horizontal padding** | `px-4` (16px) / `px-6` (24px) |
| **Vertical section spacing** | `space-y-4` / `gap-6` |
| **Touch targets** | Min `48×48pt` (human ergonomics) |
| **Safe area** | `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` |

---

## 7. Micro-Animations & Motion

| Transition | Duration | Curve |
| :--- | :--- | :--- |
| **Enter** | `250ms` | cubic-bezier(0.05, 0.7, 0.1, 1.0) |
| **Exit** | `200ms` | cubic-bezier(0.3, 0.0, 0.8, 0.15) |
| **Hover** | `150ms` | ease-out |
| **Press (scale)** | `100ms` | ease-out → scale 0.95 |

---

## 8. iOS HIG Implementation Checklist

- [ ] Tab bar height: `49pt` with `env(safe-area-inset-bottom)`
- [ ] Tab bar icons: `28×28pt` (SF Symbols Medium)
- [ ] Tab bar labels: `10pt Regular`, `2pt` from icon
- [ ] Navigation bar: `44pt` standard
- [ ] Cards: `rounded-2xl` (16pt), `shadow-ios-sm`
- [ ] System colors `--sys-*` for all backgrounds/text/borders
- [ ] Touch targets min `48×48pt`
- [ ] Safe area inset compliance
- [ ] backdro p-blur on tab bar and sheets
- [ ] SF Symbols style icons (lucide-react mapped to matching SF shapes)
