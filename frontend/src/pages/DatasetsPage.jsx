import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../lib/api.js";
import { Icon } from "../components/Icon.jsx";
import { Modal, ConfirmModal } from "../components/Modal.jsx";
import { DropdownMenu } from "../components/DropdownMenu.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { formatDate } from "../lib/format.js";
import { useToast } from "../context/ToastContext.jsx";

export function DatasetsPage() {
  const { project, datasets, refreshDatasets } = useOutletContext();
  const [selected, setSelected] = useState(datasets[0] || null);
  const [showUpload, setShowUpload] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const active = selected && datasets.find((d) => d.id === selected.id) ? selected : datasets[0];
  const hasDatasets = datasets.length > 0;

  const doRename = async (newName) => {
    setBusy(true);
    try {
      const updated = await api.renameDataset(project.id, renameTarget.id, newName);
      await refreshDatasets();
      setSelected(updated);
      toast.success("Dataset renamed.");
      setRenameTarget(null);
    } catch (e) {
      toast.error(e.message || "Rename failed.");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.deleteDataset(project.id, deleteTarget.id);
      await refreshDatasets();
      if (active?.id === deleteTarget.id) setSelected(null);
      toast.success("Dataset deleted.");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e.message || "Could not delete this dataset.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        project={project}
        page="Datasets"
        title="Datasets"
        description="Upload an ML-ready CSV to get an automatic Dataset Health Report."
        action={
          hasDatasets && (
            <button className="btn-primary" onClick={() => setShowUpload(true)}>
              <Icon.Upload size={16} /> Upload dataset
            </button>
          )
        }
      />

      {!hasDatasets ? (
        <EmptyState
          icon={Icon.Database}
          title="No datasets uploaded"
          description="Upload a CSV with engineered features and a target column to generate a health report."
          action={<button className="btn-primary" onClick={() => setShowUpload(true)}><Icon.Upload size={16} /> Upload dataset</button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
          <div className="space-y-1.5">
            {datasets.map((d) => (
              <div
                key={d.id}
                onClick={() => setSelected(d)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  active?.id === d.id ? "border-accent bg-accent-soft" : "border-border bg-white hover:border-ink-muted/40"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium">v{d.version}</p>
                  <p className="truncate text-xs text-ink-muted">{d.filename}</p>
                </div>
                <DropdownMenu
                  items={[
                    { label: "Rename", onClick: () => setRenameTarget(d) },
                    { label: "Delete", danger: true, onClick: () => setDeleteTarget(d) },
                  ]}
                />
              </div>
            ))}
          </div>

          <div>{active && <HealthReportView dataset={active} />}</div>
        </div>
      )}

      {showUpload && (
        <UploadModal
          projectId={project.id}
          onClose={() => setShowUpload(false)}
          onUploaded={async (ds) => {
            setShowUpload(false);
            await refreshDatasets();
            setSelected(ds);
            toast.success(`Dataset "${ds.filename}" analyzed successfully.`);
          }}
        />
      )}

      {renameTarget && (
        <RenameModal
          initialValue={renameTarget.filename}
          busy={busy}
          onCancel={() => setRenameTarget(null)}
          onSubmit={doRename}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete dataset"
          message={`Delete "${deleteTarget.filename}" (v${deleteTarget.version})? This can't be undone. Datasets used by existing experiments can't be deleted until those experiments are removed first.`}
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

function RenameModal({ initialValue, busy, onCancel, onSubmit }) {
  const [value, setValue] = useState(initialValue);
  return (
    <Modal
      title="Rename dataset"
      onClose={onCancel}
      footer={
        <>
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={() => value.trim() && onSubmit(value.trim())} disabled={busy || !value.trim()}>
            {busy ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <label className="label">Name</label>
      <input
        className="input"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && value.trim() && onSubmit(value.trim())}
      />
    </Modal>
  );
}

function HealthReportView({ dataset }) {
  const r = dataset.health_report;
  const s = r.summary;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">{dataset.filename}</h2>
          <p className="text-xs text-ink-muted">Uploaded {formatDate(dataset.uploaded_at)}</p>
        </div>
        <span className="badge bg-accent-soft text-accent capitalize">{r.problem_type}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        <StatCard label="Rows" value={s.rows} />
        <StatCard label="Columns" value={s.columns} />
        <StatCard label="Numeric" value={s.numeric_features} />
        <StatCard label="Categorical" value={s.categorical_features} />
        <StatCard label="Duplicates" value={s.duplicate_rows} />
        <StatCard label="Missing cols" value={s.missing_value_columns} />
      </div>

      <div className="card">
        <p className="text-sm"><span className="font-medium">Target column:</span> <span className="font-mono">{r.target_column}</span></p>
      </div>

      {r.issues?.length > 0 && (
        <div className="card border-l-4 border-l-danger">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Icon.AlertTriangle size={16} className="text-danger" /> Detected issues
          </h3>
          <ul className="space-y-1 text-sm text-ink-muted">
            {r.issues.map((i, idx) => <li key={idx}>· {i}</li>)}
          </ul>
        </div>
      )}

      {r.recommendations?.length > 0 && (
        <div className="card border-l-4 border-l-success">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Icon.Check size={16} className="text-success" /> Recommendations
          </h3>
          <ul className="space-y-1 text-sm text-ink-muted">
            {r.recommendations.map((i, idx) => <li key={idx}>· {i}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function UploadModal({ projectId, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!file) { setError("Choose a CSV file first."); return; }
    setBusy(true); setError("");
    try {
      const ds = await api.uploadDataset(projectId, file, target || undefined);
      onUploaded(ds);
    } catch (e) {
      setError(e.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Upload dataset"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? "Analyzing..." : "Upload & analyze"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">CSV file</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent hover:file:bg-accent/20"
          />
        </div>
        <div>
          <label className="label">Target column (optional)</label>
          <input className="input" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Defaults to the last column" />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
