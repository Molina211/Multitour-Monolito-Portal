// Formato/parseo de montos en pesos colombianos (COP), antes duplicado de forma identica
// (o equivalente en comportamiento) en ~15 componentes/servicios de operador y cliente.
// Extraido tal cual: mismo separador ('es-CO'), mismo simbolo ('$'), mismo redondeo
// (Math.round) y mismo valor final para cada entrada. No se cambia ninguna semantica.

// `Intl.NumberFormat('es-CO').format(n)` y `n.toLocaleString('es-CO')` son equivalentes
// (toLocaleString delega en Intl.NumberFormat con las mismas opciones por defecto).
export function formatCOP(value: number): string {
  return `$${new Intl.NumberFormat('es-CO').format(Math.round(value))}`;
}

// Variante usada donde el valor puede no existir todavia; el texto de respaldo lo decide
// cada pantalla (p.ej. '$0' en montos de reserva, 'Por configurar' en fichas de catalogo).
export function formatCOPOrDefault(value: number | null | undefined, fallback: string): string {
  return value != null ? formatCOP(value) : fallback;
}

// Extrae solo digitos de un texto de entrada (input de moneda) y lo convierte a numero.
// Devuelve 0 cuando no hay digitos, igual que las implementaciones originales que
// consideraban un campo vacio como "sin monto" en vez de un valor invalido.
export function parseCOPToNumber(value: string | null | undefined): number {
  const digits = String(value ?? '').replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}

// Misma extraccion de digitos, pero devuelve null en vacio (usado donde "sin monto" debe
// distinguirse explicitamente de "monto en cero", p.ej. topes de descuento opcionales).
export function parseCOPToNumberOrNull(value: string | null | undefined): number | null {
  const digits = String(value ?? '').replace(/[^0-9]/g, '');
  return digits ? Number(digits) : null;
}
