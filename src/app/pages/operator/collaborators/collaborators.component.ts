import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperatorCollaboratorService } from '../operator-collaborator.service';

@Component({
  selector: 'app-operator-collaborators',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './collaborators.component.html',
  styleUrl: './collaborators.component.css',
})
export class CollaboratorsComponent {
  private readonly collaboratorService = inject(OperatorCollaboratorService);

  // PDR linea 95/1040: solo colaboradores del tenant activo (aislamiento por tenant, ya
  // aplicado dentro del servicio).
  collaborators = computed(() => this.collaboratorService.getAll());
  hasCollaborators = computed(() => this.collaborators().length > 0);
}
