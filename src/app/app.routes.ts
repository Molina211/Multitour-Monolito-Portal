import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { RecoverComponent } from './pages/recover/recover.component';
import { AdminLoginComponent } from './pages/admin-login/admin-login.component';
import { ClientDashboardComponent } from './pages/client/client-dashboard/client-dashboard.component';
import { ClientReservationsComponent } from './pages/client/client-reservations/client-reservations.component';
import { ClientPaymentsComponent } from './pages/client/client-payments/client-payments.component';
import { ClientGastronomyComponent } from './pages/client/client-gastronomy/client-gastronomy.component';
import { ClientRestaurantsComponent } from './pages/client/client-restaurants/client-restaurants.component';
import { ClientGastronomyDetailComponent } from './pages/client/client-gastronomy-detail/client-gastronomy-detail.component';
import { ClientLodgingComponent } from './pages/client/client-lodging/client-lodging.component';
import { ClientToursComponent } from './pages/client/client-tours/client-tours.component';
import { ClientTourDetailComponent } from './pages/client/client-tour-detail/client-tour-detail.component';
import { ClientTourBookingComponent } from './pages/client/client-tour-booking/client-tour-booking.component';
import { ClientReservationPaymentComponent } from './pages/client/client-reservation-payment/client-reservation-payment.component';
import { ClientProfileComponent } from './pages/client/client-profile/client-profile.component';
import { PlatformShellComponent } from './pages/platform/platform-shell/platform-shell.component';
import { DashboardComponent as PlatformDashboardComponent } from './pages/platform/dashboard/dashboard.component';
import { OperatorsComponent } from './pages/platform/operators/operators.component';
import { CreateOperatorComponent } from './pages/platform/create-operator/create-operator.component';
import { AuditComponent } from './pages/platform/audit/audit.component';
import { TenantDetailComponent } from './pages/platform/tenant-detail/tenant-detail.component';
import { OperatorShellComponent } from './pages/operator/operator-shell/operator-shell.component';
import { DashboardComponent as OperatorDashboardComponent } from './pages/operator/dashboard/dashboard.component';
import { ReservationsComponent } from './pages/operator/reservations/reservations.component';
import { CreateReservationComponent } from './pages/operator/create-reservation/create-reservation.component';
import { ReservationCreatedComponent } from './pages/operator/reservation-created/reservation-created.component';
import { ReservationDetailComponent } from './pages/operator/reservation-detail/reservation-detail.component';
import { PaymentManagementComponent } from './pages/operator/payment-management/payment-management.component';
import { ApplyDiscountComponent } from './pages/operator/apply-discount/apply-discount.component';
import { CatalogComponent } from './pages/operator/catalog/catalog.component';
import { NewServiceComponent } from './pages/operator/new-service/new-service.component';
import { ManageCatalogComponent } from './pages/operator/manage-catalog/manage-catalog.component';
import { ManageLodgingComponent } from './pages/operator/manage-lodging/manage-lodging.component';
import { ManageFoodComponent } from './pages/operator/manage-food/manage-food.component';
import { ManageRestaurantsComponent } from './pages/operator/manage-restaurants/manage-restaurants.component';
import { ManageTransportComponent } from './pages/operator/manage-transport/manage-transport.component';
import { ConfigureTransportComponent } from './pages/operator/configure-transport/configure-transport.component';
import { DiscountsComponent } from './pages/operator/discounts/discounts.component';
import { NewDiscountComponent } from './pages/operator/new-discount/new-discount.component';
import { EditDiscountComponent } from './pages/operator/edit-discount/edit-discount.component';
import { OperationComponent } from './pages/operator/operation/operation.component';
import { PaymentsComponent } from './pages/operator/payments/payments.component';
import { ValidateSupportComponent } from './pages/operator/validate-support/validate-support.component';
import { PaymentFollowupComponent } from './pages/operator/payment-followup/payment-followup.component';
import { RefundRequestsComponent } from './pages/operator/refund-requests/refund-requests.component';
import { RefundDetailComponent } from './pages/operator/refund-detail/refund-detail.component';
import { ManageRefundComponent } from './pages/operator/manage-refund/manage-refund.component';
import { CancelOrModifyReservationComponent } from './pages/operator/cancel-or-modify/cancel-or-modify.component';
import { CashComponent } from './pages/operator/cash/cash.component';
import { CashHistoryComponent } from './pages/operator/cash-history/cash-history.component';
import { CashMonthlyComponent } from './pages/operator/cash-monthly/cash-monthly.component';
import { RegisterExecutionComponent } from './pages/operator/register-execution/register-execution.component';
import { ReportsComponent } from './pages/operator/reports/reports.component';
import { colaboradorRestrictedGuard } from './pages/operator/colaborador-restricted.guard';
import { clientSessionGuard, operatorSessionGuard, platformSessionGuard } from './core/session.guard';
import { CollaboratorsComponent } from './pages/operator/collaborators/collaborators.component';
import { RegisterCollaboratorComponent } from './pages/operator/register-collaborator/register-collaborator.component';
import { CollaboratorDetailComponent } from './pages/operator/collaborator-detail/collaborator-detail.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'crear-cuenta', component: SignupComponent },
  { path: 'recuperar', component: RecoverComponent },
  { path: 'admin-login', component: AdminLoginComponent },
  // Catalogo de solo lectura (tours/gastronomia/restaurantes/hospedaje): navegable sin
  // sesion, igual que cualquier catalogo publico antes de crear cuenta o iniciar sesion.
  { path: 'client/tours', component: ClientToursComponent },
  { path: 'client/tours/detail', component: ClientTourDetailComponent },
  { path: 'client/gastronomy', component: ClientGastronomyComponent },
  { path: 'client/gastronomy/restaurants', component: ClientRestaurantsComponent },
  { path: 'client/gastronomy/detail', component: ClientGastronomyDetailComponent },
  { path: 'client/lodging', component: ClientLodgingComponent },
  // Area privada del Cliente: requiere sesion real END_CUSTOMER (Fase 3).
  { path: 'client', component: ClientDashboardComponent, canActivate: [clientSessionGuard] },
  { path: 'client/reservations', component: ClientReservationsComponent, canActivate: [clientSessionGuard] },
  {
    path: 'client/reservations/payment',
    component: ClientReservationPaymentComponent,
    canActivate: [clientSessionGuard],
  },
  { path: 'client/payments', component: ClientPaymentsComponent, canActivate: [clientSessionGuard] },
  { path: 'client/tours/booking', component: ClientTourBookingComponent, canActivate: [clientSessionGuard] },
  { path: 'client/profile', component: ClientProfileComponent, canActivate: [clientSessionGuard] },
  {
    path: 'platform',
    component: PlatformShellComponent,
    canActivate: [platformSessionGuard],
    children: [
      { path: '', component: PlatformDashboardComponent },
      { path: 'operators', component: OperatorsComponent },
      { path: 'operators/new', component: CreateOperatorComponent },
      { path: 'operators/:tenantId', component: TenantDetailComponent },
      { path: 'audit', component: AuditComponent },
    ],
  },
  {
    path: 'operator',
    component: OperatorShellComponent,
    canActivate: [operatorSessionGuard],
    children: [
      { path: '', component: OperatorDashboardComponent },
      { path: 'reservations', component: ReservationsComponent },
      { path: 'reservations/new', component: CreateReservationComponent },
      { path: 'reservations/created', component: ReservationCreatedComponent },
      { path: 'reservations/detail', component: ReservationDetailComponent },
      { path: 'reservations/payment', component: PaymentManagementComponent },
      {
        path: 'reservations/apply-discount',
        component: ApplyDiscountComponent,
        canActivate: [colaboradorRestrictedGuard],
        data: { colaboradorFallback: '/operator/reservations' },
      },
      { path: 'reservations/manage-refund', component: ManageRefundComponent },
      { path: 'reservations/cancel-or-modify', component: CancelOrModifyReservationComponent },
      { path: 'catalog', component: CatalogComponent },
      {
        path: 'catalog/new-service',
        component: NewServiceComponent,
        canActivate: [colaboradorRestrictedGuard],
        data: { colaboradorFallback: '/operator/catalog' },
      },
      // "Ver detalle" del Colaborador operativo reutiliza estas MISMAS rutas en modo solo
      // lectura (sin crear/activar/desactivar); ya no se bloquean por completo.
      { path: 'catalog/tours', component: ManageCatalogComponent },
      { path: 'catalog/lodging', component: ManageLodgingComponent },
      { path: 'catalog/food', component: ManageFoodComponent },
      { path: 'catalog/restaurants', component: ManageRestaurantsComponent },
      { path: 'catalog/transport', component: ManageTransportComponent },
      { path: 'catalog/transport/configure', component: ConfigureTransportComponent },
      {
        path: 'discounts',
        component: DiscountsComponent,
        canActivate: [colaboradorRestrictedGuard],
        data: { colaboradorFallback: '/operator' },
      },
      {
        path: 'discounts/new',
        component: NewDiscountComponent,
        canActivate: [colaboradorRestrictedGuard],
        data: { colaboradorFallback: '/operator' },
      },
      {
        path: 'discounts/edit',
        component: EditDiscountComponent,
        canActivate: [colaboradorRestrictedGuard],
        data: { colaboradorFallback: '/operator' },
      },
      { path: 'operations', component: OperationComponent },
      { path: 'operations/register-execution', component: RegisterExecutionComponent },
      { path: 'payments', component: PaymentsComponent },
      // Sin el permiso de tenant (OPERATOR_COLLABORATOR_CAN_VALIDATE_SUPPORT), el Colaborador
      // operativo igual puede ENTRAR a esta pantalla para consultar el soporte en modo solo
      // lectura ("Ver soporte"): el propio componente oculta Aprobar/Rechazar en ese caso, sin
      // redirigirlo (PDR RF-015A linea 554 - nunca deja la accion sin una opcion valida).
      { path: 'payments/validate', component: ValidateSupportComponent },
      { path: 'payments/followup', component: PaymentFollowupComponent },
      { path: 'payments/refunds', component: RefundRequestsComponent },
      { path: 'payments/refunds/detail', component: RefundDetailComponent },
      { path: 'cash', component: CashComponent },
      { path: 'cash/history', component: CashHistoryComponent },
      { path: 'cash/monthly', component: CashMonthlyComponent },
      { path: 'reports', component: ReportsComponent },
      // Gestion de colaboradores: solo el Administrador del operador puede acceder (PDR
      // linea 102/112/116/947: el Colaborador operativo no registra ni administra usuarios).
      {
        path: 'collaborators',
        component: CollaboratorsComponent,
        canActivate: [colaboradorRestrictedGuard],
        data: { colaboradorFallback: '/operator' },
      },
      {
        path: 'collaborators/new',
        component: RegisterCollaboratorComponent,
        canActivate: [colaboradorRestrictedGuard],
        data: { colaboradorFallback: '/operator' },
      },
      {
        path: 'collaborators/detail',
        component: CollaboratorDetailComponent,
        canActivate: [colaboradorRestrictedGuard],
        data: { colaboradorFallback: '/operator' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
