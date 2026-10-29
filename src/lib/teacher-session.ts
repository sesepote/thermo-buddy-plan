/**
 * Sesión docente temporal (solo memoria, nunca en localStorage). Se cierra a
 * mano o tras 3 minutos sin toques; el editor de ejercicios la mantiene viva.
 */
import { create } from "zustand";
import { useEffect } from "react";
import type { Credentials } from "./docentes.types";

export const IDLE_LOGOUT_MS = 3 * 60_000;

interface TeacherSession {
  auth: Credentials | null;
  nombre: string;
  lastActivity: number;
  /** Número de pantallas que piden no cerrar la sesión (editor abierto). */
  holds: number;
  login: (auth: Credentials, nombre: string) => void;
  logout: () => void;
  touch: () => void;
  hold: () => () => void;
}

export const useTeacher = create<TeacherSession>()((set, get) => ({
  auth: null,
  nombre: "",
  lastActivity: 0,
  holds: 0,
  login: (auth, nombre) => set({ auth, nombre, lastActivity: Date.now() }),
  logout: () => set({ auth: null, nombre: "" }),
  touch: () => { if (get().auth) set({ lastActivity: Date.now() }); },
  hold: () => {
    set(s => ({ holds: s.holds + 1 }));
    return () => set(s => ({ holds: Math.max(0, s.holds - 1), lastActivity: Date.now() }));
  },
}));

/** ¿Debe cerrarse la sesión? (regla pura, probada en tests). */
export function shouldAutoLogout(s: { auth: unknown; holds: number; lastActivity: number }, now: number) {
  return !!s.auth && s.holds === 0 && now - s.lastActivity >= IDLE_LOGOUT_MS;
}

/** Montado una vez en la raíz: registra toques y cierra por inactividad. */
export function useTeacherIdleWatcher() {
  useEffect(() => {
    const touch = () => useTeacher.getState().touch();
    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    const timer = setInterval(() => { const s = useTeacher.getState(); if (shouldAutoLogout(s, Date.now())) s.logout(); }, 5000);
    return () => { window.removeEventListener("pointerdown", touch); window.removeEventListener("keydown", touch); clearInterval(timer); };
  }, []);
}

/** Mantiene la sesión abierta mientras el componente esté montado. */
export function useHoldTeacherSession() {
  useEffect(() => useTeacher.getState().hold(), []);
}
