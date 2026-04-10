/* src/services/aiService.js */

import { GoogleGenerativeAI } from "@google/generative-ai";

// 🔒 API KEY VALIDATION
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ CRITICAL: VITE_GEMINI_API_KEY is not defined in .env file!");
  alert("⚠️ Gemini API Key is missing! Check your .env file.");
}

const maskedKey = API_KEY ? `${API_KEY.slice(0, 6)}...${API_KEY.slice(-4)}` : "(missing)";
console.log("🔑 Gemini API Key Status:", API_KEY ? `✅ Found (${maskedKey})` : "❌ Missing");

// 1. Initialize the AI with your secure key
const genAI = new GoogleGenerativeAI(API_KEY);

const MODEL_PRIMARY = "gemini-1.5-flash-latest";
const MODEL_FALLBACK = "gemini-1.5-flash";

const listAvailableModels = async () => {
  if (!API_KEY) return [];
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Model list failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return Array.isArray(data.models) ? data.models : [];
};

const pickModelName = (models) => {
  const candidates = models.filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"));
  const preferred = candidates.find((m) => m.name?.endsWith("/gemini-1.5-flash"))
    || candidates.find((m) => m.name?.endsWith("/gemini-1.5-flash-latest"))
    || candidates.find((m) => m.name?.endsWith("/gemini-1.5-pro"))
    || candidates[0];

  if (!preferred?.name) return null;
  return preferred.name.replace("models/", "");
};

/**
 * This function takes messy text and returns clean JSON data.
 * @param {string} rawText - The text the user pasted (e.g., "Red Shirt 500tk")
 * @returns {object} - Structured data { name, price, qty, etc. }
 */
