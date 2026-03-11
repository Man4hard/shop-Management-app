# Shop Management App

## Overview
A mobile-first Progressive Web App for complete shop management including POS (Point of Sale), inventory management, billing, customer tracking, and business reporting.

## Architecture
- **Frontend**: React + TypeScript + TailwindCSS + shadcn/ui (mobile-first design)
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Build**: Vite

## Features
1. **Dashboard** - Today's sales, profit, orders, total profit, low stock alerts
2. **Product Management** - CRUD products with barcode support, stock tracking, low stock alerts
3. **POS (Home)** - Full-screen screensaver with shop branding/live clock when idle, auto-transitions to POS on scan/search, grocery-style auto-add, big +/- buttons, sticky pay bar, separate checkout screen
4. **Customer Management** - Customer records with balance tracking (receivable/payable)
5. **Reports** - Daily/Weekly/Monthly sales & profit charts, CSV export
6. **Settings** - Business info, language (EN/Urdu), currency (PKR/USD/INR), dark theme

## Data Models
- `businesses` - Business settings and configuration
- `categories` - Product categories
- `products` - Products with barcode, pricing, stock levels
- `customers` - Customer records with balance
- `bills` - Sales transactions
- `bill_items` - Line items for each bill

## Key Files
- `shared/schema.ts` - Database schema and types
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - Database operations (IStorage interface)
- `server/seed.ts` - Database seeding with sample data
- `client/src/App.tsx` - Main app with bottom navigation
- `client/src/pages/` - All page components (dashboard, products, billing, customers, reports, settings)

## API Endpoints
- `GET/PATCH /api/business` - Business settings
- `GET/POST/DELETE /api/categories` - Categories
- `GET/POST/PATCH/DELETE /api/products` - Products
- `GET /api/products/barcode/:barcode` - Lookup by barcode
- `GET/POST/PATCH/DELETE /api/customers` - Customers
- `GET/POST /api/bills` - Bills/invoices
- `GET /api/reports?period=daily|weekly|monthly` - Sales reports
- `GET /api/dashboard` - Dashboard statistics

## Routing
- `/` - POS home (full-screen screensaver when idle, POS when active)
- `/products` - Product management
- `/dashboard` - Dashboard (seller stats)
- `/customers` - Customer management
- `/reports` - Sales reports
- `/settings` - Business settings

## Offline-First Architecture
- **Service Worker** (`client/public/sw.js`) - Network-first for API, cache-first for static assets
- **IndexedDB** (`client/src/lib/offlineDb.ts`) - Local stores: products, customers, pendingBills, cachedData
- **Sync Service** (`client/src/lib/syncService.ts`) - Singleton auto-sync every 30s + on-reconnect; queues bills offline
- **Offline Context** (`client/src/hooks/use-offline.ts`) - Single `OfflineContext` provider at app root manages online status + pending count; all components use `useOfflineContext()` instead of independent hooks to avoid duplicate event listeners
- **Offline Hooks** - `useOfflineProducts`, `useOfflineCustomers`, `useOfflineDashboard` consume the shared context
- **Offline Indicator** (`client/src/components/offline-indicator.tsx`) - Banner + badge shown when offline or syncing
- **Resilient Checkout** - If API bill creation fails (network error, server down), bill is auto-saved to IndexedDB and synced later
- **PWA Manifest** (`client/public/manifest.json`) - Installable on Android with standalone display

## Camera Barcode Scanner
- **Component**: `client/src/components/camera-scanner.tsx` — uses `html5-qrcode` for mobile camera barcode scanning
- **Usage**: Camera button appears on both screensaver and active POS search bar; tapping opens full-screen camera scanner
- **Both methods work**: Mobile camera scanner AND external USB/Bluetooth barcode scanner work simultaneously
- **Features**: Front/back camera switch, duplicate scan prevention (3s cooldown), auto-close on scan, Urdu/English translations
- **Lazy loaded**: Camera component only loads when the camera button is tapped

## Performance Optimizations
- **Memoization** - Billing page uses `useMemo` for filtered products, cart totals, and customer options to avoid unnecessary recalculations
- **Lazy Loading** - Non-POS pages (Dashboard, Products, Customers, Reports, Settings) are `React.lazy()` loaded with `Suspense` fallback
- **SQL Aggregates** - Dashboard and Reports use `SUM()`/`COUNT()`/`GROUP BY` instead of fetching all bills into memory
- **Database Indexes** - Indexes on `products.barcode`, `products.categoryId`, `bills.createdAt`, `bills.customerId`, `billItems.billId`
- **Batch Operations** - `createBill` batches stock check (single `WHERE IN` query) and bill item insert instead of N individual queries
- **Consolidated Context** - Single `OfflineContext` provider eliminates 4+ duplicate event listeners per page

## Internationalization (i18n)
- **Translations** (`client/src/lib/i18n.ts`) - Complete English/Urdu dictionary covering all pages
- **Language Context** (`client/src/lib/language-context.tsx`) - `LanguageProvider` wraps app, provides `useLanguage()` hook with `t(section, key)` function
- **RTL Support** - Automatic `dir="rtl"` on document when Urdu selected; uses logical CSS properties (`start/end`, `ps/pe/ms/me` instead of `left/right`, `pl/pr/ml/mr`)
- **Persistence** - Language saved in localStorage + synced with business settings from database
- **Coverage** - All pages (billing, dashboard, products, customers, reports, settings), offline indicator, barcode printer

## GitHub Integration
Connected to: https://github.com/Man4hard/shop-Management-app.git
Uses @replit/connectors-sdk for GitHub API access.
