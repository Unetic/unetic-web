import { Component, computed, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UneticStore } from '../core/unetic-store.service';
import { WifiStore } from '../core/wifi.store';

@Component({
  selector: 'app-wifi',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './wifi.component.html',
})
export class WifiComponent {
  readonly store = inject(UneticStore);
  readonly wifi = inject(WifiStore);

  save(): void {
    void this.wifi.saveSsid();
  }
}
