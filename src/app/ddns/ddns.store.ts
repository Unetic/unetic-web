import { Injectable, computed } from '@angular/core';
import { UneticStore } from '../core/unetic-store.service';
import { UbusClient } from '../core/ubus-client.service';
import { DdnsConfig, DdnsStatus } from './ddns.model';

export function defaultDdnsConfig(): DdnsConfig {
  return {
    enabled: false,
    provider: 'none',
    cloudflare: { zone_id: '', record_id: '', api_token: '', hostname: '' },
    duckdns: { token: '', domain: '' }
  };
}

export function defaultDdnsStatus(): DdnsStatus {
  return { last_ip: null, last_update_ts: null, last_error: null };
}

@Injectable({ providedIn: 'root' })
export class DdnsStore {
  readonly ddnsConfig = computed(() => this.store.state()?.ddns_config ?? defaultDdnsConfig());
  readonly ddnsStatus = computed(() => this.store.state()?.ddns_status ?? defaultDdnsStatus());

  constructor(
    private readonly store: UneticStore,
    private readonly ubus: UbusClient,
  ) {}

  async setConfig(cfg: DdnsConfig): Promise<void> {
    const reqId = crypto.randomUUID();
    this.store.currentRequestId = reqId;
    try {
      await this.ubus.call('ddns.set', {
        ...cfg,
        request_id: reqId,
      });
    } catch (e) {
      this.store.currentRequestId = null;
      throw e;
    }
  }

  async test(): Promise<any> {
    return this.ubus.call('ddns.test', {});
  }
}
