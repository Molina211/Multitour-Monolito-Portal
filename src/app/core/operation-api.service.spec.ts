import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ExecutionResponse,
  OperationApiService,
  OperationCostResponse,
  RegisterExecutionRequest,
  RegisterOperationCostRequest,
} from './operation-api.service';
import { ReservationResponse } from './reservation-api.service';
import { environment } from '../../environments/environment';

// Reserva comercial (ReservationController) != Ejecucion operativa (OperationController):
// estas pruebas verifican que OperationApiService use su propio conjunto de sub-rutas bajo
// .../reservations/{id}/execution y .../costs, sin invadir el contrato de reservas.
describe('OperationApiService (contratos reales de ejecucion/costos)', () => {
  let service: OperationApiService;
  let httpMock: HttpTestingController;
  const tenantId = 'travesia-natural';
  const reservationId = 'r-1';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OperationApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('registerExecution(): POST .../reservations/{id}/execution con served/executed/causal/actorId reales', () => {
    const request: RegisterExecutionRequest = { served: true, executed: 4, causal: null, actorId: 'membership-1' };

    service.registerExecution(tenantId, reservationId, request).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/reservations/${reservationId}/execution`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({} as ExecutionResponse);
  });

  it('listPendingExecution(): GET .../reservations/pending-execution devuelve reservas pendientes', () => {
    let result: ReservationResponse[] | undefined;
    service.listPendingExecution(tenantId).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/reservations/pending-execution`);
    expect(req.request.method).toBe('GET');
    const response = [{ reservationId: 'r-1' } as ReservationResponse];
    req.flush(response);

    expect(result).toEqual(response);
  });

  it('registerCost(): POST .../reservations/{id}/costs con concept/amount/actorId', () => {
    const request: RegisterOperationCostRequest = { concept: 'Combustible', amount: 30000, actorId: 'membership-1' };

    service.registerCost(tenantId, reservationId, request).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/reservations/${reservationId}/costs`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({} as OperationCostResponse);
  });

  it('registerExecution(): propaga un error 409 (p.ej. reserva ya finalizada)', () => {
    let capturedStatus: number | undefined;
    service.registerExecution(tenantId, reservationId, {} as RegisterExecutionRequest).subscribe({
      next: () => fail('no deberia emitir next'),
      error: (err) => (capturedStatus = err.status),
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/reservations/${reservationId}/execution`);
    req.flush({ message: 'already finalized' }, { status: 409, statusText: 'Conflict' });

    expect(capturedStatus).toBe(409);
  });
});
