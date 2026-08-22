import {
  Component,
  inject,
  computed,
  signal,
  effect,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UneticStore } from '../core/unetic-store.service';
import { DnsStore } from './dns.store';
import { DnsConfig } from './dns.model';

@Component({
  selector: 'app-dns',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './dns.component.html',
  styleUrls: ['./dns.component.scss'],
})
export class DnsComponent {
  readonly store = inject(UneticStore);
  readonly dnsStore = inject(DnsStore);

  upstreamType = signal<'isp' | 'cloudflare' | 'google' | 'quad9' | 'custom'>(
    'isp',
  );
  primaryDns = signal('');
  secondaryDns = signal('');

  localDomainEnabled = signal(true);
  localDomain = signal('home.local');

  dhcpStart = signal(100);
  dhcpLimit = signal(150);
  dhcpLeaseHours = signal(24);

  newRecordHostname = signal('');
  newRecordIp = signal('');
  showAddRecord = signal(false);

  constructor() {
    effect(
      () => {
        const cfg = this.dnsStore.dns();
        if (cfg) {
          untracked(() => {
            if (!cfg.upstream || cfg.upstream.length === 0) {
              this.upstreamType.set('isp');
              this.primaryDns.set('');
              this.secondaryDns.set('');
            } else if (
              cfg.upstream[0] === '1.1.1.1' &&
              cfg.upstream[1] === '1.0.0.1'
            ) {
              this.upstreamType.set('cloudflare');
            } else if (
              cfg.upstream[0] === '8.8.8.8' &&
              cfg.upstream[1] === '8.8.4.4'
            ) {
              this.upstreamType.set('google');
            } else if (
              cfg.upstream[0] === '9.9.9.9' &&
              cfg.upstream[1] === '149.112.112.112'
            ) {
              this.upstreamType.set('quad9');
            } else {
              this.upstreamType.set('custom');
              this.primaryDns.set(cfg.upstream[0] || '');
              this.secondaryDns.set(cfg.upstream[1] || '');
            }

            if (cfg.local_domain) {
              this.localDomainEnabled.set(true);
              this.localDomain.set(cfg.local_domain);
            } else {
              this.localDomainEnabled.set(false);
              this.localDomain.set('home.local');
            }

            this.dhcpStart.set(cfg.dhcp_start);
            this.dhcpLimit.set(cfg.dhcp_limit);
            this.dhcpLeaseHours.set(cfg.dhcp_lease_hours);
          });
        }
      },
      { allowSignalWrites: true },
    );
  }

  saveConfig() {
    let upstream: string[] = [];
    switch (this.upstreamType()) {
      case 'isp':
        upstream = [];
        break;
      case 'cloudflare':
        upstream = ['1.1.1.1', '1.0.0.1'];
        break;
      case 'google':
        upstream = ['8.8.8.8', '8.8.4.4'];
        break;
      case 'quad9':
        upstream = ['9.9.9.9', '149.112.112.112'];
        break;
      case 'custom':
        if (this.primaryDns()) upstream.push(this.primaryDns());
        if (this.secondaryDns()) upstream.push(this.secondaryDns());
        break;
    }

    const cfg: DnsConfig = {
      upstream,
      local_domain: this.localDomainEnabled()
        ? this.localDomain() || 'home.local'
        : null,
      dhcp_start: this.dhcpStart(),
      dhcp_limit: this.dhcpLimit(),
      dhcp_lease_hours: this.dhcpLeaseHours(),
      custom_records: this.dnsStore.dns()?.custom_records || [],
    };
    this.dnsStore.setConfig(cfg);
  }

  addRecord() {
    if (!this.newRecordHostname() || !this.newRecordIp()) return;
    this.dnsStore.addRecord({
      hostname: this.newRecordHostname(),
      ip: this.newRecordIp(),
    });
    this.newRecordHostname.set('');
    this.newRecordIp.set('');
    this.showAddRecord.set(false);
  }

  removeRecord(id: string) {
    this.dnsStore.removeRecord(id);
  }
}
