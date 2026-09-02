import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlatformDataService } from '../platform-data.service';

@Component({
  selector: 'app-platform-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private readonly platformData = inject(PlatformDataService);

  tenants = this.platformData.tenants;
  activeCount = computed(() => this.tenants().filter((tenant) => tenant.status === 'Activo').length);
  inactiveCount = computed(() => this.tenants().length - this.activeCount());
  totalCount = computed(() => this.tenants().length);
  preview = computed(() => this.tenants().slice(0, 3));

  initial(name: string): string {
    return name.slice(0, 1);
  }
}
