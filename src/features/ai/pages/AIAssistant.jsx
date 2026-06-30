import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAISession } from '../hooks/useAISession';
import { useAuth } from '../../auth/context/AuthContext';
import {
  Bot, Send, Plus, MessageSquare,
  Coins, ChevronLeft, Loader2
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  'What is my best performing city this month?',
  'How can I reduce my return rate?',
  'Which channel brings the most profit?',
  'What should I restock urgently?',
];

const AIAssistant = () => {
  const {
    messages, loading, error, sessions,
    businessContext, contextLoading,
    sendMessage, startNewChat, loadSession,
    tokenCharged,
  } = useAISession();

  const { currentUser } = useAuth();

  const [input, setInput]               = useState('');
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [displayBalance, setDisplayBalance] = useState(
    currentUser?.tokenBalance ?? 0
  );
  const messagesEndRef    = useRef(null);
  const prevTokenCharged  = useRef(false);
  const textareaRef       = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!prevTokenCharged.current && tokenCharged) {
      setDisplayBalance(prev => Math.max(0, prev - 5));
    }
    prevTokenCharged.current = tokenCharged;
  }, [tokenCharged]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || loading) return;
    sendMessage(text);
    setInput('');
    textareaRef.current?.focus();
  }, [input, loading, sendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleNewChat = useCallback(() => {
    startNewChat();
    setInput('');
  }, [startNewChat]);

  const handleLoadSession = useCallback((sess) => {
    loadSession(sess);
    setInput('');
  }, [loadSession]);

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const formatSessionDate = (sess) => {
    const ts = sess.updatedAt?.toDate?.() || sess.updatedAt;
    if (!ts) return '';
    const d    = new Date(ts);
    const diff = Date.now() - d;
    if (diff < 86400000)  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (diff < 604800000) return d.toLocaleDateString('en-US', { weekday: 'short' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: '#F6F8FC', overflow: 'hidden' }}>
      <style>{`@keyframes munafaSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.munafa-spin{animation:munafaSpin 1s linear infinite}`}</style>

      <div style={{
        width: sidebarOpen ? '260px' : '0px', minWidth: sidebarOpen ? '260px' : '0px',
        background: '#0F1F3D', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', transition: 'all 0.25s ease',
        borderRight: '1px solid rgba(232,184,75,0.2)', flexShrink: 0,
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <button type="button" onClick={handleNewChat} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 14px', background: 'rgba(232,184,75,0.12)',
            border: '1px solid rgba(232,184,75,0.25)', borderRadius: '10px',
            color: '#E8B84B', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>
            <Plus size={15} />
            New Chat
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {sessions.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', textAlign: 'center', padding: '24px 16px' }}>
              No previous chats yet
            </p>
          ) : sessions.map(sess => (
            <button key={sess.id} type="button" onClick={() => handleLoadSession(sess)} style={{
              width: '100%', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
              marginBottom: '2px', background: 'transparent', border: 'none',
              display: 'flex', alignItems: 'flex-start', gap: '8px', textAlign: 'left',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <MessageSquare size={13} style={{ color: 'rgba(255,255,255,0.4)', marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '12px', color: '#fff', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sess.title || 'Chat'}
                </p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                  {formatSessionDate(sess)}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Coins size={13} style={{ color: '#E8B84B' }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Token balance</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#E8B84B', marginLeft: 'auto' }}>
              {displayBalance}
            </span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        <div style={{
          padding: '14px 20px', background: '#fff',
          borderBottom: '1px solid rgba(15,31,61,0.09)',
          display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
        }}>
          <button type="button" onClick={() => setSidebarOpen(p => !p)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '32px', height: '32px', borderRadius: '8px',
            border: '1px solid rgba(15,31,61,0.09)', background: '#F6F8FC',
            cursor: 'pointer', color: '#0F1F3D', flexShrink: 0,
          }}>
            <ChevronLeft size={15} style={{ transform: sidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
          </button>
          <Bot size={20} style={{ color: '#5B4FCF', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F1F3D', lineHeight: 1.2 }}>
              AI Business Assistant
            </h2>
            <p style={{ margin: 0, fontSize: '11px', color: '#6D7690' }}>
              Powered by Gemini {'—'} knows your live business data
            </p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px',
            background: '#FFF8E6', borderRadius: '20px',
            border: '1px solid rgba(232,184,75,0.3)', flexShrink: 0,
          }}>
            <Coins size={12} style={{ color: '#E8B84B' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#9A6F00' }}>
              {displayBalance} tokens
            </span>
          </div>
        </div>

        {!contextLoading && Object.keys(businessContext).length > 0 && (
          <div style={{
            padding: '8px 20px', background: '#F6F8FC',
            borderBottom: '1px solid rgba(15,31,61,0.06)',
            display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0,
          }}>
            {[
              { label: 'Orders', value: businessContext.orderCount ?? '—' },
              { label: 'Revenue', value: '৳' + (businessContext.revenue || 0).toLocaleString() },
              { label: 'Profit', value: '৳' + (businessContext.netProfit || 0).toLocaleString() },
              { label: 'Return rate', value: (businessContext.returnRate ?? 0) + '%' },
              { label: 'Low stock', value: businessContext.lowStockCount ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '3px 10px', background: '#fff',
                border: '1px solid rgba(15,31,61,0.09)', borderRadius: '20px', fontSize: '11px',
              }}>
                <span style={{ color: '#6D7690' }}>{label}:</span>
                <span style={{ fontWeight: 700, color: '#0F1F3D' }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {messages.length === 0 ? (
            <div style={{ maxWidth: '560px', margin: '0 auto', paddingTop: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '16px', background: '#EEF0FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
                }}>
                  <Bot size={28} style={{ color: '#5B4FCF' }} />
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#0F1F3D' }}>
                  Your Business Assistant
                </h3>
                <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#6D7690', lineHeight: 1.5 }}>
                  Ask anything about your orders, profit, inventory, or strategy. I have access to your live data.
                </p>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  padding: '4px 12px', background: '#FFF8E6',
                  borderRadius: '20px', border: '1px solid rgba(232,184,75,0.3)',
                }}>
                  <Coins size={11} style={{ color: '#E8B84B' }} />
                  <span style={{ fontSize: '11px', color: '#9A6F00', fontWeight: 600 }}>
                    5 tokens per session {'—'} unlimited messages
                  </span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {SUGGESTED_QUESTIONS.map(q => (
                  <button key={q} type="button"
                    onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                    style={{
                      padding: '12px 14px', background: '#fff',
                      border: '1px solid rgba(15,31,61,0.09)', borderRadius: '10px',
                      cursor: 'pointer', fontSize: '12px', color: '#0F1F3D',
                      textAlign: 'left', lineHeight: 1.4, transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#E8B84B'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(15,31,61,0.09)'}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-end', gap: '8px',
                }}>
                  {msg.role === 'model' && (
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '8px', background: '#EEF0FF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginBottom: '18px',
                    }}>
                      <Bot size={14} style={{ color: '#5B4FCF' }} />
                    </div>
                  )}
                  <div style={{ maxWidth: '75%' }}>
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: msg.role === 'user' ? '#0F1F3D' : '#fff',
                      color: msg.role === 'user' ? '#fff' : '#0F1F3D',
                      fontSize: '13px', lineHeight: 1.6,
                      border: msg.role === 'model' ? '1px solid rgba(15,31,61,0.09)' : 'none',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                    <p style={{
                      fontSize: '10px', color: '#9AA0B0', margin: '4px 4px 0',
                      textAlign: msg.role === 'user' ? 'right' : 'left',
                    }}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px', background: '#EEF0FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Bot size={14} style={{ color: '#5B4FCF' }} />
                  </div>
                  <div style={{
                    padding: '12px 16px', background: '#fff',
                    borderRadius: '16px 16px 16px 4px',
                    border: '1px solid rgba(15,31,61,0.09)',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <Loader2 size={14} className="munafa-spin" style={{ color: '#5B4FCF' }} />
                    <span style={{ fontSize: '12px', color: '#6D7690' }}>Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {error && (
          <div style={{
            margin: '0 20px 8px', padding: '10px 14px', background: '#FEF0F0',
            border: '1px solid rgba(217,64,64,0.2)', borderRadius: '10px',
            fontSize: '12px', color: '#D94040', flexShrink: 0,
          }}>
            {error}
          </div>
        )}

        <div style={{
          padding: '16px 20px', background: '#fff',
          borderTop: '1px solid rgba(15,31,61,0.09)', flexShrink: 0,
        }}>
          {!tokenCharged && messages.length === 0 && (
            <p style={{ fontSize: '11px', color: '#9AA0B0', marginBottom: '8px', textAlign: 'center' }}>
              First message deducts 5 tokens {'—'} unlimited messages after that
            </p>
          )}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your business... (Enter to send, Shift+Enter for new line)"
              rows={1}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '12px',
                border: '1px solid rgba(15,31,61,0.15)', fontSize: '13px',
                color: '#0F1F3D', resize: 'none', outline: 'none',
                fontFamily: 'inherit', lineHeight: 1.5, background: '#F6F8FC',
                maxHeight: '120px', overflowY: 'auto',
              }}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
            <button type="button" onClick={handleSend} disabled={!input.trim() || loading}
              style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: input.trim() && !loading ? '#0F1F3D' : 'rgba(15,31,61,0.12)',
                border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s', flexShrink: 0,
              }}
            >
              {loading
                ? <Loader2 size={16} className="munafa-spin" style={{ color: '#fff' }} />
                : <Send size={16} style={{ color: input.trim() ? '#fff' : 'rgba(15,31,61,0.4)' }} />
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AIAssistant;
