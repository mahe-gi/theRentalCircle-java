# RentalCircle — Frontend Design System & UI/UX Guidelines

**Version:** 1.0  
**Status:** Established  
**Product:** RentalCircle  
**Market:** India (Zero-Brokerage Verified Property Marketplace)  
**Authoritative Product Baseline:** `prd.md` (v1.0)  
**Technical Architecture Baseline:** `architecture.md` (v1.0)  

---

## 1. Brand Vision & Design Philosophy

RentalCircle is a zero-brokerage, trust-first property marketplace built specifically for the Indian real estate landscape. Its visual design must convey **authenticity, calm authority, transparency, and warmth**.

### Visual Pillars
- **Premium & Restrained:** Feels deliberate, refined, and high-value without being flashy or ostentatious.
- **Trustworthy & Transparent:** The visual presentation places verified owner status, genuine property photography, and clear pricing at the absolute forefront.
- **Warm & Welcoming:** Avoids the sterile, clinical feel of generic enterprise software and the cluttered, ad-heavy look of traditional Indian property portals.
- **Fast & Functional:** Instant visual feedback, clear content hierarchy, and immediate paths to action (WhatsApp, visits, enquiries).

### Design References & Inspiration
Design benchmarks such as [Atlía](https://www.atlia.com/) and [Brickwise](https://www.brickwiseai.com/) are consulted solely as reference points for **editorial polish, disciplined typography, generous whitespace, visual rhythm, and elevated property photography presentation**. RentalCircle maintains its own distinct visual identity, tailored specifically for zero-broker property discovery in India.

### What RentalCircle is NOT
- ❌ Not a generic Bootstrap/Material CRUD portal with heavy borders and primary blue buttons.
- ❌ Not an ad-cluttered portal with blinking banners, promotional popups, or fake urgency badges.
- ❌ Not an over-stylized tech demo with distracting scroll-jacking, heavy 3D glassmorphism, or floaty gradient blobs.
- ❌ Not an overcrowded screen with 40 filter options fighting for attention on initial view.

---

## 2. Typography System

RentalCircle uses a paired typographic hierarchy combining an editorial serif for high-impact brand statements with an engineered sans-serif for UI clarity and data density.

### Font Families
1. **Display & Editorial Headings:** `DM Serif Display` (or `Instrument Serif`)
   - Evokes quality, architectural permanence, and editorial authority.
   - Applied selectively to: Hero titles, major section headings, marketing value propositions, and editorial highlights.
2. **Interface, Body & Metadata:** `Manrope` (or `Inter`)
   - Engineered for supreme legibility on digital screens across all densities.
   - Applied to: Navigation, buttons, search inputs, form fields, property metadata, prices, table data, and dashboard interfaces.

### Type Scale

| Style / Token | Font Family | Size (Desktop) | Size (Mobile) | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|---|---|
| `display-2xl` | Display Serif | 56px (3.5rem) | 38px (2.375rem) | 400 | 1.15 | -0.02em | Hero headline |
| `display-xl` | Display Serif | 44px (2.75rem) | 32px (2.0rem) | 400 | 1.20 | -0.015em | Major section headers |
| `heading-1` | UI Sans | 32px (2.0rem) | 26px (1.625rem) | 700 | 1.25 | -0.01em | Page titles, property detail titles |
| `heading-2` | UI Sans | 24px (1.5rem) | 20px (1.25rem) | 600 | 1.30 | -0.01em | Card section titles, modal headers |
| `heading-3` | UI Sans | 20px (1.25rem) | 18px (1.125rem) | 600 | 1.35 | -0.005em | Subsections, dashboard widget titles |
| `body-lg` | UI Sans | 18px (1.125rem) | 16px (1.0rem) | 400 / 500 | 1.55 | 0 | Lead paragraphs, hero subtext |
| `body-base` | UI Sans | 15px (0.9375rem) | 15px (0.9375rem) | 400 / 500 | 1.50 | 0 | Primary body text, descriptions |
| `body-sm` | UI Sans | 13px (0.8125rem) | 13px (0.8125rem) | 500 | 1.45 | 0.005em | Form labels, property attributes |
| `caption` | UI Sans | 12px (0.75rem) | 12px (0.75rem) | 600 | 1.40 | 0.02em | Badges, timestamps, small tags |
| `price-lg` | UI Sans | 28px (1.75rem) | 24px (1.5rem) | 700 | 1.20 | -0.01em | Property detail price display |
| `price-card` | UI Sans | 20px (1.25rem) | 18px (1.125rem) | 700 | 1.25 | -0.01em | Property card price tag |

---

## 3. Color System & Design Tokens

The color palette is grounded in natural architectural tones: **Deep Teal** for brand authority and verified trust, **Warm Ivory / Off-White** for natural canvas warmth, and **Deep Charcoal** for crisp, comfortable contrast.

```text
PRIMARY: Deep Teal          BACKGROUND: Warm Ivory       ACCENT: Warm Amber
┌─────────────────────────┐ ┌──────────────────────────┐ ┌─────────────────────────┐
│ #0F4C4A                 │ │ #FBF9F5                  │ │ #D97706                 │
│ Deep, grounded, trust   │ │ Warm, organic, soothing  │ │ Highlights, highlights  │
└─────────────────────────┘ └──────────────────────────┘ └─────────────────────────┘
```

### Color Palette Specification

```css
:root {
  /* Brand Primary: Deep Teal */
  --primary: #0F4C4A;
  --primary-hover: #0A3735;
  --primary-active: #072625;
  --primary-light: #EBF3F2;
  --primary-subtle: #F3F8F7;

  /* Canvas & Backgrounds: Warm Organic Neutrals */
  --background: #FBF9F5;
  --surface: #FFFFFF;
  --surface-raised: #FFFFFF;
  --surface-subtle: #F4F1EA;
  --surface-muted: #EFECE5;

  /* Typography / Text */
  --text-primary: #1A1D1E;       /* Deep Charcoal */
  --text-secondary: #4A5560;     /* Balanced Slate */
  --text-muted: #788590;         /* Soft Gray */
  --text-on-primary: #FFFFFF;    /* Clean White */

  /* Structural Borders & Dividers */
  --border-subtle: #EBE7DF;
  --border-default: #DDD8CE;
  --border-focused: #0F4C4A;

  /* Semantic Accents & Status */
  --accent: #D97706;             /* Warm Amber / Gold */
  --accent-light: #FEF3C7;
  --verified-green: #0D9488;      /* Deep Teal-Green Verification */
  --verified-light: #CCFBF1;
  --destructive: #DC2626;         /* Terracotta / Crimson */
  --destructive-light: #FEE2E2;
  --info: #0284C7;
  --info-light: #E0F2FE;

  /* Focus Ring */
  --ring: rgba(15, 76, 74, 0.25);
}
```

---

## 4. Spacing, Elevation & Shape System

To avoid visual friction and layout drift, all margins, paddings, and component dimensions adhere to a strict **4px/8px baseline rhythm**.

### Spacing Scale
- `space-1`: 4px — Tight badge padding, micro gaps
- `space-2`: 8px — Icon-to-text spacing, input internal padding
- `space-3`: 12px — Button internal padding (x), card tag gaps
- `space-4`: 16px — Standard component padding, list item gaps
- `space-5`: 20px — Medium card inner padding
- `space-6`: 24px — Large card padding, form section gaps
- `space-8`: 32px — Sub-section separation, mobile section spacing
- `space-12`: 48px — Desktop column gaps, moderate section margins
- `space-16`: 64px — Standard desktop section spacing
- `space-24`: 96px — Major hero and editorial section spacing

### Layout Container Widths
- Standard Content Container: `max-w-7xl` (`1280px`) with `px-4 sm:px-6 lg:px-8`
- Wide Marketing / Hero Container: `max-w-[1400px]`
- Reading / Form Container: `max-w-3xl` (`768px`)
- Authentication Card Container: `max-w-md` (`448px`)

### Border Radius
- `rounded-sm`: 4px — Badges, small chips, tooltip boxes
- `rounded-md`: 8px — Form inputs, dropdown menus, buttons
- `rounded-lg`: 12px — Standard cards, modals, image containers
- `rounded-xl`: 16px — Hero search box, featured highlight panels
- `rounded-full`: 9999px — Avatars, pill status badges, circular icon buttons
- *Note:* Excessively round, cartoonish cards (`rounded-3xl` on standard cards) are prohibited.

### Elevation & Shadows
Shadows in RentalCircle mimic soft natural ambient lighting against a warm background:
```css
/* Subtle Card Resting State */
box-shadow: 0 1px 3px rgba(26, 29, 30, 0.04), 0 1px 2px rgba(26, 29, 30, 0.02);

/* Elevated / Hover State */
box-shadow: 0 10px 25px -3px rgba(15, 76, 74, 0.08), 0 4px 6px -2px rgba(15, 76, 74, 0.03);

/* Dropdown & Modal Dialog */
box-shadow: 0 20px 35px -5px rgba(26, 29, 30, 0.12), 0 10px 10px -5px rgba(26, 29, 30, 0.04);
```

---

## 5. Global Header & Navigation

The header sets the tone of calm credibility. It remains sticky at the top with a subtle backdrop blur on scroll.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  [🏠 RentalCircle]      Explore    For Owners    About Us           ♡ (0)  [Sign In]   │
│   Zero-Broker Platform                                            [Post Property Free] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Desktop Header Layout
- **Left:** RentalCircle Wordmark paired with a minimal geometric arch/circle emblem and a tiny muted tag: `ZERO-BROKER`.
- **Center:** Clear navigation links (`Explore Properties`, `For Owners`, `Trust & Verification`, `About Us`) with subtle hover underlines.
- **Right:**
  - Saved Listings Heart icon with an unread badge indicator.
  - Secondary text link: `Sign In` / `Account`.
  - Primary Action Button: `Post Property Free` (Deep Teal background, clean white text, high visual prominence).

### Mobile Header Layout
- Compact 60px bar: Logo on left, `Post Property` compact button in center-right, and clean hamburger icon on the right.
- Off-canvas drawer slides smoothly from the right, offering full navigation, login state, and quick contact options.

---

## 6. Homepage Architecture & Visual Hierarchy

The homepage guides users immediately toward discovery while embedding reassurance of zero brokerage and verification at every step.

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. HEADER (Sticky, Minimalist)                                         │
├────────────────────────────────────────────────────────────────────────┤
│ 2. HERO SECTION                                                        │
│    "Find Your Next Home Directly from Verified Owners"                │
│    No Brokers. No Hidden Fees. Direct WhatsApp Connection.             │
│                                                                        │
│    ┌─────────────────────────────────────────────────────────────┐     │
│    │ 3. SEARCH PANEL (Floating card with warm border)             │     │
│    │ [Rent | Buy]  Location Input  | Property Type | Budget | [Go]│     │
│    └─────────────────────────────────────────────────────────────┘     │
├────────────────────────────────────────────────────────────────────────┤
│ 4. TRUST STRIP                                                         │
│    ✓ 100% Zero Brokerage  •  ✓ Direct Owner Contact  •  ✓ Verified Homes │
├────────────────────────────────────────────────────────────────────────┤
│ 5. FEATURED VERIFIED LISTINGS (High-Impact Card Grid)                  │
├────────────────────────────────────────────────────────────────────────┤
│ 6. THE RENTALCIRCLE DIFFERENCE (Traditional Broker vs. RentalCircle)   │
├────────────────────────────────────────────────────────────────────────┤
│ 7. HOW IT WORKS (Search → Verify → Connect via WhatsApp → Visit)       │
├────────────────────────────────────────────────────────────────────────┤
│ 8. VERIFICATION ASSURANCE (Owner Deed Checks & Moderation)             │
├────────────────────────────────────────────────────────────────────────┤
│ 9. FINAL OWNER CTA BANNER ("Have a property to rent or sell?")         │
├────────────────────────────────────────────────────────────────────────┤
│ 10. COMPREHENSIVE FOOTER                                               │
└────────────────────────────────────────────────────────────────────────┘
```

### Hero Section Execution
- **Headline:** Rendered in `display-2xl` serif typography: *"Find Your Next Home Directly from Verified Owners"*.
- **Subheadline:** Set in `body-lg` sans-serif: *"India's zero-brokerage property marketplace. Connect directly with genuine property owners, view locations on map, and schedule visits without paying brokerage."*
- **Hero Search Panel:** Sits as an elevated ivory/white card with segmented tabs for `Rent` and `Buy`, followed by 4 distinct input zones:
  1. *Location:* Input with autocomplete suggestions (City, Locality).
  2. *Property Type:* Dropdown (Apartment, Independent House, Villa).
  3. *Budget Range:* Selectable budget brackets formatted in Indian Rupees (₹10k-₹25k, ₹25k-₹50k, ₹50k+).
  4. *Action:* High-contrast Deep Teal `Search Properties` button.

---

## 7. Property Card Component

The property card is the foundational atomic marketplace component. It balances rich visual discovery with critical verification cues.

```text
┌──────────────────────────────────────────┐
│ ┌──────────────────────────────────────┐ │
│ │ [Photo: 16:10 aspect ratio]          │ │
│ │                                      │ │
│ │ [✓ Verified Owner]               [♡] │ │
│ └──────────────────────────────────────┘ │
│ 2 BHK Semi-Furnished Apartment           │
│ ₹28,000 / month                          │
│ Madhapur, Hyderabad                      │
│ 2 Beds  •  2 Baths  •  1,250 sqft        │
│ ──────────────────────────────────────── │
│ Direct Owner Listing  •  Available Oct 1 │
└──────────────────────────────────────────┘
```

### Anatomy & Specifications
1. **Aspect Ratio:** Fixed `16:10` image container using `object-cover`. Prevents awkward image stretching and layout jumps.
2. **Badge Overlays:**
   - Top-Left: `✓ Verified Owner` pill (`bg-teal-900/80 text-white backdrop-blur-sm px-2.5 py-1 text-xs rounded-full font-medium`).
   - Top-Right: Circular favorite button (`w-8 h-8 rounded-full bg-white/90 backdrop-blur text-slate-700 hover:text-red-500 shadow-sm flex items-center justify-center`).
3. **Typography & Layout:**
   - Property Type & Tag: `text-xs font-semibold uppercase tracking-wider text-teal-800`.
   - Price: Bold `price-card` formatting in Indian notation (`₹28,000 / mo` for rent; `₹1.45 Cr` for sale).
   - Locality & City: `text-sm font-medium text-slate-700` with pin icon.
   - Key Specs Strip: Horizontal list of attributes separated by mid-dots (`2 Beds • 2 Baths • 1,250 sq.ft`).
4. **Interactive States:**
   - Resting: Subtle warm border (`border-[#EBE7DF]`), crisp resting shadow.
   - Hover: Border shifts to `--primary` (subtle teal tint), translateY(-3px), shadow deepens gracefully.

---

## 8. Marketplace Search & Filter Interface

The search experience must feel responsive, intuitive, and focused.

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [Search Bar: "Madhapur, Hyderabad"]    [Rent ▼] [2 BHK ▼] [Price ▼]    │
├──────────────────────────┬─────────────────────────────────────────────┤
│ FILTERS (Left Sidebar)   │ 142 Verified Properties in Madhapur         │
│                          │ Sort by: [Recommended ▼]                    │
│ Listing Type:            │                                             │
│ (•) Rent  ( ) Sale       │ ┌───────────────┐ ┌───────────────┐         │
│                          │ │ Property Card │ │ Property Card │         │
│ BHK Configuration:       │ └───────────────┘ └───────────────┘         │
│ [1 BHK] [2 BHK] [3 BHK]  │ ┌───────────────┐ ┌───────────────┐         │
│                          │ │ Property Card │ │ Property Card │         │
│ Price Range (₹ / Month): │ └───────────────┘ └───────────────┘         │
│ [Min: 15,000] - [50,000] │                                             │
│                          │ [ 1 ]  2  3  4 ... Next →                   │
│ [Clear All] [Apply]      │                                             │
└──────────────────────────┴─────────────────────────────────────────────┘
```

- **Filter Sidebar:** Fixed width (280px on desktop), collapsible on mobile as a clean slide-up bottom sheet. Exposes only MVP-supported parameters (Location, Type, Rent/Sale, Budget, BHK, Furnishing, Verified Only).
- **Loading State:** Graceful animated skeleton cards matching the exact layout of property cards.
- **Empty State:** Clean, respectful illustration with a friendly prompt: *"No verified properties found matching these exact filters. Try expanding your budget or clearing filters."* with a direct `Reset Filters` action button.

---

## 9. Property Detail Page Architecture

The property detail page is designed to convert interest into direct owner action without friction.

```text
┌────────────────────────────────────────────────────────────────────────┐
│ ← Back to Search        Share  •  Save Property                         │
├────────────────────────────────────────────────────────────────────────┤
│ 5-PHOTO GALLERY (Asymmetric Architectural Grid)                        │
│ ┌─────────────────────────┬───────────────────────────┐                │
│ │                         │ [Photo 2]     [Photo 3]   │                │
│ │ Large Primary Cover     ├───────────────────────────┤                │
│ │                         │ [Photo 4]     [+8 Photos] │                │
│ └─────────────────────────┴───────────────────────────┘                │
├───────────────────────────────────────┬────────────────────────────────┤
│ MAIN CONTENT (Left 65%)               │ STICKY ACTION CARD (Right 35%) │
│                                       │                                │
│ ₹32,000 / month                       │ Direct Owner Connection        │
│ 3 BHK Luxury Apartment in Gachibowli  │ ✓ Identity & Ownership Checked │
│                                       │                                │
│ Key Facts Grid:                       │ [ 💬 Chat on WhatsApp ]        │
│ 3 Beds • 3 Baths • 1,650 sqft • Floor │ (Direct link to owner mobile)  │
│                                       │                                │
│ Owner Verification Box:               │ [ 📅 Schedule a Site Visit ]   │
│ "Listed by Rajesh Sharma (Owner)"     │                                │
│ Verified via Title Deed & Electricity │ [ ✉ Send Direct Enquiry ]      │
│                                       │                                │
│ Description                           │ 🚩 Report Suspicious Listing   │
│ Amenities Grid (Parking, Gym, Lift..) │                                │
│ Interactive Map with Location Marker  │                                │
└───────────────────────────────────────┴────────────────────────────────┘
```

### Action Panel Highlights
- **WhatsApp Button:** Vivid, accessible green button (`bg-[#25D366]` hover `bg-[#1EBE5D]` text-white) with WhatsApp icon. Initiates direct `wa.me` deep link while recording contact metrics.
- **Schedule Visit Button:** Secondary outline button opening a date/time picker modal.
- **Report Property Link:** Discreet, muted text link at the base of the card ensuring safety without cluttering the primary workflow.

---

## 10. Owner Portal & Listing Wizard

The owner portal provides landlords and authorized representatives with a calm, orderly workspace.

### Listing Creation Wizard (5 Simple Steps)
1. **Step 1: Property Details:** Title, listing type (Rent/Sale), property type, BHK, price, carpet area, furnishing, and availability date.
2. **Step 2: Location & Map:** City, locality, address, and interactive Leaflet map pin placement to capture precise latitude/longitude.
3. **Step 3: Property Photos:** Drag-and-drop image uploader with primary cover photo selector.
4. **Step 4: Ownership Documents:** Secure document upload for identity proof (PAN/Aadhaar) and title documents (utility bill, title deed, or authorization letter). Clear reassurance note: *"Documents are private and will never be shown to public users."*
5. **Step 5: Review & Submit:** Comprehensive summary preview before submitting for administrative approval.

---

## 11. User Dashboard & Admin Moderation UI

### User Dashboard
- Clean, focused tab navigation: `Saved Properties`, `My Visits`, `My Enquiries`, `Notifications`, `Profile Settings`.
- Cards display scheduled visit status pills (`Requested`, `Accepted`, `Rescheduled`, `Completed`) with clear dates and action buttons.

### Admin Moderation Interface
- High-density, professional management tables with zero unnecessary animation.
- Review queues divided into:
  - **Pending Properties Queue:** Side-by-side view of property attributes, uploaded photos, and location pin.
  - **Document Verification Queue:** Secure PDF/image preview viewer with `Verify`, `Request More Information`, or `Reject` actions.
  - **Report & Trust Queue:** Inbound community reports categorized by reason (Broker, Scam, Duplicate) with investigation notes and moderation audit logs.

---

## 12. Component Library Specifications

### 1. Button System
- `variant="primary"`: Deep Teal background (`#0F4C4A`), white text, subtle hover darkening (`#0A3735`), focus ring.
- `variant="secondary"`: Warm Ivory background (`#F3F8F7`), teal text, subtle border (`#DDD8CE`).
- `variant="outline"`: Transparent background, 1.5px solid border (`#DDD8CE`), text dark slate, hover background `#FBF9F5`.
- `variant="whatsapp"`: WhatsApp Green (`#25D366`), white text, bold, mobile-optimized.
- `variant="ghost"`: Completely flat, text dark slate, subtle hover background.
- `variant="danger"`: Muted crimson (`#DC2626`), white text.

### 2. Badge & Status System
- `Verified Owner`: Deep Teal pill (`bg-teal-50 text-teal-800 border border-teal-200`)
- `Property Verified`: Forest green pill (`bg-emerald-50 text-emerald-800 border border-emerald-200`)
- `Under Review`: Amber pill (`bg-amber-50 text-amber-800 border border-amber-200`)
- `Rejected / Suspended`: Muted crimson pill (`bg-rose-50 text-rose-800 border border-rose-200`)
- `Zero Brokerage`: Subtle warm gold chip (`bg-amber-100/60 text-amber-900 border border-amber-200/80`)

### 3. Form Inputs & Selects
- 44px standard touch target height.
- Warm border (`#DDD8CE`), resting background `#FFFFFF`.
- Active focus state: Deep Teal border (`#0F4C4A`) with subtle 3px ring (`rgba(15, 76, 74, 0.12)`).
- Error state: Crimson border (`#DC2626`) with accompanying error text beneath.

---

## 13. Responsive Breakpoints & Accessibility (WCAG AA)

### Breakpoints
- `xs`: `360px` — Compact mobile phones
- `sm`: `640px` — Large phones / phablets
- `md`: `768px` — Tablets / vertical iPad
- `lg`: `1024px` — Small laptops / desktop
- `xl`: `1280px` — Standard desktop displays
- `2xl`: `1536px` — Ultra-wide displays

### Accessibility Compliance
- **Color Contrast:** All body text meets a minimum contrast ratio of `4.5:1` against its background; large headings meet `3:1`.
- **Keyboard Navigation:** All interactive elements (buttons, inputs, links, modal triggers) exhibit visible focus indicators (`ring-2 ring-primary ring-offset-2`).
- **Semantic HTML:** Correct usage of `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, and `<footer>` elements.
- **Form Association:** Every input possesses an explicit `<label>` or `aria-label`.
- **Image Alt Texts:** Every property image provides meaningful alt text derived from property attributes (e.g., *"Living room of 2 BHK apartment in Madhapur"*).

---

## 14. Animation & Micro-Interactions

Animations in RentalCircle are swift, natural, and purpose-driven:
- **Duration Scale:** Micro-interactions (150ms), dropdown/modal reveals (200ms-250ms), page transitions (300ms).
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (snappy ease-out curve).
- **Hover Transitions:** Smooth color and transform transitions (`transition-all duration-200 ease-out`).
- **Strict Prohibition:** No infinite floating animations, no disruptive parallax scroll effects, and no slow loading splash screens.
