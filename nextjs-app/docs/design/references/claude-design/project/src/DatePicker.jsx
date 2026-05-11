// Datepicker modal

function DatePicker({ selectedDate, onSelect, onClose }) {
  const monthStart = new Date(2026, 5, 1); // June 2026
  const days = [];
  for (let i = 1; i <= 30; i++) days.push(i);

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0,
      background: 'rgba(20,15,5,0.45)',
      backdropFilter: 'blur(6px)',
      zIndex: 85,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      animation: 'fade-in 0.2s',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%',
        background: '#fdfaf4',
        borderRadius: '32px 32px 0 0',
        padding: '18px 20px 32px',
        animation: 'slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        <div style={{
          width: 44, height: 5, borderRadius: 9999,
          background: 'rgba(208,197,175,0.9)',
          margin: '0 auto 14px',
        }}/>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 18,
        }}>
          <button style={iconSq}><Icon name="chevronLeft" size={16} color="#4d4635"/></button>
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 18, fontWeight: 800, color: '#1b1b1e', letterSpacing: '-0.02em',
          }}>Juni 2026</div>
          <button style={iconSq}><Icon name="chevronRight" size={16} color="#4d4635"/></button>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
          fontFamily: 'Manrope, sans-serif',
          fontSize: 10, fontWeight: 700, color: '#7f7663',
          textAlign: 'center', letterSpacing: '0.08em',
          marginBottom: 6,
        }}>
          {['M','T','O','T','F','L','S'].map((d, i) => <div key={i}>{d}</div>)}
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
        }}>
          {Array.from({length: 0}).map((_, i) => <div key={`e${i}`}/>)}
          {days.map(d => {
            const sel = d === selectedDate;
            const today = d === 14;
            // mock sun forecast per day
            const forecast = [0.95, 0.4, 0.8, 0.1, 0.6, 0.88, 0.75][d % 7];
            const c = sunColor(forecast);
            return (
              <button key={d} onClick={() => { onSelect(d); onClose(); }} style={{
                aspectRatio: '1', border: 'none', cursor: 'pointer',
                borderRadius: 10,
                background: sel ? '#1b1b1e' : today ? '#fff3d4' : 'transparent',
                color: sel ? '#fff' : '#1b1b1e',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 700, fontSize: 14,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 2, padding: 0, position: 'relative',
              }}>
                <span>{d}</span>
                <div style={{
                  width: 14, height: 3, borderRadius: 9999,
                  background: c.bg, opacity: sel ? 0.8 : 0.9,
                }}/>
              </button>
            );
          })}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: 12, marginTop: 16,
          borderRadius: 14, background: '#fff3d4',
          fontFamily: 'Manrope, sans-serif',
          fontSize: 12, color: '#574500', fontWeight: 500,
        }}>
          <Icon name="sparkle" size={18} color="#d4af37" fill="#d4af37"/>
          <span>7-dagars solprognos är en Säsongskort-funktion.</span>
        </div>
      </div>
    </div>
  );
}

const iconSq = {
  width: 36, height: 36, borderRadius: 10,
  background: '#f5f0e6', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
};

window.DatePicker = DatePicker;
