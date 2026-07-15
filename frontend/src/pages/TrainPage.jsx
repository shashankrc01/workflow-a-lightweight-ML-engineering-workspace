import { useEffect, useState } from "react";
import { useOutletContext, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Icon } from "../components/Icon.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { useToast } from "../context/ToastContext.jsx";

export function TrainPage() {
  const { project, datasets, algorithms, refreshExperiments } = useOutletContext();
  const navigate = useNavigate();
  const toast = useToast();

  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? "");
  const [algorithm, setAlgorithm] = useState("");
  const [missingStrategy, setMissingStrategy] = useState("mean");
  const [encoding, setEncoding] = useState("onehot");
  const [scaling, setScaling] = useState("standard");
  const [testSize, setTestSize] = useState(0.2);
  const [cvFolds, setCvFolds] = useState(0);
  const [hyperparams, setHyperparams] = useState("{}");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const dataset = datasets.find((d) => d.id === Number(datasetId));
  const problemType = dataset?.health_report?.problem_type;
  const options = (problemType && algorithms[problemType]) || [];

  useEffect(() => {
    setAlgorithm("");
  }, [problemType]);

  if (datasets.length === 0) {
    return (
      <>
        <PageHeader project={project} page="Train" title="Train a model" description="Configure preprocessing, pick an algorithm, and launch a run." />
        <EmptyState
          icon={Icon.Database}
          title="No dataset available yet"
          description="Upload a dataset first — training needs a Dataset Health Report to know the target column and problem type."
          action={<Link to="../datasets" relative="path" className="btn-primary"><Icon.Upload size={16} /> Go to Datasets</Link>}
        />
      </>
    );
  }

  const submit = async () => {
    if (!algorithm) { setError("Choose an algorithm."); return; }
    let hp = {};
    try { hp = JSON.parse(hyperparams || "{}"); } catch { setError("Hyperparameters must be valid JSON."); return; }

    setBusy(true); setError("");
    try {
      const payload = {
        dataset_id: dataset.id,
        algorithm,
        hyperparameters: hp,
        notes,
        preprocessing: {
          target_column: dataset.health_report.target_column,
          missing_value_strategy: missingStrategy,
          categorical_encoding: encoding,
          scaling,
          test_size: parseFloat(testSize),
          cv_folds: parseInt(cvFolds) || 0,
          random_state: 42,
        },
      };
      const exp = await api.train(project.id, payload);
      await refreshExperiments();
      toast.success(`Training run completed — ${algorithm} finished successfully.`);
      navigate("../experiments", { relative: "path" });
    } catch (e) {
      setError(e.message || "Training failed.");
      toast.error("Training run failed. See details below.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader project={project} page="Train" title="Train a model" description="Configure preprocessing, pick an algorithm, and launch a run." />

      <div className="card max-w-2xl space-y-5">
        <div>
          <label className="label">Dataset</label>
          <select className="input" value={datasetId} onChange={(e) => setDatasetId(e.target.value)}>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>v{d.version} — {d.filename} ({d.health_report.problem_type})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Algorithm</label>
            <select className="input" value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
              <option value="">Select an algorithm...</option>
              {options.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Missing values</label>
            <select className="input" value={missingStrategy} onChange={(e) => setMissingStrategy(e.target.value)}>
              <option value="mean">Mean imputation</option>
              <option value="median">Median imputation</option>
              <option value="most_frequent">Most frequent</option>
              <option value="drop_rows">Drop rows</option>
            </select>
          </div>
          <div>
            <label className="label">Categorical encoding</label>
            <select className="input" value={encoding} onChange={(e) => setEncoding(e.target.value)}>
              <option value="onehot">One-hot</option>
              <option value="ordinal">Ordinal</option>
              <option value="none">None</option>
            </select>
          </div>
          <div>
            <label className="label">Feature scaling</label>
            <select className="input" value={scaling} onChange={(e) => setScaling(e.target.value)}>
              <option value="standard">Standardization</option>
              <option value="minmax">Min-max</option>
              <option value="none">None</option>
            </select>
          </div>
          <div>
            <label className="label">Test size</label>
            <input type="number" step="0.05" min="0.1" max="0.5" className="input" value={testSize} onChange={(e) => setTestSize(e.target.value)} />
          </div>
          <div>
            <label className="label">Cross-validation folds (0 = off)</label>
            <input type="number" min="0" max="10" className="input" value={cvFolds} onChange={(e) => setCvFolds(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Hyperparameters (JSON)</label>
          <textarea className="input font-mono text-xs" rows={3} value={hyperparams} onChange={(e) => setHyperparams(e.target.value)} />
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What are you testing with this run?" />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? "Training..." : <><Icon.Play size={16} /> Launch training run</>}
          </button>
        </div>
      </div>
    </>
  );
}
