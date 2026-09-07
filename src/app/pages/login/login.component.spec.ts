import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { LoginUseCase } from '../../core/auth/application/login.use-case';
import { AuthSession } from '../../core/auth/domain/models/auth-session.model';
import { SessionService } from '../../core/session.service';
import { CURRENT_TENANT_ID } from '../../core/tenant.constants';
import { OperatorRole, OperatorRoleService } from '../operator/operator-role.service';

function successResponse(role: string): AuthSession {
  return {
    accessToken: 'jwt-token',
    membershipId: 'membership-1',
    tenantId: CURRENT_TENANT_ID,
    firstName: 'Laura',
    lastName: 'Gomez',
    email: 'laura@example.com',
    role,
  };
}

function submitForm(fixture: ComponentFixture<LoginComponent>, email: string, password: string): void {
  const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
  const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement;
  const passwordInput = form.querySelector('input[name="password"]') as HTMLInputElement;
  emailInput.value = email;
  passwordInput.value = password;
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  fixture.detectChanges();
}

describe('LoginComponent (login real Cliente/Staff via LoginUseCase — Fase 5)', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let loginUseCaseSpy: jasmine.SpyObj<LoginUseCase>;
  let sessionServiceSpy: jasmine.SpyObj<SessionService>;
  let operatorRoleServiceSpy: jasmine.SpyObj<OperatorRoleService>;
  let router: Router;

  beforeEach(async () => {
    loginUseCaseSpy = jasmine.createSpyObj<LoginUseCase>('LoginUseCase', ['execute']);
    sessionServiceSpy = jasmine.createSpyObj<SessionService>('SessionService', ['setSession', 'clear']);
    operatorRoleServiceSpy = jasmine.createSpyObj<OperatorRoleService>('OperatorRoleService', ['setRole']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: LoginUseCase, useValue: loginUseCaseSpy },
        { provide: SessionService, useValue: sessionServiceSpy },
        { provide: OperatorRoleService, useValue: operatorRoleServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
  });

  it('no llama al caso de uso si el correo o la contraseña están vacíos (validación antes de red)', () => {
    submitForm(fixture, '', '');

    expect(loginUseCaseSpy.execute).not.toHaveBeenCalled();
    expect(component.feedbackIsError()).toBeTrue();
  });

  it('login exitoso: delega en LoginUseCase con el tenant real, guarda la sesión y navega según el rol devuelto', () => {
    loginUseCaseSpy.execute.and.returnValue(of(successResponse('ADMINISTRATOR')));

    submitForm(fixture, 'laura@example.com', 'Multitour#2026');

    expect(loginUseCaseSpy.execute).toHaveBeenCalledWith(CURRENT_TENANT_ID, 'laura@example.com', 'Multitour#2026');
    expect(sessionServiceSpy.setSession).toHaveBeenCalledWith(successResponse('ADMINISTRATOR'));
    expect(operatorRoleServiceSpy.setRole).toHaveBeenCalledWith('admin' as OperatorRole);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/operator');
  });

  it('login exitoso para END_CUSTOMER navega a /client sin tocar el rol de operador', () => {
    loginUseCaseSpy.execute.and.returnValue(of(successResponse('END_CUSTOMER')));

    submitForm(fixture, 'cliente@example.com', 'Multitour#2026');

    expect(sessionServiceSpy.setSession).toHaveBeenCalled();
    expect(operatorRoleServiceSpy.setRole).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/client');
  });

  it('login fallido: muestra el mensaje de error ya normalizado por el caso de uso y NO guarda sesión ni navega', () => {
    loginUseCaseSpy.execute.and.returnValue(throwError(() => new Error('Correo o contrasena incorrectos.')));

    submitForm(fixture, 'laura@example.com', 'clave-incorrecta');

    expect(component.feedback()).toBe('Correo o contrasena incorrectos.');
    expect(component.feedbackIsError()).toBeTrue();
    expect(sessionServiceSpy.setSession).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('error de red: muestra el mensaje de conexión ya normalizado por el caso de uso', () => {
    loginUseCaseSpy.execute.and.returnValue(
      throwError(() => new Error('No se pudo conectar con el servidor. Intenta de nuevo.')),
    );

    submitForm(fixture, 'laura@example.com', 'Multitour#2026');

    expect(component.feedback()).toBe('No se pudo conectar con el servidor. Intenta de nuevo.');
    expect(component.feedbackIsError()).toBeTrue();
  });
});
