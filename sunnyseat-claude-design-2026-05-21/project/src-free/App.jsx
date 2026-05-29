// Main app — stitches together map, bottom sheet, and overlays

const { useState, useEffect, useRef } = React;

function App() {
  const defaults = window.SUNNY_DEFAULTS || { hour: 14, variant: 'amber', mapStyle: 'warm' };
  const [hour, setHour] = useState(() => {
    const saved = localStorage.getItem('sunny_hour');
    return saved ? parseFloat(saved) : defaults.hour;
  });
  const [mapStyle, setMapStyle] = useState(defaults.mapStyle);
  const [variant, setVariant] = useState(defaults.variant);
  const [screen, setScreen] = useState(() => {
    return localStorage.getItem('sunny_free_screen') || 'onboarding';
  });
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [paywall, setPaywall] = useState(false);
  const [sheetState, setSheetState] = useState('mid'); // peek | mid | full
  const [sortMode, setSortMode] = useState('sun');
  const [tab, setTab] = useState('near');
  const [tweaksVisible, setTweaksVisible] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [modal, setModal] = useState(null); // 'datepicker' | 'feedback' | 'review' | 'notfound' | 'paymentFailed' | 'settings' | 'about'
  const [selectedDate, setSelectedDate] = useState(14);
  const [isPremium, setIsPremium] = useState(() => localStorage.getItem('sunny_premium') === '1');
  const [paywallForceFail, setPaywallForceFail] = useState(false);
  useEffect(() => { localStorage.setItem('sunny_premium', isPremium ? '1' : '0'); }, [isPremium]);
  // Upsell card visibility — starts open, collapses when free user taps elsewhere.
  const [upsellExpanded, setUpsellExpanded] = useState(true);
  const collapseUpsell = () => setUpsellExpanded(false);
  const expandUpsell = () => setUpsellExpanded(true);

  const [favorites, setFavorites] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('sunny_favs') || '[]')); }
    catch { return new Set(); }
  });
  // Free users can't favorite — every attempt opens the upsell instead.
  const toggleFavorite = (id) => {
    if (!isPremium) {
      setUpsellExpanded(true);
      setPaywall(true);
      return;
    }
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('sunny_favs', JSON.stringify([...next]));
      return next;
    });
  };

  // Persist
  useEffect(() => { localStorage.setItem('sunny_hour', hour); }, [hour]);
  useEffect(() => { localStorage.setItem('sunny_free_screen', screen); }, [screen]);

  // For free users we lock the hour to "now" — they can't plan into the future.
  // Use a deterministic 'now' so the demo isn't dependent on real wall clock.
  const NOW_HOUR = 14.5;
  useEffect(() => {
    if (!isPremium) setHour(NOW_HOUR);
  }, [isPremium]);

  // Tweaks integration
  useEffect(() => {
    const handler = (e) => {
      const { data } = e;
      if (!data || typeof data !== 'object') return;
      if (data.type === '__activate_edit_mode') setTweaksVisible(true);
      if (data.type === '__deactivate_edit_mode') setTweaksVisible(false);
    };
    window.addEventListener('message', handler);
    window.parent?.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const tweakState = { hour, variant, mapStyle };
  const updateTweak = (patch) => {
    if ('hour' in patch) setHour(patch.hour);
    if ('variant' in patch) setVariant(patch.variant);
    if ('mapStyle' in patch) setMapStyle(patch.mapStyle);
  };

  const FOOTER_H = 52;

  // Map pan — large canvas extends beyond the viewport so you can roam
  const MAP_SCALE = 1.8;
  const MAX_PAN_X = 260;
  const MAX_PAN_Y = 220;
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const panRef = useRef({ x: 0, y: 0 });
  useEffect(() => { panRef.current = pan; }, [pan]);
  const dragInfo = useRef(null);
  const movedRef = useRef(false);
  const clamp = (x, max) => Math.max(-max, Math.min(max, x));

  // Center the map on a venue (which lives at venue.x%, venue.y% of the canvas).
  const centerOnVenue = (v) => {
    const cw = 402 * MAP_SCALE;
    const ch = 874 * MAP_SCALE;
    const dx = -((v.x - 50) / 100) * cw * zoom;
    const dy = -((v.y - 50) / 100) * ch * zoom;
    setPan({
      x: clamp(dx, MAX_PAN_X),
      y: clamp(dy, MAX_PAN_Y),
    });
  };

  const selectPin = (v) => {
    if (!isPremium) collapseUpsell();
    setSelected(v);
    setSheetState('peek');
    centerOnVenue(v);
  };

  useEffect(() => {
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

  const onMapPointerDown = (e) => {
    // don't start pan if they tapped a pin or popover
    if (e.target.closest('[data-pin], [data-quickinfo]')) return;
    // free user: any tap on the map dismisses the upsell
    if (!isPremium) collapseUpsell();
    dragInfo.current = {
      startX: e.clientX, startY: e.clientY,
      initX: panRef.current.x, initY: panRef.current.y,
    };
    movedRef.current = false;
    setDragging(true);
  };

  return (
    <div className="stage">
      <IOSDevice width={402} height={874} dark={screen === 'onboarding'}>
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
          {screen === 'onboarding' && (
            <Onboarding onContinue={() => setScreen('map')}/>
          )}

          {screen === 'map' && (
            <>
              {/* Pan viewport — full-bleed, clips the oversized map canvas */}
              <div
                onPointerDown={onMapPointerDown}
                style={{
                  position: 'absolute', inset: 0, overflow: 'hidden',
                  touchAction: 'none',
                  cursor: dragging ? 'grabbing' : 'grab',
                  zIndex: 1,
                }}>
                {/* Oversized map canvas — centered, translated by pan */}
                <div style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  width: `${Math.round(402 * MAP_SCALE)}px`,
                  height: `${Math.round(874 * MAP_SCALE)}px`,
                  transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: dragging ? 'none' : 'transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)',
                  willChange: 'transform',
                }}>
                  <MapCanvas hour={hour} style={{ width: '100%', height: '100%' }}>
                    <UserPin x={50} y={50}/>
                    {VENUES.map(v => (
                      <SunPin key={v.id} venue={v} hour={hour}
                        onClick={(e) => { e?.stopPropagation?.(); if (!movedRef.current) selectPin(v); }}
                        selected={selected?.id === v.id}/>
                    ))}
                    {selected && (
                      <QuickInfo venue={selected} hour={hour}
                        isFavorite={favorites.has(selected.id)}
                        onToggleFavorite={() => toggleFavorite(selected.id)}
                        onClose={() => setSelected(null)}
                        onOpen={() => { setDetail(selected); setSelected(null); }}/>
                    )}
                  </MapCanvas>
                </div>
              </div>

              {isPremium ? (
                <TopPanel
                  hour={hour} setHour={setHour}
                  onLocked={() => setPaywall(true)}
                  onCalendar={() => setModal('datepicker')}
                  selectedDate={selectedDate}/>
              ) : (
                <LockedPlanner
                  hour={NOW_HOUR} selectedDate={selectedDate}
                  expanded={upsellExpanded}
                  onExpand={expandUpsell}
                  onUpgrade={() => setPaywall(true)}/>
              )}

              {/* Floating controls (right side, top) */}
              <div style={{
                position: 'absolute',
                right: 16, top: 200,
                display: 'flex', flexDirection: 'column', gap: 10,
                zIndex: 20,
              }}>
                <FloatBtn onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setSelected(null); setSheetState('mid'); }} title="Centrera på min plats">
                  <Icon name="crosshair" size={20} color="#735c00"/>
                </FloatBtn>
                <FloatBtn onClick={() => setModal('settings')} title="Inställningar">
                  <Icon name="settings" size={20} color="#735c00"/>
                </FloatBtn>
              </div>

              {/* Zoom controls (right side, above sheet) */}
              <div style={{
                position: 'absolute',
                right: 16,
                bottom: (sheetState === 'peek' ? 120 : sheetState === 'mid' ? 320 : 620) + FOOTER_H + 14,
                display: 'flex', flexDirection: 'column', gap: 6,
                zIndex: 20,
                transition: 'bottom 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
              }}>
                <FloatBtn onClick={() => setZoom(z => Math.min(1.6, z + 0.2))}>
                  <Icon name="plus" size={18} color="#735c00"/>
                </FloatBtn>
                <FloatBtn onClick={() => setZoom(z => Math.max(0.7, z - 0.2))}>
                  <Icon name="minus" size={18} color="#735c00"/>
                </FloatBtn>
              </div>

              <div onPointerDown={() => { if (!isPremium) collapseUpsell(); }}>
                <BottomSheet
                  venues={VENUES} hour={hour}
                  sortMode={sortMode} setSortMode={setSortMode}
                  onVenueSelect={(v) => { setDetail(v); setSelected(null); }}
                  state={sheetState} setState={setSheetState}
                  footerH={FOOTER_H}
                  tab={tab}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}/>
              </div>

              {/* Tab bar (footer) */}
              <TabBar tab={tab} setTab={setTab} height={FOOTER_H}
                onNearToggle={() => { setTab('near'); setSheetState(s => s === 'peek' ? 'mid' : 'peek'); if (!isPremium) collapseUpsell(); }}
                onFavToggle={() => {
                  if (!isPremium) {
                    // Favorites are premium — open paywall instead of switching tab.
                    setUpsellExpanded(true);
                    setPaywall(true);
                    return;
                  }
                  setTab('fav');
                  setSheetState(s => s === 'peek' ? 'mid' : 'peek');
                }}
                favLocked={!isPremium}/>

              {detail && (
                <VenueDetail venue={detail} hour={hour}
                  isFavorite={favorites.has(detail.id)}
                  onToggleFavorite={() => toggleFavorite(detail.id)}
                  onClose={() => setDetail(null)}
                  onReview={() => setModal('review')}/>
              )}
              {paywall && (
                <Paywall onClose={() => setPaywall(false)}
                  forceFail={paywallForceFail}
                  onPurchase={() => { setIsPremium(true); setPaywall(false); }}
                  onFail={() => { setPaywall(false); setModal('paymentFailed'); }}/>
              )}

              {modal === 'datepicker' && (
                <DatePicker selectedDate={selectedDate}
                  onSelect={setSelectedDate}
                  onClose={() => setModal(null)}/>
              )}
              {modal === 'feedback' && (
                <FeedbackModal onClose={() => setModal(null)}/>
              )}
              {modal === 'review' && (
                <ReviewModal venue={detail}
                  onClose={() => setModal(null)}/>
              )}
              {modal === 'notfound' && (
                <NotFoundSheet onClose={() => setModal(null)}
                  onExpandRadius={() => setModal(null)}/>
              )}
              {modal === 'paymentFailed' && (
                <PaymentFailed onClose={() => setModal(null)}
                  onRetry={() => { setModal(null); setPaywall(true); }}/>
              )}
              {modal === 'settings' && (
                <SettingsSheet
                  onClose={() => setModal(null)}
                  onRestore={() => setModal(null)}
                  onUpgrade={() => { setModal(null); setPaywall(true); }}
                  onFeedback={() => setModal('feedback')}
                  onAbout={() => setModal('about')}/>
              )}
              {modal === 'about' && (
                <AboutModal onClose={() => setModal(null)}
                  onFeedback={() => setModal('feedback')}/>
              )}
            </>
          )}
        </div>
      </IOSDevice>

      <Tweaks state={tweakState} setState={updateTweak} visible={tweaksVisible}
        onDebugModal={setModal}
        isPremium={isPremium} setIsPremium={setIsPremium}
        paywallForceFail={paywallForceFail} setPaywallForceFail={setPaywallForceFail}
        onShowPaywall={() => setPaywall(true)}/>
    </div>
  );
}

