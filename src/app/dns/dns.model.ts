export interface DnsRecord { id: string; hostname: string; ip: string; }
export interface DnsConfig {
  upstream: string[];           // empty = use ISP
  local_domain: string | null;
  dhcp_start: number;
  dhcp_limit: number;
  dhcp_lease_hours: number;
  custom_records: DnsRecord[];
}
