import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GetMyReservationsUseCase } from './get-my-reservations.use-case';
import { ReservationApiService, ReservationResponse } from '../../reservation-api.service';

describe('GetMyReservationsUseCase', () => {
  let reservationApiSpy: jasmine.SpyObj<ReservationApiService>;
  let useCase: GetMyReservationsUseCase;

  beforeEach(() => {
    reservationApiSpy = jasmine.createSpyObj<ReservationApiService>('ReservationApiService', ['listMine']);
    TestBed.configureTestingModule({
      providers: [{ provide: ReservationApiService, useValue: reservationApiSpy }],
    });
    useCase = TestBed.inject(GetMyReservationsUseCase);
  });

  it('delega en ReservationApiService.listMine con el tenant dado, sin transformar la respuesta', (done) => {
    const response = [{ reservationId: 'r-1' } as ReservationResponse];
    reservationApiSpy.listMine.and.returnValue(of(response));

    useCase.execute('travesia-natural').subscribe((result) => {
      expect(reservationApiSpy.listMine).toHaveBeenCalledWith('travesia-natural');
      expect(result).toEqual(response);
      done();
    });
  });
});
