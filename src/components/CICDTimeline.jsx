import { CheckCircle, XCircle } from "lucide-react";

export function CICDTimeline({ iterations }) {
    return (
        <section
            className="bg-card rounded-xl border border-border shadow-card p-6 fade-in-up"
            style={{ animationDelay: "0.15s" }}
            aria-labelledby="timeline-heading"
        >
            <h2 id="timeline-heading" className="text-lg font-semibold text-foreground mb-1">
                CI/CD Timeline
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
                Iteration-by-iteration execution log
            </p>

            <ol className="relative" aria-label="CI/CD iteration timeline">
                {iterations.map((iter, i) => {
                    const isPassed = iter.status === "PASSED";
                    const isLast = i === iterations.length - 1;

                    return (
                        <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                            {/* Vertical line */}
                            {!isLast && (
                                <div
                                    className="absolute left-[10px] top-6 bottom-0 w-px bg-border"
                                    aria-hidden="true"
                                />
                            )}

                            {/* Icon */}
                            <div
                                className={`relative z-10 flex shrink-0 items-center justify-center w-5 h-5 rounded-full mt-0.5 ${isPassed
                                        ? "bg-success-bg ring-2 ring-success/20"
                                        : "bg-danger-bg ring-2 ring-danger/20"
                                    }`}
                                aria-hidden="true"
                            >
                                {isPassed ? (
                                    <CheckCircle size={12} className="text-success" />
                                ) : (
                                    <XCircle size={12} className="text-danger" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="text-sm font-semibold text-foreground">
                                        Iteration {iter.iteration}/{iter.total}
                                    </span>
                                    <span
                                        className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full ${isPassed
                                                ? "bg-success-bg text-success border border-success-border"
                                                : "bg-danger-bg text-danger border border-danger-border"
                                            }`}
                                    >
                                        {iter.status}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">{iter.message}</p>
                                <time
                                    className="text-xs font-mono text-muted-foreground/70"
                                    dateTime={iter.timestamp}
                                >
                                    {iter.timestamp}
                                </time>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
