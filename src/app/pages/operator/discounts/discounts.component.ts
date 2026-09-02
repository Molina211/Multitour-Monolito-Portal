import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OperatorDiscountService } from '../operator-discount.service';

@Component({
  selector: 'app-operator-discounts',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './discounts.component.html',
  styleUrl: './discounts.component.css',
})
export class DiscountsComponent {
  private readonly discountService = inject(OperatorDiscountService);
  private readonly router = inject(Router);

  discounts = this.discountService.discounts;

  // Si el descuento legado "Tour Montañas" ya fue editado y quedó como registro
  // estructurado, la tarjeta estática se retira para no duplicar la promoción.
  hasLegacyOverride = computed(() => this.discounts().some((discount) => discount.id === 'legacy-tour-montanas'));
  totalActive = computed(() => (this.hasLegacyOverride() ? 0 : 1) + this.discounts().length);

  baseLabel(base: string): string {
    return base === 'subtotal' ? 'subtotal resultante del descuento anterior' : 'valor original';
  }

  stackableLabel(stackable: string): string {
    return stackable === 'si' ? 'acumulable' : 'no acumulable';
  }

  editDiscount(id: string): void {
    this.router.navigate(['/operator/discounts/edit'], { queryParams: { id } });
  }
}
