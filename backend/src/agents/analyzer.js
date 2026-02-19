/**
 * ═══════════════════════════════════════════════════════════════════════
 *  Analyzer Agent
 *  ─ Clones the repo, detects language, discovers tests, runs them
 *    inside a Docker sandbox, and returns structured error output.
 * ═══════════════════════════════════════════════════════════════════════
 */

import path from "path";
import fs from "fs-extra";
import simpleGit from "simple-git";
import { createRunLogger } from "../utils/logger.js";
import { detectLanguage, getRuntime } from "../utils/helpers.js";
import { runInDocker } from "../utils/docker.js";
import { broadcast } from "../ws/socket.js";
import { appendLog } from "../store/runStore.js";

export class AnalyzerAgent {
  constructor(runId) {
    this.runId = runId;
    this.log = createRunLogger(runId, "Analyzer");
  }

  /**
   * Clone repository into a temporary directory.
   * @returns {string} Path to cloned repo
   */
  async cloneRepo(repoUrl, branch = "main") {
    const tmpDir = path.resolve("tmp", this.runId);
    await fs.ensureDir(tmpDir);

    this.log.info(`Cloning ${repoUrl} into ${tmpDir}`);
    broadcast(this.runId, { event: "clone_start", agent: "Analyzer", message: `Cloning ${repoUrl}...` });

    const git = simpleGit();
    const token = process.env.GITHUB_TOKEN;

    // Inject token for private repos
    let cloneUrl = repoUrl;
    if (token && repoUrl.startsWith("https://")) {
      cloneUrl = repoUrl.replace("https://", `https://${token}@`);
    }

    try {
      await git.clone(cloneUrl, tmpDir, ["--depth", "1"]);
    } catch (err) {
      // If shallow clone fails (some repos), try full clone
      this.log.warn(`Shallow clone failed, trying full clone: ${err.message}`);
      await fs.emptyDir(tmpDir);
      await git.clone(cloneUrl, tmpDir);
    }

    this.log.info("Clone complete");
    broadcast(this.runId, { event: "clone_done", agent: "Analyzer", message: "Repository cloned successfully" });
    appendLog(this.runId, { agent: "Analyzer", event: "clone_done" });

    return tmpDir;
  }

  /**
   * Detect the project language and test configuration.
   */
  async detectProject(repoDir) {
    const files = await fs.readdir(repoDir);
    const language = detectLanguage(files);
    const runtime = getRuntime(language);

    this.log.info(`Detected language: ${language} → image: ${runtime.image}`);
    broadcast(this.runId, {
      event: "detect_done",
      agent: "Analyzer",
      message: `Detected ${language} project`,
      data: { language, runtime },
    });

    return { language, runtime, files };
  }

  /**
   * Discover test files in the repository.
   */
  async discoverTests(repoDir, language) {
    const testPatterns = {
      node: /\.(test|spec)\.(js|ts|jsx|tsx|mjs)$/i,
      python: /(test_.*\.py|.*_test\.py|tests\.py)$/i,
      go: /_test\.go$/i,
      rust: /tests?\.rs$/i,
      java: /Test\.java$/i,
    };

    const pattern = testPatterns[language] || testPatterns.node;
    const testFiles = [];

    const walk = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "__pycache__") continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (pattern.test(entry.name)) {
          testFiles.push(path.relative(repoDir, fullPath));
        }
      }
    };

    await walk(repoDir);
    this.log.info(`Found ${testFiles.length} test file(s): ${testFiles.join(", ") || "none"}`);
    broadcast(this.runId, {
      event: "tests_discovered",
      agent: "Analyzer",
      message: `Found ${testFiles.length} test file(s)`,
      data: { testFiles },
    });

    return testFiles;
  }

  /**
   * Run tests inside a Docker container and capture output.
   */
  async runTests(repoDir, runtime) {
    this.log.info(`Running tests with: ${runtime.testCmd}`);
    broadcast(this.runId, { event: "tests_start", agent: "Analyzer", message: `Running: ${runtime.testCmd}` });

    const commands = [runtime.installCmd, runtime.testCmd].filter(Boolean);
    const fullCmd = commands.join(" && ");

    const { exitCode, stdout, stderr } = await runInDocker({
      image: runtime.image,
      repoDir,
      cmd: fullCmd,
      runId: this.runId,
    });

    const passed = exitCode === 0;
    const output = `${stdout}\n${stderr}`.trim();

    this.log.info(`Tests ${passed ? "PASSED ✓" : "FAILED ✗"} (exit code: ${exitCode})`);
    broadcast(this.runId, {
      event: "tests_done",
      agent: "Analyzer",
      message: passed ? "All tests passed ✓" : "Tests failed — issues detected",
      data: { passed, exitCode },
    });
    appendLog(this.runId, { agent: "Analyzer", event: "tests_done", passed, exitCode });

    return { passed, exitCode, output };
  }

  /**
   * Full analysis pipeline: clone → detect → discover → run tests.
   */
  async analyze(repoUrl) {
    const repoDir = await this.cloneRepo(repoUrl);
    const { language, runtime } = await this.detectProject(repoDir);
    const testFiles = await this.discoverTests(repoDir, language);

    if (testFiles.length === 0) {
      this.log.warn("No test files found — attempting to run default test command anyway");
    }

    const testResult = await this.runTests(repoDir, runtime);

    return {
      repoDir,
      language,
      runtime,
      testFiles,
      ...testResult,
    };
  }
}
