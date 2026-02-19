import { createContext, useContext, useState } from "react";

// ─── Mock data generator ────────────────────────────────────────────────────

export function generateMockResult(repoUrl, teamName, leaderName) {
    const branchName = `${teamName}_${leaderName}_AI_Fix`
        .toUpperCase()
        .replace(/\s+/g, "_");

    const fixes = [
        {
            file: "src/validator.py",
            bugType: "SYNTAX",
            line: 8,
            commitMessage: "fix: add missing colon in validator.py",
            status: "PASSED",
        },
        {
            file: "src/utils/parser.py",
            bugType: "IMPORT",
            line: 3,
            commitMessage: "fix: correct import path for parser utils",
            status: "PASSED",
        },
        {
            file: "src/models/user.py",
            bugType: "TYPE_ERROR",
            line: 42,
            commitMessage: "fix: resolve type mismatch in user model",
            status: "PASSED",
        },
        {
            file: "src/api/routes.py",
            bugType: "LOGIC",
            line: 115,
            commitMessage: "fix: correct conditional logic in route handler",
            status: "PASSED",
        },
        {
            file: "src/config.py",
            bugType: "INDENTATION",
            line: 27,
            commitMessage: "fix: normalise indentation in config",
            status: "PASSED",
        },
        {
            file: "tests/test_validator.py",
            bugType: "LINTING",
            line: 19,
            commitMessage: "fix: remove unused variable in test",
            status: "PASSED",
        },
        {
            file: "src/api/auth.py",
            bugType: "TYPE_ERROR",
            line: 66,
            commitMessage: "fix: cast response to correct type",
            status: "FAILED",
        },
    ];

    const cicdTimeline = [
        {
            iteration: 1,
            total: 5,
            status: "FAILED",
            timestamp: "2026-02-19 10:08 PM",
            message: "Initial run — 7 failures detected",
        },
        {
            iteration: 2,
            total: 5,
            status: "FAILED",
            timestamp: "2026-02-19 10:11 PM",
            message: "4 fixes applied — 3 remaining",
        },
        {
            iteration: 3,
            total: 5,
            status: "FAILED",
            timestamp: "2026-02-19 10:13 PM",
            message: "2 more fixes applied — 1 remaining",
        },
        {
            iteration: 4,
            total: 5,
            status: "PASSED",
            timestamp: "2026-02-19 10:16 PM",
            message: "Final fix applied — CI/CD passed",
        },
    ];

    const commitsUsed = 22;
    const timeTakenMinutes = 3.75;
    const baseScore = 100;
    const speedBonus = timeTakenMinutes < 5 ? 10 : 0;
    const efficiencyPenalty = Math.max(0, commitsUsed - 20) * 2;
    const finalScore = baseScore + speedBonus - efficiencyPenalty;

    const result = {
        repoUrl,
        teamName,
        leaderName,
        branchName,
        totalFailures: 7,
        totalFixes: 6,
        cicdStatus: "PASSED",
        timeTaken: "3:45",
        timeTakenMinutes,
        baseScore,
        speedBonus,
        efficiencyPenalty,
        finalScore,
        commitsUsed,
        fixes,
        cicdTimeline,
    };

    console.log("[HealFlow AI] results.json mock:", JSON.stringify(result, null, 2));

    return result;
}

// ─── Context ────────────────────────────────────────────────────────────────

const AppContext = createContext(undefined);

export function AppProvider({ children }) {
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    return (
        <AppContext.Provider value={{ result, setResult, isLoading, setIsLoading }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error("useAppContext must be used within AppProvider");
    return ctx;
}
