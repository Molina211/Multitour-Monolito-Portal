import { Injectable, computed, signal } from '@angular/core';

// Sesion real del Backend (POST /api/tenants/{tenantId}/login). Unica fuente de verdad
// para accessToken/membershipId/tenantId/rol una vez el login quede conectado (fase
// siguiente, no incluida en este bloque). Se usa sessionStorage (no localStorage) para el
// token, siguiendo la misma recomendacion ya documentada en el propio Backend
// (AuthController.java: "memoria de sesion, no necesariamente localStorage").
export interface Session {
  accessToken: string;
  membershipId: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const SESSION_KEY = 'multitour-session';

function readStoredSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly sessionSignal = signal<Session | null>(readStoredSession());

  readonly session = this.sessionSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);
  readonly accessToken = computed(() => this.sessionSignal()?.accessToken ?? null);
  readonly tenantId = computed(() => this.sessionSignal()?.tenantId ?? null);
  readonly role = computed(() => this.sessionSignal()?.role ?? null);
  readonly firstName = computed(() => this.sessionSignal()?.firstName ?? null);
  readonly lastName = computed(() => this.sessionSignal()?.lastName ?? null);

  setSession(session: Session): void {
    this.sessionSignal.set(session);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      /* sessionStorage no disponible: la sesion sigue vigente en memoria para esta pestana */
    }
  }

  clear(): void {
    this.sessionSignal.set(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* no-op */
    }
  }
}
