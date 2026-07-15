export function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function metricKeyFor(problemType) {
  return problemType === "classification" ? "accuracy" : "r2_score";
}

export function formatMetric(value) {
  if (value === null || value === undefined) return "—";
  return typeof value === "number" ? value.toFixed(4) : String(value);
}
