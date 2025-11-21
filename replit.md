# HydroVacFinder

## Overview

HydroVacFinder is a nationwide directory platform designed to connect contractors with hydro-vac companies and disposal sites. Its primary purpose is to provide a map-first discovery experience, enabling users to efficiently search for and locate verified service providers based on location. The platform allows users to view detailed company profiles and contact businesses directly. Companies can enhance their visibility and access additional features by subscribing to various listing tiers (Verified, Featured, Premium). The project aims to establish a trusted marketplace, drawing inspiration from the intuitive map interface of Google Maps, the comprehensive business listings of Yelp, and the verification mechanisms of Angi.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript, using Vite for fast development and building. Wouter handles client-side routing, offering pages for home, advertising, contact, success, and state/disposal site landing pages. State management relies on TanStack Query for server state and data fetching, complemented by React hooks for local component state. UI components leverage `shadcn/ui` with Radix UI primitives, styled using Tailwind CSS, adhering to a New York variant design with Material Design principles for information density. The styling system includes a custom color system for light/dark modes, Inter and Outfit typography from Google Fonts, and a responsive grid. Map integration is achieved with Leaflet.js and OpenStreetMap tiles, featuring custom markers and location-based search capabilities.

### Backend Architecture

The backend is developed with Express.js and TypeScript, providing RESTful APIs for managing companies, disposal sites, partners, pricing tiers, state landing pages, and analytics. It also includes endpoints for Stripe checkout, contact form submissions, geocoding (proxying Google Geocoding API), and Google Places API integration for admin imports. The server structure organizes main application setup, route definitions, a database abstraction layer, and database connection configurations. Development features include Hot Module Replacement (HMR), logging middleware, and error overlays.

### Data Storage

The application uses PostgreSQL as its database via Neon serverless, managed with Drizzle ORM for a schema-first approach. The schema includes tables for `companies`, `disposalSites`, `partners`, `pricingTiers`, `stateLandingPages`, `disposalSiteLandingPages`, `companyAnalytics`, `sessions`, and `users`. Data types are chosen for precision (geolocation), flexibility (JSONB for sessions), and auditing (timestamps). Drizzle Kit is used for schema migrations.

### Authentication & Authorization

Session management uses PostgreSQL-backed sessions with `connect-pg-simple`. The `users` table stores user accounts with UUID primary keys, email-based identification, and profile metadata.

### System Features

**Analytics & Engagement Tracking**: Tracks user interactions (phone, email, website clicks) with company listings to provide engagement metrics. Events are stored in a `companyAnalytics` table, with frontend tracking using `navigator.sendBeacon`. An admin dashboard displays aggregated and ranked engagement data.

**Multiple Office Locations**: Allows companies and disposal sites to list additional office locations within the same state. This is managed via a JSONB field (`additionalLocations`) on relevant tables. Locations are geocoded if a Google API key is available and displayed in company cards and on the map.

**Subscription & Payment System (PRODUCTION READY)**: Complete Stripe integration for tiered subscriptions with multi-state coverage pricing:
- **Automated Tiers**: Verified, Featured, and Premium tiers are fully automated through Stripe Checkout with webhook-driven tier assignment
- **Multi-State Pricing**: Database-driven pricing from `tier_coverage_pricing` table supports 5 coverage levels (single state, 2-4 states, 5-10 states, 11-25 states, nationwide)
- **Email-Based Assignment**: When companies/disposal sites are created, their subscription tier is automatically assigned based on matching active subscriptions by email
- **Webhook Security**: All payment events verified using Stripe signature verification with rawBody handling, idempotent subscription creation prevents duplicates
- **State Landing Pages**: Premium products (state landing, disposal site landing) route customers to contact/sales workflow for custom setup consultation
- **Subscription Tracking**: All subscriptions stored in `subscriptions` table with email, tier, coverage, Stripe IDs, and lifecycle status
- **Backend Safeguards**: Checkout endpoint explicitly rejects state landing tier requests to prevent unfulfilled payments

**Progressive Web App (PWA)**: Full PWA implementation enables installation as a mobile app without app stores:
- **Installable**: Users can add HydroVacFinder to their phone home screen with the company logo as the app icon
- **Offline Support**: Service worker caches critical assets for offline functionality
- **App-Like Experience**: Runs in standalone mode without browser chrome when installed
- **Auto-Updates**: Content updates (new companies/deletions) appear instantly without app store approval
- **Zero App Store Fees**: No 30% fees for subscriptions since payments only occur on the website
- **Cross-Platform**: Works on both iOS and Android from a single codebase
- **Strategy**: Mobile app is read-only (search, view, contact), all paid signups/subscriptions happen exclusively on the website to avoid app store payment requirements

**Admin Dashboard**: Secure management interface for platform operations:
- **Session-Based Authentication**: Secure login system using `ADMIN_API_KEY` as password with HTTP-only session cookies to protect admin analytics and forms from public view
- **Authentication Gate**: Admin page shows login screen first; only authenticated sessions can view dashboard
- **Listing Management**: View, edit, and delete companies and disposal sites with inline forms
- **Cascading Deletes**: Automatic cleanup of related data (analytics, landing pages, subscription links) when deleting entities
- **Analytics Dashboard**: Real-time engagement metrics showing phone/email/website clicks per company (private, login required)
- **Import Data Feature**: Bulk import companies or disposal sites from Google Places API with state selector, type chooser, and customizable search queries. Imports up to 20 results per search with automatic duplicate detection, showing detailed results (imported/skipped/failed) with color-coded badges. Confirmation dialog prevents accidental imports. Requires GOOGLE_API_KEY environment variable.
- **State Landing Page Editor**: Upload custom hero images for state landing pages with image preview, validation (5MB limit), and admin authentication
- **Confirmation Dialogs**: Safety guards for destructive operations with clear warnings
- **Responsive UI**: Full admin capabilities accessible from any device with 6 tabs (Analytics, Manage, State Pages, Import Data, Add Company, Add Disposal)
- **API Endpoints**: POST /api/admin/login, GET /api/admin/check, POST /api/admin/logout for session management, POST /api/import/search-google for bulk imports, POST /api/upload-image for image uploads

## External Dependencies

**Payment Processing**: Stripe (v2024-06-20 API) is used for handling subscriptions, including Checkout Sessions, Price IDs for tier management, and webhooks for payment confirmation. Client-side integration uses `@stripe/stripe-js` and `@stripe/react-stripe-js`.

**Email Services**: Nodemailer facilitates transactional emails for contact form submissions and account notifications, configured with Gmail SMTP.

**Mapping Services**: Leaflet.js provides interactive maps, utilizing OpenStreetMap for map tiles.

**UI Libraries**: Radix UI offers accessible component primitives, Lucide React provides icons, and `class-variance-authority` along with `tailwind-merge` and `clsx` manage component styling and conditional classes.

**Development Tools**: TypeScript for type safety, ESBuild for production bundling, and `tsx` for development.

**Font Delivery**: Google Fonts CDN delivers Inter and Outfit typefaces.