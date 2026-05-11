// QuickInfo popover — appears near a clicked pin on the map.
// Includes a heart toggle (gated behind paywall for free users).

function QuickInfo({ venue, hour, onClose, onOpen, isFavorite, onToggleFavorite }) {
  const pct = sunPctAt(venue, hour);
  const color = sunColor(pct);

  return (
    <div
      data-quickinfo
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: `${venue.x}%`, top: `${venue.y}%`,
        transform: 'translate(-50%, calc(-100% - 64px))',
        width: 280,
        background: '#fdfaf4',
        borderRadius: 18,
        boxShadow: '0 16px 44px rgba(115,92,0,0.25), 0 4px 8px rgba(0,0,0,0.12)',
        zIndex: 40,
        animation: 'scale-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transformOrigin: 'bottom center',
        overflow: 'visible',
      }}>
      {/* Close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: -12, right: -10,
        width: 28, height: 28, borderRadius: '50%',
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2,
      }}>
        <Icon name="close" size={13} color="#fff"/>
      </button>

      {/* Photo strip — placeholder */}
      <div style={{
        height: 96, borderRadius: '18px 18px 0 0',
        position: 'relative', overflow: 'hidden',
        background: `
          repeating-linear-gradient(45deg, rgba(115,92,0,0.10) 0 14px, rgba(115,92,0,0.02) 14px 28px),
          linear-gradient(135deg, #f5ecd2 0%, #ede1bf 100%)`,
        borderBottom: '1px dashed rgba(115,92,0,0.3)',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(255,255,255,0.7)',
            border: '1.5px dashed rgba(115,92,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="image" size={14} color="#a89875"/>
          </div>
          <span style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 8, fontWeight: 800,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: '#9a8a66',
          }}>Platshållarbild</span>
        </div>
        <div style={{
          position: 'absolute', top: 10, left: 10,
          height: 22, padding: '0 10px',
          borderRadius: 9999,
          background: color.bg,
          display: 'flex', alignItems: 'center', gap: 5,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        }}>
          <Icon name="sun" size={11} color={color.fg} fill={color.fg}/>
          <span style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 10, fontWeight: 800, color: color.fg,
            letterSpacing: '0.02em',
          }}>{formatPct(pct)} {color.label}</span>
        </div>

        {/* Favorite heart */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(venue.id); }}
          title={isFavorite ? 'Ta bort favorit' : 'Spara favorit'}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 30, height: 30, borderRadius: '50%',
            background: isFavorite
              ? 'linear-gradient(135deg, #ff5577 0%, #ff8866 100%)'
              : 'rgba(253,250,244,0.92)',
            backdropFilter: 'blur(8px)',
            border: 'none', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isFavorite
              ? '0 2px 6px rgba(255,90,120,0.4)'
              : '0 1px 3px rgba(0,0,0,0.15)',
          }}>
          <Icon name="heart" size={15}
            color={isFavorite ? '#fff' : '#1b1b1e'}
            fill={isFavorite ? '#fff' : 'none'}/>
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 16px 14px' }}>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 16, fontWeight: 800, color: '#1b1b1e',
          letterSpacing: '-0.02em',
          marginBottom: 2,
        }}>{venue.name}</div>
        <div style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 11, fontWeight: 600, color: '#7f7663',
          marginBottom: 12,
        }}>{venue.type} · {venue.distance}</div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            flex: 1,
            height: 34, borderRadius: 9999,
            background: 'linear-gradient(135deg, #735c00 0%, #d4af37 100%)',
            color: '#1b1b1e', border: 'none',
            fontFamily: 'Manrope, sans-serif',
            fontSize: 11, fontWeight: 800,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(115,92,0,0.3)',
          }}>
            <Icon name="nav" size={11} color="#1b1b1e"/> Visa rutt
          </button>
          <button onClick={onOpen} style={{
            height: 34, padding: '0 14px',
            borderRadius: 9999,
            background: '#fff',
            border: '1px solid #d0c5af',
            color: '#1b1b1e',
            fontFamily: 'Manrope, sans-serif',
            fontSize: 11, fontWeight: 800,
            cursor: 'pointer',
            letterSpacing: '0.02em',
          }}>Mer info</button>
        </div>
      </div>

      {/* Triangle tail */}
      <div style={{
        position: 'absolute', left: '50%', bottom: -10,
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '11px solid transparent',
        borderRight: '11px solid transparent',
        borderTop: '11px solid #fdfaf4',
        filter: 'drop-shadow(0 5px 4px rgba(115,92,0,0.18))',
      }}/>
    </div>
  );
}

window.QuickInfo = QuickInfo;
