import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { OPERATOR_CURRENT_TENANT_NAME, OperatorCollaboratorService } from '../operator-collaborator.service';

@Component({
  selector: 'app-operator-collaborator-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './collaborator-detail.component.html',
  styleUrl: './collaborator-detail.component.css',
})
export class CollaboratorDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly collaboratorService = inject(OperatorCollaboratorService);

  readonly tenantName = OPERATOR_CURRENT_TENANT_NAME;
  readonly id = this.route.snapshot.queryParamMap.get('id') || '';
  readonly collaborator = this.collaboratorService.getById(this.id);
}
