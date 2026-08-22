import { Component, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DdnsStore } from './ddns.store';
import { UneticStore } from '../core/unetic-store.service';
import { DdnsConfig } from './ddns.model';

@Component({
  selector: 'app-ddns',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ddns.component.html',
  styleUrls: ['./ddns.component.scss'],
})
export class DdnsComponent {
  config = signal<DdnsConfig>({
    enabled: false,
    provider: 'none',
    cloudflare: { zone_id: '', record_id: '', api_token: '', hostname: '' },
    duckdns: { token: '', domain: '' }
  });

  testResult = signal<{ success: boolean; message?: string } | null>(null);

  constructor(
    public store: DdnsStore,
    public uneticStore: UneticStore,
  ) {
    effect(() => {
      const current = this.store.ddnsConfig();
      this.config.set({
        enabled: current.enabled ?? false,
        provider: current.provider ?? 'none',
        cloudflare: {
          zone_id: current.cloudflare?.zone_id ?? '',
          record_id: current.cloudflare?.record_id ?? '',
          api_token: current.cloudflare?.api_token ?? '',
          hostname: current.cloudflare?.hostname ?? ''
        },
        duckdns: {
          token: current.duckdns?.token ?? '',
          domain: current.duckdns?.domain ?? ''
        }
      });
    }, { allowSignalWrites: true });
  }

  timeAgo(ts: number | null): string {
    if (!ts) return '';
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  }

  async save(): Promise<void> {
    const cfg = this.config();
    if (!cfg.enabled) {
      cfg.provider = 'none';
    }
    await this.store.setConfig(cfg);
  }

  async testConnection(): Promise<void> {
    try {
      this.testResult.set(null);
      await this.store.test();
      this.testResult.set({ success: true, message: 'Test successful' });
    } catch (e: any) {
      this.testResult.set({ success: false, message: e.message || 'Test failed' });
    }
  }
}
