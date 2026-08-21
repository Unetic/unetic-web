import { Injectable, computed, signal } from '@angular/core';
import {
  ApiEnvelope,
  OperationAccepted,
  WanProtocol,
  WanPublicState,
} from './models';
import { UneticStore } from './unetic-store.service';
import { UbusClient } from './ubus-client.service';

@Injectable({ providedIn: 'root' })
export class WanStore {
  readonly wan = computed<WanPublicState>(() => {
    return (
      this.uneticStore.state()?.wan ?? {
        present: true,
        proto: 'dhcp',
        status: 'not_configured',
        dns: [],
        uptime_secs: 0,
      }
    );
  });

  readonly draftWanProto = signal<WanProtocol>('dhcp');
  readonly draftWanIp = signal('');
  readonly draftWanNetmask = signal('255.255.255.0');
  readonly draftWanGateway = signal('');
  readonly draftWanDns = signal('');
  readonly draftWanUsername = signal('');
  readonly draftWanPassword = signal('');
  readonly draftWanServiceName = signal('');
  readonly draftWanMac = signal('');
  readonly draftWanMtu = signal<number | null>(null);

  readonly canSaveWan = computed(() => {
    const state = this.uneticStore.state();
    if (
      !state ||
      state.lifecycle !== 'ready' ||
      state.maintenance.enabled ||
      !!state.active_operation
    ) {
      return false;
    }
    const proto = this.draftWanProto();
    if (proto === 'static') {
      return (
        this.draftWanIp().trim().length > 0 &&
        this.draftWanNetmask().trim().length > 0 &&
        this.draftWanGateway().trim().length > 0
      );
    }
    if (proto === 'pppoe') {
      return this.draftWanUsername().trim().length > 0;
    }
    return true;
  });

  constructor(
    private readonly uneticStore: UneticStore,
    private readonly ubus: UbusClient,
  ) {}

  async saveWan(): Promise<void> {
    const state = this.uneticStore.state();
    if (!state || !this.canSaveWan()) {
      return;
    }

    this.uneticStore.error.set(null);
    const requestId = crypto.randomUUID();
    this.uneticStore.currentRequestId = requestId;

    const proto = this.draftWanProto();
    const dnsList = this.draftWanDns()
      .trim()
      .split(/[\s,]+/)
      .filter((d) => d.length > 0);

    const wanPayload = {
      present: proto !== 'none',
      proto,
      custom_mac: this.draftWanMac().trim() || null,
      custom_mtu: this.draftWanMtu() || null,
      custom_dns: dnsList,
      static_config:
        proto === 'static'
          ? {
              ip_address: this.draftWanIp().trim(),
              netmask: this.draftWanNetmask().trim(),
              gateway: this.draftWanGateway().trim(),
              dns: dnsList,
            }
          : null,
      pppoe_config:
        proto === 'pppoe'
          ? {
              username: this.draftWanUsername().trim(),
              password: this.draftWanPassword() || null,
              service_name: this.draftWanServiceName().trim() || null,
            }
          : null,
    };

    try {
      const envelope = await this.ubus.call<ApiEnvelope<OperationAccepted>>(
        'wan.set',
        {
          wan: wanPayload,
          expected_revision: state.revision,
          request_id: requestId,
        },
      );
      this.uneticStore.applyEnvelope(envelope);
      if (!envelope.ok || envelope.result?.noop) {
        this.uneticStore.currentRequestId = null;
      }
    } catch {
      this.uneticStore.connected.set(false);
      this.uneticStore.error.set('Connection lost — checking the result…');
      this.uneticStore.scheduleReconnect();
    }
  }
}
