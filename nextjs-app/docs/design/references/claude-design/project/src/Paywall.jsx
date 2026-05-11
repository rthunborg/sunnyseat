// Premium paywall — "Säsongskortet" one-time purchase

function Paywall({ onClose, onPurchase, onFail }) {
  const [processing, setProcessing] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [shouldFail, setShouldFail] = React.useState(false);

  const handleBuy = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      if (shouldFail && onFail) { onFail(); return; }
      setSuccess(true);
      setTimeout(onPurchase, 1100);
    }, 1600);
  };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(20,15,5,0.55)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      zIndex: 85,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      animation: 'fade-in 0.25s',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 340,
        borderRadius: 24,
        background: '#fff',
        boxShadow: '0 30px 60px rgba(45,38,20,0.4)',
        padding: '32px 24px',
        animation: 'scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        position: 'relative',
      }}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{
              width: 72, height: 72, margin: '0 auto 16px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #d4af37 0%, #ffbf00 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'scale-in 0.4s',
            }}>
              <Icon name="check" size={36} color="#fff"/>
            </div>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 22, fontWeight: 800, color: '#1b1b1e',
              letterSpacing: '-0.02em',
            }}>Välkommen till Säsongskortet!</div>
          </div>
        ) : processing ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{
              width: 56, height: 56, margin: '0 auto 16px',
              borderRadius: '50%',
              border: '4px solid #f5f0e6',
              borderTopColor: '#d4af37',
              animation: 'spin 0.9s linear infinite',
            }}/>
            <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 18, fontWeight: 700, color: '#1b1b1e',
            }}>Bekräftar med bank-id…</div>
            <div style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: 13, color: '#7f7663', marginTop: 4,
            }}>Öppna din bank-app</div>
          </div>
        ) : (
          <>
            {/* Lock+sun icon */}
            <div style={{
              width: 64, height: 64, margin: '0 auto 20px',
              position: 'relative',
              borderRadius: '50%',
              background: 'rgba(255,191,0,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="sun" size={34} color="#d4af37" fill="#d4af37"/>
              <div style={{
                position: 'absolute', top: -6, right: -6,
                width: 24, height: 24, borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="lock" size={12} color="#735c00"/>
              </div>
            </div>

            <h2 style={{
              margin: 0, textAlign: 'center',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 24, fontWeight: 800,
              color: '#1b1b1e', letterSpacing: '-0.02em',
            }}>Säsongskortet</h2>
            <p style={{
              margin: '6px 0 0', textAlign: 'center',
              fontFamily: 'Manrope, sans-serif',
              fontSize: 14, color: '#4b5563',
            }}>Planera solstunder i förväg.</p>

            {/* Features */}
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Feat icon="calendar" title="Prognos 7 dagar framåt" text="Vet alltid var solen landar i helgen."/>
              <Feat icon="bell" title="Solvarningar" text="Ping när dina favoriter når 80% sol."/>
              <Feat icon="heart" title="Obegränsade favoriter" text="Spara hela din stans bästa hörnor."/>
            </div>

            {/* Price */}
            <div style={{ textAlign: 'center', marginTop: 22 }}>
              <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 2 }}>
                <span style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 48, fontWeight: 800,
                  color: '#d4af37', letterSpacing: '-0.05em', lineHeight: 1,
                }}>39</span>
                <span style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 22, fontWeight: 800, color: '#d4af37',
                  marginTop: 4,
                }}>kr</span>
              </div>
              <div style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: 11, fontWeight: 500, color: '#4b5563',
                marginTop: 2,
              }}>Engångskostnad · Ingen prenumeration · Inget konto</div>
            </div>

            <button onClick={handleBuy} style={{
              width: '100%', height: 52, marginTop: 20,
              borderRadius: 9999,
              background: 'linear-gradient(135deg, #5f4b8a 0%, #8765c8 100%)',
              color: '#fff', border: 'none',
              fontFamily: 'Manrope, sans-serif',
              fontSize: 15, fontWeight: 800,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 6px 16px rgba(95,75,138,0.35)',
            }}>
              <Icon name="qr" size={17} color="#fff"/>
              Betala med Swish
            </button>

            <button onClick={onClose} style={{
              width: '100%', marginTop: 12, padding: 8,
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'Manrope, sans-serif',
              fontSize: 14, fontWeight: 700, color: '#4d4635',
            }}>Inte nu</button>
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, marginTop: 4, cursor: 'pointer',
              fontFamily: 'Manrope, sans-serif',
              fontSize: 10.5, color: '#a8a29e', fontWeight: 600,
            }}>
              <input type="checkbox" checked={shouldFail}
                onChange={e => setShouldFail(e.target.checked)}
                style={{ accentColor: '#d4af37' }}/>
              Simulera misslyckad betalning (demo)
            </label>
          </>
        )}
      </div>
    </div>
  );
}

function Feat({ icon, title, text }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 30, height: 30, borderRadius: 9,
        background: '#fff3d4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 1,
      }}>
        <Icon name={icon} size={15} color="#735c00"/>
      </div>
      <div>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 13.5, fontWeight: 700, color: '#1b1b1e',
        }}>{title}</div>
        <div style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 12, color: '#4b5563', lineHeight: 1.4,
        }}>{text}</div>
      </div>
    </div>
  );
}

window.Paywall = Paywall;
