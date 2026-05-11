// Premium paywall — "Säsongskortet" 39 kr one-time purchase.
// Matches the Figma `premium-paywall-mobile` frame closely:
// white card on warm-tan blurred map, lock+sun icon, locked feature
// mocks, 39 kr price, big green Swish CTA. Three internal states:
//   idle → processing → success (auto-dismiss + onPurchase)
// Failure is surfaced via onFail() so the App can show its own
// PaymentFailed sheet (matches the existing Flows.jsx component).

function Paywall({ onClose, onPurchase, onFail, forceFail = false }) {
  const [stage, setStage] = React.useState('idle'); // idle | processing | success
  const timeoutRef = React.useRef(null);

  React.useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const handleBuy = () => {
    setStage('processing');
    // mimic Swish handoff — long enough to read but not annoying
    timeoutRef.current = setTimeout(() => {
      if (forceFail) {
        setStage('idle');
        onFail?.();
        return;
      }
      setStage('success');
      timeoutRef.current = setTimeout(() => {
        onPurchase?.();
      }, 1300);
    }, 2200);
  };

  const cancelProcessing = () => {
    clearTimeout(timeoutRef.current);
    setStage('idle');
  };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(35,25,5,0.45)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      zIndex: 85,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={stage === 'idle' ? onClose : undefined}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 340,
        borderRadius: 16,
        background: '#fff',
        boxShadow: '0 24px 48px rgba(45,38,20,0.3)',
        padding: '32px 24px 28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Close X — only in idle */}
        {stage === 'idle' && (
          <button onClick={onClose} aria-label="Stäng" style={{
            position: 'absolute', top: 12, right: 12,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(0,0,0,0.06)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2,
          }}>
            <Icon name="close" size={13} color="#1b1b1e"/>
          </button>
        )}

        {stage === 'success' ? <SuccessState/> : (
          <>
            {/* Lock+sun icon header */}
            <div style={{
              width: 64, height: 64, margin: '0 auto 24px',
              position: 'relative',
              borderRadius: '50%',
              background: 'rgba(255,191,0,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="sun" size={34} color="#d4af37" fill="#d4af37"/>
              <div style={{
                position: 'absolute', top: -4, right: -4,
                width: 22, height: 22, borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="lock" size={11} color="#735c00"/>
              </div>
            </div>

            {/* Heading */}
            <h2 style={{
              margin: 0, textAlign: 'center',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 24, fontWeight: 700,
              color: '#1b1b1e', letterSpacing: '-0.025em',
              lineHeight: '32px',
            }}>Säsongskortet</h2>
            <p style={{
              margin: '8px 0 0', textAlign: 'center',
              fontFamily: 'Manrope, sans-serif',
              fontSize: 14, fontWeight: 500, color: '#4b5563',
              lineHeight: '20px',
            }}>Planera solstunder i förväg.</p>

            {/* Locked feature mocks */}
            <div style={{
              marginTop: 24,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <LockedFeature icon="calendar" label="Välj datum"/>
              <LockedFeature icon="clock" label="Simulera klockslag"/>
              <LockedFeature icon="heart" label="Obegränsade favoriter"/>
            </div>

            {/* Price */}
            <div style={{ textAlign: 'center', marginTop: 26 }}>
              <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 2 }}>
                <span style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 48, fontWeight: 700,
                  color: '#d4af37', letterSpacing: '-0.05em', lineHeight: '48px',
                }}>39</span>
                <span style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 22, fontWeight: 700, color: '#d4af37',
                  marginTop: 6,
                }}>kr</span>
              </div>
              <div style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: 11, fontWeight: 500, color: '#4b5563',
                marginTop: 4,
              }}>Engångskostnad · Ingen prenumeration · Inget konto</div>
            </div>

            {/* CTA */}
            <div style={{ marginTop: 22 }}>
              {stage === 'processing' ? (
                <ProcessingButton onCancel={cancelProcessing}/>
              ) : (
                <button onClick={handleBuy} style={{
                  width: '100%', height: 56,
                  borderRadius: 9999,
                  background: 'linear-gradient(180deg, #3ed864 0%, #30d058 100%)',
                  color: '#fff', border: 'none',
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: 16, fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: '0 10px 15px -3px rgba(48,208,88,0.3), 0 4px 6px -4px rgba(48,208,88,0.2)',
                  transition: 'transform 0.1s',
                }}
                  onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                  onPointerUp={(e) => e.currentTarget.style.transform = ''}
                  onPointerLeave={(e) => e.currentTarget.style.transform = ''}>
                  <SwishGlyph/>
                  Betala med Swish
                </button>
              )}
              <div style={{
                marginTop: 10,
                fontFamily: 'Manrope, sans-serif',
                fontSize: 10, fontWeight: 500,
                color: '#4b5563',
                textAlign: 'center', lineHeight: '12.5px',
                padding: '0 16px',
              }}>
                Din betalning sköts av Swish. Vi sparar inga<br/>
                kortuppgifter. Giltig för innevarande år.
              </div>
            </div>

            {/* Dismiss */}
            {stage === 'idle' && (
              <button onClick={onClose} style={{
                display: 'block', margin: '20px auto 0',
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: 'Manrope, sans-serif',
                fontSize: 14, fontWeight: 700, color: '#4d4635',
                padding: 8,
              }}>Inte nu</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LockedFeature({ icon, label }) {
  return (
    <div style={{
      height: 55, padding: '0 16px',
      borderRadius: 16,
      background: 'rgba(245,243,246,0.85)',
      border: '1px solid rgba(208,197,175,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      opacity: 0.85,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Icon name={icon} size={18} color="#4d4635"/>
        <span style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 14, fontWeight: 700, color: '#4d4635',
          letterSpacing: '-0.005em',
        }}>{label}</span>
      </div>
      <Icon name="lock" size={15} color="rgba(217,119,6,0.6)"/>
    </div>
  );
}

function ProcessingButton({ onCancel }) {
  return (
    <div style={{
      width: '100%', height: 56,
      borderRadius: 9999,
      background: 'linear-gradient(180deg, #3ed864 0%, #30d058 100%)',
      color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      boxShadow: '0 10px 15px -3px rgba(48,208,88,0.3), 0 4px 6px -4px rgba(48,208,88,0.2)',
      position: 'relative',
    }}>
      <div style={{
        width: 22, height: 22,
        borderRadius: '50%',
        border: '2.5px solid rgba(255,255,255,0.35)',
        borderTopColor: '#fff',
        animation: 'spin 0.9s linear infinite',
      }}/>
      <span style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 16, fontWeight: 700,
      }}>Öppnar Swish…</span>
      <button onClick={onCancel} style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        width: 32, height: 32, borderRadius: '50%',
        background: 'rgba(255,255,255,0.18)',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} aria-label="Avbryt">
        <Icon name="close" size={11} color="#fff"/>
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  );
}

