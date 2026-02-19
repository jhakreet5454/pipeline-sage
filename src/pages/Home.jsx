import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext, generateMockResult } from "@/context/AppContext";
import { Spinner } from "@/components/Spinner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Bot, Github, Users, User, ArrowRight, Zap, ArrowLeft } from "lucide-react";

function InputField({ id, label, placeholder, value, onChange, icon, type = "text", required = true }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-medium text-foreground">
                {label}
            </label>
            <div className="relative">
                <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                >
                    {icon}
                </span>
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    required={required}
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm
            placeholder:text-muted-foreground/60
            focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
            transition-all duration-150 disabled:opacity-50"
                />
            </div>
        </div>
    );
}

export default function Home() {
    const { setResult, isLoading, setIsLoading } = useAppContext();
    const navigate = useNavigate();

    const [repoUrl, setRepoUrl] = useState("");
    const [teamName, setTeamName] = useState("");
    const [leaderName, setLeaderName] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!repoUrl || !teamName || !leaderName) {
            setError("All fields are required.");
            return;
        }

        if (!repoUrl.startsWith("https://github.com/")) {
            setError('Repository URL must start with "https://github.com/"');
            return;
        }

        setIsLoading(true);

        try {
            await new Promise((res) => setTimeout(res, 2400));
            const mockResult = generateMockResult(repoUrl, teamName, leaderName);
            setResult(mockResult);
            navigate("/results");
        } catch (err) {
            setError("Failed to connect to the agent. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
            {/* Background glows */}
            <div
                className="glow-orb w-[500px] h-[500px] top-0 right-0"
                style={{ background: "hsl(217 91% 60% / 0.08)" }}
            />
            <div
                className="glow-orb w-[400px] h-[400px] bottom-0 left-0"
                style={{ background: "hsl(280 80% 65% / 0.06)" }}
            />
            <div className="absolute inset-0 grid-bg opacity-30 dark:opacity-10" />

            {/* Top bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
                <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
                    <button
                        onClick={() => navigate("/")}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={14} />
                        Back
                    </button>
                    <ThemeToggle />
                </div>
            </div>

            {/* Header */}
            <div className="relative fade-in text-center mb-10 max-w-md z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-6 float">
                    <Bot size={24} className="text-primary" aria-hidden="true" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-3">
                    HealFlow <span className="gradient-text">AI</span>
                </h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                    Autonomous DevOps agent that detects, fixes, and commits code issues
                    directly to your repository.
                </p>
            </div>

            {/* Form card */}
            <div className="relative fade-in-up w-full max-w-md z-10" style={{ animationDelay: "0.1s" }}>
                <div className="bg-card border border-border rounded-2xl shadow-lg p-8">
                    <form onSubmit={handleSubmit} noValidate aria-label="Run HealFlow AI agent">
                        <div className="space-y-4">
                            <InputField
                                id="repo-url"
                                label="GitHub Repository URL"
                                placeholder="https://github.com/user/repo"
                                value={repoUrl}
                                onChange={setRepoUrl}
                                icon={<Github size={15} />}
                                type="url"
                            />
                            <InputField
                                id="team-name"
                                label="Team Name"
                                placeholder="RIFT ORGANISERS"
                                value={teamName}
                                onChange={setTeamName}
                                icon={<Users size={15} />}
                            />
                            <InputField
                                id="leader-name"
                                label="Team Leader Name"
                                placeholder="Saiyam Kumar"
                                value={leaderName}
                                onChange={setLeaderName}
                                icon={<User size={15} />}
                            />
                        </div>

                        {/* Branch preview */}
                        {teamName && leaderName && (
                            <div className="mt-5 px-4 py-3 rounded-xl bg-secondary/60 border border-border fade-in">
                                <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                                    Branch will be created as:
                                </p>
                                <code className="text-xs font-mono text-primary font-semibold break-all">
                                    {`${teamName}_${leaderName}_AI_Fix`.toUpperCase().replace(/\s+/g, "_")}
                                </code>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div
                                role="alert"
                                className="mt-4 px-4 py-3 rounded-xl bg-danger-bg border border-danger-border text-danger text-sm fade-in"
                            >
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mt-7 w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl
                bg-primary text-primary-foreground text-sm font-bold
                hover:bg-primary-hover hover:shadow-glow active:scale-[0.98]
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 cursor-pointer"
                            aria-busy={isLoading}
                            aria-label={isLoading ? "Running agent, please wait" : "Run AI agent"}
                        >
                            {isLoading ? (
                                <Spinner size="sm" label="Analyzing..." />
                            ) : (
                                <>
                                    <Zap size={15} aria-hidden="true" />
                                    Run Agent
                                    <ArrowRight size={15} aria-hidden="true" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-6">
                    Results are generated using our autonomous fix engine.{" "}
                    <span className="inline-flex items-center gap-1 text-primary font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Mock mode active
                    </span>
                </p>
            </div>
        </main>
    );
}
