export type WanProtocol = 'dhcp' | 'static' | 'pppoe' | 'none' | 'extender';

export type WanStatus =
  'not_configured' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WanStaticConfig {
  ip_address: string;
  netmask: string;
  gateway: string;
  dns?: string[];
}

export interface WanPppoeConfig {
  username: string;
  password?: string | null;
  service_name?: string | null;
}

export interface WanQos {
  enabled: boolean;
  download_kbps?: number | null;
  upload_kbps?: number | null;
}

export interface WanDesired {
  present: boolean;
  device?: string | null;
  proto: WanProtocol;
  custom_mac?: string | null;
  custom_mtu?: number | null;
  custom_dns?: string[];
  static_config?: WanStaticConfig | null;
  pppoe_config?: WanPppoeConfig | null;
  qos?: WanQos | null;
}

export interface WanPublicState {
  present: boolean;
  proto: WanProtocol;
  status: WanStatus;
  device?: string | null;
  ip_address?: string | null;
  netmask?: string | null;
  gateway?: string | null;
  dns: string[];
  mac_address?: string | null;
  uptime_secs: number;
  error_reason?: string | null;
  qos?: WanQos | null;
}

export interface SetWanRequest {
  expected_revision: number;
  request_id: string;
  wan: WanDesired;
}
