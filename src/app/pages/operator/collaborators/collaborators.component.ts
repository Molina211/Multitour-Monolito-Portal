import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CollaboratorApiService, CollaboratorResponse } from '../../../core/collaborator-api.service';
import { isNetworkError, NETWORK_ERROR_MESSAGE } from '../../../core/http-error.util';
import { SessionService } from '../../../core/session.service';
import { OperatorRoleService } from '../operator-role.service';

@Component({
  selector: 'app-operator-collaborators',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './collaborators.component.html',
  styleUrl: './collaborators.component.css',
})
export class CollaboratorsComponent implements OnInit {
  private readonly collaboratorApi = inject(CollaboratorApiService);
  private readonly sessionService = inject(SessionService);
  readonly roleService = inject(OperatorRoleService);

  private readonly collaboratorsSignal = signal<CollaboratorResponse[]>([]);
  loading = signal(true);
  error = signal('');

  collaborators = this.collaboratorsSignal.asReadonly();

  // BUG corregido: antes era una constante fija (nunca habilitada). PDR linea 114/554: la
  // validacion/rechazo de soportes por el Colaborador operativo solo aplica si el tenant lo
  // habilita expresamente; ahora es un parametro real que el Administrador puede activar.
  // NOTA: el Backend ya expone PATCH /api/tenants/{tenantId}/collaborator-support-permission
  // para esto (TenantController), pero no forma parte de las APIs asignadas a este bloque de
  // integracion (Colaboradores) - se deja igual (localStorage) hasta que se asigne.
  canValidateSupport = this.roleService.collaboratorCanValidateSupport;

  toggleCanValidateSupport(): void {
    this.roleService.setCollaboratorCanValidateSupport(!this.canValidateSupport());
  }

  ngOnInit(): void {
    const tenantId = this.sessionService.tenantId();
    if (!tenantId) {
      this.loading.set(false);
      this.error.set('No hay una sesión activa.');
      return;
    }
    this.collaboratorApi.listByTenant(tenantId).subscribe({
      next: (items) => {
        this.collaboratorsSignal.set(items);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(isNetworkError(err) ? NETWORK_ERROR_MESSAGE : 'No fue posible cargar los colaboradores.');
        this.loading.set(false);
      },
    });
  }
}
