/**
 * ═══════════════════════════════════════════════════════════════════════
 *  Orchestrator
 *  ─ Chains agents in the main loop:
 *    Analyze → Fix (if failed) → Commit/Push → Monitor → Repeat
 *    until tests pass or RETRY_LIMIT is reached.
 *    Generates the final results.json output.
 * ═══════════════════════════════════════════════════════════════════════
 */

import path from "path";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";

import { AnalyzerAgent } from "./analyzer.js";
import { FixerAgent } from "./fixer.js";
import { CommitterAgent } from "./committer.js";
import { MonitorAgent } from "./monitor.js";

import { createRunLogger } from "../utils/logger.js";
import { generateBranchName, parseRepoUrl } from "../utils/helpers.js";
import { computeScore, formatDuration } from "../utils/scoring.js";
import { broadcast } from "../ws/socket.js";
import { updateRun, appendLog } from "../store/runStore.js";
import { runInDocker } from "../utils/docker.js";

const RETRY_LIMIT = parseInt(process.env.RETRY_LIMIT || "5", 10);

export class Orchestrator {
  constructor(runId, { repoUrl, teamName, leaderName }) {
    this.runId = runId;
    this.repoUrl = repoUrl;
    this.teamName = teamName;
    this.leaderName = leaderName;
    this.branchName = generateBranchName(teamName, leaderName);
    this.log = createRunLogger(runId, "Orchestrator");

    // Agents
    this.analyzer = new AnalyzerAgent(runId);
    this.fixer = new FixerAgent(runId);
    this.committer = new CommitterAgent(runId);
    this.monitor = new MonitorAgent(runId);

    // Tracking
    this.startTime = Date.now();
    this.timeline = [];
    this.allFixes = [];
    this.totalCommits = 0;
    this.totalFailures = 0;
  }

