import React, { useState, useEffect } from 'react';
import { db, auth } from '../../../firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  increment,
  doc,
  updateDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import * as XLSX from 'xlsx'; // Import Excel Tool

import { parseText } from '../../../shared/utils/parser';
import { SAMPLE_DATA } from '../../../shared/utils/sampleData';
import { CATEGORY_OPTIONS } from '../../../shared/utils/categories';
import { useAuth } from '../../auth/context/AuthContext';
import { logAudit } from '../../../shared/utils/auditLogger';
import { useToast } from '../../../shared/components/Toast/ToastContext';
import useCustomerTrust from '../../../features/analytics/hooks/useCustomerTrust';

// 🛡️ INPUT SANITIZATION - Prevents XSS and injection attacks
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove potential XSS characters and trim whitespace
  return input
    .trim()
    .replace(/[<>"'`]/g, '') // Remove HTML/script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .substring(0, 500); // Limit length to prevent huge data
};

const sanitizeNumber = (input) => {
  const num = parseFloat(input);
  if (isNaN(num) || num < 0) return 0;
  if (num > 1000000) return 1000000; // Cap at 1 million
  return num;
}; 

const normalizeCategory = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return 'Other';
  const match = CATEGORY_OPTIONS.find(
    (option) => option.toLowerCase() === raw.toLowerCase()
  );
  return match || 'Other';
};

const BD_CITIES_MAP = {
  'dhaka': 'Dhaka', 'ঢাকা': 'Dhaka',
  'mirpur': 'Dhaka', 'uttara': 'Dhaka', 'dhanmondi': 'Dhaka',
  'gulshan': 'Dhaka', 'banani': 'Dhaka', 'mohammadpur': 'Dhaka',
  'badda': 'Dhaka', 'jatrabari': 'Dhaka', 'rampura': 'Dhaka',
  'bashundhara': 'Dhaka', 'motijheel': 'Dhaka', 'farmgate': 'Dhaka',
  'keraniganj': 'Dhaka', 'savar': 'Dhaka', 'tongi': 'Gazipur',
  'chittagong': 'Chittagong', 'chattogram': 'Chittagong', 'চট্টগ্রাম': 'Chittagong',
  'sylhet': 'Sylhet', 'সিলেট': 'Sylhet',
  'rajshahi': 'Rajshahi', 'রাজশাহী': 'Rajshahi',
  'khulna': 'Khulna', 'খুলনা': 'Khulna',
  'comilla': 'Comilla', 'cumilla': 'Comilla', 'কুমিল্লা': 'Comilla',
  'barishal': 'Barisal', 'barisal': 'Barisal', 'বরিশাল': 'Barisal',
  'mymensingh': 'Mymensingh', 'ময়মনসিংহ': 'Mymensingh',
  'gazipur': 'Gazipur', 'গাজীপুর': 'Gazipur',
  'narayanganj': 'Narayanganj', 'নারায়ণগঞ্জ': 'Narayanganj',
  'rangpur': 'Rangpur', 'রংপুর': 'Rangpur',
  'bogra': 'Bogra', 'bogura': 'Bogra',
  'jessore': 'Jessore', 'jashore': 'Jessore',
  'feni': 'Feni', 'noakhali': 'Noakhali',
  'tangail': 'Tangail', 'faridpur': 'Faridpur',
  'cox': "Cox's Bazar", 'coxsbazar': "Cox's Bazar",
  'dinajpur': 'Dinajpur', 'pabna': 'Pabna',
  'sirajganj': 'Sirajganj', 'brahmanbaria': 'Brahmanbaria',
  'habiganj': 'Habiganj', 'sunamganj': 'Sunamganj',
  'moulvibazar': 'Moulvibazar', 'chandpur': 'Chandpur',
  'lakshmipur': 'Lakshmipur', 'bhola': 'Bhola',
  'kushtia': 'Kushtia', 'satkhira': 'Satkhira',
  'manikganj': 'Manikganj', 'narsingdi': 'Narsingdi',
};

