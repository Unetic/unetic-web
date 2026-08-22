import { Injectable, OnDestroy, signal } from '@angular/core';
import { PortInfo } from './ports.model';
import { UbusClient } from '../core/ubus-client.service';
import { APP_CONSTANTS } from '../core/constants';

@Injectable({ providedIn: 'root' })
export class PortsStore implements OnDestroy {
  readonly ports = signal<PortInfo[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private pollingTimer?: number;

  constructor(private readonly ubus: UbusClient) {}

  async fetchPorts(): Promise<PortInfo[]> {
    if (!this.ubus.authenticated) {
      return [];
    }

    this.loading.set(true);
    try {
      const ports = await this.ubus.call<PortInfo[]>('ports.list', {});
      this.ports.set(ports);
      this.error.set(null);
      return ports;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.error.set(message);
    } finally {
      this.loading.set(false);
    }
    return [];
  }

  startPolling(intervalMs = APP_CONSTANTS.POLLING_INTERVAL_MS): void {
    this.stopPolling();
    void this.fetchPorts();
    this.pollingTimer = window.setInterval(() => {
      void this.fetchPorts();
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
