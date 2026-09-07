import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LoginApiResponse, LoginApiService } from './login-api.service';
import { environment } from '../../environments/environment';

describe('LoginApiService (POST /tenants/{tenantId}/login)', () => {
  let service: LoginApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LoginApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('envia POST a /tenants/{tenantId}/login con email y password en el body, sin inventar campos', () => {
    let result: LoginApiResponse | undefined;

    service.login('travesia-natural', 'laura@example.com', 'Multitour#2026').subscribe((response) => {
      result = response;
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/travesia-natural/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'laura@example.com', password: 'Multitour#2026' });

    const backendResponse: LoginApiResponse = {
      accessToken: 'jwt-token',
      membershipId: 'membership-1',
      tenantId: 'travesia-natural',
      firstName: 'Laura',
      lastName: 'Gomez',
      email: 'laura@example.com',
      role: 'ADMINISTRATOR',
    };
    req.flush(backendResponse);

    expect(result).toEqual(backendResponse);
  });

  it('propaga el error del backend (401) sin transformarlo, para que el componente decida el mensaje', () => {
    let capturedStatus: number | undefined;

    service.login('travesia-natural', 'laura@example.com', 'clave-mala').subscribe({
      next: () => fail('no deberia emitir next en un login fallido'),
      error: (err) => (capturedStatus = err.status),
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/travesia-natural/login`);
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(capturedStatus).toBe(401);
  });
});
