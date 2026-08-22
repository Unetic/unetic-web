import { Injectable, computed, signal } from '@angular/core';
import { PingResult } from './diagnostics.model';
import { UbusClient } from '../core/ubus-client.service';
import { UneticStore } from '../core/unetic-store.service';

@Injectable({ providedIn: 'root' })
export class ToolsStore {
  readonly targetHost = signal('');
  readonly pingOutput = signal('');
  readonly pinging = signal(false);
  readonly error = signal<string | null>(null);

  readonly canPing = computed(() => {
    return this.targetHost().trim().length > 0 && !this.pinging();
  });

  constructor(
    private readonly ubus: UbusClient,
    private readonly uneticStore: UneticStore,
  ) {}

  async ping(host?: string): Promise<string | null> {
    const target = (host ?? this.targetHost()).trim();
    if (!target) {
      return null;
    }

    this.pinging.set(true);
    this.error.set(null);
    this.pingOutput.set('');

    try {
      const result = await this.ubus.call<PingResult>('tools.ping', {
        host: target,
      });
      this.pingOutput.set(result.output);
      return result.output;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.error.set(message);
    } finally {
      this.pinging.set(false);
    }
    return null;
  }
}
