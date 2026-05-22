// Full-screen venue detail sheet

function VenueDetail({ venue, hour, onClose, onReview, isFavorite, onToggleFavorite }) {
  if (!venue) return null;
  const [shareOpen, setShareOpen] = React.useState(false);
  const pct = sunPctAt(venue, hour);
  const color = sunColor(pct);

  // Forecast: sun % across the day
  const forecast = [];
  for (let h = 8; h <= 21; h++) {
    forecast.push({ h, p: sunPctAt(venue, h) });
  }

  return (
    <>
    <div style={{
      position: 'absolute',
      left: 0, right: 0, top: 0, bottom: 0,
      background: 'rgba(0,0,0,0.2)',
      zIndex: 80,
      animation: 'fade-in 0.25s',
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="no-scroll"
        style={{
        position: 'absolute',
        left: 0, right: 0, top: 48, bottom: 0,
        background: '#fdfaf4',
        borderRadius: '40px 40px 0 0',
        overflowY: 'auto',
        animation: 'slide-up 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        {/* drag handle */}
        <div style={{
          display: 'flex', justifyContent: 'center', paddingTop: 14,
          position: 'sticky', top: 0,
          background: 'linear-gradient(#fdfaf4, #fdfaf4 65%, transparent)',
          paddingBottom: 8, zIndex: 5,
        }}>
          <div style={{
            width: 48, height: 6, borderRadius: 9999, background: '#d6d3d1',
          }}/>
        </div>

        {/* Hero — image placeholder */}
        <div style={{
          height: 220, position: 'relative',
          margin: '0 0 -12px',
          background: `
            repeating-linear-gradient(45deg, rgba(115,92,0,0.08) 0 14px, rgba(115,92,0,0.02) 14px 28px),
            linear-gradient(135deg, #f5ecd2 0%, #ede1bf 100%)`,
          overflow: 'hidden',
          borderBottom: '1px dashed rgba(115,92,0,0.3)',
        }}>
          {/* placeholder marker */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 10,
            color: '#a89875',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'rgba(255,255,255,0.6)',
              border: '1.5px dashed rgba(115,92,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="image" size={28} color="#a89875"/>
            </div>
            <div style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: 10, fontWeight: 800,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              color: '#9a8a66',
            }}>Platshållarbild</div>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 14, fontWeight: 700,
              color: '#735c00',
              marginTop: -4,
            }}>{venue.name}</div>
          </div>
          {/* sun badge top-left */}
          <div style={{
            position: 'absolute', top: 16, left: 16,
            height: 36, padding: '0 14px',
            borderRadius: 9999,
            background: 'rgba(212,175,55,0.95)',
            backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
          }}>
            <Icon name="sun" size={17} color="#554300" fill="#554300"/>
            <span style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 800, fontSize: 16, color: '#554300',
            }}>{formatPct(pct)}</span>
          </div>
          {/* close button */}
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16,
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(253,250,244,0.85)', backdropFilter: 'blur(12px)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          }}>
            <Icon name="close" size={17} color="#1b1b1e"/>
          </button>
          {/* heart button */}
          <button onClick={onToggleFavorite} style={{
            position: 'absolute', top: 16, right: 66,
            width: 40, height: 40, borderRadius: '50%',
            background: isFavorite ? 'linear-gradient(135deg, #ff5577 0%, #ff8866 100%)' : 'rgba(253,250,244,0.85)',
            backdropFilter: 'blur(12px)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
            transition: 'background 0.2s',
          }}>
            <Icon name="heart" size={17}
              color={isFavorite ? '#fff' : '#1b1b1e'}
              fill={isFavorite ? '#fff' : 'none'}/>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 24px 40px' }}>
          {/* title + status pill */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            gap: 12, marginBottom: 6,
          }}>
            <h1 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 26, fontWeight: 800,
              letterSpacing: '-0.03em', color: '#1b1b1e',
              margin: 0, lineHeight: 1.1,
            }}>{venue.name}</h1>
            <div style={{
              height: 24, padding: '0 10px',
              borderRadius: 9999,
              background: '#ffbf00',
              display: 'flex', alignItems: 'center', gap: 4,
              marginTop: 4, flexShrink: 0,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6d5000' }}/>
              <span style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: 10, fontWeight: 800, color: '#6d5000',
                letterSpacing: '0.06em',
              }}>ÖPPET · {venue.until}</span>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            fontFamily: 'Manrope, sans-serif',
            fontSize: 13, color: '#4d4635', fontWeight: 500,
          }}>
            <span>{venue.type}</span>
            <span>·</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="star" size={13} color="#d4af37" fill="#d4af37"/>
              <span style={{ color: '#1b1b1e', fontWeight: 700 }}>{venue.rating}</span>
              <span style={{ color: '#7f7663' }}>({venue.reviews})</span>
            </div>
          </div>

          {/* Sun forecast chart */}
          <div style={{
            marginTop: 24,
            padding: 18,
            background: '#fff',
            borderRadius: 20,
            border: '1px solid #eee5cf',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 14, fontWeight: 700, color: '#1b1b1e',
                }}>Solprognos idag</div>
                <div style={{
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: 11, color: '#7f7663', fontWeight: 500,
                }}>Bäst mellan {venue.peakHour - 2}:00 och {venue.peakHour + 2}:00</div>
              </div>
              <Icon name="sun" size={22} color="#d4af37" fill="#d4af37"/>
            </div>
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 3, height: 80,
              marginBottom: 6,
            }}>
              {forecast.map(({h, p}) => {
                const c = sunColor(p);
                const current = Math.abs(h - hour) < 0.5;
                return (
                  <div key={h} style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}>
                    <div style={{
                      width: '100%', height: `${Math.max(6, p * 70)}px`,
                      borderRadius: '4px 4px 0 0',
                      background: c.bg,
                      opacity: current ? 1 : 0.72,
                      border: current ? '2px solid #1b1b1e' : 'none',
                      transition: 'height 0.3s, opacity 0.3s',
                    }}/>
                  </div>
                );
              })}
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontFamily: 'Manrope, sans-serif',
              fontSize: 9, fontWeight: 600,
              color: '#a8a29e', letterSpacing: '0.05em',
            }}>
              {forecast.filter((_, i) => i % 2 === 0).map(({h}) => (
                <span key={h}>{h}</span>
              ))}
            </div>
          </div>

          {/* Description */}
          <p style={{
            marginTop: 18,
            fontFamily: 'Manrope, sans-serif',
            fontSize: 14, color: '#4d4635', fontWeight: 500,
            lineHeight: 1.55, textWrap: 'pretty',
          }}>{venue.description}</p>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {venue.tags.map(t => (
              <span key={t} style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: 12, fontWeight: 700,
                padding: '5px 11px', borderRadius: 9999,
                background: '#f5f0e6', color: '#735c00',
                border: '1px solid #eee5cf',
              }}>{t}</span>
            ))}
          </div>

          {/* Facts grid */}
          <div style={{
            marginTop: 20,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          }}>
            <FactCard icon="walk" label="Avstånd" value={venue.distance}/>
            <FactCard icon="compass" label="Exponering" value={{south:'Söder', east:'Öster', west:'Väster', north:'Norr'}[venue.orientation]}/>
            <FactCard icon="clock" label="Bäst kl." value={`${venue.peakHour}:00`}/>
            <FactCard icon="seat" label="Platser ute" value="~24"/>
          </div>
          {/* Action buttons — inside the scrollable content */}
          <div style={{
            marginTop: 24,
            display: 'flex', gap: 10,
          }}>
            <button style={{
              flex: 1, height: 54,
              borderRadius: 9999,
              background: 'linear-gradient(135deg, #d4af37 0%, #ffbf00 100%)',
              border: 'none', cursor: 'pointer',
              fontFamily: 'Manrope, sans-serif',
              fontSize: 15, fontWeight: 800, color: '#554300',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 6px 16px rgba(115,92,0,0.3)',
            }}>
              <Icon name="nav" size={17} color="#554300"/> Visa rutt
            </button>
            <button title="Dela" onClick={() => setShareOpen(true)} style={{
              width: 54, height: 54,
              borderRadius: '50%',
              background: '#fff', border: '1px solid #e9e1cf',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}>
              <Icon name="share" size={18} color="#1b1b1e"/>
            </button>
          </div>

          {/* Feedback block */}
          <FeedbackBlock onReview={onReview}/>

          {/* Reviews preview */}
          <div style={{ marginTop: 20 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
            }}>
              <div style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: 14, fontWeight: 700, color: '#1b1b1e',
              }}>Senaste recensioner</div>
              <button onClick={onReview} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: 'Manrope, sans-serif',
                fontSize: 12, fontWeight: 700, color: '#735c00',
              }}>Skriv recension</button>
            </div>
            {[
              { name: 'Elin', time: 'Igår', stars: 5, text: 'Solen stod kvar till nästan 20:00 — perfekt för after work.' },
              { name: 'Marcus', time: '3 dagar sen', stars: 4, text: 'Bra innergård, lite vind emellanåt men mycket sol från 12.' },
            ].map((r, i) => (
              <div key={i} style={{
                padding: 14, borderRadius: 16,
                background: '#fff', border: '1px solid #eee5cf',
                marginBottom: 8,
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
                }}>
                  <span style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: 13, fontWeight: 700, color: '#1b1b1e',
                  }}>{r.name}</span>
                  <span style={{
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: 11, color: '#a8a29e',
                  }}>{r.time}</span>
                </div>
                <div style={{ display: 'flex', gap: 1, marginBottom: 6 }}>
                  {[1,2,3,4,5].map(n => (
                    <Icon key={n} name="star" size={12}
                      color={n <= r.stars ? '#d4af37' : '#e4e1e5'}
                      fill={n <= r.stars ? '#d4af37' : '#e4e1e5'}/>
                  ))}
                </div>
                <div style={{
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: 13, color: '#4d4635', lineHeight: 1.5,
                }}>{r.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    {shareOpen && <ShareModal venue={venue} onClose={() => setShareOpen(false)}/>}
    </>
  );
}

