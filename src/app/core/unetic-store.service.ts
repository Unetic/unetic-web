import { Injectable, computed, signal } from '@angular/core';

import { ApiEnvelope, OperationAccepted, PublicState, WanProtocol } from './models';
import { UbusClient } from './ubus-client.service';

@Injectable({ providedIn: 'root' })
export class UneticStore {
  readonly state = signal<PublicState | null>(null);
  readonly activeTab = signal<'wifi' | 'wan'>('wifi');
  readonly draftSsid = signal('');

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

  readonly connected = signal(false);
  readonly loginRequired = signal(true);
  readonly error = signal<string | null>(null);

  readonly saving = computed(
    () => this.state()?.active_operation?.source === 'user',
  );

  readonly canSave = computed(() => {
    const state = this.state();
    return (
      !!state &&
      state.lifecycle === 'ready' &&
      !state.maintenance.enabled &&
      !state.active_operation &&
      this.isValidSsid(this.draftSsid()) &&
      this.draftSsid() !== state.wifi.ssid
    );
  });

  readonly canSaveWan = computed(() => {
    const state = this.state();
    if (!state || state.lifecycle !== 'ready' || state.maintenance.enabled || !!state.active_operation) {
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

  private lastServerSsid: string | null = null;
  private currentRequestId: string | null = null;
  private pollingTimer?: number;
  private reconnectTimer?: number;

  constructor(private readonly ubus: UbusClient) {
    this.loginRequired.set(!ubus.authenticated);
  }

  async start(): Promise<void> {
    if (!this.ubus.authenticated) {
      this.loginRequired.set(true);
      return;
    }
    await this.connect();
  }

  async login(username: string, password: string): Promise<void> {
    this.error.set(null);
    try {
      await this.ubus.login(username, password);
      this.loginRequired.set(false);
      await this.connect();
    } catch (error) {
      this.error.set(this.message(error));
    }
  }

  async saveSsid(): Promise<void> {
    const state = this.state();
    const ssid = this.draftSsid();
    if (!state || !this.canSave()) {
      return;
    }

    this.error.set(null);
    const requestId = crypto.randomUUID();
    this.currentRequestId = requestId;

    try {
      const envelope = await this.ubus.call<ApiEnvelope<OperationAccepted>>(
        'wifi.set_ssid',
        {
          ssid,
          expected_revision: state.revision,
          request_id: requestId,
        },
      );
      this.applyEnvelope(envelope);
      if (!envelope.ok || envelope.result?.noop) {
        this.currentRequestId = null;
        this.draftSsid.set(envelope.state.wifi.ssid);
      }
    } catch {
      this.connected.set(false);
      this.error.set('Connection lost — checking the result…');
      this.scheduleReconnect();
    }
  }

  async saveWan(): Promise<void> {
    const state = this.state();
    if (!state || !this.canSaveWan()) {
      return;
    }

    this.error.set(null);
    const requestId = crypto.randomUUID();
    this.currentRequestId = requestId;

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
      this.applyEnvelope(envelope);
      if (!envelope.ok || envelope.result?.noop) {
        this.currentRequestId = null;
      }
    } catch {
      this.connected.set(false);
      this.error.set('Connection lost — checking the result…');
      this.scheduleReconnect();
    }
  }

  async enterMaintenance(): Promise<void> {
    await this.simpleMutation('maintenance.enter');
  }

  async exitMaintenance(): Promise<void> {
    await this.simpleMutation('maintenance.exit');
  }

  private async simpleMutation(method: string): Promise<void> {
    try {
      const envelope = await this.ubus.call<ApiEnvelope<unknown>>(method, {});
      this.applyEnvelope(envelope);
    } catch (error) {
      this.error.set(this.message(error));
    }
  }

  private async connect(): Promise<void> {
    window.clearTimeout(this.reconnectTimer);
    try {
      // Establish the live stream first, then take a full snapshot. This closes
      // the race where a state change could happen between snapshot and subscribe.
      await this.ubus.subscribe(
        (value) => this.acceptIncomingState(value),
        () => {
          this.connected.set(false);
          this.scheduleReconnect();
        },
      );
      await this.refresh();
      this.connected.set(true);
      this.beginPolling();
    } catch (error) {
      this.connected.set(false);
      if (
        !this.ubus.authenticated ||
        this.message(error).includes('Not authenticated')
      ) {
        window.clearInterval(this.pollingTimer);
        this.loginRequired.set(true);
      } else {
        this.scheduleReconnect();
      }
    }
  }

  private async refresh(): Promise<void> {
    const envelope = await this.ubus.call<ApiEnvelope<PublicState>>(
      'state',
      {},
    );
    this.applyEnvelope(envelope);
  }

  private beginPolling(): void {
    window.clearInterval(this.pollingTimer);
    this.pollingTimer = window.setInterval(() => {
      void this.refresh().catch(() => {
        this.connected.set(false);
        if (!this.ubus.authenticated) {
          window.clearInterval(this.pollingTimer);
          this.loginRequired.set(true);
          return;
        }
        this.scheduleReconnect();
      });
    }, 5000);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, 1000);
  }

  private acceptIncomingState(value: unknown): void {
    if (!this.isPublicState(value)) {
      void this.refresh();
      return;
    }

    const current = this.state();
    if (current) {
      if (
        current.boot_id !== value.boot_id ||
        value.event_seq > current.event_seq + 1
      ) {
        void this.refresh();
        return;
      }
      if (value.event_seq <= current.event_seq) {
        return;
      }
    }

    this.applyState(value);
  }

  private applyEnvelope<T>(envelope: ApiEnvelope<T>): void {
    if (envelope.api_version !== 1) {
      this.error.set(`Unsupported Unetic API version: ${envelope.api_version}`);
      return;
    }

    this.applySnapshot(envelope.state);
    if (!envelope.ok && envelope.error) {
      this.error.set(envelope.error.message);
    }
  }

  private applySnapshot(state: PublicState): void {
    const current = this.state();
    if (
      current &&
      current.boot_id === state.boot_id &&
      state.event_seq < current.event_seq
    ) {
      return;
    }
    this.applyState(state);
  }

  private applyState(state: PublicState): void {
    const previousSsid = this.lastServerSsid;
    this.state.set(state);
    this.connected.set(true);

    if (previousSsid === null || previousSsid !== state.wifi.ssid) {
      this.draftSsid.set(state.wifi.ssid);
      this.lastServerSsid = state.wifi.ssid;
    }

    const last = state.last_user_operation;
    if (this.currentRequestId && last?.request_id === this.currentRequestId) {
      if (last.status === 'failed' || last.status === 'rollback_failed') {
        this.error.set(
          last.error?.message ?? 'The change failed and was rolled back.',
        );
        this.currentRequestId = null;
        this.draftSsid.set(state.wifi.ssid);
      } else if (last.status === 'succeeded') {
        this.error.set(null);
        this.currentRequestId = null;
        this.draftSsid.set(state.wifi.ssid);
      }
    }

    if (!this.currentRequestId) {
      if (state.last_system_error) {
        this.error.set(`System: ${state.last_system_error.message}`);
      } else if (this.error()?.startsWith('System: ')) {
        this.error.set(null);
      }
    }
  }

  private isPublicState(value: unknown): value is PublicState {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const state = value as Partial<PublicState>;
    return (
      state.api_version === 1 &&
      typeof state.boot_id === 'string' &&
      !!state.wifi
    );
  }

  private isValidSsid(value: string): boolean {
    const bytes = new TextEncoder().encode(value).byteLength;
    return bytes > 0 && bytes <= 32 && !value.includes('\0');
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
