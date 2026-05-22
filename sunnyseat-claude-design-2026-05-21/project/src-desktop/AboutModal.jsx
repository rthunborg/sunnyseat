// "Om SunnySeat" — full-screen overlay for desktop.
// Inspired by Figma node 32:683 (about_desktop). Copy is kept in sync with the
// mobile version so the same six prototypes tell the same story.

function DAboutModal({ onClose, onFeedback }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#fdfaf4',
      zIndex: 130,
      display: 'flex', flexDirection: 'column',
      animation: 'fade-in 0.22s ease-out both',
    }}>
      {/* Top bar — slim cream header. Matches the page chrome used elsewhere. */}
      <div style={{
        flexShrink: 0,
        height: 64,
        padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(115,92,0,0.08)',
        background: 'rgba(253,250,244,0.92)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        zIndex: 2,
      }}>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontWeight: 700, fontSize: 18, lineHeight: '28px',
          letterSpacing: '-0.02em', color: '#1c1917',
        }}>SunnySeat</div>
        <button onClick={onClose} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '6px 10px', borderRadius: 8,
          fontFamily: 'Manrope, sans-serif',
          fontWeight: 700, fontSize: 13, lineHeight: '20px',
          letterSpacing: '0.02em', color: '#735c00',
        }}>
          <svg width="10" height="10" viewBox="0 0 9.333 9.333" style={{ display: 'block' }}>
            <path d="M 2.231 5.25 L 5.498 8.517 L 4.667 9.333 L 0 4.667 L 4.667 0 L 5.498 0.817 L 2.231 4.083 L 9.333 4.083 L 9.333 5.25 L 2.231 5.25 L 2.231 5.25"
              fill="#735c00" fillRule="nonzero"/>
          </svg>
          Tillbaka
        </button>
      </div>

      {/* Scroll area */}
      <div style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Article column — 640px wide, centered */}
        <article style={{
          width: '100%', maxWidth: 640,
          margin: '0 auto',
          padding: '88px 32px 64px',
          display: 'flex', flexDirection: 'column', gap: 80,
        }}>
          {/* Hero */}
          <header style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <h1 style={{
              margin: 0,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 700, fontSize: 60, lineHeight: '60px',
              letterSpacing: '-0.025em', color: '#27272a',
              whiteSpace: 'pre-line',
            }}>{"Hur fungerar\nSunnySeat?"}</h1>

            <div style={{
              borderRadius: 12, overflow: 'hidden',
              height: 324, position: 'relative',
              background: '#eae7eb',
            }}>
              <img src="uploads/about-golden-hour.png" alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(255,255,255,0.20)',
              }}/>
            </div>
          </header>

          {/* ALGORITMEN */}
          <DAboutSection eyebrow="ALGORITMEN">
            <DAboutPara>
              Vår algoritm beräknar solens exakta position på himlen i realtid baserat på dina koordinater och aktuell tid. Genom att kombinera detta med högupplösta 3D-modeller av byggnader och terräng kan vi förutse var skuggorna faller med imponerande precision.
            </DAboutPara>
            <DAboutPara>
              Vi analyserar tusentals ljusstrålar för varje plats för att avgöra om en uteservering eller parkbänk faktiskt badar i solljus, eller om den ligger dold i skuggan av en intilliggande huskropp.
            </DAboutPara>
          </DAboutSection>

          {/* DATAKÄLLOR */}
          <DAboutSection eyebrow="DATAKÄLLOR">
            <DSourceCard
              title="Lantmäteriet"
              body="Topografisk data och byggnadshöjder för exakt skuggberäkning."/>
            <DSourceCard
              title="Met.no"
              body="Meteorologiska data för realtidsuppdateringar om molntäcke och sikt."/>
            <DSourceCard
              title="OpenStreetMap"
              body="Global gemenskapsdriven kartdata för intressepunkter och stadsplanering."/>
          </DAboutSection>

          {/* NOGGRANNHET — desktop has room for the side-by-side stat + body layout */}
          <DAboutSection eyebrow="NOGGRANNHET">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 208px) 1fr',
              gap: 24, alignItems: 'start',
            }}>
              <span style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 700, fontSize: 96, lineHeight: '96px',
                letterSpacing: '-0.05em',
                background: 'linear-gradient(135deg, #d4af37 0%, #ffbf00 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text', color: 'transparent',
                display: 'block',
              }}>85%</span>
              <DAboutPara>
                Våra prognoser bygger på statiska data om arkitektur och dynamiska väderrapporter. Även om vi strävar efter perfektion kan faktorer som tillfälliga markiser, stora fordon eller lokala molnbildningar påverka resultatet. Vi rekommenderar att alltid använda SunnySeat som en vägledning för din nästa solstund.
              </DAboutPara>
            </div>
          </DAboutSection>
        </article>

        {/* Footer band */}
        <footer style={{
          background: '#f5f5f4',
          padding: '48px 32px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48,
        }}>
          <div style={{
            width: '100%', maxWidth: 640,
            display: 'flex', flexDirection: 'row',
            justifyContent: 'space-between', alignItems: 'center',
            gap: 24,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 700, fontSize: 18, lineHeight: '28px',
                letterSpacing: '-0.02em', color: '#1c1917',
              }}>SunnySeat</div>
              <button onClick={() => { onClose(); setTimeout(onFeedback, 120); }} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: 0, textAlign: 'left',
                fontFamily: 'Manrope, sans-serif',
                fontSize: 13, fontWeight: 500, lineHeight: '20px',
                letterSpacing: '0.1em', color: '#78716c',
                textTransform: 'uppercase',
                textDecoration: 'underline', textUnderlineOffset: 4,
              }}>Kontakt</button>
            </div>

            <button onClick={onClose} style={{
              height: 52, padding: '0 28px',
              borderRadius: 9999, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(180deg, #d4af37 0%, #ffbf00 100%)',
              boxShadow: '0 4px 8px rgba(51,65,85,0.13), 0 8px 24px rgba(115,92,0,0.18)',
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 700, fontSize: 14, lineHeight: '20px',
              color: '#554300',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              Tillbaka till kartan
              <svg width="11" height="11" viewBox="0 0 10.5 10.5" style={{ display: 'block' }}>
                <path d="M 6.469 0 L 5.638 0.816 L 8.905 4.083 L 0 4.083 L 0 5.25 L 8.905 5.25 L 5.638 8.517 L 6.469 9.333 L 10.5 5.302 L 10.5 4.031 L 6.469 0"
                  fill="#554300"/>
              </svg>
            </button>
          </div>

          <div style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 10, lineHeight: '15px', letterSpacing: '0.3em',
            color: '#a8a29e', textTransform: 'uppercase',
          }}>© 2026 SunnySeat. Hitta din plats i solen.</div>
        </footer>
      </div>
    </div>
  );
}

function DAboutSection({ eyebrow, children }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{
        fontFamily: 'Manrope, sans-serif', fontWeight: 700,
        fontSize: 12, lineHeight: '16px', letterSpacing: '0.2em',
        color: '#d97706',
      }}>{eyebrow}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {children}
      </div>
    </section>
  );
}

function DAboutPara({ children }) {
  return (
    <p style={{
      margin: 0,
      fontFamily: 'Manrope, sans-serif', fontSize: 17,
      lineHeight: '27.6px', color: '#27272a',
      textWrap: 'pretty',
    }}>{children}</p>
  );
}

function DSourceCard({ title, body }) {
  return (
    <div style={{
      borderLeft: '2px solid #d4af37',
      padding: '6px 18px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700,
        fontSize: 18, lineHeight: '26px', color: '#1c1917',
        letterSpacing: '-0.01em',
      }}>{title}</div>
      <div style={{
        fontFamily: 'Manrope, sans-serif', fontSize: 15,
        lineHeight: '22px', color: '#4d4635',
      }}>{body}</div>
    </div>
  );
}

window.DAboutModal = DAboutModal;
