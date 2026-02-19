/**
 * Generates the EXACT branch name format required by the hackathon:
 *   ALL UPPERCASE, spaces → underscores, suffix _AI_Fix
 *
 * Example:
 *   teamName: "Code Warriors", leaderName: "John Doe"
 *   → "CODE_WARRIORS_JOHN_DOE_AI_Fix"
 */
export function generateBranchName(teamName, leaderName) {
  const sanitize = (str) =>
    str
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .replace(/\s+/g, "_");

  return `${sanitize(teamName)}_${sanitize(leaderName)}_AI_Fix`;
}

/**
 * Parse a GitHub repo URL into owner and repo name.
 * Supports:  https://github.com/owner/repo  |  https://github.com/owner/repo.git
 */
export function parseRepoUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (!match) throw new Error(`Invalid GitHub repo URL: ${url}`);
  return { owner: match[1], repo: match[2] };
}

/**
 * Detect primary language of a repo by checking for known config files.
 */
export function detectLanguage(files) {
  const names = files.map((f) => f.toLowerCase());
  if (names.includes("package.json")) return "node";
  if (names.includes("requirements.txt") || names.includes("setup.py") || names.includes("pyproject.toml")) return "python";
  if (names.includes("go.mod")) return "go";
  if (names.includes("cargo.toml")) return "rust";
  if (names.includes("pom.xml") || names.includes("build.gradle")) return "java";
  return "node"; // default
}

/**
 * Map language to Docker image and test command.
 */
export function getRuntime(language) {
  const runtimes = {
    node:   { image: "node:18-alpine",     testCmd: "npm test",   installCmd: "npm ci --ignore-scripts" },
    python: { image: "python:3.10-slim",   testCmd: "pytest -v",  installCmd: "pip install -r requirements.txt" },
    go:     { image: "golang:1.21-alpine",  testCmd: "go test ./...", installCmd: "" },
    rust:   { image: "rust:1.75-slim",      testCmd: "cargo test",   installCmd: "" },
    java:   { image: "maven:3.9-eclipse-temurin-17", testCmd: "mvn test", installCmd: "" },
  };
  return runtimes[language] || runtimes.node;
}