export const parseProductWithAI = async (rawText) => {
  const normalizedText = String(rawText || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const trimmedText = normalizedText.length > 800
    ? normalizedText.slice(0, 800)
    : normalizedText;

  if (normalizedText.length > 800) {
    console.warn("⚠️ AI input trimmed to 800 chars for reliability.");
  }

  console.log("🚀 AI Service Called with input:", trimmedText);
  
  // Check API key again before making request
  if (!API_KEY) {
    console.error("❌ Cannot proceed - API key is missing");
    alert("⚠️ Gemini API Key is not configured. Add VITE_GEMINI_API_KEY to your .env file.");
    return null;
  }

  try {
    let selectedModel = MODEL_PRIMARY;
    try {
      console.log("🔎 Checking available Gemini models...");
      const models = await listAvailableModels();
      const discovered = pickModelName(models);
      if (discovered) {
        selectedModel = discovered;
      }
    } catch (listError) {
      console.warn("⚠️ Could not list models, using default.", listError);
    }

    console.log(`⚙️ Initializing Gemini model: ${selectedModel}...`);
    
    // 2. Select the Model (Gemini Flash is fast and free)
    let model = genAI.getGenerativeModel({ model: selectedModel });

    // 3. The Prompt (The Instructions)
    // Enhanced for Banglish (Bengali written in English)
    const prompt = `
      You are a smart inventory assistant for a Bangladeshi e-commerce shop.
      Extract product details from this text: "${trimmedText}".
      
      IMPORTANT CONTEXT:
      - The text may be long and chatty (greetings, filler, extra sentences).
      - Ignore irrelevant text and focus only on product name, quantity, and price.
      - Text may be in "Banglish" (Bengali written with English letters).
      - Common Bangladeshi terms: "tk" = Taka (currency), "pcs/piece/ta" = pieces/quantity
      - Example: "lal shirt 50 ta 500tk" means "Red Shirt, 50 pieces, 500 taka each"
      
      EXTRACTION RULES:
      - Product Name: Extract the item name (e.g., "T-shirt", "Jacket", "Phone")
      - Price: Look for numbers with 'tk', 'taka', 'price', 'dam' (price in Banglish)
      - Quantity: Look for numbers with 'pcs', 'piece', 'ta', 'guti', 'qty', 'items'
      - Color: Extract if mentioned (e.g., "red", "lal", "blue", "nil")
      - Category: Choose from these categories only:
        Clothing, Electronics, Home, Beauty, Grocery, Accessories, Kids, Sports,
        Stationery, Health, Footwear, Bags, Kitchen, Tools, Mobile, Other
      
      CRITICAL:
      - Return ONLY a valid JSON object. No markdown, no explanations, no extra text.
      - If you can't extract something, use null for that field.
      
      Required JSON Format:
      {
        "name": "Product Name",
        "price": Number,
        "quantity": Number,
        "color": "String or null",
        "category": "String or null"
      }
    `;

    console.log("📤 Sending request to Gemini API...");
    
    // 4. Send the request to Google
    let result = await model.generateContent(prompt);
    console.log("📥 Raw API Response received:", result);
    
    const response = await result.response;
    console.log("📄 Response object:", response);
    
    const text = response.text();
    console.log("📝 Response text:", text);

    // 5. Clean the response (sometimes AI adds ```json ... ``` blocks)
    const cleanText = text.replace(/```json|```/g, "").trim();
    console.log("🧹 Cleaned text:", cleanText);

    // 6. Convert Text to JavaScript Object
    const parsedData = JSON.parse(cleanText);
    console.log("✅ Successfully parsed JSON:", parsedData);
    
    return parsedData;

  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("not found") || message.includes("not supported")) {
      console.warn(`Model not found. Retrying with fallback: ${MODEL_FALLBACK}`);
      try {
        const fallbackModel = genAI.getGenerativeModel({ model: MODEL_FALLBACK });
        const fallbackResult = await fallbackModel.generateContent(prompt);
        const fallbackResponse = await fallbackResult.response;
        const fallbackText = fallbackResponse.text();
        const fallbackCleanText = fallbackText.replace(/```json|```/g, "").trim();
        const fallbackParsed = JSON.parse(fallbackCleanText);
        console.log("✅ Parsed JSON from fallback model:", fallbackParsed);
        return fallbackParsed;
      } catch (fallbackError) {
        console.error("Fallback model error:", fallbackError);
      }

      try {
        console.warn("Attempting model discovery via listModels...");
        const models = await listAvailableModels();
        const discovered = pickModelName(models);
        if (discovered) {
          console.log(`✅ Discovered supported model: ${discovered}`);
          const discoveredModel = genAI.getGenerativeModel({ model: discovered });
          const discoveredResult = await discoveredModel.generateContent(prompt);
          const discoveredResponse = await discoveredResult.response;
          const discoveredText = discoveredResponse.text();
          const discoveredCleanText = discoveredText.replace(/```json|```/g, "").trim();
          const discoveredParsed = JSON.parse(discoveredCleanText);
          console.log("✅ Parsed JSON from discovered model:", discoveredParsed);
          return discoveredParsed;
        }
      } catch (discoveryError) {
        console.error("Model discovery failed:", discoveryError);
      }
    }
    console.error("❌ AI Parsing Error Details:");
    console.error("Error Type:", error.constructor.name);
    console.error("Error Message:", error.message);
    console.error("Full Error:", error);
    console.error("Error Stack:", error.stack);
    
    // Check if it's a response error from Gemini
    if (error.response) {
      console.error("API Response Error:", error.response);
    }
    
    // Provide specific error messages
    if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("API key not valid")) {
      alert("⚠️ Invalid Gemini API Key!\n\n1. Check your .env file\n2. Verify key at: https://aistudio.google.com/app/apikey");
    } else if (error.message?.includes("billing") || error.message?.includes("quota")) {
      alert("⚠️ Gemini API Error!\n\nYour API might need:\n1. Billing enabled in Google Cloud\n2. Generative Language API enabled\n\nVisit: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com");
    } else if (error.message?.includes("403") || error.message?.includes("permission")) {
      alert("⚠️ API Permission Denied!\n\n1. Enable 'Generative Language API' in Google Cloud Console\n2. Check API restrictions on your key\n\nVisit: https://console.cloud.google.com/apis/library");
    } else if (error.message?.includes("JSON")) {
      alert("⚠️ AI returned invalid format. Try simpler text.");
      console.error("The AI response couldn't be parsed as JSON.");
    } else if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
      alert("⚠️ Cannot reach Gemini API!\n\nPossible fixes:\n1. Enable 'Generative Language API' at:\n   https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com\n\n2. Check if API key is valid at:\n   https://aistudio.google.com/app/apikey\n\n3. Try a different browser (disable extensions)\n\nError: " + error.message);
    } else {
      alert("⚠️ AI Error: " + error.message + "\n\nCheck browser console (F12) for details.");
    }
    
    return null; // Return null so the UI knows it failed
  }
};

