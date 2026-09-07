import { formatCOP, formatCOPOrDefault, parseCOPToNumber, parseCOPToNumberOrNull } from './money.util';

describe('money.util (formato/parseo COP compartido)', () => {
  describe('formatCOP', () => {
    it('formatea con separador de miles es-CO y simbolo $', () => {
      expect(formatCOP(1500000)).toBe('$1.500.000');
    });

    it('redondea decimales antes de formatear', () => {
      expect(formatCOP(1999.6)).toBe('$2.000');
    });

    it('formatea cero como $0', () => {
      expect(formatCOP(0)).toBe('$0');
    });
  });

  describe('formatCOPOrDefault', () => {
    it('usa formatCOP cuando el valor existe', () => {
      expect(formatCOPOrDefault(50000, '$0')).toBe('$50.000');
    });

    it('usa el texto de respaldo dado cuando el valor es null', () => {
      expect(formatCOPOrDefault(null, '$0')).toBe('$0');
      expect(formatCOPOrDefault(undefined, 'Por configurar')).toBe('Por configurar');
    });
  });

  describe('parseCOPToNumber', () => {
    it('extrae solo digitos de un texto con formato de moneda', () => {
      expect(parseCOPToNumber('$1.500.000')).toBe(1500000);
    });

    it('devuelve 0 cuando no hay digitos (vacio, undefined o solo simbolos)', () => {
      expect(parseCOPToNumber('')).toBe(0);
      expect(parseCOPToNumber(undefined)).toBe(0);
      expect(parseCOPToNumber('$')).toBe(0);
    });
  });

  describe('parseCOPToNumberOrNull', () => {
    it('extrae solo digitos de un texto con formato de moneda', () => {
      expect(parseCOPToNumberOrNull('$250.000')).toBe(250000);
    });

    it('devuelve null (no 0) cuando no hay digitos, para distinguir "sin monto" de "monto cero"', () => {
      expect(parseCOPToNumberOrNull('')).toBeNull();
      expect(parseCOPToNumberOrNull(undefined)).toBeNull();
    });
  });
});
