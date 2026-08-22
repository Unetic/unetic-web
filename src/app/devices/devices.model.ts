export interface PortForward {
  protocol: 'TCP' | 'UDP' | 'Both';
  external_port: number;
  internal_port: number;
}

export interface DeviceConnection {
  port_id?: number;
  signal_pct?: number;
}

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
