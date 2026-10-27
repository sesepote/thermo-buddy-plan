/** Botón de silencio para los vídeos de las animaciones de ejercicios. */
import { Volume2, VolumeX } from "lucide-react";
import { useApp } from "@/lib/store";
import { useT } from "@/lib/i18n";

export function SoundToggle() {
  const muted = useApp((s) => s.muted);
  const toggle = useApp((s) => s.toggleMuted);
  const t = useT();
  return (
    <button type="button" onClick={toggle} aria-pressed={muted} aria-label={muted ? t.common.unmute : t.common.mute}
      className="hw-key flex size-12 shrink-0 items-center justify-center rounded-md">
      {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
    </button>
  );
}
