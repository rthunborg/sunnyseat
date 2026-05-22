// Venue + sun data for SunnySeat
// Sun % depends on hour-of-day + venue's orientation (east/south/west)

const VENUES = [
  {
    id: 'kafe-magasinet',
    name: 'Kafé Magasinet',
    type: 'Kafé · Göteborg',
    neighborhood: 'Långgatorna',
    distance: '340 m',
    rating: 4.7,
    reviews: 842,
    orientation: 'south', // gets sun midday
    peakHour: 13,
    x: 38, y: 44,      // map position %
    price: 'kr · kr',
    open: true,
    until: '22:00',
    description: 'Ljus innergård med stora solkrukor och gamla kastanjeträd. Solen träffar bakre trädgården från kl 11 till solnedgång.',
    tags: ['Innergård', 'Hund ok', 'Wifi', 'Bakverk'],
    photos: 4,
    tone: 'warm',
  },
  {
    id: 'haga-bageri',
    name: 'Haga Bageri',
    type: 'Bageri · Haga',
    neighborhood: 'Haga',
    distance: '620 m',
    rating: 4.6,
    reviews: 412,
    orientation: 'east', // sun in morning
    peakHour: 10,
    x: 22, y: 30,
    price: 'kr',
    open: true,
    until: '17:00',
    description: 'Små bord längs gatan med morgonsol. Perfekt för tidig kaffe innan trängseln.',
    tags: ['Morgonsol', 'Take-away', 'Surdeg'],
    photos: 3,
    tone: 'warm',
  },
  {
    id: 'linne-bar',
    name: 'Linnégatan 32',
    type: 'Bar · Linnéstaden',
    neighborhood: 'Linné',
    distance: '880 m',
    rating: 4.5,
    reviews: 1203,
    orientation: 'west', // sun in afternoon/evening
    peakHour: 17,
    x: 58, y: 62,
    price: 'kr · kr · kr',
    open: true,
    until: '01:00',
    description: 'Takterrass mot väster — hela baren badar i kvällssol juni till augusti.',
    tags: ['Takterrass', 'Kvällssol', 'Cocktails'],
    photos: 6,
    tone: 'warm',
  },
  {
    id: 'feskekyrka',
    name: 'Feskekörka',
    type: 'Restaurang · Centrum',
    neighborhood: 'Rosenlund',
    distance: '1.1 km',
    rating: 4.4,
    reviews: 298,
    orientation: 'south',
    peakHour: 14,
    x: 44, y: 56,
    price: 'kr · kr',
    open: true,
    until: '23:00',
    description: 'Nyrenoverade uteplatser längs kanalen. Skyddat från vind, fullt sol från lunch.',
    tags: ['Kanal', 'Skaldjur', 'Rökfritt'],
    photos: 5,
    tone: 'warm',
  },
  {
    id: 'jarntorget',
    name: 'Järntorget',
    type: 'Park · Majorna',
    neighborhood: 'Järntorget',
    distance: '730 m',
    rating: 4.3,
    reviews: 89,
    orientation: 'north', // mostly shaded
    peakHour: 12,
    x: 30, y: 72,
    price: 'Fri',
    open: true,
    until: 'Alltid',
    description: 'Öppen plats med bänkar. Skuggigt större delen av dagen, fläckar av sol kring middagstid.',
    tags: ['Gratis', 'Bänkar'],
    photos: 2,
    tone: 'cool',
  },
  {
    id: 'vasa-hornet',
    name: 'Vasahörnet',
    type: 'Café · Vasastan',
    neighborhood: 'Vasa',
    distance: '450 m',
    rating: 4.8,
    reviews: 611,
    orientation: 'south',
    peakHour: 13,
    x: 50, y: 36,
    price: 'kr · kr',
    open: true,
    until: '20:00',
    description: 'Hörna med tre stora parasoll — går att fälla ihop för full sol.',
    tags: ['Parasoller', 'Specialkaffe', 'Avokadotoast'],
    photos: 7,
    tone: 'warm',
  },
];

// Computes sunlight % at given hour for a venue (0..1).
// Based on sun path: sunrise ~5, noon=12, sunset ~21 in Göteborg June.
// Orientation decides which part of day the spot catches direct sun.
function sunPctAt(venue, hour) {
  const peak = venue.peakHour;
  const orientation = venue.orientation;

  // Outside sun hours → 0
  if (hour < 6 || hour > 21) return 0;

  // Bell curve around peak hour
  let width;
  if (orientation === 'east') width = 3.5;
  else if (orientation === 'west') width = 3.5;
  else if (orientation === 'south') width = 5;
  else width = 2; // north: tiny window

  const d = Math.abs(hour - peak);
  const base = Math.exp(-(d * d) / (2 * width * width));

  // Max possible for each orientation (north never gets full sun)
  const cap = orientation === 'north' ? 0.3 : orientation === 'south' ? 0.97 : 0.88;

  return Math.max(0, Math.min(1, base * cap));
}

function formatPct(p) {
  return Math.round(p * 100) + '%';
}

// Sun color intensity (0..1) → amber variations
function sunColor(p) {
  if (p >= 0.7) return { bg: '#ffbf00', fg: '#554300', label: 'Full sol' };
  if (p >= 0.45) return { bg: '#f4c349', fg: '#6b5200', label: 'Mest sol' };
  if (p >= 0.25) return { bg: '#e8cf85', fg: '#5a4a1e', label: 'Delvis sol' };
  if (p >= 0.08) return { bg: '#d6c8a6', fg: '#4d4635', label: 'Mest skugga' };
  return { bg: '#e4e1e5', fg: '#4d4635', label: 'Skugga' };
}

window.VENUES = VENUES;
window.sunPctAt = sunPctAt;
window.formatPct = formatPct;
window.sunColor = sunColor;
