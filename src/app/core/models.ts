import { WanPublicState, SetWanRequest } from '../wan/wan.model';
import { DnsConfig } from '../dns/dns.model';
import { DdnsConfig, DdnsStatus } from '../ddns/ddns.model';
import { PhysicalPort } from '../ports/ports.model';

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

export interface PendingExtender {
  mac: string;
  model: string;
  pairing_key: string;
}

export interface KnownExtender {
  mac: string;
  ip: string;
  model?: string;
  auth_token: string;
}

export interface PublicState {
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
    encryption?: string;
    targets: string[];
    observed: Record<string, string>;
    status: 'synced' | 'drifted' | 'applying' | 'unknown';
  };
  wan: WanPublicState;
  dns: DnsConfig;
  ddns_config?: DdnsConfig;
  ddns_status?: DdnsStatus;
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
  traffic?: TrafficState;
  extenders: KnownExtender[];
  pending_extenders: PendingExtender[];
  extender_pairing_status: string;
  extender_ports: Record<string, PhysicalPort[]>;
}

export interface IfaceStats { rx_bps: number; tx_bps: number; }
export interface DeviceStats { rx_bps: number; tx_bps: number; }
export interface TrafficState {
  ifaces: Record<string, IfaceStats>;
  devices: Record<string, DeviceStats>;
}

export interface ApiEnvelope<T> {
  idempotence_token: string;
  event_seq: number;
  error: number; // 0 = ok
  result?: T;
}

export interface OperationAccepted {
  operation_id: string;
  status: OperationStatus;
  noop: boolean;
}
