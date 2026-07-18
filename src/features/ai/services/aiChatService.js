/* src/features/ai/services/aiChatService.js */
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const STATIC_FALLBACK_CHAIN = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
const EXCLUDE_PATTERN = /image|tts|live|audio|preview|exp/i;
let cachedModelChain = null;

const parseVersion = (name) => {
  const m = name.match(/gemini-(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
};

const buildModelChain = async () => {
  if (cachedModelChain) return cachedModelChain;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    if (!res.ok) return STATIC_FALLBACK_CHAIN;
    const data = await res.json();
    const chain = (data.models || [])
      .filter(m =>
        m.supportedGenerationMethods?.includes('generateContent') &&
        /flash/i.test(m.name) &&
        !EXCLUDE_PATTERN.test(m.name)
      )
      .map(m => m.name.replace('models/', ''))
      .sort((a, b) => {
        const v = parseVersion(b) - parseVersion(a);
        if (v !== 0) return v;
        // same version: plain flash before flash-lite
        return (a.includes('lite') ? 1 : 0) - (b.includes('lite') ? 1 : 0);
      });
    cachedModelChain = chain.length ? chain : STATIC_FALLBACK_CHAIN;
  } catch {
    cachedModelChain = STATIC_FALLBACK_CHAIN;
  }
  return cachedModelChain;
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const buildSystemPrompt = (ctx = {}) =>
  `You are MunafaOS Business Assistant — an AI advisor for Bangladesh F-commerce sellers.

Live business data for this seller:

LAST 30 DAYS:
• Orders: ${ctx.orderCount ?? 0}
• Revenue: ৳${ctx.revenue ?? 0}
• Net Profit: ৳${ctx.netProfit ?? 0}
• Return Rate: ${ctx.returnRate ?? 0}%
• Top Cities: ${ctx.topCities?.length ? ctx.topCities.join(', ') : 'unknown'}
• Top Channels: ${ctx.topChannels?.length ? ctx.topChannels.join(', ') : 'unknown'}

ALL-TIME:
• Total Orders: ${ctx.allTimeOrderCount ?? 0}
• Revenue: ৳${ctx.allTimeRevenue ?? 0}
• Net Profit: ৳${ctx.allTimeNetProfit ?? 0}
• Return Rate: ${ctx.allTimeReturnRate ?? 0}%
• Pending/Unresolved Orders: ${ctx.pendingCount ?? 0}

INVENTORY:
• Low Stock Items: ${ctx.lowStockCount ?? 0}
• Total SKUs: ${ctx.inventoryCount ?? 0}

Your role: Answer questions about their business, identify trends, and give actionable profit advice specific to Bangladesh F-commerce.

Language rule: Match the user’s language and script in every reply.
• Banglish input (Bengali written in English letters) → reply in Banglish
• Native Bengali script input → reply in native Bengali script
• English input → reply in English
• If the user explicitly asks to switch language or script (e.g. "Bangla te bolo", "বাংলায় উত্তর দাও", "reply in Bangla script", "switch back to English") → switch immediately and keep using that language for ALL remaining replies. IMPORTANT: an explicit switch OVERRIDES the script-matching rules above — even if the user's later messages arrive in a different language or script, keep replying in the explicitly chosen language until the user explicitly asks to switch again.
• Always use ৳ Taka for all currency. Keep responses concise and practical.`;

/**
 * Send a message in an ongoing AI chat session.
 * @param {Array}  history         Prior messages [{role:'user'|'model', content:string}]
 * @param {string} userMessage     New message from the user
 * @param {object} businessContext Live business data to inject into system prompt
 * @returns {Promise<string>}      AI response text
 */
export const sendChatMessage = async (
  history = [],
  userMessage,
  businessContext = {}
) => {
  if (!API_KEY) throw new Error('Gemini API key is not configured.');
  if (!userMessage?.trim()) throw new Error('Message cannot be empty.');

  const geminiHistory = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  const getResponse = async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: buildSystemPrompt(businessContext),
    });
    const chat = model.startChat({
      history: geminiHistory,
      generationConfig: { maxOutputTokens: 2000 },
    });
    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  };

  const chain = await buildModelChain();
  let lastError = null;

  for (const modelName of chain) {
    try {
      return await getResponse(modelName);
    } catch (err) {
      lastError = err;
      const msg = String(err?.message || '');
      if (msg.includes('503')) {
        // transient overload: one retry after 1s, then move on
        await sleep(1000);
        try {
          return await getResponse(modelName);
        } catch (retryErr) {
          lastError = retryErr;
          continue;
        }
      }
      if (msg.includes('429') || msg.includes('not found') || msg.includes('not supported')) {
        continue; // quota or dead model: next model in chain
      }
      throw err; // unknown error: propagate immediately
    }
  }
  throw lastError;
};
