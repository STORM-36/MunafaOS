# MunafaOS — Full Project Proposal
## Intelligent Decision Support System for F-Commerce in Bangladesh

| Field | Details |
|-------|---------|
| **Project Name** | MunafaOS (Profit Optimizer) |
| **Project Type** | Final Year Thesis — B2B SaaS Platform |
| **Institution** | Daffodil International University (DIU) |
| **Version** | 3.0 (Updated — Phase 3.2) |
| **Live URL** | https://profit-optimizer-v1.web.app |
| **Repository** | https://github.com/STORM-36/MunafaOS |
| **Updated** | April 2026 |

---

## 1. Executive Summary

MunafaOS is a production-deployed, AI-assisted business operations platform built exclusively for Bangladeshi F-commerce (Facebook Commerce) sellers. The system addresses three critical operational failures common to small and micro online businesses in Bangladesh: unstructured customer and supplier message handling, inaccurate profit calculation, and weak inventory visibility.

The platform is built on React 19, Vite 7, Firebase (Firestore, Auth, Hosting), Google Gemini AI, and Tailwind CSS. It is fully deployed, live, and actively functional as of April 2026. MunafaOS is not a prototype — it is a working SaaS product with real authentication, real-time data, role-based access control, and a complete audit trail.

---

## 2. Background and Problem Statement

### 2.1 Industry Context

Bangladesh has over 5 million active F-commerce sellers operating through Facebook Pages, Messenger, WhatsApp, and phone calls. The overwhelming majority of these businesses have no structured ERP or inventory system. Orders are received as informal text messages. Stock records are kept in notebooks or memory. Profit is calculated manually and often incorrectly.

### 2.2 Core Problems Solved

**Problem 1 — Manual Order Entry Overload**
Sellers receive customer orders as free-form text messages in Bengali, English, or Banglish (Bengali written using English letters). Copying this information manually into records wastes significant time and introduces errors.

**MunafaOS Solution:** A Smart Text Parser that reads any customer message format and automatically extracts customer name, phone number, delivery address, and delivery zone (Dhaka vs outside Dhaka) with zero manual effort.

**Problem 2 — True Profit Blindness**
Most sellers calculate profit as selling price minus product cost only. They ignore delivery charges, ad spend, packaging costs, and per-unit discounts. This gives a falsely optimistic profit picture.

**MunafaOS Solution:** A True Profit Engine that calculates:
```
Gross Revenue = (Unit Selling Price × Qty) − Total Discount
True Net Profit = Gross Revenue − (Product Cost + Packaging + Ad Spend + Delivery)
```
Every order shows a Profit Autopsy modal with complete cost breakdown.

**Problem 3 — Inventory Inaccuracy**
Sellers cannot track real-time stock levels. Overselling is common. Supplier messages containing multiple products are entered manually one by one.

**MunafaOS Solution:** A three-mode AI inventory intake system (text, bulk supplier message, image OCR) with real-time stock deduction on every order save.

**Problem 4 — No Team Accountability**
Growing F-commerce businesses add operators but have no way to track who did what. Access control is nonexistent.

**MunafaOS Solution:** Full Role-Based Access Control (Owner/Operator) with workspace isolation, team management, and an immutable audit log tracking every user action.

**Problem 5 — Banglish Input Chaos**
Customer messages mix Bangla script, Romanized Bengali, and English unpredictably.

**MunafaOS Solution:** A regex-based parser with label detection for both Bangla (নাম, ঠিকানা) and English (Name, Address) that works instantly without any API calls.

---

## 3. Project Goals and Objectives

### 3.1 Primary Goal
To develop, deploy, and validate a practical AI-assisted decision support system that measurably improves order processing speed, inventory accuracy, and profit visibility for Bangladeshi F-commerce sellers.

### 3.2 Specific Objectives

| # | Objective | Status |
|---|-----------|--------|
| 1 | Build smart order form with text parsing | ✅ Complete |
| 2 | Auto-detect delivery zone from address | ✅ Complete |
| 3 | Provide AI-assisted inventory intake (text, bulk, image) | ✅ Complete |
| 4 | Implement true net profit analytics per order | ✅ Complete |
| 5 | Secure per-user data isolation (workspace model) | ✅ Complete |
| 6 | Role-based access with team management | ✅ Complete |
| 7 | Real-time inventory deduction on order save | ✅ Complete |
| 8 | Audit trail for all user actions | ✅ Complete |
| 9 | Order management with search, filter, stats | ✅ Complete |
| 10 | Excel export for order reports | ✅ Complete |
| 11 | PDF receipt generation | ✅ Complete |
| 12 | Real-time dashboard with KPIs and charts | ✅ Complete |