/**
 * Extract multiple products from a single messy text (Bulk Import)
 * @param {string} rawText - Long supplier message with multiple products
 * @returns {Array} - Array of products [{name, price, quantity, color, category}, ...]
 */
export const parseMultipleProductsWithAI = async (rawText) => {
  const normalizedText = String(rawText || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const trimmedText = normalizedText.length > 2000
    ? normalizedText.slice(0, 2000)
    : normalizedText;

  if (normalizedText.length > 2000) {
    console.warn("⚠️ Bulk import input trimmed to 2000 chars for reliability.");
  }

  console.log("📦 Bulk Import Service Called with input:", trimmedText);
  
  // Check API key
  if (!API_KEY) {
    console.error("❌ Cannot proceed - API key is missing");
    alert("⚠️ Gemini API Key is not configured. Add VITE_GEMINI_API_KEY to your .env file.");
    return [];
  }

  try {
    let selectedModel = MODEL_PRIMARY;
    try {
      console.log("🔎 Checking available Gemini models for bulk import...");
      const models = await listAvailableModels();
      const discovered = pickModelName(models);
      if (discovered) {
        selectedModel = discovered;
      }
    } catch (listError) {
      console.warn("⚠️ Could not list models, using default.", listError);
    }

    console.log(`⚙️ Initializing Gemini model for bulk import: ${selectedModel}...`);
    
    const model = genAI.getGenerativeModel({ model: selectedModel });

    const prompt = `
      You are a smart inventory assistant for a Bangladeshi e-commerce shop.
      Extract ALL products from this supplier message: "${trimmedText}".
      
      IMPORTANT CONTEXT:
      - This message contains MULTIPLE products (could be 2-20 items).
      - The text may be long, chatty, and contain greetings or filler.
      - Text may be in "Banglish" (Bengali written with English letters).
      - Common Bangladeshi terms: "tk" = Taka (currency), "pcs/piece/ta" = pieces/quantity
      - Example: "lal shirt 50 ta 500tk, nil shirt 30 ta 450tk" = 2 products
      
      EXTRACTION RULES:
      - Extract EVERY product mentioned in the text.
      - For each product, capture:
        * Product Name: Extract the item name (e.g., "T-shirt", "Jacket", "Phone")
        * Price: Look for numbers with 'tk', 'taka', 'price', 'dam' (per unit price)
        * Quantity: Look for numbers with 'pcs', 'piece', 'ta', 'guti', 'qty', 'items'
        * Color: Extract if mentioned (e.g., "red", "lal", "blue", "nil")
        * Category: Choose from these categories only:
          Clothing, Electronics, Home, Beauty, Grocery, Accessories, Kids, Sports,
          Stationery, Health, Footwear, Bags, Kitchen, Tools, Mobile, Other
      
      CRITICAL FORMATTING:
      - Return ONLY a valid JSON Array [].
      - Each product must be a separate object in the array.
      - No markdown, no explanations, no extra text outside the array.
      - If you can't extract a field, use null for that field.
      - If no products found, return empty array [].
      
      Required JSON Format (MUST BE AN ARRAY):
      [
        {
          "name": "Product Name 1",
          "price": Number,
          "quantity": Number,
          "color": "String or null",
          "category": "String or null"
        },
        {
          "name": "Product Name 2",
          "price": Number,
          "quantity": Number,
          "color": "String or null",
          "category": "String or null"
        }
      ]
      
      IMPORTANT: The response MUST start with [ and end with ]. Nothing before or after the array.
    `;

    console.log("📤 Sending bulk import request to Gemini API...");
    
    let result = await model.generateContent(prompt);
    console.log("📥 Bulk import response received:", result);
    
    const response = await result.response;
    const text = response.text();
    console.log("📝 Response text:", text);

    // Clean the response - handle both ```json and ``` markers, and array markers
    let cleanText = text.replace(/```json|```/g, "").trim();
    
    // Ensure we have array brackets
    if (!cleanText.startsWith('[')) {
      // Try to find array start
      const arrayStart = cleanText.indexOf('[');
      if (arrayStart !== -1) {
        cleanText = cleanText.substring(arrayStart);
      }
    }
    if (!cleanText.endsWith(']')) {
      // Try to find array end
      const arrayEnd = cleanText.lastIndexOf(']');
      if (arrayEnd !== -1) {
        cleanText = cleanText.substring(0, arrayEnd + 1);
      }
    }
    
    console.log("🧹 Cleaned text:", cleanText);

    // Parse the array
    const parsedData = JSON.parse(cleanText);
    
    // Validate it's an array
    if (!Array.isArray(parsedData)) {
      console.error("❌ Expected array, got:", typeof parsedData);
      alert("⚠️ AI returned invalid format (not an array). Try again.");
      return [];
    }
    
    console.log(`✅ Successfully parsed ${parsedData.length} products:`, parsedData);
    
    return parsedData;

  } catch (error) {
    const message = String(error?.message || "");
    
    // Try fallback model
    if (message.includes("not found") || message.includes("not supported")) {
      console.warn(`Model not found. Retrying bulk import with fallback: ${MODEL_FALLBACK}`);
      try {
        const fallbackModel = genAI.getGenerativeModel({ model: MODEL_FALLBACK });
        const fallbackResult = await fallbackModel.generateContent(prompt);
        const fallbackResponse = await fallbackResult.response;
        const fallbackText = fallbackResponse.text();
        let fallbackCleanText = fallbackText.replace(/```json|```/g, "").trim();
        
        // Ensure array brackets
        if (!fallbackCleanText.startsWith('[')) {
          const arrayStart = fallbackCleanText.indexOf('[');
          if (arrayStart !== -1) fallbackCleanText = fallbackCleanText.substring(arrayStart);
        }
        if (!fallbackCleanText.endsWith(']')) {
          const arrayEnd = fallbackCleanText.lastIndexOf(']');
          if (arrayEnd !== -1) fallbackCleanText = fallbackCleanText.substring(0, arrayEnd + 1);
        }
        
        const fallbackParsed = JSON.parse(fallbackCleanText);
        
        if (Array.isArray(fallbackParsed)) {
          console.log(`✅ Parsed ${fallbackParsed.length} products from fallback model:`, fallbackParsed);
          return fallbackParsed;
        }
      } catch (fallbackError) {
        console.error("Fallback model error:", fallbackError);
      }

      // Try model discovery
      try {
        console.warn("Attempting bulk import model discovery via listModels...");
        const models = await listAvailableModels();
        const discovered = pickModelName(models);
        if (discovered) {
          console.log(`✅ Discovered supported model: ${discovered}`);
          const discoveredModel = genAI.getGenerativeModel({ model: discovered });
          const discoveredResult = await discoveredModel.generateContent(prompt);
          const discoveredResponse = await discoveredResult.response;
          const discoveredText = discoveredResponse.text();
          let discoveredCleanText = discoveredText.replace(/```json|```/g, "").trim();
          
          // Ensure array brackets
          if (!discoveredCleanText.startsWith('[')) {
            const arrayStart = discoveredCleanText.indexOf('[');
            if (arrayStart !== -1) discoveredCleanText = discoveredCleanText.substring(arrayStart);
          }
          if (!discoveredCleanText.endsWith(']')) {
            const arrayEnd = discoveredCleanText.lastIndexOf(']');
            if (arrayEnd !== -1) discoveredCleanText = discoveredCleanText.substring(0, arrayEnd + 1);
          }
          
          const discoveredParsed = JSON.parse(discoveredCleanText);
          
          if (Array.isArray(discoveredParsed)) {
            console.log(`✅ Parsed ${discoveredParsed.length} products from discovered model:`, discoveredParsed);
            return discoveredParsed;
          }
        }
      } catch (discoveryError) {
        console.error("Model discovery failed:", discoveryError);
      }
    }
    
    console.error("❌ Bulk Import Error Details:");
    console.error("Error Type:", error.constructor.name);
    console.error("Error Message:", error.message);
    console.error("Full Error:", error);
    
    // Specific error messages
    if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("API key not valid")) {
      alert("⚠️ Invalid Gemini API Key!\n\nCheck your .env file.");
    } else if (error.message?.includes("billing") || error.message?.includes("quota")) {
      alert("⚠️ Gemini API needs billing enabled in Google Cloud Console.");
    } else if (error.message?.includes("JSON")) {
      alert("⚠️ AI returned invalid format for bulk import. Try simpler text or fewer products.");
      console.error("The AI response couldn't be parsed as JSON array.");
    } else if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
      alert("⚠️ Cannot reach Gemini API. Check your internet connection.");
    } else {
      alert("⚠️ Bulk Import Error: " + error.message + "\n\nCheck browser console (F12) for details.");
    }
    
    return []; // Return empty array on failure
  }
};

