import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DevicesStore } from '../devices/devices.store';
import { Device, PortForward } from './devices.model';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './devices.component.html',
  styleUrl: './devices.component.scss',
})
export class DevicesComponent implements OnInit, OnDestroy {
  readonly store = inject(DevicesStore);

  selectedDevice = signal<Device | null>(null);
  
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
