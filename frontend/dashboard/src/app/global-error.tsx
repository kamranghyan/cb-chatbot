'use client';

/** Catches errors in the root layout itself (rare, but must be handled). */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '4rem' }}>
        <h1>Something went wrong</h1>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
