import { Injectable, computed } from '@angular/core';
import { UneticStore } from '../core/unetic-store.service';
import { UbusClient } from '../core/ubus-client.service';
import { DnsConfig, DnsRecord } from './dns.model';

@Injectable({ providedIn: 'root' })
export class DnsStore {
  readonly dns = computed(() => this.store.state()?.dns ?? null);

  constructor(
    private readonly store: UneticStore,
    private readonly ubus: UbusClient,
  ) {}

  async setConfig(cfg: DnsConfig): Promise<void> {
    await this.ubus.call('dns.set', {
      ...cfg,
      request_id: crypto.randomUUID(),
    });
  }

  async addRecord(record: Omit<DnsRecord, 'id'>): Promise<void> {
    await this.ubus.call('dns.record.add', {
      id: crypto.randomUUID(),
      hostname: record.hostname,
      ip: record.ip,
      request_id: crypto.randomUUID(),
    });
  }

  async removeRecord(id: string): Promise<void> {
    await this.ubus.call('dns.record.remove', {
      id,
      request_id: crypto.randomUUID(),
    });
  }
}
