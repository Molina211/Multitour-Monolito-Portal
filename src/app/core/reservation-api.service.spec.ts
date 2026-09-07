import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CreateReservationRequest, ReservationApiService, ReservationResponse } from './reservation-api.service';
import { environment } from '../../environments/environment';

// Cubre solo los metodos que participan hoy en el MVP de cliente final (crear reserva,
// consultar "mis reservas" y su detalle) segun el PDR Fase 1: crear reserva, consultar
// estado. No se agregan pruebas para cancelar/modificar del lado cliente porque el PDR
// Fase 1 no habilita autogestion de cancelacion/modificacion para el cliente final.
describe('ReservationApiService (contratos reales usados por MVP cliente)', () => {
  let service: ReservationApiService;
  let httpMock: HttpTestingController;
  const tenantId = 'travesia-natural';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReservationApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('create(): POST /tenants/{tenantId}/reservations con el request exacto, sin enviar customerId (lo toma el JWT)', () => {
    const request: CreateReservationRequest = {
      projectedValue: 250000,
      reservedServices: [
        { serviceReference: 'tour-1', partySize: 2, scheduledDate: '2026-10-01', transportItemId: null },
      ],
      holderDocument: '123456789',
      companions: [],
    };

    service.create(tenantId, request).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/reservations`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect((request as unknown as { customerId?: unknown }).customerId).toBeUndefined();
    req.flush({} as ReservationResponse);
  });

  it('listMine(): GET /tenants/{tenantId}/reservations/me devuelve el arreglo de reservas del cliente autenticado', () => {
    let result: ReservationResponse[] | undefined;

    service.listMine(tenantId).subscribe((response) => (result = response));

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/reservations/me`);
    expect(req.request.method).toBe('GET');
    const backendResponse = [{ reservationId: 'r-1' } as ReservationResponse];
    req.flush(backendResponse);

    expect(result).toEqual(backendResponse);
  });

  it('getMineById(): GET /tenants/{tenantId}/reservations/me/{id} consulta el detalle de una reserva propia', () => {
    service.getMineById(tenantId, 'r-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/reservations/me/r-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ reservationId: 'r-1' } as ReservationResponse);
  });

  it('getMineById(): propaga un error 404 cuando la reserva no existe o no pertenece al cliente', () => {
    let capturedStatus: number | undefined;

    service.getMineById(tenantId, 'r-inexistente').subscribe({
      next: () => fail('no deberia emitir next'),
      error: (err) => (capturedStatus = err.status),
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/reservations/me/r-inexistente`);
    req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });

    expect(capturedStatus).toBe(404);
  });
});
