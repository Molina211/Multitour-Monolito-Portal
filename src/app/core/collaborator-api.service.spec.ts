import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CollaboratorApiService, RegisterCollaboratorRequest, CollaboratorResponse } from './collaborator-api.service';
import { environment } from '../../environments/environment';

describe('CollaboratorApiService (contratos reales de collaborators)', () => {
  let service: CollaboratorApiService;
  let httpMock: HttpTestingController;
  const tenantId = 'travesia-natural';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CollaboratorApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('register(): POST /tenants/{tenantId}/collaborators con el request exacto (incluye actorId real)', () => {
    const request: RegisterCollaboratorRequest = {
      name: 'Carlos Ruiz',
      email: 'carlos@example.com',
      password: 'Multitour#2026',
      passwordConfirmation: 'Multitour#2026',
      actorId: 'membership-admin-1',
    };

    service.register(tenantId, request).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/collaborators`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({} as CollaboratorResponse);
  });

  it('register(): propaga un error 409 cuando el correo ya esta registrado en el tenant', () => {
    let capturedStatus: number | undefined;
    service.register(tenantId, {} as RegisterCollaboratorRequest).subscribe({
      next: () => fail('no deberia emitir next'),
      error: (err) => (capturedStatus = err.status),
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/collaborators`);
    req.flush({ message: 'email already registered' }, { status: 409, statusText: 'Conflict' });

    expect(capturedStatus).toBe(409);
  });

  it('listByTenant(): GET /tenants/{tenantId}/collaborators', () => {
    let result: CollaboratorResponse[] | undefined;
    service.listByTenant(tenantId).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/collaborators`);
    expect(req.request.method).toBe('GET');
    const response = [{ membershipId: 'm-1', role: 'OPERATIONAL_COLLABORATOR' } as CollaboratorResponse];
    req.flush(response);

    expect(result).toEqual(response);
  });

  it('getById(): GET /tenants/{tenantId}/collaborators/{membershipId}', () => {
    service.getById(tenantId, 'm-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/collaborators/m-1`);
    expect(req.request.method).toBe('GET');
    req.flush({} as CollaboratorResponse);
  });
});
