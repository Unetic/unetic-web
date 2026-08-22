import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DevicesStore } from '../devices/devices.store';
import { Device, PortForward } from './devices.model';
import { UneticStore } from '../core/unetic-store.service';
import { SparklineComponent } from '../shared/sparkline/sparkline.component';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [FormsModule, SparklineComponent],
  templateUrl: './devices.component.html',
  styleUrl: './devices.component.scss',
})
export class DevicesComponent implements OnInit, OnDestroy {
  readonly store = inject(DevicesStore);
  readonly uneticStore = inject(UneticStore);

  selectedDevice = signal<Device | null>(null);

  getDeviceSparkline(mac: string): number[] {
    return this.uneticStore.getDeviceSparkline(mac);
  }

  hasSparklineData(mac: string): boolean {
    const data = this.getDeviceSparkline(mac);
    return data.some(val => val > 0);
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

  getConnectionLabel(device: Device): string {
    if (!device.connection) {
      return 'Offline';
    }
    if (device.connection_type.toUpperCase() === 'LAN' || device.connection.port_id !== undefined) {
      return `LAN (Port ${device.connection.port_id})`;
    }
    if (device.connection_type.toUpperCase() === 'WIFI' || device.connection.signal_pct !== undefined) {
      return `Wi-Fi (${device.connection.signal_pct}%)`;
    }
    return device.connection_type;
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
    // Update local state if needed
    device.name = this.editName;
    device.is_static_ip = this.editIsStaticIp;
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
    const pf: PortForward = {
      protocol: this.newPfProtocol,
      external_port: this.newPfExternalPort,
      internal_port: this.newPfInternalPort,
    };
    await this.store.addPortForward(device.uuid, pf);
    if (!device.port_forwards) device.port_forwards = [];
    device.port_forwards.push(pf);
  }

  async removePortForward(pf: PortForward) {
    const device = this.selectedDevice();
    if (!device || !device.uuid) return;
    await this.store.removePortForward(device.uuid, pf);
    if (device.port_forwards) {
      device.port_forwards = device.port_forwards.filter(p => p !== pf);
    }
  }
}
