import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/utils";

const MenuCtx = createContext<{ close: () => void }>({ close: () => {} });

export function useMenuClose() {
  return useContext(MenuCtx).close;
}

function useClickOutside(onOutside: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      onOutside();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOutside();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", key);
    };
  }, [onOutside, ref]);
}

interface MenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
  menuClassName?: string;
}

export function Menu({
  trigger,
  children,
  align = "left",
  className,
  menuClassName,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  useClickOutside(() => setOpen(false), ref);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <MenuCtx.Provider value={{ close: () => setOpen(false) }}>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.1 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "absolute z-50 mt-1 min-w-[200px] rounded-md border border-line bg-surface-2 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.6)]",
                align === "right" ? "right-0" : "left-0",
                menuClassName,
              )}
            >
              {children}
            </motion.div>
          </MenuCtx.Provider>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MenuItem({
  children,
  onSelect,
  disabled,
  danger,
  accent,
  hint,
}: {
  children: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
  accent?: boolean;
  hint?: string;
}) {
  const { close } = useContext(MenuCtx);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        close();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-left text-[12.5px] text-text-2",
        "cursor-pointer hover:bg-surface-3 hover:text-text-1 disabled:opacity-40 disabled:pointer-events-none",
        danger && "text-danger-fg hover:bg-danger/10 hover:text-danger-fg",
        accent && "text-accent hover:bg-accent-muted hover:text-accent",
      )}
    >
      {children}
      {hint && (
        <span className="ml-auto shrink-0 pl-4 text-[10.5px] text-text-3">{hint}</span>
      )}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-line-subtle" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-text-3">
      {children}
    </div>
  );
}
