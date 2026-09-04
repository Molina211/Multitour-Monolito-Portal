import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OPERATOR_CATALOG_DEFAULTS, OperatorCatalogService } from '../operator-catalog.service';
import { OperatorRoleService } from '../operator-role.service';

const CATALOG_ID = 'transporte-catalog-panel';

// Mismo formato ya usado en Catálogos ("01 sep 2026"), convertido a/desde ISO para los
// campos de fecha del formulario (igual que parseOperatorDate/formatOperatorDate en la
// landing aprobada).
const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function parseCatalogDate(text: string | undefined): string {
  const match = /^(\d{1,2})\s+([a-z]{3})\s+(\d{4})$/i.exec((text || '').trim());
  if (!match) return '';
  const monthIndex = MONTH_ABBR.indexOf(match[2].toLowerCase());
  if (monthIndex === -1) return '';
  return `${match[3]}-${String(monthIndex + 1).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

function formatCatalogDate(iso: string): string {
  const [year, month, day] = (iso || '').split('-');
  const monthName = MONTH_ABBR[Number(month) - 1];
  if (!year || !day || !monthName) return '';
  return `${day} ${monthName} ${year}`;
}

@Component({
  selector: 'app-operator-configure-transport',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './configure-transport.component.html',
  styleUrl: './configure-transport.component.css',
})
export class ConfigureTransportComponent {
  private readonly catalogService = inject(OperatorCatalogService);
  private readonly router = inject(Router);
  readonly roleService = inject(OperatorRoleService);

  private readonly baseRecord = OPERATOR_CATALOG_DEFAULTS[CATALOG_ID].records[0];
  private readonly currentFields = this.catalogService.getServiceFields(CATALOG_ID, this.baseRecord.key) || this.baseRecord.fields;

  // "Por configurar" nunca se precarga como valor real del campo (mismo criterio ya usado
  // en la landing aprobada): el Administrador ve el campo vacio y define un valor real.
  private readOrBlank(field: string): string {
    const value = this.currentFields[field];
    return value && value !== 'Por configurar' ? value : '';
  }

  name = signal(this.readOrBlank('name') || this.baseRecord.key);
  route = signal(this.readOrBlank('route'));
  tariff = signal(this.readOrBlank('tariff'));
  cost = signal(this.readOrBlank('cost'));
  capacity = signal(this.readOrBlank('capacity'));
  policy = signal(this.currentFields['policy'] || 'Sin apartamiento previo');
  validityStart = signal(parseCatalogDate((this.currentFields['validity'] || '').split(' - ')[0]));
  validityEnd = signal(parseCatalogDate((this.currentFields['validity'] || '').split(' - ')[1]));

  isActive = this.catalogService.isActive(CATALOG_ID, this.baseRecord.key, this.baseRecord.active);
  feedback = signal('Los cambios se guardan sobre este mismo recurso; no se crea uno nuevo.');

  readonly readOnly = this.roleService.isColaborador();

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.readOnly) return;

    const updated: Record<string, string> = { ...this.currentFields };
    const setOrKeep = (field: string, value: string) => {
      updated[field] = value.trim() || 'Por configurar';
    };
    setOrKeep('name', this.name());
    setOrKeep('route', this.route());
    setOrKeep('tariff', this.tariff());
    setOrKeep('cost', this.cost());
    setOrKeep('capacity', this.capacity());
    updated['policy'] = this.policy();

    const start = this.validityStart();
    const end = this.validityEnd();
    if (start && end) {
      updated['validity'] = `${formatCatalogDate(start)} - ${formatCatalogDate(end)}`;
    }

    this.catalogService.setServiceFields(CATALOG_ID, this.baseRecord.key, updated);
    this.router.navigateByUrl('/operator/catalog/transport');
  }
}
