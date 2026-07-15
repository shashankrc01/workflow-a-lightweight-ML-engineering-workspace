import { useOutletContext, Link } from "react-router-dom";
import { Icon } from "../components/Icon.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { formatDate, formatMetric, metricKeyFor } from "../lib/format.js";

export function OverviewPage() {
  const { project, datasets, experiments, deployments } = useOutletContext();

  const completed = experiments.filter((e) => e.status === "completed");
  const best = [...completed].sort(
    (a, b) => (b.metrics?.[metricKeyFor(b.problem_type)] ?? -Infinity) - (a.metrics?.[metricKeyFor(a.problem_type)] ?? -Infinity)
  )[0];
  const activeDeployment = deployments.find((d) => d.status === "active");

  if (datasets.length === 0) {
    return (
      <>
        <PageHeader project={project} title="Overview" description="Project dashboard and quick actions." />
        <EmptyState
          icon={Icon.Database}
          title="Upload your first dataset to get started"
          description="ForgeML will generate a Dataset Health Report automatically — missing values, encoding needs, class imbalance, and more."
          action={<Link to="datasets" className="btn-primary"><Icon.Upload size={16} /> Go to Datasets</Link>}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader project={project} title="Overview" description="Project dashboard and quick actions." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Datasets" value={datasets.length} icon={Icon.Database} />
        <StatCard label="Experiments" value={experiments.length} icon={Icon.Beaker} />
        <StatCard
          label="Best result"
          value={best ? formatMetric(best.metrics?.[metricKeyFor(best.problem_type)]) : "—"}
          hint={best ? `${best.algorithm} · ${metricKeyFor(best.problem_type)}` : "No completed runs yet"}
          icon={Icon.Trophy}
        />
        <StatCard
          label="Deployment"
          value={activeDeployment ? `#${activeDeployment.experiment_id}` : "None"}
          hint={activeDeployment ? "Active in production" : "Nothing promoted yet"}
          icon={Icon.Rocket}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent experiments</h2>
            <Link to="experiments" className="flex items-center gap-1 text-xs text-accent hover:underline">
              View all <Icon.ArrowUpRight size={12} />
            </Link>
          </div>
          {experiments.length === 0 ? (
            <p className="text-sm text-ink-muted">No training runs yet. <Link to="train" className="text-accent hover:underline">Train a model</Link>.</p>
          ) : (
            <ul className="divide-y divide-border">
              {experiments.slice(0, 5).map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-mono">{e.algorithm}</span>
                  <span className="text-ink-muted">{e.status === "completed" ? formatMetric(e.metrics?.[metricKeyFor(e.problem_type)]) : e.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold">Latest dataset</h2>
          {datasets[0] && (
            <div className="text-sm">
              <p className="font-medium">{datasets[0].filename} <span className="text-ink-muted font-normal">v{datasets[0].version}</span></p>
              <p className="mt-1 text-ink-muted">Uploaded {formatDate(datasets[0].uploaded_at)}</p>
              <p className="mt-3 text-ink-muted">
                {datasets[0].health_report?.summary?.rows} rows · {datasets[0].health_report?.summary?.columns} columns ·{" "}
                {datasets[0].health_report?.problem_type}
              </p>
              <Link to="datasets" className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:underline">
                View health report <Icon.ArrowUpRight size={12} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
