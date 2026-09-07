import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CreateReservationUseCase } from './create-reservation.use-case';
import { CreateReservationRequest, ReservationApiService, ReservationResponse } from '../../reservation-api.service';

describe('CreateReservationUseCase', () => {
  let reservationApiSpy: jasmine.SpyObj<ReservationApiService>;
  let useCase: CreateReservationUseCase;

  beforeEach(() => {
    reservationApiSpy = jasmine.createSpyObj<ReservationApiService>('ReservationApiService', ['create']);
    TestBed.configureTestingModule({
      providers: [{ provide: ReservationApiService, useValue: reservationApiSpy }],
    });
    useCase = TestBed.inject(CreateReservationUseCase);
  });

  it('delega en ReservationApiService.create con el mismo tenant y request, sin transformar la respuesta', (done) => {
    const request: CreateReservationRequest = {
      projectedValue: 100000,
      reservedServices: [],
      holderDocument: '123',
      companions: [],
    };
    const response = { reservationId: 'r-1' } as ReservationResponse;
    reservationApiSpy.create.and.returnValue(of(response));

    useCase.execute('travesia-natural', request).subscribe((result) => {
      expect(reservationApiSpy.create).toHaveBeenCalledWith('travesia-natural', request);
      expect(result).toEqual(response);
      done();
    });
  });
});
