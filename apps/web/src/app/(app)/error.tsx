'use client';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card"><div className="state error" role="alert">
      <h3>Something went wrong on this page</h3>
      <p>The error has been logged.{error.digest && <> Reference <span className="corr">{error.digest}</span></>}</p>
      <button className="btn mt-2" onClick={reset}>Try again</button>
    </div></div>
  );
}
