# HydroVacFinder Design Guidelines

## Design Approach: Hybrid System + Reference

**Primary Foundation**: Material Design principles for clarity and information density
**Reference Inspiration**: Google Maps (map interface), Yelp (business listings), Angi (service verification), LinkedIn (professional trust indicators)

**Key Design Principles**:
- Professional industrial aesthetic that builds trust
- Map-first discovery experience
- Clear information hierarchy for service comparison
- Prominent verification/subscription tier indicators

---

## Typography

**Font Families** (via Google Fonts CDN):
- Primary: Inter (400, 500, 600, 700) - clean, professional, excellent readability
- Accent: Outfit (600, 700) - for headings and emphasis

**Typography Scale**:
- Hero Headlines: text-5xl md:text-6xl font-bold (Outfit)
- Section Headers: text-3xl md:text-4xl font-semibold (Outfit)
- Card Titles: text-xl font-semibold (Inter)
- Body Text: text-base leading-relaxed (Inter)
- Metadata/Labels: text-sm font-medium (Inter)
- Micro-text: text-xs (Inter)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16, 20** (e.g., p-4, m-8, gap-6)

**Container Strategy**:
- Full-width map sections: w-full
- Content containers: max-w-7xl mx-auto px-4
- Listing grids: max-w-6xl mx-auto
- Form containers: max-w-2xl

**Grid Systems**:
- Business listings: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Featured companies: grid-cols-1 lg:grid-cols-2 gap-8
- Pricing tiers: grid-cols-1 md:grid-cols-3 gap-8

---

## Core Components

### Navigation Header
- Fixed position with backdrop blur
- Logo left, primary navigation center, CTA right
- Mobile: Hamburger menu with slide-out drawer
- Include: Home, Find Services, List Your Business, Pricing, Login/Signup
- Height: h-16 md:h-20
- Padding: px-4 md:px-8

### Hero Section (Landing Page)
**Large Hero Image**: Yes - Industrial machinery/hydro-vac truck in action, professional photography
- Height: h-[600px] md:h-[700px]
- Overlay gradient for text legibility
- Centered content with max-w-4xl
- Primary headline + subheadline + search bar + CTA
- Search bar: Location input + "Find Services" button (blurred background: backdrop-blur-md bg-white/90)

### Interactive Map Component
- Full-width section: min-h-[500px] md:min-h-[600px]
- Sidebar panel (desktop): w-96 with scrollable listing results
- Mobile: Map full-screen with bottom sheet for listings
- Map markers: Color-coded by subscription tier (Free/Verified/Featured)
- Cluster markers for multiple companies in proximity

### Business Listing Cards
**Card Structure**:
- Rounded corners: rounded-xl
- Shadow: shadow-md hover:shadow-lg transition
- Padding: p-6
- Border for tier indication: border-2 (thickness varies by tier)

**Card Content**:
- Company logo/image (top): aspect-video or aspect-square
- Verification badge (overlay on image): Verified checkmark or Featured star icon
- Company name: text-xl font-semibold
- Services offered: Bulleted list with icons, text-sm
- Location/Coverage area: With map pin icon
- Rating stars + review count
- Contact buttons: Call, Email, Get Quote
- "View Profile" link

**Tier Visual Differentiation**:
- Free: Standard card, subtle border
- Verified: Prominent badge, medium border weight
- Featured: Gold/premium badge, thicker border, slight background treatment, larger card size

### Company Profile Page
**Layout**:
- Hero banner: Company photo/equipment, h-64 md:h-96
- Two-column: Left (company info), Right (contact form/sticky CTA)
- Tabbed sections: About, Services, Coverage Area, Reviews, Gallery

**Key Elements**:
- Verification badge prominent in header
- Service list with icons: grid-cols-2 gap-4
- Coverage area map: Interactive region display
- Review cards: Star rating, date, text, reviewer name
- Gallery: Masonry grid of equipment/work photos
- Contact form: Sticky on desktop, inline on mobile

### Search & Filter Bar
- Sticky below header: sticky top-16 z-40
- Inputs: Location (with autocomplete), Service Type (dropdown), Distance (slider)
- Quick filters: Chips for "Open Now", "Verified Only", "Featured"
- Results count display
- Sort options: Distance, Rating, Newest

### Subscription Pricing Section
**Layout**: 3-column comparison table on desktop, stacked on mobile

**Tier Cards**:
- Free Listing: Basic info, standard visibility
- Verified Listing: Badge, enhanced placement, contact form submissions
- Featured Listing: Top placement, premium badge, analytics dashboard, priority support

**Each Card Includes**:
- Tier name: text-2xl font-bold
- Price: Large, prominent (text-4xl)
- Feature list: Checkmarks with feature names
- CTA button: Different styles per tier (outline for Free, solid for paid)
- "Most Popular" ribbon on Verified tier

### Footer
**Multi-column Layout** (desktop 4-col, mobile stacked):
- Column 1: Logo + mission statement
- Column 2: Quick Links (Find Services, Pricing, About, Contact)
- Column 3: For Businesses (List Your Company, Login, Resources)
- Column 4: Newsletter signup + social links
- Bottom bar: Copyright, Terms, Privacy, Safety Guidelines
- Trust indicators: "Serving contractors since [year]", "X+ verified companies"

### Forms (Contact, Quote Request, Signup)
**Styling**:
- Input fields: rounded-lg border-2 px-4 py-3 text-base
- Labels: text-sm font-medium mb-2
- Focus states: Clear ring outline
- Error states: Red border + error message below
- Success states: Green checkmark indicator
- Submit buttons: Full-width on mobile, auto on desktop

### Dashboard (Business Owners)
**Sidebar Navigation**:
- Fixed left sidebar: w-64
- Menu items with icons
- Sections: Dashboard, Profile, Subscription, Analytics, Reviews

**Main Content Area**:
- Stats cards: grid-cols-1 md:grid-cols-4 gap-6
- Charts: Profile views, quote requests, search appearances
- Recent activity feed
- Quick actions: Edit profile, Respond to reviews

---

## Animation Guidelines
**Use sparingly**:
- Card hover: Slight lift (translate-y) + shadow increase
- Button interactions: Subtle scale on press
- Map marker: Gentle bounce on selection
- Page transitions: Simple fade-in for content
- No parallax, no scroll-triggered animations

---

## Icons
**Library**: Heroicons (via CDN)
- Navigation: outline icons, stroke-2
- Features/services: solid icons for visual weight
- Buttons: Leading icons, size-5
- Badges: size-4 within text

---

## Images

### Required Images:
1. **Hero Section**: Professional hydro-vac truck in operation, industrial setting, high-quality photography (1920x1080)
2. **Company Listing Cards**: Company equipment photos, logos (400x300 or square 400x400)
3. **Profile Headers**: Full-width company/equipment banners (1200x400)
4. **Service Icons**: Placeholder for custom service type illustrations
5. **Trust Indicators**: Certification badges, industry affiliations

### Image Treatment:
- All images: rounded-lg
- Card images: object-cover with fixed aspect ratios
- Hero: Gradient overlay (dark to transparent) for text contrast

---

## Accessibility
- WCAG 2.1 AA compliance
- All interactive elements: min-height h-12 for touch targets
- Form inputs: Clear labels, proper ARIA attributes
- Map: Keyboard navigation support, screen reader descriptions
- Color contrast: Maintained across all tier indicators

---

This design creates a professional, trustworthy platform that prioritizes findability and clear service comparison while maintaining the industrial credibility expected in the hydro-vac industry.