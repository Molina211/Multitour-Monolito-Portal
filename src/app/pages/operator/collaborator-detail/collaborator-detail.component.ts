import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CollaboratorApiService, CollaboratorResponse } from '../../../core/collaborator-api.service';
import { SessionService } from '../../../core/session.service';

@Component({
  selector: 'app-operator-collaborator-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './collaborator-detail.component.html',
  styleUrl: './collaborator-detail.component.css',
})
export class CollaboratorDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly collaboratorApi = inject(CollaboratorApiService);
  private readonly sessionService = inject(SessionService);

  readonly tenantName = this.sessionService.tenantId() || '';
  readonly id = this.route.snapshot.queryParamMap.get('id') || '';

  loading = signal(true);
  collaborator = signal<CollaboratorResponse | null>(null);

  ngOnInit(): void {
    const tenantId = this.sessionService.tenantId();
    if (!tenantId || !this.id) {
      this.loading.set(false);
      return;
    }
    this.collaboratorApi.getById(tenantId, this.id).subscribe({
      next: (item) => {
        this.collaborator.set(item);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
