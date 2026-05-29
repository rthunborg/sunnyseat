// VenueDetail — slide-out right-side panel (desktop), 390px wide.
// Mirrors the Figma "venue-detail-component-desktop" layout:
//   hero · title + sun pill · description · soltider strip · details list ·
//   visa rutt button · feedback CTA (sol nu / skugga) · review CTA · reviews list.
// Fully scrollable inside the panel.

function VenueDetail({ venue, hour, onClose, onReview, isFavorite, onToggleFavorite }) {
  if (!venue) return null;
  const pct = sunPctAt(venue, hour);
  const color = sunColor(pct);
  const [shareOpen, setShareOpen] = React.useState(false);

  const hh = Math.floor(hour);
  const mm = Math.round((hour - hh) * 60);
  const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

  return (
    <>
    <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none',
        zIndex: 70
      }}>
      <aside
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: 390,
            background: '#fdfaf4',
            boxShadow: '-12px 0 40px rgba(20,15,5,0.18)',
            display: 'flex', flexDirection: 'column',
            pointerEvents: 'auto',
            animation: 'slide-in-right 0.32s cubic-bezier(0.32, 0.72, 0, 1)'
          }}>

        {/* ───── Scrollable body ───── */}
        <div style={{
            flex: 1, overflowY: 'auto', overscrollBehavior: 'contain'
          }}>

          {/* Hero */}
          <div style={{ position: 'relative', height: 200, flexShrink: 0 }}>
            <PlaceholderHero venue={venue} height={200} />

            {/* Sun pill — top-left */}
            <div style={{
                position: 'absolute', top: 16, left: 16,
                height: 36, padding: '0 14px',
                borderRadius: 24,
                background: 'rgba(212,175,55,0.95)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
              }}>
              <Icon name="sun" size={16} color="#554300" fill="#554300" />
              <span style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 16, fontWeight: 800, color: '#554300',
                  letterSpacing: '-0.01em'
                }}>{formatPct(pct)}</span>
            </div>

            {/* Action buttons — top-right */}
            <div style={{
                position: 'absolute', top: 16, right: 16,
                display: 'flex', gap: 8
              }}>
              <RoundIconBtn2
                  icon="heart"
                  active={isFavorite}
                  onClick={onToggleFavorite}
                  title={isFavorite ? 'Ta bort favorit' : 'Spara favorit'} />
              <RoundIconBtn2 icon="share" title="Dela" onClick={() => setShareOpen(true)} />
              <RoundIconBtn2 icon="close" onClick={onClose} title="Stäng" />
            </div>
          </div>

          {/* Title + status pill */}
          <div style={{ padding: '24px 24px 0' }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', gap: 12, marginBottom: 8
              }}>
              <h1 style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 28, fontWeight: 800,
                  letterSpacing: '-0.03em', color: '#1b1b1e',
                  margin: 0, lineHeight: 1.1,
                  textWrap: 'pretty'
                }}>{venue.name}</h1>
              <div style={{
                  height: 24, padding: '0 12px',
                  borderRadius: 9999,
                  background: '#ffbf00',
                  display: 'flex', alignItems: 'center', gap: 4,
                  marginTop: 6, flexShrink: 0
                }}>
                <Icon name="sun" size={12} color="#6d5000" fill="#6d5000" />
                <span style={{
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: 11, fontWeight: 800, color: '#6d5000',
                    letterSpacing: '0.06em'
                  }}>SOL NU</span>
              </div>
            </div>

            {/* Type + rating row */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                fontFamily: 'Manrope, sans-serif',
                fontSize: 13, color: '#4d4635', fontWeight: 500,
                marginBottom: 12
              }}>
              <span>{venue.type}</span>
              <span style={{ color: '#d6c8a6' }}>·</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="star" size={13} color="#d4af37" fill="#d4af37" />
                <span style={{ color: '#1b1b1e', fontWeight: 700 }}>{venue.rating}</span>
                <span style={{ color: '#7f7663' }}>({venue.reviews})</span>
              </div>
              <span style={{ color: '#d6c8a6' }}>·</span>
              <span data-comment-anchor="db95454bcb-span-124-15">{venue.price}</span>
            </div>

            {/* Description */}
            <p style={{
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 500,
                fontSize: 15, lineHeight: 1.6, color: '#4d4635',
                margin: '0 0 20px',
                textWrap: 'pretty'
              }}>{venue.description}</p>

            {/* SOLTIDER IDAG card */}
            <div style={{
                background: '#f5f3f6',
                borderRadius: 16,
                padding: 20,
                marginBottom: 20
              }}>
              <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 16
                }}>
                <span style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: 12, fontWeight: 800,
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: '#4d4635'
                  }}>Soltider idag</span>
                <span style={{
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: 12, fontWeight: 700, color: '#735c00'
                  }}>Toppar kl {venue.peakHour}:30</span>
              </div>
              <SoltiderTimeline venue={venue} hour={hour} timeStr={timeStr} />
            </div>

            {/* Tags */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 6,
                marginBottom: 20
              }}>
              {venue.tags.map((t) =>
                <span key={t} style={{
                  padding: '6px 12px',
                  borderRadius: 9999,
                  background: '#f3ede0',
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: 12, fontWeight: 700, color: '#4d4635',
                  letterSpacing: '0.01em'
                }}>{t}</span>
                )}
            </div>

            {/* Details list */}
            <div style={{
                display: 'flex', flexDirection: 'column', gap: 18,
                padding: '4px 0 24px',
                borderBottom: '1px solid #f1ead9'
              }}>
              <DetailRow icon="clock" title="Öppettider"
                body={`Öppet till ${venue.until} · Blir skuggigt om 45 min`} />
              <DetailRow icon="location" title="Adress"
                body="Tredje Långgatan 9, 413 03 Göteborg"
                action="ÖPPNA I KARTOR" />
              <DetailRow icon="compass" title="Exponering"
                body={{ south: 'Söderläge — sol mitt på dagen',
                  east: 'Österläge — morgonsol',
                  west: 'Västerläge — kvällssol',
                  north: 'Norrläge — mest skugga' }[venue.orientation]} />
            </div>

            {/* Visa rutt button */}
            <button style={{
                width: '100%', height: 52,
                marginTop: 24, marginBottom: 20,
                borderRadius: 9999,
                background: 'linear-gradient(135deg, #d4af37 0%, #ffbf00 100%)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'Manrope, sans-serif',
                fontSize: 13, fontWeight: 800, color: '#554300',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 12px 24px -6px rgba(115,92,0,0.25), 0 4px 8px rgba(115,92,0,0.15)'
              }}>
              <Icon name="nav" size={15} color="#554300" /> Visa rutt
            </button>

            {/* Feedback CTA — sol nu / skugga */}
            <FeedbackBlock venue={venue} />

            {/* Review CTA */}
            <ReviewCTA venue={venue} onReview={onReview} />

            {/* Reviews list */}
            <div style={{ paddingBottom: 32 }}>
              <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 12
                }}>
                <span style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: 14, fontWeight: 800, color: '#1b1b1e'
                  }}>Senaste recensioner</span>
                <span style={{
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: 12, color: '#7f7663', fontWeight: 600
                  }}>{venue.reviews} totalt</span>
              </div>
              {REVIEWS.map((r, i) =>
                <ReviewCard key={i} {...r} />
                )}
            </div>
          </div>
        </div>
      </aside>
    </div>
    {shareOpen && <ShareModal venue={venue} onClose={() => setShareOpen(false)} />}
    </>);

}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components

