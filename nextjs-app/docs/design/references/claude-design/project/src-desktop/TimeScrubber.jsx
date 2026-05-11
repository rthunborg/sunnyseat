// Bottom-anchored time scrubber + date selector (desktop premium planner).
// Wide pill (~960px), centered, mirrors Figma "premium-planner-component-desktop":
//   [‹  Lördag 14 juni / Säsongskortet  ›  | calendar]    ──slider track──    06 09 12 15 18

function TimeScrubber({ hour, setHour, selectedDate = 14, onCalendar }) {
  const trackRef = React.useRef(null);
  const [draggingTime, setDraggingTime] = React.useState(false);

  const HOUR_MIN = 6;
  const HOUR_MAX = 21;
  const pct = (hour - HOUR_MIN) / (HOUR_MAX - HOUR_MIN);

  const onDown = (e) => {
    e.stopPropagation();
    setDraggingTime(true);
    update(e);
  };
  const update = (e) => {
    const r = trackRef.current.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setHour(HOUR_MIN + p * (HOUR_MAX - HOUR_MIN));
  };
  React.useEffect(() => {
    if (!draggingTime) return;
    const onMove = (e) => update(e);
    const onUp = () => setDraggingTime(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [draggingTime]);

  const hh = Math.floor(hour);
  const mm = Math.round((hour - hh) * 60);
  const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

  return (
    <div onPointerDown={(e) => e.stopPropagation()} style={{
      width: '100%',
      borderRadius: 32,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      boxShadow: '0 -12px 32px rgba(115,92,0,0.08), 0 16px 40px rgba(115,92,0,0.10)',
      border: '0.5px solid rgba(255,255,255,0.9)',

      display: 'flex', flexDirection: 'column',
      padding: "3px 24px 0px", gap: "0px"
    }}>
      {/* Top row: date controls (left) · current time pill (right) */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        {/* Date pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '6px 8px',
          borderRadius: 12
        }}>
          <RoundIconBtn icon="chevronLeft" />
          <div style={{
            padding: '0 8px',
            textAlign: 'center',
            minWidth: 110,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
          }}>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 14, fontWeight: 700, color: '#1b1b1e',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap'
            }}>{dateLabel(selectedDate)}</div>
            <div style={{
              padding: '2px 8px',
              borderRadius: 6,
              background: '#ffe088',
              fontFamily: 'Manrope, sans-serif',
              fontSize: 9, fontWeight: 700,
              color: '#574500', letterSpacing: '0.10em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap'
            }}>Säsongskortet</div>
          </div>
          <RoundIconBtn icon="chevronRight" />
          <div style={{
            width: 1, height: 24, background: '#e7e5e4',
            margin: '0 8px'
          }} />
          <button onClick={onCalendar} style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'transparent',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="calendar" size={17} color="#735c00" />
          </button>
        </div>

        {/* Current time — large amber */}
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 14, fontWeight: 700, color: '#735c00',
          letterSpacing: '-0.01em'
        }}>{timeStr}</div>
      </div>

      {/* Slider track */}
      <div style={{ position: 'relative', padding: '8px 0' }}>
        <div
          ref={trackRef}
          onPointerDown={onDown}
          style={{
            position: 'relative',
            height: 14,
            cursor: draggingTime ? 'grabbing' : 'grab',
            touchAction: 'none'
          }}>
          {/* Track */}
          <div style={{
            position: 'absolute',
            left: 0, right: 0, top: 4,
            height: 6, borderRadius: 9999,
            background: '#f0edf1',
            overflow: 'hidden'
          }}>
            {/* Filled (gradient that fades at ends) */}
            <div style={{
              position: 'absolute',
              left: 0, top: 0,
              width: `${pct * 100}%`,
              height: 6,
              background: 'linear-gradient(90deg, rgba(115,92,0,0.2) 0%, #d4af37 50%, rgba(115,92,0,0.2) 100%)'
            }} />
          </div>
          {/* Pill thumb */}
          <div style={{
            position: 'absolute',
            left: `${pct * 100}%`,
            top: 0,
            transform: 'translateX(-50%)',
            width: 42, height: 14,
            borderRadius: 9999,
            background: '#735c00',
            border: '2px solid #fff',
            boxShadow: '0 1px 2px -1px rgba(0,0,0,0.1), 0 2px 4px -0.5px rgba(0,0,0,0.1)',
            pointerEvents: 'none'
          }} />
        </div>
      </div>

      {/* Tick labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '0 4px',
        fontFamily: 'Manrope, sans-serif',
        fontSize: 10, fontWeight: 700,
        color: '#a39b85', letterSpacing: '0.06em'
      }}>
        {[6, 9, 12, 15, 18, 21].map((h) =>
        <span key={h}>{String(h).padStart(2, '0')}</span>
        )}
      </div>
    </div>);

}

function RoundIconBtn({ icon, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 28, height: 28, borderRadius: '50%',
      background: 'transparent',
      border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <Icon name={icon} size={13} color="#4d4635" />
    </button>);

}

function dateLabel(d) {
  // June 2026, day 14 = Saturday — full weekday name like "Lördag 14 juni"
  const weekdays = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
  const start = new Date(2026, 5, 1).getDay();
  const wd = weekdays[(start + d - 1) % 7];
  return `${wd} ${d} juni`;
}

window.TimeScrubber = TimeScrubber;