/**
 * Ventana emergente táctil: muestra opciones o campos extra sin saturar la
 * pantalla principal. Se cierra tocando fuera del panel o el botón de cierre.
 */
import { useTr } from "@/lib/i18n/tr";
import { X } from "lucide-react";

export interface PopupContent {
  title: string;
  subtitle?: string | undefined;
  /**
   * Contenido del panel. Debe construirse en el render del componente que
   * abre la ventana (no guardarse ya montado en el estado), para que los
   * valores mostrados se actualicen con cada cambio.
   */
  body: React.ReactNode;
}

export function OptionPopup({ content, onClose }: { content: PopupContent; onClose: () => void }) {
  const tr = useTr();
  return (
    // Fondo oscurecido: tocar fuera cierra, como en cualquier ventana táctil.
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-xl border bg-panel p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">{content.title}</h2>
            {content.subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{content.subtitle}</p>}
          </div>
          <button className="hw-key flex size-11 shrink-0 items-center justify-center rounded-md" onClick={onClose} aria-label={tr("Cerrar")}>
            <X className="size-5" />
          </button>
        </div>
        {content.body}
        <button className="hw-key flex min-h-12 items-center justify-center rounded-md text-base font-medium" onClick={onClose}>
          Hecho
        </button>
      </div>
    </div>
  );
}
