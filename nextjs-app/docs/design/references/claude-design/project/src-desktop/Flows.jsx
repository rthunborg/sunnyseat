// Desktop modal flows: SettingsSheet, PaymentProcessing, PaymentFailed,
// PaymentSuccess. Mirrors the mobile counterparts but sized for desktop.

function DModalShell({ children, onClose, width = 420 }) {
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0,
      background: 'rgba(20,15,5,0.55)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      zIndex: 120,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 32,
      animation: 'fade-in 0.2s',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width, maxWidth: '100%',
        borderRadius: 24,
        background: '#fff',
        boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
        padding: '32px 28px',
        animation: 'scale-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
        position: 'relative',
      }}>{children}</div>
    </div>
  );
}

function DLinkBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', marginTop: 10, padding: 10,
      background: 'transparent', border: 'none', cursor: 'pointer',
      fontFamily: 'Manrope, sans-serif',
      fontSize: 14, fontWeight: 700, color: '#4d4635',
    }}>{children}</button>
  );
}

function DPrimaryBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', height: 50, marginTop: 18,
      borderRadius: 14,
      background: disabled
        ? '#eeeeee'
        : 'linear-gradient(135deg, #1b1b1e 0%, #2a241a 100%)',
      color: disabled ? '#a0a0a0' : '#fff',
      border: 'none',
      fontFamily: 'Manrope, sans-serif',
      fontSize: 14, fontWeight: 800,
      letterSpacing: '0.04em', textTransform: 'uppercase',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    }}>{children}</button>
  );
}

// ---------- Settings ----------

function DSettingsSheet({ onClose, isPremium, onUpgrade, onFeedback, onManage }) {
  const [restored, setRestored] = React.useState(false);
  return (
    <DModalShell onClose={onClose} width={460}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 16, right: 16,
        width: 34, height: 34, borderRadius: '50%',
        background: '#f3ede0', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="close" size={12} color="#4d4635"/>
      </button>

      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 22, fontWeight: 800, textAlign: 'center',
        color: '#1b1b1e', letterSpacing: '-0.02em', marginBottom: 4,
      }}>Inställningar</div>
      <div style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 12, color: '#7f7663', textAlign: 'center', marginBottom: 22,
      }}>SunnySeat · version 1.0</div>

      {isPremium ? (
        <DSettingsRow icon="sun" iconFill="#735c00" title="Säsongskortet"
          sub="Aktivt · förnyas inte automatiskt"
          onClick={onManage}/>
      ) : (
        <DSettingsRow icon="sparkle" iconFill="#735c00" title="Säsongskortet"
          sub="Uppgradera för 7-dagars prognos och fler favoriter"
          onClick={onUpgrade}/>
      )}
      <DSettingsRow icon="refresh" title="Återställ köp"
        sub={restored ? 'Inga köp att återställa på detta konto' : 'Har du redan köpt Säsongskortet?'}
        onClick={() => setRestored(true)}/>
      <DSettingsRow icon="message" title="Skicka feedback"
        sub="Hjälp oss göra appen bättre"
        onClick={() => { onClose(); setTimeout(onFeedback, 100); }}/>
      <DSettingsRow icon="info" title="Om SunnySeat"
        sub="Sekretess, licenser, kontakt" onClick={() => {}}/>

      <DLinkBtn onClick={onClose}>Stäng</DLinkBtn>
    </DModalShell>
  );
}

function DSettingsRow({ icon, iconFill, title, sub, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        width: '100%', padding: '14px 12px',
        background: hover ? '#fdf6e3' : 'transparent',
        border: 'none',
        borderBottom: '1px solid #f1ead9',
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.15s',
      }}>
      <div style={{
        width: 40, height: 40, borderRadius: 11,
        background: '#fff3d4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name={icon} size={18} color="#735c00" fill={iconFill || 'none'}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 15, fontWeight: 700, color: '#1b1b1e',
        }}>{title}</div>
        <div style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 12, color: '#7f7663', marginTop: 2,
        }}>{sub}</div>
      </div>
      <Icon name="chevronRight" size={15} color="#a8a29e"/>
    </button>
  );
}

// ---------- Payment processing ----------

