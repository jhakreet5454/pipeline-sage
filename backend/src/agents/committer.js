/**
 * ═══════════════════════════════════════════════════════════════════════
 *  Committer Agent
 *  ─ Creates a new branch, commits all applied fixes with [AI-AGENT]
 *    prefix, and pushes to the remote repository.
 * ═══════════════════════════════════════════════════════════════════════
 */

import simpleGit from "simple-git";
import { createRunLogger } from "../utils/logger.js";
import { broadcast } from "../ws/socket.js";
import { appendLog } from "../store/runStore.js";

export class CommitterAgent {
  constructor(runId) {
    this.runId = runId;
    this.log = createRunLogger(runId, "Committer");
  }

  /**
   * Create or checkout the target branch.
   */
  async ensureBranch(repoDir, branchName) {
    const git = simpleGit(repoDir);

    // Check if branch already exists locally
    const branches = await git.branchLocal();
    if (branches.all.includes(branchName)) {
      await git.checkout(branchName);
      this.log.info(`Checked out existing branch: ${branchName}`);
    } else {
      await git.checkoutLocalBranch(branchName);
      this.log.info(`Created new branch: ${branchName}`);
    }

    broadcast(this.runId, {
      event: "branch_ready",
      agent: "Committer",
      message: `Branch ready: ${branchName}`,
    });

    return branchName;
  }

  /**
   * Commit all applied fixes with [AI-AGENT] prefix messages.
   * Groups fixes by file for cleaner commit history.
   */
  async commitFixes(repoDir, fixes, branchName) {
    const git = simpleGit(repoDir);
    let commitCount = 0;

    // Configure git user for commits
    await git.addConfig("user.email", "healflow-ai@agent.bot");
    await git.addConfig("user.name", "HealFlow AI Agent");

    const fixedItems = fixes.filter((f) => f.status === "Fixed");

    if (fixedItems.length === 0) {
      this.log.warn("No fixes to commit");
      return 0;
    }

    // Group fixes by file for cleaner commits
    const byFile = {};
    for (const fix of fixedItems) {
      if (!byFile[fix.file]) byFile[fix.file] = [];
      byFile[fix.file].push(fix);
    }

    for (const [file, fileFixes] of Object.entries(byFile)) {
      try {
        await git.add(file);

        // Build commit message
        const details = fileFixes
          .map((f) => `${f.bugType} error in ${f.file} line ${f.lineNumber || "?"} → ${f.description || "fix applied"}`)
          .join("; ");
        const message = `[AI-AGENT] Fix ${details}`;

        await git.commit(message);
        commitCount++;
        this.log.info(`Committed: ${message.slice(0, 100)}...`);

        broadcast(this.runId, {
          event: "committed",
          agent: "Committer",
          message: `Committed fix for ${file}`,
          data: { file, fixes: fileFixes.length },
        });
      } catch (err) {
        this.log.error(`Failed to commit ${file}: ${err.message}`);
      }
    }

    appendLog(this.runId, { agent: "Committer", event: "commits_done", commitCount });
    return commitCount;
  }

  /**
   * Push the branch to the remote.
   */
  async pushBranch(repoDir, branchName) {
    const git = simpleGit(repoDir);
    const token = process.env.GITHUB_TOKEN;

    try {
      // Ensure remote URL has token for auth
      if (token) {
        const remotes = await git.getRemotes(true);
        const origin = remotes.find((r) => r.name === "origin");
        if (origin && !origin.refs.push.includes(token)) {
          const authedUrl = origin.refs.push.replace("https://", `https://${token}@`);
          await git.remote(["set-url", "origin", authedUrl]);
        }
      }

      await git.push("origin", branchName, ["--set-upstream", "--force"]);
      this.log.info(`✓ Pushed branch ${branchName} to remote`);

      broadcast(this.runId, {
        event: "pushed",
        agent: "Committer",
        message: `Pushed ${branchName} to GitHub`,
      });
    } catch (err) {
      this.log.error(`Push failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Full commit pipeline: branch → commit → push.
   */
  async commitAndPush(repoDir, fixes, branchName) {
    await this.ensureBranch(repoDir, branchName);
    const commitCount = await this.commitFixes(repoDir, fixes, branchName);
    if (commitCount > 0) {
      await this.pushBranch(repoDir, branchName);
    }
    return commitCount;
  }
}
