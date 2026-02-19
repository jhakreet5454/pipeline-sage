/**
 * In-memory run store.
 * In production you'd swap this for Redis or a DB.
 */
const runs = new Map();

export function createRun(runId, meta) {
  const run = {
    runId,
    status: "running",
    startedAt: new Date().toISOString(),
    completedAt: null,
    meta,                // { repoUrl, teamName, leaderName, branch }
    logs: [],            // timestamped log entries
    result: null,        // final results.json payload
  };
  runs.set(runId, run);
  return run;
}

export function getRun(runId) {
  return runs.get(runId) || null;
}

export function updateRun(runId, updates) {
  const run = runs.get(runId);
  if (!run) return null;
  Object.assign(run, updates);
  return run;
}

export function appendLog(runId, entry) {
  const run = runs.get(runId);
  if (run) {
    run.logs.push({ timestamp: new Date().toISOString(), ...entry });
  }
}

export function getAllRuns() {
  return [...runs.values()].map(({ runId, status, startedAt, completedAt, meta }) => ({
    runId, status, startedAt, completedAt, ...meta,
  }));
}
