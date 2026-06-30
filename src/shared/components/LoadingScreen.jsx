import React, { useEffect, useState } from 'react';

const LoadingScreen = ({ launching = false }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (launching) return;
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, [launching]);

  return (
    <>
      <style>{`
        @keyframes munafaHover {
          0%, 100% { transform: translateY(0) rotate(-1.5deg); }
          50% { transform: translateY(-18px) rotate(1.5deg); }
        }
        @keyframes munafaFlameIdle {
          0%, 100% { transform: scaleX(1) scaleY(1); opacity: 0.7; }
          50% { transform: scaleX(0.75) scaleY(1.3); opacity: 0.9; }
        }
        @keyframes munafaStar {
          0%, 100% { opacity: 0.12; transform: scale(0.8); }
          50% { opacity: 0.65; transform: scale(1.2); }
        }
        @keyframes munafaTaka {
          0% { transform: translateY(0); opacity: 0; }
          15% { opacity: 0.5; }
          85% { opacity: 0.15; }
          100% { transform: translateY(-130px); opacity: 0; }
        }
        @keyframes munafaProgress {
          0% { left: -65%; width: 65%; }
          100% { left: 110%; width: 65%; }
        }
        @keyframes munafaLaunchRkt {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          12% { transform: translateY(-14px) rotate(0deg); }
          100% { transform: translateY(-200vh) rotate(4deg); opacity: 0.1; }
        }
        @keyframes munafaFlameLaunch {
          0% { height: 28px; width: 18px; opacity: 0.8; }
          25% { height: 72px; width: 36px; opacity: 1; }
          80% { height: 130px; width: 58px; opacity: 0.6; }
          100% { height: 170px; width: 68px; opacity: 0; }
        }
        @keyframes munafaFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        .munafa-rkt-group { animation: munafaHover 2.2s ease-in-out infinite; }
        .munafa-flame-div { animation: munafaFlameIdle 0.22s ease-in-out infinite; transform-origin: top center; }
        .munafa-progress-fill {
          position: absolute; top: 0; height: 100%;
          background: linear-gradient(to right, transparent, #E8B84B, #FFD700, transparent);
          border-radius: 3px;
          animation: munafaProgress 1.8s ease-in-out infinite;
        }
        .munafa-launching .munafa-rkt-group {
          animation: munafaLaunchRkt 0.9s cubic-bezier(0.2, 0, 0.85, 0.85) 0.35s forwards !important;
        }
        .munafa-launching .munafa-flame-div {
          animation: munafaFlameLaunch 0.95s ease-in 0.2s forwards !important;
        }
        .munafa-launching .munafa-wm,
        .munafa-launching .munafa-txt {
          animation: munafaFadeOut 0.45s ease-out forwards !important;
        }
        .munafa-launching .munafa-star,
        .munafa-launching .munafa-taka {
          animation: munafaFadeOut 0.3s ease-out forwards !important;
        }
        .munafa-launching {
          animation: munafaFadeOut 0.5s ease-out 1.05s forwards !important;
        }
      `}</style>

      <div
        className={`munafa-wrap${launching ? ' munafa-launching' : ''}`}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 35%, #1a2f52 0%, #0F1F3D 65%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        {[...Array(20)].map((_, i) => (
          <div
            key={`ms-${i}`}
            className="munafa-star"
            style={{
              position: 'absolute',
              width: i % 4 === 0 ? '3px' : '2px',
              height: i % 4 === 0 ? '3px' : '2px',
              background: '#E8B84B',
              borderRadius: '50%',
              left: `${(i * 17 + 7) % 90 + 5}%`,
              top: `${(i * 13 + 11) % 78 + 5}%`,
              animation: `munafaStar ${1.5 + (i % 5) * 0.35}s ${(i * 0.28) % 1.8}s ease-in-out infinite`,
            }}
          />
        ))}

        {[...Array(5)].map((_, i) => (
          <div
            key={`mt-${i}`}
            className="munafa-taka"
            style={{
              position: 'absolute',
              color: '#E8B84B',
              fontSize: `${14 + i * 4}px`,
              fontWeight: 700,
              left: `${10 + i * 17}%`,
              bottom: `${14 + (i % 3) * 11}%`,
              opacity: 0,
              animation: `munafaTaka ${2.2 + i * 0.35}s ${i * 0.5}s ease-out infinite`,
              userSelect: 'none',
            }}
          >
            {'৳'}
          </div>
        ))}

        <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>

          <div className="munafa-wm" style={{ marginBottom: '28px' }}>
            <div style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#E8B84B',
              letterSpacing: '4px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              textShadow: '0 0 40px rgba(232,184,75,0.35)',
            }}>
              MunafaOS
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '7px' }}>
              <div style={{ height: '1px', width: '24px', background: 'rgba(232,184,75,0.3)' }} />
              <span style={{ color: 'rgba(232,184,75,0.55)', fontSize: '10px', letterSpacing: '2px', fontWeight: 500 }}>
                PROFIT OPTIMIZER
              </span>
              <div style={{ height: '1px', width: '24px', background: 'rgba(232,184,75,0.3)' }} />
            </div>
          </div>

          <div className="munafa-rkt-group" style={{ display: 'inline-block', transformOrigin: 'center bottom' }}>
            <svg viewBox="0 0 60 132" xmlns="http://www.w3.org/2000/svg" width="68" height="148" style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
              <path d="M30 2 L18 38 L42 38 Z" fill="#E8B84B" />
              <path d="M30 2 L27 14 L33 14 Z" fill="#FFD970" />
              <line x1="30" y1="14" x2="30" y2="38" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" />
              <rect x="18" y="36" width="24" height="56" fill="#ECEFF4" rx="2" />
              <rect x="18" y="36" width="4.5" height="56" fill="rgba(0,0,0,0.07)" />
              <rect x="37.5" y="36" width="4.5" height="56" fill="rgba(0,0,0,0.03)" />
              <rect x="18" y="36" width="24" height="5" fill="#E8B84B" opacity="0.55" />
              <rect x="18" y="85" width="24" height="5" fill="#E8B84B" opacity="0.55" />
              <circle cx="30" cy="59" r="10" fill="#0F1F3D" stroke="#E8B84B" strokeWidth="2.5" />
              <circle cx="30" cy="59" r="7" fill="#152B52" />
              <ellipse cx="27" cy="56" rx="2.5" ry="1.5" fill="rgba(255,255,255,0.22)" />
              <circle cx="30" cy="59" r="3.5" fill="#1C3D70" opacity="0.65" />
              <circle cx="21" cy="46" r="0.85" fill="rgba(0,0,0,0.2)" />
              <circle cx="39" cy="46" r="0.85" fill="rgba(0,0,0,0.2)" />
              <circle cx="21" cy="74" r="0.85" fill="rgba(0,0,0,0.2)" />
              <circle cx="39" cy="74" r="0.85" fill="rgba(0,0,0,0.2)" />
              <line x1="30" y1="41" x2="30" y2="47" stroke="rgba(232,184,75,0.4)" strokeWidth="0.8" />
              <line x1="30" y1="70" x2="30" y2="82" stroke="rgba(232,184,75,0.4)" strokeWidth="0.8" />
              <rect x="20" y="90" width="20" height="12" fill="#9AA0AC" rx="3" />
              <rect x="23" y="92" width="14" height="8" fill="#7A8090" rx="2" />
              <path d="M18 78 L1 118 L18 100 Z" fill="#E8B84B" stroke="#C9921A" strokeWidth="0.6" />
              <path d="M42 78 L59 118 L42 100 Z" fill="#E8B84B" stroke="#C9921A" strokeWidth="0.6" />
              <path d="M27 100 L23 120 L30 112 L37 120 L33 100 Z" fill="#C9921A" opacity="0.85" />
              <path d="M21 101 L17 120 L43 120 L39 101 Z" fill="#6A7280" />
              <ellipse cx="30" cy="120" rx="13" ry="2.5" fill="#3A4050" />
              <ellipse cx="30" cy="120" rx="13" ry="2.5" fill="#FFD700" opacity={launching ? 0.9 : 0} style={{ transition: 'opacity 0.3s' }} />
            </svg>
            <div
              className="munafa-flame-div"
              style={{
                width: '18px',
                height: '28px',
                margin: '-5px auto 0',
                background: 'linear-gradient(to bottom, #E8B84B, #FF8C42, rgba(255,140,66,0))',
                borderRadius: '0 0 55% 55%',
                opacity: 0.7,
                filter: 'blur(1px)',
              }}
            />
          </div>

          <div className="munafa-txt" style={{ marginTop: '22px' }}>
            <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 500, margin: 0, letterSpacing: '0.3px' }}>
              {launching ? 'Profit engine ignited!' : `Launching your profit engine${dots}`}
            </p>
            <p style={{ color: 'rgba(232,184,75,0.6)', fontSize: '11px', letterSpacing: '1.8px', marginTop: '6px', textTransform: 'uppercase', fontWeight: 400 }}>
              Bangladesh F-Commerce
            </p>
            <div style={{ marginTop: '22px', width: '160px', height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
              <div className="munafa-progress-fill" />
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default LoadingScreen;
