
# Landing Page Redesign — Journey Early Access

## Overview

A complete rebuild of `src/pages/LandingPage.tsx` and its supporting component files. The old "features first, then form" layout is replaced by a full-length conversion-focused page with 7 structured sections, premium dark aesthetics, and two new product mockups (Kanban + CRM Timeline).

The `leads` table already supports the `role` field, so the expanded form (Name, Work Email, Company, Role) requires no database migration.

---

## Files to Create / Modify

| File | Action |
|---|---|
| `src/pages/LandingPage.tsx` | Full rewrite — orchestrates all sections, form state, submit logic |
| `src/components/landing/LandingFeatures.tsx` | Rewrite — updated copy, mockups refined, English copy |
| `src/components/landing/LandingKanban.tsx` | New — Kanban pipeline mockup section |
| `src/components/landing/LandingTimeline.tsx` | New — CRM Timeline section |
| `src/components/LandingBackgroundMockups.tsx` | Remove — background mockups replaced by inline sections |

---

## Section-by-Section Plan

### Section 1 — Navbar
- Logo (`/logo-dark.svg`) on the left
- Two buttons right-aligned:
  - Ghost: "Enter Dashboard" → navigates to `/auth` or `/cs-dashboard`
  - Primary coral (`#FF7A59`): "Request Early Access" → smooth scroll to `#early-access`
- `sticky top-0 z-50`, `backdrop-blur-xl`, border-bottom `rgba(255,255,255,0.06)`
- No heavy shadow

### Section 2 — Hero
- Full-viewport-height centered text block
- Headline: **"Turn Customer Success into Predictable Revenue."** — `text-[44px]` Medium, white
- Subheadline (5 lines): Monitor churn / Automate NPS / Track health / Engage in-product / Manage journeys — `text-[18px]` Regular, `rgba(255,255,255,0.65)`
- Primary CTA button: "Request Early Access" (coral, large)
- Microcopy below: "Launching soon. Early access is limited." — `text-sm`, `rgba(255,255,255,0.40)`
- Subtle radial glow behind the text (coral at ~5% opacity)
- Animated entrance with `animate-fade-in-up`

### Section 3 — Core Modules (3 cards)
Rewrite of `LandingFeatures.tsx` with English copy:

| Card | Title | Description |
|---|---|---|
| Chat | In-Product Conversations | Engage customers directly inside your product. Resolve friction faster and create retention opportunities in real time. |
| NPS | NPS Connected to Revenue | Automated NPS flows connected to health score and churn prediction. |
| Dashboard | Revenue & Health Signals | Churn, MRR impact, CSAT and engagement in one executive view. |

- Card background: `#171C28`, border `rgba(255,255,255,0.06)`, radius `12px`
- Mockups refined with the existing CSS-only approach but higher-fidelity (actual values visible: "72", "MRR R$142k", etc.)
- Metric Blue accent (`#3DA5F4`) for the NPS bar promoter segment

### Section 4 — Customer Journey Kanban (New: `LandingKanban.tsx`)

Horizontal Kanban board — CSS mockup, not interactive:

```
[ Onboarding ] [ Adoption ] [ Expansion ] [ Risk ] [ Renewal ]
```

Each column contains:
- Column header with stage name + count badge
- 2–3 client cards per column, each with:
  - Company initials avatar
  - Company name (placeholder text bars)
  - Health badge (colored dot + label: Healthy / At Risk / Critical)
  - MRR stub value

Risk column: cards use `#FF5C5C/15` border tint
Expansion column: cards use `#2ED47A/15` border tint

Copy above the board:
- H2: "Visualize every customer journey stage."
- Subtext: "Move accounts based on signals — not assumptions."

On mobile: `overflow-x-auto` horizontal scroll

### Section 5 — CRM Timeline (New: `LandingTimeline.tsx`)

Split layout: left copy, right mockup card.

Mockup card (`#171C28`, border `rgba(255,255,255,0.06)`):
- Header row: company name, Health badge (green), MRR chip, Risk chip
- Vertical timeline below with 5–6 events:

| Event | Color dot | Label |
|---|---|---|
| NPS submission | `#3DA5F4` | "NPS: 9 — Promoter" |
| Chat interaction | `#3DA5F4` | "Support chat closed" |
| Feature usage spike | `#2ED47A` | "Feature adoption +40%" |
| Risk alert | `#FF5C5C` | "Health dropped to 52" |
| Expansion opportunity | `#2ED47A` | "Upsell signal detected" |
| Renewal action | `#F5B546` | "Renewal in 30 days" |

Copy left:
- H2: "Track every interaction. Every signal. Every opportunity."
- Body: "From first onboarding to renewal — everything in one timeline."

On mobile: stacks vertically (copy on top, mockup below)

### Section 6 — Early Access Form (`id="early-access"`)

Centered card (`max-w-lg`), `#171C28` background:
- Title: "Be the First to Access Journey" — H2 white
- Subtext: "We are onboarding a limited group of CS and Revenue teams who want to build predictable growth from customer data."
- Four fields: Full Name, Work Email, Company Name, Role/Position
- CTA Button: "Join Early Access" — coral (`#FF7A59`), full width
- Microcopy below button: "Selected early users will have direct access to the founding team and influence the product roadmap."
- Success state: checkmark + confirmation message (existing behavior preserved)
- Validation: zod schema extended with `role` field
- Submit: inserts into existing `leads` table including `role`

### Section 7 — Final CTA Strip

Dark strip, centered:
- Quote headline: `"Customer Experience is a Signal. Revenue is the Outcome."`
- Button: "Request Early Access" → scroll to `#early-access`

### Footer
- Logo + tagline
- Copyright line

---

## Design Tokens Applied

All inline styles and classes will use the design system tokens:

```
Background:   #0F1115
Cards:        #171C28
Secondary:    #1E2433
Text:         #F2F4F8
Text muted:   rgba(255,255,255,0.65)
Border:       rgba(255,255,255,0.06)
Coral CTA:    #FF7A59
Metric Blue:  #3DA5F4
Success:      #2ED47A
Warning:      #F5B546
Danger:       #FF5C5C
Radius:       12px (cards), 8px (buttons/inputs)
```

---

## What Is NOT Changed

- Backend / `leads` table schema — already has `role` field
- Auth flow, routing, protected pages
- Any non-landing components (sidebar, app pages, etc.)
- `supabase/config.toml`, `client.ts`, `types.ts`
- All design system CSS variables and Tailwind config (already set)
