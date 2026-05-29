// Bottom-anchored time scrubber (streamlined — no date row).
// Wide pill (~960px), centered:
//   [time]   ──slider track──   [calendar]
//                 06 09 12 15 18 21

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
      borderRadius: 28,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      boxShadow: '0 -12px 32px rgba(115,92,0,0.08), 0 16px 40px rgba(115,92,0,0.10)',
      border: '0.5px solid rgba(255,255,255,0.9)',

      display: 'flex', flexDirection: 'column',
      padding: '8px 20px 8px',
      gap: 2
    }}>
      {/* Single row: [time readout]  ──slider──  [calendar] */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14
      }}>
        {/* Current time readout — dark pill badge matching mobile */}
        <div style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 11, fontWeight: 700,
          letterSpacing: '0.04em',
          background: '#1b1b1e',
          color: '#fff',
          padding: '3px 10px',
          borderRadius: 9999,
          minWidth: 48,
          textAlign: 'center',
          flexShrink: 0
        }}>{timeStr}</div>

        {/* Slider track */}
        <div style={{ position: 'relative', flex: 1 }}>
          <div
            ref={trackRef}
            onPointerDown={onDown}
            style={{
              position: 'relative',
              height: 22,
              cursor: draggingTime ? 'grabbing' : 'grab',
              touchAction: 'none'
            }}>
            {/* Track — warm yellow gradient matching mobile TopPanel */}
            <div style={{
              position: 'absolute',
              left: 0, right: 0, top: 8,
              height: 6, borderRadius: 9999,
              background: 'linear-gradient(90deg, #f5e6c8 0%, #ffe088 15%, #ffbf00 45%, #d4af37 75%, #735c00 100%)',
              opacity: 0.4,
              overflow: 'hidden'
            }} />
            {/* Filled — yellow gradient matching mobile */}
            <div style={{
              position: 'absolute',
              left: 0, top: 8,
              width: `${pct * 100}%`,
              height: 6, borderRadius: 9999,
              background: 'linear-gradient(90deg, #f1b100 0%, #ffbf00 50%, #d4af37 100%)',
              boxShadow: '0 1px 3px rgba(115,92,0,0.25)',
              pointerEvents: 'none'
            }} />
            {/* Round thumb — white with #ffbf00 ring, matching mobile */}
            <div style={{
              position: 'absolute',
              left: `${pct * 100}%`,
              top: 0,
              transform: 'translateX(-50%)',
              width: 22, height: 22,
              borderRadius: '50%',
              background: '#fff',
              border: '2.5px solid #ffbf00',
              boxShadow: '0 4px 10px rgba(115,92,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffbf00' }} />
            </div>
          </div>
        </div>

        {/* Calendar — opens date picker */}
        <button onClick={onCalendar} style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'transparent',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>
          <Icon name="calendar" size={17} color="#735c00" />
        </button>
      </div>

      {/* Tick labels — aligned under the slider track */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginLeft: 62, marginRight: 46,
        fontFamily: 'Manrope, sans-serif',
        fontSize: 10, fontWeight: 700,
        color: '#a8a29e', letterSpacing: '0.06em'
      }}>
        {[6, 9, 12, 15, 18, 21].map((h) =>
          <span key={h}>{String(h).padStart(2, '0')}</span>
        )}
      </div>
    </div>);

}

window.TimeScrubber = TimeScrubber;
