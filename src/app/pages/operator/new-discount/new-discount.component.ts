import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OperatorDiscount, OperatorDiscountService, getOperatorCatalogServiceOptions } from '../operator-discount.service';

@Component({
  selector: 'app-operator-new-discount',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './new-discount.component.html',
  styleUrl: './new-discount.component.css',
})
export class NewDiscountComponent {
  private readonly discountService = inject(OperatorDiscountService);
  private readonly router = inject(Router);

  serviceOptions = getOperatorCatalogServiceOptions();
  feedback = signal('Completa los parámetros para publicar el descuento.');

  onSubmit(event: Event): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const start = String(data.get('start') || '');
    const end = String(data.get('end') || '');
    if (!form.checkValidity() || end < start) {
      this.feedback.set('Completa los parámetros y define una vigencia válida.');
      return;
    }
    const serviceSelect = form.querySelector('select[name="service"]') as HTMLSelectElement;
    const discount: OperatorDiscount = {
      id: `discount-${Date.now()}`,
      service: serviceSelect.value,
      serviceLabel: serviceSelect.selectedOptions[0]?.textContent || serviceSelect.value,
      percentage: Number(data.get('percentage') || 0),
      start,
      end,
      priority: Number(data.get('priority') || 0),
      stackable: String(data.get('stackable') || 'no'),
      cap: String(data.get('cap') || '').trim(),
      base: String(data.get('base') || 'original'),
      active: true,
    };
    this.discountService.addDiscount(discount);
    this.router.navigateByUrl('/operator/discounts');
  }
}
