# MunafaOS — GitHub Copilot Instructions

## Project Identity
- Name: MunafaOS (Profit Optimizer)
- Type: B2B SaaS for Bangladesh F-Commerce
- Purpose: Order management, inventory 
  tracking, true profit calculation
- Live URL: https://profit-optimizer-v1.web.app
- GitHub: https://github.com/STORM-36/MunafaOS

## Tech Stack
- Frontend: React 19, Vite 7, Tailwind CSS
- Backend: Firebase Firestore, Firebase Auth
- AI: Google Gemini API (@google/generative-ai)
- Charts: Recharts
- Export: xlsx, jspdf, html2canvas
- QR: qrcode.react
- Icons: lucide-react
- Routing: react-router-dom v7

## Key File Locations
- App entry: src/main.jsx
- Router: src/App.jsx
- Auth context: src/context/AuthContext.jsx
- Firebase config: src/firebase.js
- AI service: src/services/aiService.js
- Customer parser: src/utils/parser.js
- Audit logger: src/utils/auditLogger.js
- Categories: src/utils/categories.js
- Sample data: src/utils/sampleData.js

## Pages (Route-Level)
- src/pages/Dashboard.jsx → /dashboard
- src/pages/AddInventory.jsx → /add-inventory
- src/pages/InventoryListPage.jsx → /inventory-list
- src/pages/OCRScanner.jsx → /ocr-scanner
- src/pages/BulkImport.jsx → /bulk-import
- src/pages/OrdersPage.jsx → /orders
- src/pages/TeamManagement.jsx → /team
- src/pages/TeamManagement.jsx → /settings

## Components
- src/components/SmartForm.jsx
  → New order creation form with 
    text parser
- src/components/OrderList.jsx
  → Order list with search, filter,
    stats, pagination
- src/components/InventoryList.jsx
  → Inventory table with Add/Remove
    stock, View Details, Edit Item
- src/components/AuthForm.jsx
  → Login + Registration form
- src/components/Receipt.jsx
  → PDF receipt generator
- src/components/ImageUploadOCR.jsx
  → Gemini Vision image scanner
- src/layouts/AppLayout.jsx
  → Sidebar navigation layout

## CRITICAL Auth Pattern
ALWAYS use this exact pattern:
const { currentUser, workspaceId, 
        userRole } = useAuth();

ALWAYS use this for workspace ID:
const effectiveWorkspaceId = 
  workspaceId || currentUser?.uid || null;

NEVER use auth.currentUser directly.
NEVER skip workspaceId in Firestore queries.

## CRITICAL Audit Pattern
ALWAYS log important actions:
await logAudit(
  currentUser.workspaceId,
  currentUser,
  'ACTION_NAME',
  'Description of what happened'
);

Import from: 
import { logAudit } from 
  '../utils/auditLogger';

## Firestore Collections
- orders: customer orders + profit data
- inventory: product stock + pricing
- users: auth profiles + roles
- audit_logs: all user actions

## Firestore Key Fields

### inventory fields:
userId, workspaceId, name, buyingPrice,
sellingPrice, quantity, packaging,
discount, discountPrice, category,
subcategory, sku, batchNumber, unit,
supplier, supplierPhone, invoiceNumber,
addedBy, timestamp, updatedAt

### orders fields:
userId, workspaceId, name, phone,
address, qty, unitCost, unitSellingPrice,
unitDiscount, unitPackaging, deliveryCost,
adCost, totalRevenue, totalProductCost,
totalPackaging, totalAdSpend, totalDelivery,
totalDeductions, trueNetProfit, finalProfit,
grossRevenue, netProfit, category, 
subcategory, sku, productName, inventoryId,
status, timestamp

## THREE-WAY DATA CONNECTION RULE
Inventory → Orders → Dashboard
ANY change to field names or profit math
in one MUST be verified across all three.
NEVER change calculation logic without 
checking impact on all three pages.

## Profit Math (NEVER MODIFY)
grossRevenue = 
  (unitSellingPrice × qty) - totalDiscount

totalDeductions = 
  totalProductCost + totalPackaging + 
  flatAdSpend + flatDelivery

trueNetProfit = 
  grossRevenue - totalDeductions

## AI Service Patterns
File: src/services/aiService.js

Model selection (ALWAYS use this):
let selectedModel = MODEL_PRIMARY;
try {
  const models = await listAvailableModels();
  const discovered = pickModelName(models);
  if (discovered) selectedModel = discovered;
} catch (e) { }
const model = genAI.getGenerativeModel(
  { model: selectedModel }
);

Available functions:
- parseProductWithAI(text) 
  → single product from text
- parseMultipleProductsWithAI(text) 
  → array of products from bulk text
- parseProductFromImage(file) 
  → product from image (OCR)
- parseCustomerWithAI(text) 
  → customer name/phone/address

## BD-Specific Business Logic
- Dhaka delivery: 60 Taka
- Outside Dhaka delivery: 120 Taka
- Currency symbol: ৳ (Taka)
- Phone format: 01XXXXXXXXX (11 digits)
- Customer text: Bengali, English, Banglish
- Payment: bKash/Nagad (planned Phase 4)

## RBAC Rules
- owner: full access, delete, settings
- operator: view + create, no delete
- revoked: no access, instant signout

## Categories (FIXED LIST)
Clothing, Electronics, Home, Beauty, 
Grocery, Accessories, Kids, Sports,
Stationery, Health, Footwear, Bags, 
Kitchen, Tools, Mobile, Other

NEVER invent new categories.
ALWAYS use normalizeCategory() function.

## Copilot Rules

### ALWAYS:
- Use effectiveWorkspaceId pattern
- Import from exact existing file paths
- Use useAuth() hook for user context
- Call logAudit() for state-changing actions
- Handle Firestore errors with try/catch
- Use serverTimestamp() not new Date()
- Check workspaceId in all queries

### NEVER:
- Hardcode model names in AI calls
- Import Firebase directly in components
  (use src/firebase.js exports)
- Change profit calculation logic without
  checking all three pages
- Create new collections without checking
  existing schema
- Use localStorage or sessionStorage
- Skip workspaceId in Firestore writes

### PLANNED (Phase 4 - DO NOT BUILD YET):
- Smart Stock Alert System (reorderLevel)
- AI Business Assistant (Gemini chat)
- Supplier Management Module
- Advanced Profit Analytics
- PWA installation (vite-plugin-pwa)
- Multi-AI Router (aiRouter.js)
- bKash/Nagad payment tracking
- Delivery partner integration
  (Pathao, Steadfast, Redex, Paperfly)
- Full Bangla UI (i18next)
- Barcode/QR scanner feature

### PLANNED (Phase 5+):
- Customer CRM
- Return/Refund management
- Employee performance tracking
- Multi-workspace enterprise tier
- Daraz/Facebook Shop sync

## Current Development Phase
Phase 3.2 — Active
Completed: T1 (Inventory Editor), 
           T2 (Data Quality)
Remaining: T3 (Brand CSS),
           T4 (WhatsApp Invoice Engine)
