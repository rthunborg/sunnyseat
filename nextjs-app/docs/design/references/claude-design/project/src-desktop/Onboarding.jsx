// Desktop Onboarding — 3-step flow inside a hero panel.
// Side-by-side layout: visual hero on left, copy + dots on right.

function Onboarding({ onDone }) {
  const [step, setStep] = React.useState(0);
  const total = 3;

  const steps = [
    {
      eyebrow: 'Solvädersappen',
      title: 'Hitta solen där den faktiskt är',
      body: 'SunnySeat visar var solen står just nu på Göteborgs uteserveringar, parker och badklippor — minut för minut.',
      cta: 'Nästa',
      visual: <HeroSunMap/>,
    },
    {
      eyebrow: 'Smartare planering',
      title: 'Spola fram dagen',
      body: 'Dra i tidslinjen för att se var solen står om en timme, två timmar eller hela kvällen. Perfekt för afterwork-planering.',
      cta: 'Nästa',
      visual: <HeroTimeline/>,
    },
    {
      eyebrow: 'Säsongskortet — Göteborg först, sen världen',
      title: 'Klart att hitta solen',
      body: 'Vi börjar i Göteborg. Snart även Stockholm, Malmö och Köpenhamn. Sätt på platsdelning så hittar vi din närmsta solplats.',
      cta: 'Aktivera plats',
      visual: <HeroLocation/>,
    },
  ];

  const cur = steps[step];

  function next() {
    if (step < total - 1) setStep(step + 1);
    else onDone?.();
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(135deg, #fff8e8 0%, #fdfaf4 50%, #f3ede0 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
      animation: 'fade-in 0.3s',
    }}>
      <div style={{
        width: 880, maxWidth: '92%',
        background: '#fdfaf4',
        borderRadius: 28,
        boxShadow: '0 28px 70px rgba(115,92,0,0.18)',
        display: 'flex',
        overflow: 'hidden',
        minHeight: 520,
      }}>
        {/* Visual side */}
        <div style={{
          width: 420, flexShrink: 0,
          background: 'linear-gradient(160deg, #fff3c2 0%, #f5d76e 60%, #d4af37 100%)',
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {cur.visual}
        </div>

        {/* Copy side */}
        <div style={{
          flex: 1,
          padding: '46px 48px 36px',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Wordmark */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 'auto',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #f5d76e 0%, #d4af37 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(212,175,55,0.4)',
            }}>
              <Icon name="sun" size={16} color="#1b1b1e" fill="#1b1b1e"/>
            </div>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 18, fontWeight: 800, color: '#1b1b1e',
              letterSpacing: '-0.02em',
            }}>SunnySeat</div>
          </div>

          <div style={{ marginTop: 40 }}>
            <div style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: 11, fontWeight: 800,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: '#735c00', marginBottom: 14,
            }}>{cur.eyebrow}</div>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 38, fontWeight: 800, color: '#1b1b1e',
              letterSpacing: '-0.035em', lineHeight: 1.05,
              marginBottom: 16,
              textWrap: 'pretty',
            }}>{cur.title}</div>
            <div style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: 15, lineHeight: 1.55, color: '#4d4635',
              maxWidth: 380,
              textWrap: 'pretty',
            }}>{cur.body}</div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 40,
          }}>
            {/* dots */}
            <div style={{ display: 'flex', gap: 6 }}>
              {steps.map((_, i) => (
                <div key={i} style={{
                  width: i === step ? 22 : 6,
                  height: 6, borderRadius: 3,
                  background: i === step ? '#1b1b1e' : '#e9e1cf',
                  transition: 'width 0.25s, background 0.25s',
                }}/>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {step < total - 1 && (
                <button onClick={onDone} style={{
                  height: 44, padding: '0 20px',
                  borderRadius: 12,
                  background: 'transparent', border: 'none',
                  color: '#7f7663',
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                }}>Hoppa över</button>
              )}
              <button onClick={next} style={{
                height: 44, padding: '0 24px',
                borderRadius: 12,
                background: '#1b1b1e', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontFamily: 'Manrope, sans-serif',
                fontSize: 13, fontWeight: 800,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {cur.cta}
                <Icon name="arrow-right" size={13} color="#fff"/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mini illustrations using shapes only
function HeroSunMap() {
  return (
    <div style={{ position: 'relative', width: 280, height: 280 }}>
      {/* radial sun */}
      <div style={{
        position: 'absolute', top: 28, left: 28,
        width: 80, height: 80, borderRadius: '50%',
        background: 'radial-gradient(circle, #fff 0%, #fff8e8 60%, transparent 100%)',
        boxShadow: '0 0 40px rgba(255,255,255,0.8)',
      }}/>
      {/* fake map blocks */}
      {[
        { x: 20, y: 130, w: 90, h: 60, c: '#735c00' },
        { x: 120, y: 120, w: 70, h: 80, c: '#4d4635' },
        { x: 200, y: 130, w: 60, h: 50, c: '#735c00' },
        { x: 30, y: 200, w: 100, h: 50, c: '#4d4635' },
        { x: 140, y: 210, w: 130, h: 50, c: '#735c00' },
      ].map((b, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: b.x, top: b.y,
          width: b.w, height: b.h,
          background: b.c, opacity: 0.18,
          borderRadius: 4,
        }}/>
      ))}
      {/* pins */}
      {[
        { x: 40, y: 100, p: 0.85 },
        { x: 130, y: 60, p: 0.92 },
        { x: 200, y: 95, p: 0.4 },
        { x: 90, y: 180, p: 0.7 },
        { x: 200, y: 200, p: 0.55 },
      ].map((pin, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: pin.x - 10, top: pin.y - 10,
          width: 20, height: 20, borderRadius: '50%',
          background: sunColor(pin.p).bg,
          border: '2px solid #fff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        }}/>
      ))}
    </div>
  );
}

function HeroTimeline() {
  return (
    <div style={{ width: 300, padding: 24 }}>
      <div style={{
        background: '#fdfaf4',
        borderRadius: 16,
        padding: '20px 18px',
        boxShadow: '0 12px 32px rgba(115,92,0,0.15)',
      }}>
        <div style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 10, fontWeight: 800,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: '#735c00', marginBottom: 10,
        }}>Soltid idag</div>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 22, fontWeight: 800, color: '#1b1b1e',
          letterSpacing: '-0.02em', marginBottom: 18,
        }}>16:00 — Mariatorget</div>

        {/* Bars */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 4,
          height: 80, marginBottom: 14,
        }}>
          {[0.3, 0.5, 0.65, 0.78, 0.88, 0.92, 0.85, 0.7, 0.55, 0.4].map((p, i) => (
            <div key={i} style={{
              flex: 1,
              height: p * 70,
              borderRadius: '4px 4px 1px 1px',
              background: sunColor(p).bg,
              border: i === 5 ? '2px solid #1b1b1e' : 'none',
            }}/>
          ))}
        </div>

        {/* Slider track */}
        <div style={{
          position: 'relative', height: 4,
          background: '#e9e1cf',
          borderRadius: 2,
        }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: '55%',
            background: '#1b1b1e',
            borderRadius: 2,
          }}/>
          <div style={{
            position: 'absolute', left: '55%', top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 18, height: 18, borderRadius: '50%',
            background: '#fff',
            border: '3px solid #1b1b1e',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}/>
        </div>
      </div>
    </div>
  );
}

function HeroLocation() {
  return (
    <div style={{
      position: 'relative', width: 260, height: 260,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Pulsing rings */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute',
          width: 80 + i * 70, height: 80 + i * 70,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.55)',
          opacity: 1 - i * 0.3,
        }}/>
      ))}
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: '#1b1b1e',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        zIndex: 2,
      }}>
        <Icon name="pin" size={28} color="#fff"/>
      </div>
    </div>
  );
}

window.Onboarding = Onboarding;
