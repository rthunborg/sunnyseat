import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Om SunnySeat',
  description: 'Läs om hur SunnySeat hjälper dig hitta soliga uteplatser i Göteborg.',
};

export default function AboutPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-surface-primary px-4 py-8 max-w-prose mx-auto"
    >
      <nav className="pb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-secondary min-h-[var(--spacing-touch-min)] px-2 -ml-2 rounded-button hover:bg-surface-secondary transition-colors"
        >
          <span aria-hidden="true">←</span> Tillbaka
        </Link>
      </nav>

      <h1 className="text-[length:var(--font-size-title)] leading-[var(--line-height-title)] font-bold text-text-primary mb-6">
        Om SunnySeat
      </h1>

      <div className="space-y-4 text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-secondary">
        <p>
          SunnySeat hjälper dig hitta uteplatser i Göteborg som ligger i direkt solljus just nu
          och de närmaste timmarna. Appen kombinerar data om byggnader, uteplatsernas geometri
          och aktuellt väder för att ge en realtidsbild av var solen når.
        </p>

        <p>
          Vår algoritm beräknar solens position baserat på datum, tid och plats, modellerar
          skuggorna från omgivande byggnader i 2.5D och väger in aktuell molnighet. Resultatet
          är en uppskattning av hur mycket direkt solljus varje uteplats får — timme för timme.
        </p>

        <p>
          All soldata beräknas i realtid med hjälp av astronomiska formler och väderdata från
          Meteorologisk institutt (Met.no). Byggnadshöjder och geometri kommer från
          Lantmäteriet och OpenStreetMap.
        </p>

        <h2 className="text-[length:var(--font-size-subhead)] leading-[var(--line-height-subhead)] font-semibold text-text-primary pt-4">
          Datakällor
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Väderdata: Met.no (Meteorologisk institutt, Norge)</li>
          <li>Byggnadsdata: Lantmäteriet</li>
          <li>Kartdata: OpenStreetMap-bidragsgivare</li>
        </ul>

        <h2 className="text-[length:var(--font-size-subhead)] leading-[var(--line-height-subhead)] font-semibold text-text-primary pt-4">
          Ansvarsfriskrivning
        </h2>
        <p className="text-text-muted">
          Soldata är uppskattningar baserade på beräkningsmodeller och väderdata. Verkliga
          förhållanden kan avvika på grund av tillfälliga faktorer som markiser, vegetation
          eller lokala molnförhållanden. SunnySeat garanterar inte att informationen är
          fullständigt korrekt.
        </p>
      </div>
    </main>
  );
}
