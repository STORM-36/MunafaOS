# MunafaOS 📊
### The Intelligent Operating System for F-Commerce in Bangladesh

[![Live Demo](https://img.shields.io/badge/Live-profit--optimizer--v1.web.app-brightgreen)](https://profit-optimizer-v1.web.app)
[![Firebase](https://img.shields.io/badge/Firebase-12.7-orange)](https://firebase.google.com)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-purple)](https://vitejs.dev)

---

## What Is MunafaOS?

MunafaOS is a production-grade B2B SaaS platform built for Bangladeshi F-commerce businesses operating through Facebook, Messenger, and WhatsApp. It eliminates manual data entry, calculates true net profit, and gives business owners real-time visibility into their operations — all in one place.

> **Munafa (মুনাফা)** means *Profit* in Bengali.

---

## Live Demo

| Resource | Link |
|----------|------|
| 🌐 Production App | https://profit-optimizer-v1.web.app |
| 📁 GitHub Repository | https://github.com/STORM-36/MunafaOS |
| 🔥 Firebase Project | profit-optimizer-v1 |

---

## The Problem It Solves

Bangladesh has over 5 million F-commerce 
sellers operating without proper business tools. They face:

- ❌ **Manual order entry** from messy 
  WhatsApp/Messenger messages
- ❌ **Hidden profit leakage** from 
  packaging, ads, and delivery costs
- ❌ **No real-time inventory tracking** 
  causing overselling
- ❌ **Zero team accountability** with 
  no role separation
- ❌ **Banglish chaos** — customer 
  messages in mixed Bengali/English

**MunafaOS fixes all of this.**

---

## Core Features Built

### 🧠 AI-Powered Order Entry
- Smart text parser — paste any 
  customer message, fields auto-fill
- Detects Bangla, English, and Banglish
- Auto-detects Dhaka (৳60) vs 
  outside Dhaka (৳120) delivery cost
- Label detection: নাম, ঠিকানা, 
  Name, Address

### 💰 True Profit Engine
- Calculates real net profit per order
- Accounts for: product cost, packaging, 
  ad spend, delivery, discount
- Profit Autopsy modal per order
- Batch order profit math (qty × unit)

### 📦 Inventory Management
- Add / Edit / View / Delete stock
- Add Stock ➕ with atomic increment
- Remove Stock ➖ with reason tracking
- Low stock detection (Out of Stock badge)
- Incomplete data badge (⚠️)
- View Details side panel

### 🤖 AI Inventory Input (3 Modes)
- **Text mode**: AI parses supplier 
  message → fills form
- **Bulk mode**: Extract 2-20 products 
  from one supplier message
- **OCR mode**: Gemini Vision extracts 
  product data from images

### 📊 Real-Time Dashboard
- KPI cards: Revenue, Profit, 
  Orders, Pending
- 7-day / 30-day revenue chart
- Top categories breakdown
- Profit margin percentage

### 📋 Order Management
- Search by name, phone, product
- Filter by status and date range
- Custom date range picker
- All-time stats vs filtered stats
- Pagination with real-time updates
- Export to Excel

### 👥 Team & RBAC
- Owner vs Operator role separation
- Secondary Firebase auth for 
  creating operators
- Revoke access (soft-disable)
- Per-employee audit log viewer

### 🔒 Security
- Workspace-scoped Firestore queries
- Firestore Security Rules (RBAC-aware)
- XSS input sanitization on all fields
- Immutable audit trail
- Environment variable API key protection

### 🧾 Receipt Engine
- Customer receipt PDF generation
- Print directly from browser

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 7, Tailwind CSS |
| Backend | Firebase Firestore (serverless) |
| Auth | Firebase Auth (Email + Google SSO) |
| AI | Google Gemini 1.5 Flash |
| Charts | Recharts |
| PDF | jsPDF + html2canvas |
| Excel | SheetJS (xlsx) |
| QR Code | qrcode.react |
| Icons | Lucide React |
| Routing | React Router DOM v7 |
| Hosting | Firebase Hosting |
| CI/CD | Firebase CLI + GitHub |

---

## Architecture

```
User Browser
     │
     ▼
React 19 + Vite 7 (SPA)
     │
     ├──► Firebase Auth (Identity)
     │
     ├──► Cloud Firestore (Data)
     │         │
     │         ├── orders/
     │         ├── inventory/
     │         ├── users/
     │         └── audit_logs/
     │
     └──► Gemini AI API
               │
               ├── Text parsing
               ├── Bulk import
               └── Image OCR
```

---

## Firestore Data Model

### orders collection
```
userId, workspaceId, name, phone, address,
qty, unitCost, unitSellingPrice, 
unitPackaging, unitDiscount, deliveryCost,
adCost, totalRevenue, totalProductCost,
totalPackaging, totalAdSpend, totalDelivery,
totalDeductions, trueNetProfit, grossRevenue,
category, productName, inventoryId,
status (Pending/Delivered/Returned),
timestamp
```

### inventory collection
```
userId, workspaceId, name, buyingPrice,
sellingPrice, quantity, packaging, discount,
category, subcategory, sku, batchNumber,
unit, expiryDate, supplier, supplierPhone,
invoiceNumber, importMethod, timestamp,
updatedAt
```

---

## Project Structure

```
MunafaOS/
├── .github/
│   └── copilot-instructions.md
├── public/
│   └── manifest.json
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── AuthForm.jsx
│   │   ├── ImageUploadOCR.jsx
│   │   ├── InventoryList.jsx
│   │   ├── OrderList.jsx
│   │   ├── Receipt.jsx
│   │   ├── SmartForm.jsx
│   │   └── ...
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── layouts/
│   │   └── AppLayout.jsx
│   ├── pages/
│   │   ├── AddInventory.jsx
│   │   ├── BulkImport.jsx
│   │   ├── Dashboard.jsx
│   │   ├── InventoryListPage.jsx
│   │   ├── OCRScanner.jsx
│   │   ├── OrdersPage.jsx
│   │   ├── TeamManagement.jsx
│   │   └── ...
│   ├── services/
│   │   └── aiService.js
│   └── utils/
│       ├── auditLogger.js
│       ├── categories.js
│       ├── parser.js
│       └── sampleData.js
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
└── package.json
```

---

## Roadmap

### ✅ Phase 1-3.2 (Completed)
- Authentication + RBAC
- Order management + Smart Parser
- True Profit Engine
- Inventory CRUD + AI input
- Dashboard + Charts
- Team management
- Audit logging
- Order page search/filter/stats

### 🔴 Phase 3.2 Remaining
- T3: Brand CSS (Enterprise UI)
- T4: WhatsApp Invoice Engine

### ⏳ Phase 4 — Intelligence Engine
- Smart Stock Alert System
- Advanced Profit Analytics
- AI Business Assistant (Gemini Chat)
- Supplier Management Module
- PWA (installable app)

### ⏳ Phase 5 — Scale & Operations
- Customer CRM
- Return/Refund management
- Employee performance + commission
- Delivery partner integration
  (Pathao, Steadfast, Redex, Paperfly)

### ⏳ Phase 6 — Enterprise
- Multi-workspace management
- Advanced RBAC (4+ roles)
- Predictive restock AI
- Barcode/QR scanner
- Multi-AI router
  (Gemini + GPT-4o + Claude + DeepSeek)
- Full Bangla UI (i18next)
- Daraz / Facebook Shop sync
- bKash / Nagad payment tracking

---

## Getting Started

### Prerequisites
- Node.js >= 20
- Firebase CLI
- Google Gemini API key

### Local Setup
```bash
git clone https://github.com/STORM-36/MunafaOS.git
cd MunafaOS
npm install
cp .env.example .env
# Fill in your Firebase + Gemini credentials
npm run dev
```

### Deploy
```bash
npm run build
firebase deploy
```

---

## Environment Variables

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GEMINI_API_KEY=
```

---

## Authors

| Role | Name |
|------|------|
| Lead Architect & Developer | Mong Shainu Marma |
| Co-Author, Design & Logistics | Munjur E Fatima Khan Monisha |

**Institution:** Daffodil International University (DIU)  
**Program:** Final Year Thesis Project — 2026

---

## License & Copyright

**MunafaOS © 2026. All Rights Reserved.**  
Unauthorized copying, distribution, or 
use of this codebase is prohibited.
