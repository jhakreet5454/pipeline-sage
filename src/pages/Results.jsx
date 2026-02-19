import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { RunSummaryCard } from "@/components/RunSummaryCard";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { FixesTable } from "@/components/FixesTable";
import { CICDTimeline } from "@/components/CICDTimeline";
import { StatusBadge } from "@/components/StatusBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, Bot } from "lucide-react";

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

                {/* Top grid: Summary + Score */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3">
                        <RunSummaryCard result={result} />
                    </div>
                    <div className="lg:col-span-2">
                        <ScoreBreakdown result={result} />
                    </div>
                </div>

                {/* Bottom grid: Fixes table + Timeline */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <FixesTable fixes={result.fixes} />
                    </div>
                    <div className="lg:col-span-1">
                        <CICDTimeline iterations={result.cicdTimeline} />
                    </div>
                </div>

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
