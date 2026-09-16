---
name: Modern Administrative Precision
colors:
  surface: '#f7f9fc'
  surface-dim: '#d8dadd'
  surface-bright: '#f7f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f7'
  surface-container: '#eceef1'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e6'
  on-surface: '#191c1e'
  on-surface-variant: '#44474e'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f4'
  outline: '#75777e'
  outline-variant: '#c5c6ce'
  surface-tint: '#4d5f80'
  primary: '#000718'
  on-primary: '#ffffff'
  primary-container: '#0b1f3d'
  on-primary-container: '#7687ab'
  inverse-primary: '#b5c7ed'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#000618'
  on-tertiary: '#ffffff'
  tertiary-container: '#011e46'
  on-tertiary-container: '#7187b4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e3ff'
  primary-fixed-dim: '#b5c7ed'
  on-primary-fixed: '#061b39'
  on-primary-fixed-variant: '#354767'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#d7e2ff'
  tertiary-fixed-dim: '#b0c7f8'
  on-tertiary-fixed: '#001a40'
  on-tertiary-fixed-variant: '#304670'
  background: '#f7f9fc'
  on-background: '#191c1e'
  surface-variant: '#e0e3e6'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-md-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  body-sm-medium:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system establishes an institutional yet approachable digital workspace tailored for multi-unit school administrative teams, principals, foundation directors, and academic staff. The brand personality balances organizational rigor, trust, and absolute operational clarity. 

The aesthetic adheres to **Corporate Modern** with functional Scandinavian restraint:
- **Clean Structure**: Information density is managed via clear grouping, generous functional whitespace, and high legibility rather than decorative flourishes.
- **Reliable Authority**: The visual weight relies on structural deep navy elements anchoring primary interfaces (navigation sidebars, persistent headers), balanced against airy, low-fatigue slate backgrounds.
- **Micro-Precision**: Sharp hairline strokes, deliberate 8px–10px radii, and minimal atmospheric elevation communicate technical dependability without feeling clinical or punishing.
- **Restraint Over Novelty**: Avoid glassmorphism, aggressive gradient meshes, heavy neon glows, or skeumorphic skews. The interface acts as a silent, high-efficiency utility where operational accuracy (clock-ins, shift adjustments, approval workflows) takes precedence.

## Colors

The system employs an authoritative institutional palette calibrated for long operational hours across school administration desks and mobile attendance kiosks.

### Palette Architecture
- **Primary / Dominant Dark (`#0B1F3D`)**: Anchors critical structural regions—sidebar navigation, top-level brand banners, and primary CTA buttons. Signifies institutional governance and reliability.
- **Primary Hover (`#132C54`)**: Provides deliberate, low-glare feedback for primary interactive targets.
- **Accent / Interactive Blue (`#2563EB`)**: Drives situational interaction—active navigational routes, text links, input focus boundaries, toggle switches, and sub-actions.
- **Page Canvas Neutral (`#F5F7FA`)**: A soft slate-tinted ground that eliminates stark contrast glare from pure white screens.
- **Surface / Elevation (`#FFFFFF`)**: Pure white reserved exclusively for actionable containers, data tables, sheets, and modular cards.
- **Hairline Borders (`#E2E8F0`)**: Low-contrast architectural definition between content blocks, table rows, and input surfaces.
- **Typography Tones**:
  - **Text Primary (`#1A2333`)**: High-contrast, deep slate body tone ensuring WCAG AAA legibility.
  - **Text Muted (`#64748B`)**: Secondary information layer for metadata, timestamps, column labels, and auxiliary subtitles.
- **Semantic Feedback**:
  - **Success (`#16A34A`)**: On-time check-ins, verified staff, approved leaves.
  - **Warning (`#F59E0B`)**: Pending shifts, late arrivals, missing documentation.
  - **Danger / Error (`#DC2626`)**: Absent without leave, system validation errors, rejected requests.

### Contrast & State Rules
Interactive elements must never rely on color alone; paired icons or explicit textual tags accompany status flags. Focus rings leverage an accessible 2px offset ring using `rgba(37, 99, 235, 0.35)`.

