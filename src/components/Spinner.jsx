const sizes = {
    sm: "w-4 h-4 border-[1.5px]",
    md: "w-5 h-5 border-2",
    lg: "w-7 h-7 border-2",
};

export function Spinner({ size = "md", label }) {
    return (
        <div className="flex items-center gap-2.5" role="status" aria-label={label ?? "Loading"}>
            <div
                className={`${sizes[size]} rounded-full border-primary/20 border-t-primary animate-spin`}
                style={{ animation: "spin 0.75s linear infinite" }}
                aria-hidden="true"
            />
            {label && (
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
            )}
        </div>
    );
}
