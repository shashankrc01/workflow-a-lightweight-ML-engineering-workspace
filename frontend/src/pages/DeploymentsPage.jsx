import { useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Icon } from "../components/Icon.jsx";
import { ConfirmModal } from "../components/Modal.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { formatDate } from "../lib/format.js";
import { useToast } from "../context/ToastContext.jsx";

export function DeploymentsPage() {
  const { project, deployments, experiments, refreshDeployments, refreshProject } = useOutletContext();
  const [rollbackTarget, setRollbackTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const active = deployments.find((d) => d.status === "active");
  const activeExperiment = active && experiments.find((e) => e.id === active.experiment_id);

  const doRollback = async () => {
    setBusy(true);
    try {
      await api.rollback(project.id, rollbackTarget.id);
      await Promise.all([refreshDeployments(), refreshProject()]);
      toast.success(`Rolled back to experiment #${rollbackTarget.experiment_id}.`);
      setRollbackTarget(null);
    } catch (e) {
      toast.error(e.message || "Rollback failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader project={project} page="Deployments" title="Deployment management" description="View the active model, deployment history, and roll back if needed." />

      <div className="card mb-6">
        <h2 className="mb-3 text-sm font-semibold">Active deployment</h2>
        {active ? (
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-soft text-success">
              <Icon.Rocket size={18} />
            </div>
            <div>
              <p className="text-sm font-medium">
                Experiment #{active.experiment_id}
                {activeExperiment && <span className="ml-2 font-mono text-ink-muted">{activeExperiment.algorithm}</span>}
              </p>
              <p className="text-xs text-ink-muted">Deployed {formatDate(active.deployed_at)}</p>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Icon.Rocket}
            title="Nothing deployed yet"
            description="Promote a completed experiment from the Experiments dashboard to serve it here."
            action={<Link to="../experiments" relative="path" className="btn-primary"><Icon.Beaker size={16} /> Go to Experiments</Link>}
          />
        )}
      </div>

      {deployments.length > 0 && (
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold">Deployment history</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-ink-muted">
                <th className="py-2 pr-3">Deployment</th>
                <th className="py-2 pr-3">Experiment</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Deployed at</th>
                <th className="py-2 pr-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3">#{d.id}</td>
                  <td className="py-2 pr-3">#{d.experiment_id}</td>
                  <td className="py-2 pr-3">
                    <span className={`badge ${d.status === "active" ? "bg-success-soft text-success" : "bg-black/5 text-ink-muted"}`}>{d.status}</span>
                  </td>
                  <td className="py-2 pr-3 text-ink-muted">{formatDate(d.deployed_at)}</td>
                  <td className="py-2 pr-3 text-right">
                    {d.status !== "active" && (
                      <button className="text-xs font-medium text-accent hover:underline" onClick={() => setRollbackTarget(d)}>
                        Roll back to this
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rollbackTarget && (
        <ConfirmModal
          title="Roll back deployment"
          message={`Roll back to experiment #${rollbackTarget.experiment_id}? This becomes the new active production model.`}
          confirmLabel="Roll back"
          busy={busy}
          onConfirm={doRollback}
          onCancel={() => setRollbackTarget(null)}
        />
      )}
    </>
  );
}
