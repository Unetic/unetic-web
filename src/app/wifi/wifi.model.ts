export interface WifiNetworkConfig {
  ssid: string;
  encryption: string;
  key?: string;
}

export interface SetWifiConfigRequest {
  ssid: string;
  encryption: string;
  key?: string;
  expected_revision: number;
  request_id: string;
}
