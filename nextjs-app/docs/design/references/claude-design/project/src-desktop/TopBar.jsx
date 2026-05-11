// Desktop top navigation bar — SunnySeat logo, search, action icons.
// Sits flush at top of the app canvas, full bleed.

function TopBar({ onSettings, onSearch, isPremium }) {
  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: 72,
      background: 'rgba(253,250,244,0.96)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: '0.5px solid rgba(115,92,0,0.10)',
      display: 'flex', alignItems: 'center',
      padding: '0 28px',
      gap: 24,
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        flexShrink: 0,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #ffe088 0%, #ffbf00 55%, #d4af37 100%)',
          boxShadow: '0 2px 6px rgba(212,175,55,0.4), inset -2px -2px 4px rgba(115,92,0,0.15)',
        }}/>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 22, fontWeight: 800, color: '#1b1b1e',
          letterSpacing: '-0.025em',
        }}>
          Sunny<span style={{ color: '#d4af37' }}>Seat</span>
        </div>
      </div>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 560, marginLeft: 12 }}>
        <div onClick={onSearch} style={{
          height: 44, borderRadius: 9999,
          background: '#fff',
          border: '1px solid #e9e1cf',
          display: 'flex', alignItems: 'center',
          padding: '0 18px', gap: 12,
          cursor: 'text',
          boxShadow: '0 1px 2px rgba(115,92,0,0.04)',
        }}>
          <Icon name="search" size={18} color="#7f7663"/>
          <span style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 14, fontWeight: 500,
            color: '#a39b85',
            flex: 1,
          }}>Sök plats eller område i Göteborg…</span>
          <kbd style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 11, fontWeight: 700,
            color: '#7f7663',
            padding: '3px 8px', borderRadius: 6,
            background: '#f3ede0',
            border: '1px solid #e9e1cf',
          }}>⌘K</kbd>
        </div>
      </div>

      {/* Right cluster */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginLeft: 'auto',
      }}>
        <HeaderIconBtn icon="filter" title="Filter"/>
        <HeaderIconBtn icon="location" title="Min plats"/>
        <HeaderIconBtn icon="settings" title="Inställningar" onClick={onSettings}/>

        {/* Account chip — only for premium users */}
        {isPremium && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0 4px 0 10px',
            height: 40, borderRadius: 9999,
            background: 'linear-gradient(135deg, #fff3d4 0%, #ffe088 100%)',
            border: '1px solid #f5d76e',
            marginLeft: 4,
          }}>
            <Icon name="sun" size={13} color="#735c00" fill="#735c00"/>
            <span style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: 11, fontWeight: 800,
              color: '#1b1b1e',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>Säsongskortet</span>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1b1b1e 0%, #4d4635 100%)',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 12, fontWeight: 800,
              letterSpacing: '0.02em',
              border: '2px solid #f5d76e',
            }}>EH</div>
          </div>
        )}
      </div>
    </div>
  );
}

function HeaderIconBtn({ icon, title, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={title}
      style={{
        width: 40, height: 40, borderRadius: 12,
        background: hover ? '#f3ede0' : 'transparent',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s',
      }}>
      <Icon name={icon} size={18} color="#4d4635"/>
    </button>
  );
}

window.TopBar = TopBar;
