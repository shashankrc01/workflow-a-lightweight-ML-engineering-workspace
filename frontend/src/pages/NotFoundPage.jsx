import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-bg text-center">
      <p className="text-4xl font-semibold">404</p>
      <p className="mt-2 text-sm text-ink-muted">This page doesn't exist.</p>
      <Link to="/" className="btn-primary mt-4">Back to projects</Link>
    </div>
  );
}
