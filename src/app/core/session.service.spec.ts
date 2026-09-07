import { TestBed } from '@angular/core/testing';
import { Session, SessionService } from './session.service';

const SESSION_KEY = 'multitour-session';

function buildSession(overrides: Partial<Session> = {}): Session {
  return {
    accessToken: 'jwt-token-abc',
    membershipId: 'membership-1',
    tenantId: 'travesia-natural',
    firstName: 'Laura',
    lastName: 'Gomez',
    email: 'laura@example.com',
    role: 'ADMINISTRATOR',
    ...overrides,
  };
}

describe('SessionService', () => {
  beforeEach(() => {
    sessionStorage.removeItem(SESSION_KEY);
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    sessionStorage.removeItem(SESSION_KEY);
  });

  it('no tiene sesión activa cuando sessionStorage está vacío', () => {
    const service = TestBed.inject(SessionService);

    expect(service.session()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.accessToken()).toBeNull();
    expect(service.tenantId()).toBeNull();
    expect(service.role()).toBeNull();
  });

  it('guarda la sesión con setSession() y la expone en los signals derivados', () => {
    const service = TestBed.inject(SessionService);
    const session = buildSession();

    service.setSession(session);

    expect(service.session()).toEqual(session);
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.accessToken()).toBe('jwt-token-abc');
    expect(service.tenantId()).toBe('travesia-natural');
    expect(service.role()).toBe('ADMINISTRATOR');
    expect(service.firstName()).toBe('Laura');
    expect(service.lastName()).toBe('Gomez');
  });

  it('persiste la sesión en sessionStorage (no localStorage) para sobrevivir un reload', () => {
    const service = TestBed.inject(SessionService);
    service.setSession(buildSession());

    const raw = sessionStorage.getItem(SESSION_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).accessToken).toBe('jwt-token-abc');
  });

  it('lee una sesión ya persistida en sessionStorage al crear una nueva instancia (simula reload)', () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(buildSession({ role: 'END_CUSTOMER' })));

    const service = TestBed.inject(SessionService);

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.role()).toBe('END_CUSTOMER');
  });

  it('clear() elimina la sesión de memoria y de sessionStorage (logout real)', () => {
    const service = TestBed.inject(SessionService);
    service.setSession(buildSession());
    expect(service.isAuthenticated()).toBeTrue();

    service.clear();

    expect(service.session()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.accessToken()).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
