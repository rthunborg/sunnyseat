// LockedPlanner — Soltidsplaneraren behind paywall (free) or unlocked (premium).
// Side panel that slides in from the right. For free users, content below the fold
// is blurred with an upsell card overlaid.

function LockedPlanner({ onClose, onUpgrade, locked = true, hour }) {
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0,
      background: 'rgba(20,15,5,0.4)',
      backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
      zIndex: 80,
      animation: 'fade-in 0.22s',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: 460,
        background: '#fdfaf4',
        boxShadow: '-12px 0 40px rgba(20,15,5,0.18)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 18px',
          borderBottom: '1px solid #f1ead9',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 6,
            }}>
              <Icon name="planner" size={14} color="#735c00"/>
              <span style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: 11, fontWeight: 800,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: '#735c00',
              }}>Soltidsplaneraren</span>
              {locked ? (
                <span style={{
                  padding: '2px 8px', borderRadius: 9999,
                  background: '#1b1b1e', color: '#f5d76e',
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: 9, fontWeight: 800,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>Premium</span>
              ) : (
                <span style={{
                  padding: '2px 8px', borderRadius: 9999,
                  background: 'linear-gradient(135deg, #fff3d4 0%, #ffe088 100%)',
                  color: '#735c00',
                  border: '1px solid #f5d76e',
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: 9, fontWeight: 800,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>Aktivt</span>
              )}
            </div>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 22, fontWeight: 800, color: '#1b1b1e',
              letterSpacing: '-0.025em',
            }}>Din kvällsplan</div>
            <div style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: 12, color: '#7f7663', marginTop: 2,
            }}>Onsdag 17 juli · 4 stopp · 3h 20min sol</div>
          </div>

          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#f3ede0', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="close" size={13} color="#4d4635"/>
          </button>
        </div>

        {/* Body — first stop visible, rest blurred for free */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            padding: '20px 28px',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <PlannerStop
              i={1}
              time="16:00 — 17:30"
              name="Mariatorget"
              type="Park · 6 min"
              pct={0.92}
              note="Toppsol nu — kvarstår 1h 30min"
              active
            />
            <PlannerStop
              i={2}
              time="17:30 — 19:00"
              name="Tjoget Bar"
              type="Bar · 4 min cykling"
              pct={0.85}
              note="Solen flyttar västerut — perfekt timing"
              blurred={locked}
            />
            <PlannerStop
              i={3}
              time="19:00 — 20:15"
              name="Långholmens klippbad"
              type="Klippbad · 8 min"
              pct={0.74}
              note="Sista timmen sol på västra klippan"
              blurred={locked}
            />
            <PlannerStop
              i={4}
              time="20:15 — 21:00"
              name="Skinnarviksberget"
              type="Utsikt · 12 min"
              pct={0.55}
              note="Solnedgång 21:08 — nordväst"
              blurred={locked}
            />
          </div>

          {/* Upsell overlay (covers blurred stops) */}
          {locked && (
            <div style={{
              position: 'absolute',
              left: 28, right: 28, bottom: 24,
              background: '#fdfaf4',
              borderRadius: 18,
              border: '1px solid #f1ead9',
              padding: '20px 22px',
              boxShadow: '0 12px 32px rgba(20,15,5,0.18)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 10,
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: 'linear-gradient(135deg, #f5d76e 0%, #d4af37 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="sun" size={13} color="#1b1b1e" fill="#1b1b1e"/>
                </div>
                <span style={{
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: 10, fontWeight: 800,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: '#735c00',
                }}>Säsongskortet · 149 kr</span>
              </div>
              <div style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: 19, fontWeight: 800, color: '#1b1b1e',
                letterSpacing: '-0.02em', lineHeight: 1.2,
                marginBottom: 6,
                textWrap: 'pretty',
              }}>Lås upp hela kvällen — alla 4 stopp.</div>
              <div style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: 13, lineHeight: 1.5, color: '#4d4635',
                marginBottom: 14,
              }}>Soltidsplaneraren bygger en optimal rutt mellan dina favorit-solplatser, så du följer solen hela kvällen.</div>
              <button onClick={onUpgrade} style={{
                width: '100%',
                height: 46, borderRadius: 12,
                background: '#1b1b1e', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontFamily: 'Manrope, sans-serif',
                fontSize: 13, fontWeight: 800,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                Uppgradera & lås upp
                <Icon name="arrow-right" size={13} color="#fff"/>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlannerStop({ i, time, name, type, pct, note, active, blurred }) {
  const c = sunColor(pct);
  return (
    <div style={{
      display: 'flex', gap: 12,
      filter: blurred ? 'blur(7px)' : 'none',
      opacity: blurred ? 0.6 : 1,
      pointerEvents: blurred ? 'none' : 'auto',
      userSelect: blurred ? 'none' : 'auto',
    }}>
      <div style={{
        flexShrink: 0,
        width: 28, height: 28, borderRadius: '50%',
        background: active ? '#1b1b1e' : '#f3ede0',
        color: active ? '#f5d76e' : '#4d4635',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 13, fontWeight: 800,
        marginTop: 14,
      }}>{i}</div>
      <div style={{
        flex: 1,
        background: active ? '#fff8e8' : '#fff',
        border: `1px solid ${active ? '#f5d76e' : '#e9e1cf'}`,
        borderRadius: 14,
        padding: 12,
        display: 'flex', gap: 12,
      }}>
        {/* Placeholder thumb for the venue */}
        <PlaceholderThumb
          venue={{ name }}
          color={c}
          size={56} radius={10}
          showImageBadge={false}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: 4, gap: 8,
          }}>
            <div style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: 11, fontWeight: 800, color: '#735c00',
              letterSpacing: '0.06em',
            }}>{time}</div>
            <span style={{
              padding: '2px 8px', borderRadius: 9999,
              background: c.bg, color: c.fg,
              fontFamily: 'Manrope, sans-serif',
              fontSize: 10, fontWeight: 800,
              letterSpacing: '0.04em', whiteSpace: 'nowrap',
            }}>{formatPct(pct)}</span>
          </div>
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 15, fontWeight: 800, color: '#1b1b1e',
            letterSpacing: '-0.015em',
            marginBottom: 2,
          }}>{name}</div>
          <div style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 11, color: '#7f7663', marginBottom: 4,
          }}>{type}</div>
          <div style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 11.5, lineHeight: 1.4, color: '#4d4635',
            fontStyle: 'italic',
          }}>{note}</div>
        </div>
      </div>
    </div>
  );
}

window.LockedPlanner = LockedPlanner;
