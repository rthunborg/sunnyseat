// Placeholder venue thumbnail for desktop — diagonal hatch + dashed image badge
// + venue initial. Used in Sidebar cards, QuickInfo, VenueDetail hero, Planner stops.
// Mirror of src/BottomSheet.jsx → PlaceholderThumb so desktop and mobile read identically.

function PlaceholderThumb({ venue, color, size = 60, radius = 12, showInitial = true, showImageBadge = true, showSunBadge = true, hatchSize = 6 }) {
  const initial = (venue?.name || '?').charAt(0).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      position: 'relative', flexShrink: 0, overflow: 'hidden',
      background: `
        repeating-linear-gradient(45deg,
          rgba(115,92,0,0.10) 0 ${hatchSize}px,
          rgba(115,92,0,0.02) ${hatchSize}px ${hatchSize * 2}px),
        linear-gradient(135deg, #f5ecd2 0%, #ede1bf 100%)`,
      border: '1px dashed rgba(115,92,0,0.35)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {showInitial && (
        <span style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: Math.max(14, size * 0.42), fontWeight: 800,
          color: 'rgba(115,92,0,0.55)',
          letterSpacing: '-0.02em',
        }}>{initial}</span>
      )}

      {showImageBadge && (
        <div style={{
          position: 'absolute', top: 5, right: 5,
          width: 18, height: 18, borderRadius: 6,
          background: 'rgba(253,250,244,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        }}>
          <Icon name="image" size={10} color="#9a8a66"/>
        </div>
      )}

      {color && showSunBadge && (
        <div style={{
          position: 'absolute', left: 5, bottom: 5,
          width: 22, height: 22, borderRadius: '50%',
          background: color.bg, border: '2px solid #fdfaf4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="sun" size={11} color={color.fg} fill={color.fg}/>
        </div>
      )}
    </div>
  );
}

// Larger hero placeholder — for VenueDetail panel header
function PlaceholderHero({ venue, height = 220, label = 'Platshållarbild' }) {
  return (
    <div style={{
      width: '100%', height,
      position: 'relative',
      background: `
        repeating-linear-gradient(45deg, rgba(115,92,0,0.08) 0 14px, rgba(115,92,0,0.02) 14px 28px),
        linear-gradient(135deg, #f5ecd2 0%, #ede1bf 100%)`,
      borderBottom: '1px dashed rgba(115,92,0,0.3)',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'rgba(255,255,255,0.6)',
          border: '1.5px dashed rgba(115,92,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="image" size={28} color="#a89875"/>
        </div>
        <div style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 10, fontWeight: 800,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: '#9a8a66',
        }}>{label}</div>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 14, fontWeight: 700,
          color: '#735c00',
          marginTop: -4,
        }}>{venue?.name}</div>
      </div>
    </div>
  );
}

window.PlaceholderThumb = PlaceholderThumb;
window.PlaceholderHero = PlaceholderHero;
