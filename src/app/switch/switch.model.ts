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
