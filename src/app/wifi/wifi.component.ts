import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UneticStore } from '../core/unetic-store.service';
import { WifiStore } from '../wifi/wifi.store';

@Component({
  selector: 'app-wifi',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './wifi.component.html',
  styleUrl: './wifi.component.scss',
})
export class WifiComponent {
  readonly store = inject(UneticStore);
  readonly wifi = inject(WifiStore);
  readonly showPassword = signal(false);

  save(): void {
    void this.wifi.saveConfig();
  }
}
