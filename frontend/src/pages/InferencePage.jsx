import { useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Icon } from "../components/Icon.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { useToast } from "../context/ToastContext.jsx";

export function InferencePage() {
  const { project, deployments, datasets } = useOutletContext();
  const active = deployments.find((d) => d.status === "active");
  const toast = useToast();

  const exampleDataset = datasets[0];
  const placeholder = exampleDataset
    ? JSON.stringify(
        [buildExampleRecord(exampleDataset.health_report)],
        null,
        2
      )
    : '[{"feature1": 0}]';

  const [input, setInput] = useState(placeholder);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setError(""); setResult(null);
    let records;
    try {
      records = JSON.parse(input);
      if (!Array.isArray(records)) throw new Error("Input must be a JSON array of records.");
    } catch (e) {
      setError(e.message || "Invalid JSON.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.predict(project.id, records);
      setResult(res);
      toast.success("Prediction complete.");
    } catch (e) {
      setError(e.message || "Inference failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader project={project} page="Inference" title="Inference tester" description="Send records to the active deployed model and see predictions." />

      {!active ? (
        <EmptyState
          icon={Icon.Send}
          title="No model deployed"
          description="Promote a completed experiment before you can run inference."
          action={<Link to="../deployments" relative="path" className="btn-primary"><Icon.Rocket size={16} /> Go to Deployments</Link>}
        />
      ) : (
        <div className="card max-w-2xl space-y-4">
          <p className="text-sm text-ink-muted">
            Serving experiment <span className="font-mono font-medium text-ink">#{active.experiment_id}</span>.
            Records should include the same feature columns used at training time (excluding the target).
          </p>
          <div>
            <label className="label">Input records (JSON array)</label>
            <textarea className="input font-mono text-xs" rows={8} value={input} onChange={(e) => setInput(e.target.value)} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end">
            <button className="btn-secondary" onClick={run} disabled={busy}>
              {busy ? "Running..." : <><Icon.Send size={16} /> Run prediction</>}
            </button>
          </div>
          {result && (
            <div>
              <label className="label">Result</label>
              <pre className="rounded-lg border border-border bg-black/[0.02] p-3 text-xs font-mono">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function buildExampleRecord(report) {
  const record = {};
  for (const col of report.numeric_columns || []) record[col] = 0;
  for (const col of report.categorical_columns || []) record[col] = "example";
  return record;
}
