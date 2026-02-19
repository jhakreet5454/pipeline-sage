/**
 * ═══════════════════════════════════════════════════════════════════════
 *  Agent API Routes
 *  ─ POST /api/run-agent   — Start a new autonomous run
 *  ─ GET  /api/results/:id — Poll run status & results
 *  ─ GET  /api/runs        — List all runs
 *  ─ GET  /api/health      — Health check (handled in index.js)
 * ═══════════════════════════════════════════════════════════════════════
 */

import { Router } from "express";
import { v4 as uuidv4 } from "uuid";

import { Orchestrator } from "../agents/orchestrator.js";
import { generateBranchName, parseRepoUrl } from "../utils/helpers.js";
import { logger } from "../utils/logger.js";
import { createRun, getRun, getAllRuns, updateRun } from "../store/runStore.js";
import { checkDockerHealth } from "../utils/docker.js";

const router = Router();

/* ────────────────────────────────────────────────────────────────────
 *  POST /api/run-agent
 *  Body: { repoUrl, teamName, leaderName }
 *  Returns: { status: 'running', runId, branch }
 * ──────────────────────────────────────────────────────────────────── */
router.post("/run-agent", async (req, res, next) => {
  try {
    const { repoUrl, teamName, leaderName } = req.body;

    // ─── Validation ────────────────────────────────────────────
    const errors = [];
    if (!repoUrl || typeof repoUrl !== "string") errors.push("repoUrl is required");
    if (!teamName || typeof teamName !== "string") errors.push("teamName is required");
    if (!leaderName || typeof leaderName !== "string") errors.push("leaderName is required");

    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation Error", messages: errors });
    }

    // Validate GitHub URL format
    try {
      parseRepoUrl(repoUrl);
    } catch {
      return res.status(400).json({
        error: "Invalid Repository URL",
        message: "URL must be a valid GitHub repository (https://github.com/owner/repo)",
      });
    }

    // ─── Generate branch name ──────────────────────────────────
    const branch = generateBranchName(teamName, leaderName);
    const runId = uuidv4();

    // ─── Create run record ─────────────────────────────────────
    createRun(runId, { repoUrl, teamName, leaderName, branch });
    logger.info(`New run created: ${runId} for ${repoUrl} → branch: ${branch}`);

    // ─── Fire and forget — run pipeline asynchronously ─────────
    const orchestrator = new Orchestrator(runId, { repoUrl, teamName, leaderName });
    orchestrator.run().catch((err) => {
      logger.error(`Run ${runId} failed catastrophically: ${err.message}`);
      updateRun(runId, {
        status: "error",
        completedAt: new Date().toISOString(),
        result: { error: err.message },
      });
    });

    // ─── Respond immediately ───────────────────────────────────
    res.status(202).json({
      status: "running",
      runId,
      branch,
      message: `Agent started for ${repoUrl}. Poll GET /api/results/${runId} for updates.`,
    });
  } catch (err) {
    next(err);
  }
});

/* ────────────────────────────────────────────────────────────────────
 *  GET /api/results/:runId
 *  Returns run status and results when complete.
 * ──────────────────────────────────────────────────────────────────── */
router.get("/results/:runId", (req, res) => {
  const run = getRun(req.params.runId);

  if (!run) {
    return res.status(404).json({ error: "Not Found", message: "Run ID not found" });
  }

  if (run.status === "running") {
    return res.json({
      status: "processing",
      runId: run.runId,
      startedAt: run.startedAt,
      logs: run.logs.slice(-20), // return last 20 log entries
    });
  }

  // Completed — return full results
  res.json({
    status: run.status,
    runId: run.runId,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    result: run.result,
  });
});

/* ────────────────────────────────────────────────────────────────────
 *  GET /api/runs
 *  Returns summary of all runs.
 * ──────────────────────────────────────────────────────────────────── */
router.get("/runs", (_req, res) => {
  res.json({ runs: getAllRuns() });
});

/* ────────────────────────────────────────────────────────────────────
 *  GET /api/docker-status
 *  Check if Docker daemon is available.
 * ──────────────────────────────────────────────────────────────────── */
router.get("/docker-status", async (_req, res) => {
  const health = await checkDockerHealth();
  res.json(health);
});

export default router;
