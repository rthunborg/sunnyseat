// Desktop Paywall — Säsongskortet (Season Pass).
// Two-column: pitch + features on left, plan options + Swish QR on right.

function Paywall({ onClose, onSubscribe }) {
  const [plan, setPlan] = React.useState('season'); // 'season' | 'monthly' | 'annual'

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0,
      background: 'rgba(20,15,5,0.6)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      zIndex: 110,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fade-in 0.25s',
      padding: 32,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 980, maxWidth: '100%',
        maxHeight: '92vh',
        background: '#fdfaf4',
        borderRadius: 28,
        boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
        display: 'flex',
        overflow: 'hidden',
        animation: 'scale-in 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        {/* LEFT — pitch */}
        <div style={{
          width: 460, flexShrink: 0,
          background: 'linear-gradient(165deg, #1b1b1e 0%, #2a241a 60%, #735c00 130%)',
          padding: '40px 40px 36px',
          color: '#fdfaf4',
          position: 'relative',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* sunburst decoration */}
          <div style={{
            position: 'absolute', top: -120, right: -120,
            width: 320, height: 320, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,215,110,0.45) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}/>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 9999,
              background: 'rgba(245,215,110,0.18)',
              border: '1px solid rgba(245,215,110,0.4)',
              marginBottom: 28,
            }}>
              <Icon name="sun" size={11} color="#f5d76e" fill="#f5d76e"/>
              <span style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: 10, fontWeight: 800, color: '#f5d76e',
                letterSpacing: '0.14em', textTransform: 'uppercase',
              }}>Säsongskortet · Premium</span>
            </div>

            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 44, fontWeight: 800,
              letterSpacing: '-0.035em', lineHeight: 1.0,
              marginBottom: 18,
              textWrap: 'balance',
            }}>Få ut allt av sommaren.</div>

            <div style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: 15, lineHeight: 1.55,
              opacity: 0.75,
              marginBottom: 32,
              maxWidth: 360,
              textWrap: 'pretty',
            }}>Säsongskortet låser upp soltidsplaneraren, prognoser för 7 dagar och alerts när din favoritplats får sol.</div>
          </div>

          <div style={{
            display: 'flex', flexDirection: 'column', gap: 14,
            position: 'relative', zIndex: 1,
          }}>
            <Feat icon="planner" title="Soltidsplaneraren"
              body="Planera kvällen runt solen — se exakt när du behöver vara på vilken plats."/>
            <Feat icon="bell" title="Solalerts"
              body="Få ett pling när dina favoritplatser går från skugga till sol."/>
            <Feat icon="calendar" title="7 dagars prognos"
              body="Boka uteservering med koll på solen — inte bara på molnen."/>
            <Feat icon="layers" title="Inga annonser, inga sponsrade pins"
              body="Bara de bästa solplatserna, sorterade efter sol — inte efter pengar."/>
          </div>

          <div style={{
            marginTop: 'auto',
            paddingTop: 28,
            fontFamily: 'Manrope, sans-serif',
            fontSize: 12, color: 'rgba(253,250,244,0.55)',
            position: 'relative', zIndex: 1,
          }}>
            <Icon name="check" size={11} color="rgba(253,250,244,0.6)" style={{ verticalAlign: '-1px', marginRight: 6 }}/>
            Avsluta när som helst · ingen bindningstid · pengarna tillbaka 14 dagar
          </div>
        </div>

        {/* RIGHT — plans + Swish */}
        <div style={{
          flex: 1, padding: '36px 40px 32px',
          display: 'flex', flexDirection: 'column',
          minWidth: 0,
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 20, right: 20,
            width: 36, height: 36, borderRadius: '50%',
            background: '#fff', border: '1px solid #e9e1cf',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="close" size={13} color="#4d4635"/>
          </button>

          <div style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 11, fontWeight: 800,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: '#735c00', marginBottom: 6,
          }}>Välj plan</div>

          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 22, fontWeight: 800, color: '#1b1b1e',
            letterSpacing: '-0.025em',
            marginBottom: 18,
          }}>Två kaffe i veckan, en hel sommars sol.</div>

          {/* Plans */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
            <PlanRow
              id="season"
              selected={plan === 'season'}
              onSelect={setPlan}
              badge="Mest populärt"
              title="Säsongskortet"
              meta="Maj — Augusti · 4 månader"
              price="149 kr"
              priceMeta="totalt · som en lunch"
              highlight
            />
            <PlanRow
              id="annual"
              selected={plan === 'annual'}
              onSelect={setPlan}
              badge="Spara 35%"
              title="Årligen"
              meta="12 månader"
              price="299 kr"
              priceMeta="25 kr / mån"
            />
            <PlanRow
              id="monthly"
              selected={plan === 'monthly'}
              onSelect={setPlan}
              title="Månadsvis"
              meta="Avsluta när som helst"
              price="49 kr"
              priceMeta="/ månad"
            />
          </div>

          {/* Swish + CTA */}
          <div style={{
            background: '#fff8e8',
            border: '1px solid #f1ead9',
            borderRadius: 18,
            padding: 18,
            display: 'flex', gap: 18,
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <SwishQR/>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: 10, fontWeight: 800,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: '#735c00', marginBottom: 6,
              }}>Snabbast</div>
              <div style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: 17, fontWeight: 800, color: '#1b1b1e',
                letterSpacing: '-0.02em', marginBottom: 4,
              }}>Betala med Swish</div>
              <div style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: 12, color: '#4d4635', lineHeight: 1.45,
              }}>Skanna QR-koden i Swish-appen — du är igång om 10 sekunder.</div>
            </div>
          </div>

          <button onClick={onSubscribe} style={{
            height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #1b1b1e 0%, #2a241a 100%)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontFamily: 'Manrope, sans-serif',
            fontSize: 14, fontWeight: 800,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            Aktivera Säsongskortet · 149 kr
            <Icon name="arrow-right" size={14} color="#fff"/>
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            marginTop: 14,
            fontFamily: 'Manrope, sans-serif',
            fontSize: 11, color: '#7f7663',
          }}>
            <span>🇸🇪 Made in Stockholm</span>
            <span style={{ color: '#d6c8a6' }}>·</span>
            <span>Totalt 12 400+ premium-medlemmar</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feat({ icon, title, body }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{
        flexShrink: 0,
        width: 32, height: 32, borderRadius: 9,
        background: 'rgba(245,215,110,0.18)',
        border: '1px solid rgba(245,215,110,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={14} color="#f5d76e"/>
      </div>
      <div style={{ flex: 1, paddingTop: 1 }}>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 14, fontWeight: 800, color: '#fdfaf4',
          letterSpacing: '-0.01em', marginBottom: 2,
        }}>{title}</div>
        <div style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 12, lineHeight: 1.45,
          color: 'rgba(253,250,244,0.65)',
        }}>{body}</div>
      </div>
    </div>
  );
}

