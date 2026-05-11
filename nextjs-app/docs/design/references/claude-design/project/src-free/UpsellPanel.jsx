// Upsell banner shown to free users in place of TopPanel (date+slider).
// Compact: lock+sun icon, headline, price subline, gold CTA. Tapping anywhere
// opens the paywall.

function UpsellPanel({ onUpgrade, embedded = false }) {
  return (
    <div style={{
      ...(embedded ? {} : { position: 'absolute', top: 58, left: 16, right: 16 }),
      borderRadius: 24,
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      boxShadow: '0 20px 44px rgba(115,92,0,0.22), 0 4px 10px rgba(115,92,0,0.10), 0 0 0 0.5px rgba(255,255,255,0.95) inset',
      border: '0.5px solid rgba(255,255,255,0.9)',
      padding: '14px 16px 14px',
      zIndex: 25,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {/* Lock+sun icon */}
        <div style={{
          width: 44, height: 44, position: 'relative',
          borderRadius: '50%',
          background: 'rgba(255,191,0,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon name="sun" size={22} color="#d4af37" fill="#d4af37"/>
          <div style={{
            position: 'absolute', top: -3, right: -3,
            width: 18, height: 18, borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="lock" size={9} color="#735c00"/>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 15, fontWeight: 800,
            color: '#1b1b1e', letterSpacing: '-0.01em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>Lås upp framtidsplanering</div>
          <div style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 11, fontWeight: 500,
            color: '#7f7663', marginTop: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>39 kr · en säsong · inget konto · ingen prenumeration</div>
        </div>
      </div>

      <button onClick={onUpgrade} style={{
        width: '100%', marginTop: 12, height: 42,
        borderRadius: 9999,
        background: 'linear-gradient(135deg, #f1b100 0%, #d4af37 100%)',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: '0 4px 12px rgba(212,175,55,0.35), inset 0 1px 0 rgba(255,255,255,0.45)',
      }}>
        <Icon name="sparkle" size={13} color="#1b1b1e" fill="#1b1b1e"/>
        <span style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 14, fontWeight: 800,
          color: '#1b1b1e', letterSpacing: '-0.01em',
        }}>Visa Säsongskortet</span>
      </button>
    </div>
  );
}

window.UpsellPanel = UpsellPanel;