function DetailRow({ icon, title, body, action }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{
        width: 40, height: 40, borderRadius: 24,
        background: '#eae7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon name={icon} size={18} color="#735c00" />
      </div>
      <div style={{ flex: 1, paddingTop: 1 }}>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 14, fontWeight: 800, color: '#1b1b1e',
          marginBottom: 2
        }}>{title}</div>
        <div style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 13.5, color: '#4d4635', lineHeight: 1.4
        }}>{body}</div>
        {action &&
        <button style={{
          marginTop: 6, padding: 0,
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: 'Manrope, sans-serif',
          fontSize: 11, fontWeight: 800,
          letterSpacing: '0.06em',
          color: '#735c00',
          display: 'flex', alignItems: 'center', gap: 4
        }}>
            {action} <Icon name="chevronRight" size={11} color="#735c00" />
          </button>
        }
      </div>
    </div>);

}

function SoltiderTimeline({ venue, hour, timeStr }) {
  // Build sun fill across 06–21 range
  const HOUR_MIN = 6,HOUR_MAX = 21;
  const labels = [6, 12, 16, 20];
  const pos = (hour - HOUR_MIN) / (HOUR_MAX - HOUR_MIN);

  // Calculate amber-fill range: where pct > 0.25
  let firstSun = null,lastSun = null;
  for (let h = HOUR_MIN; h <= HOUR_MAX; h += 0.25) {
    if (sunPctAt(venue, h) > 0.25) {
      if (firstSun === null) firstSun = h;
      lastSun = h;
    }
  }
  const sunStart = firstSun != null ? (firstSun - HOUR_MIN) / (HOUR_MAX - HOUR_MIN) : 0;
  const sunEnd = lastSun != null ? (lastSun - HOUR_MIN) / (HOUR_MAX - HOUR_MIN) : 0;

  return (
    <div style={{ position: 'relative', paddingTop: 22, paddingBottom: 22 }}>
      {/* Track */}
      <div style={{
        position: 'relative',
        height: 12, borderRadius: 9999,
        background: '#e7e5e4',
        overflow: 'visible'
      }}>
        {/* Sun gradient fill */}
        <div style={{
          position: 'absolute',
          left: `${sunStart * 100}%`,
          width: `${Math.max(0, (sunEnd - sunStart) * 100)}%`,
          top: 0, height: 12,
          borderRadius: 9999,
          background: 'linear-gradient(90deg, #d4af37 0%, #ffbf00 50%, #d4af37 100%)'
        }} />
        {/* Current time marker */}
        <div style={{
          position: 'absolute',
          left: `${pos * 100}%`,
          top: -2, transform: 'translateX(-50%)',
          width: 14, height: 14,
          borderRadius: '50%',
          background: '#735c00',
          border: '2.5px solid #fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
        }} />
        {/* Time label below thumb */}
        <div style={{
          position: 'absolute',
          left: `${pos * 100}%`,
          top: 16, transform: 'translateX(-50%)',
          fontFamily: 'Manrope, sans-serif',
          fontSize: 11, fontWeight: 800, color: '#735c00'
        }}>{timeStr}</div>
      </div>

      {/* Tick labels */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 36,
        display: 'flex', justifyContent: 'space-between',
        opacity: 0.6,
        fontFamily: 'Manrope, sans-serif',
        fontSize: 10, fontWeight: 700,
        color: '#7f7663', letterSpacing: '0.04em'
      }}>
        {labels.map((h) =>
        <span key={h}>{String(h).padStart(2, '0')}:00</span>
        )}
      </div>
    </div>);

}