function PlanRow({ id, selected, onSelect, title, meta, price, priceMeta, badge, highlight }) {
  return (
    <button
      onClick={() => onSelect(id)}
      style={{
        textAlign: 'left',
        padding: '14px 16px',
        borderRadius: 14,
        border: selected ? '2px solid #1b1b1e' : '1.5px solid #e9e1cf',
        background: selected
          ? (highlight ? 'linear-gradient(135deg, #fff8e8 0%, #fdfaf4 100%)' : '#fdfaf4')
          : '#fff',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center',
        position: 'relative',
        transition: 'border 0.15s, background 0.15s',
      }}>
      {/* Radio */}
      <div style={{
        flexShrink: 0,
        width: 18, height: 18, borderRadius: '50%',
        border: selected ? '5px solid #1b1b1e' : '2px solid #c4b896',
        background: '#fff',
        marginRight: 14,
        transition: 'border 0.15s',
      }}/>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 2,
        }}>
          <span style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 16, fontWeight: 800, color: '#1b1b1e',
            letterSpacing: '-0.015em',
          }}>{title}</span>
          {badge && (
            <span style={{
              padding: '2px 8px', borderRadius: 9999,
              background: highlight ? '#1b1b1e' : '#fff8e8',
              color: highlight ? '#f5d76e' : '#735c00',
              fontFamily: 'Manrope, sans-serif',
              fontSize: 9, fontWeight: 800,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>{badge}</span>
          )}
        </div>
        <div style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 12, color: '#7f7663',
        }}>{meta}</div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 20, fontWeight: 800, color: '#1b1b1e',
          letterSpacing: '-0.02em', lineHeight: 1,
        }}>{price}</div>
        <div style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 11, color: '#7f7663',
          marginTop: 3,
        }}>{priceMeta}</div>
      </div>
    </button>
  );
}

// Decorative QR-code (placeholder, not a real Swish QR)
function SwishQR() {
  // Generate a deterministic 17×17 QR-style pattern
  const pattern = React.useMemo(() => {
    const size = 17;
    const seed = 'sunnyseat-swish';
    const grid = [];
    for (let y = 0; y < size; y++) {
      const row = [];
      for (let x = 0; x < size; x++) {
        // finder squares in 3 corners
        const inFinder = (
          (x < 4 && y < 4) ||
          (x >= size - 4 && y < 4) ||
          (x < 4 && y >= size - 4)
        );
        if (inFinder) {
          const fx = x < 4 ? x : (x >= size - 4 ? x - (size - 4) : x);
          const fy = y < 4 ? y : (y >= size - 4 ? y - (size - 4) : y);
          const onBorder = fx === 0 || fx === 3 || fy === 0 || fy === 3;
          const inCenter = fx >= 1 && fx <= 2 && fy >= 1 && fy <= 2;
          row.push(onBorder || inCenter);
        } else {
          // pseudo-random
          const h = (x * 31 + y * 17 + seed.charCodeAt((x + y) % seed.length)) % 7;
          row.push(h < 3);
        }
      }
      grid.push(row);
    }
    return grid;
  }, []);

  return (
    <div style={{
      width: 132, height: 132,
      background: '#fff',
      borderRadius: 12,
      padding: 10,
      flexShrink: 0,
      boxShadow: '0 2px 8px rgba(115,92,0,0.12)',
      position: 'relative',
    }}>
      <svg viewBox="0 0 17 17" style={{ width: '100%', height: '100%' }}>
        {pattern.map((row, y) => row.map((on, x) => on && (
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#1b1b1e" rx={0.15}/>
        )))}
      </svg>
      {/* Swish logo center */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 28, height: 28, borderRadius: 7,
        background: 'linear-gradient(135deg, #ef5b9c 0%, #b13a8c 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 6px rgba(239,91,156,0.3)',
        border: '2px solid #fff',
      }}>
        <span style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 9, fontWeight: 900, color: '#fff',
          letterSpacing: '-0.03em',
        }}>SW</span>
      </div>
    </div>
  );
}

window.Paywall = Paywall;
