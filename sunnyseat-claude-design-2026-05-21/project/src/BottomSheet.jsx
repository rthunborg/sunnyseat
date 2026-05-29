// Bottom sheet: 3 snap states — peek (120) / mid (320) / full (620)
// Tabbable + draggable handle.

function BottomSheet({ venues, hour, sortMode, setSortMode, onVenueSelect, state, setState, footerH = 40, tab = 'near', favorites, onToggleFavorite }) {
  const PEEK = 120;
  const MID = 320;
  const FULL = 620;
  const height = state === 'full' ? FULL : state === 'mid' ? MID : PEEK;

  const isFavTab = tab === 'fav';
  const filtered = isFavTab
    ? venues.filter(v => favorites?.has(v.id))
    : venues;

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === 'sun') return sunPctAt(b, hour) - sunPctAt(a, hour);
    if (sortMode === 'distance') return parseFloat(a.distance) - parseFloat(b.distance);
    return 0;
  });

  const headerTitle = isFavTab
    ? `${sorted.length} ${sorted.length === 1 ? 'favorit' : 'favoriter'}`
    : null;
  const headerSub = isFavTab && sorted.length === 0
    ? 'Tryck på hjärtat på en plats för att spara'
    : null;

  // Drag the handle to cycle states
  const dragStart = React.useRef(null);
  const onPointerDown = (e) => {
    dragStart.current = { y: e.clientY, state };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerUp = (e) => {
    if (!dragStart.current) return;
    const dy = e.clientY - dragStart.current.y;
    if (dy < -30) setState(state === 'peek' ? 'mid' : 'full');
    else if (dy > 30) setState(state === 'full' ? 'mid' : 'peek');
    dragStart.current = null;
  };

  const cycle = () => {
    setState(state === 'peek' ? 'mid' : state === 'mid' ? 'full' : 'peek');
  };

  return (
    <div style={{
      position: 'absolute',
      left: 0, right: 0, bottom: footerH,
      height,
      background: '#fdfaf4',
      borderRadius: '32px 32px 0 0',
      boxShadow: '0 -8px 28px rgba(115,92,0,0.1), 0 -2px 6px rgba(0,0,0,0.04)',
      transition: 'height 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
      overflow: 'hidden',
      zIndex: 22,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Drag handle zone */}
      <div
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={cycle}
        style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          height: 26, cursor: 'grab', flexShrink: 0,
        }}>
        <div style={{
          width: 44, height: 5, borderRadius: 9999,
          background: 'rgba(208,197,175,0.9)',
        }}/>
      </div>

      {/* Header — only renders on favorites tab */}
      {(headerTitle || headerSub) && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '2px 20px 8px', flexShrink: 0, gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {headerTitle && (
              <div style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 700, fontSize: 15, color: '#1b1b1e',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{headerTitle}</div>
            )}
            {headerSub && (
              <div style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: 11, color: '#7f7663', marginTop: 1,
              }}>{headerSub}</div>
            )}
          </div>
        </div>
      )}

      {/* Filter chips — horizontally drag-scrollable */}
      {state !== 'peek' && (
        <DragScrollRow style={{
          display: 'flex', gap: 6, padding: '10px 20px 10px',
          overflowX: 'auto', flexShrink: 0,
          scrollbarWidth: 'none',
        }}>
          <Chip active={sortMode === 'sun'} onClick={() => setSortMode('sun')} icon="sun">Mest sol</Chip>
          <Chip active={sortMode === 'distance'} onClick={() => setSortMode('distance')} icon="walk">Nära mig</Chip>
          <Chip icon="coffee">Kafé</Chip>
          <Chip icon="users">Öppet nu</Chip>
          <Chip icon="leaf">Trädgård</Chip>
          <Chip icon="sun">Soluppgång</Chip>
          <Chip icon="star">Toppbetyg</Chip>
          <Chip icon="walk">Promenadavstånd</Chip>
          <Chip icon="heart">Romantiskt</Chip>
        </DragScrollRow>
      )}

      {/* List */}
      <div className="no-scroll" style={{
        padding: '0 14px 16px',
        overflowY: 'auto',
        flex: 1,
      }}>
        {sorted.length === 0 && isFavTab ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '40px 20px', textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#fff3d4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
            }}>
              <Icon name="heart" size={26} color="#d4af37"/>
            </div>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 16, fontWeight: 700, color: '#1b1b1e', marginBottom: 4,
            }}>Inga favoriter än</div>
            <div style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: 13, color: '#7f7663', maxWidth: 260, lineHeight: 1.5,
            }}>Hitta en solig plats du gillar och tryck på hjärtat — så hittar du den lätt nästa gång.</div>
          </div>
        ) : sorted.map((v) => (
          <VenueRow
            key={v.id} venue={v} hour={hour}
            isFavorite={favorites?.has(v.id)}
            onToggleFavorite={onToggleFavorite}
            onClick={(e) => { e.stopPropagation(); onVenueSelect(v); }}
            compact={state === 'peek'}/>
        ))}
      </div>
    </div>
  );
}

function Chip({ children, active, onClick, icon }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        height: 30, padding: '0 11px',
        borderRadius: 9999,
        background: active ? '#1b1b1e' : '#fff',
        color: active ? '#fff' : '#4d4635',
        border: active ? 'none' : '1px solid #e9e1cf',
        fontFamily: 'Manrope, sans-serif',
        fontSize: 12, fontWeight: 700,
        letterSpacing: '-0.01em',
        cursor: 'pointer',
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
      <Icon name={icon} size={13} color={active ? '#ffbf00' : '#735c00'} fill={active && icon === 'sun' ? '#ffbf00' : 'none'}/>
      {children}
    </button>
  );
}

