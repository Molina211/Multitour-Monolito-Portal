// Formato de presentacion compartido por las pantallas "Gestionar <categoria>" (Tours,
// Hospedaje, Alimentacion, Transporte) y el resumen de Catálogos: todas leen el mismo
// CatalogItemResponse real (GET /api/tenants/{tenantId}/catalog-items).
import { formatCOPOrDefault } from '../../core/money.util';

const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatCurrency(value: number | null | undefined): string {
  return formatCOPOrDefault(value, 'Por configurar');
}

export function formatCatalogDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  const monthName = MONTH_ABBR[Number(month) - 1];
  if (!year || !day || !monthName) return iso;
  return `${Number(day)} ${monthName} ${year}`;
}

export function formatValidity(validFrom: string | null | undefined, validTo: string | null | undefined): string {
  if (!validFrom && !validTo) return 'Vigente';
  return `${formatCatalogDate(validFrom) || 'Por configurar'} - ${formatCatalogDate(validTo) || 'Por configurar'}`;
}
