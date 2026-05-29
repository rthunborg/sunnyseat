// Feedback modal, Review modal, NotFound/empty state, PaymentFailed

function FeedbackModal({ onClose }) {
  const [rating, setRating] = React.useState(0);
  const [text, setText] = React.useState('');
  const [sent, setSent] = React.useState(false);

  return (
    <ModalShell onClose={onClose}>
      {sent ? (
        <SuccessBlock title="Tack!" text="Din feedback hjälper oss göra SunnySeat bättre." onClose={onClose}/>
      ) : (
        <>
          <HeaderBlock icon="sparkle" title="Hjälp oss förbättra" sub="Hur var din upplevelse idag?"/>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setRating(n)} style={{
                width: 40, height: 40, border: 'none',
                background: 'transparent', cursor: 'pointer', padding: 0,
              }}>
                <Icon name="star" size={32}
                  color={n <= rating ? '#ffbf00' : '#e9e1cf'}
                  fill={n <= rating ? '#ffbf00' : 'none'}/>
              </button>
            ))}
          </div>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder="Berätta mer (valfritt)…"
            style={{
              width: '100%', minHeight: 80, marginTop: 16,
              padding: 12, borderRadius: 12,
              background: '#fdfaf4',
              border: '1px solid #e9e1cf',
              fontFamily: 'Manrope, sans-serif',
              fontSize: 14, color: '#1b1b1e',
              resize: 'none', outline: 'none',
              boxSizing: 'border-box',
            }}/>
          <PrimaryBtn disabled={rating === 0} onClick={() => setSent(true)}>
            <Icon name="send" size={16} color="#554300"/> Skicka
          </PrimaryBtn>
          <LinkBtn onClick={onClose}>Avbryt</LinkBtn>
        </>
      )}
    </ModalShell>
  );
}

function ReviewModal({ venue, onClose }) {
  const [rating, setRating] = React.useState(0);
  const [tags, setTags] = React.useState([]);
  const [text, setText] = React.useState('');
  const [sent, setSent] = React.useState(false);

  const toggle = (t) => {
    setTags(ts => ts.includes(t) ? ts.filter(x => x !== t) : [...ts, t]);
  };
  const tagSet = ['Mycket sol', 'Lugnt', 'Bra service', 'Mysigt', 'Bra kaffe', 'Barnvänligt'];

  return (
    <ModalShell onClose={onClose}>
      {sent ? (
        <SuccessBlock title="Recension publicerad" text={`Tack för din recension av ${venue?.name || 'platsen'}.`} onClose={onClose}/>
      ) : (
        <>
          <HeaderBlock icon="sun" title={`Recensera ${venue?.name || 'platsen'}`} sub="Stämde sol-prognosen?"/>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setRating(n)} style={{
                width: 40, height: 40, border: 'none',
                background: 'transparent', cursor: 'pointer', padding: 0,
              }}>
                <Icon name="star" size={32}
                  color={n <= rating ? '#ffbf00' : '#e9e1cf'}
                  fill={n <= rating ? '#ffbf00' : 'none'}/>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14, justifyContent: 'center' }}>
            {tagSet.map(t => {
              const on = tags.includes(t);
              return (
                <button key={t} onClick={() => toggle(t)} style={{
                  height: 28, padding: '0 11px',
                  borderRadius: 9999,
                  background: on ? '#1b1b1e' : '#fff',
                  color: on ? '#fff' : '#4d4635',
                  border: on ? 'none' : '1px solid #e9e1cf',
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>{t}</button>
              );
            })}
          </div>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder="Skriv en recension…"
            style={{
              width: '100%', minHeight: 80, marginTop: 14,
              padding: 12, borderRadius: 12,
              background: '#fdfaf4',
              border: '1px solid #e9e1cf',
              fontFamily: 'Manrope, sans-serif',
              fontSize: 14, color: '#1b1b1e',
              resize: 'none', outline: 'none',
              boxSizing: 'border-box',
            }}/>
          <PrimaryBtn disabled={rating === 0} onClick={() => setSent(true)}>
            <Icon name="send" size={16} color="#554300"/> Publicera
          </PrimaryBtn>
        </>
      )}
    </ModalShell>
  );
}

function PaymentFailed({ onRetry, onClose }) {
  return (
    <ModalShell onClose={onClose}>
      <div style={{
        width: 64, height: 64, margin: '0 auto 16px',
        borderRadius: '50%',
        background: 'rgba(220,38,38,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="close" size={30} color="#dc2626"/>
      </div>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 22, fontWeight: 800, textAlign: 'center',
        color: '#1b1b1e', letterSpacing: '-0.02em',
      }}>Betalningen misslyckades</div>
      <div style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 13, color: '#4b5563', textAlign: 'center',
        marginTop: 6, lineHeight: 1.5,
      }}>Din bank-id-session avbröts eller tog för lång tid. Inga pengar har dragits.</div>
      <PrimaryBtn onClick={onRetry}>
        <Icon name="qr" size={16} color="#554300"/> Försök igen
      </PrimaryBtn>
      <LinkBtn onClick={onClose}>Avbryt</LinkBtn>
    </ModalShell>
  );
}

