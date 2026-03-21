export const metadata = {
  title: 'Offline — SunnySeat',
};

export default function OfflinePage() {
  return (
    <main
      id="main-content"
      className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center"
    >
      <h1 className="text-2xl font-bold text-text-primary mb-3">Du är offline</h1>
      <p className="text-text-secondary max-w-sm">
        SunnySeat behöver en internetanslutning för att visa aktuella soldata. Kontrollera din
        anslutning och försök igen.
      </p>
    </main>
  );
}
