import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function ScoreRow({ label, value, type, sub }) {
    const colors = {
        base: "text-foreground",
        bonus: "text-success",
        penalty: "text-danger",
        total: "text-primary",
    };
    const icons = {
        base: <Minus size={14} className="text-muted-foreground" />,
        bonus: <TrendingUp size={14} className="text-success" />,
        penalty: <TrendingDown size={14} className="text-danger" />,
        total: null,
    };
    const isTotal = type === "total";

    return (
        <div
            className={`flex items-center justify-between py-2.5 ${isTotal
                    ? "border-t border-border mt-1 pt-3.5"
                    : "border-b border-border/50"
                }`}
        >
            <div className="flex items-center gap-2">
                {icons[type] && <span aria-hidden="true">{icons[type]}</span>}
                <div>
                    <span
                        className={`text-sm ${isTotal ? "font-semibold text-foreground" : "text-foreground"}`}
                    >
                        {label}
                    </span>
                    {sub && (
                        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                    )}
                </div>
            </div>
            <span
                className={`font-mono font-semibold ${isTotal ? "text-2xl text-primary" : `text-sm ${colors[type]}`}`}
            >
                {value}
            </span>
        </div>
    );
}

export function ScoreBreakdown({ result }) {
    const percentage = Math.min(100, (result.finalScore / 120) * 100);

    return (
        <section
            className="bg-card rounded-xl border border-border shadow-card p-6 fade-in-up"
            style={{ animationDelay: "0.05s" }}
            aria-labelledby="score-heading"
        >
            <h2 id="score-heading" className="text-lg font-semibold text-foreground mb-1">
                Score Breakdown
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
                Based on speed, efficiency, and fix quality
            </p>

            <div className="space-y-0">
                <ScoreRow label="Base Score" value={`${result.baseScore}`} type="base" sub="Starting score" />
                <ScoreRow
                    label="Speed Bonus"
                    value={result.speedBonus > 0 ? `+${result.speedBonus}` : "0"}
                    type="bonus"
                    sub={`Completed in ${result.timeTaken} mins (< 5 min threshold)`}
                />
                <ScoreRow
                    label="Efficiency Penalty"
                    value={result.efficiencyPenalty > 0 ? `-${result.efficiencyPenalty}` : "0"}
                    type="penalty"
                    sub={`${result.commitsUsed} commits used (${Math.max(0, result.commitsUsed - 20)} over limit)`}
                />
                <ScoreRow label="Final Score" value={`${result.finalScore}`} type="total" />
            </div>

            {/* Progress bar */}
            <div className="mt-5">
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-muted-foreground">Score progress</span>
                    <span className="text-xs font-mono font-medium text-muted-foreground">
                        {result.finalScore} / 120
                    </span>
                </div>
                <div
                    className="h-2 rounded-full bg-secondary overflow-hidden"
                    role="progressbar"
                    aria-valuenow={result.finalScore}
                    aria-valuemin={0}
                    aria-valuemax={120}
                    aria-label={`Score: ${result.finalScore} out of 120`}
                >
                    <div
                        className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        </section>
    );
}