---

## 4. Scope of Work

### 4.1 In Scope (Completed)
- Google and Email authentication
- Workspace-scoped multi-user system
- Smart order form with Banglish parser
- True profit calculation engine
- Inventory CRUD with AI-assisted input
- Bulk supplier message parsing
- Image OCR product extraction
- Real-time order list with filters
- Custom date range analytics
- Dashboard with revenue charts
- Team management and RBAC
- Audit logging system
- Excel and PDF export
- Firebase Hosting deployment
- CI/CD pipeline

### 4.2 Planned Scope (Phase 4-6)
- Smart stock alert system
- AI Business Assistant (Gemini chat)
- Supplier management module
- Customer CRM
- Return and refund management
- Employee performance tracking
- Delivery partner API integration
- PWA installable app
- Full Bangla UI localization
- bKash/Nagad payment tracking
- Multi-workspace enterprise tier
- Predictive restock AI
- Barcode/QR scanner
- Multi-AI routing engine

### 4.3 Out of Scope (Current Version)
- Native mobile application (Android/iOS)
- Payment gateway processing
- Courier API auto-booking
- Full accounting ledger and tax module
- Multi-language interface (current phase)

---

## 5. Technical Architecture

### 5.1 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend Framework | React | 19.2 |
| Build Tool | Vite | 7.3 |
| CSS Framework | Tailwind CSS | 3.4 |
| Database | Cloud Firestore | Firebase 12.7 |
| Authentication | Firebase Auth | Firebase 12.7 |
| Hosting | Firebase Hosting | Firebase 12.7 |
| AI Service | Google Gemini | 1.5 Flash |
| AI SDK | @google/generative-ai | 0.24 |
| Charts | Recharts | 3.7 |
| PDF Generation | jsPDF | 4.2 |
| HTML to Canvas | html2canvas | 1.4 |
| Excel Export | SheetJS (xlsx) | 0.18 |
| Routing | React Router DOM | 7.12 |
| Icons | Lucide React | 0.575 |
| QR Code | qrcode.react | 4.2 |

### 5.2 System Architecture

```
┌─────────────────────────────────┐
│         User Browser            │
│   React 19 + Vite 7 SPA         │
└──────────────┬──────────────────┘
               │
       ┌───────┼───────┐
       │               │
       ▼               ▼
┌──────────┐    ┌─────────────┐
│ Firebase │    │  Gemini AI  │
│   Auth   │    │    API      │
└──────────┘    └──────┬──────┘
                       │
              ┌────────┴────────┐
              │  Parsing Tasks  │
              ├─────────────────┤
              │ • Text → Order  │
              │ • Text → Stock  │
              │ • Image → Stock │
              └─────────────────┘
       │
       ▼
┌─────────────────────┐
│   Cloud Firestore   │
├─────────────────────┤
│ • orders/           │
│ • inventory/        │
│ • users/            │
│ • audit_logs/       │
└─────────────────────┘
```

### 5.3 Workspace Data Isolation Model

Every document written to Firestore includes a `workspaceId` field. All queries filter by `workspaceId`. This ensures complete data separation between different business accounts sharing the same Firebase project. Firestore Security Rules enforce this at the database level — no client-side code can bypass this restriction.

### 5.4 AI Model Selection Strategy

The system uses a dynamic model discovery approach instead of hardcoded model names:

```javascript
let selectedModel = MODEL_PRIMARY;
try {
  const models = await listAvailableModels();
  const discovered = pickModelName(models);
  if (discovered) selectedModel = discovered;
} catch (e) { /* fallback to default */ }
```

This makes the AI layer resilient to Google's model deprecations and API version changes.

---

## 6. Firestore Data Schema

### 6.1 orders Collection

