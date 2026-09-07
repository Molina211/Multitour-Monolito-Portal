import { Injectable, signal } from '@angular/core';

export interface ClientProfile {
  name: string;
  email: string;
  phone: string;
  savedAt?: string;
}

// Misma clave y misma forma de dato ya usadas en la landing aprobada (app.js:
// multitour-user-profile, escrita por el flujo de creacion de cuenta del Cliente). El
// Portal usa su PROPIO localStorage (no comparte almacenamiento fisico con Landing), pero
// mantiene el mismo comportamiento/reglas: mismo nombre de clave, misma forma de dato.
const PROFILE_KEY = 'multitour-user-profile';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// BACKEND/SESION FALTANTE: no existe hoy un registro/inicio de sesion real de Cliente en el
// Portal (signup.component.ts es una vista de referencia que aun no persiste nada). Este
// servicio solo representa "el perfil guardado en este navegador"; si no existe, cada campo
// se resuelve como "No registrado" en la pantalla, nunca con un dato de ejemplo inventado.
@Injectable({ providedIn: 'root' })
export class ClientProfileService {
  private readonly profileSignal = signal<ClientProfile | null>(readStorage(PROFILE_KEY, null));

  readonly profile = this.profileSignal.asReadonly();

  // Solo nombre y telefono son editables (unicos campos del modelo/PDR realmente
  // mutables para el Cliente): rol, tenant e identificadores internos nunca se exponen
  // como editables.
  updateProfile(patch: { name: string; phone: string }): void {
    const current = this.profileSignal() || { name: '', email: '', phone: '' };
    const next: ClientProfile = { ...current, name: patch.name, phone: patch.phone };
    this.profileSignal.set(next);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  }
}