function FeedbackBlock({ venue }) {
  const [choice, setChoice] = React.useState(null); // 'sun' | 'shade' | null

  const Btn = ({ id, icon, label }) => {
    const active = choice === id;
    return (
      <button
        onClick={() => setChoice(id)}
        style={{
          flex: 1, height: 46, borderRadius: 12,
          background: active ? '#dcf5e3' : id === 'sun' ? '#fff3d4' : '#eae7eb',
          border: active ? '1px solid #7cc295' : '1px solid transparent',
          fontFamily: 'Manrope, sans-serif',
          fontSize: 13, fontWeight: 800,
          color: active ? '#215a36' : id === 'sun' ? '#735c00' : '#4d4635',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          transition: 'background 0.18s, border-color 0.18s, color 0.18s'
        }}>
        {active ?
        <Icon name="check" size={16} color="#215a36" /> :

        <Icon name={icon} size={16}
        color={id === 'sun' ? '#735c00' : '#4d4635'}
        fill={id === 'sun' ? '#735c00' : 'none'} />
        }
        {label}
      </button>);

  };

  return (
    <div style={{
      padding: 18,
      background: '#fff',
      borderRadius: 16,
      border: '1px solid #f1ead9',
      marginBottom: 16
    }}>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 14, fontWeight: 800, color: '#1b1b1e',
        marginBottom: 4
      }}>Stämmer sol-prognosen?</div>
      <div style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 12.5, color: '#7f7663', marginBottom: 12,
        lineHeight: 1.45
      }}>Hjälp andra hitta solen — rapportera hur det ser ut just nu.</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn id="sun" icon="sun" label="Sol nu" />
        <Btn id="shade" icon="cloud" label="Skugga" />
      </div>
      {choice &&
      <div style={{
        marginTop: 10,
        fontFamily: 'Manrope, sans-serif',
        fontSize: 12, fontWeight: 700,
        color: '#215a36',
        display: 'flex', alignItems: 'center', gap: 6,
        animation: 'fade-in 0.25s'
      }}>
          <Icon name="check" size={13} color="#215a36" />
          Tack! Din rapport är sparad.
        </div>
      }
    </div>);

}

