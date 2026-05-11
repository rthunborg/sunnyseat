// Desktop App — wires together TopBar, Sidebar, MapCanvas, Pins, TimeScrubber,
// QuickInfo, VenueDetail, LockedPlanner, Paywall, Onboarding.
//
// Two flavors selected via prop: "free" or "premium".

function App({ flavor = 'free', initialPlannerOpen = false }) {
  const [hour, setHour] = React.useState(16.5);
  const [tab, setTab] = React.useState('near');
  const [sortMode, setSortMode] = React.useState('sun');
  const [quickId, setQuickId] = React.useState(null);
  const [detailId, setDetailId] = React.useState(null);
  const [hoverId, setHoverId] = React.useState(null);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [showPaywall, setShowPaywall] = React.useState(false);
  const [showPlanner, setShowPlanner] = React.useState(initialPlannerOpen);
  const [modal, setModal] = React.useState(null); // 'settings' | 'processing' | 'failed' | 'success'
  const [favorites, setFavorites] = React.useState(new Set(['mariatorget', 'tjoget']));
  const [isPremium, setIsPremium] = React.useState(flavor === 'premium');

  React.useEffect(() => { setIsPremium(flavor === 'premium'); }, [flavor]);

  const quickVenue = quickId ? VENUES.find(v => v.id === quickId) : null;
  const detailVenue = detailId ? VENUES.find(v => v.id === detailId) : null;

  function toggleFavorite(id) {
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function onPinClick(id) {
    setQuickId(id);
    setDetailId(null);
  }

  function onMapClick() {
    setQuickId(null);
  }

  function openDetail(id) {
    setDetailId(id);
    setQuickId(null);
  }

  function onFavTabClick() {
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    setTab('fav');
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#fdfaf4',
      overflow: 'hidden',
      fontFamily: 'Manrope, sans-serif',
    }}>
      {/* Map (full bleed) */}
      <MapCanvas hour={hour} style={{ position: 'absolute', inset: 0 }}>
        <div onPointerDown={onMapClick} style={{
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

      {/* TopBar */}
      <TopBar
        isPremium={isPremium}
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
        favLocked={!isPremium}
      />

      {/* Time scrubber — at bottom, slightly right of sidebar */}
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
            onCalendar={() => isPremium ? null : setShowPaywall(true)}
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
          locked={!isPremium}
          hour={hour}
          onClose={() => setShowPlanner(false)}
          onUpgrade={() => { setShowPlanner(false); setShowPaywall(true); }}
        />
      )}

      {/* Paywall modal */}
      {showPaywall && (
        <Paywall
          onClose={() => setShowPaywall(false)}
          onSubscribe={() => { setShowPaywall(false); setModal('processing'); }}
        />
      )}

      {/* Payment flow modals */}
      {modal === 'settings' && window.DSettingsSheet && (
        <window.DSettingsSheet
          isPremium={isPremium}
          onClose={() => setModal(null)}
          onUpgrade={() => { setModal(null); setShowPaywall(true); }}
          onManage={() => setModal(null)}
          onFeedback={() => setModal(null)}
        />
      )}
      {modal === 'processing' && window.DPaymentProcessing && (
        <window.DPaymentProcessing
          onClose={() => setModal(null)}
          onSuccess={() => { setIsPremium(true); setModal('success'); }}
          onFail={() => setModal('failed')}
        />
      )}
      {modal === 'failed' && window.DPaymentFailed && (
        <window.DPaymentFailed
          onClose={() => setModal(null)}
          onRetry={() => { setModal(null); setShowPaywall(true); }}
        />
      )}
      {modal === 'success' && window.DPaymentSuccess && (
        <window.DPaymentSuccess
          onClose={() => setModal(null)}
        />
      )}

      {/* Onboarding overlay */}
      {showOnboarding && (
        <Onboarding onDone={() => setShowOnboarding(false)}/>
      )}

      {/* Tweaks panel */}
      {window.AppTweaks && (
        <window.AppTweaks
          isPremium={isPremium} setIsPremium={setIsPremium}
          showOnboarding={showOnboarding} setShowOnboarding={setShowOnboarding}
          showPaywall={showPaywall} setShowPaywall={setShowPaywall}
          showPlanner={showPlanner} setShowPlanner={setShowPlanner}
          hour={hour} setHour={setHour}
        />
      )}
    </div>
  );
}

window.App = App;
