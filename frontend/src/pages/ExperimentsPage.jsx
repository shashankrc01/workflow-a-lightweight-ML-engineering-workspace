import { Fragment, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Icon } from "../components/Icon.jsx";
import { ConfirmModal } from "../components/Modal.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { formatMetric, metricKeyFor, formatDate } from "../lib/format.js";
import { useToast } from "../context/ToastContext.jsx";

export function ExperimentsPage() {
  const { project, experiments, refreshExperiments, refreshDeployments, refreshProject } = useOutletContext();
  const [expandedId, setExpandedId] = useState(null);
  const [promoteTarget, setPromoteTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  if (experiments.length === 0) {
    return (
      <>
        <PageHeader project={project} page="Experiments" title="Experiment dashboard" description="Compare runs and promote the best one to production." />
        <EmptyState
          icon={Icon.Beaker}
          title="No experiments yet"
          description="Train a model to see it show up here, ranked against your other runs."
          action={<Link to="../train" relative="path" className="btn-primary"><Icon.Play size={16} /> Train a model</Link>}
        />
      </>
    );
  }

  const sorted = [...experiments].sort((a, b) => {
    const ak = metricKeyFor(a.problem_type), bk = metricKeyFor(b.problem_type);
    return (b.metrics?.[bk] ?? -Infinity) - (a.metrics?.[ak] ?? -Infinity);
  });

  const doPromote = async () => {
    setBusy(true);
    try {
      await api.promote(project.id, promoteTarget.id);
      await Promise.all([refreshDeployments(), refreshProject()]);
      toast.success(`Experiment #${promoteTarget.id} (${promoteTarget.algorithm}) promoted to production.`);
      setPromoteTarget(null);
    } catch (e) {
      toast.error(e.message || "Could not promote this experiment.");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.deleteExperiment(project.id, deleteTarget.id);
      await refreshExperiments();
      toast.success("Experiment deleted.");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e.message || "Could not delete this experiment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader project={project} page="Experiments" title="Experiment dashboard" description="Compare runs and promote the best one to production." />

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-black/[0.02] text-left text-xs text-ink-muted">
              <th className="w-10 px-4 py-2.5"></th>
              <th className="px-2 py-2.5">Algorithm</th>
              <th className="px-2 py-2.5">Status</th>
              <th className="px-2 py-2.5">Key metric</th>
              <th className="px-2 py-2.5">Train time</th>
              <th className="px-2 py-2.5">Created</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((exp, idx) => {
              const key = metricKeyFor(exp.problem_type);
              const isOpen = expandedId === exp.id;
              return (
                <Fragment key={exp.id}>
                  <tr
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-black/[0.015]"
                    onClick={() => setExpandedId(isOpen ? null : exp.id)}
                  >
                    <td className="px-4 py-2.5">{idx === 0 && exp.status === "completed" && <Icon.Trophy size={15} className="text-accent" />}</td>
                    <td className="px-2 py-2.5 font-mono">{exp.algorithm}</td>
                    <td className="px-2 py-2.5">
                      <span className={`badge ${statusStyle(exp.status)}`}>{exp.status}</span>
                    </td>
                    <td className="px-2 py-2.5 font-mono font-medium">{formatMetric(exp.metrics?.[key])}</td>
                    <td className="px-2 py-2.5 text-ink-muted">{exp.training_duration_seconds}s</td>
                    <td className="px-2 py-2.5 text-ink-muted">{formatDate(exp.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                        {exp.status === "completed" && (
                          <button className="text-xs font-medium text-accent hover:underline" onClick={() => setPromoteTarget(exp)}>
                            Promote
                          </button>
                        )}
                        <button className="text-ink-muted hover:text-danger" onClick={() => setDeleteTarget(exp)} aria-label="Delete experiment">
                          <Icon.Trash size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-border bg-black/[0.015]">
                      <td colSpan={7} className="px-4 py-4">
                        <ExperimentDetail exp={exp} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {promoteTarget && (
        <ConfirmModal
          title="Promote experiment"
          message={`Make experiment #${promoteTarget.id} (${promoteTarget.algorithm}) the active production model for this project? Any currently deployed model will be rolled back.`}
          confirmLabel="Promote"
          busy={busy}
          onConfirm={doPromote}
          onCancel={() => setPromoteTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete experiment"
          message={`Delete experiment #${deleteTarget.id} (${deleteTarget.algorithm}) and its saved model? This can't be undone.`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={doDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

function statusStyle(status) {
  if (status === "completed") return "bg-success-soft text-success";
  if (status === "failed") return "bg-danger-soft text-danger";
  return "bg-accent-soft text-accent";
}

function ExperimentDetail({ exp }) {
  return (
    <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
      <div>
        <p className="mb-1 font-medium text-ink">All metrics</p>
        <pre className="rounded-lg bg-white border border-border p-2 font-mono">{JSON.stringify(exp.metrics, null, 2)}</pre>
      </div>
      <div>
        <p className="mb-1 font-medium text-ink">Preprocessing config</p>
        <pre className="rounded-lg bg-white border border-border p-2 font-mono">{JSON.stringify(exp.preprocessing_config, null, 2)}</pre>
      </div>
      <div>
        <p className="mb-1 font-medium text-ink">Top features</p>
        {exp.feature_importance ? (
          <ul className="space-y-0.5">
            {exp.feature_importance.slice(0, 6).map((f) => (
              <li key={f.feature} className="flex justify-between font-mono">
                <span className="truncate pr-2 text-ink-muted">{f.feature}</span>
                <span>{f.importance}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">Not available for this algorithm.</p>
        )}
      </div>
      {exp.notes && (
        <div className="md:col-span-3">
          <p className="mb-1 font-medium text-ink">Notes</p>
          <p className="text-ink-muted">{exp.notes}</p>
        </div>
      )}
      {exp.error_message && (
        <div className="md:col-span-3">
          <p className="mb-1 font-medium text-danger">Error</p>
          <p className="text-danger">{exp.error_message}</p>
        </div>
      )}
    </div>
  );
}