| Field | Type | Description |
|-------|------|-------------|
| workspaceId | string | Business workspace identifier |
| userId | string | Auth UID of creator |
| name | string | Customer name |
| phone | string | Customer phone |
| address | string | Delivery address |
| qty | number | Order quantity |
| unitSellingPrice | number | Per unit price |
| unitCost | number | Per unit product cost |
| unitPackaging | number | Per unit packaging cost |
| unitDiscount | number | Per unit discount |
| totalRevenue | number | Gross revenue after discount |
| trueNetProfit | number | Real net profit |
| deliveryCost | number | Flat delivery charge |
| adCost | number | Flat ad spend |
| status | string | Pending/Delivered/Returned |
| inventoryId | string | Linked inventory document |
| timestamp | timestamp | Order creation time |

### 6.2 inventory Collection

| Field | Type | Description |
|-------|------|-------------|
| workspaceId | string | Business workspace identifier |
| userId | string | Auth UID of creator |
| name | string | Product name |
| buyingPrice | number | Cost per unit |
| sellingPrice | number | Selling price per unit |
| quantity | number | Current stock level |
| packaging | number | Packaging cost per unit |
| discount | number | Standard discount per unit |
| category | string | Product category |
| supplier | string | Supplier name |
| importMethod | string | MANUAL/AI_TEXT/AI_BULK/AI_IMAGE |
| timestamp | timestamp | Creation time |
| updatedAt | timestamp | Last stock update time |

### 6.3 users Collection

| Field | Type | Description |
|-------|------|-------------|
| workspaceId | string | Workspace this user belongs to |
| role | string | owner/operator/revoked |
| status | string | Online/Offline/disabled |
| email | string | User email address |
| firstName | string | User first name |
| lastLogin | timestamp | Last login time |
| lastLogout | timestamp | Last logout time |

### 6.4 audit_logs Collection

| Field | Type | Description |
|-------|------|-------------|
| workspaceId | string | Workspace identifier |
| userId | string | User who performed action |
| action | string | Action code (CREATED_ORDER etc.) |
| details | string | Human-readable description |
| timestamp | timestamp | When action occurred |

---

## 7. Security Architecture

### 7.1 Firestore Security Rules
- All reads/writes require authentication
- All document access requires workspace membership verification
- Owners can read, write, delete in their workspace
- Operators can read and create but cannot delete
- Audit logs are immutable (update: false)
- Catch-all deny rule blocks all unhandled paths

### 7.2 Input Sanitization
All user text inputs are sanitized before Firestore writes:
- HTML/script tag removal
- JavaScript protocol stripping
- Event handler removal
- Length capping at 500 characters

### 7.3 Workspace Isolation
The triple-layer workspace enforcement:
1. Firestore Security Rules (server-side)
2. Query filters (client-side)
3. effectiveWorkspaceId pattern (code-level)

### 7.4 Role Enforcement
- Route-level protection via ProtectedRoute component
- UI-level hiding of owner-only controls
- Database-level rule enforcement
- Revoked users are signed out instantly on next auth state change

---

## 8. Features Built — Complete List

### 8.1 Authentication Module
- Google SSO via Firebase Auth
- Email + Password registration
- Email verification flow
- Password reset via email
- Secondary Firebase app for operator creation
- Session persistence

### 8.2 Order Management Module
- Smart text paste with Banglish parser
- Auto-fill: name, phone, address, delivery cost
- Product selection from live inventory
- Quantity × unit economics calculation
- Real-time stock availability check
- Negative stock prevention
- Order save with atomic stock deduction
- Status management (Pending/Delivered/Returned)
- Profit Autopsy modal (cost breakdown)
- Search by name, phone, product
- Filter by status and date range
- Custom date range picker
- All-time stats vs period stats
- Pagination (20 per page, Load More)
- Excel export with security warning
- PDF receipt generation
- Real-time count and stats refresh

### 8.3 Inventory Management Module
- Manual add form with validation
- AI text parser (single product)
- AI bulk parser (multi-product)
- Image OCR via Gemini Vision
- Add Stock modal (atomic increment)
- Remove Stock modal (with reason)
- View Details slide-in panel
- Edit Item (dual-mode form)
- Incomplete data badge (⚠️)
- Out of stock badge and row styling
- Required field highlights (yellow/blue)
- Post-save redirect flow
- Search by name and SKU
- Filter by category
- Pagination (50 per page, Load More)
- Real-time onSnapshot listener
- Firestore count aggregation

