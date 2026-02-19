import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
    const [dark, setDark] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("theme");
            if (saved) return saved === "dark";
            return window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
        return true;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (dark) {
            root.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            root.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [dark]);

    return (
        <button
            onClick={() => setDark((d) => !d)}
            className="relative w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center
        text-muted-foreground hover:text-foreground hover:border-primary/30
        transition-all duration-200 cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
            <Sun
                size={15}
                className={`absolute transition-all duration-300 ${dark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
                    }`}
            />
            <Moon
                size={15}
                className={`absolute transition-all duration-300 ${dark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
                    }`}
            />
        </button>
    );
}
