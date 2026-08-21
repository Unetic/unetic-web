import { Injectable, computed, signal } from '@angular/core';
import { ApiEnvelope, OperationAccepted } from './models';
import { UneticStore } from './unetic-store.service';
import { UbusClient } from './ubus-client.service';

@Injectable({ providedIn: 'root' })
export class WifiStore {
  readonly draftSsid = signal('');
  
  readonly canSave = computed(() => {
    const state = this.uneticStore.state();
    return (
      !!state &&
      state.lifecycle === 'ready' &&
      !state.maintenance.enabled &&
      !state.active_operation &&
      this.isValidSsid(this.draftSsid()) &&
      this.draftSsid() !== state.wifi.ssid
    );
  });

  constructor(
    private readonly uneticStore: UneticStore,
    private readonly ubus: UbusClient,
  ) {}

  async saveSsid(): Promise<void> {
    const state = this.uneticStore.state();
    const ssid = this.draftSsid();
    if (!state || !this.canSave()) {
      return;
    }

    this.uneticStore.error.set(null);
    const requestId = crypto.randomUUID();
    this.uneticStore.currentRequestId = requestId;

    try {
      const envelope = await this.ubus.call<ApiEnvelope<OperationAccepted>>(
        'wifi.set_ssid',
        {
          ssid,
          expected_revision: state.revision,
          request_id: requestId,
        },
      );
      this.uneticStore.applyEnvelope(envelope);
      if (!envelope.ok || envelope.result?.noop) {
        this.uneticStore.currentRequestId = null;
        this.draftSsid.set(envelope.state.wifi.ssid);
      }
    } catch {
      this.uneticStore.connected.set(false);
      this.uneticStore.error.set('Connection lost — checking the result…');
      this.uneticStore.scheduleReconnect();
    }
  }

  private isValidSsid(value: string): boolean {
    const bytes = new TextEncoder().encode(value).byteLength;
    return bytes > 0 && bytes <= 32 && !value.includes('\0');
  }
}
