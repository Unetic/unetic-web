import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UneticStore } from '../core/unetic-store.service';
import { WifiStore } from '../wifi/wifi.store';
import { SystemApiService } from '../core/system-api.service';

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
  readonly systemApi = inject(SystemApiService);
  readonly showPassword = signal(false);

  readonly isOptimizing = signal(false);

  save(): void {
    void this.wifi.saveConfig();
  }

  async optimizeMesh(): Promise<void> {
    this.isOptimizing.set(true);
    try {
      await this.systemApi.optimizeMesh();
      alert('Mesh optimized successfully!');
    } catch (err) {
      alert('Mesh optimization failed.');
    } finally {
      this.isOptimizing.set(false);
    }
  }
}