  /**
   * Run the full autonomous pipeline.
   */
  async run() {
    this.log.info("═══ Starting autonomous DevOps pipeline ═══");
    this.log.info(`Repo: ${this.repoUrl}`);
    this.log.info(`Team: ${this.teamName} | Leader: ${this.leaderName}`);
    this.log.info(`Branch: ${this.branchName}`);
    this.log.info(`Retry limit: ${RETRY_LIMIT}`);

    broadcast(this.runId, {
      event: "pipeline_start",
      agent: "Orchestrator",
      message: "Autonomous pipeline started",
      data: { repoUrl: this.repoUrl, branch: this.branchName, retryLimit: RETRY_LIMIT },
    });

    const { owner, repo } = parseRepoUrl(this.repoUrl);
    let repoDir = null;
    let finalStatus = "FAILED";
    let iteration = 0;

    try {
      // ─── Initial Analysis ───────────────────────────────────────
      const analysisResult = await this.analyzer.analyze(this.repoUrl);
      repoDir = analysisResult.repoDir;

      this.addTimeline(0, analysisResult.passed ? "PASSED" : "FAILED");

      if (analysisResult.passed) {
        this.log.info("Tests passed on first run — no fixes needed!");
        finalStatus = "PASSED";
      } else {
        // ─── Fix Loop ──────────────────────────────────────────────
        let currentOutput = analysisResult.output;
        this.totalFailures++;

        for (iteration = 1; iteration <= RETRY_LIMIT; iteration++) {
          this.log.info(`═══ Iteration ${iteration}/${RETRY_LIMIT} ═══`);
          broadcast(this.runId, {
            event: "iteration_start",
            agent: "Orchestrator",
            message: `Iteration ${iteration}/${RETRY_LIMIT}`,
            data: { iteration, maxIterations: RETRY_LIMIT },
            progress: Math.round((iteration / RETRY_LIMIT) * 100),
          });

          // 1. Generate fixes from error output
          const fixes = await this.fixer.generateFixes(currentOutput, repoDir);

          if (fixes.length === 0) {
            this.log.warn("No fixes generated — cannot proceed");
            this.addTimeline(iteration, "NO_FIXES");
            break;
          }

          // 2. Apply fixes
          const appliedFixes = await this.fixer.applyFixes(fixes, repoDir);
          this.allFixes.push(...appliedFixes);

          const fixedCount = appliedFixes.filter((f) => f.status === "Fixed").length;
          if (fixedCount === 0) {
            this.log.warn("No fixes were successfully applied");
            this.addTimeline(iteration, "APPLY_FAILED");
            break;
          }

          // 3. Commit and push
          const commits = await this.committer.commitAndPush(repoDir, appliedFixes, this.branchName);
          this.totalCommits += commits;

          // 4. Re-run tests in sandbox
          const retestResult = await this.analyzer.runTests(repoDir, analysisResult.runtime);

          if (retestResult.passed) {
            this.log.info(`✓ Tests passed after iteration ${iteration}!`);
            this.addTimeline(iteration, "PASSED");
            finalStatus = "PASSED";
            break;
          } else {
            this.totalFailures++;
            currentOutput = retestResult.output;
            this.addTimeline(iteration, "FAILED");
            this.log.info(`✗ Tests still failing — ${RETRY_LIMIT - iteration} retries left`);
          }

          // 5. Monitor CI/CD (non-blocking — we continue even if CI hasn't finished)
          try {
            const ciResult = await this.monitor.monitorCI(owner, repo, this.branchName);
            if (ciResult.passed) {
              this.log.info("CI/CD reports success!");
              finalStatus = "PASSED";
              this.addTimeline(iteration, "CI_PASSED");
              break;
            }
          } catch (err) {
            this.log.warn(`CI monitoring skipped: ${err.message}`);
          }
        }
      }
    } catch (err) {
      this.log.error(`Pipeline failed with error: ${err.message}`);
      this.addTimeline(iteration, "ERROR");
      appendLog(this.runId, { agent: "Orchestrator", event: "error", message: err.message });
    }

    // ─── Generate Results ────────────────────────────────────────
    const totalTime = Date.now() - this.startTime;
    const results = this.buildResults(finalStatus, totalTime);

    // Save results to file
    await this.saveResults(results);

    // Update run store
    updateRun(this.runId, {
      status: finalStatus === "PASSED" ? "completed" : "failed",
      completedAt: new Date().toISOString(),
      result: results,
    });

    broadcast(this.runId, {
      event: "pipeline_done",
      agent: "Orchestrator",
      message: `Pipeline ${finalStatus} — Score: ${results.scoreBreakdown.total}`,
      data: results,
    });

    // ─── Cleanup ─────────────────────────────────────────────────
    if (repoDir) {
      try {
        await fs.remove(repoDir);
        this.log.info("Temp directory cleaned up");
      } catch (err) {
        this.log.warn(`Cleanup failed: ${err.message}`);
      }
    }

    this.log.info("═══ Pipeline complete ═══");
    return results;
  }

  /**
   * Add a timeline entry.
   */
  addTimeline(iteration, status) {
    this.timeline.push({
      iteration,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Build the final results.json object.
   */
  buildResults(finalStatus, totalTime) {
    const fixedCount = this.allFixes.filter((f) => f.status === "Fixed").length;
    const scoreBreakdown = computeScore({
      totalTime,
      commitCount: this.totalCommits,
      fixCount: fixedCount,
      iterationCount: this.timeline.length - 1, // exclude initial analysis
    });

    return {
      runId: this.runId,
      repoUrl: this.repoUrl,
      teamName: this.teamName,
      leaderName: this.leaderName,
      branch: this.branchName,
      totalFailures: this.totalFailures,
      totalFixes: fixedCount,
      totalCommits: this.totalCommits,
      finalStatus,
      totalTime: formatDuration(totalTime),
      totalTimeMs: totalTime,
      scoreBreakdown,
      fixes: this.allFixes.map((f) => ({
        file: f.file,
        bugType: f.bugType,
        lineNumber: f.lineNumber,
        commitMessage: f.commitMessage || `[AI-AGENT] Fix ${f.bugType} in ${f.file}`,
        description: f.description,
        status: f.status,
      })),
      timeline: this.timeline,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Save results to /results directory.
   */
  async saveResults(results) {
    const resultsDir = path.resolve("results");
    await fs.ensureDir(resultsDir);

    const filePath = path.join(resultsDir, `${this.runId}.json`);
    await fs.writeJson(filePath, results, { spaces: 2 });
    this.log.info(`Results saved to ${filePath}`);

    return filePath;
  }
}
