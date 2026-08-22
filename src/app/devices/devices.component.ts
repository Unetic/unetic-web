import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { DevicesStore } from '../devices/devices.store';
import { Device, NewPortForward, PortForward } from './devices.model';
import { UneticStore } from '../core/unetic-store.service';
import { SparklineComponent } from '../shared/sparkline/sparkline.component';
import { UbusClient } from '../core/ubus-client.service';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [FormsModule, SparklineComponent],
  providers: [DecimalPipe],
  templateUrl: './devices.component.html',
  styleUrl: './devices.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevicesComponent implements OnInit, OnDestroy {
  readonly store = inject(DevicesStore);
  readonly uneticStore = inject(UneticStore);
  readonly ubus = inject(UbusClient);
  readonly decimalPipe = inject(DecimalPipe);

  selectedDevice = signal<Device | null>(null);

  pendingExtenders = computed(
    () => this.uneticStore.state()?.pending_extenders || [],
  );

  async acceptExtender(mac: string) {
    try {
      await this.ubus.call('mesh.pair_accept', { mac });
    } catch (e) {
      console.error('Failed to accept extender:', e);
    }
  }

  async rejectExtender(mac: string) {
    try {
      await this.ubus.call('mesh.pair_reject', { mac });
    } catch (e) {
      console.error('Failed to reject extender:', e);
    }
  }

  getDeviceSparkline(mac: string): number[] {
    return this.uneticStore.getDeviceSparkline(mac);
  }

  hasSparklineData(mac: string): boolean {
    const data = this.getDeviceSparkline(mac);
    return data.some((val) => val > 0);
  }

  getDeviceStats(mac: string) {
    const dev = this.uneticStore.traffic().devices[mac];
    return dev ? { rx: dev.rx_bps, tx: dev.tx_bps } : { rx: 0, tx: 0 };
  }

  formatBps(n: number): string {
    if (!n || n < 1024) return '< 1 KB/s';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB/s';
    return (n / (1024 * 1024)).toFixed(1) + ' MB/s';
  }

  editName = '';
  editIsStaticIp = false;

  newPfProtocol: 'TCP' | 'UDP' | 'Both' = 'TCP';
  newPfExternalPort = 80;
  newPfInternalPort = 80;

  ngOnInit(): void {
    this.store.startPolling();
  }

  ngOnDestroy(): void {
    this.store.stopPolling();
  }

  extenders = computed(() => this.uneticStore.state()?.extenders || []);

  getExtenderInfo(mac: string): string {
    const ext = this.extenders().find((e) => e.mac === mac);
    if (!ext) return mac;
    return ext.model || ext.ip;
  }

  isExtender(mac: string): boolean {
    return this.extenders().some((e) => e.mac === mac);
  }

  formatDistance(distance: number | undefined): string {
    if (distance === undefined || distance < 0) return 'Unknown distance';
    if (distance === 0) return '< 1m';
    return (this.decimalPipe.transform(distance, '1.1-1') || '0') + 'm';
  }

  getConnectionLabel(device: Device): string {
    if (!device.connection || device.connection.type === 'Unknown') {
      return 'Offline';
    }
    const conn = device.connection;
    if (conn.type === 'Wired') {
      return `LAN (Port ${conn.port_id})`;
    }
    if (conn.type === 'Wireless') {
      return `Wi-Fi (${conn.signal_dbm} dBm)`;
    }
    return `Via ${conn.extender_mac}`;
  }

  async register(device: Device) {
    const name = device.hostname || 'New Device';
    await this.store.registerDevice(device.mac, name);
  }

  openSettings(device: Device) {
    this.selectedDevice.set(device);
    this.editName = device.name || '';
    this.editIsStaticIp = device.is_static_ip || false;
  }

  closeSettings() {
    this.selectedDevice.set(null);
  }

  async saveSettings() {
    const device = this.selectedDevice();
    if (!device || !device.uuid) return;
    await this.store.updateDevice(device.uuid, {
      name: this.editName,
      is_static_ip: this.editIsStaticIp,
    });
    this.refreshSelectedDevice(device.uuid);
  }

  async deleteDevice() {
    const device = this.selectedDevice();
    if (!device || !device.uuid) return;
    await this.store.deleteDevice(device.uuid);
    this.closeSettings();
  }

  async addPortForward() {
    const device = this.selectedDevice();
    if (!device || !device.uuid) return;
    const pf: NewPortForward = {
      protocol: this.newPfProtocol,
      external_port: this.newPfExternalPort,
      internal_port: this.newPfInternalPort,
    };
    await this.store.addPortForward(device.uuid, pf);
    this.refreshSelectedDevice(device.uuid);
  }

  async removePortForward(pf: PortForward) {
    const device = this.selectedDevice();
    if (!device || !device.uuid) return;
    await this.store.removePortForward(device.uuid, pf.id);
    this.refreshSelectedDevice(device.uuid);
  }

  private refreshSelectedDevice(uuid: string): void {
    this.selectedDevice.set(
      this.store.devices().find((device) => device.uuid === uuid) ?? null,
    );
  }
}
