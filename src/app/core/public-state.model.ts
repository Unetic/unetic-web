import { DdnsConfig, DdnsStatus } from '../ddns/ddns.model';
import { DnsConfig } from '../dns/dns.model';
import { KnownExtender, PendingExtender } from '../devices/extender.model';
import { PhysicalPort } from '../ports/ports.model';
import { TrafficState } from '../traffic/traffic.model';
import { WanPublicState } from '../wan/wan.model';
import { DomainError, LastOperation, PublicOperation } from './operation.model';

export type Lifecycle =
  'booting' | 'ready' | 'maintenance' | 'degraded' | 'needs_setup';

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
