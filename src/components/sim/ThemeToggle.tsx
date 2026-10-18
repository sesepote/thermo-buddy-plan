/** Botón táctil para alternar entre el tema oscuro (por defecto) y el claro. */
import { Moon, Sun } from "lucide-react";
import { useApp } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string | undefined }) {
  const theme = useApp((s) => s.theme);
  const toggle = useApp((s) => s.toggleTheme);
  const t = useT();
  const light = theme === "light";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? t.common.toDark : t.common.toLight}
      className={cn("hw-key flex size-12 shrink-0 items-center justify-center rounded-md", className)}
    >
      {light ? <Moon className="size-5" /> : <Sun className="size-5" />}
    </button>
  );
}
