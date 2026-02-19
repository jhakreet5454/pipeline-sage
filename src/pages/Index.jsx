import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
    Bot,
    ArrowRight,
    Zap,
    Shield,
    GitBranch,
    CheckCircle2,
    Terminal,
    Clock,
    BarChart3,
    Sparkles,
    Code2,
    Cpu,
} from "lucide-react";

/* ─── Terminal animation lines ─────────────────────────────────────── */
const terminalLines = [
    { type: "prompt", text: "$ healflow scan --repo github.com/team/project" },
    { type: "output", text: "⠋ Cloning repository..." },
    { type: "output", text: "⠙ Scanning 342 files across 18 modules..." },
    { type: "error", text: "✗ Found 7 issues in 5 files" },
    { type: "info", text: "  → SYNTAX   src/validator.py:8" },
    { type: "info", text: "  → IMPORT   src/utils/parser.py:3" },
    { type: "info", text: "  → TYPE     src/models/user.py:42" },
    { type: "info", text: "  → LOGIC    src/api/routes.py:115" },
    { type: "output", text: "" },
    { type: "prompt", text: "$ healflow fix --auto --branch AI_Fix" },
    { type: "output", text: "⠋ Generating targeted fixes..." },
    { type: "success", text: "✓ Fix 1/7 — add missing colon (validator.py)" },
    { type: "success", text: "✓ Fix 2/7 — correct import path (parser.py)" },
    { type: "success", text: "✓ Fix 3/7 — resolve type mismatch (user.py)" },
    { type: "success", text: "✓ Fix 4/7 — correct conditional logic (routes.py)" },
    { type: "output", text: "" },
    { type: "prompt", text: "$ healflow verify --cicd" },
    { type: "success", text: "✓ CI/CD Pipeline — ALL TESTS PASSED" },
    { type: "success", text: "✓ Score: 106/120 — Speed bonus +10" },
];

