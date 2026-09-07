import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminLoginComponent } from './admin-login.component';
import { LoginUseCase } from '../../core/auth/application/login.use-case';
import { AuthSession } from '../../core/auth/domain/models/auth-session.model';
import { SessionService } from '../../core/session.service';
import { PLATFORM_TENANT_ID } from '../../core/tenant.constants';

function buildSession(role: string): AuthSession {
  return {
    accessToken: 'jwt',
    membershipId: 'membership-1',
    tenantId: PLATFORM_TENANT_ID,
    firstName: 'Admin',
    lastName: 'Plataforma',
    email: 'admin@example.com',
    role,
  };
}

function submitForm(fixture: ComponentFixture<AdminLoginComponent>, email: string, password: string): void {
  const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
  const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement;
  const passwordInput = form.querySelector('input[name="password"]') as HTMLInputElement;
  emailInput.value = email;
  passwordInput.value = password;
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  fixture.detectChanges();
}

// Cubre la regla de negocio propia de esta pantalla (distinta de LoginComponent): solo
// PLATFORM_ADMINISTRATOR puede quedar con sesion iniciada aqui, aunque el login haya sido
// valido para otro rol del mismo tenant "platform".
describe('AdminLoginComponent (acceso exclusivo de PLATFORM_ADMINISTRATOR)', () => {
  let fixture: ComponentFixture<AdminLoginComponent>;
  let loginUseCaseSpy: jasmine.SpyObj<LoginUseCase>;
  let sessionServiceSpy: jasmine.SpyObj<SessionService>;
  let router: Router;

  beforeEach(async () => {
    loginUseCaseSpy = jasmine.createSpyObj<LoginUseCase>('LoginUseCase', ['execute']);
    sessionServiceSpy = jasmine.createSpyObj<SessionService>('SessionService', ['setSession', 'clear']);

    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: LoginUseCase, useValue: loginUseCaseSpy },
        { provide: SessionService, useValue: sessionServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLoginComponent);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
  });

  it('login exitoso con rol PLATFORM_ADMINISTRATOR: guarda sesion y navega a /platform', () => {
    loginUseCaseSpy.execute.and.returnValue(of(buildSession('PLATFORM_ADMINISTRATOR')));

    submitForm(fixture, 'admin@example.com', 'Multitour#2026');

    expect(loginUseCaseSpy.execute).toHaveBeenCalledWith(PLATFORM_TENANT_ID, 'admin@example.com', 'Multitour#2026');
    expect(sessionServiceSpy.setSession).toHaveBeenCalledWith(buildSession('PLATFORM_ADMINISTRATOR'));
    expect(router.navigateByUrl).toHaveBeenCalledWith('/platform');
  });

  it('login valido pero con rol distinto de PLATFORM_ADMINISTRATOR: NO guarda sesion ni navega', () => {
    loginUseCaseSpy.execute.and.returnValue(of(buildSession('ADMINISTRATOR')));

    submitForm(fixture, 'operador@example.com', 'Multitour#2026');

    expect(sessionServiceSpy.setSession).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(fixture.componentInstance.feedback()).toBe('Esta cuenta no tiene acceso al panel de plataforma.');
  });

  it('login fallido: muestra el mensaje de error ya normalizado por el caso de uso', () => {
    loginUseCaseSpy.execute.and.returnValue(throwError(() => new Error('Correo o contrasena incorrectos.')));

    submitForm(fixture, 'admin@example.com', 'clave-mala');

    expect(fixture.componentInstance.feedback()).toBe('Correo o contrasena incorrectos.');
    expect(sessionServiceSpy.setSession).not.toHaveBeenCalled();
  });
});
