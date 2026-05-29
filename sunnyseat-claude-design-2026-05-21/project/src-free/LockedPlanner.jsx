// Locked planner — for free users.
// Renders the real TopPanel (so reviewers see what's gated), blurred + dimmed,
// fully non-interactive. The UpsellPanel floats partially on top, leaving the
// upper portion of the planner peeking out so it's clear what's behind the lock.
//
// Two states:
//   - expanded: full upsell card visible over the blurred planner
//   - collapsed: just the blurred planner + a small "Lås upp" pill — tapping
//     re-expands. (Tapping anywhere else in the app collapses it.)

function LockedPlanner({ hour, selectedDate, expanded, onExpand, onUpgrade }) {
  const noop = () => {};
  return (
    <div
      onClick={(e) => { e.stopPropagation(); expanded ? onUpgrade() : onExpand(); }}
      role="button"
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 190,
        zIndex: 25,
        cursor: 'pointer',
      }}>

      {/* The real planner — blurred + dimmed only while the upsell CTA is open;
          clear and readable once the user collapses it. Always non-interactive. */}
      <div
        aria-hidden="true"
        style={{
          position: 'relative',
          filter: expanded ? 'blur(3px) saturate(0.85)' : 'none',
          opacity: expanded ? 0.7 : 1,
          transition: 'filter 0.25s ease, opacity 0.25s ease',
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
        <TopPanel
          hour={hour}
          setHour={noop}
          onLocked={noop}
          onCalendar={noop}
          selectedDate={selectedDate}/>
      </div>

      {/* Soft warm wash, only when expanded */}
      <div style={{
        position: 'absolute',
        top: 58, left: 16, right: 16,
        height: 110,
        borderRadius: 24,
        background: 'linear-gradient(180deg, rgba(253,250,244,0.0) 0%, rgba(253,250,244,0.55) 60%, rgba(253,250,244,0.85) 100%)',
        pointerEvents: 'none',
        opacity: expanded ? 1 : 0,
        transition: 'opacity 0.22s',
      }}/>

      {/* Lock chip — top-right of the blurred planner */}
      <div style={{
        position: 'absolute',
        top: 50, right: 24,
        height: 22, padding: '0 9px',
        borderRadius: 9999,
        background: 'rgba(27,27,30,0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', gap: 5,
        boxShadow: '0 4px 10px rgba(0,0,0,0.18)',
        pointerEvents: 'none',
      }}>
        <Icon name="lock" size={10} color="#ffe088"/>
        <span style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 9.5, fontWeight: 800,
          color: '#ffe088',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>Låst</span>
      </div>

      {/* Upsell card — animates in/out */}
      <div style={{
        position: 'absolute',
        top: 148, left: 16, right: 16,
        opacity: expanded ? 1 : 0,
        transform: expanded ? 'translateY(0)' : 'translateY(-12px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        pointerEvents: expanded ? 'auto' : 'none',
      }}>
        <UpsellPanel onUpgrade={onUpgrade} embedded/>
      </div>

      {/* Collapsed-state hint pill — small "tap to unlock" cue under the planner */}
      <div style={{
        position: 'absolute',
        top: 150, left: '50%', transform: 'translateX(-50%)',
        height: 26, padding: '0 12px',
        borderRadius: 9999,
        background: 'rgba(255,255,255,0.94)',
        boxShadow: '0 6px 14px rgba(115,92,0,0.18), 0 1px 3px rgba(115,92,0,0.08)',
        border: '0.5px solid rgba(255,255,255,0.9)',
        display: 'flex', alignItems: 'center', gap: 6,
        opacity: expanded ? 0 : 1,
        transition: 'opacity 0.22s',
        pointerEvents: 'none',
      }}>
        <Icon name="sparkle" size={11} color="#735c00" fill="#735c00"/>
        <span style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 11, fontWeight: 800,
          color: '#1b1b1e', letterSpacing: '-0.005em',
        }}>Lås upp planeringen</span>
      </div>
    </div>
  );
}

window.LockedPlanner = LockedPlanner;
