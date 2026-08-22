import { Injectable, computed, signal } from '@angular/core';
import { SetWifiConfigRequest } from './wifi.model';
import { ApiEnvelope, OperationAccepted } from '../core/models';
import { UneticStore } from '../core/unetic-store.service';
import { UbusClient } from '../core/ubus-client.service';

@Injectable({ providedIn: 'root' })
export class WifiStore {
  readonly draftSsid = signal('');
  readonly draftEncryption = signal('psk2');
  readonly draftKey = signal('');

  readonly canSave = computed(() => {
    const state = this.uneticStore.state();
    return (
      !!state &&
      state.lifecycle === 'ready' &&
      !state.maintenance.enabled &&
      !state.active_operation &&
      this.isValidSsid(this.draftSsid()) &&
      this.isValidKey(this.draftEncryption(), this.draftKey())
    );
  });

  constructor(
    private readonly uneticStore: UneticStore,
    private readonly ubus: UbusClient,
  ) {}

  async saveConfig(): Promise<void> {
    const state = this.uneticStore.state();
    const ssid = this.draftSsid();
    const encryption = this.draftEncryption();
    const key = this.draftKey();
    if (!state || !this.canSave()) {
      return;
    }

    this.uneticStore.error.set(null);
    const requestId = crypto.randomUUID();
    this.uneticStore.currentRequestId = requestId;

    const payload: SetWifiConfigRequest = {
      ssid,
      encryption,
      ...(encryption !== 'none' && key ? { key } : {}),
      expected_revision: state.revision,
      request_id: requestId,
    };

    try {
      const envelope = await this.ubus.call<ApiEnvelope<OperationAccepted>>(
        'wifi.set_config',
        payload,
      );
      if (envelope.result?.noop) {
        this.uneticStore.currentRequestId = null;
        const currentState = this.uneticStore.state();
        if (currentState) {
          this.draftSsid.set(currentState.wifi.ssid);
          if (currentState.wifi.encryption) {
            this.draftEncryption.set(currentState.wifi.encryption);
          }
        }
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

  private isValidKey(encryption: string, key: string): boolean {
    if (encryption === 'none') {
      return true;
    }
    return key.length >= 8 && key.length <= 63;
  }
}
