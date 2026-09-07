import { Observable } from 'rxjs';
import { AuthSession } from '../models/auth-session.model';

// Puerto de dominio: LoginUseCase depende SOLO de esta abstraccion, nunca de HttpClient ni
// de un servicio HTTP concreto. La unica implementacion real hoy es HttpAuthAdapter
// (infrastructure/http-auth.adapter.ts), registrada en app.config.ts.
export abstract class AuthPort {
  abstract login(tenantId: string, email: string, password: string): Observable<AuthSession>;
}
