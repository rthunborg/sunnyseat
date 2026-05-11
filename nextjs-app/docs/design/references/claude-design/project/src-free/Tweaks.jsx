// Tweaks panel (bottom-right floating) — host-sync'd

function Tweaks({ state, setState, visible, onDebugModal,
  isPremium, setIsPremium, paywallForceFail, setPaywallForceFail, onShowPaywall }) {
  if (!visible) return null;

  const update = (patch) => {
    const next = { ...state, ...patch };
    setState(next);
    window.parent?.postMessage({ type: '__edit_mode_set_keys', edits: patch }, '*');
  };

  const resetFree = () => {
    setIsPremium?.(false);
    setPaywallForceFail?.(false);
  };

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20,
      width: 280,
      background: 'rgba(30,25,20,0.92)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,220,160,0.15)',
      borderRadius: 18, padding: 18,
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      color: '#fdfaf4',
      fontFamily: 'Manrope, sans-serif',
      zIndex: 200,
      animation: 'slide-up 0.3s',
    }}>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 13, fontWeight: 800,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: '#ffbf00', marginBottom: 14,
      }}>Tweaks</div>

      <Row label="Konto">
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setIsPremium?.(false)} style={seg(!isPremium)}>Gratis</button>
          <button onClick={() => setIsPremium?.(true)}  style={seg(!!isPremium)}>Säsongskort</button>
        </div>
      </Row>

      <Row label="Betalningssimulering">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={onShowPaywall} style={{ ...seg(false), flex: '1 1 auto', background: 'rgba(48,208,88,0.18)', color: '#3ed864' }}>
            Öppna paywall
          </button>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 10.5, fontWeight: 700,
            color: paywallForceFail ? '#ff8866' : 'rgba(255,255,255,0.7)',
            cursor: 'pointer', padding: '0 8px',
          }}>
            <input type="checkbox" checked={!!paywallForceFail}
              onChange={e => setPaywallForceFail?.(e.target.checked)}
              style={{ accentColor: '#ff5577' }}/>
            Forcera fel
          </label>
        </div>
      </Row>

      <Row label={`Tid på dagen — ${String(Math.floor(state.hour)).padStart(2,'0')}:${String(Math.round((state.hour%1)*60)).padStart(2,'0')}`}>
        <input
          type="range" min="6" max="21" step="0.25"
          value={state.hour}
          onChange={e => update({ hour: parseFloat(e.target.value) })}
          style={{ width: '100%', accentColor: '#ffbf00' }}
        />
      </Row>

      <Row label="Kartstil">
        <div style={{ display: 'flex', gap: 6 }}>
          {[['warm','Varm'], ['neutral','Neutral'], ['dusk','Skymning']].map(([v, l]) => (
            <button key={v}
              onClick={() => update({ mapStyle: v })}
              style={seg(state.mapStyle === v)}>{l}</button>
          ))}
        </div>
      </Row>

      <Row label="Pin-stil">
        <div style={{ display: 'flex', gap: 6 }}>
          {[['amber','Amber'], ['mono','Mono']].map(([v, l]) => (
            <button key={v}
              onClick={() => update({ variant: v })}
              style={seg(state.variant === v)}>{l}</button>
          ))}
        </div>
      </Row>

      <Row label="Visa flöde">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[['datepicker','Datum'],['feedback','Feedback'],['review','Recension'],['notfound','Tomt'],['paymentFailed','Betalning fel']].map(([v,l]) => (
            <button key={v} onClick={() => onDebugModal?.(v)} style={{
              ...seg(false), flex: '1 1 auto',
              background: 'rgba(255,191,0,0.12)', color: '#ffbf00',
            }}>{l}</button>
          ))}
        </div>
      </Row>

      <div style={{
        marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)',
        fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5,
      }}>
        Slide time-of-day — sun % updates live for every venue. Each pin's peak hour depends on orientation (south/east/west/north).
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700,
        color: 'rgba(255,255,255,0.55)',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        marginBottom: 6,
      }}>{label}</div>
      {children}
    </div>
  );
}

const seg = (active) => ({
  flex: 1,
  height: 28, padding: '0 10px',
  borderRadius: 9,
  background: active ? '#ffbf00' : 'rgba(255,255,255,0.08)',
  color: active ? '#1b1b1e' : '#fdfaf4',
  border: 'none', cursor: 'pointer',
  fontFamily: 'Manrope, sans-serif',
  fontSize: 11, fontWeight: 800,
  letterSpacing: '-0.01em',
});

window.Tweaks = Tweaks;
