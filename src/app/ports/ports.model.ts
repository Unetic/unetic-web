export interface PortConnection {
  mac: string;
  ip?: string;
  hostname?: string;
}

export interface PortInfo {
  id: number;
  type: 'LAN' | 'WAN';
  vlan: number | null;
  speed: string;
  ifname?: string;
  connections: PortConnection[];
}

export type PhysicalPort = PortInfo;
