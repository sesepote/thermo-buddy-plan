import { useState } from "react";
import { useTr } from "@/lib/i18n/tr";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { OptionPopup } from "@/components/sim/OptionPopup";
import { loginTeacher, changeTeacherPassword } from "@/lib/docentes.functions";
import { useTeacher } from "@/lib/teacher-session";
import type { Credentials } from "@/lib/docentes.types";

const field = "h-12 rounded-md border bg-background px-3 text-base text-foreground";

/** El acceso no publica nombres ni permite enumerar las cuentas docentes. */
export function PasswordDialog({ onOk, onClose, subtitle }: { onOk?: (auth: Credentials) => void; onClose: () => void; subtitle?: string | undefined }) {
  const check = useServerFn(loginTeacher);
  const login = useTeacher(s => s.login);
  const tr = useTr();
  const [user, setUser] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = { user, password: value };
    const r = await check({ data: auth });
    if (!r.ok) return setError(true);
    login({ user: r.usuario, password: value }, r.nombre);
    onOk?.({ user: r.usuario, password: value });
  };
  return <OptionPopup onClose={onClose} content={{ title: tr("Acceso de docente"), subtitle: subtitle ?? tr("Identifícate para crear, editar o eliminar ejercicios."), body:
    <form onSubmit={e => void submit(e)} className="grid gap-3">
      <input autoFocus type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={tr("Usuario")} aria-label={tr("Usuario")} value={user} onChange={e => { setUser(e.target.value); setError(false); }} className={field} required />
      <input type="password" autoComplete="off" placeholder={tr("Contraseña")} value={value} onChange={e => { setValue(e.target.value); setError(false); }} aria-label={tr("Contraseña")} className={field} required />
      {error && <p className="text-sm text-destructive">{tr("Usuario o contraseña incorrectos")}</p>}
      <Button type="submit" className="h-12 bg-run text-run-foreground">{tr("Entrar")}</Button>
    </form> }} />;
}

/** Cambio de contraseña del docente con sesión iniciada. */
export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const change = useServerFn(changeTeacherPassword);
  const { auth, login, nombre } = useTeacher();
  const tr = useTr();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return onClose();
    if (next !== repeat) return setMsg({ ok: false, text: "Las contraseñas nuevas no coinciden" });
    const r = await change({ data: { auth: { user: auth.user, password: current }, next } });
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    login({ user: auth.user, password: next }, nombre);
    setMsg({ ok: true, text: "Contraseña cambiada" });
  };
  return <OptionPopup onClose={onClose} content={{ title: tr("Cambiar contraseña"), subtitle: nombre, body:
    <form onSubmit={e => void submit(e)} className="grid gap-3">
      <input type="password" autoComplete="off" placeholder={tr("Contraseña actual")} aria-label={tr("Contraseña actual")} value={current} onChange={e => setCurrent(e.target.value)} className={field} />
      <input type="password" autoComplete="off" placeholder={tr("Nueva contraseña (mín. 6)")} aria-label={tr("Nueva contraseña")} value={next} onChange={e => setNext(e.target.value)} className={field} />
      <input type="password" autoComplete="off" placeholder={tr("Repite la nueva contraseña")} aria-label={tr("Repite la nueva contraseña")} value={repeat} onChange={e => setRepeat(e.target.value)} className={field} />
      {msg && <p role="status" className={msg.ok ? "text-sm text-run" : "text-sm text-destructive"}>{tr(msg.text)}</p>}
      <Button type="submit" className="h-12 bg-run text-run-foreground" disabled={!current || !next}>{tr("Guardar")}</Button>
    </form> }} />;
}
