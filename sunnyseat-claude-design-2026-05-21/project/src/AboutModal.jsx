// "Om SunnySeat" — full-screen sheet inside the iOS device frame.
// Ported from Figma node 32:629 (about-mobile).

function AboutModal({ onClose, onFeedback }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#fdfaf4',
      zIndex: 90,
      display: 'flex', flexDirection: 'column',
      animation: 'slide-up 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
    }}>
      {/* Scroll area */}
      <div className="no-scroll" style={{
        flex: 1, overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '52px 0 168px',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 20px 28px',
        }}>
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 700, fontSize: 18, lineHeight: '28px',
            letterSpacing: '0.1em', color: '#1b1b1e',
          }}>SunnySeat</div>
          <button onClick={onClose} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '4px 2px',
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 700, fontSize: 14, lineHeight: '20px',
            color: '#735c00',
          }}>
            <svg width="10" height="10" viewBox="0 0 9.333 9.333" style={{ display: 'block' }}>
              <path d="M 2.231 5.25 L 5.498 8.517 L 4.667 9.333 L 0 4.667 L 4.667 0 L 5.498 0.817 L 2.231 4.083 L 9.333 4.083 L 9.333 5.25 L 2.231 5.25 L 2.231 5.25"
                fill="#735c00" fillRule="nonzero"/>
            </svg>
            Tillbaka
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 56 }}>
          {/* Hero */}
          <h1 style={{
            margin: 0,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 700, fontSize: 36, lineHeight: '39.6px',
            letterSpacing: '-0.025em', color: '#1b1b1e',
            whiteSpace: 'pre-line',
          }}>{"Hur fungerar\nSunnySeat?"}</h1>

          {/* ALGORITMEN */}
          <Section eyebrow="ALGORITMEN">
            <Para>
              Vår algoritm beräknar solens exakta position på himlen i realtid baserat på dina koordinater och aktuell tid. Genom att kombinera detta med högupplösta 3D-modeller av byggnader och terräng kan vi förutse var skuggorna faller med imponerande precision.
            </Para>
            <Para>
              Vi analyserar tusentals ljusstrålar för varje plats för att avgöra om en uteservering eller parkbänk faktiskt badar i solljus, eller om den ligger dold i skuggan av en intilliggande huskropp.
            </Para>
          </Section>

          {/* DATAKÄLLOR */}
          <Section eyebrow="DATAKÄLLOR">
            <SourceCard
              title="Lantmäteriet"
              body="Topografisk data och byggnadshöjder för exakt skuggberäkning."/>
            <SourceCard
              title="Met.no"
              body="Meteorologiska data för realtidsuppdateringar om molntäcke och sikt."/>
            <SourceCard
              title="OpenStreetMap"
              body="Global gemenskapsdriven kartdata för intressepunkter och stadsplanering."/>
          </Section>

          {/* Image break */}
          <div style={{
            borderRadius: 12, overflow: 'hidden',
            height: 197, position: 'relative',
            background: '#eae7eb',
          }}>
            <img src="uploads/about-golden-hour.png" alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(115,92,0,0.10)',
              mixBlendMode: 'overlay',
            }}/>
          </div>

          {/* NOGGRANNHET */}
          <Section eyebrow="NOGGRANNHET">
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4,
            }}>
              <span style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 800, fontSize: 56, lineHeight: 1,
                letterSpacing: '-0.04em',
                background: 'linear-gradient(135deg, #d4af37 0%, #ffbf00 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text', color: 'transparent',
              }}>85%</span>
              <span style={{
                fontFamily: 'Manrope, sans-serif', fontWeight: 700,
                fontSize: 13, color: '#7f7663',
                textTransform: 'uppercase', letterSpacing: '0.16em',
              }}>träffsäkerhet</span>
            </div>
            <Para>
              Våra prognoser bygger på statiska data om arkitektur och dynamiska väderrapporter. Även om vi strävar efter perfektion kan faktorer som tillfälliga markiser, stora fordon eller lokala molnbildningar påverka resultatet. Vi rekommenderar att alltid använda SunnySeat som en vägledning för din nästa solstund.
            </Para>
          </Section>
        </div>
      </div>

      {/* Sticky footer (gradient fade) */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '40px 20px 40px',
        background: 'linear-gradient(180deg, rgba(253,250,244,0) 0%, rgba(253,250,244,0.92) 28%, #fdfaf4 60%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
        pointerEvents: 'none',
      }}>
        <button onClick={() => { onClose(); setTimeout(onFeedback, 120); }} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: 'Manrope, sans-serif', fontWeight: 500, fontSize: 14,
          lineHeight: '20px', color: '#4d4635',
          textDecoration: 'underline', textUnderlineOffset: 3,
          padding: 4, pointerEvents: 'auto',
        }}>Kontakt &amp; Feedback</button>
        <button onClick={onClose} style={{
          width: '100%', height: 56, borderRadius: 9999, border: 'none',
          background: 'linear-gradient(180deg, #d4af37 0%, #ffbf00 100%)',
          boxShadow: '0 4px 8px rgba(51,65,85,0.13), 0 8px 24px rgba(115,92,0,0.18)',
          fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 16,
          lineHeight: '24px', color: '#554300', cursor: 'pointer',
          pointerEvents: 'auto',
        }}>Tillbaka till kartan</button>
      </div>
    </div>
  );
}

function Section({ eyebrow, children }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        fontFamily: 'Manrope, sans-serif', fontWeight: 700,
        fontSize: 10, lineHeight: '15px', letterSpacing: '0.2em',
        color: '#7f7663',
      }}>{eyebrow}</div>
      {children}
    </section>
  );
}

function Para({ children }) {
  return (
    <p style={{
      margin: 0,
      fontFamily: 'Manrope, sans-serif', fontSize: 16,
      lineHeight: '26px', color: '#27272a',
      textWrap: 'pretty',
    }}>{children}</p>
  );
}

function SourceCard({ title, body }) {
  return (
    <div style={{
      borderLeft: '2px solid #d4af37',
      padding: '6px 16px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{
        fontFamily: 'Manrope, sans-serif', fontWeight: 700,
        fontSize: 16, lineHeight: '24px', color: '#1b1b1e',
      }}>{title}</div>
      <div style={{
        fontFamily: 'Manrope, sans-serif', fontSize: 14,
        lineHeight: '20px', color: '#4d4635',
      }}>{body}</div>
    </div>
  );
}

window.AboutModal = AboutModal;
