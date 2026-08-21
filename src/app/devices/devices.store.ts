import { Injectable, OnDestroy, signal } from '@angular/core';
import { Device } from './devices.model';
import { ApiEnvelope } from '../core/models';
import { UbusClient } from '../core/ubus-client.service';
import { UneticStore } from '../core/unetic-store.service';

@Injectable({ providedIn: 'root' })
export class DevicesStore implements OnDestroy {
  readonly devices = signal<Device[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private pollingTimer?: number;

  constructor(
    private readonly ubus: UbusClient,
    private readonly uneticStore: UneticStore,
  ) {}

  async fetchDevices(): Promise<Device[]> {
    if (!this.ubus.authenticated) {
      return [];
    }

    this.loading.set(true);
    try {
      const envelope = await this.ubus.call<
        ApiEnvelope<Device[] | { devices: Device[] }>
      >('devices.list', {});
      this.uneticStore.applyEnvelope(envelope);

      if (envelope.ok && envelope.result !== undefined) {
        let list: Device[] = [];
        if (Array.isArray(envelope.result)) {
          list = envelope.result;
        } else if (
          typeof envelope.result === 'object' &&
          envelope.result !== null &&
          'devices' in envelope.result &&
          Array.isArray(envelope.result.devices)
        ) {
          list = envelope.result.devices;
        }
        this.devices.set(list);
        this.error.set(null);
        return list;
      } else if (envelope.error) {
        this.error.set(envelope.error.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.error.set(message);
    } finally {
      this.loading.set(false);
    }
    return [];
  }

  startPolling(intervalMs = 5000): void {
    this.stopPolling();
    void this.fetchDevices();
    this.pollingTimer = window.setInterval(() => {
      void this.fetchDevices();
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollingTimer !== undefined) {
      window.clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
