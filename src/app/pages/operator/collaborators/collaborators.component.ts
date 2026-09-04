import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperatorCollaboratorService } from '../operator-collaborator.service';
import { OperatorRoleService } from '../operator-role.service';

@Component({
  selector: 'app-operator-collaborators',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './collaborators.component.html',
  styleUrl: './collaborators.component.css',
})
export class CollaboratorsComponent {
  private readonly collaboratorService = inject(OperatorCollaboratorService);
  readonly roleService = inject(OperatorRoleService);

  // PDR linea 95/1040: solo colaboradores del tenant activo (aislamiento por tenant, ya
  // aplicado dentro del servicio).
  collaborators = computed(() => this.collaboratorService.getAll());
  hasCollaborators = computed(() => this.collaborators().length > 0);

  // BUG corregido: antes era una constante fija (nunca habilitada). PDR linea 114/554: la
  // validacion/rechazo de soportes por el Colaborador operativo solo aplica si el tenant lo
  // habilita expresamente; ahora es un parametro real que el Administrador puede activar.
  canValidateSupport = this.roleService.collaboratorCanValidateSupport;

  toggleCanValidateSupport(): void {
    this.roleService.setCollaboratorCanValidateSupport(!this.canValidateSupport());
  }
}
