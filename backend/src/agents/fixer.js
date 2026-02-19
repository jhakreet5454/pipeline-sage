/**
 * ═══════════════════════════════════════════════════════════════════════
 *  Fixer Agent
 *  ─ Uses LLM (Google Gemini via LangChain) to classify bugs from error
 *    logs, generate targeted code fixes, and apply them to the local repo.
 *  ─ Supports model fallback chain + retry with backoff on rate limits.
 * ═══════════════════════════════════════════════════════════════════════
 */

import fs from "fs-extra";
import path from "path";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createRunLogger } from "../utils/logger.js";
import { parseErrorLog, BUG_TYPES } from "../utils/classifier.js";
import { broadcast } from "../ws/socket.js";
import { appendLog } from "../store/runStore.js";

const SYSTEM_PROMPT = `You are an expert autonomous code-fixing agent. Your task is to analyze error logs from CI/CD test runs and produce precise, minimal code fixes.

RULES:
1. Only modify the exact lines that cause the error.
2. Preserve existing code style and indentation.
3. Each fix must be a complete, drop-in replacement for the affected lines.
4. Classify each bug as one of: SYNTAX, LINTING, LOGIC, TYPE_ERROR, IMPORT, INDENTATION, RUNTIME.
5. Return your response as valid JSON only — no markdown, no explanation outside JSON.

Response format (JSON array):
[
  {
    "file": "relative/path/to/file.py",
    "lineNumber": 8,
    "bugType": "SYNTAX",
    "description": "Missing colon at end of function definition",
    "originalCode": "def validate(data)",
    "fixedCode": "def validate(data):",
    "commitMessage": "Fix SYNTAX error in src/validator.py line 8 → add the colon"
  }
]`;

/**
 * Fallback model chain — ordered by free-tier quota (highest first):
 *   gemini-2.5-flash-lite : 1,000 RPD, 15 RPM  (best free quota)
 *   gemini-2.5-flash      :   250 RPD, 10 RPM
 *   gemini-2.0-flash-lite :   fallback
 */
const FALLBACK_MODELS = [
  process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
];

export class FixerAgent {
  constructor(runId) {
    this.runId = runId;
    this.log = createRunLogger(runId, "Fixer");
  }

  /** Create a fresh LLM instance for a given model name */
  _createLLM(modelName) {
    return new ChatGoogleGenerativeAI({
      model: modelName,
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.1,
      maxOutputTokens: 8192,
    });
  }

