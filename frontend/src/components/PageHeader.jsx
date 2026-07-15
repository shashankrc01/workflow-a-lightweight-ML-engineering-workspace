import { Link } from "react-router-dom";

export function PageHeader({ project, page, title, description, action }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-xs text-ink-muted">
          <Link to="/" className="hover:text-accent">Projects</Link>
          <span>/</span>
          <span className="text-ink-muted">{project?.name}</span>
          {page && (
            <>
              <span>/</span>
              <span className="font-medium text-ink">{page}</span>
            </>
          )}
        </p>
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
