import { CheckCircle, XCircle } from "lucide-react";

const bugTypeColors = {
    LINTING: "bg-warning-bg text-warning border-warning/30",
    SYNTAX: "bg-danger-bg text-danger border-danger-border",
    LOGIC: "bg-[hsl(250_100%_96%)] text-[hsl(250_60%_50%)] border-[hsl(250_60%_85%)] dark:bg-[hsl(250_40%_14%)] dark:text-[hsl(250_60%_70%)] dark:border-[hsl(250_40%_30%)]",
    TYPE_ERROR: "bg-[hsl(25_100%_96%)] text-[hsl(25_80%_45%)] border-[hsl(25_80%_80%)] dark:bg-[hsl(25_60%_14%)] dark:text-[hsl(25_80%_65%)] dark:border-[hsl(25_50%_30%)]",
    IMPORT: "bg-success-bg text-success border-success-border",
    INDENTATION: "bg-secondary text-secondary-foreground border-border",
};

function BugTypeBadge({ type }) {
    return (
        <span
            className={`inline-flex text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded border ${bugTypeColors[type]}`}
        >
            {type}
        </span>
    );
}

export function FixesTable({ fixes }) {
    return (
        <section
            className="bg-card rounded-xl border border-border shadow-card fade-in-up overflow-hidden"
            style={{ animationDelay: "0.1s" }}
            aria-labelledby="fixes-heading"
        >
            <div className="p-6 border-b border-border">
                <h2 id="fixes-heading" className="text-lg font-semibold text-foreground mb-1">
                    Fixes Applied
                </h2>
                <p className="text-sm text-muted-foreground">
                    {fixes.filter((f) => f.status === "PASSED").length} of {fixes.length} fixes
                    successfully applied
                </p>
            </div>

            {/* Desktop table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm hidden sm:table" aria-label="Fixes applied table">
                    <thead>
                        <tr className="border-b border-border bg-secondary/40">
                            <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                File
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Bug Type
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Line
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Commit
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {fixes.map((fix, i) => (
                            <tr
                                key={i}
                                className={`border-b border-border/60 transition-colors hover:bg-secondary/30 ${fix.status === "FAILED" ? "bg-danger-bg/30" : ""
                                    }`}
                            >
                                <td className="px-6 py-3.5">
                                    <span className="font-mono text-xs text-foreground">{fix.file}</span>
                                </td>
                                <td className="px-4 py-3.5">
                                    <BugTypeBadge type={fix.bugType} />
                                </td>
                                <td className="px-4 py-3.5">
                                    <span className="font-mono text-xs text-muted-foreground">:{fix.line}</span>
                                </td>
                                <td className="px-4 py-3.5">
                                    <span className="text-xs text-muted-foreground truncate max-w-[260px] block">
                                        {fix.commitMessage}
                                    </span>
                                </td>
                                <td className="px-4 py-3.5">
                                    {fix.status === "PASSED" ? (
                                        <span className="flex items-center gap-1.5 text-success text-xs font-semibold">
                                            <CheckCircle size={13} aria-hidden="true" />
                                            Passed
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-danger text-xs font-semibold">
                                            <XCircle size={13} aria-hidden="true" />
                                            Failed
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-border">
                    {fixes.map((fix, i) => (
                        <div key={i} className={`p-4 ${fix.status === "FAILED" ? "bg-danger-bg/30" : ""}`}>
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <span className="font-mono text-xs text-foreground font-medium">{fix.file}</span>
                                {fix.status === "PASSED" ? (
                                    <CheckCircle size={15} className="text-success shrink-0 mt-0.5" aria-label="Passed" />
                                ) : (
                                    <XCircle size={15} className="text-danger shrink-0 mt-0.5" aria-label="Failed" />
                                )}
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <BugTypeBadge type={fix.bugType} />
                                <span className="font-mono text-xs text-muted-foreground">line {fix.line}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{fix.commitMessage}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
