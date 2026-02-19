import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Bot } from "lucide-react";

const NotFound = () => {
    const location = useLocation();

    useEffect(() => {
        console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }, [location.pathname]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
            <div
                className="glow-orb w-[400px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ background: "hsl(217 91% 60% / 0.08)" }}
            />
            <div className="relative text-center fade-in">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
                    <Bot size={24} className="text-primary" />
                </div>
                <h1 className="mb-3 text-6xl font-extrabold text-foreground tracking-tight">404</h1>
                <p className="mb-6 text-lg text-muted-foreground">Oops! This page doesn't exist.</p>
                <a
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold
            hover:bg-primary-hover transition-all duration-150"
                >
                    Return to Home
                </a>
            </div>
        </div>
    );
};

export default NotFound;
