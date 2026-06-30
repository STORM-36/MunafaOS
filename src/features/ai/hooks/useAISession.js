import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, limit,
  getDocs, getDoc, doc, updateDoc, setDoc, serverTimestamp, increment
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../auth/context/AuthContext';
import { sendChatMessage } from '../services/aiChatService';

const generateSessionId = () =>
  `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const useAISession = () => {
  const { currentUser, workspaceId } = useAuth();

  const [sessionId, setSessionId]       = useState(() => generateSessionId());
  const [messages, setMessages]         = useState([]);
  const [tokenCharged, setTokenCharged] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [sessions, setSessions]         = useState([]);
  const [businessContext, setBusinessContext] = useState({});
  const [contextLoading, setContextLoading]   = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    fetchBusinessContext();
    fetchSessionHistory();
  }, [workspaceId]);

  const fetchBusinessContext = async () => {
    setContextLoading(true);
    try {
      const [ordersSnap, invSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'orders'),
          where('workspaceId', '==', workspaceId)
        )),
        getDocs(query(
          collection(db, 'inventory'),
          where('workspaceId', '==', workspaceId)
        )),
      ]);

      const allOrders = ordersSnap.docs.map(d => d.data());
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recent = allOrders.filter(o => (o.createdAt?.toMillis?.() || 0) >= cutoff);

      const delivered = recent.filter(o => o.status === 'Delivered');
      const returned  = recent.filter(o => o.status === 'Returned');
      const shipped   = delivered.length + returned.length;

      const revenue   = delivered.reduce((s, o) => s + (o.grossRevenue || 0), 0);
      const netProfit = delivered.reduce((s, o) => s + (o.trueNetProfit || o.netProfit || 0), 0);
      const returnRate = shipped > 0
        ? ((returned.length / shipped) * 100).toFixed(1)
        : '0.0';

      const cityMap = {};
      const channelMap = {};
      recent.forEach(o => {
        const city = o.city || 'Other';
        const ch   = o.channel || 'Other';
        cityMap[city]     = (cityMap[city] || 0) + 1;
        channelMap[ch]    = (channelMap[ch] || 0) + 1;
      });

      const topCities = Object.entries(cityMap)
        .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
      const topChannels = Object.entries(channelMap)
        .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);

      const inventory = invSnap.docs.map(d => d.data());
      const lowStockCount = inventory.filter(i => (i.quantity || 0) <= 3).length;

      setBusinessContext({
        orderCount:    recent.length,
        revenue:       Math.round(revenue),
        netProfit:     Math.round(netProfit),
        returnRate,
        lowStockCount,
        inventoryCount: inventory.length,
        topCities,
        topChannels,
      });
    } catch (err) {
      console.error('Business context fetch failed:', err);
    } finally {
      setContextLoading(false);
    }
  };

  const fetchSessionHistory = async () => {
    if (!workspaceId) return;
    try {
      const snap = await getDocs(query(
        collection(db, 'ai_sessions'),
        where('workspaceId', '==', workspaceId),
        orderBy('updatedAt', 'desc'),
        limit(20)
      ));
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Session history fetch failed:', err);
    }
  };

  const persistSession = async (msgs, isNew) => {
    if (!workspaceId || !currentUser?.uid) return;
    const title = msgs.find(m => m.role === 'user')?.content?.slice(0, 40) || 'New Chat';
    const data = {
      workspaceId,
      userId:       currentUser.uid,
      title,
      messages:     msgs,
      tokenCharged: true,
      updatedAt:    serverTimestamp(),
    };
    if (isNew) data.createdAt = serverTimestamp();
    await setDoc(doc(db, 'ai_sessions', sessionId), data, { merge: true });
  };

  const deductTokens = async () => {
    const userRef  = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);
    const balance  = userSnap.data()?.tokenBalance ?? 0;
    if (balance < 5) throw new Error('insufficient_tokens');
    await updateDoc(userRef, { tokenBalance: increment(-5) });
  };

  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || loading) return;
    setError(null);

    const userMsg = { role: 'user', content: text.trim(), timestamp: Date.now() };
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    setLoading(true);

    try {
      const isNew = !tokenCharged;
      if (isNew) {
        await deductTokens();
        setTokenCharged(true);
      }

      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const reply   = await sendChatMessage(history, text.trim(), businessContext);

      const aiMsg   = { role: 'model', content: reply, timestamp: Date.now() };
      const final   = [...withUser, aiMsg];
      setMessages(final);

      await persistSession(final, isNew);
      fetchSessionHistory();
    } catch (err) {
      if (err.message === 'insufficient_tokens') {
        setError(
          'You need 5 tokens to start a new chat session. Please top up your token balance.'
        );
      } else {
        setError('Something went wrong. Please try again.');
        console.error('sendMessage error:', err);
      }
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, tokenCharged, businessContext, sessionId, workspaceId, currentUser]);

  const startNewChat = useCallback(() => {
    setSessionId(generateSessionId());
    setMessages([]);
    setTokenCharged(false);
    setError(null);
  }, []);

  const loadSession = useCallback((sess) => {
    setSessionId(sess.id);
    setMessages(sess.messages || []);
    setTokenCharged(true);
    setError(null);
  }, []);

  return {
    messages,
    sessionId,
    tokenCharged,
    loading,
    error,
    sessions,
    businessContext,
    contextLoading,
    sendMessage,
    startNewChat,
    loadSession,
  };
};