function VenueRow({ venue, hour, onClick, compact, isFavorite, onToggleFavorite }) {
  const pct = sunPctAt(venue, hour);
  const color = sunColor(pct);

  return (
    <div
      onClick={onClick}
      role="button"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '8px 6px',
        background: 'transparent', border: 'none',
        borderBottom: '1px solid rgba(208,197,175,0.3)',
        cursor: 'pointer', textAlign: 'left',
      }}>
      <PlaceholderThumb venue={venue} color={color}/>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontWeight: 700, fontSize: 15, color: '#1b1b1e',
          letterSpacing: '-0.01em', marginBottom: 2,
        }}>{venue.name}</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontFamily: 'Manrope, sans-serif',
          fontSize: 11, color: '#7f7663', fontWeight: 500,
        }}>
          <Icon name="walk" size={11} color="#735c00"/>
          <span>{venue.distance}</span>
          <span>·</span>
          <Icon name="star" size={11} color="#d4af37" fill="#d4af37"/>
          <span style={{ color: '#4d4635', fontWeight: 700 }}>{venue.rating}</span>
          <span>·</span>
          <span style={{ color: color.fg, fontWeight: 800 }}>{formatPct(pct)} sol</span>
        </div>
        {!compact && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {venue.tags.slice(0, 2).map(t => (
              <span key={t} style={{
                fontSize: 9.5, fontWeight: 600,
                padding: '2px 7px', borderRadius: 9999,
                background: '#f5f0e6', color: '#735c00',
                fontFamily: 'Manrope, sans-serif',
                letterSpacing: '0.02em',
              }}>{t}</span>
            ))}
          </div>
        )}
      </div>

      <div
        role="button"
        onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(venue.id); }}
        title={isFavorite ? 'Ta bort favorit' : 'Spara favorit'}
        style={{
          width: 40, height: 40, borderRadius: '50%',
          background: isFavorite ? 'linear-gradient(135deg, #ff5577 0%, #ff8866 100%)' : '#fff',
          border: isFavorite ? 'none' : '1px solid #e9e1cf',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isFavorite ? '0 2px 6px rgba(255,90,120,0.35)' : '0 1px 3px rgba(0,0,0,0.04)',
          flexShrink: 0,
          cursor: 'pointer',
        }}>
        <Icon name="heart" size={17}
          color={isFavorite ? '#fff' : '#a8a29e'}
          fill={isFavorite ? '#fff' : 'none'}/>
      </div>
    </div>
  );
}

window.BottomSheet = BottomSheet;

// Horizontally drag-scrollable row — pointer drag (mouse) + native touch/trackpad scroll.
function DragScrollRow({ children, style }) {
  const ref = React.useRef(null);
  const drag = React.useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  const onPointerDown = (e) => {
    // Only drag with mouse/pen — let touch use native momentum scroll.
    if (e.pointerType === 'touch') return;
    drag.current = { active: true, startX: e.clientX, startScroll: ref.current.scrollLeft, moved: false };
    ref.current.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 3) drag.current.moved = true;
    ref.current.scrollLeft = drag.current.startScroll - dx;
  };
  const onPointerUp = (e) => {
    drag.current.active = false;
    ref.current.releasePointerCapture?.(e.pointerId);
  };
  // Swallow click immediately after a drag so chips don't toggle.
  const onClickCapture = (e) => {
    if (drag.current.moved) { e.stopPropagation(); e.preventDefault(); drag.current.moved = false; }
  };

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
      style={{ ...style, cursor: 'grab', userSelect: 'none', WebkitOverflowScrolling: 'touch' }}
      className="no-scroll">
      {children}
    </div>
  );
}
window.DragScrollRow = DragScrollRow;

// Clearly-marked placeholder thumbnail — diagonal stripes + dashed image badge
// + venue initial — so reviewers know real photos are missing.
function PlaceholderThumb({ venue, color, size = 60 }) {
  const initial = (venue.name || '?').charAt(0).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: 12,
      position: 'relative', flexShrink: 0, overflow: 'hidden',
      background: `
        repeating-linear-gradient(45deg,
          rgba(115,92,0,0.10) 0 6px,
          rgba(115,92,0,0.02) 6px 12px),
        linear-gradient(135deg, #f5ecd2 0%, #ede1bf 100%)`,
      border: '1px dashed rgba(115,92,0,0.35)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* venue initial */}
      <span style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: size * 0.42, fontWeight: 800,
        color: 'rgba(115,92,0,0.55)',
        letterSpacing: '-0.02em',
      }}>{initial}</span>

      {/* image-icon corner — signals "photo placeholder" */}
      <div style={{
        position: 'absolute', top: 3, right: 3,
        width: 16, height: 16, borderRadius: 5,
        background: 'rgba(253,250,244,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
      }}>
        <Icon name="image" size={9} color="#9a8a66"/>
      </div>

      {/* sun badge — preserved */}
      {color && (
        <div style={{
          position: 'absolute', left: 4, bottom: 4,
          width: 20, height: 20, borderRadius: '50%',
          background: color.bg, border: '2px solid #fdfaf4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="sun" size={10} color={color.fg} fill={color.fg}/>
        </div>
      )}
    </div>
  );
}

window.PlaceholderThumb = PlaceholderThumb;
