import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HttpAuthAdapter } from './http-auth.adapter';
import { LoginApiService } from '../../login-api.service';
import { AuthSession } from '../domain/models/auth-session.model';

describe('HttpAuthAdapter (unico adaptador que conoce LoginApiService/HttpClient)', () => {
  let loginApiSpy: jasmine.SpyObj<LoginApiService>;
  let adapter: HttpAuthAdapter;

  beforeEach(() => {
    loginApiSpy = jasmine.createSpyObj<LoginApiService>('LoginApiService', ['login']);
    TestBed.configureTestingModule({
      providers: [{ provide: LoginApiService, useValue: loginApiSpy }],
    });
    adapter = TestBed.inject(HttpAuthAdapter);
  });

  it('delega login() en LoginApiService.login() con los mismos argumentos, sin transformar la respuesta', (done) => {
    const session: AuthSession = {
      accessToken: 'jwt',
      membershipId: 'membership-1',
      tenantId: 'travesia-natural',
      firstName: 'Laura',
      lastName: 'Gomez',
      email: 'laura@example.com',
      role: 'ADMINISTRATOR',
    };
    loginApiSpy.login.and.returnValue(of(session));

    adapter.login('travesia-natural', 'laura@example.com', 'Multitour#2026').subscribe((result) => {
      expect(loginApiSpy.login).toHaveBeenCalledWith('travesia-natural', 'laura@example.com', 'Multitour#2026');
      expect(result).toEqual(session);
      done();
    });
  });
});
