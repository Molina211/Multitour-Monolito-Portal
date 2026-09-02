import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { RecoverComponent } from './pages/recover/recover.component';
import { AdminLoginComponent } from './pages/admin-login/admin-login.component';
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
import { DiscountsComponent } from './pages/operator/discounts/discounts.component';
import { NewDiscountComponent } from './pages/operator/new-discount/new-discount.component';
import { EditDiscountComponent } from './pages/operator/edit-discount/edit-discount.component';
import { OperationComponent } from './pages/operator/operation/operation.component';
import { PaymentsComponent } from './pages/operator/payments/payments.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'crear-cuenta', component: SignupComponent },
  { path: 'recuperar', component: RecoverComponent },
  { path: 'admin-login', component: AdminLoginComponent },
  {
    path: 'platform',
    component: PlatformShellComponent,
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
    children: [
      { path: '', component: OperatorDashboardComponent },
      { path: 'reservations', component: ReservationsComponent },
      { path: 'reservations/new', component: CreateReservationComponent },
      { path: 'reservations/created', component: ReservationCreatedComponent },
      { path: 'reservations/detail', component: ReservationDetailComponent },
      { path: 'reservations/payment', component: PaymentManagementComponent },
      { path: 'reservations/apply-discount', component: ApplyDiscountComponent },
      { path: 'catalog', component: CatalogComponent },
      { path: 'catalog/new-service', component: NewServiceComponent },
      { path: 'catalog/tours', component: ManageCatalogComponent },
      { path: 'catalog/lodging', component: ManageLodgingComponent },
      { path: 'catalog/food', component: ManageFoodComponent },
      { path: 'discounts', component: DiscountsComponent },
      { path: 'discounts/new', component: NewDiscountComponent },
      { path: 'discounts/edit', component: EditDiscountComponent },
      { path: 'operations', component: OperationComponent },
      { path: 'payments', component: PaymentsComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
