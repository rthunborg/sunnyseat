// Minimal stroke icons matching Figma's lucide-style set

const Icon = ({ name, size = 20, color = 'currentColor', fill = 'none', style = {} }) => {
  const paths = {
    sun: <>
      <circle cx="12" cy="12" r="4" fill={fill === 'currentColor' ? color : fill} stroke={color}/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </>,
    cloud: <path d="M17 17a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 6 17h11z" fill={fill === 'currentColor' ? color : fill}/>,
    star: <path d="M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.5 5.7 21l1.5-7L2 9.3l7-.8L12 2z" fill={fill}/>,
    heart: <path d="M12 21s-7-4.5-9-9.5C1.5 7.5 5 4 8 4c2 0 3.5 1 4 2.5C12.5 5 14 4 16 4c3 0 6.5 3.5 5 7.5-2 5-9 9.5-9 9.5z" fill={fill}/>,
    nav: <path d="M12 2 L 20 22 L 12 17 L 4 22 Z" fill={color}/>,
    location: <path d="M14 10l-10 4 6 2 2 6 4-10-2-2z"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    minus: <path d="M5 12h14"/>,
    chevronLeft: <path d="M15 18l-6-6 6-6"/>,
    chevronRight: <path d="M9 18l6-6-6-6"/>,
    chevronDown: <path d="M6 9l6 6 6-6"/>,
    close: <path d="M18 6L6 18M6 6l12 12"/>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></>,
    route: <><circle cx="6" cy="5" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M6 8v3a4 4 0 0 0 4 4h4a4 4 0 0 1 4 4v.5"/></>,
    lock: <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    walk: <><circle cx="13" cy="4" r="2"/><path d="M9 20l3-6-2-3 4-3 3 5 2-1M10 11l-2 9"/></>,
    wifi: <path d="M5 13a10 10 0 0 1 14 0M8 17a6 6 0 0 1 8 0M12 20.5h.01" strokeWidth="2"/>,
    wind: <path d="M5 8h10a3 3 0 1 0-3-3M3 12h14a3 3 0 1 1-3 3M4 16h8"/>,
    umbrella: <><path d="M12 12a9 9 0 0 0-9-9 9 9 0 0 0 9 9 9 9 0 0 0 9-9 9 9 0 0 0-9 9z" fill={fill}/><path d="M12 12v6a2 2 0 0 0 4 0"/></>,
    coffee: <><path d="M4 8h14v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z"/><path d="M18 10h2a2 2 0 0 1 0 4h-2M6 2v2M10 2v2M14 2v2"/></>,
    users: <><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M15 11a3 3 0 0 0 0-6"/><path d="M17 20c0-2 1.5-3.5 3-4"/></>,
    compass: <><circle cx="12" cy="12" r="9"/><path d="M9 15l2-6 6-2-2 6-6 2z" fill={color}/></>,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 5 3 9H3c0-4 3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 8v0.01M11 12h1v5h1"/></>,
    send: <path d="M2 12l20-9-7 20-4-9-9-2z" fill={fill === 'currentColor' ? color : fill}/>,
    qr: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM19 14h2M14 19h3v2h-3zM19 17h2v2"/></>,
    map: <path d="M3 6l6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 4v16M15 6v16"/>,
    check: <path d="M5 12l5 5L20 6"/>,
    sparkle: <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z" fill={color}/>,
    seat: <><path d="M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 18V11a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v7M7 18v3M17 18v3"/></>,
    leaf: <path d="M5 19C5 10 12 4 20 4c0 8-6 15-15 15z" fill={fill}/>,
    message: <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-4 3v-3H6a2 2 0 0 1-2-2z"/>,
    flag: <path d="M5 4v18M5 4h12l-3 4 3 4H5"/>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    refresh: <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}>
      {paths[name]}
    </svg>
  );
};

window.Icon = Icon;
