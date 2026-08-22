export interface IfaceStats {
  rx_bps: number;
  tx_bps: number;
}

export interface DeviceStats {
  rx_bps: number;
  tx_bps: number;
}

export interface TrafficState {
  ifaces: Record<string, IfaceStats>;
  devices: Record<string, DeviceStats>;
}
