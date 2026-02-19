
# Landing Page Refactor — Updated Copy, Hero Layout & Dashboard Cards

## What Changes and Why

### 1. Updated Copy (Bilingual)

The `texts` object in `LandingPage.tsx` holds all translatable strings. Only specific keys need updating to match the new messaging brief.

**English:**
- `heroH1a` / `heroH1b` → collapse into a single headline: **"Experience as fuel for recurring revenue"**
- `heroSub` → "The CX platform that organizes journey insights and empowers your team to ensure your customer's success!"
- `heroCta` / `navCta` → **"Get Started Now!"**

**Portuguese:**
- `heroH1a` / `heroH1b` → **"Experiência como combustível para receita recorrente"**
- `heroSub` → "A plataforma de CX que organiza insights de jornada e suporta o seu time a garantir o sucesso do seu cliente!"
- `heroCta` / `navCta` → **"Clique e Conheça!"**

The two-part H1 (`heroH1a` + `heroH1b`) structure will be simplified to a single field since the new headline is one sentence with no intentional mid-line color split. The colored second half will be kept by splitting on the last word/phrase.

---

### 2. Hero Layout — Horizontal 3:1 with Right-Side Dashboard Cards

The current hero is centered/vertical text only. The request asks for a **horizontal layout** (text left, product mockup right) at desktop, stacking vertically on mobile. This requires a structural change to the Hero section in `LandingPage.tsx`.

**Desktop (lg+):** `grid grid-cols-3` — left column takes `col-span-1` (copy), right column takes `col-span-2` (dashboard mockup panel).

**Mobile:** single column, text centered on top, mockup below.

The right-side panel will show **4 dashboard cards** representing the 4 pillars:
1. In-Product Conversations (icon: `MessageSquare`, color: `#FF7A59`)
2. NPS Connected to Revenue (icon: `Target`, color: `#3DA5F4`)
3. Revenue Feedback (icon: `MessageCircle`, color: `#2ED47A`)
4. Revenue & Health Signals (icon: `BarChart3`, color: `#F5B546`)

Each card is a small rounded tile with an icon, label, and a subtle metric line — styled identically to the `DashboardMockup` pattern already in `LandingFeatures.tsx` but updated to represent the 4 pillars.

---

### 3. Color Palette Update

| Token | Before | After |
|---|---|---|
| Page background | `#0F1115` | `#0F1115` (keep — close to Deep Navy) |
| Navbar/form background | `#131722` | `#131722` (keep) |
| Surface | `#171C28` | `#171C28` (keep) |
| Primary CTA | `#FF7A59` | `#FF7A59` (already Coral — keep) |
| Metric Blue | `#3DA5F4` | `#3498DB` (update to spec) |
| Success Green | `#2ED47A` | `#2ECC71` (update to spec) |

The two accent colors (`#3DA5F4` → `#3498DB` and `#2ED47A` → `#2ECC71`) need a **global find-replace** across all four landing files since they appear in borders, icon colors, badge backgrounds, and chart strokes.

> Note: The `#1A2B48` background from the spec is close to the current dark palette. We will keep `#0F1115` as the page background because it's the established identity standard and changing it would affect the existing dark-premium look. The navbar glass effect already creates depth layering.

---

### 4. Remove HubSpot / Third-Party Branding

There is no HubSpot logo or third-party branding visible in any of the four landing files. The mockups are entirely custom SVG/div components. No action needed here.

---

### 5. Rounded Corners — Soft UI (12px–16px)

Currently cards use `rounded-xl` (12px) and `rounded-lg` (8px) inconsistently. The spec requests **12px–16px** for card components. We will:
- Feature cards in `LandingFeatures.tsx`: stay `rounded-xl` (12px) ✓
- Timeline mockup: stay `rounded-xl` ✓
- Kanban column containers: stay `rounded-xl` ✓
- Form card: `rounded-xl` → `rounded-2xl` (16px) for a softer look matching spec
- Hero right-side panel: `rounded-2xl`

---

## Files to Modify

| File | What Changes |
|---|---|
| `src/pages/LandingPage.tsx` | Update `texts` object (EN + PT copy), refactor Hero section to horizontal 3:1 layout with 4-pillar cards on the right, update accent colors |
| `src/components/landing/LandingFeatures.tsx` | Update accent colors (`#3DA5F4` → `#3498DB`, `#2ED47A` → `#2ECC71`) |
| `src/components/landing/LandingTimeline.tsx` | Update accent colors in timeline dot colors and badges |
| `src/components/landing/LandingKanban.tsx` | Update `#2ED47A` → `#2ECC71` in health badges |

---

## What Does NOT Change

- Language toggle logic, persistence, and `initLang()` — already correct
- Form submission logic, validation, lead tracking
- `LandingFeatures`, `LandingTimeline`, `LandingKanban` sections (structure) — only colors and text props update
- Logo (`/logo-dark.svg`) — already correct branding
- Footer, form section layout
- Any file outside the four landing files listed above
- Auth, AppSidebar, dashboard pages — zero changes
