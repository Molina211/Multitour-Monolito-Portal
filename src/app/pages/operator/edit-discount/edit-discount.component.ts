import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OperatorDiscount, OperatorDiscountService, getOperatorCatalogServiceOptions } from '../operator-discount.service';

@Component({
  selector: 'app-operator-edit-discount',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './edit-discount.component.html',
  styleUrl: './edit-discount.component.css',
})
export class EditDiscountComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly discountService = inject(OperatorDiscountService);

  readonly id = this.route.snapshot.queryParamMap.get('id') || '';
  serviceOptions = getOperatorCatalogServiceOptions();

  private readonly existing = this.discountService.getDiscount(this.id);
  // La promoción legada "Tour Montañas" no tenía parámetros estructurados: al editarla
  // por primera vez se precargan valores base para que el Administrador los confirme.
  private readonly isUnstructuredLegacy = !this.existing && this.id === 'legacy-tour-montanas';

  notFound = !this.existing && !this.isUnstructuredLegacy;

  discount: Partial<OperatorDiscount> = this.existing
    ? { ...this.existing }
    : this.isUnstructuredLegacy
      ? { percentage: 20, end: '2026-09-30' }
      : {};

  feedback = signal(
    this.notFound
      ? 'No se encontró el descuento seleccionado. Vuelve a Descuentos e ingresa nuevamente por Editar parámetros.'
      : this.isUnstructuredLegacy
        ? 'Esta promoción no tenía parámetros estructurados previos: confirma servicio, vigencia desde, prioridad, acumulable y base de cálculo antes de guardar.'
        : 'Actualiza los parámetros y guarda para aplicar los cambios a este mismo descuento.',
  );

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.notFound) return;
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const start = String(data.get('start') || '');
    const end = String(data.get('end') || '');
    const percentageValue = String(data.get('percentage') || '');
    const priorityValue = String(data.get('priority') || '');
    const baseValue = String(data.get('base') || '');
    const percentage = Number(percentageValue);
    const missingRequired = !start || !end || !priorityValue || !percentageValue || !baseValue;
    if (missingRequired || !form.checkValidity() || percentage < 0 || percentage > 100 || end < start) {
      this.feedback.set(
        'Completa vigencia desde, vigencia hasta, prioridad, porcentaje y base de cálculo (el porcentaje entre 0 y 100, y la vigencia hasta no anterior a la vigencia desde) antes de guardar.',
      );
      return;
    }
    const serviceSelect = form.querySelector('select[name="service"]') as HTMLSelectElement;
    const updated: OperatorDiscount = {
      id: this.id,
      service: serviceSelect.value,
      serviceLabel: serviceSelect.selectedOptions[0]?.textContent || serviceSelect.value,
      percentage,
      start,
      end,
      priority: Number(priorityValue),
      stackable: String(data.get('stackable') || 'no'),
      cap: String(data.get('cap') || '').trim(),
      base: baseValue,
      active: true,
    };
    this.discountService.saveDiscount(updated);
    this.router.navigateByUrl('/operator/discounts');
  }
}
