import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { Icon } from "../components/Icon.jsx";
import { Modal, ConfirmModal } from "../components/Modal.jsx";
import { DropdownMenu } from "../components/DropdownMenu.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { formatDate } from "../lib/format.js";
import { useToast } from "../context/ToastContext.jsx";

export function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      setProjects(await api.listProjects());
    } catch (e) {
      toast.error(e.message || "Could not reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const doRename = async (name, description) => {
    setBusy(true);
    try {
      const updated = await api.updateProject(renameTarget.id, { name, description });
      setProjects((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
      toast.success("Project renamed.");
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
      await api.deleteProject(deleteTarget.id);
      setProjects((ps) => ps.filter((p) => p.id !== deleteTarget.id));
      toast.success(`Project "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e.message || "Could not delete this project.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-8 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-hover font-mono text-xs font-bold text-white shadow">
            FM
          </div>
          <span className="text-sm font-semibold">ForgeML</span>
          <span className="text-sm text-ink-muted">— Lightweight ML Engineering Workspace</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Projects</h1>
            <p className="mt-1 text-sm text-ink-muted">Each project holds its own datasets, experiments, and deployed model.</p>
          </div>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Icon.Plus size={16} /> New project
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-black/5" />)}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={Icon.Layers}
            title="No projects yet"
            description="Create a project to upload a dataset, train models, and track experiments."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="card cursor-pointer text-left transition-shadow hover:shadow-[0_4px_16px_rgba(32,29,26,0.1)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-ink">{p.name}</h3>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {p.active_experiment_id && (
                      <span className="badge bg-success-soft text-success">deployed</span>
                    )}
                    <DropdownMenu
                      items={[
                        { label: "Rename", onClick: () => setRenameTarget(p) },
                        { label: "Delete", danger: true, onClick: () => setDeleteTarget(p) },
                      ]}
                    />
                  </div>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{p.description || "No description"}</p>
                <p className="mt-4 text-xs text-ink-muted">Created {formatDate(p.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => { setShowCreate(false); navigate(`/projects/${p.id}`); }}
        />
      )}

      {renameTarget && (
        <RenameProjectModal
          project={renameTarget}
          busy={busy}
          onCancel={() => setRenameTarget(null)}
          onSubmit={doRename}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete project"
          message={`Delete "${deleteTarget.name}" and everything in it — datasets, experiments, and deployment history? This can't be undone.`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={doDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function CreateProjectModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const submit = async () => {
    if (!name.trim()) { setError("Project name is required."); return; }
    setBusy(true); setError("");
    try {
      const p = await api.createProject({ name: name.trim(), description });
      toast.success(`Project "${p.name}" created.`);
      onCreated(p);
    } catch (e) {
      setError(e.message || "Could not create project.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="New project"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? "Creating..." : "Create project"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">Project name</label>
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Customer Churn" onKeyDown={(e) => e.key === "Enter" && submit()} />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project for?" />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

function RenameProjectModal({ project, busy, onCancel, onSubmit }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) { setError("Project name is required."); return; }
    onSubmit(name.trim(), description);
  };

  return (
    <Modal
      title="Rename project"
      onClose={onCancel}
      footer={
        <>
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">Project name</label>
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