function DPaymentProcessing({ onSuccess, onFail, onClose }) {
  const [stage, setStage] = React.useState(0);
  // 0 = waiting for Swish app, 1 = confirming, 2 = activating

  React.useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 1400);
    const t2 = setTimeout(() => setStage(2), 2800);
    const t3 = setTimeout(() => onSuccess?.(), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const steps = [
    { label: 'Öppna Swish-appen', sub: 'Bekräfta betalningen i din mobil' },
    { label: 'Bekräftar betalning', sub: 'Talar med Swish · 149 kr' },
    { label: 'Aktiverar Säsongskortet', sub: 'Nästan klart…' },
  ];

  return (
    <DModalShell onClose={onClose} width={440}>
      {/* Spinner */}
      <div style={{
        width: 76, height: 76, margin: '0 auto 18px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #fff8e8 0%, #fff3d4 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: -2,
          borderRadius: '50%',
          border: '3px solid transparent',
          borderTopColor: '#1b1b1e',
          borderRightColor: '#1b1b1e',
          animation: 'spin 1s linear infinite',
        }}/>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, #ef5b9c 0%, #b13a8c 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(239,91,156,0.3)',
        }}>
          <span style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 13, fontWeight: 900, color: '#fff',
            letterSpacing: '-0.03em',
          }}>SW</span>
        </div>
      </div>

      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 22, fontWeight: 800, textAlign: 'center',
        color: '#1b1b1e', letterSpacing: '-0.02em',
      }}>{steps[stage].label}</div>
      <div style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 13, color: '#7f7663', textAlign: 'center',
        marginTop: 6, lineHeight: 1.5,
      }}>{steps[stage].sub}</div>

      {/* Progress dots */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 8,
        marginTop: 22,
      }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: i === stage ? 28 : 8, height: 8, borderRadius: 9999,
            background: i <= stage ? '#1b1b1e' : '#e9e1cf',
            transition: 'all 0.3s',
          }}/>
        ))}
      </div>

      <DLinkBtn onClick={() => { onFail?.(); }}>Avbryt betalning</DLinkBtn>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DModalShell>
  );
}

// ---------- Payment failed ----------

function DPaymentFailed({ onRetry, onClose }) {
  return (
    <DModalShell onClose={onClose} width={420}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 16, right: 16,
        width: 34, height: 34, borderRadius: '50%',
        background: '#f3ede0', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="close" size={12} color="#4d4635"/>
      </button>

      <div style={{
        width: 72, height: 72, margin: '0 auto 18px',
        borderRadius: '50%',
        background: 'rgba(220,38,38,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="close" size={32} color="#dc2626"/>
      </div>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 22, fontWeight: 800, textAlign: 'center',
        color: '#1b1b1e', letterSpacing: '-0.02em',
      }}>Betalningen misslyckades</div>
      <div style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 13, color: '#4d4635', textAlign: 'center',
        marginTop: 8, lineHeight: 1.55,
      }}>Din Swish-session avbröts eller tog för lång tid. Inga pengar har dragits.</div>

      <DPrimaryBtn onClick={onRetry}>
        <Icon name="refresh" size={14} color="#fff"/>
        Försök igen
      </DPrimaryBtn>
      <DLinkBtn onClick={onClose}>Avbryt</DLinkBtn>
    </DModalShell>
  );
}

// ---------- Payment success ----------

function DPaymentSuccess({ onClose }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, []);

  return (
    <DModalShell onClose={onClose} width={420}>
      <div style={{
        width: 84, height: 84, margin: '0 auto 18px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #d4af37 0%, #ffbf00 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 18px rgba(212,175,55,0.45)',
        animation: 'pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <Icon name="check" size={42} color="#fff"/>
      </div>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 22, fontWeight: 800, textAlign: 'center',
        color: '#1b1b1e', letterSpacing: '-0.02em',
      }}>Säsongskortet aktiverat</div>
      <div style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 13, color: '#4d4635', textAlign: 'center',
        marginTop: 8, lineHeight: 1.55, padding: '0 12px',
      }}>Du har nu tillgång till Soltidsplaneraren, 7-dagars prognos och alerts hela säsongen ut.</div>

      <DPrimaryBtn onClick={onClose}>
        Börja följa solen
        <Icon name="arrow-right" size={14} color="#fff"/>
      </DPrimaryBtn>

      <style>{`@keyframes pop-in {
        from { opacity: 0; transform: scale(0.6); }
        to { opacity: 1; transform: scale(1); }
      }`}</style>
    </DModalShell>
  );
}

window.DSettingsSheet = DSettingsSheet;
window.DPaymentProcessing = DPaymentProcessing;
window.DPaymentFailed = DPaymentFailed;
window.DPaymentSuccess = DPaymentSuccess;
