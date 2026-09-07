import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Literales en espanol alineados a proposito con el Frontend por el propio Backend
// (CashMovementType.java: "sin este alineamiento, el dia que se conecten, ningun
// movimiento podria registrarse"). No inventar ni traducir.
export type CashMovementLabel = 'Ingreso' | 'Pago operacional' | 'Gasto';

export interface OpenCashRegisterRequest {
  businessDate: string;
  baseAmount: number;
  actorId: string;
}

export interface RegisterCashMovementRequest {
  type: CashMovementLabel;
  amount: number;
  concept: string;
  actorId: string;
}

export interface CloseCashRegisterRequest {
  actorId: string;
}

export interface AddCashCorrectionRequest {
  justification: string;
  actorId: string;
}

export interface CashMovementResponse {
  type: string;
  amount: number;
  concept: string;
  actorId: string;
  recordedAt: string;
}

export interface CashCorrection {
  justification: string;
  appliedBy: string;
  appliedAt: string;
}

export interface CashRegisterResponse {
  cashRegisterId: string;
  businessDate: string;
  baseAmount: number;
  status: string;
  movements: CashMovementResponse[];
  corrections: CashCorrection[];
  closedBy: string | null;
  closedAt: string | null;
  totalAmount: number;
}

export interface MonthlyConsolidationResponse {
  period: string;
  ingresos: number;
  pagosOperacionales: number;
  gastos: number;
  devoluciones: number;
  total: number;
  cancelaciones: number;
  costosOperacionales: number;
}

@Injectable({ providedIn: 'root' })
export class CashApiService {
  private readonly http = inject(HttpClient);

  private base(tenantId: string): string {
    return `${environment.apiBaseUrl}/tenants/${tenantId}/cash`;
  }

  open(tenantId: string, request: OpenCashRegisterRequest): Observable<CashRegisterResponse> {
    return this.http.post<CashRegisterResponse>(this.base(tenantId), request);
  }

  registerMovement(
    tenantId: string,
    cashRegisterId: string,
    request: RegisterCashMovementRequest,
  ): Observable<CashRegisterResponse> {
    return this.http.post<CashRegisterResponse>(`${this.base(tenantId)}/${cashRegisterId}/movements`, request);
  }

  close(tenantId: string, cashRegisterId: string, request: CloseCashRegisterRequest): Observable<CashRegisterResponse> {
    return this.http.post<CashRegisterResponse>(`${this.base(tenantId)}/${cashRegisterId}/close`, request);
  }

  addCorrection(
    tenantId: string,
    cashRegisterId: string,
    request: AddCashCorrectionRequest,
  ): Observable<CashRegisterResponse> {
    return this.http.post<CashRegisterResponse>(`${this.base(tenantId)}/${cashRegisterId}/corrections`, request);
  }

  getByBusinessDate(tenantId: string, businessDate: string): Observable<CashRegisterResponse> {
    return this.http.get<CashRegisterResponse>(this.base(tenantId), {
      params: new HttpParams().set('businessDate', businessDate),
    });
  }

  listHistory(tenantId: string): Observable<CashRegisterResponse[]> {
    return this.http.get<CashRegisterResponse[]>(`${this.base(tenantId)}/history`);
  }

  getMonthlyConsolidation(tenantId: string, period: string): Observable<MonthlyConsolidationResponse[]> {
    return this.http.get<MonthlyConsolidationResponse[]>(`${this.base(tenantId)}/consolidation`, {
      params: new HttpParams().set('period', period),
    });
  }
}
