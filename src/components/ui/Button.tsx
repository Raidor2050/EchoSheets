import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline" | "danger" | "success";
  size?: "sm" | "md";
  children: ReactNode;
}

const variants: Record<string, string> = {
  primary: "bg-accent text-black hover:bg-accent-hover active:translate-y-px font-medium",
  success: "bg-success text-black hover:brightness-110 active:translate-y-px font-medium",
  danger: "bg-transparent border border-danger/40 text-danger-fg hover:bg-danger/10",
  ghost: "text-text-2 hover:text-text-1 hover:bg-surface-3",
  outline:
    "border border-line bg-transparent text-text-1 hover:border-line-strong hover:bg-surface-2",
};

export function Button({
  variant = "outline",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-sm transition-colors duration-100 cursor-pointer select-none disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap",
        size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3.5",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-line bg-surface-2 px-1 font-mono text-[10px] leading-none text-text-2">
      {children}
    </kbd>
  );
}
