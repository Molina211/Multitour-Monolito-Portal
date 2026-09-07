import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthPort } from '../domain/ports/auth.port';
import { AuthSession } from '../domain/models/auth-session.model';

// Orquesta el intento de login sin conocer HttpClient ni ningun detalle de transporte:
// solo conoce AuthPort (abstraccion de dominio). Normaliza el error de red/credenciales a
// un mensaje ya listo para mostrar en pantalla - misma logica que antes vivia duplicada,
// de forma identica, en LoginComponent y AdminLoginComponent (mapLoginError).
@Injectable({ providedIn: 'root' })
export class LoginUseCase {
  private readonly authPort = inject(AuthPort);

  execute(tenantId: string, email: string, password: string): Observable<AuthSession> {
    return this.authPort
      .login(tenantId, email, password)
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => new Error(mapLoginError(error)))));
  }
}

function mapLoginError(error: HttpErrorResponse): string {
  if (error.status === 401) {
    return 'Correo o contrasena incorrectos.';
  }
  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Intenta de nuevo.';
  }
  return 'No fue posible iniciar sesion. Intenta de nuevo mas tarde.';
}
