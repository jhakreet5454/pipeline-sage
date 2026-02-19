import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { RunSummaryCard } from "@/components/RunSummaryCard";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { FixesTable } from "@/components/FixesTable";
import { CICDTimeline } from "@/components/CICDTimeline";
import { StatusBadge } from "@/components/StatusBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
    ArrowLeft, Bot, Code2, Terminal, BarChart3,
    FileCode, Bug, Clock, Layers, ChevronDown, ChevronUp,
} from "lucide-react";
import { useState } from "react";

/* ─── Repo Stats Card ────────────────────────────────────────────── */
function RepoStatsCard({ result }) {
    const stats = result.repoStats || {};
    const items = [
        { icon: <FileCode size={14} />, label: "Language", value: stats.language || "—", color: "text-blue-500" },
        { icon: <Terminal size={14} />, label: "Runtime", value: stats.runtime || "native", color: "text-emerald-500" },
        { icon: <Code2 size={14} />, label: "Test Command", value: stats.testCommand || "—", color: "text-amber-500" },
        { icon: <Layers size={14} />, label: "Test Files", value: stats.testFilesFound ?? 0, color: "text-purple-500" },
        { icon: <Clock size={14} />, label: "Total Time", value: result.timeTaken || "—", color: "text-cyan-500" },
        { icon: <BarChart3 size={14} />, label: "Iterations", value: result.totalIterations ?? 0, color: "text-rose-500" },
    ];

    return (
        <section className="bg-card rounded-xl border border-border shadow-card p-6 fade-in-up" style={{ animationDelay: "0.05s" }}>
            <h2 className="text-lg font-semibold text-foreground mb-1">Repository Info</h2>
            <p className="text-sm text-muted-foreground mb-5">Detected configuration and execution stats</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {items.map((item) => (
                    <div key={item.label} className="flex items-start gap-2.5">
                        <div className={`mt-0.5 ${item.color}`}>{item.icon}</div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.label}</p>
                            <p className="text-sm font-semibold text-foreground font-mono">{item.value}</p>
                        </div>
                    </div>
                ))}
            </div>
            {stats.testFiles?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Test Files Found</p>
                    <div className="flex flex-wrap gap-1.5">
                        {stats.testFiles.map((f) => (
                            <span key={f} className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary border border-border text-foreground">
                                {f}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

/* ─── Bug Type Breakdown ─────────────────────────────────────────── */
const bugColors = {
    SYNTAX: "bg-red-500", LINTING: "bg-amber-500", LOGIC: "bg-violet-500",
    TYPE_ERROR: "bg-orange-500", IMPORT: "bg-emerald-500", INDENTATION: "bg-slate-500",
    RUNTIME: "bg-cyan-500", UNKNOWN: "bg-gray-500",
};

function BugTypeSummaryCard({ bugTypeSummary }) {
    const entries = Object.entries(bugTypeSummary);
    if (entries.length === 0) return null;

    const total = entries.reduce((sum, [, v]) => sum + v.total, 0);

    return (
        <section className="bg-card rounded-xl border border-border shadow-card p-6 fade-in-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-lg font-semibold text-foreground mb-1">Bug Types Detected</h2>
            <p className="text-sm text-muted-foreground mb-5">Classification of {total} issue(s) found</p>
            <div className="space-y-3">
                {entries.map(([type, counts]) => {
                    const pct = Math.round((counts.total / total) * 100);
                    return (
                        <div key={type}>
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <Bug size={12} className="text-muted-foreground" />
                                    <span className="text-xs font-semibold text-foreground">{type}</span>
                                </div>
                                <span className="text-xs font-mono text-muted-foreground">
                                    {counts.fixed}/{counts.total} fixed
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${bugColors[type] || "bg-primary"} transition-all duration-700`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

/* ─── Error Log Viewer ───────────────────────────────────────────── */
function ErrorLogViewer({ errorLogs }) {
    const [expanded, setExpanded] = useState(null);

    if (!errorLogs?.length) return null;

    return (
        <section className="bg-card rounded-xl border border-border shadow-card fade-in-up overflow-hidden" style={{ animationDelay: "0.2s" }}>
            <div className="p-6 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground mb-1">Error Logs</h2>
                <p className="text-sm text-muted-foreground">
                    Raw test output from {errorLogs.length} iteration(s)
                </p>
            </div>
            <div className="divide-y divide-border">
                {errorLogs.map((log, i) => (
                    <div key={i}>
                        <button
                            className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors cursor-pointer"
                            onClick={() => setExpanded(expanded === i ? null : i)}
                        >
                            <span className="flex items-center gap-2">
                                <Terminal size={14} className="text-danger" />
                                Iteration {log.iteration} — Error Output
                            </span>
                            {expanded === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {expanded === i && (
                            <div className="px-6 pb-4">
                                <pre className="text-xs font-mono text-muted-foreground bg-[hsl(220_15%_6%)] dark:bg-[hsl(220_15%_6%)] text-[hsl(210_10%_70%)] rounded-lg p-4 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
                                    {log.output || "No output captured"}
                                </pre>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

/* ─── Code Diff Viewer ───────────────────────────────────────────── */
function CodeDiffSection({ fixes }) {
    const fixesWithDiffs = fixes.filter((f) => f.originalCode || f.fixedCode);
    const [expanded, setExpanded] = useState(null);

    if (fixesWithDiffs.length === 0) return null;

    return (
        <section className="bg-card rounded-xl border border-border shadow-card fade-in-up overflow-hidden" style={{ animationDelay: "0.25s" }}>
            <div className="p-6 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground mb-1">Code Changes</h2>
                <p className="text-sm text-muted-foreground">
                    {fixesWithDiffs.length} fix(es) with code diffs
                </p>
            </div>
            <div className="divide-y divide-border">
                {fixesWithDiffs.map((fix, i) => (
                    <div key={i}>
                        <button
                            className="w-full flex items-center justify-between px-6 py-3 text-sm hover:bg-secondary/50 transition-colors cursor-pointer"
                            onClick={() => setExpanded(expanded === i ? null : i)}
                        >
                            <span className="flex items-center gap-2">
                                <Code2 size={14} className="text-primary" />
                                <span className="font-mono text-xs text-foreground">{fix.file}</span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                    {fix.bugType}
                                </span>
                            </span>
                            {expanded === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {expanded === i && (
                            <div className="px-6 pb-4 space-y-3">
                                {fix.description && (
                                    <p className="text-xs text-muted-foreground italic">{fix.description}</p>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {fix.originalCode && (
                                        <div>
                                            <p className="text-[10px] font-semibold text-danger uppercase tracking-wider mb-1">— Original</p>
                                            <pre className="text-xs font-mono bg-danger-bg/50 border border-danger-border/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-foreground">
                                                {fix.originalCode}
                                            </pre>
                                        </div>
                                    )}
                                    {fix.fixedCode && (
                                        <div>
                                            <p className="text-[10px] font-semibold text-success uppercase tracking-wider mb-1">+ Fixed</p>
                                            <pre className="text-xs font-mono bg-success-bg/50 border border-success-border/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-foreground">
                                                {fix.fixedCode}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

/* ─── Iteration Stats ────────────────────────────────────────────── */
function IterationStatsCard({ iterations }) {
    if (!iterations?.length) return null;

    return (
        <section className="bg-card rounded-xl border border-border shadow-card p-6 fade-in-up" style={{ animationDelay: "0.15s" }}>
            <h2 className="text-lg font-semibold text-foreground mb-1">Iteration Breakdown</h2>
            <p className="text-sm text-muted-foreground mb-4">Per-iteration performance metrics</p>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                            <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generated</th>
                            <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Applied</th>
                            <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        {iterations.map((it, i) => (
                            <tr key={i} className="border-b border-border/50">
                                <td className="py-2 font-mono text-xs font-bold text-primary">{it.iteration}</td>
                                <td className="py-2">
                                    <span className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded ${it.status === "PASSED"
                                        ? "bg-success-bg text-success border border-success-border"
                                        : "bg-danger-bg text-danger border border-danger-border"
                                        }`}>
                                        {it.status}
                                    </span>
                                </td>
                                <td className="py-2 text-xs text-foreground font-mono">{it.fixesGenerated}</td>
                                <td className="py-2 text-xs text-foreground font-mono">{it.fixesApplied}</td>
                                <td className="py-2 text-xs text-muted-foreground font-mono">{it.duration}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

/* ─── Main Results Page ──────────────────────────────────────────── */
export default function Results() {
    const { result, setResult } = useAppContext();
    const navigate = useNavigate();

    useEffect(() => {
        if (!result) {
            navigate("/", { replace: true });
        }
    }, [result, navigate]);

    if (!result) return null;

    const handleNewRun = () => {
        setResult(null);
        navigate("/");
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Top nav bar */}
            <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border fade-in">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 border border-primary/20">
                            <Bot size={15} className="text-primary" aria-hidden="true" />
                        </div>
                        <span className="text-sm font-bold text-foreground">
                            HealFlow <span className="text-primary">AI</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <StatusBadge status={result.cicdStatus} size="sm" />
                        <button
                            onClick={handleNewRun}
                            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground
                hover:text-foreground transition-colors duration-150 px-3 py-1.5 rounded-lg
                border border-border hover:border-border/80 hover:bg-secondary
                focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                            aria-label="Start a new agent run"
                        >
                            <ArrowLeft size={12} aria-hidden="true" />
                            New Run
                        </button>
                    </div>
                </div>
            </header>

            {/* Page content */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                {/* Page title */}
                <div className="fade-in">
                    <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">
                        Agent Results
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Completed run for{" "}
                        <span className="font-medium text-foreground">{result.teamName}</span>{" "}·{" "}
                        <span className="font-mono text-xs text-muted-foreground">
                            {result.branchName}
                        </span>
                    </p>
                </div>

                {/* Row 1: Summary + Score */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3">
                        <RunSummaryCard result={result} />
                    </div>
                    <div className="lg:col-span-2">
                        <ScoreBreakdown result={result} />
                    </div>
                </div>

                {/* Row 2: Repo Stats + Bug Types */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RepoStatsCard result={result} />
                    <BugTypeSummaryCard bugTypeSummary={result.bugTypeSummary} />
                </div>

                {/* Row 3: Fixes table + Timeline + Iteration stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <FixesTable fixes={result.fixes} />
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                        <CICDTimeline iterations={result.cicdTimeline} />
                        <IterationStatsCard iterations={result.iterations} />
                    </div>
                </div>

                {/* Row 4: Code Diffs */}
                <CodeDiffSection fixes={result.fixes} />

                {/* Row 5: Error Logs */}
                <ErrorLogViewer errorLogs={result.errorLogs} />

                {/* Footer CTA */}
                <div className="flex justify-center pt-2 pb-6 fade-in">
                    <button
                        onClick={handleNewRun}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border
              text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary
              transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                        aria-label="Go back and start a new agent run"
                    >
                        <ArrowLeft size={14} aria-hidden="true" />
                        Run another repository
                    </button>
                </div>
            </main>
        </div>
    );
}
