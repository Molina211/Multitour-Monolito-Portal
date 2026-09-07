import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuditApiService, AuditRecordResponse } from './audit-api.service';
import { environment } from '../../environments/environment';

describe('AuditApiService (contrato real GET /audit)', () => {
  let service: AuditApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuditApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listAll(): GET /audit (sin filtro por tenant en la URL - asi es el contrato real hoy)', () => {
    let result: AuditRecordResponse[] | undefined;
    service.listAll().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/audit`);
    expect(req.request.method).toBe('GET');
    const response = [{ auditRecordId: 'a-1', tenantId: 'travesia-natural' } as AuditRecordResponse];
    req.flush(response);

    expect(result).toEqual(response);
  });

  it('listAll(): propaga un error 0 (red) sin transformarlo', () => {
    let capturedStatus: number | undefined;
    service.listAll().subscribe({
      next: () => fail('no deberia emitir next'),
      error: (err) => (capturedStatus = err.status),
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/audit`);
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(capturedStatus).toBe(0);
  });
});
