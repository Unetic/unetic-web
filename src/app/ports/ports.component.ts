import { Component, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { PortsStore } from './ports.store';
import { PortInfo } from './ports.model';
import { UneticStore } from '../core/unetic-store.service';
import { SparklineComponent } from '../shared/sparkline/sparkline.component';

@Component({
  selector: 'app-ports',
  standalone: true,
  imports: [CommonModule, SparklineComponent, KeyValuePipe],
  templateUrl: './ports.component.html',
  styleUrl: './ports.component.scss',
})
export class PortsComponent implements OnInit, OnDestroy {
  readonly numberedPorts = computed(() => {
    let lanCount = 1;
    let wanCount = 1;
    const sortedPorts = [...this.store.ports()].sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true }),
    );
    return sortedPorts.map((port) => {
      let displayName = '';
      if (port.port_type === 'lan') {
        displayName = `LAN ${lanCount++}`;
      } else if (port.port_type === 'wan') {
        displayName = `WAN ${wanCount++}`;
      } else {
        displayName = port.name;
      }
      return {
        ...port,
        displayName,
        displaySpeed: this.formatSpeed(port.speed),
        isUnplugged: port.speed === 'NoLink',
      };
    });
  });

  readonly extenderPorts = computed(
    () => this.uneticStore.state()?.extender_ports ?? {},
  );

  constructor(
    public readonly store: PortsStore,
    private readonly uneticStore: UneticStore,
  ) {}

  ngOnInit(): void {
    this.store.startPolling();
  }

  ngOnDestroy(): void {
    this.store.stopPolling();
  }

  getPortStats(ifname?: string) {
    if (!ifname) return null;
    const iface = this.uneticStore.traffic().ifaces[ifname];
    return iface ? { rx: iface.rx_bps, tx: iface.tx_bps } : null;
  }

  getIfaceSparkline(ifname?: string): number[] {
    if (!ifname) return [];
    return this.uneticStore.getIfaceSparkline(ifname);
  }

  hasSparklineData(ifname?: string): boolean {
    const data = this.getIfaceSparkline(ifname);
    return data.some((val) => val > 0);
  }

  formatBps(n: number): string {
    if (!n || n < 1024) return '< 1 KB/s';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB/s';
    return (n / (1024 * 1024)).toFixed(1) + ' MB/s';
  }

  formatPorts(ports: PortInfo[]) {
    let lanCount = 1;
    let wanCount = 1;
    const sortedPorts = [...ports].sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true }),
    );
    return sortedPorts.map((port) => {
      let displayName = '';
      if (port.port_type === 'lan') {
        displayName = `LAN ${lanCount++}`;
      } else if (port.port_type === 'wan') {
        displayName = `WAN ${wanCount++}`;
      } else {
        displayName = port.name;
      }
      return {
        ...port,
        displayName,
        displaySpeed: this.formatSpeed(port.speed),
        isUnplugged: port.speed === 'NoLink',
      };
    });
  }

  private formatSpeed(speed: PortInfo['speed']): string {
    if (speed === 'NoLink') return 'Unplugged';
    const megabits = Number(speed.replace('Speed', ''));
    return megabits >= 1000 ? `${megabits / 1000} Gbps` : `${megabits} Mbps`;
  }
}
