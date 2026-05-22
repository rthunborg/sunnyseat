// Top floating panel: time slider with calendar icon (streamlined, no date row)
// Free tier still uses this — the locked overlay sits on top via LockedPlanner.

function TopPanel({ hour, setHour, onLocked, onCalendar, selectedDate = 14 }) {
  const hourLabel = `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.round((hour % 1) * 60)).padStart(2, '0')}`;
  const sliderFrac = (hour - 6) / 15;

  return (
    <div style={{
      position: 'absolute',
      top: 58, left: 16, right: 16,
      borderRadius: 24,
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      boxShadow: '0 12px 32px rgba(115,92,0,0.15), 0 2px 4px rgba(115,92,0,0.06)',
      border: '0.5px solid rgba(255,255,255,0.9)',
      padding: '22px 14px 10px 18px',
      zIndex: 25,
    }}>
      {/* Slider row: slider takes available width, calendar icon at right */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ flex: 1, position: 'relative', height: 32, display: 'flex', alignItems: 'center' }}>
          {/* track */}
          <div style={{
            position: 'absolute', left: 0, right: 0,
            height: 6, borderRadius: 9999,
            background: 'linear-gradient(90deg, #f5e6c8 0%, #ffe088 15%, #ffbf00 45%, #d4af37 75%, #735c00 100%)',
            opacity: 0.4,
          }}/>
          <div style={{
            position: 'absolute', left: 0,
            width: `${sliderFrac * 100}%`,
            height: 6, borderRadius: 9999,
            background: 'linear-gradient(90deg, #f1b100 0%, #ffbf00 50%, #d4af37 100%)',
            boxShadow: '0 1px 3px rgba(115,92,0,0.25)',
            transition: 'width 0.15s',
          }}/>

          <input
            type="range"
            min="6" max="21" step="0.25"
            value={hour}
            onChange={e => setHour(parseFloat(e.target.value))}
            style={{
              position: 'absolute', inset: 0, opacity: 0,
              cursor: 'grab', zIndex: 2, WebkitAppearance: 'none',
            }}
          />
          {/* thumb */}
          <div style={{
            position: 'absolute',
            left: `calc(${sliderFrac * 100}% - 12px)`,
            width: 24, height: 24, borderRadius: 9999,
            background: '#fff',
            border: '2.5px solid #ffbf00',
            boxShadow: '0 4px 10px rgba(115,92,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'left 0.15s',
            pointerEvents: 'none',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffbf00' }}/>
          </div>

          {/* time badge — floats above thumb */}
          <div style={{
            position: 'absolute',
            left: `calc(${sliderFrac * 100}% - 24px)`,
            top: -20,
            minWidth: 48,
            padding: '1px 8px',
            borderRadius: 9999,
            background: '#1b1b1e',
            color: '#fff',
            fontFamily: 'Manrope, sans-serif',
            fontSize: 10, fontWeight: 700,
            letterSpacing: '0.04em',
            textAlign: 'center',
            pointerEvents: 'none',
            transition: 'left 0.15s',
          }}>{hourLabel}</div>
        </div>

        {/* Calendar — opens date picker (or upsell on free tier) */}
        <button
          onClick={onCalendar || onLocked}
          style={iconBtn}>
          <Icon name="calendar" size={17} color="#735c00"/>
        </button>
      </div>

      {/* Tick labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 2,
        paddingRight: 36,
        fontFamily: 'Manrope, sans-serif',
        fontSize: 9, fontWeight: 600,
        color: '#a8a29e', letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        <span>06</span><span>12</span><span>18</span><span>21</span>
      </div>
    </div>
  );
}

const iconBtn = {
  background: 'transparent',
  border: 'none',
  width: 32, height: 32,
  borderRadius: 9999,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  flexShrink: 0,
};

window.TopPanel = TopPanel;