function TerminalAnimation() {
    const [visibleLines, setVisibleLines] = useState([]);
    const bodyRef = useRef(null);

    useEffect(() => {
        let i = 0;
        let resetTimeout = null;

        const interval = setInterval(() => {
            if (i < terminalLines.length) {
                const line = terminalLines[i];
                i++;
                setVisibleLines((prev) => [...prev, line]);
            } else if (!resetTimeout) {
                // Only schedule ONE reset per cycle
                resetTimeout = setTimeout(() => {
                    setVisibleLines([]);
                    i = 0;
                    resetTimeout = null;
                }, 3000);
            }
        }, 350);

        return () => {
            clearInterval(interval);
            if (resetTimeout) clearTimeout(resetTimeout);
        };
    }, []);

    useEffect(() => {
        if (bodyRef.current) {
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
    }, [visibleLines]);

    return (
        <div className="terminal shadow-2xl max-w-lg w-full mx-auto">
            <div className="terminal-header">
                <div className="terminal-dot" style={{ background: "#ff5f57" }} />
                <div className="terminal-dot" style={{ background: "#febc2e" }} />
                <div className="terminal-dot" style={{ background: "#28c840" }} />
                <span className="ml-3 text-xs text-[hsl(210_10%_45%)] font-mono">
                    healflow — zsh
                </span>
            </div>
            <div className="terminal-body" ref={bodyRef} style={{ maxHeight: 280, overflowY: "auto" }}>
                {visibleLines.filter(Boolean).map((line, i) => (
                    <div key={i} className="terminal-line" style={{ animationDelay: `${i * 0.05}s` }}>
                        {line.type === "prompt" && (
                            <span>
                                <span className="terminal-prompt">❯ </span>
                                <span className="terminal-command">{line.text.replace("$ ", "")}</span>
                            </span>
                        )}
                        {line.type === "output" && (
                            <span className="terminal-output">{line.text || "\u00A0"}</span>
                        )}
                        {line.type === "success" && (
                            <span className="terminal-success">{line.text}</span>
                        )}
                        {line.type === "error" && (
                            <span className="terminal-error">{line.text}</span>
                        )}
                        {line.type === "info" && (
                            <span className="terminal-info">{line.text}</span>
                        )}
                    </div>
                ))}
                <span className="inline-block w-2 h-4 bg-primary/70 ml-0.5 animate-pulse" />
            </div>
        </div>
    );
}

/* ─── Features config ──────────────────────────────────────────────── */
const features = [
    {
        icon: <Terminal size={20} />,
        title: "Auto-Detect Issues",
        desc: "Scans your repo for syntax, logic, type, linting, and import errors automatically.",
        gradient: "from-blue-500/10 to-cyan-500/10",
    },
    {
        icon: <Zap size={20} />,
        title: "Instant Fixes",
        desc: "Generates targeted commits that resolve each issue with minimal code changes.",
        gradient: "from-amber-500/10 to-orange-500/10",
    },
    {
        icon: <GitBranch size={20} />,
        title: "Branch & Commit",
        desc: "Creates a dedicated branch and pushes fixes directly — no manual intervention.",
        gradient: "from-purple-500/10 to-pink-500/10",
    },
    {
        icon: <Shield size={20} />,
        title: "CI/CD Validation",
        desc: "Iterates until your pipeline passes, verifying every fix against your test suite.",
        gradient: "from-emerald-500/10 to-green-500/10",
    },
    {
        icon: <Clock size={20} />,
        title: "Speed Scoring",
        desc: "Earn bonus points for fast resolution. Under 5 minutes? That's a +10 speed bonus.",
        gradient: "from-rose-500/10 to-red-500/10",
    },
    {
        icon: <BarChart3 size={20} />,
        title: "Detailed Reports",
        desc: "Get a full breakdown of fixes, scores, and CI/CD timeline for every run.",
        gradient: "from-indigo-500/10 to-violet-500/10",
    },
];

const steps = [
    {
        num: "01",
        title: "Paste your repo URL",
        desc: "Enter a GitHub repository link along with your team details.",
        icon: <Code2 size={18} />,
    },
    {
        num: "02",
        title: "Run the agent",
        desc: "Our AI scans the codebase, identifies issues, and generates fixes.",
        icon: <Cpu size={18} />,
    },
    {
        num: "03",
        title: "Review results",
        desc: "See every fix, your score breakdown, and the full CI/CD timeline.",
        icon: <BarChart3 size={18} />,
    },
];

const stats = [
    { value: "7+", label: "Bug types detected" },
    { value: "<5m", label: "Average fix time" },
    { value: "100+", label: "Base score" },
    { value: "99%", label: "CI/CD pass rate" },
];

/* ─── Main Component ──────────────────────────────────────────────── */
export default function Index() {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
            {/* ─── Navbar ─────────────────────────────────────────────── */}
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                    ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-sm"
                    : "bg-transparent border-b border-transparent"
                    }`}
            >
                <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Bot size={16} className="text-primary" />
                        </div>
                        <span className="font-bold text-sm tracking-tight">
                            HealFlow <span className="text-primary">AI</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <button
                            onClick={() => navigate("/run")}
                            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold
                hover:bg-primary-hover active:scale-[0.97] transition-all duration-150 cursor-pointer"
                        >
                            <Zap size={14} />
                            Launch Agent
                        </button>
                    </div>
                </div>
            </nav>

            {/* ─── Hero ───────────────────────────────────────────────── */}
            <section className="relative pt-36 pb-24 px-6 overflow-hidden">
                {/* Background effects */}
                <div className="absolute inset-0 grid-bg opacity-40 dark:opacity-20" />
                <div
                    className="glow-orb w-[500px] h-[500px] -top-40 -right-20"
                    style={{ background: "hsl(217 91% 60% / 0.15)" }}
                />
                <div
                    className="glow-orb w-[400px] h-[400px] top-40 -left-40"
                    style={{ background: "hsl(280 80% 65% / 0.1)" }}
                />

                <div className="relative max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        {/* Left — Text */}
                        <div className="fade-in">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-7">
                                <Sparkles size={12} />
                                Autonomous DevOps Agent
                            </div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
                                Fix code issues
                                <br />
                                <span className="gradient-text">before they fix you.</span>
                            </h1>

                            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-lg mb-8">
                                HealFlow AI scans your GitHub repository, detects failures, applies
                                targeted fixes, and validates everything through your CI/CD pipeline —{" "}
                                <span className="text-foreground font-medium">autonomously.</span>
                            </p>

                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => navigate("/run")}
                                    className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold
                    hover:bg-primary-hover hover:shadow-glow active:scale-[0.97] transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 cursor-pointer"
                                >
                                    <Zap size={16} />
                                    Run Agent Now
                                    <ArrowRight
                                        size={16}
                                        className="transition-transform duration-200 group-hover:translate-x-0.5"
                                    />
                                </button>
                                <a
                                    href="#how-it-works"
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-sm font-medium
                    text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-secondary/50
                    transition-all duration-200"
                                >
                                    How it works
                                </a>
                            </div>

                            {/* Trust indicators */}
                            <div className="flex items-center gap-4 mt-8 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle2 size={12} className="text-success" />
                                    No setup required
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle2 size={12} className="text-success" />
                                    Works with any repo
                                </span>
                                <span className="flex items-center gap-1.5 hidden sm:flex">
                                    <CheckCircle2 size={12} className="text-success" />
                                    Real-time results
                                </span>
                            </div>
                        </div>

                        {/* Right — Terminal */}
                        <div className="fade-in-up hidden lg:block" style={{ animationDelay: "0.2s" }}>
                            <div className="relative">
                                <div
                                    className="glow-orb w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                    style={{ background: "hsl(217 91% 60% / 0.12)" }}
                                />
                                <TerminalAnimation />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Stats bar ──────────────────────────────────────────── */}
            <section className="border-y border-border bg-card/50">
                <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
                    {stats.map((stat, i) => (
                        <div
                            key={stat.label}
                            className="py-8 px-4 text-center fade-in-up"
                            style={{ animationDelay: `${i * 0.08}s` }}
                        >
                            <p className="text-3xl font-extrabold text-foreground mb-1">{stat.value}</p>
                            <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── Features ───────────────────────────────────────────── */}
            <section className="py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-14">
                        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                            Capabilities
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                            Everything your pipeline needs
                        </h2>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto">
                            From detection to deployment, HealFlow handles the entire fix lifecycle.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {features.map((f, i) => (
                            <div
                                key={f.title}
                                className={`group relative p-6 rounded-2xl border border-border bg-card
                  hover:border-primary/30 hover:shadow-lg hover:-translate-y-1
                  transition-all duration-300 fade-in-up overflow-hidden cursor-default`}
                                style={{ animationDelay: `${i * 0.06}s` }}
                            >
                                {/* Gradient background on hover */}
                                <div
                                    className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                                />
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4
                    group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300">
                                        {f.icon}
                                    </div>
                                    <h3 className="text-sm font-semibold mb-2">{f.title}</h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── How it works ───────────────────────────────────────── */}
            <section
                id="how-it-works"
                className="py-24 px-6 bg-card/50 border-y border-border relative overflow-hidden"
            >
                <div
                    className="glow-orb w-[400px] h-[400px] -bottom-40 right-0"
                    style={{ background: "hsl(142 71% 45% / 0.08)" }}
                />
                <div className="relative max-w-3xl mx-auto">
                    <div className="text-center mb-14">
                        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                            Workflow
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                            Three steps. Zero hassle.
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            Get from broken build to green pipeline in minutes.
                        </p>
                    </div>
                    <div className="space-y-5">
                        {steps.map((s, i) => (
                            <div
                                key={s.num}
                                className="group flex gap-5 items-start p-6 rounded-2xl border border-border bg-card
                  hover:border-primary/25 hover:shadow-md transition-all duration-300 fade-in-up"
                                style={{ animationDelay: `${i * 0.1}s` }}
                            >
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 shrink-0
                  group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                                    <span className="text-primary group-hover:text-primary-foreground transition-colors">
                                        {s.icon}
                                    </span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <span className="text-xs font-mono font-bold text-primary/40">{s.num}</span>
                                        <h3 className="text-sm font-bold">{s.title}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── CTA ─────────────────────────────────────────────────── */}
            <section className="py-28 px-6 relative overflow-hidden">
                <div
                    className="glow-orb w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ background: "hsl(217 91% 60% / 0.08)" }}
                />
                <div className="relative max-w-2xl mx-auto text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
                        <Bot size={24} className="text-primary" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                        Ready to heal your codebase?
                    </h2>
                    <p className="text-muted-foreground text-base mb-8 max-w-md mx-auto">
                        Paste a repo, hit run, and let the agent handle the rest. No configuration needed.
                    </p>
                    <button
                        onClick={() => navigate("/run")}
                        className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold
              hover:bg-primary-hover hover:shadow-glow active:scale-[0.97] transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 cursor-pointer"
                    >
                        <Sparkles size={16} />
                        Launch HealFlow AI
                        <ArrowRight
                            size={16}
                            className="transition-transform duration-200 group-hover:translate-x-1"
                        />
                    </button>
                </div>
            </section>

            {/* ─── Footer ──────────────────────────────────────────────── */}
            <footer className="border-t border-border py-8 px-6 bg-card/30">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Bot size={14} className="text-primary" />
                        <span>© 2026 HealFlow AI — Built for autonomous DevOps.</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Mock mode active
                    </span>
                </div>
            </footer>
        </div>
    );
}
