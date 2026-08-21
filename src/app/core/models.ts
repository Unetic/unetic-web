export type Lifecycle =
  'booting' | 'ready' | 'maintenance' | 'degraded' | 'needs_setup';
export type OperationStatus =
  | 'accepted'
  | 'staging'
  | 'applying'
  | 'verifying'
  | 'persisting'
  | 'confirming'
  | 'rolling_back'
  | 'succeeded'
  | 'failed'
  | 'rollback_failed';

export interface DomainError {
  code: string;
  message: string;
  stage: string;
  operation_id?: string | null;
  request_id?: string | null;
  retryable: boolean;
  details: unknown;
}

export interface PublicOperation {
  id: string;
  request_id?: string | null;
  source: 'user' | 'reconcile' | 'recovery';
  kind: string;
  status: OperationStatus;
  requested_ssid: string;
  error?: DomainError | null;
}

export interface LastOperation extends PublicOperation {
  revision: number;
  finished_at_ms: number;
}

export type WanProtocol = 'dhcp' | 'static' | 'pppoe' | 'none';

export type WanStatus =
  | 'not_configured'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

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

export interface WanDesired {
  present: boolean;
  device?: string | null;
  proto: WanProtocol;
  custom_mac?: string | null;
  custom_mtu?: number | null;
  custom_dns?: string[];
  static_config?: WanStaticConfig | null;
  pppoe_config?: WanPppoeConfig | null;
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
}

export interface PublicState {
  api_version: number;
  core_version: string;
  boot_id: string;
  event_seq: number;
  revision: number;
  lifecycle: Lifecycle;
  maintenance: {
    enabled: boolean;
    exiting: boolean;
    reason?: string | null;
  };
  wifi: {
    ssid: string;
    targets: string[];
    observed: Record<string, string>;
    status: 'synced' | 'drifted' | 'applying' | 'unknown';
  };
  wan: WanPublicState;
  active_operation?: PublicOperation | null;
  last_user_operation?: LastOperation | null;
  last_system_error?: DomainError | null;
  drift: {
    detected: boolean;
    fields: string[];
  };
  health: {
    core: string;
    ubus: string;
    rpcd: string;
    wireless: string;
    wan: string;
  };
}

export interface SetWanRequest {
  expected_revision: number;
  request_id: string;
  wan: WanDesired;
}

export interface ApiEnvelope<T> {
  api_version: number;
  ok: boolean;
  result?: T;
  error?: DomainError;
  state: PublicState;
}

export interface OperationAccepted {
  operation_id: string;
  status: OperationStatus;
  noop: boolean;
}

export type SwitchArchitecture = 'dsa' | 'swconfig' | 'software';

export interface SwitchSocInfo {
  model: string;
  vendor: string;
  compatible?: string | null;
  driver?: string | null;
  architecture: SwitchArchitecture;
  tagging_protocol?: string | null;
  ports: string[];
}

export interface SwitchFeatureStatus {
  supported: boolean;
  enabled: boolean;
  controllable: boolean;
}

export interface SwitchFeatures {
  l2_hw_switching: SwitchFeatureStatus;
  l3_hw_flow_offload: SwitchFeatureStatus;
  l3_sw_flow_offload: SwitchFeatureStatus;
  vlan_filtering_8021q: SwitchFeatureStatus;
  port_isolation: SwitchFeatureStatus;
  hw_igmp_snooping: SwitchFeatureStatus;
  flow_control_8023x: SwitchFeatureStatus;
  eee_8023az: SwitchFeatureStatus;
  stp_rstp: SwitchFeatureStatus;
  mirroring_span: SwitchFeatureStatus;
  jumbo_frames: SwitchFeatureStatus;
  link_aggregation_lag: SwitchFeatureStatus;
  tdr_cable_diag: SwitchFeatureStatus;
  hardware_stats: SwitchFeatureStatus;
}

export interface SwitchInfo {
  soc: SwitchSocInfo;
  features: SwitchFeatures;
}

export interface SystemInfo {
  hostname: string;
  model: string;
  board_name: string;
  firmware_version: string;
  firmware_revision: string;
  target: string;
  arch: string;
  kernel_version: string;
  uptime_secs: number;
  load_average: [number, number, number];
  memory_total_kb: number;
  memory_available_kb: number;
}

