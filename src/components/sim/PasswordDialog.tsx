import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { OptionPopup } from "@/components/sim/OptionPopup";
import { checkExercisePassword } from "@/lib/ejercicios.functions";

/** Pide la contraseña del docente; se comprueba en el servidor. */
export function PasswordDialog({ onOk, onClose, subtitle = "Introduce la contraseña para crear o eliminar ejercicios." }: { onOk: (pw: string) => void; onClose: () => void; subtitle?: string | undefined }) {
  const check = useServerFn(checkExercisePassword);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await check({ data: { password: value } });
    if (r.ok) onOk(value); else setError(true);
  };
  return <OptionPopup onClose={onClose} content={{ title: "Acceso de docente", subtitle, body:
    <form onSubmit={e => void submit(e)} className="grid gap-3">
      <input autoFocus type="password" autoComplete="off" value={value} onChange={e => { setValue(e.target.value); setError(false); }} aria-label="Contraseña" className="h-12 rounded-md border bg-background px-3 text-base" />
      {error && <p className="text-sm text-destructive">Contraseña incorrecta</p>}
      <Button type="submit" className="h-12 bg-run text-run-foreground">Entrar</Button>
    </form> }} />;
}
