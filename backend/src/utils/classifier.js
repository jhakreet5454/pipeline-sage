/**
 * Bug classification utilities for the Fixer Agent.
 * Maps error log patterns to standardized bug types.
 */

export const BUG_TYPES = {
  SYNTAX:      "SYNTAX",
  LINTING:     "LINTING",
  LOGIC:       "LOGIC",
  TYPE_ERROR:  "TYPE_ERROR",
  IMPORT:      "IMPORT",
  INDENTATION: "INDENTATION",
  RUNTIME:     "RUNTIME",
  UNKNOWN:     "UNKNOWN",
};

/**
 * Pattern-based initial classification of an error line.
 * The LLM will refine this, but pattern matching gives a first pass.
 */
const PATTERNS = [
  { regex: /SyntaxError|unexpected token|invalid syntax|EOL while scanning/i,  type: BUG_TYPES.SYNTAX },
  { regex: /IndentationError|unexpected indent|expected an indented block/i,   type: BUG_TYPES.INDENTATION },
  { regex: /TypeError|type.*mismatch|cannot read propert/i,                    type: BUG_TYPES.TYPE_ERROR },
  { regex: /ImportError|ModuleNotFoundError|Cannot find module|no module named/i, type: BUG_TYPES.IMPORT },
  { regex: /AssertionError|Expected.*to (equal|be|match)|assert/i,             type: BUG_TYPES.LOGIC },
  { regex: /eslint|lint|prettier|warning.*rule/i,                              type: BUG_TYPES.LINTING },
  { regex: /ReferenceError|NameError|is not defined/i,                         type: BUG_TYPES.RUNTIME },
];

/**
 * Classify a single error message into a bug type.
 */
export function classifyError(errorLine) {
  for (const { regex, type } of PATTERNS) {
    if (regex.test(errorLine)) return type;
  }
  return BUG_TYPES.UNKNOWN;
}

/**
 * Extract file path and line number from common error formats.
 *   File "src/foo.py", line 8
 *   src/foo.js:12:5
 *   at Object.<anonymous> (src/bar.js:42:10)
 */
export function extractLocation(errorLine) {
  // Python-style:  File "path", line N
  let match = errorLine.match(/File "([^"]+)", line (\d+)/);
  if (match) return { file: match[1], line: parseInt(match[2], 10) };

  // JS/TS-style:  path:line:col
  match = errorLine.match(/(?:at .+\()?([^\s(]+):(\d+):\d+\)?/);
  if (match) return { file: match[1], line: parseInt(match[2], 10) };

  // Generic:  path:line
  match = errorLine.match(/([^\s:]+\.\w+):(\d+)/);
  if (match) return { file: match[1], line: parseInt(match[2], 10) };

  return { file: null, line: null };
}

/**
 * Parse a raw error log into structured error entries.
 */
export function parseErrorLog(rawLog) {
  const lines = rawLog.split("\n").filter((l) => l.trim());
  const errors = [];
  const seen = new Set();

  for (const line of lines) {
    const bugType = classifyError(line);
    if (bugType === BUG_TYPES.UNKNOWN && !line.includes("Error") && !line.includes("FAIL")) continue;

    const { file, line: lineNum } = extractLocation(line);
    const key = `${file}:${lineNum}:${bugType}`;
    if (seen.has(key)) continue;
    seen.add(key);

    errors.push({
      bugType,
      file,
      lineNumber: lineNum,
      rawMessage: line.trim(),
    });
  }

  return errors;
}
