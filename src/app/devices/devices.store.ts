import { Injectable, OnDestroy, signal } from '@angular/core';
import { Device, NewPortForward } from './devices.model';
import { UbusClient } from '../core/ubus-client.service';
import { UneticStore } from '../core/unetic-store.service';
import { APP_CONSTANTS } from '../core/constants';

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
      const devices = await this.ubus.call<Device[]>('devices.list', {});
      this.devices.set(devices);
      this.error.set(null);
      return devices;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.error.set(message);
    } finally {
      this.loading.set(false);
    }
    return [];
  }

  async registerDevice(mac: string, name: string): Promise<void> {
    await this.ubus.call('devices.register', { mac, name });
    await this.fetchDevices();
  }

  async updateDevice(
    uuid: string,
    updates: Pick<Device, 'name' | 'is_static_ip'>,
  ): Promise<void> {
    await this.ubus.call('devices.update', { uuid, ...updates });
    await this.fetchDevices();
  }

  async deleteDevice(uuid: string): Promise<void> {
    await this.ubus.call('devices.delete', { uuid });
    await this.fetchDevices();
  }

  async addPortForward(
    uuid: string,
    port_forward: NewPortForward,
  ): Promise<void> {
    await this.ubus.call('devices.add_port_forward', { uuid, port_forward });
    await this.fetchDevices();
  }

  async removePortForward(uuid: string, pfId: string): Promise<void> {
    await this.ubus.call('devices.remove_port_forward', { uuid, pf_id: pfId });
    await this.fetchDevices();
  }

  startPolling(intervalMs = APP_CONSTANTS.POLLING_INTERVAL_MS): void {
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
