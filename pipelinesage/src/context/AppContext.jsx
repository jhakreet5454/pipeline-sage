import { createContext, useContext, useState, useCallback, useRef } from "react";
import {
    startAgent,
    getResults,
    connectWebSocket,
    transformResult,
} from "@/services/api";

// ─── Mock data generator (kept as fallback) ────────────────────────────────

export function generateMockResult(repoUrl, teamName, leaderName) {
    const branchName = `${teamName}_${leaderName}_AI_Fix`
        .toUpperCase()
        .replace(/\s+/g, "_");

    const fixes = [
        { file: "src/validator.py", bugType: "SYNTAX", line: 8, commitMessage: "fix: add missing colon in validator.py", description: "Missing colon at end of function definition", originalCode: "def validate(data)", fixedCode: "def validate(data):", status: "PASSED" },
        { file: "src/utils/parser.py", bugType: "IMPORT", line: 3, commitMessage: "fix: correct import path for parser utils", description: "Incorrect module import path", originalCode: "from utils import parse", fixedCode: "from src.utils import parse", status: "PASSED" },
        { file: "src/models/user.py", bugType: "TYPE_ERROR", line: 42, commitMessage: "fix: resolve type mismatch in user model", description: "Integer compared with string", originalCode: 'if user.age == "25":', fixedCode: "if user.age == 25:", status: "PASSED" },
        { file: "src/api/routes.py", bugType: "LOGIC", line: 115, commitMessage: "fix: correct conditional logic in route handler", description: "Inverted conditional check", originalCode: "if not user.is_authenticated:", fixedCode: "if user.is_authenticated:", status: "PASSED" },
        { file: "src/config.py", bugType: "INDENTATION", line: 27, commitMessage: "fix: normalise indentation in config", description: "Mixed tabs and spaces", originalCode: "\t    DEBUG = True", fixedCode: "    DEBUG = True", status: "PASSED" },
        { file: "tests/test_validator.py", bugType: "LINTING", line: 19, commitMessage: "fix: remove unused variable in test", description: "Unused variable 'result'", originalCode: "result = validate(data)", fixedCode: "validate(data)", status: "PASSED" },
        { file: "src/api/auth.py", bugType: "TYPE_ERROR", line: 66, commitMessage: "fix: cast response to correct type", description: "Response body not serializable", originalCode: "return response", fixedCode: "return str(response)", status: "FAILED", reason: "Original code not found in file" },
    ];

    const cicdTimeline = [
        { iteration: 1, total: 5, status: "FAILED", timestamp: "2026-02-19 10:08 PM", message: "Initial run — 7 failures detected" },
        { iteration: 2, total: 5, status: "FAILED", timestamp: "2026-02-19 10:11 PM", message: "4 fixes applied — 3 remaining" },
        { iteration: 3, total: 5, status: "FAILED", timestamp: "2026-02-19 10:13 PM", message: "2 more fixes applied — 1 remaining" },
        { iteration: 4, total: 5, status: "PASSED", timestamp: "2026-02-19 10:16 PM", message: "Final fix applied — CI/CD passed" },
    ];

    const repoStats = {
        language: "python",
        runtime: "python:3.10-slim",
        testCommand: "python -m pytest",
        testFilesFound: 3,
        testFiles: ["tests/test_validator.py", "tests/test_auth.py", "tests/test_routes.py"],
    };

    const bugTypeSummary = {
        SYNTAX: { total: 1, fixed: 1, failed: 0 },
        IMPORT: { total: 1, fixed: 1, failed: 0 },
        TYPE_ERROR: { total: 2, fixed: 1, failed: 1 },
        LOGIC: { total: 1, fixed: 1, failed: 0 },
        INDENTATION: { total: 1, fixed: 1, failed: 0 },
        LINTING: { total: 1, fixed: 1, failed: 0 },
    };

    const iterations = [
        { iteration: 1, status: "FAILED", fixesGenerated: 4, fixesApplied: 4, durationMs: 12400, duration: "12.4s" },
        { iteration: 2, status: "FAILED", fixesGenerated: 2, fixesApplied: 2, durationMs: 8200, duration: "8.2s" },
        { iteration: 3, status: "PASSED", fixesGenerated: 1, fixesApplied: 1, durationMs: 5600, duration: "5.6s" },
    ];

    const errorLogs = [
        { iteration: 0, output: "FAILED tests/test_validator.py::test_validate - SyntaxError: expected ':'\nFAILED tests/test_auth.py::test_login - TypeError: unsupported operand type(s)\n=== 7 failed, 12 passed in 1.45s ===" },
        { iteration: 1, output: "FAILED tests/test_auth.py::test_login - TypeError: unsupported operand type(s)\nFAILED tests/test_routes.py::test_protected - AssertionError\n=== 3 failed, 16 passed in 1.23s ===" },
        { iteration: 2, output: "FAILED tests/test_auth.py::test_response_format - TypeError: Object not serializable\n=== 1 failed, 18 passed in 1.12s ===" },
    ];

    const commitsUsed = 22;
    const timeTakenMinutes = 3.75;
    const baseScore = 100;
    const speedBonus = timeTakenMinutes < 5 ? 10 : 0;
    const efficiencyPenalty = Math.max(0, commitsUsed - 20) * 2;
    const finalScore = baseScore + speedBonus - efficiencyPenalty;

    return {
        repoUrl, teamName, leaderName, branchName,
        totalFailures: 7, totalFixes: 6, totalFixesFailed: 1, totalFixesSkipped: 0,
        totalFixesAttempted: 7, totalIterations: 3,
        cicdStatus: "PASSED", timeTaken: "3:45", timeTakenMs: 225000, timeTakenMinutes,
        repoStats, baseScore, speedBonus, efficiencyPenalty, fixBonus: 12, iterationPenalty: 0,
        finalScore, commitsUsed, bugTypeSummary, fixes, iterations, errorLogs, cicdTimeline,
    };
}

