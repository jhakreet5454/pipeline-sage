/**
 * ═══════════════════════════════════════════════════════════════════════
 *  Docker Utility
 *  ─ Runs commands inside Docker containers for sandboxed execution.
 *    Uses dockerode to manage container lifecycle.
 * ═══════════════════════════════════════════════════════════════════════
 */

import Docker from "dockerode";
import path from "path";
import { createRunLogger } from "./logger.js";

const docker = new Docker({
  socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock",
});

/**
 * Run a command inside a Docker container with the repo mounted.
 *
 * @param {object} opts
 * @param {string} opts.image     - Docker image (e.g. "node:18-alpine")
 * @param {string} opts.repoDir   - Absolute path to the repo to mount
 * @param {string} opts.cmd       - Shell command to run
 * @param {string} opts.runId     - Run ID for logging
 * @param {number} [opts.timeout] - Max execution time in ms (default 120s)
 * @returns {{ exitCode: number, stdout: string, stderr: string }}
 */
export async function runInDocker({ image, repoDir, cmd, runId, timeout = 120_000 }) {
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
      Memory: 512 * 1024 * 1024,     // 512MB limit
      MemorySwap: 1024 * 1024 * 1024, // 1GB swap
      NanoCpus: 2_000_000_000,        // 2 CPUs
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
    // Attach to capture output
    const stream = await container.attach({ stream: true, stdout: true, stderr: true });

    // Collect output
    const outputPromise = new Promise((resolve) => {
      const chunks = { stdout: [], stderr: [] };

      container.modem.demuxStream(
        stream,
        {
          write: (chunk) => chunks.stdout.push(chunk.toString()),
        },
        {
          write: (chunk) => chunks.stderr.push(chunk.toString()),
        }
      );

      stream.on("end", () => {
        resolve({
          stdout: chunks.stdout.join(""),
          stderr: chunks.stderr.join(""),
        });
      });
    });

    // Start container
    await container.start();
    log.info("Container started");

    // Set timeout
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => {
        timedOut = true;
        resolve(null);
      }, timeout)
    );

    // Wait for completion or timeout
    const waitPromise = container.wait();
    const result = await Promise.race([waitPromise, timeoutPromise]);

    if (timedOut) {
      log.warn(`Container timed out after ${timeout / 1000}s — killing`);
      try { await container.kill(); } catch { /* already stopped */ }
      stderr = "TIMEOUT: Command execution exceeded time limit";
      exitCode = 124; // standard timeout exit code
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
    // Cleanup: remove container
    try {
      await container.remove({ force: true });
      log.info("Container removed");
    } catch (err) {
      log.warn(`Container cleanup failed: ${err.message}`);
    }
  }

  // Truncate extremely long outputs
  const MAX_OUTPUT = 50_000;
  if (stdout.length > MAX_OUTPUT) stdout = stdout.slice(-MAX_OUTPUT);
  if (stderr.length > MAX_OUTPUT) stderr = stderr.slice(-MAX_OUTPUT);

  return { exitCode, stdout, stderr };
}

/**
 * Pull a Docker image.
 */
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

/**
 * Check if Docker is available and running.
 */
export async function checkDockerHealth() {
  try {
    const info = await docker.info();
    return { available: true, version: info.ServerVersion, containers: info.Containers };
  } catch (err) {
    return { available: false, error: err.message };
  }
}
