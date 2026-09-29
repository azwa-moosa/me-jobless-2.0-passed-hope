import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="content" style={{ margin: '10vh auto', maxWidth: 560 }}>
      <div className="card"><div className="state">
        <h3>Page not found</h3>
        <p>The page you requested does not exist or has moved.</p>
        <Link className="btn mt-2" href="/">Back to Home</Link>
      </div></div>
    </div>
  );
}
