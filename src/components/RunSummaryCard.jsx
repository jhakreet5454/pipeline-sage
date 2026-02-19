import { StatusBadge } from "./StatusBadge";
import {
    GitBranch,
    Users,
    User,
    Link,
    AlertCircle,
    CheckCircle,
    Clock,
} from "lucide-react";

function MetaItem({ icon, label, value, mono }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {label}
            </span>
            <div className="flex items-center gap-2">
                <span className="text-muted-foreground" aria-hidden="true">
                    {icon}
                </span>
                <span
                    className={`text-sm font-medium text-foreground ${mono ? "font-mono text-xs" : ""}`}
                >
                    {value}
                </span>
            </div>
        </div>
    );
}

export function RunSummaryCard({ result }) {
    return (
        <section
            className="bg-card rounded-xl border border-border shadow-card p-6 fade-in-up"
            aria-labelledby="summary-heading"
        >
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
                <div>
                    <h2
                        id="summary-heading"
                        className="text-lg font-semibold text-foreground mb-1"
                    >
                        Run Summary
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        AI agent execution report
                    </p>
                </div>
                <StatusBadge status={result.cicdStatus} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                <MetaItem
                    icon={<Link size={14} />}
                    label="Repository"
                    value={
                        <a
                            href={result.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate max-w-[200px] block"
                            title={result.repoUrl}
                        >
                            {result.repoUrl.replace("https://github.com/", "")}
                        </a>
                    }
                />
                <MetaItem
                    icon={<Users size={14} />}
                    label="Team Name"
                    value={result.teamName}
                />
                <MetaItem
                    icon={<User size={14} />}
                    label="Team Leader"
                    value={result.leaderName}
                />
                <MetaItem
                    icon={<GitBranch size={14} />}
                    label="Branch"
                    value={result.branchName}
                    mono
                />
                <MetaItem
                    icon={<Clock size={14} />}
                    label="Time Taken"
                    value={`${result.timeTaken} minutes`}
                />
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Results
                    </span>
                    <div className="flex items-center gap-4 mt-0.5">
                        <div className="flex items-center gap-1.5">
                            <AlertCircle size={14} className="text-danger" aria-hidden="true" />
                            <span className="text-sm font-medium text-foreground">
                                {result.totalFailures}{" "}
                                <span className="text-muted-foreground font-normal">failures</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <CheckCircle size={14} className="text-success" aria-hidden="true" />
                            <span className="text-sm font-medium text-foreground">
                                {result.totalFixes}{" "}
                                <span className="text-muted-foreground font-normal">fixes</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
