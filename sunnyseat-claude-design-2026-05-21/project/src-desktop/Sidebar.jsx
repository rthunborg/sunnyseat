// Left venue-list sidebar — desktop
// Width 320px, full-height under TopBar.

function Sidebar({
  venues, hour, sortMode, setSortMode,
  onVenueSelect, onVenueHover,
  selectedId,
  tab, setTab, onFavTabClick,
  favorites, onToggleFavorite,
}) {
  const isFavTab = tab === 'fav';
  const filtered = isFavTab
    ? venues.filter(v => favorites?.has(v.id))
    : venues;
  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === 'sun') return sunPctAt(b, hour) - sunPctAt(a, hour);
    return parseFloat(a.distance) - parseFloat(b.distance);
  });

  return (
    <div style={{
      position: 'absolute',
      top: 72, left: 0, bottom: 0,
      width: 340,
      background: '#fdfaf4',
      borderRight: '0.5px solid #e9e1cf',
      display: 'flex', flexDirection: 'column',
      zIndex: 30,
    }}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        padding: '14px 18px 0',
        gap: 4,
        borderBottom: '1px solid #f1ead9',
      }}>
        <SideTab active={!isFavTab} onClick={() => setTab('near')}
          icon="nav" label="Nära mig"/>
        <SideTab active={isFavTab} onClick={onFavTabClick}
          icon="heart" label="Favoriter"/>
      </div>

      {/* Header row */}
      <div style={{
        padding: '18px 20px 14px',
        borderBottom: '1px solid #f1ead9',
      }}>
        {!isFavTab && (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            <SortChip active={sortMode === 'sun'} onClick={() => setSortMode('sun')}>
              <Icon name="sun" size={12} color="#735c00" fill="#735c00"/>
              Mest sol
            </SortChip>
            <SortChip active={sortMode === 'distance'} onClick={() => setSortMode('distance')}>
              <Icon name="walk" size={12} color="#4d4635"/>
              Närmast
            </SortChip>
          </div>
        )}
      </div>

      {/* List */}
      <div className="no-scroll" style={{
        flex: 1, overflowY: 'auto',
        padding: '8px 12px 20px',
      }}>
        {sorted.length === 0 && isFavTab && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center',
            padding: '60px 24px',
            color: '#7f7663',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
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
              fontSize: 12, lineHeight: 1.5,
            }}>Tryck på hjärtat på en plats för att spara den.</div>
          </div>
        )}
        {sorted.map(v => (
          <SidebarVenueCard key={v.id} venue={v} hour={hour}
            selected={selectedId === v.id}
            isFavorite={favorites?.has(v.id)}
            onToggleFavorite={onToggleFavorite}
            onClick={() => onVenueSelect(v)}
            onMouseEnter={() => onVenueHover?.(v)}
            onMouseLeave={() => onVenueHover?.(null)}/>
        ))}
      </div>
    </div>
  );
}

function SideTab({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} style={{
      flex: 1,
      height: 38, padding: '0 8px',
      background: 'transparent',
      border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 6,
      borderBottom: active ? '2px solid #d4af37' : '2px solid transparent',
      marginBottom: -1,
      position: 'relative',
    }}>
      <div style={{ position: 'relative' }}>
        <Icon name={icon} size={15} color={active ? '#1b1b1e' : '#7f7663'}/>
      </div>
      <span style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 13, fontWeight: 700,
        color: active ? '#1b1b1e' : '#7f7663',
      }}>{label}</span>
    </button>
  );
}

function SortChip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      height: 28, padding: '0 10px',
      borderRadius: 9999,
      background: active ? '#1b1b1e' : '#f3ede0',
      color: active ? '#fff' : '#4d4635',
      border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 5,
      fontFamily: 'Manrope, sans-serif',
      fontSize: 11, fontWeight: 700,
      letterSpacing: '0.02em',
    }}>{children}</button>
  );
}

function SidebarVenueCard({ venue, hour, selected, isFavorite, onToggleFavorite, onClick, onMouseEnter, onMouseLeave }) {
  const pct = sunPctAt(venue, hour);
  const color = sunColor(pct);
  const isSunny = pct >= 0.45;
  const [hover, setHover] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => { setHover(true); onMouseEnter?.(); }}
      onMouseLeave={() => { setHover(false); onMouseLeave?.(); }}
      style={{
        position: 'relative',
        margin: '6px 0',
        padding: 12,
        borderRadius: 16,
        background: selected ? '#fff8e8' : hover ? '#fdf6e3' : '#fff',
        border: selected ? '1.5px solid #d4af37' : '1px solid #f1ead9',
        cursor: 'pointer',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        transition: 'background 0.15s, border 0.15s',
        boxShadow: selected ? '0 4px 12px rgba(212,175,55,0.15)' : '0 1px 2px rgba(115,92,0,0.04)',
      }}>
      {/* Photo placeholder — clearly-marked since real photos are missing */}
      <PlaceholderThumb venue={venue} color={color} size={64} radius={12}/>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 14, fontWeight: 700, color: '#1b1b1e',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: 2,
        }}>{venue.name}</div>
        <div style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 11, fontWeight: 600, color: '#7f7663',
          marginBottom: 4,
        }}>{venue.neighborhood} · {venue.distance}</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontFamily: 'Manrope, sans-serif',
          fontSize: 10, fontWeight: 700,
          color: isSunny ? '#735c00' : '#7f7663',
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          {isSunny ? <Icon name="sun" size={10} color="#735c00" fill="#735c00"/> : <Icon name="cloud" size={10} color="#7f7663" fill="#7f7663"/>}
          {color.label}
        </div>
      </div>

      {/* Heart */}
      <div
        role="button"
        onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(venue.id); }}
        title={isFavorite ? 'Ta bort favorit' : 'Spara favorit'}
        style={{
          width: 32, height: 32, borderRadius: '50%',
          background: isFavorite ? 'linear-gradient(135deg, #ff5577 0%, #ff8866 100%)' : '#fff',
          border: isFavorite ? 'none' : '1px solid #e9e1cf',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          cursor: 'pointer',
          boxShadow: isFavorite ? '0 2px 6px rgba(255,90,120,0.35)' : 'none',
        }}>
        <Icon name="heart" size={14}
          color={isFavorite ? '#fff' : '#a8a29e'}
          fill={isFavorite ? '#fff' : 'none'}/>
      </div>
    </div>
  );
}

window.Sidebar = Sidebar;
