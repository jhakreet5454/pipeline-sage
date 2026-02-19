/**
 * ═══════════════════════════════════════════════════════════════════════
 *  Monitor Agent
 *  ─ Uses Octokit (GitHub API) to trigger CI/CD workflows, poll their
 *    status until completion, and report results.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { Octokit } from "@octokit/rest";
import { createRunLogger } from "../utils/logger.js";
import { broadcast } from "../ws/socket.js";
import { appendLog } from "../store/runStore.js";

export class MonitorAgent {
  constructor(runId) {
    this.runId = runId;
    this.log = createRunLogger(runId, "Monitor");
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }

  /**
   * Trigger a CI/CD workflow on the given branch.
   * Attempts to dispatch the default workflow or find an existing one.
   */
  async triggerWorkflow(owner, repo, branch) {
    this.log.info(`Checking for workflows in ${owner}/${repo}`);
    broadcast(this.runId, {
      event: "ci_trigger_start",
      agent: "Monitor",
      message: "Looking for CI/CD workflows...",
    });

    try {
      // List available workflows
      const { data: { workflows } } = await this.octokit.actions.listRepoWorkflows({
        owner,
        repo,
      });

      if (workflows.length === 0) {
        this.log.warn("No workflows found in repository");
        return { triggered: false, reason: "No workflows configured" };
      }

      // Find the first active workflow
      const activeWorkflow = workflows.find((w) => w.state === "active") || workflows[0];
      this.log.info(`Found workflow: ${activeWorkflow.name} (${activeWorkflow.path})`);

      // Try to dispatch workflow
      try {
        await this.octokit.actions.createWorkflowDispatch({
          owner,
          repo,
          workflow_id: activeWorkflow.id,
          ref: branch,
        });
        this.log.info(`Dispatched workflow "${activeWorkflow.name}" on branch ${branch}`);
      } catch (dispatchErr) {
        this.log.warn(`Dispatch failed (may not support dispatch): ${dispatchErr.message}`);
        this.log.info("Waiting for auto-triggered workflow run instead...");
      }

      broadcast(this.runId, {
        event: "ci_triggered",
        agent: "Monitor",
        message: `Triggered ${activeWorkflow.name}`,
        data: { workflow: activeWorkflow.name },
      });

      return { triggered: true, workflowId: activeWorkflow.id, workflowName: activeWorkflow.name };
    } catch (err) {
      this.log.error(`Failed to trigger workflow: ${err.message}`);
      return { triggered: false, reason: err.message };
    }
  }

  /**
   * Poll the latest workflow run on a branch until it completes.
   */
  async pollWorkflowStatus(owner, repo, branch, timeoutMs = 300_000) {
    this.log.info(`Polling CI/CD status on branch ${branch} (timeout: ${timeoutMs / 1000}s)`);
    broadcast(this.runId, { event: "ci_poll_start", agent: "Monitor", message: "Monitoring CI/CD pipeline..." });

    const startTime = Date.now();
    const pollInterval = 10_000; // 10 seconds

    // Wait a bit for the run to appear
    await sleep(5000);

    while (Date.now() - startTime < timeoutMs) {
      try {
        const { data: { workflow_runs: runs } } = await this.octokit.actions.listWorkflowRunsForRepo({
          owner,
          repo,
          branch,
          per_page: 1,
          sort: "created",
          direction: "desc",
        });

        if (runs.length === 0) {
          this.log.info("No workflow runs found yet, waiting...");
          await sleep(pollInterval);
          continue;
        }

        const latestRun = runs[0];
        const { status, conclusion, html_url, id } = latestRun;

        this.log.info(`Run #${id}: status=${status}, conclusion=${conclusion || "pending"}`);

        broadcast(this.runId, {
          event: "ci_status",
          agent: "Monitor",
          message: `Pipeline: ${status}${conclusion ? ` — ${conclusion}` : ""}`,
          data: { status, conclusion, url: html_url },
        });

        if (status === "completed") {
          const passed = conclusion === "success";
          this.log.info(`CI/CD completed: ${conclusion} ${passed ? "✓" : "✗"}`);
          appendLog(this.runId, { agent: "Monitor", event: "ci_done", conclusion, url: html_url });

          return {
            passed,
            conclusion,
            url: html_url,
            runId: id,
          };
        }

        await sleep(pollInterval);
      } catch (err) {
        this.log.error(`Polling error: ${err.message}`);
        await sleep(pollInterval);
      }
    }

    this.log.warn("CI/CD polling timed out");
    return { passed: false, conclusion: "timeout", url: null, runId: null };
  }

  /**
   * Full monitor pipeline: trigger → poll → return result.
   */
  async monitorCI(owner, repo, branch) {
    const triggerResult = await this.triggerWorkflow(owner, repo, branch);

    if (!triggerResult.triggered) {
      this.log.warn(`Workflow not triggered: ${triggerResult.reason}. Assuming sandbox tests are primary.`);
      return { passed: null, conclusion: "no_ci", url: null };
    }

    return await this.pollWorkflowStatus(owner, repo, branch);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