// ─── Context ────────────────────────────────────────────────────────────────

const AppContext = createContext(undefined);

export function AppProvider({ children }) {
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [runId, setRunId] = useState(null);
    const [progress, setProgress] = useState([]);       // real-time WS events
    const [agentStatus, setAgentStatus] = useState("");  // current status message
    const disconnectWs = useRef(null);

    /**
     * Start agent run — calls the real backend API.
     * Returns { runId, branch } on success.
     */
    const runAgent = useCallback(async ({ repoUrl, teamName, leaderName }) => {
        setIsLoading(true);
        setProgress([]);
        setAgentStatus("Connecting to agent...");
        setResult(null);

        try {
            // 1. Start the agent
            const res = await startAgent({ repoUrl, teamName, leaderName });
            const newRunId = res.runId;
            setRunId(newRunId);
            setAgentStatus("Agent started — analyzing repository...");

            // 2. Connect WebSocket for real-time events
            const disconnect = connectWebSocket(
                newRunId,
                (event) => {
                    setProgress((prev) => [...prev, event]);
                    setAgentStatus(event.message || event.event);

                    // When pipeline is done, fetch final results
                    if (event.event === "pipeline_done" && event.data) {
                        const transformed = transformResult(event.data);
                        setResult(transformed);
                        setIsLoading(false);
                        setAgentStatus("Pipeline complete!");
                    }
                },
                (err) => {
                    console.error("[WS] Connection error, falling back to polling:", err);
                }
            );
            disconnectWs.current = disconnect;

            // 3. Also poll as fallback (in case WS drops)
            pollForResults(newRunId);

            return res;
        } catch (err) {
            setIsLoading(false);
            setAgentStatus("");
            throw err;
        }
    }, []);

    /**
     * Poll GET /api/results/:runId every 5s as a WebSocket fallback.
     */
    const pollForResults = useCallback(async (id) => {
        const maxAttempts = 120; // 10 minutes max
        let attempts = 0;

        const poll = async () => {
            attempts++;
            if (attempts > maxAttempts) {
                setAgentStatus("Polling timeout — check backend logs");
                setIsLoading(false);
                return;
            }

            try {
                const data = await getResults(id);

                if (data.status === "processing") {
                    // Still running — update logs if available
                    if (data.logs?.length) {
                        const lastLog = data.logs[data.logs.length - 1];
                        setAgentStatus(lastLog.event || lastLog.message || "Processing...");
                    }
                    setTimeout(poll, 5000);
                } else if (data.result) {
                    // Done! Transform and set result
                    const transformed = transformResult(data.result);
                    setResult(transformed);
                    setIsLoading(false);
                    setAgentStatus("Pipeline complete!");

                    // Disconnect WS
                    if (disconnectWs.current) {
                        disconnectWs.current();
                        disconnectWs.current = null;
                    }
                } else {
                    // Status is error/failed without result
                    setAgentStatus(`Run ended with status: ${data.status}`);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Polling error:", err.message);
                setTimeout(poll, 5000);
            }
        };

        // Start polling after a short delay (give WS a chance first)
        setTimeout(poll, 3000);
    }, []);

    /**
     * Use mock result instead of real backend (fallback mode).
     */
    const runMockAgent = useCallback(async ({ repoUrl, teamName, leaderName }) => {
        setIsLoading(true);
        await new Promise((res) => setTimeout(res, 2400));
        const mockResult = generateMockResult(repoUrl, teamName, leaderName);
        setResult(mockResult);
        setIsLoading(false);
        return mockResult;
    }, []);

    return (
        <AppContext.Provider
            value={{
                result, setResult,
                isLoading, setIsLoading,
                runId, progress, agentStatus,
                runAgent, runMockAgent,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error("useAppContext must be used within AppProvider");
    return ctx;
}