### 8.4 Dashboard Module
- Total Revenue KPI
- Net Profit KPI
- Total Orders KPI
- Pending Delivery KPI
- 7-day revenue area chart
- 30-day revenue area chart
- Top 3 categories breakdown
- Profit margin percentage
- Average daily revenue

### 8.5 Team Management Module
- Employee list with real-time status
- Add operator (via secondary auth app)
- Revoke access (soft-disable)
- Per-employee audit log viewer
- Owner-only route protection

### 8.6 Audit System
- Logs: login, logout, order create/delete
- Logs: inventory add/edit/delete/restock
- Logs: team create/revoke
- Logs: profile update
- Immutable (no update allowed)
- Workspace-scoped
- Owner-only read access

### 8.7 Settings Module
- Profile view and edit
- Shop name management
- Password reset
- Account logout
- Danger zone (account termination)

---

## 9. AI Integration Architecture

### 9.1 Customer Text Parser (Regex-Based)
File: `src/utils/parser.js`

The production parser uses a regex engine with label detection — NOT Gemini. This decision was made after testing showed that Gemini introduced 2-3 second latency per keystroke and 503 errors under load, making it unsuitable for real-time form filling.

The regex parser:
- Runs in under 1 millisecond
- Works offline
- Has zero API cost
- Detects Bengali labels (নাম, ঠিকানা)
- Detects English labels (Name, Address)
- Falls back to line-position detection
- Converts Bengali digits to English

### 9.2 Product Inventory Parser (Gemini)
File: `src/services/aiService.js` → `parseProductWithAI()`

Used for single product extraction from supplier messages. Gemini 1.5 Flash is appropriate here because this is a deliberate user action (not real-time).

### 9.3 Bulk Product Parser (Gemini)
File: `src/services/aiService.js` → `parseMultipleProductsWithAI()`

Extracts 2-20 products from a single supplier message. Returns a JSON array. Uses the same dynamic model selection strategy.

### 9.4 Image OCR Parser (Gemini Vision)
File: `src/services/aiService.js` → `parseProductFromImage()`

Accepts product images (photos of packaging, labels, invoices). Gemini Vision extracts name, price, quantity, category, and supplier information from the image.

---

## 10. Development Methodology

### 10.1 Development Model
Iterative, feature-driven development organized into phases:
- Each phase targets specific functional domains
- Features are built one at a time
- Each feature is tested before the next begins
- CI/CD deploys to Firebase Hosting on each push

### 10.2 Three-Way Data Connection Rule
A strict architectural rule was established:

**Inventory → Orders → Dashboard**

Any change to field names, calculation logic, or data structure in one domain must be verified across all three before deployment. This rule prevented several data consistency bugs during development.

### 10.3 AI-Assisted Development
Development used a three-tier approach:
- Claude AI: Architecture decisions, prompt writing, debugging analysis
- GitHub Copilot: Code execution in VS Code
- Developer (Lead Architect): Review, testing, decision making

---

## 11. Testing and Validation

### 11.1 Functional Testing Completed
- Authentication flow (Google + Email)
- Smart parser with 10 Bangladeshi customer message formats
- Order save with stock deduction verification
- Inventory CRUD operations
- Bulk import parsing (2-20 products)
- OCR extraction from product photos
- Status filter bug fix (null status = Pending)
- Revenue field mismatch fix (Dashboard vs Orders)
- Real-time stats on new order save
- Custom date range filter accuracy
- Firestore index deployment

### 11.2 Performance Decisions
- Customer parser: Regex (not AI) for real-time performance
- Inventory list: Paginated (50/page) to handle large datasets
- Order list: Paginated (20/page) with Load More
- Firestore count: `getCountFromServer()` for accurate totals
- Dashboard: Single `getDocs()` query with client-side aggregation
- Recharts: Memoized chart data to prevent unnecessary recalculation

### 11.3 Known Issues and Deferred Items
| Issue | Status |
|-------|--------|
| Ghost orders missing timestamp field causing ~200-400 variance in profit totals | Deferred — cleanup script planned |
| html2canvas PDF quality inconsistency | Active — T4 target |
| Firebase CLI update pending (15.11 → 15.14) | Non-critical |

