// Desktop modal flows: SettingsSheet, FeedbackModal.

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

function DSettingsSheet({ onClose, onFeedback, onAbout }) {
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

      <DSettingsRow icon="message" title="Skicka feedback"
        sub="Hjälp oss göra appen bättre"
        onClick={() => { onClose(); setTimeout(onFeedback, 100); }}/>
      <DSettingsRow icon="info" title="Om SunnySeat"
        sub="Så fungerar våra sol-prognoser"
        onClick={() => { onClose(); setTimeout(onAbout, 100); }}/>

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

window.DSettingsSheet = DSettingsSheet;

// ---------- Feedback ----------

function DFeedbackModal({ onClose }) {
  const [rating, setRating] = React.useState(0);
  const [text, setText] = React.useState('');
  const [sent, setSent] = React.useState(false);

  return (
    <DModalShell onClose={onClose} width={480}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 16, right: 16,
        width: 34, height: 34, borderRadius: '50%',
        background: '#f3ede0', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="close" size={12} color="#4d4635"/>
      </button>

      {sent ? (
        <div style={{ padding: '24px 4px 4px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#fff3d4', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="check" size={26} color="#735c00"/>
          </div>
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 22, fontWeight: 800,
            color: '#1b1b1e', letterSpacing: '-0.02em', marginBottom: 6,
          }}>Tack!</div>
          <div style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 14, color: '#7f7663', marginBottom: 8,
            textWrap: 'pretty',
          }}>Din feedback hjälper oss göra SunnySeat bättre.</div>
          <DPrimaryBtn onClick={onClose}>Stäng</DPrimaryBtn>
        </div>
      ) : (
        <>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: '#fff3d4', margin: '4px auto 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="sparkle" size={22} color="#735c00"/>
          </div>
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 22, fontWeight: 800, textAlign: 'center',
            color: '#1b1b1e', letterSpacing: '-0.02em', marginBottom: 4,
          }}>Kontakt & feedback</div>
          <div style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 13, color: '#7f7663', textAlign: 'center', marginBottom: 18,
            textWrap: 'pretty',
          }}>Hur var din upplevelse av SunnySeat idag?</div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setRating(n)} style={{
                width: 44, height: 44, border: 'none',
                background: 'transparent', cursor: 'pointer', padding: 0,
              }}>
                <Icon name="star" size={34}
                  color={n <= rating ? '#ffbf00' : '#e9e1cf'}
                  fill={n <= rating ? '#ffbf00' : 'none'}/>
              </button>
            ))}
          </div>

          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder="Berätta mer (valfritt)…"
            style={{
              width: '100%', minHeight: 96, marginTop: 18,
              padding: 14, borderRadius: 12,
              background: '#fdfaf4',
              border: '1px solid #e9e1cf',
              fontFamily: 'Manrope, sans-serif',
              fontSize: 14, color: '#1b1b1e',
              resize: 'none', outline: 'none',
              boxSizing: 'border-box',
            }}/>

          <DPrimaryBtn disabled={rating === 0} onClick={() => setSent(true)}>
            <Icon name="send" size={16} color={rating === 0 ? '#a0a0a0' : '#fff'}/>
            Skicka
          </DPrimaryBtn>
          <DLinkBtn onClick={onClose}>Avbryt</DLinkBtn>
        </>
      )}
    </DModalShell>
  );
}

window.DFeedbackModal = DFeedbackModal;