function FloatBtn({ children, onClick, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 44, height: 44, borderRadius: '50%',
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      border: '0.5px solid rgba(255,255,255,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 10px rgba(115,92,0,0.15), 0 1px 3px rgba(0,0,0,0.08)',
      cursor: 'pointer', padding: 0,
    }}>{children}</button>
  );
}

function TabBar({ tab, setTab, height = 52, onNearToggle, onFavToggle, favLocked = false }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      height,
      background: '#fdfaf4',
      borderTop: '1px solid #f1ead9',
      boxShadow: '0 -4px 12px rgba(0,0,0,0.03)',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      zIndex: 50,
      paddingBottom: 2,
    }}>
      <TabBtn active={tab === 'near'} onClick={onNearToggle}
        icon="nav" label="Nära mig"/>
      <TabBtn active={tab === 'fav'} onClick={onFavToggle}
        icon="heart" label="Favoriter"
        locked={favLocked}/>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label, locked = false }) {
  const color = active ? '#d97706' : '#a8a29e';
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      background: 'transparent', border: 'none', cursor: 'pointer',
      padding: '4px 14px',
      position: 'relative',
    }}>
      <div style={{ position: 'relative' }}>
        <Icon name={icon} size={18} color={color} fill={active && icon === 'nav' ? color : 'none'}/>
        {locked && (
          <div style={{
            position: 'absolute', top: -4, right: -7,
            width: 14, height: 14, borderRadius: '50%',
            background: '#1b1b1e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
          }}>
            <Icon name="lock" size={8} color="#ffe088"/>
          </div>
        )}
      </div>
      <span style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 10, fontWeight: 700,
        letterSpacing: '0.03em',
        color,
      }}>{label}</span>
    </button>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