---

## 12. Current Implementation Status

### Phase Completion

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Foundation + Firebase setup | ✅ Complete |
| Phase 1 | Orders + Smart Parser + Profit Engine | ✅ Complete |
| Phase 2 | Dashboard + Charts + Export | ✅ Complete |
| Phase 3.1 | True P&L + RBAC + Audit system | ✅ Complete |
| Phase 3.2 T1 | Inventory Editor (Add/Remove/Edit) | ✅ Complete |
| Phase 3.2 T2 | Data Quality system | ✅ Complete |
| Phase 3.2 T3 | Brand CSS Paint Job | 🔴 In Progress |
| Phase 3.2 T4 | WhatsApp Invoice Engine | 🔴 In Progress |
| Phase 4 | Intelligence Engine | ⏳ Planned |
| Phase 5 | Scale and Operations | ⏳ Planned |
| Phase 6 | Enterprise Features | ⏳ Planned |

---

## 13. Future Enhancement Roadmap

### Phase 4 — Intelligence Engine
- Smart Stock Alert System with reorder level threshold
- Advanced Profit Analytics by SKU, margin trend, ad ROI
- AI Business Assistant — Gemini chat with Firestore context
- Supplier Management Module with bKash payment tracking
- PWA installation via vite-plugin-pwa

### Phase 5 — Scale and Operations
- Customer CRM with order history per customer
- In-app Notification Engine
- Return and Refund workflow
- Employee Performance and Commission tracking
- Delivery Partner API Integration (Pathao, Steadfast, Redex, Paperfly)

### Phase 6 — Enterprise and BD-First
- Multi-workspace management
- Granular RBAC (4+ roles)
- Full Bangla UI via i18next
- Daraz and Facebook Shop synchronization
- bKash and Nagad payment gateway tracking
- Predictive restock AI using order history
- Barcode and QR code scanner
- Multi-AI routing engine (Gemini + GPT-4o + Claude + DeepSeek)
- Compliance audit export

---

## 14. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini API model deprecation | AI features break | Dynamic model discovery + fallback chain |
| Firestore index missing | Query failures | Indexes pre-deployed, press N on delete prompt |
| Ghost orders without timestamp | Revenue variance | Cleanup script planned for restructure phase |
| html2canvas rendering issues | PDF quality | Alternative PDF approach under evaluation |
| API key exposure in bundle | Security breach | Domain restriction applied in Google AI Studio |
| Large dataset performance | Slow load | Firestore pagination + count aggregation |

---

## 15. Expected Outcomes

- A practical, production-deployed web application for F-commerce sellers
- Demonstrated Banglish-aware AI parsing for an underserved language context
- True profit visibility replacing manual and incorrect calculations
- A reusable Firebase + React SaaS architecture applicable to broader BD markets
- A technically defensible thesis demonstrating full-stack AI integration

---

## 16. Authors and Acknowledgements

| Role | Name |
|------|------|
| Lead Architect and Developer | Mong Shainu Marma |
| Co-Author, Design and Logistics | Munjur E Fatima Khan Monisha |

**Institution:** Daffodil International University (DIU)  
**Department:** Computer Science and Engineering  
**Year:** 2026  

---

## 17. Technical Evidence

The following files constitute the technical foundation of this project:

| File | Purpose |
|------|---------|
| `src/services/aiService.js` | Gemini AI integration (text, bulk, vision) |
| `src/utils/parser.js` | Banglish customer text parser |
| `src/components/SmartForm.jsx` | Order creation with real-time parsing |
| `src/components/OrderList.jsx` | Order management with full filter system |
| `src/components/InventoryList.jsx` | Inventory management with stock controls |
| `src/pages/AddInventory.jsx` | Dual-mode add/edit inventory form |
| `src/pages/Dashboard.jsx` | KPI dashboard with revenue charts |
| `src/context/AuthContext.jsx` | Workspace-aware auth provider |
| `src/utils/auditLogger.js` | Immutable audit trail system |
| `firestore.rules` | RBAC-aware security rules |
| `firestore.indexes.json` | Optimized composite indexes |

---

*MunafaOS © 2026. All Rights Reserved.*  
*Prepared for final project documentation and thesis defense.*
