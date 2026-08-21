export interface Device {
  mac: string;
  ip: string;
  hostname?: string | null;
  connection_type: string;
}
