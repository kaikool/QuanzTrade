# Google Material Design 3 (M3) Implementation Specification

This specification documents the rigorous implementation criteria of Google Material Design 3 (M3) for full-stack hybrid web interfaces. It establishes standards for color systems, dynamic dark/light surfaces, typography, elevation, shape containers, spacing, and safe areas on desktop, iPad, and mobile configurations.

---

## 1. Dynamic Color System & Semantic Palettes

Material 3 uses dynamic color roles mapped directly to primary, secondary, tertiary, and neutral surface collections. Color contrast complies with W3C WCAG 2.1 AA (minimum 4.5:1 ratio for text).

### M3 Light Palette (Soft Slate Container Style)
| M3 Token Role | Tailwind Class / CSS Hex Value | UI Element Usage |
| :--- | :--- | :--- |
| **Primary** | `#1a73e8` | Key actions, brand identifiers, active toggle fills |
| **On Primary** | `#ffffff` | Text/icons placed over Primary backgrounds |
| **Primary Container** | `#d2e3fc` | Selected tab highlight pills, soft accent frames |
| **On Primary Container**| `#001d3d` | High-emphasis label text on container fills |
| **Surface** | `#ffffff` | Secondary layout backdrops, active modal windows |
| **Surface Container Low**| `#f0f4f9` | The global background of the application viewport |
| **Surface Container** | `#ebeff6` | Segments, disabled controls, inset toolbars |
| **Outline** | `#74777f` | High-contrast borders, inputs, divider boundaries |
| **Outline Variant** | `#c4c6cf` | Non-interactive hairline borders, inactive markers |
| **Error** | `#b3261e` | Loss values, selling signals, errors, dismiss buttons |

### M3 Dark Palette (Modern Google Deep Space)
| M3 Token Role | Tailwind Class / CSS Hex Value | UI Element Usage |
| :--- | :--- | :--- |
| **Primary** | `#a8c7fa` | Accent elements, focus outlines, selected active fills |
| **On Primary** | `#0a305f` | High contrast indicators on dark dynamic chips |
| **Primary Container** | `#004481` | Subdued highlight indicators in navigation items |
| **On Primary Container**| `#d2e3fc` | Secondary informational headers on containers |
| **Surface** | `#1e1f20` | Inner cards, elevated dashboard metrics blocks |
| **Surface Container Lowest**| `#131314`| Default black body viewport desktop canvas |
| **Surface Container** | `#222425` | Segment bar background, form select containers |
| **Outline** | `#8e9099` | Custom element dividers, inputs hover styles |
| **Outline Variant** | `#44474e` | Weak borders, secondary card separators |
| **Error** | `#f2b8b5` | Sell flags, threat alerts, warning notes |

---

## 2. Elevation & Visual Depth Scale

In Material 3, elevation is represented by color overlays combined with soft shadows rather than sharp dark outlines. No high-contrast pure black shadows.

```css
/* M3 Elevation Shadow Tokens */
--m3-shadow-level1: 0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30);
--m3-shadow-level2: 0px 2px 6px 2px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30);
--m3-shadow-level3: 0px 1px 3px 0px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15);
--m3-shadow-level4: 0px 2px 3px 0px rgba(0, 0, 0, 0.3), 0px 6px 10px 4px rgba(0, 0, 0, 0.15);
--m3-shadow-level5: 0px 4px 4px 0px rgba(0, 0, 0, 0.3), 0px 8px 12px 6px rgba(0, 0, 0, 0.15);
```

- **Level 0 (Flat)**: Standard child buttons, passive list rows. No shadows.
- **Level 1 (Card Standard)**: Primary metric bento tiles. Soft low blur.
- **Level 2 (Header navigation bar, FAB)**: Bottom actions bar on mobile. Visible offset.
- **Level 3 (Modal boxes, dynamic dropdown sheets)**: Hover/active popups, trade inputs window. Clear focal extraction.

---

## 3. Shape & Border Radius Tokens

M3 relies heavy on highly rounded containers to group information contextually. Hard right angles are avoided.

- **None (`0px`)**: Full-screen mobile bottom edge safe areas only.
- **Extra Small (`4px`)**: Text field inline badges and small labels.
- **Small (`8px`)**: Inline indicators or status pills.
- **Medium (`12px`)**: Input field boxes, small quick-action buttons.
- **Large (`16px`)**: Segmented controls (pill shapes), standard bento sub-items.
- **Extra Large (`24px`)**: Desktop cards, metrics panels, charts wrapper container.
- **Full (`9999px`)**: Fully rounded navigation pills, active switches, floating action buttons (FAB), avatars.

---

## 4. Typography Hierarchy & Spacing Framework

### Type Pairing Strategy
Ensure there is no layout shifting or multi-line text wrapping on narrow displays.
- **Header Display**: `Inter` (sans-serif) or `Space Grotesk` - bold, narrow letter spacing (`tracking-tight`), distinct size hierarchy.
- **Technical/Numeric Data**: `JetBrains Mono` or `Fira Code` - monospace formatting for trading volumes, prices, dates, timestamps to secure tabular vertical alignment.
- **Body & Controls**: `Inter` font weights `450`, `500` (Medium), and `700` (Bold) to preserve contrast.

### Spacing and Safe Areas
- **Grid Layout**: 
  - Desktop: Maximum width constrained to `max-w-7xl` centered (`mx-auto`). Vertical gap `24px`.
  - Tablet/iPad: 8-column flow with consistent margins.
  - Mobile: Full width viewport with side padding of exactly `16px` (`px-4`) or `24px` (`px-6`) on containers. No horizontal bleeding.
- **Interaction Targets (Touch-targets)**: Every interactive element has an active hitbox of at least `48px x 48px` to comply with human ergonomics.
- **Safe Area Inset Compliance**: Ensure bottom sheets and mobile fixed headers protect top notches and bottom home indicators via:
  ```css
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  ```

---

## 5. Micro-Animations & Dynamic Easing

Transition durations are optimized for instant click feedback.
- **Standard Enter Transition**: `duration-250` utilizing **Google Emphasized Decelerate Easing**:
  `cubic-bezier(0.05, 0.7, 0.1, 1.0)`
- **Standard Exit/Scale Transition**: `duration-200` using **Google Emphasized Accelerate Easing**:
  `cubic-bezier(0.3, 0.0, 0.8, 0.15)`
- **Hover Transitions**: Linear fade or scale shifts confined to exactly 1.01% bounce to prevent spatial layout shifting.