/**
 * Extract product details from an image using Gemini Vision API
 * @param {File|string} imageInput - Image file or base64 string
 * @returns {object} - Structured data { name, price, quantity, color, category }
 */
export const parseProductFromImage = async (imageInput) => {
  if (!API_KEY) {
    console.error("❌ Cannot proceed - API key is missing");
    alert("⚠️ Gemini API Key is not configured.");
    return null;
  }

  const normalizeNumber = (value) => {
    if (value === null || value === undefined) return null;
    const cleaned = String(value).replace(/,/g, "").replace(/[^\d.]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  };

  try {
    console.log("📷 Image OCR Service Called...");

    // Convert File to base64 if needed
    let base64Image = "";
    let mimeType = "image/jpeg";

    if (imageInput instanceof File) {
      mimeType = imageInput.type || "image/jpeg";
      base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageInput);
      });
    } else if (typeof imageInput === "string") {
      base64Image = imageInput.includes(",")
        ? imageInput.split(",")[1]
        : imageInput;
    }

    if (!base64Image) throw new Error("Failed to process image");

    console.log("🔎 Checking available Gemini models for vision...");
    let selectedModel = MODEL_PRIMARY;
    try {
      const models = await listAvailableModels();
      const discovered = pickModelName(models);
      if (discovered) selectedModel = discovered;
    } catch (listError) {
      console.warn("⚠️ Could not list models, using default.", listError);
    }

    console.log(`⚙️ Initializing Gemini Vision model: ${selectedModel}...`);
    const model = genAI.getGenerativeModel({ model: selectedModel });

    const prompt = `
      You are an OCR-to-structured-data extraction engine.

      TASK:
      Extract product and transaction information from the image.

      IMPORTANT RULES:
      1. Only extract information that is clearly visible in the image.
      2. Do NOT guess missing values.
      3. If a field is not visible, return null.
      4. If multiple products appear, extract only the most prominent product.
      5. If this is an invoice, prioritize:
         - unit price over total price
         - product-level data over summary totals
      6. If both original price and discount price exist, select the discount price as selling_price.
      7. Normalize numbers:
         - Remove commas
         - Convert to plain number format
         - Do not include currency symbols
      8. Detect Bangla and English text.

      Return output strictly in valid JSON format. No explanation text.

      CATEGORY RULES:
      - Choose one category from this list:
        Clothing, Electronics, Home, Beauty, Grocery, Accessories, Kids, Sports,
        Stationery, Health, Footwear, Bags, Kitchen, Tools, Mobile, Other
      - If unsure, use "Other".

      Return JSON using this exact structure:
      {
        "identity": {
          "name": null,
          "brand": null,
          "model": null,
          "sku": null,
          "barcode": null
        },
        "variant": {
          "color": null,
          "size": null,
          "weight": null,
          "volume": null,
          "material": null
        },
        "pricing": {
          "selling_price": null,
          "cost_price": null,
          "mrp": null,
          "discount_price": null,
          "currency": null
        },
        "inventory": {
          "quantity": null,
          "unit": null,
          "batch_number": null,
          "expiry_date": null
        },
        "business": {
          "shop_name": null,
          "supplier_name": null,
          "invoice_number": null,
          "date": null
        },
        "classification": {
          "category": null,
          "subcategory": null
        },
        "metadata": {
          "multi_product_detected": false,
          "confidence_score": 0.0
        }
      }
    `;

    console.log("📤 Sending image to Gemini Vision API...");

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      },
      prompt
    ]);

    console.log("📥 Vision API Response received");

    const response = await result.response;
    const text = response.text();
    console.log("📝 Response text:", text);

    const cleanText = text.replace(/```json|```/g, "").trim();
    console.log("🧹 Cleaned text:", cleanText);

    const parsedData = JSON.parse(cleanText);
    if (parsedData?.pricing) {
      parsedData.pricing.selling_price = normalizeNumber(parsedData.pricing.selling_price);
      parsedData.pricing.cost_price = normalizeNumber(parsedData.pricing.cost_price);
      parsedData.pricing.mrp = normalizeNumber(parsedData.pricing.mrp);
      parsedData.pricing.discount_price = normalizeNumber(parsedData.pricing.discount_price);
      parsedData.pricing.currency = "BDT";
    }
    if (parsedData?.inventory) {
      parsedData.inventory.quantity = normalizeNumber(parsedData.inventory.quantity);
    }
    if (parsedData?.metadata) {
      parsedData.metadata.confidence_score = normalizeNumber(parsedData.metadata.confidence_score) || 0.0;
      parsedData.metadata.multi_product_detected = Boolean(parsedData.metadata.multi_product_detected);
    }

    console.log("✅ Successfully parsed image data:", parsedData);

    return parsedData;

  } catch (error) {
    console.error("❌ Image OCR Error:", error);

    if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("API key")) {
      alert("⚠️ Invalid Gemini API Key! Check your .env file.");
    } else if (error.message?.includes("billing") || error.message?.includes("quota")) {
      alert("⚠️ Gemini API needs billing enabled in Google Cloud Console.");
    } else if (error.message?.includes("JSON")) {
      alert("⚠️ Could not extract text from image. Try a clearer photo.");
    } else if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
      alert("⚠️ Cannot reach Gemini API. Check your internet connection.");
    } else {
      alert("⚠️ Image OCR Error: " + error.message);
    }

    return null;
  }
};

