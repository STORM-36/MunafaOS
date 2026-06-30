/* src/features/ai/services/aiChatService.js */
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const MODEL_PRIMARY = 'gemini-1.5-flash-latest';
const MODEL_FALLBACK = 'gemini-1.5-flash';

const pickModel = async () => {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    if (!res.ok) return MODEL_PRIMARY;
    const data = await res.json();
    const candidates = (data.models || []).filter(m =>
      m.supportedGenerationMethods?.includes('generateContent')
    );
    const preferred =
      candidates.find(m => m.name?.endsWith('/gemini-1.5-flash')) ||
      candidates.find(m => m.name?.endsWith('/gemini-1.5-flash-latest')) ||
      candidates.find(m => m.name?.endsWith('/gemini-1.5-pro')) ||
      candidates[0];
    return preferred?.name ? preferred.name.replace('models/', '') : MODEL_PRIMARY;
  } catch {
    return MODEL_PRIMARY;
  }
};

const buildSystemPrompt = (ctx = {}) =>
  `You are MunafaOS Business Assistant — an AI advisor for Bangladesh F-commerce sellers.

Live business data for this seller:
• Orders last 30 days: ${ctx.orderCount ?? 'unknown'}
• Revenue: ৳${ctx.revenue ?? 'unknown'}
• Net Profit: ৳${ctx.netProfit ?? 'unknown'}
• Return Rate: ${ctx.returnRate ?? 'unknown'}%
• Low Stock Items: ${ctx.lowStockCount ?? 'unknown'}
• Total SKUs: ${ctx.inventoryCount ?? 'unknown'}
• Top Cities: ${ctx.topCities?.length ? ctx.topCities.join(', ') : 'unknown'}
• Top Channels: ${ctx.topChannels?.length ? ctx.topChannels.join(', ') : 'unknown'}

Your role: Answer questions about their business, identify trends, and give actionable profit advice specific to Bangladesh F-commerce.

Language rule: Match the user’s language in every reply.
• Bengali or Banglish input → reply in Banglish (Bengali using English letters)
• English input → reply in English
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

  const selectedModel = await pickModel();

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
      generationConfig: { maxOutputTokens: 800 },
    });
    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  };

  try {
    return await getResponse(selectedModel);
  } catch (err) {
    const msg = String(err?.message || '');
    if (
      msg.includes('not found') ||
      msg.includes('not supported') ||
      msg.includes('503')
    ) {
      return await getResponse(MODEL_FALLBACK);
    }
    throw err;
  }
};
