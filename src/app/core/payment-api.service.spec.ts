import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PaymentApiService, RegisterPaymentRequest } from './payment-api.service';
import { ReservationResponse } from './reservation-api.service';
import { environment } from '../../environments/environment';

// Cubre registerPayment(), el unico metodo que el cliente final usa hoy ("continuar
// pago" del PDR Fase 1). decideSupport/listPendingSupport/followups son operativos
// (staff), fuera del alcance de esta iteracion centrada en Auth/Reservation.
describe('PaymentApiService.registerPayment (contrato real usado por "continuar pago")', () => {
  let service: PaymentApiService;
  let httpMock: HttpTestingController;
  const tenantId = 'travesia-natural';
  const reservationId = 'r-1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PaymentApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('POST /tenants/{tenantId}/reservations/{id}/payments con method uno de los 3 valores reales del backend', () => {
    const request: RegisterPaymentRequest = {
      method: 'TRANSFERENCIA',
      amount: 100000,
      supportReference: 'soporte-123.png',
    };

    service.registerPayment(tenantId, reservationId, request).subscribe();

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/tenants/${tenantId}/reservations/${reservationId}/payments`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(['EFECTIVO', 'TRANSFERENCIA', 'ABONO']).toContain(req.request.body.method);
    req.flush({} as ReservationResponse);
  });

  it('devuelve la ReservationResponse actualizada (paymentStatus reflejado por el backend) tras registrar el pago', () => {
    let result: ReservationResponse | undefined;
    const request: RegisterPaymentRequest = { method: 'EFECTIVO', amount: 50000, supportReference: null };

    service.registerPayment(tenantId, reservationId, request).subscribe((response) => (result = response));

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/tenants/${tenantId}/reservations/${reservationId}/payments`,
    );
    const backendResponse = { reservationId, paymentStatus: 'Parcial' } as ReservationResponse;
    req.flush(backendResponse);

    expect(result).toEqual(backendResponse);
  });

  it('propaga el error del backend (400) sin alterarlo cuando el metodo de pago es rechazado', () => {
    let capturedStatus: number | undefined;
    const request: RegisterPaymentRequest = { method: 'ABONO', amount: 10000, supportReference: null };

    service.registerPayment(tenantId, reservationId, request).subscribe({
      next: () => fail('no deberia emitir next'),
      error: (err) => (capturedStatus = err.status),
    });

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/tenants/${tenantId}/reservations/${reservationId}/payments`,
    );
    req.flush({ message: 'unknown payment method' }, { status: 400, statusText: 'Bad Request' });

    expect(capturedStatus).toBe(400);
  });
});
