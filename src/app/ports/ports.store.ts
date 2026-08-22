import { Injectable, OnDestroy, signal } from '@angular/core';
import { PortInfo } from './ports.model';
import { ApiEnvelope } from '../core/models';
import { UbusClient } from '../core/ubus-client.service';

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
      const envelope = await this.ubus.call<
        ApiEnvelope<PortInfo[] | { ports: PortInfo[] }>
      >('ports.list', {});

      if (envelope.result !== undefined) {
        let list: PortInfo[] = [];
        if (Array.isArray(envelope.result)) {
          list = envelope.result;
        } else if (
          typeof envelope.result === 'object' &&
          envelope.result !== null &&
          'ports' in envelope.result &&
          Array.isArray(envelope.result.ports)
        ) {
          list = envelope.result.ports;
        }
        this.ports.set(list);
        this.error.set(null);
        return list;
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
