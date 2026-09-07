import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { clientSessionGuard, operatorSessionGuard, platformSessionGuard } from './session.guard';
import { Session, SessionService } from './session.service';
import {
  ADMINISTRATOR_ROLE,
  END_CUSTOMER_ROLE,
  OPERATIONAL_COLLABORATOR_ROLE,
  PLATFORM_ADMINISTRATOR_ROLE,
} from './membership-role';

function buildSession(role: string): Session {
  return {
    accessToken: 'jwt',
    membershipId: 'membership-1',
    tenantId: 'travesia-natural',
    firstName: 'Laura',
    lastName: 'Gomez',
    email: 'laura@example.com',
    role,
  };
}

describe('session guards (Fase 3 - proteccion de /platform, /operator, /client)', () => {
  let sessionServiceStub: { session: () => Session | null };
  let routerSpy: jasmine.SpyObj<Router>;
  let fakeUrlTree: UrlTree;

  beforeEach(() => {
    sessionServiceStub = { session: () => null };
    fakeUrlTree = {} as UrlTree;
    routerSpy = jasmine.createSpyObj<Router>('Router', ['parseUrl']);
    routerSpy.parseUrl.and.returnValue(fakeUrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: sessionServiceStub },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  function runGuard(guard: typeof platformSessionGuard) {
    return TestBed.runInInjectionContext(() =>
      guard(undefined as never, undefined as never),
    );
  }

  describe('platformSessionGuard', () => {
    it('permite el acceso cuando el rol real de sesión es PLATFORM_ADMINISTRATOR', () => {
      sessionServiceStub.session = () => buildSession(PLATFORM_ADMINISTRATOR_ROLE);

      expect(runGuard(platformSessionGuard)).toBeTrue();
    });

    it('redirige a /admin-login sin sesión (no autenticado)', () => {
      sessionServiceStub.session = () => null;

      const result = runGuard(platformSessionGuard);

      expect(result).toBe(fakeUrlTree);
      expect(routerSpy.parseUrl).toHaveBeenCalledWith('/admin-login');
    });

    it('redirige a /admin-login cuando el rol real no es PLATFORM_ADMINISTRATOR (ej. ADMINISTRATOR)', () => {
      sessionServiceStub.session = () => buildSession(ADMINISTRATOR_ROLE);

      const result = runGuard(platformSessionGuard);

      expect(result).toBe(fakeUrlTree);
      expect(routerSpy.parseUrl).toHaveBeenCalledWith('/admin-login');
    });
  });

  describe('operatorSessionGuard', () => {
    it('permite el acceso a ADMINISTRATOR', () => {
      sessionServiceStub.session = () => buildSession(ADMINISTRATOR_ROLE);
      expect(runGuard(operatorSessionGuard)).toBeTrue();
    });

    it('permite el acceso a OPERATIONAL_COLLABORATOR', () => {
      sessionServiceStub.session = () => buildSession(OPERATIONAL_COLLABORATOR_ROLE);
      expect(runGuard(operatorSessionGuard)).toBeTrue();
    });

    it('redirige a /login sin sesión', () => {
      sessionServiceStub.session = () => null;

      const result = runGuard(operatorSessionGuard);

      expect(result).toBe(fakeUrlTree);
      expect(routerSpy.parseUrl).toHaveBeenCalledWith('/login');
    });

    it('redirige a /login cuando el rol real es END_CUSTOMER (rol no permitido en /operator)', () => {
      sessionServiceStub.session = () => buildSession(END_CUSTOMER_ROLE);

      const result = runGuard(operatorSessionGuard);

      expect(result).toBe(fakeUrlTree);
      expect(routerSpy.parseUrl).toHaveBeenCalledWith('/login');
    });
  });

  describe('clientSessionGuard', () => {
    it('permite el acceso a END_CUSTOMER', () => {
      sessionServiceStub.session = () => buildSession(END_CUSTOMER_ROLE);
      expect(runGuard(clientSessionGuard)).toBeTrue();
    });

    it('redirige a /login sin sesión', () => {
      sessionServiceStub.session = () => null;

      const result = runGuard(clientSessionGuard);

      expect(result).toBe(fakeUrlTree);
      expect(routerSpy.parseUrl).toHaveBeenCalledWith('/login');
    });

    it('redirige a /login cuando el rol real es ADMINISTRATOR (rol no permitido en /client)', () => {
      sessionServiceStub.session = () => buildSession(ADMINISTRATOR_ROLE);

      const result = runGuard(clientSessionGuard);

      expect(result).toBe(fakeUrlTree);
      expect(routerSpy.parseUrl).toHaveBeenCalledWith('/login');
    });
  });
});