const extractCity = (address) => {
  if (!address) return '';
  const lower = address.toLowerCase();
  for (const key of Object.keys(BD_CITIES_MAP)) {
    if (lower.includes(key)) return BD_CITIES_MAP[key];
  }
  return 'Other';
};

const SmartForm = () => {
  const { currentUser, workspaceId } = useAuth();
  const toast = useToast();
  const [inputText, setInputText] = useState('');
  const [inventoryOptions, setInventoryOptions] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [adCost, setAdCost] = useState(0);
  
  const [manualData, setManualData] = useState({
    name: '',
    phone: '',
    address: '',
    quantity: '1',
    sellingPrice: '',
    inventoryUnitCost: 0,
    deliveryCost: 120, // Default to outside Dhaka initially
    category: '',
    productName: '',
    inventoryId: '',
    subcategory: '',
    sku: '',

    addedBy: '',
    userPhone: '',
    city: '',
    channel: 'Facebook',
    freeDelivery: false,
    paymentMethod: 'COD',
    codCharge: 40,
    paymentFee: 0,
    paymentFeeRate: 1.85,
  });

  const trust = useCustomerTrust(manualData.phone);

// ⚡ SMART DETECTION LOGIC
  useEffect(() => {
    if (!inputText) return;

    const result = parseText(inputText);

    const dhakaAreas = [
      'dhaka', 'ঢাকা',
      'mirpur', 'মিরপুর',
      'uttara', 'উত্তরা',
      'savar', 'সাভার',
      'dhanmondi', 'ধানমন্ডি',
      'gulshan', 'গুলশান',
      'banani', 'বনানী',
      'mohammadpur', 'মোহাম্মদপুর',
      'farmgate', 'ফার্মগেট',
      'motijheel', 'মতিঝিল',
      'badda', 'বাড্ডা',
      'jatrabari', 'যাত্রাবাড়ী',
      'khilgaon', 'খিলগাঁও',
      'rampura', 'রামপুরা',
      'bashundhara', 'বসুন্ধরা',
      'cantonment', 'ক্যান্টনমেন্ট',
      'keraniganj', 'কেরানীগঞ্জ',
      'new market', 'নিউ মার্কেট'
    ];

    let autoDelivery = 120;
    if (result.address) {
      const lowerAddress = 
        result.address.toLowerCase();
      const isInsideDhaka = dhakaAreas.some(
        area => lowerAddress.includes(area)
      );
      if (isInsideDhaka) {
        autoDelivery = 60;
      }
    }

    setManualData(prev => ({
      ...prev,
      phone: result.phone || prev.phone,
      name: result.name || prev.name,
      address: result.address || prev.address,
      deliveryCost: autoDelivery,
      city: extractCity(result.address || '') || prev.city,
    }));
  }, [inputText]);

  useEffect(() => {
    const effectiveWorkspaceId = workspaceId || currentUser?.uid || null;
    if (!effectiveWorkspaceId) {
      setInventoryOptions([]);
      return;
    }

    const inventoryQuery = query(
      collection(db, 'inventory'),
      where('workspaceId', '==', effectiveWorkspaceId)
    );

    const unsubscribe = onSnapshot(
      inventoryQuery,
      (snapshot) => {
        const options = snapshot.docs
          .map((inventoryDoc) => {
            const data = inventoryDoc.data() || {};
            const docId = String(inventoryDoc.id || '').trim();
            const productName = String(data.name || data.productName || '').trim();

            return {
              ...data,
              id: docId,
              inventoryId: docId,
              name: productName
            };
          })
          .filter((item) => item.inventoryId && item.name)
          .sort((a, b) => String(a.name).localeCompare(String(b.name)));

        setInventoryOptions(options);
      },
      (error) => {
        console.error('Error loading inventory products for order form:', error);
        setInventoryOptions([]);
      }
    );

    return () => unsubscribe();
  }, [workspaceId, currentUser?.uid]);

  useEffect(() => {
    const inventoryId = manualData.inventoryId;
    const inventory = inventoryOptions;

    const selectedItem = inventory.find(item => item.id === inventoryId);
    if (!selectedItem) return;

    console.log("--- DEBUGGING PRODUCT SELECTION ---");
    console.log("Selected Item Object:", selectedItem);
    console.log("Does it have a discount?", selectedItem.discount);

    // Auto-fill the discount box from the database when product changes.
    setDiscount(selectedItem.discount ?? selectedItem.discountPrice ?? 0);
  }, [manualData.inventoryId, inventoryOptions]);

  useEffect(() => {
    const quantity = manualData.quantity;
    const inventoryId = manualData.inventoryId;
    const inventory = inventoryOptions;

    const selectedItem = inventory.find(item => item.id === inventoryId);
    if (!selectedItem) return;

    const calculatedTotal = (Number(selectedItem.sellingPrice) - Number(discount)) * Number(quantity);

    setManualData((prev) => ({
      ...prev,
      sellingPrice: String(calculatedTotal)
    }));
  }, [manualData.quantity, discount, manualData.inventoryId, inventoryOptions]);

  // �💾 SAVE ORDER
  const handleSave = async () => {
    const selectedInventoryId = String(manualData.inventoryId || '').trim();
    const selectedInventoryItem = inventoryOptions.find(
      (item) => String(item.inventoryId || item.id || '').trim() === selectedInventoryId
    );
    const hasValidInventorySelection = inventoryOptions.some(
      (item) =>
        String(item.inventoryId || item.id || '').trim() === selectedInventoryId
    );

    if (!selectedInventoryId || !hasValidInventorySelection) {
      toast.error('Please select a valid product from the list.');
      return;
    }

    const effectiveWorkspaceId = workspaceId || currentUser?.uid || null;

    if (!currentUser || !effectiveWorkspaceId) {
      toast.warning('Please log in first.');
      return;
    }
    const safeCategory = normalizeCategory(manualData.category);
    const addedByFallback = currentUser?.displayName || currentUser?.email || '';
    const safeAddedBy = sanitizeInput(manualData.addedBy || addedByFallback || '');
    const inventoryId = sanitizeInput(selectedInventoryId);
    const selectedProductName = sanitizeInput(
      manualData.productName || manualData.subcategory || manualData.category || 'Unknown Product'
    );

    const quantity = manualData.quantity;
    const delivery = manualData.deliveryCost;

    const inventory = inventoryOptions;
    const selectedItem = inventory.find(item => item.id === inventoryId);
    const qty = Number(quantity || 1);
    const unitDiscount = Number(discount || 0); // Now pulled properly from state
    const unitPackaging = Number(selectedItem?.packaging || 0); // Variable (Multiplies)
    const unitBuyingPrice = Number(selectedItem?.buyingPrice || 0); // Variable (Multiplies)

    // --- THE FIXED COSTS (Do NOT multiply by qty) ---
    const flatAdSpend = Number(adCost || 0);
    const flatDelivery = Number(delivery || 0);

    // --- THE MULTIPLIERS ---
    const totalDiscount = unitDiscount * qty;
    const totalProductCost = unitBuyingPrice * qty;
    const totalPackaging = unitPackaging * qty;
    const totalAdSpend = flatAdSpend;
    const totalDelivery = flatDelivery;

    const grossRevenue = (Number(selectedItem?.sellingPrice || 0) * qty) - totalDiscount;
    // Delivery is only a seller cost when free delivery is offered
    // If customer pays delivery, it is neutral — not deducted from profit
    const sellerDeliveryCost = manualData.freeDelivery ? flatDelivery : 0;

    // Payment method cost calculation
    const paymentMethod = manualData.paymentMethod || 'COD';
    let safeCodCharge = 0;
    let safePaymentFee = 0;

    if (paymentMethod === 'COD') {
      // Seller pays COD fee to courier
      safeCodCharge = Number(manualData.codCharge || 0);
      safePaymentFee = 0;
    } else if (['bKash', 'Nagad', 'Rocket'].includes(paymentMethod)) {
      // Mobile banking fee auto-calculated from gross revenue
      safeCodCharge = 0;
      const feeRate = Number(manualData.paymentFeeRate || 1.85) / 100;
      safePaymentFee = Math.round(grossRevenue * feeRate);
    } else {
      // Bank or Already Paid — no extra fees
      safeCodCharge = 0;
      safePaymentFee = 0;
    }

    const totalDeductions = totalProductCost + totalPackaging + flatAdSpend + sellerDeliveryCost + safeCodCharge + safePaymentFee;
    const trueNetProfit = grossRevenue - totalDeductions;

    if (!grossRevenue || grossRevenue <= 0) {
      toast.error('Stop! You must enter a valid quantity/discount combination.');
      return;
    }

    // Strict negative-stock guard: block order creation when requested quantity exceeds stock.
    const availableStock = sanitizeNumber(selectedInventoryItem?.quantity || 0);

    if (qty > availableStock) {
      toast.error(`Insufficient stock. Only ${availableStock} remaining in this batch.`);
      return;
    }

    try {
      // 🛡️ SANITIZE ALL INPUTS BEFORE SAVING
      const createdOrder = await addDoc(collection(db, "orders"), {
        userId: currentUser.uid,
        workspaceId: effectiveWorkspaceId,
        originalText: sanitizeInput(inputText),
        name: sanitizeInput(manualData.name),
        phone: sanitizeInput(manualData.phone),
        address: sanitizeInput(manualData.address),
        quantity: qty,
        qty,
        sellingPrice: sanitizeNumber(grossRevenue),
        productCost: sanitizeNumber(totalProductCost || 0),
        unitCost: sanitizeNumber(unitBuyingPrice || 0),
        unitSellingPrice: sanitizeNumber(Number(selectedItem?.sellingPrice || 0)),
        unitDiscount: sanitizeNumber(unitDiscount || 0),
        unitPackaging: sanitizeNumber(unitPackaging || 0),
        deliveryCost: sanitizeNumber(totalDelivery || 0),
        adCost: sanitizeNumber(flatAdSpend || 0),
        flatAdSpend: sanitizeNumber(flatAdSpend || 0),
        totalDiscount: sanitizeNumber(totalDiscount || 0),
        totalProductCost: sanitizeNumber(totalProductCost || 0),
        totalPackaging: sanitizeNumber(totalPackaging || 0),
        totalAdSpend: sanitizeNumber(totalAdSpend || 0),
        totalDelivery: sanitizeNumber(totalDelivery || 0),
        grossRevenue: sanitizeNumber(grossRevenue || 0),
        totalDeductions: sanitizeNumber(totalDeductions || 0),
        trueNetProfit: Number(trueNetProfit || 0),
        discountPrice: sanitizeNumber(Number(discount || 0)),
        category: sanitizeInput(safeCategory),
        productName: sanitizeInput(manualData.productName),
        inventoryId,
        subcategory: sanitizeInput(manualData.subcategory),
        sku: sanitizeInput(manualData.sku),
        addedBy: safeAddedBy,
        userPhone: sanitizeInput(manualData.userPhone),
        totalRevenue: sanitizeNumber(grossRevenue || 0),
        totalExpenses: sanitizeNumber(totalDeductions || 0),
        finalProfit: Number(trueNetProfit || 0),
        netProfit: trueNetProfit,
        city: sanitizeInput(manualData.city || ''),
        channel: sanitizeInput(manualData.channel || 'Facebook'),
        freeDelivery: manualData.freeDelivery === true,
        paymentMethod: sanitizeInput(manualData.paymentMethod || 'COD'),
        codCharge: sanitizeNumber(safeCodCharge),
        paymentFee: sanitizeNumber(safePaymentFee),
        paymentFeeRate: sanitizeNumber(Number(manualData.paymentFeeRate || 0)),
        sellerDeliveryCost: sanitizeNumber(manualData.freeDelivery ? flatDelivery : 0),
        timestamp: serverTimestamp()
      });

      // Audit trigger: log staff order creation immediately after successful save.
      if (currentUser) {
        try {
          const auditWorkspaceId = currentUser.workspaceId || effectiveWorkspaceId;
          await logAudit(
            auditWorkspaceId,
            currentUser,
            'CREATED_ORDER',
            `Created order ${createdOrder.id} for ${manualData.name}`
          );
        } catch (err) {
          console.error('Order audit logging failed:', err);
        }
      }

      // Auto-deduct inventory right after order save using exact inventory doc id.
      // Deduct exactly the sold quantity from inventory.
      try {
        const orderQuantity = qty;

        if (inventoryId) {
          const invRef = doc(db, 'inventory', inventoryId);
          await updateDoc(invRef, {
            quantity: increment(-orderQuantity)
          });
          console.log('Successfully deducted stock for inventoryId:', inventoryId);
        } else {
          console.error('Inventory deduction skipped: inventoryId missing for order', {
            orderId: createdOrder.id,
            inventoryId
          });
        }
      } catch (inventoryError) {
        console.error('Inventory auto-deduction failed:', inventoryError);
      }

      toast.success('Order Saved!');

      // Reset Form for next customer
      setInputText('');
      setDiscount(0);
      setAdCost(0);
      setManualData({
        name: '', phone: '', address: '',
        quantity: '1', sellingPrice: '', inventoryUnitCost: 0,
        deliveryCost: 120,
        category: '', productName: '', inventoryId: '', subcategory: '', sku: '',
        addedBy: '', userPhone: '',
        city: '',
        channel: 'Facebook',
        freeDelivery: false,
        paymentMethod: 'COD',
        codCharge: 40,
        paymentFee: 0,
        paymentFeeRate: 1.85,
      });
    } catch (error) {
      console.error("Error saving:", error);
      toast.error('Error saving order');
    }
  };

  const loadExample = () => {
    if (SAMPLE_DATA && SAMPLE_DATA.length > 0) {
      const random = SAMPLE_DATA[Math.floor(Math.random() * SAMPLE_DATA.length)];
      setInputText(random.text);
      setManualData(prev => ({
        ...prev,
        sellingPrice: random.sell
      }));
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-2xl mx-auto mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">📝 New Order</h2>
        <button onClick={loadExample} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
          🎲 Load Sample Data
        </button>
      </div>

      <textarea 
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm mb-3"
        rows="4"
        placeholder="Paste customer text here..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input 
          type="text" placeholder="Name" 
          value={manualData.name}
          onChange={(e) => setManualData({...manualData, name: e.target.value})}
          className="p-2 border rounded font-bold text-gray-700"
        />
        <input
          type="text" placeholder="Phone"
          value={manualData.phone}
          onChange={(e) => setManualData({...manualData, phone: e.target.value})}
          className="p-2 border rounded font-bold text-gray-700"
        />
      </div>

      {/* Customer Trust Badge */}
      {trust.checked && (
        <div className="mt-1 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
             style={{
               background: trust.trustLevel === 'safe'    ? 'rgba(26,158,106,0.08)'  :
                           trust.trustLevel === 'caution' ? 'rgba(232,184,75,0.08)' :
                           trust.trustLevel === 'warning' ? 'rgba(232,184,75,0.10)' :
                                                            'rgba(217,64,64,0.10)',
               color:      trust.trustLevel === 'safe'    ? '#1A9E6A' :
                           trust.trustLevel === 'caution' ? '#9A6F00' :
                           trust.trustLevel === 'warning' ? '#9A6F00' :
                                                            '#D94040',
               border: `1px solid ${
                           trust.trustLevel === 'safe'    ? 'rgba(26,158,106,0.2)'  :
                           trust.trustLevel === 'caution' ? 'rgba(232,184,75,0.3)'  :
                           trust.trustLevel === 'warning' ? 'rgba(232,184,75,0.35)' :
                                                            'rgba(217,64,64,0.25)'
               }`
             }}>
          <span>
            {trust.trustLevel === 'safe'    ? '✅' :
             trust.trustLevel === 'caution' ? '⚠️' :
             trust.trustLevel === 'warning' ? '⚠️' :
                                              '🔴'}
          </span>
          <span>
            {trust.trustLevel === 'safe' &&
              `No return history - ${trust.ownTotalCount} previous order${trust.ownTotalCount !== 1 ? 's' : ''}`}
            {trust.trustLevel === 'caution' &&
              `Caution: ${trust.ownReturnCount} return${trust.ownReturnCount !== 1 ? 's' : ''} in your shop - verify before confirming`}
            {trust.trustLevel === 'warning' &&
              `Community flagged: reported by ${trust.communityReports} seller${trust.communityReports !== 1 ? 's' : ''} - demand advance payment`}
            {trust.trustLevel === 'danger' &&
              `High Risk: ${trust.ownReturnCount > 0 ? trust.ownReturnCount + ' returns in your shop' : ''}${trust.ownReturnCount > 0 && trust.communityReports > 0 ? ' + ' : ''}${trust.communityReports > 0 ? 'flagged by ' + trust.communityReports + ' seller' + (trust.communityReports !== 1 ? 's' : '') : ''} - demand advance bKash payment`}
          </span>
        </div>
      )}

      {trust.loading && (
        <div className="mt-1 px-3 py-1 rounded-xl text-xs"
             style={{ color: 'rgba(15,31,61,0.4)' }}>
          Checking customer history...
        </div>
      )}

      <input
        type="text" placeholder="Address" 
        value={manualData.address}
        onChange={(e) => setManualData({...manualData, address: e.target.value})}
        className="w-full p-2 border rounded mt-3 text-sm text-gray-600"
      />

      {/* PRODUCT INFO */}
      <div className="bg-slate-50 p-4 rounded-xl mt-4 border border-slate-200">
        <h3 className="text-xs font-bold text-slate-700 uppercase mb-2">📦 Product Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500">Category</label>
            <input
              list="order-category-options"
              value={manualData.category}
              onChange={(e) => setManualData({ ...manualData, category: e.target.value })}
              className="w-full p-2 border rounded font-bold text-gray-700"
              placeholder="Select or type a category"
            />
            <datalist id="order-category-options">
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Subcategory</label>
            <input
              type="text"
              value={manualData.subcategory}
              onChange={(e) => setManualData({ ...manualData, subcategory: e.target.value })}
              className="w-full p-2 border rounded font-bold text-gray-700"
              placeholder="e.g. Sneakers"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Product (Inventory)</label>
            <select
              value={manualData.inventoryId}
              onChange={(e) => {
                const selectedId = e.target.value;
                const foundProduct = inventoryOptions.find(
                  (product) => product.id === selectedId
                );

                if (!foundProduct) {
                  setManualData((previousData) => ({
                    ...previousData,
                    inventoryId: '',
                    productName: '',
                    inventoryUnitCost: 0,
                    sku: previousData.sku
                  }));
                  return;
                }

                setManualData((previousData) => ({
                  ...previousData,
                  inventoryId: foundProduct.id,
                  productName: foundProduct.name || previousData.productName,
                  inventoryUnitCost: sanitizeNumber(foundProduct.buyingPrice || 0),
                  sku: foundProduct.sku || previousData.sku,
                  subcategory: foundProduct.subcategory || previousData.subcategory,
                  category: foundProduct.category || previousData.category
                }));
              }}
              className="w-full p-2 border rounded font-bold text-gray-700"
            >
              <option value="">Select from inventory</option>
              {inventoryOptions.map((product) => (
                <option
                  key={product.id}
                  value={product.id}
                  disabled={sanitizeNumber(product.quantity || 0) <= 0}
                >
                  {`${product.name}${product.batchNumber ? ` (${product.batchNumber})` : ''} - ${sanitizeNumber(product.quantity || 0)} in stock${sanitizeNumber(product.quantity || 0) <= 0 ? ' [OUT OF STOCK]' : ''}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500">SKU</label>
            <input
              type="text"
              value={manualData.sku}
              onChange={(e) => setManualData({ ...manualData, sku: e.target.value })}
              className="w-full p-2 border rounded font-bold text-gray-700"
              placeholder="SKU-123"
            />
          </div>
        </div>
      </div>

      {/* UNIT ECONOMICS */}
      <div className="bg-blue-50 p-4 rounded-xl mt-4 border border-blue-100">
        <h3 className="text-xs font-bold text-blue-800 uppercase mb-2">💰 Unit Economics</h3>
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="block text-xs text-gray-500">Quantity</label>
                <input
                    type="number"
                    min="1"
                    step="1"
                    value={manualData.quantity}
                    onChange={(e) => setManualData({...manualData, quantity: e.target.value})}
                    className="w-full p-2 border rounded font-bold text-gray-700 bg-white"
                />
            </div>
            <div>
                <label className="block text-xs text-gray-500">Discount (Per Unit)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full p-2 border rounded font-bold text-gray-700 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Ad Spend (Per Unit)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={adCost}
                  onChange={(e) => setAdCost(e.target.value)}
                  className="w-full p-2 border rounded font-bold text-gray-700 bg-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500">Total Selling Price (Auto-Calculated)</label>
                <input 
                    type="number" 
                    value={manualData.sellingPrice}
                  readOnly
                    className="w-full p-2 border border-green-400 rounded font-bold text-green-700 bg-white"
                />
            </div>

              <div className="md:col-span-2 flex items-center justify-between bg-white border rounded-lg p-3">
                <div>
                  <p className="text-xs font-bold text-gray-700">Free Delivery</p>
                  <p className="text-[10px] text-gray-400">Toggle ON if seller absorbs delivery cost</p>
                </div>
                <button
                  type="button"
                  onClick={() => setManualData(prev => ({ ...prev, freeDelivery: !prev.freeDelivery }))}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    manualData.freeDelivery ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    manualData.freeDelivery ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {manualData.freeDelivery && (
                <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-700 font-semibold">
                  ✅ Free Delivery ON — delivery cost ৳{manualData.deliveryCost} will be deducted from your profit
                </div>
              )}

              {/* PAYMENT METHOD SELECTOR */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-2">Payment Method</label>
                <div className="flex flex-wrap gap-2">
                  {['COD', 'bKash', 'Nagad', 'Rocket', 'Bank', 'Paid'].map((method) => {
                    const methodStyles = {
                      'COD':   { active: '#0F1F3D', text: '#fff', label: '💵 COD' },
                      'bKash': { active: '#E2136E', text: '#fff', label: '🟣 bKash' },
                      'Nagad': { active: '#F6821F', text: '#fff', label: '🟠 Nagad' },
                      'Rocket':{ active: '#8B008B', text: '#fff', label: '🚀 Rocket' },
                      'Bank':  { active: '#2E5BA8', text: '#fff', label: '🏦 Bank' },
                      'Paid':  { active: '#1A9E6A', text: '#fff', label: '✅ Paid' },
                    };
                    const s = methodStyles[method];
                    const isActive = manualData.paymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setManualData({
                          ...manualData,
                          paymentMethod: method,
                          codCharge: method === 'COD' ? 40 : 0,
                          paymentFee: 0
                        })}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isActive ? `2px solid ${s.active}` : '2px solid rgba(15,31,61,0.12)',
                          background: isActive ? s.active : '#fff',
                          color: isActive ? s.text : '#4A6080',
                          transition: 'all 0.15s'
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* COD — manual charge field */}
              {manualData.paymentMethod === 'COD' && (
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-500">COD Charge (Courier Collection Fee)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={manualData.codCharge}
                    onChange={(e) => setManualData({ ...manualData, codCharge: e.target.value })}
                    className="w-full p-2 border rounded font-bold text-gray-700 bg-white"
                    placeholder="e.g. 40"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    💡 Pathao/Steadfast charges ৳30-50 per COD order — deducted from your profit
                  </p>
                </div>
              )}

              {/* bKash / Nagad / Rocket — auto fee calculation */}
              {['bKash', 'Nagad', 'Rocket'].includes(manualData.paymentMethod) && (
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-500">
                    {manualData.paymentMethod} Fee Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualData.paymentFeeRate}
                    onChange={(e) => setManualData({ ...manualData, paymentFeeRate: e.target.value })}
                    className="w-full p-2 border rounded font-bold text-gray-700 bg-white"
                    placeholder="1.85"
                  />
                  <p className="text-[10px] text-blue-600 font-semibold mt-1">
                    💡 Auto-calculated: ৳{manualData.sellingPrice
                      ? Math.round(parseFloat(manualData.sellingPrice) * (parseFloat(manualData.paymentFeeRate || 1.85) / 100))
                      : 0
                    } will be deducted from your profit
                  </p>
                </div>
              )}

              {/* Bank / Paid — info message */}
              {['Bank', 'Paid'].includes(manualData.paymentMethod) && (
                <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-700 font-semibold">
                  ✅ No payment processing fee for this method
                </div>
              )}
        </div>
      </div>

      {/* USER INFO */}
      <div className="bg-indigo-50 p-4 rounded-xl mt-4 border border-indigo-100">
        <h3 className="text-xs font-bold text-indigo-700 uppercase mb-2">👤 User Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500">Added By</label>
            <input
              type="text"
              value={manualData.addedBy}
              onChange={(e) => setManualData({ ...manualData, addedBy: e.target.value })}
              className="w-full p-2 border rounded font-bold text-gray-700"
              placeholder="Auto-filled on save"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">User Phone</label>
            <input
              type="text"
              value={manualData.userPhone}
              onChange={(e) => setManualData({ ...manualData, userPhone: e.target.value })}
              className="w-full p-2 border rounded font-bold text-gray-700"
              placeholder="Your phone"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500">Order Channel</label>
            <select
              value={manualData.channel}
              onChange={(e) => setManualData({ ...manualData, channel: e.target.value })}
              className="w-full p-2 border rounded font-bold text-gray-700 bg-white"
            >
              <option value="Facebook">📘 Facebook</option>
              <option value="WhatsApp">💬 WhatsApp</option>
              <option value="Instagram">📷 Instagram</option>
              <option value="Phone">📞 Phone</option>
              <option value="Walk-in">🚶 Walk-in</option>
              <option value="Other">🔗 Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 flex items-center gap-1">
              City (Auto-detected)
              {manualData.city === 'Other' || manualData.city === ''
                ? <span className="text-yellow-600 font-bold">⚠️ Please verify</span>
                : <span className="text-green-600 font-bold">✓</span>
              }
            </label>
            <input
              type="text"
              value={manualData.city}
              onChange={(e) => setManualData({ ...manualData, city: e.target.value })}
              className={`w-full p-2 border rounded font-bold text-gray-700 ${
                manualData.city === 'Other' || manualData.city === ''
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-green-400 bg-green-50'
              }`}
              placeholder="Auto-detected — edit if wrong"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full mt-4 bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all"
      >
        💾 Save Order
      </button>
    </div>
  );
};

export default SmartForm; 