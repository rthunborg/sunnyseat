// Onboarding screen — full-bleed amber gradient with CTA

function Onboarding({ onContinue }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(180deg, #ffb347 0%, #d4af37 42%, #735c00 100%)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      padding: '64px 32px',
      color: '#fff',
      zIndex: 90,
      animation: 'fade-in 0.4s',
    }}>
      {/* Decorative sun burst */}
      <div style={{
        position: 'absolute', left: '50%', top: '-40px',
        transform: 'translateX(-50%)',
        width: 340, height: 340,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,240,180,0.55) 0%, rgba(255,240,180,0) 60%)',
        opacity: 0.8,
      }}/>
      <div style={{
        position: 'absolute', left: -120, bottom: -120,
        width: 480, height: 480,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,191,0,0.5) 0%, rgba(255,191,0,0) 65%)',
      }}/>

      {/* Brand */}
      <div style={{
        textAlign: 'center', marginTop: 20,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 22, fontWeight: 800,
        letterSpacing: '-0.04em',
        color: 'rgba(255,255,255,0.92)',
        position: 'relative', zIndex: 2,
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'radial-gradient(circle, #fff6d6 0%, #ffbf00 100%)',
          boxShadow: '0 0 16px rgba(255,240,180,0.7)',
        }}/>
        SunnySeat
      </div>

      {/* Headline */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 2 }}>
        <h1 style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 34, fontWeight: 800,
          textAlign: 'center', lineHeight: 1.15,
          letterSpacing: '-0.03em',
          margin: 0,
          textWrap: 'balance',
          textShadow: '0 4px 24px rgba(115,92,0,0.25)',
        }}>Hitta uteplatser<br/>i solen — just nu.</h1>
        <p style={{
          marginTop: 14,
          fontFamily: 'Manrope, sans-serif',
          fontSize: 14, fontWeight: 500,
          color: 'rgba(255,255,255,0.8)',
          textAlign: 'center',
          letterSpacing: '0.02em',
        }}>Platsen sparas aldrig.</p>
      </div>

      {/* Bottom CTAs */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <button onClick={onContinue} style={{
          width: '100%', height: 56,
          borderRadius: 9999,
          background: 'linear-gradient(135deg, #d4af37 0%, #ffbf00 100%)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'Manrope, sans-serif',
          fontSize: 16, fontWeight: 800, color: '#554300',
          boxShadow: '0 6px 16px rgba(0,0,0,0.15), 0 12px 30px rgba(0,0,0,0.1)',
          letterSpacing: '-0.01em',
        }}>
          <Icon name="nav" size={16} color="#554300"/>
          Använd min plats
        </button>
        <button onClick={onContinue} style={{
          width: '100%', marginTop: 22, padding: 8,
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: 'Manrope, sans-serif',
          fontSize: 15, fontWeight: 700,
          color: 'rgba(255,255,255,0.92)',
          textDecoration: 'underline',
          textUnderlineOffset: 4,
        }}>Hoppa till Göteborgs centrum</button>
        <div style={{
          marginTop: 18, textAlign: 'center',
          fontFamily: 'Manrope, sans-serif',
          fontSize: 11, fontWeight: 500,
          color: 'rgba(255,255,255,0.65)',
          letterSpacing: '0.04em',
        }}>
          <Icon name="sun" size={14} color="rgba(255,255,255,0.7)" style={{verticalAlign:-3, marginRight:6}}/>
          Gratis · Ingen registrering · Ingen spårning
        </div>
      </div>
    </div>
  );
}

window.Onboarding = Onboarding;
