import { Injectable, OnDestroy, computed, signal } from '@angular/core';

import { SystemInfo } from '../system/system.model';
import { TrafficHistory } from '../traffic/traffic-history';
import { APP_CONSTANTS } from './constants';
import { PublicState } from './public-state.model';
import {
  resolveEvent,
  resolvePatch,
  resolveSnapshot,
  StateUpdate,
} from './state-update';
import { UbusClient } from './ubus-client.service';

@Injectable({ providedIn: 'root' })
export class UneticStore implements OnDestroy {
  readonly state = signal<PublicState | null>(null);
  readonly systemInfo = signal<SystemInfo | null>(null);
  readonly activeTab = signal<
    | 'wifi'
    | 'wan'
    | 'devices'
    | 'ports'
    | 'system'
    | 'diagnostics'
    | 'dns'
    | 'ddns'
  >('wifi');

  readonly connected = signal(false);
  readonly loginRequired = signal(true);
  readonly error = signal<string | null>(null);

  readonly saving = computed(
    () => this.state()?.active_operation?.source === 'user',
  );

  readonly traffic = computed(
    () => this.state()?.traffic ?? { ifaces: {}, devices: {} },
  );

  readonly ddnsConfig = computed(() => this.state()?.ddns_config);
  readonly ddnsStatus = computed(() => this.state()?.ddns_status);

  private readonly trafficHistory = new TrafficHistory();

  getDeviceSparkline(mac: string): number[] {
    return this.trafficHistory.getDevice(mac);
  }

  getIfaceSparkline(ifname: string): number[] {
    return this.trafficHistory.getInterface(ifname);
  }

  currentRequestId: string | null = null;
  private pollingTimer?: number;
  private reconnectTimer?: number;
  private subscriptionId: string | null = null;
  private continueTimer?: number;
  private readonly beforeUnloadHandler = () => this.cancelSubscription();

  constructor(private readonly ubus: UbusClient) {
    this.loginRequired.set(!ubus.authenticated);
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
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
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    this.ubus.stopSubscription();
    this.cancelSubscription();
  }

  private cancelSubscription(): void {
    if (this.subscriptionId) {
      void this.ubus
        .call('state.subscribe.cancel', {
          subscription_id: this.subscriptionId,
        })
        .catch(() => {});
      this.subscriptionId = null;
    }
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
      const systemInfo = await this.ubus.call<SystemInfo>('system.info', {});
      this.systemInfo.set(systemInfo);
      return systemInfo;
    } catch {
      // System info may be unavailable on older core versions
    }
    return null;
  }

  scheduleReconnect(): void {
    if (this.reconnectTimer !== undefined) {
      return;
    }
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, APP_CONSTANTS.UBUS_RECONNECT_MS);
  }

  private async simpleMutation(method: string): Promise<void> {
    try {
      await this.ubus.call<unknown>(method, {});
    } catch (error) {
      this.error.set(this.message(error));
    }
  }

  private isConnecting = false;

  private async connect(): Promise<void> {
    if (this.isConnecting) {
      return;
    }
    this.isConnecting = true;

    try {
      this.ubus.stopSubscription();
      this.cancelSubscription();
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
      window.clearInterval(this.continueTimer);
      this.continueTimer = undefined;
      const subRes = await this.ubus.call<{ subscription_id: string }>(
        'state.subscribe.create',
        { ttl_mins: 5 },
      );
      this.subscriptionId = subRes.subscription_id;
      this.continueTimer = window.setInterval(() => {
        if (this.subscriptionId) {
          void this.ubus
            .call('state.subscribe.continue', {
              subscription_id: this.subscriptionId,
            })
            .catch(() => {});
        }
      }, APP_CONSTANTS.UBUS_SSE_CONTINUE_MS);

      await this.ubus.subscribe(
        (value) => this.applyUpdate(resolveEvent(this.state(), value)),
        (patch) => this.applyUpdate(resolvePatch(this.state(), patch)),
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
    const state = await this.ubus.call<PublicState>('state.get', {});
    const update = resolveSnapshot(this.state(), state);
    if (update.action === 'refresh') {
      throw new Error('state.get returned an invalid state');
    }
    this.applyUpdate(update);
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

  private applyUpdate(update: StateUpdate): void {
    if (update.action === 'apply') {
      this.applyState(update.state);
    } else if (update.action === 'refresh') {
      void this.refresh();
    }
  }

  private applyState(state: PublicState): void {
    this.state.set(state);
    this.connected.set(true);

    this.trafficHistory.add(state.traffic);

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

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
