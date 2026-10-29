import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { OptionPopup } from "@/components/sim/OptionPopup";
import { listTeachers, loginTeacher, changeTeacherPassword } from "@/lib/docentes.functions";
import { useTeacher } from "@/lib/teacher-session";
import type { Credentials } from "@/lib/docentes.server";

const field = "h-12 rounded-md border bg-background px-3 text-base text-foreground";

/** Inicio de sesión docente: elige su nombre y escribe su contraseña (se comprueba en el servidor). */
export function PasswordDialog({ onOk, onClose, subtitle = "Identifícate para crear, editar o eliminar ejercicios." }: { onOk?: (auth: Credentials) => void; onClose: () => void; subtitle?: string | undefined }) {
  const list = useServerFn(listTeachers);
  const check = useServerFn(loginTeacher);
  const login = useTeacher(s => s.login);
  const [teachers, setTeachers] = useState<{ usuario: string; nombre: string }[]>([]);
  const [user, setUser] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => { void list().then(t => { setTeachers(t); setUser(u => u || t[0]?.usuario || ""); }); }, [list]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = { user, password: value };
    const r = await check({ data: auth });
    if (!r.ok) return setError(true);
    login({ user: r.usuario, password: value }, r.nombre);
    onOk?.({ user: r.usuario, password: value });
  };
  return <OptionPopup onClose={onClose} content={{ title: "Acceso de docente", subtitle, body:
    <form onSubmit={e => void submit(e)} className="grid gap-3">
      <select aria-label="Docente" value={user} onChange={e => { setUser(e.target.value); setError(false); }} className={field}>
        {teachers.map(t => <option key={t.usuario} value={t.usuario}>{t.nombre}</option>)}
      </select>
      <input autoFocus type="password" autoComplete="off" value={value} onChange={e => { setValue(e.target.value); setError(false); }} aria-label="Contraseña" className={field} />
      {error && <p className="text-sm text-destructive">Usuario o contraseña incorrectos</p>}
      <Button type="submit" className="h-12 bg-run text-run-foreground">Entrar</Button>
    </form> }} />;
}

/** Cambio de contraseña del docente con sesión iniciada. */
export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const change = useServerFn(changeTeacherPassword);
  const { auth, login, nombre } = useTeacher();
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
  return <OptionPopup onClose={onClose} content={{ title: "Cambiar contraseña", subtitle: nombre, body:
    <form onSubmit={e => void submit(e)} className="grid gap-3">
      <input type="password" autoComplete="off" placeholder="Contraseña actual" aria-label="Contraseña actual" value={current} onChange={e => setCurrent(e.target.value)} className={field} />
      <input type="password" autoComplete="off" placeholder="Nueva contraseña (mín. 6)" aria-label="Nueva contraseña" value={next} onChange={e => setNext(e.target.value)} className={field} />
      <input type="password" autoComplete="off" placeholder="Repite la nueva contraseña" aria-label="Repite la nueva contraseña" value={repeat} onChange={e => setRepeat(e.target.value)} className={field} />
      {msg && <p role="status" className={msg.ok ? "text-sm text-run" : "text-sm text-destructive"}>{msg.text}</p>}
      <Button type="submit" className="h-12 bg-run text-run-foreground" disabled={!current || !next}>Guardar</Button>
    </form> }} />;
}
