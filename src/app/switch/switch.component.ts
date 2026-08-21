import { Component, inject } from '@angular/core';
import { UneticStore } from '../core/unetic-store.service';

@Component({
  selector: 'app-switch',
  standalone: true,
  templateUrl: './switch.component.html',
})
export class SwitchComponent {
  readonly store = inject(UneticStore);
}
