import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UneticStore } from '../core/unetic-store.service';
import { WanStore } from '../core/wan.store';

@Component({
  selector: 'app-wan',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './wan.component.html',
})
export class WanComponent {
  readonly store = inject(UneticStore);
  readonly wan = inject(WanStore);

  saveWan(): void {
    void this.wan.saveWan();
  }
}