## Typography

The typographic hierarchy pairs **Plus Jakarta Sans** for structural wayfinding and headings with **Inter** for dense transactional UI, tabular statistics, and data collection forms.

- **Headlines (Plus Jakarta Sans)**: Used in Semibold (600) and Bold (700). Its subtle geometric curves infuse warm modernism into managerial screens without degrading institutional stature.
- **Body & Tabular Layers (Inter)**: Employs Regular (400) and Medium (500). Optimized for maximum legibility in complex data rosters, attendance timestamps, shift calendars, and nested multi-unit school rosters. Numeric tabular figures (`font-variant-numeric: tabular-nums`) must be enabled on all data grids and timestamps.
- **Labels & Captions**: Capitalized structural headers and table headers must use `label-sm` with slight positive tracking to ensure fast vertical scanning across wide administrative monitors.

## Layout & Spacing

The layout is engineered around an 8pt architectural grid with a fluid 12-column configuration for dashboards, adjusting dynamically to responsive device breakpoints.

### Structural Framework
- **Desktop (>= 1280px)**: 12-column layout. Fixed left-hand navigation sidebar (260px expanded, 72px collapsed). Outer workspace uses `margin` (32px / 2rem) with `gutter` (24px / 1.5rem).
- **Tablet (768px – 1279px)**: 8-column layout. Off-canvas drawer or icon-only navigation rail. Margins step down to 24px (`space-lg`), gutters set to 16px (`space-md`).
- **Mobile (< 768px)**: 4-column layout. Single-column stacked cards and sticky bottom bar navigation for kiosk check-in approvals. Canvas margins use `margin-mobile` (16px / 1rem).

### Spatial Rhythm
- **Internal Component Spacing**: Form fields and buttons follow a strict 36px–40px touch standard using `space-xs` and `space-md` for internal vertical/horizontal padding.
- **Card and Widget Enclosures**: Information containers must consistently deploy `space-lg` (24px) internal padding, dropping to `space-md` (16px) on compact mobile viewports.
- **Structural Grouping**: Adjacent administrative modules (e.g., Unit Selector next to Summary Metrics) maintain 24px (`space-lg`) separation, while child lists within a card use 12px (`space-sm`) gaps.

## Elevation & Depth

This design system avoids theatrical 3D depths, physical skeuomorphism, and translucent blur planes. Visual hierarchy is achieved through crisp tonal separation, structured hairline outlines, and faint micro-shadows.

### Layering Hierarchy
1. **Canvas Layer (Base)**: `#F5F7FA`. Neutral foundation for whole-page rendering.
2. **Surface Layer (Level 1 - Cards & Tables)**: Pure `#FFFFFF` resting directly on `#F5F7FA`, bound by a 1px hairline border in `#E2E8F0`. Layer definition is reinforced with a micro-shadow: `box-shadow: 0 1px 3px rgba(11, 31, 61, 0.04), 0 1px 2px rgba(11, 31, 61, 0.02)`.
3. **Interactive & Floating Layer (Level 2 - Dropdowns, Popovers, Date Pickers)**: `#FFFFFF` paired with an elevated boundary: `box-shadow: 0 4px 12px -2px rgba(11, 31, 61, 0.08), 0 2px 6px -1px rgba(11, 31, 61, 0.04)`.
4. **Modal & Dialog Layer (Level 3)**: `#FFFFFF` elevated over a tinted institutional scrim (`rgba(11, 31, 61, 0.45)` backdrop) using `box-shadow: 0 20px 25px -5px rgba(11, 31, 61, 0.1), 0 8px 10px -6px rgba(11, 31, 61, 0.05)`.

### Border Integrity
Every elevated card, modal, or input requires a 1px perimeter border of `#E2E8F0`. On dark surfaces (e.g., `#0B1F3D` sidebar), borders transition to `rgba(255, 255, 255, 0.08)`.

## Shapes

The interface embraces a balanced curvature model calibrated between 8px and 10px to achieve a modern administrative identity that is neither sharp-industrial nor overly playful.

