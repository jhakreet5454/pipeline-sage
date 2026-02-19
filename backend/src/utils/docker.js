/**
 * ═══════════════════════════════════════════════════════════════════════
 *  Docker Utility
 *  ─ Runs commands inside Docker containers for sandboxed execution.
 *    Falls back to native child_process when Docker is unavailable.
 * ═══════════════════════════════════════════════════════════════════════
 */

import Docker from "dockerode";
import path from "path";
import { exec } from "child_process";
import { createRunLogger } from "./logger.js";

const docker = new Docker({
  socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock",
});

/** Cache Docker availability check */
let _dockerAvailable = null;

/**
 * Check if Docker is available and running.
 */
export async function checkDockerHealth() {
  try {
    const info = await docker.info();
    _dockerAvailable = true;
    return { available: true, version: info.ServerVersion, containers: info.Containers };
  } catch (err) {
    _dockerAvailable = false;
    return { available: false, error: err.message };
  }
}

/**
 * Run a command — tries Docker first, falls back to native execution.
 */
export async function runInDocker({ image, repoDir, cmd, runId, timeout = 120_000 }) {
  // Check Docker availability (cached after first check)
  if (_dockerAvailable === null) {
    await checkDockerHealth();
  }

  if (_dockerAvailable) {
    return _runInDockerContainer({ image, repoDir, cmd, runId, timeout });
  } else {
    return _runNative({ repoDir, cmd, runId, timeout });
  }
}

/* ─── Native fallback (child_process) ──────────────────────────────── */

function _runNative({ repoDir, cmd, runId, timeout }) {
  const log = createRunLogger(runId, "NativeExec");
  const absRepoDir = path.resolve(repoDir);

  log.info(`Docker unavailable — running natively: sh -c "${cmd}"`);

  return new Promise((resolve) => {
    const child = exec(cmd, {
      cwd: absRepoDir,
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      env: { ...process.env, CI: "true" },
    }, (error, stdout, stderr) => {
      const exitCode = error ? (error.code || 1) : 0;
      log.info(`Native exec finished — exit code: ${exitCode}`);

      // Truncate extremely long outputs
      const MAX_OUTPUT = 50_000;
      resolve({
        exitCode,
        stdout: stdout?.slice(-MAX_OUTPUT) || "",
        stderr: stderr?.slice(-MAX_OUTPUT) || "",
      });
    });
  });
}

/* ─── Docker execution ─────────────────────────────────────────────── */

async function _runInDockerContainer({ image, repoDir, cmd, runId, timeout }) {
  const log = createRunLogger(runId, "Docker");
  const absRepoDir = path.resolve(repoDir);

  // Ensure the image is available
  log.info(`Ensuring image ${image} is available...`);
  try {
    await docker.getImage(image).inspect();
    log.info(`Image ${image} found locally`);
  } catch {
    log.info(`Pulling image ${image}...`);
    await pullImage(image);
    log.info(`Image ${image} pulled successfully`);
  }

  // Create container
  log.info(`Creating container with cmd: sh -c "${cmd}"`);
  const container = await docker.createContainer({
    Image: image,
    Cmd: ["sh", "-c", cmd],
    WorkingDir: "/workspace",
    HostConfig: {
      Binds: [`${absRepoDir}:/workspace`],
      Memory: 512 * 1024 * 1024,
      MemorySwap: 1024 * 1024 * 1024,
      NanoCpus: 2_000_000_000,
      NetworkMode: "bridge",
    },
    Tty: false,
    AttachStdout: true,
    AttachStderr: true,
  });

  let stdout = "";
  let stderr = "";
  let exitCode = 1;
  let timedOut = false;

  try {
    const stream = await container.attach({ stream: true, stdout: true, stderr: true });

    const outputPromise = new Promise((resolve) => {
      const chunks = { stdout: [], stderr: [] };

      container.modem.demuxStream(
        stream,
        { write: (chunk) => chunks.stdout.push(chunk.toString()) },
        { write: (chunk) => chunks.stderr.push(chunk.toString()) }
      );

      stream.on("end", () => {
        resolve({
          stdout: chunks.stdout.join(""),
          stderr: chunks.stderr.join(""),
        });
      });
    });

    await container.start();
    log.info("Container started");

    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => { timedOut = true; resolve(null); }, timeout)
    );

    const waitPromise = container.wait();
    const result = await Promise.race([waitPromise, timeoutPromise]);

    if (timedOut) {
      log.warn(`Container timed out after ${timeout / 1000}s — killing`);
      try { await container.kill(); } catch { /* already stopped */ }
      stderr = "TIMEOUT: Command execution exceeded time limit";
      exitCode = 124;
    } else {
      exitCode = result.StatusCode;
      const output = await outputPromise;
      stdout = output.stdout;
      stderr = output.stderr;
    }

    log.info(`Container finished — exit code: ${exitCode}`);
  } catch (err) {
    log.error(`Container execution error: ${err.message}`);
    stderr = err.message;
  } finally {
    try {
      await container.remove({ force: true });
      log.info("Container removed");
    } catch (err) {
      log.warn(`Container cleanup failed: ${err.message}`);
    }
  }

  const MAX_OUTPUT = 50_000;
  if (stdout.length > MAX_OUTPUT) stdout = stdout.slice(-MAX_OUTPUT);
  if (stderr.length > MAX_OUTPUT) stderr = stderr.slice(-MAX_OUTPUT);

  return { exitCode, stdout, stderr };
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

function pullImage(image) {
  return new Promise((resolve, reject) => {
    docker.pull(image, (err, stream) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}
