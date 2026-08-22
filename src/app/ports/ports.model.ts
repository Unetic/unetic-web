export interface PortConnection {
  mac: string;
  ip?: string;
  hostname?: string;
}

export interface PortInfo {
  id: string;
  name: string;
  port_type: 'lan' | 'wan';
  speed:
    | 'NoLink'
    | 'Speed10'
    | 'Speed100'
    | 'Speed1000'
    | 'Speed2500'
    | 'Speed5000'
    | 'Speed10000';
  connections: PortConnection[];
}

export type PhysicalPort = PortInfo;
