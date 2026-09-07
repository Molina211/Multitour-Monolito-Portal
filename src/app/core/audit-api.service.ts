import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Espejo exacto de AuditRecord.java (GET /api/audit). BLOQUEO/RIESGO DE SEGURIDAD (ver
// auditoria seccion 8): este endpoint devuelve TODOS los registros de auditoria de TODOS
// los tenants, sin filtro por tenant ni por rol (AuditController.listAll() llama
// auditRecorder.findAll() directo). Es exactamente lo que necesita la vista transversal de
// Platform Admin, pero hoy cualquiera que llame al endpoint (sin sesion) ve lo mismo -
// deuda de autorizacion de Backend, no algo que este Frontend pueda arreglar.
export interface AuditRecordResponse {
  auditRecordId: string;
  tenantId: string | null;
  actorId: string;
  action: string;
  affectedRecordId: string;
  reason: string | null;
  recordedAt: string;
  previousValue: string | null;
  newValue: string | null;
  channelOrModule: string | null;
  functionalProcessReference: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuditApiService {
  private readonly http = inject(HttpClient);

  listAll(): Observable<AuditRecordResponse[]> {
    return this.http.get<AuditRecordResponse[]>(`${environment.apiBaseUrl}/audit`);
  }
}
