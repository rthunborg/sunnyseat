// Map pins — sunny (amber teardrop) vs shaded (grey pill)

function SunPin({ venue, hour, onClick, selected }) {
  const pct = sunPctAt(venue, hour);
  const isSunny = pct >= 0.35;
  const color = sunColor(pct);

  // Sunny: round teardrop with % and sun icon
  if (isSunny) {
    return (
      <button
        data-pin
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onClick}
        style={{
          position: 'absolute',
          left: `${venue.x}%`, top: `${venue.y}%`,
          transformOrigin: 'bottom center',
          transform: `translate(-50%, -100%) scale(${selected ? 1.15 : 1})`,
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          border: 'none', background: 'transparent',
          padding: 0, cursor: 'pointer',
          zIndex: selected ? 30 : 20,
        }}>
        <div style={{
          width: 44, height: 58,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}>
          {/* pin body */}
          <div style={{
            width: 44, height: 50,
            borderRadius: 9999,
            background: color.bg,
            border: '2.5px solid #fff',
            boxShadow: '0 8px 20px rgba(115,92,0,0.25), 0 2px 4px rgba(115,92,0,0.15)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 2,
            padding: '4px 0',
          }}>
            <span style={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 800, fontSize: 11,
              color: color.fg, letterSpacing: '-0.02em', lineHeight: 1,
            }}>{formatPct(pct)}</span>
            <Icon name="sun" size={14} color={color.fg} fill={color.fg}/>
          </div>
          {/* tail */}
          <div style={{
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `8px solid ${color.bg}`,
            marginTop: -2,
            filter: 'drop-shadow(0 2px 2px rgba(115,92,0,0.2))',
          }}/>
        </div>
      </button>
    );
  }

  // Shaded: grey oblong pill
  return (
    <button
      data-pin
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${venue.x}%`, top: `${venue.y}%`,
        transformOrigin: 'bottom center',
        transform: `translate(-50%, -100%) scale(${selected ? 1.1 : 1})`,
        transition: 'transform 0.25s ease',
        border: 'none', background: 'transparent',
        padding: 0, cursor: 'pointer',
        zIndex: selected ? 30 : 15,
        opacity: 0.85,
      }}>
      <div style={{
        height: 28,
        borderRadius: 9999,
        background: '#e4e1e5',
        border: '1px solid rgba(255,255,255,0.6)',
        boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '0 11px',
      }}>
        <Icon name="cloud" size={13} color="#4d4635" fill="#4d4635"/>
        <span style={{
          fontFamily: 'Manrope, sans-serif',
          fontWeight: 700, fontSize: 11,
          color: '#4d4635', letterSpacing: '-0.01em',
        }}>{formatPct(pct)}</span>
      </div>
      {/* tail */}
      <div style={{
        width: 0, height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '6px solid #e4e1e5',
        margin: '0 auto',
        opacity: 0.85,
      }}/>
    </button>
  );
}

// User location "blue dot"
function UserPin({ x = 50, y = 50 }) {
  return (
    <div style={{
      position: 'absolute',
      left: `${x}%`, top: `${y}%`,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      <div style={{
        position: 'absolute', inset: -22,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(217,119,6,0.3) 0%, rgba(217,119,6,0) 65%)',
      }}/>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: '#d97706',
        border: '3px solid #fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }}/>
    </div>
  );
}

window.SunPin = SunPin;
window.UserPin = UserPin;
