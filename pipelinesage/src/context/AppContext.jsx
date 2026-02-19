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
        { file: "src/validator.py", bugType: "SYNTAX", line: 8, commitMessage: "fix: add missing colon in validator.py", status: "PASSED" },
        { file: "src/utils/parser.py", bugType: "IMPORT", line: 3, commitMessage: "fix: correct import path for parser utils", status: "PASSED" },
        { file: "src/models/user.py", bugType: "TYPE_ERROR", line: 42, commitMessage: "fix: resolve type mismatch in user model", status: "PASSED" },
        { file: "src/api/routes.py", bugType: "LOGIC", line: 115, commitMessage: "fix: correct conditional logic in route handler", status: "PASSED" },
        { file: "src/config.py", bugType: "INDENTATION", line: 27, commitMessage: "fix: normalise indentation in config", status: "PASSED" },
        { file: "tests/test_validator.py", bugType: "LINTING", line: 19, commitMessage: "fix: remove unused variable in test", status: "PASSED" },
        { file: "src/api/auth.py", bugType: "TYPE_ERROR", line: 66, commitMessage: "fix: cast response to correct type", status: "FAILED" },
    ];

    const cicdTimeline = [
        { iteration: 1, total: 5, status: "FAILED", timestamp: "2026-02-19 10:08 PM", message: "Initial run — 7 failures detected" },
        { iteration: 2, total: 5, status: "FAILED", timestamp: "2026-02-19 10:11 PM", message: "4 fixes applied — 3 remaining" },
        { iteration: 3, total: 5, status: "FAILED", timestamp: "2026-02-19 10:13 PM", message: "2 more fixes applied — 1 remaining" },
        { iteration: 4, total: 5, status: "PASSED", timestamp: "2026-02-19 10:16 PM", message: "Final fix applied — CI/CD passed" },
    ];

    const commitsUsed = 22;
    const timeTakenMinutes = 3.75;
    const baseScore = 100;
    const speedBonus = timeTakenMinutes < 5 ? 10 : 0;
    const efficiencyPenalty = Math.max(0, commitsUsed - 20) * 2;
    const finalScore = baseScore + speedBonus - efficiencyPenalty;

    return {
        repoUrl, teamName, leaderName, branchName, totalFailures: 7, totalFixes: 6,
        cicdStatus: "PASSED", timeTaken: "3:45", timeTakenMinutes, baseScore,
        speedBonus, efficiencyPenalty, finalScore, commitsUsed, fixes, cicdTimeline,
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
