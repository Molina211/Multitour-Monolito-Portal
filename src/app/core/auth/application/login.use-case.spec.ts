import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { LoginUseCase } from './login.use-case';
import { AuthPort } from '../domain/ports/auth.port';
import { AuthSession } from '../domain/models/auth-session.model';

function buildSession(): AuthSession {
  return {
    accessToken: 'jwt',
    membershipId: 'membership-1',
    tenantId: 'travesia-natural',
    firstName: 'Laura',
    lastName: 'Gomez',
    email: 'laura@example.com',
    role: 'ADMINISTRATOR',
  };
}

// LoginUseCase solo depende de AuthPort (abstraccion): se prueba con un stub, sin
// HttpClientTestingModule ni ninguna infraestructura HTTP real - eso es justamente lo que
// la inversion de dependencia deberia permitir.
describe('LoginUseCase (orquestacion de login sin conocer HttpClient)', () => {
  let authPortSpy: jasmine.SpyObj<AuthPort>;
  let useCase: LoginUseCase;

  beforeEach(() => {
    authPortSpy = jasmine.createSpyObj<AuthPort>('AuthPort', ['login']);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthPort, useValue: authPortSpy }],
    });
    useCase = TestBed.inject(LoginUseCase);
  });

  it('delega en AuthPort.login con los mismos argumentos y devuelve la sesion tal cual', (done) => {
    const session = buildSession();
    authPortSpy.login.and.returnValue(of(session));

    useCase.execute('travesia-natural', 'laura@example.com', 'Multitour#2026').subscribe((result) => {
      expect(authPortSpy.login).toHaveBeenCalledWith('travesia-natural', 'laura@example.com', 'Multitour#2026');
      expect(result).toEqual(session);
      done();
    });
  });

  it('normaliza un error 401 del puerto a "Correo o contrasena incorrectos."', (done) => {
    authPortSpy.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

    useCase.execute('travesia-natural', 'laura@example.com', 'clave-mala').subscribe({
      next: () => fail('no deberia emitir next'),
      error: (error: Error) => {
        expect(error.message).toBe('Correo o contrasena incorrectos.');
        done();
      },
    });
  });

  it('normaliza un error de red (status 0) a un mensaje de conexion, no de credenciales', (done) => {
    authPortSpy.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    useCase.execute('travesia-natural', 'laura@example.com', 'Multitour#2026').subscribe({
      next: () => fail('no deberia emitir next'),
      error: (error: Error) => {
        expect(error.message).toBe('No se pudo conectar con el servidor. Intenta de nuevo.');
        done();
      },
    });
  });
});
