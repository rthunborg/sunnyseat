'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-2xl font-semibold">Något gick fel</h2>
      <p className="text-muted-foreground max-w-md">
        Ett oväntat fel inträffade. Försök igen eller kom tillbaka senare.
      </p>
      <button
        onClick={reset}
        className="bg-primary text-primary-foreground min-h-12 rounded-lg px-6 py-3 font-medium"
      >
        Försök igen
      </button>
    </div>
  );
}
