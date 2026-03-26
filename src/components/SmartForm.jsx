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
  getDocs
} from 'firebase/firestore';
import * as XLSX from 'xlsx'; // Import Excel Tool
import UnitCostCalculator from './UnitCostCalculator'; // 👈 NEW IMPORT

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
  const [showCalculator, setShowCalculator] = useState(false); // 👈 NEW STATE FOR CALCULATOR
  const [inventoryOptions, setInventoryOptions] = useState([]);
  
  const [manualData, setManualData] = useState({
    name: '',
    phone: '',
    address: '',
    sellingPrice: '', 
    productCost: '',
    deliveryCost: 120, // Default to outside Dhaka initially
    adCost: '',        // FIXED: Now starts blank
    category: '',
    productName: '',
    inventoryId: '',
    subcategory: '',
    sku: '',
    discountPrice: '',

    addedBy: '',
    userPhone: ''
  });

// ⚡ SMART DETECTION LOGIC
  useEffect(() => {
    if (!inputText) return; 

    const result = parseText(inputText);
    
    // LIST OF AREAS INSIDE DHAKA (English + Bangla)
    // If any of these words appear, we charge 60 Tk.
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
      'jatrabari', 'যাত্রাবাড়ী',
      'khilgaon', 'খিলগাঁও',
      'rampura', 'রামপুরা',
      'bashundhara', 'বসুন্ধরা',
      'cantonment', 'ক্যান্টনমেন্ট',
      'keraniganj', 'কেরানীগঞ্জ',
      'new market', 'নিউ মার্কেট'
    ];

    let autoDelivery = 120; // Default: Outside Dhaka (120)
    
    if (result.address) {
      const lowerAddress = result.address.toLowerCase();
      
      // Check if ANY keyword from our list is inside the address
      const isInsideDhaka = dhakaAreas.some(area => lowerAddress.includes(area));
      
      if (isInsideDhaka) {
        autoDelivery = 60; // Found a match! Set to 60.
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
    const effectiveWorkspaceId = workspaceId || currentUser?.workspaceId || currentUser?.uid || null;
    if (!effectiveWorkspaceId) {
      setInventoryOptions([]);
      return;
    }

    const fetchInventoryOptions = async () => {
      try {
        const inventoryQuery = query(
          collection(db, 'inventory'),
          where('workspaceId', '==', effectiveWorkspaceId)
        );
        const snapshot = await getDocs(inventoryQuery);
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
      } catch (error) {
        console.error('Error loading inventory products for order form:', error);
        setInventoryOptions([]);
      }
    };

    fetchInventoryOptions();
  }, [workspaceId, currentUser?.workspaceId, currentUser?.uid]);

  // � NEW: HANDLE APPLY COST FROM CALCULATOR
  const handleApplyUnitCost = (unitCost) => {
    const safeCost = sanitizeNumber(unitCost);
    if (safeCost <= 0) {
      alert('⚠️ Unit cost is invalid. Please recalculate.');
      return;
    }
    setManualData(prev => ({
      ...prev,
      productCost: safeCost.toFixed(2)
    }));
  };

  // �💾 SAVE ORDER
  const handleSave = async () => {
    const selectedInventoryId = String(manualData.inventoryId || '').trim();
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
    const selling = parseFloat(manualData.sellingPrice);
    const product = parseFloat(manualData.productCost);
    const delivery = parseFloat(manualData.deliveryCost);
    const ads = parseFloat(manualData.adCost);
    const discount = parseFloat(manualData.discountPrice);
    const safeCategory = normalizeCategory(manualData.category);
    const addedByFallback = currentUser?.displayName || currentUser?.email || '';
    const safeAddedBy = sanitizeInput(manualData.addedBy || addedByFallback || '');
    const inventoryId = sanitizeInput(selectedInventoryId);
    const selectedProductName = sanitizeInput(
      manualData.productName || manualData.subcategory || manualData.category || 'Unknown Product'
    );

    if (!selling || selling <= 0) {
      alert("⚠️ Stop! You must enter a Selling Price.");
      return;
    }

    // Calculate Profit for this single order
    const totalCost = (product || 0) + (delivery || 0) + (ads || 0);
    const netProfit = selling - totalCost;

    try {
      // 🛡️ SANITIZE ALL INPUTS BEFORE SAVING
      const createdOrder = await addDoc(collection(db, "orders"), {
        userId: currentUser.uid,
        workspaceId: effectiveWorkspaceId,
        originalText: sanitizeInput(inputText),
        name: sanitizeInput(manualData.name),
        phone: sanitizeInput(manualData.phone),
        address: sanitizeInput(manualData.address),
        sellingPrice: sanitizeNumber(selling),
        productCost: sanitizeNumber(product || 0),
        deliveryCost: sanitizeNumber(delivery || 0),
        adCost: sanitizeNumber(ads || 0),
        discountPrice: sanitizeNumber(discount || 0),
        category: sanitizeInput(safeCategory),
        productName: sanitizeInput(manualData.productName),
        inventoryId,
        subcategory: sanitizeInput(manualData.subcategory),
        sku: sanitizeInput(manualData.sku),
        addedBy: safeAddedBy,
        userPhone: sanitizeInput(manualData.userPhone),
        netProfit: netProfit,
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
      // SmartForm has no explicit quantity state, so each saved order deducts 1 unit.
      try {
        const orderQuantity = 1;

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

      // Reset Form
      setInputText(''); 
      setManualData({
        name: '', phone: '', address: '',
        sellingPrice: '', productCost: '',
        deliveryCost: 120, adCost: '',
        category: '', productName: '', inventoryId: '', subcategory: '', sku: '',
        discountPrice: '',
        addedBy: '', userPhone: ''
      });
      alert("✅ Order Saved!");
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
        sellingPrice: random.sell,
        productCost: random.cost
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
                    sku: previousData.sku
                  }));
                  return;
                }

                setManualData((previousData) => ({
                  ...previousData,
                  inventoryId: foundProduct.id,
                  productName: foundProduct.name || previousData.productName,
                  sku: foundProduct.sku || previousData.sku,
                  subcategory: foundProduct.subcategory || previousData.subcategory,
                  category: foundProduct.category || previousData.category
                }));
              }}
              className="w-full p-2 border rounded font-bold text-gray-700"
            >
              <option value="">Select from inventory</option>
              {inventoryOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
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
                <label className="block text-xs text-gray-500">Selling Price</label>
                <input 
                    type="number" 
                    value={manualData.sellingPrice}
                    onChange={(e) => setManualData({...manualData, sellingPrice: e.target.value})}
                    className="w-full p-2 border border-green-400 rounded font-bold text-green-700 bg-white"
                />
            </div>
            <div>
                <label className="block text-xs text-gray-500">Product Cost</label>
                <div className="flex gap-2 flex-wrap md:flex-nowrap">
                  <input 
                      type="number" 
                      value={manualData.productCost}
                      onChange={(e) => setManualData({...manualData, productCost: e.target.value})}
                      className="flex-1 min-w-[120px] p-2 border border-red-200 rounded text-red-600 bg-white text-sm"
                  />
                  {/* 👇 NEW: CALCULATOR BUTTON */}
                  <button 
                    onClick={() => setShowCalculator(true)}
                    title="Calculate unit cost from batch wholesale"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-2 md:px-3 rounded font-bold transition text-lg md:text-base flex-shrink-0"
                  >
                    🧮
                  </button>
                </div>
            </div>
            <div>
                <label className="block text-xs text-gray-500">Delivery (Auto)</label>
                <input 
                    type="number" 
                    value={manualData.deliveryCost}
                    onChange={(e) => setManualData({...manualData, deliveryCost: e.target.value})}
                    className="w-full p-2 border border-red-200 rounded text-red-600 bg-white"
                />
            </div>
            <div>
                <label className="block text-xs text-blue-600 font-bold">Ad Cost (CPR)</label>
                <input 
                    type="number" 
                    placeholder="e.g. 50"
                    value={manualData.adCost}
                    onChange={(e) => setManualData({...manualData, adCost: e.target.value})}
                    className="w-full p-2 border border-blue-300 rounded text-blue-700 font-bold bg-white shadow-sm"
                />
            </div>
            <div>
                <label className="block text-xs text-gray-500">Discount Price</label>
                <input 
                    type="number" 
                    value={manualData.discountPrice}
                    onChange={(e) => setManualData({...manualData, discountPrice: e.target.value})}
                    className="w-full p-2 border border-green-200 rounded font-bold text-green-700 bg-white"
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

      {/* 👇 NEW: CALCULATOR MODAL */}
      {showCalculator && (
        <UnitCostCalculator 
          onApplyCost={handleApplyUnitCost}
          onClose={() => setShowCalculator(false)}
        />
      )}
    </div>
  );
};

export default SmartForm; 