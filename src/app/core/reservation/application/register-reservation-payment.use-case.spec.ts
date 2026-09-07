import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RegisterReservationPaymentUseCase } from './register-reservation-payment.use-case';
import { PaymentApiService, RegisterPaymentRequest } from '../../payment-api.service';
import { ReservationResponse } from '../../reservation-api.service';

describe('RegisterReservationPaymentUseCase', () => {
  let paymentApiSpy: jasmine.SpyObj<PaymentApiService>;
  let useCase: RegisterReservationPaymentUseCase;

  beforeEach(() => {
    paymentApiSpy = jasmine.createSpyObj<PaymentApiService>('PaymentApiService', ['registerPayment']);
    TestBed.configureTestingModule({
      providers: [{ provide: PaymentApiService, useValue: paymentApiSpy }],
    });
    useCase = TestBed.inject(RegisterReservationPaymentUseCase);
  });

  it('delega en PaymentApiService.registerPayment con los mismos argumentos, sin transformar la respuesta', (done) => {
    const request: RegisterPaymentRequest = { method: 'EFECTIVO', amount: 100000, supportReference: null };
    const response = { reservationId: 'r-1', paymentStatus: 'Pagado' } as ReservationResponse;
    paymentApiSpy.registerPayment.and.returnValue(of(response));

    useCase.execute('travesia-natural', 'r-1', request).subscribe((result) => {
      expect(paymentApiSpy.registerPayment).toHaveBeenCalledWith('travesia-natural', 'r-1', request);
      expect(result).toEqual(response);
      done();
    });
  });
});
