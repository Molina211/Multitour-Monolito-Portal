import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlatformDataService } from '../platform-data.service';

@Component({
  selector: 'app-platform-operators',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './operators.component.html',
  styleUrl: './operators.component.css',
})
export class OperatorsComponent {
  private readonly platformData = inject(PlatformDataService);

  tenants = this.platformData.tenants;
}
