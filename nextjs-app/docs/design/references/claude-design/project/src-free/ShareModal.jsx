// Share-venue overlay modal — bottom sheet on mobile.
// Buttons: Instagram / Facebook / WhatsApp / Messenger / Snapchat + Copy link.
// Close via top-right "×" button OR by tapping the scrim.

function ShareModal({ venue, onClose }) {
  if (!venue) return null;
  const [copied, setCopied] = React.useState(false);

  const slug = venue.name.toLowerCase()
    .replace(/[åä]/g, 'a').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const url = `https://sunnyseat.app/v/${slug}`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy'); ta.remove();
      }
    } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Esc-to-close
  React.useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const options = [
    { id: 'ig', label: 'Instagram',
      bg: 'linear-gradient(135deg, #f5a445 0%, #e94c66 45%, #c13584 75%, #833ab4 100%)',
      fg: '#fff', glyph: 'Ig' },
    { id: 'fb', label: 'Facebook',
      bg: '#1877f2', fg: '#fff', glyph: 'f' },
    { id: 'wa', label: 'WhatsApp',
      bg: '#25d366', fg: '#fff', glyph: 'Wa' },
    { id: 'm',  label: 'Messenger',
      bg: 'linear-gradient(135deg, #00b2ff 0%, #006aff 55%, #d100ff 100%)',
      fg: '#fff', glyph: 'M' },
    { id: 'sc', label: 'Snapchat',
      bg: '#fffc00', fg: '#1b1b1e', glyph: 'Sc' },
  ];

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0,
      background: 'rgba(20,15,5,0.45)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      zIndex: 95,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      animation: 'fade-in 0.2s',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%',
        borderRadius: '28px 28px 0 0',
        background: '#fdfaf4',
        boxShadow: '0 -16px 50px rgba(45,38,20,0.28)',
        padding: '14px 22px 28px',
        position: 'relative',
        animation: 'slide-up 0.34s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        {/* drag handle */}
        <div style={{
          width: 44, height: 5, borderRadius: 9999,
          background: '#e7e2d4',
          margin: '0 auto 14px',
        }}/>

        {/* Close btn — corner */}
        <button onClick={onClose} aria-label="Stäng" style={{
          position: 'absolute', top: 14, right: 14,
          width: 34, height: 34, borderRadius: '50%',
          background: '#f5f0e6', border: '1px solid #eee5cf',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="close" size={16} color="#4d4635"/>
        </button>

        {/* Title */}
        <div style={{ paddingRight: 44 }}>
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 19, fontWeight: 800, color: '#1b1b1e',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>Dela {venue.name}</div>
          <div style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 12.5, color: '#7f7663', marginTop: 3, fontWeight: 500,
          }}>Skicka platsen till en vän</div>
        </div>

        {/* Share targets */}
        <div style={{
          marginTop: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 6,
        }}>
          {options.map(o => <ShareTargetBtn key={o.id} {...o}/>)}
        </div>

        {/* Copy link row */}
        <div style={{
          marginTop: 22,
          padding: '10px 10px 10px 14px',
          borderRadius: 16,
          background: '#fff',
          border: '1px solid #eee5cf',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 9,
            background: '#f5f0e6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon name="route" size={14} color="#735c00"/>
          </div>
          <div style={{
            flex: 1, minWidth: 0,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: 12, color: '#4d4635', fontWeight: 600,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{url}</div>
          <button onClick={handleCopy} style={{
            height: 36, padding: '0 14px',
            borderRadius: 9999,
            background: copied ? '#dcf5e3' : '#1b1b1e',
            color: copied ? '#215a36' : '#fff',
            border: 'none', cursor: 'pointer',
            fontFamily: 'Manrope, sans-serif',
            fontSize: 12, fontWeight: 800,
            letterSpacing: '0.02em',
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'background 0.2s, color 0.2s',
            flexShrink: 0,
          }}>
            {copied
              ? <><Icon name="check" size={13} color="#215a36"/> Kopierad</>
              : 'Kopiera länk'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareTargetBtn({ label, bg, fg, glyph }) {
  const [hover, setHover] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      title={`Dela till ${label}`}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '6px 0',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
      }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16,
        background: bg,
        color: fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 20, fontWeight: 800,
        letterSpacing: '-0.02em',
        boxShadow: hover
          ? '0 8px 18px rgba(20,15,5,0.18)'
          : '0 2px 6px rgba(20,15,5,0.10)',
        transform: pressed ? 'translateY(0) scale(0.96)' : (hover ? 'translateY(-2px)' : 'none'),
        transition: 'transform 0.16s, box-shadow 0.16s',
        border: label === 'Snapchat' ? '1px solid #f0ee00' : 'none',
      }}>{glyph}</div>
      <span style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 10.5, fontWeight: 700, color: '#4d4635',
        letterSpacing: '0.01em',
      }}>{label}</span>
    </button>
  );
}

window.ShareModal = ShareModal;
