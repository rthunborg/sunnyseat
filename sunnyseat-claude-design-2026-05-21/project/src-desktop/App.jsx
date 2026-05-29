// Desktop App — wires together TopBar, Sidebar, MapCanvas, Pins, TimeScrubber,
// QuickInfo, VenueDetail, LockedPlanner, Onboarding.

function App({ initialPlannerOpen = false }) {
  const [hour, setHour] = React.useState(16.5);
  const [tab, setTab] = React.useState('near');
  const [sortMode, setSortMode] = React.useState('sun');
  const [quickId, setQuickId] = React.useState(null);
  const [detailId, setDetailId] = React.useState(null);
  const [hoverId, setHoverId] = React.useState(null);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [showPlanner, setShowPlanner] = React.useState(initialPlannerOpen);
  const [modal, setModal] = React.useState(null); // 'settings' | 'about' | 'feedback'
  const [favorites, setFavorites] = React.useState(new Set(['mariatorget', 'tjoget']));

  const quickVenue = quickId ? VENUES.find(v => v.id === quickId) : null;
  const detailVenue = detailId ? VENUES.find(v => v.id === detailId) : null;

  // Map pan — oversized canvas can be dragged around (matches mobile behavior)
  const MAP_SCALE = 1.35;
  const MAX_PAN_X = 240;
  const MAX_PAN_Y = 180;
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const panRef = React.useRef({ x: 0, y: 0 });
  React.useEffect(() => { panRef.current = pan; }, [pan]);
  const dragInfo = React.useRef(null);
  const movedRef = React.useRef(false);
  const clamp = (x, max) => Math.max(-max, Math.min(max, x));

  React.useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const info = dragInfo.current;
      if (!info) return;
      const dx = e.clientX - info.startX;
      const dy = e.clientY - info.startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) movedRef.current = true;
      setPan({
        x: clamp(info.initX + dx, MAX_PAN_X),
        y: clamp(info.initY + dy, MAX_PAN_Y),
      });
    };
    const onUp = () => {
      dragInfo.current = null;
      setDragging(false);
      // small delay so the synthetic click after pointerup doesn't fire pin/map handlers
      setTimeout(() => { movedRef.current = false; }, 0);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging]);

  function toggleFavorite(id) {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function onPinClick(id) {
    if (movedRef.current) return; // suppress click after drag
    setQuickId(id);
    setDetailId(null);
  }

  function onMapPointerDown(e) {
    // don't start a pan if user grabbed a pin or popover
    if (e.target.closest('[data-pin], [data-quickinfo]')) return;
    dragInfo.current = {
      startX: e.clientX, startY: e.clientY,
      initX: panRef.current.x, initY: panRef.current.y,
    };
    movedRef.current = false;
    setDragging(true);
  }

  function onMapClick() {
    if (movedRef.current) return; // drag, not a click
    setQuickId(null);
  }

  function openDetail(id) {
    setDetailId(id);
    setQuickId(null);
  }

  function onFavTabClick() {
    setTab('fav');
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#fdfaf4',
      overflow: 'hidden',
      fontFamily: 'Manrope, sans-serif',
    }}>
      {/* Map pan viewport (full bleed) — clips the oversized map canvas */}
      <div
        onPointerDown={onMapPointerDown}
        style={{
          position: 'absolute', inset: 0,
          overflow: 'hidden',
          touchAction: 'none',
          cursor: dragging ? 'grabbing' : 'grab',
          zIndex: 1,
        }}>
        {/* Oversized map canvas — centered, translated by pan */}
        <div style={{
          position: 'absolute',
          left: '50%', top: '50%',
          width: `${Math.round(100 * MAP_SCALE)}%`,
          height: `${Math.round(100 * MAP_SCALE)}%`,
          transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: 'center center',
          transition: dragging ? 'none' : 'transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: 'transform',
        }}>
          <MapCanvas hour={hour} style={{ width: '100%', height: '100%' }}>
            {/* invisible click catcher — closes QuickInfo on tap, but not after a drag */}
            <div onClick={onMapClick} style={{
              position: 'absolute', inset: 0, zIndex: 5,
            }}/>
            <UserPin x={48} y={62}/>
            {VENUES.map(v => (
              <SunPin
                key={v.id}
                venue={v}
                hour={hour}
                selected={quickId === v.id || hoverId === v.id}
                onClick={() => onPinClick(v.id)}
              />
            ))}

            {/* QuickInfo popover */}
            {quickVenue && (
              <QuickInfo
                venue={quickVenue}
                hour={hour}
                onClose={() => setQuickId(null)}
                onOpen={() => openDetail(quickVenue.id)}
                isFavorite={favorites.has(quickVenue.id)}
                onToggleFavorite={toggleFavorite}
              />
            )}
          </MapCanvas>
        </div>
      </div>

      {/* TopBar */}
      <TopBar
        onSettings={() => setModal('settings')}
      />

      {/* Sidebar */}
      <Sidebar
        venues={VENUES}
        hour={hour}
        sortMode={sortMode}
        setSortMode={setSortMode}
        onVenueSelect={(v) => openDetail(v.id || v)}
        onVenueHover={(v) => setHoverId(v?.id || v)}
        selectedId={quickId || detailId}
        tab={tab}
        setTab={setTab}
        onFavTabClick={onFavTabClick}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
      />

      {/* Time scrubber — spans the full map width (sidebar + small side gaps),
          shrinks when VenueDetail panel is open so it doesn't slide under it. */}
      <div style={{
        position: 'absolute',
        left: 340 + 16,
        right: (detailVenue ? 390 : 0) + 16,
        bottom: 24,
        display: 'flex', justifyContent: 'center',
        zIndex: 25,
        pointerEvents: 'none',
        transition: 'right 0.18s ease',
      }}>
        <div style={{ pointerEvents: 'auto', width: '100%' }}>
          <TimeScrubber
            hour={hour}
            setHour={setHour}
          />
        </div>
      </div>

      {/* Venue detail panel */}
      {detailVenue && (
        <VenueDetail
          venue={detailVenue}
          hour={hour}
          onClose={() => setDetailId(null)}
          onReview={() => {}}
          isFavorite={favorites.has(detailVenue.id)}
          onToggleFavorite={() => toggleFavorite(detailVenue.id)}
        />
      )}

      {/* Planner side panel */}
      {showPlanner && (
        <LockedPlanner
          hour={hour}
          onClose={() => setShowPlanner(false)}
        />
      )}

      {/* Settings modal */}
      {modal === 'settings' && window.DSettingsSheet && (
        <window.DSettingsSheet
          onClose={() => setModal(null)}
          onFeedback={() => setModal('feedback')}
          onAbout={() => setModal('about')}
        />
      )}

      {/* About modal */}
      {modal === 'about' && window.DAboutModal && (
        <window.DAboutModal
          onClose={() => setModal(null)}
          onFeedback={() => setModal('feedback')}
        />
      )}

      {/* Feedback modal */}
      {modal === 'feedback' && window.DFeedbackModal && (
        <window.DFeedbackModal onClose={() => setModal(null)}/>
      )}

      {/* Onboarding overlay */}
      {showOnboarding && (
        <Onboarding onDone={() => setShowOnboarding(false)}/>
      )}

      {/* Tweaks panel */}
      {window.AppTweaks && (
        <window.AppTweaks
          showOnboarding={showOnboarding} setShowOnboarding={setShowOnboarding}
          showPlanner={showPlanner} setShowPlanner={setShowPlanner}
          hour={hour} setHour={setHour}
        />
      )}
    </div>
  );
}

window.App = App;
