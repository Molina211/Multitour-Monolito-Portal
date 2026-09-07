import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GetCatalogForBookingUseCase } from './get-catalog-for-booking.use-case';
import { CatalogApiService, CatalogItemResponse } from '../../catalog-api.service';

describe('GetCatalogForBookingUseCase', () => {
  let catalogApiSpy: jasmine.SpyObj<CatalogApiService>;
  let useCase: GetCatalogForBookingUseCase;

  beforeEach(() => {
    catalogApiSpy = jasmine.createSpyObj<CatalogApiService>('CatalogApiService', ['getById']);
    TestBed.configureTestingModule({
      providers: [{ provide: CatalogApiService, useValue: catalogApiSpy }],
    });
    useCase = TestBed.inject(GetCatalogForBookingUseCase);
  });

  it('delega en CatalogApiService.getById con el mismo tenant e id, sin transformar la respuesta', (done) => {
    const response = { catalogItemId: 'c-1', type: 'TOUR' } as CatalogItemResponse;
    catalogApiSpy.getById.and.returnValue(of(response));

    useCase.execute('travesia-natural', 'c-1').subscribe((result) => {
      expect(catalogApiSpy.getById).toHaveBeenCalledWith('travesia-natural', 'c-1');
      expect(result).toEqual(response);
      done();
    });
  });
});