  /** Invoke LLM with retry + model fallback */
  async _invokeWithFallback(messages) {
    for (const model of FALLBACK_MODELS) {
      const llm = this._createLLM(model);
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          this.log.info(`Trying model ${model} (attempt ${attempt}/3)...`);
          const response = await llm.invoke(messages);
          this.log.info(`✓ Model ${model} responded successfully`);
          return response;
        } catch (err) {
          const is429 = err.message?.includes("429") || err.message?.includes("quota") || err.message?.includes("Too Many Requests");
          if (is429 && attempt < 3) {
            const delay = attempt * 15_000; // 15s, 30s
            this.log.warn(`Rate limited on ${model}, retrying in ${delay / 1000}s...`);
            await new Promise((r) => setTimeout(r, delay));
          } else if (is429) {
            this.log.warn(`${model} quota exhausted, trying next model...`);
            break; // try next model
          } else {
            throw err; // non-rate-limit error, bubble up
          }
        }
      }
    }
    throw new Error("All Gemini models exhausted — rate limited on every fallback");
  }

  /**
   * Analyze errors and generate fixes via LLM.
   */
  async generateFixes(errorOutput, repoDir) {
    this.log.info("Parsing error log for structured issues...");

    // First-pass pattern-based classification
    const parsedErrors = parseErrorLog(errorOutput);
    this.log.info(`Pattern matching found ${parsedErrors.length} error(s)`);

    // Gather source context for each error
    const errorContexts = await Promise.all(
      parsedErrors.map(async (err) => {
        let sourceContext = "";
        if (err.file) {
          const filePath = path.resolve(repoDir, err.file);
          if (await fs.pathExists(filePath)) {
            const content = await fs.readFile(filePath, "utf-8");
            const lines = content.split("\n");
            const start = Math.max(0, (err.lineNumber || 1) - 5);
            const end = Math.min(lines.length, (err.lineNumber || 1) + 5);
            sourceContext = lines.slice(start, end).map((l, i) => `${start + i + 1}: ${l}`).join("\n");
          }
        }
        return { ...err, sourceContext };
      })
    );

    // Send to LLM for refined classification + fix generation
    broadcast(this.runId, { event: "fix_generate_start", agent: "Fixer", message: "Generating fixes with AI..." });

    const userPrompt = `Here are the errors from the test run:\n\n${errorOutput}\n\n---\nParsed errors with source context:\n${JSON.stringify(errorContexts, null, 2)}\n\nAnalyze each error and generate fixes. Return a JSON array of fixes.`;

    let fixes = [];
    try {
      const response = await this._invokeWithFallback([
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(userPrompt),
      ]);

      const content = response.content.trim();
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        fixes = JSON.parse(jsonMatch[0]);
      } else {
        this.log.error("LLM did not return valid JSON array");
        fixes = [];
      }
    } catch (err) {
      this.log.error(`LLM fix generation failed: ${err.message}`);
      // Fall back to pattern-based fixes with generic descriptions
      fixes = parsedErrors.map((e) => ({
        file: e.file,
        lineNumber: e.lineNumber,
        bugType: e.bugType,
        description: e.rawMessage,
        originalCode: "",
        fixedCode: "",
        commitMessage: `[AI-AGENT] Fix ${e.bugType} error in ${e.file || "unknown"} line ${e.lineNumber || "?"}`,
      }));
    }

    this.log.info(`Generated ${fixes.length} fix(es)`);
    broadcast(this.runId, {
      event: "fix_generate_done",
      agent: "Fixer",
      message: `Generated ${fixes.length} fix(es)`,
      data: { count: fixes.length },
    });

    return fixes;
  }

  /**
   * Apply fixes to files on disk.
   */
  async applyFixes(fixes, repoDir) {
    const results = [];

    for (const fix of fixes) {
      if (!fix.file || !fix.originalCode || !fix.fixedCode) {
        this.log.warn(`Skipping incomplete fix for ${fix.file || "unknown"}`);
        results.push({ ...fix, status: "Skipped" });
        continue;
      }

      const filePath = path.resolve(repoDir, fix.file);

      try {
        if (!(await fs.pathExists(filePath))) {
          this.log.warn(`File not found: ${fix.file}`);
          results.push({ ...fix, status: "Failed", reason: "File not found" });
          continue;
        }

        let content = await fs.readFile(filePath, "utf-8");

        if (!content.includes(fix.originalCode)) {
          this.log.warn(`Original code not found in ${fix.file} — attempting line-based replacement`);
          // Try line-based replacement
          const lines = content.split("\n");
          if (fix.lineNumber && fix.lineNumber <= lines.length) {
            lines[fix.lineNumber - 1] = fix.fixedCode;
            content = lines.join("\n");
            await fs.writeFile(filePath, content, "utf-8");
            this.log.info(`✓ Applied line-based fix to ${fix.file}:${fix.lineNumber}`);
            results.push({ ...fix, status: "Fixed" });
          } else {
            results.push({ ...fix, status: "Failed", reason: "Original code not found" });
          }
          continue;
        }

        content = content.replace(fix.originalCode, fix.fixedCode);
        await fs.writeFile(filePath, content, "utf-8");
        this.log.info(`✓ Applied fix to ${fix.file}:${fix.lineNumber} [${fix.bugType}]`);
        results.push({ ...fix, status: "Fixed" });

        broadcast(this.runId, {
          event: "fix_applied",
          agent: "Fixer",
          message: `Fixed ${fix.bugType} in ${fix.file}`,
          data: { file: fix.file, bugType: fix.bugType },
        });
      } catch (err) {
        this.log.error(`Failed to apply fix to ${fix.file}: ${err.message}`);
        results.push({ ...fix, status: "Failed", reason: err.message });
      }
    }

    appendLog(this.runId, {
      agent: "Fixer",
      event: "fixes_applied",
      total: results.length,
      fixed: results.filter((r) => r.status === "Fixed").length,
      failed: results.filter((r) => r.status === "Failed").length,
    });

    return results;
  }
}