function ReviewCTA({ venue, onReview }) {
  return (
    <div style={{
      padding: '24px 24px 22px',
      background: '#fdfaf4',
      border: '1px solid #f1ead9',
      borderRadius: 12,
      boxShadow: '0 12px 32px rgba(115,92,0,0.06)',
      marginBottom: 22,
      textAlign: 'center'
    }}>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 22, fontWeight: 800, color: '#1b1b1e',
        letterSpacing: '-0.02em',
        marginBottom: 8
      }}>Hjälp andra hitta solen.</div>
      <div style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 13.5, color: '#4d4635', lineHeight: 1.5,
        marginBottom: 16
      }}>Vad tyckte du om {venue.name}?</div>
      <button onClick={onReview} style={{
        width: '100%', height: 40,
        borderRadius: 9999,
        background: 'linear-gradient(90deg, #d4af37 0%, #ffbf00 100%)',
        border: 'none', cursor: 'pointer',
        fontFamily: 'Manrope, sans-serif',
        fontSize: 14, fontWeight: 800, color: '#554300',
        boxShadow: '0 4px 8px rgba(51,65,85,0.13)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
      }}>
        Lämna ett omdöme <Icon name="chevronRight" size={12} color="#554300" />
      </button>
    </div>);

}

function ReviewCard({ name, time, stars, text, sun }) {
  return (
    <div style={{
      padding: 14, borderRadius: 14,
      background: '#fff', border: '1px solid #f1ead9',
      marginBottom: 8
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 6
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#f3ede0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 800, fontSize: 12, color: '#735c00'
          }}>{name[0]}</div>
          <span style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 13, fontWeight: 700, color: '#1b1b1e'
          }}>{name}</span>
        </div>
        <span style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 11, color: '#a8a29e', fontWeight: 500
        }}>{time}</span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6
      }}>
        <div style={{ display: 'flex', gap: 1 }}>
          {[1, 2, 3, 4, 5].map((n) =>
          <Icon key={n} name="star" size={12}
          color={n <= stars ? '#d4af37' : '#e4e1e5'}
          fill={n <= stars ? '#d4af37' : '#e4e1e5'} />
          )}
        </div>
        {sun &&
        <span style={{
          padding: '2px 8px', borderRadius: 9999,
          background: '#fff3d4',
          fontFamily: 'Manrope, sans-serif',
          fontSize: 10, fontWeight: 800, color: '#735c00',
          letterSpacing: '0.04em'
        }}>{sun}</span>
        }
      </div>
      <div style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 13, color: '#4d4635', lineHeight: 1.5,
        textWrap: 'pretty'
      }}>{text}</div>
    </div>);

}

const REVIEWS = [
{ name: 'Elin', time: 'Igår', stars: 5, sun: 'SOL 19:00',
  text: 'Solen stod kvar till nästan 20:00 — perfekt för after work. Bra service också.' },
{ name: 'Marcus', time: '3 dagar sen', stars: 4, sun: 'MEST SOL',
  text: 'Bra innergård, lite vind emellanåt men mycket sol från 12 och framåt.' },
{ name: 'Sofia', time: '1 vecka sen', stars: 5,
  text: 'Min favoritplats för fika. Kom tidigt — det fylls snabbt på soliga dagar!' }];


function RoundIconBtn2({ icon, onClick, title, active }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={title}
      style={{
        width: 40, height: 40, borderRadius: '50%',
        background: active ?
        'linear-gradient(135deg, #ff5577 0%, #ff8866 100%)' :
        hover ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.85)',
        backdropFilter: active ? 'none' : 'blur(12px)',
        WebkitBackdropFilter: active ? 'none' : 'blur(12px)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s',
        boxShadow: active ?
        '0 2px 8px rgba(255,90,120,0.35)' :
        '0 2px 6px rgba(0,0,0,0.12)'
      }}>
      <Icon name={icon} size={16}
      color={active ? '#fff' : '#1b1b1e'}
      fill={active && icon === 'heart' ? '#fff' : 'none'} />
    </button>);

}

window.VenueDetail = VenueDetail;