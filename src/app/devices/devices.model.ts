export interface PortForward {
  protocol: 'TCP' | 'UDP' | 'Both';
  external_port: number;
  internal_port: number;
}

export type DeviceConnection = 
  | { type: 'Wired'; port_id: number }
  | { type: 'Wireless'; signal_pct: number; signal_dbm: number; distance_m: number }
  | { type: 'ViaExtender'; extender_mac: string; signal_pct?: number; signal_dbm?: number; distance_m?: number }
  | { type: 'Unknown' };

export interface Device {
  mac: string;
  ip: string;
  hostname?: string | null;
  connection_type: string;
  uuid?: string;
  name?: string;
  is_static_ip?: boolean;
  connection?: DeviceConnection | null;
  port_forwards?: PortForward[];
}
