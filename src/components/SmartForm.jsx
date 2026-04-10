import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
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

import { parseText } from '../utils/parser';
import { SAMPLE_DATA } from '../utils/sampleData';
import { CATEGORY_OPTIONS } from '../utils/categories';
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../utils/auditLogger';

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

const SmartForm = () => {
  const { currentUser, workspaceId } = useAuth();
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
    userPhone: ''
  });

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
      deliveryCost: autoDelivery
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
      alert('Please select a valid product from the inventory before saving.');
      return;
    }

    const effectiveWorkspaceId = workspaceId || currentUser?.uid || null;

    if (!currentUser || !effectiveWorkspaceId) {
      alert("⚠️ Please Login First!");
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
    // --- THE NEW AUTOPSY MATH ---
    const totalDeductions = totalProductCost + totalPackaging + flatAdSpend + flatDelivery;
    const trueNetProfit = grossRevenue - totalDeductions;

    if (!grossRevenue || grossRevenue <= 0) {
      alert("⚠️ Stop! You must enter a valid quantity/discount combination.");
      return;
    }

    // Strict negative-stock guard: block order creation when requested quantity exceeds stock.
    const availableStock = sanitizeNumber(selectedInventoryItem?.quantity || 0);

    if (qty > availableStock) {
      alert(`Error: Insufficient stock. Only ${availableStock} remaining in this batch.`);
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

      alert("✅ Order Saved!");

      // Reset Form for next customer
      setInputText('');
      setDiscount(0);
      setAdCost(0);
      setManualData({
        name: '', phone: '', address: '',
        quantity: '1', sellingPrice: '', inventoryUnitCost: 0,
        deliveryCost: 120,
        category: '', productName: '', inventoryId: '', subcategory: '', sku: '',
        addedBy: '', userPhone: ''
      });
    } catch (error) {
      console.error("Error saving:", error);
      alert("❌ Error saving order");
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