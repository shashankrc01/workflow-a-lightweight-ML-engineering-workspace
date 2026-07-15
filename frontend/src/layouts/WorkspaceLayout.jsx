import { useCallback, useEffect, useState } from "react";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "../components/Sidebar.jsx";
import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";

export function WorkspaceLayout() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [project, setProject] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [algorithms, setAlgorithms] = useState({ classification: [], regression: [] });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const refreshProject = useCallback(async () => {
    try {
      const p = await api.getProject(projectId);
      setProject(p);
    } catch {
      setNotFound(true);
    }
  }, [projectId]);

  const refreshDatasets = useCallback(async () => {
    setDatasets(await api.listDatasets(projectId));
  }, [projectId]);

  const refreshExperiments = useCallback(async () => {
    setExperiments(await api.listExperiments(projectId));
  }, [projectId]);

  const refreshDeployments = useCallback(async () => {
    setDeployments(await api.listDeployments(projectId));
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const [p, ds, exps, deps, algos] = await Promise.all([
          api.getProject(projectId),
          api.listDatasets(projectId),
          api.listExperiments(projectId),
          api.listDeployments(projectId),
          api.listAlgorithms(),
        ]);
        if (cancelled) return;
        setProject(p);
        setDatasets(ds);
        setExperiments(exps);
        setDeployments(deps);
        setAlgorithms(algos);
      } catch (e) {
        if (!cancelled) {
          setNotFound(true);
          toast.error(e.message || "Could not load this project.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (notFound) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <p className="text-lg font-semibold">Project not found</p>
          <p className="mt-1 text-sm text-ink-muted">It may have been deleted, or the backend isn't running.</p>
          <button className="btn-primary mt-4" onClick={() => navigate("/")}>Back to projects</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar project={project} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-8">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <Outlet
              context={{
                project,
                datasets,
                experiments,
                deployments,
                algorithms,
                refreshProject,
                refreshDatasets,
                refreshExperiments,
                refreshDeployments,
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-48 rounded bg-black/5" />
      <div className="h-32 rounded-xl bg-black/5" />
      <div className="h-32 rounded-xl bg-black/5" />
    </div>
  );
}
