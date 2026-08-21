import { Component, inject } from '@angular/core';
import { UneticStore } from '../core/unetic-store.service';

@Component({
  selector: 'app-system',
  standalone: true,
  templateUrl: './system.component.html',
})
export class SystemComponent {
  readonly store = inject(UneticStore);

  formatUptime(secs: number): string {
    const days = Math.floor(secs / 86400);
    const hours = Math.floor((secs % 86400) / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  formatMemory(kb: number): string {
    if (kb >= 1048576) {
      return `${(kb / 1048576).toFixed(1)} GB`;
    }
    return `${(kb / 1024).toFixed(0)} MB`;
  }
}
