import { Injectable, OnDestroy, computed, signal } from '@angular/core';

import { SystemInfo } from '../system/system.model';
import { ApiEnvelope, PublicState } from '../core/models';
import { UbusClient } from '../core/ubus-client.service';
import { APP_CONSTANTS } from '../core/constants';

@Injectable({ providedIn: 'root' })
export class UneticStore implements OnDestroy {
  readonly state = signal<PublicState | null>(null);
  readonly systemInfo = signal<SystemInfo | null>(null);
  readonly activeTab = signal<
    'wifi' | 'wan' | 'devices' | 'ports' | 'system' | 'diagnostics' | 'dns' | 'ddns'
  >('wifi');

  readonly connected = signal(false);
  readonly loginRequired = signal(true);
  readonly error = signal<string | null>(null);

  readonly saving = computed(
    () => this.state()?.active_operation?.source === 'user',
  );

  readonly traffic = computed(() => this.state()?.traffic ?? { ifaces: {}, devices: {} });

  readonly ddnsConfig = computed(() => this.state()?.ddns_config);
  readonly ddnsStatus = computed(() => this.state()?.ddns_status);

  private deviceHistory = new Map<string, number[]>();
  private ifaceHistory = new Map<string, number[]>();

  getDeviceSparkline(mac: string): number[] {
    return this.deviceHistory.get(mac) ?? [];
  }

  getIfaceSparkline(ifname: string): number[] {
    return this.ifaceHistory.get(ifname) ?? [];
  }

  currentRequestId: string | null = null;
  private pollingTimer?: number;
  private reconnectTimer?: number;
  private subscriptionId: string | null = null;
  private continueTimer?: number;

  constructor(private readonly ubus: UbusClient) {
    this.loginRequired.set(!ubus.authenticated);
    window.addEventListener('beforeunload', () => this.cancelSubscription());
  }

  ngOnDestroy(): void {
    if (this.pollingTimer !== undefined) {
      window.clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }
    if (this.reconnectTimer !== undefined) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.continueTimer !== undefined) {
      window.clearInterval(this.continueTimer);
      this.continueTimer = undefined;
    }
    this.cancelSubscription();
  }

  private cancelSubscription(): void {
    if (this.subscriptionId) {
      void this.ubus.call('state.subscribe.cancel', { subscription_id: this.subscriptionId }).catch(() => {});
      this.subscriptionId = null;
    }
  }

  private mergePatch(current: any, patch: any): any {
    if (patch === null) {
      return null;
    }
    if (typeof patch !== 'object' || Array.isArray(patch)) {
      return patch;
    }
    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      current = {};
    }
    const result = { ...current };
    for (const key of Object.keys(patch)) {
      if (patch[key] === null) {
        delete result[key];
      } else {
        result[key] = this.mergePatch(result[key], patch[key]);
      }
    }
    return result;
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

  async fetchSystemInfo(): Promise<SystemInfo | null> {
    try {
      const envelope = await this.ubus.call<ApiEnvelope<SystemInfo>>(
        'system.info',
        {},
      );
      if (envelope.result) {
        this.systemInfo.set(envelope.result);
        return envelope.result;
      }
    } catch {
      // System info may be unavailable on older core versions
    }
    return null;
  }



  scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, APP_CONSTANTS.UBUS_RECONNECT_MS);
  }

  private async simpleMutation(method: string): Promise<void> {
    try {
      await this.ubus.call<ApiEnvelope<unknown>>(method, {});
    } catch (error) {
      this.error.set(this.message(error));
    }
  }

  private isConnecting = false;

  private async connect(): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;
    
    try {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
      window.clearInterval(this.continueTimer);
      this.continueTimer = undefined;
      const subRes = await this.ubus.call<{ subscription_id: string }>(
        'state.subscribe.create',
        { ttl_mins: 5 }
      );
      this.subscriptionId = subRes.subscription_id;
      this.continueTimer = window.setInterval(() => {
        if (this.subscriptionId) {
          void this.ubus.call('state.subscribe.continue', { subscription_id: this.subscriptionId }).catch(() => {});
        }
      }, APP_CONSTANTS.UBUS_SSE_CONTINUE_MS);

      await this.ubus.subscribe(
        (value) => this.acceptIncomingState(value),
        (patch) => this.applyPatch(patch),
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
        this.pollingTimer = undefined;
        this.loginRequired.set(true);
      } else {
        this.scheduleReconnect();
      }
    } finally {
      this.isConnecting = false;
    }
  }

  private async refresh(): Promise<void> {
    const state = await this.ubus.call<PublicState>(
      'state.get',
      {},
    );
    this.applySnapshot(state);
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
          this.pollingTimer = undefined;
          this.loginRequired.set(true);
          return;
        }
        this.scheduleReconnect();
      });
    }, APP_CONSTANTS.POLLING_INTERVAL_MS);
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

  private applyPatch(patch: any): void {
    const current = this.state();
    if (!current) {
      void this.refresh();
      return;
    }
    if (patch.boot_id !== undefined && current.boot_id !== patch.boot_id) {
      void this.refresh();
      return;
    }
    if (patch.event_seq !== undefined) {
      if (patch.event_seq > current.event_seq + 1) {
        void this.refresh();
        return;
      }
      if (patch.event_seq <= current.event_seq) {
        return;
      }
    }
    
    const nextState = this.mergePatch(current, patch);
    this.applyState(nextState);
  }

  private applyState(state: PublicState): void {
    this.state.set(state);
    this.connected.set(true);

    if (state.traffic?.devices) {
      for (const [mac, stats] of Object.entries(state.traffic.devices)) {
        let history = this.deviceHistory.get(mac);
        if (!history) {
          history = [];
          this.deviceHistory.set(mac, history);
        }
        history.push(stats.rx_bps);
        if (history.length > 60) {
          history.shift();
        }
      }
    }

    if (state.traffic?.ifaces) {
      for (const [ifname, stats] of Object.entries(state.traffic.ifaces)) {
        let history = this.ifaceHistory.get(ifname);
        if (!history) {
          history = [];
          this.ifaceHistory.set(ifname, history);
        }
        history.push(stats.rx_bps);
        if (history.length > 60) {
          history.shift();
        }
      }
    }

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
      typeof state.boot_id === 'string' &&
      !!state.wifi
    );
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
