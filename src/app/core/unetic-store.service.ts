import { Injectable, computed, signal } from '@angular/core';

import { ApiEnvelope, PublicState, SwitchInfo, SystemInfo } from './models';
import { UbusClient } from './ubus-client.service';

@Injectable({ providedIn: 'root' })
export class UneticStore {
  readonly state = signal<PublicState | null>(null);
  readonly switchInfo = signal<SwitchInfo | null>(null);
  readonly systemInfo = signal<SystemInfo | null>(null);
  readonly activeTab = signal<
    'wifi' | 'wan' | 'switch' | 'system' | 'diagnostics'
  >('wifi');

  readonly connected = signal(false);
  readonly loginRequired = signal(true);
  readonly error = signal<string | null>(null);

  readonly saving = computed(
    () => this.state()?.active_operation?.source === 'user',
  );

  private lastServerSsid: string | null = null;
  currentRequestId: string | null = null;
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

  async enterMaintenance(): Promise<void> {
    await this.simpleMutation('maintenance.enter');
  }

  async exitMaintenance(): Promise<void> {
    await this.simpleMutation('maintenance.exit');
  }

  async fetchSwitchInfo(): Promise<SwitchInfo | null> {
    try {
      const envelope = await this.ubus.call<ApiEnvelope<SwitchInfo>>(
        'switch.get',
        {},
      );
      if (envelope.ok && envelope.result) {
        this.switchInfo.set(envelope.result);
        return envelope.result;
      }
    } catch {
      // Switch info is optional if device has no switch
    }
    return null;
  }

  async fetchSystemInfo(): Promise<SystemInfo | null> {
    try {
      const envelope = await this.ubus.call<ApiEnvelope<SystemInfo>>(
        'system.info',
        {},
      );
      if (envelope.ok && envelope.result) {
        this.systemInfo.set(envelope.result);
        return envelope.result;
      }
    } catch {
      // System info may be unavailable on older core versions
    }
    return null;
  }

  applyEnvelope<T>(envelope: ApiEnvelope<T>): void {
    if (envelope.api_version !== 1) {
      this.error.set(`Unsupported Unetic API version: ${envelope.api_version}`);
      return;
    }

    this.applySnapshot(envelope.state);
    if (!envelope.ok && envelope.error) {
      this.error.set(envelope.error.message);
    }
  }

  scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, 1000);
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
    if (!this.switchInfo()) {
      void this.fetchSwitchInfo();
    }
    if (!this.systemInfo()) {
      void this.fetchSystemInfo();
    }
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
    this.state.set(state);
    this.connected.set(true);

    const last = state.last_user_operation;
    if (this.currentRequestId && last?.request_id === this.currentRequestId) {
      if (last.status === 'failed' || last.status === 'rollback_failed') {
        this.error.set(
          last.error?.message ?? 'The change failed and was rolled back.',
        );
        this.currentRequestId = null;
      } else if (last.status === 'succeeded') {
        this.error.set(null);
        this.currentRequestId = null;
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

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
