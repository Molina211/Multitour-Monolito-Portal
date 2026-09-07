import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperatorReportsService, ReportsDashboard, ReportsSummary } from '../operator-reports.service';
import { MonthlyConsolidationResponse } from '../../../core/cash-api.service';
import { OperatorCashService } from '../operator-cash.service';
import { OperatorReservationService } from '../operator-reservation.service';
import { formatCOP } from '../../../core/money.util';

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

interface ReportLine {
  text: string;
  size?: number;
  bold?: boolean;
}

// AJUSTE 2: "Exportar reporte" genera un PDF real con EXACTAMENTE los mismos datos ya
// mostrados en pantalla, sin recalcular ni inventar nada nuevo.
function buildReportsLines(dashboard: ReportsDashboard, summary: ReportsSummary, periods: MonthlyConsolidationResponse[]): ReportLine[] {
  const lines: ReportLine[] = [];
  lines.push({ text: 'Reporte operativo y económico - Multitour', size: 14, bold: true });
  lines.push({ text: `Generado: ${new Date().toLocaleString('es-CO')}`, size: 9 });
  lines.push({ text: '' });
  lines.push({ text: 'Resumen', size: 12, bold: true });
  lines.push({ text: `Ventas confirmadas: ${formatCOP(summary.confirmedSales)}` });
  lines.push({ text: `Cancelaciones: ${summary.cancelledCount}` });
  lines.push({ text: '' });
  lines.push({ text: 'Dashboard diario (hoy)', size: 12, bold: true });
  lines.push({ text: `Reservas creadas hoy: ${dashboard.createdToday}` });
  lines.push({ text: `Pendientes de pago: ${dashboard.pendingPayment}` });
  lines.push({ text: `Confirmadas: ${dashboard.confirmed}` });
  lines.push({ text: `Canceladas hoy: ${dashboard.cancelled}` });
  lines.push({ text: `Próximas a ejecutar: ${dashboard.upcomingExecutions}` });
  lines.push({ text: '' });
  lines.push({ text: 'Reporte mensual (Caja)', size: 12, bold: true });
  if (!periods.length) {
    lines.push({ text: 'Aún no hay cierres de caja registrados para consolidar el reporte mensual.' });
  } else {
    periods.forEach((data) => {
      lines.push({ text: `Período reportado: ${data.period}`, bold: true });
      lines.push({ text: `Ingresos del período: ${formatCOP(data.ingresos)}` });
      lines.push({ text: `Pagos operacionales del período: ${formatCOP(data.pagosOperacionales)}` });
      lines.push({ text: `Gastos del período: ${formatCOP(data.gastos)}` });
      lines.push({ text: `Devoluciones efectivamente realizadas: ${formatCOP(data.devoluciones)}` });
      lines.push({ text: `Total consolidado de caja del período: ${formatCOP(data.total)}` });
      lines.push({ text: `Cancelaciones registradas en el período: ${data.cancelaciones}` });
      lines.push({
        text: `Costos operacionales registrados en el período: ${data.costosOperacionales > 0 ? formatCOP(data.costosOperacionales) : 'Sin costos operacionales registrados'}`,
      });
      lines.push({ text: '' });
    });
  }
  return lines;
}

function buildReportsPdfFilename(periods: MonthlyConsolidationResponse[]): string {
  const period = periods.length ? periods[0].period : currentPeriod();
  return `reporte-multitour-${period}.pdf`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildReportsPdfDoc(JsPDF: any, dashboard: ReportsDashboard, summary: ReportsSummary, periods: MonthlyConsolidationResponse[]): any {
  const doc = new JsPDF();
  const marginLeft = 14;
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 18;
  buildReportsLines(dashboard, summary, periods).forEach((line) => {
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 18;
    }
    doc.setFontSize(line.size || 10);
    doc.setFont(undefined, line.bold ? 'bold' : 'normal');
    if (line.text) doc.text(line.text, marginLeft, y);
    y += line.size && line.size > 10 ? 8 : 6;
  });
  return doc;
}

const JSPDF_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jspdf?: { jsPDF: any };
  }
}

function loadJsPdf(): Promise<any> {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = JSPDF_CDN_URL;
    script.onload = () => (window.jspdf?.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error('jsPDF no disponible tras cargar el script.')));
    script.onerror = () => reject(new Error('No fue posible cargar la librería de exportación (jsPDF).'));
    document.head.appendChild(script);
  });
}

@Component({
  selector: 'app-operator-reports',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css',
})
export class ReportsComponent implements OnInit {
  private readonly reportsService = inject(OperatorReportsService);
  private readonly cashService = inject(OperatorCashService);
  private readonly reservationService = inject(OperatorReservationService);

  loading = this.reservationService.loading;

  dashboard = computed(() => this.reportsService.getDashboard());
  summary = computed(() => this.reportsService.getSummary());

  salesLabel = computed(() => formatCOP(this.summary().confirmedSales));

  periods = this.cashService.consolidation;
  hasPeriods = computed(() => this.periods().length > 0);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.reservationService.refresh(), this.cashService.refreshMonthlyConsolidation(currentPeriod())]);
  }

  formatAmount(value: number): string {
    return formatCOP(value);
  }

  async exportReport(): Promise<void> {
    try {
      const JsPDF = await loadJsPdf();
      const doc = buildReportsPdfDoc(JsPDF, this.dashboard(), this.summary(), this.periods());
      doc.save(buildReportsPdfFilename(this.periods()));
    } catch (error) {
      console.error('No fue posible generar el PDF del reporte.', error);
    }
  }
}