function SuccessState() {
  return (
    <div style={{
      textAlign: 'center', padding: '32px 0 12px',
    }}>
      {/* Confetti dots */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} style={{
            position: 'absolute',
            left: `${(i * 53) % 100}%`,
            top: `${10 + ((i * 31) % 70)}%`,
            width: 7 + (i % 3) * 2,
            height: 7 + (i % 3) * 2,
            borderRadius: i % 2 ? '50%' : 2,
            background: ['#ffbf00', '#d4af37', '#30d058', '#f97316'][i % 4],
            opacity: 0.85,
            animation: `confetti-${i % 3} ${1.2 + (i % 4) * 0.2}s ease-out`,
            animationFillMode: 'forwards',
            transform: 'translateY(-30px)',
          }}/>
        ))}
        <style>{`
          @keyframes confetti-0 { from { transform: translateY(-30px) rotate(0); opacity: 0; } 30% { opacity: 1 } to { transform: translateY(180px) rotate(220deg); opacity: 0; } }
          @keyframes confetti-1 { from { transform: translateY(-20px) rotate(0); opacity: 0; } 30% { opacity: 1 } to { transform: translateY(220px) rotate(-180deg); opacity: 0; } }
          @keyframes confetti-2 { from { transform: translateY(-40px) rotate(0); opacity: 0; } 30% { opacity: 1 } to { transform: translateY(200px) rotate(360deg); opacity: 0; } }
        `}</style>
      </div>

      <div style={{
        width: 80, height: 80, margin: '0 auto 20px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #d4af37 0%, #ffbf00 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 10px 24px rgba(212,175,55,0.4)',
        position: 'relative', zIndex: 1,
      }}>
        <Icon name="check" size={40} color="#fff"/>
      </div>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 22, fontWeight: 700, color: '#1b1b1e',
        letterSpacing: '-0.025em', position: 'relative', zIndex: 1,
      }}>Säsongskortet aktiverat</div>
      <div style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 13, fontWeight: 500, color: '#4b5563',
        marginTop: 6, position: 'relative', zIndex: 1,
      }}>Planera dina solstunder hela sommaren.</div>
    </div>
  );
}

function SwishGlyph() {
  // Compact white tile with a Swish-style "S" gradient mark.
  return (
    <div style={{
      width: 24, height: 24, borderRadius: 6,
      background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14">
        <defs>
          <linearGradient id="swishG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFB300"/>
            <stop offset="50%" stopColor="#EE2C72"/>
            <stop offset="100%" stopColor="#7F1FBC"/>
          </linearGradient>
        </defs>
        <path d="M11 4.2c-1.1-1-2.5-1.7-4-1.7-1.7 0-3.2.9-3.2 2.4 0 1.4 1.3 1.9 3.2 2.5 1.7.5 3.2 1 3.2 2.4 0 1.5-1.5 2.4-3.2 2.4-1.5 0-2.9-.7-4-1.7"
          stroke="url(#swishG)" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

window.Paywall = Paywall;
