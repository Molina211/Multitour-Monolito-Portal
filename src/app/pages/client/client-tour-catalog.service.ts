// Utilidades compartidas de la reserva de Cliente (formato de fecha, cuenta bancaria,
// medios de pago). La clase ClientTourCatalogService (catalogo mock de Tours) se elimino:
// el booking real usa CatalogApiService directamente (ver client-tour-booking.component.ts).
const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatOperatorDate(iso: string | undefined | null): string {
  const [year, month, day] = (iso || '').split('-');
  const monthName = MONTH_ABBR[Number(month) - 1];
  if (!year || !day || !monthName) return iso || '';
  return `${day} ${monthName} ${year}`;
}

// Condiciones y medios de pago genericos (no dependen de un tour especifico): el contrato
// real (CatalogItemResponse) no modela "condiciones" ni "medios de pago aceptados" por
// tour - ver BLOQUEO en client-tour-booking.component.ts.
export const GENERIC_TOUR_CONDITION = 'La disponibilidad y los valores se validan antes de registrar la reserva.';
export const DEFAULT_TOUR_PAYMENT_METHODS = ['Transferencia', 'Efectivo', 'Abono'];

// Datos bancarios para instrucciones de transferencia: no existe hoy una pantalla de
// configuracion de datos bancarios por operador, asi que se centraliza AQUI (una sola
// fuente para toda la pantalla de transferencia) en vez de dejarlos repetidos como texto
// fijo en cada componente. Mismo valor de referencia ya usado en Landing (app.js:
// TENANT_BANK_ACCOUNT), ahora como dato configurable en un solo lugar.
export const TENANT_BANK_ACCOUNT = {
  bank: 'Banco de Occidente',
  accountType: 'Corriente',
  accountNumber: '1234-5678-9012-3456',
  holder: 'Multitour Operaciones S.A.S.',
  taxId: '900.123.456-7',
};
