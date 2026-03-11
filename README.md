Programming Language:

TypeScript (a version of JavaScript with type safety) — used for both frontend and backend
Frontend (what the user sees):

React — the UI framework for building the screens and components
Vite — the build tool that bundles and serves the frontend
Tailwind CSS — for styling and layout
Shadcn/UI — pre-built UI components (buttons, cards, forms, dialogs, etc.)
TanStack React Query — for fetching data from the server
Wouter — for page navigation (POS, Products, Customers, etc.)
html5-qrcode — for the camera barcode scanner
JsBarcode — for generating barcode images for printing
Backend (server side):

Node.js — the runtime that runs your server
Express — the web server framework that handles API requests
Drizzle ORM — for talking to the database
PostgreSQL — the database where all products, customers, bills, etc. are stored
Zod — for validating data
Key files to know if you want to make changes:

What you want to change	File to edit
Database tables/columns	shared/schema.ts
API routes (server logic)	server/routes.ts
Database queries	server/storage.ts
POS / Billing screen	client/src/pages/billing.tsx
Products page	client/src/pages/products.tsx
Customers page	client/src/pages/customers.tsx
Dashboard	client/src/pages/dashboard.tsx
Reports	client/src/pages/reports.tsx
Settings	client/src/pages/settings.tsx
Navigation bar	client/src/App.tsx
Urdu/English translations	client/src/lib/i18n.ts
Colors and fonts	client/src/index.css
Offline sync logic	client/src/lib/syncService.ts
To run the app locally on your computer, you would need:

Install Node.js (version 18 or higher)
Install PostgreSQL database
Run npm install to get all packages
Set up a DATABASE_URL environment variable pointing to your PostgreSQL
Run npm run db:push to create the database tables
Run npm run dev to start the app