function FactCard({ icon, label, value }) {
  return (
    <div style={{
      padding: '10px 12px',
      borderRadius: 14,
      background: '#fff',
      border: '1px solid #eee5cf',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <Icon name={icon} size={13} color="#735c00"/>
        <span style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 10, fontWeight: 700, color: '#7f7663',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 16, fontWeight: 700, color: '#1b1b1e',
      }}>{value}</div>
    </div>
  );
}

window.VenueDetail = VenueDetail;

function FeedbackBlock({ onReview }) {
  const [choice, setChoice] = React.useState(null); // 'sun' | 'shade' | null

  const Btn = ({ id, icon, label, activeBg, activeColor }) => {
    const active = choice === id;
    return (
      <button
        onClick={() => setChoice(id)}
        style={{
          flex: 1, height: 42, borderRadius: 12,
          background: active ? '#dcf5e3' : (id === 'sun' ? '#fff3d4' : '#f5f0e6'),
          border: active ? '1px solid #7cc295' : '1px solid #eee5cf',
          fontFamily: 'Manrope, sans-serif',
          fontSize: 13, fontWeight: 700,
          color: active ? '#215a36' : (id === 'sun' ? '#735c00' : '#4d4635'),
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'background 0.2s, border-color 0.2s, color 0.2s',
        }}>
        {active ? (
          <Icon name="check" size={15} color="#215a36"/>
        ) : (
          <Icon name={icon} size={15}
            color={id === 'sun' ? '#735c00' : '#4d4635'}
            fill={id === 'sun' ? '#735c00' : '#4d4635'}/>
        )}
        {label}
      </button>
    );
  };

  return (
    <div style={{
      marginTop: 20,
      padding: 18,
      background: '#fff',
      borderRadius: 20,
      border: '1px solid #eee5cf',
    }}>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 14, fontWeight: 700, color: '#1b1b1e',
        marginBottom: 4,
      }}>Stämmer sol-prognosen?</div>
      <div style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 12, color: '#7f7663', marginBottom: 12,
      }}>Hjälp oss bli bättre genom att rapportera hur det ser ut just nu.</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn id="sun" icon="sun" label="Sol nu"/>
        <Btn id="shade" icon="cloud" label="Skugga"/>
      </div>
      {choice && (
        <div style={{
          marginTop: 10,
          fontFamily: 'Manrope, sans-serif',
          fontSize: 11.5, fontWeight: 600,
          color: '#215a36',
          display: 'flex', alignItems: 'center', gap: 5,
          animation: 'fade-in 0.25s',
        }}>
          <Icon name="check" size={12} color="#215a36"/>
          Tack! Din rapport är sparad.
        </div>
      )}
    </div>
  );
}
