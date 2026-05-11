// Small popover above a pin when tapped on map

function QuickInfo({ venue, hour, onClose, onOpen }) {
  const pct = sunPctAt(venue, hour);
  const color = sunColor(pct);

  return (
    <div
      data-quickinfo
      onPointerDown={(e) => e.stopPropagation()}
      style={{
      position: 'absolute',
      left: `${venue.x}%`, top: `${venue.y}%`,
      transform: 'translate(-50%, calc(-100% - 56px))',
      width: 230,
      background: '#fdfaf4',
      borderRadius: 14,
      boxShadow: '0 12px 36px rgba(115,92,0,0.25), 0 2px 6px rgba(0,0,0,0.1)',
      zIndex: 40,
      animation: 'scale-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
      transformOrigin: 'bottom center',
    }}>
      {/* Close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: -14, right: -10,
        width: 28, height: 28, borderRadius: '50%',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
        border: 'none', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 2,
      }}>
        <Icon name="close" size={12} color="#fff"/>
      </button>

      {/* Photo strip */}
      <div style={{
        height: 72, borderRadius: '14px 14px 0 0',
        background: `linear-gradient(135deg, ${color.bg} 0%, #d4af37 100%)`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 75% 25%, rgba(255,240,180,0.9) 0%, transparent 45%),
            radial-gradient(circle at 15% 80%, rgba(180,140,80,0.4) 0%, transparent 55%)`,
        }}/>
        <div style={{
          position: 'absolute', top: 8, left: 8,
          height: 20, padding: '0 9px',
          borderRadius: 9999,
          background: color.bg,
          display: 'flex', alignItems: 'center', gap: 4,
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}>
          <Icon name="sun" size={11} color={color.fg} fill={color.fg}/>
          <span style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 9, fontWeight: 800, color: color.fg,
          }}>{formatPct(pct)} Sol</span>
        </div>
      </div>

      {/* Name row */}
      <div style={{
        padding: '8px 12px 4px',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 13, fontWeight: 700, color: '#1b1b1e',
        textAlign: 'center',
      }}>{venue.name}</div>

      {/* Buttons */}
      <div style={{
        display: 'flex', gap: 8, padding: '4px 10px 10px', alignItems: 'center',
      }}>
        <button style={{
          flex: 1,
          height: 28, borderRadius: 9999,
          background: 'linear-gradient(135deg, #735c00 0%, #d4af37 100%)',
          color: '#1b1b1e', border: 'none',
          fontFamily: 'Manrope, sans-serif',
          fontSize: 10, fontWeight: 800,
          letterSpacing: '0.04em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(115,92,0,0.3)',
        }}>
          <Icon name="nav" size={10} color="#1b1b1e"/> Visa rutt
        </button>
        <button onClick={onOpen} style={{
          height: 28, padding: '0 12px',
          borderRadius: 6,
          background: '#fff',
          border: '1px solid #d0c5af',
          color: '#1b1b1e',
          fontFamily: 'Manrope, sans-serif',
          fontSize: 10, fontWeight: 800,
          cursor: 'pointer',
        }}>Mer info</button>
      </div>

      {/* Triangle tail */}
      <div style={{
        position: 'absolute', left: '50%', bottom: -10,
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '10px solid transparent',
        borderRight: '10px solid transparent',
        borderTop: '10px solid #fdfaf4',
        filter: 'drop-shadow(0 4px 3px rgba(115,92,0,0.15))',
      }}/>
    </div>
  );
}

window.QuickInfo = QuickInfo;
