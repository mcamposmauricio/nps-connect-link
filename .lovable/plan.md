
# Bring Back Feature Cards as Alternating Full-Width Rows

## What the User Wants

Replace the old 3-column grid of feature cards with 3 separate **horizontal alternating sections** placed between the Hero and the CRM+Timeline. Each section is a 2-column layout:

- Row 1 (In-Product Conversations): **text left** | **card right**
- Row 2 (NPS Connected to Revenue): **card left** | **text right**
- Row 3 (Revenue & Health Signals): **text left** | **card right**

No section header or title label above them — just the 3 rows directly.

---

## Layout Structure

```text
Navbar
Hero
────────────────────────────────────────
Row 1: [Text copy] | [ChatMockup card]
Row 2: [NPSMockup card] | [Text copy]
Row 3: [Text copy] | [DashboardMockup card]
────────────────────────────────────────
CRM + Timeline (LandingTimeline)
Customer Journey (LandingKanban)
Early Access Form
Footer
```

On **mobile**: all stacks vertically — icon+title+description first, then the card below it.

---

## Section Design

Each row is a `<section className="py-8">` with a `max-w-7xl` container and a `grid lg:grid-cols-2 gap-12 items-center` layout. The text side shows:
- A small icon badge (same icon/color as current feature cards)
- Title (`text-[20px] font-medium text-white`)
- Description text (`text-[14px]` at `rgba(255,255,255,0.5)`)

The card side shows the same mockup components already in `LandingFeatures.tsx` (`ChatMockup`, `NPSMockup`, `DashboardMockup`), wrapped in the same dark card container (`#171C28` background, `1px solid rgba(255,255,255,0.05)` border, `rounded-xl`, `p-6`).

For rows where the card should be on the **left** (Row 2 — NPS), CSS `order` classes handle the visual swap:
- Desktop: card column gets `lg:order-first`, text column gets `lg:order-last`
- Mobile: text always appears first (default DOM order)

---

## Changes Required

### `src/components/landing/LandingFeatures.tsx`
Move `ChatMockup`, `NPSMockup`, and `DashboardMockup` components plus the `LandingTexts` type out of the current monolithic component, and export them so `LandingPage.tsx` can import and use each independently. The existing `LandingFeatures` default export (the 3-column grid) can remain but will no longer be used.

Alternatively (simpler), the 3 mockup components and the alternating rows can be implemented directly in a new exported component `LandingFeatureRows` within `LandingFeatures.tsx`.

### `src/pages/LandingPage.tsx`
- Import `LandingFeatures` again (or a new `LandingFeatureRows` export)
- Insert the 3 alternating rows **after the Hero section** (`</section>`) and **before** `<LandingTimeline t={t} />`
- The text strings used are already in the `texts` object: `feature1Title`, `feature1Desc`, `feature2Title`, `feature2Desc`, `feature3Title`, `feature3Desc`
- Add `MessageSquare`, `Target`, `BarChart3` back to the lucide-react import (they may already be there)

---

## Accent Colors per Feature

| Feature | Icon | Color |
|---|---|---|
| In-Product Conversations | `MessageSquare` | `#FF7A59` (coral) |
| NPS Connected to Revenue | `Target` | `#3498DB` (blue) |
| Revenue & Health Signals | `BarChart3` | `#2ECC71` (green) |

---

## Files to Modify

| File | What changes |
|---|---|
| `src/components/landing/LandingFeatures.tsx` | Add and export a new `LandingFeatureRows` component that renders the 3 alternating rows using the existing mockups |
| `src/pages/LandingPage.tsx` | Import `LandingFeatureRows`, render it between Hero and Timeline |

## What Does NOT Change

- Language toggle logic and persistence
- The `texts` object keys (already has all feature strings)
- `LandingTimeline`, `LandingKanban`, the form, the footer
- Hero section layout
- Any pages outside the landing