export const parseCustomerWithAI = 
  async (rawText) => {
  try {
    let selectedModel = MODEL_PRIMARY;
    try {
      const models = await listAvailableModels();
      const discovered = pickModelName(models);
      if (discovered) {
        selectedModel = discovered;
      }
    } catch (listError) {
      console.warn(
        "⚠️ Could not list models, using default.", 
        listError
      );
    }
    const model = genAI.getGenerativeModel({ 
      model: selectedModel 
    });

    const prompt = `
You are a data extraction assistant 
for a Bangladesh e-commerce platform.

Extract customer information from this 
order message. The message may be in 
Bengali, English, or Banglish (mixed).

Labels to recognize:
- Name labels: নাম, নাম:, Name:, 
  Customer:, Customer name:, নামঃ
- Phone labels: ফোন, মোবাইল, Phone:, 
  Mobile:, Contact:, Number:
- Address labels: ঠিকানা, ঠিকানাঃ, 
  Address:, Delivery address:, বাসা

Rules:
- If no label found, first short line 
  is likely the name
- Phone is always 11 digits starting 
  with 01 (convert Bengali digits first)
- Everything else is the address
- Return ONLY valid JSON, no explanation

Message:
"""
${rawText}
"""

Return this exact JSON format:
{
  "name": "extracted name or empty string",
  "phone": "extracted phone or empty string",
  "address": "extracted address or empty string"
}`;

    const result = await 
      model.generateContent(prompt);
    const response = result.response
      .text().trim();

    const clean = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(clean);
    console.log("AI parsed result:", parsed);

    return {
      name: String(parsed.name || ""),
      phone: String(parsed.phone || ""),
      address: String(parsed.address || "")
    };

  } catch (error) {
    console.error(
      "AI customer parse error:", error
    );
    return { 
      name: "", 
      phone: "", 
      address: "" 
    };
  }
};