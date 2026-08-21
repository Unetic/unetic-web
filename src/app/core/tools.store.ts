import { Injectable, computed, signal } from '@angular/core';
import { ApiEnvelope, PingResult } from './models';
import { UbusClient } from './ubus-client.service';
import { UneticStore } from './unetic-store.service';

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
      const envelope = await this.ubus.call<ApiEnvelope<PingResult | string>>(
        'tools.ping',
        { host: target },
      );
      this.uneticStore.applyEnvelope(envelope);

      if (envelope.ok && envelope.result !== undefined) {
        let outputText = '';
        if (typeof envelope.result === 'string') {
          outputText = envelope.result;
        } else if (
          typeof envelope.result === 'object' &&
          envelope.result !== null
        ) {
          const res = envelope.result as { output?: string; stdout?: string };
          outputText =
            res.output ?? res.stdout ?? JSON.stringify(envelope.result);
        }
        this.pingOutput.set(outputText);
        return outputText;
      } else if (envelope.error) {
        this.error.set(envelope.error.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.error.set(message);
    } finally {
      this.pinging.set(false);
    }
    return null;
  }
}
