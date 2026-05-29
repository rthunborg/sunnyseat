// Desktop top navigation bar — SunnySeat logo, search, tag filter, action icons.
// Sits flush at top of the app canvas, full bleed.

function TopBar({ onSettings, onSearch }) {
  // Collect unique tags from all venues, in first-seen order.
  const allTags = React.useMemo(() => {
    const seen = [];
    VENUES.forEach(v => v.tags.forEach(t => {
      if (!seen.includes(t)) seen.push(t);
    }));
    return seen;
  }, []);

  const [activeTags, setActiveTags] = React.useState(() => new Set());

  function toggleTag(t) {
    setActiveTags(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  }

  // Horizontal scroll state — arrow disabled flags + scroll helper.
  const scrollerRef = React.useRef(null);
  const [canScrollL, setCanScrollL] = React.useState(false);
  const [canScrollR, setCanScrollR] = React.useState(false);

  const updateArrows = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollL(el.scrollLeft > 2);
    setCanScrollR(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  React.useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(updateArrows) : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows]);

  function scrollByAmount(dx) {
    scrollerRef.current?.scrollBy({ left: dx, behavior: 'smooth' });
  }

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: 72,
      background: 'rgba(253,250,244,0.96)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: '0.5px solid rgba(115,92,0,0.10)',
      display: 'flex', alignItems: 'center',
      padding: '0 28px',
      gap: 20,
      zIndex: 50,
    }}>
      {/* Hide webkit scrollbar on the tag scroller */}
      <style>{`.sunny-tag-scroll::-webkit-scrollbar{display:none;height:0}`}</style>

      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        flexShrink: 0,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #ffe088 0%, #ffbf00 55%, #d4af37 100%)',
          boxShadow: '0 2px 6px rgba(212,175,55,0.4), inset -2px -2px 4px rgba(115,92,0,0.15)',
        }}/>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 22, fontWeight: 800, color: '#1b1b1e',
          letterSpacing: '-0.025em',
        }}>
          Sunny<span style={{ color: '#d4af37' }}>Seat</span>
        </div>
      </div>

      {/* Search */}
      <div style={{
        flex: '0 1 380', minWidth: 200,
        marginLeft: 4,
      }}>
        <div onClick={onSearch} style={{
          height: 44, borderRadius: 9999,
          background: '#fff',
          border: '1px solid #e9e1cf',
          display: 'flex', alignItems: 'center',
          padding: '0 18px', gap: 12,
          cursor: 'text',
          boxShadow: '0 1px 2px rgba(115,92,0,0.04)',
        }}>
          <Icon name="search" size={18} color="#7f7663"/>
          <span style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 14, fontWeight: 500,
            color: '#a39b85',
            flex: 1, minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>&nbsp;</span>
        </div>
      </div>

      {/* Tag scroller — left arrow / overflow:hidden chip row / right arrow.
          flex: 1 + min-width:0 ensures it never overlaps the search or the
          right action cluster; the inner row scrolls horizontally instead. */}
      <div style={{
        flex: '1 1 0', minWidth: 0,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <TagArrow dir="left" disabled={!canScrollL}
          onClick={() => scrollByAmount(-220)}/>

        <div
          ref={scrollerRef}
          className="sunny-tag-scroll"
          style={{
            flex: 1, minWidth: 0,
            display: 'flex', alignItems: 'center', gap: 6,
            overflowX: 'auto', overflowY: 'hidden',
            scrollbarWidth: 'none', msOverflowStyle: 'none',
            scrollBehavior: 'smooth',
            // Soft edge mask so chips fade in/out near the arrows
            WebkitMaskImage: 'linear-gradient(to right, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%)',
            maskImage: 'linear-gradient(to right, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%)',
            padding: '0 6px',
          }}>
          {allTags.map(t => {
            const on = activeTags.has(t);
            return (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                style={{
                  flexShrink: 0,
                  height: 32, padding: '0 14px',
                  borderRadius: 9999,
                  background: on ? '#1b1b1e' : '#fff',
                  color: on ? '#fff' : '#4d4635',
                  border: on ? '1px solid #1b1b1e' : '1px solid #e9e1cf',
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: 12.5, fontWeight: 700,
                  letterSpacing: '0.01em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: on
                    ? '0 1px 2px rgba(0,0,0,0.18)'
                    : '0 1px 2px rgba(115,92,0,0.04)',
                  transition: 'background 0.12s, color 0.12s, border-color 0.12s',
                }}>{t}</button>
            );
          })}
        </div>

        <TagArrow dir="right" disabled={!canScrollR}
          onClick={() => scrollByAmount(220)}/>
      </div>

      {/* Right cluster — locate me + settings */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        flexShrink: 0,
      }}>
        <HeaderIconBtn icon="crosshair" title="Centrera på min plats"/>
        <HeaderIconBtn icon="settings" title="Inställningar" onClick={onSettings}/>
      </div>
    </div>
  );
}

function TagArrow({ dir, disabled, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={dir === 'left' ? 'Scrolla taggar bakåt' : 'Scrolla taggar framåt'}
      style={{
        flexShrink: 0,
        width: 28, height: 32, borderRadius: 8,
        background: disabled
          ? 'transparent'
          : hover ? '#f3ede0' : 'transparent',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.25 : 1,
        transition: 'opacity 0.15s, background 0.15s',
      }}>
      <svg width="12" height="12" viewBox="0 0 12 12"
        style={{ transform: dir === 'right' ? 'scaleX(-1)' : 'none' }}>
        <path d="M7.5 2.5 L 3.5 6 L 7.5 9.5"
          fill="none" stroke="#4d4635" strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

function HeaderIconBtn({ icon, title, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={title}
      style={{
        width: 40, height: 40, borderRadius: 12,
        background: hover ? '#f3ede0' : 'transparent',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s',
      }}>
      <Icon name={icon} size={18} color="#4d4635"/>
    </button>
  );
}

window.TopBar = TopBar;