function NotFoundSheet({ onClose, onExpandRadius }) {
  return (
    <ModalShell onClose={onClose}>
      <div style={{
        width: 80, height: 80, margin: '0 auto 16px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #e4e1e5, #d4d0d5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="cloud" size={42} color="#4d4635" fill="#4d4635"/>
      </div>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 22, fontWeight: 800, textAlign: 'center',
        color: '#1b1b1e', letterSpacing: '-0.02em',
      }}>Inga soliga platser just nu</div>
      <div style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 13, color: '#4b5563', textAlign: 'center',
        marginTop: 6, lineHeight: 1.5, padding: '0 8px',
      }}>Det ligger moln över Göteborg just nu. Prova att flytta fram klockan på tidsväljaren för att se var solen landar senare idag.</div>
      <PrimaryBtn onClick={onClose}>
        <Icon name="clock" size={16} color="#554300"/> Justera tiden
      </PrimaryBtn>
      <LinkBtn onClick={onClose}>Visa alla ändå</LinkBtn>
    </ModalShell>
  );
}

// Shared building blocks ---

function ModalShell({ children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0,
      background: 'rgba(20,15,5,0.45)',
      backdropFilter: 'blur(6px)',
      zIndex: 85,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      animation: 'fade-in 0.2s',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 340,
        borderRadius: 24,
        background: '#fff',
        boxShadow: '0 30px 60px rgba(45,38,20,0.35)',
        padding: '32px 24px',
        animation: 'scale-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
        position: 'relative',
      }}>{children}</div>
    </div>
  );
}

function HeaderBlock({ icon, title, sub }) {
  return (
    <>
      <div style={{
        width: 56, height: 56, margin: '0 auto 14px',
        borderRadius: '50%',
        background: 'rgba(255,191,0,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={28} color="#d4af37" fill="#d4af37"/>
      </div>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 20, fontWeight: 800, textAlign: 'center',
        color: '#1b1b1e', letterSpacing: '-0.02em',
      }}>{title}</div>
      <div style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 13, color: '#4b5563', textAlign: 'center',
        marginTop: 4,
      }}>{sub}</div>
    </>
  );
}

function SuccessBlock({ title, text, onClose }) {
  React.useEffect(() => { const t = setTimeout(onClose, 1800); return () => clearTimeout(t); }, []);
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{
        width: 72, height: 72, margin: '0 auto 16px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #d4af37 0%, #ffbf00 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="check" size={36} color="#fff"/>
      </div>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 20, fontWeight: 800, color: '#1b1b1e',
      }}>{title}</div>
      <div style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 13, color: '#4b5563', marginTop: 6,
      }}>{text}</div>
    </div>
  );
}

function PrimaryBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', height: 50, marginTop: 18,
      borderRadius: 9999,
      background: disabled ? '#eeeeee' : 'linear-gradient(135deg, #d4af37 0%, #ffbf00 100%)',
      color: disabled ? '#a0a0a0' : '#554300',
      border: 'none',
      fontFamily: 'Manrope, sans-serif',
      fontSize: 15, fontWeight: 800,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      boxShadow: disabled ? 'none' : '0 4px 12px rgba(115,92,0,0.25)',
    }}>{children}</button>
  );
}

function LinkBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', marginTop: 10, padding: 8,
      background: 'transparent', border: 'none', cursor: 'pointer',
      fontFamily: 'Manrope, sans-serif',
      fontSize: 14, fontWeight: 700, color: '#4d4635',
    }}>{children}</button>
  );
}

window.FeedbackModal = FeedbackModal;
window.ReviewModal = ReviewModal;
window.PaymentFailed = PaymentFailed;
window.NotFoundSheet = NotFoundSheet;

function SettingsSheet({ onClose, onRestore, onUpgrade, onFeedback, onAbout }) {
  const [restored, setRestored] = React.useState(false);
  return (
    <ModalShell onClose={onClose}>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 20, fontWeight: 800, textAlign: 'center',
        color: '#1b1b1e', letterSpacing: '-0.02em', marginBottom: 4,
      }}>Inställningar</div>
      <div style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 12, color: '#7f7663', textAlign: 'center', marginBottom: 18,
      }}>SunnySeat · version 1.0</div>

      <SettingsRow icon="sparkle" title="Säsongskortet"
        sub="Uppgradera för 7-dagars prognos och fler favoriter"
        onClick={onUpgrade}/>
      <SettingsRow icon="refresh" title="Återställ köp"
        sub={restored ? 'Inga köp att återställa på detta Apple-ID' : 'Har du redan köpt Säsongskortet?'}
        onClick={() => setRestored(true)}/>
      <SettingsRow icon="message" title="Skicka feedback"
        sub="Hjälp oss göra appen bättre"
        onClick={() => { onClose(); setTimeout(onFeedback, 100); }}/>
      <SettingsRow icon="info" title="Om SunnySeat"
        sub="Så fungerar våra sol-prognoser"
        onClick={() => { onClose(); setTimeout(onAbout, 100); }}/>

      <LinkBtn onClick={onClose}>Stäng</LinkBtn>
    </ModalShell>
  );
}

function SettingsRow({ icon, title, sub, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      width: '100%', padding: '12px 8px',
      background: 'transparent', border: 'none',
      borderBottom: '1px solid #f1ead9',
      cursor: 'pointer', textAlign: 'left',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: '#fff3d4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name={icon} size={17} color="#735c00" fill={icon === 'sparkle' ? '#735c00' : 'none'}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 14, fontWeight: 700, color: '#1b1b1e',
        }}>{title}</div>
        <div style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 11.5, color: '#7f7663', marginTop: 1,
        }}>{sub}</div>
      </div>
      <Icon name="chevronRight" size={15} color="#a8a29e"/>
    </button>
  );
}

window.SettingsSheet = SettingsSheet;