- **Primary Geometry (8px / `0.5rem`)**: Standard for input fields, interactive buttons, table row selections, unit badges, and dropdown menus.
- **Card & Container Geometry (10px–12px)**: Applied to parent containers, modal dialogues, floating sheets, and metric statistic cards.
- **Status Pills & Chips (Full Curve / 9999px)**: Reserved exclusively for system status indicators (e.g., "Present", "Late", "Medical Leave"), unit tags, and small staff counter badges.
- **Icon Enclosures**: Outline icons sit inside 32x32px or 36x36px soft-corner squares (`rounded-lg` or 8px) with subtle contextual background fills (e.g., `#F1F5F9`).

## Components

### Buttons
- **Primary**: Background `#0B1F3D`, text `#FFFFFF`, border none, 8px radius. Hover: `#132C54`. Active: `#08162B`. Focus ring: 2px offset with `#2563EB`.
- **Secondary / Action**: Background `#FFFFFF`, text `#1A2333`, border 1px solid `#E2E8F0`, 8px radius. Hover: `#F8FAFC` and border `#CBD5E1`.
- **Tertiary / Accent**: Background `#2563EB`, text `#FFFFFF`. Used for key singular actions (e.g., "Broadcast Announcement" or "Export Audit"). Hover: `#1D4ED8`.
- **Ghost / Utility**: Background transparent, text `#64748B`. Hover: text `#1A2333`, background `#F1F5F9`.

### Form Fields & Inputs
- **Text Inputs & Selects**: Height 40px (desktop), background `#FFFFFF`, border 1px solid `#E2E8F0`, corner radius 8px, padding `0 12px`. Text in `Inter 14px` (`#1A2333`).
- **Placeholder**: Color `#94A3B8`.
- **Focus State**: Border color `#2563EB`, box-shadow `0 0 0 3px rgba(37, 99, 235, 0.15)`.
- **Error State**: Border color `#DC2626`, box-shadow `0 0 0 3px rgba(220, 38, 38, 0.15)`. Accompanied by 12px error text below.

### Cards & Metrics Panels
- **Structure**: Surface `#FFFFFF`, 1px solid `#E2E8F0` border, 10px radius, padding 20px–24px.
- **Header**: Flex layout with Plus Jakarta Sans Semibold 16px title on the left, action menu or unit filter chip on the right. Divider line below header is optional; rely on 16px margin if undividable.

### Data Tables (Rosters & Attendance Logs)
- **Header**: Background `#F8FAFC`, border-bottom 1px solid `#E2E8F0`, typography `Inter 11px Bold`, tracking uppercase, color `#64748B`.
- **Rows**: Background `#FFFFFF`, border-bottom 1px solid `#F1F5F9`, height 52px. Hover state: `#F8FAFC`.
- **Cell Content**: Numeric columns must align right and utilize tabular numerals. Text columns align left.

### Status Chips & Badges
- **Shape**: Full pill (`rounded-full`), padding 2px 10px, typography `Inter 12px Medium`.
- **Present / On-Time**: Background `#DCFCE7`, text `#16A34A`.
- **Late / Attention**: Background `#FEF3C7`, text `#B45309`.
- **Absent / Incident**: Background `#FEE2E2`, text `#DC2626`.
- **Unit / Organization Tag**: Background `#EFF6FF`, text `#2563EB`.

### Iconography
- **Style**: Feather / Lucide style line outlines only. Stroke width strictly 1.5px to 2.0px. No filled varieties (except small dot indicators) and zero 3D/emoji assets. Scale: 16px for inline table data, 20px for form inputs and navigation links.

### Multi-Unit Switcher
- **Header Placement**: Persistent pill or dropdown selector anchored in the primary sidebar/header. Displays current academic branch/unit (e.g., "Unit SMA", "Unit SMP", "Yayasan Pusat"). Border 1px solid `rgba(255,255,255,0.12)`, background `rgba(255,255,255,0.06)`, text `#FFFFFF` with trailing chevron.