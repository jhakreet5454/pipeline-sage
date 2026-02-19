export function StatusBadge({ status, size = "md" }) {
    const isPassed = status === "PASSED";
    const base =
        "inline-flex items-center gap-1.5 font-semibold rounded-full tracking-wide";
    const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-xs px-3 py-1";
    const colorClass = isPassed
        ? "bg-success-bg text-success border border-success-border"
        : "bg-danger-bg text-danger border border-danger-border";

    return (
        <span className={`${base} ${sizeClass} ${colorClass}`} aria-label={`Status: ${status}`}>
            <span
                className={`w-1.5 h-1.5 rounded-full ${isPassed ? "bg-success" : "bg-danger"}`}
                aria-hidden="true"
            />
            {status}
        </span>
    );
}
