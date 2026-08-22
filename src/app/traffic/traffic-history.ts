import { TrafficState } from './traffic.model';

const HISTORY_SIZE = 60;

export class TrafficHistory {
  private readonly devices = new Map<string, number[]>();
  private readonly interfaces = new Map<string, number[]>();

  getDevice(mac: string): number[] {
    return this.devices.get(mac) ?? [];
  }

  getInterface(ifname: string): number[] {
    return this.interfaces.get(ifname) ?? [];
  }

  add(traffic: TrafficState | undefined): void {
    for (const [mac, stats] of Object.entries(traffic?.devices ?? {})) {
      this.addValue(this.devices, mac, stats.rx_bps);
    }

    for (const [ifname, stats] of Object.entries(traffic?.ifaces ?? {})) {
      this.addValue(this.interfaces, ifname, stats.rx_bps);
    }
  }

  private addValue(
    histories: Map<string, number[]>,
    key: string,
    value: number,
  ): void {
    const history = histories.get(key) ?? [];
    history.push(value);
    if (history.length > HISTORY_SIZE) {
      history.shift();
    }
    histories.set(key, history);
  }
}
