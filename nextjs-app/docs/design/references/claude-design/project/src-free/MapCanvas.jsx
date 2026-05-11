// Stylized top-down "map" — hand-drawn with CSS gradients and SVG shapes.
// Warm, desaturated palette matching Figma's Gyllene Timmen vibe.

function MapCanvas({ hour, children, style = {} }) {
  // Sun angle shifts the light overlay
  const sunFrac = Math.max(0, Math.min(1, (hour - 6) / 15)); // 0 at 6am, 1 at 9pm
  const overlayAngle = 90 + sunFrac * 180; // 90° (east) → 270° (west)
  const warmth = hour < 7 || hour > 19 ? 0.7 : 1; // dusk = cooler

  // Map tiles shift subtly by time — before noon cool-ish, after noon golden
  const tintOpacity = hour >= 17 ? 0.35 : hour >= 12 ? 0.22 : 0.14;

  return (
    <div style={{
      position: 'relative',
      width: '100%', height: '100%',
      overflow: 'hidden',
      background: '#f5f0e6',
      ...style,
    }}>
      {/* Base warm paper */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse at 20% 20%, #fdf6e3 0%, transparent 50%),
          radial-gradient(ellipse at 80% 70%, #f5e6c8 0%, transparent 55%),
          #f5f0e6
        `,
      }} />

      {/* Water bodies (canal + river) */}
      <svg viewBox="0 0 390 884" preserveAspectRatio="none" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
      }}>
        {/* river snake bottom */}
        <path d="M -20 720 Q 80 700 180 740 T 410 710 L 410 884 L -20 884 Z"
          fill="#d9e4d8" opacity="0.55"/>
        {/* canal horizontal */}
        <path d="M -10 420 Q 100 400 200 430 T 410 420 L 410 455 Q 300 440 200 460 T -10 450 Z"
          fill="#d9e4d8" opacity="0.55"/>
        {/* thin canal */}
        <path d="M 280 120 L 310 280 L 340 430" stroke="#d9e4d8" strokeWidth="14" fill="none" opacity="0.5" strokeLinecap="round"/>

        {/* parks */}
        <path d="M 40 120 Q 90 100 130 130 Q 150 170 110 200 Q 60 210 30 180 Z" fill="#d5dfc2" opacity="0.7"/>
        <circle cx="335" cy="180" r="38" fill="#d5dfc2" opacity="0.65"/>
        <path d="M 50 570 Q 100 550 160 590 Q 160 640 100 650 Q 50 630 40 600 Z" fill="#d5dfc2" opacity="0.6"/>

        {/* major roads */}
        <g stroke="#ece3cf" strokeWidth="8" fill="none" strokeLinecap="round">
          <path d="M 0 250 Q 100 240 200 260 T 390 250"/>
          <path d="M 195 0 L 200 260 L 210 450 L 220 720"/>
          <path d="M 0 500 Q 100 480 200 500 T 390 520"/>
          <path d="M 80 0 L 90 240 L 100 420 L 110 720"/>
          <path d="M 290 0 L 300 200 L 310 400 L 320 700"/>
        </g>
        {/* road centerlines */}
        <g stroke="#f8f1dd" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M 0 250 Q 100 240 200 260 T 390 250"/>
          <path d="M 195 0 L 200 260 L 210 450 L 220 720"/>
          <path d="M 0 500 Q 100 480 200 500 T 390 520"/>
        </g>

        {/* smaller streets — grid-ish */}
        <g stroke="#ece3cf" strokeWidth="3" fill="none" opacity="0.7">
          <path d="M 40 100 L 360 140"/>
          <path d="M 30 340 L 380 360"/>
          <path d="M 50 620 L 370 610"/>
          <path d="M 50 680 L 370 670"/>
          <path d="M 140 0 L 160 880"/>
          <path d="M 260 0 L 270 880"/>
          <path d="M 340 60 L 350 700"/>
        </g>

        {/* building blocks — desaturated beige */}
        <g fill="#ece0c7" opacity="0.7">
          <rect x="15" y="30" width="55" height="40" rx="2"/>
          <rect x="90" y="30" width="40" height="60" rx="2"/>
          <rect x="220" y="40" width="60" height="50" rx="2"/>
          <rect x="305" y="30" width="70" height="55" rx="2"/>

          <rect x="15" y="300" width="60" height="35" rx="2"/>
          <rect x="120" y="280" width="70" height="60" rx="2"/>
          <rect x="230" y="290" width="50" height="50" rx="2"/>
          <rect x="310" y="280" width="60" height="60" rx="2"/>

          <rect x="15" y="380" width="45" height="50" rx="2"/>
          <rect x="130" y="370" width="60" height="50" rx="2"/>
          <rect x="230" y="370" width="50" height="60" rx="2"/>

          <rect x="15" y="520" width="60" height="40" rx="2"/>
          <rect x="130" y="540" width="60" height="55" rx="2"/>
          <rect x="230" y="530" width="50" height="55" rx="2"/>
          <rect x="305" y="530" width="70" height="50" rx="2"/>
        </g>

        {/* building shadow edges */}
        <g fill="#d9cba8" opacity="0.45">
          <rect x="15" y="68" width="55" height="3"/>
          <rect x="90" y="88" width="40" height="3"/>
          <rect x="220" y="88" width="60" height="3"/>
          <rect x="305" y="83" width="70" height="3"/>
          <rect x="15" y="333" width="60" height="3"/>
          <rect x="120" y="338" width="70" height="3"/>
          <rect x="230" y="338" width="50" height="3"/>
          <rect x="310" y="338" width="60" height="3"/>
          <rect x="130" y="593" width="60" height="3"/>
        </g>
      </svg>

      {/* Warm sunlight overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(${overlayAngle}deg, rgba(245,158,11,${0.05 * warmth}) 0%, rgba(245,158,11,0) 50%, rgba(249,115,22,${tintOpacity * warmth}) 100%)`,
        pointerEvents: 'none',
        transition: 'background 0.6s ease',
      }} />

      {/* Subtle paper grain */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: 0.35, mixBlendMode: 'multiply',
        pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(115,92,0,0.04) 0%, transparent 40%), radial-gradient(circle at 70% 80%, rgba(115,92,0,0.04) 0%, transparent 45%)',
      }} />

      {children}
    </div>
  );
}

window.MapCanvas = MapCanvas;
