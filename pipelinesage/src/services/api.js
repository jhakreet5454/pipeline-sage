/**
 * API Service — connects the React frontend to the Express backend.
 * Handles REST calls and WebSocket for real-time updates.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3000";

/* ─── REST helpers ──────────────────────────────────────────────────── */

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.messages?.join(", ") || "Request failed");
  }

  return res.json();
}

/**
 * POST /api/run-agent — Start the autonomous agent.
 * @returns {{ status, runId, branch, message }}
 */
export async function startAgent({ repoUrl, teamName, leaderName }) {
  return request("/run-agent", {
    method: "POST",
    body: JSON.stringify({ repoUrl, teamName, leaderName }),
  });
}

/**
 * GET /api/results/:runId — Poll for status and results.
 * @returns {{ status, runId, result? }}
 */
export async function getResults(runId) {
  return request(`/results/${runId}`);
}

/**
 * GET /api/runs — List all runs.
 */
export async function listRuns() {
  return request("/runs");
}

/**
 * GET /api/health — Check backend health.
 */
export async function checkHealth() {
  return request("/health");
}

/* ─── WebSocket ─────────────────────────────────────────────────────── */

/**
 * Connect to the WebSocket for real-time progress events.
 *
 * @param {string}   runId      - The run to filter events for
 * @param {function} onMessage  - Callback: (event) => void
 * @param {function} [onError]  - Callback: (error) => void
 * @returns {function} disconnect — call to close the socket
 */
export function connectWebSocket(runId, onMessage, onError) {
  let ws;
  try {
    ws = new WebSocket(WS_URL);
  } catch (err) {
    onError?.(err);
    return () => {};
  }

  ws.onopen = () => {
    console.log("[WS] Connected");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      // Only forward events for our run
      if (data.runId === runId) {
        onMessage(data);
      }
    } catch {
      // ignore non-JSON messages
    }
  };

  ws.onerror = (err) => {
    console.error("[WS] Error:", err);
    onError?.(err);
  };

  ws.onclose = () => {
    console.log("[WS] Disconnected");
  };

  return () => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  };
}

/* ─── Data Transform ────────────────────────────────────────────────── */

/**
 * Transform the backend result into the shape the frontend components expect.
 * This bridges the gap between backend field names and component props.
 */
export function transformResult(apiResult) {
  const r = apiResult;
  const sb = r.scoreBreakdown || {};

  return {
    // Summary card fields
    repoUrl: r.repoUrl,
    teamName: r.teamName,
    leaderName: r.leaderName,
    branchName: r.branch,
    totalFailures: r.totalFailures,
    totalFixes: r.totalFixes,
    cicdStatus: r.finalStatus,                  // "PASSED" or "FAILED"
    timeTaken: r.totalTime,                      // "4m 32s"
    timeTakenMinutes: (r.totalTimeMs || 0) / 60000,

    // Score breakdown fields
    baseScore: sb.base ?? 100,
    speedBonus: sb.speedBonus ?? 0,
    efficiencyPenalty: Math.abs(sb.commitPenalty ?? 0),
    fixBonus: sb.fixBonus ?? 0,
    iterationPenalty: Math.abs(sb.iterationPenalty ?? 0),
    finalScore: sb.total ?? 0,
    commitsUsed: r.totalCommits ?? 0,

    // Fixes table
    fixes: (r.fixes || []).map((f) => ({
      file: f.file,
      bugType: f.bugType,
      line: f.lineNumber,
      commitMessage: f.commitMessage,
      status: f.status === "Fixed" ? "PASSED" : "FAILED",
    })),

    // CI/CD Timeline
    cicdTimeline: (r.timeline || []).map((t, i) => ({
      iteration: t.iteration,
      total: r.timeline.length,
      status: t.status,
      timestamp: new Date(t.timestamp).toLocaleString(),
      message: t.status === "PASSED"
        ? "All tests passed — CI/CD green ✓"
        : t.status === "FAILED"
          ? `Iteration ${t.iteration} — tests failed`
          : `Status: ${t.status}`,
    })),
  };
}
