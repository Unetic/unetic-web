export type DdnsProvider = 'none' | 'cloudflare' | 'duck_dns';

export interface CloudflareConfig {
  zone_id: string;
  record_id: string;
  api_token: string;
  hostname: string;
}

export interface DuckDnsConfig {
  token: string;
  domain: string;
}

export interface DdnsConfig {
  enabled: boolean;
  provider: DdnsProvider;
  cloudflare?: CloudflareConfig;
  duckdns?: DuckDnsConfig;
}

export interface DdnsStatus {
  last_ip: string | null;
  last_update_ts: number | null;
  last_error: string | null;
}
