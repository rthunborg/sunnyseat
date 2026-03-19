import Link from 'next/link';

export const metadata = {
  title: 'Sidan hittades inte — SunnySeat',
};

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center"
    >
      <h1 className="text-2xl font-bold text-text-primary mb-3">Sidan hittades inte</h1>
      <p className="text-text-secondary max-w-sm mb-6">
        Sidan du letar efter finns inte eller har flyttats.
      </p>
      <Link
        href="/"
        className="inline-flex items-center min-h-[48px] rounded-lg bg-accent-primary px-6 py-3 text-sm font-semibold text-white hover:bg-accent-primary/90 transition-colors"
      >
        Gå till startsidan
      </Link>
    </main>
  );
}
