import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-operator-operation',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './operation.component.html',
  styleUrl: './operation.component.css',
})
export class OperationComponent {}
